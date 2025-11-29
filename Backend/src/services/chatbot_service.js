import { detectMessage, generateResponse } from "../modules/ai_engine.js";
import { Restaurant } from "../models/restaurant.js";
import { Menu } from "../models/menu.js";
import { Promotion } from "../models/promotion.js";
import { ChatSession } from "../models/chatSession.js";
import { Message } from "../models/message.js";
import { handleRule, isSimpleMessage } from "../modules/rule_engine.js";
import { connectDB } from "../config/db.js";

// Recursive helper: search arbitrary filter objects for a max price ($lte or $lt or numeric)
function findMaxPriceInFilter(obj) {
  if (!obj || typeof obj !== 'object') return null;

  let found = null;

  function walker(node) {
    if (!node || typeof node !== 'object') return;

    // direct price field
    if (Object.prototype.hasOwnProperty.call(node, 'price')) {
      const p = node.price;
      if (typeof p === 'number') {
        found = (found === null) ? p : Math.min(found, p);
      } else if (p && typeof p === 'object') {
        if (typeof p.$lte === 'number') found = (found === null) ? p.$lte : Math.min(found, p.$lte);
        if (typeof p.$lt === 'number') found = (found === null) ? p.$lt : Math.min(found, p.$lt);
      }
    }

    // check for operators that contain arrays (e.g., $or, $and)
    for (const [k, v] of Object.entries(node)) {
      if (k === '$or' || k === '$and' || Array.isArray(v)) {
        const arr = Array.isArray(v) ? v : [v];
        for (const it of arr) walker(it);
        continue;
      }

      if (v && typeof v === 'object') walker(v);
    }
  }

  walker(obj);
  return found;
}

// Match the ai_module.ask_ai interface: take a user message and return a plain string reply.
export async function handleChat(userMsg, sessionId = null) {
  try {
    // Save user message (best-effort). If sessionId is not provided, saving is skipped.
    async function saveUserMessage(content) {
      if (!sessionId) return;
      try {
        await Message.create({ sessionId, role: 'user', content });
      } catch (e) {
        console.warn('Failed to save user message:', e?.message || e);
      }
    }

    async function saveAssistantMessage(content, meta = {}) {
      if (!sessionId) return;
      try {
        await Message.create({ sessionId, role: 'assistant', content, meta });
      } catch (e) {
        console.warn('Failed to save assistant message:', e?.message || e);
      }
    }

    // *** Fast-path: handle greetings, thanks, help, etc. BEFORE calling AI ***
    const quickReply = await isSimpleMessage(userMsg);
    if (quickReply) {
      // best-effort persistence
      await saveUserMessage(userMsg);
      await saveAssistantMessage(quickReply, { rule: 'simple' });
      return quickReply;
    }

    const parsed = await detectMessage(userMsg);

    // If parsing failed or intent unknown, let AI generate a fallback conversational reply.
    if (!parsed || parsed.intent === "unknown") {
      const aiFallback = await generateResponse(userMsg, []);
      await saveUserMessage(userMsg);
      await saveAssistantMessage(aiFallback, { fallback: true });
      return aiFallback;
    }

    // Ensure DB connection is attempted before any DB queries
    try {
      await connectDB();
    } catch (connErr) {
      // connection error already logged by connectDB(); continue — DB operations will fail fast
    }

    // Attempt to load session (if sessionId provided)
    let session = null;
    try {
      if (sessionId) session = await ChatSession.findOne({ sessionId }).lean();
    } catch (err) {
      console.warn("Failed to load chat session", err?.message || err);
      session = null;
    }

    // Merge detected filters with session filters (session filters have lower precedence)
    const mergedFilters = mergeFilters(session?.filters || {}, parsed.filters || {});

    // Normalize filters for safety and to support 'ambience' natural language
    const safeFilters = normalizeFiltersForCollection(parsed.collection, mergedFilters);

    let data = [];
    try {
      // If user is searching restaurants but included a price filter, that likely
      // refers to menu item prices. Translate the restaurant+price query into a
      // Menu lookup to find matching restaurant IDs, then query restaurants.
      // Find any max price constraint anywhere inside the filters
      const foundMaxPrice = findMaxPriceInFilter(safeFilters);
      if (foundMaxPrice !== null) {
        console.debug('[chatbot_service] detected maxPrice in filters:', foundMaxPrice);
      }

      if (parsed.collection === "restaurants") {
        const maxPrice = foundMaxPrice;
        // If there's a price constraint, find menus within that price and map to restaurants
        if (typeof maxPrice === 'number') {
          // remove price from restaurant filter because restaurants don't have price
          const restaurantQuery = { ...safeFilters };
          delete restaurantQuery.price;
          // Prefer signature menu items when mapping restaurants for budget queries
          const signatureMatchQuery = { price: { $lte: maxPrice }, availability: true, isSignature: true };
          let matchingRestaurantIds = await Menu.find(signatureMatchQuery).distinct('restaurant').exec();
          // If no restaurants via signature items, fall back to any menu items within price
          if (!matchingRestaurantIds || matchingRestaurantIds.length === 0) {
            matchingRestaurantIds = await Menu.find({ price: { $lte: maxPrice }, availability: true }).distinct('restaurant').exec();
          }
          if (!matchingRestaurantIds || matchingRestaurantIds.length === 0) {
            data = [];
          } else {
            restaurantQuery._id = { $in: matchingRestaurantIds };
            data = await Restaurant.find(restaurantQuery).limit(parsed.limit || 10).lean();

            // Attach matched signature menu(s) per restaurant (if any)
            for (const r of data) {
              try {
                const matched = await Menu.find({ restaurant: r._id, availability: true, isSignature: true, price: { $lte: maxPrice } })
                  .select('name price category description')
                  .limit(5)
                  .lean();
                if (matched && matched.length) r.matchedSignatureMenus = matched;
              } catch (e) {
                // ignore per-restaurant fetch errors
                console.warn('Failed to fetch matchedSignatureMenus for restaurant', r._id, e?.message || e);
              }
            }
          }
        } else {
          data = await Restaurant.find(safeFilters).limit(parsed.limit || 10).lean();
        }
      } else if (parsed.collection === "menus") {
        data = await Menu.find(safeFilters).limit(parsed.limit || 10).lean();
      } else if (parsed.collection === "promotions") {
        data = await Promotion.find(safeFilters).limit(parsed.limit || 10).lean();
      }
    } catch (dbErr) {
      // Let rule engine provide a helpful fallback when DB calls fail
      const ruleReply = await handleRule(parsed, userMsg, null, dbErr);
      if (ruleReply) return ruleReply;
      console.error("Database query failed:", dbErr);
      return "Sorry, I'm having trouble accessing the database right now. Please try again later.";
    }

    // Save or update session with merged filters and timestamp
    try {
      if (sessionId) {
        await ChatSession.findOneAndUpdate(
          { sessionId },
          { $set: { filters: mergedFilters, lastSeen: new Date() } },
          { upsert: true }
        );
      }
    } catch (err) {
      console.warn("Failed to save chat session", err?.message || err);
    }

    // Let the rule engine short-circuit for greetings or helpful fallbacks
    const ruleReply = await handleRule(parsed, userMsg, data || [], null);
    if (ruleReply) {
      await saveUserMessage(userMsg);
      await saveAssistantMessage(ruleReply, { rule: 'engine' });
      return ruleReply;
    }

    // If user asked for restaurants but none were found, try a stronger fallback:
    // search Menu for budget items and map back to restaurants.
    try {
      if (parsed.collection === 'restaurants' && Array.isArray(data) && data.length === 0) {
        const maxPrice = findMaxPriceInFilter(safeFilters);
        // also consider 'budget' tag in filters
        const hasBudgetTag = (function checkBudgetTag(filters) {
          if (!filters || typeof filters !== 'object') return false;
          if (filters.tags && (filters.tags === 'budget' || (Array.isArray(filters.tags) && filters.tags.includes('budget')))) return true;
          // search nested
          const stack = [filters];
          while (stack.length) {
            const node = stack.pop();
            if (!node || typeof node !== 'object') continue;
            for (const [k, v] of Object.entries(node)) {
              if (k === 'tags') {
                if (v === 'budget') return true;
                if (Array.isArray(v) && v.includes('budget')) return true;
                if (v && typeof v === 'object' && Array.isArray(v.$in) && v.$in.includes('budget')) return true;
              }
              if (v && typeof v === 'object') stack.push(v);
            }
          }
          return false;
        })(mergedFilters || {});

        const menuQuery = { availability: true };
        if (typeof maxPrice === 'number') menuQuery.price = { $lte: maxPrice };
        if (hasBudgetTag) menuQuery.tags = { $in: ['budget'] };

        // Prefer signature menus for fallback matching
        const sigQuery = { ...menuQuery, isSignature: true };
        let matchingMenus = await Menu.find(sigQuery).limit(200).lean();
        if (!matchingMenus || matchingMenus.length === 0) {
          // broaden to any menu items
          matchingMenus = await Menu.find(menuQuery).limit(200).lean();
        }
        if (matchingMenus && matchingMenus.length) {
          const restIds = Array.from(new Set(matchingMenus.map(m => String(m.restaurant)).filter(Boolean)));
          if (restIds.length) {
            const restaurantQuery = { ...(safeFilters || {}) };
            delete restaurantQuery.price;
            restaurantQuery._id = { $in: restIds };
            const fallbackRestaurants = await Restaurant.find(restaurantQuery).limit(parsed.limit || 10).lean();
            if (fallbackRestaurants && fallbackRestaurants.length) {
              console.info('[chatbot_service] fallback: found restaurants via menu mapping', { count: fallbackRestaurants.length });
              data = fallbackRestaurants;
            } else {
              console.info('[chatbot_service] fallback: menus found but no matching restaurants after applying other filters', { menus: matchingMenus.length, restIds: restIds.length });
            }
          }
        } else {
          console.info('[chatbot_service] fallback: no menus found for budget query', { maxPrice, hasBudgetTag });
        }
      }
    } catch (fallbackErr) {
      console.warn('Fallback restaurant->menu mapping error:', fallbackErr?.message || fallbackErr);
    }

    const aiReply = await generateResponse(userMsg, data || []);
    // persist messages (best-effort)
    await saveUserMessage(userMsg);
    await saveAssistantMessage(aiReply, { source: 'ai' });
    return aiReply;
  } catch (err) {
    console.error("handleChat error:", err);
    return "Sorry, something went wrong while processing your message.";
  }
}

// Map common ambience synonyms to canonical tags
const AMBIENCE_ALIASES = {
  romantic: "romantic",
  romance: "romantic",
  intimate: "romantic",
  cozy: "cozy",
  quiet: "quiet",
  lively: "lively",
  noisy: "noisy",
  family: "family-friendly",
  "family-friendly": "family-friendly",
  casual: "casual",
  healthy: "healthy"
};

function normalizeFiltersForCollection(collection, filters) {
  if (!filters || typeof filters !== "object") return {};
  const normalized = { ...filters };

  if (collection === "restaurants") {
    // Handle ambience: allow string, array, or Mongo-style operator objects
    if (normalized.ambience) {
      const raw = normalized.ambience;
      const entries = Array.isArray(raw) ? raw : [raw];

      const mapped = [];
      for (const e of entries) {
        if (!e && e !== 0) continue;

        // string entry: map synonyms and lowercase
        if (typeof e === "string") {
          const key = e.toLowerCase();
          mapped.push(AMBIENCE_ALIASES[key] || key);
          continue;
        }

        // object entry: could be {$regex: 'cozy', $options: 'i'} or {$in: [...]} etc.
        if (typeof e === "object") {
          // regex object
          if (e.$regex) {
            try {
              const opts = typeof e.$options === "string" ? e.$options : "i";
              const re = new RegExp(e.$regex, opts);
              mapped.push(re);
              continue;
            } catch (_err) {
              // fallback to string match
              const key = String(e.$regex).toLowerCase();
              mapped.push(AMBIENCE_ALIASES[key] || key);
              continue;
            }
          }

          // $in operator inside ambience
          if (Array.isArray(e.$in)) {
            for (const item of e.$in) {
              if (!item && item !== 0) continue;
              if (typeof item === "string") {
                const k = item.toLowerCase();
                mapped.push(AMBIENCE_ALIASES[k] || k);
              } else if (typeof item === "object" && item.$regex) {
                try {
                  const opts = typeof item.$options === "string" ? item.$options : "i";
                  mapped.push(new RegExp(item.$regex, opts));
                } catch (_err) {
                  const k = String(item.$regex).toLowerCase();
                  mapped.push(AMBIENCE_ALIASES[k] || k);
                }
              }
            }
            continue;
          }
        }

        // fallback: coerce to string
        const fallback = String(e).toLowerCase();
        mapped.push(AMBIENCE_ALIASES[fallback] || fallback);
      }

      // Remove duplicates and falsy entries
      const dedup = [];
      for (const v of mapped) if (v || v === 0) {
        const key = (typeof v === 'string') ? v : v.toString();
        if (!dedup.some(x => x.toString() === key)) dedup.push(v);
      }

      if (dedup.length) {
        normalized.ambience = { $in: dedup };
      } else {
        delete normalized.ambience;
      }
    }

    // If user provided free text like { environment: 'romantic' }, map it
    if (normalized.environment && typeof normalized.environment === "string") {
      const key = normalized.environment.toLowerCase();
      const mapped = AMBIENCE_ALIASES[key] || key;
      normalized.ambience = { $in: [mapped] };
      delete normalized.environment;
    }

    // Optionally support searching description/tags when ambience provided as free text
    if (!normalized.ambience && normalized.q && typeof normalized.q === "string") {
      const regex = { $regex: normalized.q, $options: "i" };
      normalized.$or = [
        { ambience: { $in: [normalized.q.toLowerCase()] } },
        { tags: { $in: [normalized.q.toLowerCase()] } },
        { description: regex }
      ];
      delete normalized.q;
    }
  }

  return normalized;
}

// Merge session-level filters with newly-detected filters.
// - sessionFilters: previously saved filters (lower precedence)
// - newFilters: freshly detected filters (higher precedence)
function mergeFilters(sessionFilters = {}, newFilters = {}) {
  const out = { ...(sessionFilters || {}) };

  for (const [k, v] of Object.entries(newFilters || {})) {
    // merge ambience specially (union semantics)
    if (k === "ambience") {
      const toArray = (x) => {
        if (!x && x !== 0) return [];
        if (typeof x === "string") return [x];
        if (Array.isArray(x)) return x;
        if (typeof x === "object") {
          if (Array.isArray(x.$in)) return x.$in;
        }
        return [x];
      };

      const sArr = toArray(sessionFilters.ambience);
      const nArr = toArray(v);
      const merged = Array.from(new Set([...sArr, ...nArr].filter((x) => x || x === 0)));
      if (merged.length) out.ambience = { $in: merged };
      else delete out.ambience;
      continue;
    }

    // If both are range-like objects (e.g., $gte/$lte), intersect ranges.
    if (typeof v === "object" && v !== null && (v.$gte || v.$lte)) {
      const s = sessionFilters[k];
      if (s && typeof s === "object" && (s.$gte || s.$lte)) {
        const gte = Math.max(s.$gte || -Infinity, v.$gte || -Infinity);
        const lte = Math.min(s.$lte || Infinity, v.$lte || Infinity);
        if (gte <= lte) {
          out[k] = {};
          if (Number.isFinite(gte)) out[k].$gte = gte;
          if (Number.isFinite(lte)) out[k].$lte = lte;
        } else {
          // no intersection -> prefer new filter
          out[k] = v;
        }
        continue;
      }
    }

    // Default: newer filter wins
    out[k] = v;
  }

  return out;
}
