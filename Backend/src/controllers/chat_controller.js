// src/controllers/chat_controller.js
import { handleChat } from "../services/chatbot_service.js";
import crypto from "crypto";

function generateSessionId() {
  try {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch (e) {
    // ignore
  }
  return crypto.randomBytes(16).toString('hex');
}

export async function chatHandler(req, res) {
  try {
    const { message, sessionId: incomingSessionId } = req.body;
    const sessionId = incomingSessionId || generateSessionId();

    const reply = await handleChat(message, sessionId);

    // Always return a consistent shape
    return res.json({ response: reply ?? '', sessionId });
  } catch (err) {
    console.error('Chat handler error:', err);
    res.status(500).json({ error: 'Server Error' });
  }
}

export async function createSession(req, res) {
  try {
    const sessionId = generateSessionId();
    return res.json({ sessionId });
  } catch (err) {
    console.error('createSession error:', err);
    res.status(500).json({ error: 'Could not create session' });
  }
}
