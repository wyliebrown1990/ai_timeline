#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"
echo "Generating Prisma client..."
npx prisma generate

echo "Building backend with a clean SAM cache..."
cd infra
sam build --no-cached

echo "Deploying backend stack..."
sam deploy --no-confirm-changeset "$@"
