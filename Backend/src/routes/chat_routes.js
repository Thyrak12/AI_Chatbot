// src/routes/chat_routes.js
import express from "express";
import { chatHandler } from "../controllers/chat_controller.js";

const router = express.Router();
router.post("/chat", chatHandler);

export default router;
