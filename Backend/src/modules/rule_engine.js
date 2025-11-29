// src/modules/rule_engine.js
import { Product } from "../models/product.js";

/**
 * Handle rule-based responses
 * Returns:
 * - string: simple reply
 * - array: data (products)
 * - null: if no rule matches (AI handles it)
 */
export async function handleRules(userMsg) {
  const msg = userMsg.toLowerCase();

  // Rule: product request
  if (msg.includes("product") || msg.includes("menu") || msg.includes("food")) {
    return getProductsFromDB();
  }

  // Rule: greeting
  if (msg.includes("hello") || msg.includes("hi")) {
    return "Hello! How can I help you today?";
  }

  // Rule: thank you
  if (msg.includes("thank")) {
    return "You're welcome! 😊";
  }

  // No rule matched
  return null;
}

/**
 * Fetch product list from MongoDB
 */
export async function getProductsFromDB() {
  try {
    const products = await Product.find({});
    return products.map(p => `- ${p.name} — $${p.price}`);
  } catch (err) {
    console.error("MongoDB product fetch error:", err);
    return ["Products are not available right now."];
  }
}
