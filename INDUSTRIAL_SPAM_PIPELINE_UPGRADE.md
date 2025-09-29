# Industrial Spam & Abuse Detection Upgrade

## Summary
This upgrade replaces the previous linear spam scoring (which produced inflated percentages like 3000%-7000%) with a dual-layer scoring and normalization pipeline that is easier to reason about operationally and consistent with how large SaaS support desks classify risk.

## Key Changes
- Introduced `spamScoreRaw` (unbounded additive raw score) and normalized `spamScore` / `spamScoreNormalized` (0–1).
- Added `classification` field: `ham`, `suspected`, `spam`.
- Logarithmic compression converts raw score to normalized: `normalized = log10(1 + raw) / log10(1001)`.
- Updated `AdvancedSpamDetectionService.analyzeMessage` to output both raw and normalized values.
- Pre-save hook auto-syncs normalized fields & classification.
- `needsReview()` now uses normalized threshold (>= 0.4) vs old arbitrary >30 raw.
- Admin endpoints:
  - POST `/api/contact/admin/recalculate-spam-normalization` — backfill / repair legacy records.
  - PATCH `/api/contact/admin/message/:id/classification` — manual override of classification & (optionally) status.
- Migration script: `Server/scripts/migrate-normalize-spam-scores.js` for one-off batch normalization.
- UI update: `AdminContactManagement.jsx` now interprets normalized `spamScore` (0–1) and shows optional raw score if > 100.

## Threshold Model
| Normalized (`spamScore`) | Raw (approx) | Classification | Action |
|-------------------------|--------------|----------------|--------|
| < 0.20                  | < ~6         | ham            | No action |
| 0.20 – < 0.40           | ~6 – 15      | ham (low)      | Light monitoring |
| 0.40 – < 0.80           | ~15 – 80     | suspected      | `requiresReview = true` |
| >= 0.80                 | >= 80        | spam           | Auto quarantine / block |

The logarithmic compression ensures extreme outliers (raw 500, 1000) cluster near 0.98–0.99 instead of exploding into meaningless multi-thousand percent displays.

## Admin Playbook
1. Run migration once after deployment:
   ```bash
   node Server/scripts/migrate-normalize-spam-scores.js
   ```
2. (Optional) Re-run normalization via API if legacy/un-normalized docs appear:
   POST `/api/contact/admin/recalculate-spam-normalization`
3. For false positives, downgrade classification:
   PATCH `/api/contact/admin/message/:id/classification` body:
   ```json
   { "classification": "ham", "status": "pending" }
   ```
4. For missed spam, upgrade classification to `spam` — status can be set to `quarantined` or `blocked`.
5. Use raw score (shown in UI tooltip when >100) for deeper forensic tuning.

## Data Integrity & Backward Compatibility
- Existing UI expecting `spamScore * 100` now receives normalized values (0–1) so percentages map correctly (0–100%).
- Legacy records where `spamScore` stored raw > 1 are migrated: raw moved to `spamScoreRaw`, normalized computed, classification assigned.
- Indexes: `spamScoreRaw`, `spamScore`, `classification` are indexable via existing queries.

## Future Enhancements (Not Implemented Yet)
- Reputation service: maintain rolling sender trust scores to weight raw spam contribution.
- Adaptive thresholds: dynamic percentile-based boundaries per rolling 7-day window.
- ML classifier (Naive Bayes / lightweight transformer) to supplement rule-based raw score.
- Feedback loop: Admin reclassification writes to training corpus; periodic retraining updates model.
- Anomaly detection: sudden surge in similar messages triggers rate limiting faster.

## Monitoring Recommendations
| Metric | Purpose | Alert Condition |
|--------|---------|-----------------|
| Normalized spam rate (suspected+spam / total) | Trend baseline | >30% 1h avg vs 7d avg |
| Auto block count | Detect attack bursts | >50 in 10 min |
| False positive ratio (admin downgrades / reviews) | Quality KPI | >10% daily |
| Mean time to review suspected | Operational health | >4h |

## Rollout Steps
1. Deploy code changes.
2. Run migration script.
3. Hit normalization API once to verify processed count is zero afterwards.
4. Spot check a few historical messages for sensible normalized percentages.
5. Train support staff on new classification labels.

## Risk Mitigation
- If unexpected behavior occurs, you can temporarily ignore new normalization by reading `spamScoreRaw` directly — no data lost.
- Re-running migration is idempotent.

---
Prepared: Industrial Spam Pipeline Upgrade (v1)
