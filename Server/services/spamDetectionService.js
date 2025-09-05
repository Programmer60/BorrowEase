import ContactMessage from '../models/contactModel.js';
import Blacklist from '../models/blacklistModel.js';
import rateLimit from 'express-rate-limit';

// Redis client setup (optional for production)
let redisClient = null;

// Initialize Redis connection if available
async function initializeRedis() {
  try {
    const { createClient } = await import('redis');
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    // Suppress Redis connection errors
    redisClient.on('error', () => {
      // Silently fail - use memory store instead
      redisClient = null;
    });
    
    await redisClient.connect();
    console.log('✅ Redis connected for rate limiting');
    return true;
  } catch (error) {
    console.log('ℹ️ Redis not available, using memory store for rate limiting');
    redisClient = null;
    return false;
  }
}

// Initialize Redis (non-blocking) - suppress errors
initializeRedis().catch(() => {
  redisClient = null;
});

// Rate limiting configuration
export const contactRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many contact messages sent. Please wait before sending another message.',
    retryAfter: 15 * 60 // 15 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use default keyGenerator to avoid IPv6 issues
  // keyGenerator defaults to req.ip which handles IPv6 properly
  skip: (req, res) => {
    // Skip rate limiting for admins (optional)
    return req.user && req.user.role === 'admin';
  }
  // Note: Redis store can be added later for production scaling
});

// Advanced spam detection service
export class SpamDetectionService {
  static async checkSpamScore(message, userInfo) {
    let spamScore = 0;
    const reasons = [];

    // Content analysis
    const contentAnalysis = await this.analyzeContent(message.message);
    spamScore += contentAnalysis.score;
    reasons.push(...contentAnalysis.reasons);

    // User behavior analysis
    const behaviorAnalysis = await this.analyzeBehavior(userInfo);
    spamScore += behaviorAnalysis.score;
    reasons.push(...behaviorAnalysis.reasons);

    // Blacklist check
    const blacklistAnalysis = await this.checkBlacklists(message, userInfo);
    spamScore += blacklistAnalysis.score;
    reasons.push(...blacklistAnalysis.reasons);

    // Rate pattern analysis
    const rateAnalysis = await this.analyzeRatePattern(userInfo);
    spamScore += rateAnalysis.score;
    reasons.push(...rateAnalysis.reasons);

    return {
      score: Math.min(spamScore, 100),
      reasons,
      riskLevel: this.getRiskLevel(spamScore),
      recommendation: this.getRecommendation(spamScore)
    };
  }

  static async analyzeContent(content) {
    let score = 0;
    const reasons = [];

    // Profanity and offensive content
    const profanityPatterns = [
      /\b(spam|scam|fraud|fake|bot)\b/gi,
      /\b(urgent|immediate|limited time|act now)\b/gi,
      /\b(free money|guaranteed|100%|winner)\b/gi,
      /\$\d+|\bUSD\b|\bmoney\b.*\bfast\b/gi
    ];

    profanityPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        score += matches.length * 10;
        reasons.push(`Suspicious keywords detected: ${matches.join(', ')}`);
      }
    });

    // Repetitive content
    const words = content.toLowerCase().split(/\s+/);
    const wordCount = {};
    words.forEach(word => {
      if (word.length > 3) {
        wordCount[word] = (wordCount[word] || 0) + 1;
      }
    });

    const repetitiveWords = Object.entries(wordCount)
      .filter(([word, count]) => count > 3)
      .map(([word]) => word);

    if (repetitiveWords.length > 0) {
      score += repetitiveWords.length * 15;
      reasons.push(`Repetitive content detected: ${repetitiveWords.join(', ')}`);
    }

    // Excessive caps
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capsRatio > 0.3) {
      score += 20;
      reasons.push('Excessive use of capital letters');
    }

    // URL patterns (potential phishing)
    const urlPattern = /(https?:\/\/[^\s]+)/gi;
    const urls = content.match(urlPattern);
    if (urls) {
      score += urls.length * 25;
      reasons.push(`Contains URLs: ${urls.join(', ')}`);
    }

    // Phone number patterns
    const phonePattern = /(\+?\d{1,4}[-.\s]?)?\(?\d{1,3}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g;
    const phones = content.match(phonePattern);
    if (phones) {
      score += phones.length * 15;
      reasons.push('Contains phone numbers');
    }

    return { score, reasons };
  }

  static async analyzeBehavior(userInfo) {
    let score = 0;
    const reasons = [];

    try {
      // Check user's message history
      const recentMessages = await ContactMessage.find({
        'user.uid': userInfo.uid,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      }).sort({ createdAt: -1 }).limit(10);

      // Too many messages in short time
      if (recentMessages.length > 5) {
        score += (recentMessages.length - 5) * 10;
        reasons.push(`Sent ${recentMessages.length} messages in last 24 hours`);
      }

      // Similar content patterns
      if (recentMessages.length > 1) {
        const contents = recentMessages.map(msg => msg.message.toLowerCase());
        let similarCount = 0;
        
        for (let i = 0; i < contents.length - 1; i++) {
          for (let j = i + 1; j < contents.length; j++) {
            const similarity = this.calculateSimilarity(contents[i], contents[j]);
            if (similarity > 0.8) {
              similarCount++;
            }
          }
        }

        if (similarCount > 0) {
          score += similarCount * 20;
          reasons.push('Similar message content detected');
        }
      }

      // New user sending messages immediately
      const userAge = userInfo.metadata?.creationTime 
        ? Date.now() - new Date(userInfo.metadata.creationTime).getTime()
        : 0;
      
      if (userAge < 60 * 60 * 1000) { // Less than 1 hour old
        score += 30;
        reasons.push('New user account');
      }

    } catch (error) {
      console.error('Error analyzing user behavior:', error);
    }

    return { score, reasons };
  }

  static async checkBlacklists(message, userInfo) {
    let score = 0;
    const reasons = [];

    try {
      // Check IP blacklist
      const ipCheck = await Blacklist.checkValue('ip', userInfo.ip);
      if (ipCheck) {
        score += 100;
        reasons.push(`IP address is blacklisted: ${ipCheck.reason}`);
        await ipCheck.hit();
      }

      // Check email blacklist
      if (userInfo.email) {
        const emailChecks = await Blacklist.checkEmail(userInfo.email);
        if (emailChecks.length > 0) {
          score += 100;
          reasons.push(`Email/domain is blacklisted: ${emailChecks[0].reason}`);
          await Promise.all(emailChecks.map(check => check.hit()));
        }
      }

      // Check content keywords
      const keywordChecks = await Blacklist.checkContent(message.message);
      if (keywordChecks.length > 0) {
        score += keywordChecks.length * 30;
        reasons.push(`Blacklisted keywords detected: ${keywordChecks.map(k => k.value).join(', ')}`);
        await Promise.all(keywordChecks.map(check => check.hit()));
      }

      // Check device fingerprint if available
      if (userInfo.fingerprint) {
        const fingerprintCheck = await Blacklist.checkValue('fingerprint', userInfo.fingerprint);
        if (fingerprintCheck) {
          score += 80;
          reasons.push('Device fingerprint is blacklisted');
          await fingerprintCheck.hit();
        }
      }

    } catch (error) {
      console.error('Error checking blacklists:', error);
    }

    return { score, reasons };
  }

  static async analyzeRatePattern(userInfo) {
    let score = 0;
    const reasons = [];

    try {
      // Check recent submission pattern
      const recentMessages = await ContactMessage.find({
        'user.uid': userInfo.uid,
        createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
      }).sort({ createdAt: -1 });

      if (recentMessages.length > 0) {
        const intervals = [];
        for (let i = 0; i < recentMessages.length - 1; i++) {
          const interval = recentMessages[i].createdAt - recentMessages[i + 1].createdAt;
          intervals.push(interval);
        }

        // Very consistent intervals (bot-like behavior)
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((acc, interval) => {
          return acc + Math.pow(interval - avgInterval, 2);
        }, 0) / intervals.length;

        const stdDev = Math.sqrt(variance);
        const coefficient = stdDev / avgInterval;

        if (coefficient < 0.1 && intervals.length > 2) { // Very consistent timing
          score += 40;
          reasons.push('Bot-like submission pattern detected');
        }

        // Too frequent submissions
        const recentSubmissions = recentMessages.filter(msg => 
          Date.now() - msg.createdAt.getTime() < 5 * 60 * 1000 // Last 5 minutes
        );

        if (recentSubmissions.length > 2) {
          score += 30;
          reasons.push('Too frequent submissions');
        }
      }

    } catch (error) {
      console.error('Error analyzing rate pattern:', error);
    }

    return { score, reasons };
  }

  static calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  static levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  static getRiskLevel(score) {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    if (score >= 20) return 'low';
    return 'minimal';
  }

  static getRecommendation(score) {
    if (score >= 80) return 'block';
    if (score >= 60) return 'quarantine';
    if (score >= 40) return 'review';
    if (score >= 20) return 'monitor';
    return 'allow';
  }
}

// Content moderation service
export class ContentModerationService {
  static async moderateContent(content) {
    const analysis = {
      isAppropriate: true,
      issues: [],
      sentiment: 'neutral',
      confidence: 0,
      suggestions: []
    };

    // Profanity detection
    const profanityCheck = this.checkProfanity(content);
    if (!profanityCheck.isClean) {
      analysis.isAppropriate = false;
      analysis.issues.push('Contains inappropriate language');
      analysis.suggestions.push('Please use professional language');
    }

    // Sentiment analysis (basic)
    const sentimentCheck = this.analyzeSentiment(content);
    analysis.sentiment = sentimentCheck.sentiment;
    analysis.confidence = sentimentCheck.confidence;

    if (sentimentCheck.sentiment === 'very_negative' && sentimentCheck.confidence > 0.8) {
      analysis.issues.push('Extremely negative sentiment detected');
      analysis.suggestions.push('Consider rephrasing your message more constructively');
    }

    // Threat detection
    const threatCheck = this.checkThreats(content);
    if (threatCheck.hasThreats) {
      analysis.isAppropriate = false;
      analysis.issues.push('Potential threats detected');
      analysis.suggestions.push('Please ensure your message is respectful and non-threatening');
    }

    return analysis;
  }

  static checkProfanity(content) {
    // Basic profanity patterns (can be expanded with more sophisticated detection)
    const profanityPatterns = [
      /\b(damn|hell|crap)\b/gi, // Mild
      // Add more patterns as needed, but be careful with false positives
    ];

    const issues = [];
    profanityPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        issues.push(...matches);
      }
    });

    return {
      isClean: issues.length === 0,
      issues
    };
  }

  static analyzeSentiment(content) {
    // Basic sentiment analysis
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'happy', 'pleased'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'angry', 'frustrated', 'disappointed', 'worst', 'useless'];
    const veryNegativeWords = ['kill', 'die', 'destroy', 'revenge', 'threat', 'harm', 'violence'];

    const words = content.toLowerCase().split(/\s+/);
    
    let positiveScore = 0;
    let negativeScore = 0;
    let veryNegativeScore = 0;

    words.forEach(word => {
      if (positiveWords.includes(word)) positiveScore++;
      if (negativeWords.includes(word)) negativeScore++;
      if (veryNegativeWords.includes(word)) veryNegativeScore += 3;
    });

    const totalScore = positiveScore - negativeScore - veryNegativeScore;
    const confidence = Math.min((Math.abs(totalScore) / words.length) * 10, 1);

    let sentiment = 'neutral';
    if (veryNegativeScore > 0) {
      sentiment = 'very_negative';
    } else if (totalScore > 2) {
      sentiment = 'positive';
    } else if (totalScore < -2) {
      sentiment = 'negative';
    }

    return { sentiment, confidence };
  }

  static checkThreats(content) {
    const threatPatterns = [
      /\b(kill|murder|harm|hurt|attack|destroy|revenge)\b/gi,
      /\b(threat|threaten|violence|violent)\b/gi,
      /\b(bomb|weapon|gun|knife)\b/gi
    ];

    const threats = [];
    threatPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        threats.push(...matches);
      }
    });

    return {
      hasThreats: threats.length > 0,
      threats
    };
  }
}

// Device fingerprinting service
export class DeviceFingerprintingService {
  static generateFingerprint(req) {
    const components = [
      req.headers['user-agent'] || '',
      req.headers['accept-language'] || '',
      req.headers['accept-encoding'] || '',
      req.ip || '',
      req.headers['x-forwarded-for'] || ''
    ];

    // Simple hash function (in production, use a more robust one)
    return this.simpleHash(components.join('|'));
  }

  static simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  static async checkFingerprint(fingerprint) {
    try {
      // Check if fingerprint is in blacklist
      const blacklisted = await Blacklist.checkValue('fingerprint', fingerprint);
      if (blacklisted) {
        return {
          isBlacklisted: true,
          reason: blacklisted.reason,
          severity: blacklisted.severity
        };
      }

      // Check recent activity for this fingerprint
      const recentActivity = await ContactMessage.find({
        'security.deviceFingerprint': fingerprint,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }).countDocuments();

      return {
        isBlacklisted: false,
        recentActivity,
        riskLevel: recentActivity > 10 ? 'high' : recentActivity > 5 ? 'medium' : 'low'
      };

    } catch (error) {
      console.error('Error checking fingerprint:', error);
      return { isBlacklisted: false, riskLevel: 'unknown' };
    }
  }
}
