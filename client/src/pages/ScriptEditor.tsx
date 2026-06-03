import { useEffect, useMemo, useState } from 'react';
import type { ProductInfo, Shot, Storyboard, TaskStep } from '../types';
import type { GenerateScriptRequest } from '../types/api';
import { abTestApi, complianceApi, scriptsApi } from '../api/client';
import { useToast } from '../context/AppContext';
import { SkeletonPage } from '../components/Skeleton';
import StoryboardEditor from '../components/StoryboardEditor';
import ProgressTracker from '../components/ProgressTracker';

interface TemplateItem {
  id: string;
  name: string;
  description: string;
  strategy: string;
  factors: unknown;
}

interface ShotUpdate {
  id: string;
  index: number;
  description: string;
  cameraMovement: string;
  duration: number;
  narration: string;
  subtitle: string;
  transition: string;
}

interface TaskProgress {
  id: string;
  status: string;
  progress: number;
  steps: TaskStep[];
}

interface ABVariantResult {
  variantId: string;
  templateName: string;
  storyboard: Storyboard;
  metrics: {
    estimatedCTR: number;
    estimatedConversion: number;
    estimatedWatchTime: number;
    score: number;
  };
}

const CATEGORY_OPTIONS = [
  { value: '', label: '请选择类目' },
  { value: '电子产品', label: '电子产品' },
  { value: '家居生活', label: '家居生活' },
  { value: '美妆护肤', label: '美妆护肤' },
  { value: '服饰配饰', label: '服饰配饰' },
  { value: '食品饮料', label: '食品饮料' },
];

function splitSellingPoints(value: string): string[] {
  return value.split(/[,\n，、]/).map((item) => item.trim()).filter(Boolean);
}

function qualityClass(score?: number): string {
  if (typeof score !== 'number') return 'tag';
  if (score >= 85) return 'tag tag-green';
  if (score >= 70) return 'tag tag-yellow';
  return 'tag tag-red';
}

function formatTemplateNames(templates: TemplateItem[]): string[] {
  const ids = templates.slice(0, 3).map((item) => item.id).filter(Boolean);
  return ids.length > 0 ? ids : ['template_1', 'template_2', 'template_3'];
}

export default function ScriptEditor() {
  const toast = useToast();

  const [scripts, setScripts] = useState<Storyboard[]>([]);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [showNew, setShowNew] = useState(false);
  const [productTitle, setProductTitle] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [productSellingPoints, setProductSellingPoints] = useState('');
  const [productTargetAudience, setProductTargetAudience] = useState('');
  const [productScene, setProductScene] = useState('');
  const [referenceStyle, setReferenceStyle] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [abGenerating, setAbGenerating] = useState(false);
  const [formError, setFormError] = useState('');

  const [selectedScript, setSelectedScript] = useState<Storyboard | null>(null);
  const [task, setTask] = useState<TaskProgress | null>(null);
  const [abVariants, setAbVariants] = useState<ABVariantResult[]>([]);
  const [complianceResult, setComplianceResult] = useState<Record<string, unknown> | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [scrRes, tmpRes] = await Promise.all([scriptsApi.list(), scriptsApi.templates()]);
      setScripts(scrRes.items);
      setTemplates(tmpRes.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '加载剧本数据失败';
      toast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const productInfo: ProductInfo = useMemo(() => ({
    id: '',
    title: productTitle.trim(),
    category: productCategory,
    sellingPoints: splitSellingPoints(productSellingPoints),
    targetAudience: productTargetAudience.trim(),
    scene: productScene.trim(),
    price: '',
  }), [productCategory, productScene, productSellingPoints, productTargetAudience, productTitle]);

  const bestVariant = useMemo(() => {
    return [...abVariants].sort((a, b) => b.metrics.score - a.metrics.score)[0];
  }, [abVariants]);

  const resetForm = () => {
    setProductTitle('');
    setProductCategory('');
    setProductSellingPoints('');
    setProductTargetAudience('');
    setProductScene('');
    setReferenceStyle('');
    setTemplateId('');
    setFormError('');
    setAbVariants([]);
  };

  const validateForm = () => {
    if (!productInfo.title || !productInfo.category) {
      setFormError('请填写商品标题和类目。');
      return false;
    }
    if (productInfo.sellingPoints.length === 0) {
      setFormError('请至少填写一个核心卖点。');
      return false;
    }
    setFormError('');
    return true;
  };

  const createTask = (id: string, script: Storyboard, strategyName: string): TaskProgress => {
    const now = new Date().toISOString();
    return {
      id,
      status: 'completed',
      progress: 100,
      steps: [
        { name: '分析商品信息', status: 'completed', detail: productInfo.title, startedAt: now, completedAt: now },
        { name: '匹配创作策略', status: 'completed', detail: strategyName, startedAt: now, completedAt: now },
        { name: '生成叙事框架', status: 'completed', detail: script.narrative, startedAt: now, completedAt: now },
        { name: '创作分镜脚本', status: 'completed', detail: `${script.shots.length} 个分镜`, startedAt: now, completedAt: now },
        { name: '质量校验', status: 'completed', detail: `质量分 ${script.qualityScore ?? '-'}`, startedAt: now, completedAt: now },
      ],
    };
  };

  const handleGenerate = async () => {
    if (!validateForm()) return;
    setGenerating(true);
    try {
      const selectedTemplate = templates.find((item) => item.id === templateId);
      const body: GenerateScriptRequest = { productInfo, templateId: templateId || '', referenceStyle };
      const res = await scriptsApi.generate(body);

      setTask(createTask(res.taskId, res.data, selectedTemplate?.name || '默认策略'));
      setSelectedScript(res.data);
      setShowNew(false);
      toast('剧本生成成功', 'success');
      await load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '生成剧本失败';
      setFormError(message);
      toast(message, 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateAB = async () => {
    if (!validateForm()) return;
    setAbGenerating(true);
    setAbVariants([]);
    try {
      const res = await abTestApi.generateScripts({
        productInfo,
        templateIds: formatTemplateNames(templates),
      });
      const variants = res.data as unknown as ABVariantResult[];
      const sorted = [...variants].sort((a, b) => b.metrics.score - a.metrics.score);
      setAbVariants(sorted);
      if (sorted[0]) setSelectedScript(sorted[0].storyboard);
      toast('A/B 剧本对比已生成', 'success');
      await load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'A/B 对比生成失败';
      setFormError(message);
      toast(message, 'error');
    } finally {
      setAbGenerating(false);
    }
  };

  const handleShotUpdated = (updatedShot: ShotUpdate) => {
    if (!selectedScript) return;
    const newShots = selectedScript.shots.map((shot) => (
      shot.id === updatedShot.id ? { ...shot, ...updatedShot } : shot
    ));
    const updated: Storyboard = { ...selectedScript, shots: newShots as Shot[] };
    setSelectedScript(updated);
    scriptsApi.update(selectedScript.id, { shots: newShots as Shot[] }).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : '更新失败';
      toast('更新分镜失败: ' + message, 'error');
    });
  };

  const handleShotsReordered = (reorderedShots: ShotUpdate[]) => {
    if (!selectedScript) return;
    const updated: Storyboard = { ...selectedScript, shots: reorderedShots as unknown as Shot[] };
    setSelectedScript(updated);
    scriptsApi.update(selectedScript.id, { shots: reorderedShots as unknown as Shot[] }).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : '更新失败';
      toast('分镜排序失败: ' + message, 'error');
    });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确认删除这个剧本？')) return;
    try {
      await scriptsApi.delete(id);
      if (selectedScript?.id === id) setSelectedScript(null);
      toast('剧本已删除', 'success');
      await load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '删除失败';
      toast('删除失败: ' + message, 'error');
    }
  };

  const handleViewScript = (script: Storyboard) => {
    setSelectedScript(script);
    setTask(null);
    setComplianceResult(null);
  };

  const handleComplianceCheck = async () => {
    if (!selectedScript) return;
    try {
      const res = await complianceApi.checkScript(selectedScript.id);
      setComplianceResult(res.data);
      const status = res.data.status as string;
      toast(status === 'pass' ? '合规检查通过' : '合规检查完成，请查看提示', status === 'pass' ? 'success' : 'warning');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '合规检查失败';
      toast(message, 'error');
    }
  };

  if (loading) return <SkeletonPage />;

  return (
    <>
      <div className="page-header">
        <div className="flex justify-between items-center" style={{ gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1>剧本生成</h1>
            <p>基于爆款方法论生成、对比和精修 15-20 秒带货视频分镜。</p>
          </div>
          {!selectedScript && (
            <button className="btn btn-primary" onClick={() => setShowNew(true)}>
              新建剧本
            </button>
          )}
        </div>
      </div>

      <div className="page-body">
        {showNew && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="flex justify-between items-center" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>新建剧本</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowNew(false)}>取消</button>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label>商品标题 *</label>
                <input className="input" value={productTitle} onChange={(e) => setProductTitle(e.target.value)} placeholder="例：便携无线蓝牙耳机 Pro" />
              </div>
              <div className="form-group">
                <label>商品类目 *</label>
                <select className="input" value={productCategory} onChange={(e) => setProductCategory(e.target.value)}>
                  {CATEGORY_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>核心卖点 *（逗号或换行分隔）</label>
                <textarea className="textarea" value={productSellingPoints} onChange={(e) => setProductSellingPoints(e.target.value)} rows={3} placeholder="主动降噪, 长续航, 佩戴舒适" />
              </div>
              <div className="form-group">
                <label>目标人群</label>
                <input className="input" value={productTargetAudience} onChange={(e) => setProductTargetAudience(e.target.value)} placeholder="18-35 岁通勤用户" />
              </div>
              <div className="form-group">
                <label>使用场景</label>
                <input className="input" value={productScene} onChange={(e) => setProductScene(e.target.value)} placeholder="通勤、运动、办公" />
              </div>
              <div className="form-group">
                <label>单版本模板</label>
                <select className="input" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                  <option value="">默认策略</option>
                  {templates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>创作补充要求 / 参考风格</label>
              <textarea
                className="textarea"
                value={referenceStyle}
                rows={3}
                onChange={(e) => setReferenceStyle(e.target.value)}
                placeholder="例：用真实通勤痛点开场，强调手部演示和使用前后对比，结尾给出明确行动理由。"
              />
            </div>

            {formError && <div className="form-error" style={{ marginBottom: 12 }}>{formError}</div>}

            {abVariants.length > 0 && (
              <div className="card-flat" style={{ marginBottom: 16 }}>
                <div className="card-header">
                  <h3>A/B 创意评审</h3>
                  {bestVariant && <span className="tag tag-green">推荐：{bestVariant.templateName}</span>}
                </div>
                <div className="grid grid-3">
                  {abVariants.map((variant, index) => (
                    <div key={variant.variantId} className="card" style={{ padding: 14, border: index === 0 ? '2px solid var(--success)' : undefined }}>
                      <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
                        <strong>{variant.templateName}</strong>
                        <span className={qualityClass(variant.metrics.score)}>{variant.metrics.score}</span>
                      </div>
                      <div className="text-sm text-secondary">CTR 预估：{variant.metrics.estimatedCTR}%</div>
                      <div className="text-sm text-secondary">转化预估：{variant.metrics.estimatedConversion}%</div>
                      <div className="text-sm text-secondary">完播/停留：{variant.metrics.estimatedWatchTime}s</div>
                      <p className="text-sm text-secondary" style={{ marginTop: 8 }}>{variant.storyboard.strategy}</p>
                      <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={() => setSelectedScript(variant.storyboard)}>
                        查看这个版本
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-2">
              <button className={`btn btn-primary btn-lg ${generating ? 'btn-loading' : ''}`} onClick={handleGenerate} disabled={generating || abGenerating}>
                {generating ? '生成中' : '生成单版剧本'}
              </button>
              <button className={`btn btn-secondary btn-lg ${abGenerating ? 'btn-loading' : ''}`} onClick={handleGenerateAB} disabled={generating || abGenerating}>
                {abGenerating ? '对比中' : '生成 A/B 对比'}
              </button>
            </div>
          </div>
        )}

        {task && <ProgressTracker steps={task.steps} progress={task.progress} status={task.status} />}

        {selectedScript ? (
          <div style={{ marginBottom: 24 }}>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="flex justify-between items-center" style={{ gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 700 }}>{selectedScript.title}</h2>
                  <p className="text-sm text-secondary" style={{ marginTop: 4 }}>
                    策略：{selectedScript.strategy} · 视觉风格：{selectedScript.visualStyle} · {selectedScript.shots.length} 个分镜
                  </p>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedScript(null); setTask(null); }}>
                  返回列表
                </button>
              </div>

              <div className="flex gap-2 mt-4" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                {typeof selectedScript.qualityScore === 'number' && (
                  <span className={qualityClass(selectedScript.qualityScore)}>剧本质量：{selectedScript.qualityScore}</span>
                )}
                {selectedScript.creativeTags?.map((tag) => <span key={tag} className="tag">{tag}</span>)}
                <button className="btn btn-secondary btn-sm" onClick={handleComplianceCheck}>合规检查</button>
                {complianceResult && (
                  <span className={`tag ${complianceResult.status === 'pass' ? 'tag-green' : complianceResult.status === 'reject' ? 'tag-red' : 'tag-yellow'}`}>
                    审核结果：{complianceResult.status as string}
                  </span>
                )}
              </div>

              {complianceResult && Array.isArray(complianceResult.reasons) && complianceResult.reasons.length > 0 && (
                <div className="text-sm text-secondary" style={{ marginTop: 10 }}>
                  {(complianceResult.reasons as string[]).map((reason) => <div key={reason}>- {reason}</div>)}
                </div>
              )}

              {selectedScript.methodology && (
                <div className="grid grid-2" style={{ marginTop: 16, gap: 12 }}>
                  <div className="card" style={{ padding: 14 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>创作方法论</h4>
                    <div className="text-sm text-secondary">结构：{selectedScript.methodology.structure}</div>
                    <div className="text-sm text-secondary">Hook：{selectedScript.methodology.hookTechnique}</div>
                    <div className="text-sm text-secondary">证明：{selectedScript.methodology.proofTechnique}</div>
                    <div className="text-sm text-secondary">转化：{selectedScript.methodology.conversionTechnique}</div>
                  </div>
                  <div className="card" style={{ padding: 14 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>参考拆解</h4>
                    {selectedScript.referenceAnalyses?.slice(0, 2).map((ref) => (
                      <div key={ref.id} className="text-sm text-secondary" style={{ marginBottom: 8 }}>
                        <strong style={{ color: 'var(--text)' }}>{ref.title}</strong>
                        <div>{ref.hook}</div>
                        <div>{ref.sourceDeclaration}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedScript.qualityChecklist && selectedScript.qualityChecklist.length > 0 && (
                <div className="card" style={{ padding: 14, marginTop: 12 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>质量自检</h4>
                  <div className="grid grid-2" style={{ gap: 8 }}>
                    {selectedScript.qualityChecklist.map((check) => (
                      <div key={check.item} className="text-sm text-secondary">
                        <span style={{ color: check.passed ? 'var(--success)' : 'var(--warning)', fontWeight: 700 }}>
                          {check.passed ? '通过' : '待优化'}
                        </span>
                        {' '}{check.item}：{check.evidence}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <StoryboardEditor
              shots={selectedScript.shots.map((shot, index) => ({
                id: shot.id,
                index,
                description: shot.description,
                cameraMovement: shot.cameraMovement,
                duration: shot.duration,
                narration: shot.narration,
                subtitle: shot.subtitle,
                transition: shot.transition,
              }))}
              scriptId={selectedScript.id}
              onShotUpdated={handleShotUpdated}
              onShotsReordered={handleShotsReordered}
            />
          </div>
        ) : scripts.length === 0 ? (
          <div className="empty-state">
            <h3>暂无剧本</h3>
            <p>点击“新建剧本”开始生成。</p>
          </div>
        ) : (
          <div className="table-wrap card">
            <table>
              <thead>
                <tr>
                  <th>剧本标题</th>
                  <th>策略</th>
                  <th>质量</th>
                  <th>分镜数</th>
                  <th>创建时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {scripts.map((script) => (
                  <tr key={script.id}>
                    <td style={{ fontWeight: 600, cursor: 'pointer' }} onClick={() => handleViewScript(script)}>
                      {script.title}
                    </td>
                    <td><span className="tag">{script.strategy?.length > 20 ? script.strategy.slice(0, 20) + '...' : script.strategy}</span></td>
                    <td>
                      {typeof script.qualityScore === 'number' ? (
                        <span className={qualityClass(script.qualityScore)}>{script.qualityScore}</span>
                      ) : '-'}
                    </td>
                    <td>{script.shots?.length || 0}</td>
                    <td className="text-sm text-secondary">{new Date(script.createdAt).toLocaleString()}</td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-secondary btn-sm" onClick={() => handleViewScript(script)}>编辑</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(script.id)}>删除</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
