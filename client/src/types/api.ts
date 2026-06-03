import type { ProductInfo, MaterialAsset, Task, Resolution } from './index';

// ── 通用响应 ──

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error: string;
  message: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: Pagination;
}

export interface ListResponse<T> {
  items: T[];
  total: number;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

// ── 素材 ──

export interface MaterialListResponse {
  items: MaterialAsset[];
  total: number;
}

export interface UploadMaterialResponse {
  materials: MaterialAsset[];
  task: Task;
}

// ── 剧本 ──

export interface GenerateScriptRequest {
  productInfo: ProductInfo;
  templateId: string;
  referenceStyle: string;
}

export interface RegenerateShotRequest {
  instruction: string;
}

// ── 视频 ──

export interface CreateVideoRequest {
  storyboardId: string;
  materialIds: string[];
  resolution: Resolution;
  name: string;
}

// ── A/B 对比 ──

export interface ABTestRequest {
  productInfo: ProductInfo;
  templateIds: string[];
}
