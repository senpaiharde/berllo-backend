// src/models/User.ts
import mongoose, { model, Schema, Types } from 'mongoose';


interface ILabel {
  color: string;
  title?: string;
}

const LabelSchema = new Schema<ILabel>({
  color: { type: String, required: true },
  title: { type: String, default: '' },
});


interface IBoardMember {
  _id: Types.ObjectId;
  fullname: string;
  avatar?: string;
  // role: 'owner' | 'admin' | 'member';
}
const MemberSchema = new Schema<IBoardMember>({
  _id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  fullname: { type: String, required: true },
  avatar: { type: String, default: '' },
  // role: { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
});
export interface IBoard extends Document {
  boardTitle: string;
  
  isStarred: boolean;
  archivedAt?: Date;
  boardLabels: ILabel[];
  boardMembers: IBoardMember[];
  createdBy: Types.ObjectId;
  boardLists: Types.ObjectId[];
  boardStyle: {
      type: {
        boardType: { type: String, enum: ['color', 'image'] },
        boardColor: String,
        boardImg: String,
      },
      default: undefined,
    },
}
const BoardSchema = new Schema<IBoard>(
  {
    boardTitle: { type: String, required: true },
    
    isStarred: { type: Boolean, default: false },
    boardStyle: {
      type: {
        boardType: { type: String, enum: ['color', 'image'] },
        boardColor: String,
        boardImg: String,
      },
      default: undefined,
    },
    archivedAt: Date,
    boardLabels: [LabelSchema],
    boardMembers: [MemberSchema],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    boardLists: [{ type: Schema.Types.ObjectId, ref: 'List' }],
  },
  { timestamps: true }
);
BoardSchema.index({ isStarred: 1 });
export default mongoose.model<IBoard>(
   'Board',              // model name
   BoardSchema,
   'boardentries'              //  explicit collection
 );