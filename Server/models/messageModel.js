import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  loanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan' },
  text: String,
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model('Message', messageSchema);
