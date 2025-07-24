import express from "express";
import ChatMessage from "../models/chatModel.js";
import Loan from "../models/loanModel.js";
import { verifyToken } from "../firebase.js";

const router = express.Router();

// Middleware to log all incoming requests
router.use((req, res, next) => {
  console.log(`📬 Incoming ${req.method} request to ${req.originalUrl}`);
  console.log(`📬 Headers:`, {
    authorization: req.headers.authorization ? 'Bearer ***' : 'None',
    'content-type': req.headers['content-type']
  });
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`📬 Body:`, req.body);
  }
  next();
});

// Get chat messages for a specific loan
router.get("/loan/:loanId", verifyToken, async (req, res) => {
  try {
    const { loanId } = req.params;
    const userId = req.user.id;

    console.log("🔍 Chat access attempt:");
    console.log("- LoanId:", loanId);
    console.log("- UserId:", userId);
    console.log("- UserId type:", typeof userId);
    console.log("- User:", req.user);

    // Verify user is part of this loan (either borrower or lender)
    const loan = await Loan.findById(loanId)
      .populate('borrowerId', 'name email _id')
      .populate('lenderId', 'name email _id');
      
    if (!loan) {
      console.log("❌ Loan not found");
      return res.status(404).json({ error: "Loan not found" });
    }

    console.log("📋 Loan details:");
    console.log("- Loan ID:", loan._id);
    console.log("- Borrower:", loan.borrowerId);
    console.log("- Lender:", loan.lenderId);
    console.log("- Funded:", loan.funded);

    // Check if user is borrower or lender
    const borrowerIdStr = loan.borrowerId ? loan.borrowerId._id.toString() : null;
    const lenderIdStr = loan.lenderId ? loan.lenderId._id.toString() : null;
    const userIdStr = userId.toString();
    
    const isBorrower = borrowerIdStr === userIdStr;
    const isLender = lenderIdStr === userIdStr;
    
    console.log("🔐 Authorization check:");
    console.log("- User ID (string):", userIdStr);
    console.log("- Borrower ID (string):", borrowerIdStr);
    console.log("- Lender ID (string):", lenderIdStr);
    console.log("- Is Borrower:", isBorrower);
    console.log("- Is Lender:", isLender);

    if (!isBorrower && !isLender) {
      console.log("❌ User not authorized for this loan");
      return res.status(403).json({ error: "Unauthorized to access this chat" });
    }

    // Only allow chat if loan is funded
    if (!loan.funded) {
      console.log("❌ Loan not funded");
      return res.status(403).json({ error: "Chat is only available for funded loans" });
    }

    console.log("✅ Authorization successful, fetching messages");

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
    console.log("💬 Message send attempt:");
    console.log("- Request body:", req.body);
    console.log("- User:", req.user);
    
    const { loanId, message, receiverId } = req.body;
    const senderId = req.user.id.toString(); // Convert ObjectId to string!
    
    console.log("- LoanId:", loanId);
    console.log("- Message:", message);
    console.log("- ReceiverId:", receiverId);
    console.log("- SenderId:", senderId);

    // Verify loan exists and user is authorized
    console.log("🔍 Verifying loan and authorization...");
    const loan = await Loan.findById(loanId);
    if (!loan) {
      console.log("❌ Loan not found for ID:", loanId);
      return res.status(404).json({ error: "Loan not found" });
    }

    console.log("📋 Loan found:", {
      id: loan._id,
      borrowerId: loan.borrowerId,
      lenderId: loan.lenderId,
      funded: loan.funded
    });

    // Debug the authorization check in detail
    const borrowerIdStr = loan.borrowerId.toString();
    const lenderIdStr = loan.lenderId?.toString();
    console.log("🔍 Authorization check details:");
    console.log("- SenderId:", senderId);
    console.log("- BorrowerId (string):", borrowerIdStr);
    console.log("- LenderId (string):", lenderIdStr);
    console.log("- Is sender the borrower?", borrowerIdStr === senderId);
    console.log("- Is sender the lender?", lenderIdStr === senderId);
    console.log("- Authorization check (should be false to pass):", loan.borrowerId.toString() !== senderId && loan.lenderId?.toString() !== senderId);

    if (loan.borrowerId.toString() !== senderId && loan.lenderId?.toString() !== senderId) {
      console.log("❌ User not authorized for this loan");
      return res.status(403).json({ error: "Unauthorized to send message" });
    }

    // Only allow chat if loan is funded
    if (!loan.funded) {
      console.log("❌ Loan not funded");
      return res.status(403).json({ error: "Chat is only available for funded loans" });
    }

    console.log("✅ Authorization passed, creating message...");

    const newMessage = new ChatMessage({
      loanId,
      senderId,
      receiverId,
      message,
      messageType: "text"
    });

    console.log("💾 Saving message to database...");
    await newMessage.save();
    console.log("✅ Message saved with ID:", newMessage._id);
    
    console.log("🔄 Populating message data...");
    const populatedMessage = await ChatMessage.findById(newMessage._id)
      .populate("senderId", "name email")
      .populate("receiverId", "name email");

    console.log("✅ Message sent successfully:", populatedMessage);
    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("❌ Error sending message:", error);
    console.error("❌ Error stack:", error.stack);
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
