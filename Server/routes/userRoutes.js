import express from "express";
import User from "../models/userModel.js";
import { verifyToken } from "../firebase.js";

const router = express.Router();

// First login: save role
router.post("/setup", verifyToken, async (req, res) => {
  const { role } = req.body;
  const { name, email } = req.user;

  // Check if this is the first user ever (make them admin)
  const userCount = await User.countDocuments();
  const isFirstUser = userCount === 0;

  let user = await User.findOne({ email });
  if (!user) {
    // If it's the first user, make them admin regardless of requested role
    const assignedRole = isFirstUser ? "admin" : role;
    user = await User.create({ name, email, role: assignedRole });
    return res.json(user);
  }

  // User exists → return their role
  return res.json(user);
});




// Get my user profile
router.get("/me", verifyToken, async (req, res) => {
    try {
        const user = await User.findOne({ email: req.user.email });
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update role
router.patch("/me", verifyToken, async (req, res) => {
    const { role } = req.body;
    const { email } = req.user;

    try {
        const user = await User.findOneAndUpdate(
            { email },
            { role },
            { new: true }
        );
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all users (Admin only)
router.get("/all", verifyToken, async (req, res) => {
    try {
        // ❌ Non-admin access denied
        if (req.user.role !== "admin") {
            return res.status(403).json({ error: "Access denied. Admins only." });
        }

        const users = await User.find().sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Change user role (Admin only)
router.patch("/:id/role", verifyToken, async (req, res) => {
    try {

        if (req.user.role !== "admin") {
            return res.status(403).json({ error: "Access denied. Admins only." });
        }
        const user = await User.findByIdAndUpdate(

            req.params.id,
            { role: req.body.role },
            { new: true }
        );
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


export default router;
