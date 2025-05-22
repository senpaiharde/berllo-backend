import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middlewares/authmiddleware';
import Activity from '../models/activity';
import { ObjectId }                  from 'mongoose';

import mongoose from 'mongoose';
const router = Router();
interface ActivityDTO {
  _id:       ObjectId;
  user:      ObjectId;
  entity:    { kind: string; id: ObjectId };
  action:    string;
  payload?:  Record<string, unknown>;
  createdAt: Date;
}

router.get('/:taskId', async (req: Request, res: Response): Promise<any> => {
  try {
    const { taskId } = req.params;
    console.log('▶︎ taskId from params:', taskId);

    if (!taskId) {
      return res.status(400).json({ error: 'taskId is required' });
    }

    const activities = await Activity.find({
      'entity.id': taskId,
      'entity.kind': 'task',
    })
      .sort({ createdAt: -1 })
       .select('_id user entity action payload createdAt')
        .lean<ActivityDTO[]>();
    

       const result = activities.map(d => ({
      id:        d._id.toString(),
      user:      d.user.toString(),       
      entityId:  d.entity.id.toString(),
      action:    d.action,
      payload:   d.payload,
       createdAt: d.createdAt.toISOString()
    }));
    console.log('→ Sending activities to frontend:', result);
    return res.json(result);
  } catch (err) {
    console.error('❌ Error loading activities:', err);
    return res.status(500).json({ error: 'Failed to load task activity' });
  }
});

export default router;
