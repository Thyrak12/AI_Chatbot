import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

export const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.MONGO_URL;
    if (!uri) throw new Error("MONGO_URI not set in .env");

    const opts = {
      dbName: 'chatbot_db',
      serverSelectionTimeoutMS: 30000, // Increased timeout
      connectTimeoutMS: 30000,        // Increased timeout
      socketTimeoutMS: 120000,
      bufferCommands: true,
      maxPoolSize: 20
    };

    await mongoose.connect(uri, opts);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err?.message || err);
  }
};
