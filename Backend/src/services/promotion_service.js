import { Promotion } from "../models/promotion.js";
import { Restaurant } from "../models/restaurant.js";

// Normalize filter inputs into a Mongo-friendly query
function buildPromotionQuery(filters = {}) {
  const q = {};

  // Status: default to active if not specified
  q.status = filters.status || "active";

  // Active window: if status is active and no explicit date filters, constrain to current window
  const now = new Date();
  if (!filters.startDate && !filters.endDate) {
    q.startDate = { $lte: now };
    q.endDate = { $gte: now };
  } else {
    if (filters.startDate) q.startDate = filters.startDate;
    if (filters.endDate) q.endDate = filters.endDate;
  }

  // Title substring or regex support
  if (typeof filters.title === "string" && filters.title.trim()) {
    q.title = { $regex: filters.title.trim(), $options: "i" };
  } else if (filters.title && filters.title.$regex) {
    q.title = filters.title;
  }

  // Discount percent range support
  if (typeof filters.discountPercentMin === "number" || typeof filters.discountPercentMax === "number") {
    q.discountPercent = {};
    if (typeof filters.discountPercentMin === "number") q.discountPercent.$gte = filters.discountPercentMin;
    if (typeof filters.discountPercentMax === "number") q.discountPercent.$lte = filters.discountPercentMax;
    if (!Object.keys(q.discountPercent).length) delete q.discountPercent;
  }

  // Restaurant scoping (resolved separately if restaurantName provided)
  if (filters.restaurant) q.restaurant = filters.restaurant;

  return q;
}

async function resolveRestaurantNameToId(restaurantName) {
  if (!restaurantName || typeof restaurantName !== "string") return null;
  const rest = await Restaurant.findOne({ name: { $regex: `^${restaurantName}$`, $options: "i" } }).lean();
  return rest?._id || null;
}

async function findPromotions(filters = {}, limit = 10) {
  const q = buildPromotionQuery(filters);

  // Allow restaurantName -> restaurant id resolution
  if (filters.restaurantName && !q.restaurant) {
    const restId = await resolveRestaurantNameToId(filters.restaurantName);
    if (!restId) return [];
    q.restaurant = restId;
  }

  return Promotion
    .find(q)
    .limit(typeof limit === "number" ? limit : 10)
    .populate("restaurant", "name")
    .populate("menu", "name description")
    .lean();
}

async function getPromotionsByRestaurantId(restaurantId) {
  const now = new Date();
  return Promotion
    .find({ restaurant: restaurantId, status: "active", startDate: { $lte: now }, endDate: { $gte: now } })
    .populate("restaurant", "name")
    .populate("menu", "name description")
    .lean();
}

export default { findPromotions, getPromotionsByRestaurantId };
