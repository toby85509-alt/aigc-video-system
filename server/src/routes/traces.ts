import { Router, Request, Response } from 'express';
import { traceService } from '../services/trace.service';
import { firstParam } from './params';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const { type, page, pageSize } = req.query;
  const result = traceService.list({
    type: firstParam(type),
    page: page ? parseInt(firstParam(page) || '1') : 1,
    pageSize: pageSize ? parseInt(firstParam(pageSize) || '30') : 30,
  });
  res.json(result);
});

export default router;
