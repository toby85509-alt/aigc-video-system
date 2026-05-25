interface Step {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  detail?: string;
}

interface Props {
  steps: Step[];
  progress: number;
  status: string;
  error?: string;
}

export default function ProgressTracker({ steps, progress, status }: Props) {
  const color =
    status === 'completed' ? 'success' :
    status === 'failed' ? 'danger' : '';

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="flex justify-between items-center mb-4">
        <h3 style={{ fontSize: 14, fontWeight: 600 }}>任务进度</h3>
        <span className={`tag ${status === 'completed' ? 'tag-green' : status === 'failed' ? 'tag-red' : ''}`}>
          {status === 'completed' ? '已完成' : status === 'failed' ? '失败' : status === 'running' ? '进行中' : '排队中'}
        </span>
      </div>
      <div className="progress-bar" style={{ marginBottom: 16 }}>
        <div className={`progress-fill ${color}`} style={{ width: `${progress}%` }} />
      </div>
      <div className="timeline">
        {steps.map((step, i) => (
          <div key={i} className={`timeline-item ${step.status}`}>
            <div style={{ fontWeight: 500 }}>{step.name}</div>
            {step.detail && <div className="text-sm text-secondary">{step.detail}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
