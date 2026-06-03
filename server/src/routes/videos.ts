import { Router, Request, Response } from 'express';
import { videoService } from '../services/video.service';
import { taskService } from '../services/task.service';
import { firstParam, requiredParam } from './params';

const router = Router();

// 一键成片
router.post('/', async (req: Request, res: Response) => {
  try {
    const { storyboardId, materialIds, resolution, name } = req.body;
    if (!storyboardId) {
      return res.status(400).json({ error: '请提供剧本 ID' });
    }

    const task = taskService.create('video_generation', [
      '准备素材',
      '渲染分镜',
      '合成视频',
      '添加配音和字幕',
      '导出视频',
    ]);

    const project = await videoService.createVideo({
      storyboardId,
      materialIds: materialIds || [],
      resolution,
      name,
    });

    // 监听进度
    const checkProgress = setInterval(() => {
      const p = videoService.getById(project.id);
      if (!p || p.status === 'completed' || p.status === 'failed') {
        clearInterval(checkProgress);
        if (p?.status === 'completed') {
          taskService.updateStep(task.id, '准备素材', 'completed');
          taskService.updateStep(task.id, '渲染分镜', 'completed');
          taskService.updateStep(task.id, '合成视频', 'completed');
          taskService.updateStep(task.id, '添加配音和字幕', 'completed');
          taskService.updateStep(task.id, '导出视频', 'completed');
        } else if (p?.status === 'failed') {
          taskService.failTask(task.id, p.error || '视频生成失败');
        }
      } else {
        taskService.updateStep(task.id, '准备素材', 'completed');
        taskService.updateStep(task.id, '渲染分镜', 'running');
      }
    }, 1000);

    res.json({ data: project, taskId: task.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 获取项目列表
router.get('/', (req: Request, res: Response) => {
  const { page, pageSize } = req.query;
  const result = videoService.list({
    page: page ? parseInt(firstParam(page) || '1') : 1,
    pageSize: pageSize ? parseInt(firstParam(pageSize) || '20') : 20,
  });
  res.json(result);
});

// 获取单个项目
router.get('/:id', (req: Request, res: Response) => {
  const project = videoService.getById(requiredParam(req.params.id));
  if (!project) return res.status(404).json({ error: '项目不存在' });
  res.json({ data: project });
});

// 重新渲染单个分镜
router.post('/:id/shots/:shotId/rerender', async (req: Request, res: Response) => {
  try {
    const project = await videoService.rerenderShot(
      requiredParam(req.params.id),
      requiredParam(req.params.shotId)
    );
    if (!project) return res.status(404).json({ error: '项目或分镜不存在' });
    res.json({ data: project });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 删除项目
router.delete('/:id', (req: Request, res: Response) => {
  const ok = videoService.delete(requiredParam(req.params.id));
  if (!ok) return res.status(404).json({ error: '项目不存在' });
  res.json({ message: '已删除' });
});

// A/B 对比成片：为多套剧本并行创建视频
router.post('/create-ab', async (req: Request, res: Response) => {
  try {
    const { storyboardIds, materialIds, resolution, namePrefix } = req.body;
    if (!storyboardIds || storyboardIds.length === 0) {
      return res.status(400).json({ error: '请提供至少一个剧本 ID' });
    }

    const task = taskService.create('ab_video_generation', [
      '并行创建视频项目',
      '渲染所有变体',
      '对比评分',
    ]);

    const projects = [];
    for (const sid of storyboardIds) {
      const project = await videoService.createVideo({
        storyboardId: sid,
        materialIds: materialIds || [],
        resolution: resolution || '9:16',
        name: namePrefix ? `${namePrefix} - ${sid.slice(0, 6)}` : undefined,
      });
      projects.push(project);
    }

    taskService.updateStep(task.id, '并行创建视频项目', 'completed');
    task.result = projects;

    res.json({ data: projects, taskId: task.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
