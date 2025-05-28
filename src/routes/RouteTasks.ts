import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middlewares/authmiddleware';
import mongoose from 'mongoose';
import Board from '../models/Board';
import List from '../models/List';
import Task from '../models/task';
import Activity from '../models/activity';
import { getIO } from '../services/socket';
import pick from '../utils/pick';

const router = Router();
router.use(authMiddleware);


router.post('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const { listId, title, board, position } = req.body as {
      listId: string;
      title?: string;
      board?: string;
      position?: number;
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

    let list = await List.findById(listId);
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    const task = await Task.create({
      board: list.taskListBoard,
      list: listId,
      title: title,
      position: position,
    });
    if (!task) {
      return res.status(404).json({ error: 'problem creating task' });
    }
    list?.taskList.push(task._id);
    const updates = { taskList: list?.taskList };
    list = await List.findOneAndUpdate(
      { _id: listId },
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!list) {
      return res.status(404).json({ error: 'problem updating list' });
    }
    // await Activity.create({
    //   board: list.taskListBoard,
    //   user: req.user?.id || null,
    //   entity: { kind: 'task', id: task._id },
    //   action: 'created_task',
    // });
     getIO()
    .to(`board_${task.board}`)
    .emit('taskCreated', task);
    res.status(201).json(task);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Could not create task' });
  }
});


router.get('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const task = await Task.findById(req.params.id).lean();

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch task' });
  }
});


router.put('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    // 1) Validate Mongo ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid task ID format' });
    }

    
    const aliasMap: Record<string, string> = {
      taskTitle: 'title',
      list: 'list',
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
      title: 'title',
      description: 'description',
      Activity: 'Activity',
      startDate: 'startDate',
      
    };

   
    const allowedFields = new Set([
      'Activity',
      'title',
      'list',
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
      'position',
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
    console.log('task ', id, ' put :updates', updates);
    // 5) Update document
    // const task = await Task.findByIdAndUpdate(
    //   { _id: id },
    //   { $set: updates },
    //   { new: true, runValidators: true }
    // );

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

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
     getIO()
      .to(`task_${task!._id}`)
      .emit('taskUpdated', task);


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
    getIO()
    .to(`task_${req.params.id}`)
    .emit('taskDeleted', { id: req.params.id });
    res.status(204).end();
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete task' });
  }
});

export default router;
