import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import boardRouter from './routes/RouteBoard';
import taskRouter from './routes/RouteTasks';
import listRouter from './routes/RouteList';
import activityRouter from './routes/RouteActivity';
import cron    from 'node-cron';
import authRoutes from './routes/Routeauth';
import RouteUsers from './routes/RouteUsers';
import autoBoardRouter from './routes/autoBoard';
import { wipeActivity } from './resetData/WipeActivity';
import { resetDatabase } from './resetData/resetDatabase';
dotenv.config();

const app = express();
app.use((req, res, next) => {
  console.log(`→ [REQ] ${req.method} ${req.path}`);
  next();
});
app.use(helmet());
app.use(morgan('dev'));
const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'];
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);


app.use(express.json({ limit: '20mb' }));

app.use(express.urlencoded({ limit: '20mb', extended: true }));
app.use('/auth', authRoutes);
app.use('/user', RouteUsers);
app.use('/board', boardRouter);
app.use('/tasks', taskRouter);
app.use('/list', listRouter);
app.use('/activities', activityRouter);
app.use('/autoBoard', autoBoardRouter);
app.post('/admin/wipe-activity', async (_req, res) => {
  await wipeActivity();
  res.json({ ok: true });
});
app.post('/admin/reset-db', async (_req, res) => {
  await resetDatabase();
  res.json({ ok: true });
});
cron.schedule(
  '0 */2 * * *',      // “At minute 0 past every 2nd hour” (00:00, 02:00, 04:00, …)
  () => void wipeActivity()
);
cron.schedule('0,30 * * * *', () => {
  void resetDatabase();
});
console.log('taskroute firing');



app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

export default app;
