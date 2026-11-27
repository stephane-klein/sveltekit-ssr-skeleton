# my-app Helm chart

Deploys the my-app service on Kubernetes with a CloudNativePG PostgreSQL cluster
in the same namespace.

The deployment of this chart was tested in a
[homelab playground](https://github.com/stephane-klein/homelab.sklein.xyz/tree/main/playground/sveltekit-ssr-skeleton).

The container image is published on
[GitHub Container Registry](https://github.com/users/stephane-klein/packages/container/package/my-app):
`ghcr.io/stephane-klein/my-app`.

## Prerequisites

- **Kubernetes cluster** (tested on k3s)
- **Helm** 3.8+
- **CloudNativePG operator** installed in the cluster

## Quick start

```bash
$ kubectl create namespace my-app
$ helm upgrade --install my-app oci://ghcr.io/stephane-klein/charts/my-app \
    --namespace my-app \
    --set ingress.enabled=true \
    --set ingress.host=my-app.example.com
```

## Configuration

See [values.yaml](https://github.com/stephane-klein/my-app/blob/main/helm/my-app/values.yaml).

Pass custom values via `--set` or a YAML file:

```bash
$ helm upgrade --install my-app oci://ghcr.io/stephane-klein/my-app \
    --namespace my-app \
    -f my-values.yaml
```

## How to test Helm chart

```sh
$ mise run publish-chart
$ mise run deploy-helm-test
...
$ mise run destroy-helm-test
```

## How it works

### PostgreSQL connection

The chart creates a CNPG `Cluster` resource in the same namespace. The CNPG
operator automatically generates an app secret named `<clusterName>-app`
(default: `my-app-app`) with keys: `host`, `port`, `dbname`, `username`,
`password`. The connection URL is built at pod startup as
`postgres://$(DB_USER):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/$(DB_NAME)` and
exposed via `MY_APP_POSTGRES_URL`.

### OpenID Connect (OIDC)

The application can authenticate users via OpenID Connect. The implementation
is currently specific to **Authelia** (endpoint paths are hardcoded to
Authelia's convention).

`MY_APP_ORIGIN` is the public origin of the application. It builds the OIDC
callback URL and the links sent by email (password reset, magic login). It is
automatically derived from `ingress.host` when ingress is enabled. Set `origin`
explicitly to override, and set it when ingress is disabled: without it, email
links fall back to `http://localhost:5173`.

SvelteKit derives the origin used for CSRF checks from the `Host` and
`X-Forwarded-Proto` headers that the ingress already forwards, so no build-time
`paths.origin` is needed.

Enable OIDC with:

```bash
$ helm upgrade --install my-app oci://ghcr.io/stephane-klein/charts/my-app \
    --namespace my-app \
    --set ingress.enabled=true \
    --set ingress.host=my-app.example.com \
    --set adminToken="$(openssl rand -hex 32)" \
    --set oidc.enabled=true \
    --set oidc.issuer=https://auth.example.com \
    --set oidc.clientId=my-app \
    --set oidc.clientSecret=...
```

### Signup

Public signup is closed by default: `/signup` shows a message and the "Create
account" links are hidden. When signup is closed, you can create accounts with the
admin API (`PUT /api/v1/admin/users`) or the `pnpm add-user` CLI.

Open signup with:

```bash
$ helm upgrade --install my-app oci://ghcr.io/stephane-klein/charts/my-app \
    --namespace my-app \
    --set signup.enabled=true
```

## Managing users (idempotent GitOps)

After deploying the chart, provision or reconcile the set of users idempotently
through the admin API. This is the GitOps pattern: a configuration file declares
the desired users, and a runner applies it — create/update/delete in one atomic
`PUT /api/v1/admin/users/sync`, re-applicable without error and with a stable
final state.

**Prerequisite** — the admin API must be enabled: set `adminToken` at install
time (at least 32 characters), or use an existing secret exposing the
`MY_APP_ADMIN_TOKEN` key (`secrets.existingSecret`).

Sync users against the deployed application:

```bash
$ curl -s -X PUT -H "Authorization: Bearer ${MY_APP_ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    --data @api-payloads-examples/users-sync.json \
    https://my-app.example.com/api/v1/admin/users/sync | jq
```

A ready-to-use payload lives in
[`api-payloads-examples/users-sync.json`](../../api-payloads-examples/users-sync.json)
at the repository root — see the [root README section](../../README.md) for the
idempotency details and the single-user `PUT /api/v1/admin/users` variant.

### Managing API tokens in the same payload

Each `upsert` item accepts an optional `tokens` object. Tokens are identified by
`(user_id, name)`, so the name is the stable key across environments.

```json
{
  "upsert": [
    {
      "email": "alice@example.com",
      "display_name": "Alice Admin",
      "tokens": {
        "upsert": [
          {
            "name": "demo",
            "token": "REPLACE_ME_ALICE_API_TOKEN_32_CHARS_MIN",
            "expires_at": "2027-06-01T00:00:00Z"
          },
          { "name": "ci-deploy", "expires_at": null }
        ],
        "delete": ["old-token"]
      }
    }
  ]
}
```

The two token declarations behave differently:

- `{ "name": "...", "token": "..." }` sets an exact value. Re-applying the same
  value is a no-op. This is the mode to use when the token comes from a secret
  manager.
- `{ "name": "..." }` creates the token with a generated value when it does not
  exist. An existing token keeps its value. The generated value is returned once
  in `data.raw_tokens`; store it immediately.

`expires_at` is an absolute ISO 8601 date. `null` means the token never expires.
Omitting the field keeps the current expiration, which keeps the payload
idempotent. `tokens.delete` removes the listed names; deleting an unknown name
is a no-op.

Tokens are reconciled, not fully replaced: removing an entry from
`tokens.upsert` leaves the existing token in place, so pruning a token requires
an explicit entry in `tokens.delete`. An `expires_at` value in the past is
rejected, so update the payload before the declared date.

To rotate a token, change its `token` value in the source secret and re-apply the
payload. The sync replaces the stored hash. A token generated by the server has
no readable value, so rotate it by deleting it in one sync and creating it again
in a later sync, or by starting to supply an explicit value.

Never apply the example payload as-is in production: replace the placeholder
token values and inject them from your secret manager.

The endpoint stores only the SHA-256 hash. A value supplied in `token` is never
echoed in the response. Values generated by the server appear only in
`data.raw_tokens`, and only on the request that created them.

Filter the response before logging it in CI:

```bash
$ curl -s -X PUT -H "Authorization: Bearer ${MY_APP_ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    --data @api-payloads-examples/users-sync.json \
    https://my-app.example.com/api/v1/admin/users/sync \
    | jq '{users: (.data.created + .data.updated), tokens: .data.tokens, raw_tokens: .data.raw_tokens}'
```
