import { useEffect, useState } from 'react';
import { referencesApi, scriptsApi, tracesApi } from '../api/client';
import type { GenerationTrace, ReferenceAnalysis } from '../types';

interface TemplateItem {
  id: string;
  name: string;
  description?: string;
  strategy: string;
  factors: Record<string, string>;
}

const CATEGORY_OPTIONS = ['', '电子产品', '家居生活', '美妆护肤', '服饰配饰', '食品饮料'];

export default function Methodology() {
  const [category, setCategory] = useState('');
  const [references, setReferences] = useState<ReferenceAnalysis[]>([]);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [traces, setTraces] = useState<GenerationTrace[]>([]);
  const [loading, setLoading] = useState(true);

  async function load(nextCategory = category) {
    setLoading(true);
    const [refRes, tplRes, traceRes] = await Promise.all([
      referencesApi.list(nextCategory || undefined),
      scriptsApi.templates(),
      tracesApi.list({ type: 'script_generation', pageSize: '10' }),
    ]);
    setReferences(refRes.data);
    setTemplates(tplRes.data as unknown as TemplateItem[]);
    setTraces(traceRes.items);
    setLoading(false);
  }

  useEffect(() => {
    load('');
  }, []);

  function handleCategoryChange(value: string) {
    setCategory(value);
    load(value);
  }

  return (
    <>
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1>方法论库</h1>
            <p>公开视频结构化拆解 · 灵感模板 · 生成链路 Trace</p>
          </div>
          <select className="input" style={{ width: 180 }} value={category} onChange={(e) => handleCategoryChange(e.target.value)}>
            {CATEGORY_OPTIONS.map((item) => (
              <option key={item || 'all'} value={item}>
                {item || '全部类目'}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="page-body">
        {loading ? (
          <div className="card">加载中...</div>
        ) : (
          <>
            <section style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, marginBottom: 12 }}>爆款结构化拆解</h2>
              <div className="grid grid-2">
                {references.map((ref) => (
                  <div className="card" key={ref.id}>
                    <div className="flex justify-between items-center mb-3">
                      <h3 style={{ fontSize: 16, fontWeight: 700 }}>{ref.title}</h3>
                      <span className="tag">{ref.category}</span>
                    </div>
                    <p className="text-sm text-secondary">平台：{ref.platform}</p>
                    <p className="text-sm"><strong>Hook：</strong>{ref.hook}</p>
                    <p className="text-sm"><strong>卖点角度：</strong>{ref.sellingPointAngle}</p>
                    <div className="flex gap-2" style={{ flexWrap: 'wrap', margin: '10px 0' }}>
                      {ref.shotPattern.map((shot) => (
                        <span className="tag" key={shot}>{shot}</span>
                      ))}
                    </div>
                    <p className="text-xs text-secondary">{ref.sourceDeclaration}</p>
                  </div>
                ))}
              </div>
            </section>

            <section style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, marginBottom: 12 }}>灵感模板与创作因子</h2>
              <div className="grid grid-3">
                {templates.map((template) => (
                  <div className="card" key={template.id}>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>{template.name}</h3>
                    <p className="text-sm text-secondary">{template.description || template.strategy}</p>
                    <p className="text-sm"><strong>策略：</strong>{template.strategy}</p>
                    <div className="text-sm text-secondary">
                      {Object.entries(template.factors || {}).map(([key, value]) => (
                        <div key={key}>{key}: {value}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 style={{ fontSize: 18, marginBottom: 12 }}>生成 Trace</h2>
              <div className="table-wrap card">
                <table>
                  <thead>
                    <tr>
                      <th>时间</th>
                      <th>商品</th>
                      <th>类目</th>
                      <th>模型/端点</th>
                      <th>质量分</th>
                      <th>耗时</th>
                      <th>状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {traces.map((trace) => (
                      <tr key={trace.id}>
                        <td className="text-sm text-secondary">{new Date(trace.createdAt).toLocaleString()}</td>
                        <td>{trace.productTitle || '-'}</td>
                        <td>{trace.category || '-'}</td>
                        <td className="text-sm text-secondary">{trace.modelEndpoint || '-'}</td>
                        <td>{typeof trace.qualityScore === 'number' ? trace.qualityScore : '-'}</td>
                        <td>{trace.durationMs}ms</td>
                        <td>
                          <span className={`tag ${trace.status === 'success' ? 'tag-green' : 'tag-red'}`}>
                            {trace.fallbackUsed ? '降级兜底' : trace.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {traces.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-sm text-secondary">暂无生成记录</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}
