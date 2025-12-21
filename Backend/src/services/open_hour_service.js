import { OpeningHours } from "../models/openingHours.js";
import { Restaurant } from "../models/restaurant.js";

async function findOpeningHours(filters = {}, limit = 50) {
  const q = {};
  if (filters.restaurantId) q.restaurantId = filters.restaurantId;
  else if (filters.restaurantName) {
    const rest = await Restaurant.findOne({ name: { $regex: `^${filters.restaurantName}$`, $options: "i" } }).lean();
    if (!rest) return [];
    q.restaurantId = rest._id;
  }
  return OpeningHours.find(q).limit(limit).lean();
}

async function getOpeningHours(restaurantName) {
  if (!restaurantName) return [];
  const rest = await Restaurant.findOne({ name: { $regex: `^${restaurantName}$`, $options: "i" } }).lean();
  if (!rest) return [];
  const hours = await OpeningHours.find({ restaurantId: rest._id }).lean();
  const order = ["MON","TUE","WED","THU","FRI","SAT","SUN"];
  return hours.sort((a,b)=>order.indexOf(a.dayOfWeek)-order.indexOf(b.dayOfWeek));
}

export default { findOpeningHours, getOpeningHours };
