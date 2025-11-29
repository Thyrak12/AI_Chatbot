import { aiClient } from "../config/genai.js";
import { Product } from "../models/product.js";

// Helper: extract any textual output from model response (robust to different shapes)
function extractTextFromModelResponse(response) {
  let text = "";

  try {
    // Common shape: { candidates: [ { content: [ { type, text } ] } ] }
    if (response?.candidates && Array.isArray(response.candidates)) {
      for (const cand of response.candidates) {
        if (cand?.content) {
          const contentArray = Array.isArray(cand.content) ? cand.content : [cand.content];
          for (const item of contentArray) {
            if (!item) continue;
            if (typeof item === "string") text += item;
            else if (item.text) text += item.text;
            else if (item.type === "output_text" && item.text) text += item.text;
          }
        }
        // older/alternate sdk shapes
        if (cand?.message?.content) {
          const content = Array.isArray(cand.message.content) ? cand.message.content : [cand.message.content];
          for (const it of content) if (it?.text) text += it.text;
        }
        if (cand?.outputText) text += cand.outputText;
      }
    }

    // Another common shape: { output: [ { content: [ { text } ] } ] }
    if (!text && response?.output && Array.isArray(response.output)) {
      for (const out of response.output) {
        if (out?.content) {
          const arr = Array.isArray(out.content) ? out.content : [out.content];
          for (const it of arr) if (it?.text) text += it.text;
        }
        if (out?.text) text += out.text;
      }
    }

    // Fallbacks
    if (!text && typeof response === "string") text = response;
    if (!text && response?.text) text = response.text;
  } catch (err) {
    console.error("Error extracting text from model response:", err);
  }

  return text.trim();
}
// Detect intent and keywords from the message
export async function detectIntent(userMsg) {
  try {
    const response = await aiClient.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
        You are an intent detection engine.
        Analyze this user message: "${userMsg}"
        Extract ONLY JSON in this format:
        {
          "intent": "product_search | greet | unknown",
          "keywords": ["keyword1", "keyword2"]
        }
      `,
    });

    // Extract text robustly from the model response
    const text = extractTextFromModelResponse(response);
    if (!text) {
      console.error("AI detectIntent: no text extracted from response", JSON.stringify(response));
      return { intent: "unknown", keywords: [] };
    }

    // Parse JSON safely
    try {
      return JSON.parse(text);
    } catch (err) {
      console.error("AI Parse/Error:", err, "Raw text:", text);
      return { intent: "unknown", keywords: [] };
    }

  } catch (err) {
    console.error("AI detectIntent error:", err);
    return { intent: "unknown", keywords: [] };
  }
}

// Generate friendly AI response
export async function generateResponse(userMsg, data = {}) {
  try {
    const response = await aiClient.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
        You are a friendly assistant.
        User message: "${userMsg}"
        Data: ${JSON.stringify(data)}
        Generate a helpful and conversational response.
      `,
    });

    // Extract text robustly from the model response
    let aiText = extractTextFromModelResponse(response);
    if (!aiText) {
      console.error("AI generateResponse: no text extracted from response", JSON.stringify(response));
      aiText = "Sorry, I cannot respond right now.";
    }
    return aiText;

  } catch (err) {
    console.error("AI generateResponse error:", err);
    return "Sorry, I cannot respond right now.";
  }
}

// Check rules and fetch data from MongoDB
export async function checkRules(userMsg) {
  // Simple keyword-based rule: product search
  if (/product|menu|item|price/i.test(userMsg)) {
    const products = await Product.find().lean();
    return { intent: "product_search", data: products };
  }
  return null; // no rule matched
}

// Main handler for a user message
export async function handleChat(userMsg) {
  // 1️⃣ Check rules first
  const ruleResult = await checkRules(userMsg);
  if (ruleResult) {
    // Use AI to generate a friendly message including the product data
    return await generateResponse(userMsg, ruleResult.data);
  }

  // 2️⃣ If no rule matched, use AI to detect intent and respond
  const aiIntent = await detectIntent(userMsg);

  if (aiIntent.intent === "product_search") {
    const products = await Product.find().lean();
    return await generateResponse(userMsg, products);
  }

  // 3️⃣ Default: AI generates response without DB
  return await generateResponse(userMsg);
}
