// src/models/menu.js
import mongoose from "mongoose";

const MENU_ITEM_TYPES = ["FOOD", "DRINK", "OTHER"];

const menuSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  visible: { type: Boolean, default: true },
  items: [{
    name: { type: String, required: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true },
    type: { type: String, enum: MENU_ITEM_TYPES, default: "FOOD" },
    isSignature: { type: Boolean, default: false },
    ingredients: [{ type: String }],
    tags: [{ type: String }],
    availability: { type: Boolean, default: true }
  }]
}, { collection: 'menu', timestamps: true });

export const Menu = mongoose.model("Menu", menuSchema);
