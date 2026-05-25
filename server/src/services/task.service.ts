import { v4 as uuid } from 'uuid';
import { Task, TaskStep } from '../types';
import path from 'path';
import fs from 'fs';

const DATA_DIR = process.env.UPLOAD_DIR || './uploads';
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');

let tasks: Task[] = [];
function load() { try { if (fs.existsSync(TASKS_FILE)) tasks = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf-8')); } catch {} }
function save() { fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2)); }
load();

export const taskService = {
  create(type: Task['type'], steps: string[]): Task {
    const task: Task = {
      id: uuid(),
      type,
      status: 'queued',
      progress: 0,
      steps: steps.map((name) => ({ name, status: 'pending' })),
      createdAt: new Date().toISOString(),
    };
    tasks.push(task);
    save();
    return task;
  },

  updateStep(taskId: string, stepName: string, status: TaskStep['status'], detail?: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const step = task.steps.find((s) => s.name === stepName);
    if (!step) return;
    step.status = status;
    step.completedAt = status === 'completed' ? new Date().toISOString() : undefined;
    if (detail) step.detail = detail;
    task.progress = Math.round(
      (task.steps.filter((s) => s.status === 'completed').length / task.steps.length) * 100
    );
    if (task.steps.every((s) => s.status === 'completed')) {
      task.status = 'completed';
      task.completedAt = new Date().toISOString();
    }
    save();
  },

  failTask(taskId: string, error: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    task.status = 'failed';
    task.error = error;
    save();
  },

  getById(id: string): Task | undefined {
    return tasks.find((t) => t.id === id);
  },

  list(type?: string): Task[] {
    let result = [...tasks].reverse();
    if (type) result = result.filter((t) => t.type === type);
    return result.slice(0, 50);
  },
};
