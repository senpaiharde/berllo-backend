
import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import Board from '../models/Board';
import List from '../models/List';
import Task from '../models/task';
import { getIO } from '../services/socket';
import { authMiddleware } from '../middlewares/authmiddleware';

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
    style: Record<string, any>;
    lists: string[];
    tasks: { listIndex: number; title: string; dueDaysFromNow?: number }[];
  }
> = {
  '1': {
    style: { backgroundColor: '#FFEBEE' },
    lists: ['To Do', 'Doing', 'Done'],
    tasks: [
      { listIndex: 0, title: 'Welcome to your new board!', dueDaysFromNow: 2 },
      { listIndex: 1, title: 'This task is in progress', dueDaysFromNow: 1 },
      { listIndex: 2, title: 'Completed task example', dueDaysFromNow: 0 },
    ],
  },
  '2': {
    style: { backgroundColor: '#E8F5E9' },
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
      boardStyle: template.style,
      createdBy: req.user!.id,      
      boardLists: [],                
      
    });

    //  Bulk‐insert Lists
    const listDocs = template.lists.map((listTitle, idx) => ({
      taskListBoard: board._id,
      taskListTitle: listTitle,
      indexInBoard: idx,
      taskList: [],     
      // archivedAt
    }));
    const createdLists = await List.insertMany(listDocs);

    //  Bulk‐insert Tasks
    const taskDocs: any[] = template.tasks.map((t, idx) => ({
      board: board._id,
      list: createdLists[t.listIndex]._id,
      taskTitle: t.title,
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
