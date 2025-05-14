import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middlewares/authmiddleware';
import Activity from '../models/activity';
import Board from '../models/Board';

const router = Router();

router.use(authMiddleware);

router.get('/boards/:boardId/activities', async (req: Request, res: Response): Promise<any> => {
  try {
    const board = await Board.findOne({
      _id: req.params._id,
      'members-user': req.user!.id,
    }).select('_id');

    if (!board) return res.status(403).json({ error: 'board missing' });

    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const skip = Number(req.query.skip) || 0;

    const activities = await Activity.find({ board: board._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: 'user', select: 'fullName avatar' })
      .lean();

      res.json(activities)
  } catch (err) {
    console.error(err);
    res.status(500).json({ err: 'err' });
  }
});
