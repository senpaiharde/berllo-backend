import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middlewares/authmiddleware';
import Activity from '../models/activity';
import { ObjectId } from 'mongoose';
import User from '../models/User';
import mongoose from 'mongoose';
const router = Router();
router.use(authMiddleware);

interface ActivityDTO {
  _id: ObjectId;
  user: { _id: ObjectId; fullname: string; avatar?: string };
  entity: { kind: string; id: ObjectId };
  action: string;
  payload?: Record<string, unknown>;
  createdAt: Date;
}

router.get('/:taskId', async (req: Request, res: Response): Promise<any> => {
  try {
    const { taskId } = req.params;
    if (!mongoose.isValidObjectId(taskId)) {
      return res.status(400).json({ error: 'Invalid taskId' });
    }

    const activities = await Activity.find({
      'entity.id': taskId,
      'entity.kind': 'task',
    })
      .sort({ createdAt: -1 })
      .select('_id user entity action payload createdAt')
      .populate({ path: 'user', select: 'fullname email avatar' })
      .lean<ActivityDTO[]>();

    const result = activities
      .filter((d) => d.user)
      .map((d) => ({
        id: d._id.toString(),
        userId: d.user._id.toString(),
        userName: d.user.fullname,
        userAvatar: d.user.avatar || null,
        entityId: d.entity.id.toString(),
        action: d.action,
        payload: d.payload,
        createdAt: d.createdAt.toISOString(),
      }));

    return res.json(result);
  } catch (err) {
    console.error('Error loading activities:', err);
    return res.status(500).json({ error: 'Failed to load task activity' });
  }
});

export default router;
