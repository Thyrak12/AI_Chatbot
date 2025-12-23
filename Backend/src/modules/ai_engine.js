// ==========================
// ai_engine.js (DeepSeek)
// ==========================
import { aiClient, DEEPSEEK_MODEL } from "../config/deepseek.js";

/**
 * Clean markdown formatting from response for plain text display
 */
function cleanMarkdown(text) {
  if (!text) return text;
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')      // **bold** → bold
    .replace(/\*(.+?)\*/g, '$1')          // *italic* → italic
    .replace(/__(.+?)__/g, '$1')          // __bold__ → bold
    .replace(/_(.+?)_/g, '$1')            // _italic_ → italic
    .replace(/#{1,6}\s?(.+)/g, '$1')      // # headers → text
    .replace(/`(.+?)`/g, '$1')            // `code` → code
    .replace(/```[\s\S]*?```/g, '')       // ```code blocks``` → remove
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')   // [link](url) → link
    .replace(/^\s*[-*+]\s+/gm, '• ')      // - list → • list
    .replace(/^\s*\d+\.\s+/gm, '')        // 1. numbered list → just text
    .trim();
}

/**
 * Clean and normalize restaurant name from user input
 * Handles: "KFC's" -> "KFC", "the KFC" -> "KFC"
 */
function normalizeRestaurantName(name) {
  if (!name) return name;
  return name
    .replace(/'s\b/gi, '')              // Remove possessive 's
    .replace(/^(?:the|a|an)\s+/gi, '')  // Remove leading articles
    .replace(/\s*(menu|food|restaurant|place|hours|opening hours|'s)\s*/gi, '') // Remove common suffixes
    .trim();
}

/**
 * Fast keyword-based intent detection
 */
function detectIntentByKeyword(userMessage) {
  const lower = userMessage.toLowerCase();

  // "Open now" queries - highest priority
  if (["open now", "open right now", "currently open", "still open", "is open", "are open"].some(k => lower.includes(k))) {
    // Check if asking about specific restaurant
    const restaurantMatch = userMessage.match(/(?:is|are)\s+(.+?)\s+(?:open|still open)/i) ||
                           userMessage.match(/(.+?)\s+(?:open now|currently open|still open)/i);
    
    if (restaurantMatch && restaurantMatch[1]) {
      const name = normalizeRestaurantName(restaurantMatch[1]);
      if (name && !["what", "which", "any", "some", "restaurants", "it", "they"].includes(name.toLowerCase())) {
        return { intents: [{ target: "is_open_now", filters: { restaurantName: name }, limit: 1 }] };
      }
    }
    
    // General "what's open now" query
    return { intents: [{ target: "open_now", filters: {}, limit: 10 }] };
  }

  // "Open at" specific time queries
  const openAtMatch = lower.match(/open\s+(?:at|around|by)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (openAtMatch) {
    let hour = parseInt(openAtMatch[1]);
    const minutes = openAtMatch[2] || "00";
    const ampm = openAtMatch[3]?.toLowerCase();
    
    if (ampm === "pm" && hour !== 12) hour += 12;
    if (ampm === "am" && hour === 12) hour = 0;
    
    const time = `${hour.toString().padStart(2, "0")}:${minutes}`;
    return { intents: [{ target: "open_at", filters: { time }, limit: 10 }] };
  }

  if (["recommend", "suggest", "best restaurant", "near me"].some(k => lower.includes(k))) {
    return { intents: [{ target: "restaurant", filters: {}, limit: 5 }] };
  }

  if (["promotion", "deal", "discount", "offer", "sale", "happy hour"].some(k => lower.includes(k))) {
    return { intents: [{ target: "promotion", filters: {}, limit: 10 }] };
  }

  // Menu queries with restaurant name detection
  if (["menu", "dishes", "food", "drinks", "specials", "what do they serve", "what do they have"].some(k => lower.includes(k))) {
    const filters = {};
    
    // Try to extract restaurant name - multiple patterns
    const namePatterns = [
      /(.+?)'s\s+menu/i,                                    // "KFC's menu"
      /(?:show|get|what's|what is|see)\s+(?:me\s+)?(?:the\s+)?(.+?)\s*(?:'s\s+)?(?:menu|dishes|food)/i,
      /menu\s+(?:at|of|for|from)\s+(?:the\s+)?(.+)/i,
      /what\s+(?:does|do)\s+(.+?)\s+(?:have|serve|offer)/i,
      /(.+?)\s+menu\b/i                                     // "KFC menu"
    ];
    
    for (const pattern of namePatterns) {
      const match = userMessage.match(pattern);
      if (match && match[1]) {
        const name = normalizeRestaurantName(match[1].trim().replace(/[?.!]+$/, ""));
        if (name && name.length > 1 && !["show", "the", "me", "what", "get", "see"].includes(name.toLowerCase())) {
          filters.restaurantName = name;
          break;
        }
      }
    }
    
    return { intents: [{ target: "menu", filters, limit: 20 }] };
  }

  // Opening hours intent
  if (["opening hours", "opening hour", "hours", "open at", "close at", "what time", "when does"].some(k => lower.includes(k))) {
    const filters = {};

    // Multiple patterns to catch different phrasings
    const namePatterns = [
      /(.+?)'s\s+(?:opening\s+)?hours/i,                    // "KFC's hours" or "KFC's opening hours"
      /(?:opening\s+hours?|hours?)\s+(?:of|for|at)\s+(?:the\s+)?(.+)/i,
      /(?:what\s+are|show\s+me|tell\s+me|give\s+me)\s+(?:the\s+)?(.+?)\s*(?:'s\s+)?(?:opening\s+hours?|hours?)/i,
      /(?:what\s+time\s+does|when\s+does|when\s+is)\s+(?:the\s+)?(.+?)\s+(?:open|close)/i,
      /(.+?)\s+(?:opening\s+hours?|hours)/i
    ];

    for (const pattern of namePatterns) {
      const match = userMessage.match(pattern);
      if (match && match[1]) {
        const cleaned = normalizeRestaurantName(match[1].trim().replace(/[?,!.\s]+$/, ""));
        
        if (cleaned && cleaned.length > 1 && !["what", "show", "tell", "give", "me", "the", "their"].includes(cleaned.toLowerCase())) {
          filters.restaurantName = cleaned;
          break;
        }
      }
    }

    return { intents: [{ target: "opening_hours", filters, limit: 5 }] };
  }

  // Price tier queries with specific tier detection
  if (["price", "cheap", "expensive", "cost", "budget", "luxury", "affordable", "mid-range", "premium"].some(k => lower.includes(k))) {
    const filters = {};
    
    if (lower.includes("cheap") || lower.includes("budget") || lower.includes("affordable")) {
      filters.priceTier = "BUDGET";
    } else if (lower.includes("luxury") || lower.includes("expensive") || lower.includes("high-end")) {
      filters.priceTier = "LUXURY";
    } else if (lower.includes("premium")) {
      filters.priceTier = "PREMIUM";
    } else if (lower.includes("mid-range") || lower.includes("moderate")) {
      filters.priceTier = "MID_RANGE";
    }
    
    // If price tier filter is set, also search for restaurants
    if (filters.priceTier) {
      return { intents: [{ target: "restaurant", filters, limit: 10 }] };
    }
    
    return { intents: [{ target: "price_tier", filters: {}, limit: 5 }] };
  }

  // Cuisine/type specific queries
  const cuisinePatterns = {
    "fast food": { type: "fast_food" },
    "coffee": { type: "cafe" },
    "cafe": { type: "cafe" },
    "fine dining": { type: "fine_dining" },
    "street food": { type: "street_food" },
    "chinese": { cuisine: "Chinese" },
    "japanese": { cuisine: "Japanese" },
    "italian": { cuisine: "Italian" },
    "western": { cuisine: "Western" },
    "cambodian": { cuisine: "Cambodian" },
    "seafood": { cuisine: "Seafood" },
    "pizza": { category: "Pizza" },
    "burger": { category: "Burger" },
    "hot pot": { category: "Hot Pot" },
    "buffet": { category: "Buffet" },
    "steak": { cuisine: "Steakhouse" }
  };
  
  for (const [keyword, filters] of Object.entries(cuisinePatterns)) {
    if (lower.includes(keyword)) {
      return { intents: [{ target: "restaurant", filters, limit: 10 }] };
    }
  }

  // Ambience queries - comprehensive environment/atmosphere detection
  const ambienceKeywords = {
    // Romantic & Date
    "romantic": "romantic",
    "date": "romantic",
    "anniversary": "romantic",
    "couples": "romantic",
    "valentine": "romantic",
    
    // Quiet & Peaceful
    "quiet": "quiet",
    "peaceful": "quiet",
    "calm": "quiet",
    "relaxing": "quiet",
    "tranquil": "quiet",
    
    // Family
    "family": "family-friendly",
    "kids": "family-friendly",
    "children": "family-friendly",
    "family-friendly": "family-friendly",
    
    // Casual & Relaxed
    "casual": "casual",
    "relaxed": "casual",
    "informal": "casual",
    "chill": "casual",
    "laid-back": "casual",
    
    // Lively & Social
    "lively": "lively",
    "vibrant": "lively",
    "energetic": "lively",
    "bustling": "lively",
    "fun": "lively",
    "party": "festive",
    "celebration": "festive",
    "birthday": "festive",
    "festive": "festive",
    
    // Elegant & Upscale
    "elegant": "elegant",
    "fancy": "elegant",
    "classy": "elegant",
    "sophisticated": "elegant",
    "upscale": "upscale",
    "luxurious": "upscale",
    "high-end": "upscale",
    "posh": "upscale",
    
    // Cozy & Intimate
    "cozy": "cozy",
    "warm": "cozy",
    "comfortable": "cozy",
    "intimate": "intimate",
    "private": "intimate",
    
    // Work & Business
    "work": "work-friendly",
    "laptop": "work-friendly",
    "study": "work-friendly",
    "wifi": "work-friendly",
    "remote work": "work-friendly",
    "business": "business-friendly",
    "meeting": "business-friendly",
    "corporate": "business-friendly",
    
    // Outdoor & Scenic
    "outdoor": "outdoor",
    "terrace": "outdoor",
    "garden": "outdoor",
    "patio": "outdoor",
    "rooftop": "outdoor",
    "scenic": "scenic",
    "view": "scenic",
    "beautiful view": "scenic",
    
    // Modern & Traditional
    "modern": "modern",
    "trendy": "modern",
    "contemporary": "modern",
    "hipster": "modern",
    "traditional": "traditional",
    "classic": "traditional",
    "authentic": "local-vibe",
    "local": "local-vibe",
    
    // Instagram & Aesthetic
    "instagram": "instagram-worthy",
    "instagrammable": "instagram-worthy",
    "aesthetic": "instagram-worthy",
    "photogenic": "instagram-worthy",
    "photo": "instagram-worthy",
    
    // Interactive
    "interactive": "interactive",
    "diy": "interactive",
    "cook yourself": "interactive",
    "bbq": "interactive",
    
    // Quick Service
    "quick": "quick-service",
    "fast": "quick-service",
    "grab and go": "quick-service",
    "takeaway": "quick-service"
  };

  // Check for ambience matches
  const matchedAmbience = [];
  for (const [keyword, ambience] of Object.entries(ambienceKeywords)) {
    if (lower.includes(keyword)) {
      if (!matchedAmbience.includes(ambience)) {
        matchedAmbience.push(ambience);
      }
    }
  }
  
  // Also check for private room request
  const wantsPrivateRoom = lower.includes("private room") || lower.includes("private dining");
  
  if (matchedAmbience.length > 0 || wantsPrivateRoom) {
    const filters = {};
    if (matchedAmbience.length > 0) {
      // Use first matched ambience or multiple if needed
      filters.ambience = matchedAmbience.length === 1 ? matchedAmbience[0] : matchedAmbience;
    }
    if (wantsPrivateRoom) {
      filters.hasPrivateRooms = true;
    }
    return { intents: [{ target: "restaurant", filters, limit: 10 }] };
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
    return "Sorry, I couldn't find what you're looking for. Try asking about a specific restaurant, menu, or promotion!";
  }

  const prompt = `
You are a friendly and helpful restaurant assistant chatbot for Cambodia.

Rules:
1. Respond naturally like a helpful local friend who knows restaurants well
2. NEVER mention "database", "results", "data", "records", "query", or any technical terms
3. Do NOT use any markdown formatting (no **, ##, or * bullets)
4. Use plain text with line breaks and dashes (-) for lists
5. Be conversational and warm, not robotic
6. If sharing restaurant info, present it naturally like you personally know these places

User asked: ${userMsg}

Here is the information to help answer (present this naturally, don't mention it's from anywhere):
${JSON.stringify(allResults.slice(0, 15), null, 2)}
`;

  try {
    const completion = await aiClient.chat.completions.create({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: "You are a friendly local restaurant expert in Cambodia. Chat naturally like a helpful friend. Never mention databases, data, records, or technical terms. Use plain text only, no markdown." },
        { role: "user", content: prompt }
      ]
    });

    const text = completion.choices[0].message.content.trim();
    if (text) return cleanMarkdown(text);
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

/**
 * generateResponseWithHistory
 * Generates response with conversation context for multi-turn dialogue
 */
export async function generateResponseWithHistory(userMsg, queryPlan, dbResults, history = []) {
  const allResults = dbResults.flatMap(r =>
    Array.isArray(r.result) ? r.result : []
  );

  // Build conversation history context
  const historyContext = history.map(msg => ({
    role: msg.role,
    content: msg.content
  }));

  const prompt = `
You are a friendly and knowledgeable restaurant assistant for Cambodia. You help people discover great places to eat!

Rules:
1. Respond naturally like a helpful local friend who knows all the best spots
2. NEVER mention "database", "results", "data", "records", "query", "system", or any technical terms
3. Do NOT use any markdown formatting (no **, ##, or * bullets)
4. Use plain text with line breaks and dashes (-) for lists
5. Be warm, conversational, and enthusiastic about food
6. Present information as if you personally know these restaurants
7. For opening hours, tell them clearly if a place is open or closed
8. For menus, share items and prices in a friendly way
9. For promotions, get them excited about the deals!
10. Keep responses helpful but not too long

User asked: ${userMsg}

Here is the information to share naturally:
${JSON.stringify(allResults.slice(0, 15), null, 2)}
`;

  try {
    // Build messages array with history for context
    const messages = [
      { role: "system", content: "You are a friendly local restaurant expert in Cambodia. Chat naturally like a helpful friend. Never mention databases, data, records, or technical terms. Use plain text only, no markdown. Be warm and conversational." },
      ...historyContext.slice(-4), // Last 4 messages for context
      { role: "user", content: prompt }
    ];

    const completion = await aiClient.chat.completions.create({
      model: DEEPSEEK_MODEL,
      messages
    });

    const text = completion.choices[0].message.content.trim();
    if (text) return cleanMarkdown(text);
  } catch (err) {
    console.warn("DeepSeek response generation with history failed:", err.message);
  }

  // 🔁 Fallback (non-AI)
  if (!allResults.length) {
    return "No results found for your request.";
  }
  
  return allResults.slice(0, 10).map(item => {
    // Handle "is open now" results
    if (item?.message) return item.message;
    
    const name = item?.name || item?.title || "(no name)";
    const price =
      item?.price != null
        ? `$${Number(item.price).toFixed(2)}`
        : item?.discountPercent != null
        ? `${item.discountPercent}% off`
        : "";
    const hours = item?.todayHours 
      ? ` (Today: ${item.todayHours.open} - ${item.todayHours.close})`
      : "";

    return `- ${name}${price ? ": " + price : ""}${hours}`;
  }).join("\n");
}

export default {
  detectMessage,
  executeQueryGraph,
  generateResponse,
  generateResponseWithHistory
};
