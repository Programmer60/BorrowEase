import express from "express";
import Notification from "../models/notificationModel.js";
import { verifyToken } from "../firebase.js";

const router = express.Router();

// Get user's notifications with optional incremental fetch (?since=ISO8601)
router.get("/", verifyToken, async (req, res) => {
  try {
    const query = { userId: req.user.id };
    const { since } = req.query || {};
    if (since) {
      const d = new Date(since);
      if (!isNaN(d.getTime())) {
        query.createdAt = { $gt: d };
      }
    }
    const notifications = await Notification.find(query).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Lightweight unread count for efficient polling
router.get('/unread-count', verifyToken, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ userId: req.user.id, read: false });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark as read
router.patch("/:id/read", verifyToken, async (req, res) => {
  try {
    // Only allow the owner to mark their notification as read
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { read: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ error: "Notification not found or unauthorized" });
    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new notification (call this from backend logic where needed)
router.post("/", verifyToken, async (req, res) => {
  try {
    const { userId, message, link } = req.body;
    const notification = await Notification.create({ userId, message, link });
    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
