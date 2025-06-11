
import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import Board from '../models/Board';
import List from '../models/List';
import Task from '../models/task';
import { getIO } from '../services/socket';

// Define your templates somewhere centrally:
const boardTemplates: Record<
  string,
  {
    style: Record<string, any>;
    lists: string[];
    tasks: { listIndex: number; title: string; dueDaysFromNow?: number }[];
  }
> = {
  '1': {
    style: { backgroundColor: '#FFEBEE' },
    lists: ['To Do', 'Doing', 'Done'],
    tasks: [
      { listIndex: 0, title: 'Welcome to your new board!', dueDaysFromNow: 2 },
      { listIndex: 1, title: 'This task is in progress', dueDaysFromNow: 1 },
      { listIndex: 2, title: 'Completed task example', dueDaysFromNow: 0 },
    ],
  },
  '2': {
    style: { backgroundColor: '#E8F5E9' },
    lists: ['Backlog', 'Sprint', 'Review', 'Release'],
    tasks: [
      { listIndex: 0, title: 'Define project scope', dueDaysFromNow: 7 },
      { listIndex: 1, title: 'Implement core feature', dueDaysFromNow: 3 },
    ],
  },
 
};

const router = Router();

/**
 * POST /boards/template/:templateId
 * Body: { title: string }
 */
router.post('/template/:templateId', async (req: Request, res: Response):Promise<any> => {
  const { templateId } = req.params;
  const { title } = req.body as { title?: string };

  // 1) Validate inputs
  if (!title || typeof title !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid board title' });
  }
  const template = boardTemplates[templateId];
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  
});

export default router;
