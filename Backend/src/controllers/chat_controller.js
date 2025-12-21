// controllers/chat_controller.js
import { handleChat } from "../services/chatbot_service.js";
import crypto from "crypto";

function generateSessionId() {
  try { 
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID(); 
  } catch (e) {}
  return crypto.randomBytes(16).toString('hex');
}

// REST API handler for chat messages
export async function chatHandler(req, res) {
  try {
    const { message, sessionId: incomingSessionId } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });

    const sessionId = incomingSessionId || generateSessionId();

    // ✅ handleChat now returns { detectedIntents, response }
    const reply = await handleChat(message, sessionId);

    // Extract the response text
    const text = reply?.response ?? "";

    // Send JSON including sessionId and detected intents if needed
    return res.json({
      response: text,
      sessionId,
      detectedIntents: reply?.detectedIntents || null
    });
  } catch (err) {
    console.error('chatHandler error:', err);
    return res.status(500).json({ error: 'Server Error' });
  }
}

// REST API to create a new session
export async function createSession(req, res) {
  try {
    const sessionId = generateSessionId();
    return res.json({ sessionId });
  } catch (err) {
    console.error('createSession error:', err);
    return res.status(500).json({ error: 'Could not create session' });
  }
}
