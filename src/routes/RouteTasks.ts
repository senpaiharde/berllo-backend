import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middlewares/authmiddleware';
import mongoose from 'mongoose';
import Board from '../models/Board';
import List from '../models/List';
import Task from '../models/task';
import Activity from '../models/activity';

import pick from '../utils/pick';

const router = Router();

// CREATE
router.post('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      listId,
      title,
      board
    } = req.body as {
      listId: string;
      title?: string;
      board?: string;
      // description?: string;
      // labels?: string[];
      // members?: string[];
      // startDate?: Date;
      // dueDate?: Date;
      // position?: number;
      // isDueComplete?: boolean;
      // isWatching: Boolean;
      // checklist: string[];
      // attachments: string[];
    };
    console.log('req.body', req.body);
    if (!listId) {
      return res.status(400).json({ error: 'listId is required' });
    }

    const list = await List.findById(listId);
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    const task = await Task.create({
      board: list.taskListBoard,
      list: listId,
      title: title,
    });

    // await Activity.create({
    //   board: list.taskListBoard,
    //   user: req.user?.id || null,
    //   entity: { kind: 'task', id: task._id },
    //   action: 'created_task',
    // });

    res.status(201).json(task);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Could not create task' });
  }
});

// READ
router.get('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    console.log(` GET /tasks/${req.params.id}`);
    const task = await Task.findById(req.params.id).lean();
    console.log('updating fetch', task);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch task' });
  }
});

// UPDATE
router.put('/:id', async (req: Request, res: Response): Promise<any> => {
    
  try {
    const { id } = req.params;
     console.log('REQ.BODY:', req.body);
    // 1) Validate Mongo ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid task ID format' });
    }

    // 1) map front-end keys → schema keys
    const aliasMap: Record<string, string> = {
      taskTitle: 'title',
      taskDescription: 'description',
      taskLabels: 'labels',
      taskMembers: 'members',
      taskStartDate: 'startDate',
      taskDueDate: 'dueDate',
      reminderSettings: 'reminder',
      reminder: 'reminder',
      taskCoordinates: 'coordinates',
      checklist: 'checklist',
      taskCover: 'cover',
      taskActivityComments: 'comments',
      isDueComplete: 'isDueComplete',
      archivedAt: 'archivedAt',
      position: 'position',
      isWatching: 'isWatching',
      attachments: 'attachments',
    };

    // 2) whitelist schema fields
    const allowedFields = new Set([
      'title',
      'description',
      'labels',
      'members',
      'startDate',
      'dueDate',
      'reminder',
      'coordinates',
      'checklist',
      'cover',
      'comments',
      'isDueComplete',
      'archivedAt',
      'position',
      'isWatching',
      'attachments',
    ]);
    const exists = await Task.findOne({ _id: new mongoose.Types.ObjectId(id) });
    console.log('TASK EXISTS?', exists ? ' YES' : ' NO');
    // 3) normalize & pick
    const updates: any = {};
    for (const [key, val] of Object.entries(req.body)) {
      const field = aliasMap[key] || key;
      if (allowedFields.has(field)) {
        updates[field] = val;
      }
    }

    // 5) Update document
    const task = await Task.findByIdAndUpdate(
      { _id: id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    console.log('REQ.BODY:', req.body);
    console.log('CALCULATED UPDATES:', updates);
    // const task = await Task.findByIdAndUpdate(
    //   req.params.id,
    //   { $set: updates },
    //   { new: true, runValidators: true }
    //);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await Activity.create({
      board: task.board,
      user: req.user?.id || new mongoose.Types.ObjectId('000000000000000000000000'),
      entity: { kind: 'task', id: task._id },
      action: 'updated_task',
      payload: updates,
    });
    console.log('→ Sending task to frontend:', task);
    res.json(task);
  } catch (err: any) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// DELETE (soft/hard)
router.delete('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // soft-delete if ?hard !== 'true'
    if (req.query.hard !== 'true') {
      task.archivedAt = new Date();
      await task.save();
      await Activity.create({
        board: task.board,
        user: req.user?.id || null,
        entity: { kind: 'task', id: task._id },
        action: 'archived_task',
      });
      return res.json({ message: 'Task archived' });
    }

    // hard-delete
    await Promise.all([
      Activity.deleteMany({ 'entity.id': task._id }),
      Task.deleteOne({ _id: task._id }),
    ]);
    await Activity.create({
      board: task.board,
      user: req.user!.id,
      entity: { kind: 'task', id: task._id },
      action: 'deleted_task',
    });

    res.status(204).end();
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete task' });
  }
});

export default router;
