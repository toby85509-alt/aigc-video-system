import { useEffect, useState, useCallback } from 'react';
import { materialsApi } from '../api/client';
import MaterialUploader from '../components/MaterialUploader';

export default function Materials() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [preview, setPreview] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await materialsApi.list({ keyword, category });
      setMaterials(res.items);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [keyword, category]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm('确认删除此素材？')) return;
    await materialsApi.delete(id);
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
        {/* 搜索栏 */}
        <div className="flex gap-3 mb-4" style={{ flexWrap: 'wrap' }}>
          <input className="input" style={{ width: 240 }} placeholder="搜索素材名称/标签..."
            value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          <select className="input" style={{ width: 160 }} value={category}
            onChange={(e) => setCategory(e.target.value)}>
            <option value="">全部类目</option>
            <option value="电子产品">电子产品</option>
            <option value="家居生活">家居生活</option>
            <option value="美妆护肤">美妆护肤</option>
            <option value="服饰配饰">服饰配饰</option>
            <option value="食品饮料">食品饮料</option>
          </select>
        </div>

        {/* 素材列表 */}
        {materials.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
            <h3>暂无素材</h3>
            <p>点击"上传素材"开始添加商品图片和视频</p>
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
                        {m.type === 'image' ? '🖼️' : '🎥'}
                        <span style={{ fontWeight: 500 }}>{m.name}</span>
                      </div>
                    </td>
                    <td>{m.productInfo?.title || '-'}</td>
                    <td>{m.category}</td>
                    <td>{m.type === 'image' ? '图片' : '视频'}</td>
                    <td>
                      {m.tags?.slice(0, 3).map((t: string, i: number) => (
                        <span key={i} className="tag">{t}</span>
                      ))}
                    </td>
                    <td>
                      <span className={`tag ${m.status === 'ready' ? 'tag-green' : 'tag-yellow'}`}>
                        {m.status === 'ready' ? '就绪' : '处理中'}
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

        {/* 上传弹窗 */}
        {showUpload && (
          <MaterialUploader
            onSuccess={() => { setShowUpload(false); load(); }}
            onClose={() => setShowUpload(false)}
          />
        )}

        {/* 预览弹窗 */}
        {preview && (
          <div className="modal-overlay" onClick={() => setPreview(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>{preview.name}</h2>
              <div style={{ marginTop: 16, marginBottom: 16 }}>
                {preview.type === 'image' ? (
                  <img src={preview.url} alt={preview.name} style={{ width: '100%', borderRadius: 8 }} />
                ) : (
                  <video src={preview.url} controls style={{ width: '100%', borderRadius: 8 }} />
                )}
              </div>
              <div className="text-sm text-secondary">
                <div>商品: {preview.productInfo?.title}</div>
                <div>类目: {preview.category}</div>
                <div>切片数: {preview.slices?.length || 0}</div>
                <div>标签: {preview.tags?.join(', ') || '无'}</div>
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
