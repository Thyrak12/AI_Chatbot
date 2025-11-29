import mongoose from "mongoose";

const menuSchema = new mongoose.Schema({
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
  name: { type: String, required: true },
  category: { type: String, default: "general" },
  price: { type: Number, required: true },
  isSignature: { type: Boolean, default: false },
  description: String,
  availability: { type: Boolean, default: true },
  ingredients: [String],
  tags: [String]
}, { timestamps: true });

export const Menu = mongoose.model("Menu", menuSchema);
