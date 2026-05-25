import OpenAI from 'openai';
import { v4 as uuid } from 'uuid';

// ── 检测是否使用 Mock 模式 ──
const USE_MOCK = process.env.MOCK_AI === 'true' || !process.env.VOLCANO_ARK_API_KEY;

// 火山引擎 OpenAI 兼容 SDK (仅在非 Mock 模式初始化)
const client = USE_MOCK ? null : new OpenAI({
  apiKey: process.env.VOLCANO_ARK_API_KEY || '',
  baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
});

// ── Mock 剧本数据 ──
function mockScript(productTitle: string, sellingPoints: string[], category: string, scene: string) {
  const styles: Record<string, any> = {
    '电子产品': {
      narrative: '快节奏科技感展示，强调产品功能与使用场景的完美融合',
      visualStyle: '冷色调科技风，高对比度光影',
      shots: [
        { description: '产品在暗光环境中缓缓出现，呼吸灯渐亮', cameraMovement: '缓慢推近', duration: 3.5, narration: '当科技与生活完美融合', subtitle: '为你的每一天', transition: 'fade', bgm: '电子氛围音乐渐入' },
        { description: '特写产品核心功能部件，展示精密工艺', cameraMovement: '微距特写旋转', duration: 3.0, narration: `每一处细节，都经过精心打磨`, subtitle: '精工品质', transition: 'cut', bgm: '节奏渐强' },
        { description: '用户在实际场景中使用产品，展现便利性', cameraMovement: '跟随镜头', duration: 4.0, narration: `${scene}，从此变得不一样`, subtitle: sellingPoints[0] || '极致体验', transition: 'dissolve', bgm: '轻快节奏' },
        { description: '产品多角度旋转展示，突出设计美感', cameraMovement: '环绕旋转', duration: 3.0, narration: '不止是工具，更是品味的表达', subtitle: '出众设计', transition: 'wipe', bgm: '稳定节拍' },
        { description: '产品LOGO定格，价格/优惠信息弹出', cameraMovement: '静态定格', duration: 3.5, narration: `${productTitle}，现在入手享限时优惠`, subtitle: '立即购买', transition: 'zoom', bgm: '音乐渐弱收尾' },
      ],
      constraints: ['视频总时长控制在15-30秒', '字幕需与旁白同步', '产品特写不少于2个分镜'],
    },
    '家居生活': {
      narrative: '温暖治愈的家庭场景叙事，强调产品带来的生活品质提升',
      visualStyle: '暖色调自然光，柔和温馨',
      shots: [
        { description: '清晨阳光透过窗帘洒进房间', cameraMovement: '缓慢横移', duration: 3.5, narration: '每个清晨，都值得被温柔以待', subtitle: '美好的一天', transition: 'fade', bgm: '轻柔钢琴音' },
        { description: '产品特写，展示材质与质感', cameraMovement: '近距离特写', duration: 3.0, narration: '触手可及的品质感', subtitle: sellingPoints[0] || '品质生活', transition: 'dissolve', bgm: '温暖弦乐' },
        { description: '家人使用产品的温馨场景', cameraMovement: '中景固定', duration: 4.0, narration: `让${scene}，充满幸福的温度`, subtitle: '为家而来', transition: 'cut', bgm: '轻快温馨' },
        { description: '产品设计细节展示', cameraMovement: '微距平移', duration: 3.0, narration: '简约而不简单的设计哲学', subtitle: '匠心之作', transition: 'wipe', bgm: '稳定节奏' },
        { description: '品牌收尾，优惠信息展示', cameraMovement: '静态', duration: 3.5, narration: `${productTitle}，把温暖带回家`, subtitle: '立即选购', transition: 'fade', bgm: '音乐渐弱' },
      ],
      constraints: ['整体氛围温馨治愈', '避免快节奏剪辑'],
    },
    '美妆护肤': {
      narrative: '高级质感美学展示，强调成分与效果的视觉呈现',
      visualStyle: '极简高级感，柔焦朦胧光效',
      shots: [
        { description: '水滴/花瓣等意向元素慢动作', cameraMovement: '极慢速特写', duration: 3.5, narration: '自然的力量，为肌肤注入新生', subtitle: '源自自然', transition: 'fade', bgm: '空灵女声哼唱' },
        { description: '产品瓶身特写，展示质感', cameraMovement: '旋转推近', duration: 3.0, narration: '每一滴，都是精华的馈赠', subtitle: sellingPoints[0] || '高效护肤', transition: 'dissolve', bgm: '静谧氛围' },
        { description: '产品使用效果对比展示', cameraMovement: '分屏对比', duration: 4.0, narration: '看得见的改变，感受得到的呵护', subtitle: '焕变新生', transition: 'wipe', bgm: '节奏渐起' },
        { description: '多种使用场景展示', cameraMovement: '快切蒙太奇', duration: 3.0, narration: `无论${scene}，时刻保持最佳状态`, subtitle: '全天候守护', transition: 'cut', bgm: '自信节奏' },
        { description: '产品全家福+品牌收尾', cameraMovement: '缓推+定格', duration: 3.5, narration: `${productTitle}，你的专属美丽密码`, subtitle: '立即探索', transition: 'zoom', bgm: '优雅收束' },
      ],
      constraints: ['画面干净高级', '字体使用衬线体', '色调偏暖'],
    },
    'default': {
      narrative: '自然展示商品核心卖点，以真实场景打动消费者',
      visualStyle: '清新自然的纪实风格',
      shots: [
        { description: '产品在自然光下的整体展示', cameraMovement: '缓慢推进', duration: 3.5, narration: '发现生活中的不平凡', subtitle: '', transition: 'fade', bgm: '轻快吉他' },
        { description: '核心卖点特写展示', cameraMovement: '微距特写', duration: 3.0, narration: sellingPoints[0] || '为你而来', subtitle: '', transition: 'cut', bgm: '节奏稳定' },
        { description: '真实使用场景还原', cameraMovement: '跟随镜头', duration: 4.0, narration: `${scene}的最佳伴侣`, subtitle: '', transition: 'dissolve', bgm: '轻快节奏' },
        { description: '多角度产品展示', cameraMovement: '环绕旋转', duration: 3.0, narration: '每个角度都完美', subtitle: '', transition: 'wipe', bgm: '保持节奏' },
        { description: '品牌收尾+行动号召', cameraMovement: '静态定格', duration: 3.5, narration: `${productTitle}，值得拥有`, subtitle: '立即购买', transition: 'zoom', bgm: '音乐收尾' },
      ],
      constraints: ['视频控制在15-25秒'],
    },
  };

  const tmpl = styles[category] || styles['default'];
  return {
    title: `${productTitle}｜${sellingPoints[0] || '品质之选'}`,
    narrative: tmpl.narrative,
    visualStyle: tmpl.visualStyle,
    shots: tmpl.shots.map((s: any, i: number) => ({
      ...s,
      index: i,
      id: uuid(),
    })),
    constraints: tmpl.constraints,
  };
}

// ── Mock 素材分析 ──
function mockMaterialAnalysis(category: string) {
  const tagMap: Record<string, { tags: string[]; description: string; sliceType: string }> = {
    '电子产品': { tags: ['科技', '数码', '智能', '便携'], description: '科技感十足的电子产品展示图', sliceType: 'product_overview' },
    '家居生活': { tags: ['家居', '温馨', '实用', '简约'], description: '温馨家居场景中的产品展示', sliceType: 'usage_scene' },
    '美妆护肤': { tags: ['美妆', '护肤', '精致', '高级感'], description: '精致美妆产品特写展示', sliceType: 'detail_closeup' },
    '服饰配饰': { tags: ['时尚', '穿搭', '潮流', '质感'], description: '时尚穿搭场景展示', sliceType: 'usage_scene' },
    '食品饮料': { tags: ['美食', '饮品', '新鲜', '诱人'], description: '诱人食品特写展示', sliceType: 'detail_closeup' },
  };
  return tagMap[category] || { tags: ['精选', '优质', '新品'], description: '商品展示图', sliceType: 'product_overview' };
}

// ── 导出接口 ──

export async function generateText(prompt: string, systemPrompt?: string): Promise<string> {
  if (USE_MOCK) {
    return JSON.stringify(mockScript('商品', ['核心卖点'], '电子产品', '日常使用'));
  }
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });
  const response = await client!.chat.completions.create({
    model: process.env.VOLCANO_TEXT_EP || 'doubao-seed-2.0-pro',
    messages,
    temperature: 0.8,
    max_tokens: 4096,
  });
  return response.choices[0]?.message?.content || '';
}

export async function generateStructuredJSON<T>(prompt: string, systemPrompt: string): Promise<T> {
  if (USE_MOCK) {
    // 从 prompt 中提取商品信息
    const titleMatch = prompt.match(/标题[：:]\s*(.+)/);
    const catMatch = prompt.match(/类目[：:]\s*(.+)/);
    const spMatch = prompt.match(/卖点[：:]\s*(.+)/);
    const sceneMatch = prompt.match(/场景[：:]\s*(.+)/);
    const title = titleMatch?.[1] || '商品';
    const category = catMatch?.[1] || '电子产品';
    const sellingPoints = spMatch?.[1]?.split(/[,，、]/).map((s: string) => s.trim()) || [];
    const scene = sceneMatch?.[1] || '日常使用';
    return mockScript(title, sellingPoints, category, scene) as unknown as T;
  }
  const fullPrompt = `${systemPrompt}\n\n${prompt}\n\n请严格按照 JSON 格式输出，不要包含任何 markdown 代码块标记。`;
  const text = await generateText(fullPrompt);
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  return JSON.parse(cleaned) as T;
}

export async function generateVideo(
  imageUrl: string, prompt: string, duration: number = 5
): Promise<string> {
  if (USE_MOCK) return `/outputs/mock_video_${Date.now()}.mp4`;
  const response = await client!.chat.completions.create({
    model: process.env.VOLCANO_VIDEO_EP || 'doubao-seedance-1.5-pro',
    messages: [
      { role: 'user', content: [
        { type: 'image_url', image_url: { url: imageUrl } },
        { type: 'text', text: `${prompt}, 时长${duration}秒` },
      ]},
    ],
  });
  return response.choices[0]?.message?.content || '';
}

export async function synthesizeSpeech(text: string, voice: string = 'zh_female_1'): Promise<string> {
  if (USE_MOCK) return `<speak>${text}</speak>`;
  const response = await client!.chat.completions.create({
    model: process.env.VOLCANO_TEXT_EP || 'doubao-seed-2.0-pro',
    messages: [{ role: 'user', content: `请为以下台词生成朗读标记(SSML)，语音: ${voice}:\n${text}` }],
    max_tokens: 500,
  });
  return response.choices[0]?.message?.content || '';
}

export async function analyzeMaterial(
  imageUrl: string,
  productInfo: { title: string; sellingPoints: string[]; category: string }
): Promise<{ tags: string[]; description: string; sliceType: string }> {
  if (USE_MOCK) return mockMaterialAnalysis(productInfo.category);
  const response = await client!.chat.completions.create({
    model: process.env.VOLCANO_TEXT_EP || 'doubao-seed-2.0-pro',
    messages: [
      { role: 'user', content: [
        { type: 'image_url', image_url: { url: imageUrl } },
        { type: 'text', text: `分析这张商品图片，商品信息：${JSON.stringify(productInfo)}。请输出JSON格式：{ "tags": string[], "description": string, "sliceType": "product_overview"|"detail_closeup"|"usage_scene"|"size_reference"|"other" }` },
      ]},
    ],
    max_tokens: 1000,
  });
  const content = response.choices[0]?.message?.content || '{}';
  const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  try { return JSON.parse(cleaned); } catch { return { tags: [], description: '', sliceType: 'other' }; }
}
