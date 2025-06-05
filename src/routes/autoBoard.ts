import { Router, Request, Response } from 'express';
import OpenAI from 'openai';

import dotenv from 'dotenv';
import mongoose from 'mongoose';

import Board from '../models/Board';
import List from '../models/List';
import Task from '../models/task';
import { authMiddleware } from '../middlewares/authmiddleware';
dotenv.config();
if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY in environment');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const router = Router();
router.use(authMiddleware);

/**
 * If ChatGPT wraps JSON in triple‐backticks, this will remove them.
 */
function stripJSONFences(raw: string): string {
  const trimmed = raw.trim();
  const fenceRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const match = trimmed.match(fenceRegex);
  if (match && match[1]) {
    return match[1].trim();
  }
  return trimmed;
}

/**
 * If GPT doesn’t return labels, we generate a set of fallback labels
 * based on words in the board’s title.
 */
function generateTopicLabels(boardTitle: string): Array<{ title: string; color: string; id: string }> {
  const colorPalette = [
    '#1E90FF',
    '#32CD32',
    '#FFD700',
    '#C19A6B',
    '#8A2BE2',
    '#FF8C00',
    '#DC143C',
  ];

  const rawWords = boardTitle
    .split(/[\s\-:,_]+/)
    .map(w => w.toLowerCase())
    .filter(w => w.length > 2);

  const capitalizedWords = rawWords.map(w => w.charAt(0).toUpperCase() + w.slice(1));

  const labels: string[] = [];
  for (let i = 0; i < capitalizedWords.length && labels.length < 4; i++) {
    const word = capitalizedWords[i];
    if (!labels.includes(word)) {
      labels.push(word);
    }
  }

  const fallback = ['Travel', 'History', 'Sightseeing', 'Logistics', 'Culture', 'Planning', 'MustSee'];
  let idx = 0;
  while (labels.length < 7 && idx < fallback.length) {
    if (!labels.includes(fallback[idx])) {
      labels.push(fallback[idx]);
    }
    idx++;
  }

  return labels.slice(0, 7).map((title, i) => ({
    id:    new mongoose.Types.ObjectId().toString(),
    title,
    color: colorPalette[i % colorPalette.length],
  }));
}

router.post('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const { prompt } = req.body as { prompt?: string };
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: '`prompt` (string) is required.' });
    }

    // 1) Build the ChatGPT prompt
    //    We explicitly say “at least 4 lists” (Flights, Accommodation, Best Places, Local Cuisine, etc.),
    //    but we no longer hard‐fail if GPT returns 4 instead of 5.
    const systemMessage = {
  role: 'system',
  content: `
You are a helpful assistant that converts a free-form instruction into a single JSON object, strictly following the schema below. The user wants a board with exactly 3 or 4 lists, each list having exactly 2 tasks. Every field must appear (use null or empty arrays when needed). Return exactly one JSON object—no extra text, no code fences, no comments outside the JSON.

***VERY IMPORTANT:***
1. **NEW RULES FOR IMAGES & ATTACHMENTS:**
   1. **cover**: set only coverColor form the randomly hex :
      
      "cover": {
        "coverType": "color",
        "coverColor": "<randomly chosen hex from [#FF5733, #33FF57, #3357FF, #F333FF, #FFC300, #900C3F, #4A90E2, #27AE60]>",
        "coverImg": ""
      }
      
      Each tasks cover must be either a valid image object or this fallback color object. Do not leave "cover": null.
   2. **attachments**: Always set "attachments": [] for every task. Do not attempt to fill attachments.

2. **Every tasks checklist must contain at least 3 mission-specific steps** (not generic placeholders). For example:
   • “Book Flight” checklist might have:
     1. Compare round-trip fares on Skyscanner.
     2. Check baggage allowance and seat options.
     3. Complete payment and download e-ticket.
   • “Visit Palmengarten” checklist might have:
     1. Enter through the Palmengarten main gate on Bockenheimer Anlage.
     2. Spend 30 minutes in the Glasshouse (Palmenhaus).
     3. Walk through the Rose Garden section and take photos.
   • If the user's prompt is “Birthday for Grandma,” then a task like “Order Cake” might have:
     1. Select cake style and flavor.
     2. Choose a bakery near your location.
     3. Place order with pickup/delivery instructions.

3. **All dates (“startDate” and “dueDate”) must be present in ISO-8601 (YYYY-MM-DD)**. They should reflect a realistic timeline based on the user's instruction. Do not omit “startDate” under any circumstance.
   • If the prompt specifies a timeframe (e.g., “June 1 to June 30, 2025”), assign "startDate" on or shortly after June 1, 2025 and "dueDate" on or before June 30, 2025, spacing tasks logically.
   • If no explicit dates appear, choose plausible dates (e.g. if the user says “in one month,” set startDate = 30 days from today, dueDate = 40 days from today).
   • Do NOT omit "startDate" under any circumstance. Ensure **startDate ≤ dueDate**.
   • Ensure the right timeframe when the meesage been sent ** do not go back in the date example if today is 2025-06-03 do not place startDate or dueDate before this date,

4. **Board title** should be short and simple (no dates—just a phrase like “Trip Schedule,” “Germany Trip,” or “Grandma's Birthday”).

5. **Use exactly 4 or 5 list's**. If the users prompt implies “Flights,” “Accommodation,” “Sightseeing,” “Local Dining,” those can be the four. If only three categories apply, omit the fourth.

**Board Style Fallback:**  
   • We maintain this fixed array of (Unsplash URL + hex color) pairs for fallback. Before generating the JSON, choose exactly one of these pairs at random. Let’s call it pair.  
   check for vaildition of url if the url is invaild or dont work use only color 
    
     [
       {
         "url": "https://images.unsplash.com/photo-1748372928120-6543f1c68da0?q=80&w=2136&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
         "color": "#966726"
       },
       {
         "url": "https://images.unsplash.com/photo-1748372928129-5d6cbc4729b9?q=80&w=2085&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
         "color": "#87CEEB"
       },
       {
         "url": "https://images.unsplash.com/photo-1748632799967-63f8c53d69c1?q=80&w=1932&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
         "color": "#87CEEB"
       },
       {
         "url": "https://images.unsplash.com/photo-1748719151811-60692f7f439c?q=80&w=1932&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
         "color": "#CCA064"
       },
       {
         "url": "https://images.unsplash.com/photo-1748632800124-dc5874469774?q=80&w=2151&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
         "color": "#20A7DB"
       },
       {
         "url": "https://images.unsplash.com/photo-1748632799979-76e04dde23a8?q=80&w=1932&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
         "color": "#EC6EF5"
       },
       {
         "url": "https://images.unsplash.com/photo-1748534515437-d8077c27311d?q=80&w=1976&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
         "color": "#3F3F3F"
       },
       {
         "url": "https://images.unsplash.com/photo-1743024282286-5bfecf55a834?q=80&w=2071&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
         "color": "#131862"
       },
       {
         "url": "https://images.unsplash.com/photo-1748818328832-73aa4d129903?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
         "color": "#7F7F7F"
       },
       {
         "url": "https://plus.unsplash.com/premium_photo-1746420145979-f53c38fa829c?q=80&w=1973&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
         "color": "#F5CA6E"
       },
       {
         "url": "https://plus.unsplash.com/premium_photo-1748729621135-57a3168c9fbd?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
         "color": "#73C4E6"
       },
       {
         "url": "https://plus.unsplash.com/premium_photo-1748729621256-d7612f6d1550?q=80&w=2013&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
         "color": "#D29034"
       },
       {
         "url": "https://plus.unsplash.com/premium_photo-1748729874878-7f56dce2cddb?q=80&w=2012&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
         "color": "#CF9D59"
       },
       {
         "url": "https://plus.unsplash.com/premium_photo-1748729883233-390c46f9e669?q=80&w=2001&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
         "color": "#CF9D59"
       },
       {
         "url": "https://plus.unsplash.com/premium_photo-1748729621110-2a54d1167ba7?q=80&w=2013&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
         "color": "#73C4E6"
       }
     ]
    
   • After listing these 15 objects, immediately say:  
     “**Select exactly one** of these objects at random. Let’s call that pair. Then in your output JSON, set 
       - "boardStyle": { "boardType": "image", "boardImg": pair.url, "boardColor": pair.color }.”  
     • If for some reason the chosen pair.url fails to load, you may instead output  
       "boardStyle": { "boardType": "color", "boardImg": "", "boardColor": <randomly chosen hex from the same list> }.  


### REQUIRED SCHEMA (all fields must exist—use null or [] when appropriate):

{
  "boardTitle": string,           // e.g. "Trip Schedule"
  "description": string,          // short description of the board’s purpose
  "boardStyle": {
    "boardType": "image" | "color",
    "boardImg": string,           // if boardType="image", the chosen Unsplash URL; if "color", ""
    "boardColor": string          // hex color, e.g. "#4A90E2" color always have to present here .
  },
  "lists": [
    {
      "title": string,            // list name (e.g. "Flights")
      "position": number,         // 0-based index of this list
      "tasks": [
        {
          "title": string,        // e.g. "Book Flight to Frankfurt"
          "description": string,  // detailed task description
          "Activity": string,     // one-sentence summary (e.g. "Flight Booking")
          "startDate": string,    // ISO date (e.g. "2025-06-01")
          "dueDate": string,      // ISO date (e.g. "2025-06-05")
          "reminder": string|null,// ISO date/time or null
          "coordinates": [number, number]|null, // [latitude, longitude] if location-based, else null
          "members": [            // 0 or more
            { "_id": string, "fullname": string, "avatar": string }
          ],
          "checklist": [          // exactly one object in this array, with at least 3 items
            {
              "title": string,    // e.g. "Flight Booking Steps"
              "items": [
                { "text": string, "done": boolean },
                { "text": string, "done": boolean },
                { "text": string, "done": boolean }
              ]
            }
          ],
          "cover": {
            "coverType": "image" | "color",
            "coverColor": string,  // hex (if coverType="color")
            "coverImg": string     // valid Unsplash URL or ""
          },
          "comments": [           // always present (can be empty array)
            { "_id": string, "userId": string, "text": string, "createdAt": string }
          ],
          "archivedAt": string|null,
          "position": number,     // 0-based index within its list
          "isWatching": boolean,
          "isDueComplete": boolean,
          "labels": [             // exactly 4 label objects
            { "id": string, "color": string, "title": string },
            { "id": string, "color": string, "title": string },
            { "id": string, "color": string, "title": string },
            { "id": string, "color": string, "title": string }
          ],
          "attachments": []       // always empty
        },
        {
          /* second task (same schema) */
        }
      ]
    },
    {
      /* second list with 2 tasks */
    },
    {
      /* third list with 2 tasks */
    }
      {
      /* 4 list with 2 tasks */
    }
      {
      /* five list with 2 tasks */
    }
  ]
}

#### GENERIC TOPIC GUIDANCE

Whether the user asked “Fly to USA,” “Birthday for Grandma,” or “Plan Germany Trip,” GPT should:

1. **Decide on 2 or 3 topical lists**—for example:
   • If “Fly to USA,” lists might be:
     1. “Flights”
     2. “Accommodation”
     3. “Sightseeing”
     4. “Packing & Documentation”
   • If “Birthday for Grandma,” lists might be:
     1. “Gifts”
     2. “Decorations”
     3. “Menu & Cake”
     4. “Guest List & Invitations”

2. **For each task (exactly two per list)**:
   •  use a random cover color from the eight provided.  
   • Write a mission-specific checklist of at least three concrete steps.  
   • Set "attachments": [].

3. **Ensure every task has both startDate and dueDate**. If the user mentions “in June” or “next month,” pick plausible dates. Do NOT leave startDate blank. Always maintain **startDate ≤ dueDate**.

4. **Labels**: Give each task exactly 4 labels (id + unique hex color + title). The titles should reflect categories related to the task’s title (e.g. “Urgent,” “Booking,” “Travel,” “Leisure”).

5. **Board Style**:
   •   choose a random hex from the array that provided for "boardColor" and "boardImg" use same line of link(img) and color that displayes.

Return only the JSON object above. Do NOT add any additional text or explanation—just the JSON.
`.trim()
};


const userMessage = {
  role: 'user',
  content: `Please create a new board payload for: "${prompt.trim()}"`
};

const completion = await openai.chat.completions.create({
  model:       'gpt-4.1-nano',
  messages:    [systemMessage, userMessage] as any[],
  temperature: 0.2,
  max_tokens:  5500,
});


    // 3) Extract raw response
    const rawOutput = completion.choices[0].message?.content || '';
    console.log('⏺ Raw GPT response:\n', rawOutput);

    // 4) Strip any ```json fences```
    const jsonString = stripJSONFences(rawOutput);
    console.log('⏺ Stripped JSON string:\n', jsonString);

    // 5) Attempt to JSON.parse
    let payload: {
      boardTitle: string;
      description: string;
      boardStyle: { boardType: 'image' | 'color'; boardImg: string; boardColor: string };
      lists: Array<{
        title: string;
        position: number;
        tasks: Array<{
          title: string;
          description: string;
          Activity: string;
          dueDate: string | null;
          startDate: string | null;
          reminder: string | null;
          coordinates: [number, number] | null;
          members: Array<{ _id: string; fullname: string; avatar: string }>;
          checklist: Array<{ title: string; items: Array<{ text: string; done: boolean }> }>;
          cover: { coverType: 'image' | 'color'; coverColor: string; coverImg: string } | null;
          comments: Array<{ _id: string; userId: string; text: string; createdAt: string }>;
          archivedAt: string | null;
          position: number;
          isWatching: boolean;
          isDueComplete: boolean;
          labels: Array<{ id: string; color: string; title: string }>;
          attachments: Array<{ name: string; url: string; contentType: string; size: number }>;
        }>;
      }>;
    };

    try {
      payload = JSON.parse(jsonString);
    } catch {
      console.error('‼️ Failed to parse JSON from ChatGPT:\n', jsonString);
      return res.status(500).json({ error: 'Failed to parse JSON from ChatGPT.' });
    }

    // 6) Validate minimal structure: at least 1 list with 2 tasks
    if (
      typeof payload.boardTitle !== 'string' ||
      typeof payload.boardStyle !== 'object' ||
      !Array.isArray(payload.lists) ||
      payload.lists.some((lst) => !Array.isArray(lst.tasks) || lst.tasks.length < 2)
    ) {
      return res.status(500).json({ error: 'Generated JSON did not match the expected schema.' });
    }

    // 7) Ensure boardType is either 'image' or 'color'
    let boardType: 'image' | 'color' = 'color';
    if (payload.boardStyle.boardImg && payload.boardStyle.boardImg.trim() !== '') {
      boardType = 'image';
    }

    // 8) Generate fallback labels for the board itself (in case GPT didn’t return any)
    const topicLabels = generateTopicLabels(payload.boardTitle);

    // 9) Create the new Board
    const newBoard = new Board({
      boardTitle:  payload.boardTitle,
      description: payload.description || '',
      boardLabels: topicLabels,
      boardStyle: {
        boardType,
        boardImg:    payload.boardStyle.boardImg,
        boardColor: payload.boardStyle.boardColor,
      },
    });
    await newBoard.save();

    const createdListIds: mongoose.Types.ObjectId[] = [];

    // 10) For each list, create a List document
    for (const listBlock of payload.lists) {
      if (
        typeof listBlock.title !== 'string' ||
        typeof listBlock.position !== 'number' ||
        !Array.isArray(listBlock.tasks) ||
        listBlock.tasks.length < 2
      ) {
        continue; // skip if it doesn’t have at least 2 tasks
      }

      const newList = new List({
        taskListBoard: newBoard._id,
        taskListTitle: listBlock.title,
        indexInBoard:  listBlock.position,
      });
      await newList.save();
      createdListIds.push(newList._id);

      const createdTaskIds: mongoose.Types.ObjectId[] = [];

      // 11) For each task in this list, create a Task document
      for (const taskBlock of listBlock.tasks) {
        if (
          typeof taskBlock.title !== 'string' ||
          typeof taskBlock.position !== 'number'
        ) {
          continue;
        }

        // Parse optional date fields
        let parsedDueDate:    Date | null = null;
        let parsedStartDate:  Date | null = null;
        let parsedReminder:   Date | null = null;
        let parsedArchivedAt: Date | null = null;
        if (
          taskBlock.dueDate &&
          !Number.isNaN(new Date(taskBlock.dueDate).getTime())
        ) {
          parsedDueDate = new Date(taskBlock.dueDate);
        }
        if (
          taskBlock.startDate &&
          !Number.isNaN(new Date(taskBlock.startDate).getTime())
        ) {
          parsedStartDate = new Date(taskBlock.startDate);
        }
        if (
          taskBlock.reminder &&
          !Number.isNaN(new Date(taskBlock.reminder).getTime())
        ) {
          parsedReminder = new Date(taskBlock.reminder);
        }
        if (
          taskBlock.archivedAt &&
          !Number.isNaN(new Date(taskBlock.archivedAt).getTime())
        ) {
          parsedArchivedAt = new Date(taskBlock.archivedAt);
        }

        // Parse coordinates if present
        let parsedCoordinates: [number, number] | [] = [];
        if (
          Array.isArray(taskBlock.coordinates) &&
          taskBlock.coordinates.length === 2 &&
          typeof taskBlock.coordinates[0] === 'number' &&
          typeof taskBlock.coordinates[1] === 'number'
        ) {
          parsedCoordinates = [taskBlock.coordinates[0], taskBlock.coordinates[1]];
        }

        // Parse members into ObjectId[]
        const parsedMemberIds: mongoose.Types.ObjectId[] = [];
        if (Array.isArray(taskBlock.members)) {
          for (const m of taskBlock.members) {
            if (m && typeof m._id === 'string' && mongoose.isValidObjectId(m._id)) {
              parsedMemberIds.push(new mongoose.Types.ObjectId(m._id));
            }
          }
        }

        // Parse checklist items
        const parsedChecklists: any[] = [];
        if (Array.isArray(taskBlock.checklist)) {
          for (const cl of taskBlock.checklist) {
            if (cl && typeof cl.title === 'string' && Array.isArray(cl.items)) {
              parsedChecklists.push({
                title: cl.title,
                items: cl.items.map((it: any) => ({
                  _id:    new mongoose.Types.ObjectId(),
                  text:   typeof it.text === 'string' ? it.text : '',
                  done:   typeof it.done === 'boolean' ? it.done : false,
                })),
              });
            }
          }
        }

        // Parse cover object if provided
        let parsedCover: { coverType: 'image' | 'color'; coverColor: string; coverImg: string } | null = null;
        if (
          taskBlock.cover &&
          (taskBlock.cover.coverType === 'image' || taskBlock.cover.coverType === 'color') &&
          typeof taskBlock.cover.coverColor === 'string' &&
          typeof taskBlock.cover.coverImg === 'string'
        ) {
          parsedCover = {
            coverType:  taskBlock.cover.coverType,
            coverColor: taskBlock.cover.coverColor,
            coverImg:   taskBlock.cover.coverImg,
          };
        }

        // Parse comments array into ObjectId[]
        const parsedComments: mongoose.Types.ObjectId[] = [];
        if (Array.isArray(taskBlock.comments)) {
          for (const c of taskBlock.comments) {
            if (c && typeof c._id === 'string' && mongoose.isValidObjectId(c._id)) {
              parsedComments.push(new mongoose.Types.ObjectId(c._id));
            }
          }
        }

        // Parse labels array
        const parsedLabels: Array<{ id: string; color: string; title: string }> = [];
        if (Array.isArray(taskBlock.labels)) {
          for (const lbl of taskBlock.labels) {
            if (
              lbl &&
              typeof lbl.id === 'string' &&
              typeof lbl.color === 'string' &&
              typeof lbl.title === 'string'
            ) {
              parsedLabels.push({
                id:    lbl.id,
                color: lbl.color,
                title: lbl.title,
              });
            }
          }
        }

        // Parse attachments array
        const parsedAttachments: Array<{ name: string; url: string; contentType: string; size: number }> = [];
        if (Array.isArray(taskBlock.attachments)) {
          for (const att of taskBlock.attachments) {
            if (att && typeof att.name === 'string' && typeof att.url === 'string') {
              parsedAttachments.push({
                name:        att.name,
                url:         att.url,
                contentType: typeof att.contentType === 'string' ? att.contentType : '',
                size:        typeof att.size === 'number' ? att.size : 0,
              });
            }
          }
        }

        // Build the Task document data
        const dataForTask: any = {
          board:         newBoard._id,
          list:          newList._id,
          title:         taskBlock.title,
          description:   taskBlock.description || '',
          Activity:      taskBlock.Activity || '',
          startDate:     parsedStartDate,
          dueDate:       parsedDueDate,
          reminder:      parsedReminder,
          members:       parsedMemberIds,
          checklist:     parsedChecklists,
          cover:         parsedCover,
          comments:      parsedComments,
          archivedAt:    parsedArchivedAt,
          position:      taskBlock.position,
          isWatching:    typeof taskBlock.isWatching === 'boolean' ? taskBlock.isWatching : false,
          isDueComplete: typeof taskBlock.isDueComplete === 'boolean' ? taskBlock.isDueComplete : false,
          labels:        parsedLabels,
          attachments:   parsedAttachments,
        };

        if (parsedCoordinates.length === 2) {
          dataForTask.coordinates = parsedCoordinates;
        }

        const newTask = new Task(dataForTask);
        await newTask.save();
        createdTaskIds.push(newTask._id);
      }

      if (createdTaskIds.length > 0) {
        newList.taskList = createdTaskIds;
        await newList.save();
      }
    }

    // 12) Push all createdList IDs into newBoard.boardLists
    if (createdListIds.length > 0) {
      newBoard.boardLists = createdListIds;
      await newBoard.save();
    }

    // 13) Return the new boardId
    return res.status(201).json({ boardId: newBoard._id });
  } catch (err) {
    console.error('Error in POST /api/autoBoard:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
