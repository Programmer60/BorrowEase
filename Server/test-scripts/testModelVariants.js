#!/usr/bin/env node
/**
 * Model Variant Benchmark Script
 * Usage: node testModelVariants.js <BASE_URL> <FIREBASE_ID_TOKEN> [userId]
 * Example: node testModelVariants.js http://localhost:5000 eyJhbGci... 665abc...
 */
import fetch from 'node-fetch';

const [,, baseUrl = 'http://localhost:5000', token, userId] = process.argv;
if (!token) {
  console.error('Missing Firebase ID token argument.');
  process.exit(1);
}

const endpoint = (path) => `${baseUrl.replace(/\/$/, '')}${path}`;

async function call(path) {
  const res = await fetch(endpoint(path + (path.includes('?') ? '' : '')), {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${path} -> ${res.status}: ${text}`);
  }
  return res.json();
}

(async () => {
  try {
    const query = userId ? `?userId=${userId}` : '';
  // NOTE: Routes are mounted under /api/ai in server.js, previous version missed /api prefix -> 404
  const evalData = await call(`/api/ai/model-evaluate${query}`);
    console.log('\nModel Evaluation Results');
    console.log('========================');
    evalData.models.forEach(m => {
      console.log(`${m.label}: score=${m.score} (base=${m.baseScore}) accuracy=${m.accuracy}% latency≈${m.latencyMs}ms`);
    });

  const riskRes = await call(`/api/ai/risk-assessment${query}`);
    console.log('\nSingle Model API (risk-assessment)');
    console.log('=================================');
    console.log({ modelUsed: riskRes.modelUsed, overallScore: riskRes.overallScore, modelAccuracy: riskRes.modelAccuracy });

    console.log('\nComponents Comparison (first model vs weighted):');
    console.table(evalData.models.map(m => ({ model: m.id, score: m.score, creditworthiness: m.components.creditworthiness, behavioral: m.components.behavioralRisk })));
  } catch (e) {
    console.error('Benchmark failed:', e.message);
    process.exit(1);
  }
})();
