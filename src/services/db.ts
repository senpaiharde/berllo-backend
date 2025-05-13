import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_SECRET = process.env.MONGODB_SECRET;
if (!MONGODB_SECRET) throw new Error('MONGODB_SECRET not defined');

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGODB_SECRET);
    console.log('Mongo connected');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(
    "Mongo connected to",
    MONGODB_SECRET.includes("localhost") ? "LOCAL" : "ATLAS"
  );
};
