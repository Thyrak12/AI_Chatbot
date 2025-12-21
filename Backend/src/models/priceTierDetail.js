import mongoose from "mongoose";

const TIERS = ["BUDGET", "MID_RANGE", "PREMIUM", "LUXURY"];

const priceTierDetailSchema = new mongoose.Schema({
  tier: { type: String, enum: TIERS, unique: true, required: true },
  dishMin: { type: Number, default: 0 },
  dishMax: { type: Number, default: 0 },
  drinkMin: { type: Number, default: 0 },
  drinkMax: { type: Number, default: 0 },
  description: { type: String }
}, { collection: 'price_tier_detail', timestamps: true });

export const PriceTierDetail = mongoose.model("PriceTierDetail", priceTierDetailSchema);
