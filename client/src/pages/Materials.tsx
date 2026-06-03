import { useEffect, useState, useCallback } from 'react';
import type { MaterialAsset } from '../types';
import { materialsApi } from '../api/client';
import { useToast } from '../context/AppContext';
import { SkeletonTable } from '../components/Skeleton';
import MaterialUploader from '../components/MaterialUploader';

interface MaterialListResult {
  items: MaterialAsset[];
  total: number;
}

const CATEGORY_OPTIONS = [
  { value: '', label: '全部类目' },
  { value: '电子产品', label: '电子产品' },
  { value: '家居生活', label: '家居生活' },
  { value: '美妆护肤', label: '美妆护肤' },
  { value: '服饰配饰', label: '服饰配饰' },
  { value: '食品饮料', label: '食品饮料' },
  { value: '运动户外', label: '运动户外' },
];

function getFileTypeLabel(fileType: MaterialAsset['type']): string {
  return fileType === 'image' ? '图片' : '视频';
}

function getFileTypeIcon(fileType: MaterialAsset['type']): string {
  return fileType === 'image' ? '🖼️' : '🎥';
}

function getStatusLabel(status: MaterialAsset['status']): string {
  switch (status) {
    case 'ready':
      return '就绪';
    case 'processing':
      return '处理中';
    case 'failed':
    case 'error':
      return '失败';
    default:
      return status;
  }
}

function getStatusClass(status: MaterialAsset['status']): string {
  switch (status) {
    case 'ready':
      return 'tag-green';
    case 'processing':
      return 'tag-yellow';
    case 'failed':
    case 'error':
      return 'tag-red';
    default:
      return 'tag';
  }
}

function getStatusStyle(status: MaterialAsset['status']): React.CSSProperties {
  switch (status) {
    case 'ready':
      return { background: 'var(--success)', color: '#fff' };
    case 'processing':
      return { background: 'var(--warning)', color: '#fff' };
    case 'failed':
    case 'error':
      return { background: 'var(--danger)', color: '#fff' };
    default:
      return { background: 'var(--muted)', color: 'var(--text)' };
  }
}

export default function Materials() {
  const toast = useToast();
  const [materials, setMaterials] = useState<MaterialAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [preview, setPreview] = useState<MaterialAsset | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await materialsApi.list({ keyword, category }) as unknown as MaterialListResult;
      setMaterials(res.items);
      setTotal(res.total);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '加载素材列表失败';
      toast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [keyword, category, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm('确认删除此素材？')) return;
    try {
      await materialsApi.delete(id);
      toast('素材已删除', 'success');
      load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '删除失败';
      toast(message, 'error');
    }
  };

  const handleUploadSuccess = () => {
    setShowUpload(false);
    toast('素材上传成功，正在分析中', 'success');
    load();
  };

  return (
    <>
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1>素材管理</h1>
            <p>管理商品图片、视频素材 · 共 {total} 项</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowUpload(true)}>+ 上传素材</button>
        </div>
      </div>

      <div className="page-body">
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="flex gap-3 items-center" style={{ flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '360px' }}>
              <span style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '14px',
                color: 'var(--text-secondary)',
                pointerEvents: 'none',
              }}>
                🔍
              </span>
              <input
                className="input"
                style={{ width: '100%', paddingLeft: '36px' }}
                placeholder="搜索素材名称或标签..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
            <select
              className="input"
              style={{ width: '160px', flexShrink: 0 }}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <SkeletonTable rows={5} cols={7} />
        ) : materials.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
            <h3>暂无素材</h3>
            <p>点击“上传素材”开始添加商品图片和视频</p>
          </div>
        ) : (
          <div className="table-wrap card">
            <table>
              <thead>
                <tr>
                  <th>素材</th>
                  <th>商品</th>
                  <th>类目</th>
                  <th>类型</th>
                  <th>标签</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span>{getFileTypeIcon(m.type)}</span>
                        <span style={{ fontWeight: 500 }}>{m.name}</span>
                      </div>
                    </td>
                    <td>{m.productInfo?.title || '-'}</td>
                    <td>{m.productInfo?.category || '-'}</td>
                    <td>{getFileTypeLabel(m.type)}</td>
                    <td>
                      {m.tags?.slice(0, 3).map((t: string, i: number) => (
                        <span key={i} className="tag">{t}</span>
                      ))}
                      {(!m.tags || m.tags.length === 0) && (
                        <span style={{ color: 'var(--text-secondary)' }}>-</span>
                      )}
                    </td>
                    <td>
                      <span
                        className="tag"
                        style={{
                          ...getStatusStyle(m.status),
                          fontWeight: 500,
                        }}
                      >
                        {getStatusLabel(m.status)}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-secondary btn-sm" onClick={() => setPreview(m)}>查看</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(m.id)}>删除</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showUpload && (
          <MaterialUploader
            onSuccess={handleUploadSuccess}
            onClose={() => setShowUpload(false)}
          />
        )}

        {preview && (
          <div className="modal-overlay" onClick={() => setPreview(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>{preview.name}</h2>
              <div style={{ marginTop: 16, marginBottom: 16 }}>
                {preview.type === 'image' ? (
                  <img
                    src={preview.url}
                    alt={preview.name}
                    style={{ width: '100%', borderRadius: 8, maxHeight: '400px', objectFit: 'contain', background: '#000' }}
                  />
                ) : (
                  <video
                    src={preview.url}
                    controls
                    style={{ width: '100%', borderRadius: 8, maxHeight: '400px', background: '#000' }}
                  />
                )}
              </div>
              <div className="text-sm text-secondary">
                <div>商品: {preview.productInfo?.title || '-'}</div>
                <div>类目: {preview.productInfo?.category || '-'}</div>
                <div>切片数: {preview.slices?.length ?? 0}</div>
                <div>标签: {preview.tags?.join(', ') || '无'}</div>
                <div>状态: {getStatusLabel(preview.status)}</div>
              </div>
              <div className="flex gap-3 mt-4" style={{ justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setPreview(null)}>关闭</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
