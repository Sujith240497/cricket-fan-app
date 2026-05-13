import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [dailyStatus, setDailyStatus] = useState(null);
  const [liveMatches, setLiveMatches] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getProfile(),
      api.getDailyChallenge().catch(() => null),
      api.getLiveMatches().catch(() => ({ matches: [] })),
      api.getUpcomingMatches().catch(() => ({ matches: [] }))
    ])
      .then(([profileData, challengeData, liveData, upData]) => {
        setProfile(profileData.user);
        updateUser({ xp: profileData.user.xp, streak: profileData.user.streak, level: profileData.user.level });
        if (challengeData?.challenge) {
          setDailyStatus(challengeData.challenge);
        }
        setLiveMatches((liveData.matches || []).slice(0, 3));
        setUpcomingMatches((upData.matches || []).slice(0, 3));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading dashboard...</div>;

  const level = profile?.level;
  const accuracy = profile?.totalAnswered
    ? Math.round((profile.totalCorrect / profile.totalAnswered) * 100)
    : 0;

  return (
    <div className="dashboard">
      <h1>Welcome, {profile?.username || user?.username}!</h1>

      <div className="level-banner">
        <div className="level-info">
          <span className="level-badge">{level?.name || 'Rookie Fan'}</span>
          <span className="level-tier">Tier {level?.tier || 1}</span>
        </div>
        <div className="xp-bar-container">
          <div className="xp-bar">
            <div className="xp-bar-fill" style={{ width: `${level?.progress || 0}%` }} />
          </div>
          <div className="xp-bar-label">
            {level?.currentXp || 0} XP
            {level?.nextLevelXp ? ` / ${level.nextLevelXp} XP to ${level.nextLevel}` : ' (MAX LEVEL)'}
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card xp-card">
          <div className="stat-value">{profile?.xp ?? 0}</div>
          <div className="stat-label">Total XP</div>
        </div>
        <div className="stat-card streak-card">
          <div className="stat-value">{profile?.streak ?? 0} 🔥</div>
          <div className="stat-label">Day Streak</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{profile?.totalAnswered ?? 0}</div>
          <div className="stat-label">Questions Answered</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{accuracy}%</div>
          <div className="stat-label">Quiz Accuracy</div>
        </div>
        <div className="stat-card rank-card">
          <div className="stat-value">#{profile?.rank ?? '-'}</div>
          <div className="stat-label">Leaderboard Rank</div>
        </div>
        <div className="stat-card pred-card">
          <div className="stat-value">{profile?.predictionAccuracy ?? 0}%</div>
          <div className="stat-label">Prediction Accuracy</div>
        </div>
      </div>

      {dailyStatus && (
        <div className="daily-status-card">
          <h3>Daily Challenge</h3>
          {dailyStatus.completed ? (
            <p className="daily-done">Completed today's challenge!</p>
          ) : (
            <>
              <p className="daily-pending">
                {dailyStatus.answers?.length || 0} / {dailyStatus.questions?.length || 4} answered
              </p>
              <Link to="/daily" className="btn-daily">Continue Challenge</Link>
            </>
          )}
        </div>
      )}

      <div className="dashboard-actions">
        <Link to="/quiz" className="btn-play">Play Quiz</Link>
        {!dailyStatus?.completed && <Link to="/daily" className="btn-play btn-daily-play">Daily Challenge</Link>}
        <Link to="/battles" className="btn-play btn-battles">⚔️ Fan Battles</Link>
        <Link to="/kohli" className="btn-play btn-kohli">🏏 Kohli Mode</Link>
        <Link to="/matches" className="btn-play btn-matches">Predict Matches</Link>
        <Link to="/live" className="btn-play" style={{ background: '#8844cc' }}>⚡ Live Feed</Link>
        <Link to="/fan-card" className="btn-play btn-fancard">📊 Fan Card</Link>
        <Link to="/referrals" className="btn-play btn-ref">🔥 Refer Friends</Link>
        <Link to="/titles" className="btn-play btn-titles">🏆 Titles</Link>
      </div>

      {liveMatches.length > 0 && (
        <div className="activity-section" style={{ marginTop: 20 }}>
          <h3>🔴 Live Matches</h3>
          {liveMatches.map(m => (
            <div key={m.id} style={{ background: '#1a2a1a', padding: 10, borderRadius: 6, marginBottom: 8, borderLeft: `3px solid ${m.relevance_category === 'kohli' ? '#ff6b00' : m.relevance_category === 'ipl' ? '#e91e63' : '#4caf50'}` }}>
              <strong>{m.team_a}</strong> vs <strong>{m.team_b}</strong>
              {m.relevance_category && <span style={{ fontSize: 10, background: '#333', color: '#aaa', borderRadius: 3, padding: '1px 5px', marginLeft: 8 }}>{m.relevance_category.toUpperCase()}</span>}
              {m.venue && <span style={{ fontSize: 12, color: '#888', marginLeft: 10 }}>{m.venue}</span>}
              {m.series_name && <div style={{ fontSize: 11, color: '#666' }}>{m.series_name}</div>}
            </div>
          ))}
          <Link to="/matches" style={{ fontSize: 13, color: '#4488cc' }}>View all matches →</Link>
        </div>
      )}

      {upcomingMatches.length > 0 && (
        <div className="activity-section" style={{ marginTop: 15 }}>
          <h3>📅 Upcoming Matches</h3>
          {upcomingMatches.map(m => (
            <div key={m.id} style={{ background: '#1a1a2e', padding: 10, borderRadius: 6, marginBottom: 8, borderLeft: `3px solid ${m.relevance_category === 'kohli' ? '#ff6b00' : m.relevance_category === 'ipl' ? '#e91e63' : '#333'}` }}>
              <strong>{m.team_a}</strong> vs <strong>{m.team_b}</strong>
              {m.relevance_category && <span style={{ fontSize: 10, background: '#333', color: '#aaa', borderRadius: 3, padding: '1px 5px', marginLeft: 8 }}>{m.relevance_category.toUpperCase()}</span>}
              <span style={{ fontSize: 12, color: '#888', marginLeft: 10 }}>{new Date(m.match_date).toLocaleDateString()}</span>
              {m.series_name && <div style={{ fontSize: 11, color: '#666' }}>{m.series_name}</div>}
            </div>
          ))}
          <Link to="/matches" style={{ fontSize: 13, color: '#4488cc' }}>Predict matches →</Link>
        </div>
      )}

      {profile?.recentActivity?.length > 0 && (
        <div className="activity-section">
          <h3>Recent Activity</h3>
          <ul className="activity-list">
            {profile.recentActivity.map((a, i) => (
              <li key={i} className="activity-item">
                <span className="activity-detail">{a.detail}</span>
                {a.xp_change > 0 && <span className="activity-xp">+{a.xp_change} XP</span>}
                <span className="activity-time">{new Date(a.created_at + 'Z').toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
