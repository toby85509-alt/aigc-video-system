export type MaterialFileType = 'image' | 'video';

export type MaterialStatus = 'processing' | 'ready' | 'failed';

export type SliceType =
  | 'product_overview'
  | 'detail_closeup'
  | 'usage_scene'
  | 'size_reference'
  | 'other';

export type Resolution = '9:16' | '16:9';

export type VideoProjectStatus = 'generating' | 'completed' | 'failed';

export type VideoShotStatus = 'pending' | 'generating' | 'completed' | 'failed';

export type StoryboardStatus = 'draft' | 'ready' | 'archived';

export type TaskType =
  | 'script_generation'
  | 'video_generation'
  | 'material_analysis'
  | 'video_export'
  | 'ab_script_generation'
  | 'ab_video_generation';

export type TaskStatus = 'queued' | 'running' | 'completed' | 'failed';

export type TaskStepStatus = 'pending' | 'running' | 'completed' | 'failed';

export type PipelineStatus = 'pending' | 'running' | 'completed' | 'failed';

export type PipelineStageStatus = 'pending' | 'running' | 'completed' | 'failed';

export type ThemeMode = 'light' | 'dark';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export type ToastFn = (message: string, type?: ToastType) => void;

// ── 素材相关 ──

export interface AIAnalysis {
  description: string;
  category: string;
  attributes: string[];
  sliceType: SliceType;
  confidence: number;
}

export interface MaterialSlice {
  id: string;
  materialId: string;
  type: SliceType;
  description: string;
  tags: string[];
  thumbnailUrl?: string;
  startTime?: number;
  endTime?: number;
}

export interface MaterialAsset {
  id: string;
  name: string;
  type: MaterialFileType;
  url: string;
  thumbnailUrl?: string;
  productInfo: ProductInfo;
  category: string;
  tags: string[];
  aiAnalysis?: AIAnalysis;
  slices: MaterialSlice[];
  embedding?: number[];
  status: MaterialStatus | 'error';
  createdAt: string;
  updatedAt?: string;
}

// ── 商品信息 ──

export interface ProductInfo {
  id: string;
  title: string;
  category: string;
  sellingPoints: string[];
  targetAudience: string;
  scene: string;
  price?: string;
}

// ── 剧本相关 ──

export interface CreativeFactor {
  opening: string;
  bgm: string;
  cameraStyle: string;
  visualFocus: string;
  narration: string;
  pacing: string;
}

export interface Shot {
  id: string;
  index: number;
  description: string;
  cameraMovement: string;
  duration: number;
  narration: string;
  subtitle: string;
  transition: string;
  bgm?: string;
  materialSliceId?: string;
}

export interface Storyboard {
  id: string;
  productId: string;
  productInfo?: ProductInfo;
  title: string;
  strategy: string;
  visualStyle: string;
  factors: CreativeFactor;
  methodology?: ScriptMethodology;
  referenceAnalyses?: ReferenceAnalysis[];
  qualityScore?: number;
  qualityChecklist?: QualityChecklistItem[];
  creativeTags?: string[];
  narrative: string;
  shots: Shot[];
  constraints: string[];
  templateId?: string;
  createdAt: string;
  status: StoryboardStatus;
}

export interface ScriptMethodology {
  source: 'inspiration_template' | 'hot_video_remix' | 'auto_composition';
  structure: string;
  hookTechnique: string;
  proofTechnique: string;
  conversionTechnique: string;
  riskControl: string;
}

export interface ReferenceAnalysis {
  id: string;
  title: string;
  category: string;
  platform: string;
  sourceType: 'public_pattern' | 'merchant_upload' | 'mock_research';
  hook: string;
  sellingPointAngle: string;
  shotPattern: string[];
  styleFactors: string[];
  sourceDeclaration: string;
}

export interface QualityChecklistItem {
  item: string;
  passed: boolean;
  evidence: string;
}

export interface GenerationTrace {
  id: string;
  type: 'script_generation' | 'video_generation';
  status: 'success' | 'failed';
  productTitle?: string;
  category?: string;
  templateId?: string;
  modelEndpoint?: string;
  durationMs: number;
  qualityScore?: number;
  fallbackUsed?: boolean;
  fallbackReason?: string;
  promptSummary?: string;
  outputId?: string;
  error?: string;
  createdAt: string;
}

// ── 视频创作相关 ──

export interface VideoShot {
  shotId: string;
  status: VideoShotStatus;
  outputUrl?: string;
  videoUrl?: string;
  imageUrl?: string;
  materialSliceId?: string;
  startTime: number;
  endTime: number;
  duration?: number;
  error?: string;
}

export interface VideoProject {
  id: string;
  name: string;
  storyboardId: string;
  materialIds: string[];
  resolution: Resolution;
  status: VideoProjectStatus | 'pending';
  shots: VideoShot[];
  outputUrl?: string;
  thumbnailUrl?: string;
  createdAt: string;
  progress: number;
  error?: string;
  completedAt?: string;
}

// ── 任务追踪 ──

export interface TaskStep {
  name: string;
  status: TaskStepStatus;
  detail: string;
  startedAt: string;
  completedAt: string;
}

export interface Task {
  id: string;
  type: TaskType;
  status: TaskStatus;
  progress: number;
  steps: TaskStep[];
  createdAt: string;
  updatedAt: string;
  error: string;
}

// ── 数据看板 ──

export interface StyleMetric {
  style: string;
  videoCount: number;
  ctr: number;
  conversionRate: number;
  avgWatchTime: number;
}

export interface AttributionVariant {
  name: string;
  ctr: number;
  cvr: number;
  watchTime: number;
  impact: number;
}

export interface FactorAttribution {
  factor: string;
  description: string;
  variants: AttributionVariant[];
}

export interface ABTestHistory {
  id: string;
  productName: string;
  winningStyle: string;
  improvement: number;
  date: string;
}

export interface HeatmapRow {
  metric: string;
  values: Record<string, number>;
}

export interface DashboardMetrics {
  totalVideos: number;
  totalMaterials: number;
  totalScripts: number;
  avgGenerationTime: number;
  successRate: number;
  stylePerformance: StyleMetric[];
  factorAttribution: FactorAttribution[];
  abTestHistory: ABTestHistory[];
  heatmapData: HeatmapRow[];
}

// ── A/B 对比相关 ──

export interface ABVariant {
  templateId: string;
  templateName: string;
  scriptId: string;
  videoId: string;
  metrics: VariantMetrics;
}

export interface VariantMetrics {
  ctr: number;
  conversionRate: number;
  avgWatchTime: number;
  score: number;
}

export interface ABTestGroup {
  id: string;
  productInfo: ProductInfo;
  variants: ABVariant[];
  winnerId: string;
  createdAt: string;
}

// ── Agent 管线相关 ──

export interface PipelineStage {
  name: string;
  agent: string;
  status: PipelineStageStatus;
  detail: string;
  startedAt: string;
  completedAt: string;
}

export interface AgentPipeline {
  id: string;
  name: string;
  status: PipelineStatus;
  stages: PipelineStage[];
  progress: number;
  createdAt: string;
}

// ── 应用上下文 ──

export interface AppContextType {
  toast: ToastFn;
  theme: ThemeMode;
  toggleTheme: () => void;
}
