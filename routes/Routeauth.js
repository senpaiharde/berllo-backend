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
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const User_1 = __importDefault(require("../models/User"));
dotenv_1.default.config();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET)
    throw new Error('JWT_SECRET not defined');
const router = (0, express_1.Router)();
// POST /auth/signup
router.post('/signup', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { fullname, email, password } = req.body;
        if (!fullname || !email || !password) {
            res.status(400).json({ error: 'fullname, email and password required' });
            return;
        }
        const exists = yield User_1.default.findOne({ email });
        if (exists) {
            res.status(409).json({ error: 'Email already in use' });
            return;
        }
        const passwordHash = yield bcryptjs_1.default.hash(password, 12);
        const user = yield User_1.default.create({ fullname, email, passwordHash });
        const token = jsonwebtoken_1.default.sign({ id: user._id }, JWT_SECRET, { expiresIn: '2h' });
        res.status(201).json({ token });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Signup failed' });
    }
}));
// POST /auth/login
router.post('/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        const user = yield User_1.default.findOne({ email });
        if (!user) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        const match = yield bcryptjs_1.default.compare(password, user.passwordHash);
        if (!match) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ id: user._id }, JWT_SECRET, { expiresIn: '2h' });
        res.json({ token });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login failed' });
    }
}));
exports.default = router;
