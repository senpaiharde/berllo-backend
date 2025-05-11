import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middlewares/authmiddleware';
import Board, { IBoard } from '../models/Board';
import List, { IList } from '../models/List';
import { pick } from '../utils/pick';



const router = Router();
router.use(authMiddleware);

router.post('/', authMiddleware, async (req: Request, res: Response) => {
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
router.get('/', authMiddleware, async (req: Request, res: Response): Promise<any> => {
  try {
    const board = await Board.findById(req.params.id)
      .populate({ path: 'members.user', select: 'fullName avatar' })
      .lean();
    if (!board) return res.status(404).json({ error: 'Board not found' });

    const lists = await List.find({ board: board._id }).sort({ position: 1 }).lean();
    const tasks = await List.find({ board: board._id }).lean();
    res.json({ board, lists, tasks });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete entry' });
  }
});

router.put('/:id', authMiddleware, async (req: Request, res: Response): Promise<any> => {
  const allowed = ['title', 'style', 'isStarred', 'archivedAt'] as const;
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
});

router.delete('/:id', authMiddleware, async (req: Request, res: Response): Promise<any> => {
  try {
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete entry' });
  }
});
