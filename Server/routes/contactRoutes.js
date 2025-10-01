import express from 'express';
import jwt from 'jsonwebtoken';
import { verifyToken } from '../middlewares/authMiddleware.js';
import ContactMessage, { FaqAutoResolveLog } from '../models/contactModel.js';
import AdvancedSpamDetectionService from '../services/advancedSpamDetection.js';
import { AutoResponseService } from '../services/autoResponseService.js';
import PriorityIntelligenceService from '../services/PriorityIntelligenceService.js';
import { isSuppressed, generateMisdirectedLink, verifyAndSuppressMisdirected } from '../services/suppressionService.js';
import { checkSubmitLimits } from '../services/rateLimitService.js';
import { analyzeContentQuality } from '../services/contentQualityService.js';

const router = express.Router();

// Submit contact message - ENHANCED WITH AUTO-PROCESSING
router.post('/submit', async (req, res) => {
  try {
    console.log('📧 Contact form submission received:', req.body);
    
    const { name, email, subject, message, category = 'general' } = req.body;
    
    // Basic validation
    if (!name || !email || !subject || !message) {
      console.log('❌ Validation failed - missing fields');
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }
    
    // Rate limiting (before suppression to reduce DB work if flood)
    const fingerprint = req.headers['x-client-fingerprint'];
    const rl = await checkSubmitLimits({ ip: req.ip || req.connection.remoteAddress, email, fingerprint });
    if (!rl.allowed) {
      return res.status(429).json({ success:false, error:'Rate limit exceeded', reason: rl.reason, action: rl.action, retryAfterSeconds: rl.retryAfterSeconds });
    }

    // Suppression check (early exit)
    if (await isSuppressed(email)) {
      return res.status(403).json({ success:false, error:'This email is suppressed and cannot receive or create new messages.' });
    }

    // Prepare message data
    const messageData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      subject: subject.trim(),
      message: message.trim(),
      category,
      status: 'pending',
      priority: 'medium',
      ipAddress: req.ip || req.connection.remoteAddress || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Unknown',
      createdAt: new Date()
    };

    // 🚨 SPAM DETECTION & AUTO-PROCESSING
    console.log('🔍 Running spam detection analysis...');
    const spamAnalysis = await AdvancedSpamDetectionService.analyzeMessage(messageData);
    
  // 🎯 INTELLIGENT PRIORITY CALCULATION
    console.log('🎯 Calculating intelligent priority based on user profile...');
    const priorityAnalysis = await PriorityIntelligenceService.calculateIntelligentPriority(messageData);
    
    // Update message data with all analysis results
  messageData.spamScoreRaw = spamAnalysis.spamScoreRaw;
  messageData.spamScore = spamAnalysis.spamScore; // normalized 0-1
  messageData.spamScoreNormalized = spamAnalysis.spamScore;
    messageData.spamFlags = spamAnalysis.flags;
    messageData.riskLevel = spamAnalysis.riskLevel;
    messageData.requiresReview = spamAnalysis.riskLevel !== 'low';
    
    // PRIORITY INTELLIGENCE INTEGRATION
    messageData.priority = priorityAnalysis.finalPriority;
    messageData.priorityScore = priorityAnalysis.priorityScore;
    messageData.priorityFactors = priorityAnalysis.factors;
    messageData.priorityRecommendations = priorityAnalysis.recommendations;
    
    // 🧪 CONTENT QUALITY ANALYSIS
    console.log('🧪 Assessing content quality...');
    const quality = analyzeContentQuality({ subject: messageData.subject, message: messageData.message });
    messageData.contentQuality = quality;
    if (quality.label === 'gibberish') {
      messageData.requiresReview = true; // force review
      // Optionally downgrade priority if currently high
      if (['high','critical'].includes(messageData.priority)) {
        messageData.priority = 'low';
        messageData.priorityFactors = [...(messageData.priorityFactors||[]), 'downgraded_due_to_gibberish'];
      }
    }

    console.log(`📊 Analysis Complete: Spam=${spamAnalysis.spamScore}, Priority=${priorityAnalysis.finalPriority.toUpperCase()} (${priorityAnalysis.priorityScore}), Quality=${quality.label} (${quality.score})`);
    console.log(`🎯 Priority Factors: ${priorityAnalysis.factors.slice(0, 3).join(', ')}`);

    // 🤖 AUTO-RESPONSE ANALYSIS
    console.log('🤖 Analyzing for auto-response...');
    const autoResponse = await AutoResponseService.analyzeAndRespond(messageData);
    
    // Create and save message
    const contactMessage = new ContactMessage(messageData);
    // If user not authenticated (no req.user) treat as guest -> require email verification step
    if (!req.user) {
      // Create a verification code (6 digits) and store hash
      const rawCode = Math.floor(100000 + Math.random() * 900000).toString();
      const crypto = await import('crypto');
      const hash = crypto.createHash('sha256').update(rawCode).digest('hex');
      contactMessage.emailVerified = false;
      contactMessage.emailVerification = {
        codeHash: hash,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min
        attempts: 0,
        lastSentAt: new Date()
      };
      // (Send verification email asynchronously after save using quick fire-and-forget pattern)
      // We'll reuse existing queue pipeline by creating a temporary EmailJob-like direct send.
      // Simplicity: send immediately via emailService (no need to verify enabling worker yet).
      const { sendEmail } = await import('../../Server/services/emailService.js');
      // Save first to get _id
      await contactMessage.save();
      sendEmail({
        to: contactMessage.email,
        subject: 'Verify your email for BorrowEase Support',
        body: `Your verification code is: ${rawCode}\n\nIt expires in 15 minutes. If you did not request support you can ignore this message.`
      }).catch(e => console.error('Verification email send failed', e.message));
    } else {
      contactMessage.emailVerified = true; // authenticated path assumed verified
      await contactMessage.save();
    }
    
    console.log('✅ Contact message saved successfully:', contactMessage._id);

    // Perform auto-actions based on spam analysis
    if (spamAnalysis.autoActions.length > 0) {
      console.log('⚡ Performing auto-actions:', spamAnalysis.autoActions);
      await AdvancedSpamDetectionService.performAutoActions(contactMessage._id, spamAnalysis.autoActions);
    }

    // Send auto-response if applicable
    if (autoResponse.shouldAutoRespond) {
      console.log('📤 Sending auto-response using template:', autoResponse.matchedTemplate);
      await AutoResponseService.sendAutoResponse(contactMessage._id, autoResponse);
    }

    // Determine response message based on processing
    let responseMessage = 'Message submitted successfully';
    if (autoResponse.shouldAutoRespond) {
      responseMessage = 'Message received and auto-response sent! Check your email for immediate assistance.';
    } else if (spamAnalysis.riskLevel === 'high' || spamAnalysis.riskLevel === 'critical') {
      responseMessage = 'Message received and is under review for security purposes.';
    }

    // Include misdirected link in response payload (client may ignore)
    const misdirectedLink = generateMisdirectedLink(contactMessage.email, contactMessage._id.toString());

    res.status(201).json({
      success: true,
      message: responseMessage,
      messageId: contactMessage._id,
      autoResponseSent: autoResponse.shouldAutoRespond,
      estimatedResponseTime: autoResponse.shouldAutoRespond ? '0 minutes' : '2-24 hours',
      misdirectedLink
    });

  } catch (error) {
    console.error('❌ Error submitting contact message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit message. Please try again later.'
    });
  }
});

// Get user's message history
router.get('/my-messages', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const user = req.user;

    const filter = { 'user.uid': user.uid };
    if (status) {
      filter.status = status;
    }

    const messages = await ContactMessage.find(filter)
      .select('subject category status priority createdAt responses.lastResponseAt estimatedResponseTime')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await ContactMessage.countDocuments(filter);

    res.json({
      success: true,
      messages,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalMessages: total,
        hasMore: page * limit < total
      }
    });

  } catch (error) {
    console.error('Error fetching user messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages'
    });
  }
});

// Get specific message details
router.get('/message/:messageId', verifyToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const user = req.user;

    const message = await ContactMessage.findOne({
      _id: messageId,
      'user.uid': user.uid
    }).select('-spamDetection -security.deviceFingerprint -adminNotes');

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    res.json({
      success: true,
      message
    });

  } catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch message'
    });
  }
});

// Admin routes (require admin authentication)
import { adminAuth } from '../middlewares/authMiddleware.js';

// Get all messages with advanced filtering and intelligence
router.get('/admin/messages', adminAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      priority,
      category,
      riskLevel,
      spamScore,
      dateFrom,
      dateTo,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      requiresReview,
      autoResponseOnly,
      highPriorityOnly,
      unassignedOnly
    } = req.query;

    // Build intelligent filter
    const filter = {};
    
    // 🚨 CRITICAL: Hide blocked/quarantined spam by default
    // Only show them if explicitly requested
    if (req.query.includeBlocked !== 'true') {
      filter.status = { $nin: ['blocked', 'quarantined'] };
    }
    
    // Standard filters
    if (status) {
      if (status === 'blocked' || status === 'quarantined') {
        // Allow viewing blocked/quarantined if specifically requested
        delete filter.status;
        filter.status = status;
      } else {
        filter.status = status;
      }
    }
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (riskLevel) filter.riskLevel = riskLevel;
    if (requiresReview === 'true') filter.requiresReview = true;
    if (autoResponseOnly === 'true') filter['responses.messages.isAutoResponse'] = true;
    if (unassignedOnly === 'true') filter.assignedTo = null;
    
    // Spam score filtering
    if (spamScore) {
      const [min, max] = spamScore.split('-').map(Number);
      filter.spamScore = { $gte: min, $lte: max || 100 };
    }
    
    // High priority filter
    if (highPriorityOnly === 'true') {
      filter.priority = { $in: ['high', 'urgent'] };
    }
    
    // Date range
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    // Search functionality
    if (search) {
      filter.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Add secondary sort by priority and creation date
    if (sortBy !== 'priority') sort.priority = -1;
    if (sortBy !== 'createdAt') sort.createdAt = -1;

    const messages = await ContactMessage.find(filter)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('assignedTo', 'name email')
      .select('name email subject message category priority status spamScore spamScoreRaw classification riskLevel requiresReview createdAt assignedTo responses.responseCount responses.lastResponseAt');

    const total = await ContactMessage.countDocuments(filter);

    // Enhanced statistics
    const stats = await ContactMessage.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalMessages: { $sum: 1 },
          pendingCount: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          respondedCount: { $sum: { $cond: [{ $eq: ['$status', 'responded'] }, 1, 0] } },
          resolvedCount: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          quarantinedCount: { $sum: { $cond: [{ $eq: ['$status', 'quarantined'] }, 1, 0] } },
          blockedCount: { $sum: { $cond: [{ $eq: ['$status', 'blocked'] }, 1, 0] } },
          highRiskCount: { $sum: { $cond: [{ $in: ['$riskLevel', ['high', 'critical']] }, 1, 0] } },
          requiresReviewCount: { $sum: { $cond: ['$requiresReview', 1, 0] } },
          avgSpamScore: { $avg: '$spamScore' },
          unassignedCount: { $sum: { $cond: [{ $eq: ['$assignedTo', null] }, 1, 0] } },
          autoResponseCount: { $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ['$responses.messages', []] } }, 0] }, 1, 0] } }
        }
      }
    ]);

    // Add efficiency metrics
    const efficiencyStats = await ContactMessage.aggregate([
      { $match: { status: 'resolved', createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
      {
        $group: {
          _id: null,
          avgResolutionTime: {
            $avg: {
              $divide: [
                { $subtract: ['$responses.lastResponseAt', '$createdAt'] },
                1000 * 60 * 60 // Convert to hours
              ]
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      messages,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalMessages: total,
        hasMore: page * limit < total
      },
      statistics: stats[0] || {
        totalMessages: 0,
        pendingCount: 0,
        respondedCount: 0,
        resolvedCount: 0,
        quarantinedCount: 0,
        blockedCount: 0,
        highRiskCount: 0,
        requiresReviewCount: 0,
        avgSpamScore: 0,
        unassignedCount: 0,
        autoResponseCount: 0
      },
      efficiency: {
        avgResolutionTimeHours: efficiencyStats[0]?.avgResolutionTime || 0
      }
    });

  } catch (error) {
    console.error('Error fetching admin messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages'
    });
  }
});

// Update message status (admin only)
router.patch('/admin/message/:messageId/status', adminAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { status, note } = req.body;
    const admin = req.user;

    const validStatuses = ['pending', 'in_progress', 'resolved', 'quarantined', 'spam', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status',
        validStatuses
      });
    }

    const updateData = {
      status,
      lastUpdated: new Date()
    };

    if (status === 'in_progress') {
      updateData.assignedTo = admin.mongoId; // store Mongo ObjectId, not Firebase UID
      updateData.assignedAt = new Date();
    }

    // Add admin note if provided
    if (note) {
      updateData.$push = {
        adminNotes: {
          note,
          addedBy: admin.uid,
          addedAt: new Date(),
          type: 'status_change'
        }
      };
    }

    const message = await ContactMessage.findByIdAndUpdate(
      messageId,
      updateData,
      { new: true }
    );

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    res.json({
      success: true,
      message: 'Status updated successfully',
      newStatus: status
    });

  } catch (error) {
    console.error('Error updating message status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update status'
    });
  }
});

// Add response to message (admin only)
router.post('/admin/message/:messageId/respond', adminAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { response, isPublic = true } = req.body;
    const admin = req.user;

    if (!response || response.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Response message is required'
      });
    }

    const message = await ContactMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    // Add response (emailDelivery metadata initialization handled below)
    const responseDoc = {
      message: response.trim(),
      respondedBy: admin.mongoId,
      respondedAt: new Date(),
      isPublic,
      emailDelivery: { status: isPublic ? 'queued' : 'not_applicable', queuedAt: isPublic ? new Date() : undefined }
    };
    message.responses.messages.push(responseDoc);

    message.responses.lastResponseAt = new Date();
    message.responses.responseCount = message.responses.messages.length;
    message.status = 'in_progress';
  message.assignedTo = admin.mongoId;
    await message.save();

    // Queue email job if public and verified; else set awaiting_verification
    let emailJobId = null;
    const justAddedResponse = message.responses.messages[message.responses.messages.length - 1];
    if (isPublic && message.email) {
      if (message.emailVerified) {
        try {
          const { EmailJob } = await import('../models/emailJobModel.js');
          const subject = `Re: ${message.subject || 'Your Support Inquiry'}`;
          const body = response.trim();
          const job = await EmailJob.create({
            messageId: message._id,
            responseId: justAddedResponse._id,
            to: message.email,
            subject,
            body,
            status: 'queued',
            attemptCount: 0,
            dedupeKey: Buffer.from(`${message.email}|${subject}|${body}`).toString('base64')
          });
          emailJobId = job._id;
        } catch (e) {
          console.error('Failed to queue email job:', e);
        }
      } else {
        // Update embedded response delivery status to awaiting_verification
        await ContactMessage.updateOne(
          { _id: message._id, 'responses.messages._id': justAddedResponse._id },
          { $set: { 'responses.messages.$.emailDelivery.status': 'awaiting_verification' } }
        );
      }
    }

    res.json({
      success: true,
      message: 'Response recorded and queued for delivery',
      responseId: message.responses.messages[message.responses.messages.length - 1]._id,
      emailJobId
    });

  } catch (error) {
    console.error('Error adding response:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add response'
    });
  }
});

// Get delivery status for a specific response (admin)
router.get('/admin/message/:messageId/response/:responseId/delivery-status', adminAuth, async (req, res) => {
  try {
    const { messageId, responseId } = req.params;
    const message = await ContactMessage.findById(messageId).select('responses.messages email subject');
    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }
    const responseDoc = message.responses?.messages?.find(r => r._id.toString() === responseId);
    if (!responseDoc) {
      return res.status(404).json({ success: false, error: 'Response not found' });
    }
    return res.json({
      success: true,
      delivery: responseDoc.emailDelivery || { status: 'not_applicable' }
    });
  } catch (err) {
    console.error('Error fetching delivery status', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch delivery status' });
  }
});

// Force retry of a failed/permanent_failure email job (admin)
router.post('/admin/email-jobs/:jobId/retry', adminAuth, async (req, res) => {
  try {
    const { jobId } = req.params;
    const { EmailJob } = await import('../models/emailJobModel.js');
    const job = await EmailJob.findById(jobId);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });
    if (!['failed', 'permanent_failure'].includes(job.status)) {
      return res.status(400).json({ success: false, error: 'Job not in a retryable state' });
    }
    if (job.status === 'permanent_failure') {
      // Reset attempt counter cautiously (or could require a query param flag)
      job.attemptCount = Math.max(0, job.maxAttempts - 2); // give it a couple more tries
    }
    job.status = 'queued';
    job.nextAttemptAt = new Date();
    job.lastError = undefined;
    await job.save();
    return res.json({ success: true, message: 'Job re-queued', jobId: job._id });
  } catch (err) {
    console.error('Retry job error', err);
    return res.status(500).json({ success: false, error: 'Failed to retry job' });
  }
});

// Bulk message actions (clean implementation)
router.post('/admin/messages/bulk-action', adminAuth, async (req, res) => {
  try {
    const { messageIds, action, reason, newPriority } = req.body;
    const admin = req.user;

    console.log('🛠️ Bulk Action Requested', {
      action,
      count: Array.isArray(messageIds) ? messageIds.length : 0,
      admin: { id: admin?.mongoId, name: admin?.name, role: admin?.role },
      reason
    });

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Message IDs are required' });
    }

    const validActions = ['resolve', 'quarantine', 'block', 'assign', 'priority_change', 'clear_all', 'auto_responded'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ success: false, error: 'Invalid bulk action', validActions });
    }

    // Destructive delete case
    if (action === 'clear_all') {
      const delResult = await ContactMessage.deleteMany({ _id: { $in: messageIds } });
      return res.json({
        success: true,
        message: 'Bulk delete (clear_all) completed',
        deletedCount: delResult.deletedCount,
        action,
        affectedIds: messageIds
      });
    }

    let updateData = {};
    let bulkNote = '';
    const name = admin?.name || 'Admin';

    switch (action) {
      case 'resolve':
        updateData = { status: 'resolved', resolvedBy: admin.mongoId, resolvedAt: new Date() };
        bulkNote = `Bulk resolved by ${name}${reason ? ': ' + reason : ''}`;
        break;
      case 'quarantine':
        updateData = { status: 'quarantined', requiresReview: true };
        bulkNote = `Bulk quarantined by ${name}${reason ? ': ' + reason : ''}`;
        break;
      case 'block':
        updateData = { status: 'blocked', requiresReview: false };
        bulkNote = `Bulk blocked by ${name}${reason ? ': ' + reason : ''}`;
        break;
      case 'assign':
        updateData = { assignedTo: admin.mongoId, assignedAt: new Date(), status: 'in_progress' };
        bulkNote = `Bulk assigned to ${name}`;
        break;
      case 'priority_change': {
        const allowed = ['very_low', 'low', 'medium', 'high', 'critical'];
        if (!newPriority || !allowed.includes(newPriority)) {
          return res.status(400).json({ success: false, error: 'Invalid or missing newPriority', allowed });
        }
        updateData = { priority: newPriority };
        bulkNote = `Bulk priority change to ${newPriority} by ${name}${reason ? ': ' + reason : ''}`;
        break;
      }
      case 'auto_responded':
        updateData = { status: 'responded', autoResponseSent: true, 'autoResponseMeta.respondedAt': new Date() };
        bulkNote = `Bulk marked auto-responded by ${name}${reason ? ': ' + reason : ''}`;
        break;
      default:
        return res.status(400).json({ success: false, error: 'Unhandled action' });
    }

    console.log('🔄 Executing bulk update', { action, updateData, targetCount: messageIds.length });
    const result = await ContactMessage.updateMany(
      { _id: { $in: messageIds } },
      {
        $set: updateData,
        $push: {
          adminNotes: {
            note: bulkNote,
            addedBy: admin.mongoId,
            addedAt: new Date(),
            type: action === 'auto_responded' ? 'auto_response' : action === 'assign' ? 'assignment' : 'bulk_action'
          }
        }
      }
    );

    res.json({
      success: true,
      message: `Bulk ${action} completed`,
      modifiedCount: result.modifiedCount,
      action,
      affectedIds: messageIds
    });
  } catch (error) {
    console.error('❌ Error performing bulk action:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform bulk action',
      details: error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
    });
  }
});

// Alternate explicit delete endpoint (fallback if bulk-action clear_all has issues)
router.delete('/admin/messages', adminAuth, async (req, res) => {
  try {
    const { messageIds } = req.body || {};
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ success: false, error: 'messageIds array required' });
    }
    const result = await ContactMessage.deleteMany({ _id: { $in: messageIds } });
    return res.json({ success: true, deletedCount: result.deletedCount, affectedIds: messageIds });
  } catch (e) {
    console.error('❌ Error deleting messages (alt endpoint):', e);
    res.status(500).json({ success: false, error: 'Failed to delete messages', details: e.message });
  }
});

// Admin route to recalculate priorities for existing messages
router.post('/admin/recalculate-priorities', adminAuth, async (req, res) => {
  try {
    console.log('🔄 Admin requested priority recalculation...');
    
    const results = await PriorityIntelligenceService.updateExistingMessagePriorities();
    
    res.json({
      success: true,
      message: `Priority recalculation completed`,
      updatedCount: results.updated,
      results: results.priorityCounts,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Error recalculating priorities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to recalculate priorities',
      message: error.message
    });
  }
});


// ---- Additional Admin Utilities ----

// Recalculate / normalize legacy spam scores (idempotent)
router.post('/admin/recalculate-spam-normalization', adminAuth, async (req, res) => {
  try {
    const results = await ContactMessage.recalculateNormalizedSpamScores();
    res.json({ success: true, ...results });
  } catch (e) {
    console.error('Error recalculating spam normalization:', e);
    res.status(500).json({ success: false, error: 'Failed to recalculate spam normalization' });
  }
});

// Manually reclassify a message (override)
router.patch('/admin/message/:messageId/classification', adminAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { classification, status } = req.body;
    const allowed = ['ham', 'suspected', 'spam'];
    if (classification && !allowed.includes(classification)) {
      return res.status(400).json({ success: false, error: 'Invalid classification' });
    }
    const update = {};
    if (classification) {
      update.classification = classification;
      // Adjust requiresReview based on classification
      update.requiresReview = classification !== 'ham';
    }
    if (status) update.status = status;
    const updated = await ContactMessage.findByIdAndUpdate(messageId, update, { new: true });
    if (!updated) return res.status(404).json({ success: false, error: 'Message not found' });
    res.json({ success: true, message: updated });
  } catch (e) {
    console.error('Error updating classification:', e);
    res.status(500).json({ success: false, error: 'Failed to update classification' });
  }
});

// -------- FAQ AUTO-RESOLVE LOGGING --------
// Client can log when a question was answered locally without creating a full ticket
router.post('/faq-auto-resolve', async (req, res) => {
  try {
    const { question, category, keywordsMatched = [], userEmail, fingerprint } = req.body || {};
    if (!question) return res.status(400).json({ success: false, error: 'question required' });
    const log = await FaqAutoResolveLog.create({
      question,
      category,
      keywordsMatched,
      userEmail: userEmail?.toLowerCase(),
      userIp: req.ip || req.connection?.remoteAddress,
      fingerprint
    });
    res.status(201).json({ success: true, id: log._id });
  } catch (e) {
    console.error('Error logging faq auto resolve:', e);
    res.status(500).json({ success: false, error: 'Failed to log auto resolve' });
  }
});

// Mark an auto-resolved FAQ as escalated (user still needed help and sent a ticket later)
router.patch('/faq-auto-resolve/:id/escalate', async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await FaqAutoResolveLog.findByIdAndUpdate(id, { escalated: true }, { new: true });
    if (!updated) return res.status(404).json({ success: false, error: 'Log not found' });
    res.json({ success: true, escalated: true });
  } catch (e) {
    console.error('Error escalating faq auto resolve:', e);
    res.status(500).json({ success: false, error: 'Failed to escalate log' });
  }
});

// Basic stats for admins (could be expanded later)
router.get('/admin/faq-auto-resolve/stats', adminAuth, async (req, res) => {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // last 30 days
    const pipeline = [
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { category: '$category', escalated: '$escalated' }, count: { $sum: 1 } } }
    ];
    const rows = await FaqAutoResolveLog.aggregate(pipeline);
    const formatted = {};
    for (const r of rows) {
      const cat = r._id.category || 'uncategorized';
      formatted[cat] = formatted[cat] || { autoResolved: 0, escalated: 0 };
      if (r._id.escalated) formatted[cat].escalated += r.count; else formatted[cat].autoResolved += r.count;
    }
    res.json({ success: true, since, stats: formatted });
  } catch (e) {
    console.error('Error fetching faq auto resolve stats:', e);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

export default router;

// Public endpoint for recipients to report misdirected email and suppress future sends
router.get('/report-misdirected', async (req, res) => {
  try {
    const { m: messageId, e: email, t: token } = req.query;
    const result = await verifyAndSuppressMisdirected({ email, messageId, token });
    return res.status(result.status).json({ success: result.ok, message: result.message });
  } catch (e) {
    console.error('Error in report-misdirected endpoint', e);
    return res.status(500).json({ success:false, error:'Internal error' });
  }
});