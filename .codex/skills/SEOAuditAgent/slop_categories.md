# SEOAuditAgent Slop Categories

Every returned artifact must be checked against this file. Any hit downgrades the finding to `human_only`.

## Keyword stuffing

- **Definition**: repeating the target keyword unnaturally in title, description, or proposed copy.
- **What not to write**: "AI compute bottleneck AI compute bottleneck explained"
- **Recovery**: cut to natural density, keep the strongest occurrence, and rewrite for a human reader first.

## Generic listicles

- **Definition**: content ideas with no thesis, only a formatted list.
- **What not to write**: "Top 10 AI terms you need to know"
- **Recovery**: turn it into an argument-driven brief or kill it.

## Duplicate content with existing entity pages

- **Definition**: proposing a blog post that merely restates an existing glossary, person, organization, or event page.
- **What not to write**: "What is In-Context Learning?" when `/glossary/in-context-learning` already carries the answer
- **Recovery**: pivot to a thesis or route traffic to the canonical entity page.

## Voice drift

- **Definition**: hypey, filler-heavy, or synthetic phrasing that violates `seo_voice.md`.
- **What not to write**: "In this article, we will explore the revolutionary power of..."
- **Recovery**: rewrite in plain language with a concrete claim.

## Hallucinated entities

- **Definition**: referencing a person, paper, org, or event that the atlas does not actually support without checking it.
- **What not to write**: "the 2021 DeepMind Alignment Summit paper" when no such entity is verified
- **Recovery**: fact-check, then either cite the primary source or escalate for graph population first.

## Forced comparison framing

- **Definition**: slapping "X vs Y" onto a topic that is not inherently comparative.
- **What not to write**: "Anthropic vs AI Safety"
- **Recovery**: use the natural framing or downgrade the idea.

## Metadata padding

- **Definition**: overrunning readability to cram a keyword into `seoTitle` or `seoDescription`.
- **What not to write**: 70-character titles that still read incomplete, or descriptions that repeat the same noun three times
- **Recovery**: cap titles around 60 characters, descriptions around 155, and favor click-through clarity.
