import { Router, Request, Response } from 'express';
import User, { IUser } from '../models/User';
import authMiddleware from '../middlewares/authMiddleware';
import pick from '../utils/pick';


const router = Router();

router.use(authMiddleware);