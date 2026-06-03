import { Router, Request, Response } from 'express';
import { scriptService } from '../services/script.service';
import { firstParam } from './params';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const category = firstParam(req.query.category);
  res.json({ data: scriptService.getReferenceAnalyses(category) });
});

export default router;
