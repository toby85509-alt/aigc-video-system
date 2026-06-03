import type {
  MaterialAsset,
  Storyboard,
  VideoProject,
  Task,
  DashboardMetrics,
  ProductInfo,
  Shot,
  ReferenceAnalysis,
  GenerationTrace,
} from '../types';
import type {
  ApiResponse,
  ListResponse,
  GenerateScriptRequest,
  CreateVideoRequest,
  UploadMaterialResponse,
  RegenerateShotRequest,
  ABTestRequest,
} from '../types/api';

const BASE = '/api';
const ACCESS_TOKEN_KEY = 'aigc_public_access_token';

export function getAccessToken(): string {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || '';
}

export function setAccessToken(token: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { 'X-Access-Token': token } : {};
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `请求失败: ${res.status}`);
  }
  return res.json();
}

export const authApi = {
  login: async (token: string) => {
    const res = await request<{ data: { ok: boolean; protected: boolean } }>('/auth/session', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
    setAccessToken(token);
    return res;
  },
  logout: () => clearAccessToken(),
  hasToken: () => Boolean(getAccessToken()),
};

// ── Dashboard ──
export const dashboardApi = {
  get: () => request<{ data: DashboardMetrics }>('/dashboard'),
};

// ── 素材 ──
export const materialsApi = {
  list: (params?: Record<string, string>) => {
    const q = new URLSearchParams(params).toString();
    return request<ListResponse<MaterialAsset>>(`/materials${q ? '?' + q : ''}`);
  },
  get: (id: string) => request<ApiResponse<MaterialAsset>>(`/materials/${id}`),
  upload: (formData: FormData): Promise<UploadMaterialResponse> =>
    fetch(`${BASE}/materials`, { method: 'POST', headers: authHeaders(), body: formData }).then((r) => r.json()),
  delete: (id: string) =>
    request<ApiResponse<null>>(`/materials/${id}`, { method: 'DELETE' }),
  tags: () => request<ApiResponse<string[]>>('/materials/tags'),
};

// ── 剧本 ──
export const scriptsApi = {
  list: (params?: Record<string, string>) => {
    const q = new URLSearchParams(params).toString();
    return request<ListResponse<Storyboard>>(`/scripts${q ? '?' + q : ''}`);
  },
  get: (id: string) => request<ApiResponse<Storyboard>>(`/scripts/${id}`),
  generate: (body: GenerateScriptRequest) =>
    request<ApiResponse<Storyboard> & { taskId: string }>('/scripts/generate', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (id: string, body: Partial<Storyboard>) =>
    request<ApiResponse<Storyboard>>(`/scripts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  regenerateShot: (scriptId: string, shotId: string, instruction: string) =>
    request<ApiResponse<Shot>>(`/scripts/${scriptId}/shots/${shotId}/regenerate`, {
      method: 'POST',
      body: JSON.stringify({ instruction } satisfies RegenerateShotRequest),
    }),
  delete: (id: string) =>
    request<ApiResponse<null>>(`/scripts/${id}`, { method: 'DELETE' }),
  templates: () =>
    request<ApiResponse<{ id: string; name: string; description: string; strategy: string; factors: unknown }[]>>(
      '/scripts/templates',
    ),
};

export const referencesApi = {
  list: (category?: string) =>
    request<ApiResponse<ReferenceAnalysis[]>>(`/references${category ? '?category=' + encodeURIComponent(category) : ''}`),
};

export const tracesApi = {
  list: (params?: Record<string, string>) => {
    const q = new URLSearchParams(params).toString();
    return request<ListResponse<GenerationTrace>>(`/traces${q ? '?' + q : ''}`);
  },
};

// ── 视频 ──
export const videosApi = {
  list: (params?: Record<string, string>) => {
    const q = new URLSearchParams(params).toString();
    return request<ListResponse<VideoProject>>(`/videos${q ? '?' + q : ''}`);
  },
  get: (id: string) => request<ApiResponse<VideoProject>>(`/videos/${id}`),
  create: (body: CreateVideoRequest) =>
    request<ApiResponse<VideoProject> & { taskId: string }>('/videos', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  rerenderShot: (projectId: string, shotId: string) =>
    request<ApiResponse<VideoProject>>(`/videos/${projectId}/shots/${shotId}/rerender`, {
      method: 'POST',
    }),
  delete: (id: string) =>
    request<ApiResponse<null>>(`/videos/${id}`, { method: 'DELETE' }),
};

// ── 任务 ──
export const tasksApi = {
  list: (type?: string) =>
    request<ApiResponse<Task[]>>(`/tasks${type ? '?type=' + type : ''}`),
  get: (id: string) => request<ApiResponse<Task>>(`/tasks/${id}`),
};

// ── 合规审核 ──
export const complianceApi = {
  checkMaterial: (id: string) =>
    request<ApiResponse<Record<string, unknown>>>(`/compliance/materials/${id}`, { method: 'POST' }),
  checkScript: (id: string) =>
    request<ApiResponse<Record<string, unknown>>>(`/compliance/scripts/${id}`, { method: 'POST' }),
  checkVideo: (id: string) =>
    request<ApiResponse<Record<string, unknown>>>(`/compliance/videos/${id}`, { method: 'POST' }),
  auditLog: (type?: string) =>
    request<ApiResponse<Record<string, unknown>[]>>(`/compliance/audit-log${type ? '?type=' + type : ''}`),
};

// ── A/B 对比 ──
export const abTestApi = {
  generateScripts: (body: ABTestRequest) =>
    request<ApiResponse<Storyboard[]> & { taskId: string }>('/scripts/generate-ab', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  createVideos: (body: {
    storyboardIds: string[];
    materialIds: string[];
    resolution?: string;
    namePrefix?: string;
  }) =>
    request<ApiResponse<VideoProject[]> & { taskId: string }>('/videos/create-ab', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

// ── Agent 管线 ──
export const agentApi = {
  createPipeline: (body: { materialId: string; storyboardId: string; resolution: string; name: string }) =>
    request<ApiResponse<Record<string, unknown>>>('/agent/pipeline', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getPipeline: (id: string) =>
    request<ApiResponse<Record<string, unknown>>>(`/agent/pipeline/${id}`),
  listPipelines: () => request<ApiResponse<Record<string, unknown>[]>>('/agent/pipelines'),
  getAgents: () => request<ApiResponse<Record<string, unknown>[]>>('/agent/agents'),
};
