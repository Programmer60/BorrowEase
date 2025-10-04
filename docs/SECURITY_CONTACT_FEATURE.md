# Contact / Email Feature Security Notes

## Surface Area
| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|--------------|
| /api/contact/submit | POST | Public user submits message | None (rate limited) |
| /api/contact/admin/messages | GET | List messages with filters | adminAuth |
| /api/contact/admin/message/:id/respond | POST | Store reply + enqueue email | adminAuth |
| /api/contact/admin/message/:messageId/response/:responseId/delivery-status | GET | Delivery state for a specific response | adminAuth |
| /api/contact/admin/email-jobs/:jobId/retry | POST | Force retry of failed email job | adminAuth |
| /api/contact/faq-auto-resolve | POST | Log FAQ deflection | None (rate limited) |
| /api/contact/faq-auto-resolve/:id/escalate | PATCH | Mark FAQ log escalated | None (rate limited) |
| /api/contact/admin/faq-auto-resolve/stats | GET | Aggregated stats | adminAuth |

## Authentication
- `adminAuth` middleware applied to all modifying or sensitive admin routes.
- Firebase ID token validation + server-side role check (assumed existing implementation) ensures Principle of Least Privilege.

## Authorization Review
- No admin-only fields leaked to unauthenticated endpoints.
- Delivery status & retry endpoints restricted; they do not accept user-controlled content beyond IDs.

## Input Validation
- Respond route sanitizes required fields (ensures non-empty response text).
- FAQ logging still trusts client-provided `question` – acceptable as it is observational; *recommend* adding length + character validation.
- Email addresses validated at submission (regex) and enforced in schema.

## Rate Limiting / Abuse Mitigation
- Ensure global Express rate limiter includes: `/api/contact/submit` and FAQ endpoints to prevent spam amplification.
- Consider per-IP + per-fingerprint counters stored short-term (Redis) for higher precision throttling.

## Email Job Security
- Email body originates from admin input only—no user-supplied HTML, currently plain text (XSS safe in emails).
- `dedupeKey` prevents accidental duplicate sends if respond route were retried at network level.
- Jobs cannot be escalated to run arbitrary code—worker uses controlled `sendEmail` abstraction only.

## Secrets Management
- `SENDGRID_API_KEY`, SMTP credentials kept in `.env` (development). In production move to secret manager (Azure Key Vault, AWS Secrets Manager, etc.).
- Never log full API keys. Current code does not log secrets.

## Error Handling & Logging
- Worker logs job success/failure with job id only.
- Recommend central logger (Winston) with redaction rules for `to` field if PII logging policy requires masking.

## Potential Enhancements
1. Add HMAC verification & endpoint for SendGrid webhooks (`/webhooks/sendgrid`).
2. Add per-admin action audit trail (responded, retried job) stored in `adminNotes` or a dedicated `AdminAudit` collection.
3. Implement structured validation layer (e.g. Zod) for request bodies.
4. Add CSRF protection for any future cookie-based admin sessions (current token approach mitigates CSRF).
5. Enforce maximum response length to avoid abuse (e.g. 10k chars) — currently unbounded beyond typical DB limit.

## Threat Model Snapshot
- Data Exfiltration: Limited by auth on list/respond endpoints.
- Email Flooding: Controlled by queue + backoff + potential rate limits; add daily send cap per message if needed.
- Injection: No dynamic HTML templating; plain text only; Mongo queries parameterized through Mongoose.

---
This document should be reviewed quarterly or after adding new endpoints impacting messaging/queue behavior.
