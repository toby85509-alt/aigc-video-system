import { useEffect, useState, useCallback } from 'react';
import { tasksApi } from '../api/client';

export default function TaskCenter() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await tasksApi.list(filter || undefined);
      setTasks(res.data);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  // 自动刷新
  useEffect(() => {
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  const typeLabels: Record<string, string> = {
    script_generation: '剧本生成',
    video_generation: '视频生成',
    material_analysis: '素材分析',
    video_export: '视频导出',
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>任务中心</h1>
          <p>查看所有异步任务的执行状态 · 自动刷新</p>
        </div>
        <div className="flex gap-3 mt-4">
          <select className="input" style={{ width: 160 }} value={filter}
            onChange={(e) => setFilter(e.target.value)}>
            <option value="">全部类型</option>
            <option value="script_generation">剧本生成</option>
            <option value="video_generation">视频生成</option>
            <option value="material_analysis">素材分析</option>
          </select>
        </div>
      </div>
      <div className="page-body">
        {tasks.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚡</div>
            <h3>暂无任务</h3>
            <p>生成剧本或创建视频后，任务会出现在这里</p>
          </div>
        ) : (
          <div>
            {tasks.map((task) => (
              <div key={task.id} className="card" style={{ marginBottom: 16 }}>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: 20 }}>
                      {task.type === 'script_generation' ? '📝' : task.type === 'video_generation' ? '🎬' : '📊'}
                    </span>
                    <div>
                      <div style={{ fontWeight: 600 }}>{typeLabels[task.type] || task.type}</div>
                      <div className="text-sm text-secondary">{task.id.slice(0, 8)}...</div>
                    </div>
                  </div>
                  <span className={`tag ${task.status === 'completed' ? 'tag-green' : task.status === 'failed' ? 'tag-red' : task.status === 'running' ? 'tag-yellow' : ''}`}>
                    {task.status === 'completed' ? '已完成' : task.status === 'failed' ? '失败' : task.status === 'running' ? '进行中' : '排队中'}
                  </span>
                </div>

                <div className="progress-bar" style={{ marginBottom: 12 }}>
                  <div className={`progress-fill ${task.status === 'completed' ? 'success' : task.status === 'failed' ? 'danger' : ''}`}
                    style={{ width: `${task.progress}%` }} />
                </div>

                <div className="timeline">
                  {task.steps?.map((step: any, i: number) => (
                    <div key={i} className={`timeline-item ${step.status}`}>
                      <div style={{ fontWeight: 500 }}>{step.name}</div>
                      {step.detail && <div className="text-sm text-secondary">{step.detail}</div>}
                      {step.completedAt && (
                        <div className="text-sm text-secondary">
                          {new Date(step.completedAt).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {task.status === 'failed' && task.error && (
                  <div style={{ marginTop: 12, padding: 8, background: '#fef2f2', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>
                    错误: {task.error}
                  </div>
                )}

                <div className="text-sm text-secondary mt-4">
                  创建于 {new Date(task.createdAt).toLocaleString()}
                  {task.completedAt && ` · 完成于 ${new Date(task.completedAt).toLocaleString()}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
