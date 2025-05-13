/* scripts/seedFullJson.cjs  ── run with:  node scripts/seedFullJson.cjs */

require('ts-node/register');          // so TS models load
require('dotenv').config();

const fs       = require('fs/promises');
const path     = require('path');
const mongoose = require('mongoose');

const Board = require('../models/Board').default;
const List  = require('../models/List').default;
const Task  = require('../models/task').default;

const { Types } = mongoose;

/* convert whole board JSON object to three collections */
const inflateBoard = async (rawBoard) => {
  /* 1 board */
  const boardId = new Types.ObjectId();
  await Board.create({
    _id   : boardId,
    title : rawBoard.boardTitle,
    style : rawBoard.boardStyle,
    // add whatever else you need…
  });

  /* 2 lists */
  const listIdMap = {};   // legacy list _id -> new ObjectId
  const listDocs  = rawBoard.boardLists.map((list, idx) => {
    const newId = new Types.ObjectId();
    listIdMap[list._id] = newId;
    return {
      _id   : newId,
      board : boardId,
      title : list.taskListTitle,
      position: idx,
    };
  });
  await List.insertMany(listDocs);

  /* 3 tasks */
  const taskDocs = rawBoard.boardLists.flatMap((list, lidx) =>
    (list.taskList || []).map((task, tidx) => ({
      title        : task.taskTitle,
      description  : task.taskDescription,
      board        : boardId,
      list         : listIdMap[list._id],
      labels       : (task.taskLabels ?? []).map(l => l.color),
      isDueComplete: task.isDueComplete ?? false,
      members      : (task.taskMembers ?? []).map(m => m._id),
      startDate    : task.taskStartDate ? new Date(task.taskStartDate) : undefined,
      dueDate      : task.taskDueDate   ? new Date(task.taskDueDate)   : undefined,
      reminder     : task.taskDateReminder ? new Date(task.taskDateReminder) : undefined,
      coordinates  : task.taskCoordinates,
      checklist    : (task.taskCheckList ?? []).map(txt => ({ text:String(txt) })),
      cover        : task.taskCover,
      comments     : (task.taskActivityComments ?? []).map(c => ({
                       user: c.userId, text:c.comment, createdAt:new Date(c.date)
                     })),
      position     : tidx,
    }))
  );
  await Task.insertMany(taskDocs);

  console.log(`✓ Imported board “${rawBoard.boardTitle}” with`,
              listDocs.length, 'lists and',
              taskDocs.length, 'tasks');
};

(async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI not set');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Mongo connected');

  const jsonPath  = path.join(__dirname, '..', 'berllo.json');
  const raw       = JSON.parse(await fs.readFile(jsonPath, 'utf-8'));

  await Board.deleteMany({});
  await List.deleteMany({});
  await Task.deleteMany({});

  for (const board of raw.boards) {
    await inflateBoard(board);
  }

  console.log('Seeding complete!');
  process.exit();
})();
