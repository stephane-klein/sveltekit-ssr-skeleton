#!/bin/bash

set -euo pipefail

echo "Running betterleaks to check for secrets leaks..."
betterleaks dir --no-banner -v "$(cd "$(dirname "$0")/.." && pwd)"
echo "No leaks detected by betterleaks."
