"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authmiddleware_1 = require("../middlewares/authmiddleware");
const Board_1 = __importDefault(require("../models/Board"));
const List_1 = __importDefault(require("../models/List"));
const pick_1 = __importDefault(require("../utils/pick"));
const activity_1 = __importDefault(require("../models/activity"));
const task_1 = __importDefault(require("../models/task"));
const router = (0, express_1.Router)();
router.use(authmiddleware_1.authMiddleware);
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, style } = req.body;
        const board = yield Board_1.default.create({
            title,
            style,
            members: [{ user: req.user.id, role: 'owner' }],
            createdBy: req.user.id,
        });
        res.status(201).json(board);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Could not delete entry' });
    }
}));
// Boards – fetch one with lists + tasks
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const board = yield Board_1.default.findById(req.params.id)
            .populate({ path: 'members.user', select: 'fullName avatar' })
            .lean();
        if (!board)
            return res.status(404).json({ error: 'Board not found' });
        const lists = yield List_1.default.find({ board: board._id }).sort({ position: 1 }).lean();
        const tasks = yield task_1.default.find({ board: board._id }).lean();
        res.json({ board, lists, tasks });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Could not delete entry' });
    }
}));
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const allowed = ['title', 'style', 'isStarred', 'archivedAt'];
        const updates = (0, pick_1.default)(req.body, allowed);
        // Only owners/admins may update
        const board = yield Board_1.default.findOneAndUpdate({ _id: req.params.id, 'members.user': (_a = req.user) === null || _a === void 0 ? void 0 : _a.id }, { $set: updates }, { new: true, runValidators: true });
        if (!board)
            return res.status(403).json({ error: 'Forbidden' });
        yield activity_1.default.create({
            board: board._id,
            user: (_b = req.user) === null || _b === void 0 ? void 0 : _b.id,
            entity: { kind: 'board', id: board._id },
            action: 'updated_board',
            payload: updates,
        });
        res.json(board);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Could not delete entry' });
    }
}));
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const board = yield Board_1.default.findOne({
            _id: req.params.id,
            'members.user': (_a = req.user) === null || _a === void 0 ? void 0 : _a.id,
        });
        if (!board)
            return res.status(403).json({ error: 'Forbidden' });
        // Soft-delete (archive)
        if (req.query.hard !== 'true') {
            board.archivedAt = new Date();
            yield board.save();
            yield activity_1.default.create({
                board: board._id,
                user: (_b = req.user) === null || _b === void 0 ? void 0 : _b.id,
                entity: { kind: 'board', id: board._id },
                action: 'archived_board',
            });
            return res.json({ message: 'Board archived' });
        }
        // Hard-delete – wipe board + children in one go
        yield Promise.all([
            List_1.default.deleteMany({ board: board._id }),
            task_1.default.deleteMany({ board: board._id }),
            activity_1.default.deleteMany({ board: board._id }),
            Board_1.default.deleteOne({ _id: board._id }),
        ]);
        yield activity_1.default.create({
            board: board._id,
            user: (_c = req.user) === null || _c === void 0 ? void 0 : _c.id,
            entity: { kind: 'board', id: board._id },
            action: 'deleted_board',
        });
        res.status(204).end();
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Could not delete entry' });
    }
}));
exports.default = router;
