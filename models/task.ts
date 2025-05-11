import mongoose, { model, Schema, Types } from 'mongoose';

interface ICheckItem extends Document {
  text: string;
  done: boolean;
}
const CheckItemSchema = new Schema<ICheckItem>({
  text: String,
  done: { type: Boolean, default: false },
});

interface IComment {
  user: Types.ObjectId;
  text: string;
}

const CommentSchema = new Schema<IComment>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    text: String,
  },
  { timestamps: true }
);

interface ITaskCover {
  coverType: 'color' | 'image';
  coverColor?: string;
  coverImg?: string;
}



interface ITask extends Document {
  board: Types.ObjectId;
  list: Types.ObjectId;
  title: string;
  description?: string;
  labels: string[];
  members: Types.ObjectId[];
  startDate?: Date;
  dueDate?: Date;
  reminder?: Date;
  coordinates?: [number, number];
  checklist: ICheckItem[];
  cover?: ITaskCover;
  comments: IComment[];
  archivedAt?: Date;
  position: number;
}


const TaskSchema = new Schema<ITask>(
  {
    board: { type: Schema.Types.ObjectId, ref: 'Board', required: true, index: true },
    list: { type: Schema.Types.ObjectId, ref: 'List', required: true, index: true },
    title: { type: String, required: true },
    description: String,
    labels: [String],
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    startDate: Date,
    dueDate: Date,
    reminder: Date,
    coordinates: {
      type: [Number],
      validate: (v: number[]) => v.length === 2,
      index: '2dsphere',
    },
    checklist: [CheckItemSchema],
    cover: {
      type: {
        coverType: { type: String, enum: ['color', 'image'] },
        coverColor: String,
        coverImg: String,
      },
      default: undefined,
    },
    comments: [CommentSchema],
    archivedAt: Date,
    position: { type: Number, default: 0 },
  },
  { timestamps: true }
);
export default mongoose.model<ITask>('ScheduleEntry', TaskSchema);