import { v4 as uuid } from 'uuid';
import { VideoProject, VideoShot, Storyboard, MaterialAsset } from '../types';
import { generateText } from './volcano.service';
import { scriptService } from './script.service';
import { materialService } from './material.service';
import path from 'path';
import fs from 'fs';

const DATA_DIR = process.env.UPLOAD_DIR || './uploads';
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');

let projects: VideoProject[] = [];
function load() { try { if (fs.existsSync(PROJECTS_FILE)) projects = JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf-8')); } catch {} }
function save() { fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2)); }
load();

// ── 模拟视频渲染任务 ──
function mockRenderShot(shot: VideoShot, duration: number): Promise<VideoShot> {
  return new Promise((resolve) => {
    const totalSteps = 10;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      shot.status = 'generating';
      if (step >= totalSteps) {
        clearInterval(interval);
        shot.status = 'completed';
        // 生成模拟视频/图片 URL
        shot.videoUrl = `/outputs/shot_${shot.shotId}.mp4`;
        resolve(shot);
      }
    }, (duration * 1000) / totalSteps);
  });
}

export const videoService = {
  // ── 一键成片 ──
  async createVideo(params: {
    storyboardId: string;
    materialIds: string[];
    resolution?: '9:16' | '16:9';
    name?: string;
  }): Promise<VideoProject> {
    const storyboard = scriptService.getById(params.storyboardId);
    if (!storyboard) throw new Error('剧本不存在');

    const project: VideoProject = {
      id: uuid(),
      name: params.name || storyboard.title,
      storyboardId: params.storyboardId,
      materialIds: params.materialIds,
      resolution: params.resolution || '9:16',
      status: 'pending',
      progress: 0,
      shots: storyboard.shots.map((s) => ({
        shotId: s.id,
        status: 'pending',
        startTime: s.index * 3,
        endTime: (s.index + 1) * s.duration,
        materialSliceId: s.materialSliceId,
      })),
      createdAt: new Date().toISOString(),
    };

    projects.push(project);
    save();

    // 异步执行渲染
    this.renderProject(project.id).catch(console.error);

    return project;
  },

  // ── 渲染视频项目 ──
  async renderProject(projectId: string): Promise<void> {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    project.status = 'generating';
    save();

    const totalShots = project.shots.length;
    let completedShots = 0;

    for (const shot of project.shots) {
      try {
        await mockRenderShot(shot, 4); // 每分镜模拟 4 秒渲染
        completedShots++;
        project.progress = Math.round((completedShots / totalShots) * 100);
        save();
      } catch (err: any) {
        shot.status = 'failed';
        shot.error = err.message;
        project.status = 'failed';
        project.error = `分镜 ${shot.shotId} 渲染失败`;
        save();
        return;
      }
    }

    // 生成最终输出 URL（模拟）
    project.outputUrl = `/outputs/${project.id}.mp4`;
    project.status = 'completed';
    project.progress = 100;
    project.completedAt = new Date().toISOString();
    save();
  },

  // ── 重新渲染单个分镜 ──
  async rerenderShot(projectId: string, shotId: string): Promise<VideoProject | undefined> {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return undefined;

    const shot = project.shots.find((s) => s.shotId === shotId);
    if (!shot) return undefined;

    shot.status = 'pending';
    save();

    try {
      await mockRenderShot(shot, 4);
      save();
    } catch (err: any) {
      shot.status = 'failed';
      shot.error = err.message;
      save();
    }

    return project;
  },

  // ── 获取项目列表 ──
  list(params: { page?: number; pageSize?: number }) {
    const filtered = [...projects].reverse();
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const start = (page - 1) * pageSize;
    return { items: filtered.slice(start, start + pageSize), total: filtered.length };
  },

  // ── 获取单个项目 ──
  getById(id: string): VideoProject | undefined {
    return projects.find((p) => p.id === id);
  },

  // ── 删除项目 ──
  delete(id: string): boolean {
    const idx = projects.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    projects.splice(idx, 1);
    save();
    return true;
  },

  // ── 获取 Mock 数据看板指标 ──
  getDashboardMetrics() {
    const completed = projects.filter((p) => p.status === 'completed');
    const failed = projects.filter((p) => p.status === 'failed');
    const total = projects.length;

    const stylePerformance = [
      { style: '质感沉浸风', videoCount: 12, avgCTR: 4.8, avgConversion: 3.2, avgWatchTime: 22.5 },
      { style: '快节奏种草风', videoCount: 18, avgCTR: 5.6, avgConversion: 4.1, avgWatchTime: 18.3 },
      { style: '问题解决型', videoCount: 8, avgCTR: 6.2, avgConversion: 5.0, avgWatchTime: 25.1 },
    ];

    return {
      totalVideos: total,
      totalScripts: 0, // 由 script service 补充
      totalMaterials: 0,
      avgGenerationTime: total > 0 ? 28.5 : 0,
      successRate: total > 0 ? Math.round((completed.length / total) * 100) : 100,
      stylePerformance,
      recentTasks: [],
    };
  },
};
