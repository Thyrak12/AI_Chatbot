import { aiClient } from "../config/genai.js";

/**
 * Extract textual output from a model response.
 * Handles several possible response shapes returned by GenAI SDKs.
 */
function extractTextFromModelResponse(response) {
  let text = "";
  try {
    if (!response) return "";

    // Common: response.candidates[].content[]
    if (Array.isArray(response.candidates)) {
      for (const cand of response.candidates) {
        if (!cand) continue;

        if (cand.content) {
          const arr = Array.isArray(cand.content) ? cand.content : [cand.content];
          for (const it of arr) {
            if (!it) continue;
            if (typeof it === "string") text += it;
            else if (it.text) text += it.text;
            else if (it.type === "output_text" && it.text) text += it.text;
          }
        }

        if (cand.message?.content) {
          const arr = Array.isArray(cand.message.content) ? cand.message.content : [cand.message.content];
          for (const it of arr) if (it?.text) text += it.text;
        }

        if (cand.outputText) text += cand.outputText;
      }
    }

    // Alternate shape
    if (!text && Array.isArray(response.output)) {
      for (const out of response.output) {
        if (out?.content) {
          const arr = Array.isArray(out.content) ? out.content : [out.content];
          for (const it of arr) if (it?.text) text += it.text;
        }
        if (out?.text) text += out.text;
      }
    }

    if (!text && typeof response === "string") text = response;
    if (!text && response?.text) text = response.text;
  } catch (err) {
    console.error("extractTextFromModelResponse error:", err);
  }

  return text.trim();
}


/** Build the prompt sent to the AI for parsing the user's message. */
function buildDetectPrompt(userMsg) {
  const parts = [];
  parts.push("You are a database query parser. Extract database query instructions ONLY in JSON.\n\n");
  parts.push("Collections and fields you can query:\n");
  parts.push("- restaurants: name, type, address, location{lat,lng}, phone, description, cuisine, openingHours, numTables, vipRooms, hasPrivateRooms\n");
  parts.push("  - ambience: [String] (e.g. 'romantic','cozy','lively','quiet','family-friendly')\n");
  parts.push("- menus: restaurant(ObjectId), name, category, price, description, availability, ingredients, tags\n");
  parts.push("- promotions: restaurant(ObjectId), menuItem(ObjectId), title, description, discountPercent, startDate, endDate, conditions, status\n\n");

  parts.push("Return JSON ONLY with this shape:\n");
  parts.push(JSON.stringify({ intent: "string", collection: "restaurants|menus|promotions|none", filters: {}, limit: "number (optional)" }, null, 2));
  parts.push("\n\nNotes:\n- Use Mongo query operators ($lt, $gt, $in, $regex) where useful.\n- For text use case-insensitive regex.\n- Keep filters directly usable with Mongoose .find(filters).\n\n");

  parts.push("Examples:\n");
  parts.push("User: \"Show menu items under $3\" -> {\\\"intent\\\":\\\"menu_search\\\",\\\"collection\\\":\\\"menus\\\",\\\"filters\\\":{ \\\"price\\\": { \\\"$lt\\\": 3 }, \\\"name\\\": { \\\"$regex\\\": \\\"coffee\\\", \\\"$options\\\": \\\"i\\\" } }, \\\"limit\\\": 10 }\n");
  parts.push("User: \"List cafes with private rooms\" -> {\\\"intent\\\":\\\"restaurant_search\\\",\\\"collection\\\":\\\"restaurants\\\",\\\"filters\\\":{ \\\"type\\\":\\\"cafe\\\", \\\"hasPrivateRooms\\\": true }, \\\"limit\\\": 10 }\n");
  parts.push("User: \"I want some restaurant with romantic environment\" -> {\\\"intent\\\":\\\"restaurant_search\\\",\\\"collection\\\":\\\"restaurants\\\",\\\"filters\\\":{ \\\"ambience\\\": { \\\"$in\\\": [\\\"romantic\\\"] } }, \\\"limit\\\": 10 }\n");

  parts.push("User message: \"" + String(userMsg) + "\"\n\nOutput JSON ONLY (no extra text):\n");
  return parts.join("");
}


// Normalize and validate the parsed instruction coming from the AI
function normalizeParsedInstruction(parsed) {
  const allowedCollections = ["restaurants", "menus", "promotions", "none"];
  if (!parsed || typeof parsed !== "object") return { intent: "unknown", collection: "none", filters: {}, limit: 0 };

  const intent = typeof parsed.intent === "string" ? parsed.intent : "unknown";
  const collection = allowedCollections.includes(parsed.collection) ? parsed.collection : "none";

  let filters = parsed.filters && typeof parsed.filters === "object" ? parsed.filters : {};
  if (Array.isArray(filters)) filters = {};

  let limit = 0;
  if (typeof parsed.limit === "number") limit = Math.max(0, Math.floor(parsed.limit));
  else if (typeof parsed.limit === "string" && parsed.limit.match(/^\d+$/)) limit = parseInt(parsed.limit, 10);
  if (limit > 100) limit = 100;

  return { intent, collection, filters, limit };
}


/**
 * Detect intent and database filters from a user message.
 * Returns a normalized object: { intent, collection, filters, limit }.
 */
export async function detectMessage(userMsg) {
  try {
    const prompt = buildDetectPrompt(userMsg);
    const response = await aiClient.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });

    const text = extractTextFromModelResponse(response);
    if (!text) {
      console.error("AI detectMessage: no text extracted from response", JSON.stringify(response));
      return normalizeParsedInstruction(null);
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("AI detectMessage: no JSON found in extracted text", text);
      return normalizeParsedInstruction(null);
    }

    try {
      const parsedRaw = JSON.parse(jsonMatch[0]);
      return normalizeParsedInstruction(parsedRaw);
    } catch (err) {
      console.error("AI detectMessage JSON parse error:", err, "rawText:", text);
      return normalizeParsedInstruction(null);
    }
  } catch (err) {
    console.error("AI detectMessage error:", err);
    return normalizeParsedInstruction(null);
  }
}


// STEP 2 — AI generates natural language response
export async function generateResponse(userMsg, data) {
  const maxRetries = 3;
  let attempt = 0;
  // Prepare a concise, human-readable data summary for the AI prompt so
  // the assistant can mention exact menu names and prices rather than
  // relying on raw JSON which the model might ignore.
  function formatDataForPrompt(d) {
    if (!d) return "";
    // If it's an array of restaurants
    if (Array.isArray(d) && d.length > 0 && d[0].name) {
      const parts = [];
      for (const r of d.slice(0, 20)) {
        const rname = r.name || 'Unknown Restaurant';
        if (Array.isArray(r.matchedSignatureMenus) && r.matchedSignatureMenus.length > 0) {
          const menus = r.matchedSignatureMenus.slice(0, 5).map(m => {
            const price = (typeof m.price === 'number') ? `$${Number(m.price).toFixed(2)}` : (m.price || 'N/A');
            return `${m.name} (${price})`;
          }).join(' ; ');
          parts.push(`${rname} — signature: ${menus}`);
        } else {
          // no matched signature menus attached; include cuisine or short desc
          const extra = r.cuisine ? ` (${r.cuisine})` : '';
          parts.push(`${rname}${extra}`);
        }
      }
      return parts.join('\n');
    }

    // If it's an array of menu items
    if (Array.isArray(d) && d.length > 0 && d[0].name && d[0].price !== undefined) {
      return d.slice(0, 50).map(m => {
        const rname = m.restaurantName || m.restaurant || '';
        const price = (typeof m.price === 'number') ? `$${Number(m.price).toFixed(2)}` : m.price;
        return `${m.name} — ${price}${rname ? ` — ${rname}` : ''}`;
      }).join('\n');
    }

    // Fallback: stringify briefly
    try {
      const txt = JSON.stringify(d);
      return txt.length > 1000 ? txt.slice(0, 1000) + '...' : txt;
    } catch (e) {
      return String(d);
    }
  }

  const formattedData = formatDataForPrompt(data || []);
  const prompt = `User asked: "${userMsg}"\n\nRelevant database results (short):\n${formattedData || 'No results found.'}\n\nUsing only the information above, answer the user clearly and mention menu names and prices when appropriate.`;

  while (attempt < maxRetries) {
    try {
      attempt += 1;
      const response = await aiClient.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
      const text = extractTextFromModelResponse(response);
      if (!text) {
        console.error("AI generateResponse: no text extracted from response", JSON.stringify(response));
        return "Sorry, I couldn't generate a response.";
      }
      return text;
    } catch (err) {
      const statusCode = err?.status || err?.error?.code || err?.code || (err?.response && err.response.status);
      // If model overloaded (503) or service unavailable, retry with exponential backoff
      if ((statusCode === 503 || statusCode === 429) && attempt < maxRetries) {
        const delay = 500 * Math.pow(2, attempt - 1); // 500ms, 1000ms, 2000ms
        console.warn(`AI generateResponse attempt ${attempt} failed with status ${statusCode}. Retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      console.error("AI generateResponse error:", err);
      return "Sorry, I couldn't generate a response.";
    }
  }

  // If loop exits without returning, give friendly fallback
  return "Sorry, I couldn't generate a response right now. Please try again later.";
}
