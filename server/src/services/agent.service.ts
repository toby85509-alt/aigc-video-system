import { v4 as uuid } from 'uuid';
import { AgentPipeline, PipelineStage } from '../types';
import path from 'path';
import fs from 'fs';

const DATA_DIR = process.env.UPLOAD_DIR || './uploads';
const PIPELINES_FILE = path.join(DATA_DIR, 'pipelines.json');

let pipelines: AgentPipeline[] = [];
function load() { try { if (fs.existsSync(PIPELINES_FILE)) pipelines = JSON.parse(fs.readFileSync(PIPELINES_FILE, 'utf-8')); } catch {} }
function save() { fs.writeFileSync(PIPELINES_FILE, JSON.stringify(pipelines, null, 2)); }
load();

// Agent 角色定义
const AGENTS = {
  analyst: '素材分析 Agent — 分析商品图片，提取视觉特征与标签',
  playwright: '剧本创作 Agent — 根据商品信息与策略生成分镜脚本',
  cinematographer: '视觉导演 Agent — 匹配素材切片与分镜画面',
  editor: '智能剪辑 Agent — 画面拼接、转场、特效合成',
  soundDesigner: '音频设计 Agent — TTS配音、BGM匹配、音效',
  qualityCheck: '质量审核 Agent — 视频质量检查、合规校验',
};

export const agentPipelineService = {
  // 创建完整视频生成管线
  async createFullPipeline(params: {
    materialId: string;
    storyboardId: string;
    resolution?: string;
    name?: string;
  }): Promise<AgentPipeline> {
    const pipeline: AgentPipeline = {
      id: uuid(),
      name: params.name || '全链路视频生成',
      stages: [
        { name: '素材分析', agent: 'analyst', status: 'pending', input: { materialId: params.materialId } },
        { name: '剧本校验', agent: 'playwright', status: 'pending', input: { storyboardId: params.storyboardId } },
        { name: '视觉匹配', agent: 'cinematographer', status: 'pending', input: {} },
        { name: '智能剪辑', agent: 'editor', status: 'pending', input: { resolution: params.resolution || '9:16' } },
        { name: '音频合成', agent: 'soundDesigner', status: 'pending', input: {} },
        { name: '质量审核', agent: 'qualityCheck', status: 'pending', input: {} },
      ],
      status: 'pending',
      progress: 0,
      createdAt: new Date().toISOString(),
    };

    pipelines.push(pipeline);
    save();
    this.executePipeline(pipeline.id).catch(console.error);
    return pipeline;
  },

  // 执行管线
  async executePipeline(pipelineId: string): Promise<void> {
    const pipeline = pipelines.find((p) => p.id === pipelineId);
    if (!pipeline) return;

    pipeline.status = 'running';
    save();

    const totalStages = pipeline.stages.length;

    for (let i = 0; i < pipeline.stages.length; i++) {
      const stage = pipeline.stages[i];
      stage.status = 'running';
      pipeline.progress = Math.round((i / totalStages) * 100);
      save();

      const startTime = Date.now();

      try {
        // 模拟各 Agent 执行（真实环境会调用对应 API）
        await this.executeStage(stage);
        stage.status = 'completed';
        stage.duration = (Date.now() - startTime) / 1000;
        stage.output = { message: `${AGENTS[stage.agent as keyof typeof AGENTS] || stage.agent} 执行完成` };
      } catch (err: any) {
        stage.status = 'failed';
        stage.error = err.message;
        pipeline.status = 'failed';
        save();
        return;
      }

      pipeline.progress = Math.round(((i + 1) / totalStages) * 100);
      save();
    }

    pipeline.status = 'completed';
    pipeline.progress = 100;
    save();
  },

  async executeStage(stage: PipelineStage): Promise<void> {
    // 模拟各 Agent 的执行时间（真实环境调用 AI API）
    const durations: Record<string, number> = {
      analyst: 800,
      playwright: 1200,
      cinematographer: 600,
      editor: 2000,
      soundDesigner: 1500,
      qualityCheck: 500,
    };
    const duration = durations[stage.agent] || 1000;
    await new Promise((resolve) => setTimeout(resolve, duration));
  },

  // 获取管线
  getById(id: string): AgentPipeline | undefined {
    return pipelines.find((p) => p.id === id);
  },

  // 管线列表
  list(): AgentPipeline[] {
    return [...pipelines].reverse();
  },

  // 获取 Agent 列表（供前端展示）
  getAgents() {
    return Object.entries(AGENTS).map(([id, description]) => ({ id, description }));
  },
};
