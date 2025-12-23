// src/services/menu_service.js
import { Menu } from "../models/menu.js";
import { Restaurant } from "../models/restaurant.js";

/**
 * Clean and normalize restaurant name for matching
 * Handles: "KFC's" -> "KFC", "kfc menu" -> "kfc"
 */
function normalizeRestaurantName(name) {
  if (!name) return name;
  return name
    .replace(/'s\b/gi, '')           // Remove possessive 's
    .replace(/\s*(menu|food|restaurant|place|hours|opening hours)\s*/gi, '') // Remove common suffixes
    .trim();
}

/**
 * Find restaurant by name with fuzzy matching
 */
async function findRestaurantByName(restaurantName) {
  if (!restaurantName) return null;
  
  const normalized = normalizeRestaurantName(restaurantName);
  
  // Try exact match first
  let rest = await Restaurant.findOne({ 
    name: { $regex: `^${normalized}$`, $options: "i" } 
  }).lean();
  
  // Try partial match (e.g., "KFC" matches "KFC Cambodia")
  if (!rest) {
    rest = await Restaurant.findOne({ 
      name: { $regex: normalized, $options: "i" } 
    }).lean();
  }
  
  return rest;
}

/**
 * Find menus by filters
 */
async function findMenus(filters = {}, limit = 20) {
  const query = {};

  if (filters.restaurantId) {
    query.restaurantId = filters.restaurantId;
  } else if (filters.restaurantName) {
    const rest = await findRestaurantByName(filters.restaurantName);
    if (!rest) return [];
    query.restaurantId = rest._id;
  }

  if (filters.visible !== undefined) query.visible = Boolean(filters.visible);

  // items are embedded, so no need to join
  return Menu.find(query).limit(limit).lean();
}

/**
 * Get full menu (with embedded items) for a restaurant by name
 */
async function getFullMenuForRestaurant(restaurantName, limit = 20) {
  const rest = await findRestaurantByName(restaurantName);
  if (!rest) return [];
  
  const menus = await Menu.find({ restaurantId: rest._id }).limit(limit).lean();

  return menus.map(menu => ({
    restaurantName: rest.name, // Include actual restaurant name
    menu: menu.name,
    description: menu.description,
    items: menu.items || [] // embedded items
  }));
}

export default {
  findMenus,
  getFullMenuForRestaurant,
  findRestaurantByName
};
