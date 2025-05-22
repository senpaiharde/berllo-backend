// src/utils/seedDemoUsers.ts
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User, { IUser } from '../models/User';
import dotenv from 'dotenv';
dotenv.config();

async function seed() {
  if (process.env.NODE_ENV !== 'development') return;
  const demoPassword = 'demo123';
  const passwordHash = await bcrypt.hash(demoPassword, 12);

 
  const demos: Array<Partial<IUser> & { _id: mongoose.Types.ObjectId }> = [
    {
      _id: new mongoose.Types.ObjectId('000000000000000000000001'),
      fullname: 'ALi Demo',
      email: 'alice@demo.local',
      passwordHash,
      avatar: 'https://img.icons8.com/?size=100&id=bOXN3AZhMCek&format=png&color=000000',
    },
    {
      _id: new mongoose.Types.ObjectId('000000000000000000000002'),
      fullname: 'Slava Demo',
      email: 'bob@demo.local',
      passwordHash,
      avatar: 'https://img.icons8.com/?size=100&id=IerOpHeUt2OH&format=png&color=000000',
    },
    {
      _id: new mongoose.Types.ObjectId('000000000000000000000003'),
      fullname: 'Mark Demo',
      email: 'carol@demo.local',
      passwordHash,
      avatar: 'https://img.icons8.com/?size=100&id=123636&format=png&color=000000',
    },
    {
      _id: new mongoose.Types.ObjectId('000000000000000000000004'),
      fullname: 'Sam Demo',
      email: 'dave@demo.local',
      passwordHash,
      avatar: 'https://img.icons8.com/?size=100&id=118237&format=png&color=000000',
    },
    {
      _id: new mongoose.Types.ObjectId('000000000000000000000005'),
      fullname: 'Dima Demo',
      email: 'eve@demo.local',
      passwordHash,
      avatar: 'https://img.icons8.com/?size=100&id=skjSUPfBtF8I&format=png&color=000000',
    },
  ];

  for (const demo of demos) {
    const exists = await User.findById(demo._id);
    if (!exists) {
      await User.create(demo as any);
      console.log(`Seeded demo user ${demo.email}`);
    }
  }
}

export default seed;
