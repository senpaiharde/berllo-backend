// routes/users.ts
import { Router, Request, Response } from 'express';
import User, { IUser } from '../models/User';
import Board from '../models/Board';
import { authMiddleware } from '../middlewares/authmiddleware';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const users = await User.find().select('fullname email avatar').lean();
    console.log(' router.get(/) boards', users);
    res.json({ users: users });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete entry' });
  }
});

// GET /users/me
router.get('/me', async (req: Request, res: Response): Promise<any> => {
  try {
    // pull in the embedded sub-docs (we stored boardTitle & isStarred at write-time)
    const user = await User.findById(req.user!.id)
      .select('-passwordHash -__v')
      .lean();  

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // safely default to [] so TS knows it's an array
    const recent = (user.lastBoardVisited  ?? []).map(entry => ({
      id:         entry.board,
      boardTitle: entry.boardTitle
    }));

    const starred = (user.starredBoards   ?? []).map(entry => ({
      id:         entry.board,
      boardTitle: entry.boardTitle,
      isStarred:  entry.isStarred
    }));

    return res.json({
      fullname:     user.fullname,
      email:        user.email,
      avatar:       user.avatar,
      recentBoards: recent,
      starredBoards: starred
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PUT /users/me
// Body may include { lastBoardVisited: boardId?, starredBoards: { board, isStarred }? }
router.put('/me', async (req: Request, res: Response): Promise<any> => {
  try {
    const { lastBoardVisited: visitId, starredBoards: starUpdate } = req.body;

  
    if (visitId) {
      const b = await Board.findById(visitId).lean();
      if (b) {
        await User.findByIdAndUpdate(req.user!.id, {
          $pull: { lastBoardVisited: { board: b._id } }
        });
        await User.findByIdAndUpdate(req.user!.id, {
          $push: {
            lastBoardVisited: {
              board:      b._id,
              boardTitle: b.boardTitle
            }
          }
        });
        // Trim to 5
        await User.findByIdAndUpdate(req.user!.id, {
          $push: {
            lastBoardVisited: {
              $each:  [],
              $slice: -5
            }
          }
        });
      }
    }

    // 2) If they sent a starred toggle
    if (starUpdate && starUpdate.board) {
      const b = await Board.findById(starUpdate.board).lean();
      if (b) {
        if (starUpdate.isStarred) {
          // remove duplicates then add
          await User.findByIdAndUpdate(req.user!.id, {
            $pull: { starredBoards: { board: b._id } }
          });
          await User.findByIdAndUpdate(req.user!.id, {
            $push: {
              starredBoards: {
                board:      b._id,
                boardTitle: b.boardTitle,
                isStarred:  true
              }
            }
          });
        } else {
          // un‐star: just pull it out
          await User.findByIdAndUpdate(req.user!.id, {
            $pull: { starredBoards: { board: b._id } }
          });
        }
      }
    }

    // 3) Return the fresh user doc
    const updated = await User.findById(req.user!.id)
      .select('-passwordHash -__v')
      .lean();

    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(400).json({ error: 'Invalid update data' });
  }
});

export default router;
