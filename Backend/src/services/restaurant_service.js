import { Restaurant } from "../models/restaurant.js";
import { PriceTierDetail } from "../models/priceTierDetail.js";

async function findRestaurants(filters = {}, limit = 20) {
  const query = {};
  
  // Name filter (partial match)
  if (filters.name) {
    query.name = (typeof filters.name === 'string' && filters.name.$regex) 
      ? filters.name 
      : { $regex: filters.name, $options: "i" };
  }
  
  // Type filter (exact match)
  if (filters.type) query.type = filters.type;
  
  // Category filter (partial match for flexibility)
  if (filters.category) {
    query.category = { $regex: filters.category, $options: "i" };
  }
  
  // Ambience filter - supports single string or array
  if (filters.ambience) {
    const ambienceList = Array.isArray(filters.ambience) ? filters.ambience : [filters.ambience];
    query.ambience = { $in: ambienceList };
  }
  
  // Cuisine filter (handle 'romantic' as ambience for backward compat)
  if (filters.cuisine) {
    if (typeof filters.cuisine === 'string' && filters.cuisine.toLowerCase() === 'romantic') {
      query.ambience = { $in: ['romantic'] };
    } else {
      query.cuisine = { $regex: filters.cuisine, $options: "i" };
    }
  }
  
  // Private rooms filter
  if (filters.hasPrivateRooms !== undefined) query.hasPrivateRooms = filters.hasPrivateRooms;
  
  // Price tier filter
  if (filters.priceTier) query.priceTier = filters.priceTier;
  
  // Status filter (default to OPEN if not specified)
  if (filters.status) query.status = filters.status;
  
  return Restaurant.find(query).limit(limit).lean();
}

/**
 * Find restaurants by ambience type
 */
async function findByAmbience(ambienceTypes, limit = 20) {
  const ambienceList = Array.isArray(ambienceTypes) ? ambienceTypes : [ambienceTypes];
  return Restaurant.find({ ambience: { $in: ambienceList } }).limit(limit).lean();
}

/**
 * Get all unique ambience types from restaurants
 */
async function getAllAmbienceTypes() {
  const restaurants = await Restaurant.find({}, { ambience: 1 }).lean();
  const allAmbience = new Set();
  restaurants.forEach(r => {
    if (r.ambience) {
      r.ambience.forEach(a => allAmbience.add(a));
    }
  });
  return Array.from(allAmbience).sort();
}

async function getByName(name) {
  if (!name) return null;
  
  // Try exact match first
  let restaurant = await Restaurant.findOne({ name: { $regex: `^${name}$`, $options: "i" } }).lean();
  
  // Try partial match if no exact match
  if (!restaurant) {
    restaurant = await Restaurant.findOne({ name: { $regex: name, $options: "i" } }).lean();
  }
  
  return restaurant;
}

async function getPriceTierDetail(tier) {
  if (!tier) return null;
  return PriceTierDetail.findOne({ tier }).lean();
}

export default { 
  findRestaurants, 
  findByAmbience,
  getAllAmbienceTypes,
  getByName, 
  getPriceTierDetail 
};
