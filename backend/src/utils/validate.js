const VALID_OPTIONS = ['A', 'B', 'C', 'D'];
const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'];
const VALID_BATTLE_TYPES = ['quiz', 'speed'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegister(body) {
  const { username, email, password } = body || {};
  if (!username || typeof username !== 'string' || username.trim().length < 2) {
    return 'Username must be at least 2 characters';
  }
  if (username.length > 30) return 'Username must be 30 characters or fewer';
  if (!email || !EMAIL_RE.test(email)) return 'Valid email is required';
  if (!password || password.length < 6) return 'Password must be at least 6 characters';
  if (password.length > 128) return 'Password is too long';
  return null;
}

export function validateLogin(body) {
  const { email, password } = body || {};
  if (!email || !EMAIL_RE.test(email)) return 'Valid email is required';
  if (!password) return 'Password is required';
  return null;
}

export function validateAnswer(body) {
  const { questionId, selectedOption } = body || {};
  if (!questionId || typeof questionId !== 'number') return 'Valid questionId is required';
  if (!selectedOption || !VALID_OPTIONS.includes(String(selectedOption).toUpperCase())) {
    return 'selectedOption must be A, B, C, or D';
  }
  return null;
}

export function validateDifficulty(difficulty) {
  if (difficulty && !VALID_DIFFICULTIES.includes(difficulty)) {
    return 'difficulty must be easy, medium, or hard';
  }
  return null;
}

export function validateBattleType(type) {
  if (type && !VALID_BATTLE_TYPES.includes(type)) return 'Battle type must be quiz or speed';
  return null;
}

export function validateBattleAnswers(body) {
  const { answers } = body || {};
  if (!answers || !Array.isArray(answers) || answers.length === 0) {
    return 'Answers array is required';
  }
  for (const a of answers) {
    if (!a.questionId || !a.selectedOption) return 'Each answer needs questionId and selectedOption';
  }
  return null;
}

export function validateReferralCode(body) {
  const { code } = body || {};
  if (!code || typeof code !== 'string' || code.trim().length < 4) {
    return 'Valid referral code is required';
  }
  return null;
}

export function validatePrediction(body) {
  const { matchId, prediction } = body || {};
  if (!matchId) return 'matchId is required';
  if (!prediction || typeof prediction !== 'string') return 'prediction team name is required';
  return null;
}

export function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.trim().slice(0, 500);
}

export function positiveInt(val) {
  const n = parseInt(val, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}
