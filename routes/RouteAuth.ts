// src/routes/auth.ts
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import User, { IUser } from '../models/User';

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) throw new Error('JWT_SECRET not defined');

const router = Router();

// POST /auth/signup
router.post('/signup', async (req: Request, res: Response) :Promise<void>=> {
  try {
    const { fullname, email, password } = req.body;
    if (!fullname || !email || !password) {
      res.status(400).json({ error: 'fullname, email and password required' });
     return;
    }
    const exists = await User.findOne({ email });
    if (exists)  {res.status(409).json({ error: 'Email already in use' });
    return;}

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ fullname, email, passwordHash });
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '2h' });
    res.status(201).json({ token });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Signup failed' });
  }
});

// POST /auth/login
router.post('/login', async (req: Request, res: Response):Promise<void> => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user){ res.status(401).json({ error: 'Invalid credentials' }); return;}

    const match = await bcrypt.compare(password, (user as any).passwordHash);
    if (!match) {res.status(401).json({ error: 'Invalid credentials' });return }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '2h' });
    res.json({ token });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;
