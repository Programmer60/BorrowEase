// Industrial-level Priority Intelligence Service
import ContactMessage from '../models/contactModel.js';

export class PriorityIntelligenceService {
  
  static async calculateIntelligentPriority(messageData) {
    const analysis = {
      basePriority: 'low',
      finalPriority: 'low',
      priorityScore: 0,
      factors: [],
      recommendations: []
    };

    try {
      // 1. USER VERIFICATION STATUS (Highest Weight)
      const userVerification = await this.analyzeUserCredibility(messageData.email);
      analysis.priorityScore += userVerification.score;
      analysis.factors.push(...userVerification.factors);

      // 1b. MESSAGE-LEVEL EMAIL OWNERSHIP (guest verification MVP)
      if (messageData.emailVerified === true) {
        analysis.priorityScore += 12; // noticeable bump
        analysis.factors.push('✅ Contact email ownership verified (code)');
      } else if (messageData.emailVerified === false) {
        analysis.priorityScore -= 18; // stronger penalty than unknown user alone
        analysis.factors.push('⚠️ Email ownership unverified (awaiting code)');
      }

      // 2. KYC COMPLETION STATUS (Critical for Financial Services)
      const kycStatus = await this.checkKYCStatus(messageData.email);
      analysis.priorityScore += kycStatus.score;
      analysis.factors.push(...kycStatus.factors);

      // 3. LOAN/TRANSACTION HISTORY (Business Context)
      const businessHistory = await this.analyzeLoanHistory(messageData.email);
      analysis.priorityScore += businessHistory.score;
      analysis.factors.push(...businessHistory.factors);

      // 4. MESSAGE LEGITIMACY & URGENCY
      const messageLegitimacy = this.analyzeMessageContent(messageData);
      analysis.priorityScore += messageLegitimacy.score;
      analysis.factors.push(...messageLegitimacy.factors);

      // 5. ACCOUNT STATUS & ENGAGEMENT
      const accountEngagement = await this.analyzeAccountEngagement(messageData.email);
      analysis.priorityScore += accountEngagement.score;
      analysis.factors.push(...accountEngagement.factors);

      // 6. HISTORICAL SUPPORT QUALITY
      const supportHistory = await this.analyzeSupportHistory(messageData.email);
      analysis.priorityScore += supportHistory.score;
      analysis.factors.push(...supportHistory.factors);

      // Calculate Final Priority
      analysis.finalPriority = this.determineFinalPriority(analysis.priorityScore);
      analysis.recommendations = this.generateRecommendations(analysis);

      console.log(`🎯 Priority Analysis for ${messageData.email}: Score ${analysis.priorityScore} → ${analysis.finalPriority.toUpperCase()}`);
      return analysis;

    } catch (error) {
      console.error('Error in priority calculation:', error);
      return {
        ...analysis,
        finalPriority: 'medium', // Safe fallback
        factors: ['Error in priority calculation - defaulting to medium'],
        recommendations: ['Manual review recommended due to analysis error']
      };
    }
  }

  // 1. USER CREDIBILITY ANALYSIS
  static async analyzeUserCredibility(email) {
    const analysis = { score: 0, factors: [] };

    try {
      // Import User model dynamically to avoid circular dependencies
      const User = (await import('../models/userModel.js')).default;
      const user = await User.findOne({ email: email.toLowerCase() });

      if (!user) {
        analysis.score = -20; // New/unknown user penalty
        analysis.factors.push('❌ Unknown user - not registered in system');
        return analysis;
      }

      // Account age bonus
      const accountAge = (new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24); // days
      if (accountAge > 180) {
        analysis.score += 15;
        analysis.factors.push('✅ Long-term user (6+ months)');
      } else if (accountAge > 30) {
        analysis.score += 10;
        analysis.factors.push('✅ Established user (1+ month)');
      } else {
        analysis.score += 2;
        analysis.factors.push('⚡ New user (< 1 month)');
      }

      // Email verification status
      if (user.emailVerified) {
        analysis.score += 10;
        analysis.factors.push('✅ Email verified');
      } else {
        analysis.score -= 5;
        analysis.factors.push('⚠️ Email not verified');
      }

      // Phone verification status
      if (user.phoneVerified) {
        analysis.score += 8;
        analysis.factors.push('✅ Phone verified');
      }

      // Account status
      if (user.status === 'active') {
        analysis.score += 5;
        analysis.factors.push('✅ Active account status');
      } else if (user.status === 'suspended') {
        analysis.score -= 15;
        analysis.factors.push('❌ Suspended account');
      }

    } catch (error) {
      console.error('Error analyzing user credibility:', error);
      analysis.factors.push('⚠️ Could not verify user status');
    }

    return analysis;
  }

  // 2. KYC STATUS CHECK
  static async checkKYCStatus(email) {
    const analysis = { score: 0, factors: [] };

    try {
      // Import KYC model dynamically
      const KYC = (await import('../models/kycModel.js')).default;
      const kyc = await KYC.findOne({ email: email.toLowerCase() });

      if (!kyc) {
        analysis.score = -10;
        analysis.factors.push('❌ No KYC record found');
        return analysis;
      }

      switch (kyc.status) {
        case 'approved':
          analysis.score += 25; // Highest priority for KYC-approved users
          analysis.factors.push('⭐ KYC APPROVED - Verified customer');
          
          // Additional bonus for complete KYC
          if (kyc.documentsSubmitted && kyc.documentsSubmitted.length >= 2) {
            analysis.score += 10;
            analysis.factors.push('📄 Complete KYC documentation');
          }
          break;

        case 'pending':
          analysis.score += 15;
          analysis.factors.push('⏳ KYC under review - Engaged user');
          break;

        case 'in_review':
          analysis.score += 12;
          analysis.factors.push('🔍 KYC in review process');
          break;

        case 'rejected':
          analysis.score -= 5;
          analysis.factors.push('❌ KYC previously rejected');
          break;

        default:
          analysis.score += 2;
          analysis.factors.push('📋 KYC record exists');
      }

      // KYC submission date bonus
      const kycAge = (new Date() - new Date(kyc.createdAt)) / (1000 * 60 * 60 * 24);
      if (kycAge > 30) {
        analysis.score += 5;
        analysis.factors.push('✅ Established KYC history');
      }

    } catch (error) {
      console.error('Error checking KYC status:', error);
      analysis.factors.push('⚠️ Could not verify KYC status');
    }

    return analysis;
  }

  // 3. LOAN/BUSINESS HISTORY ANALYSIS
  static async analyzeLoanHistory(email) {
    const analysis = { score: 0, factors: [] };

    try {
      // Import Loan model dynamically
      const Loan = (await import('../models/loanModel.js')).default;
      const loans = await Loan.find({ email: email.toLowerCase() });

      if (!loans || loans.length === 0) {
        analysis.score = -5;
        analysis.factors.push('💰 No loan history - potential new customer');
        return analysis;
      }

      // Active loans = higher priority (existing business)
      const activeLoans = loans.filter(loan => 
        loan.status === 'active' || loan.status === 'approved'
      );
      
      if (activeLoans.length > 0) {
        analysis.score += 30; // Very high priority for active borrowers
        analysis.factors.push(`🏦 ${activeLoans.length} active loan(s) - Priority customer`);
      }

      // Loan repayment history
      const completedLoans = loans.filter(loan => loan.status === 'completed');
      if (completedLoans.length > 0) {
        analysis.score += 20;
        analysis.factors.push(`✅ ${completedLoans.length} completed loan(s) - Reliable customer`);
      }

      // Recent loan applications
      const recentApplications = loans.filter(loan => {
        const daysSinceApplication = (new Date() - new Date(loan.createdAt)) / (1000 * 60 * 60 * 24);
        return daysSinceApplication <= 30;
      });

      if (recentApplications.length > 0) {
        analysis.score += 15;
        analysis.factors.push('🆕 Recent loan activity - Hot prospect');
      }

      // Default history check
      const defaultedLoans = loans.filter(loan => 
        loan.status === 'defaulted' || loan.status === 'overdue'
      );
      
      if (defaultedLoans.length > 0) {
        analysis.score -= 10;
        analysis.factors.push(`⚠️ ${defaultedLoans.length} defaulted/overdue loan(s)`);
      }

    } catch (error) {
      console.error('Error analyzing loan history:', error);
      analysis.factors.push('⚠️ Could not verify loan history');
    }

    return analysis;
  }

  // 4. MESSAGE CONTENT LEGITIMACY
  static analyzeMessageContent(messageData) {
    const analysis = { score: 0, factors: [] };

    const message = (messageData.message || '').toLowerCase();
    const subject = (messageData.subject || '').toLowerCase();
    const fullText = `${subject} ${message}`.toLowerCase();

    // High-priority keywords (business/account issues)
    const urgentKeywords = [
      'payment', 'loan', 'default', 'overdue', 'account', 'blocked', 
      'suspended', 'urgent', 'immediate', 'help', 'error', 'cannot',
      'unable', 'problem', 'issue', 'kyc', 'verification', 'document',
      'approve', 'denied', 'rejected', 'application', 'status'
    ];

    const urgentMatches = urgentKeywords.filter(keyword => fullText.includes(keyword));
    if (urgentMatches.length > 0) {
      analysis.score += urgentMatches.length * 5;
      analysis.factors.push(`🎯 Contains ${urgentMatches.length} priority keyword(s): ${urgentMatches.slice(0, 3).join(', ')}`);
    }

    // Business category priority
    const categoryPriority = {
      'account': 15,
      'technical': 12,
      'billing': 10,
      'security': 20,
      'loan': 25,
      'kyc': 20,
      'payment': 18,
      'general': 2,
      'feedback': 1
    };

    if (messageData.category && categoryPriority[messageData.category]) {
      analysis.score += categoryPriority[messageData.category];
      analysis.factors.push(`📂 ${messageData.category.toUpperCase()} category (+${categoryPriority[messageData.category]} points)`);
    }

    // Message quality assessment
    const wordCount = message.split(/\s+/).length;
    if (wordCount >= 10 && wordCount <= 200) {
      analysis.score += 8;
      analysis.factors.push('✍️ Well-structured message length');
    } else if (wordCount < 5) {
      analysis.score -= 3;
      analysis.factors.push('📝 Very short message');
    } else if (wordCount > 300) {
      analysis.score -= 2;
      analysis.factors.push('📄 Very long message');
    }

    // Politeness indicators
    const politeWords = ['please', 'thank', 'kindly', 'appreciate', 'help', 'assist'];
    const politeMatches = politeWords.filter(word => fullText.includes(word));
    if (politeMatches.length > 0) {
      analysis.score += 5;
      analysis.factors.push('🤝 Polite communication');
    }

    return analysis;
  }

  // 5. ACCOUNT ENGAGEMENT ANALYSIS
  static async analyzeAccountEngagement(email) {
    const analysis = { score: 0, factors: [] };

    try {
      // Previous contact history
      const previousMessages = await ContactMessage.find({ 
        email: email.toLowerCase() 
      }).limit(10).sort({ createdAt: -1 });

      if (previousMessages.length > 0) {
        analysis.score += Math.min(previousMessages.length * 3, 15);
        analysis.factors.push(`📞 ${previousMessages.length} previous contact(s)`);

        // Check resolution rate
        const resolvedMessages = previousMessages.filter(msg => msg.status === 'resolved');
        const resolutionRate = resolvedMessages.length / previousMessages.length;
        
        if (resolutionRate > 0.8) {
          analysis.score += 10;
          analysis.factors.push('✅ High resolution rate - cooperative user');
        } else if (resolutionRate < 0.3) {
          analysis.score -= 5;
          analysis.factors.push('⚠️ Low resolution rate');
        }
      }

      // Recent activity check
      const recentMessages = previousMessages.filter(msg => {
        const daysSinceMessage = (new Date() - new Date(msg.createdAt)) / (1000 * 60 * 60 * 24);
        return daysSinceMessage <= 7;
      });

      if (recentMessages.length > 3) {
        analysis.score -= 5; // Potential spam/excessive messaging
        analysis.factors.push('⚠️ High recent message frequency');
      } else if (recentMessages.length === 1) {
        analysis.score += 5;
        analysis.factors.push('✅ Appropriate contact frequency');
      }

    } catch (error) {
      console.error('Error analyzing account engagement:', error);
      analysis.factors.push('⚠️ Could not analyze engagement history');
    }

    return analysis;
  }

  // 6. SUPPORT HISTORY QUALITY
  static async analyzeSupportHistory(email) {
    const analysis = { score: 0, factors: [] };

    try {
      const supportHistory = await ContactMessage.find({ 
        email: email.toLowerCase(),
        status: { $in: ['resolved', 'closed'] }
      }).limit(5).sort({ createdAt: -1 });

      if (supportHistory.length > 0) {
        // Bonus for users who had successful support interactions
        analysis.score += supportHistory.length * 2;
        analysis.factors.push(`🛠️ ${supportHistory.length} resolved support case(s)`);

        // Check for positive admin feedback
        const positiveInteractions = supportHistory.filter(msg => 
          msg.adminNotes && msg.adminNotes.some(note => 
            note.note.toLowerCase().includes('cooperative') || 
            note.note.toLowerCase().includes('helpful') ||
            note.note.toLowerCase().includes('resolved')
          )
        );

        if (positiveInteractions.length > 0) {
          analysis.score += 8;
          analysis.factors.push('⭐ Positive admin feedback history');
        }
      }

    } catch (error) {
      console.error('Error analyzing support history:', error);
      analysis.factors.push('⚠️ Could not analyze support history');
    }

    return analysis;
  }

  // FINAL PRIORITY DETERMINATION
  static determineFinalPriority(score) {
    if (score >= 80) return 'critical';   // VIP customers, active loans, KYC approved
    if (score >= 50) return 'high';       // Existing customers, pending KYC
    if (score >= 20) return 'medium';     // Verified users, some history
    if (score >= 0) return 'low';         // New users, basic verification
    return 'very_low';                    // Unverified, potential spam
  }

  // GENERATE ADMIN RECOMMENDATIONS
  static generateRecommendations(analysis) {
    const recommendations = [];

    if (analysis.finalPriority === 'critical') {
      recommendations.push('🚨 PRIORITY: Handle immediately - High-value customer');
      recommendations.push('📞 Consider phone follow-up if complex issue');
    }

    if (analysis.finalPriority === 'high') {
      recommendations.push('⚡ Fast-track: Respond within 2 hours');
      recommendations.push('👤 Assign to senior support agent');
    }

    if (analysis.factors.some(f => f.includes('KYC APPROVED'))) {
      recommendations.push('✅ Verified customer - Full access to sensitive information');
    }

    if (analysis.factors.some(f => f.includes('active loan'))) {
      recommendations.push('💰 Active borrower - Financial priority customer');
    }

    if (analysis.priorityScore < 0) {
      recommendations.push('⚠️ Low credibility - Verify user before detailed response');
    }

    return recommendations;
  }

  // BATCH PRIORITY UPDATE (for existing messages)
  static async updateExistingMessagePriorities() {
    console.log('🔄 Starting batch priority update for existing messages...');
    
    const messages = await ContactMessage.find({ 
      priority: { $in: ['low', 'medium', 'high', 'very_low'] }, // Update all non-critical priorities
      status: { $ne: 'blocked' }
    }).limit(1000); // Process more messages

    let updated = 0;
    const priorityCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      very_low: 0
    };

    for (const message of messages) {
      try {
        const priorityAnalysis = await this.calculateIntelligentPriority(message);
        
        if (priorityAnalysis.finalPriority !== message.priority) {
          await ContactMessage.updateOne(
            { _id: message._id },
            { 
              priority: priorityAnalysis.finalPriority,
              priorityScore: priorityAnalysis.priorityScore,
              priorityFactors: priorityAnalysis.factors,
              priorityRecommendations: priorityAnalysis.recommendations,
              customerTier: priorityAnalysis.customerTier,
              userVerificationLevel: priorityAnalysis.verificationLevel
            }
          );
          updated++;
          priorityCounts[priorityAnalysis.finalPriority]++;
        }
      } catch (error) {
        console.error(`Error updating priority for message ${message._id}:`, error);
      }
    }

    console.log(`✅ Updated priority for ${updated} messages`);
    console.log(`📊 Priority distribution: Critical: ${priorityCounts.critical}, High: ${priorityCounts.high}, Medium: ${priorityCounts.medium}, Low: ${priorityCounts.low}, Very Low: ${priorityCounts.very_low}`);
    
    return {
      updated,
      priorityCounts
    };
  }
}

export default PriorityIntelligenceService;
