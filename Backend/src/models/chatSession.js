import mongoose from "mongoose";

const chatSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  filters: { type: mongoose.Schema.Types.Mixed, default: {} },
  memorySummary: { type: String, default: "" },
  lastSeen: { type: Date, default: Date.now },
  expiresAt: { type: Date }
}, { timestamps: true });

export const ChatSession = mongoose.model("ChatSession", chatSessionSchema);
