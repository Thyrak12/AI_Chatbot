// src/controllers/chat_controller.js
import { handleChat } from "../services/chatbot_service.js";

export async function chatHandler(req, res) {
  try {
    const { message } = req.body;
    const reply = await handleChat(message);
    res.json({ response: reply });
  } catch (err) {
    console.error("Chat handler error:", err);
    res.status(500).json({ error: "Server Error" });
  }
}
