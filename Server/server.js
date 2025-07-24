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
import ChatMessage from "./models/chatModel.js";
import Loan from "./models/loanModel.js";
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

// Global request logger - Log ALL incoming requests
app.use((req, res, next) => {
  console.log(`🌐 GLOBAL: ${req.method} ${req.originalUrl} from ${req.ip}`);
  console.log(`🌐 Headers:`, {
    authorization: req.headers.authorization ? 'Bearer ***' : 'None',
    'content-type': req.headers['content-type'],
    'user-agent': req.headers['user-agent']?.substring(0, 50) + '...'
  });
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`🌐 Body:`, req.body);
  }
  next();
});

// Connect DB
connectDB();

// Routes
app.use("/api/loans", loanRoutes);
app.use("/api/users", userRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/chat", chatRoutes);

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
    const userId = decodedToken.uid;
    const userName = decodedToken.name || decodedToken.email;
    const email = decodedToken.email;

    socket.userId = userId;
    socket.userName = userName;
    socket.email = email;
    
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
      const loan = await Loan.findById(loanId);
      if (!loan || !loan.funded) {
        socket.emit("error", { message: "Unauthorized or loan not funded" });
        return;
      }

      if (loan.borrowerId.toString() !== userId && loan.lenderId?.toString() !== userId) {
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
      const loan = await Loan.findById(loanId);
      if (!loan || !loan.funded) {
        socket.emit("error", { message: "Unauthorized or loan not funded" });
        return;
      }

      if (loan.borrowerId.toString() !== userId && loan.lenderId?.toString() !== userId) {
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
