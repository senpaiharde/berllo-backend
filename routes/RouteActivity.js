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
const activity_1 = __importDefault(require("../models/activity"));
const Board_1 = __importDefault(require("../models/Board"));
const router = (0, express_1.Router)();
router.use(authmiddleware_1.authMiddleware);
router.get('/boards/:boardId/activities', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const board = yield Board_1.default.findOne({
            _id: req.params._id,
            'members-user': req.user.id,
        }).select('_id');
        if (!board)
            return res.status(403).json({ error: 'board missing' });
        const limit = Math.min(Number(req.query.limit) || 30, 100);
        const skip = Number(req.query.skip) || 0;
        const activities = yield activity_1.default.find({ board: board._id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate({ path: 'user', select: 'fullName avatar' })
            .lean();
        res.json(activities);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ err: 'err' });
    }
}));
