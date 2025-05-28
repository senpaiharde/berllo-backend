import mongoose, { Schema, Types } from 'mongoose';

export interface IUser extends mongoose.Document {
  fullname: string;
  email: string;
  passwordHash: string;
  avatar: String;
  lastBoardVisited?: Types.ObjectId;
  starredBoards?: Types.ObjectId[];
}

const userSchema = new Schema<IUser>(
  {
    fullname: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    avatar: String,
    lastBoardVisited: {
      type: Schema.Types.ObjectId,
      ref: 'Board',
      default: null,
    },
    starredBoards: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Board',
      },
    ],
  },
  { timestamps: true }
);

userSchema.index({ fullname: 'text' }); // optional search
export default mongoose.model<IUser>('User', userSchema, 'users'); // explicit collection
