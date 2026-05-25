import { Router, Request, Response } from 'express';
import { taskService } from '../services/task.service';
import { firstParam, requiredParam } from './params';

const router = Router();

// 获取任务列表
router.get('/', (req: Request, res: Response) => {
  const { type } = req.query;
  const tasks = taskService.list(firstParam(type));
  res.json({ data: tasks });
});

// 获取单个任务
router.get('/:id', (req: Request, res: Response) => {
  const task = taskService.getById(requiredParam(req.params.id));
  if (!task) return res.status(404).json({ error: '任务不存在' });
  res.json({ data: task });
});

export default router;
