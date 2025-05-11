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
  user: Types.ObjectId;
  role: 'owner' | 'admin' | 'member';
}
const MemberSchema = new Schema<IBoardMember>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
});
interface IBoard extends Document {
  title: string;
  style: { backgroundImage?: string };
  isStarred: boolean;
  archivedAt?: Date;
  labels: ILabel[];
  members: IBoardMember[];
  createdBy: Types.ObjectId;
}
const BoardSchema = new Schema<IBoard>(
  {
    title: { type: String, required: true },
    style: { backgroundImage: String },
    isStarred: { type: Boolean, default: false },
    archivedAt: Date,
    labels: [LabelSchema],
    members: [MemberSchema],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
export default mongoose.model<IBoard>('ScheduleEntry', BoardSchema);