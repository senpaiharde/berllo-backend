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
    tasks: {
      listIndex: number;
      title: string;
      dueDaysFromNow?: number;
      attachments?: Record<string, any>;
      cover?: Record<string, any>;
      description?: string;
    }[];
  }
> = {
  '1': {
    boardStyle: {
      boardColor: '#1c1912',
      boardType: 'image',
      boardImg:
        'https://images.unsplash.com/photo-1633155561838-9b372f906787?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    },
    lists: ['Info', 'Team Members Topics', 'Managers Topics', 'Goals', 'Actions', 'Done'],
    tasks: [
      {
        listIndex: 0,
        title: 'How to use this board',
        dueDaysFromNow: 2,
        attachments: {
          url: 'https://trello.com/1/cards/5b2281bb004ac866019e5208/attachments/5b2284034d2649882a15974d/download/ScratchPaper.jpg',
          name: 'ScratchPaper',
        },
        cover: {
          coverType: 'image',
          coverImg:
            'https://trello.com/1/cards/5b2281bb004ac866019e5208/attachments/5b2284034d2649882a15974d/download/ScratchPaper.jpg',
        },
        description: `Suggested use of this template
Before

Both manager and team member put topics down on their lists, ranked by priority and labeled as either Blocker, Discuss, FYI or Paused.

During

Agree on agenda
1. Can Blocker and Discuss topics can be covered?
2. Any interest in FYI topics?

Discuss topics
1.  Capture notes/actions as you go (or defer to after meeting)

Review progress on goals (either all or pick one to focus)

Review actions

After

Capture necessary notes/actions not covered in 1-1 meeting

Move discussions that have related actions to "Actions"

Move topics that are closed to "Done"`,
      },
      { listIndex: 0, title: 'Blocker - Timely discussion (#4)', dueDaysFromNow: 2 },
      { listIndex: 0, title: 'Discuss - Suggested topic (#3)', dueDaysFromNow: 2 },
      { listIndex: 0, title: 'FYI - Discuss if interested (#6)', dueDaysFromNow: 2 },
      { listIndex: 0, title: 'Paused - No need to discuss (#0)', dueDaysFromNow: 2 },
      { listIndex: 0, title: 'Goal (#1)', dueDaysFromNow: 2 },

      {
        listIndex: 1,
        title: 'The team is stuck on X, how can we move forward?',
        dueDaysFromNow: 1,
      },
      {
        listIndex: 1,
        title: 'Ive drafted my goals for the next few months. Any feedback?',
        dueDaysFromNow: 1,
      },
      {
        listIndex: 1,
        title: 'I think we can improve velocity if we make some tooling changes.',
        dueDaysFromNow: 1,
      },

      { listIndex: 2, title: 'New training program', dueDaysFromNow: 0 },
      { listIndex: 2, title: 'Can you please give feedback on the report?', dueDaysFromNow: 0 },

      { listIndex: 3, title: 'Manage time chaos', dueDaysFromNow: 0 },
      { listIndex: 3, title: 'Mentor another developer', dueDaysFromNow: 0 },
      { listIndex: 3, title: 'Best practice blog', dueDaysFromNow: 0 },
    ],
  },
  '2': {
    boardStyle: {
      boardColor: '#62bcf5',
      boardType: 'image',
      boardImg:
        'https://plus.unsplash.com/premium_photo-1739507949249-1dd3c826fd72?q=80&w=1932&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    },
    lists: [
      'Done',
      'Current Sprint',
      'In Progress',
      'On Hold',
      'Next-up',
      'Questions',
      'Marketing Ideas - Icebox',
    ],
    tasks: [
      { listIndex: 0, title: 'Review Tech partner pages', dueDaysFromNow: 2 },
      { listIndex: 0, title: 'Make sure sponsors are indicated for Tech Talk', dueDaysFromNow: 2 },
      { listIndex: 0, title: 'Top 10 Trends list - Forbes', dueDaysFromNow: 2 },
      { listIndex: 0, title: 'TBC Webinar: Ship Now, Not Later', dueDaysFromNow: 2 },
      { listIndex: 0, title: '1:1 Nancy', dueDaysFromNow: 2 },
      { listIndex: 0, title: 'Lead Gen Mandrill stats', dueDaysFromNow: 2 },

      { listIndex: 1, title: 'Going live with server deployment', dueDaysFromNow: 1 },
      { listIndex: 1, title: 'Google Adwords list of referrers', dueDaysFromNow: 1 },
      { listIndex: 1, title: 'Q3 Webinar Content Planning', dueDaysFromNow: 1 },
      { listIndex: 1, title: 'IT Solutions page', dueDaysFromNow: 1 },
      { listIndex: 1, title: 'Email campaign - February', dueDaysFromNow: 1 },
      { listIndex: 2, title: 'Android App new landing page', dueDaysFromNow: 0 },
      { listIndex: 2, title: 'Analytics', dueDaysFromNow: 0 },
      { listIndex: 2, title: 'Branding guidelines', dueDaysFromNow: 0 },
      { listIndex: 3, title: 'CSS Rules', dueDaysFromNow: 0 },
      { listIndex: 3, title: 'Retail order', dueDaysFromNow: 0 },
      { listIndex: 3, title: 'Mobile UI reboot', dueDaysFromNow: 0 },
      { listIndex: 3, title: 'Google Analytics data - Q1', dueDaysFromNow: 0 },
      { listIndex: 4, title: 'Data Analytics podcast', dueDaysFromNow: 0 },
      { listIndex: 4, title: 'List of vendors for banquets', dueDaysFromNow: 0 },
      { listIndex: 4, title: 'Google Adwords best practices', dueDaysFromNow: 0 },
      {
        listIndex: 5,
        title: 'How do you adjust the canvas size in Illustrator?',
        dueDaysFromNow: 0,
      },
      { listIndex: 5, title: 'Does Screenhero have a trial period?', dueDaysFromNow: 0 },
      {
        listIndex: 5,
        title: 'When does the new subway fare hike increase - before or after remote week?',
        dueDaysFromNow: 0,
      },
    ],
  },
};

const router = Router();
router.use(authMiddleware);

router.post('/template/:templateId', async (req: Request, res: Response): Promise<any> => {
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
      archivedAt: Date.now(),
      comments: [],
      description: '',
      isWatching: false,
      taskDescription: '',
      isDueComplete: false,
      position: idx,
      dueDate: t.dueDaysFromNow != null ? new Date(Date.now() + t.dueDaysFromNow * 86400000) : null,
      // attachments, labels, comments etc.
    }));
    const createdTasks = await Task.insertMany(taskDocs);

    await Promise.all(
      createdLists.map((listDoc) => {
        const tasksForThisList = createdTasks
          .filter((t) => t.list.toString() === listDoc._id.toString())
          .map((t) => t._id);

        return List.findByIdAndUpdate(listDoc._id, { $set: { taskList: tasksForThisList } }).exec();
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
