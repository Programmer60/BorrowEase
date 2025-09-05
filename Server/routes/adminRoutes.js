import express from 'express';
import { adminAuth } from '../middlewares/authMiddleware.js';
import Blacklist from '../models/blacklistModel.js';
import ContactMessage from '../models/contactModel.js';

const router = express.Router();

// Get all blacklist entries with filtering
router.get('/blacklist', adminAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      reason,
      severity,
      isActive,
      search
    } = req.query;

    // Build filter
    const filter = {};
    if (type) filter.type = type;
    if (reason) filter.reason = reason;
    if (severity) filter.severity = severity;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    if (search) {
      filter.$or = [
        { value: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Add expiration filter for active entries
    if (filter.isActive !== false) {
      filter.$or = filter.$or || [];
      filter.$or.push(
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } }
      );
    }

    const entries = await Blacklist.find(filter)
      .populate('addedBy', 'displayName email')
      .populate('reviewedBy', 'displayName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Blacklist.countDocuments(filter);

    // Get statistics
    const stats = await Blacklist.aggregate([
      {
        $group: {
          _id: null,
          totalEntries: { $sum: 1 },
          activeEntries: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$isActive', true] },
                    {
                      $or: [
                        { $eq: ['$expiresAt', null] },
                        { $gt: ['$expiresAt', new Date()] }
                      ]
                    }
                  ]
                },
                1,
                0
              ]
            }
          },
          totalHits: { $sum: '$hitCount' },
          byType: {
            $push: {
              type: '$type',
              count: 1
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      entries,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalEntries: total,
        hasMore: page * limit < total
      },
      statistics: stats[0] || {
        totalEntries: 0,
        activeEntries: 0,
        totalHits: 0,
        byType: []
      }
    });

  } catch (error) {
    console.error('Error fetching blacklist:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch blacklist entries'
    });
  }
});

// Add new blacklist entry
router.post('/blacklist', adminAuth, async (req, res) => {
  try {
    const {
      type,
      value,
      reason,
      severity = 'medium',
      description,
      expiresAt
    } = req.body;
    const admin = req.user;

    // Validation
    const validTypes = ['ip', 'email', 'domain', 'keyword', 'fingerprint'];
    const validReasons = ['spam', 'abuse', 'fraud', 'violation', 'manual'];
    const validSeverities = ['low', 'medium', 'high', 'critical'];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid type',
        validTypes
      });
    }

    if (!validReasons.includes(reason)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid reason',
        validReasons
      });
    }

    if (!validSeverities.includes(severity)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid severity',
        validSeverities
      });
    }

    if (!value || value.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Value is required'
      });
    }

    // Check if entry already exists
    const existing = await Blacklist.findOne({
      type,
      value: value.trim().toLowerCase()
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Entry already exists in blacklist',
        existingEntry: {
          id: existing._id,
          isActive: existing.isActive,
          reason: existing.reason
        }
      });
    }

    // Create new entry
    const blacklistEntry = new Blacklist({
      type,
      value: value.trim().toLowerCase(),
      reason,
      severity,
      description: description?.trim(),
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      addedBy: admin.uid,
      detectedBy: 'admin'
    });

    await blacklistEntry.save();

    res.status(201).json({
      success: true,
      message: 'Blacklist entry added successfully',
      entry: {
        id: blacklistEntry._id,
        type: blacklistEntry.type,
        value: blacklistEntry.value,
        reason: blacklistEntry.reason,
        severity: blacklistEntry.severity
      }
    });

  } catch (error) {
    console.error('Error adding blacklist entry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add blacklist entry'
    });
  }
});

// Update blacklist entry
router.patch('/blacklist/:entryId', adminAuth, async (req, res) => {
  try {
    const { entryId } = req.params;
    const {
      isActive,
      severity,
      description,
      expiresAt,
      reviewNote
    } = req.body;
    const admin = req.user;

    const entry = await Blacklist.findById(entryId);
    if (!entry) {
      return res.status(404).json({
        success: false,
        error: 'Blacklist entry not found'
      });
    }

    // Update fields
    if (isActive !== undefined) entry.isActive = isActive;
    if (severity) entry.severity = severity;
    if (description !== undefined) entry.description = description;
    if (expiresAt !== undefined) {
      entry.expiresAt = expiresAt ? new Date(expiresAt) : null;
    }

    // Add review information
    entry.reviewedBy = admin.uid;
    entry.reviewedAt = new Date();

    await entry.save();

    res.json({
      success: true,
      message: 'Blacklist entry updated successfully'
    });

  } catch (error) {
    console.error('Error updating blacklist entry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update blacklist entry'
    });
  }
});

// Delete blacklist entry
router.delete('/blacklist/:entryId', adminAuth, async (req, res) => {
  try {
    const { entryId } = req.params;

    const entry = await Blacklist.findById(entryId);
    if (!entry) {
      return res.status(404).json({
        success: false,
        error: 'Blacklist entry not found'
      });
    }

    await Blacklist.findByIdAndDelete(entryId);

    res.json({
      success: true,
      message: 'Blacklist entry deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting blacklist entry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete blacklist entry'
    });
  }
});

// Bulk blacklist operations
router.post('/blacklist/bulk', adminAuth, async (req, res) => {
  try {
    const { action, entryIds, updateData } = req.body;
    const admin = req.user;

    if (!action || !entryIds || !Array.isArray(entryIds)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bulk operation parameters'
      });
    }

    let result;
    switch (action) {
      case 'activate':
        result = await Blacklist.updateMany(
          { _id: { $in: entryIds } },
          {
            isActive: true,
            reviewedBy: admin.uid,
            reviewedAt: new Date()
          }
        );
        break;

      case 'deactivate':
        result = await Blacklist.updateMany(
          { _id: { $in: entryIds } },
          {
            isActive: false,
            reviewedBy: admin.uid,
            reviewedAt: new Date()
          }
        );
        break;

      case 'delete':
        result = await Blacklist.deleteMany({ _id: { $in: entryIds } });
        break;

      case 'update':
        if (!updateData) {
          return res.status(400).json({
            success: false,
            error: 'Update data is required for bulk update'
          });
        }
        result = await Blacklist.updateMany(
          { _id: { $in: entryIds } },
          {
            ...updateData,
            reviewedBy: admin.uid,
            reviewedAt: new Date()
          }
        );
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid bulk action',
          validActions: ['activate', 'deactivate', 'delete', 'update']
        });
    }

    res.json({
      success: true,
      message: `Bulk ${action} completed successfully`,
      modifiedCount: result.modifiedCount || result.deletedCount || 0
    });

  } catch (error) {
    console.error('Error in bulk blacklist operation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform bulk operation'
    });
  }
});

// Get spam statistics and insights
router.get('/spam-stats', adminAuth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Message statistics
    const messageStats = await ContactMessage.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: null,
          totalMessages: { $sum: 1 },
          spamMessages: {
            $sum: { $cond: [{ $gte: ['$spamDetection.score', 60] }, 1, 0] }
          },
          quarantinedMessages: {
            $sum: { $cond: [{ $eq: ['$status', 'quarantined'] }, 1, 0] }
          },
          avgSpamScore: { $avg: '$spamDetection.score' },
          highRiskMessages: {
            $sum: { $cond: [{ $eq: ['$spamDetection.riskLevel', 'high'] }, 1, 0] }
          }
        }
      }
    ]);

    // Top spam reasons
    const spamReasons = await ContactMessage.aggregate([
      {
        $match: {
          createdAt: { $gte: since },
          'spamDetection.score': { $gte: 40 }
        }
      },
      { $unwind: '$spamDetection.reasons' },
      {
        $group: {
          _id: '$spamDetection.reasons',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Blacklist effectiveness
    const blacklistStats = await Blacklist.aggregate([
      {
        $group: {
          _id: '$type',
          totalEntries: { $sum: 1 },
          activeEntries: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
          totalHits: { $sum: '$hitCount' },
          recentHits: {
            $sum: {
              $cond: [
                { $gte: ['$lastHit', since] },
                '$hitCount',
                0
              ]
            }
          }
        }
      }
    ]);

    // Daily spam trends
    const dailyTrends = await ContactMessage.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
          },
          totalMessages: { $sum: 1 },
          spamMessages: {
            $sum: { $cond: [{ $gte: ['$spamDetection.score', 60] }, 1, 0] }
          },
          avgSpamScore: { $avg: '$spamDetection.score' }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    res.json({
      success: true,
      statistics: {
        overview: messageStats[0] || {
          totalMessages: 0,
          spamMessages: 0,
          quarantinedMessages: 0,
          avgSpamScore: 0,
          highRiskMessages: 0
        },
        topSpamReasons: spamReasons,
        blacklistEffectiveness: blacklistStats,
        dailyTrends,
        generatedAt: new Date(),
        periodDays: days
      }
    });

  } catch (error) {
    console.error('Error generating spam statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate spam statistics'
    });
  }
});

export default router;
