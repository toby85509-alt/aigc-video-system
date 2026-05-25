import { useState } from 'react';
import { scriptsApi } from '../api/client';

interface Shot {
  id: string;
  index: number;
  description: string;
  cameraMovement: string;
  duration: number;
  narration: string;
  subtitle: string;
  transition: string;
}

interface Props {
  shots: Shot[];
  scriptId: string;
  onShotUpdated: (shot: Shot) => void;
}

export default function StoryboardEditor({ shots, scriptId, onShotUpdated }: Props) {
  const [selectedShot, setSelectedShot] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [regenerating, setRegenerating] = useState(false);

  const handleRegenerate = async (shotId: string, instruction: string) => {
    setRegenerating(true);
    try {
      const res = await scriptsApi.regenerateShot(scriptId, shotId, instruction);
      onShotUpdated(res.data);
    } catch (err: any) {
      alert('重生成失败: ' + err.message);
    } finally {
      setRegenerating(false);
    }
  };

  const currentShot = shots.find((s) => s.id === selectedShot);

  return (
    <div className="grid grid-2" style={{ alignItems: 'start' }}>
      {/* 分镜列表 */}
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>分镜列表</h3>
        {shots.map((shot) => (
          <div
            key={shot.id}
            className={`shot-card ${selectedShot === shot.id ? 'selected' : ''}`}
            onClick={() => setSelectedShot(shot.id)}
          >
            <div className="shot-card-header">
              <div className="flex items-center gap-3">
                <span className="shot-index">{shot.index + 1}</span>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{shot.description.slice(0, 30)}...</span>
              </div>
              <span className="shot-duration">{shot.duration}s</span>
            </div>
            <div className="text-sm text-secondary">{shot.narration.slice(0, 50)}...</div>
          </div>
        ))}
      </div>

      {/* 分镜详情编辑 */}
      {currentShot && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>分镜 {currentShot.index + 1} 详情</h3>
          </div>

          <div className="form-group">
            <label>画面描述</label>
            <textarea className="input" value={currentShot.description} rows={3} onChange={(e) => {
              onShotUpdated({ ...currentShot, description: e.target.value });
            }} />
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label>镜头运动</label>
              <input className="input" value={currentShot.cameraMovement}
                onChange={(e) => onShotUpdated({ ...currentShot, cameraMovement: e.target.value })} />
            </div>
            <div className="form-group">
              <label>时长 (秒)</label>
              <input className="input" type="number" step="0.5" value={currentShot.duration}
                onChange={(e) => onShotUpdated({ ...currentShot, duration: parseFloat(e.target.value) || 3 })} />
            </div>
          </div>

          <div className="form-group">
            <label>旁白/台词</label>
            <textarea className="input" value={currentShot.narration} rows={2}
              onChange={(e) => onShotUpdated({ ...currentShot, narration: e.target.value })} />
          </div>

          <div className="form-group">
            <label>字幕内容</label>
            <input className="input" value={currentShot.subtitle}
              onChange={(e) => onShotUpdated({ ...currentShot, subtitle: e.target.value })} />
          </div>

          <div className="form-group">
            <label>转场</label>
            <select className="input" value={currentShot.transition}
              onChange={(e) => onShotUpdated({ ...currentShot, transition: e.target.value })}>
              <option value="cut">硬切 (cut)</option>
              <option value="fade">淡入淡出 (fade)</option>
              <option value="dissolve">叠化 (dissolve)</option>
              <option value="wipe">划像 (wipe)</option>
              <option value="zoom">缩放转场 (zoom)</option>
            </select>
          </div>

          {/* AI 干预 */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4 }}>
            <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, display: 'block' }}>
              AI 智能干预
            </label>
            <div className="flex gap-2">
              <input className="input" placeholder="输入修改指令，如：将台词改得更活泼"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.target as HTMLInputElement).value) {
                    handleRegenerate(currentShot.id, (e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = '';
                  }
                }} />
              <button className="btn btn-primary btn-sm" disabled={regenerating}>
                {regenerating ? '...' : '执行'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
