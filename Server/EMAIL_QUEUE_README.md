# Email Queue (Option C) Implementation

This project implements a scalable queued outbound email system for admin responses to contact messages.

## Overview
When an admin adds a public response via `/api/contact/admin/message/:id/respond`:
1. The response is stored under `ContactMessage.responses.messages` with `emailDelivery.status = queued`.
2. An `EmailJob` document is created (`models/emailJobModel.js`).
3. A background worker (`workers/emailWorker.js`) periodically pulls queued jobs, sends emails via the provider (SMTP by Nodemailer for now), and updates both the job and the embedded response delivery metadata.

## Data Flow
```
Admin UI -> respond route -> ContactMessage.responses.messages[n].emailDelivery.status=queued
                                   |-> EmailJob (status=queued)
Email Worker loop -> fetch queued jobs -> sendEmail() -> update EmailJob + ContactMessage.responses.messages[n].emailDelivery
```

## Key Collections
- ContactMessage (existing): Now each response subdocument includes `emailDelivery` metadata.
- EmailJob: One document per outbound email attempt. Tracks attempts, provider IDs, errors.

## Response Subdocument Email Delivery Fields
| Field | Purpose |
|-------|---------|
| status | queued | sending | sent | failed | permanent_failure | not_applicable | skipped |
| queuedAt | Time initially enqueued |
| sentAt | Final successful delivery time |
| lastTriedAt | Last attempt timestamp |
| attemptCount | Number of attempts made |
| maxAttempts | Ceiling before marking permanent_failure |
| provider | 'smtp' or other provider id |
| providerMessageId | Provider returned id |
| errorMessage | Last error if any |

## Worker Operation
- Pulls up to `EMAIL_WORKER_BATCH` (default 10) oldest queued jobs.
- Locks them (status -> sending, sets lockedAt/lockedBy) to avoid duplicate processing across multiple workers.
- Sends mail with `emailService.sendEmail()`.
- Updates job + ContactMessage subdoc delivery metadata.
- On failure: increments attemptCount; sets status failed or permanent_failure when attempts exceed maxAttempts.

## Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| MONGO_URI | Mongo connection string | mongodb://localhost:27017/borrowease |
| SMTP_HOST | SMTP server host | (ethereal dev auto) |
| SMTP_PORT | SMTP port | 587 |
| SMTP_SECURE | 'true' for SMTPS | false |
| SMTP_USER | SMTP username | (auto ethereal) |
| SMTP_PASS | SMTP password | (auto ethereal) |
| MAIL_FROM | From address | no-reply@example.com |
| EMAIL_WORKER_INTERVAL_MS | Loop sleep interval | 5000 |
| EMAIL_WORKER_BATCH | Batch size per loop | 10 |

## Running
Install dependencies in `Server/`:
```
npm install
```
Start API server:
```
npm run dev
```
Start worker in a second terminal:
```
npm run email:worker
```

## Checking Delivery Status
Endpoint:
```
GET /api/contact/admin/message/:messageId/response/:responseId/delivery-status
```
Returns current `emailDelivery` object.

## Future Enhancements
- Switch to dedicated queue (Redis streams / BullMQ) under heavy load.
- Add exponential backoff (currently linear via interval loop).
- Webhook ingestion for provider events (opens/clicks/bounces) updating tracking subfields.
- Admin UI surface delivery status badges per response.

## Safety & Idempotency
A `dedupeKey` is stored (base64 of to|subject|body). This can be used later to avoid replaying identical emails if necessary.

---
This queue design keeps write path fast (simple insert) and offloads network I/O to the worker for scalability.
