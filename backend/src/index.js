import dotenv from 'dotenv';
dotenv.config();

// Allow self-signed certs in development (for CricketData API TLS issues)
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './db.js';
import { error as logError, info } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import authRoutes from './routes/auth.js';
import quizRoutes from './routes/quiz.js';
import userRoutes from './routes/user.js';
import challengeRoutes from './routes/challenge.js';
import leaderboardRoutes from './routes/leaderboard.js';
import matchesRoutes from './routes/matches.js';
import predictionsRoutes from './routes/predictions.js';
import notificationsRoutes from './routes/notifications.js';
import battleRoutes from './routes/battle.js';
import referralRoutes from './routes/referral.js';
import titlesRoutes from './routes/titles.js';
import kohliRoutes from './routes/kohli.js';
import shareRoutes from './routes/share.js';
import liveRoutes from './routes/live.js';
import reactionRoutes from './routes/reactions.js';
import insightRoutes from './routes/insights.js';
import multiplierRoutes from './routes/multipliers.js';
import momentRoutes from './routes/moments.js';
import { startScheduler } from './scheduler.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

initDb();

// Health check (no auth required)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/user', userRoutes);
app.use('/api/challenge', challengeRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/matches', matchesRoutes);
app.use('/api/prediction', predictionsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/battle', battleRoutes);
app.use('/api/referral', referralRoutes);
app.use('/api/titles', titlesRoutes);
app.use('/api/kohli', kohliRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/live', liveRoutes);
app.use('/api/reactions', reactionRoutes);
app.use('/api/insights', insightRoutes);
app.use('/api/multipliers', multiplierRoutes);
app.use('/api/moments', momentRoutes);

// Serve React frontend in production
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

// Global error handler
app.use((err, req, res, _next) => {
  logError(`Unhandled error: ${req.method} ${req.path}`, err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// SPA fallback — serve index.html for non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(PORT, () => {
  info(`Server running on http://localhost:${PORT} [${process.env.NODE_ENV || 'development'}]`);
  startScheduler();
});
