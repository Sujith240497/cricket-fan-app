import bcrypt from 'bcrypt';
import { getDb } from '../db.js';
import { signToken } from '../middleware/auth.js';
import { getLevel } from '../services/gameService.js';
import { updateStreak, logActivity } from '../services/userService.js';
import { audit } from '../services/auditService.js';
import { validateRegister, validateLogin, sanitize } from '../utils/validate.js';
import { success, created, fail, unauthorized, conflict } from '../utils/response.js';

export async function register(req, res) {
  const error = validateRegister(req.body);
  if (error) return fail(res, error);

  const username = sanitize(req.body.username);
  const email = sanitize(req.body.email).toLowerCase();
  const { password } = req.body;

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
  if (existing) return conflict(res, 'Username or email already exists');

  const passwordHash = await bcrypt.hash(password, 10);
  const today = new Date().toISOString().split('T')[0];
  const result = db.prepare(
    'INSERT INTO users (username, email, password_hash, streak, last_login_date) VALUES (?, ?, ?, 1, ?)'
  ).run(username, email, passwordHash, today);

  const userId = Number(result.lastInsertRowid);
  logActivity(userId, 'account_created', 'Welcome to Fan Identity!', 0);
  audit(userId, 'register', { username, email });

  const token = signToken(userId);
  const level = getLevel(0);
  created(res, { token, user: { id: userId, username, email, xp: 0, streak: 1, level } }, 'Account created');
}

export async function login(req, res) {
  const error = validateLogin(req.body);
  if (error) return fail(res, error);

  const email = sanitize(req.body.email).toLowerCase();
  const { password } = req.body;

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return unauthorized(res, 'Invalid credentials');

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return unauthorized(res, 'Invalid credentials');

  const streakResult = updateStreak(user.id);
  if (streakResult.streakUpdated) {
    logActivity(user.id, 'login_streak', `Login streak: ${streakResult.streak} day(s)`, 0);
  }
  audit(user.id, 'login', { streak: streakResult.streak });

  const token = signToken(user.id);
  const level = getLevel(user.xp);
  success(res, {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      xp: user.xp,
      streak: streakResult.streak,
      level
    },
    streakUpdate: streakResult.streakUpdated ? {
      streak: streakResult.streak,
      message: streakResult.streak >= 7
        ? `${streakResult.streak}-day streak! You earn 20% bonus XP!`
        : streakResult.streak >= 3
          ? `${streakResult.streak}-day streak! You earn 10% bonus XP!`
          : `${streakResult.streak}-day streak! Keep going!`
    } : null
  });
}
