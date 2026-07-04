#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/../"

helm uninstall my-app --namespace my-app-test 2>/dev/null || true
kubectl delete namespace my-app-test 2>/dev/null || true
