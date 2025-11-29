import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

export const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.MONGO_URL;
    if (!uri) throw new Error("MONGO_URI not set in .env");

    // Configure mongoose to fail fast when the server is unreachable.
    // - serverSelectionTimeoutMS: how long to try to find a suitable server (ms)
    // - bufferCommands: disable command buffering so queries fail immediately instead of queuing
    const opts = {
      dbName: 'chatbot_db',
      // fail-fast: short server selection timeout and disable buffering
      serverSelectionTimeoutMS: 3000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
    };

    await mongoose.connect(uri, opts);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err?.message || err);
    // Do not exit the process here; allow application to start and handle DB errors gracefully.
    // The application code will handle DB errors and provide fallbacks.
  }
};
