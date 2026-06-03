import { Router, Request, Response } from 'express';
import { complianceService } from '../services/compliance.service';
import { materialService } from '../services/material.service';
import { scriptService } from '../services/script.service';
import { videoService } from '../services/video.service';
import { firstParam } from './params';

const router = Router();

router.post('/materials/:id', (req: Request, res: Response) => {
  const id = String(req.params.id);
  const material = materialService.getById(id);
  if (!material) {
    res.status(404).json({ error: '素材不存在' });
    return;
  }
  const result = complianceService.checkMaterial(id, material as unknown as Record<string, unknown>);
  res.json({ data: result });
});

router.post('/scripts/:id', (req: Request, res: Response) => {
  const id = String(req.params.id);
  const script = scriptService.getById(id);
  if (!script) {
    res.status(404).json({ error: '剧本不存在' });
    return;
  }
  const result = complianceService.checkScript(id, script as unknown as Record<string, unknown>);
  res.json({ data: result });
});

router.post('/videos/:id', (req: Request, res: Response) => {
  const id = String(req.params.id);
  const video = videoService.getById(id);
  if (!video) {
    res.status(404).json({ error: '视频项目不存在' });
    return;
  }
  const result = complianceService.checkVideo(id, video as unknown as Record<string, unknown>);
  res.json({ data: result });
});

router.get('/audit-log', (req: Request, res: Response) => {
  const type = firstParam(req.query.type);
  const log = complianceService.getAuditLog(type || undefined);
  res.json({ data: log });
});

export default router;
