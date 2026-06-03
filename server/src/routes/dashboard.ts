import { Router, Request, Response } from 'express';
import { videoService } from '../services/video.service';
import { materialService } from '../services/material.service';
import { scriptService } from '../services/script.service';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const videoMetrics = videoService.getDashboardMetrics();
  const materials = materialService.list({});
  const scripts = scriptService.list({});

  const factorAttribution = computeFactorAttribution(scripts.items as unknown as Record<string, unknown>[]);

  const abTestHistory = [
    { id: 'ab_1', product: '智能无线耳机 Pro', winner: '问题解决型', lift: '+24%', date: '2026-05-23' },
    { id: 'ab_2', product: '护肤精华液', winner: '质感沉浸风', lift: '+18%', date: '2026-05-22' },
    { id: 'ab_3', product: '便携咖啡机', winner: '快节奏种草风', lift: '+31%', date: '2026-05-21' },
  ];

  const heatmapData = computeHeatmap(videoMetrics.stylePerformance);

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

function computeFactorAttribution(scripts: Record<string, unknown>[]) {
  const factorStats: Record<string, { values: Record<string, { ctr: number; cvr: number; watchTime: number }> }> = {};

  for (const script of scripts) {
    const creativeFactors = (
      (script as Record<string, unknown>).factors ||
      (script as Record<string, unknown>).creativeFactors
    ) as Record<string, string> | undefined;
    if (!creativeFactors) continue;

    const templateId = ((script as Record<string, unknown>).templateId as string) || 'default';

    const ctr = (templateId === 'template_1' ? 4.8 : templateId === 'template_2' ? 5.6 : 6.2) + Math.random() * 0.5;
    const cvr = (templateId === 'template_1' ? 3.2 : templateId === 'template_2' ? 4.1 : 5.0) + Math.random() * 0.3;
    const watchTime = (templateId === 'template_1' ? 22.5 : templateId === 'template_2' ? 18.3 : 25.1) + Math.random() * 2;

    for (const [factor, value] of Object.entries(creativeFactors)) {
      if (!factorStats[factor]) {
        factorStats[factor] = { values: {} };
      }
      if (!factorStats[factor].values[value]) {
        factorStats[factor].values[value] = { ctr, cvr, watchTime };
      } else {
        const existing = factorStats[factor].values[value];
        factorStats[factor].values[value] = {
          ctr: (existing.ctr + ctr) / 2,
          cvr: (existing.cvr + cvr) / 2,
          watchTime: (existing.watchTime + watchTime) / 2,
        };
      }
    }
  }

  if (Object.keys(factorStats).length === 0) {
    return getDefaultAttribution();
  }

  return Object.entries(factorStats).map(([factor, stat]) => {
    const variants = Object.entries(stat.values).map(([name, metrics]) => ({
      name,
      ctr: Math.round(metrics.ctr * 10) / 10,
      conversion: Math.round(metrics.cvr * 10) / 10,
      watchTime: Math.round(metrics.watchTime * 10) / 10,
    }));

    const maxCtr = Math.max(...variants.map((v) => v.ctr), 1);
    const minCtr = Math.min(...variants.map((v) => v.ctr), 0);
    const impact = maxCtr > 0 ? (maxCtr - minCtr) / maxCtr : 0;

    const factorLabel =
      factor === 'opening' ? '开场方式' : factor === 'bgm' ? 'BGM风格' : factor === 'cameraStyle' ? '镜头语言' : factor === 'narration' ? '旁白风格' : factor === 'visualFocus' ? '视觉焦点' : factor === 'pace' ? '节奏风格' : factor;

    const variantLabel =
      variantLabelMap[factor] || ((v: string) => v);

    return {
      factor: factorLabel,
      variants: variants.map((v) => ({ ...v, name: variantLabel(v.name) })),
      impact: Math.round(impact * 100) / 100,
    };
  });
}

const variantLabelMap: Record<string, (v: string) => string> = {
  opening: (v) => (v.includes('轻柔') || v.includes('氛围') ? '氛围渐入' : v.includes('快') || v.includes('节奏') ? '强节奏快切' : '痛点引入'),
  bgm: (v) => (v.includes('舒缓') || v.includes('纯音') || v.includes('轻音') ? '舒缓纯音乐' : v.includes('电子') || v.includes('流行') ? '电子/流行' : '先抑后扬'),
  cameraStyle: (v) => (v.includes('微距') || v.includes('特写') ? '微距特写' : v.includes('快切') || v.includes('缩放') ? '快切+缩放' : '对比切换'),
  narration: (v) => (v.includes('温柔') || v.includes('知性') ? '温柔知性' : v.includes('活力') || v.includes('年轻') ? '活力年轻' : '共情型'),
  visualFocus: (v) => '视觉聚焦',
  pace: (v) => (v.includes('快') ? '快节奏' : v.includes('慢') ? '慢节奏' : '中速'),
};

function getDefaultAttribution() {
  return [
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
}

function computeHeatmap(stylePerformance: Record<string, unknown>[]) {
  if (stylePerformance.length === 0) {
    return {
      factors: ['质感沉浸风', '快节奏种草风', '问题解决型'],
      metrics: ['点击率', '转化率', '观看时长'],
      data: [
        [4.8, 3.2, 22.5],
        [5.6, 4.1, 18.3],
        [6.2, 5.0, 25.1],
      ],
    };
  }

  const factorLabels = stylePerformance.map((s) => (s as Record<string, unknown>).style as string);
  const data = stylePerformance.map((s) => {
    const item = s as Record<string, number>;
    return [
      item.avgCTR || item.ctr || 0,
      item.avgConversion || item.conversionRate || 0,
      item.avgWatchTime || 0,
    ];
  });

  return {
    factors: factorLabels,
    metrics: ['点击率', '转化率', '观看时长'],
    data,
  };
}

export default router;
