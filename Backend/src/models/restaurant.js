import mongoose from "mongoose";

const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String }, // cafe, pub, fine dining, deli, etc.
  address: { type: String },
  location: {
    // optional geo coordinates (latitude, longitude)
    lat: Number,
    lng: Number
  },
  phone: { type: String },
  description: { type: String },
  cuisine: { type: String },
  hasPrivateRooms: { type: Boolean, default: false },
  ambience: [{ type: String }],

  // New/updated fields
  priceTier: {
    type: String,
    enum: ["BUDGET", "MID_RANGE", "PREMIUM", "LUXURY"],
    required: true
  },
  status: {
    type: String,
    enum: ["OPEN", "CLOSED_TEMP", "CLOSED_PERM"],
    default: "OPEN"
  },
  closedUntil: { type: Date, default: null },
  category: { type: String }, // e.g., Khmer, BBQ, Café, Pub
  averageFoodPrice: { type: Number, default: null },
  averageDrinkPrice: { type: Number, default: null }

}, { timestamps: true });

export const Restaurant = mongoose.model("Restaurant", restaurantSchema);
