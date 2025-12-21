import { handleChat } from "../src/services/chatbot_service.js";
import menuService from "../src/services/menu_service.js";
import restaurantService from "../src/services/restaurant_service.js";
import openingHourService from "../src/services/open_hour_service.js";
import promotionService from "../src/services/promotion_service.js";
import priceTierService from "../src/services/price_tier_service.js";

async function run() {
  // Mock service calls to avoid DB connection during local testing
  restaurantService.findRestaurants = async (filters, limit) => [
    { name: "Romantic Terrace", cuisine: "Italian" },
    { name: "Quiet Bloom Cafe", cuisine: "Cafe" }
  ].slice(0, limit || 10);

  menuService.findMenus = async (filters, limit) => [
    { name: "Breakfast Menu", restaurantName: filters?.restaurantName || "Unknown" },
    { name: "Lunch Menu", restaurantName: filters?.restaurantName || "Unknown" }
  ].slice(0, limit || 10);

  menuService.findMenuItems = async (filters, limit) => [
    { name: "Latte", price: 4.5, restaurantName: "Starbucks" },
    { name: "Fried Chicken", price: 8.99, restaurantName: "KFC" }
  ].slice(0, limit || 10);

  openingHourService.getOpeningHours = async (restaurantName) => ([
    { day: "Mon", open: "08:00", close: "20:00", restaurantName },
    { day: "Tue", open: "08:00", close: "20:00", restaurantName }
  ]);
  openingHourService.findOpeningHours = async () => openingHourService.getOpeningHours("Unknown");

  promotionService.findPromotions = async () => ([
    { title: "Holiday Discount", discountPercent: 20 },
    { title: "Weekend Special", discountPercent: 15 }
  ]);

  priceTierService.getPriceTierInfo = async (tier) => ({ tier, avgPrice: 15 });
  priceTierService.findPriceTier = async () => ([{ tier: "MID_RANGE", avgPrice: 20 }]);

  const messages = [
    "hello",
    "Starbucks's menu",
    "menu for KFC",
    "What are McDonald's opening hours?",
  ];

  for (const msg of messages) {
    try {
      const res = await handleChat(msg, "demo-session");
      console.log(`\n> ${msg}\n${typeof res === "string" ? res : JSON.stringify(res, null, 2)}`);
    } catch (err) {
      console.error(`Error for message '${msg}':`, err?.message || err);
    }
  }
}

run();
