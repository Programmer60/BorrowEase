// Auto-Response System for handling common queries
export class AutoResponseService {
  
  static responseTemplates = {
    account_help: {
      keywords: ['password', 'login', 'access', 'account locked', 'forgot password', 'can\'t login'],
      response: `Thank you for contacting us regarding your account. Here are some quick solutions:

📋 **Account Access Issues:**
• Try resetting your password using the "Forgot Password" link
• Clear your browser cache and cookies
• Ensure you're using the correct email address
• Check if your account is verified

If these steps don't help, our support team will assist you within 2-4 hours.

Best regards,
BorrowEase Support Team`,
      priority: 'medium',
      category: 'account'
    },

    general_info: {
      keywords: ['how it works', 'how to', 'getting started', 'new user', 'first time'],
      response: `Welcome to BorrowEase! Here's how to get started:

🎯 **For Borrowers:**
• Complete your profile and KYC verification
• Browse available lenders
• Submit loan requests with required details
• Wait for lender approval and funding

🎯 **For Lenders:**
• Set up your lending preferences
• Review borrower profiles and credit scores
• Fund approved loans
• Track repayments

📚 **Helpful Resources:**
• How It Works: Visit our "How it Works" page
• Support Center: Available 24/7
• Video Tutorials: Coming soon

Need specific help? Our team will respond within 4-6 hours.

Best regards,
BorrowEase Team`,
      priority: 'low',
      category: 'general'
    },

    technical_issues: {
      keywords: ['bug', 'error', 'not working', 'broken', 'crash', 'technical', 'website issue'],
      response: `Thank you for reporting this technical issue. We take these seriously!

🔧 **Quick Troubleshooting:**
• Refresh the page (Ctrl+F5 / Cmd+Shift+R)
• Try a different browser (Chrome, Firefox, Safari)
• Disable browser extensions temporarily
• Check your internet connection

📋 **What to include in your follow-up:**
• Browser type and version
• Operating system
• Screenshot of the error (if possible)
• Steps to reproduce the issue

Our technical team will investigate and respond within 1-2 hours.

Best regards,
BorrowEase Technical Support`,
      priority: 'high',
      category: 'technical'
    },

    payment_issues: {
      keywords: ['payment', 'money', 'transfer', 'transaction', 'razorpay', 'failed payment'],
      response: `We understand payment issues can be concerning. Let us help:

💳 **Payment Troubleshooting:**
• Check if your bank account has sufficient funds
• Verify your payment method details
• Try a different payment method
• Check for any SMS OTP requirements

🔒 **Security Note:**
All payments are processed securely through Razorpay. We never store your payment details.

⏰ **Processing Times:**
• UPI: Instant
• Net Banking: 2-5 minutes
• Debit/Credit Card: 2-5 minutes

Our finance team will review your specific case within 30 minutes for payment-related issues.

Best regards,
BorrowEase Finance Team`,
      priority: 'urgent',
      category: 'billing'
    },

    kyc_verification: {
      keywords: ['kyc', 'verification', 'documents', 'identity', 'aadhar', 'pan'],
      response: `Thank you for your KYC verification query:

📄 **Required Documents:**
• Government-issued Photo ID (Aadhar/Passport/License)
• PAN Card
• Address Proof (if different from ID)
• Recent photograph

⏱️ **Processing Time:**
• Document upload: Instant
• Verification review: 2-24 hours
• Approval notification: Via email & SMS

✅ **Tips for faster approval:**
• Ensure documents are clear and readable
• All details match your profile information
• Use recent, high-quality scans/photos

Our KYC team reviews submissions in order and will update you shortly.

Best regards,
BorrowEase Verification Team`,
      priority: 'medium',
      category: 'account'
    }
  };

  static async analyzeAndRespond(messageData) {
    const text = `${messageData.subject} ${messageData.message}`.toLowerCase();
    
    // Find matching template
    for (const [templateKey, template] of Object.entries(this.responseTemplates)) {
      const matchCount = template.keywords.filter(keyword => 
        text.includes(keyword.toLowerCase())
      ).length;

      // If 2 or more keywords match, auto-respond
      if (matchCount >= 2) {
        return {
          shouldAutoRespond: true,
          response: template.response,
          suggestedPriority: template.priority,
          suggestedCategory: template.category,
          matchedTemplate: templateKey,
          confidence: (matchCount / template.keywords.length) * 100
        };
      }
    }

    return { shouldAutoRespond: false };
  }

  static async sendAutoResponse(messageId, responseData) {
    const message = await ContactMessage.findById(messageId);
    if (!message) return;

    // Add auto-response to message
    if (!message.responses) {
      message.responses = { messages: [], responseCount: 0 };
    }

    message.responses.messages.push({
      message: responseData.response,
      respondedBy: null, // System response
      respondedAt: new Date(),
      isPublic: true,
      isAutoResponse: true,
      templateUsed: responseData.matchedTemplate
    });

    message.responses.lastResponseAt = new Date();
    message.responses.responseCount = message.responses.messages.length;
    message.status = 'responded';
    message.priority = responseData.suggestedPriority;
    message.category = responseData.suggestedCategory;
    
    message.adminNotes.push({
      note: `Auto-response sent using template: ${responseData.matchedTemplate} (${responseData.confidence}% confidence)`,
      addedBy: null,
      type: 'auto_response'
    });

    await message.save();
    return true;
  }
}
