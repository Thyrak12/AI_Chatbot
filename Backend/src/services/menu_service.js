// src/services/menu_service.js
import { Menu } from "../models/menu.js";
import { Restaurant } from "../models/restaurant.js";

/**
 * Find menus by filters
 */
async function findMenus(filters = {}, limit = 20) {
  const query = {};

  if (filters.restaurantId) query.restaurantId = filters.restaurantId;
  else if (filters.restaurantName) {
    const rest = await Restaurant.findOne({ name: filters.restaurantName });
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
  const menus = await findMenus({ restaurantName }, limit);

  return menus.map(menu => ({
    menu: menu.name,
    description: menu.description,
    items: menu.items || [] // embedded items
  }));
}

export default {
  findMenus,
  getFullMenuForRestaurant
};
