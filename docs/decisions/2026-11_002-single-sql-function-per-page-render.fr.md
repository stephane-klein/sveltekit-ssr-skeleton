---
status: accepted
date: 2026-11-23
decision-makers: Stéphane Klein
ai-assistants: DeepSeek V4.1 Flash (OpenCode Go)
---

# ADR 002 — Une fonction SQL stockée (CTE + JSON) par rendu de page

> Traduction française de
> [`2026-11_002-single-sql-function-per-page-render.md`](./2026-11_002-single-sql-function-per-page-render.md).
> En cas de divergence, la version anglaise fait foi.

## Contexte et problématique

Un rendu de page a souvent besoin de plusieurs valeurs dérivées des mêmes tables :
une liste paginée, son total, des indicateurs de présence pour les périodes
voisines, une recherche comme le jour non vide le plus proche. Orchestrer ces
valeurs depuis JavaScript coûte un aller-retour PostgreSQL par valeur. Un
aller-retour, ce n'est pas seulement la latence réseau : le pilote sérialise les
paramètres, le serveur analyse et planifie l'instruction, l'exécute et sérialise
le résultat, puis le client le relit pour en faire des objets. L'orchestration en
JavaScript oblige aussi les valeurs intermédiaires à traverser cette frontière et
rejoue les mêmes filtres dans des instructions séparées.

En déploiement distant, la latence réseau domine. En local, les cycles
analyse/planification/exécution répétés et la lecture des résultats s'additionnent
quand même. La page des contacts est le premier cas de ce squelette :
`src/routes/(private)/contacts/+page.server.js` lançait deux requêtes en
parallèle : la liste paginée des contacts et le `count(*)`.

## Critères de décision

- Réduire le nombre d'allers-retours par rendu de page (cible : un seul). La
  règle s'applique à toutes les pages, pas seulement à la première.
- Laisser le planificateur voir la page entière dans une seule instruction : une
  analyse et une planification au lieu de N, avec des jeux de données
  intermédiaires calculés une fois et réutilisés entre les CTE.
- Garder les valeurs intermédiaires dans la base : seule la charge utile JSON
  finale traverse la frontière du processus.
- Garder les données de la page justes et stables : même ordre, même pagination
  et mêmes totaux qu'avant.
- Suivre le modèle de fonctions stockées déjà en place dans le projet
  (`sqls/functions.sql`, chargé à chaque `pnpm migrate`).
- Garder les paramètres dynamiques de la requête (pagination, filtres, tri)
  exprimables dans une seule instruction statique.

## Options envisagées

- **A. Une fonction SQL stockée par rendu de page** — une fonction qui renvoie
  une charge utile JSONB, définie dans `sqls/functions.sql`, avec des CTE pour la
  page, le total et les recherches.
- **B. Une grosse requête CTE inline construite en JavaScript**, sans fonction.
- **C. Approche hybride à deux requêtes** — garder la requête paginée dynamique
  en JavaScript et fusionner seulement les métadonnées dans une requête CTE.
- **D. Statu quo** — l'orchestration en N requêtes depuis JavaScript.

## Décision retenue

Option retenue : **A. Une fonction SQL stockée par rendu de page**.

Chaque page qui a besoin de plusieurs valeurs dérivées de la base est servie par
une seule fonction SQL stockée qui renvoie un document JSONB, construit avec des
CTE pour la page, le total et les recherches. Le `load` JavaScript décode le JSON
et applique la logique de présentation : arithmétique des pages, hrefs, mise en
forme. Un rendu de page coûte donc **un seul aller-retour**, quel que soit le
nombre de valeurs nécessaires.

### Conventions

- Les fonctions vivent dans `sqls/functions.sql`, rechargé en entier à chaque
  `pnpm migrate`. Utiliser `CREATE OR REPLACE` ; réserver
  `DROP FUNCTION IF EXISTS` seulement si la signature change.
- Préférer `LANGUAGE sql STABLE PARALLEL SAFE` pour les corps déclaratifs.
  Réserver `LANGUAGE plpgsql` au flux de contrôle.
- Préfixer les paramètres de la fonction par `_` (`_limit`, `_offset`, `_from`,
  `_to`).
- Appeler la fonction avec la notation par arguments nommés :
  `SELECT f(_limit => $1::int)`. Tous les arguments doivent utiliser la forme
  nommée, car PostgreSQL refuse un argument positionnel qui suit un argument
  nommé.
- Un tagged template ne peut pas exprimer `_limit => $1` ; ces appels passent
  donc par `sql.unsafe(sql, params)`.
- `sql.unsafe()` envoie une instruction sans nom, que PostgreSQL planifie
  toujours sur mesure (custom plan). Une fonction dont le corps branche sur la
  valeur d'un paramètre, ou qui repose sur un comptage index-only ou sur un
  `LIMIT` avec sortie anticipée, dépend de cette visibilité au moment de la
  planification. Un tagged template est préparé sous un nom par défaut, et
  PostgreSQL peut basculer vers un plan générique après quelques exécutions.
- Convertir les colonnes `bigint` en texte (`id::text`) quand la charge utile
  alimente une chaîne JavaScript. Les nombres JSON perdent de la précision
  au-delà de 2^53.
- Donner à l'`ORDER BY` et aux filtres de la fonction un index qui les sert.
- La même règle s'applique aux middlewares de requête : quand la vérification de
  session ou de jeton d'API a besoin de la ligne utilisateur, la joindre dans la
  même instruction au lieu de lancer un second `SELECT` sur `users`.
- Les migrations ne doivent pas appeler les fonctions définies ici. L'exception
  documentée est une copie d'amorçage nécessaire à un `DEFAULT` de colonne
  (`generate_nanoid` dans `00008_contacts_nanoid.sql`) ; `sqls/functions.sql` la
  remplace ensuite.

### Première application : la liste des contacts

Avant : deux requêtes en parallèle, une liste paginée `LIMIT/OFFSET` et un
`count(*)`. Après : `get_contacts_page_data(_limit, _offset)` renvoie un
document :

```json
{
  "contacts": [
    {
      "nanoid": "abc123def4",
      "firstname": "Ada",
      "lastname": "Lovelace",
      "created_at": "2026-11-23T15:45:00Z"
    }
  ],
  "total": 42
}
```

La route passe `PAGE_SIZE` et l'offset calculé, puis garde l'arithmétique de
`totalPages`. La CTE `page` parcourt l'index de la clé primaire pour
`ORDER BY id LIMIT/OFFSET`, donc aucun nouvel index n'est nécessaire. L'agrégat
JSON porte un `ORDER BY id` explicite : l'ordre du tableau fait partie du
contrat au lieu d'être un détail du planificateur, et le tri porte sur `_limit`
lignes au plus. `created_at` est émis en chaîne ISO 8601 UTC via `to_char`, pour
que le `new Date()` du navigateur la parse sans dépendre du `DateStyle` du
serveur.

### Conséquences

- Positif, parce qu'un rendu de page coûte un aller-retour au lieu de deux ou
  plus.
- Positif, parce qu'une instruction remplace plusieurs cycles
  analyse/planification/exécution et plusieurs lectures de résultats par une
  analyse, une planification et une charge utile JSON à décoder.
- Positif, parce que les valeurs intermédiaires (ici le total) restent dans la
  base.
- Positif, parce que `sqls/functions.sql` est rechargé de façon idempotente :
  une modification du corps prend effet au prochain `pnpm migrate`, sans
  nouvelle migration.
- Positif, parce qu'on peut tester le SQL isolément
  (`SELECT get_contacts_page_data(25, 0);`) et qu'il documente le contrat de la
  page.
- Neutre, parce que `created_at` arrive sous forme de chaîne ISO au lieu d'un
  `Date` ; le composant appelle déjà `new Date(contact.created_at)`.
- Négatif, parce que `sql.unsafe()` abandonne le tagged template : les
  placeholders et le tableau de paramètres doivent rester synchronisés à la main.
- Négatif, parce que le contrat JSON n'est pas contrôlé par un type ;
  le `COMMENT ON FUNCTION` et cet ADR le portent.

## Avantages et inconvénients des options

### A. Une fonction SQL stockée par rendu de page

- Positif, parce qu'elle atteint l'objectif d'un seul aller-retour avec un
  contrat testable.
- Positif, parce que les fonctions stockées sont déjà un motif présent dans le
  projet (`generate_nanoid`).
- Négatif, à cause du contrat JSON implicite et de l'appariement manuel entre
  placeholders et paramètres dans `sql.unsafe()`.

### B. Une grosse requête CTE inline en JavaScript

- Positif, parce qu'aucune fonction n'est nécessaire.
- Négatif, parce que la requête géante vivrait dans la couche route, plus
  difficile à tester isolément qu'une fonction.
- Négatif, parce que le texte SQL complet traverse le réseau et est analysé à
  chaque appel, alors qu'un appel de fonction stockée ne transmet qu'une courte
  référence et que son corps est analysé une fois, à la création.

### C. Approche hybride à deux requêtes

- Positif, parce que la requête de page dynamique reste optimale pour l'index.
- Négatif, parce qu'elle garde deux allers-retours et orchestre encore depuis
  JavaScript.

### D. Statu quo

- Positif, parce que c'est déjà implémenté et correct.
- Négatif, parce que la page des contacts coûte deux allers-retours, et
  davantage sur une page qui a besoin d'indicateurs de présence ou de
  recherches.

## Informations complémentaires

- `sqls/functions.sql` — les définitions de fonctions, chargées à la fin de
  chaque exécution de migration.
- `src/routes/(private)/contacts/+page.server.js` — la première application.
- [`docs/agents/sql-functions.md`](../agents/sql-functions.md) — chargement,
  idempotence et modèle d'appel pour un rendu de page.
- Source de la doctrine :
  [commit 929f7cb de toggl-pg-mirror](https://github.com/stephane-klein/toggl-pg-mirror/commit/929f7cb2b20c7e590d215c24e56a1153c7a5f1f4).
