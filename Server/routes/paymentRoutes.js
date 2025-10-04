import express from "express";
import Razorpay from "razorpay";
import fetch from "node-fetch";
import dotenv from "dotenv";
import crypto from "crypto";
import https from "https";
import Loan from "../models/loanModel.js";
import User from "../models/userModel.js";
import Notification from "../models/notificationModel.js";
import { verifyToken } from "../firebase.js";

// Load environment variables first
dotenv.config();

const router = express.Router();

// Normalize keys and keep consistent fallbacks for both order creation and verification
const RZP_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RZP_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

if (!RZP_KEY_ID || !RZP_KEY_SECRET) {
  console.warn("Razorpay keys are not set in environment. Payment routes will be disabled.");
}

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

// Pretty redirect page (used in callback) so users don't see a blank screen
const renderAutoRedirectPage = (redirectUrl, opts = {}) => {
  const title = opts.title || 'Redirecting…';
  const subtitle = opts.subtitle || 'Please wait while we take you back to BorrowEase';
  const statusColor = opts.status === 'success' ? '#16a34a' : opts.status === 'error' ? '#dc2626' : '#4f46e5';
  return `<!doctype html>
  <html lang="en" class="dark">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${title}</title>
      <meta http-equiv="refresh" content="1;url=${redirectUrl}">
      <style>
        :root {
          color-scheme: light dark;
        }
        body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;background:#f8fafc;color:#0f172a;transition:background-color 0.3s ease, color 0.3s ease}
        .wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
        .card{background:#fff;border-radius:16px;box-shadow:0 10px 25px rgba(2,6,23,0.08);padding:28px;max-width:520px;width:100%;text-align:center;border:1px solid #e5e7eb;transition:background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease}
        .logo{font-weight:800;font-size:20px;color:#4f46e5;letter-spacing:0.3px}
        .title{margin:12px 0 6px 0;font-size:20px;font-weight:700}
        .subtitle{margin:0 0 18px 0;color:#475569;font-size:14px}
        .spinner{margin:18px auto 16px auto;width:44px;height:44px;border:4px solid #e5e7eb;border-top-color:${statusColor};border-radius:50%;animation:spin 0.9s linear infinite}
        .btn{display:inline-block;margin-top:8px;background:${statusColor};color:#fff;padding:10px 14px;border-radius:10px;text-decoration:none;font-weight:600;transition:opacity 0.2s ease}
        .btn:hover{opacity:0.9}
        @keyframes spin{to{transform:rotate(360deg)}}
        
        /* Dark mode styles */
        @media (prefers-color-scheme: dark) {
          body{background:#0f172a;color:#f1f5f9}
          .card{background:#1e293b;border-color:#334155;box-shadow:0 10px 25px rgba(0,0,0,0.3)}
          .subtitle{color:#94a3b8}
          .spinner{border-color:#334155;border-top-color:${statusColor}}
        }
        
        /* Force dark mode when .dark class is present */
        .dark body{background:#0f172a;color:#f1f5f9}
        .dark .card{background:#1e293b;border-color:#334155;box-shadow:0 10px 25px rgba(0,0,0,0.3)}
        .dark .subtitle{color:#94a3b8}
        .dark .spinner{border-color:#334155;border-top-color:${statusColor}}
      </style>
      <script>
        // Dark mode detection and application
        (function() {
          const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
          const storedTheme = localStorage.getItem('theme');
          const shouldUseDark = storedTheme === 'dark' || (!storedTheme && prefersDark);
          
          if (shouldUseDark) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        })();
        
        // Safety redirect for JS-enabled browsers
        (function(){try{setTimeout(function(){window.location.replace('${redirectUrl}');}, 150);}catch(e){}})();
      </script>
    </head>
    <body>
      <div class="wrap">
        <div class="card">
          <div class="logo">BorrowEase</div>
          <div class="spinner"></div>
          <div class="title">${title}</div>
          <div class="subtitle">${subtitle}</div>
          <a class="btn" href="${redirectUrl}">Continue</a>
        </div>
      </div>
    </body>
  </html>`;
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
  userId: req.user?.id || req.user?.uid || "",
  userName: req.user?.name || req.user?.email || ""
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
    // Provide a convenient server-hosted checkout URL for top-level redirect flows
    try {
      const checkoutBase = getCallbackUrl(req).replace('/callback', ''); // -> {ORIGIN}/api/payment
      const fallbackRole = (Boolean(isRepayment) === true) ? 'borrower' : 'lender';
      const checkoutUrl = `${checkoutBase}/checkout/${order.id}?fallback=${fallbackRole}`;
      res.json({
        ...order,
        checkoutUrl,
      });
    } catch (_) {
      // Fallback to vanilla order object if URL construction fails
      res.json(order);
    }
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
      update = { funded: true, lenderId: req.user.id, lenderName: (req.user.name || req.user.email || ''), fundedAt: new Date() };
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
      const fb = (req.query?.fallback || '').toString().toLowerCase();
      let routeBase = fb === 'borrower' ? '/borrower' : '/lender';
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
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(renderAutoRedirectPage(redirectUrl, {
        title: 'Payment failed',
        subtitle: 'Taking you back to your dashboard…',
        status: 'error'
      }));
    }

    // Success flow: verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", RZP_KEY_SECRET)
      .update(body.toString())
      .digest("hex");
    if (expectedSignature !== razorpay_signature) {
      const redirectUrl = `${clientOrigin}/lender?payment=failed&order=${encodeURIComponent(razorpay_order_id)}&code=SIGNATURE_MISMATCH&reason=${encodeURIComponent('Invalid signature')}`;
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(renderAutoRedirectPage(redirectUrl, {
        title: 'Verification error',
        subtitle: 'We could not verify this payment. Redirecting…',
        status: 'error'
      }));
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
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(renderAutoRedirectPage(redirectUrl, {
        title: 'Processing error',
        subtitle: 'We could not retrieve order details. Redirecting…',
        status: 'error'
      }));
    }
    const orderJson = await orderResp.json();
    const notes = orderJson?.notes || {};
    const loanId = notes.loanId;
    const isRepayment = notes.isRepayment === true || notes.isRepayment === 'true';
    const routeBase = isRepayment ? '/borrower' : '/lender';

    if (!loanId) {
      const redirectUrl = `${clientOrigin}${routeBase}?payment=failed&order=${encodeURIComponent(razorpay_order_id)}&code=MISSING_CONTEXT&reason=${encodeURIComponent('Order missing loanId context')}`;
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(renderAutoRedirectPage(redirectUrl, {
        title: 'Missing context',
        subtitle: 'Redirecting you back safely…',
        status: 'error'
      }));
    }

    // Update loan similar to /verify route
    const loan = await Loan.findById(loanId).populate('borrowerId lenderId');
    if (!loan) {
      const redirectUrl = `${clientOrigin}${routeBase}?payment=failed&order=${encodeURIComponent(razorpay_order_id)}&code=LOAN_NOT_FOUND&reason=${encodeURIComponent('Loan not found')}`;
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(renderAutoRedirectPage(redirectUrl, {
        title: 'Loan not found',
        subtitle: 'Redirecting you back to dashboard…',
        status: 'error'
      }));
    }

    let update = {};
    if (isRepayment) {
      update = { repaid: true };
    } else {
      // Attach lenderId and lenderName from order notes so it shows in lender history/chat
      const lenderId = notes?.userId || null;
      let lenderName = notes?.userName || '';
      if (!lenderName && lenderId) {
        try {
          const lender = await User.findById(lenderId).select('name email');
          lenderName = lender?.name || lender?.email || '';
        } catch (_) {}
      }
      update = { funded: true, fundedAt: new Date(), ...(lenderId ? { lenderId } : {}), ...(lenderName ? { lenderName } : {}) };
    }
    await Loan.findByIdAndUpdate(loanId, update, { new: true });

    // Fire-and-forget notifications
    try {
      const borrowerMessage = isRepayment
        ? `You have successfully repaid ₹${loan.amount} for your loan (${loan.purpose})`
        : `Your loan request for ₹${loan.amount} (${loan.purpose}) has been funded!`;
      await Notification.create({ userId: loan.borrowerId, type: 'payment', message: borrowerMessage });
      if (!isRepayment) {
        const lenderId = notes?.userId || null;
        if (lenderId) {
          const lenderMsg = `You have successfully funded ₹${loan.amount} to ${loan.name} for ${loan.purpose}`;
          await Notification.create({ userId: lenderId, type: 'payment', message: lenderMsg });
        }
      }
    } catch (_) {}

    // Redirect back to app with success status
    const successUrl = `${clientOrigin}${routeBase}?payment=success&order=${encodeURIComponent(razorpay_order_id)}`;
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(renderAutoRedirectPage(successUrl, {
      title: 'Payment successful',
      subtitle: 'Redirecting you back to your dashboard…',
      status: 'success'
    }));
  } catch (err) {
    console.error('Callback verification error:', err);
    const clientOrigin = getClientOrigin(req);
    const fallbackUrl = `${clientOrigin}/lender?payment=failed&code=CALLBACK_ERROR&reason=${encodeURIComponent(err?.message || 'Payment callback failed')}`;
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(renderAutoRedirectPage(fallbackUrl, {
      title: 'Payment error',
      subtitle: 'We hit a snag processing your payment. Redirecting…',
      status: 'error'
    }));
  }
});

// Some Razorpay flows (especially failures) may hit callback via GET instead of POST
router.get("/callback", async (req, res) => {
  try {
    const clientOrigin = getClientOrigin(req);
    const q = req.query || {};

    // Extract error details from query-encoded fields
    const errCode = q["error[code]"] || q.code || 'PAYMENT_FAILED';
    const errDesc = q["error[description]"] || q.reason || 'Payment was cancelled or failed.';
    const orderId = q["error[metadata][order_id]"] || q.order_id || '';

  // Decide where to return: borrower (repayment) vs lender (funding)
  const fb = (q.fallback || '').toString().toLowerCase();
  let routeBase = fb === 'borrower' ? '/borrower' : '/lender';
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
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(renderAutoRedirectPage(redirectUrl, {
      title: 'Payment failed',
      subtitle: 'Taking you back to your dashboard…',
      status: 'error'
    }));
  } catch (err) {
    console.error('GET /payment/callback error:', err);
    const clientOrigin = getClientOrigin(req);
    const fallbackUrl = `${clientOrigin}/borrower?payment=failed&code=CALLBACK_GET_ERROR&reason=${encodeURIComponent(err?.message || 'Payment callback failed')}`;
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(renderAutoRedirectPage(fallbackUrl, {
      title: 'Payment error',
      subtitle: 'Redirecting you back…',
      status: 'error'
    }));
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
            const lenderId = notes.userId || undefined;
            await Loan.findByIdAndUpdate(loan._id, { funded: true, fundedAt: new Date(), ...(lenderId ? { lenderId } : {}) }, { new: true });
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
  const fb = (req.query.fallback || '').toString().toLowerCase();
  const callbackUrl = `${getCallbackUrl(req)}${fb ? `?fallback=${encodeURIComponent(fb)}` : ''}`;
  const keyId = RZP_KEY_ID;
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!doctype html>
  <html lang="en" class="dark">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Processing Payment - BorrowEase</title>
      <link rel="preconnect" href="https://checkout.razorpay.com" crossorigin>
      <link rel="dns-prefetch" href="https://checkout.razorpay.com">
      <link rel="preconnect" href="https://api.razorpay.com" crossorigin>
      <link rel="dns-prefetch" href="https://api.razorpay.com">
      <style>
        :root {
          color-scheme: light dark;
        }
        body {
          margin: 0;
          font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial;
          background: #f8fafc;
          color: #0f172a;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          transition: background-color 0.3s ease, color 0.3s ease;
        }
        .container {
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 10px 25px rgba(2,6,23,0.08);
          padding: 32px;
          max-width: 480px;
          width: 100%;
          text-align: center;
          border: 1px solid #e5e7eb;
          transition: background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
        }
        .logo {
          font-weight: 800;
          font-size: 24px;
          color: #4f46e5;
          letter-spacing: 0.3px;
          margin-bottom: 16px;
        }
        .title {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .subtitle {
          color: #475569;
          font-size: 14px;
          margin-bottom: 24px;
        }
        .spinner {
          margin: 20px auto;
          width: 40px;
          height: 40px;
          border: 4px solid #e5e7eb;
          border-top-color: #4f46e5;
          border-radius: 50%;
          animation: spin 0.9s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        /* Dark mode styles */
        @media (prefers-color-scheme: dark) {
          body { background: #0f172a; color: #f1f5f9; }
          .container { background: #1e293b; border-color: #334155; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
          .subtitle { color: #94a3b8; }
          .spinner { border-color: #334155; border-top-color: #4f46e5; }
        }
        
        /* Force dark mode when .dark class is present */
        .dark body { background: #0f172a; color: #f1f5f9; }
        .dark .container { background: #1e293b; border-color: #334155; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
        .dark .subtitle { color: #94a3b8; }
        .dark .spinner { border-color: #334155; border-top-color: #4f46e5; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">BorrowEase</div>
        <div class="spinner"></div>
        <div class="title">Processing Payment</div>
        <div class="subtitle">Opening secure checkout...</div>
      </div>
      
      <script>
        // Dark mode detection and application
        (function() {
          const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
          const storedTheme = localStorage.getItem('theme');
          const shouldUseDark = storedTheme === 'dark' || (!storedTheme && prefersDark);
          
          if (shouldUseDark) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        })();
      </script>
      
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
  const fb = (req.query.fallback || '').toString().toLowerCase();
  const callbackUrl = `${getCallbackUrl(req)}${fb ? `?fallback=${encodeURIComponent(fb)}` : ''}`;
  const keyId = RZP_KEY_ID;
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!doctype html>
  <html lang="en" class="dark">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Processing Payment - BorrowEase</title>
      <style>
        :root {
          color-scheme: light dark;
        }
        body {
          margin: 0;
          font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial;
          background: #f8fafc;
          color: #0f172a;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          transition: background-color 0.3s ease, color 0.3s ease;
        }
        .container {
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 10px 25px rgba(2,6,23,0.08);
          padding: 32px;
          max-width: 480px;
          width: 100%;
          text-align: center;
          border: 1px solid #e5e7eb;
          transition: background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
        }
        .logo {
          font-weight: 800;
          font-size: 24px;
          color: #4f46e5;
          letter-spacing: 0.3px;
          margin-bottom: 16px;
        }
        .title {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .subtitle {
          color: #475569;
          font-size: 14px;
          margin-bottom: 24px;
        }
        .spinner {
          margin: 20px auto;
          width: 40px;
          height: 40px;
          border: 4px solid #e5e7eb;
          border-top-color: #4f46e5;
          border-radius: 50%;
          animation: spin 0.9s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        /* Dark mode styles */
        @media (prefers-color-scheme: dark) {
          body { background: #0f172a; color: #f1f5f9; }
          .container { background: #1e293b; border-color: #334155; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
          .subtitle { color: #94a3b8; }
          .spinner { border-color: #334155; border-top-color: #4f46e5; }
        }
        
        /* Force dark mode when .dark class is present */
        .dark body { background: #0f172a; color: #f1f5f9; }
        .dark .container { background: #1e293b; border-color: #334155; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
        .dark .subtitle { color: #94a3b8; }
        .dark .spinner { border-color: #334155; border-top-color: #4f46e5; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">BorrowEase</div>
        <div class="spinner"></div>
        <div class="title">Processing Payment</div>
        <div class="subtitle">Opening secure checkout...</div>
      </div>
      
      <script>
        // Dark mode detection and application
        (function() {
          const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
          const storedTheme = localStorage.getItem('theme');
          const shouldUseDark = storedTheme === 'dark' || (!storedTheme && prefersDark);
          
          if (shouldUseDark) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        })();
      </script>
      
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

// Fallback: wildcard match /checkout/*
router.get('/checkout/*', (req, res) => {
  const orderId = req.params[0];
  console.log('➡️ Serving checkout for orderId (wildcard):', orderId);
  if (!orderId) return res.status(400).send('Missing orderId');
  const fb = (req.query.fallback || '').toString().toLowerCase();
  const callbackUrl = `${getCallbackUrl(req)}${fb ? `?fallback=${encodeURIComponent(fb)}` : ''}`;
  const keyId = RZP_KEY_ID;
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!doctype html>
  <html lang="en" class="dark">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Processing Payment - BorrowEase</title>
      <style>
        :root {
          color-scheme: light dark;
        }
        body {
          margin: 0;
          font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial;
          background: #f8fafc;
          color: #0f172a;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          transition: background-color 0.3s ease, color 0.3s ease;
        }
        .container {
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 10px 25px rgba(2,6,23,0.08);
          padding: 32px;
          max-width: 480px;
          width: 100%;
          text-align: center;
          border: 1px solid #e5e7eb;
          transition: background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
        }
        .logo {
          font-weight: 800;
          font-size: 24px;
          color: #4f46e5;
          letter-spacing: 0.3px;
          margin-bottom: 16px;
        }
        .title {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .subtitle {
          color: #475569;
          font-size: 14px;
          margin-bottom: 24px;
        }
        .spinner {
          margin: 20px auto;
          width: 40px;
          height: 40px;
          border: 4px solid #e5e7eb;
          border-top-color: #4f46e5;
          border-radius: 50%;
          animation: spin 0.9s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        /* Dark mode styles */
        @media (prefers-color-scheme: dark) {
          body { background: #0f172a; color: #f1f5f9; }
          .container { background: #1e293b; border-color: #334155; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
          .subtitle { color: #94a3b8; }
          .spinner { border-color: #334155; border-top-color: #4f46e5; }
        }
        
        /* Force dark mode when .dark class is present */
        .dark body { background: #0f172a; color: #f1f5f9; }
        .dark .container { background: #1e293b; border-color: #334155; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
        .dark .subtitle { color: #94a3b8; }
        .dark .spinner { border-color: #334155; border-top-color: #4f46e5; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">BorrowEase</div>
        <div class="spinner"></div>
        <div class="title">Processing Payment</div>
        <div class="subtitle">Opening secure checkout...</div>
      </div>
      
      <script>
        // Dark mode detection and application
        (function() {
          const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
          const storedTheme = localStorage.getItem('theme');
          const shouldUseDark = storedTheme === 'dark' || (!storedTheme && prefersDark);
          
          if (shouldUseDark) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        })();
      </script>
      
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
