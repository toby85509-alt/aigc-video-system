# 电商场景 AIGC 带货视频生成系统

AI 全栈挑战赛参赛项目 —— 面向 TikTok Shop 商家的智能带货短视频自动生成系统。

## 核心功能

### P0 必做（已实现）
- **素材管理** — 商品图片/视频上传，AI 自动打标签与分析
- **剧本生成** — 3 套创作模板，LLM 自动生成分镜脚本（叙事框架 + 分镜描述 + 台词/字幕/BGM）
- **一键成片** — 选择剧本，端到端自动渲染视频（模拟渲染流水线）
- **任务进度** — 异步任务实时进度追踪，步骤级状态展示
- **预览导出** — 视频预览播放器，支持竖版 9:16 和横版 16:9

### P1 已实现
- **素材标签/Embedding 检索** — 关键词搜索 + 类目筛选
- **智能剪辑 Agent** — 分镜级自动拼接 + 转场 + 配音流程
- **分镜级编辑器** — 可视化分镜列表 + 详情编辑面板，AI 干预重生成
- **TTS/字幕/BGM** — 剧本输出包含完整字幕和配乐说明
- **失败重试** — 单个分镜失败后一键重新渲染
- **生成过程 Trace** — 任务中心时间线展示全链路步骤
- **Mock 数据看板** — 风格 × 转化效果对比表

### P2 加分项（已实现）
- **A/B 对比出片** — 同一商品并行生成多套模板剧本和视频项目，展示 CTR/CVR/观看时长预估
- **Agent 管线** — 视频项目可启动素材分析、视觉匹配、智能剪辑、音频合成、质量审核等多 Agent 流程
- **合规审核流** — 支持剧本与视频项目审核，记录审核状态与原因
- **CI/CD** — GitHub Actions 执行安装、类型检查、构建流程

## 技术架构

| 层 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Vite + React Router |
| 后端 | Node.js + Express + TypeScript |
| AI 模型 | 火山引擎 · 豆包 Seed 2.0 Pro (素材理解) + Seedance 1.5 Pro (视频)，DeepSeek 用于剧本生成 |
| 存储 | 本地文件系统 + JSON 持久化 |

## 架构图

```
┌─────────────────────────────────────────────────┐
│                    前端 (React)                    │
│  Dashboard │ Materials │ ScriptEditor │ VideoStudio │ TaskCenter │
└──────────────────┬──────────────────────────────┘
                   │ REST API
┌──────────────────▼──────────────────────────────┐
│              后端 (Express + TS)                   │
│  /api/materials  /api/scripts  /api/videos        │
│  /api/tasks      /api/dashboard                   │
│         │                │                        │
│    ┌────▼────┐    ┌─────▼──────┐                 │
│    │ 素材服务  │    │ 火山引擎 SDK │                │
│    │ 剧本服务  │    │ Seed 2.0    │                │
│    │ 视频服务  │    │ Seedance 1.5│                │
│    │ 任务服务  │    └────────────┘                 │
│    └─────────┘                                    │
└─────────────────────────────────────────────────┘
```

## 快速启动

### 1. 安装依赖
```bash
npm run install:all
```

### 2. 配置环境变量
复制 `.env.example` 为 `.env`，填入本地可用的 API Key 和 endpoint。不要把 `.env` 或包含明文密钥的题目/说明文件提交到公开仓库。

### 3. 启动开发环境
```bash
# 同时启动前后端
npm run dev

# 或分别启动
npm run dev:server   # 后端 → http://localhost:3001
npm run dev:client   # 前端 → http://localhost:5173
```

### 4. 使用流程
1. **素材管理** → 上传商品图片/视频，填写商品信息，系统自动打标签并生成切片描述
2. **剧本生成** → 输入商品信息 + 选择模板 → AI 生成分镜脚本，可进行分镜级编辑与合规检查
3. **视频创作** → 选择剧本和素材 → 一键成片；有图片素材时优先走图生视频首帧链路
4. **视频创作/P2** → 可启动 A/B 对比出片、Agent 管线、视频合规检查
5. **任务中心** → 查看长任务进度、失败原因和生成 trace
6. **工作台** → 查看风格表现、因子归因、A/B 历史与热力图

### 5. 验证命令
```bash
npm run lint
npm run build
```

在受限沙箱中，Vite/esbuild 可能因为读取父目录权限失败；本地 PowerShell 或 CI 环境可直接运行。

## 目录结构

```
aigc-video-system/
├── server/
│   └── src/
│       ├── index.ts              # 服务入口
│       ├── routes/
│       │   ├── materials.ts      # 素材 API
│       │   ├── scripts.ts        # 剧本 API
│       │   ├── videos.ts         # 视频 API
│       │   ├── tasks.ts          # 任务 API
│       │   └── dashboard.ts      # 看板 API
│       ├── services/
│       │   ├── volcano.service.ts # 火山引擎 SDK
│       │   ├── material.service.ts
│       │   ├── script.service.ts
│       │   ├── video.service.ts
│       │   └── task.service.ts
│       ├── middleware/
│       └── types/
├── client/
│   └── src/
│       ├── App.tsx
│       ├── pages/
│       │   ├── Dashboard.tsx      # 工作台
│       │   ├── Materials.tsx      # 素材管理
│       │   ├── ScriptEditor.tsx   # 剧本生成
│       │   ├── VideoStudio.tsx    # 视频创作
│       │   └── TaskCenter.tsx     # 任务中心
│       ├── components/
│       │   ├── Layout.tsx         # 侧边导航布局
│       │   ├── MaterialUploader.tsx
│       │   ├── StoryboardEditor.tsx
│       │   ├── VideoPreview.tsx
│       │   └── ProgressTracker.tsx
│       ├── api/client.ts          # API 客户端
│       └── styles/globals.css
└── uploads/                       # 素材存储目录
```

## 创新点

1. **多模板 + 因子解耦的剧本引擎** — 策略 + 因子 + 商品信息的组合式剧本生成
2. **分镜级 AI 干预** — 不重渲染整片，仅对单个分镜微调重生成
3. **全链路 Trace** — 从素材分析到视频导出的每一步都可观测
4. **Mock 数据归因看板** — 风格 × 转化率可视化对比，为商家提供选品参考
