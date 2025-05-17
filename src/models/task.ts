import mongoose, { model, Schema, Types } from 'mongoose';

interface ICheckItem extends Document {
  boardTitle: string;
  items: [
    {
      text: string;
      done: Boolean;
    }
  ];
}
const CheckItemSchema = new Schema<ICheckItem>(
  {
    boardTitle: { type: String, required: true },
    items: [
      {
        text: String,
        done: Boolean,
      },
    ],
  },
  { _id: false }
);

interface IComment {
  user: Types.ObjectId;
  text: string;
  createdAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    text: String,
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

interface ITaskCover {
  coverType: 'color' | 'image';
  coverColor?: string;
  coverImg?: string;
}

export interface ITask extends Document {
  board: Types.ObjectId;
  list: Types.ObjectId;
  boardTitle: string;
  description?: string;
  labels: [
    {
      id: { type: String };
      color: { type: String; required: true };
      title: { type: String; default: '' };
    }
  ];
  isDueComplete: Boolean;
  members: [
    {
      _id: String;
      title: String;
      icon: String;
    }
  ];
  startDate?: Date;
  dueDate?: Date;
  reminder?: Date;
  coordinates?: [number, number];
  checklist: ICheckItem[];
  cover?: ITaskCover;
  comments: IComment[];
  archivedAt?: Date;
  isWatching: Boolean;
  position: number;
}

const TaskSchema = new Schema<ITask>(
  {
    board: { type: Schema.Types.ObjectId, ref: 'Board', required: true, index: true },
    list: { type: Schema.Types.ObjectId, ref: 'List', required: true, index: true },
    boardTitle: { type: String, required: true },
    description: String,
    isWatching: { type: Boolean, default: false },
    labels: [
      {
        id: { type: String },
        color: { type: String, required: true },
        title: { type: String, default: '' },
      },
    ],
    isDueComplete: { type: Boolean, default: false },
    members: [
      {
        _id: String,
        title: String,
        icon: String,
      },
    ],
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
TaskSchema.index({ list: 1, position: 1 }); // tasks ordered within list

export default mongoose.model<ITask>('Task', TaskSchema, 'taskentries');
