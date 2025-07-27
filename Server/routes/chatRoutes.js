import express from "express";
import ChatMessage from "../models/chatModel.js";
import Loan from "../models/loanModel.js";
import { verifyToken } from "../firebase.js";

const router = express.Router();

// Get chat messages for a specific loan
router.get("/loan/:loanId", verifyToken, async (req, res) => {
  try {
    const { loanId } = req.params;
    const userId = req.user.id.toString();

    // Verify user is part of this loan (either borrower or lender)
    const loan = await Loan.findById(loanId)
      .populate('borrowerId', 'name email _id')
      .populate('lenderId', 'name email _id');
      
    if (!loan) {
      return res.status(404).json({ error: "Loan not found" });
    }

    const borrowerId = loan.borrowerId._id.toString();
    const lenderId = loan.lenderId?._id?.toString();
    
    console.log('Chat authorization check:', {
      userId,
      borrowerId,
      lenderId,
      userRole: req.user.role
    });

    // Allow access if user is borrower, lender, or admin
    const isAuthorized = userId === borrowerId || 
                        (lenderId && userId === lenderId) || 
                        req.user.role === 'admin';

    if (!isAuthorized) {
      return res.status(403).json({ 
        error: "Unauthorized to access this chat",
        details: "You can only access chats for loans where you are the borrower or lender"
      });
    }

    // Only allow chat if loan is funded
    if (!loan.funded) {
      return res.status(403).json({ error: "Chat is only available for funded loans" });
    }

    const messages = await ChatMessage.find({ loanId })
      .populate("senderId", "name email")
      .populate("receiverId", "name email")
      .sort({ timestamp: 1 });

    // Mark messages as read for the current user
    await ChatMessage.updateMany(
      { loanId, receiverId: userId, isRead: false },
      { isRead: true }
    );

    res.json(messages);
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Send a new message
router.post("/send", verifyToken, async (req, res) => {
  try {
    const { loanId, message, receiverId } = req.body;
    const senderId = req.user.id.toString();

    // Verify loan exists and user is authorized
    const loan = await Loan.findById(loanId)
      .populate('borrowerId', 'name email _id')
      .populate('lenderId', 'name email _id');
      
    if (!loan) {
      return res.status(404).json({ error: "Loan not found" });
    }

    const borrowerId = loan.borrowerId._id.toString();
    const lenderId = loan.lenderId?._id?.toString();
    
    // Allow access if user is borrower, lender, or admin
    const isAuthorized = senderId === borrowerId || 
                        (lenderId && senderId === lenderId) || 
                        req.user.role === 'admin';

    if (!isAuthorized) {
      return res.status(403).json({ 
        error: "Unauthorized to send message",
        details: "You can only send messages for loans where you are the borrower or lender"
      });
    }

    // Only allow chat if loan is funded
    if (!loan.funded) {
      return res.status(403).json({ error: "Chat is only available for funded loans" });
    }

    const newMessage = new ChatMessage({
      loanId,
      senderId,
      receiverId,
      message,
      messageType: "text"
    });

    await newMessage.save();
    
    const populatedMessage = await ChatMessage.findById(newMessage._id)
      .populate("senderId", "name email")
      .populate("receiverId", "name email");

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// Get all active chats for a user
router.get("/active", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Find all funded loans where user is either borrower or lender
    const loans = await Loan.find({
      $and: [
        { funded: true },
        {
          $or: [
            { borrowerId: userId },
            { lenderId: userId }
          ]
        }
      ]
    }).populate("borrowerId lenderId", "name email");

    // Get latest message for each loan
    const chatsWithLatestMessage = await Promise.all(
      loans.map(async (loan) => {
        const latestMessage = await ChatMessage.findOne({ loanId: loan._id })
          .sort({ timestamp: -1 })
          .populate("senderId", "name email");

        const unreadCount = await ChatMessage.countDocuments({
          loanId: loan._id,
          receiverId: userId,
          isRead: false
        });

        return {
          loan,
          latestMessage,
          unreadCount,
          otherParty: loan.borrowerId._id.toString() === userId 
            ? loan.lenderId 
            : loan.borrowerId
        };
      })
    );

    res.json(chatsWithLatestMessage);
  } catch (error) {
    console.error("Error fetching active chats:", error);
    res.status(500).json({ error: "Failed to fetch active chats" });
  }
});

// Mark messages as read
router.put("/mark-read/:loanId", verifyToken, async (req, res) => {
  try {
    const { loanId } = req.params;
    const userId = req.user.id;

    await ChatMessage.updateMany(
      { loanId, receiverId: userId, isRead: false },
      { isRead: true }
    );

    res.json({ message: "Messages marked as read" });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({ error: "Failed to mark messages as read" });
  }
});

export default router;
