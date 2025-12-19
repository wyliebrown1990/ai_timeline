#!/bin/bash
# Frontend Deployment Script with Cache Headers
# Deploys to S3 with optimal cache settings for performance

set -e

BUCKET="ai-timeline-frontend-1765916222"
DISTRIBUTION_ID="E23Z9QNRPDI3HW"

echo "Building production bundle..."
npm run build

echo ""
echo "Syncing hashed assets with long cache (1 year)..."
aws s3 sync dist/assets/ s3://${BUCKET}/assets/ \
  --cache-control "max-age=31536000, immutable" \
  --delete

echo ""
echo "Syncing HTML with short cache (1 hour)..."
aws s3 cp dist/index.html s3://${BUCKET}/index.html \
  --cache-control "max-age=3600" \
  --content-type "text/html"

echo ""
echo "Syncing data files with medium cache (1 day)..."
if [ -d "dist/data" ]; then
  aws s3 sync dist/data/ s3://${BUCKET}/data/ \
    --cache-control "max-age=86400" \
    --delete
fi

echo ""
echo "Syncing other static files..."
aws s3 sync dist/ s3://${BUCKET}/ \
  --exclude "assets/*" \
  --exclude "index.html" \
  --exclude "data/*" \
  --exclude "stats.html" \
  --cache-control "max-age=86400" \
  --delete

echo ""
echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id ${DISTRIBUTION_ID} \
  --paths "/*" \
  --query "Invalidation.Id" \
  --output text

echo ""
echo "Deployment complete!"
echo ""
echo "Verify cache headers with:"
echo "  curl -I https://letaiexplainai.com/assets/index-*.js | grep -i cache"
