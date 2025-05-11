import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import { connectDb } from './config/db.js';
import cookieParser from 'cookie-parser';

dotenv.config();
await connectDb();


const app = express()
app.use(cors())
app.use(express.json())
app.use(cookieParser())
app.use(morgan('dev'))



app.get('/health', (_, res) => res.json({ok : true}))

app.use('/api',)

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API running on :${PORT}`));