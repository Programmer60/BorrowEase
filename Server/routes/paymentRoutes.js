import express from "express";
import Razorpay from "razorpay";
import fetch from "node-fetch";
import dotenv from "dotenv";
import crypto from "crypto";
import https from "https";
import Loan from "../models/loanModel.js";
import Notification from "../models/notificationModel.js";
import { verifyToken } from "../firebase.js";

// Load environment variables first
dotenv.config();

const router = express.Router();

// Normalize keys and keep consistent fallbacks for both order creation and verification
const RZP_KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_test_pBgIF99r7ZIsb7";
const RZP_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "OpkPKasxawRNSCPHCBY1u66J";

// Initialize Razorpay with environment variables
const instance = new Razorpay({
  key_id: RZP_KEY_ID,
  key_secret: RZP_KEY_SECRET,
});

// Reuse TLS connections when calling Razorpay APIs to reduce latency
const rzpAgent = new https.Agent({ keepAlive: true });

// Helper to build absolute callback URL (dev default)
const getCallbackUrl = (req) => {
  const host = process.env.PUBLIC_SERVER_ORIGIN || `${req.protocol}://${req.get('host')}`;
  // Ensure we point to this server origin
  return `${host}/api/payment/callback`;
};

// Helper to build client (SPA) origin to return the user after payment
const getClientOrigin = (req) => {
  return process.env.PUBLIC_CLIENT_ORIGIN || 'http://localhost:5173';
};

// Simple health/diagnostics endpoint to verify server reachability and CORS
router.get("/health", (req, res) => {
  res.json({
    ok: true,
    time: new Date().toISOString(),
    origin: req.headers.origin || null,
    referer: req.headers.referer || null,
  });
});

// Create order: require auth so we can embed user and loan context in order notes
router.post("/create-order", verifyToken, async (req, res) => {
  // Debug helpful headers to track CORS/abort issues
  try {
    console.log("➡️  /payment/create-order hit", {
      origin: req.headers.origin,
      referer: req.headers.referer,
      user: req.user?.email || req.user?.id || 'unknown',
    });
  } catch (_) {}
  const { amount, loanId, isRepayment } = req.body;

  // Parse amount robustly: accept numbers or formatted strings like "1,000.50" or "₹1,000"
  const parseAmount = (val) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const cleaned = val.replace(/[^0-9.]/g, '');
      return parseFloat(cleaned);
    }
    return NaN;
  };

  try {
    let amt = parseAmount(amount);
    if (!Number.isFinite(amt)) {
      return res.status(400).json({ error: "Amount is required and must be a number" });
    }
    // Guard tiny/negative values
    if (amt <= 0) {
      return res.status(400).json({ error: "Amount must be greater than 0" });
    }

    // Razorpay expects paise (integer). Enforce minimum ₹1
    const paise = Math.round(amt * 100);
    if (!Number.isInteger(paise) || paise < 100) {
      return res.status(400).json({ error: "Minimum amount is ₹1.00" });
    }

  const options = {
      amount: paise,
      currency: "INR",
      receipt: `rcptid_${Date.now()}`,
      // Carry context to fetch at callback verification time
      notes: {
        source: "BorrowEase",
        type: "loan_payment",
        loanId: loanId || "",
        isRepayment: Boolean(isRepayment) === true,
        userId: req.user?.id || req.user?.uid || ""
      },
    };

    // Prefer direct HTTP to avoid SDK edge-case errors
    const auth = Buffer.from(`${RZP_KEY_ID}:${RZP_KEY_SECRET}`).toString('base64');
    const httpCreate = async () => {
      const resp = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
          'Connection': 'keep-alive',
        },
        agent: rzpAgent,
        body: JSON.stringify(options),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        const err = new Error(`HTTP ${resp.status} ${resp.statusText} - ${text}`);
        err.statusCode = resp.status;
        throw err;
      }
      return resp.json();
    };

    // Retry wrapper for transient failures
    const shouldRetry = (e) => {
      const code = e?.code || e?.statusCode;
      const msg = (e?.message || '').toLowerCase();
      return (
        code === 429 || code === 500 || code === 502 || code === 503 || code === 504 ||
        msg.includes('timed out') || msg.includes('timeout') ||
        msg.includes('enotfound') || msg.includes('econnreset')
      );
    };

    let order, attempt = 0; let errSeen;
    while (attempt < 2) {
      try {
        order = await httpCreate();
        break;
      } catch (e) {
        errSeen = e;
        if (shouldRetry(e) && attempt === 0) {
          await new Promise(r => setTimeout(r, 300));
          attempt++;
          continue;
        }
        break;
      }
    }

    // If HTTP path failed without a clear response, try SDK once as last resort
    if (!order) {
      try {
        order = await instance.orders.create(options);
      } catch (sdkErr) {
        throw errSeen || sdkErr;
      }
    }

  console.log("✅ Razorpay order created", { id: order.id, amount: order.amount });
    res.json(order);
  } catch (err) {
    // Log more diagnostics to help debugging
    console.error("❌ Error in Razorpay order creation:", {
      message: err?.message,
      name: err?.name,
      statusCode: err?.statusCode,
      code: err?.code,
      details: err?.error || err,
    });
    const status = err?.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
    res.status(status).json({
      error: "Razorpay order creation failed",
      details: err?.error?.description || err?.message || "Unknown error",
    });
  }
});

// Add this route to verify payments
router.post("/verify", verifyToken, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, loanId, isRepayment } = req.body;
  try {
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", RZP_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    if (!loanId) {
      return res.status(400).json({ error: "Loan ID is required" });
    }

    // Get the loan with populated user data
    const loan = await Loan.findById(loanId).populate('borrowerId lenderId');
    if (!loan) {
      return res.status(404).json({ error: "Loan not found" });
    }

    let update = {};
    let borrowerMessage = "";
    let lenderMessage = "";

    if (isRepayment === true || isRepayment === "true") {
      update = { repaid: true };
      borrowerMessage = `You have successfully repaid ₹${loan.amount} for your loan (${loan.purpose})`;
      lenderMessage = `Loan repayment of ₹${loan.amount} received from ${loan.name} for ${loan.purpose}`;
    } else {
      update = { funded: true, lenderId: req.user.id, fundedAt: new Date() };
      borrowerMessage = `Your loan request for ₹${loan.amount} (${loan.purpose}) has been funded!`;
      lenderMessage = `You have successfully funded ₹${loan.amount} to ${loan.name} for ${loan.purpose}`;
    }

    const updatedLoan = await Loan.findByIdAndUpdate(loanId, update, { new: true });

    // Create notifications for both parties
    const notifications = [];

    if (isRepayment === true || isRepayment === "true") {
      // For repayment: notify both borrower and lender
      notifications.push(
        Notification.create({
          userId: loan.borrowerId,
          type: "payment",
          message: borrowerMessage,
        }),
        Notification.create({
          userId: loan.lenderId,
          type: "payment", 
          message: lenderMessage,
        })
      );
    } else {
      // For funding: notify borrower and the person who funded (lender)
      notifications.push(
        Notification.create({
          userId: loan.borrowerId,
          type: "payment",
          message: borrowerMessage,
        }),
        Notification.create({
          userId: req.user.id,
          type: "payment",
          message: lenderMessage,
        })
      );
    }

    await Promise.all(notifications);

    res.json({ status: "success", loan: updatedLoan });
  } catch (err) {
    console.error("Payment verification error:", err);
    res.status(500).json({ error: "Payment verification failed" });
  }
});

// Callback endpoint for redirect flow (no bearer token available on Razorpay redirect)
router.post("/callback", async (req, res) => {
  try {
    console.log('⬅️ Payment callback hit', {
      origin: req.headers.origin,
      referer: req.headers.referer,
      bodyKeys: Object.keys(req.body || {}),
      contentType: req.headers['content-type']
    });

    const clientOrigin = getClientOrigin(req);

    // Razorpay failure payload may come as error[...] fields; also handle missing success fields
    const errorPayload = req.body?.error || null;
    const flattenedErrorCode = req.body?.["error[code]"];
    const flattenedErrorDesc = req.body?.["error[description]"];
    const flattenedOrder = req.body?.["error[metadata][order_id]"] || req.body?.order_id;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

    if (errorPayload || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      const errCode = errorPayload?.code || flattenedErrorCode || 'PAYMENT_FAILED';
      const errDesc = errorPayload?.description || flattenedErrorDesc || 'Payment was cancelled or failed.';
      const orderId = errorPayload?.metadata?.order_id || flattenedOrder || razorpay_order_id || '';

      // Try to decide destination from order notes
      let routeBase = '/lender';
      try {
        if (orderId) {
          const auth = Buffer.from(`${RZP_KEY_ID}:${RZP_KEY_SECRET}`).toString('base64');
          const orderResp = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
            method: 'GET',
            headers: { 'Authorization': `Basic ${auth}`, 'Connection': 'keep-alive' },
            agent: rzpAgent,
          });
          if (orderResp.ok) {
            const orderJson = await orderResp.json();
            const notes = orderJson?.notes || {};
            const isRepayment = notes.isRepayment === true || notes.isRepayment === 'true';
            routeBase = isRepayment ? '/borrower' : '/lender';
          }
        }
      } catch (_) {}

      const redirectUrl = `${clientOrigin}${routeBase}?payment=failed&order=${encodeURIComponent(orderId)}&code=${encodeURIComponent(errCode)}&reason=${encodeURIComponent(errDesc)}`;
      return res.status(200).send(`
        <html>
          <body>
            <script>
              window.location.replace('${redirectUrl}');
            </script>
            <noscript>
              Payment failed. <a href="${redirectUrl}">Return to app</a>
            </noscript>
          </body>
        </html>
      `);
    }

    // Success flow: verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", RZP_KEY_SECRET)
      .update(body.toString())
      .digest("hex");
    if (expectedSignature !== razorpay_signature) {
      const redirectUrl = `${clientOrigin}/lender?payment=failed&order=${encodeURIComponent(razorpay_order_id)}&code=SIGNATURE_MISMATCH&reason=${encodeURIComponent('Invalid signature')}`;
      return res.status(200).send(`
        <html><body>
          <script>window.location.replace('${redirectUrl}');</script>
          <noscript>Invalid signature. <a href="${redirectUrl}">Return</a></noscript>
        </body></html>
      `);
    }

    // Fetch order to recover notes context (loanId, isRepayment, userId)
    const auth = Buffer.from(`${RZP_KEY_ID}:${RZP_KEY_SECRET}`).toString('base64');
    const orderResp = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
      method: 'GET',
      headers: { 'Authorization': `Basic ${auth}`, 'Connection': 'keep-alive' },
      agent: rzpAgent,
    });
    if (!orderResp.ok) {
      const text = await orderResp.text().catch(() => '');
      const redirectUrl = `${clientOrigin}/lender?payment=failed&order=${encodeURIComponent(razorpay_order_id)}&code=ORDER_FETCH_FAILED&reason=${encodeURIComponent(text || 'Failed to fetch order')}`;
      return res.status(200).send(`
        <html><body>
          <script>window.location.replace('${redirectUrl}');</script>
          <noscript>Order fetch failed. <a href="${redirectUrl}">Return</a></noscript>
        </body></html>
      `);
    }
    const orderJson = await orderResp.json();
    const notes = orderJson?.notes || {};
    const loanId = notes.loanId;
    const isRepayment = notes.isRepayment === true || notes.isRepayment === 'true';
    const routeBase = isRepayment ? '/borrower' : '/lender';

    if (!loanId) {
      const redirectUrl = `${clientOrigin}${routeBase}?payment=failed&order=${encodeURIComponent(razorpay_order_id)}&code=MISSING_CONTEXT&reason=${encodeURIComponent('Order missing loanId context')}`;
      return res.status(200).send(`
        <html><body>
          <script>window.location.replace('${redirectUrl}');</script>
          <noscript>Missing context. <a href="${redirectUrl}">Return</a></noscript>
        </body></html>
      `);
    }

    // Update loan similar to /verify route
    const loan = await Loan.findById(loanId).populate('borrowerId lenderId');
    if (!loan) {
      const redirectUrl = `${clientOrigin}${routeBase}?payment=failed&order=${encodeURIComponent(razorpay_order_id)}&code=LOAN_NOT_FOUND&reason=${encodeURIComponent('Loan not found')}`;
      return res.status(200).send(`
        <html><body>
          <script>window.location.replace('${redirectUrl}');</script>
          <noscript>Loan not found. <a href="${redirectUrl}">Return</a></noscript>
        </body></html>
      `);
    }

    let update = {};
    if (isRepayment) {
      update = { repaid: true };
    } else {
      update = { funded: true, fundedAt: new Date() };
    }
    await Loan.findByIdAndUpdate(loanId, update, { new: true });

    // Fire-and-forget notification to borrower
    try {
      const borrowerMessage = isRepayment
        ? `You have successfully repaid ₹${loan.amount} for your loan (${loan.purpose})`
        : `Your loan request for ₹${loan.amount} (${loan.purpose}) has been funded!`;
      await Notification.create({ userId: loan.borrowerId, type: 'payment', message: borrowerMessage });
    } catch (_) {}

    // Redirect back to app with success status
    const successUrl = `${clientOrigin}${routeBase}?payment=success&order=${encodeURIComponent(razorpay_order_id)}`;
    return res.status(200).send(`
      <html>
        <body>
          <script>
            window.location.replace('${successUrl}');
          </script>
          <noscript>Payment processed. <a href="${successUrl}">Return to app</a></noscript>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('Callback verification error:', err);
    const clientOrigin = getClientOrigin(req);
    const fallbackUrl = `${clientOrigin}/lender?payment=failed&code=CALLBACK_ERROR&reason=${encodeURIComponent(err?.message || 'Payment callback failed')}`;
    return res.status(200).send(`
      <html><body>
        <script>window.location.replace('${fallbackUrl}');</script>
        <noscript>Payment error. <a href="${fallbackUrl}">Return</a></noscript>
      </body></html>
    `);
  }
});

// Resolve pending/incomplete payments by checking order status
router.get('/status/:orderId', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!orderId) return res.status(400).json({ error: 'orderId required' });

    const auth = Buffer.from(`${RZP_KEY_ID}:${RZP_KEY_SECRET}`).toString('base64');
    const orderResp = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
      method: 'GET',
      headers: { 'Authorization': `Basic ${auth}`, 'Connection': 'keep-alive' },
      agent: rzpAgent,
    });
    if (!orderResp.ok) {
      const text = await orderResp.text().catch(() => '');
      return res.status(502).json({ error: 'Failed to fetch order', details: text });
    }
    const orderJson = await orderResp.json();
    const status = orderJson.status; // created | paid | attempted
    const notes = orderJson.notes || {};

    // If already paid, ensure loan is updated (idempotent)
    let updated = false;
    if (status === 'paid' && notes.loanId) {
      const loan = await Loan.findById(notes.loanId);
      if (loan) {
        if (notes.isRepayment === true || notes.isRepayment === 'true') {
          if (!loan.repaid) {
            await Loan.findByIdAndUpdate(loan._id, { repaid: true }, { new: true });
            updated = true;
          }
        } else {
          if (!loan.funded) {
            await Loan.findByIdAndUpdate(loan._id, { funded: true, fundedAt: new Date() }, { new: true });
            updated = true;
          }
        }
      }
    }

    return res.json({ status, notes, updated });
  } catch (err) {
    console.error('Order status check error:', err);
    return res.status(500).json({ error: 'Status check failed' });
  }
});

// Server-rendered fallback page to initiate Razorpay Checkout in top-level context
router.get('/checkout/:orderId', (req, res) => {
  const { orderId } = req.params;
  console.log('➡️ Serving checkout for orderId (param):', orderId);
  if (!orderId) return res.status(400).send('Missing orderId');
  const callbackUrl = getCallbackUrl(req);
  const keyId = RZP_KEY_ID;
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!doctype html>
  <html>
    <head>
  <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Processing Payment...</title>
  <link rel="preconnect" href="https://checkout.razorpay.com" crossorigin>
  <link rel="dns-prefetch" href="https://checkout.razorpay.com">
  <link rel="preconnect" href="https://api.razorpay.com" crossorigin>
  <link rel="dns-prefetch" href="https://api.razorpay.com">
    </head>
    <body style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial;">
      <p>Opening secure checkout...</p>
      <script src="https://checkout.razorpay.com/v1/checkout.js"
        data-key="${keyId}"
        data-order_id="${orderId}"
        data-name="BorrowEase"
        data-description="Fund Loan"
        data-redirect="true"
        data-callback_url="${callbackUrl}"></script>
      <script>
        // Automatically open checkout if not already opened by data attributes
        (function waitAndOpen(){
          if (window.Razorpay && typeof Razorpay === 'function') {
            try {
              // Create a minimal instance to nudge checkout for older browsers
              var r = new Razorpay({ key: '${keyId}', order_id: '${orderId}', redirect: true, callback_url: '${callbackUrl}' });
              r.open();
            } catch(e) { /* ignore */ }
          }
        })();
      </script>
    </body>
  </html>`);
});

// Fallback: support /checkout?orderId=...
router.get('/checkout', (req, res) => {
  const orderId = req.query.orderId;
  console.log('➡️ Serving checkout for orderId (query):', orderId);
  if (!orderId) return res.status(400).send('Missing orderId');
  req.params = { orderId };
  return router.handle(req, res, () => {});
});

// Fallback: wildcard match /checkout/*
router.get('/checkout/*', (req, res) => {
  const orderId = req.params[0];
  console.log('➡️ Serving checkout for orderId (wildcard):', orderId);
  if (!orderId) return res.status(400).send('Missing orderId');
  const callbackUrl = getCallbackUrl(req);
  const keyId = RZP_KEY_ID;
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Processing Payment...</title>
    </head>
    <body style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial;">
      <p>Opening secure checkout...</p>
      <script src="https://checkout.razorpay.com/v1/checkout.js"
        data-key="${keyId}"
        data-order_id="${orderId}"
        data-name="BorrowEase"
        data-description="Fund Loan"
        data-redirect="true"
        data-callback_url="${callbackUrl}"></script>
      <script>
        (function(){
          if (window.Razorpay && typeof Razorpay === 'function') {
            try {
              var r = new Razorpay({ key: '${keyId}', order_id: '${orderId}', redirect: true, callback_url: '${callbackUrl}' });
              r.open();
            } catch(e) {}
          }
        })();
      </script>
    </body>
  </html>`);
});

// Avoid logging secrets in production


export default router;
