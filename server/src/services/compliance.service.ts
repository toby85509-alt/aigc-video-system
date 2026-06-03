import { v4 as uuid } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const AUDIT_LOG_FILE = path.join(UPLOAD_DIR, 'audit_log.json');

interface AuditEntry {
  id: string;
  type: 'material' | 'script' | 'video';
  targetId: string;
  status: 'pass' | 'flag' | 'reject';
  reasons: string[];
  checkedAt: string;
}

function loadAuditLog(): AuditEntry[] {
  try {
    if (fs.existsSync(AUDIT_LOG_FILE)) {
      return JSON.parse(fs.readFileSync(AUDIT_LOG_FILE, 'utf-8'));
    }
  } catch {}
  return [];
}

function saveAuditLog(log: AuditEntry[]): void {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  fs.writeFileSync(AUDIT_LOG_FILE, JSON.stringify(log, null, 2));
}

const PROHIBITED_WORDS = ['虚假宣传', '根治', '100%有效', '绝对', '第一品牌', '国家级'];
const REQUIRED_DISCLAIMERS = ['素材来源声明', '商品信息准确'];

function checkSensitiveContent(content: Record<string, unknown>): string[] {
  const reasons: string[] = [];
  const contentStr = JSON.stringify(content).toLowerCase();

  for (const word of PROHIBITED_WORDS) {
    if (contentStr.includes(word.toLowerCase())) {
      reasons.push(`包含违规词汇: ${word}`);
    }
  }

  let hasDisclaimer = false;
  for (const disclaimer of REQUIRED_DISCLAIMERS) {
    if (contentStr.includes(disclaimer.toLowerCase())) {
      hasDisclaimer = true;
      break;
    }
  }
  if (!hasDisclaimer) {
    reasons.push('缺少必要的合规声明 (素材来源/商品信息)');
  }

  return reasons;
}

export const complianceService = {
  checkMaterial(materialId: string, material: Record<string, unknown>): AuditEntry {
    const reasons: string[] = [];
    const materialType = (material.type as string) || 'unknown';

    if (!materialType) {
      reasons.push('素材类型未识别');
    }

    if (!(material.productInfo as Record<string, unknown>)?.title) {
      reasons.push('缺少商品信息');
    }

    const status = reasons.length === 0 ? 'pass' : reasons.length <= 1 ? 'flag' : 'reject';

    const entry: AuditEntry = {
      id: uuid(),
      type: 'material',
      targetId: materialId,
      status,
      reasons,
      checkedAt: new Date().toISOString(),
    };

    const log = loadAuditLog();
    log.push(entry);
    saveAuditLog(log);

    return entry;
  },

  checkScript(scriptId: string, script: Record<string, unknown>): AuditEntry {
    const reasons = checkSensitiveContent(script);

    const constraints = (script.constraints as string[]) || [];
    if (constraints.length === 0) {
      reasons.push('缺少内容约束清单');
    }

    const status = reasons.length === 0 ? 'pass' : reasons.length <= 1 ? 'flag' : 'reject';

    const entry: AuditEntry = {
      id: uuid(),
      type: 'script',
      targetId: scriptId,
      status,
      reasons,
      checkedAt: new Date().toISOString(),
    };

    const log = loadAuditLog();
    log.push(entry);
    saveAuditLog(log);

    return entry;
  },

  checkVideo(videoId: string, video: Record<string, unknown>): AuditEntry {
    const reasons: string[] = [];

    const statusStr = (video.status as string) || '';
    if (statusStr !== 'completed') {
      reasons.push(`视频状态为 ${statusStr}，无法审核`);
    }

    const resolution = (video.resolution as string) || '';
    if (!['9:16', '16:9'].includes(resolution)) {
      reasons.push('输出分辨率异常');
    }

    const status = reasons.length === 0 ? 'pass' : reasons.length <= 1 ? 'flag' : 'reject';

    const entry: AuditEntry = {
      id: uuid(),
      type: 'video',
      targetId: videoId,
      status,
      reasons,
      checkedAt: new Date().toISOString(),
    };

    const log = loadAuditLog();
    log.push(entry);
    saveAuditLog(log);

    return entry;
  },

  getAuditLog(type?: string): AuditEntry[] {
    const log = loadAuditLog();
    if (type) {
      return log.filter((entry) => entry.type === type);
    }
    return log;
  },
};
