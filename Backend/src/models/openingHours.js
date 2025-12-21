import mongoose from "mongoose";

const DAY_OF_WEEK = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const openingHoursSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
  dayOfWeek: { type: String, enum: DAY_OF_WEEK, required: true },
  // Open/close times stored as strings (HH:mm) or null when closed that day
  openTime: { type: String, default: null },
  closeTime: { type: String, default: null }
}, { collection: 'restaurant_opening_hours', timestamps: true });

export const OpeningHours = mongoose.model("OpeningHours", openingHoursSchema);
