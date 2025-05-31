import { Router, Request, Response } from 'express';
import OpenAI from 'openai';

import dotenv from 'dotenv';
import mongoose from 'mongoose';

import Board from '../models/Board';
import List from '../models/List';
import Task from '../models/task';

dotenv.config();
if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY in environment');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const router = Router();

/**
 * Utility to strip triple‐backtick fences if ChatGPT wraps its JSON in them.
 */
function stripJSONFences(raw: string): string {
  let text = raw.trim();
  if (text.startsWith('```')) {
    // Look for ```json ... ``` or ```
    const match = text.match(/```(?:json)?\n([\s\S]*?)```/i);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return text;
}

/**
 * POST /api/autoBoard
 *
 * Body: { prompt: string }
 *
 * Returns: { boardId: string }
 *
 * This route uses ChatGPT to generate a fully‐populated Board → Lists → Tasks payload,
 * including ALL fields from the `Task` schema (members, startDate, dueDate, reminder,
 * coordinates, checklist, cover, comments, archivedAt, position, isWatching). Any fields
 * GPT does not supply will be defaulted.
 *
 * The exact JSON structure GPT must output is:
 * {
 *   "boardTitle": string,
 *   "description": string,
 *   "lists": [
 *     {
 *       "title": string,
 *       "position": number,
 *       "tasks": [
 *         {
 *           "title": string,
 *           "description": string,
 *           "dueDate": string | null,
 *           "startDate": string | null,
 *           "reminder": string | null,
 *           "coordinates": [number, number] | null,
 *           "members": [
 *             {
 *               "_id": string,
 *               "fullname": string,
 *               "avatar": string
 *             }
 *             // … more members
 *           ],
 *           "checklist": [
 *             {
 *               "title": string,
 *               "items": [
 *                 {
 *                   "text": string,
 *                   "done": boolean
 *                 }
 *                 // … more items
 *               ]
 *             }
 *             // … more checklists
 *           ],
 *           "cover": {
 *             "coverType": string,   // enum: ['color','image']
 *             "coverColor": string,
 *             "coverImg": string
 *           } | null,
 *           "comments": [
 *             {
 *               "_id": string,
 *               "userId": string,
 *               "text": string,
 *               "createdAt": string
 *             }
 *             // … more comments
 *           ],
 *           "archivedAt": string | null,
 *           "position": number,
 *           "isWatching": boolean
 *         }
 *         // … more tasks
 *       ]
 *     }
 *     // … more lists
 *   ]
 * }
 *
 * When ChatGPT responds, it must return **only** this JSON object—no extra text, no markdown fences.
 */
router.post('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const { prompt } = req.body as { prompt?: string };

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: '`prompt` (string) is required.' });
    }

    // 1) Build the ChatGPT prompt messages
    const systemMessage = {
      role: 'system',
      content: `
{
  "boardTitle": string,             
  "description": string,           
  "lists": [
    {
      "title": string,            
      "position": number,           
      "tasks": [
        {
          "title": string,        
          "description": string,    
          "dueDate": string|null,  
          "startDate": string|null,
          "reminder": string|null,  
          "coordinates": [          
            number,
            number
          ]|null,
          "members": [
            {
              "_id": string,        
              "fullname": string,
              "avatar": string
            }
           
          ],
          "checklist": [
            {
              "title": string,    
              "items": [
                {
                  "text": string,
                  "done": boolean
                }
                
              ]
            }
            
          ],
          "cover": {
            "coverType": string,   
            "coverColor": string,
            "coverImg": string
          }|null,
          "comments": [
            {
              "_id": string,        
              "userId": string,     
              "text": string,
              "createdAt": string   
            }
            
          ],
          "archivedAt": string|null, 
          "position": number,      
          "isWatching": boolean    
        }
        
      ]
    }
    
  ]
}
    `,
    };

    const userMessage = {
      role: 'user',
      content: `Please create a new board payload for: "${prompt.trim()}"`,
    };

    // 2) Call OpenAI ChatCompletion
    const completion = await openai.chat.completions.create({
  model: 'gpt-4o-mini',       // or "gpt-4o" if you have access
  messages: [
    { role: 'system', content: '…your system instructions…' },
    { role: 'user',   content: '…your user prompt…' }
  ],
  temperature: 0.2,
  max_tokens: 1200,
});
    const rawOutput = completion.choices[0].message?.content || '';
    const jsonString = stripJSONFences(rawOutput);

    // 3) JSON.parse the output
    let payload: {
      boardTitle: string;
      description: string;
      lists: Array<{
        title: string;
        position: number;
        tasks: Array<{
          title: string;
          description: string;
          dueDate: string | null;
          startDate: string | null;
          reminder: string | null;
          coordinates: [number, number] | null;
          members: Array<{
            _id: string;
            fullname: string;
            avatar: string;
          }>;
          checklist: Array<{
            title: string;
            items: Array<{
              text: string;
              done: boolean;
            }>;
          }>;
          cover: {
            coverType: string;
            coverColor: string;
            coverImg: string;
          } | null;
          comments: Array<{
            _id: string;
            userId: string;
            text: string;
            createdAt: string;
          }>;
          archivedAt: string | null;
          position: number;
          isWatching: boolean;
        }>;
      }>;
    };

    try {
      payload = JSON.parse(jsonString);
    } catch (parseErr) {
      console.error('❌ Failed to parse GPT output as JSON:', rawOutput);
      return res.status(500).json({ error: 'Failed to parse JSON from ChatGPT.' });
    }

    // 4) Validate minimal structure
    if (typeof payload.boardTitle !== 'string' || !Array.isArray(payload.lists)) {
      return res.status(500).json({ error: 'Generated JSON did not match expected schema.' });
    }

    // 5) Create the new Board
    const newBoard = new Board({
      boardTitle: payload.boardTitle,
      // Note: your Board schema does not have a “description” field by default;
      // if you want to store payload.description, you could push it into another field or ignore it.
    });
    await newBoard.save();

    const createdListIds: mongoose.Types.ObjectId[] = [];

    // 6) For each list in the payload, create a List document
    for (const listBlock of payload.lists) {
      if (
        typeof listBlock.title !== 'string' ||
        typeof listBlock.position !== 'number' ||
        !Array.isArray(listBlock.tasks)
      ) {
        continue; // skip invalid list
      }

      // 6.1) Create List
      const newList = new List({
        taskListBoard: newBoard._id,
        taskListTitle: listBlock.title,
        indexInBoard: listBlock.position,
        // listStyle: {} // optional default styling
      });
      await newList.save();
      createdListIds.push(newList._id);

      const createdTaskIds: mongoose.Types.ObjectId[] = [];

      // 6.2) For each task in this list, create a Task document
      for (const taskBlock of listBlock.tasks) {
        if (typeof taskBlock.title !== 'string' || typeof taskBlock.position !== 'number') {
          continue; // skip invalid task
        }

        // Parse each optional date field (dueDate, startDate, reminder, archivedAt)
        let parsedDueDate: Date | null = null;
        let parsedStartDate: Date | null = null;
        let parsedReminder: Date | null = null;
        let parsedArchivedAt: Date | null = null;

        if (
          taskBlock.dueDate &&
          typeof taskBlock.dueDate === 'string' &&
          !Number.isNaN(new Date(taskBlock.dueDate).getTime())
        ) {
          parsedDueDate = new Date(taskBlock.dueDate);
        }
        if (
          taskBlock.startDate &&
          typeof taskBlock.startDate === 'string' &&
          !Number.isNaN(new Date(taskBlock.startDate).getTime())
        ) {
          parsedStartDate = new Date(taskBlock.startDate);
        }
        if (
          taskBlock.reminder &&
          typeof taskBlock.reminder === 'string' &&
          !Number.isNaN(new Date(taskBlock.reminder).getTime())
        ) {
          parsedReminder = new Date(taskBlock.reminder);
        }
        if (
          taskBlock.archivedAt &&
          typeof taskBlock.archivedAt === 'string' &&
          !Number.isNaN(new Date(taskBlock.archivedAt).getTime())
        ) {
          parsedArchivedAt = new Date(taskBlock.archivedAt);
        }

        // Parse coordinates if present
        let parsedCoordinates: [number, number] | null = null;
        if (
          Array.isArray(taskBlock.coordinates) &&
          taskBlock.coordinates.length === 2 &&
          typeof taskBlock.coordinates[0] === 'number' &&
          typeof taskBlock.coordinates[1] === 'number'
        ) {
          parsedCoordinates = [taskBlock.coordinates[0], taskBlock.coordinates[1]];
        }

        // Parse members array, converting each to ObjectId
        const parsedMemberIds: mongoose.Types.ObjectId[] = [];
        if (Array.isArray(taskBlock.members)) {
          for (const m of taskBlock.members) {
            if (m && typeof m._id === 'string' && mongoose.isValidObjectId(m._id)) {
              parsedMemberIds.push(new mongoose.Types.ObjectId(m._id));
            }
          }
        }

        // Parse checklist: an array of { title, items: [ { text, done } ] }
        const parsedChecklists: mongoose.HydratedDocument<any>[] = [];
        if (Array.isArray(taskBlock.checklist)) {
          for (const cl of taskBlock.checklist) {
            if (cl && typeof cl.title === 'string' && Array.isArray(cl.items)) {
              // Each checklist item is just plain JSON; we can store it verbatim in the subdocument array.
              parsedChecklists.push({
                title: cl.title,
                items: cl.items.map((it: any) => ({
                  _id: new mongoose.Types.ObjectId(), // generate a new ObjectId for each checklist item
                  text: typeof it.text === 'string' ? it.text : '',
                  done: typeof it.done === 'boolean' ? it.done : false,
                })),
              } as any);
            }
          }
        }

        // Parse cover (if provided)
        let parsedCover: {
          coverType: string;
          coverColor: string;
          coverImg: string;
        } | null = null;
        if (
          taskBlock.cover &&
          typeof taskBlock.cover.coverType === 'string' &&
          ['color', 'image'].includes(taskBlock.cover.coverType) &&
          typeof taskBlock.cover.coverColor === 'string' &&
          typeof taskBlock.cover.coverImg === 'string'
        ) {
          parsedCover = {
            coverType: taskBlock.cover.coverType,
            coverColor: taskBlock.cover.coverColor,
            coverImg: taskBlock.cover.coverImg,
          };
        }

        // Parse comments array (each comment: { _id, userId, text, createdAt })
        const parsedComments: mongoose.Types.ObjectId[] = [];
        // If your Comment schema requires more fields, you could expand here.
        // For now, we store each comment’s _id in an array. If you want full subdocuments,
        // adapt per how CommentSchema is defined.
        if (Array.isArray(taskBlock.comments)) {
          for (const c of taskBlock.comments) {
            if (c && typeof c._id === 'string' && mongoose.isValidObjectId(c._id)) {
              parsedComments.push(new mongoose.Types.ObjectId(c._id));
            }
          }
        }

        // Finally, create the new Task using ALL possible fields
        const newTask = new Task({
          board: newBoard._id,
          list: newList._id,
          title: taskBlock.title,
          description: taskBlock.description || '',
          startDate: parsedStartDate,
          dueDate: parsedDueDate,
          reminder: parsedReminder,
          coordinates: parsedCoordinates,
          members: parsedMemberIds,
          checklist: parsedChecklists,
          cover: parsedCover,
          comments: parsedComments,
          archivedAt: parsedArchivedAt,
          position: taskBlock.position,
          isWatching: typeof taskBlock.isWatching === 'boolean' ? taskBlock.isWatching : false,
        });
        await newTask.save();
        createdTaskIds.push(newTask._id);
      }

      // 6.3) Push all newTask IDs into newList.taskList
      if (createdTaskIds.length > 0) {
        newList.taskList = createdTaskIds;
        await newList.save();
      }
    }

    // 7) Push all newList IDs into newBoard.boardLists
    if (createdListIds.length > 0) {
      newBoard.boardLists = createdListIds;
      await newBoard.save();
    }

    // 8) Return the new board's ID to the client
    return res.status(201).json({ boardId: newBoard._id });
  } catch (err) {
    console.error('❌ Error in POST /api/autoBoard:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
