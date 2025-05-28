import mongoose, { Schema, Types } from 'mongoose';

export interface IUser extends mongoose.Document {
  fullname: string;
  email: string;
  passwordHash: string;
  avatar: String;
  lastBoardVisited: {
    board: Types.ObjectId;
    boardTitle: string;
  }[];
  starredBoards?: {
    board: Types.ObjectId;
    boardTitle: string;
    isStarred: boolean;
  }[];
}

const userSchema = new Schema<IUser>(
  {
    fullname: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    avatar: String,
    lastBoardVisited: [
      {
        board: { type: Schema.Types.ObjectId, ref: 'Board' },
        boardTitle: { type: String, required: true },
      },
    ],
    starredBoards: [
      {
        board: { type: Schema.Types.ObjectId, ref: 'Board' },
        boardTitle: { type: String, required: true },
        isStarred:  { type: Boolean, default: false }
      },
    ],
  },
  { timestamps: true }
);

userSchema.index({ fullname: 'text' }); // optional search
export default mongoose.model<IUser>('User', userSchema, 'users'); // explicit collection
