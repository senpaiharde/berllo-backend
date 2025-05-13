import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middlewares/authmiddleware';

import Board from '../models/Board';
import List from '../models/List';
import Task from '../models/task';
import Activity from '../models/activity';

import pick from '../utils/pick';

const router = Router();
router.use(authMiddleware);

// CREATE
router.post('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      listId,
      title,
      description,
      labels,
      members,
      startDate,
      dueDate,
      position,
      isDueComplete,
    } = req.body as {
      listId: string;
      title?: string;
      description?: string;
      labels?: string[];
      members?: string[];
      startDate?: Date;
      dueDate?: Date;
      position?: number;
      isDueComplete?: boolean;
    };

    if (!listId) {
      return res.status(400).json({ error: 'listId is required' });
    }

    const list = await List.findById(listId);
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    const task = await Task.create({
      board: list.board,
      list : list._id,
      title,
      description,
      labels,
      members,
      startDate,
      dueDate,
      position,
      isDueComplete,
    });

    await Activity.create({
      board: list.board,
      user : req.user!.id,
      entity: { kind: 'task', id: task._id },
      action: 'created_task',
    });

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
     console.log(' DB returned:', task);         
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
    
    // 1) map front-end keys → schema keys
    const aliasMap: Record<string,string> = {
      taskTitle:            'title',
      taskDescription:      'description',
      taskLabels:           'labels',
      taskMembers:          'members',
      taskStartDate:        'startDate',
      taskDueDate:          'dueDate',
      taskDateReminder:     'reminder',
      taskCoordinates:      'coordinates',
      taskCheckList:        'checklist',
      taskCover:            'cover',
      taskActivityComments: 'comments',
      isDueComplete:        'isDueComplete',
      archivedAt:           'archivedAt',
      position:             'position',
    };

    // 2) whitelist schema fields
    const allowedFields = new Set([
      'title','description','labels','members',
      'startDate','dueDate','reminder','coordinates',
      'checklist','cover','comments',
      'isDueComplete','archivedAt','position',
    ]);

    // 3) normalize & pick
    const updates: any = {};
    for (const [key, val] of Object.entries(req.body)) {
      const field = aliasMap[key] || key;
      if (allowedFields.has(field)) {
        updates[field] = val;
      }
    }
     console.log(` PUT /tasks/${req.params.id}`, 'updates:', updates);
    // 4) apply update
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );
       console.log('   After update, DB returned:', task);   
    if (!task) { 
      return res.status(404).json({ error: 'Task not found' });
    }

    await Activity.create({
      board : task.board,
      user  : req.user!.id,
      entity: { kind: 'task', id: task._id },
      action: 'updated_task',
      payload: updates,
    });

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
        board:   task.board,
        user:    req.user!.id,
        entity:  { kind: 'task', id: task._id },
        action:  'archived_task',
      });
      return res.json({ message: 'Task archived' });
    }

    // hard-delete
    await Promise.all([
      Activity.deleteMany({ 'entity.id': task._id }),
      Task.deleteOne({ _id: task._id }),
    ]);
    await Activity.create({
      board:   task.board,
      user:    req.user!.id,
      entity:  { kind: 'task', id: task._id },
      action:  'deleted_task',
    });

    res.status(204).end();
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete task' });
  }
});

export default router;