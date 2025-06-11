import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middlewares/authmiddleware';
import Board, { IBoard } from '../models/Board';
import List, { IList } from '../models/List';
import pick from '../utils/pick';
import Activity from '../models/activity';
import Task from '../models/task';
import User from '../models/User';
const router = Router();
router.use(authMiddleware);

// CREATE

router.post('/', async (req: Request, res: Response) => {
  try {
    const { boardTitle, boardStyle } = req.body as {
      boardTitle: string;
      boardStyle?: { boardType: 'color' | 'image'; boardColor?: string; boardImg?: string };
    };
    console.log('req.body', req.body);
    const boardLabels = [
      { color: '#4BCE97', title: '' },
      { color: '#F5CD47', title: '' },
      { color: '#FEA362', title: '' },
      { color: '#F87168', title: '' },
      { color: '#9F8FEF', title: '' },
      { color: '#6CC3E0', title: '' },
      { color: '#0C66E4', title: '' },
    ];
    const board = await Board.create({
      boardTitle: boardTitle,
      boardLabels: boardLabels,
      boardStyle: boardStyle,
    });


    await User.findByIdAndUpdate(req.user!.id, {
      $pull: { lastBoardVisited: { board: board._id } },
    });

    // 2) add it to the front and slice to 25
    await User.findByIdAndUpdate(req.user!.id, {
      $push: {
        lastBoardVisited: {
          $each: [
            {
              board: board._id,
              boardTitle: board.boardTitle,
              boardStyle: board.boardStyle,
            },
          ],
          $position: 0,
          $slice: 25,
        },
      },
    });
    res.status(201).json(board);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete entry' });
  }
});
router.get('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const boards = await Board.find().lean();
    console.log(' router.get(/) boards', boards);
    res.json({ boards });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete entry' });
  }
});
// Boards – fetch one with lists + tasks
router.get('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const board = await Board.findById(req.params.id)
      // .populate({ path: "boardMembers.user", select: "fullName avatar" })
      .lean();

    if (!board) return res.status(404).json({ error: 'Board not found' });

    //pulling the user with the old data
    await User.findByIdAndUpdate(req.user!.id, {
      $pull: { lastBoardVisited: { board: board._id } },
    }).exec();;

    // 2) add it to the front and slice to 25
    await User.findByIdAndUpdate(req.user!.id, {
      $push: {
        lastBoardVisited: {
          $each: [
            {
              board: board._id,
              boardTitle: board.boardTitle,
              boardStyle: board.boardStyle,
            },
          ],
          $position: 0,
          $slice: 8,
        },
      },
    }).exec();;

    const lists = await List.find({ taskListBoard: board._id })
      // .sort({ indexInBoard: 1 })
      .lean();

    const tasks = await Task.find({ board: board._id }).lean();

    res.json({ board, lists, tasks });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete entry' });
  }
});
// UPDATE
router.put('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const allowed = ['boardTitle', 'style', 'isStarred', 'archivedAt', 'boardLists','boardStyle'] as const;
    const updates = pick(req.body, allowed);
    console.log("req.body", req.body)
    console.log("updates", updates)
    
    // Only owners/admins may update
    const board = await Board.findOneAndUpdate(
      {
        _id: req.params.id,
        //  "members.user": req.user?.id
      },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!board) return res.status(403).json({ error: 'Forbidden' });

  
    res.json(board);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete entry' });
  }
});

router.delete('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    console.log("req.params.id", req.params);
    const board = await Board.findOne({
      _id: req.params.id,
    });
    if (!board) return res.status(403).json({ error: 'Forbidden' });
    console.log("delete board", board);
    
    // Hard-delete – wipe board + children in one go
    await Promise.all([
      List.deleteMany({ taskListBoard: board._id }),
      Task.deleteMany({ board: board._id }),
      Activity.deleteMany({ board: board._id }),
      Board.deleteOne({ _id: board._id }),
    ]);

    res.status(204).end();
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete entry' });
  }
});

export default router;
