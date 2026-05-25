import { MaterialAsset, MaterialSlice, ProductInfo } from '../types';
import { v4 as uuid } from 'uuid';
import path from 'path';
import fs from 'fs';
import { analyzeMaterial } from './volcano.service';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const DATA_FILE = path.join(UPLOAD_DIR, 'materials.json');

// 内存存储
let materials: MaterialAsset[] = [];

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      materials = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch { /* ignore */ }
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(materials, null, 2));
}

loadData();

function fileToDataUrl(filePath: string, mimetype: string): string {
  const data = fs.readFileSync(filePath).toString('base64');
  return `data:${mimetype};base64,${data}`;
}

export const materialService = {
  async upload(
    files: Express.Multer.File[],
    productInfo: ProductInfo
  ): Promise<MaterialAsset[]> {
    const results: MaterialAsset[] = [];

    for (const file of files) {
      const id = uuid();
      const ext = path.extname(file.originalname);
      const newName = `${id}${ext}`;
      const destDir = path.join(UPLOAD_DIR, 'materials');
      fs.mkdirSync(destDir, { recursive: true });
      const destPath = path.join(destDir, newName);
      fs.copyFileSync(file.path, destPath);

      const isVideo = file.mimetype.startsWith('video/');
      const material: MaterialAsset = {
        id,
        name: file.originalname,
        type: isVideo ? 'video' : 'image',
        url: `/uploads/materials/${newName}`,
        tags: [],
        category: productInfo.category,
        productInfo,
        slices: [],
        status: 'processing',
        createdAt: new Date().toISOString(),
      };

      // 如果是图片，进行 AI 分析
      if (!isVideo) {
        try {
          const fileUrl = fileToDataUrl(destPath, file.mimetype);
          const analysis = await analyzeMaterial(fileUrl, {
            title: productInfo.title,
            sellingPoints: productInfo.sellingPoints,
            category: productInfo.category,
          });
          material.tags = analysis.tags;

          const slice: MaterialSlice = {
            id: uuid(),
            materialId: id,
            type: analysis.sliceType as MaterialSlice['type'],
            description: analysis.description,
            tags: analysis.tags,
          };
          material.slices = [slice];
        } catch {
          // AI 分析失败不影响入库
        }
      }

      material.status = 'ready';
      materials.push(material);
      results.push(material);
    }

    saveData();
    return results;
  },

  list(params: {
    category?: string;
    keyword?: string;
    tags?: string[];
    page?: number;
    pageSize?: number;
  }): { items: MaterialAsset[]; total: number } {
    let filtered = [...materials];

    if (params.category) {
      filtered = filtered.filter((m) => m.category === params.category);
    }
    if (params.keyword) {
      const kw = params.keyword.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.name.toLowerCase().includes(kw) ||
          m.tags.some((t) => t.toLowerCase().includes(kw)) ||
          m.productInfo.title.toLowerCase().includes(kw)
      );
    }
    if (params.tags && params.tags.length > 0) {
      filtered = filtered.filter((m) =>
        params.tags!.some((t) => m.tags.includes(t))
      );
    }

    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const start = (page - 1) * pageSize;
    return { items: filtered.slice(start, start + pageSize), total: filtered.length };
  },

  getById(id: string): MaterialAsset | undefined {
    return materials.find((m) => m.id === id);
  },

  delete(id: string): boolean {
    const idx = materials.findIndex((m) => m.id === id);
    if (idx === -1) return false;
    const material = materials[idx];
    // 删除文件
    const filePath = path.join(UPLOAD_DIR, 'materials', path.basename(material.url));
    try { fs.unlinkSync(filePath); } catch { /* ignore */ }
    materials.splice(idx, 1);
    saveData();
    return true;
  },

  getAllTags(): string[] {
    const tagSet = new Set<string>();
    materials.forEach((m) => m.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet);
  },
};
