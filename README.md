# 电商场景 AIGC 带货视频生成系统

AI 全栈挑战赛参赛项目 —— 面向 TikTok Shop 商家的智能带货短视频自动生成系统。

> **一句话业务价值**：面向 TikTok Shop 商家的端到端智能带货短视频生成系统，实现从素材入库、AI 剧本生成到一键成片的完整闭环，降低商家视频制作门槛，提升内容生产效率与转化效果。

---

## 团队成员与分工

| 成员 | 角色 | 负责内容 |
|------|------|---------|
| **范文昊** | 前端开发与测评 | React 页面开发、组件库、状态管理、API 客户端、响应式布局、端到端功能评测与样例验证 |
| **柯淏睿** | 后端开发与代码架构 | Express API 设计、Service 业务逻辑、火山引擎/DeepSeek SDK 集成、Prompt 工程、ffmpeg 视频合成、CI/CD、代码规范 |

---

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

---

## 端到端使用流程

1. **素材入库**：上传商品主图/视频，填写商品信息，系统自动进行多模态分析与标签生成
2. **剧本生成**：输入商品信息 + 选择模板（质感沉浸风/快节奏种草风/问题解决型），AI 生成完整分镜脚本
3. **剧本干预**：分镜编辑器中拖拽排序、修改台词，或输入自然语言指令对单分镜 AI 重生成
4. **视频创作**：选择剧本与素材，一键生成；有图片素材时优先走图生视频首帧链路
5. **视频创作/P2**：可启动 A/B 对比出片、Agent 管线、视频合规检查
6. **任务中心**：查看长任务进度、失败原因和生成 Trace
7. **工作台**：查看风格表现、因子归因、A/B 历史与热力图

---

## 技术架构

| 层 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Vite 6 + React Router |
| 后端 | Node.js + Express + TypeScript |
| AI 模型 | 火山引擎 · 豆包 Seed 2.0 Pro (素材理解) + Seedance 1.5 Pro (视频)，DeepSeek 用于剧本生成 |
| 视频处理 | ffmpeg (@ffmpeg-installer/ffmpeg) |
| 存储 | 本地文件系统 + JSON 持久化 |
| 代码质量 | ESLint + Prettier + Husky |
| CI/CD | GitHub Actions |

## 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    前端展示层 (React 18 + TypeScript)          │
│  Dashboard │ QuickCreate │ Materials │ ScriptEditor          │
│  VideoStudio │ TaskCenter │ Methodology                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  组件层: Layout | StoryboardEditor | VideoPreview    │    │
│  │         MaterialUploader | ProgressTracker           │    │
│  │  状态层: AppContext (Toast + Theme)                  │    │
│  │  通信层: API Client (fetch + X-Access-Token)         │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────┬──────────────────────────────────────┘
                       │ REST API (JSON)
┌──────────────────────▼──────────────────────────────────────┐
│               后端服务层 (Express + TypeScript)                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Middleware: 请求日志 | CORS | 安全鉴权 | 错误处理     │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ materials│ │ scripts  │ │ videos   │ │ tasks    │      │
│  │ 素材 CRUD │ │ 剧本生成  │ │ 视频管线  │ │ 任务追踪  │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ dashboard│ │ agent    │ │compliance│ │ traces   │      │
│  │ 数据看板  │ │Agent 管线 │ │ 合规审核  │ │ 全链路追踪│      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Service 层                                           │   │
│  │  material.service | script.service | video.service    │   │
│  │  task.service | agent.service | compliance.service    │   │
│  │  trace.service | volcano.service (AI SDK 封装)         │   │
│  └──────────────────────────────────────────────────────┘   │
└──────┬──────────────────────┬───────────────────────────────┘
       │                      │
┌──────▼──────┐    ┌─────────▼──────────┐
│  火山引擎方舟  │    │  DeepSeek (兜底)    │
│  Seed 2.0 Pro│    │  deepseek-chat     │
│  Seedance 1.5│    │  TTS 语音合成       │
└──────────────┘    └────────────────────┘
       │
┌──────▼──────┐
│  本地存储     │
│  JSON 持久化  │
│  + 文件系统   │
│  + ffmpeg    │
└──────────────┘
```

## 大模型 / AI 能力

| 能力 | 模型/服务 | 说明 |
|------|----------|------|
| 素材多模态分析 | Doubao-Seed-2.0-pro（火山方舟） | 输入商品图片 + 信息，输出标签、描述、切片类型 |
| 剧本结构化生成 | Doubao-Seed-2.0-pro（主）/ DeepSeek（兜底） | System Prompt ~40 条约束，多层兜底：火山 → DeepSeek → 本地规则 |
| 图生视频 (I2V) | Seedance-1.5-pro（火山方舟） | 商品图作为首帧，生成 3-5 秒分镜视频 |
| 文生视频 (T2V) | Seedance-1.5-pro（火山方舟） | 无商品图时的兜底方案 |
| TTS 语音合成 | DeepSeek | SSML 标注语音合成 |
| Agent 管线 | 6 Agent 编排 | 素材分析→剧本校验→视觉匹配→智能剪辑→音频合成→质量审核 |

---

## 快速启动

### 1. 安装依赖
```bash
npm run install:all
```

### 2. 配置环境变量
复制 `.env.example` 为 `.env`，填入本地可用的 API Key 和 endpoint。不要把 `.env` 或包含明文密钥的文件提交到公开仓库。

```env
VOLCANO_ARK_API_KEY=your_volcano_ark_api_key_here
VOLCANO_TEXT_EP=your_doubao_seed_text_endpoint_id
VOLCANO_VIDEO_EP=your_seedance_video_endpoint_id
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_MODEL=deepseek-chat
SERVER_PORT=3001
CLIENT_PORT=5173
UPLOAD_DIR=./uploads
MOCK_AI=true              # 无真实 API Key 时开启 Mock 模式
PUBLIC_ACCESS_TOKEN=
```

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
npm run lint          # ESLint 检查
npm run format:check  # Prettier 格式检查
npm run build         # 构建
```

---

## 目录结构

```
aigc-video-system/
├── server/
│   └── src/
│       ├── index.ts                 # Express 服务入口
│       ├── config/env.ts            # 环境变量加载
│       ├── routes/
│       │   ├── materials.ts         # 素材 API（上传/列表/详情/删除）
│       │   ├── scripts.ts           # 剧本 API（生成/A/B/模板/分镜重生成）
│       │   ├── videos.ts            # 视频 API（创建/A-B/渲染/重渲染）
│       │   ├── tasks.ts             # 任务 API（列表/详情）
│       │   ├── dashboard.ts         # 看板 API（指标/归因/热力图）
│       │   ├── agent.ts             # Agent 管线 API
│       │   ├── compliance.ts        # 合规审核 API
│       │   ├── references.ts        # 爆款拆解参考 API
│       │   └── traces.ts            # 生成 Trace API
│       ├── services/
│       │   ├── volcano.service.ts   # 火山引擎/DeepSeek SDK 封装
│       │   ├── material.service.ts  # 素材管理
│       │   ├── script.service.ts    # 剧本生成引擎
│       │   ├── video.service.ts     # 视频渲染管线
│       │   ├── task.service.ts      # 任务状态机
│       │   ├── agent.service.ts     # Agent 编排
│       │   ├── compliance.service.ts # 合规审核引擎
│       │   └── trace.service.ts     # 全链路追踪
│       ├── middleware/
│       │   ├── error-handler.ts     # 错误处理 + 请求日志
│       │   └── security.ts          # 访问令牌鉴权
│       └── types/index.ts           # 服务端类型定义
├── client/
│   └── src/
│       ├── App.tsx                   # 应用入口 + React Router
│       ├── pages/
│       │   ├── Dashboard.tsx         # 工作台（统计/归因/A-B/热力图）
│       │   ├── QuickCreate.tsx       # 一键端到端创建
│       │   ├── Materials.tsx         # 素材管理（上传/搜索/预览）
│       │   ├── ScriptEditor.tsx      # 剧本生成 + A/B + 分镜编辑
│       │   ├── Methodology.tsx       # 方法论知识库
│       │   ├── VideoStudio.tsx       # 视频创作 + Agent 管线
│       │   └── TaskCenter.tsx        # 任务中心
│       ├── components/
│       │   ├── Layout.tsx            # 侧边导航布局 + 主题切换
│       │   ├── MaterialUploader.tsx  # 素材上传弹窗
│       │   ├── StoryboardEditor.tsx  # 分镜级编辑器
│       │   ├── VideoPreview.tsx      # Canvas 视频预览播放器
│       │   ├── ProgressTracker.tsx   # 任务进度步骤追踪
│       │   ├── Skeleton.tsx          # 骨架屏加载态
│       │   └── Toast.tsx             # 全局消息提示
│       ├── context/AppContext.tsx     # 全局状态（Toast + 主题）
│       ├── api/client.ts             # API 客户端（30+ 接口封装）
│       ├── types/                    # 前端类型定义
│       └── styles/globals.css        # 全局样式
├── .github/workflows/ci.yml          # CI/CD Pipeline
└── uploads/                           # 素材与产物存储
```

---

## API 接口清单

| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/materials` | GET/POST | 素材列表 / 上传 |
| `/api/materials/tags` | GET | 标签汇总 |
| `/api/materials/:id` | GET/DELETE | 素材详情 / 删除 |
| `/api/scripts` | GET | 剧本列表 |
| `/api/scripts/generate` | POST | 生成剧本 |
| `/api/scripts/generate-ab` | POST | A/B 多模板生成 |
| `/api/scripts/templates` | GET | 模板列表 |
| `/api/scripts/:id` | GET/PATCH/DELETE | 剧本详情 / 更新 / 删除 |
| `/api/scripts/:id/shots/:shotId/regenerate` | POST | 分镜 AI 重生成 |
| `/api/videos` | GET/POST | 视频列表 / 一键成片 |
| `/api/videos/create-ab` | POST | A/B 视频创建 |
| `/api/videos/:id` | GET/DELETE | 视频详情 / 删除 |
| `/api/videos/:id/shots/:shotId/rerender` | POST | 单分镜重渲染 |
| `/api/tasks` | GET | 任务列表 |
| `/api/tasks/:id` | GET | 任务详情 |
| `/api/dashboard` | GET | 看板聚合指标 |
| `/api/agent/pipeline` | POST | 创建 Agent 管线 |
| `/api/agent/pipelines` | GET | 管线列表 |
| `/api/agent/agents` | GET | Agent 角色列表 |
| `/api/compliance/materials/:id` | POST | 素材合规检查 |
| `/api/compliance/scripts/:id` | POST | 剧本合规检查 |
| `/api/compliance/videos/:id` | POST | 视频合规检查 |
| `/api/compliance/audit-log` | GET | 审核日志 |
| `/api/references` | GET | 爆款拆解参考 |
| `/api/traces` | GET | 生成 Trace 列表 |
| `/api/health` | GET | 健康检查 |

---

## 关键工程难点与解决方案

### 1. 视频生成异步长任务的状态同步与失败恢复
- **难点**：多分镜 AI 渲染 + ffmpeg 合成需数分钟，状态追踪和失败处理复杂
- **方案**：Task 状态机模型（queued → running → completed/failed），Step 级进度追踪，前端 5s 轮询刷新，单分镜失败支持独立重渲染

### 2. AI 模型调用失败的多层兜底策略
- **难点**：火山引擎 API 可能限流/超时，端到端链路不能因单点故障中断
- **方案**：火山引擎 → DeepSeek → 本地规则生成三层兜底；视频 API 限流控制（16s 最小间隔 + 429 指数退避 4 次重试）；Mock 模式支持离线运行

### 3. AIGC 视频中的文字/UI 幻觉抑制
- **难点**：图生视频模型倾向在画面中渲染文字、价格、UI 元素
- **方案**：Prompt 层多角度强调反文字指令 + `sanitizeVisualDescription()` 后处理正则过滤 + 合规审核层敏感词扫描

### 4. 分镜级编辑器复杂交互
- **难点**：拖拽排序 + 单分镜 AI 重生成 + 局部编辑 + 实时预览，不能触发全片重渲染
- **方案**：双面板布局 + 单分镜独立 API 调用 + Canvas 动画预览器（运镜模拟/字幕渲染/转场），无需实际视频文件

---

## 项目亮点 / 创新点

1. **多模板 + 因子解耦的剧本引擎** — 策略 + 因子 + 商品信息的组合式剧本生成，3 模板 × 6 因子维度 = 可扩展的剧本空间
2. **分镜级 AI 干预** — 不重渲染整片，仅对单个分镜微调重生成，配合 Canvas 实时预览
3. **全链路 Trace + 多层 AI 兜底** — 每次生成完整记录模型/耗时/质量分/兜底信息；火山 → DeepSeek → 本地三层保障
4. **合规审核嵌入生成流水线** — 素材入库/剧本生成/视频输出三节点合规拦截，从"事后审查"前置为"事中拦截"

---

## 项目完成度

| 级别 | 状态 | 功能 |
|------|------|------|
| P0 必做 | ✅ 全部完成 | 素材上传、剧本生成、基础分镜、一键成片、任务进度、预览导出 |
| P1 推荐 | ✅ 全部完成 | 素材检索、智能剪辑、分镜编辑、TTS/BGM、失败重试、Trace、数据看板 |
| P2 加分 | ✅ 全部完成 | 多因子归因、Agent 编排、A/B 对比、CI/CD、可观测性、合规审核 |

---

## 演示材料

- **在线 Demo**：（请填写可访问链接）
- **演示视频**：（请填写公开视频链接）
- **源代码仓库**：https://github.com/toby85509-alt/aigc-video-system
- **详细提交文档**：见仓库内 `项目成果提交文档.md`
