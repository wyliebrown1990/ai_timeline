# Sprint 28: Custom Domain Setup — letaiexplainai.com

**Impact**: High | **Effort**: Low | **Dependencies**: None

**Status**: ✅ COMPLETE

## Overview

Configure the custom domain `letaiexplainai.com` (and `www.letaiexplainai.com`) to point to the existing CloudFront production distribution. Uses Cloudflare for DNS (where domain was purchased) to minimize costs.

**Target Distribution**: `E23Z9QNRPDI3HW` (d33f170a3u5yyl.cloudfront.net)

---

## Architecture

```
User Request
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│  Cloudflare DNS (FREE)                                      │
│  letaiexplainai.com     → CNAME → d33f170a3u5yyl.cloudfront.net
│  www.letaiexplainai.com → CNAME → d33f170a3u5yyl.cloudfront.net
└─────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│  AWS CloudFront (E23Z9QNRPDI3HW)                           │
│  - Alternate domain names: letaiexplainai.com, www.*       │
│  - SSL Certificate: ACM (us-east-1)                        │
└─────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│  S3 Bucket (ai-timeline-frontend-1765916222)               │
└─────────────────────────────────────────────────────────────┘
```

## Cost Breakdown

| Service | Monthly Cost |
|---------|-------------|
| ACM Certificate | $0.00 (free for CloudFront) |
| CloudFront custom domain | $0.00 (included) |
| Cloudflare DNS | $0.00 (free tier) |
| Route 53 | $0.00 (NOT USED) |
| **Total** | **$0.00 additional** |

---

## Tasks

### 28.1 Request ACM Certificate (Claude Code - AWS CLI) ✅ COMPLETE
- [x] Request certificate for `letaiexplainai.com` and `*.letaiexplainai.com`
- [x] Certificate MUST be in `us-east-1` region (CloudFront requirement)
- [x] Note the DNS validation CNAME records needed

**Certificate ARN:** `arn:aws:acm:us-east-1:211125652144:certificate/b3e0f55d-582b-448b-8469-f508af975bd2`

### 28.2 DNS Validation in Cloudflare (MANUAL) ✅ COMPLETE
- [x] Log in to Cloudflare dashboard
- [x] Go to letaiexplainai.com → DNS
- [x] Add CNAME record for certificate validation
- [x] Wait for certificate to validate (usually 5-15 minutes)

**Add this DNS record in Cloudflare:**
| Type | Name | Target | Proxy Status |
|------|------|--------|--------------|
| CNAME | `_8580d7d40e5ed390e5f106fdc049b5d3` | `_ddd6b6bc4283e0acb0ad0caf8e325fd1.jkddzztszm.acm-validations.aws.` | DNS only (grey cloud) |

**Note:** Only ONE record needed - it validates both the root and wildcard domains.

⚠️ **IMPORTANT**: Set proxy status to "DNS only" (grey cloud icon), NOT "Proxied" (orange cloud)

### 28.3 Verify Certificate Issued (Claude Code - AWS CLI) ✅ COMPLETE
- [x] Check certificate status until it shows `ISSUED`

**Command:**
```bash
aws acm describe-certificate \
  --certificate-arn <ARN_FROM_STEP_1> \
  --region us-east-1 \
  --query 'Certificate.Status'
```

### 28.4 Update CloudFront Distribution (Claude Code - AWS CLI) ✅ COMPLETE
- [x] Add alternate domain names: `letaiexplainai.com`, `www.letaiexplainai.com`
- [x] Associate ACM certificate
- [x] Wait for distribution to deploy

**Process:**
1. Get current distribution config
2. Modify to add Aliases and ViewerCertificate
3. Update distribution

### 28.5 Configure Cloudflare DNS (MANUAL) ✅ COMPLETE
- [x] Add CNAME for root domain: `letaiexplainai.com` → `d33f170a3u5yyl.cloudfront.net`
- [x] Add CNAME for www: `www.letaiexplainai.com` → `d33f170a3u5yyl.cloudfront.net`

**Records to add:**
| Type | Name | Target | Proxy Status | TTL |
|------|------|--------|--------------|-----|
| CNAME | @ | d33f170a3u5yyl.cloudfront.net | DNS only ⚠️ | Auto |
| CNAME | www | d33f170a3u5yyl.cloudfront.net | DNS only ⚠️ | Auto |

⚠️ **CRITICAL**: Proxy status MUST be "DNS only" (grey cloud). If set to "Proxied" (orange cloud), SSL will break because Cloudflare and CloudFront will conflict.

### 28.6 Cloudflare SSL Settings (MANUAL) ✅ COMPLETE
- [x] Go to SSL/TLS settings in Cloudflare
- [x] Set SSL mode to "Full" (not "Full (strict)" or "Flexible")
- [x] This ensures Cloudflare doesn't interfere with CloudFront SSL

**Note**: With "DNS only" mode (grey cloud), SSL traffic goes directly to CloudFront, so this is less critical.

### 28.7 Verification ✅ COMPLETE
- [x] Test https://letaiexplainai.com loads correctly
- [x] Test https://www.letaiexplainai.com loads correctly
- [x] Verify SSL certificate shows as valid
- [x] Test all major pages work

---

## Detailed Cloudflare Instructions

### Accessing Cloudflare DNS Settings
1. Log in to https://dash.cloudflare.com
2. Select `letaiexplainai.com` from your domains
3. Click "DNS" in the left sidebar

### Adding DNS Records
1. Click "Add record"
2. Select record type (CNAME)
3. Enter the name (@ for root, www for subdomain)
4. Enter the target (CloudFront domain)
5. **CRITICAL**: Click the orange cloud icon to toggle it to grey ("DNS only")
6. Click "Save"

### Cloudflare Proxy Status Explained
- **Orange cloud (Proxied)**: Traffic goes through Cloudflare's servers - **DO NOT USE**
- **Grey cloud (DNS only)**: Traffic goes directly to your origin - **USE THIS**

Using "Proxied" with CloudFront causes SSL conflicts and routing issues.

---

## Rollback Plan

If something goes wrong:

1. **Remove DNS records from Cloudflare** - Site goes back to CloudFront URL only
2. **Remove alternate domains from CloudFront** (if needed):
```bash
# Revert CloudFront to original config (keep backup from step 28.4)
```
3. **Delete ACM certificate** (if needed):
```bash
aws acm delete-certificate --certificate-arn <ARN> --region us-east-1
```

---

## Future Enhancements (Not This Sprint)

- [ ] Redirect www to non-www (or vice versa) for canonical URL
- [ ] Set up CloudFront Functions for redirects
- [ ] Configure Cloudflare Page Rules (if keeping proxy enabled for other features)
- [ ] Set up monitoring/alerts for the domain

---

## Success Criteria ✅ ALL MET

- [x] https://letaiexplainai.com loads the AI Timeline Atlas app
- [x] https://www.letaiexplainai.com loads the AI Timeline Atlas app
- [x] SSL certificate is valid (green padlock)
- [x] No mixed content warnings
- [x] All existing functionality works
- [x] Old CloudFront URL still works (d33f170a3u5yyl.cloudfront.net)

**Verified**: December 18, 2025
- Certificate: CN=letaiexplainai.com, issued by Amazon RSA 2048 M04
- Valid until: January 16, 2027
