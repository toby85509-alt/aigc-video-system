import { Router, Request, Response } from 'express';
import { agentPipelineService } from '../services/agent.service';
import { requiredParam } from './params';

const router = Router();

// 创建全链路管线
router.post('/pipeline', async (req: Request, res: Response) => {
  try {
    const pipeline = await agentPipelineService.createFullPipeline(req.body);
    res.json({ data: pipeline });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 获取管线详情
router.get('/pipeline/:id', (req: Request, res: Response) => {
  const p = agentPipelineService.getById(requiredParam(req.params.id));
  if (!p) return res.status(404).json({ error: '管线不存在' });
  res.json({ data: p });
});

// 管线列表
router.get('/pipelines', (_req: Request, res: Response) => {
  res.json({ data: agentPipelineService.list() });
});

// Agent 列表
router.get('/agents', (_req: Request, res: Response) => {
  res.json({ data: agentPipelineService.getAgents() });
});

export default router;
