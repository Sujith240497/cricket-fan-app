import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH
  ? path.resolve(__dirname, '..', process.env.DB_PATH)
  : path.join(__dirname, '..', 'data', 'app.db');

let db;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function initDb() {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      xp INTEGER DEFAULT 0,
      streak INTEGER DEFAULT 0,
      last_login_date TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT NOT NULL,
      option_d TEXT NOT NULL,
      correct_option TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      difficulty TEXT DEFAULT 'easy',
      explanation TEXT
    );

    CREATE TABLE IF NOT EXISTS user_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      selected_option TEXT NOT NULL,
      is_correct INTEGER NOT NULL,
      xp_earned INTEGER DEFAULT 0,
      source TEXT DEFAULT 'quiz',
      answered_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (question_id) REFERENCES questions(id)
    );

    CREATE TABLE IF NOT EXISTS daily_challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      challenge_date TEXT NOT NULL,
      question_ids TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      completed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, challenge_date)
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      detail TEXT,
      xp_change INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // V2 migrations: add columns to existing tables if missing
  const userCols = database.prepare("PRAGMA table_info(users)").all().map(c => c.name);
  if (!userCols.includes('streak')) {
    database.exec("ALTER TABLE users ADD COLUMN streak INTEGER DEFAULT 0");
  }
  if (!userCols.includes('last_login_date')) {
    database.exec("ALTER TABLE users ADD COLUMN last_login_date TEXT");
  }

  const qCols = database.prepare("PRAGMA table_info(questions)").all().map(c => c.name);
  if (!qCols.includes('difficulty')) {
    database.exec("ALTER TABLE questions ADD COLUMN difficulty TEXT DEFAULT 'easy'");
  }
  if (!qCols.includes('explanation')) {
    database.exec("ALTER TABLE questions ADD COLUMN explanation TEXT");
  }

  const aCols = database.prepare("PRAGMA table_info(user_answers)").all().map(c => c.name);
  if (!aCols.includes('xp_earned')) {
    database.exec("ALTER TABLE user_answers ADD COLUMN xp_earned INTEGER DEFAULT 0");
  }
  if (!aCols.includes('source')) {
    database.exec("ALTER TABLE user_answers ADD COLUMN source TEXT DEFAULT 'quiz'");
  }

  // V3 tables: matches, predictions, notifications
  database.exec(`
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_a TEXT NOT NULL,
      team_b TEXT NOT NULL,
      match_date TEXT NOT NULL,
      venue TEXT,
      status TEXT DEFAULT 'upcoming',
      winner TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      match_id INTEGER NOT NULL,
      prediction TEXT NOT NULL,
      is_correct INTEGER,
      xp_earned INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (match_id) REFERENCES matches(id),
      UNIQUE(user_id, match_id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // V4 tables: battles, referrals, titles, weekly_snapshots, kohli_questions, viral_quests
  database.exec(`
    CREATE TABLE IF NOT EXISTS battles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_a INTEGER NOT NULL,
      user_b INTEGER,
      type TEXT NOT NULL DEFAULT 'quiz',
      status TEXT DEFAULT 'waiting',
      question_ids TEXT,
      score_a INTEGER DEFAULT 0,
      score_b INTEGER DEFAULT 0,
      time_a INTEGER,
      time_b INTEGER,
      winner INTEGER,
      xp_reward_a INTEGER DEFAULT 0,
      xp_reward_b INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY (user_a) REFERENCES users(id),
      FOREIGN KEY (user_b) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS battle_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      battle_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      selected_option TEXT NOT NULL,
      is_correct INTEGER NOT NULL,
      time_taken INTEGER DEFAULT 0,
      answered_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (battle_id) REFERENCES battles(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (question_id) REFERENCES questions(id)
    );

    CREATE TABLE IF NOT EXISTS referrals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      referral_code TEXT NOT NULL UNIQUE,
      referred_by INTEGER,
      total_referred INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (referred_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS referral_claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referrer_id INTEGER NOT NULL,
      referred_id INTEGER NOT NULL,
      xp_awarded INTEGER DEFAULT 50,
      claimed_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (referrer_id) REFERENCES users(id),
      FOREIGN KEY (referred_id) REFERENCES users(id),
      UNIQUE(referred_id)
    );

    CREATE TABLE IF NOT EXISTS titles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      condition_key TEXT NOT NULL,
      unlocked_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, title)
    );

    CREATE TABLE IF NOT EXISTS weekly_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      week_start TEXT NOT NULL,
      xp_earned INTEGER DEFAULT 0,
      rank INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, week_start)
    );

    CREATE TABLE IF NOT EXISTS share_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      payload TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // V4 migrations: add referral_code to users
  const userCols2 = database.prepare("PRAGMA table_info(users)").all().map(c => c.name);
  if (!userCols2.includes('referral_code')) {
    database.exec("ALTER TABLE users ADD COLUMN referral_code TEXT");
  }
  if (!userCols2.includes('referred_by')) {
    database.exec("ALTER TABLE users ADD COLUMN referred_by INTEGER");
  }

  // V4 migrations: add mode column to questions for Kohli Mode
  const qCols2 = database.prepare("PRAGMA table_info(questions)").all().map(c => c.name);
  if (!qCols2.includes('mode')) {
    database.exec("ALTER TABLE questions ADD COLUMN mode TEXT DEFAULT 'normal'");
  }
  if (!qCols2.includes('time_limit')) {
    database.exec("ALTER TABLE questions ADD COLUMN time_limit INTEGER DEFAULT 30");
  }

  console.log('Database initialized (V4).');

  // V5: audit_logs table
  database.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action_type TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // V5: performance indexes
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_xp ON users(xp DESC);
    CREATE INDEX IF NOT EXISTS idx_user_answers_user ON user_answers(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_answers_source ON user_answers(user_id, source);
    CREATE INDEX IF NOT EXISTS idx_predictions_user ON predictions(user_id);
    CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_battles_users ON battles(user_a, user_b);
    CREATE INDEX IF NOT EXISTS idx_battles_status ON battles(status);
    CREATE INDEX IF NOT EXISTS idx_weekly_snapshots_week ON weekly_snapshots(week_start, xp_earned DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_titles_user ON titles(user_id);
    CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
  `);

  console.log('Database initialized (V5).');

  // V6: live_events, reactions, fan_moments, engagement tables
  database.exec(`
    CREATE TABLE IF NOT EXISTS live_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      intensity TEXT DEFAULT 'normal',
      xp_multiplier REAL DEFAULT 1.0,
      is_active INTEGER DEFAULT 1,
      expires_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (match_id) REFERENCES matches(id)
    );

    CREATE TABLE IF NOT EXISTS reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      event_id INTEGER NOT NULL,
      reaction_type TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (event_id) REFERENCES live_events(id),
      UNIQUE(user_id, event_id)
    );

    CREATE TABLE IF NOT EXISTS fan_moments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      moment_date TEXT NOT NULL,
      moment_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      score INTEGER DEFAULT 0,
      is_top INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS engagement_multipliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      multiplier REAL NOT NULL DEFAULT 1.0,
      source TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      expires_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // V6: indexes
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_live_events_match ON live_events(match_id, is_active);
    CREATE INDEX IF NOT EXISTS idx_live_events_active ON live_events(is_active, expires_at);
    CREATE INDEX IF NOT EXISTS idx_reactions_user ON reactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_reactions_event ON reactions(event_id);
    CREATE INDEX IF NOT EXISTS idx_fan_moments_date ON fan_moments(moment_date, is_top);
    CREATE INDEX IF NOT EXISTS idx_fan_moments_user ON fan_moments(user_id);
  `);

  console.log('Database initialized (V6).');

  // V7: Extend matches table for real cricket data
  const matchCols = database.prepare("PRAGMA table_info(matches)").all().map(c => c.name);
  if (!matchCols.includes('external_id')) {
    database.exec(`
      ALTER TABLE matches ADD COLUMN external_id TEXT;
      ALTER TABLE matches ADD COLUMN series_name TEXT;
      ALTER TABLE matches ADD COLUMN result_text TEXT;
      ALTER TABLE matches ADD COLUMN match_type TEXT;
      ALTER TABLE matches ADD COLUMN last_synced_at TEXT;
      ALTER TABLE matches ADD COLUMN raw_payload TEXT;
      ALTER TABLE matches ADD COLUMN data_source TEXT DEFAULT 'fallback';
    `);
  }

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_matches_external_id ON matches(external_id);
    CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date);
    CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);

    CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sync_type TEXT NOT NULL,
      status TEXT NOT NULL,
      records_synced INTEGER DEFAULT 0,
      error_message TEXT,
      source TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  console.log('Database initialized (V7).');

  // V7.1: Add relevance columns to matches
  const matchCols71 = database.prepare("PRAGMA table_info(matches)").all().map(c => c.name);
  if (!matchCols71.includes('relevance_category')) {
    database.exec(`
      ALTER TABLE matches ADD COLUMN relevance_category TEXT;
      ALTER TABLE matches ADD COLUMN is_featured INTEGER DEFAULT 0;
    `);
  }

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_matches_relevance ON matches(relevance_category);
  `);

  console.log('Database initialized (V7.1).');
}
