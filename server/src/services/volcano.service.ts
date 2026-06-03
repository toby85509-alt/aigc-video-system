import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { getUploadDir, loadEnv } from '../config/env';

loadEnv();

const ARK_API_KEY = process.env.VOLCANO_ARK_API_KEY || '';
const TEXT_EP = process.env.VOLCANO_TEXT_EP || 'doubao-seed-2.0-pro';
const VIDEO_EP = process.env.VOLCANO_VIDEO_EP || 'doubao-seedance-1-0-pro-250528';
const ARK_BASE = 'https://ark.cn-beijing.volces.com/api/v3';
const DEEPSEEK_BASE = 'https://api.deepseek.com';
const OUTPUT_DIR = path.resolve(getUploadDir(), 'outputs');

let volcanoClient: OpenAI | null = null;
let deepseekClient: OpenAI | null = null;
let videoCreateGate: Promise<void> = Promise.resolve();
let nextVideoCreateAt = 0;

function isMockMode(): boolean {
  return process.env.MOCK_AI === 'true' || !ARK_API_KEY;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getVolcano(): OpenAI {
  if (!volcanoClient) {
    volcanoClient = new OpenAI({
      apiKey: ARK_API_KEY,
      baseURL: ARK_BASE,
    });
  }
  return volcanoClient;
}

function getDeepSeek(): OpenAI {
  if (!deepseekClient) {
    deepseekClient = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      baseURL: DEEPSEEK_BASE,
    });
  }
  return deepseekClient;
}

async function reserveVideoCreateSlot(): Promise<void> {
  const previous = videoCreateGate;
  let release!: () => void;
  videoCreateGate = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  const waitMs = Math.max(0, nextVideoCreateAt - Date.now());
  if (waitMs > 0) await sleep(waitMs);
  nextVideoCreateAt = Date.now() + 16000;
  release();
}

function isRateLimitError(status: number, body: string): boolean {
  return status === 429 || body.includes('RateLimit') || body.includes('TooManyRequests');
}

function mockMaterialAnalysis(category: string) {
  const tagMap: Record<string, { tags: string[]; description: string; sliceType: string }> = {
    '电子产品': { tags: ['科技', '数码', '便携', '质感'], description: '清晰的电子产品展示图', sliceType: 'product_overview' },
    '家居生活': { tags: ['家居', '实用', '简洁', '日常'], description: '真实家居生活场景中的商品展示', sliceType: 'usage_scene' },
    '美妆护肤': { tags: ['美妆', '护肤', '质感', '细节'], description: '干净高级的护肤品细节展示', sliceType: 'detail_closeup' },
    '服饰配饰': { tags: ['时尚', '穿搭', '质感', '配饰'], description: '适合短视频种草的服饰配饰素材', sliceType: 'usage_scene' },
    '食品饮料': { tags: ['食品', '新鲜', '诱人', '日常'], description: '适合食品饮料带货的细节素材', sliceType: 'detail_closeup' },
  };
  return tagMap[category] || { tags: ['商品', '优质', '展示'], description: '商品展示图', sliceType: 'product_overview' };
}

export async function generateText(prompt: string, systemPrompt?: string): Promise<string> {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });

  const client = ARK_API_KEY ? getVolcano() : getDeepSeek();
  const model = ARK_API_KEY ? TEXT_EP : process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  const response = await client.chat.completions.create({
    model,
    messages,
    temperature: 0.72,
    max_tokens: 4096,
  });
  return response.choices[0]?.message?.content || '';
}

export async function generateStructuredJSON<T>(prompt: string, systemPrompt: string): Promise<T> {
  const fullPrompt = `${systemPrompt}\n\n${prompt}\n\n请严格按照 JSON 格式输出，不要包含任何 markdown 代码块标记。`;
  const text = await generateText(fullPrompt);
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  return JSON.parse(cleaned) as T;
}

interface VideoTaskParams {
  prompt: string;
  duration?: number;
  ratio?: string;
  resolution?: string;
  imageUrl?: string;
}

async function createVideoTask(params: VideoTaskParams): Promise<string> {
  const { prompt, duration = 5, ratio = '9:16', resolution = '720p', imageUrl } = params;
  const textCommands = [`--rt ${ratio}`, `--dur ${duration}`, '--wm false', `--rs ${resolution}`].join(' ');

  const content: Record<string, unknown>[] = [
    { type: 'text', text: `${prompt} ${textCommands}` },
  ];
  if (imageUrl) {
    content.push({ type: 'image_url', image_url: { url: imageUrl } });
  }

  const body: Record<string, unknown> = { model: VIDEO_EP, content };
  let lastError = '';

  for (let attempt = 1; attempt <= 4; attempt++) {
    await reserveVideoCreateSlot();
    const res = await fetch(`${ARK_BASE}/contents/generations/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ARK_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json() as { id: string };
      return data.id;
    }

    lastError = await res.text();
    if (!isRateLimitError(res.status, lastError) || attempt === 4) {
      throw new Error(`创建视频任务失败: ${res.status} ${lastError}`);
    }

    const retryDelay = 45000 + attempt * 15000;
    console.warn(`[VideoTask] create rate-limited, retrying in ${retryDelay / 1000}s (attempt ${attempt}/4)`);
    await sleep(retryDelay);
  }

  throw new Error(`创建视频任务失败: ${lastError || 'unknown error'}`);
}

async function pollVideoTask(taskId: string, maxWaitMs = 600000): Promise<string> {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    const res = await fetch(`${ARK_BASE}/contents/generations/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${ARK_API_KEY}` },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`查询视频任务失败: ${res.status} ${err}`);
    }

    const data = await res.json() as { status: string; content?: { video_url?: string }; error?: { message: string } };
    if (data.status === 'succeeded') return data.content?.video_url || '';
    if (data.status === 'failed') throw new Error(`视频生成失败: ${data.error?.message || '未知错误'}`);
    await sleep(5000);
  }
  throw new Error('视频生成超时（10分钟）');
}

async function downloadVideo(videoUrl: string, fileName: string): Promise<string> {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const filePath = path.join(OUTPUT_DIR, fileName);
  const res = await fetch(videoUrl);
  if (!res.ok) throw new Error(`下载视频失败: ${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(filePath, buffer);
  return `/uploads/outputs/${fileName}`;
}

export async function generateVideoFromText(
  prompt: string,
  duration: number = 5,
  ratio: string = '9:16',
): Promise<string> {
  if (isMockMode()) return '';

  console.log(`[T2V] create task: prompt=${prompt.slice(0, 80)}..., dur=${duration}s`);
  const taskId = await createVideoTask({ prompt, duration, ratio });
  console.log(`[T2V] task id: ${taskId}`);

  const videoUrl = await pollVideoTask(taskId);
  const localPath = await downloadVideo(videoUrl, `t2v_${taskId.slice(-8)}.mp4`);
  console.log(`[T2V] saved: ${localPath}`);
  return localPath;
}

export async function generateVideoFromImage(
  imageUrl: string,
  prompt: string,
  duration: number = 5,
  ratio: string = '9:16',
): Promise<string> {
  if (isMockMode()) return '';

  console.log(`[I2V] create task: image=${imageUrl.slice(0, 50)}..., prompt=${prompt.slice(0, 50)}..., dur=${duration}s`);
  const taskId = await createVideoTask({ prompt, duration, ratio, imageUrl });
  console.log(`[I2V] task id: ${taskId}`);

  const videoUrl = await pollVideoTask(taskId);
  const localPath = await downloadVideo(videoUrl, `i2v_${taskId.slice(-8)}.mp4`);
  console.log(`[I2V] saved: ${localPath}`);
  return localPath;
}

export async function generateVideo(
  imageUrl: string,
  prompt: string,
  duration: number = 5,
): Promise<string> {
  if (!imageUrl) return generateVideoFromText(prompt, duration);
  return generateVideoFromImage(imageUrl, prompt, duration);
}

export async function synthesizeSpeech(text: string, voice: string = 'zh_female_1'): Promise<string> {
  const response = await getDeepSeek().chat.completions.create({
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    messages: [{ role: 'user', content: `请为以下台词生成朗读标记（SSML），语音：${voice}\n${text}` }],
    max_tokens: 500,
  });
  return response.choices[0]?.message?.content || '';
}

export async function analyzeMaterial(
  imageUrl: string,
  productInfo: { title: string; sellingPoints: string[]; category: string },
): Promise<{ tags: string[]; description: string; sliceType: string }> {
  if (isMockMode()) return mockMaterialAnalysis(productInfo.category);
  const response = await getVolcano().chat.completions.create({
    model: TEXT_EP,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imageUrl } },
          {
            type: 'text',
            text: `分析这张商品图片，商品信息：${JSON.stringify(productInfo)}。请输出 JSON：{ "tags": string[], "description": string, "sliceType": "product_overview"|"detail_closeup"|"usage_scene"|"size_reference"|"other" }`,
          },
        ],
      },
    ],
    max_tokens: 1000,
  });

  const content = response.choices[0]?.message?.content || '{}';
  const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return mockMaterialAnalysis(productInfo.category);
  }
}
