import { v4 as uuid } from 'uuid';
import {
  Storyboard,
  Shot,
  CreativeFactor,
  ProductInfo,
  ReferenceAnalysis,
  ScriptMethodology,
  QualityChecklistItem,
} from '../types';
import { generateStructuredJSON } from './volcano.service';
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
    description: '适合高客单、审美驱动型商品，用慢镜头和细节质感建立信任。',
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
    description: '适合泛流量种草，用强 Hook、快切演示和明确 CTA 提升停留。',
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
    description: '适合痛点明确的商品，用问题场景、产品介入和结果证明完成转化。',
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
  description?: string;
  strategy: string;
  factors: CreativeFactor;
}

let templates: ScriptTemplate[] = [];
function loadTemplates() { try { if (fs.existsSync(TEMPLATES_FILE)) templates = JSON.parse(fs.readFileSync(TEMPLATES_FILE, 'utf-8')); else templates = DEFAULT_TEMPLATES; } catch { templates = DEFAULT_TEMPLATES; } }
loadTemplates();

const REFERENCE_LIBRARY: ReferenceAnalysis[] = [
  {
    id: 'ref-electronics-commute-demo',
    title: '通勤痛点 + 手部开箱演示',
    category: '电子产品',
    platform: 'TikTok/Reels public pattern',
    sourceType: 'public_pattern',
    hook: '先给出高频生活噪音痛点，再让产品在 2 秒内入镜。',
    sellingPointAngle: '把抽象参数翻译成场景价值，例如通勤更安静、会议通话更清楚。',
    shotPattern: ['痛点场景', '手部开仓/佩戴', '多场景证明', '产品定格 CTA'],
    styleFactors: ['近景手部互动', '冷白柔光', '生活场景快切', '字幕后期叠加'],
    sourceDeclaration: '仅使用公开爆款视频的结构化方法论，不保存、不复刻、不混剪原视频。',
  },
  {
    id: 'ref-home-before-after',
    title: '家居前后状态对比',
    category: '家居生活',
    platform: 'Instagram Reels public pattern',
    sourceType: 'public_pattern',
    hook: '用凌乱/低效的生活状态开场，快速切到产品介入。',
    sellingPointAngle: '强调省时、省空间、改善日常体验，而不是夸张功能承诺。',
    shotPattern: ['问题画面', '产品使用步骤', '前后对比', '温和 CTA'],
    styleFactors: ['自然光', '家庭真实动线', '前后状态对照', '稳定手持镜头'],
    sourceDeclaration: '仅沉淀公开视频的创作套路与结构化拆解，不使用原始素材。',
  },
  {
    id: 'ref-beauty-texture-proof',
    title: '美妆质地证明 + 使用仪式感',
    category: '美妆护肤',
    platform: 'TikTok/Reels public pattern',
    sourceType: 'public_pattern',
    hook: '用质地特写或上脸第一感受制造停留。',
    sellingPointAngle: '把成分/质地/肤感做成可视化证明，避免功效绝对化。',
    shotPattern: ['质地 Hook', '手背/脸部使用', '妆效或肤感细节', '安全 CTA'],
    styleFactors: ['柔焦近景', '干净背景', '手部涂抹动作', '合规措辞'],
    sourceDeclaration: '仅保留公开视频方法论与分镜结构，不复刻原片。',
  },
  {
    id: 'ref-food-sensory',
    title: '食品感官特写 + 即食场景',
    category: '食品饮料',
    platform: 'TikTok/Reels public pattern',
    sourceType: 'public_pattern',
    hook: '用开袋、倒出、拉丝、冒气等感官动作抓住前 2 秒。',
    sellingPointAngle: '突出风味、便捷、分享场景，不编造健康功效。',
    shotPattern: ['感官动作 Hook', '产品细节', '食用场景', '轻 CTA'],
    styleFactors: ['高饱和自然光', '微距食物质感', '真实手部动作', '清晰节奏'],
    sourceDeclaration: '仅沉淀公开视频创意模式，不保存原素材。',
  },
  {
    id: 'ref-fashion-try-on',
    title: '穿搭试用 + 场景切换',
    category: '服饰配饰',
    platform: 'TikTok/Reels public pattern',
    sourceType: 'public_pattern',
    hook: '用上身前后变化或一物多搭制造即时反馈。',
    sellingPointAngle: '强调版型、材质、搭配场景，避免虚构品牌背书。',
    shotPattern: ['穿搭变化 Hook', '细节材质', '多场景试穿', '产品定格 CTA'],
    styleFactors: ['全身镜/半身跟拍', '自然转身动作', '细节近景', '场景化搭配'],
    sourceDeclaration: '仅保存结构化拆解结果，不复刻原视频。',
  },
];

function referencesForCategory(category?: string): ReferenceAnalysis[] {
  const exact = REFERENCE_LIBRARY.filter((ref) => ref.category === category);
  return (exact.length > 0 ? exact : REFERENCE_LIBRARY).slice(0, 2);
}

function buildMethodology(template: ScriptTemplate | undefined, refs: ReferenceAnalysis[]): ScriptMethodology {
  const primary = refs[0];
  return {
    source: 'inspiration_template',
    structure: primary?.shotPattern.join(' -> ') || 'Hook -> Demo -> Proof -> CTA',
    hookTechnique: primary?.hook || '前 2-3 秒用具体痛点或反差打断滑动。',
    proofTechnique: primary?.sellingPointAngle || '用真实场景、手部动作和细节特写证明卖点。',
    conversionTechnique: '结尾产品定格 + 口播 CTA，优惠信息以页面为准。',
    riskControl: `模板「${template?.name || '自动模板'}」结合合规约束生成；不复刻公开视频，不要求视频模型生成画面文字。`,
  };
}

function normalizeShots(shots: Shot[]): Shot[] {
  const normalized = shots.slice(0, 4).map((shot, i) => ({
    ...shot,
    id: uuid(),
    index: i,
    duration: Math.min(Math.max(Number(shot.duration) || 4, 3.5), 5),
    description: sanitizeVisualDescription(shot.description || ''),
    narration: shot.narration || '',
    subtitle: shot.subtitle || shot.narration || '',
    transition: shot.transition || (i === 0 ? 'fade' : 'cut'),
    bgm: shot.bgm || '',
  }));

  const totalDuration = normalized.reduce((sum, shot) => sum + shot.duration, 0);
  if (totalDuration >= 15 && totalDuration <= 20) return normalized;

  const ratio = totalDuration > 20 ? 20 / totalDuration : 15 / Math.max(totalDuration, 1);
  return normalized.map((shot) => ({
    ...shot,
    duration: Math.min(5, Math.max(3.5, Math.round(shot.duration * ratio * 10) / 10)),
  }));
}

function sanitizeVisualDescription(description: string): string {
  let result = description
    .replace(/画面无任何文字元素/g, '画面只保留产品、人物动作和真实环境')
    .replace(/不出现任何文字、数字或 UI 元素/g, '只保留真实场景和产品动作')
    .replace(/无文字、价格牌、弹窗或按钮/g, '只保留简洁背景和产品主体');

  const blockedPatterns = [
    /字幕[^，。；,.]*/g,
    /文字[^，。；,.]*/g,
    /标题[^，。；,.]*/g,
    /价格牌[^，。；,.]*/g,
    /促销弹窗[^，。；,.]*/g,
    /弹窗[^，。；,.]*/g,
    /按钮[^，。；,.]*/g,
    /UI[^，。；,.]*/gi,
    /屏幕字样[^，。；,.]*/g,
  ];

  for (const pattern of blockedPatterns) {
    result = result.replace(pattern, '画面保持干净');
  }
  return result.replace(/画面保持干净(、|，)?画面保持干净/g, '画面保持干净');
}

function includesAny(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(word));
}

function evaluateStoryboard(storyboard: Pick<Storyboard, 'shots' | 'constraints' | 'narrative'>): {
  score: number;
  checklist: QualityChecklistItem[];
} {
  const shots = storyboard.shots || [];
  const allText = JSON.stringify(storyboard);
  const totalDuration = shots.reduce((sum, shot) => sum + (Number(shot.duration) || 0), 0);
  const visualDescriptions = shots.map((shot) => shot.description || '').join(' ');
  const spokenAndVisualText = [
    storyboard.narrative || '',
    ...shots.flatMap((shot) => [shot.description || '', shot.narration || '', shot.subtitle || '']),
  ].join(' ');

  const checklist: QualityChecklistItem[] = [
    {
      item: '15-20 秒完整短视频结构',
      passed: totalDuration >= 15 && totalDuration <= 20 && shots.length === 4,
      evidence: `${shots.length} 个分镜，总时长 ${Math.round(totalDuration * 10) / 10}s`,
    },
    {
      item: '前 3 秒强 Hook',
      passed: Boolean(shots[0]?.description && shots[0]?.narration) && includesAny(`${shots[0]?.description}${shots[0]?.narration}`, ['痛点', '吵', '乱', '尴尬', '还在', '是不是', '有没有', '通勤', '开场', '对比', '质地', '肤感', '清爽', '卡粉', '妆前', '第一感受']),
      evidence: shots[0]?.narration || shots[0]?.description?.slice(0, 40) || '缺少首镜',
    },
    {
      item: '商品 Demo 明确',
      passed: includesAny(visualDescriptions, ['打开', '拿出', '佩戴', '使用', '涂抹', '倒出', '试穿', '手', '细节', '特写']),
      evidence: '检查手部互动、使用动作、细节特写关键词',
    },
    {
      item: 'Proof 场景可信',
      passed: includesAny(visualDescriptions, ['场景', '办公室', '地铁', '通勤', '运动', '家庭', '厨房', '夜跑', '对比', '真实', '手背', '脸部', '妆前', '粉扑', '质地', '肤感', '涂抹', '状态']),
      evidence: '检查真实使用场景或前后状态证明',
    },
    {
      item: 'CTA 合规明确',
      passed: Boolean(shots[shots.length - 1]?.narration) && includesAny(shots[shots.length - 1]?.narration || '', ['点击', '查看', '下方', '页面', '入手', '了解']),
      evidence: shots[shots.length - 1]?.narration || '缺少收尾口播',
    },
    {
      item: '画面描述不诱导模型造字',
      passed: !includesAny(visualDescriptions, ['字幕', '文字', '价格牌', '弹窗', '按钮', 'UI', '屏幕字样']),
      evidence: 'description 内不包含字幕/价格牌/弹窗/UI 等造字诱因',
    },
    {
      item: '合规风险可控',
      passed: !includesAny(spokenAndVisualText, ['根治', '100%有效', '绝对', '第一品牌', '国家级', '全网最低']),
      evidence: '未检测到绝对化或高风险承诺',
    },
    {
      item: '素材来源与商品真实性声明',
      passed: storyboard.constraints.some((item) => item.includes('素材') || item.includes('商品')),
      evidence: storyboard.constraints.join('；').slice(0, 80),
    },
  ];

  const passed = checklist.filter((item) => item.passed).length;
  return {
    score: Math.round((passed / checklist.length) * 100),
    checklist,
  };
}

function buildFallbackScript(
  productInfo: ProductInfo,
  methodology: ScriptMethodology,
): {
  title: string;
  narrative: string;
  visualStyle: string;
  shots: Shot[];
  constraints: string[];
  creativeTags: string[];
} {
  const product = productInfo.title || '商品';
  const primaryPoint = productInfo.sellingPoints[0] || '核心卖点';
  const scene = productInfo.scene || '日常使用场景';

  return {
    title: `${product.slice(0, 8)}种草`,
    narrative: `用${scene}中的具体痛点开场，快速展示${product}的${primaryPoint}，再用真实场景证明并安全 CTA。`,
    visualStyle: '真实商家短视频风格，竖版 9:16，明亮自然光，近景手部演示，快切但画面干净，无画面文字。',
    shots: [
      {
        id: uuid(),
        index: 0,
        description: `真实${scene.split('、')[0] || '日常'}场景中，目标用户露出明显困扰表情，手部迅速把${product}拿到镜头前，产品在前 2 秒清晰入镜，背景轻微虚化，自然光突出产品轮廓，只保留人物动作和产品主体`,
        cameraMovement: '手持快速推进到产品近景',
        duration: 3.8,
        narration: `${scene.split('、')[0] || '日常'}还在被这个问题困扰？`,
        subtitle: '这个真的省心',
        transition: 'cut',
        bgm: '强节奏鼓点开场',
      },
      {
        id: uuid(),
        index: 1,
        description: `干净桌面近景，手部打开并操作${product}，展示外观、核心部件和${primaryPoint}相关细节，产品始终位于画面中心，柔和补光，背景无包装字样和屏幕界面`,
        cameraMovement: '微距环绕加轻微推近',
        duration: 4.2,
        narration: `重点是${primaryPoint}，上手很直接`,
        subtitle: primaryPoint.slice(0, 12),
        transition: 'match_cut',
        bgm: '节奏稳定卡点',
      },
      {
        id: uuid(),
        index: 2,
        description: `连续展示两个真实使用场景：用户在${scene}中自然使用${product}，穿插产品细节特写和手部动作，画面对比使用前后的状态变化，只保留真实场景和产品动作`,
        cameraMovement: '场景快切与手持跟拍结合',
        duration: 4.5,
        narration: `通勤、办公、运动都能派上用场`,
        subtitle: '多场景都能用',
        transition: 'cut',
        bgm: '节奏上扬',
      },
      {
        id: uuid(),
        index: 3,
        description: `${product}放在简洁桌面中央，手部轻轻推近产品后停留定格，柔和高光突出材质和轮廓，只保留简洁背景和产品主体`,
        cameraMovement: '慢推至产品定格',
        duration: 4.0,
        narration: '想了解的话，点进页面看当前活动',
        subtitle: '点进页面看看',
        transition: 'fade',
        bgm: '鼓点收束',
      },
    ],
    constraints: [
      '总时长控制在15-20秒',
      '商品外观需与上传素材保持一致，不能虚构品牌、认证、销量或具体优惠力度',
      '素材来源声明：参考库仅保存公开视频结构化分析结果，不复刻、不混剪原视频；上传素材需来自商家自有或可商用来源。',
      '视频模型禁字约束：画面描述不得要求生成字幕、价格牌、弹窗、UI、中文/英文字符或数字，字幕由后期层处理。',
      methodology.riskControl,
    ],
    creativeTags: ['痛点Hook', '手部演示', '场景证明', '安全CTA'],
  };
}

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
    const referenceAnalyses = referencesForCategory(productInfo.category);
    const methodology = buildMethodology(template, referenceAnalyses);

    const systemPrompt = `你是 TikTok Shop / Reels 电商短视频增长策划专家，擅长把商品卖点转成高转化、可执行的视频分镜。
你的输出必须服务于真实带货转化，并遵循短视频广告创意规律：
- 前 2-3 秒用强 Hook 和具体痛点打断滑动，避免空泛开场。
- 叙事采用 Hook -> Problem/Tension -> Product Demo -> Visual Proof -> Offer/CTA。
- 商品要尽早出现，并贯穿多个镜头；至少 2 个镜头展示真实使用、手部互动、细节或前后状态变化。
- 镜头节奏要快但清楚：每 3-4.5 秒一个信息点，动作、构图、光线、主体都要可被图生视频/文生视频模型执行。
- CTA 要明确但合规，不编造销量、认证、具体折扣、医疗/功效承诺。
- 画面 description 禁止要求模型生成任何字幕、价格牌、弹窗、UI 文案、中文/英文字符或数字；字幕只写在 subtitle 字段，后期层处理。
视频总时长控制在 15-20 秒，包含 4 个高质量关键分镜。请严格输出 JSON，不要包含 markdown 代码块、注释或多余解释。`;

    const prompt = `请为以下商品生成一条高转化 TikTok Shop 带货短视频剧本：

商品信息：
- 标题：${productInfo.title}
- 核心卖点：${productInfo.sellingPoints.join('、') || '请根据商品标题合理提炼'}
- 目标人群：${productInfo.targetAudience || 'TikTok Shop 潜在消费者'}
- 使用场景：${productInfo.scene || '日常真实使用场景'}
- 类目：${productInfo.category || '通用电商商品'}
- 价格/优惠：${productInfo.price || '不强行编造具体价格'}

创作策略：${strategy}
创作因子：${JSON.stringify(factors)}
参考视频结构化拆解（只复用方法论，不复刻原视频）：${JSON.stringify(referenceAnalyses)}
本次方法论：${JSON.stringify(methodology)}
${referenceStyle ? `参考风格：${referenceStyle}` : ''}

创作要求：
1. 只生成 4 个分镜，整体 15-20 秒，优先高质量而不是堆镜头。
2. 分镜结构必须是：
   - Shot 1 Hook：0-3 秒，痛点/反差/好奇心开场，商品或使用结果尽早出现。
   - Shot 2 Demo：展示商品外观、手部互动、核心功能或使用步骤。
   - Shot 3 Proof：用真实场景、细节特写、状态对比或连续动作证明卖点。
   - Shot 4 Close：产品定格 + 口播 CTA，画面不要生成促销文字、价格牌、弹窗或 UI。
3. 每个 description 都要具体到主体、场景、动作、构图、光线、画面重点；避免“科技感背景”“高级氛围”这种不可执行空话。
4. narration 要像真人口播，短、直接、有购买理由；subtitle 要更短，但只作为后期字幕文案，不得写进画面 description。
5. 每个镜头都要有动作或镜头运动，避免静态产品海报。
6. 至少 2 个镜头必须出现人、手、真实使用场景或可感知的生活问题。
7. 不允许虚假绝对化表达，不编造认证、销量、价格、功效；优惠只能说“当前页面为准”“可查看活动”这类安全表达。
8. 所有 description 禁止出现“文字、字幕、标题、价格、弹窗、按钮、UI、logo 文案、包装字样、屏幕字样”等让视频模型造字的要求。
9. 视觉风格要统一，方便后续图生视频保持商品外观一致。
10. constraints 必须包含：素材来源声明、商品真实性约束、合规风险约束、视频模型禁字约束。
11. creativeTags 输出 3-6 个标签，用于后续因子归因，例如「通勤痛点」「手部演示」「多场景证明」。

请生成如下 JSON 结构：
{
  "title": "短视频标题，12字以内",
  "narrative": "Hook-Problem-Demo-Proof-CTA 的叙事框架，一句话",
  "visualStyle": "统一视觉风格，包含色调、光线、镜头节奏",
  "shots": [
    {
      "index": 1,
      "description": "可直接给视频模型执行的画面描述，包含主体/动作/环境/构图/光线；禁止要求画面出现文字或弹窗",
      "cameraMovement": "镜头运动方式，例如快速推进、微距环绕、手持跟拍",
      "duration": 3.5,
      "narration": "口语化旁白，单句不超过18字",
      "subtitle": "屏幕字幕，单句不超过12字",
      "transition": "cut/fade/zoom/wipe/match_cut",
      "bgm": "配乐节奏和情绪"
    }
  ],
  "constraints": ["合规约束", "素材使用约束", "风格一致性约束"],
  "creativeTags": ["创意标签"]
}`;

    let result: {
      title: string;
      narrative: string;
      visualStyle: string;
      shots: Shot[];
      constraints: string[];
      creativeTags?: string[];
    };
    try {
      result = await generateStructuredJSON<typeof result>(prompt, systemPrompt);
    } catch (err: any) {
      console.warn('[ScriptService] text model generation failed, using local fallback:', err.message);
      result = buildFallbackScript(productInfo, methodology);
      result.constraints.push(`模型降级说明：文本模型暂不可用，已使用本地结构化方法论兜底生成。原因：${err.message}`);
    }

    const shots = normalizeShots(result.shots || []);
    const constraints = result.constraints?.length ? result.constraints : [
      '总时长控制在15-20秒',
      '商品外观需与上传素材保持一致',
      '避免绝对化和虚假功效表达',
    ];
    const sourceConstraint = '素材来源声明：参考库仅保存公开视频结构化分析结果，不复刻、不混剪原视频；上传素材需来自商家自有或可商用来源。';
    const modelTextConstraint = '视频模型禁字约束：画面描述不得要求生成字幕、价格牌、弹窗、UI、中文/英文字符或数字，字幕由后期层处理。';
    if (!constraints.some((item) => item.includes('素材来源'))) constraints.push(sourceConstraint);
    if (!constraints.some((item) => item.includes('禁字') || item.includes('字幕'))) constraints.push(modelTextConstraint);

    const storyboard: Storyboard = {
      id: uuid(),
      productId: productInfo.id,
      productInfo,
      title: result.title,
      strategy,
      factors,
      templateId: template?.id || '',
      methodology,
      referenceAnalyses,
      narrative: result.narrative,
      visualStyle: result.visualStyle,
      shots,
      constraints,
      creativeTags: result.creativeTags?.length ? result.creativeTags : [
        methodology.hookTechnique.slice(0, 12),
        methodology.proofTechnique.slice(0, 12),
        '合规CTA',
      ],
      status: 'ready',
      createdAt: new Date().toISOString(),
    };

    const quality = evaluateStoryboard(storyboard);
    storyboard.qualityScore = quality.score;
    storyboard.qualityChecklist = quality.checklist;

    scripts.push(storyboard);
    save();
    return storyboard;
  },

  // ── 获取模板列表 ──
  getTemplates(): ScriptTemplate[] {
    return templates;
  },

  getReferenceAnalyses(category?: string): ReferenceAnalysis[] {
    if (!category) return REFERENCE_LIBRARY;
    return referencesForCategory(category);
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
    if (updates.shots) {
      scripts[idx].shots = updates.shots.map((shot, i) => ({
        ...shot,
        index: i,
        description: sanitizeVisualDescription(shot.description || ''),
      }));
    }
    const quality = evaluateStoryboard(scripts[idx]);
    scripts[idx].qualityScore = quality.score;
    scripts[idx].qualityChecklist = quality.checklist;
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
    const prompt = `原始分镜：${JSON.stringify(shot)}
所属剧本方法论：${JSON.stringify(sb.methodology || {})}
所属剧本约束：${JSON.stringify(sb.constraints || [])}
修改指令：${instruction}

请输出修改后的单个分镜 JSON（仅分镜对象，不要数组）。
要求：
1. 保留原分镜在整体 Hook/Demo/Proof/CTA 结构中的职责。
2. description 必须可直接给视频模型执行，包含主体、动作、场景、构图、光线。
3. description 禁止要求出现字幕、文字、价格牌、弹窗、按钮、UI、屏幕字样。
4. narration 口语化，subtitle 仅作为后期字幕文案。`;
    const newShot = await generateStructuredJSON<Shot>(prompt, '你是一个电商短视频分镜编辑专家，擅长在保持转化结构和合规约束的前提下微调单镜头。');

    sb.shots[shotIdx] = {
      ...newShot,
      id: shotId,
      index: shot.index,
      description: sanitizeVisualDescription(newShot.description || ''),
    };
    const quality = evaluateStoryboard(sb);
    sb.qualityScore = quality.score;
    sb.qualityChecklist = quality.checklist;
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
