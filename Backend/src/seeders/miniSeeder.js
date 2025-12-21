// src/seeders/seedData.js
import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';
import { Restaurant } from '../models/restaurant.js';
import { Menu } from '../models/menu.js';
import { Promotion } from '../models/promotion.js';
import { PriceTierDetail } from '../models/priceTierDetail.js';
import { OpeningHours } from '../models/openingHours.js';
import { faker } from '@faker-js/faker';

dotenv.config();

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

const AMBIENCES = ["romantic","cozy","lively","quiet","family-friendly","casual","healthy"];
const CUISINES = ["Cafe","Deli","Italian","Mexican","Japanese","Indian","Thai","Mediterranean"];
const TAGS = ["breakfast","brunch","dinner","vegan","gluten-free","pet-friendly","outdoor","romantic"];

async function seedData() {
  try {
    await connectDB();
    console.log('Connected to DB, starting seeder...');

    // Clear existing data
    await Promise.all([
      Promotion.deleteMany({}),
      Menu.deleteMany({}),
      OpeningHours.deleteMany({}),
      Restaurant.deleteMany({}),
      PriceTierDetail.deleteMany({})
    ]);

    // 1️⃣ Price tiers
    const tiers = [
      { tier:'BUDGET', dishMin:0, dishMax:8, drinkMin:0, drinkMax:4, description:'Budget-friendly meals.' },
      { tier:'MID_RANGE', dishMin:8, dishMax:20, drinkMin:3, drinkMax:8, description:'Mid-range meals.' },
      { tier:'PREMIUM', dishMin:20, dishMax:50, drinkMin:6, drinkMax:15, description:'Premium dining.' },
      { tier:'LUXURY', dishMin:50, dishMax:999, drinkMin:15, drinkMax:999, description:'Luxury dining.' }
    ];
    await PriceTierDetail.insertMany(tiers);

    // 2️⃣ Restaurants
    const rCount = randInt(5, 10);
    const restaurants = [];
    for (let i = 0; i < rCount; i++) {
      const tier = faker.helpers.arrayElement(['BUDGET','MID_RANGE','PREMIUM','LUXURY']);
      const ambience = pick(AMBIENCES, randInt(1,2));
      restaurants.push({
        name: `${faker.company.name()}${i}`,
        type: faker.helpers.arrayElement(['cafe','restaurant','pub','deli']),
        address: faker.location.streetAddress(),
        location: { lat: 40.7 + Math.random()*0.06 - 0.03, lng: -74.0 + Math.random()*0.06 - 0.03 },
        phone: faker.phone.number('+1-###-###-####'),
        description: faker.lorem.sentence() + ` A ${ambience.join(', ')} place.`,
        cuisine: faker.helpers.arrayElement(CUISINES),
        hasPrivateRooms: Math.random() > 0.8,
        ambience,
        priceTier: tier,
        status: 'OPEN',
        category: faker.helpers.arrayElement(['BBQ','Café','Fine Dining','Street Food','Japanese','Thai']),
      });
    }
    const insertedRestaurants = await Restaurant.insertMany(restaurants);

    // 3️⃣ Menus
    const menus = [];
    for (const r of insertedRestaurants) {
      const mCount = randInt(1, 2);
      for (let j = 0; j < mCount; j++) {
        const menuItems = [];
        const itemCount = randInt(3, 8);
        for (let k = 0; k < itemCount; k++) {
          const basePrice = r.priceTier === 'BUDGET' ? randInt(2,10)
                           : r.priceTier === 'MID_RANGE' ? randInt(8,25)
                           : r.priceTier === 'PREMIUM' ? randInt(20,60)
                           : randInt(50,200);
          menuItems.push({
            name: faker.food.dish ? faker.food.dish() : faker.commerce.productName(),
            description: faker.lorem.sentence(),
            price: Number((basePrice * (0.8 + Math.random()*0.6)).toFixed(2)),
            type: Math.random() > 0.7 ? 'DRINK' : 'FOOD',
            isSignature: Math.random() < 0.2,
            ingredients: pick(['chicken','beef','pork','tofu','rice','noodles','cheese','tomato','lettuce','onion'], randInt(0,3)),
            tags: pick(TAGS, randInt(0,2)),
            availability: true
          });
        }
        menus.push({
          restaurantId: r._id,
          name: j === 0 ? 'Main' : 'Drinks',
          description: `${r.cuisine} ${j === 0 ? 'main' : 'beverages'}`,
          items: menuItems
        });
      }
    }
    const insertedMenus = await Menu.insertMany(menus);

    // 4️⃣ Opening hours
    const openingDocs = [];
    for (const r of insertedRestaurants) {
      const days = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
      for (const d of days) {
        openingDocs.push({
          restaurantId: r._id,
          dayOfWeek: d,
          openTime: '10:00',
          closeTime: d === 'SUN' ? '20:00' : '22:00'
        });
      }
    }
    await OpeningHours.insertMany(openingDocs);

    // 5️⃣ Promotions
    const promoCount = randInt(5, 15);
    const promotions = [];
    const now = new Date();
    for (let p = 0; p < promoCount; p++) {
      const menu = faker.helpers.arrayElement(insertedMenus);
      promotions.push({
        restaurant: menu.restaurantId,
        menuItem: null, // optional
        title: `Promo ${p+1}`,
        description: faker.lorem.sentence(),
        discountPercent: randInt(5,40),
        startDate: new Date(now.getTime() + randInt(-3,3)*24*60*60*1000),
        endDate: new Date(now.getTime() + randInt(1,14)*24*60*60*1000),
        status: 'active'
      });
    }
    await Promotion.insertMany(promotions);

    console.log('Seeder complete ✅');
    process.exit(0);
  } catch (err) {
    console.error('Seeder error:', err);
    process.exit(1);
  }
}

seedData();
