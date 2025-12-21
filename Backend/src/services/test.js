import mongoose from "mongoose";
import dotenv from "dotenv";
import menuService from "./menu_service.js";
import { Restaurant } from "../models/restaurant.js";

dotenv.config();

async function testFindMenus() {
  await mongoose.connect(process.env.MONGO_URI);

  // 1. Test by restaurantName
  const restName = "Johnson Inc"; // replace with a name from your DB
  const menusByName = await menuService.findMenus({ restaurantName: restName });
  console.log(`Menus for restaurantName="${restName}":`);
  console.log(menusByName);

  // 2. Test by restaurantId
  const restaurant = await Restaurant.findOne({ name: restName });
  if (!restaurant) {
    console.log("Restaurant not found!");
    return;
  }
  const menusById = await menuService.findMenus({ restaurantId: restaurant._id });
  console.log(`Menus for restaurantId=${restaurant._id}:`);
  console.log(menusById);

  // 3. Test limit
  const limitedMenus = await menuService.findMenus({ restaurantName: restName }, 1);
  console.log("Menus limited to 1:");
  console.log(limitedMenus);

  // 4. Test visible filter
  const visibleMenus = await menuService.findMenus({ restaurantName: restName, visible: true });
  console.log("Visible menus only:");
  console.log(visibleMenus);

  await mongoose.disconnect();
}

testFindMenus();
