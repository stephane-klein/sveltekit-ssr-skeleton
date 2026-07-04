# my-app Helm chart

Deploys the my-app service on Kubernetes with a CloudNativePG PostgreSQL cluster
in the same namespace.

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

