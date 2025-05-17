import mongoose, { model, Schema, Types } from 'mongoose';
// hello
export interface IList extends Document {
  taskListBoard: Types.ObjectId;
  taskListTitle: string;
  indexInBoard: number;
  taskList: Types.ObjectId[];
  archivedAt?: Date;
  listStyle?: Record<string, unknown>;
}

const ListSchema = new Schema<IList>(
  {
    taskListBoard: { type: Schema.Types.ObjectId, ref: 'Board', required: true, index: true },
    taskListTitle: { type: String, required: true },
    indexInBoard: { type: Number, default: 0 },
    taskList: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
    archivedAt: Date,
    listStyle: Schema.Types.Mixed,
  },
  { timestamps: true }
);
 ListSchema.index({ board: 1, position: 1 }); // ordered column query

 export default mongoose.model<IList>(
   'List',
   ListSchema,
   'listentries'
 );
