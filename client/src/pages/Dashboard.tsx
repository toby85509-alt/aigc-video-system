import { useEffect, useState } from 'react';
import type {
  DashboardMetrics,
  StyleMetric,
  FactorAttribution,
  AttributionVariant,
  ABTestHistory,
  HeatmapRow,
} from '../types';
import { dashboardApi } from '../api/client';
import { useToast } from '../components/Toast';
import { SkeletonCard } from '../components/Skeleton';

function BarChart({ data, maxValue, color }: { data: number[]; maxValue: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'end', gap: 4, height: 60 }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            style={{
              width: '100%',
              height: `${(v / maxValue) * 100}%`,
              background: color,
              borderRadius: '3px 3px 0 0',
              minHeight: 4,
            }}
          />
        </div>
      ))}
    </div>
  );
}

function HeatmapCell({ value, maxValue }: { value: number; maxValue: number }) {
  const intensity = value / maxValue;
  const r = Math.round(99 + (1 - intensity) * 156);
  const g = Math.round(102 + (1 - intensity) * 137);
  const b = Math.round(241 - intensity * 180);
  return (
    <td
      style={{
        background: `rgb(${r},${g},${b})`,
        color: intensity > 0.5 ? '#fff' : '#1a1a2e',
        fontWeight: 600,
        textAlign: 'center',
        padding: '10px 14px',
      }}
    >
      {value.toFixed(1)}
    </td>
  );
}

const GRADIENT_COLORS = [
  { border: '#6366f1', bg: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(99,102,241,0.02))' },
  { border: '#10b981', bg: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.02))' },
  { border: '#f59e0b', bg: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02))' },
  { border: '#20d5ec', bg: 'linear-gradient(135deg, rgba(32,213,236,0.08), rgba(32,213,236,0.02))' },
];

function StatSkeleton() {
  return (
    <div className="stat-card animate-pulse" style={{ minHeight: 104 }}>
      <div className="skeleton" style={{ width: '50%', height: 30, borderRadius: 6, marginBottom: 8 }} />
      <div className="skeleton" style={{ width: '35%', height: 14, borderRadius: 4 }} />
    </div>
  );
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    dashboardApi
      .get()
      .then((res) => {
        if (!cancelled) {
          setMetrics(res.data);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          toast(`加载数据看板失败: ${err.message}`, 'error');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [toast]);

  if (loading || !metrics) {
    return (
      <>
        <div className="page-header">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm text-tertiary">首页</span>
            <span className="text-sm text-tertiary">/</span>
            <span className="text-sm font-semibold">数据看板</span>
          </div>
          <h1>数据看板</h1>
          <p>电商 AIGC 带货视频生成系统 · 数据总览</p>
        </div>
        <div className="page-body">
          <div className="grid grid-4" style={{ marginBottom: 24 }}>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </div>
          <div className="grid grid-2" style={{ marginBottom: 24 }}>
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="grid grid-3 gap-3" style={{ marginBottom: 24 }}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <SkeletonCard />
        </div>
      </>
    );
  }

  const m = metrics!;

  const rawHeatmap = (m as unknown as Record<string, unknown>)?.heatmapData as
    | { factors: string[]; metrics: string[]; data: number[][] }
    | undefined;
  const backendHeatmap = rawHeatmap || { factors: [], metrics: [], data: [] };

  const heatmapFactors: string[] = backendHeatmap?.factors || [];
  const heatmapMetrics: string[] = backendHeatmap?.metrics || [];
  const heatmapData: number[][] = backendHeatmap?.data || [];
  const maxHeat =
    heatmapData.length > 0
      ? Math.max(...heatmapData.flat().filter((v) => v > 0))
      : 10;

  return (
    <>
      <div className="page-header">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm text-tertiary">首页</span>
          <span className="text-sm text-tertiary">/</span>
          <span className="text-sm font-semibold">数据看板</span>
        </div>
        <h1>数据看板</h1>
        <p>电商 AIGC 带货视频生成系统 · 数据总览</p>
      </div>

      <div className="page-body">
        <div className="grid grid-4" style={{ marginBottom: 24 }}>
          <div
            className="stat-card"
            style={{ borderTop: `3px solid ${GRADIENT_COLORS[0].border}`, background: GRADIENT_COLORS[0].bg }}
          >
            <div className="stat-value">{m.totalVideos.toLocaleString()}</div>
            <div className="stat-label">已生成视频</div>
          </div>
          <div
            className="stat-card"
            style={{ borderTop: `3px solid ${GRADIENT_COLORS[1].border}`, background: GRADIENT_COLORS[1].bg }}
          >
            <div className="stat-value">{m.totalScripts.toLocaleString()}</div>
            <div className="stat-label">剧本总数</div>
          </div>
          <div
            className="stat-card"
            style={{ borderTop: `3px solid ${GRADIENT_COLORS[2].border}`, background: GRADIENT_COLORS[2].bg }}
          >
            <div className="stat-value">{m.totalMaterials.toLocaleString()}</div>
            <div className="stat-label">素材资产</div>
          </div>
          <div
            className="stat-card"
            style={{ borderTop: `3px solid ${GRADIENT_COLORS[3].border}`, background: GRADIENT_COLORS[3].bg }}
          >
            <div className="stat-value">{m.successRate}%</div>
            <div className="stat-label">生成成功率</div>
          </div>
        </div>

        <div className="grid grid-2" style={{ marginBottom: 24 }}>
          <div className="card">
            <div className="card-header">
              <h3>风格 × 转化效果</h3>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>风格</th>
                    <th>视频数</th>
                    <th>点击率</th>
                    <th>转化率</th>
                    <th>平均观看</th>
                  </tr>
                </thead>
                <tbody>
                  {m.stylePerformance.map((s, i: number) => {
                    const styleData = s as unknown as Record<string, unknown>;
                    return (
                    <tr key={(styleData.style as string) || i}>
                      <td style={{ fontWeight: 600 }}>{styleData.style as string}</td>
                      <td>{styleData.videoCount as number}</td>
                      <td>{((styleData.avgCTR || styleData.ctr) as number)}%</td>
                      <td>{((styleData.avgConversion || styleData.conversionRate) as number)}%</td>
                      <td>{styleData.avgWatchTime as number}s</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>A/B 对比历史</h3>
              <span className="tag tag-green">P2 加分项</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>商品</th>
                    <th>胜出风格</th>
                    <th>提升</th>
                    <th>日期</th>
                  </tr>
                </thead>
                <tbody>
                  {m.abTestHistory.map((ab, i: number) => {
                    const abData = ab as unknown as Record<string, unknown>;
                    return (
                    <tr key={(abData.id as string) || i}>
                      <td>{(abData.productName || abData.product) as string}</td>
                      <td>
                        <span className="tag tag-green">{(abData.winningStyle || abData.winner) as string}</span>
                      </td>
                      <td style={{ color: '#10b981', fontWeight: 600 }}>{(abData.improvement || abData.lift) as string}</td>
                      <td className="text-sm text-secondary">{abData.date as string}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <h3>多因子归因分析</h3>
            <span className="tag tag-green">P2 加分项</span>
          </div>
          <p className="text-sm text-secondary mb-4">
            分析不同创作因子对视频转化效果的影响权重
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {m.factorAttribution.map((fa, idx: number) => {
              const faData = fa as unknown as Record<string, unknown>;
              const variants = (faData.variants as unknown as Record<string, unknown>[]) || [];
              const totalImpact = variants.reduce((sum, v) => sum + ((v.ctr as number) || 0), 0);
              return (
                <div
                  key={fa.factor}
                  style={{
                    flex: '1 1 220px',
                    minWidth: 200,
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: 16,
                    background: 'var(--surface)',
                  }}
                >
                  <div className="flex justify-between items-center mb-3">
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{faData.factor as string}</span>
                    <span
                      className="tag"
                      style={{ background: '#eef2ff', color: '#6366f1' }}
                    >
                      影响权重 {Math.round(totalImpact)}%
                    </span>
                  </div>
                  <p className="text-sm text-tertiary mb-3">
                    {((faData.description || '分析不同因子的转化表现') as string)}
                  </p>
                  {variants.map((v: Record<string, unknown>, j: number) => (
                    <div key={(v.name as string) || j} style={{ marginBottom: 8 }}>
                      <div className="flex justify-between text-sm" style={{ marginBottom: 2 }}>
                        <span>{v.name as string}</span>
                        <span style={{ fontWeight: 600 }}>
                          CTR {(v.ctr as number)}% · CVR {(v.conversion || v.cvr) as number}% · {(v.watchTime as number)}s
                        </span>
                      </div>
                      <div className="progress-bar" style={{ height: 4 }}>
                        <div
                          className="progress-fill"
                          style={{
                            width: `${Math.min(((v.ctr as number) / 7) * 100, 100)}%`,
                            background:
                              j === variants.length - 1
                                ? '#10b981'
                                : j === 1
                                  ? '#6366f1'
                                  : '#f59e0b',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {heatmapData.length > 0 && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <h3>风格 × 指标 交叉热力图</h3>
              <span className="tag tag-green">P2 加分项</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>指标</th>
                    {heatmapFactors.map((f: string) => (
                      <th key={f}>{f}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatmapMetrics.map((metric: string, rowIdx: number) => (
                    <tr key={metric}>
                      <td style={{ fontWeight: 600 }}>{metric}</td>
                      {heatmapFactors.map((_f: string, colIdx: number) => (
                        <HeatmapCell
                          key={colIdx}
                          value={heatmapData[rowIdx]?.[colIdx] ?? 0}
                          maxValue={maxHeat}
                        />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-header">
            <h3>快速操作</h3>
          </div>
          <div className="grid grid-4 gap-3">
            <a
              href="/materials"
              className="btn btn-secondary"
              style={{
                justifyContent: 'center',
                padding: 20,
                flexDirection: 'column',
                gap: 8,
                textDecoration: 'none',
              }}
            >
              <span style={{ fontSize: 28 }}>📦</span>
              <span>上传素材</span>
            </a>
            <a
              href="/scripts"
              className="btn btn-secondary"
              style={{
                justifyContent: 'center',
                padding: 20,
                flexDirection: 'column',
                gap: 8,
                textDecoration: 'none',
              }}
            >
              <span style={{ fontSize: 28 }}>📝</span>
              <span>生成剧本</span>
            </a>
            <a
              href="/videos"
              className="btn btn-secondary"
              style={{
                justifyContent: 'center',
                padding: 20,
                flexDirection: 'column',
                gap: 8,
                textDecoration: 'none',
              }}
            >
              <span style={{ fontSize: 28 }}>🎬</span>
              <span>A/B 创作视频</span>
            </a>
            <a
              href="/tasks"
              className="btn btn-secondary"
              style={{
                justifyContent: 'center',
                padding: 20,
                flexDirection: 'column',
                gap: 8,
                textDecoration: 'none',
              }}
            >
              <span style={{ fontSize: 28 }}>⚡</span>
              <span>查看任务</span>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
