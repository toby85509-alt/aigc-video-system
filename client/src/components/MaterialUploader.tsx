import { useState, useRef } from 'react';
import { materialsApi } from '../api/client';
import { useToast } from '../context/AppContext';

interface Props {
  onSuccess: () => void;
  onClose: () => void;
}

export default function MaterialUploader({ onSuccess, onClose }: Props) {
  const toast = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [sellingPoints, setSellingPoints] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [scene, setScene] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!title || !category || files.length === 0) {
      setError('请填写商品标题、类目并选择文件');
      return;
    }
    setUploading(true);
    setError('');

    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    formData.append('productInfo', JSON.stringify({
      title,
      category,
      sellingPoints: sellingPoints.split(',').map((s) => s.trim()).filter(Boolean),
      targetAudience,
      scene,
    }));

    try {
      await materialsApi.upload(formData);
      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '上传失败，请重试';
      toast(message, 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>上传商品素材</h2>

        <div className="form-group">
          <label>商品标题 *</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例：便携无线蓝牙耳机 Pro" />
        </div>

        <div className="form-group">
          <label>商品类目 *</label>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">请选择</option>
            <option value="电子产品">电子产品</option>
            <option value="家居生活">家居生活</option>
            <option value="美妆护肤">美妆护肤</option>
            <option value="服饰配饰">服饰配饰</option>
            <option value="食品饮料">食品饮料</option>
            <option value="运动户外">运动户外</option>
          </select>
        </div>

        <div className="form-group">
          <label>核心卖点（逗号分隔）</label>
          <input className="input" value={sellingPoints} onChange={(e) => setSellingPoints(e.target.value)} placeholder="降噪, 长续航, 低延迟" />
        </div>

        <div className="grid grid-2">
          <div className="form-group">
            <label>目标人群</label>
            <input className="input" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} placeholder="18-35岁年轻用户" />
          </div>
          <div className="form-group">
            <label>使用场景</label>
            <input className="input" value={scene} onChange={(e) => setScene(e.target.value)} placeholder="通勤、运动、办公" />
          </div>
        </div>

        <div className="form-group">
          <label>素材文件 *（图片/视频）</label>
          <input ref={inputRef} type="file" multiple accept="image/*,video/*" style={{ display: 'none' }}
            onChange={(e) => setFiles(Array.from(e.target.files || []))} />
          <button className="btn btn-secondary" onClick={() => inputRef.current?.click()} style={{ width: '100%' }}>
            {files.length > 0 ? `已选择 ${files.length} 个文件` : '点击选择文件'}
          </button>
          {files.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
              {files.map((f) => f.name).join(', ')}
            </div>
          )}
        </div>

        {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{error}</div>}

        <div className="flex gap-3" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={uploading}>
            {uploading ? '上传分析中...' : '确认上传'}
          </button>
        </div>
      </div>
    </div>
  );
}
