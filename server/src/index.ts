import { getUploadDir, loadEnv } from './config/env';
loadEnv();

import express from 'express';
import cors from 'cors';
import path from 'path';

import materialsRouter from './routes/materials';
import scriptsRouter from './routes/scripts';
import videosRouter from './routes/videos';
import tasksRouter from './routes/tasks';
import dashboardRouter from './routes/dashboard';
import agentRouter from './routes/agent';
import complianceRouter from './routes/compliance';
import referencesRouter from './routes/references';
import tracesRouter from './routes/traces';
import { errorHandler, notFound, requestLogger } from './middleware/error-handler';
import { validateAccessToken } from './middleware/security';

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(requestLogger);

const uploadsPath = path.resolve(getUploadDir());
app.use('/uploads', express.static(uploadsPath));

app.post('/api/auth/session', validateAccessToken);

app.use('/api/materials', materialsRouter);
app.use('/api/scripts', scriptsRouter);
app.use('/api/videos', videosRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/agent', agentRouter);
app.use('/api/compliance', complianceRouter);
app.use('/api/references', referencesRouter);
app.use('/api/traces', tracesRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[Server] AIGC 视频生成系统后端已启动: http://localhost:${PORT}`);
  console.log(`[Server] API 文档: http://localhost:${PORT}/api/health`);
});

export default app;
