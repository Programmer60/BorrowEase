#!/usr/bin/env node
import 'dotenv/config';
import nodemailer from 'nodemailer';

(async () => {
  try {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = process.env.SMTP_SECURE === 'true';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      console.error('Missing SMTP credentials (SMTP_HOST / SMTP_USER / SMTP_PASS).');
      process.exit(1);
    }

    console.log('[SMTP-DIAG] Creating transporter', { host, port, secure });
    const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });

    console.log('[SMTP-DIAG] Verifying connection/login...');
    await transporter.verify();
    console.log('[SMTP-DIAG] ✅ Login success');

    const from = process.env.MAIL_FROM || user;
    const to = process.env.SMTP_TEST_TO || user;
    console.log(`[SMTP-DIAG] Sending test mail from ${from} to ${to}`);
    const info = await transporter.sendMail({ from, to, subject: 'BorrowEase SMTP Diagnostic', text: 'If you received this, SMTP auth works.' });

    console.log('[SMTP-DIAG] Sent messageId:', info.messageId);
    process.exit(0);
  } catch (err) {
    console.error('[SMTP-DIAG] ❌ Error:', err.message);
    if (err.response) console.error('[SMTP-DIAG] Provider response:', err.response);
    process.exit(1);
  }
})();
