# Payment Flow Debug Guide

This document summarizes how we diagnosed and fixed the Razorpay payment issues in BorrowEase, and the changes made across client and server.

## Symptoms we saw
- Razorpay popup showed: “This browser is not supported. Please try payment in another browser.”
- create-order requests sometimes showed Status 0 or appeared to hang.
- Redirect to `/api/payment/checkout/:orderId` returned 404.
- After successful payment, the app redirected to Login (session seemed lost).

## Root causes
- Modal checkout was opened inside DevTools device emulation/embedded contexts → Razorpay blocks these with the “browser not supported” alert.
- SPA (5173) intercepted backend routes when using frontend origin for `/api/*` → 404 or router mismatch.
- CORS only allowed `http://localhost:5173` (no 127.0.0.1), preflights occasionally failed.
- Server lacked a urlencoded body parser for Razorpay’s callback POST.
- ProtectedRoute redirected to `/login` before Firebase restored auth state after full-page redirect.

## Fixes implemented

### 1) Server-rendered, redirect-only checkout
- Added a top-level checkout page served by the backend to guarantee a first-party, non-embedded context.
	- Route: `GET /api/payment/checkout/:orderId`
	- Also added fallbacks: `GET /api/payment/checkout?orderId=...` and `GET /api/payment/checkout/*`.
- Callback handler verifies signature and updates the loan, then redirects back to the SPA origin.
	- Route: `POST /api/payment/callback`
	- Helper `getCallbackUrl(req)` builds absolute callback to this server.
	- Helper `getClientOrigin(req)` sends the user back to `PUBLIC_CLIENT_ORIGIN` (defaults to `http://localhost:5173`).

Files:
- `Server/routes/paymentRoutes.js`

### 2) Auth-bound order creation + context
- `POST /api/payment/create-order` now requires auth (Firebase middleware) and embeds loan context into `order.notes`:
	- `loanId`, `isRepayment`, `userId`, `source`.
- Uses HTTP to Razorpay Orders API with a short retry, then falls back to SDK.

Files:
- `Server/routes/paymentRoutes.js`

### 3) CORS and parsing
- Broadened CORS to allow `http://localhost:5173` and `http://127.0.0.1:5173` for REST and Socket.IO; reflect the origin.
- Added `express.urlencoded({ extended: true })` to parse Razorpay callback payloads.

Files:
- `Server/server.js`

### 4) Client: use backend origin for checkout
- Lender funding flow now creates an order and then hard-redirects to the backend-hosted checkout page.
- Added detailed console logs and a single retry on create-order failures.

Files:
- `Client/src/Components/LenderDashboard.jsx`

### 5) Preserve session on return
- ProtectedRoute now waits for Firebase auth restoration with `onAuthStateChanged` before routing, preventing a premature redirect to `/login` after payment.

Files:
- `Client/src/Components/ProtectedRoute.jsx`

### 6) Borrower repayment parity
- Repayment flow now creates the order with `{ loanId, isRepayment: true }` and uses the same server-hosted checkout redirect.

Files:
- `Client/src/Components/BorrowerDashBoard.jsx`

## Developer verification steps
1) Restart the backend.
2) Open `http://localhost:5000/api/payment/health` → expect `{ ok: true, ... }`.
3) In the app:
	 - Lender: click “Fund Loan” → observe console logs:
		 - `➡️ Creating order at ...`
		 - `✅ create-order response: ...`
		 - `↪️ Redirecting to checkout: http://localhost:5000/api/payment/checkout/<id>`
	 - Complete Razorpay payment.
	 - You should be redirected back to `http://localhost:5173/lender?payment=success` and remain signed in.
4) Borrower repayment:
	 - Click “Pay …” → same redirect-only flow; on success, loans refresh.

## Operational notes
- Prefer redirect checkout in dev and embedded contexts; keep modal as progressive enhancement only when not in emulation.
- Never trust client query data for payments; rely on `order.notes` and server-side verification.
- Ensure `PUBLIC_CLIENT_ORIGIN` and (optionally) `PUBLIC_SERVER_ORIGIN` are set when deploying behind custom domains.

## Environment variables (dev defaults used if unset)
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `PUBLIC_CLIENT_ORIGIN` (defaults to `http://localhost:5173`)
- `PUBLIC_SERVER_ORIGIN` (optional; default computed from request)

## Troubleshooting quick list
- Status 0 on create-order → check CORS logs and that backend is running; see `/api/payment/health`.
- “Browser not supported” → turn off DevTools device emulation; ensure redirect flow is used.
- 404 on `/api/payment/checkout/...` → backend not restarted or route path wrong; use the `?orderId=` fallback.
- Redirect to login after payment → ensure updated `ProtectedRoute.jsx` is deployed.

---
This guide reflects the exact code paths in this repo after the fixes above.
