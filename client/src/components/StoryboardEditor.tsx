import { useState, useRef, useCallback } from 'react';
import { scriptsApi } from '../api/client';
import { useToast } from '../context/AppContext';

interface ShotView {
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
  shots: ShotView[];
  scriptId: string;
  onShotUpdated: (shot: ShotView) => void;
  onShotsReordered?: (shots: ShotView[]) => void;
}

export default function StoryboardEditor({ shots, scriptId, onShotUpdated, onShotsReordered }: Props) {
  const toast = useToast();
  const [selectedShot, setSelectedShot] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const instructionRef = useRef<HTMLInputElement>(null);

  const handleRegenerate = async (shotId: string, instruction: string) => {
    setRegenerating(true);
    try {
      const res = await scriptsApi.regenerateShot(scriptId, shotId, instruction);
      const shot = res.data as unknown as ShotView;
      onShotUpdated(shot);
      toast('AI 干预成功', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '重生成失败';
      toast('重生成失败: ' + message, 'error');
    } finally {
      setRegenerating(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    setDropIndex(index);
  };

  const handleDragLeave = () => {
    setDropIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === targetIndex || !onShotsReordered) {
      setDragIndex(null);
      setDropIndex(null);
      return;
    }

    const reordered = [...shots];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    const reindexed = reordered.map((s, i) => ({ ...s, index: i }));
    onShotsReordered(reindexed);
    setDragIndex(null);
    setDropIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDropIndex(null);
  };

  const moveShotUp = useCallback(() => {
    if (!selectedShot || !onShotsReordered) return;
    const idx = shots.findIndex((s) => s.id === selectedShot);
    if (idx <= 0) return;
    const reordered = [...shots];
    [reordered[idx - 1], reordered[idx]] = [reordered[idx], reordered[idx - 1]];
    onShotsReordered(reordered.map((s, i) => ({ ...s, index: i })));
  }, [selectedShot, shots, onShotsReordered]);

  const moveShotDown = useCallback(() => {
    if (!selectedShot || !onShotsReordered) return;
    const idx = shots.findIndex((s) => s.id === selectedShot);
    if (idx < 0 || idx >= shots.length - 1) return;
    const reordered = [...shots];
    [reordered[idx], reordered[idx + 1]] = [reordered[idx + 1], reordered[idx]];
    onShotsReordered(reordered.map((s, i) => ({ ...s, index: i })));
  }, [selectedShot, shots, onShotsReordered]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!selectedShot || !onShotsReordered) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowUp') {
        e.preventDefault();
        moveShotUp();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowDown') {
        e.preventDefault();
        moveShotDown();
      }
    },
    [selectedShot, onShotsReordered, moveShotUp, moveShotDown],
  );

  const currentShot = shots.find((s) => s.id === selectedShot);

  return (
    <div className="grid grid-2" style={{ alignItems: 'start' }} onKeyDown={handleKeyDown} tabIndex={-1}>
      <div>
        <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>分镜列表</h3>
          {onShotsReordered && (
            <span className="text-xs text-secondary">Ctrl+↑↓ 排序</span>
          )}
        </div>
        {shots.map((shot, i) => (
          <div
            key={shot.id}
            className={`shot-card ${selectedShot === shot.id ? 'selected' : ''} ${
              dropIndex === i ? 'drop-target' : ''
            } ${dragIndex === i ? 'dragging' : ''}`}
            onClick={() => setSelectedShot(shot.id)}
            draggable={!!onShotsReordered}
            onDragStart={(e) => handleDragStart(e, i)}
            onDragOver={(e) => handleDragOver(e, i)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, i)}
            onDragEnd={handleDragEnd}
          >
            {onShotsReordered && (
              <span className="drag-handle" title="拖拽排序">
                <svg width="14" height="18" viewBox="0 0 14 18" fill="none">
                  <circle cx="4" cy="3" r="1.5" fill="currentColor" opacity="0.5" />
                  <circle cx="10" cy="3" r="1.5" fill="currentColor" opacity="0.5" />
                  <circle cx="4" cy="9" r="1.5" fill="currentColor" opacity="0.5" />
                  <circle cx="10" cy="9" r="1.5" fill="currentColor" opacity="0.5" />
                  <circle cx="4" cy="15" r="1.5" fill="currentColor" opacity="0.5" />
                  <circle cx="10" cy="15" r="1.5" fill="currentColor" opacity="0.5" />
                </svg>
              </span>
            )}
            <div className="shot-card-body">
              <div className="shot-card-header">
                <div className="flex items-center gap-3">
                  <span className="shot-index">{i + 1}</span>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>
                    {shot.description.slice(0, 30)}...
                  </span>
                </div>
                <span className="shot-duration">{shot.duration}s</span>
              </div>
              <div className="text-sm text-secondary">
                {shot.narration.slice(0, 50)}...
              </div>
            </div>
          </div>
        ))}
      </div>

      {currentShot && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>
              分镜 {currentShot.index + 1} 详情
            </h3>
            {onShotsReordered && (
              <div className="flex gap-1">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={moveShotUp}
                  disabled={currentShot.index === 0}
                  title="上移 (Ctrl+↑)"
                >
                  ↑
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={moveShotDown}
                  disabled={currentShot.index === shots.length - 1}
                  title="下移 (Ctrl+↓)"
                >
                  ↓
                </button>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>画面描述</label>
            <textarea
              className="input"
              value={currentShot.description}
              rows={3}
              onChange={(e) => {
                onShotUpdated({ ...currentShot, description: e.target.value });
              }}
            />
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label>镜头运动</label>
              <input
                className="input"
                value={currentShot.cameraMovement}
                onChange={(e) =>
                  onShotUpdated({ ...currentShot, cameraMovement: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label>时长 (秒)</label>
              <input
                className="input"
                type="number"
                step="0.5"
                value={currentShot.duration}
                onChange={(e) =>
                  onShotUpdated({
                    ...currentShot,
                    duration: parseFloat(e.target.value) || 3,
                  })
                }
              />
            </div>
          </div>

          <div className="form-group">
            <label>旁白/台词</label>
            <textarea
              className="input"
              value={currentShot.narration}
              rows={2}
              onChange={(e) =>
                onShotUpdated({ ...currentShot, narration: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label>字幕内容</label>
            <input
              className="input"
              value={currentShot.subtitle}
              onChange={(e) =>
                onShotUpdated({ ...currentShot, subtitle: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label>转场</label>
            <select
              className="input"
              value={currentShot.transition}
              onChange={(e) =>
                onShotUpdated({ ...currentShot, transition: e.target.value })
              }
            >
              <option value="cut">硬切 (cut)</option>
              <option value="fade">淡入淡出 (fade)</option>
              <option value="dissolve">叠化 (dissolve)</option>
              <option value="wipe">划像 (wipe)</option>
              <option value="zoom">缩放转场 (zoom)</option>
            </select>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4 }}>
            <label
              style={{
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 8,
                display: 'block',
              }}
            >
              AI 智能干预
            </label>
            <div className="flex gap-2">
              <input
                ref={instructionRef}
                className="input"
                placeholder="输入修改指令，如：将台词改得更活泼"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.target as HTMLInputElement).value) {
                    handleRegenerate(currentShot.id, (e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = '';
                  }
                }}
              />
              <button
                className="btn btn-primary btn-sm"
                disabled={regenerating}
                onClick={() => {
                  if (instructionRef.current && instructionRef.current.value) {
                    handleRegenerate(currentShot.id, instructionRef.current.value);
                    instructionRef.current.value = '';
                  }
                }}
              >
                {regenerating ? '...' : '执行'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
