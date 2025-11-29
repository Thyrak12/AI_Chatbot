import { Restaurant } from "../models/restaurant.js";
import { Menu } from "../models/menu.js";

// Consolidated rule engine. Exports `handleRule(parsed, userMsg, data, err)`
// which returns a string reply when a deterministic rule applies, otherwise null.

function cleanText(s) {
  if (!s) return "";
  return String(s).trim().toLowerCase();
}

function isGreeting(text) {
  if (!text || typeof text !== "string") return false;
  return /\b(hi|hello|hey|hiya|g'day|good\s+(morning|afternoon|evening))\b/i.test(text.trim());
}

function isThanks(text) {
  return /\b(thank|thx|thanks|thank you)\b/i.test(text || "");
}

function isHelp(text) {
  return /\b(help|how do i|what can you do|commands|usage)\b/i.test(text || "");
}

function isYes(text) {
  return /^(yes|yep|yeah|sure|please|ok|okay)\b/i.test((text || "").trim());
}

function isNo(text) {
  return /^(no|nope|nah)\b/i.test((text || "").trim());
}

/**
 * Fast check for simple messages (greetings, thanks, help, yes/no).
 * Returns a reply string if matched, otherwise null.
 * Call this BEFORE the AI parsing to avoid slow model calls.
 */
export function isSimpleMessage(text) {
  const t = String(text || "").trim();

  if (isGreeting(t)) {
    return "Hello! 👋 I can help you find restaurants, menus, or promotions. Try asking 'Find cozy Italian restaurants' or 'Show me menu items under $10'.";
  }

  if (isHelp(t)) {
    return "I can search restaurants, menus, or promotions. Ask things like: 'romantic restaurants near me', 'menu under $5', or 'current promotions'. You can also set preferences like ambience and price — I'll remember them in this session.";
  }

  if (isThanks(t)) {
    return "You're welcome! If you'd like more recommendations, tell me what you're in the mood for.";
  }

  if (isYes(t)) return "Great — noted. Anything else you'd like to add?";
  if (isNo(t)) return "No problem. Let me know if you'd like other suggestions.";

  return null;
}

async function fallbackRecommendations(limit = 5) {
  try {
    const items = await Restaurant.find({}).limit(limit).lean();
    if (!items || !items.length) return null;
    return items.map((r) => r.name).filter(Boolean).slice(0, limit);
  } catch (err) {
    console.warn("fallbackRecommendations DB error:", err?.message || err);
    return null;
  }
}

async function getMenuItemsSummary(limit = 8) {
  try {
    const items = await Menu.find({ availability: true }).limit(limit).lean();
    if (!items || !items.length) return null;
    return items.map((p) => `${p.name} — $${p.price}`).slice(0, limit);
  } catch (err) {
    console.warn("getMenuItemsSummary DB error:", err?.message || err);
    return null;
  }
}

// Get the cheapest menu items, optionally capped by a budget
async function getCheapestMenus(limit = 5, maxPrice = null) {
  try {
    const query = { availability: true };
    if (typeof maxPrice === "number") {
      query.price = { $lte: maxPrice };
    }

    const items = await Menu.find(query).sort({ price: 1 }).limit(limit).lean();
    if (!items || !items.length) return null;
    return items.map((p) => `${p.name} — $${p.price.toFixed(2)}`);
  } catch (err) {
    console.warn("getCheapestMenus DB error:", err?.message || err);
    return null;
  }
}

export async function handleRule(parsed, userMsg, data, err) {
  const text = String(userMsg || "");

  // NOTE: Greetings, help, thanks, yes/no are now handled by isSimpleMessage()
  // BEFORE the AI call — so we skip them here.

  // 1) Database error fallback
  if (err) {
    console.warn("rule_engine detected DB error:", err?.message || err);
    const recs = await fallbackRecommendations(3);
    if (recs && recs.length) {
      return `I couldn't access the database just now, but here are a few popular places: ${recs.join(", ")}. Try again shortly.`;
    }
    return "I couldn't access the database right now. Try again in a moment — I can still answer general questions about cuisines or give static suggestions.";
  }

  // 2) If user explicitly asked about menus or food, return a short deterministic menu list (if available)
  const low = cleanText(text);
  if (/(\bmenu\b|\bmenu items\b|\bwhat do you have\b|\bfood\b|\bdishes\b)/i.test(low)) {
    const menu = await getMenuItemsSummary(6);
    if (menu && menu.length) {
      return `Here are some menu items:\n${menu.map((m) => `- ${m}`).join("\n")}\nIf you'd like details about any item, tell me its name.`;
    }
    // if no menu items available, fallthrough to empty-result handler below
  }

  // 3) Empty result handling for searches
  if (Array.isArray(data) && data.length === 0 && parsed && parsed.intent && parsed.intent.includes("search")) {
    const collectionName = parsed.collection || "results";

    // Try to extract a max price if present in filters
    let maxPrice = null;
    if (parsed.filters && typeof parsed.filters === "object") {
      const priceFilter = parsed.filters.price;
      if (priceFilter && typeof priceFilter === "object" && typeof priceFilter.$lte === "number") {
        maxPrice = priceFilter.$lte;
      }
    }

    // If user was looking for menus with a budget, suggest the cheapest menus instead
    if (parsed.collection === "menus") {
      const cheapest = await getCheapestMenus(5, maxPrice || undefined);
      if (cheapest && cheapest.length) {
        const budgetText = maxPrice
          ? `I couldn't find any menus exactly within your filters, but here are some budget-friendly items around $${maxPrice} or less:`
          : "I couldn't find exact matches, but here are some budget-friendly items:";
        return `${budgetText}\n${cheapest.map((m) => `- ${m}`).join("\n")}\nWould you like me to try a slightly different price range or cuisine?`;
      }
    }

    // Fallback to restaurant-based suggestions
    const recs = await fallbackRecommendations(3);
    const recText = recs && recs.length ? ` Here are a few popular places: ${recs.join(", ")}.` : "";
    return `I couldn't find any ${collectionName} that match your filters.${recText} Would you like me to broaden the search (remove filters or try another cuisine)?`;
  }

  // 4) No deterministic rule applies
  return null;
}

export default { handleRule };
