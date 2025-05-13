import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middlewares/authmiddleware';
import  Board  from '../models/Board';
import   List from '../models/List';
import  pick  from '../utils/pick';
import Activity from '../models/activity';
import Task from '../models/task';
const router = Router();
router.use(authMiddleware);

router.post('/',  async (req: Request, res: Response) => {
  try {
    const { title, style } = req.body as { title: string; style?: { backgroundImage?: string } };
    const board = await Board.create({
      title,
      style,
      members: [{ user: req.user!.id, role: 'owner' }],
      createdBy: req.user!.id,
    });
    res.status(201).json(board);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete entry' });
  }
});

// Boards – fetch one with lists + tasks
router.get('/:id',  async (req: Request, res: Response): Promise<any> => {
  try {
    const board = await Board.findById(req.params.id)
      .populate({ path: 'members.user', select: 'fullName avatar' })
      .lean();


    if (!board) return res.status(404).json({ error: 'Board not found' });

    const lists = await List.find({ board: board._id }).sort({ position: 1 }).lean();




     const tasks = await Task.find({ board: board._id }).lean();
    res.json({ board, lists, tasks });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete entry' });
  }
});

router.put('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const allowed = ['title', 'style', 'isStarred', 'archivedAt'] as const ;
    const updates = pick(req.body, allowed);

    // Only owners/admins may update
    const board = await Board.findOneAndUpdate(
      { _id: req.params.id, 'members.user': req.user?.id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!board) return res.status(403).json({ error: 'Forbidden' });

    await Activity.create({
      board: board._id,
      user: req.user?.id,
      entity: { kind: 'board', id: board._id },
      action: 'updated_board',
      payload: updates,
    });

    res.json(board);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete entry' });
  }
});

router.delete('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const board = await Board.findOne({
      _id: req.params.id,
      'members.user': req.user?.id,
    });
    if (!board) return res.status(403).json({ error: 'Forbidden' });

    // Soft-delete (archive)
    if (req.query.hard !== 'true') {
      board.archivedAt = new Date();
      await board.save();

      await Activity.create({
        board: board._id,
        user: req.user?.id,
        entity: { kind: 'board', id: board._id },
        action: 'archived_board',
      });
      return res.json({ message: 'Board archived' });
    }

    // Hard-delete – wipe board + children in one go
    await Promise.all([
      List.deleteMany({ board: board._id }),
      Task.deleteMany({ board: board._id }),
      Activity.deleteMany({ board: board._id }),
      Board.deleteOne({ _id: board._id }),
    ]);

    await Activity.create({
      board: board._id,
      user: req.user?.id,
      entity: { kind: 'board', id: board._id },
      action: 'deleted_board',
    });

    res.status(204).end();
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete entry' });
  }
});


export default router;

