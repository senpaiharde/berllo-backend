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

  '3': {
    boardStyle: {
      boardColor: '#1f381d',
      boardType: 'image',
      boardImg:
        'https://images.unsplash.com/photo-1540690574994-69de75ab59da?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    },
    lists: ['Teams', 'Up Next', 'Current Projects', 'Completed Projects', 'Bravos'],
    tasks: [
      { listIndex: 0, title: 'Product', dueDaysFromNow: 2 },
      { listIndex: 0, title: 'Marketing', dueDaysFromNow: 2 },
      { listIndex: 0, title: 'Sales', dueDaysFromNow: 2 },
      { listIndex: 0, title: 'TBC Webinar: Ship Now, Not Later', dueDaysFromNow: 2 },
      { listIndex: 0, title: 'Support', dueDaysFromNow: 2 },
      { listIndex: 0, title: 'People', dueDaysFromNow: 2 },
      { listIndex: 0, title: 'IT', dueDaysFromNow: 2 },

      { listIndex: 1, title: 'Increase sales revenue by 30% in Q3', dueDaysFromNow: 1 },
      { listIndex: 1, title: 'Ship iOS app', dueDaysFromNow: 1 },
      { listIndex: 1, title: 'Increase conversion rate by 20% by Q3', dueDaysFromNow: 1 },

      { listIndex: 2, title: 'Develop Engineering Blog', dueDaysFromNow: 0 },
      { listIndex: 2, title: 'Brand Guidelines', dueDaysFromNow: 0 },
      { listIndex: 2, title: 'Analytics Data', dueDaysFromNow: 0 },
      { listIndex: 3, title: 'Website Redesign', dueDaysFromNow: 0 },
      { listIndex: 3, title: 'Social Media Campaign', dueDaysFromNow: 0 },
      { listIndex: 3, title: 'Update Help Documentation', dueDaysFromNow: 0 },

      {
        listIndex: 4,
        title:
          'Bravo to Tom for answering the most Customer Support emails ever received in one day!',
        dueDaysFromNow: 0,
      },
      {
        listIndex: 4,
        title: 'Bravo to Lauren for taking the lead and finishing the new landing page design!',
        dueDaysFromNow: 0,
      },
    ],
  },

  '4': {
    boardStyle: {
      boardColor: '#b5833e',
      boardType: 'image',
      boardImg:
        'https://images.unsplash.com/photo-1653022860307-0ccb6379f78b?q=80&w=1932&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    },
    lists: [
      'Concept',
      '📝 Notes',
      '👍 Positives',
      '👎 Negatives',
      '🙋 Questions',
      '🤔 Have You Considered?',
      '❌ Potential Blockers',
    ],
    tasks: [
      { listIndex: 0, title: 'Huddle Template :: [Presenter(s)] - [Project]', dueDaysFromNow: 2 },
      { listIndex: 0, title: 'Video Call Link', dueDaysFromNow: 2 },
      { listIndex: 0, title: 'Design Prototype Link', dueDaysFromNow: 2 },

      { listIndex: 1, title: 'General Notes:', dueDaysFromNow: 1 },
      { listIndex: 1, title: '--', dueDaysFromNow: 1 },
      { listIndex: 1, title: 'Action Items', dueDaysFromNow: 1 },
      { listIndex: 1, title: '--', dueDaysFromNow: 1 },

      { listIndex: 2, title: '👍Positive [I really liked...]', dueDaysFromNow: 0 },

      { listIndex: 3, title: '👎Negative [Im not sure about...]', dueDaysFromNow: 0 },

      { listIndex: 4, title: '🙋Question [What about...?]', dueDaysFromNow: 0 },
      { listIndex: 4, title: '🤔Have you considered...', dueDaysFromNow: 0 },

      { listIndex: 5, title: '❌Blocker', dueDaysFromNow: 0 },
    ],
  },
  '5': {
    boardStyle: {
      boardColor: '#0d62b8',
      boardType: 'image',
      boardImg:
        'https://images.unsplash.com/photo-1737819605100-d2b097891439?q=80&w=1935&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    },
    lists: ['Helpful Launch Info', 'To Do', 'In Progress', 'Ready For Launch', 'Launched'],
    tasks: [
      { listIndex: 0, title: 'Target Product Launch Date: December 1, 2019', dueDaysFromNow: 2 },
      { listIndex: 0, title: 'Marketing docs and assets', dueDaysFromNow: 2 },
      { listIndex: 0, title: 'Launch Timeline & Stakeholders', dueDaysFromNow: 2 },

      { listIndex: 1, title: 'Fix alignment issue on /pricing', dueDaysFromNow: 1 },
      {
        listIndex: 1,
        title: 'Update assorted references on existing Marketing pages',
        dueDaysFromNow: 1,
      },

      { listIndex: 2, title: 'Social promotion', dueDaysFromNow: 0 },
      { listIndex: 2, title: 'Blog post - Announcement', dueDaysFromNow: 0 },
      { listIndex: 2, title: 'In-App Announcement', dueDaysFromNow: 0 },
      { listIndex: 2, title: 'Email Newsletter', dueDaysFromNow: 0 },

      { listIndex: 3, title: 'Messaging Doc', dueDaysFromNow: 0 },
      { listIndex: 3, title: 'Marketing Training on Power-Ups', dueDaysFromNow: 0 },
      { listIndex: 3, title: 'Sales Training On Power-Ups', dueDaysFromNow: 0 },
    ],
  },
  '6': {
    boardStyle: {
      boardColor: '#ce66d1',
      boardType: 'image',
      boardImg:
        'https://images.unsplash.com/photo-1626544827763-d516dce335e2?q=80&w=1934&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    },
    lists: ['Backlog', 'Design', 'To Do', 'Doing', 'Code Review', 'Testing', 'Done 🎉'],
    tasks: [
      { listIndex: 0, title: 'Backlog', dueDaysFromNow: 2 },
      { listIndex: 0, title: '[Example task]', dueDaysFromNow: 2 },

      { listIndex: 1, title: 'Design & Research', dueDaysFromNow: 1 },
      {
        listIndex: 1,
        title: '[Example task with designs]',
        dueDaysFromNow: 1,
      },

      { listIndex: 2, title: 'To Do', dueDaysFromNow: 0 },

      { listIndex: 3, title: 'Doing', dueDaysFromNow: 0 },
      { listIndex: 3, title: '[Example task]', dueDaysFromNow: 0 },
      { listIndex: 4, title: 'Code Review', dueDaysFromNow: 0 },
      {
        listIndex: 4,
        title:
          'This list has the List Limits Power-up enabled, to help the team prioritize and remove bottlenecks before picking up new work. The list will be highlighted if the number of cards in it passes the limit that the team determines based on team size.',
        dueDaysFromNow: 0,
      },
      { listIndex: 4, title: '[Example task]', dueDaysFromNow: 0 },
      { listIndex: 4, title: '[Example task]', dueDaysFromNow: 0 },
      { listIndex: 5, title: 'Testing', dueDaysFromNow: 0 },
      { listIndex: 6, title: 'Done', dueDaysFromNow: 0 },
      { listIndex: 6, title: '[Completed task]', dueDaysFromNow: 0 },
    ],
  },
  '7': {
    boardStyle: {
      boardColor: '#383838',
      boardType: 'image',
      boardImg:
        'https://images.unsplash.com/photo-1623715537851-8bc15aa8c145?q=80&w=1886&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    },
    lists: [
      'Start here!',
      'Today',
      'Tomorrow',
      'This Week',
      'Waiting',
      'Inbox',
      'Done 🎉',
      'References',
    ],
    tasks: [
      {
        listIndex: 0,
        title: `How to set up this board: A Trello Insider's Guide To Personal Productivity`,
        dueDaysFromNow: 2,
      },
      {
        listIndex: 0,
        title: 'Power-Ups you can use on this board for maximum productivity.',
        dueDaysFromNow: 2,
      },
      {
        listIndex: 0,
        title: 'Automation Tips & Tricks: How to funnel all your things into this board.',
        dueDaysFromNow: 2,
      },
      {
        listIndex: 0,
        title: 'M: Meeting cards are always prefixed with "M" and have a due date.',
        dueDaysFromNow: 2,
      },
      {
        listIndex: 0,
        title: 'E: Email cards are prefixed with "E" and sent to the board via Zapier.',
        dueDaysFromNow: 2,
      },

      {
        listIndex: 1,
        title:
          'Spend 5-15 minutes each morning planning out the day ahead. Move cards over from Tomorrow, Soon, Waiting, and Inbox, and add your meetings.',
        dueDaysFromNow: 1,
      },

      {
        listIndex: 2,
        title: `Hold tasks here that won't fit in Today, but should happen soon.`,
        dueDaysFromNow: 0,
      },

      {
        listIndex: 3,
        title: 'Add tasks here that should happen by the end of the week.',
        dueDaysFromNow: 0,
      },

      {
        listIndex: 4,
        title: `Add stuff here that needs to happen eventually, but hasn't been scheduled yet.`,
        dueDaysFromNow: 0,
      },

      {
        listIndex: 5,
        title: `Everything should be added here first, before they've been prioritized into the other lists.`,
        dueDaysFromNow: 0,
      },
      {
        listIndex: 6,
        title: `This is your trophy room. It feels good to be reminded of all the things you've accomplished!`,
        dueDaysFromNow: 0,
      },
      {
        listIndex: 7,
        title: 'This is your place to keep inspiration and things to remember.',
        dueDaysFromNow: 0,
      },
    ],
  },
  '8': {
    boardStyle: {
      boardColor: '121010',
      boardType: 'image',
      boardImg:
        'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?q=80&w=1964&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    },
    lists: [
      'Project Resources',
      'Questions For Next Meeting',
      'To Do',
      'Pending',
      'Blocked',
      'Done',
    ],
    tasks: [
      {
        listIndex: 0,
        title: 'Looking for even more project management features?',
        dueDaysFromNow: 2,
      },

      {
        listIndex: 0,
        title: 'Trello Tip: Card labels! What do they mean? (Click for more info)',
        dueDaysFromNow: 2,
      },
      { listIndex: 0, title: 'Project "Teamwork Dream Work" Launch Timeline', dueDaysFromNow: 2 },

      { listIndex: 0, title: 'Stakeholders', dueDaysFromNow: 2 },
      { listIndex: 0, title: 'Weekly Updates', dueDaysFromNow: 2 },

      {
        listIndex: 1,
        title: `Trello Tip: 🌊Slide your Q's into this handy list so your team keeps on flowing.`,
        dueDaysFromNow: 1,
      },
      {
        listIndex: 1,
        title: `Who's the best person to fix my HTML snag?`,
        dueDaysFromNow: 1,
      },
      {
        listIndex: 1,
        title: `How can I get access to the super secret document?`,
        dueDaysFromNow: 1,
      },

      {
        listIndex: 2,
        title: `Trello Tip: This is where assigned tasks live so that your team can see who's working on what and when it's due.`,
        dueDaysFromNow: 0,
      },
      {
        listIndex: 2,
        title: `Sketch site banner`,
        dueDaysFromNow: 0,
      },
      {
        listIndex: 2,
        title: `Edit email drafts`,
        dueDaysFromNow: 0,
      },
      {
        listIndex: 2,
        title: `Curate customer list`,
        dueDaysFromNow: 0,
      },
      {
        listIndex: 2,
        title: `Sketch the "Teamy Dreamy" Font`,
        dueDaysFromNow: 0,
      },
      {
        listIndex: 2,
        title: `Trello Tip: This is where assigned tasks live so that your team can see who's working on what and when it's due.`,
        dueDaysFromNow: 0,
      },

      { listIndex: 3, title: 'Doing', dueDaysFromNow: 0 },
      { listIndex: 3, title: '[Example task]', dueDaysFromNow: 0 },
      { listIndex: 4, title: 'Code Review', dueDaysFromNow: 0 },
      
      { listIndex: 4, title: 'Trello Tip: 💬For those in-between tasks that are almost done but also awaiting one last step.', dueDaysFromNow: 0 },
      { listIndex: 4, title: 'Legal review', dueDaysFromNow: 0 },
      { listIndex: 4, title: 'Social media assets', dueDaysFromNow: 0 },
      { listIndex: 5, title: 'Trello Tip: Splash those redtape-heavy issues that are slowing your team down here.', dueDaysFromNow: 0 },
      { listIndex: 5, title: 'Freelancer contracts', dueDaysFromNow: 0 },
      { listIndex: 5, title: 'Budget approval', dueDaysFromNow: 0 },
      { listIndex: 6, title: `Brello Tip: ✨ Be proud! You're done! For all your finished tasks that your team has hustled on.`, dueDaysFromNow: 0 },
      { listIndex: 6, title: 'Finalize Campaign Name: Teamwork Dream Work ✨', dueDaysFromNow: 0 },
      { listIndex: 6, title: 'Submit Q1 report', dueDaysFromNow: 0 },
      { listIndex: 6, title: 'Campaign Proposal', dueDaysFromNow: 0 },
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
      description: t.description,
       cover:  t.cover,
       attachments: t.attachments,
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
