import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middlewares/authmiddleware';

import Board from '../models/Board';
import List from '../models/List';
import Task from '../models/task';
import Activity from '../models/activity';

import { pick } from '../utils/pick.js';

const router = Router();
router.use(authMiddleware);

router.post(':listId', async (req: Request, res: Response): Promise<any> => {
  try {
    const list = await List.findById(req.params.listId).populate({
      path: 'board',
      match: { 'members.user': req.user!.id },
      select: '_id',
    });

    if (!list || !list.board) return res.status(404).json({ error: 'cant post list' });

    const { title, description, labels, members, startDate, dueDate, position } =
      req.body as Partial<{
        title: string;
        description: string;
        labels: string[];
        members: string[];
        startDate: Date;
        dueDate: Date;
        position: number;
      }>;


      const task = await Task.create({
      board: list.board._id,
      list: list._id,
      title,
      description,
      labels,
      members,
      startDate,
      dueDate,
      position,
      
    });
     await Activity.create({
      board: list.board._id,
      user: req.user!.id,
      entity: { kind: 'task', id: task._id },
      action: 'created_task',
    });

    res.status(201).json(task)
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Could not create task' });
  }
});


router.get('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('members', 'fullName avatar')
      .lean();

    if (!task) return res.status(404).json({ error: 'Task not found' });

    /* security: confirm requester is on the board */
    const board = await Board.findOne({
      _id: task.board,
      'members.user': req.user!.id,
    }).select('_id');

    if (!board) return res.status(403).json({ error: 'Forbidden' });

    res.json(task);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not fetch task' });
  }
});



router.put('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const allowed = [
        'title',
      'description',
      'labels',
      'members',
      'startDate',
      'dueDate',
      'position',
      'archivedAt',
    ] as const;
    const update = pick(req.body, allowed)

    const task =  await Task.findByIdAndUpdate(
        { _id: req.params.id },
      { $set: update },
      { new: true, runValidators: true }
    ).populate({
        path: 'board',
        match: {'members.user': req.user!.id},
        select: '_id',
    })


    if (!task || !task.board) return res.status(403).json({ error: 'Forbidden' });

    await Activity.create({
        board: task.board._id,
        user: req.user!.id,
          entity: { kind: 'task', id: task._id },
          action: 'updated_task',
          payload: update
    })

    res.json(task)
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not fetch task' });
  }
});


router.delete('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const task = await Task.findById(req.params.id).populate({
      path: 'board',
      match: { 'members.user': req.user!.id },
      select: '_id',
    });

    if (!task || !task.board) return res.status(403).json({ error: 'Forbidden' });
    // Soft-delete (archive)
    if (req.query.hard !== 'true') {
      task.archivedAt = new Date();
      await task.save();

       await Activity.create({
        board: task.board._id,
        user: req.user!.id,
        entity: { kind: 'task', id: task._id },
        action: 'archived_task',
      });
      return res.json({ message: 'Task archived' });
    }

    // Hard-delete – wipe board + children in one go
    await Promise.all([
      Activity.deleteMany({'entity_id': task._id}),
      Task.deleteOne({_id: task._id})
    ]);

    await Activity.create({
      board: task._id,
      user: req.user?.id,
      entity: { kind: 'task', id: task._id },
      action: 'deleted_task',
    });

    res.status(204).end();
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete entry' });
  }
});


export default router;
