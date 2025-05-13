// src/models/User.ts
import mongoose, { Schema, Types } from 'mongoose';

/* ---------- sub-document: User.ts ---------- */

export interface IUser extends mongoose.Document {
  fullname: string;
  email: string;
  passwordHash: string;
  avatar: String;
}

const userSchema = new Schema<IUser>(
  {
    fullname: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    avatar: String,
  },
  { timestamps: true }
);

userSchema.index({ fullname: 'text' }); // optional search
export default mongoose.model<IUser>('User', userSchema);
