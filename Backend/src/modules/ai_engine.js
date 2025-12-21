// ==========================
// ai_engine.js (DeepSeek)
// ==========================
import { aiClient, DEEPSEEK_MODEL } from "../config/deepseek.js";

/**
 * Fast keyword-based intent detection
 */
function detectIntentByKeyword(userMessage) {
  const lower = userMessage.toLowerCase();

  if (["recommend", "suggest", "best restaurant", "near me"].some(k => lower.includes(k))) {
    return { intents: [{ target: "restaurant", filters: {}, limit: 5 }] };
  }

  if (["promotion", "deal", "discount", "offer", "sale", "happy hour"].some(k => lower.includes(k))) {
    return { intents: [{ target: "promotion", filters: {}, limit: 10 }] };
  }

  if (["menu", "dishes", "food", "drinks", "specials"].some(k => lower.includes(k))) {
    return { intents: [{ target: "menu", filters: {}, limit: 20 }] };
  }

  // Opening hours intent
  if (["opening hours", "opening hour", "hours", "open at", "close at"].some(k => lower.includes(k))) {
    const filters = {};

    const nameMatch = userMessage.match(
      /(?:show\s+me|tell\s+me|what\s+are|give\s+me)?\s*([^\n?!.]*?)\s*(?:opening\s+hours?|hours?)/i
    );

    if (nameMatch?.[1]) {
      const cleaned = nameMatch[1]
        .trim()
        .replace(/^(?:the\s+|their\s+)/i, "")
        .replace(/[.,\s]+$/, "")
        .trim();

      if (cleaned) filters.restaurantName = cleaned;
    }

    return { intents: [{ target: "opening_hours", filters, limit: 5 }] };
  }

  if (["price", "cheap", "expensive", "cost", "budget", "luxury"].some(k => lower.includes(k))) {
    return { intents: [{ target: "price_tier", filters: {}, limit: 5 }] };
  }

  return null; // fallback to LLM
}

/**
 * detectMessage
 * Hybrid: keyword first, DeepSeek fallback
 */
export async function detectMessage(userMessage) {
  // 1️⃣ Keyword detection (FAST)
  const keywordIntents = detectIntentByKeyword(userMessage);
  if (keywordIntents) return keywordIntents;

  // 2️⃣ DeepSeek detection
  const prompt = `
You are a restaurant assistant.
Map the user's message to JSON intents.

Return ONLY valid JSON in this EXACT schema:

{
  "intents": [
    {
      "target": "restaurant|menu|promotion|opening_hours|price_tier",
      "filters": {},
      "limit": 20
    }
  ]
}

Include "restaurantName" in filters if mentioned.

User message:
"${userMessage}"
`;

  try {
    const completion = await aiClient.chat.completions.create({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: "You output JSON only." },
        { role: "user", content: prompt }
      ]
    });

    let text = completion.choices[0].message.content.trim();

    // Safety: extract JSON if model adds text
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1) {
      text = text.slice(start, end + 1);
    }

    const json = JSON.parse(text);

    if (!Array.isArray(json.intents)) {
      return { intents: [] };
    }

    const intents = json.intents.map(i => ({
      target: i.target,
      filters: typeof i.filters === "object" ? i.filters : {},
      limit: typeof i.limit === "number" ? i.limit : 20
    }));

    return { intents };
  } catch (err) {
    console.warn("DeepSeek intent detection failed:", err.message);
    return { intents: [] };
  }
}

/**
 * executeQueryGraph
 */
export async function executeQueryGraph(intents, queryFn) {
  const results = [];

  for (const intent of intents) {
    const result = await queryFn(intent);
    results.push({ intent, result });
  }

  return results;
}

/**
 * generateResponse
 */
export async function generateResponse(userMsg, queryPlan, dbResults) {
  const allResults = dbResults.flatMap(r =>
    Array.isArray(r.result) ? r.result : []
  );

  if (!allResults.length) {
    return "No results found.";
  }

  const prompt = `
You are a friendly restaurant chatbot.
Respond naturally using the database results below.

User message:
${userMsg}

Database results:
${JSON.stringify(dbResults, null, 2)}
`;

  try {
    const completion = await aiClient.chat.completions.create({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: "You are a restaurant assistant." },
        { role: "user", content: prompt }
      ]
    });

    const text = completion.choices[0].message.content.trim();
    if (text) return text;
  } catch (err) {
    console.warn("DeepSeek response generation failed:", err.message);
  }

  // 🔁 Fallback (non-AI)
  return allResults.slice(0, 10).map(item => {
    const name = item?.name || item?.title || "(no name)";
    const price =
      item?.price != null
        ? `$${Number(item.price).toFixed(2)}`
        : item?.discountPercent != null
        ? `${item.discountPercent}% off`
        : "";

    return `- ${name}${price ? ": " + price : ""}`;
  }).join("\n");
}

export default {
  detectMessage,
  executeQueryGraph,
  generateResponse
};
