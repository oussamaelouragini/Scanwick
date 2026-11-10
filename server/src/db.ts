import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/scanwick";

export async function connectDb(): Promise<boolean> {
  try {
    await mongoose.connect(MONGODB_URI);

    console.log("✅ MongoDB connected successfully!");
    console.log(`📦 Database: ${mongoose.connection.name}`);

    return true;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    return false;
  }
}
