import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';

const DATA_DIR = process.env.UPLOAD_DIR || './uploads';
const TRACES_FILE = path.join(DATA_DIR, 'generation_traces.json');

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

let traces: GenerationTrace[] = [];

function load() {
  try {
    if (fs.existsSync(TRACES_FILE)) {
      traces = JSON.parse(fs.readFileSync(TRACES_FILE, 'utf-8'));
    }
  } catch {
    traces = [];
  }
}

function save() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(TRACES_FILE, JSON.stringify(traces, null, 2));
}

load();

export const traceService = {
  record(input: Omit<GenerationTrace, 'id' | 'createdAt'>): GenerationTrace {
    const trace: GenerationTrace = {
      id: uuid(),
      createdAt: new Date().toISOString(),
      ...input,
    };
    traces.push(trace);
    traces = traces.slice(-200);
    save();
    return trace;
  },

  list(params: { type?: string; page?: number; pageSize?: number }) {
    let filtered = [...traces].reverse();
    if (params.type) {
      filtered = filtered.filter((trace) => trace.type === params.type);
    }
    const page = params.page || 1;
    const pageSize = params.pageSize || 30;
    const start = (page - 1) * pageSize;
    return { items: filtered.slice(start, start + pageSize), total: filtered.length };
  },
};
