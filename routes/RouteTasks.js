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
const task_1 = __importDefault(require("../models/task"));
const activity_1 = __importDefault(require("../models/activity"));
const pick_1 = __importDefault(require("../utils/pick"));
const router = (0, express_1.Router)();
router.use(authmiddleware_1.authMiddleware);
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        //  pull listId from the request body
        const { listId, title, description, labels, members, startDate, dueDate, position, isDueComplete } = req.body;
        if (!listId)
            return res.status(400).json({ error: 'listId is required' });
        const list = yield List_1.default.findById(listId).populate({
            path: 'board',
            match: { 'members.user': req.user.id },
            select: '_id',
        });
        if (!list || !list.board) {
            return res.status(404).json({ error: 'cant post list' });
        }
        const task = yield task_1.default.create({
            board: list.board._id,
            list: list._id,
            title,
            description,
            labels,
            members,
            startDate,
            dueDate,
            position,
            isDueComplete,
        });
        yield activity_1.default.create({
            board: list.board._id,
            user: req.user.id,
            entity: { kind: 'task', id: task._id },
            action: 'created_task',
        });
        res.status(201).json(task);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Could not create task' });
    }
}));
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const task = yield task_1.default.findById(req.params.id).populate('members', 'fullName avatar').lean();
        if (!task)
            return res.status(404).json({ error: 'Task not found' });
        /* security: confirm requester is on the board */
        const board = yield Board_1.default.findOne({
            _id: task.board,
            'members.user': req.user.id,
        }).select('_id');
        if (!board)
            return res.status(403).json({ error: 'Forbidden' });
        res.json(task);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Could not fetch task' });
    }
}));
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const allowed = [
            'title',
            'description',
            'labels',
            'members',
            'startDate',
            'dueDate',
            'reminder',
            'coordinates',
            'cover',
            'checklist',
            'comments',
            'position',
            'archivedAt',
            'isDueComplete',
        ];
        const update = (0, pick_1.default)(req.body, allowed);
        const task = yield task_1.default.findByIdAndUpdate({ _id: req.params.id }, { $set: update }, { new: true, runValidators: true }).populate({
            path: 'board',
            match: { 'members.user': req.user.id },
            select: '_id',
        });
        if (!task || !task.board)
            return res.status(403).json({ error: 'Forbidden' });
        yield activity_1.default.create({
            board: task.board._id,
            user: req.user.id,
            entity: { kind: 'task', id: task._id },
            action: 'updated_task',
            payload: update,
        });
        res.json(task);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Could not fetch task' });
    }
}));
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const task = yield task_1.default.findById(req.params.id).populate({
            path: 'board',
            match: { 'members.user': req.user.id },
            select: '_id',
        });
        if (!task || !task.board)
            return res.status(403).json({ error: 'Forbidden' });
        // Soft-delete (archive)
        if (req.query.hard !== 'true') {
            task.archivedAt = new Date();
            yield task.save();
            yield activity_1.default.create({
                board: task.board._id,
                user: req.user.id,
                entity: { kind: 'task', id: task._id },
                action: 'archived_task',
            });
            return res.json({ message: 'Task archived' });
        }
        // Hard-delete – wipe board + children in one go
        yield Promise.all([
            activity_1.default.deleteMany({ 'entity_id': task._id }),
            task_1.default.deleteOne({ _id: task._id }),
        ]);
        yield activity_1.default.create({
            board: task.board._id,
            user: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id,
            entity: { kind: 'task', id: task._id },
            action: 'deleted_task',
        });
        res.status(204).end();
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Could not delete entry' });
    }
}));
exports.default = router;
