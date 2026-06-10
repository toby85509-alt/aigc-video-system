# 电商场景 AIGC 带货视频生成系统

AI 全栈挑战赛参赛项目 —— 面向 TikTok Shop 商家的智能带货短视频自动生成系统。

> 面向 TikTok Shop 商家的端到端智能带货短视频生成系统，实现从素材入库、AI 剧本生成到一键成片的完整闭环，降低商家视频制作门槛，提升内容生产效率与转化效果。

---

## 团队成员与分工

| 成员 | 角色 | 负责内容 |
|------|------|---------|
| **范文昊** | 前端开发与测评 | React 页面开发、组件库、状态管理、API 客户端、响应式布局、端到端功能评测与样例验证 |
| **柯淏睿** | 后端开发与代码架构 | Express API 设计、Service 业务逻辑、火山引擎/DeepSeek SDK 集成、Prompt 工程、ffmpeg 视频合成、CI/CD、代码规范 |

---

## 核心功能

| 级别 | 功能 | 说明 |
|------|------|------|
| P0 | 素材管理 | 商品图片/视频上传，AI 自动打标签与多颗粒度切片分析，关键词+标签+类目检索 |
| P0 | 剧本生成 | 3 套创作模板 + 多因子解耦引擎，LLM 生成含叙事框架/分镜/台词/字幕/BGM 的完整剧本 |
| P0 | 一键成片 | 端到端视频生成：素材→剧本→图生视频/文生视频→ffmpeg 合成→导出，支持 9:16/16:9 |
| P0 | 任务进度 | 异步长任务实时进度追踪，步骤级状态展示，失败分镜一键重试 |
| P0 | 预览导出 | Canvas 视频预览播放器 + 视频文件下载 |
| P1 | 分镜级编辑器 | 可视化分镜列表 + 详情编辑面板，支持拖拽排序、单分镜 AI 指令重生成、台词/转场编辑 |
| P1 | 智能剪辑 | 分镜级自动拼接 + 转场 + TTS 配音 + 字幕叠加 + BGM 合成 |
| P1 | Trace 与看板 | 生成全链路 Trace 记录，Mock 数据看板：风格×转化矩阵 + 多因子归因 + A/B 历史 + 热力图 |
| P2 | A/B 对比出片 | 同一商品并行生成多套模板剧本和视频，展示 CTR/CVR/观看时长预估对比 |
| P2 | Agent 管线 | 6 Agent 编排：素材分析→剧本校验→视觉匹配→智能剪辑→音频合成→质量审核 |
| P2 | 合规审核 | 素材/剧本/视频三节点合规检查，敏感词扫描，审核日志可追溯 |
| P2 | CI/CD | GitHub Actions：Push/PR 触发 Lint + Type Check + Build |

---

## 使用流程

1. **素材管理** → 上传商品图片/视频，填写商品信息，系统自动打标签并生成切片描述
2. **剧本生成** → 输入商品信息 + 选择模板（质感沉浸风/快节奏种草风/问题解决型）→ AI 生成分镜脚本，可在分镜编辑器拖拽排序、修改台词、AI 干预单分镜重生成
3. **视频创作** → 选择剧本和素材 → 一键成片（有图优先走图生视频首帧链路）；可选 A/B 多模板出片、启动 Agent 管线、合规检查
4. **任务中心** → 查看长任务进度、失败原因和生成 Trace
5. **工作台** → 查看风格表现、因子归因、A/B 历史与热力图

---

## 技术架构

| 层 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Vite 6 + React Router |
| 后端 | Node.js + Express + TypeScript |
| AI 模型 | 火山引擎 Doubao-Seed-2.0-pro（文本/多模态分析）、Seedance-1.5-pro（图生视频/文生视频）、DeepSeek（兜底文本生成 + TTS） |
| 视频处理 | ffmpeg (@ffmpeg-installer/ffmpeg) |
| 存储 | 本地文件系统 + JSON 持久化 |
| 代码质量 | ESLint + Prettier + Husky |
| CI/CD | GitHub Actions |

### 系统架构图

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

---

## 快速启动

### 1. 安装依赖
```bash
npm run install:all
```

### 2. 配置环境变量
复制 `.env.example` 为 `.env`，按需填入 API Key。无真实 Key 时设置 `MOCK_AI=true` 即可离线运行。

```env
VOLCANO_ARK_API_KEY=your_api_key
VOLCANO_TEXT_EP=your_text_endpoint
VOLCANO_VIDEO_EP=your_video_endpoint
DEEPSEEK_API_KEY=your_deepseek_key
DEEPSEEK_MODEL=deepseek-chat
MOCK_AI=true
```

### 3. 启动
```bash
npm run dev           # 前端 :5173 + 后端 :3001 同时启动
```

### 4. 验证
```bash
npm run lint          # ESLint
npm run build         # 构建
```

---

## 目录结构

```
aigc-video-system/
├── server/src/
│   ├── index.ts                    # Express 入口
│   ├── config/env.ts               # 环境变量
│   ├── routes/                     # 9 组 API 路由
│   │   ├── materials.ts            # 素材 CRUD + 上传
│   │   ├── scripts.ts              # 剧本生成 / A/B / 分镜重生成
│   │   ├── videos.ts               # 视频管线 / 渲染 / A/B
│   │   ├── tasks.ts                # 任务追踪
│   │   ├── dashboard.ts            # 看板聚合指标
│   │   ├── agent.ts                # Agent 管线
│   │   ├── compliance.ts           # 合规审核
│   │   ├── references.ts           # 爆款拆解参考
│   │   └── traces.ts               # 生成 Trace
│   ├── services/                   # 业务逻辑层
│   │   ├── volcano.service.ts      # 火山引擎/DeepSeek SDK
│   │   ├── material.service.ts     # 素材管理
│   │   ├── script.service.ts       # 剧本生成引擎
│   │   ├── video.service.ts        # 视频渲染管线 + ffmpeg
│   │   ├── task.service.ts         # 任务状态机
│   │   ├── agent.service.ts        # Agent 编排
│   │   ├── compliance.service.ts   # 合规审核引擎
│   │   └── trace.service.ts        # 全链路追踪
│   ├── middleware/                 # 错误处理 / 安全鉴权 / 请求日志
│   └── types/index.ts
├── client/src/
│   ├── pages/                      # 7 个页面
│   │   ├── Dashboard.tsx           # 工作台
│   │   ├── QuickCreate.tsx         # 一键端到端创建
│   │   ├── Materials.tsx           # 素材管理
│   │   ├── ScriptEditor.tsx        # 剧本生成 + A/B + 分镜编辑
│   │   ├── Methodology.tsx         # 方法论知识库
│   │   ├── VideoStudio.tsx         # 视频创作 + Agent 管线
│   │   └── TaskCenter.tsx          # 任务中心
│   ├── components/                 # 通用组件
│   │   ├── Layout.tsx              # 侧边导航 + 主题切换
│   │   ├── MaterialUploader.tsx    # 素材上传弹窗
│   │   ├── StoryboardEditor.tsx    # 分镜级编辑器
│   │   ├── VideoPreview.tsx        # Canvas 视频预览
│   │   ├── ProgressTracker.tsx     # 任务进度追踪
│   │   ├── Skeleton.tsx            # 骨架屏加载态
│   │   └── Toast.tsx               # 消息提示
│   ├── context/AppContext.tsx      # 全局状态
│   ├── api/client.ts               # API 客户端
│   └── types/                      # 类型定义
├── .github/workflows/ci.yml        # CI/CD
└── uploads/                         # 素材与产物存储
```

---

## API 接口清单

| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/materials` | GET / POST | 素材列表 / 上传 |
| `/api/materials/tags` | GET | 标签汇总 |
| `/api/materials/:id` | GET / DELETE | 素材详情 / 删除 |
| `/api/scripts` | GET | 剧本列表 |
| `/api/scripts/generate` | POST | 生成剧本 |
| `/api/scripts/generate-ab` | POST | A/B 多模板生成 |
| `/api/scripts/templates` | GET | 模板列表 |
| `/api/scripts/:id` | GET / PATCH / DELETE | 剧本详情 / 更新 / 删除 |
| `/api/scripts/:id/shots/:shotId/regenerate` | POST | 单分镜 AI 重生成 |
| `/api/videos` | GET / POST | 视频列表 / 一键成片 |
| `/api/videos/create-ab` | POST | A/B 视频创建 |
| `/api/videos/:id` | GET / DELETE | 视频详情 / 删除 |
| `/api/videos/:id/shots/:shotId/rerender` | POST | 单分镜重渲染 |
| `/api/tasks` | GET | 任务列表 |
| `/api/tasks/:id` | GET | 任务详情 |
| `/api/dashboard` | GET | 看板聚合指标 |
| `/api/agent/pipeline` | POST | 创建 Agent 管线 |
| `/api/agent/pipelines` | GET | 管线列表 |
| `/api/agent/agents` | GET | Agent 角色列表 |
| `/api/compliance/:type/:id` | POST | 素材/剧本/视频合规检查 |
| `/api/compliance/audit-log` | GET | 审核日志 |
| `/api/references` | GET | 爆款拆解参考 |
| `/api/traces` | GET | 生成 Trace 列表 |
| `/api/health` | GET | 健康检查 |

---

## 关键工程难点

### 1. AI 多层兜底策略
火山引擎 API 可能限流/超时/返回异常 JSON。方案：**火山引擎 → DeepSeek → 本地规则生成**三层兜底；视频限流控制（16s 最小间隔 + 429 指数退避 4 次重试）；Mock 模式离线可运行；JSON 解析自动去 markdown code fence。

### 2. AIGC 视频文字/UI 幻觉抑制
图生视频模型倾向在画面中渲染文字、价格、UI 元素。方案：Prompt 层多角度反文字指令 + `sanitizeVisualDescription()` 后处理正则过滤 + 合规审核敏感词扫描。

### 3. 分镜级编辑器复杂交互
拖拽排序 + 单分镜 AI 重生成 + 实时预览，不能触发全片重渲染。方案：双面板布局 + 单分镜独立 API + Canvas 动画预览器（运镜模拟/字幕渲染/转场）。

### 4. 长任务状态同步与失败恢复
多分镜 AI 渲染 + ffmpeg 合成需数分钟。方案：Task 状态机 + Step 级进度 + 前端 5s 轮询 + 单分镜失败独立重渲染后重新合成。

---

## 创新点

1. **多模板 + 因子解耦剧本引擎** — 策略（创作抽象方法）+ 因子（具体执行手段）+ 约束规则三层解耦，3 模板 × 6 因子维度动态组合生成多风格剧本
2. **分镜级 AI 干预** — 不重渲染整片，自然语言指令对单个分镜微调重生成，改动不扩散
3. **全链路 Trace + 合规嵌入管线** — 每次生成完整记录模型/耗时/质量分/兜底信息；素材入库→剧本→成片三节点合规拦截
