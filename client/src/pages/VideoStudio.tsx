import { useEffect, useState, useCallback } from 'react';
import { videosApi, scriptsApi, materialsApi, abTestApi } from '../api/client';
import VideoPreview from '../components/VideoPreview';

export default function VideoStudio() {
  const [projects, setProjects] = useState<any[]>([]);
  const [scripts, setScripts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 创建视频
  const [showNew, setShowNew] = useState(false);
  const [selectedScriptId, setSelectedScriptId] = useState('');
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
  const [resolution, setResolution] = useState<'9:16' | '16:9'>('9:16');
  const [videoName, setVideoName] = useState('');
  const [creating, setCreating] = useState(false);

  // A/B 对比模式
  const [abMode, setAbMode] = useState(false);
  const [abVariants, setAbVariants] = useState<any[]>([]);
  const [abProjects, setAbProjects] = useState<any[]>([]);
  const [abGenerating, setAbGenerating] = useState(false);

  // 当前项目
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [enrichedShots, setEnrichedShots] = useState<any[]>([]);
  const [productImageUrl, setProductImageUrl] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    const [projRes, scrRes] = await Promise.all([
      videosApi.list(),
      scriptsApi.list(),
    ]);
    setProjects(projRes.items);
    setScripts(scrRes.items);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Enrich shots when project is selected
  useEffect(() => {
    if (!selectedProject) { setEnrichedShots([]); if (!abMode) setProductImageUrl(''); return; }
    (async () => {
      let shotDetails: any[] = [];
      try {
        const sbRes = await scriptsApi.get(selectedProject.storyboardId);
        shotDetails = sbRes.data.shots || [];
      } catch {}
      let imgUrl = '';
      try {
        if (selectedProject.materialIds?.length > 0) {
          const matRes = await materialsApi.get(selectedProject.materialIds[0]);
          imgUrl = matRes.data?.url || '';
        }
      } catch {}
      setProductImageUrl(imgUrl);
      const merged = (selectedProject.shots || []).map((ps: any) => {
        const detail = shotDetails.find((sd: any) => sd.id === ps.shotId);
        return {
          ...ps,
          description: detail?.description || '',
          cameraMovement: detail?.cameraMovement || '静态',
          duration: detail?.duration || (ps.endTime - ps.startTime),
          narration: detail?.narration || '',
          subtitle: detail?.subtitle || '',
          transition: detail?.transition || 'cut',
          bgm: detail?.bgm || '',
        };
      });
      setEnrichedShots(merged);
    })();
  }, [selectedProject]);

  // Poll generating project
  useEffect(() => {
    if (!selectedProject || selectedProject.status !== 'generating') return;
    const interval = setInterval(async () => {
      const res = await videosApi.get(selectedProject.id);
      setSelectedProject(res.data);
      if (res.data.status === 'completed' || res.data.status === 'failed') {
        clearInterval(interval);
        load();
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [selectedProject?.status]);

  const handleCreate = async () => {
    if (!selectedScriptId) return;
    setCreating(true);
    try {
      const res = await videosApi.create({
        storyboardId: selectedScriptId,
        materialIds: selectedMaterialIds,
        resolution,
        name: videoName || undefined,
      });
      setShowNew(false);
      setSelectedProject(res.data);
      load();
    } catch (err: any) {
      alert('创建失败: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  // ── A/B 对比：并行生成多套剧本 ──
  const handleABGenerate = async () => {
    if (scripts.length === 0) return;
    setAbGenerating(true);
    setAbVariants([]);
    setAbProjects([]);

    try {
      // 获取第一个剧本的 productInfo 来生成 A/B
      const firstScript = scripts[0];
      const sbDetail = await scriptsApi.get(firstScript.id);
      const productInfo = {
        title: firstScript.title || '商品',
        category: '电子产品',
        description: '',
        sellingPoints: ['主动降噪', '超长续航', '舒适佩戴'],
        targetAudience: '年轻白领',
        scene: '日常通勤',
      };

      // Step 1: 并行生成3套剧本
      const abRes = await abTestApi.generateScripts({
        productInfo,
        templateIds: ['template_1', 'template_2', 'template_3'],
      });

      const variants = abRes.data;
      setAbVariants(variants);

      // Get material IDs from existing projects
      const materialIds = projects.length > 0 ? projects[0].materialIds || [] : [];

      // Fetch product image URL for A/B previews
      if (materialIds.length > 0) {
        try {
          const matRes = await materialsApi.get(materialIds[0]);
          const imgUrl = matRes.data?.url || '';
          setProductImageUrl(imgUrl);
        } catch {}
      }

      // Step 2: 并行创建3个视频
      const videoRes = await abTestApi.createVideos({
        storyboardIds: variants.map((v: any) => v.storyboard.id),
        materialIds,
        resolution: '9:16',
        namePrefix: 'A/B测试',
      });

      setAbProjects(videoRes.data);
      load();
    } catch (err: any) {
      alert('A/B 生成失败: ' + err.message);
    } finally {
      setAbGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确认删除？')) return;
    await videosApi.delete(id);
    load();
  };

  if (loading) return <div className="page-body"><div className="empty-state">加载中...</div></div>;

  return (
    <>
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1>视频创作</h1>
            <p>一键成片 · A/B 对比 · 智能剪辑 · 分镜干预</p>
          </div>
          <div className="flex gap-2">
            <button
              className={`btn ${abMode ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setAbMode(!abMode)}
              disabled={abGenerating}
            >
              {abMode ? '退出A/B模式' : '🔬 A/B 对比出片'}
            </button>
            <button className="btn btn-primary" onClick={() => setShowNew(true)} disabled={scripts.length === 0}>
              + 一键成片
            </button>
          </div>
        </div>
      </div>
      <div className="page-body">
        {/* ── A/B 对比模式 ── */}
        {abMode && (
          <div className="card" style={{ marginBottom: 24, border: '2px solid #6366f1' }}>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600 }}>🔬 A/B 对比出片</h3>
                <p className="text-sm text-secondary">同一商品 × 3套模板并行生成，对比转化效果</p>
              </div>
              <span className="tag tag-green">P2 加分项</span>
            </div>

            {abVariants.length === 0 && !abGenerating && (
              <div style={{ textAlign: 'center', padding: 24 }}>
                <p className="text-secondary mb-4">使用3种创作策略并行生成剧本和视频，快速对比哪种风格转化效果最优</p>
                <button className="btn btn-primary btn-lg" onClick={handleABGenerate}>
                  🚀 开始 A/B 对比生成
                </button>
              </div>
            )}

            {abGenerating && (
              <div style={{ textAlign: 'center', padding: 24 }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>⏳</div>
                <p>正在并行生成3套剧本和视频...</p>
              </div>
            )}

            {abVariants.length > 0 && (
              <>
                {/* 效果预估对比 */}
                <div className="grid grid-3" style={{ marginBottom: 20 }}>
                  {abVariants.map((v: any, i: number) => {
                    const isWinner = v.metrics.score === Math.max(...abVariants.map((x: any) => x.metrics.score));
                    return (
                      <div key={i} style={{
                        border: isWinner ? '2px solid #10b981' : '1px solid var(--border)',
                        borderRadius: 8, padding: 16, textAlign: 'center',
                        background: isWinner ? '#ecfdf5' : 'var(--surface)',
                        position: 'relative',
                      }}>
                        {isWinner && (
                          <div style={{
                            position: 'absolute', top: -10, right: -10,
                            background: '#10b981', color: '#fff', borderRadius: 100,
                            padding: '2px 8px', fontSize: 11, fontWeight: 700,
                          }}>
                            最优
                          </div>
                        )}
                        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{v.templateName}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                          {v.storyboard.shots?.length || 0} 分镜
                        </div>
                        <div className="grid grid-3" style={{ gap: 8, marginBottom: 8 }}>
                          <div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: '#6366f1' }}>{v.metrics.estimatedCTR}%</div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>点击率</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: '#10b981' }}>{v.metrics.estimatedConversion}%</div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>转化率</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: '#f59e0b' }}>{v.metrics.estimatedWatchTime}s</div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>观看时长</div>
                          </div>
                        </div>
                        <div style={{
                          fontSize: 24, fontWeight: 700,
                          color: isWinner ? '#10b981' : 'var(--text-secondary)',
                        }}>
                          {v.metrics.score}分
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 并排视频预览 */}
                {abProjects.length > 0 && (
                  <>
                    <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>视频并排预览</h4>
                    <div className="grid grid-3" style={{ gap: 12 }}>
                      {abProjects.map((proj: any, i: number) => (
                        <div key={i} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                            {abVariants[i]?.templateName || `变体 ${i + 1}`}
                          </div>
                          <VideoPreview
                            projectId={proj.id}
                            status={proj.status}
                            progress={proj.progress}
                            outputUrl={proj.outputUrl}
                            shots={(proj.shots || []).map((ps: any) => ({
                              ...ps,
                              description: abVariants[i]?.storyboard?.shots?.find((s: any) => s.id === ps.shotId)?.description || '',
                              cameraMovement: abVariants[i]?.storyboard?.shots?.find((s: any) => s.id === ps.shotId)?.cameraMovement || '静态',
                              narration: abVariants[i]?.storyboard?.shots?.find((s: any) => s.id === ps.shotId)?.narration || '',
                              subtitle: abVariants[i]?.storyboard?.shots?.find((s: any) => s.id === ps.shotId)?.subtitle || '',
                              transition: abVariants[i]?.storyboard?.shots?.find((s: any) => s.id === ps.shotId)?.transition || 'cut',
                            }))}
                            productImageUrl={productImageUrl}
                            aspectRatio="9:16"
                          />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* 新建视频 */}
        {showNew && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>一键成片</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowNew(false)}>取消</button>
            </div>
            <div className="grid grid-2">
              <div className="form-group">
                <label>选择剧本 *</label>
                <select className="input" value={selectedScriptId} onChange={(e) => setSelectedScriptId(e.target.value)}>
                  <option value="">请选择剧本</option>
                  {scripts.map((s) => (
                    <option key={s.id} value={s.id}>{s.title} ({s.shots?.length || 0} 分镜)</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>视频名称</label>
                <input className="input" value={videoName} onChange={(e) => setVideoName(e.target.value)}
                  placeholder="留空则使用剧本标题" />
              </div>
            </div>
            <div className="form-group">
              <label>画幅比例</label>
              <select className="input" value={resolution} onChange={(e) => setResolution(e.target.value as '9:16' | '16:9')}>
                <option value="9:16">竖版 9:16 (抖音/TikTok)</option>
                <option value="16:9">横版 16:9 (YouTube/电商主图)</option>
              </select>
            </div>
            <button className="btn btn-primary btn-lg" onClick={handleCreate}
              disabled={creating || !selectedScriptId} style={{ width: '100%' }}>
              {creating ? '准备中...' : '🎬 一键成片'}
            </button>
          </div>
        )}

        {/* 当前项目详情 */}
        {!abMode && selectedProject ? (
          <div style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 12 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedProject(null)}>
                ← 返回列表
              </button>
              <span style={{ marginLeft: 12, fontWeight: 600 }}>{selectedProject.name}</span>
              <span className="text-sm text-secondary" style={{ marginLeft: 8 }}>
                {selectedProject.resolution === '9:16' ? '竖版 9:16' : '横版 16:9'}
              </span>
            </div>
            <div className="grid grid-2" style={{ alignItems: 'start' }}>
              <VideoPreview
                projectId={selectedProject.id}
                status={selectedProject.status}
                progress={selectedProject.progress}
                outputUrl={selectedProject.outputUrl}
                shots={enrichedShots}
                productImageUrl={productImageUrl}
                aspectRatio={selectedProject.resolution || '9:16'}
              />
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>分镜状态</h3>
                {enrichedShots.map((shot: any, i: number) => (
                  <div key={shot.shotId} className="shot-card">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="shot-index">{i + 1}</span>
                        <span className={`tag ${shot.status === 'completed' ? 'tag-green' : shot.status === 'failed' ? 'tag-red' : 'tag-yellow'}`}>
                          {shot.status === 'completed' ? '已完成' : shot.status === 'failed' ? '失败' : shot.status === 'generating' ? '生成中' : '等待'}
                        </span>
                        {shot.cameraMovement && (
                          <span className="text-sm text-secondary">{shot.cameraMovement}</span>
                        )}
                      </div>
                      <span className="text-sm text-secondary">{shot.startTime}s - {shot.endTime}s</span>
                    </div>
                    {shot.description && (
                      <div className="text-sm text-secondary mt-4">{shot.description}</div>
                    )}
                    {shot.subtitle && (
                      <div className="text-sm mt-4" style={{ color: '#6366f1' }}>字幕: {shot.subtitle}</div>
                    )}
                    {shot.status === 'failed' && (
                      <button className="btn btn-secondary btn-sm mt-4"
                        onClick={() => videosApi.rerenderShot(selectedProject.id, shot.shotId)}>
                        重新生成
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          !abMode && (
          /* 项目列表 */
          projects.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎬</div>
              <h3>暂无视频</h3>
              <p>先生成剧本，然后点击"一键成片"开始创作，或使用"A/B 对比出片"并行生成</p>
            </div>
          ) : (
            <div className="table-wrap card">
              <table>
                <thead>
                  <tr>
                    <th>视频名称</th>
                    <th>画幅</th>
                    <th>分镜</th>
                    <th>状态</th>
                    <th>进度</th>
                    <th>创建时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600, cursor: 'pointer' }} onClick={() => setSelectedProject(p)}>
                        {p.name}
                      </td>
                      <td>{p.resolution === '9:16' ? '竖版' : '横版'}</td>
                      <td>{p.shots?.length || 0}</td>
                      <td>
                        <span className={`tag ${p.status === 'completed' ? 'tag-green' : p.status === 'failed' ? 'tag-red' : 'tag-yellow'}`}>
                          {p.status === 'completed' ? '已完成' : p.status === 'failed' ? '失败' : p.status === 'generating' ? '生成中' : '等待中'}
                        </span>
                      </td>
                      <td>
                        <div className="progress-bar" style={{ width: 80 }}>
                          <div className={`progress-fill ${p.status === 'completed' ? 'success' : ''}`}
                            style={{ width: `${p.progress}%` }} />
                        </div>
                      </td>
                      <td className="text-sm text-secondary">{new Date(p.createdAt).toLocaleString()}</td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-secondary btn-sm" onClick={() => setSelectedProject(p)}>查看</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>删除</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ))}
      </div>
    </>
  );
}
