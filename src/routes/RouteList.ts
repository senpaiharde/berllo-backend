import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middlewares/authmiddleware';
import  Board, {IBoard} from '../models/Board';
import mongoose from 'mongoose';
import   List, {IList} from '../models/List';
import  pick  from '../utils/pick';
import Activity from '../models/activity';
import Task from '../models/task';
const router = Router();

router.use(authMiddleware)
// CREATE
router.post("/", async (req: Request, res: Response): Promise<any> => {
  try {
    const { taskListBoard ,taskListTitle,indexInBoard } = req.body as {
      taskListBoard: string
      taskListTitle: string
      indexInBoard: number
      // style?: { backgroundImage?: string }
    }
    console.log("req.body", req.body)
    // const boardLabels = [
    //   { color: "#4BCE97", title: "" },
    //   { color: "#F5CD47", title: "" },
    //   { color: "#FEA362", title: "" },
    //   { color: "#F87168", title: "" },
    //   { color: "#9F8FEF", title: "" },
    //   { color: "#6CC3E0", title: "" },
    //   { color: "#0C66E4", title: "" },
    // ]
    const list = await List.create({
      taskListBoard: taskListBoard,
      taskListTitle: taskListTitle,
      indexInBoard: indexInBoard,
      // boardLabels: boardLabels
    })
    if (!list) return res.status(404).json({ error: "problem creating list" }) 
    //updating the board with the new list
    let board = await Board.findOne({ _id: new mongoose.Types.ObjectId(taskListBoard) });
    board?.boardLists.push(list._id);
    const updates = { boardLists: board?.boardLists }
    board = await Board.findOneAndUpdate(
          { _id: taskListBoard,
           },
          { $set: updates },
          { new: true, runValidators: true }
        )
    res.status(201).json(list)
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: "Could not delete entry" })
  }
})
router.get("/", async (req: Request, res: Response): Promise<any> => {
  try {
    const boards = await Board.find()
      .lean()
    console.log(" router.get(/) boards", boards)
    res.json({ boards})
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: "Could not delete entry" })
  }
})
// Boards – fetch one with lists + tasks
router.get("/:id", async (req: Request, res: Response): Promise<any> => {
  try {
    const board = await Board.findById(req.params.id)
      .populate({ path: "boardMembers.user", select: "fullName avatar" })
      .lean()

    if (!board) return res.status(404).json({ error: "Board not found" })

    const lists = await List.find({ taskListBoard: board._id })
      // .sort({ indexInBoard: 1 })
      .lean()

    const tasks = await Task.find({ board: board._id }).lean()

    res.json({ board, lists, tasks })
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: "Could not delete entry" })
  }
})
// UPDATE
router.put("/:id", async (req: Request, res: Response): Promise<any> => {
  try {
    const allowed = ["taskListTitle", "taskList"] as const
    const updates = pick(req.body, allowed)
    const exists = await List.findOne({ _id: new mongoose.Types.ObjectId(req.params.id) });
    console.log('List EXISTS?', exists ? ' YES' : ' NO');
    console.log("req.body", req.body,"updates", updates)
    // Only owners/admins may update
    const list = await List.findOneAndUpdate(
      { _id: req.params.id},
      { $set: updates },
      { new: true, runValidators: true }
    )

    if (!list) return res.status(403).json({ error: "Forbidden" })

    // await Activity.create({
    //   board: list._id,
    //   user: req.user?.id,
    //   entity: { kind: "board", id: list._id },
    //   action: "updated_board",
    //   payload: updates,
    // })

    res.json(list)
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: "Could not delete entry" })
  }
})

router.delete("/:id", async (req: Request, res: Response): Promise<any> => {
  try {
    const list = await List.findOne({
      _id: req.params.id
    })
    if (!list) return res.status(403).json({ error: "Forbidden" })
    // console.log("delete list", list)
    // Hard-delete – wipe list + children in one go
    await Promise.all([
      List.deleteOne({ _id: list._id }),
      Task.deleteMany({ list: list._id }),
      // Activity.deleteMany({ board: board._id }), add to activity field with list._id
    ])

    res.status(204).end()
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: "Could not delete entry" })
  }
})

export default router
