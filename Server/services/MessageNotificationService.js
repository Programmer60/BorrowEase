// Real-time notification system for admin message management
const EventEmitter = require('events');

class MessageNotificationService extends EventEmitter {
  constructor() {
    super();
    this.connectedAdmins = new Map(); // adminId -> socket
    this.notificationSettings = new Map(); // adminId -> settings
  }

  // Connect admin to real-time notifications
  connectAdmin(adminId, socket) {
    this.connectedAdmins.set(adminId, socket);
    
    // Set default notification settings
    if (!this.notificationSettings.has(adminId)) {
      this.notificationSettings.set(adminId, {
        highPriorityMessages: true,
        spamDetected: true,
        autoResponses: false,
        bulkActions: true,
        newMessages: true
      });
    }

    console.log(`Admin ${adminId} connected to message notifications`);

    // Send current statistics
    this.sendStatisticsUpdate(adminId);
  }

  // Disconnect admin
  disconnectAdmin(adminId) {
    this.connectedAdmins.delete(adminId);
    console.log(`Admin ${adminId} disconnected from message notifications`);
  }

  // Notify about new high-priority message
  notifyHighPriorityMessage(message) {
    const notification = {
      type: 'high_priority_message',
      title: '🚨 High Priority Message',
      message: `New ${message.priority} priority message from ${message.name}`,
      data: {
        messageId: message._id,
        subject: message.subject,
        priority: message.priority,
        spamScore: message.spamScore
      },
      timestamp: new Date()
    };

    this.broadcastToAdmins('highPriorityMessages', notification);
  }

  // Notify about spam detection
  notifySpamDetected(message, spamDetails) {
    const notification = {
      type: 'spam_detected',
      title: '🛡️ Spam Detected',
      message: `Message flagged as spam (${Math.round(spamDetails.score * 100)}% confidence)`,
      data: {
        messageId: message._id,
        spamScore: spamDetails.score,
        reasons: spamDetails.reasons,
        action: spamDetails.action
      },
      timestamp: new Date()
    };

    this.broadcastToAdmins('spamDetected', notification);
  }

  // Notify about auto-response sent
  notifyAutoResponse(message, responseType) {
    const notification = {
      type: 'auto_response',
      title: '🤖 Auto-Response Sent',
      message: `Automated ${responseType} response sent to ${message.email}`,
      data: {
        messageId: message._id,
        responseType: responseType,
        email: message.email
      },
      timestamp: new Date()
    };

    this.broadcastToAdmins('autoResponses', notification);
  }

  // Notify about bulk actions
  notifyBulkAction(action, count, adminName) {
    const notification = {
      type: 'bulk_action',
      title: '📦 Bulk Action Completed',
      message: `${adminName} performed bulk ${action} on ${count} messages`,
      data: {
        action: action,
        count: count,
        adminName: adminName
      },
      timestamp: new Date()
    };

    this.broadcastToAdmins('bulkActions', notification);
  }

  // Send statistics update
  async sendStatisticsUpdate(adminId = null) {
    try {
      const ContactMessage = require('../models/contactModel');
      
      const stats = await ContactMessage.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
            highRisk: { $sum: { $cond: [{ $eq: ['$riskLevel', 'high'] }, 1, 0] } },
            needsReview: { $sum: { $cond: ['$requiresReview', 1, 0] } },
            autoReplied: { $sum: { $cond: ['$autoResponseSent', 1, 0] } }
          }
        }
      ]);

      const statisticsUpdate = {
        type: 'statistics_update',
        data: stats[0] || {
          total: 0,
          pending: 0,
          resolved: 0,
          highRisk: 0,
          needsReview: 0,
          autoReplied: 0
        },
        timestamp: new Date()
      };

      if (adminId) {
        this.sendToAdmin(adminId, statisticsUpdate);
      } else {
        this.broadcastToAllAdmins(statisticsUpdate);
      }
    } catch (error) {
      console.error('Error sending statistics update:', error);
    }
  }

  // Send notification to specific admin
  sendToAdmin(adminId, notification) {
    const socket = this.connectedAdmins.get(adminId);
    if (socket && socket.connected) {
      socket.emit('message_notification', notification);
    }
  }

  // Broadcast to admins with specific setting enabled
  broadcastToAdmins(settingKey, notification) {
    for (const [adminId, socket] of this.connectedAdmins) {
      const settings = this.notificationSettings.get(adminId);
      if (settings && settings[settingKey] && socket.connected) {
        socket.emit('message_notification', notification);
      }
    }
  }

  // Broadcast to all connected admins
  broadcastToAllAdmins(notification) {
    for (const [adminId, socket] of this.connectedAdmins) {
      if (socket.connected) {
        socket.emit('message_notification', notification);
      }
    }
  }

  // Update admin notification settings
  updateNotificationSettings(adminId, newSettings) {
    const currentSettings = this.notificationSettings.get(adminId) || {};
    this.notificationSettings.set(adminId, { ...currentSettings, ...newSettings });
  }

  // Get notification queue (for when admin comes back online)
  getNotificationQueue(adminId) {
    // In a real implementation, you'd store this in Redis or database
    // For now, return empty array
    return [];
  }
}

// Singleton instance
const messageNotificationService = new MessageNotificationService();

module.exports = messageNotificationService;
