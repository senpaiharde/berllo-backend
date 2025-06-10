
import Board from '../models/Board';
import List  from '../models/List';
import Task  from '../models/task';
import mongoose from 'mongoose';

const backupConn = mongoose.connection; // same DB, so same conn

export async function restoreFromBackup(): Promise<void> {
  console.log(`[${new Date().toISOString()}]  restoreFromBackup`);

  // 1) wipe live collections
  await Promise.all([
    Board.deleteMany({}),
    List.deleteMany({}),
    Task.deleteMany({}),
  ]);

  // 2) copy from backup_* using MongoDB’s aggregation $merge
  await Promise.all([
    backupConn.collection('boards_backup')
              .aggregate([{ $match: {} },
                          { $merge: { into: 'boardentries' } }])
              .toArray(),   // need to exhaust cursor
    backupConn.collection('lists_backup')
              .aggregate([{ $match: {} },
                          { $merge: { into: 'listentries' } }])
              .toArray(),
    backupConn.collection('tasks_backup')
              .aggregate([{ $match: {} },
                          { $merge: { into: 'taskentries' } }])
              .toArray(),
  ]);

  console.log(`[${new Date().toISOString()}]  restore complete`);
}
