import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema({
  loanId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Loan", 
    required: true 
  },
  senderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  receiverId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  message: { 
    type: String, 
    required: true 
  },
  messageType: { 
    type: String, 
    enum: ["text", "image", "file"], 
    default: "text" 
  },
  isRead: { 
    type: Boolean, 
    default: false 
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
}, { timestamps: true });

// Create compound index for efficient queries
chatMessageSchema.index({ loanId: 1, timestamp: 1 });
chatMessageSchema.index({ senderId: 1, receiverId: 1 });

const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);
export default ChatMessage;
