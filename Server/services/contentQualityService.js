// Content Quality / Gibberish Heuristic Service
// Calculates a score (0-100) where higher = better quality, plus flags & label.

const COMMON_STOPWORDS = new Set([
  'the','be','to','of','and','a','in','that','have','i','it','for','not','on','with','he','as','you','do','at','this','but','his','by','from','they','we','say','her','she','or','an','will','my','one','all','would','there','their'
]);

function shannonEntropy(str) {
  if (!str) return 0;
  const freq = new Map();
  for (const ch of str) {
    if (ch === ' ' || ch === '\n') continue;
    freq.set(ch, (freq.get(ch) || 0) + 1);
  }
  const len = Array.from(freq.values()).reduce((a,b)=>a+b,0);
  let H = 0;
  for (const c of freq.values()) {
    const p = c / len;
    H -= p * Math.log2(p);
  }
  return H; // bits per symbol
}

function alphaRatio(str) {
  if (!str) return 0;
  let alpha=0, total=0;
  for (const ch of str) {
    if (/[a-zA-Z]/.test(ch)) alpha++;
    if (!/\s/.test(ch)) total++;
  }
  return total === 0 ? 0 : alpha/total;
}

function vowelConsonantBalance(str) {
  const letters = str.toLowerCase().replace(/[^a-z]/g,'');
  if (!letters) return 0;
  let v=0,c=0;
  for (const ch of letters) {
    if ('aeiou'.includes(ch)) v++; else c++;
  }
  if (v === 0 || c === 0) return 0.2; // penalize extremes
  const ratio = v / (c || 1);
  // ideal near ~0.45-0.65; map deviation
  const diff = Math.abs(ratio - 0.55);
  return Math.max(0, 1 - diff * 1.5);
}

function stopwordRatio(tokens) {
  if (!tokens.length) return 0;
  let sw=0;
  for (const t of tokens) if (COMMON_STOPWORDS.has(t)) sw++;
  return sw / tokens.length;
}

function repeatCharRuns(str) {
  const runs = str.match(/(.)\1{3,}/g);
  return runs ? runs.length : 0;
}

export function analyzeContentQuality({ subject='', message='' }) {
  const text = `${subject} ${message}`.trim();
  const length = text.length;
  const tokens = text.toLowerCase().split(/[^a-zA-Z0-9']+/).filter(Boolean);
  const uniqueTokens = new Set(tokens);
  const entropy = shannonEntropy(text);
  const alpha = alphaRatio(text);
  const vowelBalance = vowelConsonantBalance(text);
  const swRatio = stopwordRatio(tokens);
  const repeats = repeatCharRuns(text);

  // Heuristic scoring combining factors
  let score = 100;
  if (length < 20) score -= 35;
  else if (length < 60) score -= 10;
  if (entropy < 2.5) score -= 20;
  if (entropy > 5.2) score -= 10; // extremely high randomness
  if (alpha < 0.6) score -= 15;
  if (vowelBalance < 0.4) score -= 10;
  if (swRatio < 0.05) score -= 15; // almost no stopwords (often gibberish)
  if (repeats > 0) score -= Math.min(20, repeats * 5);
  if (uniqueTokens.size < tokens.length * 0.4) score -= 10; // heavy repetition

  score = Math.max(0, Math.min(100, score));

  const flags = [];
  if (length < 20) flags.push('too_short');
  if (entropy < 2.5) flags.push('low_entropy');
  if (alpha < 0.6) flags.push('low_alpha_ratio');
  if (swRatio < 0.05) flags.push('no_stopwords');
  if (repeats > 0) flags.push('repeated_chars');
  if (uniqueTokens.size < tokens.length * 0.4) flags.push('high_repetition');

  let label = 'acceptable';
  if (score < 30) label = 'gibberish';
  else if (score < 55) label = 'low_quality';
  else if (score > 85) label = 'excellent';

  return {
    score,
    label,
    flags,
    metrics: {
      length,
      entropy,
      alphaRatio: alpha,
      vowelBalance,
      stopwordRatio: swRatio,
      repeats,
      tokenCount: tokens.length,
      uniqueTokenCount: uniqueTokens.size
    }
  };
}

export default { analyzeContentQuality };
