import fs from 'fs/promises';
import path from 'path';
import Board from '../models/Board';
import List from '../models/List';
import Task from '../models/task';

async function loadSeed(name: 'boards' | 'lists' | 'tasks'): Promise<any[]> {
  const filePath = path.join(__dirname, './seed', `${name}.json`);
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

// Wipes and re-seeds Board, List, and Task collections.

export async function resetDatabase(): Promise<void> {
  console.log(`[${new Date().toISOString()}]  resetDatabase: wiping & re-importing seed data`);
  // 1) delete all existing docs
  await Promise.all([Board.deleteMany({}), List.deleteMany({}), Task.deleteMany({})]);

  // 2) load and re-insert from seed files
  const [boards, lists, tasks] = await Promise.all([
    loadSeed('boards'),
    loadSeed('lists'),
    loadSeed('tasks'),
  ]);
  await Promise.all([Board.insertMany(boards), List.insertMany(lists), Task.insertMany(tasks)]);

  console.log(`[${new Date().toISOString()}]  resetDatabase: complete`);
}
