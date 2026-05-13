const BASE = '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${endpoint}`, {
    ...options,
    headers: { ...headers, ...options.headers }
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Request failed');
  }
  // V5: unwrap standardized response format
  if (json.success !== undefined && json.data !== undefined) {
    // V7: attach meta to response data if present
    if (json.meta && typeof json.data === 'object' && json.data !== null) {
      json.data.meta = json.meta;
    }
    return json.data;
  }
  return json;
}

export const api = {
  register: (username, email, password) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password })
    }),

  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),

  getProfile: () => request('/user/profile'),
  getLevel: () => request('/user/level'),
  getStreak: () => request('/user/streak'),

  getQuestions: (difficulty) =>
    request(`/quiz/questions${difficulty ? `?difficulty=${difficulty}` : ''}`),

  submitAnswer: (questionId, selectedOption) =>
    request('/quiz/answer', {
      method: 'POST',
      body: JSON.stringify({ questionId, selectedOption })
    }),

  getDailyChallenge: () => request('/challenge/today'),

  submitDailyAnswer: (questionId, selectedOption) =>
    request('/challenge/submit', {
      method: 'POST',
      body: JSON.stringify({ questionId, selectedOption })
    }),

  // V3 - Leaderboard
  getLeaderboard: () => request('/leaderboard'),
  compareUsers: (userId) => request(`/leaderboard/compare/${userId}`),

  // V3 - Matches
  getUpcomingMatches: () => request('/matches/upcoming'),
  getLiveMatches: () => request('/matches/live'),
  getCompletedMatches: () => request('/matches/completed'),
  getAllMatches: () => request('/matches/all'),
  getMatch: (id) => request(`/matches/${id}`),
  syncMatches: () => request('/matches/sync', { method: 'POST' }),
  completeMatch: (matchId, winner) =>
    request(`/matches/complete/${matchId}`, {
      method: 'POST',
      body: JSON.stringify({ winner })
    }),

  // V3 - Predictions
  makePrediction: (matchId, prediction) =>
    request('/prediction', {
      method: 'POST',
      body: JSON.stringify({ matchId, prediction })
    }),
  getMyPredictions: () => request('/prediction/mine'),

  // V3 - Notifications
  getNotifications: () => request('/notifications'),
  getUnreadNotifications: () => request('/notifications/unread'),
  markNotificationsRead: () =>
    request('/notifications/read', { method: 'POST' }),

  // V4 - Battles
  createBattle: (type) =>
    request('/battle/create', { method: 'POST', body: JSON.stringify({ type }) }),
  getOpenBattles: () => request('/battle/open'),
  joinBattle: (battleId) =>
    request(`/battle/join/${battleId}`, { method: 'POST' }),
  getBattleQuestions: (battleId) => request(`/battle/questions/${battleId}`),
  submitBattleAnswers: (battleId, answers) =>
    request(`/battle/submit/${battleId}`, { method: 'POST', body: JSON.stringify({ answers }) }),
  getBattleResult: (battleId) => request(`/battle/result/${battleId}`),
  getBattleHistory: () => request('/battle/history'),

  // V4 - Referrals
  getReferralStats: () => request('/referral/stats'),
  getReferralCode: () => request('/referral/code'),
  claimReferral: (code) =>
    request('/referral/claim', { method: 'POST', body: JSON.stringify({ code }) }),

  // V4 - Titles
  getMyTitles: () => request('/titles/mine'),
  getAllTitles: () => request('/titles/all'),
  checkTitles: () => request('/titles/check', { method: 'POST' }),

  // V4 - Kohli Mode
  getKohliChallenge: () => request('/kohli/challenge'),
  submitKohliAnswers: (answers) =>
    request('/kohli/submit', { method: 'POST', body: JSON.stringify({ answers }) }),
  getKohliMatches: () => request('/kohli/matches'),

  // V4 - Share Card
  getShareCard: () => request('/share/me'),
  getShareProfile: (userId) => request(`/share/profile/${userId}`),
  logShareEvent: (eventType, payload) =>
    request('/share/event', { method: 'POST', body: JSON.stringify({ eventType, payload }) }),

  // V4 - Enhanced Leaderboard
  getWeeklyLeaderboard: () => request('/leaderboard/weekly'),
  getTopMovers: () => request('/leaderboard/movers'),

  // V6 - Live Events
  tickLiveEvents: () => request('/live/tick', { method: 'POST' }),
  getActiveEvents: (matchId) => request(`/live/active${matchId ? `?matchId=${matchId}` : ''}`),
  getRecentEvents: (limit = 20) => request(`/live/recent?limit=${limit}`),
  getLiveEvent: (id) => request(`/live/${id}`),

  // V6 - Reactions
  sendReaction: (eventId, reactionType) =>
    request('/reactions', { method: 'POST', body: JSON.stringify({ eventId, reactionType }) }),
  getReactionTypes: () => request('/reactions/types'),
  getMyReactionStats: () => request('/reactions/stats'),
  getEventReactions: (eventId) => request(`/reactions/event/${eventId}`),

  // V6 - Insights & Timeline
  getInsights: () => request('/insights'),
  getTimeline: (limit = 30) => request(`/insights/timeline?limit=${limit}`),

  // V6 - Multipliers
  getMultipliers: (source) => request(`/multipliers${source ? `?source=${source}` : ''}`),

  // V6 - Moments
  getMomentOfDay: (date) => request(`/moments/today${date ? `?date=${date}` : ''}`),
  getMyMoments: (limit = 10) => request(`/moments/mine?limit=${limit}`)
};
