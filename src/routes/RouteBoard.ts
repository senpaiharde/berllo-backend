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
// interface combineBoardFromgGetProps{
//   board: IBoard;
//   lists: IList;
//   tasks: ITask;
// }
// function combineBoardFromGet({
//   board,
//   lists,
//   tasks,
// }: {
//   board: IBoard;
//   lists: IList[];
//   tasks: ITask[];
// }): IBoard {
//   const listIdToTasksMap = new Map<string, ITask[]>();

//   // Group tasks by list ID
//   tasks.forEach((task) => {
//     const listId = task.list.toString();
//     if (!listIdToTasksMap.has(listId)) {
//       listIdToTasksMap.set(listId, []);
//     }
//     listIdToTasksMap.get(listId)!.push(task);
//   });

//   // Attach tasks to the matching lists
//   const updatedLists = lists.map((list) => {
//     const listWithTasks = {
//       ...list.toObject(), // detach from Mongoose prototype
//       tasks: listIdToTasksMap.get(list._id.toString()) || [],
//     };
//     return listWithTasks;
//   });

//   // Update and return board
//   const updatedBoard = {
//     ...board.toObject(),
//     lists: updatedLists,
//     tasks,
//   };

//   return updatedBoard;
// }
// CREATE

router.post('/', async (req: Request, res: Response) => {
  try {
    const { boardTitle, style } = req.body as {
      boardTitle: string;
      style?: { backgroundImage?: string };
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
    });

    // 2) add it to the front and slice to 25
    await User.findByIdAndUpdate(req.user!.id, {
      $push: {
        lastBoardVisited: {
          $each: [{
            board:      board._id,
            boardTitle: board.boardTitle   
          }],
          $position: 0,
          $slice:    25
        },
      },
    });

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
    const allowed = ['title', 'style', 'isStarred', 'archivedAt', 'boardLists'] as const;
    const updates = pick(req.body, allowed);
    // console.log("req.body", req.body)
    // console.log("updates", updates)
    // console.log("req.params.id", req.params.id)
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

    // await Activity.create({
    //   board: board._id,
    //   user: req.user?.id,
    //   entity: { kind: "board", id: board._id },
    //   action: "updated_board",
    //   payload: updates,
    // })

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
