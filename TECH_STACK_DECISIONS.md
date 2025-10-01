# BorrowEase Technical Implementation & Decisions

## Overview
This document captures the architectural and implementation decisions behind the recent support/contact pipeline upgrades, anti-abuse controls, UI improvements, and system resilience layers added across the BorrowEase platform.

---
## 1. Contact & Messaging Pipeline
### Goals
- Accept user/guest inquiries securely.
- Automate triage (spam, risk, prioritization, auto-responses).
- Enforce ownership verification before outbound replies.
- Provide admins with actionable intelligence & safe bulk operations.

### Key Components
| Layer | File(s) | Purpose |
|-------|---------|---------|
| Model | `Server/models/contactModel.js` | Extended schema: normalized spam, priority intelligence, verification metadata, content quality. |
| Routes | `Server/routes/contactRoutes.js` | Submission, admin listing/filtering, responses, verification flows, suppression, stats. |
| Priority Scoring | `Server/services/PriorityIntelligenceService.js` | Dynamic priority factors (email verification, tier, risk). |
| Spam & Auto Actions | `Server/services/advancedSpamDetection.js` | Heuristic + flag-based normalization & classification. |
| Auto Responses | `Server/services/autoResponseService.js` | Template matching + conditional automated reply queuing. |
| Email Queue | `Server/models/emailJobModel.js`, `Server/workers/emailWorker.js` | Resilient asynchronous delivery with retries & backoff. |
| Email Send Abstraction | `Server/services/emailService.js` | Provider-agnostic sending (SMTP + optional SendGrid). |
| Verification Flow | Embedded in `contactRoutes.js` & model | SHA-256 hashed 6‑digit codes for guest email ownership assertion. |
| Suppression | `Server/models/suppressedEmailModel.js`, `suppressionService.js` | Prevent misdirected / unwanted follow-up emails. |
| Rate Limiting | `Server/services/rateLimitService.js` | Multi-key (IP/email/fingerprint) rolling window & burst control. |
| Content Quality | `Server/services/contentQualityService.js` | Entropy + linguistic heuristics to flag gibberish/low-signal input. |

---
## 2. Email Ownership Verification
### Why
Prevent sending replies to third-party or mistyped addresses and reduce abuse.
### How
- Guest submissions auto-generate 6-digit code (hashed & time-bound to 15m).
- Outbound public admin replies are gated: if not `emailVerified`, response delivery status set to `awaiting_verification` instead of queueing.
- On successful code verification, queued responses can later be retried (manual or future automation).

### Security Considerations
- Codes stored as SHA-256 hashes (no plaintext persistence).
- Attempt counter & expiry included to mitigate brute force.

---
## 3. Spam Normalization & Classification
### Problem
Legacy `spamScore` values exceeded 100, distorting metrics.
### Solution
- Introduced `spamScoreRaw` (unbounded) and normalized `spamScore` (0–1) + alias `spamScoreNormalized`.
- Logarithmic compression maps large outliers toward asymptote near 1.0.
- Classification tiers: `ham <0.4`, `suspected 0.4–0.8`, `spam ≥0.8`.
- Backfill utility (`recalculateNormalizedSpamScores`) supports migration & consistency.

---
## 4. Priority Intelligence
### Inputs
- Verification status, customer tier, spam risk, category hints, historical patterns.
### Outputs
- `priorityScore`: bounded score used to derive enumerated `priority` (very_low → critical).
- Recommendations & factor strings persisted for auditability in UI.

### Benefit
Transparent triage decisions and adaptable weighting for future predictive models.

---
## 5. Auto-Response System
### Purpose
Immediate deflection for common or self-service eligible queries.
### Mechanics
- Template library with lightweight matching logic.
- Adds internal response entry flagged as auto-response.
- Admins retain override control (bulk marking, reassignment).

---
## 6. Email Delivery Architecture
### Queue & Worker
- `EmailJob` documents track attempts, next schedule, transient vs permanent failures.
- Worker applies exponential backoff and provider error classification.

### Providers
- Default Gmail SMTP (simplified early-stage reliability).
- SendGrid integration retained but optional for scalability.
- `EmailSendError` distinguishes permanent (e.g. 550) vs transient (timeouts, 4xx).

### Diagnostics
- `scripts/smtp-diagnose.js` validates credentials outside the full stack.

---
## 7. Suppression & Misdirected Reporting
### Rationale
Honor recipients reporting unsolicited or misdirected messages (compliance & trust).
### Implementation
- `SuppressedEmail` model (optional expiry, hit counting, source tagging).
- HMAC tokenized misdirected link embedded in submit response (future: email footer).
- Early submission guard returning 403 when suppressed.

---
## 8. Rate Limiting & Throttling
### Strategy
Layered defense:
1. In-memory per-process burst window (fast rejection of floods).
2. Mongo persisted rolling counts across keys (IP, email, fingerprint).
3. Structured 429 responses indicating `reason`, `action`, `retryAfterSeconds`.

### Extensibility
Future escalation: CAPTCHA demand, soft blocks, progressive penalties.

---
## 9. Content Quality / Gibberish Filter
### Purpose
Reduce operator noise and prevent spam variants that evade classical scoring but lack linguistic coherence.
### Signals
- Shannon entropy bands
- Stopword ratio
- Character class balance (alpha, vowels vs consonants)
- Repetition / repeated char runs
- Token diversity & length thresholds

### Outcome
Messages labeled `gibberish` force `requiresReview` and may downgrade priority.

---
## 10. Admin UX Enhancements
### Features
- High-risk & spam visual indicators.
- Bulk action toolbar (resolve, quarantine, assign, mark auto, delete, deselect).
- Intelligent filter panel (review, high priority, unassigned, auto-responded, blocked toggle).
- Custom tri-state selection via `CustomCheckbox`.
- `Badge` component standardizes color semantics (status, priority, tier, review flags).
- Delivery polling in modal for queued/sending/failed responses.

### Benefits
Faster triage, lower cognitive load, consistent visual semantics.

---
## 11. Verification & Delivery States
| State | Context | Action |
|-------|---------|--------|
| awaiting_verification | Public reply created before guest verifies | Held until verification; status exposed in UI |
| queued | Email job saved, waiting worker | Processed by worker | 
| sending | Worker claimed and attempting send | Transient UI pulse |
| sent | Provider success | No further retries |
| failed | Transient failure | Backoff retry scheduled |
| permanent_failure | Non-retryable classification | Manual retry or admin intervention |
| suppressed | (Future inline usage) | Blocked due to suppression list |

---
## 12. Security & Integrity
- HMAC-signed misdirect report links: token = HMAC(secret, email|messageId).
- Hash-only verification codes (no plaintext leakage).
- Rate limit pre-check before spam analysis to minimize resource burn.
- Email provider abstraction prevents credential sprawl & enables future rotation.

---
## 13. UI Technology Choices
| Tool | Reason |
|------|--------|
| React + Vite | Fast HMR, modern build tool, low config overhead. |
| Tailwind CSS | Utility-first consistency, rapid theming & dark mode. |
| react-hot-toast | Lightweight, accessible toast notifications; replaces blocking alerts. |
| lucide-react | Clean, tree-shakable icon set. |
| framer-motion | Smooth, interruptible animations (FAQ, future micro-interactions). |

### Why Not Yet shadcn/UI
- Current surface area small enough for Tailwind primitives.
- Avoid premature abstraction; plan documented path to adopt if component complexity grows.

---
## 14. Operational Observability (Current & Planned)
Implemented:
- Console debug hooks (worker acquisition logs, send attempts, failure classification).
- Structured spam & priority scoring persisted per message.

Planned (future):
- Metrics export (Prometheus / OpenTelemetry) for queue lag, retry distribution.
- Admin dashboard delta charts (resolution time, verification conversion rate).

---
## 15. Extensibility Roadmap (Next Logical Steps)
1. Auto-resume queued replies after verification via small watcher job.
2. CAPTCHA or challenge after defined rate limit escalations.
3. Footer injection with misdirected suppression link in outbound emails.
4. UI surfacing of contentQuality label & flags.
5. Analytics: weekly aggregated spam & gibberish trends.

---
## 16. Environment Variables (New / Notable)
| Variable | Purpose |
|----------|---------|
| MISDIRECT_SECRET | HMAC key for misdirected suppression links |
| PUBLIC_BASE_URL | Base URL for generated public links |
| RL_SUBMIT_PER_IP_MINUTE / HOUR | Rate thresholds |
| RL_SUBMIT_PER_EMAIL_HOUR / DAY | Email-based throttling |
| RL_SUBMIT_PER_FP_HOUR | Fingerprint-based throttling |
| SMTP_* / SENDGRID_* | Email provider credentials |

---
## 17. Testing & Validation Approach
- Manual simulation: verification flows, suppression link test, rate limit escalation.
- High spam normalization backfill executed idempotently in staging data.
- Worker retry scenarios validated with intentionally induced transient failures.

Future: Add Jest integration for contentQuality classification & rate limiting boundary cases.

---
## 18. Design Principles Followed
- Fail-safe defaults (block or queue instead of silent discard).
- Observability over silent logic (store metrics & factors, not only outcomes).
- Layered defense (verification + suppression + rate limit + quality filter).
- Progressive complexity (started SMTP simple, kept abstraction for scale provider migration).

---
## 19. Known Trade-offs
| Area | Trade-off | Rationale |
|------|-----------|-----------|
| Rate Limiting | In-memory burst not cluster-shared | Acceptable early-stage; Mongo windows provide baseline consistency. |
| Content Quality | Heuristic over ML model | Faster iteration; can be swapped with model when data volume justifies. |
| Email Footer | Misdirected link not yet embedded | Deferred to avoid template refactor mid-cycle. |
| Auto-Retry After Verify | Manual or future patch required | Simplicity; avoids coupling queue to verification events for MVP. |

---
## 20. Summary
The system now provides a secure, observable, and extensible support pipeline: verified communication, resilient email delivery, abuse mitigation layers, and actionable admin UX. The architecture intentionally leaves clear extension seams for future ML scoring, richer analytics, and scaling demands.

> For any follow-up enhancements, consult the roadmap (Section 15) and align changes with design principles (Section 18) to maintain conceptual integrity.
