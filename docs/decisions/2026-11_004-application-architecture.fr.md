---
status: accepted
date: 2026-11-24
decision-makers: Stéphane Klein
ai-assistants: DeepSeek V4.1 Flash (OpenCode Go)
---

# ADR 004 — Architecture applicative : l'URL et le schéma de la base de données, plutôt que des couches techniques

> Traduction française de
> [`2026-11_004-application-architecture.md`](./2026-11_004-application-architecture.md).
> En cas de divergence, la version anglaise fait foi.

## À quel type d'application cette architecture s'adresse-t-elle ?

L'architecture présentée dans cet ADR est adaptée seulement aux applications web
de gestion de données,
[CRUD](https://en.wikipedia.org/wiki/Create,_read,_update_and_delete) au sens
large. En simplifiant, ces applications font essentiellement trois choses :

- lire des informations dans une base de données relationnelle et les afficher
  dans une page HTML ;
- recevoir des données par une requête HTTP POST et les écrire dans la base
  de données relationnelle ;
- permettre à l'utilisateur de naviguer d'une page à l'autre par des URL.

Cette architecture n'est pas adaptée aux applications comme un tableur, un
traitement de texte, Blender, un navigateur web, un moteur de base de données
ou un compilateur.

## Contexte et problématique

Cet ADR ne marque pas un changement de direction dans ce projet.
L'architecture décrite ici était déjà à l'esprit implicitement au démarrage
du projet. Cet ADR en est la formalisation.

Ce skeleton,
[`sveltekit-ssr-skeleton`](https://github.com/stephane-klein/sveltekit-ssr-skeleton/),
est le point de départ des applications web de gestion de données
de [Stéphane Klein](https://sklein.xyz).

En trente ans de pratique, et de
manière consciente depuis 2017, le même constat revient. Il me semble que
les architectures en couches (du type Clean Architecture — [Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html),
architecture hexagonale — [Alistair Cockburn](https://alistair.cockburn.us/hexagonal-architecture/),
Domain-Driven Design — [Eric Evans](https://domainlanguage.com/ddd/)) augmentent
la charge cognitive pour comprendre un projet. Un nouveau venu doit lire un
contrôleur, un service, un repository, un
[DTO](https://martinfowler.com/eaaCatalog/dataTransferObject.html) et un mapper
avant de comprendre une page. Quand
l'équipe d'origine s'en va, ces abstractions restent, souvent mal comprises et
pas toujours utilisées. Elles portent souvent de la dette technique, et les
nouveaux arrivants ont souvent du mal à les maintenir et à les utiliser.
L'équipe finit souvent par réécrire le projet de zéro.

Ces architectures font appel à des concepts qu'il est nécessaire de bien
maîtriser — [use cases](https://martinfowler.com/bliki/UseCase.html),
[ports and adapters](https://alistair.cockburn.us/hexagonal-architecture/),
[entities](https://domainlanguage.com/ddd/reference/),
[aggregates](https://martinfowler.com/bliki/DDD_Aggregate.html) — et qui
s'intercalent entre la page et la donnée.

Sur la période 2015 à 2020, j'ai pris du recul. J'ai alors pris conscience que
les architectures que je qualifiais de « naïves » dans mes premiers projets PHP,
entre 1998 et 2004, étaient en fait faciles à comprendre et, par conséquent,
je pouvais y contribuer facilement. Pourquoi ces projets étaient-ils plus
simples ? Je pense que c'est parce que les projets CRUD de l'époque n'avaient
qu'une indirection : le fichier appelé par l'URL contenait la requête.
La simplicité ne venait pas du langage PHP, mais du petit nombre d'étapes entre
l'URL et la donnée.

En 2023, j'ai pris conscience de cette architecture, j'en ai parlé autour de moi
et j'ai commencé à la suivre.

De mon point de vue, cette architecture nécessite moins de charge cognitive pour
travailler sur le projet.

Cette architecture était valable en 2023 ; il me semble qu'elle l'est toujours
en 2026, même à l'ère des agents IA de coding. J'observe dans ma pratique que ce
qui est simple à comprendre pour un humain l'est souvent aussi pour un LLM. À
tâche égale, dans ma pratique, une architecture simple, avec peu d'indirections,
consomme moins de tokens. Les échanges avec l'agent sont souvent plus rapides.
Elle réduit aussi le besoin d'un LLM puissant : mon expérience me montre qu'un
modèle rapide et économique, comme DeepSeek V4.1 Flash, contribue sans difficulté
à des projets qui suivent cette architecture.

Cet ADR et le document
[`docs/agents/application-architecture.md`](../agents/application-architecture.md)
ont pour but de permettre aux contributeurs, humains ou agents IA, de comprendre
les règles d'architecture du projet et de produire du code qui les respecte.
L'objectif est de préserver la cohérence d'ensemble.

## Critères de décision

Voici les différents critères qui m'ont guidé vers cette architecture :

- Un nouveau venu, humain ou agent, peut lire l'application depuis ses deux
  frontières : l'URL et le schéma de la base de données.
- Le chemin entre l'URL et la donnée reste court : peu d'indirections et peu de
  concepts à maîtriser.
- Le schéma de la base de données porte les contraintes ; il est le contrat.
- Aucun compromis sur la vitesse de rendu des pages : l'utilisateur final doit
  avoir le sentiment d'une application rapide et réactive.

## Options envisagées

- **A. ORM avec le modèle NestJS/AngularJS** — modules, controllers, services,
  injection de dépendances, repository, ORM. L'application est organisée par
  couches techniques, pas par domaine.
- **B. Architecture hexagonale** — ports and adapters, use cases, inversion de
  dépendance. Le cœur métier ne dépend ni du framework ni de l'ORM ; l'ORM est
  un adapter à la frontière.
- **C. Domain-Driven Design** — entities, aggregates, repositories, domain
  services. Le modèle métier vit dans le code, et l'ORM assure la persistance.
- **D. SPA et API REST** — le frontend est une application séparée, l'API expose
  des ressources génériques, et la SPA assemble la page dans le navigateur. Le
  serveur ne renvoie pas de HTML, seulement du JSON.
- **E. Une page par URL, du SQL brut, sans couches intermédiaires** — l'URL et le
  schéma de la base de données comme repères : l'arborescence suit l'URL, la page
  possède ses composants et ses helpers, les lectures se font par une fonction
  stockée par rendu de page, les écritures qui demandent une opération en
  plusieurs étapes ou une instruction partagée sont des fonctions stockées, et
  le schéma porte les contraintes.

J'ai aussi considéré [htmx](https://htmx.org/). J'ai un faible pour cette
technologie : elle échange des fragments HTML plutôt que du JSON, et elle coche
beaucoup de cases. Mais je lui préfère SvelteKit SSR + hydration, plus flexible
et, de mon point de vue, avec une meilleure Developer Experience. Si je devais
développer une application de ce type en Go ou en Rust, je pense que je
retiendrais htmx.

## Décision retenue

Option retenue : **E**. Une page par URL, du SQL brut, sans couches
intermédiaires.

L'URL, les fichiers de routage sur le filesystem et le schéma de la base de
données servent de points d'entrée pour comprendre le code. Si un développeur
sait lire et écrire des données en SQL, cela suffit.

### Utiliser les mêmes noms de l'interface web jusqu'au schéma de la base de données

L'architecture évite au maximum d'ajouter des abstractions au niveau des fichiers
ou des fonctions. Elle n'invente donc pas de vocabulaire intermédiaire : les noms
de l'interface web et du domaine métier suffisent à nommer les routes, les tables
et les fonctions. L'URL reprend le nom de la page dans l'interface web. La table
reprend le nom de l'entité métier. Une fonction qui modifie des données reprend le
nom de l'action de l'interface web.

Un nom qui promet ce que le code ne fait pas est un défaut, même quand le code
fonctionne. Un nom de fonction doit exprimer ce que le code fait. Il est préférable
d'utiliser un identifiant long plutôt qu'un nom vague.

### SSR et hydratation

Le rendu est côté serveur ([SSR](https://svelte.dev/docs/kit/glossary#SSR)), puis
[hydraté](https://svelte.dev/docs/kit/glossary#Hydration) côté client. Le serveur
envoie le HTML de la page et son payload ; Svelte prend le relais dans le
navigateur pour l'interactivité. La page n'est pas une SPA qui appelle une API
générique pour s'assembler.

### Une page, un payload spécifique

Le frontend n'est pas un client d'API générique. L'application ne construit pas
une API généraliste pour alimenter ses propres pages. Chaque page reçoit du
serveur les données dont elle a besoin, dans un seul payload façonné
pour elle ; elle n'assemble pas la page à partir de plusieurs ressources
génériques. Le serveur possède les données et les règles métier ; le frontend
possède la présentation.

Comme la lecture tient en une seule requête ou une fonction stockée, PostgreSQL
planifie l'ensemble de la page en une fois. Un ORM, lui, génère le SQL à la place
du développeur et masque souvent les optimisations du planificateur et les
fonctionnalités propres à PostgreSQL. Un client d'API générique, de son côté,
oblige souvent à multiplier les appels et à recomposer les données en plusieurs
étapes. Mon expérience montre que le payload par page réduit la quantité de code
pour une même fonctionnalité. La réponse est optimisée pour la vitesse : un seul
aller-retour vers la base, un seul payload.

C'est le pendant côté lecture du chemin d'écriture décrit plus bas. C'est aussi la
raison pour laquelle
[ADR 002](./2026-11_002-single-sql-function-per-page-render.fr.md) demande une
fonction stockée par rendu de page.

Une API publique peut exister pour des clients externes et pour GitOps. Les pages
de l'application ne la consomment pas : le payload d'une page et l'API
publique n'ont pas les mêmes raisons de changer. Dans ce skeleton, les endpoints
`/api/v1/contacts` sont un exemple : ils montrent la forme d'une API publique, et
la page des contacts ne les appelle pas. La page lit ses données via
`get_contacts_page_data`. Max Chernyak appelle cette approche
[Server Informed UI](https://max.engineer/server-informed-ui).

### Règles d'écriture en base de données

Les requêtes SQL d'écriture sont directement implémentées dans le handler de route
(`+page.server.js`) quand elles se limitent à une seule instruction et sont assez
courtes pour être lues sur place. Elles deviennent des fonctions stockées quand
elles retirent du travail au code du handler (`+page.server.js`) et réduisent
ainsi sa charge de calcul :

- une opération d'écriture en plusieurs étapes : plusieurs instructions qui
  doivent être validées ensemble (commit), ou une branche qui signale une erreur
  métier ;
- une instruction partagée : plusieurs usages, ou une autre fonction SQL ;
- un coût mesuré : l'instruction est assez grosse ou assez sollicitée pour
  que son analyse et son transfert à chaque appel apparaissent dans une mesure.

Le payload JSON pour un rendu de page se construit à la lecture ;
[ADR 002](./2026-11_002-single-sql-function-per-page-render.fr.md) et la section
[« Une page, un payload spécifique »](#une-page-un-payload-spécifique) le
décrivent.

Une seule instruction qui touche plusieurs tables reste une seule instruction
quand elle utilise par exemple la fonctionnalité CTE : les
[CTE](https://www.postgresql.org/docs/current/queries-with.html) qui modifient
des données s'exécutent dans la transaction de l'instruction, donc l'écriture est
atomique. Compter les tables est le mauvais critère : une instruction qui touche
trois tables peut encore être validée comme un seul ensemble. Le bon critère est
le nombre d'instructions et le nombre de points d'appel : un handler de route, un
script, un worker, ou une autre fonction SQL.

Par défaut, il faut écrire les instructions SQL à l'aide des tagged templates
(`` sql`...` ``). Avec cette syntaxe, postgres.js utilise la fonctionnalité de
préparation de PostgreSQL : les instructions sont analysées et planifiées une
fois, puis le plan est réutilisé aux appels suivants. Cela rend l'implémentation
plus performante quand la même requête est exécutée souvent, parce que ce coût
n'est pas repayé à chaque appel. Exemple :

```js
const contacts = await sql`
  SELECT id, firstname, lastname
  FROM contacts
  WHERE lastname = ${lastname}
`;
```

Une opération qui nécessite une fonctionnalité non disponible dans PostgreSQL, ou
trop difficile à mettre en place (envoyer un e-mail, appeler une API HTTP), peut
rester en JavaScript.

Quand l'ordre ou le contenu des instructions dépend d'une décision calculée en
JavaScript, l'écriture peut rester dans le handler, dans une transaction
(`sql.begin()`).

### Le schéma de la base de données

Le schéma SQL de la base de données doit être implémenté avec le plus grand soin :
c'est le contrat. Les contraintes, les colonnes générées et les modifications
automatiques (cascade, trigger) sont déclarées dans le schéma, et la base les
applique elle-même au moment de l'écriture. La documentation vit dans
`COMMENT ON`, avec l'objet. La documentation plus longue peut être présente
sous forme de commentaires dans les fichiers SQL et les migrations.

### Colocalisation

Un composant, un helper ou une remote function dont une seule page a besoin
vit dans le répertoire `_components/` de cette page. Cet élément ne passe dans
`src/lib/` que lorsqu'une seconde page en a besoin, et d'abord dans le plus
proche ancêtre commun. Une indirection ne se justifie qu'à partir de deux pages.

Voici un exemple :

```text
src/
├── routes/(private)/
│   ├── timeline/
│   │   ├── +page.server.js
│   │   ├── +page.svelte
│   │   └── _components/
│   │       ├── TimelineEventsTable.svelte
│   │       └── timelineEvents.remote.js
│   └── time-entries/
│       ├── +page.server.js
│       ├── +page.svelte
│       ├── _components/
│       │   ├── TimeEntriesTable.svelte
│       │   └── timeEntries.remote.js
│       ├── day/
│       │   └── [date]/
│       │       ├── +page.server.js
│       │       └── +page.svelte
│       ├── week/
│       │   └── [year]/[week]/
│       │       ├── +page.server.js
│       │       └── +page.svelte
│       ├── month/
│       │   └── [month]/
│       │       ├── +page.server.js
│       │       └── +page.svelte
│       └── range/
│           ├── +page.server.js
│           └── +page.svelte
└── lib/
    └── components/
        ├── GoTo.svelte
        ├── ModeSelector.svelte
        └── nav/
```

`timeline` n'a qu'une page : son `_components/` reste à côté d'elle. Les cinq
vues de `time-entries` partagent le leur au plus proche ancêtre commun. La
navigation commune à `time-entries` et `charts` vit dans `src/lib/components/`.

La règle couvre aussi le code SQL. Une instruction utilisée par une seule route reste dans
la route ; une instruction partagée par plusieurs routes, ou trop grosse pour
être lue sur place, passe dans `sqls/functions.sql`.

### Abstractions acceptées

Le refus d'abstraction vise les frameworks génériques, comme
[NestJS](https://nestjs.com/), et les abstractions créées spécifiquement pour
l'application.

Une bibliothèque, un outil ou un service qui a un but précis, son
propre dépôt et une documentation soignée est accepté, comme
[Temporal](https://github.com/temporalio/temporal) ou
[Melange](https://melange.sh/). De tels outils ne réorganisent pas le flux des
pages ; ils apportent une brique utile aux fonctionnalités métier de
l'application.

### Points forts et points faibles de la solution retenue

La solution retenue est
**E. Une page par URL, du SQL brut, sans couches intermédiaires**. Je la reprends
avec les quatre critères de la section « Critères de décision ». J'ajoute un point
faible sur l'adoption, qui ne dépend d'aucun critère.

**Lire l'application depuis l'URL et le schéma**

- Point fort : l'arborescence des routes suit l'URL, et chaque page possède ses
  composants et ses helpers. Le schéma consolidé dans `sqls/schema.sql` décrit les
  tables, les contraintes et les commentaires. Un nouveau venu part de l'une ou de
  l'autre frontière et trouve le code.

**Peu d'indirections entre le handler de la page et la base de données**

- Point fort : pas de service, pas de repository, pas de DTO, pas d'ORM. Le handler
  exécute son SQL directement quand une instruction suffit. Il appelle une fonction
  stockée quand l'opération demande plusieurs étapes ou construit le payload d'une
  page. Un rendu traverse une seule frontière : JavaScript, puis SQL.

**Faire du schéma le contrat**

- Point fort : les contraintes, les colonnes générées, les cascades et les triggers
  sont déclarés dans le schéma. La base refuse les données invalides quel que soit
  le code qui écrit.

**Ne pas compromettre la vitesse de rendu**

- Point fort : le serveur envoie du HTML déjà rempli, avec un seul aller-retour vers
  la base. Ni cascade de requêtes, ni appels d'API à assembler dans le navigateur.

**Faire accepter l'architecture**

- Point faible : cette architecture n'est pas populaire. Elle ne s'appuie pas sur
  les frameworks et les outils attendus sur le marché, et beaucoup de développeurs
  la jugeront naïve. Il faut donc du temps pour convaincre, et les arguments
  techniques ne suffisent pas toujours.

## Avantages et inconvénients des autres options

Ce qui suit n'est pas un classement. C'est ce que je retiens de chaque option,
avec ce qui me convainc et ce qui me gêne.

### A. ORM avec le modèle NestJS/AngularJS

**Points forts**

- Le modèle est familier à beaucoup de développeurs.
- Le framework fournit une structure et un vocabulaire.

**Points faibles**

- Le coût cognitif d'entrée est élevé : une page traverse module, controller,
  service, repository, DTO et mapper.
- Le passage par ces couches ajoute des conversions et des requêtes, et ralentit
  l'exécution par rapport à du SQL direct.
- L'ORM cache le SQL qui s'exécute réellement.
- L'organisation par type technique éparpille une même fonctionnalité dans
  plusieurs répertoires.

### B. Architecture hexagonale

**Points forts**

- Le cœur métier ne dépend ni du framework ni de l'ORM, et il se teste seul.
- Les ports et les adapters rendent les frontières explicites et remplaçables.

**Points faibles**

- Les ports et les adapters ajoutent de l'indirection, et donc de la charge
  cognitive : une page traverse plus de fichiers.
- L'ORM reste un adapter : s'il est utilisé, le SQL reste caché.
- D'après mon expérience, une application à couches est plus lente à l'exécution
  qu'une implémentation directe en SQL : le passage dans plusieurs couches ajoute
  des conversions et des requêtes supplémentaires.

### C. Domain-Driven Design

**Points forts**

- Le modèle métier est explicite, et le langage ubiquitaire vit dans le code.
- Les règles complexes sont isolées dans les entities et les aggregates.

**Points faibles**

- Les entities, les aggregates, les repositories et les domain services ajoutent
  de l'indirection.
- Le passage par ces couches ajoute du mapping et des requêtes, et ralentit
  l'exécution par rapport à du SQL direct.
- L'ORM cache le SQL, et le mapping entre le domaine et les tables ajoute une
  couche.

### D. SPA et API REST

**Points forts**

- C'est une architecture populaire.
- Le frontend et le backend sont séparés et peuvent être déployés indépendamment.
- L'API peut servir une application mobile ou des clients externes.

**Points faibles**

- La page est assemblée côté navigateur à partir de plusieurs appels, donc avec
  plus d'allers-retours.
- PostgreSQL ne peut pas planifier toute la page en une requête, et le frontend
  fait les transformations.
- Le premier rendu est plus lent, ce qui, d'après mon expérience, donne une
  impression de lenteur.
- Il faut maintenir deux contrats, celui de l'API et celui du frontend, et gérer
  leur compatibilité de version.

## Informations complémentaires

Voici les concepts d'architecture qui m'ont inspiré et que j'ai repris dans
l'architecture retenue :

- **Thick Database, SmartDB, thin/thin/fat** — dans la communauté PL/SQL/Oracle,
  le code du navigateur et celui du backend restent légers, et la base porte
  l'essentiel de la logique. Steven Feuerstein a documenté le concept dans
  [The SmartDB Resource Center](http://stevenfeuersteinonplsql.blogspot.com/2018/05/the-smartdb-resource-center.html);
  Peter Koletzke l'illustre dans [Using a PL/SQL Table API to Implement Thick
  Database Principles](https://www.youtube.com/watch?v=uOrmKq2qvHc).
- **SQL-as-code** — Dimitri Fontaine,
  [The Art of PostgreSQL](https://theartofpostgresql.com/).
- **Vertical Slice Architecture** — Jimmy Bogard,
  [Vertical Slice Architecture](https://www.jimmybogard.com/vertical-slice-architecture/).
- **Screaming Architecture** — Robert C. Martin,
  [Screaming Architecture](https://blog.cleancoder.com/uncle-bob/2011/09/30/Screaming-Architecture.html).
- **Server Informed UI** — Max Chernyak,
  [Don't Build A General Purpose API To Power Your Own Front End](https://max.engineer/server-informed-ui).
- **Majestic Monolith** — DHH,
  [The Majestic Monolith](https://signalvnoise.com/svn3/the-majestic-monolith/).
- **MonolithFirst** — Martin Fowler,
  [MonolithFirst](https://martinfowler.com/bliki/MonolithFirst.html).
- **Radical Simplicity** — Stephan Schmidt,
  [Radical Simplicity in Technology](https://www.radicalsimpli.city/).

Les approches rejetées, pour référence :

- Clean Architecture — [Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- Architecture hexagonale — [Alistair Cockburn](https://alistair.cockburn.us/hexagonal-architecture/)
- Domain-Driven Design — [Eric Evans](https://domainlanguage.com/ddd/)
- Repository — [Martin Fowler](https://martinfowler.com/eaaCatalog/repository.html)
- Data Transfer Object — [Martin Fowler](https://martinfowler.com/eaaCatalog/dataTransferObject.html)
- Injection de dépendances — [Martin Fowler](https://martinfowler.com/articles/injection.html)

Références internes :

- [`AGENTS.md`](../../AGENTS.md) — Application Architecture.
- [`docs/agents/application-architecture.md`](../agents/application-architecture.md)
  — la référence à jour.
- [`docs/agents/sql-functions.md`](../agents/sql-functions.md) — le modèle de
  lecture.
- [ADR 002](./2026-11_002-single-sql-function-per-page-render.fr.md) — une
  fonction stockée par rendu de page.
