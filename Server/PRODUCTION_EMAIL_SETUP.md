# Production Email Setup (SendGrid + Fallback Strategy)

This guide explains how to run BorrowEase contact reply emails at production scale using SendGrid as the primary provider with optional SMTP fallback and a queued worker.

## Provider Progression (Recommended Lifecycle)
1. Ethereal (default auto-dev) – Local development, inspect emails without sending real messages.
2. Gmail SMTP (light staging) – Real low-volume delivery (<500/day).
3. SendGrid (production) – Scalable, analytics, suppression management, webhooks.
4. Optional Fallback – SMTP or secondary provider (e.g. SES) for resilience.
5. Heavy Scale – Introduce Redis/BullMQ or cloud queue if daily volume reaches tens of thousands.

## Environment Variables
| Variable | Purpose | Example |
|----------|---------|---------|
| EMAIL_PROVIDER | Provider selector (smtp|sendgrid|ses) | sendgrid |
| SENDGRID_API_KEY | SendGrid API key | SG.xxxxxx |
| SENDGRID_FROM | Default From if MAIL_FROM not set | support@yourdomain.com |
| SENDGRID_SMTP_FALLBACK | 'true' to allow SMTP fallback after transient error | true |
| MAIL_FROM | Preferred global from | support@yourdomain.com |
| SMTP_HOST | Fallback SMTP host (if using fallback) | smtp.gmail.com |
| SMTP_PORT | SMTP port | 587 |
| SMTP_USER | SMTP username | user@gmail.com |
| SMTP_PASS | SMTP password/app password | *** |
| EMAIL_WORKER_INTERVAL_MS | Worker loop sleep | 5000 |
| EMAIL_WORKER_BATCH | Max jobs per cycle | 10 |

## Quick Start
1. Create SendGrid account & verified sender domain.
2. Generate API key (Restricted: Mail Send + Suppression read). Store as `SENDGRID_API_KEY`.
3. Set `EMAIL_PROVIDER=sendgrid` in `.env`.
4. (Optional) Configure SMTP fallback (`SENDGRID_SMTP_FALLBACK=true` + SMTP_* vars).
5. Start server + worker:
```powershell
npm run dev
npm run email:worker
```
6. Send a reply in Admin UI; check `EmailJob` collection and delivery badge.

## Error Handling & Classification
- Permanent errors: authentication issues, 400/401/403/404, content formatting (e.g. invalid email), missing API key.
- Transient: 429 (rate limit), 5xx, network errors. These requeue with exponential backoff.
- Fallback Trigger: Only on transient SendGrid error and when `SENDGRID_SMTP_FALLBACK=true`.

## Exponential Backoff
Attempts schedule intervals: 5s, 10s, 20s, 40s, 80s … capped at 10m + jitter (<=30%). Metadata stored in `EmailJob.nextAttemptAt`.

## Permanent Failures
When a job becomes `permanent_failure` it is no longer retried automatically. Admin may manually retry via the retry endpoint after correcting the underlying cause.

## Retry Endpoint
```
POST /api/contact/admin/email-jobs/:jobId/retry
Authorization: Bearer <admin-token>
```
Requeues a failed/permanent job (permanent resets attempts close to threshold).

## Observability Recommendations
- Add application logging (e.g. Winston) capturing: job id, attempt, provider, latency, error class.
- Feed logs into a hosted log solution (Datadog, LogDNA, ELK).
- Track metrics: jobs queued/sent/failed, average attempts per success, latency distribution.

## Webhooks (Future)
Implement `/webhooks/sendgrid` endpoint to process events (delivered, bounce, spamreport, open, click). Update `responses.messages.$.emailDelivery.tracking` with open timestamps.

## Scaling Path
| Scale | Strategy |
|-------|----------|
| < 10k emails/day | Current in-process Mongo queue + worker |
| 10k–100k | Move jobs to Redis queue (BullMQ), horizontal workers |
| 100k+ | Dedicated MQ (SQS, Kafka) + stateless workers + rate-limit manager |

## Security
- Keep API key outside repo (.env + secret manager in deployment).
- Rotate SendGrid API key periodically (quarterly or after incidents).
- Enforce adminAuth on all email job / respond routes.
- Restrict network egress only to required provider endpoints in production firewall.

## Verification Checklist
- [ ] `EMAIL_PROVIDER=sendgrid` set
- [ ] `SENDGRID_API_KEY` valid & restricted
- [ ] Domain / sender verified in SendGrid
- [ ] Worker running
- [ ] Retry endpoint tested
- [ ] Logged first successful providerMessageId

---
This setup balances simplicity and production readiness with clear migration path to higher throughput solutions.
