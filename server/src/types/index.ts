// ── 素材相关 ──
export interface MaterialAsset {
  id: string;
  name: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  tags: string[];
  category: string;        // 商品类目
  productInfo: ProductInfo;
  slices: MaterialSlice[];
  embedding?: number[];
  status: 'processing' | 'ready' | 'error';
  createdAt: string;
}

export interface MaterialSlice {
  id: string;
  materialId: string;
  type: 'product_overview' | 'detail_closeup' | 'usage_scene' | 'size_reference' | 'other';
  description: string;
  tags: string[];
  startTime?: number;      // 视频切片起始秒
  endTime?: number;        // 视频切片结束秒
  thumbnailUrl?: string;
}

export interface ProductInfo {
  id: string;
  title: string;
  sellingPoints: string[];
  targetAudience: string;
  scene: string;
  price?: string;
  category: string;
}

// ── 剧本相关 ──
export interface Storyboard {
  id: string;
  productId: string;
  productInfo?: ProductInfo;
  title: string;
  strategy: string;        // 创作策略
  factors: CreativeFactor; // 创作因子
  templateId?: string;
  methodology?: ScriptMethodology;
  referenceAnalyses?: ReferenceAnalysis[];
  qualityScore?: number;
  qualityChecklist?: QualityChecklistItem[];
  creativeTags?: string[];
  narrative: string;       // 叙事框架
  visualStyle: string;
  shots: Shot[];
  constraints: string[];   // 约束清单
  status: 'draft' | 'ready' | 'archived';
  createdAt: string;
}

export interface CreativeFactor {
  opening: string;
  bgm: string;
  cameraStyle: string;
  visualFocus: string;
  narration: string;
  pacing: string;
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

export interface Shot {
  id: string;
  index: number;
  description: string;     // 画面描述
  cameraMovement: string;  // 镜头运动
  duration: number;        // 预计时长(秒)
  narration: string;       // 旁白/台词
  subtitle: string;        // 字幕内容
  bgm?: string;
  transition: string;      // 转场效果
  materialSliceId?: string;// 关联素材切片
}

// ── 视频创作相关 ──
export interface VideoProject {
  id: string;
  name: string;
  storyboardId: string;
  materialIds: string[];
  shots: VideoShot[];
  resolution: '9:16' | '16:9';
  status: 'pending' | 'generating' | 'completed' | 'failed';
  progress: number;
  outputUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface VideoShot {
  shotId: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  videoUrl?: string;
  imageUrl?: string;
  materialSliceId?: string;
  startTime: number;
  endTime: number;
  error?: string;
}

// ── 任务追踪 ──
export interface Task {
  id: string;
  type: 'script_generation' | 'video_generation' | 'material_analysis' | 'video_export' | 'ab_script_generation' | 'ab_video_generation';
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  steps: TaskStep[];
  result?: any;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface TaskStep {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  detail?: string;
}

// ── 数据看板 ──
export interface DashboardMetrics {
  totalVideos: number;
  totalScripts: number;
  totalMaterials: number;
  avgGenerationTime: number;
  successRate: number;
  stylePerformance: StyleMetric[];
  recentTasks: Task[];
}

export interface StyleMetric {
  style: string;
  videoCount: number;
  avgCTR: number;
  avgConversion: number;
  avgWatchTime: number;
}

// ── A/B 对比相关 ──
export interface ABTestGroup {
  id: string;
  productInfo: ProductInfo;
  variants: ABVariant[];
  status: 'pending' | 'generating' | 'completed' | 'failed';
  createdAt: string;
}

export interface ABVariant {
  id: string;
  templateId: string;
  templateName: string;
  storyboard?: Storyboard;
  videoProject?: VideoProject;
  metrics?: VariantMetrics;
}

export interface VariantMetrics {
  estimatedCTR: number;
  estimatedConversion: number;
  estimatedWatchTime: number;
  score: number;
}

// ── Agent 管线相关 ──
export interface AgentPipeline {
  id: string;
  name: string;
  stages: PipelineStage[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  createdAt: string;
}

export interface PipelineStage {
  name: string;
  agent: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  duration?: number;
}

// ── 因子归因 ──
export interface FactorAttribution {
  factor: string;
  variants: { name: string; ctr: number; conversion: number; watchTime: number }[];
  impact: number;
}
