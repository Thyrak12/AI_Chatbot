import dotenv from "dotenv";
import { connectDB } from "../config/db.js";
import { Restaurant } from "../models/restaurant.js";
import { Menu } from "../models/menu.js";
import { Promotion } from "../models/promotion.js";
import { faker } from '@faker-js/faker';

dotenv.config();

// ----------------------
// Helper Data & Functions
// ----------------------
const AMBIENCES = [
  "romantic", "cozy", "lively", "quiet",
  "family-friendly", "casual", "healthy", "noisy"
];

const CUISINES = [
  "Cafe", "Deli", "Italian", "Mexican",
  "Japanese", "Indian", "Thai", "Mediterranean"
];

const TAGS = [
  "breakfast", "brunch", "dinner", "vegan",
  "gluten-free", "pet-friendly", "outdoor", "romantic"
];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr, n = 1) {
  const out = [];
  const copy = [...arr];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

// ----------------------
// Main Seeder
// ----------------------
async function seedAll() {
  try {
    await connectDB();
    console.log("Seeding restaurants (50), menus (300) and promotions (100)...");

    // Clear previous data
    await Promotion.deleteMany({});
    await Menu.deleteMany({});
    await Restaurant.deleteMany({});

    // ----------------------
    // Generate 50 Restaurants
    // ----------------------
    const restaurants = [];
    for (let i = 1; i <= 50; i++) {
      const ambience = pick(AMBIENCES, randInt(1, 3));
      const cuisine = CUISINES[randInt(0, CUISINES.length - 1)];

      restaurants.push({
        name: faker.company.name() + (i <= 5 ? ` - ${cuisine}` : ''),
        type: i % 3 === 0 ? "pub" : i % 3 === 1 ? "cafe" : "deli",
        address: (faker.address && typeof faker.address.streetAddress === 'function')
          ? faker.address.streetAddress()
          : (faker.location && typeof faker.location.streetAddress === 'function')
            ? faker.location.streetAddress()
            : `${(faker.location && faker.location.city) ? faker.location.city() : (faker.address && faker.address.city ? faker.address.city() : 'City')}, ${(faker.location && faker.location.country) ? faker.location.country() : (faker.address && faker.address.country ? faker.address.country() : 'Country')}`,
        location: {
          lat: 40.71 + Math.random() * 0.04 - 0.02,
          lng: -74.01 + Math.random() * 0.04 - 0.02
        },
        phone: faker.phone.number('+1-###-###-####'),
        description: faker.lorem.sentence() + ` A ${ambience.join(", ")} place serving ${cuisine}.`,
        cuisine,
        openingHours: `${randInt(6, 9)}:00-${randInt(20, 23)}:00`,
        numTables: randInt(5, 40),
        vipRooms: randInt(0, 2),
        hasPrivateRooms: Math.random() > 0.8,
        ambience
      });
    }

    const insertedRestaurants = await Restaurant.insertMany(restaurants);

    // ----------------------
    // Generate 300 Menu Items
    //  - First 90 are guaranteed "budget" (price <= 10)
    //  - Remaining are random in 1-60 range
    // ----------------------
    const menus = [];

    // Budget-friendly menus (roughly 30%)
    for (let i = 1; i <= 90; i++) {
      const r = insertedRestaurants[randInt(0, insertedRestaurants.length - 1)];
      // Generate dish names relevant to the restaurant cuisine/type
      const cuisine = r.cuisine || '';
      const category = pick(["drinks", "main", "dessert", "snack"], 1)[0];

      const name = (function makeDishName() {
        const adjective = faker.word && typeof faker.word.adjective === 'function' ? faker.word.adjective() : faker.commerce.productAdjective();
        const simple = (base) => `${adjective} ${base}`;

        const dishes = {
          Italian: {
            main: ['Margherita Pizza', 'Spaghetti Carbonara', 'Penne Arrabiata', 'Lasagna'],
            dessert: ['Tiramisu', 'Panna Cotta'],
            drinks: ['Espresso', 'Limoncello'],
            snack: ['Bruschetta', 'Focaccia']
          },
          Mexican: {
            main: ['Chicken Tacos', 'Carne Asada Burrito', 'Enchiladas', 'Chiles Rellenos'],
            dessert: ['Churros', 'Flan'],
            drinks: ['Horchata', 'Agua Fresca'],
            snack: ['Elote', 'Quesadilla']
          },
          Japanese: {
            main: ['Sushi Platter', 'Ramen Bowl', 'Teriyaki Chicken', 'Katsu Curry'],
            dessert: ['Mochi', 'Dorayaki'],
            drinks: ['Matcha Latte', 'Sake'],
            snack: ['Gyoza', 'Onigiri']
          },
          Indian: {
            main: ['Butter Chicken', 'Chana Masala', 'Lamb Rogan Josh', 'Biryani'],
            dessert: ['Gulab Jamun', 'Kheer'],
            drinks: ['Mango Lassi', 'Masala Chai'],
            snack: ['Samosa', 'Papad']
          },
          Thai: {
            main: ['Pad Thai', 'Green Curry', 'Tom Yum Soup', 'Massaman Curry'],
            dessert: ['Mango Sticky Rice', 'Coconut Ice Cream'],
            drinks: ['Thai Iced Tea', 'Coconut Shake'],
            snack: ['Satay', 'Spring Rolls']
          },
          Mediterranean: {
            main: ['Grilled Lamb', 'Falafel Wrap', 'Hummus Platter', 'Shawarma'],
            dessert: ['Baklava', 'Rice Pudding'],
            drinks: ['Turkish Coffee', 'Mint Tea'],
            snack: ['Tabbouleh', 'Dolma']
          },
          Cafe: {
            main: ['Club Sandwich', 'Avocado Toast', 'Quiche Lorraine'],
            dessert: ['Cheesecake', 'Blueberry Muffin'],
            drinks: ['Cappuccino', 'Cold Brew'],
            snack: ['Bagel', 'Croissant']
          },
          Deli: {
            main: ['Pastrami Sandwich', 'Reuben', 'BLT'],
            dessert: ['Brownie', 'Cookie'],
            drinks: ['Iced Tea', 'Soda'],
            snack: ['Pickle', 'Chips']
          }
        };

        const bucket = dishes[cuisine] || dishes['Cafe'];
        const choices = bucket[category === 'main' ? 'main' : (category === 'dessert' ? 'dessert' : (category === 'drinks' ? 'drinks' : 'snack'))];
        const base = choices[randInt(0, choices.length - 1)];
        return simple(base) + ` (Budget ${i})`;
      })();
      const price = Number((Math.random() * 9 + 1).toFixed(2)); // 1 - 10
      const tags = Array.from(new Set(["budget", ...pick(TAGS, randInt(0, 2))]));

      menus.push({
        restaurant: r._id,
        name,
        category,
        price,
        isSignature: Math.random() < 0.12,
        description: faker.lorem.sentence() + ` Perfect for budget diners.`,
        availability: Math.random() > 0.03,
        ingredients: pick(['chicken','beef','pork','tofu','rice','noodles','cheese','tomato'], randInt(0,4)),
        tags
      });
    }

    // Regular menus
    for (let i = 91; i <= 300; i++) {
      const r = insertedRestaurants[randInt(0, insertedRestaurants.length - 1)];

      const cuisine = r.cuisine || '';
      const category = pick(["drinks", "main", "dessert", "snack"], 1)[0];

      const name = (function makeDishName() {
        const adjective = faker.word && typeof faker.word.adjective === 'function' ? faker.word.adjective() : faker.commerce.productAdjective();
        const simple = (base) => `${adjective} ${base}`;

        const dishes = {
          Italian: {
            main: ['Pesto Gnocchi', 'Seafood Linguine', 'Ravioli'],
            dessert: ['Affogato', 'Cannoli'],
            drinks: ['Italian Soda', 'Grappa'],
            snack: ['Arancini', 'Antipasto']
          },
          Mexican: {
            main: ['Fish Tacos', 'Tamale Plate', 'Pozole'],
            dessert: ['Tres Leches', 'Sopapillas'],
            drinks: ['Paloma', 'Mezcal'],
            snack: ['Nachos', 'Taquitos']
          },
          Japanese: {
            main: ['Udon Noodle Soup', 'Sushi Roll', 'Donburi'],
            dessert: ['Green Tea Cake', 'Anmitsu'],
            drinks: ['Soda Ramune', 'Sakura Tea'],
            snack: ['Tempura', 'Edamame']
          },
          Indian: {
            main: ['Paneer Tikka', 'Dhal Fry', 'Chicken Tikka Masala'],
            dessert: ['Jalebi', 'Shrikhand'],
            drinks: ['Lassi', 'Filter Coffee'],
            snack: ['Vada', 'Bhel Puri']
          },
          Thai: {
            main: ['Panang Curry', 'Pad See Ew', 'Thai Salad'],
            dessert: ['Roti', 'Tapioca Pudding'],
            drinks: ['Pandan Drink', 'Lemongrass Tea'],
            snack: ['Crispy Tofu', 'Banana Fritters']
          },
          Mediterranean: {
            main: ['Moussaka', 'Grilled Halloumi', 'Kebab Plate'],
            dessert: ['Semolina Cake', 'Greek Yogurt with Honey'],
            drinks: ['Ayran', 'Herbal Tea'],
            snack: ['Pita with Dips', 'Olive Tapenade']
          },
          Cafe: {
            main: ['Breakfast Burrito', 'Smoked Salmon Bagel', 'Panini'],
            dessert: ['Lemon Tart', 'Scone'],
            drinks: ['Flat White', 'Herbal Latte'],
            snack: ['Granola', 'Pretzel']
          },
          Deli: {
            main: ['Tuna Melt', 'Gyro Wrap', 'Corned Beef Sandwich'],
            dessert: ['Fruit Cup', 'Rice Krispie'],
            drinks: ['Fountain Soda', 'Iced Coffee'],
            snack: ['Chips', 'Coleslaw']
          }
        };

        const bucket = dishes[cuisine] || dishes['Cafe'];
        const choices = bucket[category === 'main' ? 'main' : (category === 'dessert' ? 'dessert' : (category === 'drinks' ? 'drinks' : 'snack'))];
        const base = choices[randInt(0, choices.length - 1)];
        return simple(base) + ` (${i})`;
      })();

      const price = Number((Math.random() * 59 + 1).toFixed(2));
      const tags = pick(TAGS, randInt(0, 3));

      menus.push({
        restaurant: r._id,
        name,
        category,
        price,
        isSignature: Math.random() < 0.12,
        description: faker.lorem.sentence(),
        availability: Math.random() > 0.05,
        ingredients: pick(['chicken','beef','pork','tofu','rice','noodles','cheese','tomato','lettuce','onion'], randInt(0,4)),
        tags
      });
    }

    const insertedMenus = await Menu.insertMany(menus);

    // Ensure each restaurant has at least one signature item
    for (const rest of insertedRestaurants) {
      const restMenus = insertedMenus.filter(m => m.restaurant.toString() === rest._id.toString());
      const hasSignature = restMenus.some(m => m.isSignature);
      if (!hasSignature && restMenus.length > 0) {
        const pickMenu = restMenus[randInt(0, restMenus.length - 1)];
        await Menu.updateOne({ _id: pickMenu._id }, { $set: { isSignature: true } });
        // update local copy for any later logic
        const idx = insertedMenus.findIndex(m => m._id.toString() === pickMenu._id.toString());
        if (idx !== -1) insertedMenus[idx].isSignature = true;
      }
    }

    // ----------------------
    // Generate 100 Promotions
    // ----------------------
    const promotions = [];
    const now = new Date();

    for (let i = 1; i <= 100; i++) {
      const r = insertedRestaurants[randInt(0, insertedRestaurants.length - 1)];
      const menuPick =
        Math.random() > 0.3
          ? insertedMenus[randInt(0, insertedMenus.length - 1)]._id
          : null;

      const discountPercent = randInt(5, 50);
      const startDate = new Date(
        now.getTime() + randInt(-7, 7) * 24 * 60 * 60 * 1000
      );
      const endDate = new Date(
        startDate.getTime() + randInt(1, 30) * 24 * 60 * 60 * 1000
      );

      promotions.push({
        restaurant: r._id,
        menuItem: menuPick,
        title: `Promo ${i}`,
        description: `Save ${discountPercent}% at our place!`,
        discountPercent,
        startDate,
        endDate,
        conditions: "",
        status: endDate > now ? "active" : "expired"
      });
    }

    const insertedPromos = await Promotion.insertMany(promotions);

    console.log(
      `✔ Inserted ${insertedRestaurants.length} restaurants, ${insertedMenus.length} menus, ${insertedPromos.length} promotions`
    );

    process.exit(0);

  } catch (err) {
    console.error("❌ Seeder error:", err);
    process.exit(1);
  }
}

seedAll();
