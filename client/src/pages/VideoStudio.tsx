import { useEffect, useState, useCallback } from 'react';
import type { MaterialAsset, VideoProject, Storyboard, Shot, Resolution, VideoShot, VideoShotStatus } from '../types';
import { agentApi, complianceApi, videosApi, scriptsApi, materialsApi, abTestApi } from '../api/client';
import { useToast } from '../context/AppContext';
import { SkeletonTable } from '../components/Skeleton';
import VideoPreview from '../components/VideoPreview';

interface ABVariantResult {
  templateName: string;
  storyboard: Storyboard;
  metrics: {
    estimatedCTR: number;
    estimatedConversion: number;
    estimatedWatchTime: number;
    score: number;
  };
}

interface EnrichedShot {
  shotId: string;
  shotNumber: number;
  status: VideoShotStatus;
  startTime: number;
  endTime: number;
  outputUrl: string;
  videoUrl: string;
  description: string;
  cameraMovement: string;
  duration: number;
  narration: string;
  subtitle: string;
  transition: string;
  bgm: string;
}

function statusLabel(status: string): string {
  switch (status) {
    case 'generating': return '生成中';
    case 'completed': return '已完成';
    case 'failed': return '失败';
    default: return status;
  }
}

function statusTagClass(status: string): string {
  switch (status) {
    case 'generating': return 'tag tag-yellow';
    case 'completed': return 'tag tag-green';
    case 'failed': return 'tag tag-red';
    default: return 'tag';
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function VideoStudio() {
  const toast = useToast();

  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [scripts, setScripts] = useState<Storyboard[]>([]);
  const [materials, setMaterials] = useState<MaterialAsset[]>([]);
  const [loading, setLoading] = useState(true);

  const [showNew, setShowNew] = useState(false);
  const [selectedScriptId, setSelectedScriptId] = useState('');
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
  const [resolution, setResolution] = useState<Resolution>('9:16');
  const [videoName, setVideoName] = useState('');
  const [creating, setCreating] = useState(false);

  const [abMode, setAbMode] = useState(false);
  const [abVariants, setAbVariants] = useState<ABVariantResult[]>([]);
  const [abProjects, setAbProjects] = useState<VideoProject[]>([]);
  const [abGenerating, setAbGenerating] = useState(false);

  const [selectedProject, setSelectedProject] = useState<VideoProject | null>(null);
  const [enrichedShots, setEnrichedShots] = useState<EnrichedShot[]>([]);
  const [productImageUrl, setProductImageUrl] = useState<string>('');
  const [expandedShot, setExpandedShot] = useState<string | null>(null);
  const [agentPipeline, setAgentPipeline] = useState<Record<string, unknown> | null>(null);
  const [videoCompliance, setVideoCompliance] = useState<Record<string, unknown> | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const [projRes, scrRes] = await Promise.all([
        videosApi.list(),
        scriptsApi.list(),
      ]);
      const materialRes = await materialsApi.list();
      setProjects(projRes.items);
      setScripts(scrRes.items);
      setMaterials(materialRes.items || []);
    } catch {
      toast('加载数据失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  useEffect(() => {
    if (!selectedProject) {
      setEnrichedShots([]);
      if (!abMode) setProductImageUrl('');
      setAgentPipeline(null);
      setVideoCompliance(null);
      return;
    }
    let cancelled = false;
    (async () => {
      let shotDetails: Shot[] = [];
      try {
        const sbRes = await scriptsApi.get(selectedProject.storyboardId);
        if (!cancelled) shotDetails = sbRes.data.shots || [];
      } catch { /* ignore */ }

      let imgUrl = '';
      try {
        if (selectedProject.materialIds?.length > 0) {
          const matRes = await materialsApi.get(selectedProject.materialIds[0]);
          if (!cancelled) imgUrl = (matRes.data as unknown as Record<string, unknown>).url as string || '';
        }
      } catch { /* ignore */ }

      if (cancelled) return;
      setProductImageUrl(imgUrl);

      let cumulativeTime = 0;
      const merged: EnrichedShot[] = (selectedProject.shots || []).map((ps: VideoShot) => {
        const detail = shotDetails.find((sd: Shot) => sd.id === ps.shotId);
        const shotDuration = detail?.duration || ps.duration || 3;
        const startTime = cumulativeTime;
        const endTime = cumulativeTime + shotDuration;
        cumulativeTime = endTime;
        return {
          shotId: ps.shotId,
          shotNumber: Math.max(shotDetails.findIndex((sd: Shot) => sd.id === ps.shotId) + 1, 1),
          status: ps.status,
          startTime,
          endTime,
          outputUrl: ps.outputUrl || '',
          videoUrl: ps.videoUrl || '',
          description: detail?.description || '',
          cameraMovement: detail?.cameraMovement || '静态',
          duration: shotDuration,
          narration: detail?.narration || '',
          subtitle: detail?.subtitle || '',
          transition: detail?.transition || 'cut',
          bgm: detail?.bgm || '',
        };
      });
      setEnrichedShots(merged);
    })();
    return () => { cancelled = true; };
  }, [selectedProject, abMode]);

  useEffect(() => {
    if (!selectedProject || selectedProject.status !== 'generating') return;
    const interval = setInterval(async () => {
      try {
        const res = await videosApi.get(selectedProject.id);
        setSelectedProject(res.data);
        if (res.data.status === 'completed' || res.data.status === 'failed') {
          loadProjects();
        }
      } catch { /* ignore */ }
    }, 2000);
    return () => clearInterval(interval);
  }, [selectedProject?.id, selectedProject?.status, loadProjects]);

  const handleCreateVideo = async () => {
    if (!selectedScriptId) return;
    setCreating(true);
    try {
      const res = await videosApi.create({
        storyboardId: selectedScriptId,
        materialIds: selectedMaterialIds,
        resolution,
        name: videoName || undefined,
      } as Parameters<typeof videosApi.create>[0]);
      setShowNew(false);
      setSelectedProject(res.data);
      loadProjects();
      toast('视频生成任务已创建', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '创建失败';
      toast('创建失败: ' + message, 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateAB = async () => {
    if (scripts.length === 0) return;
    setAbGenerating(true);
    setAbVariants([]);
    setAbProjects([]);

    try {
      const firstScript = scripts[0];
      await scriptsApi.get(firstScript.id);
      const productInfo = {
        title: firstScript.title || '商品',
        category: '电子产品' as const,
        sellingPoints: ['主动降噪', '超长续航', '舒适佩戴'],
        targetAudience: '年轻白领',
        scene: firstScript.productInfo?.scene || '日常通勤',
        price: '',
        id: firstScript.productId || firstScript.productInfo?.id || '',
      };

      const abRes = await abTestApi.generateScripts({
        productInfo,
        templateIds: ['template_1', 'template_2', 'template_3'],
      });

      const variants = abRes.data as unknown as ABVariantResult[];
      setAbVariants(variants);

      const materialIds = projects.length > 0 ? projects[0].materialIds || [] : [];

      if (materialIds.length > 0) {
        try {
          const matRes = await materialsApi.get(materialIds[0]);
          const imgUrl = (matRes.data as unknown as Record<string, unknown>).url as string || '';
          setProductImageUrl(imgUrl);
        } catch { /* ignore */ }
      }

      const videoRes = await abTestApi.createVideos({
        storyboardIds: variants.map((v) => v.storyboard.id),
        materialIds,
        resolution: '9:16',
        namePrefix: 'A/B测试',
      });

      setAbProjects(videoRes.data as unknown as VideoProject[]);
      loadProjects();
      toast('A/B 对比视频已开始生成', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'A/B生成失败';
      toast('A/B 生成失败: ' + message, 'error');
    } finally {
      setAbGenerating(false);
    }
  };

  const handleRerenderShot = async (projectId: string, shotId: string) => {
    try {
      const res = await videosApi.rerenderShot(projectId, shotId);
      if (selectedProject) setSelectedProject(res.data);
      toast('已提交重新生成', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '重新生成失败';
      toast('重新生成失败: ' + message, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确认删除？')) return;
    try {
      await videosApi.delete(id);
      toast('视频已删除', 'success');
      if (selectedProject?.id === id) setSelectedProject(null);
      loadProjects();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '删除失败';
      toast('删除失败: ' + message, 'error');
    }
  };

  const handleCreateAgentPipeline = async () => {
    if (!selectedProject) return;
    const materialId = selectedProject.materialIds?.[0];
    if (!materialId) {
      toast('请先为视频项目选择至少一个素材', 'warning');
      return;
    }
    try {
      const res = await agentApi.createPipeline({
        materialId,
        storyboardId: selectedProject.storyboardId,
        resolution: selectedProject.resolution,
        name: `${selectedProject.name} Agent 管线`,
      });
      setAgentPipeline(res.data);
      toast('Agent 管线已启动', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Agent 管线启动失败';
      toast(message, 'error');
    }
  };

  const handleVideoCompliance = async () => {
    if (!selectedProject) return;
    try {
      const res = await complianceApi.checkVideo(selectedProject.id);
      setVideoCompliance(res.data);
      const status = res.data.status as string;
      toast(status === 'pass' ? '视频合规检查通过' : '视频合规检查完成', status === 'pass' ? 'success' : 'warning');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '视频合规检查失败';
      toast(message, 'error');
    }
  };

  if (loading) {
    return (
      <>
        <div className="page-header">
          <div>
            <h1>视频创作</h1>
            <p>一键成片 · A/B 对比 · 智能剪辑 · 分镜干预</p>
          </div>
        </div>
        <div className="page-body">
          <SkeletonTable rows={6} cols={7} />
        </div>
      </>
    );
  }

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
              {abMode ? '退出A/B模式' : '\uD83D\uDD2C A/B 对比出片'}
            </button>
            <button className="btn btn-primary" onClick={() => setShowNew(true)} disabled={scripts.length === 0}>
              + 一键成片
            </button>
          </div>
        </div>
      </div>

      <div className="page-body">
        {abMode && (
          <div className="card" style={{ marginBottom: 24, border: '2px solid #6366f1' }}>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600 }}>{'\uD83D\uDD2C'} A/B 对比出片</h3>
                <p className="text-sm text-secondary">同一商品 × 3套模板并行生成，对比转化效果</p>
              </div>
              <span className="tag tag-green">P2 加分项</span>
            </div>

            {abVariants.length === 0 && !abGenerating && (
              <div style={{ textAlign: 'center', padding: 24 }}>
                <p className="text-secondary mb-4">使用3种创作策略并行生成剧本和视频，快速对比哪种风格转化效果最优</p>
                <button className="btn btn-primary btn-lg" onClick={handleCreateAB}>
                  {'\uD83D\uDE80'} 开始 A/B 对比生成
                </button>
              </div>
            )}

            {abGenerating && (
              <div style={{ textAlign: 'center', padding: 24 }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>{'\u23F3'}</div>
                <p>正在并行生成3套剧本和视频...</p>
              </div>
            )}

            {abVariants.length > 0 && (
              <>
                <div className="grid grid-3" style={{ marginBottom: 20 }}>
                  {abVariants.map((v, i) => {
                    const isWinner = v.metrics.score === Math.max(...abVariants.map((x) => x.metrics.score));
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

                {abProjects.length > 0 && (
                  <div className="grid grid-3 gap-3">
                    {abProjects.map((p) => {
                      let abCumulative = 0;
                      return (
                      <VideoPreview
                        key={p.id}
                        projectId={p.id}
                        status={p.status}
                        progress={p.progress ?? 0}
                        outputUrl={p.outputUrl || undefined}
                        shots={(p.shots || []).map((s) => {
                          const d = s.duration || 3;
                          const st = abCumulative;
                          const et = st + d;
                          abCumulative = et;
                          return {
                            shotId: s.shotId,
                            status: s.status,
                            startTime: st,
                            endTime: et,
                            videoUrl: (s as any).videoUrl || '',
                          };
                        })}
                        productImageUrl={productImageUrl || undefined}
                        aspectRatio={p.resolution || '9:16'}
                      />
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {selectedProject && (
          <div style={{ marginBottom: 24 }}>
            <div className="flex items-center gap-3 mb-4">
              <button className="btn btn-secondary" onClick={() => setSelectedProject(null)}>
                {'\u2190'} 返回列表
              </button>
              <h2 style={{ fontSize: 18, fontWeight: 600 }}>{selectedProject.name}</h2>
              <span className={statusTagClass(selectedProject.status)}>
                {statusLabel(selectedProject.status)}
              </span>
              <button className="btn btn-secondary btn-sm" onClick={handleCreateAgentPipeline}>
                启动 Agent 管线
              </button>
              <button className="btn btn-secondary btn-sm" onClick={handleVideoCompliance}>
                合规检查
              </button>
            </div>
            {(agentPipeline || videoCompliance) && (
              <div className="card" style={{ marginBottom: 16 }}>
                {agentPipeline && (
                  <div className="text-sm">
                    Agent 管线: <strong>{agentPipeline.status as string}</strong>
                    {' · '}进度 {agentPipeline.progress as number}%
                  </div>
                )}
                {videoCompliance && (
                  <div className="text-sm" style={{ marginTop: agentPipeline ? 8 : 0 }}>
                    合规结果: <strong>{videoCompliance.status as string}</strong>
                    {Array.isArray(videoCompliance.reasons) && videoCompliance.reasons.length > 0 && (
                      <span className="text-secondary"> · {(videoCompliance.reasons as string[]).join('；')}</span>
                    )}
                  </div>
                )}
              </div>
            )}

            <VideoPreview
              projectId={selectedProject.id}
              status={selectedProject.status}
              progress={selectedProject.progress ?? 0}
              outputUrl={selectedProject.outputUrl || undefined}
              shots={enrichedShots.map((s) => ({
                shotId: s.shotId,
                status: s.status,
                startTime: s.startTime,
                endTime: s.endTime,
                description: s.description,
                cameraMovement: s.cameraMovement,
                duration: s.duration,
                narration: s.narration,
                subtitle: s.subtitle,
                transition: s.transition,
                bgm: s.bgm,
                videoUrl: s.videoUrl,
              }))}
              productImageUrl={productImageUrl || undefined}
              aspectRatio={selectedProject.resolution}
            />

            <div className="card" style={{ marginTop: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>分镜状态（总时长 {enrichedShots.length > 0 ? enrichedShots[enrichedShots.length - 1].endTime.toFixed(1) : '0'}s）</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {enrichedShots.map((shot) => (
                  <div key={shot.shotId}>
                    <div
                      className="flex items-center justify-between"
                      style={{
                        padding: '10px 14px',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        background: 'var(--surface)',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span style={{ fontWeight: 600, fontSize: 13 }}>
                          镜头 {shot.shotNumber}
                        </span>
                        <span className={statusTagClass(shot.status)}>
                          {statusLabel(shot.status)}
                        </span>
                        <span className="text-sm text-secondary">
                          {shot.duration > 0 ? shot.duration.toFixed(1) + 's' : '-'}
                        </span>
                        {shot.videoUrl && (
                          <span style={{ fontSize: 11, color: '#10b981' }}>● 已生成视频</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {shot.videoUrl && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setExpandedShot(expandedShot === shot.shotId ? null : shot.shotId)}
                          >
                            {expandedShot === shot.shotId ? '收起视频' : '▶ 播放'}
                          </button>
                        )}
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleRerenderShot(selectedProject.id, shot.shotId)}
                          disabled={shot.status === 'generating'}
                        >
                          重新生成
                        </button>
                      </div>
                    </div>
                    {expandedShot === shot.shotId && shot.videoUrl && (
                      <div style={{
                        marginTop: 8, padding: '10px 14px',
                        border: '1px solid var(--border)',
                        borderRadius: 8, background: '#000',
                      }}>
                        <video
                          src={shot.videoUrl}
                          controls
                          autoPlay
                          playsInline
                          style={{ width: '100%', maxHeight: 360, display: 'block', borderRadius: 4 }}
                        />
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-sm text-secondary">
                            镜头 {shot.shotNumber} · {shot.duration.toFixed(1)}s · {shot.description?.slice(0, 30)}...
                          </span>
                          <a
                            href={shot.videoUrl}
                            download
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: 12 }}
                          >
                            下载
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!selectedProject && (
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>项目列表</h3>
            {projects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>
                暂无视频项目，点击“一键成片”开始创作
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>视频名称</th>
                      <th>分辨率</th>
                      <th>状态</th>
                      <th>分镜进度</th>
                      <th>创建时间</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p) => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 500 }}>{p.name}</td>
                        <td>{p.resolution}</td>
                        <td>
                          <span className={statusTagClass(p.status)}>
                            {statusLabel(p.status)}
                          </span>
                        </td>
                        <td>
                          {p.shots?.filter((s) => s.status === 'completed').length ?? 0}/{p.shots?.length ?? 0}
                        </td>
                        <td className="text-sm text-secondary">{formatTime(p.createdAt)}</td>
                        <td>
                          <div className="flex gap-2">
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => setSelectedProject(p)}
                            >
                              查看
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ color: '#ef4444' }}
                              onClick={() => handleDelete(p.id)}
                            >
                              删除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {showNew && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
          }}
          onClick={() => setShowNew(false)}
        >
          <div
            className="card"
            style={{ width: 460, maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>一键成片</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowNew(false)}>
                {'\u2715'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
                <label className="text-sm text-secondary" style={{ display: 'block', marginBottom: 6 }}>
                  选择剧本
                </label>
                <select
                  className="input"
                  value={selectedScriptId}
                  onChange={(e) => {
                    setSelectedScriptId(e.target.value);
                    const script = scripts.find((s) => s.id === e.target.value);
                    if (script) {
                      const matchedMaterials = materials.filter((m) => (
                        m.productInfo?.id && m.productInfo.id === script.productId
                      ));
                      setSelectedMaterialIds(matchedMaterials.map((m) => m.id));
                    }
                  }}
                  style={{ width: '100%' }}
                >
                  <option value="">-- 请选择剧本 --</option>
                  {scripts.map((s) => (
                    <option key={s.id} value={s.id}>{s.title || s.id}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-secondary" style={{ display: 'block', marginBottom: 6 }}>
                  选择素材（用于图生视频首帧）
                </label>
                <div style={{
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: 10,
                  maxHeight: 150,
                  overflowY: 'auto',
                  background: 'var(--surface)',
                }}>
                  {materials.length === 0 ? (
                    <div className="text-sm text-secondary">暂无素材，可先到素材管理上传商品图</div>
                  ) : (
                    materials.map((material) => (
                      <label
                        key={material.id}
                        className="text-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: 'pointer' }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedMaterialIds.includes(material.id)}
                          onChange={(e) => {
                            setSelectedMaterialIds((prev) => (
                              e.target.checked
                                ? [...prev, material.id]
                                : prev.filter((id) => id !== material.id)
                            ));
                          }}
                        />
                        <span>{material.type === 'image' ? '图片' : '视频'}</span>
                        <span style={{ fontWeight: 500 }}>{material.name}</span>
                        <span className="text-secondary">· {material.productInfo?.title || material.category}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm text-secondary" style={{ display: 'block', marginBottom: 6 }}>
                  视频分辨率
                </label>
                <div className="flex gap-3">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="resolution"
                      value="9:16"
                      checked={resolution === '9:16'}
                      onChange={() => setResolution('9:16')}
                    />
                    9:16 (竖屏)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="resolution"
                      value="16:9"
                      checked={resolution === '16:9'}
                      onChange={() => setResolution('16:9')}
                    />
                    16:9 (横屏)
                  </label>
                </div>
              </div>

              <div>
                <label className="text-sm text-secondary" style={{ display: 'block', marginBottom: 6 }}>
                  视频名称
                </label>
                <input
                  className="input"
                  type="text"
                  placeholder="输入视频名称（选填）"
                  value={videoName}
                  onChange={(e) => setVideoName(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <button
                className="btn btn-primary"
                onClick={handleCreateVideo}
                disabled={!selectedScriptId || creating}
                style={{ width: '100%' }}
              >
                {creating ? '创建中...' : '开始生成视频'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
