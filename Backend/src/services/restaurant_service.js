import { Restaurant } from "../models/restaurant.js";
import { PriceTierDetail } from "../models/priceTierDetail.js";

async function findRestaurants(filters = {}, limit = 20) {
  const query = {};
  if (filters.name) query.name = (typeof filters.name === 'string' && filters.name.$regex) ? filters.name : { $regex: filters.name, $options: "i" };
  if (filters.type) query.type = filters.type;
    // Support ambience filtering and map common natural-language intents
    if (filters.ambience) {
      // ambience stored as array of strings
      query.ambience = { $in: Array.isArray(filters.ambience) ? filters.ambience : [filters.ambience] };
    }
    // Backward-compat: if user passes cuisine: 'romantic', treat as ambience
    if (filters.cuisine) {
      if (typeof filters.cuisine === 'string' && filters.cuisine.toLowerCase() === 'romantic') {
        query.ambience = { $in: ['romantic'] };
      } else {
        query.cuisine = filters.cuisine;
      }
    }
  if (filters.hasPrivateRooms !== undefined) query.hasPrivateRooms = filters.hasPrivateRooms;
  if (filters.priceTier) query.priceTier = filters.priceTier;
  if (filters.status) query.status = filters.status;
  return Restaurant.find(query).limit(limit).lean();
}

async function getByName(name) {
  if (!name) return null;
  return Restaurant.findOne({ name: { $regex: `^${name}$`, $options: "i" } }).lean();
}

async function getPriceTierDetail(tier) {
  if (!tier) return null;
  return PriceTierDetail.findOne({ tier }).lean();
}

export default { findRestaurants, getByName, getPriceTierDetail };
