#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/../"

kubectl get namespace my-app-test 2>/dev/null || kubectl create namespace my-app-test

helm upgrade --install my-app oci://ghcr.io/stephane-klein/charts/my-app \
    --namespace my-app-test \
    --set ingress.enabled=true \
    --set ingress.host=my-app-test.sklein.internal \
    --set-json 'ingress.annotations={"cert-manager.io/cluster-issuer":"homelab-ca"}' \
    --set-json 'ingress.tls=[{"hosts":["my-app-test.sklein.internal"],"secretName":"my-app-test-tls"}]' \
    --set seed.enabled=true \
    --set cnpg.namespace=my-app-test

echo "Waiting for rollout to complete..."
kubectl rollout status deployment/my-app --namespace my-app-test --timeout=300s

echo ""
echo "Application is ready at:"
echo "  https://my-app-test.sklein.internal"
