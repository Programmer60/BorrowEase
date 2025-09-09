// Bulk Message Management API endpoints
router.post('/admin/messages/bulk-action', adminAuth, async (req, res) => {
  try {
    const { messageIds, action, reason } = req.body;
    const admin = req.user;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message IDs are required'
      });
    }

    const validActions = ['resolve', 'quarantine', 'block', 'assign', 'priority_change'];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bulk action'
      });
    }

    let updateData = {};
    let bulkNote = '';

    switch (action) {
      case 'resolve':
        updateData = { 
          status: 'resolved',
          resolvedBy: admin.uid,
          resolvedAt: new Date()
        };
        bulkNote = `Bulk resolved by ${admin.name}${reason ? ': ' + reason : ''}`;
        break;
      
      case 'quarantine':
        updateData = { 
          status: 'quarantined',
          requiresReview: true
        };
        bulkNote = `Bulk quarantined by ${admin.name}${reason ? ': ' + reason : ''}`;
        break;
      
      case 'block':
        updateData = { 
          status: 'blocked'
        };
        bulkNote = `Bulk blocked by ${admin.name}${reason ? ': ' + reason : ''}`;
        break;
      
      case 'assign':
        updateData = { 
          assignedTo: admin.uid,
          assignedAt: new Date(),
          status: 'in_progress'
        };
        bulkNote = `Bulk assigned to ${admin.name}`;
        break;
      
      case 'priority_change':
        updateData = { 
          priority: req.body.newPriority || 'medium'
        };
        bulkNote = `Priority changed to ${req.body.newPriority} by ${admin.name}`;
        break;
    }

    // Update all selected messages
    const result = await ContactMessage.updateMany(
      { _id: { $in: messageIds } },
      {
        $set: updateData,
        $push: {
          adminNotes: {
            note: bulkNote,
            addedBy: admin.uid,
            addedAt: new Date(),
            type: 'bulk_action'
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
    console.error('Error performing bulk action:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform bulk action'
    });
  }
});

// Smart message assignment based on admin expertise
router.post('/admin/messages/smart-assign', adminAuth, async (req, res) => {
  try {
    const admin = req.user;
    
    // Get admin's expertise areas (you can expand this)
    const adminExpertise = {
      technical: ['technical', 'bug', 'error'],
      account: ['account', 'login', 'password'],
      billing: ['payment', 'billing', 'money'],
      general: ['general', 'feedback']
    };

    // Find unassigned messages that match admin's expertise
    const matchingMessages = await ContactMessage.find({
      assignedTo: null,
      status: 'pending',
      category: { $in: Object.keys(adminExpertise) }
    }).limit(10);

    if (matchingMessages.length === 0) {
      return res.json({
        success: true,
        message: 'No matching messages found for smart assignment',
        assignedCount: 0
      });
    }

    // Assign messages to admin
    const messageIds = matchingMessages.map(m => m._id);
    await ContactMessage.updateMany(
      { _id: { $in: messageIds } },
      {
        $set: {
          assignedTo: admin.uid,
          assignedAt: new Date(),
          status: 'in_progress'
        },
        $push: {
          adminNotes: {
            note: `Smart assigned to ${admin.name} based on expertise matching`,
            addedBy: admin.uid,
            addedAt: new Date(),
            type: 'smart_assignment'
          }
        }
      }
    );

    res.json({
      success: true,
      message: `Smart assigned ${messageIds.length} messages`,
      assignedCount: messageIds.length,
      assignedMessages: matchingMessages.map(m => ({
        id: m._id,
        subject: m.subject,
        category: m.category
      }))
    });

  } catch (error) {
    console.error('Error in smart assignment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform smart assignment'
    });
  }
});

export default router;
