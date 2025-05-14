// scripts/seedFullJson.cjs
require('ts-node/register');     // load TS models on-the-fly
require('dotenv').config();

const fs       = require('fs/promises');
const path     = require('path');
const mongoose = require('mongoose');
const { Types } = mongoose;

// your strict models
const Board = require('../models/Board').default;
const List  = require('../models/List').default;
const Task  = require('../models/task').default;

// map legacy user IDs → fresh ObjectIds
const userIdMap = {};
function getUserId(legacyId) {
  if (!userIdMap[legacyId]) {
    userIdMap[legacyId] = new Types.ObjectId();
  }
  return userIdMap[legacyId];
}

async function inflateBoard(raw) {
  // 1) create board
  const boardId = new Types.ObjectId();
  await Board.create({
    _id       : boardId,
    title     : raw.boardTitle,
    style     : raw.boardStyle,
    isStarred : !!raw.isStarred,
    archivedAt: raw.archivedAt ?? null,
  });

  // 2) create lists
  const listIdMap = {};
  const listDocs = raw.boardLists.map((l, idx) => {
    const id = new Types.ObjectId();
    listIdMap[l._id] = id;
    return {
      _id       : id,
      board     : boardId,
      title     : l.taskListTitle,
      position  : idx,
      style     : l.listStyle,
      archivedAt: l.archivedAt ?? null,
    };
  });
  await List.insertMany(listDocs);

  // 3) create tasks
  const taskDocs = raw.boardLists.flatMap((l) =>
    (l.taskList || []).map((t, tIdx) => ({
      board       : boardId,
      list        : listIdMap[l._id],
      title       : t.taskTitle,
      description : t.taskDescription,
      labels      : (t.taskLabels || []).map(lbl => lbl.color),
      isDueComplete: t.isDueComplete || false,
      members     : (t.taskMembers || []).map(m => getUserId(m._id)),
      startDate   : t.taskStartDate ? new Date(t.taskStartDate) : undefined,
      dueDate     : t.taskDueDate   ? new Date(t.taskDueDate)   : undefined,
      reminder    : t.taskDateReminder
                       ? new Date(t.taskDateReminder)
                       : undefined,
      coordinates : t.taskCoordinates,
      checklist   : (t.taskCheckList || []).map(txt => ({ text:String(txt) })),
      cover       : t.taskCover || undefined,
      comments    : (t.taskActivityComments || []).map(c => ({
                       user      : getUserId(c.userId),  // call the function here
                       text      : c.comment,
                       createdAt : new Date(c.date),
                     })),
      archivedAt  : t.archivedAt || null,
      position    : tIdx,
    }))
  );
  await Task.insertMany(taskDocs);

  console.log(` ${raw.boardTitle}: ${listDocs.length} lists, ${taskDocs.length} tasks`);
}

(async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI not set in .env');
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Mongo connected');

  // wipe all demo data
  await Promise.all([
    Board.deleteMany({}),
    List.deleteMany({}),
    Task.deleteMany({}),
  ]);

  // read your full JSON dump
  const raw = JSON.parse(
    await fs.readFile(path.join(__dirname, '..', 'berllo.json'), 'utf-8')
  );

  // inflate each board
  for (const board of raw.boards) {
    await inflateBoard(board);
  }

  console.log('Seeding complete!');
  process.exit(0);
})();
