#!/bin/bash
# Build the Chrome extension and package extension/dist into a zip
# served as a static asset from /public so admins can download it from
# /admin/extension and load it as an unpacked extension on any computer.
#
# The extension contains no secrets — only the public API URL. The stable
# extension ID is locked in via manifest.config.ts (PUBLIC_KEY_B64), so the
# downloaded build keeps the same ID as the dev build.

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXT_DIR="$ROOT/extension"
PUBLIC_DIR="$ROOT/public"
ZIP_PATH="$PUBLIC_DIR/ai-timeline-extension.zip"
META_PATH="$PUBLIC_DIR/ai-timeline-extension.json"

if [ ! -d "$EXT_DIR" ]; then
  echo "extension/ directory not found at $EXT_DIR"
  exit 1
fi

cd "$EXT_DIR"

if [ ! -d node_modules ]; then
  echo "Installing extension dependencies (bun install)..."
  bun install
fi

echo "Building extension (bun run build)..."
bun run build

if [ ! -d dist ]; then
  echo "extension/dist not found after build"
  exit 1
fi

VERSION=$(node -p "require('./package.json').version")
EXT_ID=""
if [ -f EXTENSION_ID.txt ]; then
  EXT_ID=$(tr -d '[:space:]' < EXTENSION_ID.txt)
fi
BUILT_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

mkdir -p "$PUBLIC_DIR"
rm -f "$ZIP_PATH"

echo "Zipping extension/dist -> $ZIP_PATH"
(cd dist && zip -qr "$ZIP_PATH" .)

SIZE_BYTES=$(wc -c < "$ZIP_PATH" | tr -d ' ')

cat > "$META_PATH" <<EOF
{
  "version": "$VERSION",
  "extensionId": "$EXT_ID",
  "builtAt": "$BUILT_AT",
  "sizeBytes": $SIZE_BYTES,
  "filename": "ai-timeline-extension.zip"
}
EOF

echo "Wrote $META_PATH"
echo "Done. version=$VERSION  size=${SIZE_BYTES}B"
