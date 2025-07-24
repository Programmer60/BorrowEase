import AuditLog from "../models/auditLogModel.js";

export const logAdminAction = async (req, action, targetUser = null, details = {}) => {
  try {
    const auditEntry = {
      adminId: req.user.id,
      adminEmail: req.user.email,
      action,
      targetUserId: targetUser?._id || null,
      targetUserEmail: targetUser?.email || null,
      details,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    };

    await AuditLog.create(auditEntry);
  } catch (error) {
    console.error('Failed to log admin action:', error);
    // Don't throw error to avoid breaking the main operation
  }
};
