import { useMemo, useRef, useState } from 'react';
import type { MaterialAsset, ProductInfo, Resolution, Storyboard, VideoProject } from '../types';
import { materialsApi, scriptsApi, videosApi } from '../api/client';
import { useToast } from '../context/AppContext';

type StepStatus = 'pending' | 'running' | 'completed' | 'failed';

interface FlowStep {
  key: string;
  title: string;
  detail: string;
  status: StepStatus;
}

const CATEGORY_OPTIONS = ['电子产品', '家居生活', '美妆护肤', '食品饮料', '服饰配饰', '运动户外'];
const TEMPLATE_OPTIONS = [
  { value: 'template_1', label: '痛点开场' },
  { value: 'template_2', label: '场景种草' },
  { value: 'template_3', label: '测评证明' },
];

const INITIAL_STEPS: FlowStep[] = [
  { key: 'material', title: '素材入库', detail: '上传商品图并完成基础标签分析', status: 'pending' },
  { key: 'script', title: '方法论剧本', detail: '匹配爆款结构，生成 15-20 秒分镜', status: 'pending' },
  { key: 'video', title: '视频生成', detail: '逐镜头调用视频模型，控制画幅和镜头语言', status: 'pending' },
  { key: 'merge', title: '自动合成', detail: '拼接片段并导出最终视频', status: 'pending' },
  { key: 'export', title: '导出链接', detail: '获得可预览、可分享的成片地址', status: 'pending' },
];

function splitSellingPoints(value: string): string[] {
  return value.split(/[,\n，、]/).map((item) => item.trim()).filter(Boolean);
}

function normalizeOutputUrl(url?: string): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return url.startsWith('/') ? url : `/${url}`;
}

function statusText(status: StepStatus): string {
  if (status === 'completed') return '已完成';
  if (status === 'running') return '进行中';
  if (status === 'failed') return '失败';
  return '等待中';
}

export default function QuickCreate() {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<number | null>(null);

  const [title, setTitle] = useState('便携无线蓝牙耳机');
  const [category, setCategory] = useState('电子产品');
  const [sellingPoints, setSellingPoints] = useState('主动降噪, 长续航, 佩戴舒适');
  const [targetAudience, setTargetAudience] = useState('通勤、运动、办公的年轻用户');
  const [scene, setScene] = useState('地铁通勤、办公室专注、户外散步');
  const [price, setPrice] = useState('限时优惠');
  const [templateId, setTemplateId] = useState('template_1');
  const [referenceStyle, setReferenceStyle] = useState('真实场景开场，突出问题解决和使用前后对比，结尾给出明确下单理由。');
  const [resolution, setResolution] = useState<Resolution>('9:16');
  const [file, setFile] = useState<File | null>(null);

  const [steps, setSteps] = useState<FlowStep[]>(INITIAL_STEPS);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [uploadedMaterials, setUploadedMaterials] = useState<MaterialAsset[]>([]);
  const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
  const [project, setProject] = useState<VideoProject | null>(null);

  const productInfo: ProductInfo = useMemo(() => ({
    id: title.trim() || 'quick-product',
    title: title.trim(),
    category,
    sellingPoints: splitSellingPoints(sellingPoints),
    targetAudience: targetAudience.trim(),
    scene: scene.trim(),
    price: price.trim(),
  }), [category, price, scene, sellingPoints, targetAudience, title]);

  const progress = useMemo(() => {
    if (project?.progress) return project.progress;
    const completed = steps.filter((item) => item.status === 'completed').length;
    return Math.round((completed / steps.length) * 100);
  }, [project?.progress, steps]);

  const updateStep = (key: string, status: StepStatus, detail?: string) => {
    setSteps((current) => current.map((step) => (
      step.key === key ? { ...step, status, detail: detail || step.detail } : step
    )));
  };

  const resetFlow = () => {
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = null;
    setSteps(INITIAL_STEPS);
    setError('');
    setUploadedMaterials([]);
    setStoryboard(null);
    setProject(null);
  };

  const waitForProject = (projectId: string) => new Promise<VideoProject>((resolve, reject) => {
    let attempts = 0;
    pollRef.current = window.setInterval(async () => {
      attempts += 1;
      try {
        const res = await videosApi.get(projectId);
        setProject(res.data);
        if (res.data.status === 'completed') {
          if (pollRef.current) window.clearInterval(pollRef.current);
          pollRef.current = null;
          resolve(res.data);
        }
        if (res.data.status === 'failed') {
          if (pollRef.current) window.clearInterval(pollRef.current);
          pollRef.current = null;
          reject(new Error(res.data.error || '视频生成失败'));
        }
        if (attempts > 240) {
          if (pollRef.current) window.clearInterval(pollRef.current);
          pollRef.current = null;
          reject(new Error('视频生成超时，请到任务中心查看详情'));
        }
      } catch (err) {
        if (attempts > 3) {
          if (pollRef.current) window.clearInterval(pollRef.current);
          pollRef.current = null;
          reject(err);
        }
      }
    }, 5000);
  });

  const handleCreate = async () => {
    if (!productInfo.title || !productInfo.category || productInfo.sellingPoints.length === 0) {
      setError('请至少填写商品标题、类目和核心卖点。');
      return;
    }
    if (!file) {
      setError('请上传一张清晰商品图。图片素材能显著提高视频稳定性和商品一致性。');
      return;
    }

    resetFlow();
    setRunning(true);

    try {
      updateStep('material', 'running');
      const formData = new FormData();
      formData.append('files', file);
      formData.append('productInfo', JSON.stringify(productInfo));
      const uploadRes = await materialsApi.upload(formData) as unknown as { data?: MaterialAsset[]; materials?: MaterialAsset[]; error?: string };
      const materials = uploadRes.data || uploadRes.materials || [];
      if (uploadRes.error || materials.length === 0) throw new Error(uploadRes.error || '素材上传失败');
      setUploadedMaterials(materials);
      updateStep('material', 'completed', `已入库 ${materials.length} 个素材`);

      updateStep('script', 'running');
      const scriptRes = await scriptsApi.generate({ productInfo, templateId, referenceStyle });
      setStoryboard(scriptRes.data);
      updateStep('script', 'completed', `剧本质量评分 ${scriptRes.data.qualityScore ?? '-'} 分`);

      updateStep('video', 'running');
      const videoRes = await videosApi.create({
        storyboardId: scriptRes.data.id,
        materialIds: materials.map((item) => item.id),
        resolution,
        name: `${productInfo.title} 一键成片`,
      });
      setProject(videoRes.data);
      updateStep('video', 'running', '视频任务已创建，正在生成镜头片段');
      updateStep('merge', 'running');

      const finalProject = await waitForProject(videoRes.data.id);
      setProject(finalProject);
      updateStep('video', 'completed', '全部镜头片段已生成');
      updateStep('merge', 'completed', '最终视频已完成合成');
      updateStep('export', 'completed', '导出链接已生成');
      toast('一键成片完成', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '一键成片失败';
      setError(message);
      setSteps((current) => current.map((step) => (
        step.status === 'running' ? { ...step, status: 'failed', detail: message } : step
      )));
      toast(message, 'error');
    } finally {
      setRunning(false);
    }
  };

  const outputUrl = normalizeOutputUrl(project?.outputUrl);

  return (
    <>
      <div className="page-header">
        <div className="flex justify-between items-center" style={{ gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1>一键成片</h1>
            <p>面向大众用户的最短工作流：填商品信息、上传素材、生成剧本并自动导出视频。</p>
          </div>
          <button className={`btn btn-primary btn-lg ${running ? 'btn-loading' : ''}`} onClick={handleCreate} disabled={running}>
            {running ? '生成中' : '开始生成'}
          </button>
        </div>
      </div>

      <div className="page-body">
        <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.1fr) minmax(320px, 0.9fr)', alignItems: 'start' }}>
          <div className="card">
            <div className="card-header"><h3>商品与创作信息</h3></div>

            <div className="form-group">
              <label>商品标题 *</label>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label>商品类目 *</label>
                <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORY_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>视频画幅</label>
                <select className="input" value={resolution} onChange={(e) => setResolution(e.target.value as Resolution)}>
                  <option value="9:16">9:16 竖屏带货</option>
                  <option value="16:9">16:9 横屏展示</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>核心卖点 *（逗号或换行分隔）</label>
              <textarea className="textarea" value={sellingPoints} onChange={(e) => setSellingPoints(e.target.value)} rows={3} />
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label>目标人群</label>
                <input className="input" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} />
              </div>
              <div className="form-group">
                <label>价格/优惠</label>
                <input className="input" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label>使用场景</label>
              <input className="input" value={scene} onChange={(e) => setScene(e.target.value)} />
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label>剧本模板</label>
                <select className="input" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                  {TEMPLATE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>商品图片 *</label>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => setFile(e.target.files?.[0] || null)} />
                <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => fileRef.current?.click()} type="button">
                  {file ? file.name : '选择清晰商品图'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>补充要求</label>
              <textarea className="textarea" value={referenceStyle} onChange={(e) => setReferenceStyle(e.target.value)} rows={3} />
              <div className="form-hint">系统会自动控制为 15-20 秒、4 个镜头，并避免在画面里生成不可控文字。</div>
            </div>

            {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}
          </div>

          <div className="card">
            <div className="card-header">
              <h3>生成进度</h3>
              <span className="tag">{progress}%</span>
            </div>
            <div className="progress-bar" style={{ marginBottom: 20 }}>
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="timeline">
              {steps.map((step) => (
                <div key={step.key} className={`timeline-item ${step.status}`}>
                  <div className="timeline-title">
                    {step.title}
                    <span className="tag" style={{ marginLeft: 8 }}>{statusText(step.status)}</span>
                  </div>
                  <div className="timeline-desc">{step.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {(storyboard || project || uploadedMaterials.length > 0) && (
          <div className="grid grid-3" style={{ marginTop: 20 }}>
            <div className="card">
              <div className="card-header"><h3>素材</h3></div>
              <p className="text-secondary text-sm">已选素材会作为视频首帧参考，优先保持商品外观一致。</p>
              {uploadedMaterials.map((item) => (
                <div key={item.id} className="flex justify-between items-center" style={{ marginTop: 10 }}>
                  <span>{item.name}</span>
                  <span className="tag tag-green">{item.status}</span>
                </div>
              ))}
            </div>

            <div className="card">
              <div className="card-header">
                <h3>剧本质量</h3>
                {storyboard?.qualityScore !== undefined && <span className="tag tag-green">{storyboard.qualityScore} 分</span>}
              </div>
              <p style={{ fontWeight: 600 }}>{storyboard?.title || '等待生成'}</p>
              <p className="text-secondary text-sm">{storyboard?.strategy || '生成后展示策略说明'}</p>
              <div style={{ marginTop: 10 }}>
                {storyboard?.creativeTags?.map((tag) => <span key={tag} className="tag">{tag}</span>)}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3>成片导出</h3>
                {project && <span className={project.status === 'completed' ? 'tag tag-green' : 'tag'}>{project.status}</span>}
              </div>
              {outputUrl ? (
                <>
                  <video src={outputUrl} controls style={{ width: '100%', borderRadius: 8, background: '#000', marginBottom: 12 }} />
                  <a className="btn btn-primary" href={outputUrl} target="_blank" rel="noreferrer" style={{ width: '100%' }}>打开成片</a>
                </>
              ) : (
                <p className="text-secondary text-sm">视频完成后会在这里显示预览和导出链接。</p>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
