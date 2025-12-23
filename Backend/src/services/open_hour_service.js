import { OpeningHours } from "../models/openingHours.js";
import { Restaurant } from "../models/restaurant.js";

const DAY_MAP = { 0: "SUN", 1: "MON", 2: "TUE", 3: "WED", 4: "THU", 5: "FRI", 6: "SAT" };
const DAY_ORDER = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

/**
 * Clean and normalize restaurant name for matching
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
 * Get current day and time in Cambodia timezone (UTC+7)
 */
function getCambodiaTime() {
  const now = new Date();
  // Cambodia is UTC+7
  const cambodiaOffset = 7 * 60; // minutes
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const cambodiaTime = new Date(utc + (cambodiaOffset * 60000));
  
  return {
    dayOfWeek: DAY_MAP[cambodiaTime.getDay()],
    time: cambodiaTime.toTimeString().slice(0, 5), // "HH:mm"
    fullDate: cambodiaTime
  };
}

/**
 * Check if a time string is between open and close times
 */
function isTimeBetween(current, open, close) {
  if (!open || !close) return false;
  
  // Handle overnight hours (e.g., open 22:00, close 02:00)
  if (close < open) {
    return current >= open || current <= close;
  }
  return current >= open && current <= close;
}

async function findOpeningHours(filters = {}, limit = 50) {
  const q = {};
  if (filters.restaurantId) {
    q.restaurantId = filters.restaurantId;
  } else if (filters.restaurantName) {
    const rest = await findRestaurantByName(filters.restaurantName);
    if (!rest) return [];
    q.restaurantId = rest._id;
  }
  return OpeningHours.find(q).limit(limit).lean();
}

async function getOpeningHours(restaurantName) {
  if (!restaurantName) return [];
  
  const rest = await findRestaurantByName(restaurantName);
  if (!rest) return [];
  
  const hours = await OpeningHours.find({ restaurantId: rest._id }).lean();
  const result = hours.sort((a, b) => DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek));
  
  // Add restaurant name to results for context
  return result.map(h => ({ ...h, restaurantName: rest.name }));
}

/**
 * Check if a specific restaurant is open right now
 */
async function isRestaurantOpenNow(restaurantName) {
  const { dayOfWeek, time } = getCambodiaTime();
  
  const rest = await findRestaurantByName(restaurantName);
  if (!rest) return { found: false, isOpen: false, message: `Restaurant "${restaurantName}" not found` };
  
  const todayHours = await OpeningHours.findOne({ restaurantId: rest._id, dayOfWeek }).lean();
  
  if (!todayHours || !todayHours.openTime) {
    return { found: true, isOpen: false, restaurant: rest.name, message: `${rest.name} is closed today` };
  }
  
  const isOpen = isTimeBetween(time, todayHours.openTime, todayHours.closeTime);
  
  return {
    found: true,
    isOpen,
    restaurant: rest.name,
    currentTime: time,
    todayHours: { open: todayHours.openTime, close: todayHours.closeTime },
    message: isOpen 
      ? `${rest.name} is open now (${todayHours.openTime} - ${todayHours.closeTime})`
      : `${rest.name} is currently closed. Today's hours: ${todayHours.openTime} - ${todayHours.closeTime}`
  };
}

/**
 * Find all restaurants that are open right now
 */
async function findOpenNowRestaurants(filters = {}, limit = 20) {
  const { dayOfWeek, time } = getCambodiaTime();
  
  // Get all opening hours for today
  const todayHours = await OpeningHours.find({ dayOfWeek }).lean();
  
  // Filter to those currently open
  const openRestaurantIds = todayHours
    .filter(h => h.openTime && h.closeTime && isTimeBetween(time, h.openTime, h.closeTime))
    .map(h => h.restaurantId);
  
  if (openRestaurantIds.length === 0) {
    return [];
  }
  
  // Build restaurant query
  const query = { _id: { $in: openRestaurantIds } };
  
  // Apply additional filters
  if (filters.type) query.type = filters.type;
  if (filters.cuisine) query.cuisine = { $regex: filters.cuisine, $options: "i" };
  if (filters.priceTier) query.priceTier = filters.priceTier;
  if (filters.ambience) query.ambience = { $in: Array.isArray(filters.ambience) ? filters.ambience : [filters.ambience] };
  
  const restaurants = await Restaurant.find(query).limit(limit).lean();
  
  // Enrich with today's hours
  return restaurants.map(r => {
    const hours = todayHours.find(h => h.restaurantId.toString() === r._id.toString());
    return {
      ...r,
      todayHours: hours ? { open: hours.openTime, close: hours.closeTime } : null,
      currentTime: time
    };
  });
}

/**
 * Get restaurants open at a specific time on a specific day
 */
async function findRestaurantsOpenAt(dayOfWeek, time, filters = {}, limit = 20) {
  const hours = await OpeningHours.find({ dayOfWeek }).lean();
  
  const openRestaurantIds = hours
    .filter(h => h.openTime && h.closeTime && isTimeBetween(time, h.openTime, h.closeTime))
    .map(h => h.restaurantId);
  
  if (openRestaurantIds.length === 0) return [];
  
  const query = { _id: { $in: openRestaurantIds } };
  if (filters.type) query.type = filters.type;
  if (filters.priceTier) query.priceTier = filters.priceTier;
  
  return Restaurant.find(query).limit(limit).lean();
}

export default { 
  findOpeningHours, 
  getOpeningHours, 
  isRestaurantOpenNow,
  findOpenNowRestaurants,
  findRestaurantsOpenAt,
  getCambodiaTime
};
