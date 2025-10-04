# AI Model Variants (Risk & Fraud)

This document describes the three risk assessment model variants exposed by the API.

| ID | Label | Purpose | Accuracy (est.) | Relative Latency | Core Strategy |
|----|-------|---------|-----------------|------------------|---------------|
| `comprehensive` | Comprehensive AI | Balanced production default | 94% | Medium | Uses full weighted components equally |
| `rapid` | Rapid Assessment | Instant pre-screen & UX responsiveness | 87% | Very Low | Applies reduced weight to identity / platform; light heuristics |
| `conservative` | Conservative Model | Stricter approvals / higher precision | 96% | High | Over-weights credit & identity components; slightly raises base multiplier |

## Component Emphasis
Each model applies multipliers to the raw component contributions before aggregation.

| Component | Comprehensive | Rapid | Conservative |
|-----------|---------------|-------|--------------|
| creditworthiness | 1.00 | 0.90 | 1.10 |
| behavioralRisk | 1.00 | 0.85 | 1.05 |
| financialStability | 1.00 | 0.85 | 1.05 |
| identityVerification | 1.00 | 0.60 | 1.10 |
| platformHistory | 1.00 | 0.60 | 1.00 |

`baseMultiplier` is then applied to the summed post-emphasis score: 
- `rapid`: 0.92 (slight penalty for lower depth)
- `comprehensive`: 1.00 (neutral)
- `conservative`: 1.05 (tightens acceptance by proportionally scaling risk contributions)

## Endpoints
- `GET /ai/risk-assessment?model=<variant>&userId=<optional>` – single variant score & decision.
- `GET /ai/model-evaluate?userId=<optional>` – returns all variants side-by-side for benchmarking.

## Test Script
Run the included benchmarking script:
```bash
node Server/scripts/testModelVariants.js http://localhost:5000 <FIREBASE_ID_TOKEN> <optionalUserId>
```

## Integration Guidance
Choose a model based on workflow stage:
- Initial list rendering / quick filter: `rapid`
- Standard underwriting view: `comprehensive`
- High-value loan or manual review escalation: `conservative`

## Future Enhancements
- Persist per-model calibration stats over rolling window.
- Add drift monitoring: compare distribution of component deltas week-over-week.
- Introduce A/B assignment token in response for live experimentation.
