# Deployment Playground

Local playground for testing the application in a production-like environment.

## Setup

```bash
$ mise run up
```

This task execute:

```bash
$ mise run build-dev-image
$ podman compose run --rm app seed
$ podman compose up -d app
$ mise show-url
Open your browser on http://localhost:35743
```

## Tear down

```bash
$ podman compose down -v
```
