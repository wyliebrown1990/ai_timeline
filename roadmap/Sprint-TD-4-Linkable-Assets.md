# Sprint TD-4: Linkable Assets Creation

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-01-23 by Claude (Data Export + Resources hub + Embed Widget)

## Overview

Create high-value linkable assets that attract backlinks from AI newsletters, educators, and researchers. These assets serve both SEO (backlinks) and user value.

**Priority**: MEDIUM
**Estimated Effort**: 3-4 days
**Status**: IN PROGRESS ⏳ (Data Export complete)

## Asset Types to Create

| Asset | Purpose | Target Audience |
|-------|---------|-----------------|
| PDF Timeline | Downloadable reference | Educators, researchers |
| Embeddable Widget | External site integration | Bloggers, news sites |
| Annual Reports | Yearly AI summaries | Journalists, analysts |
| Infographics | Social sharing | Twitter/LinkedIn users |
| Data Export | Raw data access | Developers, researchers |

## Tasks

### 1. Downloadable PDF Timeline

**Page**: `/timeline/download`

#### PDF Generation
- [ ] Create PDF generation endpoint: `POST /api/timeline/pdf`
- [ ] Use a PDF library (e.g., `jsPDF`, `puppeteer` for HTML-to-PDF)
- [ ] Include:
  - LAEA branding/logo
  - All milestones in chronological order
  - Key figure highlights
  - "Generated on [date]" timestamp
  - Source attribution: "letaiexplainai.com"

#### Download Page UI
- [ ] Create `/timeline/download` page
- [ ] Show preview of PDF content
- [ ] Download button with file: `AI-Timeline-LAEA-2026.pdf`
- [ ] Optional email capture before download (growth hack)
- [ ] Track downloads in analytics

#### SEO for Download Page
- [ ] Title: `Download AI Timeline PDF - Free Printable Resource | LAEA`
- [ ] Description: `Download the complete AI timeline as a free PDF. Perfect for educators, researchers, and AI enthusiasts. Updated monthly with latest breakthroughs.`
- [ ] Add DigitalDocument schema:
  ```json
  {
    "@type": "DigitalDocument",
    "name": "Complete AI Timeline PDF",
    "description": "Comprehensive timeline of AI history",
    "encodingFormat": "application/pdf",
    "isAccessibleForFree": true
  }
  ```

### 2. Embeddable Timeline Widget

**Page**: `/timeline/embed`

#### Widget Implementation
- [x] Create lightweight embeddable React component ✅
- [x] Generate embed code snippet ✅:
  ```html
  <iframe
    src="https://letaiexplainai.com/embed/timeline?theme=light&limit=20"
    width="100%"
    height="400"
    frameborder="0"
  ></iframe>
  ```
- [x] Support customization params ✅:
  - `theme`: light/dark
  - `limit`: number of milestones
  - `category`: filter by category
  - `org`: filter by organization
  - `startYear` / `endYear`: date range

#### Embed Route
- [x] Create `/embed/timeline` route (minimal UI, no header/footer) ✅
- [x] Optimize for iframe loading (minimal JS bundle) ✅
- [x] Add "Powered by LAEA" footer with link back ✅

#### Embed Page UI
- [x] Create `/timeline/embed` configuration page ✅
- [x] Live preview of widget ✅
- [x] Copy-to-clipboard for embed code ✅
- [x] Customization options UI ✅

#### SEO for Embed Page
- [x] Title: `Embed AI Timeline on Your Website - Free Widget | LAEA` ✅
- [x] Description: `Add an interactive AI timeline to your website for free. Customizable, lightweight, and always up-to-date. Perfect for AI blogs and educational sites.` ✅

### 3. Annual AI Progress Reports

**Page**: `/reports` and `/reports/:year`

#### Report Structure
- [ ] Create annual report template:
  ```
  # AI Progress Report [Year]

  ## Executive Summary
  [Key highlights of the year]

  ## Major Breakthroughs
  [Top 10 milestones of the year]

  ## Company Highlights
  - OpenAI: [summary]
  - Anthropic: [summary]
  - Google: [summary]

  ## Emerging Trends
  [Analysis of patterns]

  ## Key Figures
  [Notable people in AI that year]

  ## Looking Ahead
  [Predictions/what to watch]

  ## Full Timeline
  [Link to filtered timeline for that year]
  ```

#### Reports Page
- [ ] Create `/reports` index page listing all years
- [ ] Create `/reports/2025` (and other years) pages
- [ ] Auto-generate reports from milestone data
- [ ] Add editorial commentary (can be AI-assisted)

#### Report SEO
- [ ] Title: `AI Progress Report 2025: Year in Review | LAEA`
- [ ] Target queries like "ai 2025 review", "ai progress 2025"
- [ ] Add Report schema:
  ```json
  {
    "@type": "Report",
    "name": "AI Progress Report 2025",
    "datePublished": "2026-01-15",
    "about": "Artificial Intelligence advances in 2025"
  }
  ```

### 4. Social-Optimized Infographics

**Page**: `/timeline/infographics`

#### Infographic Types
- [ ] "AI Timeline at a Glance" - visual overview
- [ ] "Top 10 AI Breakthroughs of [Year]"
- [ ] "Evolution of GPT Models" - comparison graphic
- [ ] "AI Company Timelines" - side-by-side comparison
- [ ] "AI Funding Over Time" - if data available

#### Implementation Options
Choose one approach:
- [ ] **Option A**: Static images created in design tool (Figma/Canva)
- [ ] **Option B**: Programmatically generated with HTML Canvas/SVG
- [ ] **Option C**: Use infographic generation service

#### Infographics Page
- [ ] Create `/timeline/infographics` gallery page
- [ ] Display thumbnails with download buttons
- [ ] Include social share buttons (Twitter, LinkedIn)
- [ ] Track downloads in analytics

#### Infographic SEO
- [ ] Title: `AI Timeline Infographics - Free Visual Resources | LAEA`
- [ ] Add ImageObject schema for each infographic
- [ ] Optimize image alt text for image search
- [ ] Create Pinterest-friendly vertical formats

### 5. Data Export / API Access

**Page**: `/timeline/data`

#### Data Export Options
- [x] JSON export: `GET /api/milestones/export?format=json` ✅
- [x] CSV export: `GET /api/milestones/export?format=csv` ✅
- [x] Include all milestone fields ✅
  - id, title, date, description, category
  - organization, significance, tags
  - sourceUrl

#### Data Page UI
- [x] Create `/timeline/data` page ✅
- [x] Explain data format and fields ✅
- [x] Download buttons for JSON/CSV ✅
- [x] License terms (CC BY 4.0) ✅

#### Data SEO
- [x] Title: `AI Timeline Data - Free JSON/CSV Download` ✅
- [x] Target developers and researchers ✅
- [x] Add Dataset schema ✅:
  ```json
  {
    "@type": "Dataset",
    "name": "AI Timeline Dataset",
    "description": "Comprehensive dataset of AI milestones",
    "license": "https://creativecommons.org/licenses/by/4.0/",
    "distribution": {
      "@type": "DataDownload",
      "encodingFormat": "application/json"
    }
  }
  ```

### 6. Link Building Landing Page

**Page**: `/resources`

- [x] Create `/resources` hub page linking to all assets ✅:
  - PDF Download
  - Embed Widget
  - Annual Reports
  - Infographics
  - Data Export
- [x] Design for educators/researchers ✅:
  ```
  # AI Timeline Resources

  Free resources for educators, researchers, and AI enthusiasts.

  ## For Educators
  - Download printable PDF timeline
  - Embed interactive timeline in your course site

  ## For Researchers
  - Access raw timeline data (JSON/CSV)
  - Cite our annual reports

  ## For Content Creators
  - Share our infographics (with attribution)
  - Embed our timeline widget

  ## For Journalists
  - Use our annual reports for context
  - Reach out for custom data requests
  ```

### 7. Attribution & Backlink Tracking

- [ ] Add UTM parameters to all embeds and PDFs
- [ ] Track where embeds are used (referrer logging)
- [ ] Create thank-you/attribution text:
  ```
  Source: Let AI Explain AI (letaiexplainai.com)
  ```
- [ ] Monitor backlinks via Google Search Console or Ahrefs

## Browser Testing & Validation (REQUIRED)

### PDF Download
- [ ] Test PDF generation and download
- [ ] Verify PDF renders correctly
- [ ] Check branding and attribution visible
- [ ] Test on mobile devices

### Embed Widget
- [ ] Test embed on a test HTML page
- [ ] Verify customization params work
- [ ] Check "Powered by LAEA" link works
- [ ] Test responsive sizing

### Data Export
- [ ] Download JSON and verify format
- [ ] Download CSV and open in Excel
- [ ] Verify all fields present

### All Pages
- [ ] Verify SEO tags on each new page
- [ ] Check schema markup validates
- [ ] Test page load times

## Acceptance Criteria

- [ ] PDF download working at `/timeline/download`
- [ ] Embed widget configurable and working
- [ ] At least 2025 annual report published
- [ ] At least 3 infographics created
- [ ] Data export available in JSON and CSV
- [ ] Resources hub page links everything
- [ ] All pages have proper SEO

## Notes for Future Developers

### PDF Generation
- Consider using Puppeteer for HTML-to-PDF (best quality)
- Cache generated PDFs (regenerate weekly)
- Include version/date in filename

### Embed Widget
- Keep bundle size minimal (<50KB)
- Support both light and dark themes
- Consider rate limiting embed requests

### Infographics
- Create in standard social sizes:
  - Twitter: 1200x675
  - LinkedIn: 1200x627
  - Pinterest: 1000x1500 (vertical)
- Save as PNG and WebP

### Data Licensing
- CC BY 4.0 recommended (attribution required, commercial OK)
- Include license in data files
- Track who downloads for outreach

## Deployment

```bash
# Frontend with new pages
npm run build
aws s3 sync dist/ s3://ai-timeline-frontend-1765916222/ --delete
aws cloudfront create-invalidation --distribution-id E23Z9QNRPDI3HW --paths "/*"

# Backend for new API endpoints
cd infra && sam build && sam deploy --no-confirm-changeset
```
