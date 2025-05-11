import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_SECRET = process.env.MONGO_URI;
if (!MONGODB_SECRET) throw new Error('JWT_SECRET not defined');
export const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_SECRET)
        console.log('Mongo connected')
    }catch (err) {
        console.log(err)
        process.exit(1);
    }
    console.log("Mongo connected to", MONGODB_SECRET.includes("localhost") ? "LOCAL" : "ATLAS");
}