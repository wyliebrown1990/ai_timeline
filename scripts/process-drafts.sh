#!/bin/bash
# Process all draft key figures one by one

set -e

# Get credentials
ADMIN_USER=$(aws ssm get-parameter --name "/ai-timeline/prod/admin-username" --with-decryption --query "Parameter.Value" --output text)
ADMIN_PASS=$(aws ssm get-parameter --name "/ai-timeline/prod/admin-password" --with-decryption --query "Parameter.Value" --output text)

# Get token
echo "Getting auth token..."
TOKEN=$(curl -s -X POST "https://nhnkwe8o6i.execute-api.us-east-1.amazonaws.com/prod/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$ADMIN_USER\", \"password\": \"$ADMIN_PASS\"}" | jq -r '.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo "Failed to get auth token"
  exit 1
fi
echo "Token obtained."

API_BASE="https://nhnkwe8o6i.execute-api.us-east-1.amazonaws.com/prod"

# Get all draft key figures
echo ""
echo "Fetching draft key figures..."
DRAFTS=$(curl -s "$API_BASE/api/key-figures?status=draft&limit=100" \
  -H "Authorization: Bearer $TOKEN" | jq -c '.data[]')

if [ -z "$DRAFTS" ]; then
  echo "No draft key figures found."
  exit 0
fi

COUNT=$(echo "$DRAFTS" | wc -l | tr -d ' ')
echo "Found $COUNT draft key figures to process."
echo ""

# Process each draft
SUCCESS=0
ERRORS=0
INDEX=0

while IFS= read -r draft; do
  INDEX=$((INDEX + 1))
  ID=$(echo "$draft" | jq -r '.id')
  NAME=$(echo "$draft" | jq -r '.canonicalName')

  echo "[$INDEX/$COUNT] Processing: $NAME"

  # Generate AI profile
  echo "  Generating AI profile..."
  PROFILE=$(curl -s -X POST "$API_BASE/api/admin/key-figures/generate-profile" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"name\": \"$NAME\"}" 2>&1)

  # Check for errors
  if echo "$PROFILE" | jq -e '.entityType' > /dev/null 2>&1; then
    ENTITY_TYPE=$(echo "$PROFILE" | jq -r '.entityType')
    ROLE=$(echo "$PROFILE" | jq -r '.role')
    SHORT_BIO=$(echo "$PROFILE" | jq -r '.shortBio')
    FULL_BIO=$(echo "$PROFILE" | jq -r '.fullBio')
    NOTABLE_FOR=$(echo "$PROFILE" | jq -r '.notableFor')
    PRIMARY_ORG=$(echo "$PROFILE" | jq -r '.primaryOrg // empty')
    WIKIPEDIA_URL=$(echo "$PROFILE" | jq -r '.wikipediaUrl // empty')
    TWITTER=$(echo "$PROFILE" | jq -r '.twitterHandle // empty')

    echo "  Entity: $ENTITY_TYPE, Role: $ROLE"

    # Build update payload
    UPDATE_DATA=$(jq -n \
      --arg role "$ROLE" \
      --arg shortBio "$SHORT_BIO" \
      --arg fullBio "$FULL_BIO" \
      --arg notableFor "$NOTABLE_FOR" \
      --arg primaryOrg "$PRIMARY_ORG" \
      --arg wikipediaUrl "$WIKIPEDIA_URL" \
      --arg twitterHandle "$TWITTER" \
      '{
        role: $role,
        shortBio: $shortBio,
        fullBio: $fullBio,
        notableFor: $notableFor,
        status: "published"
      } + (if $primaryOrg != "" then {primaryOrg: $primaryOrg} else {} end)
        + (if $wikipediaUrl != "" then {wikipediaUrl: $wikipediaUrl} else {} end)
        + (if $twitterHandle != "" then {twitterHandle: $twitterHandle} else {} end)')

    # Update the key figure
    echo "  Updating and publishing..."
    UPDATE_RESULT=$(curl -s -X PUT "$API_BASE/api/admin/key-figures/$ID" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "$UPDATE_DATA")

    if echo "$UPDATE_RESULT" | jq -e '.id' > /dev/null 2>&1; then
      echo "  ✓ Published: $NAME"
      SUCCESS=$((SUCCESS + 1))
    else
      echo "  ✗ Update failed: $(echo "$UPDATE_RESULT" | jq -r '.message // .error // "Unknown error"')"
      ERRORS=$((ERRORS + 1))
    fi
  else
    echo "  ✗ Profile generation failed: $(echo "$PROFILE" | jq -r '.message // .error // "Unknown error"')"
    ERRORS=$((ERRORS + 1))
  fi

  echo ""

  # Rate limiting
  if [ $INDEX -lt $COUNT ]; then
    sleep 2
  fi
done <<< "$DRAFTS"

echo "=========================================="
echo "COMPLETE"
echo "=========================================="
echo "Processed: $COUNT"
echo "Success: $SUCCESS"
echo "Errors: $ERRORS"
