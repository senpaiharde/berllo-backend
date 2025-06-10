
import Activity from '../models/activity'; 


 // Deletes all documents in the Activity collection.

export async function wipeActivity(): Promise<void> {
  try {
    console.log(`[${new Date().toISOString()}]  wipeActivity: deleting all activities…`);
    await Activity.deleteMany({});
    console.log(`[${new Date().toISOString()}] wipeActivity: complete`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}]  wipeActivity: failed`, err);
  }
}
