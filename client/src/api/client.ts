const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `请求失败: ${res.status}`);
  }
  return res.json();
}

// ── Dashboard ──
export const dashboardApi = {
  get: () => request<{ data: any }>('/dashboard'),
};

// ── 素材 ──
export const materialsApi = {
  list: (params?: Record<string, string>) => {
    const q = new URLSearchParams(params).toString();
    return request<{ items: any[]; total: number }>(`/materials${q ? '?' + q : ''}`);
  },
  get: (id: string) => request<{ data: any }>(`/materials/${id}`),
  upload: (formData: FormData) =>
    fetch(`${BASE}/materials`, { method: 'POST', body: formData }).then((r) => r.json()),
  delete: (id: string) => request<{ message: string }>(`/materials/${id}`, { method: 'DELETE' }),
  tags: () => request<{ data: string[] }>('/materials/tags'),
};

// ── 剧本 ──
export const scriptsApi = {
  list: (params?: Record<string, string>) => {
    const q = new URLSearchParams(params).toString();
    return request<{ items: any[]; total: number }>(`/scripts${q ? '?' + q : ''}`);
  },
  get: (id: string) => request<{ data: any }>(`/scripts/${id}`),
  generate: (body: any) =>
    request<{ data: any; taskId: string }>('/scripts/generate', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (id: string, body: any) =>
    request<{ data: any }>(`/scripts/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  regenerateShot: (scriptId: string, shotId: string, instruction: string) =>
    request<{ data: any }>(`/scripts/${scriptId}/shots/${shotId}/regenerate`, {
      method: 'POST',
      body: JSON.stringify({ instruction }),
    }),
  delete: (id: string) => request<{ message: string }>(`/scripts/${id}`, { method: 'DELETE' }),
  templates: () => request<{ data: any[] }>('/scripts/templates'),
};

// ── 视频 ──
export const videosApi = {
  list: (params?: Record<string, string>) => {
    const q = new URLSearchParams(params).toString();
    return request<{ items: any[]; total: number }>(`/videos${q ? '?' + q : ''}`);
  },
  get: (id: string) => request<{ data: any }>(`/videos/${id}`),
  create: (body: any) =>
    request<{ data: any; taskId: string }>('/videos', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  rerenderShot: (projectId: string, shotId: string) =>
    request<{ data: any }>(`/videos/${projectId}/shots/${shotId}/rerender`, { method: 'POST' }),
  delete: (id: string) => request<{ message: string }>(`/videos/${id}`, { method: 'DELETE' }),
};

// ── 任务 ──
export const tasksApi = {
  list: (type?: string) => request<{ data: any[] }>(`/tasks${type ? '?type=' + type : ''}`),
  get: (id: string) => request<{ data: any }>(`/tasks/${id}`),
};

// ── A/B 对比 ──
export const abTestApi = {
  generateScripts: (body: { productInfo: any; templateIds?: string[] }) =>
    request<{ data: any[]; taskId: string }>('/scripts/generate-ab', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  createVideos: (body: { storyboardIds: string[]; materialIds: string[]; resolution?: string; namePrefix?: string }) =>
    request<{ data: any[]; taskId: string }>('/videos/create-ab', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

// ── Agent 管线 ──
export const agentApi = {
  createPipeline: (body: any) =>
    request<{ data: any }>('/agent/pipeline', { method: 'POST', body: JSON.stringify(body) }),
  getPipeline: (id: string) => request<{ data: any }>(`/agent/pipeline/${id}`),
  listPipelines: () => request<{ data: any[] }>('/agent/pipelines'),
  getAgents: () => request<{ data: any[] }>('/agent/agents'),
};
