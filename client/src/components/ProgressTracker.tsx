import type { TaskStep } from '../types';

interface Props {
  steps: TaskStep[];
  progress: number;
  status?: string;
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'completed':
      return '已完成';
    case 'failed':
      return '失败';
    case 'running':
      return '进行中';
    default:
      return '排队中';
  }
}

export default function ProgressTracker({ steps, progress, status }: Props) {
  const resolvedStatus = status ?? 'pending';
  const color =
    resolvedStatus === 'completed' ? 'success' :
    resolvedStatus === 'failed' ? 'danger' : '';

  const tagClass =
    resolvedStatus === 'completed' ? 'tag-green' :
    resolvedStatus === 'failed' ? 'tag-red' : '';

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="flex justify-between items-center mb-4">
        <h3 style={{ fontSize: 14, fontWeight: 600 }}>任务进度</h3>
        <span className={`tag ${tagClass}`}>
          {getStatusLabel(resolvedStatus)}
        </span>
      </div>
      <div className="progress-bar" style={{ marginBottom: 16 }}>
        <div className={`progress-fill ${color}`} style={{ width: `${progress}%` }} />
      </div>
      <div className="timeline">
        {steps.map((step) => (
          <div key={step.name} className={`timeline-item ${step.status}`}>
            <div style={{ fontWeight: 500 }}>{step.name}</div>
            {step.detail && <div className="text-sm text-secondary">{step.detail}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
