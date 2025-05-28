import { Router, Request, Response } from 'express';
import User, { IUser } from '../models/User';
import {authMiddleware} from '../middlewares/authmiddleware';
import pick from '../utils/pick';


const router = Router();

router.use(authMiddleware);


router.get('/me', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user!.id)
      .select('-passwordHash')
      .populate('lastBoardVisited')
      .populate('starredBoards');

    if (!user) { res.status(404).json({ error: 'User not found' }); return}
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// { lastBoardVisited: BoardId, starredBoards: BoardId[] }
router.put('/me', async (req: Request, res: Response): Promise<void> => {
  try {
    // Only pick these two fields from the incoming body
    const updates = pick(req.body, ['lastBoardVisited', 'starredBoards']);

    const user = await User.findByIdAndUpdate(
      req.user!.id,
      { $set: updates },
      { new: true }
    )
      .select('-passwordHash')
      .populate('lastBoardVisited')
      .populate('starredBoards');

    if (!user) {res.status(404).json({ error: 'User not found' }); return}
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Invalid update data' });
  }
});

export default router;