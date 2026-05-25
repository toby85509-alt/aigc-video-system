import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import express from 'express';
import cors from 'cors';
import path from 'path';

import materialsRouter from './routes/materials';
import scriptsRouter from './routes/scripts';
import videosRouter from './routes/videos';
import tasksRouter from './routes/tasks';
import dashboardRouter from './routes/dashboard';
import agentRouter from './routes/agent';
import { errorHandler, notFound } from './middleware/error-handler';

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件 - 上传目录
const uploadsPath = path.resolve(process.env.UPLOAD_DIR || './uploads');
app.use('/uploads', express.static(uploadsPath));

// API 路由
app.use('/api/materials', materialsRouter);
app.use('/api/scripts', scriptsRouter);
app.use('/api/videos', videosRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/agent', agentRouter);

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 错误处理
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[Server] AIGC 视频生成系统后端已启动: http://localhost:${PORT}`);
  console.log(`[Server] API 文档: http://localhost:${PORT}/api/health`);
});

export default app;
