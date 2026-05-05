#!/usr/bin/env bash
set -euo pipefail

LABEL="com.letaiexplainai.seo-weekly-digest"
REPO_DIR="/Users/wyliebrown/ai_timeline"
SOURCE_PLIST="$REPO_DIR/scripts/launchd/$LABEL.plist.example"
TARGET_PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

mkdir -p "$HOME/Library/LaunchAgents" "$REPO_DIR/tmp/seo-weekly-digest"
cp "$SOURCE_PLIST" "$TARGET_PLIST"

if launchctl list | grep -q "$LABEL"; then
  launchctl unload "$TARGET_PLIST" || true
fi

launchctl load "$TARGET_PLIST"
launchctl list | grep "$LABEL"

echo "Installed $LABEL as a local fallback only. EventBridge remains the primary scheduler."
