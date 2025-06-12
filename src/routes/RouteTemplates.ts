
import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import Board from '../models/Board';
import List from '../models/List';
import Task from '../models/task';
import { getIO } from '../services/socket';
import { authMiddleware } from '../middlewares/authmiddleware';
import User from '../models/User';

// Define your templates somewhere centrally:

interface TemplateTask {
  listIndex: number;
  title: string;
  dueDaysFromNow?: number;
  attachments?: { url: string; name?: string }[];
  coverUrl?: string;
  checklist?: { text: string; checked: boolean }[];
}

const boardTemplates: Record<
  string,
  {
    boardStyle: Record<string, any>;
    lists: string[];
    tasks: { listIndex: number; title: string; dueDaysFromNow?: number }[];
  }
> = {
  '1': {
    boardStyle: { boardColor: '#FFEBEE' ,boardType: 'color',boardImg:'none'  },
    lists: ['To Do', 'Doing', 'Done'],
    tasks: [
      { listIndex: 0, title: 'Welcome to your new board!', dueDaysFromNow: 2 },
      { listIndex: 1, title: 'This task is in progress', dueDaysFromNow: 1 },
      { listIndex: 2, title: 'Completed task example', dueDaysFromNow: 0 },
    ],
  },
  '2': {
    boardStyle: { boardColor: '#E8F5E9',boardType: 'color',boardImg:'none'  },
    lists: ['Backlog', 'Sprint', 'Review', 'Release'],
    tasks: [
      { listIndex: 0, title: 'Define project scope', dueDaysFromNow: 7 },
      { listIndex: 1, title: 'Implement core feature', dueDaysFromNow: 3 },
    ],
  },
 
};

const router = Router();
router.use(authMiddleware)

router.post('/template/:templateId', async (req: Request, res: Response):Promise<any> => {
  const { templateId } = req.params;
  const { title } = req.body as { title?: string };

  if (!title || typeof title !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid board title' });
  }
  const template = boardTemplates[templateId];
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  try {
    //  Create the Board
    const board = await Board.create({
      boardTitle: title,
      boardStyle: template.boardStyle,
      createdBy: req.user!.id,      
      boardLists: [],                
      
    });

    //  Bulk‐insert Lists
    const listDocs = template.lists.map((listTitle, idx) => ({
      taskListBoard: board._id,
      taskListTitle: listTitle,
      indexInBoard: idx,
          
      // archivedAt
    }));
    const createdLists = await List.insertMany(listDocs);

    //  Bulk‐insert Tasks
    const taskDocs: any[] = template.tasks.map((t, idx) => ({
      board: board._id,
      list: createdLists[t.listIndex]._id,
      title: t.title,
      archivedAt:Date.now(),
      comments: [],
      description:'',
      isWatching: false,
      taskDescription: '',
      isDueComplete: false,
      position: idx,
      dueDate:
        t.dueDaysFromNow != null
          ? new Date(Date.now() + t.dueDaysFromNow * 86400000)
          : null,
      // attachments, labels, comments etc. 
    }));
    const createdTasks = await Task.insertMany(taskDocs);



    await Promise.all(
  createdLists.map((listDoc) => {
    const tasksForThisList = createdTasks
      .filter((t) => t.list.toString() === listDoc._id.toString())
      .map((t) => t._id);

    return List.findByIdAndUpdate(
      listDoc._id,
      { $set: { taskList: tasksForThisList } }
    ).exec();
  })
);
    //  Update the Board’s boardLists to reference the new lists
    board.boardLists = createdLists.map((l) => l._id);
    await board.save();

    // 
    //    
    // for (const list of createdLists) {
    //   const tasksForList = createdTasks
    //     .filter((t) => t.list.toString() === list._id.toString())
    //     .map((t) => t._id);
    //   await List.findByIdAndUpdate(list._id, { $set: { taskList: tasksForList } });
    // }

    //  Emit a socket 
   // getIO().emit('boardCreated', {
    //  board,
    //  lists: createdLists,
   //   tasks: createdTasks,
   // });

    //  Return 
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
              $slice: 8,
            },
          },
        });
    return res.status(201).json({
      board,
      lists: createdLists,
      tasks: createdTasks,
    });
  } catch (err) {
    console.error('Error creating board from template:', err);
    return res.status(500).json({ error: 'Failed to create board' });
  }
});

export default router;
