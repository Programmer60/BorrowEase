import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
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
import fraudRoutes from "./routes/enhancedFraudDetection.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import ChatMessage from "./models/chatModel.js";
import Loan from "./models/loanModel.js";
import User from "./models/userModel.js";
import { auth } from "./firebase.js";
import cloudinaryRoutes from "./routes/cloudinaryRoutes.js";
import legalRoutes from "./routes/legalRoutes.js";


dotenv.config();
const app = express();
const server = createServer(app);

// Behind Render/other proxies, trust the proxy so req.protocol reflects 'https'
// This helps us generate correct absolute URLs (e.g., payment callback) without downgrading to http
app.set('trust proxy', 1);

// Socket.IO setup with proper authentication
// Allowlist from env (comma-separated), with local dev defaults
// Supports exact origins and wildcard entries like:
//   https://*.vercel.app or *.vercel.app
// Trailing slashes are ignored in comparison
const rawOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map(o => o.trim())
  .filter(Boolean);

const normalizeOrigin = (origin) => {
  if (!origin) return origin;
  try {
    // Use URL to normalize, then drop trailing slash
    const u = new URL(origin);
    return u.origin;
  } catch {
    // If origin is already a hostname pattern like *.vercel.app, return as-is
    return origin.replace(/\/$/, "");
  }
};

// Build rules: exact set and wildcard host suffix rules
const exactOrigins = new Set();
const wildcardRules = []; // { protocol: 'https:' | 'http:' | null, hostSuffix: string }

for (const entry of rawOrigins) {
  const e = entry.replace(/\s+/g, "");
  if (!e) continue;
  const hasWildcard = e.includes("*");
  if (hasWildcard) {
    // Accept formats like https://*.vercel.app or *.vercel.app
    let protocol = null;
    let host = e;
    if (e.startsWith("http://") || e.startsWith("https://")) {
      const proto = e.startsWith("https://") ? "https:" : "http:";
      protocol = proto;
      host = e.replace(/^https?:\/\//, "");
    }
    host = host.replace(/^\*\./, ""); // remove leading *.
    wildcardRules.push({ protocol, hostSuffix: host.toLowerCase() });
  } else {
    exactOrigins.add(normalizeOrigin(e));
  }
}

const isAllowedOrigin = (origin) => {
  if (!origin) return true; // same-origin or server-to-server
  const norm = normalizeOrigin(origin);
  if (exactOrigins.has(norm)) return true;
  try {
    const u = new URL(origin);
    const host = u.hostname.toLowerCase();
    const proto = u.protocol; // 'https:' | 'http:'
    return wildcardRules.some(r => host.endsWith(r.hostSuffix) && (!r.protocol || r.protocol === proto));
  } catch {
    // Non-standard origin; deny by default
    return false;
  }
};
const io = new Server(server, {
  cors: {
    origin: (origin, cb) => {
      return cb(null, isAllowedOrigin(origin));
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});

// REST CORS
const corsConfig = {
  origin: (origin, cb) => cb(null, isAllowedOrigin(origin)),
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
};
app.use(cors(corsConfig));
app.options("*", cors(corsConfig));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

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
app.use("/api/fraud", fraudRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", cloudinaryRoutes);
app.use("/legal", legalRoutes); // PDF legal docs

// Health check (for Render and other PaaS)
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// DB health (ping) to diagnose Atlas connectivity in prod
app.get("/health/db", async (req, res) => {
  const state = mongoose.connection.readyState; // 0=disconnected,1=connected,2=connecting,3=disconnecting
  try {
    if (state === 1 && mongoose.connection.db) {
      await mongoose.connection.db.admin().ping();
      return res.json({ ok: true, state });
    }
    return res.status(503).json({ ok: false, state });
  } catch (e) {
    return res.status(503).json({ ok: false, state, error: e?.message });
  }
});

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
    const email = decodedToken.email;

    // Find the MongoDB user by email to get the ObjectId and proper name
    const user = await User.findOne({ email });
    if (!user) {
      return next(new Error("User not found in database"));
    }

    socket.firebaseUid = firebaseUid;
    socket.userId = user._id.toString(); // Use MongoDB ObjectId
    socket.userName = user.name; // Use MongoDB user name instead of Firebase name
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

      // Leave any previous loan chat rooms to prevent being in multiple rooms
      const rooms = Array.from(socket.rooms);
      rooms.forEach(room => {
        if (room.startsWith('loan_') && room !== `loan_${loanId}`) {
          socket.leave(room);
          console.log(`User ${userName} left previous chat room ${room}`);
        }
      });

      // If loan is funded but lenderId is missing and the joiner is not the borrower, stamp lender info
      const borrowerIdStr = loan.borrowerId?._id?.toString();
      const lenderIdStr = loan.lenderId?._id?.toString();
      if (loan.funded && !lenderIdStr && userId !== borrowerIdStr) {
        try {
          loan.lenderId = userId;
          await loan.save();
          // Also set denormalized lenderName for display
          await Loan.findByIdAndUpdate(loanId, { lenderName: userName }, { new: true });
          console.log('🛠️ Stamped missing lender on loan', loanId, 'lenderId', userId, 'lenderName', userName);
          // Notify room participants so UIs can refresh counterparty name
          io.to(`loan_${loanId}`).emit('loanUpdated', { loanId, lenderId: userId, lenderName: userName });
        } catch (e) {
          console.warn('⚠️ Failed to stamp lender info on loan', loanId, e?.message);
        }
      }

      // Join the loan chat room
      socket.join(`loan_${loanId}`);
      console.log(`User ${userName} joined chat for loan ${loanId}`);
      
      // Notify others in the room that user is online
      socket.to(`loan_${loanId}`).emit("userOnline", { userId, userName });
      
      socket.emit("joinedLoanChat", { loanId });
    } catch (error) {
      console.error("Error joining loan chat:", error);
      socket.emit("error", { message: "Failed to join chat" });
    }
  });

  // Handle sending messages
  socket.on("sendMessage", async ({ loanId, message, receiverId }) => {
    try {
  console.log('🛰️ sendMessage received', { from: userId, to: receiverId, loanId, socket: socket.id });
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
  console.log('📡 receiveMessage emitted to room', `loan_${loanId}`, 'msgId', populatedMessage._id?.toString?.());
      
      // Only notify the receiver via user room if they're not currently in the chat room
      const receiverSockets = await io.in(`user_${receiverId}`).fetchSockets();
      const receiverInChatRoom = receiverSockets.some(socket => 
        Array.from(socket.rooms).includes(`loan_${loanId}`)
      );
      
      if (!receiverInChatRoom) {
        io.to(`user_${receiverId}`).emit("newMessage", {
          loanId,
          message: populatedMessage,
          from: userName
        });
        console.log('🔔 newMessage emitted to user room', `user_${receiverId}`);
      }
      
    } catch (error) {
      console.error("Error sending message:", error);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  // Handle typing indicators (only for specific loan chat)
  socket.on("typing", ({ loanId }) => {
  console.log('⌨️ typing from', userId, 'in loan', loanId);
  socket.to(`loan_${loanId}`).emit("userTyping", { 
      userId, 
      userName,
      loanId 
    });
  });

  socket.on("stopTyping", ({ loanId }) => {
  console.log('⌨️ stopTyping from', userId, 'in loan', loanId);
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
    
    // Get all rooms this socket was in to notify other users
    const rooms = Array.from(socket.rooms);
    
    // Notify other users in loan chat rooms that this user went offline
    rooms.forEach(room => {
      if (room.startsWith('loan_')) {
        socket.to(room).emit("userOffline", { userId, userName });
        socket.to(room).emit("stopTyping", { userId, userName }); // Clear typing indicators
      }
    });
    
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
