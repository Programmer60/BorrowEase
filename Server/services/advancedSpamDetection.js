import ContactMessage from '../models/contactModel.js';

// Enhanced Spam Detection Service
export class AdvancedSpamDetectionService {
  
  static spamKeywords = [
    'bitcoin', 'crypto', 'investment', 'money back guarantee', 'free money',
    'click here', 'urgent', 'congratulations', 'winner', 'prize',
    'nigerian prince', 'inheritance', 'lottery', 'casino', 'viagra',
    'weight loss', 'get rich quick', 'make money fast', 'business opportunity',
    'work from home', 'no experience required', 'guaranteed income',
    'limited time offer', 'act now', 'call immediately'
  ];

  static suspiciousPatterns = [
    /\b\d{16}\b/g, // Credit card numbers
    /\b\d{3}-\d{2}-\d{4}\b/g, // SSN patterns
    /\$\d+,?\d*\s*(million|billion|thousand)/gi, // Large money amounts
    /(click|visit)\s+https?:\/\//gi, // Suspicious links
    /\b(urgent|asap|immediate|emergency)\b/gi, // Urgency words
    /^[a-z]{8,}$/gi, // Gibberish: long strings of random letters
    /^[a-zA-Z]{3,}\d+[a-zA-Z]{3,}$/g, // Mixed gibberish with numbers
    /(.)\1{4,}/g, // Repeated characters (aaaaa, 11111)
    /^[bcdfghjklmnpqrstvwxyz]{5,}$/gi, // Too many consonants (no vowels)
    /qwerty|asdfgh|zxcvbn/gi, // Keyboard mashing patterns
    /(viagra|cialis|pharmacy|pills)/gi, // Pharmaceutical spam
    /\b[A-Z]{10,}\b/g // ALL CAPS WORDS
  ];

  static async analyzeMessage(messageData) {
    const analysis = {
      spamScoreRaw: 0, // new raw additive score
      spamScore: 0,    // normalized (0-1) – set at end
      riskLevel: 'low',
      flags: [],
      autoActions: []
    };

    const text = `${messageData.subject} ${messageData.message}`.toLowerCase();
    
    // 1. Keyword Analysis
    let keywordMatches = 0;
    this.spamKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        keywordMatches++;
        analysis.flags.push(`Contains spam keyword: ${keyword}`);
      }
    });
  analysis.spamScoreRaw += keywordMatches * 15;

    // 2. Pattern Matching
    this.suspiciousPatterns.forEach((pattern, index) => {
      const matches = text.match(pattern);
      if (matches) {
  analysis.spamScoreRaw += matches.length * 20;
        analysis.flags.push(`Suspicious pattern detected: ${matches[0]}`);
      }
    });

    // 3. Link Analysis
    const linkMatches = text.match(/https?:\/\/[^\s]+/g);
    if (linkMatches) {
      const linkCount = linkMatches.length;
  analysis.spamScoreRaw += linkCount * 25;
      analysis.flags.push(`Contains ${linkCount} links`);
      
      if (linkCount > 3) {
        analysis.flags.push('Excessive links detected');
        analysis.autoActions.push('quarantine');
      }
    }

    // 4. Frequency Analysis (same email/IP)
    const recentMessages = await ContactMessage.countDocuments({
      $or: [
        { email: messageData.email },
        { ipAddress: messageData.ipAddress }
      ],
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    if (recentMessages > 5) {
  analysis.spamScoreRaw += 40;
      analysis.flags.push(`${recentMessages} messages from same source in 24h`);
      analysis.autoActions.push('rate_limit');
    }

    // 5. Content Quality Analysis
    const wordCount = text.split(/\s+/).length;
    const uniqueWords = new Set(text.split(/\s+/)).size;
    const repetitionRatio = 1 - (uniqueWords / wordCount);
    
    if (repetitionRatio > 0.3) {
  analysis.spamScoreRaw += 30;
      analysis.flags.push('High content repetition detected');
    }

    // 6. ENHANCED: Gibberish and Meaningless Message Detection
    const gibberishAnalysis = this.detectGibberish(messageData.message || '');
  analysis.spamScoreRaw += gibberishAnalysis.score * 70; // Scale up the gibberish score
    analysis.flags.push(...gibberishAnalysis.reasons);

    // Special handling for very short nonsensical messages
    if (messageData.message && messageData.message.length < 50) {
      const meaningfulnessScore = this.assessMessageMeaningfulness(messageData.message);
      if (meaningfulnessScore < 0.3) {
  analysis.spamScoreRaw += 60;
        analysis.flags.push('Message appears to be meaningless gibberish');
        analysis.autoActions.push('auto_quarantine');
      }
    }

    // 7. Determine Risk Level
    // Normalize raw score for risk evaluation using logarithmic compression similar to model normalization
    const normalized = Math.min(1, Math.log10(1 + analysis.spamScoreRaw) / Math.log10(1001));
    analysis.spamScore = Number(normalized.toFixed(4));

    if (analysis.spamScoreRaw >= 80) {
      analysis.riskLevel = 'critical';
      analysis.autoActions.push('auto_block');
    } else if (analysis.spamScoreRaw >= 50) {
      analysis.riskLevel = 'high';
      analysis.autoActions.push('quarantine');
    } else if (analysis.spamScoreRaw >= 25) {
      analysis.riskLevel = 'medium';
      analysis.autoActions.push('flag_review');
    }

    return analysis;
  }

  static async performAutoActions(messageId, actions) {
    const message = await ContactMessage.findById(messageId);
    if (!message) return;

    for (const action of actions) {
      switch (action) {
        case 'auto_block':
          message.status = 'blocked';
          message.adminNotes.push({
            note: 'Automatically blocked due to high spam score',
            addedBy: null,
            type: 'auto_action'
          });
          break;
        case 'quarantine':
          message.status = 'quarantined';
          message.requiresReview = true;
          break;
        case 'flag_review':
          message.requiresReview = true;
          message.priority = 'low';
          break;
        case 'rate_limit':
          // Add to rate limiting database/cache
          await this.addToRateLimit(message.email, message.ipAddress);
          break;
      }
    }

    await message.save();
  }

  static async addToRateLimit(email, ipAddress) {
    // Implementation for rate limiting
    console.log(`Rate limiting applied to ${email} / ${ipAddress}`);
  }

  // ENHANCED: Advanced gibberish detection method
  static detectGibberish(text) {
    let gibberishScore = 0;
    const reasons = [];
    
    if (!text || text.trim().length === 0) {
      return { score: 0, reasons: [] };
    }

    const cleanText = text.replace(/[^a-zA-Z]/g, '').toLowerCase();
    
    // Check 1: Consonant to vowel ratio
    const vowels = cleanText.match(/[aeiou]/g) || [];
    const consonants = cleanText.match(/[bcdfghjklmnpqrstvwxyz]/g) || [];
    
    if (cleanText.length > 4) {
      const vowelRatio = vowels.length / cleanText.length;
      
      // Too few vowels = likely gibberish (like "dvsfbfdbfbfbfv")
      if (vowelRatio < 0.2) {
        gibberishScore += 0.8;
        reasons.push('Very low vowel ratio - likely gibberish');
      }
      
      // Too many vowels also suspicious
      if (vowelRatio > 0.7) {
        gibberishScore += 0.4;
        reasons.push('Excessive vowels detected');
      }
    }

    // Check 2: Repeated character sequences
    const repeatedChars = text.match(/(.)\1{2,}/g);
    if (repeatedChars && repeatedChars.length > 0) {
      gibberishScore += 0.3 * repeatedChars.length;
      reasons.push('Repeated character sequences detected');
    }

    // Check 3: Keyboard patterns and random mashing
    const keyboardPatterns = [
      'qwerty', 'asdf', 'zxcv', 'hjkl', 'uiop', 'qazwsx', 'wsxedc',
      'dvsfbf', 'fbfbfv', 'bfdbfb' // Pattern like in the example
    ];
    
    for (const pattern of keyboardPatterns) {
      if (cleanText.includes(pattern)) {
        gibberishScore += 0.7;
        reasons.push('Keyboard mashing pattern detected');
        break;
      }
    }

    // Check 4: Alternating character patterns (like dvsfbfdbfbfbfv)
    if (cleanText.length > 6) {
      let alternatingPattern = 0;
      for (let i = 0; i < cleanText.length - 3; i++) {
        const pattern = cleanText.substring(i, i + 4);
        if (pattern === pattern.split('').reverse().join('') || 
            pattern[0] === pattern[2] && pattern[1] === pattern[3]) {
          alternatingPattern++;
        }
      }
      
      if (alternatingPattern > cleanText.length * 0.3) {
        gibberishScore += 0.9;
        reasons.push('Alternating character pattern detected (typical gibberish)');
      }
    }

    // Check 5: Character frequency distribution
    if (cleanText.length >= 6) {
      const charFreq = {};
      for (const char of cleanText) {
        charFreq[char] = (charFreq[char] || 0) + 1;
      }
      
      // Check for too many repeating characters
      const maxFreq = Math.max(...Object.values(charFreq));
      if (maxFreq > cleanText.length * 0.4) {
        gibberishScore += 0.6;
        reasons.push('Character over-repetition detected');
      }
    }

    return {
      score: Math.min(gibberishScore, 1),
      reasons: reasons
    };
  }

  // ENHANCED: Assess meaningfulness of message content
  static assessMessageMeaningfulness(text) {
    if (!text || text.trim().length === 0) return 0;

    let meaningScore = 0;
    const normalizedText = text.toLowerCase().trim();

    // Common meaningful words/phrases
    const meaningfulWords = [
      'help', 'need', 'problem', 'issue', 'question', 'account', 'login',
      'password', 'support', 'please', 'thank', 'hello', 'hi', 'error',
      'cannot', 'unable', 'trouble', 'assistance', 'information', 'how',
      'what', 'when', 'where', 'why', 'can', 'could', 'would', 'should'
    ];

    // Check for meaningful words
    const words = normalizedText.split(/\s+/);
    const meaningfulWordCount = words.filter(word => 
      meaningfulWords.includes(word) || word.length >= 4
    ).length;

    meaningScore += (meaningfulWordCount / Math.max(words.length, 1)) * 0.6;

    // Check for sentence structure
    if (normalizedText.match(/[.!?]/)) meaningScore += 0.2;
    if (normalizedText.match(/^(hello|hi|dear|please)/)) meaningScore += 0.3;
    if (normalizedText.includes(' ')) meaningScore += 0.2; // Has spaces

    // Penalize pure gibberish patterns
    if (normalizedText.match(/^[a-z]{5,}$/)) meaningScore -= 0.7; // Single long nonsense word
    if (normalizedText.length < 20 && !normalizedText.includes(' ')) meaningScore -= 0.5;

    return Math.max(0, Math.min(1, meaningScore));
  }
}

export default AdvancedSpamDetectionService;
