import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import boardRouter from './routes/RouteBoard';
import taskRouter from './routes/RouteTasks';
import listRouter from './routes/RouteList';
import activityRouter from './routes/RouteActivity';

import authRoutes from './routes/Routeauth';
import RouteUsers from './routes/RouteUsers';
import autoBoardRouter from './routes/autoBoard';
dotenv.config();

const app = express();
app.use((req, res, next) => {
  console.log(`→ [REQ] ${req.method} ${req.path}`);
  next();
});
app.use(helmet());
app.use(morgan('dev'));
app.use(cors({ origin: ['http://localhost:5173'], credentials: true }));


app.use(express.json({ limit: '20mb' }));

app.use(express.urlencoded({ limit: '20mb', extended: true }));
app.use('/auth', authRoutes);
app.use('/user', RouteUsers);
app.use('/board', boardRouter);
app.use('/tasks', taskRouter);
app.use('/list', listRouter);
app.use('/activities', activityRouter);
app.use('/autoBoard', autoBoardRouter);

console.log('taskroute firing');



app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

export default app;
