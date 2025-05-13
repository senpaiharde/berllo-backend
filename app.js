"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const RouteBoard_1 = __importDefault(require("./routes/RouteBoard"));
const RouteTasks_1 = __importDefault(require("./routes/RouteTasks"));
const Routeauth_1 = __importDefault(require("./routes/Routeauth"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((req, res, next) => {
    console.log(`→ [REQ] ${req.method} ${req.path}`);
    next();
});
app.use((0, helmet_1.default)());
app.use((0, morgan_1.default)('dev'));
app.use((0, cors_1.default)({ origin: ['http://localhost:5173'], credentials: true }));
app.use(express_1.default.json());
app.use('/auth', Routeauth_1.default);
app.use('/board', RouteBoard_1.default);
app.use('/tasks', RouteTasks_1.default);
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
exports.default = app;
