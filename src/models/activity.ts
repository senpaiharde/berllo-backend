import mongoose, { model, Schema, Types } from 'mongoose';

interface IActivity extends Document {
  board: Types.ObjectId;
  user: Types.ObjectId;
  entity: { kind: 'board' | 'list' | 'task'; id: Types.ObjectId };
  action: string;
  payload?: Record<string, unknown>;
}

const ActivitySchema = new Schema<IActivity>(
  {
    board: { type: Schema.Types.ObjectId, ref: 'Board', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    entity: {
      kind: { type: String, enum: ['board', 'list', 'task'] },
      id: { type: Schema.Types.ObjectId },
    },
    action: String,
    payload: Schema.Types.Mixed,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ActivitySchema.index({ board: 1, createdAt: -1 });
export default mongoose.model<IActivity>('ActivityEntry', ActivitySchema);
