import { useEffect, useState } from 'react';
import { dashboardApi } from '../api/client';

function BarChart({ data, maxValue, color }: { data: number[]; maxValue: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'end', gap: 4, height: 60 }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            width: '100%', height: `${(v / maxValue) * 100}%`,
            background: color, borderRadius: '3px 3px 0 0',
            minHeight: 4,
          }} />
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
    <td style={{
      background: `rgb(${r},${g},${b})`,
      color: intensity > 0.5 ? '#fff' : '#1a1a2e',
      fontWeight: 600,
      textAlign: 'center',
      padding: '10px 14px',
    }}>
      {value.toFixed(1)}
    </td>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.get().then((res) => setData(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-body"><div className="empty-state">加载中...</div></div>;

  const metrics = data || {
    totalVideos: 0, totalScripts: 0, totalMaterials: 0,
    avgGenerationTime: 0, successRate: 100,
    stylePerformance: [], factorAttribution: [], abTestHistory: [], heatmapData: null,
  };

  const heatmap = metrics.heatmapData;
  const maxHeat = heatmap ? Math.max(...heatmap.data.flat()) : 10;

  return (
    <>
      <div className="page-header">
        <h1>工作台</h1>
        <p>电商 AIGC 带货视频生成系统 · 数据总览</p>
      </div>
      <div className="page-body">
        {/* 统计卡片 */}
        <div className="grid grid-4" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-value">{metrics.totalVideos}</div>
            <div className="stat-label">已生成视频</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{metrics.totalScripts}</div>
            <div className="stat-label">剧本总数</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{metrics.totalMaterials}</div>
            <div className="stat-label">素材资产</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{metrics.successRate}%</div>
            <div className="stat-label">生成成功率</div>
          </div>
        </div>

        {/* 风格效果 + A/B 历史 */}
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
                  {metrics.stylePerformance?.map((s: any, i: number) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{s.style}</td>
                      <td>{s.videoCount}</td>
                      <td>{s.avgCTR}%</td>
                      <td>{s.avgConversion}%</td>
                      <td>{s.avgWatchTime}s</td>
                    </tr>
                  ))}
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
                  {(metrics.abTestHistory || []).map((ab: any, i: number) => (
                    <tr key={i}>
                      <td>{ab.product}</td>
                      <td><span className="tag tag-green">{ab.winner}</span></td>
                      <td style={{ color: '#10b981', fontWeight: 600 }}>{ab.lift}</td>
                      <td className="text-sm text-secondary">{ab.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 多因子归因分析 (P2) */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <h3>多因子归因分析</h3>
            <span className="tag tag-green">P2 加分项</span>
          </div>
          <p className="text-sm text-secondary mb-4">分析不同创作因子对视频转化效果的影响权重</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {(metrics.factorAttribution || []).map((fa: any, i: number) => (
              <div key={i} style={{
                flex: '1 1 220px', minWidth: 200,
                border: '1px solid var(--border)', borderRadius: 8, padding: 16,
                background: 'var(--surface)',
              }}>
                <div className="flex justify-between items-center mb-3">
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{fa.factor}</span>
                  <span className="tag" style={{ background: '#eef2ff', color: '#6366f1' }}>
                    影响权重 {(fa.impact * 100).toFixed(0)}%
                  </span>
                </div>
                {fa.variants.map((v: any, j: number) => (
                  <div key={j} style={{ marginBottom: 8 }}>
                    <div className="flex justify-between text-sm" style={{ marginBottom: 2 }}>
                      <span>{v.name}</span>
                      <span style={{ fontWeight: 600 }}>
                        CTR {v.ctr}% · CVR {v.conversion}% · {v.watchTime}s
                      </span>
                    </div>
                    <div className="progress-bar" style={{ height: 4 }}>
                      <div className="progress-fill" style={{
                        width: `${(v.ctr / 7) * 100}%`,
                        background: j === fa.variants.length - 1 ? '#10b981' : j === 1 ? '#6366f1' : '#f59e0b',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* 热力图 */}
        {heatmap && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <h3>风格 × 指标 交叉热力图</h3>
              <span className="tag tag-green">P2 加分项</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>风格</th>
                    {heatmap.metrics.map((m: string, i: number) => <th key={i}>{m}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {heatmap.factors.map((f: string, i: number) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{f}</td>
                      {heatmap.data[i].map((v: number, j: number) => (
                        <HeatmapCell key={j} value={v} maxValue={maxHeat} />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 快速操作 */}
        <div className="card">
          <div className="card-header"><h3>快速操作</h3></div>
          <div className="grid grid-4 gap-3">
            <a href="/materials" className="btn btn-secondary" style={{ justifyContent: 'center', padding: 20, flexDirection: 'column', gap: 8, textDecoration: 'none' }}>
              <span style={{ fontSize: 28 }}>📦</span>
              <span>上传素材</span>
            </a>
            <a href="/scripts" className="btn btn-secondary" style={{ justifyContent: 'center', padding: 20, flexDirection: 'column', gap: 8, textDecoration: 'none' }}>
              <span style={{ fontSize: 28 }}>📝</span>
              <span>生成剧本</span>
            </a>
            <a href="/videos" className="btn btn-secondary" style={{ justifyContent: 'center', padding: 20, flexDirection: 'column', gap: 8, textDecoration: 'none' }}>
              <span style={{ fontSize: 28 }}>🎬</span>
              <span>A/B 创作视频</span>
            </a>
            <a href="/tasks" className="btn btn-secondary" style={{ justifyContent: 'center', padding: 20, flexDirection: 'column', gap: 8, textDecoration: 'none' }}>
              <span style={{ fontSize: 28 }}>⚡</span>
              <span>查看任务</span>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
