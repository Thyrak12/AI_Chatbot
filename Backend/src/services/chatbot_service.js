// ==========================
// chatbot_service.js
// ==========================
import aiEngine from "../modules/ai_engine.js";
import restaurantService from "./restaurant_service.js";
import menuService from "./menu_service.js";
import promotionService from "./promotion_service.js";
import openingHourService from "./open_hour_service.js";
import priceTierService from "./price_tier_service.js";
import { ChatSession } from "../models/chatSession.js";
import { Message } from "../models/message.js";

/**
 * In-memory session cache for quick access
 */
const sessionCache = new Map();

/**
 * Get or create session
 */
async function getOrCreateSession(sessionId) {
  // Check cache first
  if (sessionCache.has(sessionId)) {
    return sessionCache.get(sessionId);
  }
  
  // Check database
  let session = await ChatSession.findOne({ sessionId }).lean();
  
  if (!session) {
    // Create new session
    session = await ChatSession.create({
      sessionId,
      filters: {},
      memorySummary: "",
      lastSeen: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });
    session = session.toObject();
  }
  
  // Cache it
  sessionCache.set(sessionId, session);
  return session;
}

/**
 * Update session context
 */
async function updateSession(sessionId, updates) {
  const session = await ChatSession.findOneAndUpdate(
    { sessionId },
    { 
      ...updates, 
      lastSeen: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    },
    { new: true, upsert: true }
  ).lean();
  
  sessionCache.set(sessionId, session);
  return session;
}

/**
 * Save message to history
 */
async function saveMessage(sessionId, role, content, meta = {}) {
  return Message.create({ sessionId, role, content, meta });
}

/**
 * Get recent conversation history
 */
async function getRecentHistory(sessionId, limit = 6) {
  return Message.find({ sessionId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()
    .then(msgs => msgs.reverse());
}

/**
 * Map intent → DB queries
 */
async function queryIntent(intent) {
  const { target, filters, limit } = intent;

  try {
    switch (target) {
      case "restaurant":
        return restaurantService.findRestaurants(filters, limit);
      
      case "menu":
        return filters.restaurantName
          ? menuService.getFullMenuForRestaurant(filters.restaurantName, limit)
          : menuService.findMenus(filters, limit);
      
      case "promotion":
        return promotionService.findPromotions(filters, limit);
      
      case "opening_hours":
        return filters.restaurantName
          ? openingHourService.getOpeningHours(filters.restaurantName)
          : openingHourService.findOpeningHours(filters, limit);
      
      case "price_tier":
        return priceTierService.findPriceTier(filters, limit);
      
      // NEW: Check if specific restaurant is open now
      case "is_open_now":
        if (filters.restaurantName) {
          const result = await openingHourService.isRestaurantOpenNow(filters.restaurantName);
          return [result];
        }
        return [];
      
      // NEW: Find all restaurants open now
      case "open_now":
        return openingHourService.findOpenNowRestaurants(filters, limit);
      
      // NEW: Find restaurants open at specific time
      case "open_at":
        const { dayOfWeek } = openingHourService.getCambodiaTime();
        return openingHourService.findRestaurantsOpenAt(
          filters.dayOfWeek || dayOfWeek, 
          filters.time, 
          filters, 
          limit
        );
      
      default:
        return [];
    }
  } catch (e) {
    console.error("DB query failed:", e);
    return [];
  }
}

/**
 * Main handler
 */
export async function handleChat(userMsg) {
  // 1️⃣ Detect intents
  let parsed;
  try {
    parsed = await aiEngine.detectMessage(userMsg);
  } catch (err) {
    console.warn("Intent detection failed:", err);
    parsed = { intents: [] };
  }

  console.log("Detected intents:", JSON.stringify(parsed, null, 2));

  // 2️⃣ Query DB
  let dbResults = [];
  try {
    dbResults = await aiEngine.executeQueryGraph(parsed.intents, queryIntent);
  } catch (err) {
    console.warn("DB query failed:", err);
    dbResults = [];
  }

  console.log("DB Results:", JSON.stringify(dbResults, null, 2));

  // 3️⃣ Generate AI response (or fallback)
  let aiText = "";
  try {
    aiText = await aiEngine.generateResponse(userMsg, parsed, dbResults);
  } catch (err) {
    console.warn("Response generation failed:", err);
  }

  if (!aiText || !aiText.trim()) {
    const flat = dbResults.flatMap(r => Array.isArray(r.result) ? r.result : []);
    aiText = flat.length
      ? flat.slice(0, 10).map(r => r.name || "(no name)").join("\n")
      : "No data found for your request.";
  }

  return {
    detectedIntents: parsed,
    response: aiText
  };
}

/**
 * Main handler with session support
 */
export async function handleChatWithSession(userMsg, sessionId) {
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // 1️⃣ Get session and history
  const session = await getOrCreateSession(sessionId);
  const history = await getRecentHistory(sessionId, 6);
  
  // 2️⃣ Save user message
  await saveMessage(sessionId, "user", userMsg);
  
  // 3️⃣ Detect intents (with context awareness)
  let parsed;
  try {
    parsed = await aiEngine.detectMessage(userMsg, session.filters);
  } catch (err) {
    console.warn("Intent detection failed:", err);
    parsed = { intents: [] };
  }

  console.log("Detected intents:", JSON.stringify(parsed, null, 2));

  // 4️⃣ Merge session filters with detected filters
  if (parsed.intents.length > 0) {
    parsed.intents = parsed.intents.map(intent => ({
      ...intent,
      filters: { ...session.filters, ...intent.filters }
    }));
  }

  // 5️⃣ Query DB
  let dbResults = [];
  try {
    dbResults = await aiEngine.executeQueryGraph(parsed.intents, queryIntent);
  } catch (err) {
    console.warn("DB query failed:", err);
    dbResults = [];
  }

  console.log("DB Results:", JSON.stringify(dbResults, null, 2));

  // 6️⃣ Generate AI response with conversation context
  let aiText = "";
  try {
    aiText = await aiEngine.generateResponseWithHistory(userMsg, parsed, dbResults, history);
  } catch (err) {
    console.warn("Response generation failed:", err);
    // Fallback to basic response
    try {
      aiText = await aiEngine.generateResponse(userMsg, parsed, dbResults);
    } catch (e) {
      console.warn("Fallback response also failed:", e);
    }
  }

  if (!aiText || !aiText.trim()) {
    const flat = dbResults.flatMap(r => Array.isArray(r.result) ? r.result : []);
    aiText = flat.length
      ? flat.slice(0, 10).map(r => r.name || r.message || "(no name)").join("\n")
      : "No data found for your request.";
  }

  // 7️⃣ Save assistant response
  await saveMessage(sessionId, "assistant", aiText, { intents: parsed.intents });

  // 8️⃣ Update session with any new filters discovered
  const newFilters = {};
  parsed.intents.forEach(intent => {
    if (intent.filters.restaurantName) newFilters.lastRestaurant = intent.filters.restaurantName;
    if (intent.filters.priceTier) newFilters.priceTier = intent.filters.priceTier;
    if (intent.filters.cuisine) newFilters.cuisine = intent.filters.cuisine;
  });
  
  if (Object.keys(newFilters).length > 0) {
    await updateSession(sessionId, { filters: { ...session.filters, ...newFilters } });
  }

  return {
    sessionId,
    detectedIntents: parsed,
    response: aiText
  };
}

export default { handleChat, handleChatWithSession };
