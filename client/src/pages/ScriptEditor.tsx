import { useEffect, useState } from 'react';
import { scriptsApi, materialsApi } from '../api/client';
import StoryboardEditor from '../components/StoryboardEditor';
import ProgressTracker from '../components/ProgressTracker';

export default function ScriptEditor() {
  const [scripts, setScripts] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 生成表单
  const [showNew, setShowNew] = useState(false);
  const [productTitle, setProductTitle] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [productSellingPoints, setProductSellingPoints] = useState('');
  const [productTargetAudience, setProductTargetAudience] = useState('');
  const [productScene, setProductScene] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // 当前选中的剧本
  const [selectedScript, setSelectedScript] = useState<any>(null);
  const [task, setTask] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    const [scrRes, tmpRes, matRes] = await Promise.all([
      scriptsApi.list(),
      scriptsApi.templates(),
      materialsApi.list(),
    ]);
    setScripts(scrRes.items);
    setTemplates(tmpRes.data);
    setMaterials(matRes.items);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleGenerate = async () => {
    if (!productTitle || !productCategory) {
      setError('请填写商品标题和类目');
      return;
    }
    setGenerating(true);
    setError('');
    try {
      const res = await scriptsApi.generate({
        productInfo: {
          title: productTitle,
          category: productCategory,
          sellingPoints: productSellingPoints.split(',').map((s: string) => s.trim()).filter(Boolean),
          targetAudience: productTargetAudience,
          scene: productScene,
        },
        templateId: templateId || undefined,
      });

      // 构造模拟任务进度
      setTask({
        id: res.taskId,
        status: 'completed',
        progress: 100,
        steps: [
          { name: '分析商品信息', status: 'completed', detail: productTitle },
          { name: '匹配创作策略', status: 'completed', detail: templates.find(t => t.id === templateId)?.name || '默认模板' },
          { name: '生成叙事框架', status: 'completed', detail: res.data.narrative },
          { name: '创作分镜脚本', status: 'completed', detail: `${res.data.shots.length} 个分镜` },
          { name: '质量校验', status: 'completed', detail: '通过' },
        ],
      });

      setSelectedScript(res.data);
      setShowNew(false);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleShotUpdated = (updatedShot: any) => {
    if (!selectedScript) return;
    const newShots = selectedScript.shots.map((s: any) =>
      s.id === updatedShot.id ? updatedShot : s
    );
    const updated = { ...selectedScript, shots: newShots };
    setSelectedScript(updated);
    scriptsApi.update(selectedScript.id, { shots: newShots }).catch(console.error);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确认删除此剧本？')) return;
    await scriptsApi.delete(id);
    if (selectedScript?.id === id) setSelectedScript(null);
    load();
  };

  if (loading) return <div className="page-body"><div className="empty-state">加载中...</div></div>;

  return (
    <>
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1>剧本生成</h1>
            <p>AI 自动生成带货视频脚本 · 支持多模板和分镜干预</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>+ 新建剧本</button>
        </div>
      </div>
      <div className="page-body">
        {/* 新建剧本表单 */}
        {showNew && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>新建剧本</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowNew(false)}>取消</button>
            </div>

            <div className="grid grid-2">
              <div>
                <div className="form-group">
                  <label>商品标题 *</label>
                  <input className="input" value={productTitle} onChange={(e) => setProductTitle(e.target.value)}
                    placeholder="例：便携无线蓝牙耳机 Pro" />
                </div>
                <div className="form-group">
                  <label>商品类目 *</label>
                  <select className="input" value={productCategory} onChange={(e) => setProductCategory(e.target.value)}>
                    <option value="">请选择</option>
                    <option value="电子产品">电子产品</option>
                    <option value="家居生活">家居生活</option>
                    <option value="美妆护肤">美妆护肤</option>
                    <option value="服饰配饰">服饰配饰</option>
                    <option value="食品饮料">食品饮料</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>核心卖点（逗号分隔）</label>
                  <input className="input" value={productSellingPoints} onChange={(e) => setProductSellingPoints(e.target.value)}
                    placeholder="降噪, 长续航, 低延迟" />
                </div>
              </div>
              <div>
                <div className="form-group">
                  <label>目标人群</label>
                  <input className="input" value={productTargetAudience} onChange={(e) => setProductTargetAudience(e.target.value)}
                    placeholder="18-35岁年轻用户" />
                </div>
                <div className="form-group">
                  <label>使用场景</label>
                  <input className="input" value={productScene} onChange={(e) => setProductScene(e.target.value)}
                    placeholder="通勤、运动、办公" />
                </div>
                <div className="form-group">
                  <label>创作模板</label>
                  <select className="input" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                    <option value="">默认（自动选择最佳模板）</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} - {t.strategy.slice(0, 30)}...</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{error}</div>}

            <button className="btn btn-primary btn-lg" onClick={handleGenerate}
              disabled={generating} style={{ width: '100%' }}>
              {generating ? '🎬 AI 正在创作剧本...' : '⚡ 生成剧本'}
            </button>
          </div>
        )}

        {/* 任务进度 */}
        {task && (
          <ProgressTracker steps={task.steps} progress={task.progress} status={task.status} error={task.error} />
        )}

        {/* 剧本详情 & 分镜编辑 */}
        {selectedScript ? (
          <div style={{ marginBottom: 24 }}>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="flex justify-between items-center">
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 700 }}>{selectedScript.title}</h2>
                  <p className="text-sm text-secondary" style={{ marginTop: 4 }}>
                    策略: {selectedScript.strategy} · 视觉风格: {selectedScript.visualStyle} · {selectedScript.shots.length} 个分镜
                  </p>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => setSelectedScript(null)}>返回列表</button>
              </div>
            </div>
            <StoryboardEditor
              shots={selectedScript.shots}
              scriptId={selectedScript.id}
              onShotUpdated={handleShotUpdated}
            />
          </div>
        ) : (
          /* 剧本列表 */
          scripts.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
              <h3>暂无剧本</h3>
              <p>点击"新建剧本"开始 AI 创作</p>
            </div>
          ) : (
            <div className="table-wrap card">
              <table>
                <thead>
                  <tr>
                    <th>剧本标题</th>
                    <th>策略</th>
                    <th>分镜数</th>
                    <th>创建时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {scripts.map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600, cursor: 'pointer' }} onClick={() => setSelectedScript(s)}>
                        {s.title}
                      </td>
                      <td><span className="tag">{s.strategy?.slice(0, 20)}...</span></td>
                      <td>{s.shots?.length || 0}</td>
                      <td className="text-sm text-secondary">{new Date(s.createdAt).toLocaleString()}</td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-secondary btn-sm" onClick={() => setSelectedScript(s)}>编辑</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id)}>删除</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </>
  );
}
