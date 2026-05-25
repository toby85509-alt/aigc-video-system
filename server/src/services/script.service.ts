import { v4 as uuid } from 'uuid';
import { Storyboard, Shot, CreativeFactor, ProductInfo } from '../types';
import { generateText, generateStructuredJSON } from './volcano.service';
import path from 'path';
import fs from 'fs';

const DATA_DIR = process.env.UPLOAD_DIR || './uploads';
const SCRIPTS_FILE = path.join(DATA_DIR, 'scripts.json');
const TEMPLATES_FILE = path.join(DATA_DIR, 'templates.json');

let scripts: Storyboard[] = [];
function load() { try { if (fs.existsSync(SCRIPTS_FILE)) scripts = JSON.parse(fs.readFileSync(SCRIPTS_FILE, 'utf-8')); } catch {} }
function save() { fs.writeFileSync(SCRIPTS_FILE, JSON.stringify(scripts, null, 2)); }
load();

// ── 预设模板 ──
const DEFAULT_TEMPLATES = [
  {
    id: 'template_1',
    name: '质感沉浸风',
    strategy: '第一人称视角 + BGM 氛围沉浸，强调产品质感与使用场景',
    factors: {
      opening: '轻柔氛围音乐渐入，产品特写缓慢出现',
      bgm: '舒缓纯音乐/轻电子',
      cameraStyle: '微距特写 + 慢速推拉',
      visualFocus: '材质纹理、光影变化、细节工艺',
      narration: '温柔知性女声，语速偏慢',
      pacing: '舒缓渐进，留白呼吸感',
    },
  },
  {
    id: 'template_2',
    name: '快节奏种草风',
    strategy: '快速剪辑 + 卡点音乐，突出卖点和视觉冲击',
    factors: {
      opening: '强节奏鼓点起，产品多角度快切',
      bgm: '节奏感强的电子/流行',
      cameraStyle: '快速切换 + 缩放冲击',
      visualFocus: '颜色对比、功能展示、使用效果',
      narration: '活力年轻女声，语速较快',
      pacing: '紧促有张力，3秒一换画面',
    },
  },
  {
    id: 'template_3',
    name: '问题解决型',
    strategy: '痛点引入 → 产品登场 → 完美解决，信任背书收尾',
    factors: {
      opening: '痛点场景再现(黑白/灰调)，问题字幕弹出',
      bgm: '先抑后扬，转折处节奏加强',
      cameraStyle: '对比切换：痛点画面 vs 解决画面',
      visualFocus: '使用前后对比、效果展示',
      narration: '共情型女声，先低沉后明亮',
      pacing: '前半段稳→中间转折→后半段轻快',
    },
  },
];

interface ScriptTemplate {
  id: string;
  name: string;
  strategy: string;
  factors: CreativeFactor;
}

let templates: ScriptTemplate[] = [];
function loadTemplates() { try { if (fs.existsSync(TEMPLATES_FILE)) templates = JSON.parse(fs.readFileSync(TEMPLATES_FILE, 'utf-8')); else templates = DEFAULT_TEMPLATES; } catch { templates = DEFAULT_TEMPLATES; } }
loadTemplates();

export const scriptService = {
  // ── 剧本生成 ──
  async generate(
    productInfo: ProductInfo,
    templateId?: string,
    referenceStyle?: string
  ): Promise<Storyboard> {
    const template = templateId
      ? templates.find((t) => t.id === templateId)
      : templates[0];

    const strategy = template?.strategy || '自然展示商品';
    const factors = template?.factors || DEFAULT_TEMPLATES[0].factors;

    const systemPrompt = `你是一个资深的电商带货视频策划师。你需要根据商品信息和创作策略，生成一个完整的短视频分镜脚本。
视频时长控制在 15-30 秒，包含 5-8 个分镜。
请严格按照 JSON 格式输出，不要包含 markdown 代码块标记。`;

    const prompt = `请为以下商品生成带货视频剧本：

商品信息：
- 标题：${productInfo.title}
- 卖点：${productInfo.sellingPoints.join('、')}
- 目标人群：${productInfo.targetAudience}
- 使用场景：${productInfo.scene}
- 类目：${productInfo.category}

创作策略：${strategy}
创作因子：${JSON.stringify(factors)}
${referenceStyle ? `参考风格：${referenceStyle}` : ''}

请生成如下 JSON 结构：
{
  "title": "短视频标题",
  "narrative": "叙事框架描述(一句话)",
  "visualStyle": "视觉风格描述",
  "shots": [
    {
      "index": 1,
      "description": "画面描述",
      "cameraMovement": "镜头运动方式",
      "duration": 3.5,
      "narration": "旁白/台词",
      "subtitle": "字幕内容",
      "transition": "转场方式",
      "bgm": "配乐描述"
    }
  ],
  "constraints": ["约束条件1", "约束条件2"]
}`;

    const result = await generateStructuredJSON<{
      title: string;
      narrative: string;
      visualStyle: string;
      shots: Shot[];
      constraints: string[];
    }>(prompt, systemPrompt);

    const storyboard: Storyboard = {
      id: uuid(),
      productId: productInfo.id,
      title: result.title,
      strategy,
      factors,
      narrative: result.narrative,
      visualStyle: result.visualStyle,
      shots: result.shots.map((s, i) => ({
        ...s,
        id: uuid(),
        index: i,
        duration: s.duration || 3,
        narration: s.narration || '',
        subtitle: s.subtitle || '',
        transition: s.transition || 'cut',
      })),
      constraints: result.constraints || [],
      status: 'ready',
      createdAt: new Date().toISOString(),
    };

    scripts.push(storyboard);
    save();
    return storyboard;
  },

  // ── 获取模板列表 ──
  getTemplates(): ScriptTemplate[] {
    return templates;
  },

  // ── 搜索剧本 ──
  list(params: { productId?: string; page?: number; pageSize?: number }) {
    let filtered = [...scripts].reverse();
    if (params.productId) {
      filtered = filtered.filter((s) => s.productId === params.productId);
    }
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const start = (page - 1) * pageSize;
    return { items: filtered.slice(start, start + pageSize), total: filtered.length };
  },

  // ── 获取单个剧本 ──
  getById(id: string): Storyboard | undefined {
    return scripts.find((s) => s.id === id);
  },

  // ── 修改剧本 ──
  update(id: string, updates: Partial<Storyboard>): Storyboard | undefined {
    const idx = scripts.findIndex((s) => s.id === id);
    if (idx === -1) return undefined;
    scripts[idx] = { ...scripts[idx], ...updates };
    save();
    return scripts[idx];
  },

  // ── 干预分镜 - 微调台词/替换因子 ──
  async regenerateShot(
    storyboardId: string,
    shotId: string,
    instruction: string
  ): Promise<Shot | undefined> {
    const sb = scripts.find((s) => s.id === storyboardId);
    if (!sb) return undefined;
    const shotIdx = sb.shots.findIndex((s) => s.id === shotId);
    if (shotIdx === -1) return undefined;

    const shot = sb.shots[shotIdx];
    const prompt = `原始分镜：${JSON.stringify(shot)}\n修改指令：${instruction}\n请输出修改后的单个分镜 JSON（仅分镜对象，不要数组）。`;
    const newShot = await generateStructuredJSON<Shot>(prompt, '你是一个视频分镜编辑专家。');

    sb.shots[shotIdx] = { ...newShot, id: shotId, index: shot.index };
    save();
    return sb.shots[shotIdx];
  },

  delete(id: string): boolean {
    const idx = scripts.findIndex((s) => s.id === id);
    if (idx === -1) return false;
    scripts.splice(idx, 1);
    save();
    return true;
  },

  // ── A/B 对比：多模板并行生成剧本 ──
  async generateAB(
    productInfo: ProductInfo,
    templateIds: string[]
  ): Promise<{ variantId: string; templateName: string; storyboard: Storyboard; metrics: { estimatedCTR: number; estimatedConversion: number; estimatedWatchTime: number; score: number } }[]> {
    const results = await Promise.all(
      templateIds.map(async (tid) => {
        const storyboard = await this.generate(productInfo, tid);
        const template = templates.find((t) => t.id === tid);
        // 基于模板风格模拟效果预估
        const metrics = {
          estimatedCTR: tid === 'template_2' ? 5.6 : tid === 'template_3' ? 6.2 : 4.8,
          estimatedConversion: tid === 'template_3' ? 5.0 : tid === 'template_2' ? 4.1 : 3.2,
          estimatedWatchTime: tid === 'template_3' ? 25.1 : tid === 'template_1' ? 22.5 : 18.3,
          score: tid === 'template_3' ? 92 : tid === 'template_2' ? 85 : 78,
        };
        return {
          variantId: storyboard.id,
          templateName: template?.name || tid,
          storyboard,
          metrics,
        };
      })
    );
    return results;
  },
};
