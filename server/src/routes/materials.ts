import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { materialService } from '../services/material.service';
import { firstParam, requiredParam } from './params';

const router = Router();

const upload = multer({
  dest: path.join(process.env.UPLOAD_DIR || './uploads', 'temp'),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

// 上传素材
router.post('/', upload.array('files', 20), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: '请上传至少一个文件' });
    }

    const productInfo = JSON.parse(req.body.productInfo || '{}');
    if (!productInfo.title || !productInfo.category) {
      return res.status(400).json({ error: '商品信息不完整（需要 title 和 category）' });
    }
    productInfo.id = productInfo.id || uuid();

    const materials = await materialService.upload(files, productInfo);
    res.json({ data: materials });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 获取素材列表
router.get('/', (req: Request, res: Response) => {
  const { category, keyword, tags, page, pageSize } = req.query;
  const result = materialService.list({
    category: firstParam(category),
    keyword: firstParam(keyword),
    tags: tags ? firstParam(tags)?.split(',') : undefined,
    page: page ? parseInt(firstParam(page) || '1') : 1,
    pageSize: pageSize ? parseInt(firstParam(pageSize) || '20') : 20,
  });
  res.json(result);
});

// 获取所有标签
router.get('/tags', (_req: Request, res: Response) => {
  res.json({ data: materialService.getAllTags() });
});

// 获取单个素材
router.get('/:id', (req: Request, res: Response) => {
  const material = materialService.getById(requiredParam(req.params.id));
  if (!material) return res.status(404).json({ error: '素材不存在' });
  res.json({ data: material });
});

// 删除素材
router.delete('/:id', (req: Request, res: Response) => {
  const ok = materialService.delete(requiredParam(req.params.id));
  if (!ok) return res.status(404).json({ error: '素材不存在' });
  res.json({ message: '已删除' });
});

export default router;
