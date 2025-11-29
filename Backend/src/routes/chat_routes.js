// src/routes/chat_routes.js
import express from "express";
import { chatHandler, createSession } from "../controllers/chat_controller.js";

const router = express.Router();
router.post("/chat", chatHandler);
router.get("/session", createSession);

export default router;

