import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import loanRoutes from "./routes/loanroutes.js";
import userRoutes from "./routes/userRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import kycRoutes from "./routes/kycRoutes.js";
import creditRoutes from "./routes/creditRoutes.js";
import disputeRoutes from "./routes/disputeRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import ChatMessage from "./models/chatModel.js";
import Loan from "./models/loanModel.js";
import User from "./models/userModel.js";
import { auth } from "./firebase.js";


dotenv.config();
const app = express();
const server = createServer(app);

// Socket.IO setup with proper authentication
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors());
app.use(express.json());

// Connect DB
connectDB();

// Routes
app.use("/api/loans", loanRoutes);
app.use("/api/users", userRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/kyc", kycRoutes);
app.use("/api/credit", creditRoutes);
app.use("/api/disputes", disputeRoutes);
app.use("/api/ai", aiRoutes);

// Store user-socket mapping to handle multiple tabs per user
const userSockets = new Map(); // userId -> Set of socketIds
const socketUsers = new Map(); // socketId -> {userId, userName, email}

// Socket.IO authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    // Verify Firebase token
    const decodedToken = await auth.verifyIdToken(token);
    const firebaseUid = decodedToken.uid;
    const userName = decodedToken.name || decodedToken.email;
    const email = decodedToken.email;

    // Find the MongoDB user by email to get the ObjectId
    const user = await User.findOne({ email });
    if (!user) {
      return next(new Error("User not found in database"));
    }

    socket.firebaseUid = firebaseUid;
    socket.userId = user._id.toString(); // Use MongoDB ObjectId
    socket.userName = userName;
    socket.email = email;
    
    console.log(`Socket auth mapping - Firebase UID: ${firebaseUid} -> MongoDB ID: ${user._id}`);
    
    next();
  } catch (error) {
    console.error("Socket authentication error:", error);
    next(new Error("Authentication error"));
  }
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  const userId = socket.userId;
  const userName = socket.userName;
  
  console.log(`User ${userName} (${userId}) connected with socket ${socket.id}`);

  // Track user-socket mapping
  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }
  userSockets.get(userId).add(socket.id);
  socketUsers.set(socket.id, { userId, userName, email: socket.email });

  // Join user to their personal room
  socket.join(`user_${userId}`);

  // Join a chat room for a specific loan
  socket.on("joinLoanChat", async ({ loanId }) => {
    try {
      // Verify the loan exists and user is authorized
      const loan = await Loan.findById(loanId)
        .populate('borrowerId', '_id')
        .populate('lenderId', '_id');
        
      if (!loan || !loan.funded) {
        socket.emit("error", { message: "Unauthorized or loan not funded" });
        return;
      }

      const borrowerId = loan.borrowerId?._id?.toString();
      const lenderId = loan.lenderId?._id?.toString();

      console.log('Socket joinLoanChat authorization check:', {
        userId,
        borrowerId,
        lenderId,
        funded: loan.funded
      });

      if (borrowerId !== userId && lenderId !== userId) {
        socket.emit("error", { message: "Unauthorized to join this chat" });
        return;
      }

      socket.join(`loan_${loanId}`);
      console.log(`User ${userName} joined chat for loan ${loanId}`);
      
      socket.emit("joinedLoanChat", { loanId });
    } catch (error) {
      console.error("Error joining loan chat:", error);
      socket.emit("error", { message: "Failed to join chat" });
    }
  });

  // Handle sending messages
  socket.on("sendMessage", async ({ loanId, message, receiverId }) => {
    try {
      // Verify the loan exists and user is authorized
      const loan = await Loan.findById(loanId)
        .populate('borrowerId', '_id')
        .populate('lenderId', '_id');
        
      if (!loan || !loan.funded) {
        socket.emit("error", { message: "Unauthorized or loan not funded" });
        return;
      }

      const borrowerId = loan.borrowerId?._id?.toString();
      const lenderId = loan.lenderId?._id?.toString();

      if (borrowerId !== userId && lenderId !== userId) {
        socket.emit("error", { message: "Unauthorized to send message" });
        return;
      }

      // Save message to database
      const newMessage = new ChatMessage({
        loanId,
        senderId: userId,
        receiverId,
        message,
        messageType: "text"
      });

      await newMessage.save();
      
      const populatedMessage = await ChatMessage.findById(newMessage._id)
        .populate("senderId", "name email")
        .populate("receiverId", "name email");

      // Send to all users in the loan chat room (only the participants)
      io.to(`loan_${loanId}`).emit("receiveMessage", populatedMessage);
      
      // Also notify the receiver if they're not in the chat room
      io.to(`user_${receiverId}`).emit("newMessage", {
        loanId,
        message: populatedMessage,
        from: userName
      });
      
    } catch (error) {
      console.error("Error sending message:", error);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  // Handle typing indicators (only for specific loan chat)
  socket.on("typing", ({ loanId }) => {
    socket.to(`loan_${loanId}`).emit("userTyping", { 
      userId, 
      userName,
      loanId 
    });
  });

  socket.on("stopTyping", ({ loanId }) => {
    socket.to(`loan_${loanId}`).emit("userStopTyping", { 
      userId, 
      userName,
      loanId 
    });
  });

  // Handle marking messages as read
  socket.on("markAsRead", async ({ loanId }) => {
    try {
      await ChatMessage.updateMany(
        { loanId, receiverId: userId, isRead: false },
        { isRead: true }
      );
      
      io.to(`loan_${loanId}`).emit("messagesRead", { loanId, userId });
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`User ${userName} (${userId}) disconnected socket ${socket.id}`);
    
    // Clean up user-socket mapping
    if (userSockets.has(userId)) {
      userSockets.get(userId).delete(socket.id);
      if (userSockets.get(userId).size === 0) {
        userSockets.delete(userId);
      }
    }
    socketUsers.delete(socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
