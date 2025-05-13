"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const CheckItemSchema = new mongoose_1.Schema({
    text: String,
    done: { type: Boolean, default: false },
});
const CommentSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    text: String,
    createdAt: { type: Date, default: Date.now },
}, { timestamps: true });
const TaskSchema = new mongoose_1.Schema({
    board: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Board', required: true, index: true },
    list: { type: mongoose_1.Schema.Types.ObjectId, ref: 'List', required: true, index: true },
    title: { type: String, required: true },
    description: String,
    labels: [String],
    isDueComplete: { type: Boolean, default: false },
    members: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    startDate: Date,
    dueDate: Date,
    reminder: Date,
    coordinates: {
        type: [Number],
        validate: (v) => v.length === 2,
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
}, { timestamps: true });
exports.default = mongoose_1.default.model('TaskEntry', TaskSchema);
