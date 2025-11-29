// src/services/chatbot_service.js
import { handleRules } from "../modules/rule_engine.js";
import { detectIntent, generateResponse } from "../modules/ai_engine.js";

export async function handleChat(userMsg) {
  let botReply = "";

  // 1️⃣ Check rules first
  const ruleReply = await handleRules(userMsg);

  if (ruleReply) {
    // If rule returns product list (array), pass to AI for friendly response
    const data = Array.isArray(ruleReply) ? { products: ruleReply } : { text: ruleReply };
    botReply = await generateResponse(userMsg, data);
  } else {
    // 2️⃣ AI handles unknown messages
    const aiIntent = await detectIntent(userMsg);
    let data = {};

    if (aiIntent.required_data === "products") {
      const products = await handleRules("product"); // reuse rule to fetch products
      data = { products };
    }

    botReply = await generateResponse(userMsg, data);
  }

  return botReply;
}
