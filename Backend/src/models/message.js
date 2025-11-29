import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },
  meta: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: () => new Date(), index: true }
}, { versionKey: false });

export const Message = mongoose.model('Message', MessageSchema);
