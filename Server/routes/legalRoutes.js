import express from 'express';
import PDFDocument from 'pdfkit';
import crypto from 'crypto';

const router = express.Router();

// Utility constants & simple in-memory archive (persist in DB if needed)
const LEGAL_VERSION = '2025.10.01';
const SUPPORTED_LANGS = ['en'];
const ARCHIVE = { // { docType: { version: { lang: { pdf: <Buffer>, etag, createdAt, html } } } }
  privacy: {},
  terms: {}
};

function getLang(req){
  const lang = (req.query.lang || 'en').toLowerCase();
  return SUPPORTED_LANGS.includes(lang) ? lang : 'en';
}

function computeEtag(parts){
  return 'W/"' + crypto.createHash('sha256').update(parts.join('|')).digest('base64').substring(0,32) + '"';
}

function setPdfHeaders(res, fileName, etag){
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.setHeader('Last-Modified', new Date().toUTCString());
  if (etag) res.setHeader('ETag', etag);
}

function addFooter(doc){
  const range = doc.bufferedPageRange();
  const totalPages = range.count;
  
  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(i);
    const pageNumber = i + 1;
    
    // Footer at 30 points from bottom
    const footerY = doc.page.height - 30;
    
    doc.fontSize(7)
      .fillColor('#666')
      .text(
        `BorrowEase Legal • Page ${pageNumber} of ${totalPages}`,
        doc.page.margins.left,
        footerY,
        { 
          align: 'center', 
          width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
          lineBreak: false
        }
      );
  }
}

function startDoc(title){
  const doc = new PDFDocument({
    info: {
      Title: title,
      Author: 'BorrowEase',
      Subject: title,
      Keywords: 'BorrowEase, lending, student loans, compliance',
    },
    bufferPages: true,
    margins: { top: 40, bottom: 50, left: 50, right: 50 },
    autoFirstPage: true,
    size: 'A4'
  });
  return doc;
}

function heading(doc, text){
  doc.moveDown(0.3).fontSize(16).fillColor('#111').text(text, { underline: true });
  doc.moveDown(0.2).fontSize(10).fillColor('#222');
}

function subheading(doc, text){
  doc.moveDown(0.3).fontSize(12).fillColor('#111').text(text);
  doc.moveDown(0.15).fontSize(10).fillColor('#222');
}

function bullet(doc, items){
  items.forEach(i => {
    doc.fontSize(9).text(`• ${i}`, { indent: 10, lineGap: 1 });
  });
  doc.moveDown(0.15);
}
// ------- Content Builders (i18n ready) ---------
function buildPrivacySections(lang){
  // Only 'en' currently
  return [
    { h:'Privacy Policy', p:'Effective Date: 01 Oct 2025' },
    { sh:'1. Overview', p:'BorrowEase is a student-centric lending platform. This Privacy Policy explains how we collect, use, disclose, and protect personal data belonging to borrowers, lenders, and visitors. We implement layered security, data minimization, and jurisdiction-aware retention practices.' },
    { sh:'Policy Version', p:`Current Version: ${LEGAL_VERSION}` },
    { sh:'2. Data We Collect', bullets:[
      'Identity Data: name, student status verification artifacts (KYC tokens, institution proof).',
      'Contact Data: email, phone (OTP + risk scoring).',
      'Financial Data: loan requests, repayment history, disbursement identifiers — never full card/PAN details (we offload to PCI-compliant providers).',
      'Device & Usage Data: IP (hashed for rate limit windows), user agent, session risk metrics.',
      'Behavioral Signals: message content quality scores, fraud heuristics, anomaly flags.',
      'Communication Metadata: timestamps, delivery statuses, verification attempts.'
    ]},
    { sh:'3. Lawful Bases (GDPR-aligned)', bullets:[
      'Contract: processing loan applications, repayment tracking.',
      'Legitimate Interest: fraud prevention, platform integrity, product analytics.',
      'Consent: marketing emails, optional product updates.',
      'Legal Obligation: financial compliance retention windows.'
    ]},
    { sh:'4. Data Minimization & Retention', p:'We segment retention:', bullets:[
      'Authentication logs: 90 days rolling.',
      'Fraud & risk signals: 180 days unless escalated.',
      'Loan & repayment ledger: 7 years (regulatory).',
      'Support & contact tickets: 24 months post resolution.',
      'Verification codes & rate limit counters: ephemeral (<=24h).'
    ]},
    { sh:'5. Security Controls', bullets:[
      'Hardened email queue with exponential backoff + provider abstraction.',
      'HMAC-based suppression links to prevent misdirected disclosure.',
      'Entropy + linguistic quality scoring to deflect abusive automation.',
      'Multi-window rate limiting (burst + rolling).',
      'Hashed verification codes (non-reversible).',
      'Principle of least privilege in service segmentation.',
      'Transport security: TLS 1.2+ enforced; HSTS recommended at edge.',
      'At-Rest Encryption: Managed storage encryption (AES-256) & field hashing for verification tokens.',
      'Operational Auditing: Administrative actions & bulk operations logged with immutable event trail.'
    ]},
    { sh:'6. International Transfers', p:'Where data leaves the origin jurisdiction, we apply standard contractual clauses or region-specific safeguards (e.g., GDPR SCCs) before transfer.' },
    { sh:'7. Sharing & Transfers', bullets:[
      'Cloud infrastructure & storage (regionalized, encrypted at rest).',
      'Email providers (transactional only, minimal payload).',
      'Analytics / monitoring (aggregated, pseudonymized).',
      'Regulatory authorities upon lawful request.'
    ]},
    { sh:'8. Data Subject Rights', bullets:[
      'Access, rectification, erasure (unless retention mandate).',
      'Restriction & objection to certain processing.',
      'Portability for core loan history.',
      'Opt-out of non-essential communications.'
    ]},
    { sh:'9. Children', p:'We restrict lending interactions to verified users meeting jurisdiction age thresholds. Under-age submissions are purged after verification failure.' },
    { sh:'10. Incident Response', p:'We classify incidents (LOW/MED/HIGH/CRITICAL). High+ triggers: (a) user notification within required statutory windows, (b) forensic preservation, (c) root cause corrective backlog entry.' },
    { sh:'11. Automated Decision-Making', p:'Risk scoring & fraud heuristics influence review priority but do not alone deny legitimate loan access; manual escalation path preserved.' },
    { sh:'12. Third-Party Processors', p:'A maintained internal register evaluates vendors on confidentiality, integrity, availability (CIA), breach history, and regulatory posture (SOC2 / ISO27001 where applicable).' },
    { sh:'13. Policy Changes', p:'Change log maintained; prior versions available on request. Material changes notified with a minimum 15-day lead unless security-critical.' },
    { sh:'14. Contact', p:'Questions: privacy@borrowease.example (monitored with SLA < 72h).' },
    { sh:'15. Disclaimer', p:'This document is for transparency and does not constitute legal advice. Where local law conflicts, statutory requirements prevail.' }
  ];
}

function buildTermsSections(lang){
  return [
    { h:'Terms of Service', p:'Effective Date: 01 Oct 2025' },
    { sh:'Document Version', p:`Current Version: ${LEGAL_VERSION}` },
    { sh:'1. Agreement', p:'By accessing BorrowEase you agree to these Terms. If representing an institution or funder, you warrant authority to bind that entity.' },
    { sh:'2. Definitions', bullets:[
      '"Platform" means BorrowEase services & APIs.',
      '"User" means borrowers or lenders with authenticated accounts.',
      '"Content" means data, messages, documents submitted by Users.',
      '"Regulated Processors" are payment / KYC vendors with compliance obligations.'
    ]},
    { sh:'3. Platform Role', bullets:[
      'We facilitate peer or institutional student lending workflows.',
      'We are not a bank; we provide orchestration, risk vetting signals, and communication tooling.',
      'Disbursement & repayments may route via regulated payment processors.'
    ]},
    { sh:'4. User Obligations', bullets:[
      'Provide accurate identity & academic status proof.',
      'Maintain security of authentication tokens.',
      'Use messaging tools only for legitimate loan-related dialogue.',
      'Refrain from abusive automation, scraping, or circumvention of rate limits.'
    ]},
    { sh:'5. Prohibited Conduct', bullets:[
      'Fraudulent identity or misrepresentation.',
      'Repayment evasion or circular funding schemes.',
      'Injection of malicious code or exploitation attempts.',
      'Data harvesting beyond intended UX flows.'
    ]},
    { sh:'6. Risk & Disclaimers', bullets:[
      'We do not guarantee loan funding timelines.',
      'Credit improvement metrics are platform-scoped, not bureau guaranteed.',
      'Service provided “AS IS” without implied warranties beyond statutory minima.'
    ]},
    { sh:'7. Liability Cap', p:'Aggregate liability limited to the lesser of: (a) 6 months of platform fees paid (if any) or (b) INR 25,000, except where prohibited by law.' },
    { sh:'8. Termination', p:'We may suspend or terminate accounts for compliance, fraud suspicion, or material breach. On termination, non-regulatory data may be purged per retention schedule.' },
    { sh:'9. Indemnification', p:'You agree to indemnify and hold harmless BorrowEase against third-party claims arising from misuse, breach, or infringement caused by your Content or actions.' },
    { sh:'10. Dispute Resolution', p:'Initial good-faith negotiation → binding arbitration in primary operating jurisdiction. Emergency injunctive relief for IP/security misuse preserved.' },
    { sh:'11. Force Majeure', p:'We are not liable for delays/failures beyond reasonable control (natural disasters, regulatory embargoes, widespread network outages).' },
    { sh:'12. Policy Changes', p:'Material changes communicated via dashboard notice or email at least 15 days prior unless required sooner for security/legal reasons.' },
    { sh:'13. Severability', p:'If any clause is deemed unenforceable, the remainder remains in effect.' },
    { sh:'14. Entire Agreement', p:'These Terms + referenced policies constitute the entire agreement, superseding prior discussions.' },
    { sh:'15. Governing Law', p:'Governed by the laws of the primary operational jurisdiction, excluding conflict-of-law principles.' },
    { sh:'16. Contact', p:'Legal: mishrashivam@7465@gmail.com' },
    { sh:'17. Disclaimer', p:'Not financial, investment, or legal advice. Lending involves risk; perform independent assessment.' }
  ];
}

function renderPdfSections(doc, sections){
  sections.forEach((sec, index) => {
    if (sec.h) {
      heading(doc, sec.h);
    }
    if (sec.sh){
      subheading(doc, sec.sh);
    }
    if (sec.p){
      doc.fontSize(9).text(sec.p, { lineGap: 1 });
    }
    if (sec.bullets){
      bullet(doc, sec.bullets);
    }
    
    // Minimal spacing between sections
    if (index < sections.length - 1) {
      doc.moveDown(0.2);
    }
  });
}

function sectionsToHtml(title, sections){
  const body = sections.map(sec => {
    if (sec.h) return `<h1>${sec.h}</h1><p>${sec.p||''}</p>`;
    let html = '';
    if (sec.sh) html += `<h2>${sec.sh}</h2>`;
    if (sec.p) html += `<p>${sec.p}</p>`;
    if (sec.bullets) html += '<ul>' + sec.bullets.map(b=>`<li>${b}</li>`).join('') + '</ul>';
    return html;
  }).join('\n');
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>${title}</title><meta name="robots" content="index,follow"/><meta name="description" content="${title} for BorrowEase"/><style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:860px;margin:2rem auto;padding:0 1rem;line-height:1.55;}h1{font-size:2rem;margin-top:1.2rem;}h2{margin-top:1.4rem;font-size:1.25rem;border-bottom:1px solid #ddd;padding-bottom:4px;}ul{margin:0.5rem 0 1rem 1.25rem;}code{background:#f5f5f5;padding:2px 4px;border-radius:4px;}</style></head><body>${body}<hr/><footer><small>Version ${LEGAL_VERSION} • © ${new Date().getFullYear()} BorrowEase</small></footer></body></html>`;
}

function getOrBuild(docType, lang){
  const store = ARCHIVE[docType];
  if (!store[LEGAL_VERSION]) store[LEGAL_VERSION] = {};
  if (store[LEGAL_VERSION][lang]) return store[LEGAL_VERSION][lang];
  const sections = docType === 'privacy' ? buildPrivacySections(lang) : buildTermsSections(lang);
  const html = sectionsToHtml(docType==='privacy'? 'BorrowEase Privacy Policy':'BorrowEase Terms of Service', sections);
  // Build PDF into buffer
  const pdfDoc = startDoc(docType==='privacy'?'BorrowEase Privacy Policy':'BorrowEase Terms of Service');
  renderPdfSections(pdfDoc, sections);
  addFooter(pdfDoc);
  
  const chunks=[]; let size=0;
  return new Promise(resolve => {
    pdfDoc.on('data', c=>{chunks.push(c); size+=c.length;});
    pdfDoc.on('end', ()=>{
      const buffer = Buffer.concat(chunks, size);
      const etag = computeEtag([docType, LEGAL_VERSION, lang, buffer.length]);
      store[LEGAL_VERSION][lang] = { pdf: buffer, etag, createdAt: new Date(), html };
      resolve(store[LEGAL_VERSION][lang]);
    });
    pdfDoc.end();
  });
}

async function sendPdf(req, res, docType){
  const lang = getLang(req);
  const record = await getOrBuild(docType, lang);
  if (req.headers['if-none-match'] === record.etag){
    return res.status(304).end();
  }
  setPdfHeaders(res, docType==='privacy'? 'BorrowEase-Privacy-Policy.pdf':'BorrowEase-Terms-of-Service.pdf', record.etag);
  res.send(record.pdf);
}

async function sendHtml(req, res, docType){
  const lang = getLang(req);
  const record = await getOrBuild(docType, lang);
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.setHeader('Cache-Control','public, max-age=900');
  res.setHeader('ETag', record.etag);
  if (req.headers['if-none-match'] === record.etag){
    return res.status(304).end();
  }
  res.send(record.html);
}

// Public routes
router.get('/privacy-policy.pdf', (req,res)=>{ sendPdf(req,res,'privacy'); });
router.get('/terms-of-service.pdf', (req,res)=>{ sendPdf(req,res,'terms'); });

// HTML fallback (SEO / standard link) - auto content negotiation
router.get(['/privacy-policy','/privacy'], (req,res)=>{
  if ((req.headers['accept']||'').includes('text/html')) return sendHtml(req,res,'privacy');
  return sendPdf(req,res,'privacy');
});
router.get(['/terms-of-service','/terms'], (req,res)=>{
  if ((req.headers['accept']||'').includes('text/html')) return sendHtml(req,res,'terms');
  return sendPdf(req,res,'terms');
});

// Archive listing & retrieval
router.get('/archive/list', (req,res)=>{
  res.json(Object.fromEntries(Object.entries(ARCHIVE).map(([k,v])=>[k, Object.keys(v)])));
});

router.get('/archive/:docType/:version/:lang/pdf', async (req,res)=>{
  const {docType, version, lang} = req.params;
  if (!ARCHIVE[docType] || !ARCHIVE[docType][version] || !ARCHIVE[docType][version][lang]){
    return res.status(404).json({error:'Not found'});
  }
  const rec = ARCHIVE[docType][version][lang];
  setPdfHeaders(res, `${docType}-${version}.pdf`, rec.etag);
  res.send(rec.pdf);
});

router.get('/archive/:docType/:version/:lang/html', async (req,res)=>{
  const {docType, version, lang} = req.params;
  if (!ARCHIVE[docType] || !ARCHIVE[docType][version] || !ARCHIVE[docType][version][lang]){
    return res.status(404).json({error:'Not found'});
  }
  const rec = ARCHIVE[docType][version][lang];
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.setHeader('ETag', rec.etag);
  res.send(rec.html);
});


export default router;
