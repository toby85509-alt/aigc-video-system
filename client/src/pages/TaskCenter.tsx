import { useEffect, useState, useCallback } from 'react';
import type { Task, TaskStep } from '../types';
import { tasksApi } from '../api/client';
import { useToast } from '../context/AppContext';
import { Skeleton } from '../components/Skeleton';

const TYPE_LABELS: Record<string, string> = {
  script_generation: '剧本生成',
  video_generation: '视频生成',
  material_analysis: '素材分析',
  video_export: '视频导出',
  ab_script_generation: 'AB剧本生成',
  ab_video_generation: 'AB视频生成',
};

const TYPE_EMOJI: Record<string, string> = {
  script_generation: '📝',
  video_generation: '🎬',
  material_analysis: '📊',
  video_export: '📦',
  ab_script_generation: '🧪',
  ab_video_generation: '🎥',
};

const STATUS_LABEL: Record<string, string> = {
  completed: '已完成',
  failed: '失败',
  running: '进行中',
  queued: '排队中',
};

const STATUS_TAG_CLASS: Record<string, string> = {
  completed: 'tag-green',
  failed: 'tag-red',
  running: 'tag-yellow',
  queued: 'tag-gray',
};

function SkeletonTaskCard() {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="flex justify-between items-center" style={{ marginBottom: 20 }}>
        <div className="flex items-center gap-3">
          <Skeleton style={{ width: 28, height: 28, borderRadius: '50%' }} />
          <div>
            <Skeleton style={{ width: 80, height: 16, borderRadius: 6, marginBottom: 6 }} />
            <Skeleton style={{ width: 120, height: 12, borderRadius: 4 }} />
          </div>
        </div>
        <Skeleton style={{ width: 52, height: 22, borderRadius: 100 }} />
      </div>
      <Skeleton style={{ width: '100%', height: 6, borderRadius: 100, marginBottom: 20 }} />
      <div style={{ paddingLeft: 24 }}>
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
            <Skeleton style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 4 }} />
            <div style={{ flex: 1 }}>
              <Skeleton style={{ width: 100, height: 14, borderRadius: 6, marginBottom: 4 }} />
              <Skeleton style={{ width: '75%', height: 11, borderRadius: 4 }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 6 }}>
        <Skeleton style={{ width: 220, height: 12, borderRadius: 4 }} />
      </div>
    </div>
  );
}

export default function TaskCenter() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const res = await tasksApi.list(filter || undefined);
      setTasks(res.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载任务列表失败';
      toast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [filter, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  const getStatusTagClass = (status: string) => STATUS_TAG_CLASS[status] || 'tag-gray';
  const getStatusLabel = (status: string) => STATUS_LABEL[status] || status;
  const getTypeLabel = (type: string) => TYPE_LABELS[type] || type;
  const getTypeEmoji = (type: string) => TYPE_EMOJI[type] || '📋';

  const getProgressClass = (status: string) => {
    if (status === 'completed') return 'success';
    if (status === 'failed') return 'danger';
    return '';
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>任务中心</h1>
          <p>查看所有异步任务的执行状态 · 自动刷新</p>
        </div>
        <div className="flex gap-3 mt-4">
          <select
            className="input"
            style={{ width: 160 }}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">全部类型</option>
            <option value="script_generation">剧本生成</option>
            <option value="video_generation">视频生成</option>
            <option value="material_analysis">素材分析</option>
          </select>
        </div>
      </div>

      <div className="page-body">
        {loading && tasks.length === 0 ? (
          <div>
            <SkeletonTaskCard />
            <SkeletonTaskCard />
            <SkeletonTaskCard />
          </div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">⚡</div>
            <h3>暂无任务</h3>
            <p>生成剧本或创建视频后，任务会出现在这里</p>
          </div>
        ) : (
          <div>
            {tasks.map((task) => (
              <div key={task.id} className="card" style={{ marginBottom: 16 }}>
                <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: 20 }}>{getTypeEmoji(task.type)}</span>
                    <div>
                      <div style={{ fontWeight: 600 }}>{getTypeLabel(task.type)}</div>
                      <div className="text-sm text-secondary">{task.id.slice(0, 8)}...</div>
                    </div>
                  </div>
                  <span className={`tag ${getStatusTagClass(task.status)}`}>
                    {getStatusLabel(task.status)}
                  </span>
                </div>

                <div className="progress-bar" style={{ marginBottom: 16 }}>
                  <div
                    className={`progress-fill ${getProgressClass(task.status)}`}
                    style={{ width: `${task.progress}%` }}
                  />
                </div>

                {task.steps && task.steps.length > 0 && (
                  <div className="timeline" style={{ marginBottom: 4 }}>
                    {task.steps.map((step: TaskStep, i: number) => (
                      <div key={i} className={`timeline-item ${step.status}`}>
                        <div style={{ fontWeight: 500 }}>{step.name}</div>
                        {step.detail && (
                          <div className="text-sm text-secondary">{step.detail}</div>
                        )}
                        {step.completedAt && (
                          <div className="text-sm text-secondary">
                            {new Date(step.completedAt).toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {task.status === 'failed' && task.error && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: '10px 14px',
                      background: 'var(--danger-light, #fef2f2)',
                      borderRadius: 'var(--radius)',
                      fontSize: 13,
                      color: 'var(--danger, #dc2626)',
                      lineHeight: 1.5,
                    }}
                  >
                    ⚠️ 错误: {task.error}
                  </div>
                )}

                <div className="text-sm text-secondary" style={{ marginTop: 16 }}>
                  创建于 {new Date(task.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
