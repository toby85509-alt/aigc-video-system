import { Router, Request, Response } from 'express';
import { scriptService } from '../services/script.service';
import { taskService } from '../services/task.service';
import { traceService } from '../services/trace.service';
import { firstParam, requiredParam } from './params';

const router = Router();

// 生成剧本
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { productInfo, templateId, referenceStyle } = req.body;
    if (!productInfo || !productInfo.title) {
      return res.status(400).json({ error: '商品信息不完整' });
    }

    const task = taskService.create('script_generation', [
      '分析商品信息',
      '匹配创作策略',
      '生成叙事框架',
      '创作分镜脚本',
      '质量校验',
    ]);

    // 异步更新任务状态
    taskService.updateStep(task.id, '分析商品信息', 'running');
    setTimeout(() => taskService.updateStep(task.id, '分析商品信息', 'completed'), 500);

    const startedAt = Date.now();
    const storyboard = await scriptService.generate(productInfo, templateId, referenceStyle);
    const fallbackConstraint = storyboard.constraints.find((item) => item.includes('模型降级说明'));
    traceService.record({
      type: 'script_generation',
      status: 'success',
      productTitle: productInfo.title,
      category: productInfo.category,
      templateId,
      modelEndpoint: process.env.VOLCANO_TEXT_EP || 'doubao-seed-2.0-pro',
      durationMs: Date.now() - startedAt,
      qualityScore: storyboard.qualityScore,
      fallbackUsed: Boolean(fallbackConstraint),
      fallbackReason: fallbackConstraint,
      promptSummary: `${storyboard.methodology?.structure || 'Hook-Demo-Proof-CTA'} | ${referenceStyle || 'no extra prompt'}`,
      outputId: storyboard.id,
    });

    taskService.updateStep(task.id, '匹配创作策略', 'completed');
    taskService.updateStep(task.id, '生成叙事框架', 'completed');
    taskService.updateStep(task.id, '创作分镜脚本', 'completed');
    taskService.updateStep(task.id, '质量校验', 'completed');
    task.result = storyboard;

    res.json({ data: storyboard, taskId: task.id });
  } catch (err: any) {
    traceService.record({
      type: 'script_generation',
      status: 'failed',
      productTitle: req.body?.productInfo?.title,
      category: req.body?.productInfo?.category,
      templateId: req.body?.templateId,
      modelEndpoint: process.env.VOLCANO_TEXT_EP || 'doubao-seed-2.0-pro',
      durationMs: 0,
      error: err.message,
    });
    res.status(500).json({ error: err.message });
  }
});

// 获取模板列表
router.get('/templates', (_req: Request, res: Response) => {
  res.json({ data: scriptService.getTemplates() });
});

// 获取剧本列表
router.get('/', (req: Request, res: Response) => {
  const { productId, page, pageSize } = req.query;
  const result = scriptService.list({
    productId: firstParam(productId),
    page: page ? parseInt(firstParam(page) || '1') : 1,
    pageSize: pageSize ? parseInt(firstParam(pageSize) || '20') : 20,
  });
  res.json(result);
});

// 获取单个剧本
router.get('/:id', (req: Request, res: Response) => {
  const sb = scriptService.getById(requiredParam(req.params.id));
  if (!sb) return res.status(404).json({ error: '剧本不存在' });
  res.json({ data: sb });
});

// 修改剧本
router.patch('/:id', (req: Request, res: Response) => {
  const updated = scriptService.update(requiredParam(req.params.id), req.body);
  if (!updated) return res.status(404).json({ error: '剧本不存在' });
  res.json({ data: updated });
});

// 干预分镜 - 重新生成单个分镜
router.post('/:id/shots/:shotId/regenerate', async (req: Request, res: Response) => {
  try {
    const { instruction } = req.body;
    const shot = await scriptService.regenerateShot(
      requiredParam(req.params.id),
      requiredParam(req.params.shotId),
      instruction
    );
    if (!shot) return res.status(404).json({ error: '剧本或分镜不存在' });
    res.json({ data: shot });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 删除剧本
router.delete('/:id', (req: Request, res: Response) => {
  const ok = scriptService.delete(requiredParam(req.params.id));
  if (!ok) return res.status(404).json({ error: '剧本不存在' });
  res.json({ message: '已删除' });
});

// A/B 对比生成：同一商品×多套模板并行出剧本
router.post('/generate-ab', async (req: Request, res: Response) => {
  try {
    const { productInfo, templateIds } = req.body;
    if (!productInfo || !productInfo.title) {
      return res.status(400).json({ error: '商品信息不完整' });
    }
    const ids: string[] = templateIds && templateIds.length > 0
      ? templateIds
      : ['template_1', 'template_2', 'template_3'];

    const task = taskService.create('ab_script_generation', [
      '并行生成多套剧本',
      '风格对比分析',
      '预估效果评分',
    ]);
    taskService.updateStep(task.id, '并行生成多套剧本', 'running');

    const results = await scriptService.generateAB(productInfo, ids);

    taskService.updateStep(task.id, '并行生成多套剧本', 'completed');
    taskService.updateStep(task.id, '风格对比分析', 'completed');
    taskService.updateStep(task.id, '预估效果评分', 'completed');
    task.result = results;

    res.json({ data: results, taskId: task.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
