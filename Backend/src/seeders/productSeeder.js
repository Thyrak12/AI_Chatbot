import dotenv from "dotenv";
import { connectDB } from "../config/db.js";
import { Product } from "../models/product.js";

dotenv.config();

const products = [
  { name: "Espresso", price: 2.5 },
  { name: "Americano", price: 3.0 },
  { name: "Latte", price: 3.5 },
  { name: "Cappuccino", price: 3.5 },
  { name: "Mocha", price: 4.0 },
  { name: "Green Tea", price: 2.0 },
  { name: "Black Tea", price: 1.8 },
  { name: "Blueberry Muffin", price: 2.2 },
  { name: "Chocolate Cake", price: 3.8 }
];

async function seedProducts() {
  try {
    await connectDB();
    console.log("Seeding products...");
    await Product.deleteMany({});
    await Product.insertMany(products);
    console.log(`Inserted ${products.length} products`);
    process.exit(0);
  } catch (err) {
    console.error("Product seeder error:", err);
    process.exit(1);
  }
}

seedProducts();
