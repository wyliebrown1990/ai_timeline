#!/bin/bash
# Process all pending KeyFigureDrafts
# For each draft:
#   - If matching KeyFigure exists: merge
#   - If not: generate AI profile and approve (create new KeyFigure)

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

# Get all pending KeyFigureDrafts
echo ""
echo "Fetching pending KeyFigureDrafts..."
DRAFTS=$(curl -s "$API_BASE/api/admin/key-figure-drafts?status=pending&limit=100" \
  -H "Authorization: Bearer $TOKEN" | jq -c '.data[]')

if [ -z "$DRAFTS" ]; then
  echo "No pending KeyFigureDrafts found."
  exit 0
fi

COUNT=$(echo "$DRAFTS" | wc -l | tr -d ' ')
echo "Found $COUNT pending KeyFigureDrafts to process."
echo ""

# Process each draft
SUCCESS=0
MERGED=0
APPROVED=0
ERRORS=0
INDEX=0

while IFS= read -r draft; do
  INDEX=$((INDEX + 1))
  DRAFT_ID=$(echo "$draft" | jq -r '.id')
  NAME=$(echo "$draft" | jq -r '.normalizedName')
  SUGGESTED_BIO=$(echo "$draft" | jq -r '.suggestedBio // empty')
  SUGGESTED_ORG=$(echo "$draft" | jq -r '.suggestedOrg // empty')
  SUGGESTED_ROLE=$(echo "$draft" | jq -r '.suggestedRole // "researcher"')
  MATCHED_ID=$(echo "$draft" | jq -r '.matchedFigureId // empty')

  echo "[$INDEX/$COUNT] Processing: $NAME"

  # Check if this name already exists as a KeyFigure
  # Normalize the name to create ID
  KEY_FIGURE_ID=$(echo "$NAME" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//')

  EXISTING=$(curl -s "$API_BASE/api/key-figures/$KEY_FIGURE_ID" \
    -H "Authorization: Bearer $TOKEN" | jq -r '.id // empty')

  if [ -n "$EXISTING" ] && [ "$EXISTING" != "null" ]; then
    # KeyFigure exists - merge
    echo "  Found existing KeyFigure: $EXISTING - merging..."
    RESULT=$(curl -s -X POST "$API_BASE/api/admin/key-figure-drafts/$DRAFT_ID/merge" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "{\"targetId\": \"$EXISTING\"}" 2>&1)

    if echo "$RESULT" | jq -e '.id' > /dev/null 2>&1; then
      echo "  ✓ Merged with: $EXISTING"
      SUCCESS=$((SUCCESS + 1))
      MERGED=$((MERGED + 1))
    else
      echo "  ✗ Merge failed: $(echo "$RESULT" | jq -r '.message // .error // "Unknown error"')"
      ERRORS=$((ERRORS + 1))
    fi
  else
    # No existing KeyFigure - generate AI profile and approve
    echo "  No existing KeyFigure - generating AI profile..."

    PROFILE=$(curl -s -X POST "$API_BASE/api/admin/key-figures/generate-profile" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "{\"name\": \"$NAME\"}" 2>&1)

    if echo "$PROFILE" | jq -e '.shortBio' > /dev/null 2>&1; then
      AI_BIO=$(echo "$PROFILE" | jq -r '.shortBio')
      AI_ROLE=$(echo "$PROFILE" | jq -r '.role')
      AI_ORG=$(echo "$PROFILE" | jq -r '.primaryOrg // empty')
      AI_NOTABLE=$(echo "$PROFILE" | jq -r '.notableFor')

      echo "  AI profile generated: $AI_ROLE"

      # Approve with AI-generated data
      APPROVE_DATA=$(jq -n \
        --arg shortBio "$AI_BIO" \
        --arg role "$AI_ROLE" \
        --arg primaryOrg "$AI_ORG" \
        --arg notableFor "$AI_NOTABLE" \
        '{
          shortBio: $shortBio,
          role: $role,
          notableFor: $notableFor
        } + (if $primaryOrg != "" then {primaryOrg: $primaryOrg} else {} end)')

      RESULT=$(curl -s -X POST "$API_BASE/api/admin/key-figure-drafts/$DRAFT_ID/approve" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d "$APPROVE_DATA" 2>&1)

      if echo "$RESULT" | jq -e '.keyFigure.id' > /dev/null 2>&1; then
        NEW_ID=$(echo "$RESULT" | jq -r '.keyFigure.id')
        echo "  ✓ Approved - created KeyFigure: $NEW_ID"
        SUCCESS=$((SUCCESS + 1))
        APPROVED=$((APPROVED + 1))
      else
        # If approve failed (e.g., ID exists), try to merge instead
        ERROR_MSG=$(echo "$RESULT" | jq -r '.message // .error // "Unknown error"')
        if [[ "$ERROR_MSG" == *"already exists"* ]]; then
          echo "  KeyFigure ID collision - attempting merge..."
          # Extract the ID from error or use normalized
          MERGE_RESULT=$(curl -s -X POST "$API_BASE/api/admin/key-figure-drafts/$DRAFT_ID/merge" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $TOKEN" \
            -d "{\"targetId\": \"$KEY_FIGURE_ID\"}" 2>&1)

          if echo "$MERGE_RESULT" | jq -e '.id' > /dev/null 2>&1; then
            echo "  ✓ Merged instead"
            SUCCESS=$((SUCCESS + 1))
            MERGED=$((MERGED + 1))
          else
            echo "  ✗ Both approve and merge failed"
            ERRORS=$((ERRORS + 1))
          fi
        else
          echo "  ✗ Approve failed: $ERROR_MSG"
          ERRORS=$((ERRORS + 1))
        fi
      fi
    else
      # AI profile generation failed - approve with suggested data
      echo "  AI profile failed - using suggested data..."

      APPROVE_DATA=$(jq -n \
        --arg shortBio "${SUGGESTED_BIO:-Mentioned in article}" \
        --arg role "$SUGGESTED_ROLE" \
        --arg primaryOrg "$SUGGESTED_ORG" \
        '{
          shortBio: $shortBio,
          role: $role
        } + (if $primaryOrg != "" then {primaryOrg: $primaryOrg} else {} end)')

      RESULT=$(curl -s -X POST "$API_BASE/api/admin/key-figure-drafts/$DRAFT_ID/approve" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d "$APPROVE_DATA" 2>&1)

      if echo "$RESULT" | jq -e '.keyFigure.id' > /dev/null 2>&1; then
        NEW_ID=$(echo "$RESULT" | jq -r '.keyFigure.id')
        echo "  ✓ Approved with suggested data: $NEW_ID"
        SUCCESS=$((SUCCESS + 1))
        APPROVED=$((APPROVED + 1))
      else
        echo "  ✗ Approve failed: $(echo "$RESULT" | jq -r '.message // .error // "Unknown error"')"
        ERRORS=$((ERRORS + 1))
      fi
    fi
  fi

  echo ""

  # Rate limiting
  if [ $INDEX -lt $COUNT ]; then
    sleep 1.5
  fi
done <<< "$DRAFTS"

echo "=========================================="
echo "COMPLETE"
echo "=========================================="
echo "Processed: $COUNT"
echo "Success: $SUCCESS"
echo "  - Approved (new): $APPROVED"
echo "  - Merged: $MERGED"
echo "Errors: $ERRORS"
