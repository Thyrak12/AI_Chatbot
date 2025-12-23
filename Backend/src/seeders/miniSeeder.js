import dotenv from "dotenv";
import { faker } from "@faker-js/faker";
import { connectDB } from "../config/db.js";
import { Restaurant } from "../models/restaurant.js";
import { Menu } from "../models/menu.js";
import { OpeningHours } from "../models/openingHours.js";
import { PriceTierDetail } from "../models/priceTierDetail.js";
import { Promotion } from "../models/promotion.js";

dotenv.config();

/* ----------------- SOURCE DATA ----------------- */
const RESTAURANTS = [
  // FAST FOOD
  { name: "KFC Cambodia", cuisine: "Fast Food", category: "Fast Food", type: "fast_food", tier: "BUDGET", ambience: ["casual", "family-friendly", "quick-service"] },
  { name: "Pizza Hut Cambodia", cuisine: "Italian", category: "Pizza", type: "restaurant", tier: "MID_RANGE", ambience: ["casual", "family-friendly", "lively"] },
  { name: "Burger King Cambodia", cuisine: "Fast Food", category: "Burger", type: "fast_food", tier: "BUDGET", ambience: ["casual", "quick-service"] },

  // STREET FOOD
  { name: "Uncle Hai Street Food", cuisine: "Cambodian", category: "Street Food", type: "street_food", tier: "BUDGET", ambience: ["casual", "outdoor", "local-vibe"] },

  // CAFE
  { name: "Brown Coffee and Bakery", cuisine: "Cafe", category: "Cafe", type: "cafe", tier: "MID_RANGE", ambience: ["cozy", "quiet", "work-friendly", "instagram-worthy"] },
  { name: "Starbucks Cambodia", cuisine: "Cafe", category: "Cafe", type: "cafe", tier: "MID_RANGE", ambience: ["casual", "work-friendly", "modern"] },

  // CHINESE / BUFFET
  { name: "Haidilao Hot Pot", cuisine: "Chinese", category: "Hot Pot", type: "restaurant", tier: "PREMIUM", ambience: ["lively", "social", "family-friendly", "interactive"] },
  { name: "Lao Bao Chinese Buffet", cuisine: "Chinese", category: "Buffet", type: "restaurant", tier: "MID_RANGE", ambience: ["casual", "family-friendly", "lively"] },

  // LUXURY
  { name: "Omakase by Chef K", cuisine: "Japanese", category: "Omakase", type: "fine_dining", tier: "LUXURY", ambience: ["quiet", "intimate", "elegant", "romantic"] },
  { name: "La Maison Fine Dining", cuisine: "Western", category: "Fine Dining", type: "fine_dining", tier: "LUXURY", ambience: ["romantic", "elegant", "quiet", "upscale"] },
  { name: "Prime Steakhouse Phnom Penh", cuisine: "Steakhouse", category: "Steakhouse", type: "fine_dining", tier: "LUXURY", ambience: ["elegant", "business-friendly", "upscale", "quiet"] },
  { name: "Ocean Pearl Seafood Dining", cuisine: "Seafood", category: "Seafood Fine Dining", type: "fine_dining", tier: "LUXURY", ambience: ["elegant", "romantic", "scenic", "quiet"] },
  { name: "Imperial Luxury Buffet", cuisine: "International", category: "Luxury Buffet", type: "restaurant", tier: "PREMIUM", ambience: ["elegant", "family-friendly", "festive", "upscale"] }
];

/* ----------------- AMBIENCE TYPES REFERENCE ----------------- */
// All possible ambience values:
// - casual: Relaxed, informal atmosphere
// - quiet: Low noise level, peaceful
// - romantic: Perfect for dates and couples
// - family-friendly: Good for kids and families
// - lively: Energetic, bustling atmosphere
// - cozy: Warm, comfortable, intimate
// - elegant: Sophisticated, refined setting
// - upscale: High-end, luxurious feel
// - modern: Contemporary, trendy design
// - traditional: Classic, cultural decor
// - outdoor: Al fresco, terrace, garden seating
// - work-friendly: Good for laptop work, meetings
// - business-friendly: Suitable for business dinners
// - social: Great for groups and gatherings
// - intimate: Private, secluded atmosphere
// - festive: Celebratory, party atmosphere
// - local-vibe: Authentic local experience
// - instagram-worthy: Photogenic, aesthetic
// - scenic: Beautiful views
// - interactive: Engaging dining experience (e.g., hot pot, BBQ)
// - quick-service: Fast service, grab-and-go

/* ----------------- MENU GENERATOR ----------------- */
function menuItems(category, tier) {
  const items = {
    "Fast Food": [
      { name: "Fried Chicken Bucket (8 pcs)", description: "Crispy fried chicken with secret herbs and spices", type: "FOOD", isSignature: true },
      { name: "Fried Chicken Bucket (12 pcs)", description: "Family size crispy fried chicken", type: "FOOD", isSignature: false },
      { name: "Spicy Wings (6 pcs)", description: "Hot and spicy chicken wings", type: "FOOD", isSignature: false },
      { name: "Chicken Sandwich", description: "Crispy chicken fillet with lettuce and mayo", type: "FOOD", isSignature: false },
      { name: "Zinger Burger", description: "Spicy chicken burger with fresh vegetables", type: "FOOD", isSignature: true },
      { name: "Coleslaw", description: "Creamy coleslaw salad", type: "FOOD", isSignature: false },
      { name: "Mashed Potatoes", description: "Creamy mashed potatoes with gravy", type: "FOOD", isSignature: false },
      { name: "French Fries (Regular)", description: "Golden crispy fries", type: "FOOD", isSignature: false },
      { name: "French Fries (Large)", description: "Large portion of golden crispy fries", type: "FOOD", isSignature: false },
      { name: "Coca-Cola", description: "Ice cold Coca-Cola", type: "DRINK", isSignature: false },
      { name: "Pepsi", description: "Ice cold Pepsi", type: "DRINK", isSignature: false },
      { name: "Iced Tea", description: "Refreshing iced lemon tea", type: "DRINK", isSignature: false }
    ],
    "Burger": [
      { name: "Whopper", description: "Flame-grilled beef patty with fresh vegetables", type: "FOOD", isSignature: true },
      { name: "Double Whopper", description: "Two flame-grilled beef patties with cheese", type: "FOOD", isSignature: true },
      { name: "Chicken Royale", description: "Crispy chicken with lettuce and mayo", type: "FOOD", isSignature: false },
      { name: "Bacon King", description: "Beef patty with crispy bacon and cheese", type: "FOOD", isSignature: false },
      { name: "Veggie Burger", description: "Plant-based patty with fresh vegetables", type: "FOOD", isSignature: false },
      { name: "Cheeseburger", description: "Classic beef burger with melted cheese", type: "FOOD", isSignature: false },
      { name: "Onion Rings", description: "Crispy golden onion rings", type: "FOOD", isSignature: false },
      { name: "Chicken Nuggets (6 pcs)", description: "Tender chicken nuggets", type: "FOOD", isSignature: false },
      { name: "Chicken Nuggets (9 pcs)", description: "Tender chicken nuggets family size", type: "FOOD", isSignature: false },
      { name: "Milkshake Chocolate", description: "Creamy chocolate milkshake", type: "DRINK", isSignature: false },
      { name: "Milkshake Vanilla", description: "Classic vanilla milkshake", type: "DRINK", isSignature: false },
      { name: "Sprite", description: "Ice cold lemon-lime soda", type: "DRINK", isSignature: false }
    ],
    "Pizza": [
      { name: "Pepperoni Pizza (Medium)", description: "Classic pepperoni with mozzarella cheese", type: "FOOD", isSignature: true },
      { name: "Pepperoni Pizza (Large)", description: "Large pepperoni pizza for sharing", type: "FOOD", isSignature: false },
      { name: "Seafood Pizza", description: "Shrimp, squid, and crab stick with special sauce", type: "FOOD", isSignature: true },
      { name: "Hawaiian Pizza", description: "Ham and pineapple with mozzarella", type: "FOOD", isSignature: false },
      { name: "Meat Lovers Pizza", description: "Beef, bacon, sausage, and pepperoni", type: "FOOD", isSignature: false },
      { name: "Veggie Supreme", description: "Bell peppers, mushrooms, olives, and onions", type: "FOOD", isSignature: false },
      { name: "Cheese Pizza", description: "Classic four cheese blend pizza", type: "FOOD", isSignature: false },
      { name: "Garlic Bread", description: "Toasted bread with garlic butter", type: "FOOD", isSignature: false },
      { name: "Chicken Wings (8 pcs)", description: "BBQ glazed chicken wings", type: "FOOD", isSignature: false },
      { name: "Caesar Salad", description: "Fresh romaine with Caesar dressing", type: "FOOD", isSignature: false },
      { name: "Soft Drink", description: "Choice of Coke, Sprite, or Fanta", type: "DRINK", isSignature: false },
      { name: "Iced Lemon Tea", description: "Refreshing lemon tea", type: "DRINK", isSignature: false }
    ],
    "Street Food": [
      { name: "Grilled Pork Skewers (5 pcs)", description: "Marinated pork grilled over charcoal", type: "FOOD", isSignature: true },
      { name: "Grilled Beef Skewers (5 pcs)", description: "Tender beef skewers with special sauce", type: "FOOD", isSignature: false },
      { name: "Num Pang (Cambodian Sandwich)", description: "Baguette with pate, pickled vegetables, and meat", type: "FOOD", isSignature: true },
      { name: "Fried Noodles", description: "Stir-fried noodles with vegetables and egg", type: "FOOD", isSignature: false },
      { name: "Fried Rice", description: "Wok-fried rice with egg and vegetables", type: "FOOD", isSignature: false },
      { name: "Spring Rolls (4 pcs)", description: "Crispy fried spring rolls with dipping sauce", type: "FOOD", isSignature: false },
      { name: "Grilled Corn", description: "Sweet corn grilled with butter and salt", type: "FOOD", isSignature: false },
      { name: "Papaya Salad", description: "Spicy green papaya salad", type: "FOOD", isSignature: false },
      { name: "Sugar Cane Juice", description: "Fresh pressed sugar cane juice", type: "DRINK", isSignature: true },
      { name: "Coconut Water", description: "Fresh young coconut water", type: "DRINK", isSignature: false },
      { name: "Iced Coffee", description: "Strong Cambodian iced coffee with condensed milk", type: "DRINK", isSignature: false }
    ],
    "Cafe": [
      { name: "Espresso", description: "Strong single shot espresso", type: "DRINK", isSignature: false },
      { name: "Americano", description: "Espresso with hot water", type: "DRINK", isSignature: false },
      { name: "Latte", description: "Espresso with steamed milk", type: "DRINK", isSignature: true },
      { name: "Cappuccino", description: "Espresso with foamed milk", type: "DRINK", isSignature: true },
      { name: "Caramel Macchiato", description: "Vanilla latte with caramel drizzle", type: "DRINK", isSignature: false },
      { name: "Mocha", description: "Espresso with chocolate and steamed milk", type: "DRINK", isSignature: false },
      { name: "Iced Latte", description: "Chilled espresso with cold milk", type: "DRINK", isSignature: false },
      { name: "Matcha Latte", description: "Japanese green tea with steamed milk", type: "DRINK", isSignature: false },
      { name: "Fresh Orange Juice", description: "Freshly squeezed orange juice", type: "DRINK", isSignature: false },
      { name: "Cheese Cake", description: "Creamy New York style cheesecake", type: "FOOD", isSignature: true },
      { name: "Chocolate Brownie", description: "Rich chocolate brownie with walnuts", type: "FOOD", isSignature: false },
      { name: "Croissant", description: "Buttery French croissant", type: "FOOD", isSignature: false },
      { name: "Butter Croissant", description: "Flaky butter croissant", type: "FOOD", isSignature: false },
      { name: "Ham & Cheese Sandwich", description: "Toasted sandwich with ham and cheese", type: "FOOD", isSignature: false },
      { name: "Tuna Sandwich", description: "Classic tuna salad sandwich", type: "FOOD", isSignature: false },
      { name: "Blueberry Muffin", description: "Fresh baked blueberry muffin", type: "FOOD", isSignature: false }
    ],
    "Hot Pot": [
      { name: "Beef Hot Pot Set", description: "Premium sliced beef with vegetables and broth", type: "FOOD", isSignature: true },
      { name: "Lamb Hot Pot Set", description: "Tender lamb slices with hot pot vegetables", type: "FOOD", isSignature: true },
      { name: "Seafood Hot Pot Set", description: "Shrimp, fish, squid, and shellfish selection", type: "FOOD", isSignature: false },
      { name: "Pork Belly Slices", description: "Thinly sliced pork belly", type: "FOOD", isSignature: false },
      { name: "Mixed Mushroom Platter", description: "Enoki, shiitake, and oyster mushrooms", type: "FOOD", isSignature: false },
      { name: "Vegetable Platter", description: "Fresh vegetables for hot pot", type: "FOOD", isSignature: false },
      { name: "Handmade Noodles", description: "Fresh pulled noodles", type: "FOOD", isSignature: false },
      { name: "Fish Ball Platter", description: "Assorted fish and meat balls", type: "FOOD", isSignature: false },
      { name: "Tofu Selection", description: "Soft tofu, fried tofu, and tofu skin", type: "FOOD", isSignature: false },
      { name: "Spicy Mala Broth", description: "Sichuan spicy numbing broth", type: "FOOD", isSignature: true },
      { name: "Tomato Broth", description: "Tangy tomato soup base", type: "FOOD", isSignature: false },
      { name: "Plum Juice", description: "Sweet and sour plum drink", type: "DRINK", isSignature: false },
      { name: "Soy Milk", description: "Fresh homemade soy milk", type: "DRINK", isSignature: false },
      { name: "Chinese Tea", description: "Traditional Chinese tea", type: "DRINK", isSignature: false }
    ],
    "Buffet": [
      { name: "Lunch Buffet (Adult)", description: "All-you-can-eat lunch buffet", type: "FOOD", isSignature: true },
      { name: "Lunch Buffet (Child)", description: "Kids lunch buffet (under 12)", type: "FOOD", isSignature: false },
      { name: "Dinner Buffet (Adult)", description: "Premium dinner buffet with seafood", type: "FOOD", isSignature: true },
      { name: "Dinner Buffet (Child)", description: "Kids dinner buffet (under 12)", type: "FOOD", isSignature: false },
      { name: "Weekend Brunch Buffet", description: "Special weekend brunch selection", type: "FOOD", isSignature: false },
      { name: "Soft Drink (Free Flow)", description: "Unlimited soft drinks", type: "DRINK", isSignature: false },
      { name: "Fresh Juice Station", description: "Freshly squeezed juices", type: "DRINK", isSignature: false },
      { name: "Beer (Per Glass)", description: "Draft beer", type: "DRINK", isSignature: false }
    ],
    "Omakase": [
      { name: "Seasonal Omakase Course (12 pcs)", description: "Chef's selection of 12 seasonal nigiri and sashimi", type: "FOOD", isSignature: true },
      { name: "Premium Omakase Course (15 pcs)", description: "Extended tasting with premium fish selection", type: "FOOD", isSignature: true },
      { name: "Deluxe Omakase Course (18 pcs)", description: "Ultimate omakase experience with rare cuts", type: "FOOD", isSignature: true },
      { name: "A5 Wagyu Nigiri", description: "Japanese A5 wagyu beef sushi", type: "FOOD", isSignature: true },
      { name: "Uni (Sea Urchin)", description: "Fresh Hokkaido sea urchin", type: "FOOD", isSignature: false },
      { name: "Otoro (Fatty Tuna)", description: "Premium fatty tuna belly", type: "FOOD", isSignature: false },
      { name: "King Crab Sashimi", description: "Fresh king crab sashimi", type: "FOOD", isSignature: false },
      { name: "Miso Soup", description: "Traditional red miso soup", type: "FOOD", isSignature: false },
      { name: "Japanese Green Tea", description: "Premium sencha green tea", type: "DRINK", isSignature: false },
      { name: "Sake (Premium)", description: "Junmai Daiginjo sake", type: "DRINK", isSignature: true },
      { name: "Sake (House)", description: "House selection sake", type: "DRINK", isSignature: false },
      { name: "Japanese Whisky", description: "Yamazaki 12 year", type: "DRINK", isSignature: false }
    ],
    "Fine Dining": [
      { name: "Chef Tasting Menu (5 Course)", description: "Five course tasting experience", type: "FOOD", isSignature: true },
      { name: "Chef Tasting Menu (7 Course)", description: "Seven course culinary journey", type: "FOOD", isSignature: true },
      { name: "Foie Gras Terrine", description: "Pan-seared foie gras with fig compote", type: "FOOD", isSignature: false },
      { name: "Lobster Bisque", description: "Creamy lobster soup with cognac", type: "FOOD", isSignature: false },
      { name: "Duck Confit", description: "Slow-cooked duck leg with orange glaze", type: "FOOD", isSignature: false },
      { name: "Beef Wellington", description: "Tenderloin wrapped in puff pastry", type: "FOOD", isSignature: true },
      { name: "Pan-Seared Sea Bass", description: "Mediterranean sea bass with herbs", type: "FOOD", isSignature: false },
      { name: "Truffle Risotto", description: "Arborio rice with black truffle", type: "FOOD", isSignature: false },
      { name: "Cheese Selection", description: "Artisanal cheese board", type: "FOOD", isSignature: false },
      { name: "Chocolate Soufflé", description: "Warm chocolate soufflé with vanilla ice cream", type: "FOOD", isSignature: false },
      { name: "House Wine (Red)", description: "Selected Bordeaux red wine", type: "DRINK", isSignature: false },
      { name: "House Wine (White)", description: "Selected Burgundy white wine", type: "DRINK", isSignature: false },
      { name: "Champagne", description: "Dom Pérignon or similar", type: "DRINK", isSignature: true },
      { name: "Cognac", description: "Hennessy XO", type: "DRINK", isSignature: false }
    ],
    "Steakhouse": [
      { name: "Wagyu Ribeye Steak (200g)", description: "Japanese A5 wagyu ribeye", type: "FOOD", isSignature: true },
      { name: "Wagyu Ribeye Steak (300g)", description: "Large cut Japanese A5 wagyu ribeye", type: "FOOD", isSignature: true },
      { name: "USDA Prime Ribeye", description: "28-day dry-aged USDA Prime ribeye", type: "FOOD", isSignature: false },
      { name: "Filet Mignon", description: "Premium beef tenderloin", type: "FOOD", isSignature: true },
      { name: "Porterhouse (For Two)", description: "32oz porterhouse steak for sharing", type: "FOOD", isSignature: false },
      { name: "Tomahawk Steak", description: "Long-bone ribeye steak", type: "FOOD", isSignature: false },
      { name: "Grilled Lamb Chops", description: "New Zealand lamb chops", type: "FOOD", isSignature: false },
      { name: "Caesar Salad", description: "Classic Caesar with anchovies", type: "FOOD", isSignature: false },
      { name: "Lobster Tail", description: "Grilled Maine lobster tail", type: "FOOD", isSignature: false },
      { name: "Creamed Spinach", description: "Classic steakhouse side", type: "FOOD", isSignature: false },
      { name: "Truffle Mashed Potatoes", description: "Whipped potatoes with black truffle", type: "FOOD", isSignature: false },
      { name: "Red Wine (Cabernet)", description: "Napa Valley Cabernet Sauvignon", type: "DRINK", isSignature: true },
      { name: "Old Fashioned", description: "Classic whiskey cocktail", type: "DRINK", isSignature: false },
      { name: "Craft Beer", description: "Selection of craft beers", type: "DRINK", isSignature: false }
    ],
    "Seafood Fine Dining": [
      { name: "Grilled Lobster", description: "Whole Maine lobster with garlic butter", type: "FOOD", isSignature: true },
      { name: "Lobster Thermidor", description: "Classic French lobster dish", type: "FOOD", isSignature: true },
      { name: "Alaskan King Crab (Per Kg)", description: "Fresh Alaskan king crab legs", type: "FOOD", isSignature: true },
      { name: "Oysters (6 pcs)", description: "Fresh oysters on ice", type: "FOOD", isSignature: false },
      { name: "Oysters (12 pcs)", description: "Dozen fresh oysters", type: "FOOD", isSignature: false },
      { name: "Grilled Tiger Prawns", description: "Jumbo tiger prawns with herb butter", type: "FOOD", isSignature: false },
      { name: "Seafood Platter (For Two)", description: "Lobster, crab, prawns, and oysters", type: "FOOD", isSignature: true },
      { name: "Pan-Seared Scallops", description: "Hokkaido scallops with truffle", type: "FOOD", isSignature: false },
      { name: "Grilled Sea Bass", description: "Whole sea bass with Mediterranean herbs", type: "FOOD", isSignature: false },
      { name: "Clam Chowder", description: "New England style clam chowder", type: "FOOD", isSignature: false },
      { name: "Champagne", description: "Moët & Chandon", type: "DRINK", isSignature: true },
      { name: "White Wine", description: "Chablis or Sancerre", type: "DRINK", isSignature: false },
      { name: "Sparkling Water", description: "San Pellegrino", type: "DRINK", isSignature: false }
    ],
    "Luxury Buffet": [
      { name: "Premium Buffet (Lunch)", description: "Unlimited access to premium lunch stations", type: "FOOD", isSignature: true },
      { name: "Premium Buffet (Dinner)", description: "Unlimited access to premium dinner stations", type: "FOOD", isSignature: true },
      { name: "Lobster & Crab Station", description: "Fresh lobster and crab legs", type: "FOOD", isSignature: true },
      { name: "Sashimi Station", description: "Premium sashimi selection", type: "FOOD", isSignature: false },
      { name: "Carving Station", description: "Prime rib and roasted meats", type: "FOOD", isSignature: false },
      { name: "Champagne Brunch (Weekend)", description: "Weekend brunch with champagne", type: "FOOD", isSignature: true },
      { name: "Wine Pairing Package", description: "Selected wines to pair with buffet", type: "DRINK", isSignature: false },
      { name: "Premium Spirits Package", description: "Access to premium spirits bar", type: "DRINK", isSignature: false },
      { name: "Fresh Juice Bar", description: "Freshly squeezed juices", type: "DRINK", isSignature: false }
    ]
  };

  const prices = {
    BUDGET: { FOOD: [2, 6], DRINK: [1, 3] },
    MID_RANGE: { FOOD: [6, 15], DRINK: [3, 6] },
    PREMIUM: { FOOD: [20, 50], DRINK: [5, 15] },
    LUXURY: { FOOD: [80, 150], DRINK: [15, 50] }
  };

  const categoryItems = items[category] || [
    { name: "Signature Dish", description: "Chef's special creation", type: "FOOD", isSignature: true }
  ];

  return categoryItems.map(item => ({
    name: item.name,
    description: item.description,
    price: faker.number.int({ min: prices[tier][item.type][0], max: prices[tier][item.type][1] }),
    type: item.type,
    isSignature: item.isSignature,
    availability: faker.datatype.boolean({ probability: 0.95 }) // 95% available
  }));
}
/* ----------------- OPENING HOURS GENERATOR ----------------- */
const DAYS_OF_WEEK = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function generateOpeningHours(restaurantId, type, tier) {
  const schedules = {
    fast_food: { open: "07:00", close: "22:00", closedDays: [] },
    cafe: { open: "06:30", close: "21:00", closedDays: [] },
    street_food: { open: "10:00", close: "21:00", closedDays: ["MON"] },
    restaurant: { open: "11:00", close: "22:00", closedDays: [] },
    fine_dining: { open: "18:00", close: "23:00", closedDays: ["MON"] }
  };

  const schedule = schedules[type] || schedules.restaurant;

  return DAYS_OF_WEEK.map(day => ({
    restaurantId,
    dayOfWeek: day,
    openTime: schedule.closedDays.includes(day) ? null : schedule.open,
    closeTime: schedule.closedDays.includes(day) ? null : schedule.close
  }));
}

/* ----------------- PRICE TIER DATA ----------------- */
const PRICE_TIER_DETAILS = [
  { tier: "BUDGET", dishMin: 2, dishMax: 6, drinkMin: 1, drinkMax: 3, description: "Affordable street food and fast food options, perfect for quick meals under $6." },
  { tier: "MID_RANGE", dishMin: 6, dishMax: 15, drinkMin: 3, drinkMax: 6, description: "Casual dining with quality food, typically $6-$15 per dish." },
  { tier: "PREMIUM", dishMin: 20, dishMax: 50, drinkMin: 5, drinkMax: 15, description: "Upscale dining experience with premium ingredients, $20-$50 per dish." },
  { tier: "LUXURY", dishMin: 80, dishMax: 200, drinkMin: 15, drinkMax: 50, description: "Fine dining and omakase experiences, $80+ per person with exceptional service." }
];

/* ----------------- PROMOTION GENERATOR ----------------- */
function generatePromotions(restaurants, menus) {
  const promotionTemplates = [
    { title: "Holiday Special", discountPercent: 15, conditions: "Valid for dine-in only. Cannot be combined with other offers." },
    { title: "Weekend Brunch Deal", discountPercent: 10, conditions: "Available Saturday and Sunday, 10AM-2PM only." },
    { title: "Happy Hour", discountPercent: 20, conditions: "Valid 4PM-6PM on weekdays. Drinks only." },
    { title: "Student Discount", discountPercent: 10, conditions: "Must show valid student ID. Dine-in only." },
    { title: "Family Bundle", discountPercent: 15, conditions: "Minimum 4 people. Not valid on public holidays." },
    { title: "New Year Celebration", discountPercent: 25, conditions: "Valid from Dec 25 to Jan 5. Reservation required." },
    { title: "Loyalty Member Special", discountPercent: 12, conditions: "Members only. Register at counter." },
    { title: "Early Bird Dinner", discountPercent: 15, conditions: "Order before 6PM. Dine-in only." }
  ];

  const promotions = [];
  const now = new Date();

  restaurants.forEach((restaurant, index) => {
    // Each restaurant gets 1-2 promotions
    const numPromotions = faker.number.int({ min: 1, max: 2 });
    
    for (let i = 0; i < numPromotions; i++) {
      const template = promotionTemplates[(index + i) % promotionTemplates.length];
      const menu = menus.find(m => m.restaurantId.toString() === restaurant._id.toString());
      
      // Random status distribution
      const statusRoll = faker.number.int({ min: 1, max: 10 });
      let startDate, endDate, status;
      
      if (statusRoll <= 6) {
        // Active promotion (60%)
        startDate = new Date(now.getTime() - faker.number.int({ min: 1, max: 14 }) * 24 * 60 * 60 * 1000);
        endDate = new Date(now.getTime() + faker.number.int({ min: 7, max: 30 }) * 24 * 60 * 60 * 1000);
        status = "active";
      } else if (statusRoll <= 8) {
        // Scheduled promotion (20%)
        startDate = new Date(now.getTime() + faker.number.int({ min: 3, max: 14 }) * 24 * 60 * 60 * 1000);
        endDate = new Date(startDate.getTime() + faker.number.int({ min: 14, max: 30 }) * 24 * 60 * 60 * 1000);
        status = "scheduled";
      } else {
        // Expired promotion (20%)
        endDate = new Date(now.getTime() - faker.number.int({ min: 1, max: 30 }) * 24 * 60 * 60 * 1000);
        startDate = new Date(endDate.getTime() - faker.number.int({ min: 14, max: 30 }) * 24 * 60 * 60 * 1000);
        status = "expired";
      }

      promotions.push({
        restaurant: restaurant._id,
        menu: menu ? menu._id : null,
        title: template.title,
        description: `${template.title} at ${restaurant.name}! Enjoy ${template.discountPercent}% off.`,
        discountPercent: template.discountPercent,
        startDate,
        endDate,
        conditions: template.conditions,
        status
      });
    }
  });

  return promotions;
}
/* ----------------- SEEDER ----------------- */
async function seed() {
  try {
    await connectDB();

    await Restaurant.deleteMany({});
    await Menu.deleteMany({});
    await OpeningHours.deleteMany({});
    await PriceTierDetail.deleteMany({});
    await Promotion.deleteMany({});

    // Seed Price Tier Details first (reference data)
    await PriceTierDetail.insertMany(PRICE_TIER_DETAILS);
    console.log("✅ Price tier details seeded");

    const restaurants = await Restaurant.insertMany(
      RESTAURANTS.map(r => ({
        name: r.name,
        type: r.type,
        cuisine: r.cuisine,
        category: r.category,
        priceTier: r.tier,
        ambience: r.ambience || ["casual"],
        address: faker.location.streetAddress() + ", Phnom Penh",
        location: { lat: 11.556 + Math.random() * 0.04, lng: 104.928 + Math.random() * 0.04 },
        phone: faker.phone.number("+855 ## ### ###"),
        hasPrivateRooms: r.tier !== "BUDGET",
        status: "OPEN",
        description: `${r.name} is a popular ${r.category} restaurant in Cambodia.`
      }))
    );
    console.log("✅ Restaurants seeded");

    const menus = await Menu.insertMany(
      restaurants.map(r => ({
        restaurantId: r._id,
        name: "Main Menu",
        description: `${r.category} specialties`,
        items: menuItems(r.category, r.priceTier)
      }))
    );
    console.log("✅ Menus seeded");

    // Seed Opening Hours for each restaurant
    const openingHoursData = [];
    restaurants.forEach(r => {
      const originalRestaurant = RESTAURANTS.find(orig => orig.name === r.name);
      const hours = generateOpeningHours(r._id, originalRestaurant?.type || "restaurant", r.priceTier);
      openingHoursData.push(...hours);
    });
    await OpeningHours.insertMany(openingHoursData);
    console.log("✅ Opening hours seeded");

    // Seed Promotions
    const promotions = generatePromotions(restaurants, menus);
    await Promotion.insertMany(promotions);
    console.log("✅ Promotions seeded");

    console.log("\n🎉 Mini seeder completed successfully!");
    console.log(`   - ${restaurants.length} restaurants`);
    console.log(`   - ${menus.length} menus`);
    console.log(`   - ${openingHoursData.length} opening hour entries`);
    console.log(`   - ${PRICE_TIER_DETAILS.length} price tier details`);
    console.log(`   - ${promotions.length} promotions`);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
