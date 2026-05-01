# SEOAuditAgent Voice File

This file captures SEO-specific editorial preferences that emerge as the automation runs.

**Append-only**: never delete old entries. If a rule changes, add a dated reversal entry.

---

## Baseline

- **Entity-graph first**: if the right answer is "make the graph richer first," do that before recommending copy churn.
- **Under-stated language**: prefer direct, declarative language over hyped promises.
- **No clickbait**: optimize for curiosity and clarity, not bait.
- **Thesis over recap**: any content proposal should have a point of view, not just coverage.
- **Human trust beats keyword density**: if a phrase reads stuffed, cut it.
- **Preserve canonical structure**: do not propose slug churn or gratuitous URL changes in the auto-ship lane.

## Entries

_No shipped SEO actions yet. Add one dated entry per shipped action once SEOI-5 is live._

### Append Template

When the scheduled digest runs, append one block per shipped or measured action using this shape:

```md
## YYYY-MM-DD — `<action-or-snapshot-id>` (`<lane>` on `<target-path>`)

### Outcome
- Week reviewed: `YYYY-MM-DD`
- Query: `<query or page_aggregate>`
- Action: `<metadata_rewrite | propose | human_only | measured_regression>`
- Confidence: `0.00`
- Result: `<kept | paused | proposed rollback | needs review>`

### Keep
- `<what worked>`

### Avoid
- `<what did not land>`

### Next Time
- `<tight rule the next run should remember>`
```
