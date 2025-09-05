import express from 'express';
import jwt from 'jsonwebtoken';
import { verifyToken } from '../middlewares/authMiddleware.js';
import ContactMessage from '../models/contactModel.js';
import { 
  contactRateLimit, 
  SpamDetectionService, 
  ContentModerationService,
  DeviceFingerprintingService 
} from '../services/spamDetectionService.js';

const router = express.Router();

// Submit contact message - SIMPLIFIED VERSION
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
    
    // Simple message data
    const messageData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      subject: subject.trim(),
      message: message.trim(),
      category,
      user: {
        uid: 'anonymous',
        email: email,
        displayName: name,
        photoURL: null,
        isAnonymous: true
      },
      status: 'pending',
      priority: category === 'urgent' ? 'urgent' : 'medium', // Changed from 'normal' to 'medium'
      createdAt: new Date(),
      // Add required fields for the schema
      ipAddress: req.ip || req.connection.remoteAddress || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Unknown'
    };

    // Create and save message
    const contactMessage = new ContactMessage(messageData);
    await contactMessage.save();
    
    console.log('✅ Contact message saved successfully:', contactMessage._id);

    res.status(201).json({
      success: true,
      message: 'Message submitted successfully',
      messageId: contactMessage._id
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

// Get all messages with advanced filtering
router.get('/admin/messages', adminAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      priority,
      category,
      riskLevel,
      dateFrom,
      dateTo,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (riskLevel) filter['spamDetection.riskLevel'] = riskLevel;
    
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

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

    const messages = await ContactMessage.find(filter)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('assignedTo', 'displayName email');

    const total = await ContactMessage.countDocuments(filter);

    // Get statistics
    const stats = await ContactMessage.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalMessages: { $sum: 1 },
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          quarantinedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'quarantined'] }, 1, 0] }
          },
          highRiskCount: {
            $sum: { $cond: [{ $eq: ['$spamDetection.riskLevel', 'high'] }, 1, 0] }
          },
          avgSpamScore: { $avg: '$spamDetection.score' }
        }
      }
    ]);

    res.json({
      success: true,
      messages,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalMessages: total,
        hasMore: page * limit < total
      },
      statistics: stats[0] || {
        totalMessages: 0,
        pendingCount: 0,
        quarantinedCount: 0,
        highRiskCount: 0,
        avgSpamScore: 0
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
      updateData.assignedTo = admin.uid;
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

    // Add response
    message.responses.messages.push({
      message: response.trim(),
      respondedBy: admin.uid,
      respondedAt: new Date(),
      isPublic
    });

    message.responses.lastResponseAt = new Date();
    message.responses.responseCount = message.responses.messages.length;
    message.status = 'in_progress';
    message.assignedTo = admin.uid;

    await message.save();

    res.json({
      success: true,
      message: 'Response added successfully',
      responseId: message.responses.messages[message.responses.messages.length - 1]._id
    });

  } catch (error) {
    console.error('Error adding response:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add response'
    });
  }
});

export default router;
