import express from "express";
import { chatHandler, createSession } from "../controllers/chat_controller.js";

const router = express.Router();

// Chat message endpoint
router.post("/chat", chatHandler);

// Create session endpoint
router.post("/session", createSession);

export default router;
