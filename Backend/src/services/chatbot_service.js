// ==========================
// chatbot_service.js
// ==========================
import aiEngine from "../modules/ai_engine.js";
import restaurantService from "./restaurant_service.js";
import menuService from "./menu_service.js";
import promotionService from "./promotion_service.js";
import openingHourService from "./open_hour_service.js";
import priceTierService from "./price_tier_service.js";

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

export default { handleChat };
