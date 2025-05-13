import mongoose, { model, Schema, Types } from 'mongoose';
// hello
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
 ListSchema.index({ board: 1, position: 1 }); // ordered column query

 export default mongoose.model<IList>(
   'List',
   ListSchema,
   'lists'
 );
