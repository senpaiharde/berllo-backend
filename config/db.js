import mongoose from "mongoose";
import dotenv from 'dotenv';


export const connectDb = async () => {
  await mongoose.connect(process.env.MONGO_URI, { maxPoolSize: 20 });
  console.log('⚡️ Mongo connected');
};