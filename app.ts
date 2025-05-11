import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import boardRouter from './routes/Board';


import authRoutes from './routes/auth'
dotenv.config();

const app = express();
app.use((req, res, next) => {
  console.log(`→ [REQ] ${req.method} ${req.path}`);
  next();
});
app.use(helmet());
app.use(morgan('dev'));
app.use(cors({ origin: ['http://localhost:5173'], credentials: true }));
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/board', boardRouter);



app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

export default app;
