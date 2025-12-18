# Sprint 21: AI Pop Culture Learning Path

**Impact**: Medium | **Effort**: Medium | **Dependencies**: Sprint 11 (Learning Paths), Milestone data

## Overview
Create a learning path focused on the drama, personalities, controversies, and cultural moments that shaped public perception of AI. This path is designed for users who want to understand AI through its human stories rather than technical details - the board room battles, viral moments, celebrity controversies, and labor strikes that made headlines.

---

## Tasks

### 21.1 New Milestone Content - Research & Creation
- [x] Research and write milestone: **Timnit Gebru Fired from Google** (Dec 2020)
- [x] Research and write milestone: **"Pause Giant AI" Open Letter** (Mar 2023)
- [x] Research and write milestone: **Hollywood Writers/Actors Strike Over AI** (May-Nov 2023)
- [x] Research and write milestone: **AI Drake/Weeknd Song Goes Viral** (Apr 2023)
- [x] Research and write milestone: **OpenAI Board Fires Sam Altman** (Nov 2023)
- [x] Research and write milestone: **Scarlett Johansson vs OpenAI "Sky" Voice** (May 2024)

### 21.2 Milestone Data Entry
- [x] Add `E2020_GEBRU_FIRING` to milestones index.json and filter.json
- [x] Add `E2023_PAUSE_AI_LETTER` to milestones index.json and filter.json
- [x] Add `E2023_HOLLYWOOD_AI_STRIKES` to milestones index.json and filter.json
- [x] Add `E2023_AI_DRAKE_SONG` to milestones index.json and filter.json
- [x] Add `E2023_OPENAI_BOARD_CRISIS` to milestones index.json and filter.json
- [x] Add `E2024_SCARLETT_JOHANSSON_SKY` to milestones index.json and filter.json
- [x] Verify all milestone IDs exist and are valid

### 21.3 Learning Path Creation
- [x] Create `pop-culture.json` learning path file
- [x] Define path metadata (title, description, audience, difficulty)
- [x] Order milestones for narrative flow
- [x] Write key takeaways (5 bullet points)
- [x] Define concepts covered
- [x] Set suggested next paths
- [x] Calculate estimated duration

### 21.4 Checkpoint Questions
- [x] Create checkpoint for Module 1: "The Shock Heard Round the World"
- [x] Create checkpoint for Module 2: "AI Gets Creative (and Controversial)"
- [x] Create checkpoint for Module 3: "ChatGPT Changes Everything"
- [x] Create checkpoint for Module 4: "The Ethics Wars"
- [x] Create checkpoint for Module 5: "Silicon Valley Drama"
- [x] Add checkpoints to questions.json

### 21.5 Integration & Testing
- [x] Import learning path in content/index.ts
- [ ] Verify path appears in Learning Paths page
- [ ] Test path navigation through all milestones
- [ ] Verify progress tracking works
- [ ] Test path completion summary
- [ ] Verify checkpoints trigger correctly

### 21.6 Deployment
- [x] Run `npm run build` - verify no errors
- [x] Run `npm run typecheck` - verify no TypeScript errors
- [ ] Commit changes to git
- [ ] Push to origin/main
- [x] Deploy to S3: `aws s3 sync dist/ s3://ai-timeline-frontend-1765916222/ --delete`
- [x] Invalidate CloudFront: `aws cloudfront create-invalidation --distribution-id E23Z9QNRPDI3HW --paths "/*"`
- [ ] Verify in production

---

## New Milestones Detail

### E2020_GEBRU_FIRING
**Title**: Google fires AI ethics researcher Timnit Gebru
**Date**: 2020-12-02
**Category**: cultural
**Description**: Google terminates prominent AI ethics co-lead Timnit Gebru after dispute over a research paper about bias in large language models. Sparks industry-wide debate about corporate control of AI research, diversity in tech, and the treatment of ethics researchers.
**Sources**: MIT Technology Review, NYTimes
**Tags**: AI Ethics, Corporate AI, Diversity in Tech

### E2023_PAUSE_AI_LETTER
**Title**: "Pause Giant AI Experiments" open letter signed by 1,000+ researchers
**Date**: 2023-03-22
**Category**: policy
**Description**: Elon Musk, Steve Wozniak, and over 1,000 AI researchers sign open letter calling for 6-month pause on training AI systems more powerful than GPT-4, citing "profound risks to society and humanity." Ignites mainstream AI safety debate.
**Sources**: Future of Life Institute, Washington Post
**Tags**: AI Safety, AI Risk, Public Debate

### E2023_HOLLYWOOD_AI_STRIKES
**Title**: Hollywood writers and actors strike over AI protections
**Date**: 2023-05-02
**Category**: cultural
**Description**: Writers Guild of America (WGA) and SAG-AFTRA unions strike for 148 days, with AI protections as key demands. First major labor action against AI displacement fears. Results in groundbreaking contract provisions limiting AI use in entertainment.
**Sources**: Variety, NYTimes, The Hollywood Reporter
**Tags**: Labor, Entertainment, AI Displacement

### E2023_AI_DRAKE_SONG
**Title**: AI-generated "Heart on My Sleeve" mimicking Drake and The Weeknd goes viral
**Date**: 2023-04-04
**Category**: cultural
**Description**: An AI-generated song impersonating Drake and The Weeknd garners millions of streams before Universal Music demands removal. Sparks intense debate about AI in music, artist rights, and the future of creative authenticity.
**Sources**: Rolling Stone, Billboard, The Verge
**Tags**: AI Music, Copyright, Viral Moment

### E2023_OPENAI_BOARD_CRISIS
**Title**: OpenAI board fires and rehires Sam Altman in 5-day crisis
**Date**: 2023-11-17
**Category**: company_launch
**Description**: OpenAI's board abruptly fires CEO Sam Altman. Within 5 days: 95% of employees threaten to quit, Microsoft offers Altman a job, the board capitulates, and Altman returns as CEO. The crisis exposes tensions between AI safety governance and commercial pressures.
**Sources**: The Information, NYTimes, TechCrunch, The Verge
**Tags**: Corporate Drama, AI Governance, OpenAI

### E2024_SCARLETT_JOHANSSON_SKY
**Title**: Scarlett Johansson threatens legal action over ChatGPT "Sky" voice
**Date**: 2024-05-20
**Category**: cultural
**Description**: Actress Scarlett Johansson publicly criticizes OpenAI after ChatGPT's "Sky" voice sounds remarkably similar to her voice - after she had declined to voice the assistant. OpenAI pauses the voice. Raises questions about AI and celebrity likeness rights.
**Sources**: NPR, Washington Post, The Verge
**Tags**: AI Voice, Celebrity Rights, OpenAI

---

## Learning Path Structure

### Path: "AI in the Spotlight: Drama, Hype & Headlines"

**ID**: `pop-culture`
**Difficulty**: Beginner
**Duration**: ~30 minutes
**Target Audience**: Anyone curious about AI's cultural impact - no technical background needed

**Description**:
Explore the human drama behind AI's rise to mainstream attention. From viral moments and celebrity controversies to boardroom battles and labor strikes, discover how AI became the most talked-about technology of our time.

**Milestones** (in narrative order):
1. `E2016_ALPHAGO` - AlphaGo defeats Lee Sedol (existing)
2. `E2020_GEBRU_FIRING` - Google fires Timnit Gebru (NEW)
3. `E2021_DALLE` - DALL-E announced (existing)
4. `E2022_CHATGPT` - ChatGPT launches (existing)
5. `E2023_PAUSE_AI_LETTER` - Pause AI open letter (NEW)
6. `E2023_AI_DRAKE_SONG` - AI Drake song goes viral (NEW)
7. `E2023_HOLLYWOOD_AI_STRIKES` - Hollywood strikes (NEW)
8. `E2023_OPENAI_BOARD_CRISIS` - Sam Altman fired/rehired (NEW)
9. `E2024_SORA_PREVIEW` - Sora preview (existing)
10. `E2024_SCARLETT_JOHANSSON_SKY` - Scarlett Johansson controversy (NEW)

**Key Takeaways**:
1. AI breakthroughs often become cultural moments that capture public imagination
2. The AI industry faces ongoing tensions between innovation speed and safety/ethics concerns
3. AI is disrupting creative industries, raising fundamental questions about authenticity and labor
4. Corporate governance of AI companies has real consequences for technology development
5. Celebrity and viral moments have shaped public perception of AI more than technical papers

**Concepts Covered**:
- AI ethics and corporate responsibility
- AI safety debate (doomers vs. accelerationists)
- AI and creative industries (art, music, film)
- AI governance and corporate structure
- Public perception of AI

**Suggested Next Paths**:
- `ai-governance` - Deep dive into AI policy and regulation
- `chatgpt-story` - Technical story behind ChatGPT
- `ai-image-generation` - How AI art actually works

---

## Checkpoint Questions

### Module 1: "The Shock Heard Round the World"
After: E2016_ALPHAGO

**Question**: Why was AlphaGo's victory over Lee Sedol considered more significant than Deep Blue beating Kasparov at chess?
- A) Go has more possible positions than atoms in the universe, requiring intuition not just calculation
- B) Lee Sedol was a better player than Kasparov
- C) Chess was already solved by computers
- D) AlphaGo used quantum computing

**Answer**: A
**Explanation**: Go's complexity (10^170 possible positions) meant brute-force calculation was impossible. AlphaGo had to develop something resembling intuition, which is why Lee Sedol's "God Move" in Game 4 - a creative move that briefly confused the AI - became so legendary.

### Module 2: "AI Gets Creative (and Controversial)"
After: E2023_AI_DRAKE_SONG

**Question**: What made the AI Drake/Weeknd song "Heart on My Sleeve" so controversial?
- A) It was poorly made
- B) It demonstrated AI could convincingly mimic specific artists' voices without permission
- C) Drake and The Weeknd collaborated on it secretly
- D) It won a Grammy award

**Answer**: B
**Explanation**: The song showed that AI could create convincing imitations of specific artists, raising urgent questions about voice rights, authenticity, and whether AI-generated music should be allowed on streaming platforms.

### Module 3: "ChatGPT Changes Everything"
After: E2023_HOLLYWOOD_AI_STRIKES

**Question**: What historic first did the 2023 Hollywood strikes represent?
- A) Longest strike in entertainment history
- B) First major labor action with AI protections as a central demand
- C) First time writers and actors struck simultaneously
- D) First strike to be resolved by AI mediation

**Answer**: B
**Explanation**: The WGA and SAG-AFTRA strikes were the first major labor actions where protections against AI replacement were key demands. The resulting contracts set precedents for how AI can and cannot be used in creative industries.

### Module 4: "The Ethics Wars"
After: E2023_PAUSE_AI_LETTER

**Question**: What does the "Pause Giant AI" letter represent in the AI safety debate?
- A) Universal scientific consensus that AI should be paused
- B) A prominent example of the tension between AI accelerationists and safety advocates
- C) A legally binding agreement signed by AI companies
- D) A letter only signed by people outside the AI industry

**Answer**: B
**Explanation**: The letter crystallized the growing divide between those who want to rapidly advance AI capabilities and those calling for caution. While signed by notable figures like Elon Musk, many AI researchers disagreed, showing the field's lack of consensus on safety.

### Module 5: "Silicon Valley Drama"
After: E2023_OPENAI_BOARD_CRISIS

**Question**: What fundamental tension did the OpenAI board crisis expose?
- A) Disagreements about which programming language to use
- B) The conflict between nonprofit AI safety governance and commercial pressures
- C) Personal rivalry between Sam Altman and Elon Musk
- D) Technical disagreements about transformer architecture

**Answer**: B
**Explanation**: OpenAI was founded as a nonprofit focused on AI safety, but became a capped-profit company with massive commercial interests. The board crisis revealed how difficult it is to balance safety-focused governance with the pressures of being the hottest AI company in the world.

---

## Data Structures

### Learning Path JSON
```json
{
  "id": "pop-culture",
  "title": "AI in the Spotlight: Drama, Hype & Headlines",
  "description": "Explore the human drama behind AI's rise to mainstream attention. From viral moments and celebrity controversies to boardroom battles and labor strikes.",
  "targetAudience": "Anyone curious about AI's cultural impact - no technical background needed",
  "difficulty": "beginner",
  "estimatedMinutes": 30,
  "milestoneIds": [
    "E2016_ALPHAGO",
    "E2020_GEBRU_FIRING",
    "E2021_DALLE",
    "E2022_CHATGPT",
    "E2023_PAUSE_AI_LETTER",
    "E2023_AI_DRAKE_SONG",
    "E2023_HOLLYWOOD_AI_STRIKES",
    "E2023_OPENAI_BOARD_CRISIS",
    "E2024_SORA_PREVIEW",
    "E2024_SCARLETT_JOHANSSON_SKY"
  ],
  "keyTakeaways": [
    "AI breakthroughs often become cultural moments that capture public imagination",
    "The AI industry faces ongoing tensions between innovation speed and safety/ethics concerns",
    "AI is disrupting creative industries, raising fundamental questions about authenticity and labor",
    "Corporate governance of AI companies has real consequences for technology development",
    "Celebrity and viral moments have shaped public perception of AI more than technical papers"
  ],
  "conceptsCovered": [
    "AI ethics and corporate responsibility",
    "AI safety debate",
    "AI and creative industries",
    "AI governance",
    "Public perception of AI"
  ],
  "suggestedNextPathIds": ["ai-governance", "chatgpt-story", "ai-image-generation"]
}
```

---

## Success Criteria
- [ ] All 6 new milestones added with proper sources
- [ ] Learning path appears in Learning Paths page
- [ ] Path navigation works through all 10 milestones
- [ ] All 5 checkpoint questions functional
- [ ] Progress tracking works correctly
- [ ] Path completion shows summary with key takeaways
- [ ] Works on mobile
- [ ] Deployed to production

---

## Production Verification

### Pre-Deployment
- [ ] `npm run build` succeeds
- [ ] `npm run typecheck` passes
- [ ] All milestone IDs validated
- [ ] Path JSON validates against schema

### Post-Deployment
- [ ] Visit https://d33f170a3u5yyl.cloudfront.net/learn
- [ ] Verify "AI in the Spotlight" path appears
- [ ] Start path and navigate through all milestones
- [ ] Complete path and verify summary screen
- [ ] Test on mobile device

---

## Notes

### Sources for New Milestones
- **Timnit Gebru**: MIT Technology Review, NYTimes coverage
- **Pause AI Letter**: Future of Life Institute official page
- **Hollywood Strikes**: Variety, THR extensive coverage
- **AI Drake Song**: Rolling Stone, Billboard reporting
- **OpenAI Crisis**: The Information's breaking coverage, NYTimes
- **Scarlett Johansson**: NPR, Washington Post interviews

### Why This Path Matters
This learning path serves users who are intimidated by technical AI content but fascinated by the human stories. It's an on-ramp to deeper AI understanding through familiar cultural touchpoints - celebrities, corporate drama, and viral moments they may have seen in the news.
