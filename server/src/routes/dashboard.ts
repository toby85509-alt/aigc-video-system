import { Router, Request, Response } from 'express';
import { videoService } from '../services/video.service';
import { materialService } from '../services/material.service';
import { scriptService } from '../services/script.service';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const videoMetrics = videoService.getDashboardMetrics();
  const materials = materialService.list({});
  const scripts = scriptService.list({});

  // ── 多因子归因分析 ──
  const factorAttribution = [
    {
      factor: '开场方式',
      variants: [
        { name: '氛围渐入', ctr: 4.2, conversion: 3.1, watchTime: 24.3 },
        { name: '强节奏快切', ctr: 5.8, conversion: 4.3, watchTime: 17.8 },
        { name: '痛点引入', ctr: 6.5, conversion: 5.2, watchTime: 26.1 },
      ],
      impact: 0.38,
    },
    {
      factor: 'BGM风格',
      variants: [
        { name: '舒缓纯音乐', ctr: 4.5, conversion: 3.3, watchTime: 23.5 },
        { name: '电子/流行', ctr: 5.7, conversion: 4.0, watchTime: 18.2 },
        { name: '先抑后扬', ctr: 5.9, conversion: 4.8, watchTime: 24.8 },
      ],
      impact: 0.29,
    },
    {
      factor: '镜头语言',
      variants: [
        { name: '微距特写', ctr: 4.8, conversion: 3.6, watchTime: 22.0 },
        { name: '快切+缩放', ctr: 5.5, conversion: 4.2, watchTime: 19.5 },
        { name: '对比切换', ctr: 6.1, conversion: 4.9, watchTime: 25.0 },
      ],
      impact: 0.22,
    },
    {
      factor: '旁白风格',
      variants: [
        { name: '温柔知性', ctr: 4.6, conversion: 3.4, watchTime: 23.8 },
        { name: '活力年轻', ctr: 5.4, conversion: 4.5, watchTime: 18.0 },
        { name: '共情型', ctr: 6.3, conversion: 5.1, watchTime: 26.5 },
      ],
      impact: 0.31,
    },
  ];

  // ── A/B 对比历史 ──
  const abTestHistory = [
    { id: 'ab_1', product: '智能无线耳机 Pro', winner: '问题解决型', lift: '+24%', date: '2026-05-23' },
    { id: 'ab_2', product: '护肤精华液', winner: '质感沉浸风', lift: '+18%', date: '2026-05-22' },
    { id: 'ab_3', product: '便携咖啡机', winner: '快节奏种草风', lift: '+31%', date: '2026-05-21' },
  ];

  // ── 创作因子效果热力图 ──
  const heatmapData = {
    factors: ['质感沉浸风', '快节奏种草风', '问题解决型'],
    metrics: ['点击率', '转化率', '观看时长'],
    data: [
      [4.8, 3.2, 22.5],
      [5.6, 4.1, 18.3],
      [6.2, 5.0, 25.1],
    ],
  };

  res.json({
    data: {
      ...videoMetrics,
      totalMaterials: materials.total,
      totalScripts: scripts.total,
      avgGenerationTime: videoMetrics.avgGenerationTime || 28.5,
      successRate: videoMetrics.successRate || 98.5,
      stylePerformance: videoMetrics.stylePerformance,
      factorAttribution,
      abTestHistory,
      heatmapData,
    },
  });
});

export default router;
