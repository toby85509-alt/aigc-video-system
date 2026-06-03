import { useRef, useEffect, useCallback, useState } from 'react';

interface ShotData {
  shotId: string;
  status: string;
  startTime: number;
  endTime: number;
  description?: string;
  cameraMovement?: string;
  duration?: number;
  narration?: string;
  subtitle?: string;
  transition?: string;
  bgm?: string;
  videoUrl?: string;
}

interface Props {
  projectId: string;
  status: string;
  progress: number;
  outputUrl?: string;
  shots: ShotData[];
  productImageUrl?: string;
  aspectRatio?: '9:16' | '16:9';
}

function parseCamera(cam: string): { type: string; speed: number } {
  const slow = /慢|缓/.test(cam);
  const fast = /快|急/.test(cam);
  const speed = slow ? 0.3 : fast ? 2 : 1;
  if (/推|近/.test(cam) && /旋/.test(cam)) return { type: 'zoomRotate', speed };
  if (/推|近|zoom/i.test(cam)) return { type: 'zoomIn', speed };
  if (/拉|远/.test(cam)) return { type: 'zoomOut', speed };
  if (/旋/.test(cam)) return { type: 'rotate', speed };
  if (/横|移|跟/.test(cam)) return { type: 'pan', speed };
  if (/静/.test(cam)) return { type: 'static', speed: 0 };
  if (/微|特/.test(cam)) return { type: 'closeup', speed };
  return { type: 'static', speed: 0 };
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function easeInOut(t: number) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }

export default function VideoPreview({ projectId, status, progress, outputUrl, shots, productImageUrl, aspectRatio }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const animRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const canvasWidth = aspectRatio === '16:9' ? 640 : 360;
  const canvasHeight = aspectRatio === '16:9' ? 360 : 640;

  // Load product image with visible <img> tag for reliable loading
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
    imageRef.current = null;

    if (!productImageUrl) return;

    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
      setImageError(false);
    };
    img.onerror = () => {
      setImageError(true);
      setImageLoaded(false);
    };
    img.src = productImageUrl;
  }, [productImageUrl]);

  // Calculate total duration
  useEffect(() => {
    if (shots.length === 0) return;
    const lastShot = shots[shots.length - 1];
    setDuration(lastShot.endTime || lastShot.startTime + (lastShot.duration || 3));
  }, [shots]);

  const getCurrentShot = useCallback((time: number) => {
    for (let i = 0; i < shots.length; i++) {
      const shotEnd = shots[i].endTime || shots[i].startTime + (shots[i].duration || 3);
      if (time < shotEnd) return { shot: shots[i], index: i };
    }
    return { shot: shots[shots.length - 1], index: shots.length - 1 };
  }, [shots]);

  // Draw single static frame (used for initial state)
  const drawStaticFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width, h = canvas.height;
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, w, h);

    if (imageRef.current && imageLoaded) {
      const img = imageRef.current;
      const imgAspect = img.width / img.height;
      const canvasAspect = w / h;
      let drawW: number, drawH: number;
      if (imgAspect > canvasAspect) { drawH = h; drawW = h * imgAspect; }
      else { drawW = w; drawH = w / imgAspect; }
      ctx.save(); ctx.translate(w / 2, h / 2); ctx.scale(1.1, 1.1);
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    } else {
      // Gradient placeholder
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#1a1a2e'); g.addColorStop(0.5, '#16213e'); g.addColorStop(1, '#0f3460');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.beginPath(); ctx.arc(w / 2, h / 2, 50, 0, Math.PI * 2); ctx.fill();
    }

    // Play button
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff';
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('▶', w / 2, h / 2 + 8);
    ctx.textAlign = 'start';

    // Image error indicator
    if (imageError) {
      ctx.fillStyle = 'rgba(239,68,68,0.9)';
      ctx.font = '13px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('图片加载失败，请确认已上传素材', w / 2, h - 80);
      ctx.textAlign = 'start';
    }
  }, [canvasWidth, canvasHeight, imageLoaded, imageError]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const elapsed = (performance.now() - startTimeRef.current) / 1000;
    const totalDuration = duration || 15;
    const loopTime = elapsed % totalDuration;
    setCurrentTime(loopTime);

    const { shot, index } = getCurrentShot(loopTime);
    const shotStart = shot.startTime;
    const shotEnd = shot.endTime || shot.startTime + (shot.duration || 3);
    const shotDuration = shotEnd - shotStart;
    const shotProgress = Math.min((loopTime - shotStart) / shotDuration, 1);
    const cam = parseCamera(shot.cameraMovement || '');

    const w = canvas.width;
    const h = canvas.height;

    // Clear
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, w, h);

    // Draw product image with camera movement
    const hasImage = imageRef.current && imageLoaded;
    if (hasImage) {
      const img = imageRef.current!;
      const imgAspect = img.width / img.height;
      const canvasAspect = w / h;

      let drawW: number, drawH: number;
      if (imgAspect > canvasAspect) {
        drawH = h;
        drawW = h * imgAspect;
      } else {
        drawW = w;
        drawH = w / imgAspect;
      }

      let scale = 1;
      let offsetX = 0;
      let offsetY = 0;
      let rotation = 0;
      const t = easeInOut(shotProgress);

      switch (cam.type) {
        case 'zoomIn': scale = lerp(1, 1.3 * cam.speed, t); break;
        case 'zoomOut': scale = lerp(1.3 * cam.speed, 1, t); break;
        case 'zoomRotate': scale = lerp(1, 1.25 * cam.speed, t); rotation = lerp(0, 0.04 * cam.speed, t); break;
        case 'rotate': scale = 1.15; rotation = lerp(-0.03 * cam.speed, 0.03 * cam.speed, t); break;
        case 'pan': scale = 1.2; offsetX = lerp(-0.05 * w * cam.speed, 0.05 * w * cam.speed, t); offsetY = lerp(-0.03 * h * cam.speed, 0.03 * h * cam.speed, t); break;
        case 'closeup': scale = lerp(1.2, 1.5 * cam.speed, t); break;
        default: scale = 1.1; break;
      }

      ctx.save();
      ctx.translate(w / 2 + offsetX, h / 2 + offsetY);
      ctx.rotate(rotation);
      ctx.scale(scale, scale);

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

      // Vignette
      const gradient = ctx.createRadialGradient(0, 0, w * 0.35, 0, 0, w * 0.75);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.35)');
      ctx.fillStyle = gradient;
      ctx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    } else {
      // Gradient placeholder with animated overlay
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#1a1a2e'); g.addColorStop(0.5, '#16213e'); g.addColorStop(1, '#0f3460');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // Pulsing circle
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 60 + Math.sin(elapsed * 2) * 10, 0, Math.PI * 2);
      ctx.fill();

      // Shot description as overlay when no image
      if (shot.description) {
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '14px "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(shot.description, w / 2, h / 2 - 20);
        ctx.textAlign = 'start';
      }
    }

    // Transition effect
    if (shotProgress < 0.15 && shot.transition) {
      ctx.fillStyle = `rgba(0,0,0,${1 - shotProgress / 0.15})`;
      ctx.fillRect(0, 0, w, h);
    }

    // Scanline
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);

    // Progress bar
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(0, h - 2, w, 2);
    ctx.fillStyle = '#6366f1';
    ctx.fillRect(0, h - 2, w * shotProgress, 2);

    // Subtitle
    const sub = shot.subtitle || shot.narration || '';
    if (sub && sub.trim()) {
      const fontSize = aspectRatio === '9:16' ? 18 : 22;
      ctx.font = `600 ${fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`;

      const maxWidth = w * 0.85;
      const words = sub.split('');
      let line = '';
      const lines: string[] = [];
      for (const ch of words) {
        const test = line + ch;
        if (ctx.measureText(test).width > maxWidth && line.length > 0) {
          lines.push(line); line = ch;
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);

      const lineHeight = fontSize * 1.5;
      const totalHeight = lines.length * lineHeight;
      const startY = h - 50 - totalHeight;

      // Background box
      const metricsArr = lines.map(l => ctx.measureText(l).width);
      const maxLineWidth = Math.max(...metricsArr, 0);
      const boxWidth = Math.min(maxLineWidth, maxWidth) + 20;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      const boxX = w / 2 - boxWidth / 2;
      const boxY = startY - 10;
      const boxH = totalHeight + 20;
      // Manual rounded rect for compatibility
      const r = 6;
      ctx.beginPath();
      ctx.moveTo(boxX + r, boxY);
      ctx.lineTo(boxX + boxWidth - r, boxY);
      ctx.arcTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + r, r);
      ctx.lineTo(boxX + boxWidth, boxY + boxH - r);
      ctx.arcTo(boxX + boxWidth, boxY + boxH, boxX + boxWidth - r, boxY + boxH, r);
      ctx.lineTo(boxX + r, boxY + boxH);
      ctx.arcTo(boxX, boxY + boxH, boxX, boxY + boxH - r, r);
      ctx.lineTo(boxX, boxY + r);
      ctx.arcTo(boxX, boxY, boxX + r, boxY, r);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      lines.forEach((l, i) => {
        ctx.fillText(l, w / 2, startY + (i + 1) * lineHeight - 6);
      });
      ctx.textAlign = 'start';
    }

    // Shot dots
    const dotY = h - 16;
    const dotSpacing = 10;
    const dotsWidth = shots.length * dotSpacing;
    let dotX = w / 2 - dotsWidth / 2;
    for (let i = 0; i < shots.length; i++) {
      ctx.fillStyle = i === index ? '#6366f1' : 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
      ctx.fill();
      dotX += dotSpacing;
    }

    animRef.current = requestAnimationFrame(draw);
  }, [duration, shots, imageLoaded, aspectRatio, getCurrentShot]);

  // Animation loop control
  useEffect(() => {
    if (playing && status === 'completed') {
      startTimeRef.current = performance.now();
      animRef.current = requestAnimationFrame(draw);
      return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
    } else {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    }
  }, [playing, status, draw]);

  // Draw initial frame when paused
  useEffect(() => {
    if (!playing && status === 'completed') {
      drawStaticFrame();
    }
  }, [playing, status, drawStaticFrame]);

  // Redraw when image loads
  useEffect(() => {
    if (!playing && status === 'completed' && imageLoaded) {
      drawStaticFrame();
    }
  }, [imageLoaded, playing, status, drawStaticFrame]);

  const togglePlay = () => {
    if (status !== 'completed') return;
    setPlaying(!playing);
  };

  const completedShots = shots.filter((s) => s.status === 'completed').length;
  const totalShots = shots.length;
  const finalVideoUrl = status === 'completed' && outputUrl
    ? `${outputUrl}${outputUrl.includes('?') ? '&' : '?'}v=${encodeURIComponent(projectId)}`
    : '';

  if (finalVideoUrl) {
    return (
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>视频预览</h3>
          <span className="tag tag-green">最终成片</span>
        </div>

        <div style={{
          width: '100%',
          maxWidth: canvasWidth,
          margin: '0 auto',
          aspectRatio: aspectRatio === '9:16' ? '9/16' : '16/9',
          background: '#000',
          borderRadius: 8,
          overflow: 'hidden',
        }}>
          <video
            key={finalVideoUrl}
            src={finalVideoUrl}
            controls
            playsInline
            preload="metadata"
            style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain', background: '#000' }}
          />
        </div>

        <div className="progress-bar" style={{ marginTop: 12, marginBottom: 8 }}>
          <div className="progress-fill success" style={{ width: '100%' }} />
        </div>
        <div className="flex justify-between text-sm text-secondary">
          <span>分镜: {completedShots}/{totalShots}</span>
          <a href={finalVideoUrl} target="_blank" rel="noreferrer">打开最终成片</a>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h3 style={{ fontSize: 15, fontWeight: 600 }}>视频预览</h3>
        <span className={`tag ${status === 'completed' ? 'tag-green' : status === 'failed' ? 'tag-red' : 'tag-yellow'}`}>
          {status === 'completed' ? '已完成' : status === 'failed' ? '失败' : status === 'generating' ? '生成中' : '等待中'}
        </span>
      </div>

      <div style={{
        width: '100%', maxWidth: canvasWidth,
        margin: '0 auto',
        aspectRatio: aspectRatio === '9:16' ? '9/16' : '16/9',
        background: '#000', borderRadius: 8, overflow: 'hidden',
        position: 'relative', cursor: status === 'completed' ? 'pointer' : 'default',
      }} onClick={togglePlay}>
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />

        {status === 'generating' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', background: 'rgba(0,0,0,0.6)' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🎬</div>
            <div style={{ fontSize: 14 }}>生成中 {progress}%</div>
          </div>
        )}
        {status === 'failed' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ef4444', background: 'rgba(0,0,0,0.6)' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>⚠️</div>
            <div style={{ fontSize: 14 }}>生成失败</div>
          </div>
        )}
        {status === 'pending' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', background: 'rgba(0,0,0,0.6)', fontSize: 14 }}>
            等待开始...
          </div>
        )}
      </div>

      <div className="progress-bar" style={{ marginTop: 12, marginBottom: 8 }}>
        <div className={`progress-fill ${status === 'completed' ? 'success' : status === 'failed' ? 'danger' : ''}`}
          style={{ width: `${status === 'completed' ? 100 : progress}%` }} />
      </div>
      <div className="flex justify-between text-sm text-secondary">
        <span>分镜: {completedShots}/{totalShots}</span>
        <span>总时长: {duration.toFixed(1)}s</span>
        {imageError && <span style={{ color: '#ef4444' }}>图片未加载</span>}
        {productImageUrl && !imageLoaded && !imageError && <span>图片加载中...</span>}
      </div>
    </div>
  );
}
