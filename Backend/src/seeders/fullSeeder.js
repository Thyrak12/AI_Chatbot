import dotenv from "dotenv";
import { connectDB } from "../config/db.js";
import { Restaurant } from "../models/restaurant.js";
import { Menu } from "../models/menu.js";
import { MenuItem } from "../models/menuItem.js";
import { Promotion } from "../models/promotion.js";
import { PriceTierDetail } from "../models/priceTierDetail.js";
import { OpeningHours } from "../models/openingHours.js";
import { faker } from '@faker-js/faker';

dotenv.config();

const AMBIENCES = ["romantic","cozy","lively","quiet","family-friendly","casual","healthy","noisy"];
const CUISINES = ["Cafe","Deli","Italian","Mexican","Japanese","Indian","Thai","Mediterranean"];
const TAGS = ["breakfast","brunch","dinner","vegan","gluten-free","pet-friendly","outdoor","romantic"];

function randInt(min, max){ return Math.floor(Math.random()*(max-min+1))+min }
function pick(arr,n=1){ const out=[]; const copy=[...arr]; for(let i=0;i<n&&copy.length>0;i++){ const idx=Math.floor(Math.random()*copy.length); out.push(copy.splice(idx,1)[0]); } return out }

// shift a HH:MM string by minutes offset (positive or negative)
function shiftTime(hhmm, minutesOffset){
  const [hh,mm] = hhmm.split(':').map(Number);
  const total = hh*60 + mm + minutesOffset;
  const norm = (total + 24*60) % (24*60);
  const nh = String(Math.floor(norm/60)).padStart(2,'0');
  const nm = String(norm%60).padStart(2,'0');
  return `${nh}:${nm}`;
}

async function seedAll(){
  try{
    await connectDB();
    console.log('Seeding price tiers, restaurants, menus, menu_items and promotions...');

    await Promotion.deleteMany({});
    await MenuItem.deleteMany({});
    await Menu.deleteMany({});
    await Restaurant.deleteMany({});
    await OpeningHours.deleteMany({});
    await PriceTierDetail.deleteMany({});

    const tiers=[
      { tier:'BUDGET', dishMin:0, dishMax:8, drinkMin:0, drinkMax:4, description:'Budget-friendly meals (cheap bites, street-food style).'},
      { tier:'MID_RANGE', dishMin:8, dishMax:20, drinkMin:3, drinkMax:8, description:'Affordable mid-range meals.'},
      { tier:'PREMIUM', dishMin:20, dishMax:50, drinkMin:6, drinkMax:15, description:'Premium casual dining.'},
      { tier:'LUXURY', dishMin:50, dishMax:999, drinkMin:15, drinkMax:999, description:'High-end dining.'}
    ];
    await PriceTierDetail.insertMany(tiers);

    const restaurants=[];
    // Ensure a realistic distribution across price tiers
    const tierDistribution = {
      BUDGET: 12,
      MID_RANGE: 20,
      PREMIUM: 12,
      LUXURY: 6
    };
    const tierNames = Object.keys(tierDistribution);
    let idx = 0;
    for(const tier of tierNames){
      const count = tierDistribution[tier];
      for(let j=0;j<count;j++){
        idx++;
        const ambience = pick(AMBIENCES, randInt(1,3));
        const cuisine = CUISINES[randInt(0,CUISINES.length-1)];
        // force some romantic ambience on PREMIUM/LUXURY for 'fancy' queries
        if ((tier === 'PREMIUM' || tier === 'LUXURY') && Math.random() < 0.6 && !ambience.includes('romantic')) ambience.push('romantic');
        restaurants.push({
          name: `${faker.company.name()}${j<3?` - ${cuisine}`:''}`,
          type: j%3===0?'pub':j%3===1?'cafe':'restaurant',
          address: faker.location.streetAddress ? faker.location.streetAddress() : `${faker.address?.streetAddress?.() || 'Unknown'}`,
          location:{ lat:40.71+Math.random()*0.04-0.02, lng:-74.01+Math.random()*0.04-0.02 },
          phone: faker.phone.number ? faker.phone.number('+1-###-###-####') : `+1-555-000-${String(idx).padStart(4,'0')}`,
          description: `${faker.lorem.sentence()} A ${ambience.join(', ')} place serving ${cuisine}.`,
          cuisine,
          hasPrivateRooms: Math.random()>0.85,
          ambience,
          priceTier: tier,
          status:'OPEN', closedUntil:null,
          category: faker.helpers.arrayElement(['Khmer','BBQ','Café','Pub','Fine Dining','Street Food','Mediterranean','Japanese','Thai']),
          averageFoodPrice:null, averageDrinkPrice:null
        });
      }
    }
    const insertedRestaurants = await Restaurant.insertMany(restaurants);

    // ----------------------
    // Seed opening hours for each restaurant (MON-SUN)
    // ----------------------
    const week = ["MON","TUE","WED","THU","FRI","SAT","SUN"]; 
    const openingDocs = [];
    for (const r of insertedRestaurants) {
      // base open/close times — vary slightly by type
      const baseOpen = r.type === 'cafe' ? '07:00' : '10:00';
      const baseClose = r.type === 'pub' ? '01:00' : '22:00';
      for (const d of week) {
        // random chance closed on weekday (rare), more likely closed or shortened on SUN
        const closedChance = d === 'SUN' ? 0.25 : 0.04;
        if (Math.random() < closedChance) {
          openingDocs.push({ restaurantId: r._id, dayOfWeek: d, openTime: null, closeTime: null });
        } else {
          // vary times by +/- up to 60 minutes
          const openOffset = Math.floor((Math.random() - 0.5) * 60); // -30..+30
          const closeOffset = Math.floor((Math.random() - 0.5) * 120); // -60..+60
          const openTime = shiftTime(baseOpen, openOffset);
          const closeTime = shiftTime(baseClose, closeOffset);
          openingDocs.push({ restaurantId: r._id, dayOfWeek: d, openTime, closeTime });
        }
      }
    }
    if (openingDocs.length) await OpeningHours.insertMany(openingDocs);

    const menusToInsert=[];
    for(const r of insertedRestaurants){ menusToInsert.push({ restaurantId: r._id, name:'Main', description:`${r.cuisine||''} main dishes` }); menusToInsert.push({ restaurantId: r._id, name:'Drinks', description:'Beverages and drinks' }) }
    const insertedMenus = await Menu.insertMany(menusToInsert);

    const menuItems=[]; let budgetCount=0; const TARGET_ITEMS=350;
    for(let i=0;i<TARGET_ITEMS;i++){
      const menuDoc = insertedMenus[randInt(0, insertedMenus.length-1)];
      // price distribution tied loosely to restaurant's tier
      const rest = insertedRestaurants.find(r=>String(r._id)===String(menuDoc.restaurantId));
      let basePrice;
      if(rest && rest.priceTier==='BUDGET') basePrice = Number((Math.random()*7+2).toFixed(2));
      else if(rest && rest.priceTier==='MID_RANGE') basePrice = Number((Math.random()*18+8).toFixed(2));
      else if(rest && rest.priceTier==='PREMIUM') basePrice = Number((Math.random()*40+18).toFixed(2));
      else basePrice = Number((Math.random()*150+40).toFixed(2));
      // small chance of very cheap special
      const price = Number((basePrice * (0.6 + Math.random()*1.4)).toFixed(2));
      const dishName = faker.food && faker.food.dish ? faker.food.dish() : `${faker.commerce.productAdjective()} ${faker.commerce.product()}`;
      const name = `${dishName}${Math.random()<0.1 ? ' (Chef\'s special)' : ''}`;
      const isVeg = /tofu|vegetable|salad|vegetarian|vegan/i.test(name) || Math.random()<0.12;
      const tagsForItem = [];
      if(isVeg) tagsForItem.push('vegetarian');
      if(Math.random()<0.15) tagsForItem.push('spicy');
      if(Math.random()<0.1) tagsForItem.push('gluten-free');
      const isSignature = Math.random() < 0.18; // ~18% signatures
      menuItems.push({ menuId: menuDoc._id, restaurantId: menuDoc.restaurantId, name, description: faker.lorem.sentence(), price, type: Math.random()>0.65?'DRINK':'FOOD', isSignature, ingredients: pick(['chicken','beef','pork','tofu','rice','noodles','cheese','tomato','lettuce','onion','mushroom'], randInt(0,4)), tags: tagsForItem.concat(pick(TAGS, randInt(0,1))), availability: Math.random()>0.03 })
    }
    const insertedMenuItems = await MenuItem.insertMany(menuItems);

    // Ensure each restaurant has at least one signature item
    for(const rest of insertedRestaurants){ const hasSig = insertedMenuItems.some(m=>m.restaurantId.toString()===rest._id.toString() && m.isSignature); if(!hasSig){ const candidate = insertedMenuItems.find(m=>m.restaurantId.toString()===rest._id.toString()); if(candidate) await MenuItem.updateOne({_id:candidate._id}, {$set:{isSignature:true}}) }}

    // Compute and update averageFoodPrice / averageDrinkPrice per restaurant
    for(const rest of insertedRestaurants){
      const items = insertedMenuItems.filter(m=>m.restaurantId.toString()===rest._id.toString());
      const foods = items.filter(i=>i.type==='FOOD');
      const drinks = items.filter(i=>i.type==='DRINK');
      const avgFood = foods.length ? (foods.reduce((s,n)=>s+n.price,0)/foods.length) : null;
      const avgDrink = drinks.length ? (drinks.reduce((s,n)=>s+n.price,0)/drinks.length) : null;
      await Restaurant.updateOne({_id:rest._id}, {$set:{ averageFoodPrice: avgFood ? Number(avgFood.toFixed(2)) : null, averageDrinkPrice: avgDrink ? Number(avgDrink.toFixed(2)) : null }});
    }

    const promotions=[]; const now=new Date(); const totalPromos=100;
    for(let i=1;i<=totalPromos;i++){ const item = insertedMenuItems[randInt(0, insertedMenuItems.length-1)]; const discountPercent = randInt(5,50); const startDate = new Date(now.getTime()+randInt(-7,7)*24*60*60*1000); const endDate = new Date(startDate.getTime()+randInt(1,30)*24*60*60*1000); promotions.push({ restaurant: item.restaurantId, menuItem: item._id, title: `Promo ${i}`, description: `Save ${discountPercent}% at our place!`, discountPercent, startDate, endDate, conditions:'', status: endDate>now ? 'active' : 'expired' }) }
    const insertedPromos = await Promotion.insertMany(promotions);

    console.log(`✔ Inserted ${insertedRestaurants.length} restaurants, ${insertedMenus.length} menus, ${insertedMenuItems.length} menu_items, ${insertedPromos.length} promotions`);
    process.exit(0);
  }catch(err){ console.error('❌ Seeder error:', err); process.exit(1) }
}

seedAll();