import mongoose, { model, Schema, Types } from 'mongoose';

interface ICheckItem extends Document {
  title: string;
  items: [
    {
      _id: mongoose.Types.ObjectId;
      text: string;
      done: Boolean;
    }
  ];
}
const CheckItemSchema = new Schema<ICheckItem>(
  {
    title: { type: String, required: true },
    items: [
      {
        _id: mongoose.Types.ObjectId,
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

interface ITask extends Document {
  attachments: {
    _id: Types.ObjectId;
    name: string;
    url: string;
    contentType?: string;
    size?: number;
    createdAt: Date;
  }[];
  board: Types.ObjectId;
  list: Types.ObjectId;
  title: string;
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
      fullname: String;
      avatar: String;
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
  Activity: string;
}

const TaskSchema = new Schema<ITask>(
  {
    board: { type: Schema.Types.ObjectId, ref: 'Board', required: true, index: true },
    list: { type: Schema.Types.ObjectId, ref: 'List', required: true, index: true },
    title: { type: String, required: true },
    description: String,
    Activity: String,
    attachments: {
      type: [
        {
          _id: {
            type: Schema.Types.ObjectId,
            default: () => new mongoose.Types.ObjectId(),
          },
          name: { type: String, required: true },
          url: { type: String, required: true },
          contentType: { type: String, default: '' },
          size: { type: Number, default: 0 },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
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
        fullname: String,
        avatar: String,
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
    checklist: {
      type: [
        new Schema({
          title: { type: String, required: true },
          items: [
            {
              text: { type: String, required: true },
              done: { type: Boolean, default: false },
            },
          ],
        }),
      ],
      default: [],
    },
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
