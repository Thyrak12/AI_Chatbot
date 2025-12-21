import mongoose from "mongoose";

const promotionSchema = new mongoose.Schema({
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
  menu: { type: mongoose.Schema.Types.ObjectId, ref: "Menu", required: false },
  title: { type: String, required: true },
  description: String,
  discountPercent: { type: Number, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  conditions: String,
  status: { type: String, enum: ["active", "expired", "scheduled"], default: "scheduled" }
}, { timestamps: true });

export const Promotion = mongoose.model("Promotion", promotionSchema);
