import mongoose, { model, Schema, Types } from 'mongoose';

interface IList extends Document {
  board: Types.ObjectId;
  title: string;
  position: number;
  archivedAt?: Date;
  style?: Record<string, unknown>;
}

const ListSchema = new Schema<IList>(
  {
    board: { type: Schema.Types.ObjectId, ref: 'Board', required: true, index: true },
    title: { type: String, required: true },
    position: { type: Number, default: 0 },
    archivedAt: Date,
    style: Schema.Types.Mixed,
  },
  { timestamps: true }
);
export default mongoose.model<IList>('ScheduleEntry', ListSchema);
