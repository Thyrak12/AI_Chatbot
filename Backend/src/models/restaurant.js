import mongoose from "mongoose";

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, default: "general" },
  price: { type: Number, required: true },
  description: String,
  availability: { type: Boolean, default: true },
  ingredients: [String],
  tags: [String]
});

const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String }, // cafe, pub, fine dining, deli, etc.
  address: String,
  location: {
    // optional geo coordinates (latitude, longitude)
    lat: Number,
    lng: Number
  },
  phone: String,
  description: String,
  cuisine: String,
  openingHours: String,
  numTables: { type: Number, default: 0 },
  vipRooms: { type: Number, default: 0 },
  hasPrivateRooms: { type: Boolean, default: false },
  ambience: [String],
  menu: [menuItemSchema]
}, { timestamps: true });

export const Restaurant = mongoose.model("Restaurant", restaurantSchema);
