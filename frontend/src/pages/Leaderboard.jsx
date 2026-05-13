import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Leaderboard() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [weeklyBoard, setWeeklyBoard] = useState([]);
  const [movers, setMovers] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [compareId, setCompareId] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [lbTab, setLbTab] = useState('all-time');

  useEffect(() => {
    Promise.all([
      api.getLeaderboard(),
      api.getWeeklyLeaderboard(),
      api.getTopMovers()
    ])
      .then(([allData, weeklyData, moversData]) => {
        setLeaderboard(allData.leaderboard);
        setUserRank(allData.userRank);
        setWeeklyBoard(weeklyData.leaderboard);
        setMovers(moversData.movers);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleCompare(userId) {
    if (userId === user?.id) return;
    setCompareId(userId);
    try {
      const data = await api.compareUsers(userId);
      setComparison(data);
    } catch {
      setComparison(null);
    }
  }

  if (loading) return <div className="loading">Loading leaderboard...</div>;

  const activeBoard = lbTab === 'weekly' ? weeklyBoard : leaderboard;

  return (
    <div className="leaderboard-page">
      <h1>Leaderboard</h1>

      {userRank && (
        <div className="your-rank-card">
          <span>Your Rank</span>
          <strong>#{userRank}</strong>
        </div>
      )}

      <div className="tab-bar">
        <button className={`tab-btn ${lbTab === 'all-time' ? 'active' : ''}`} onClick={() => setLbTab('all-time')}>
          All Time
        </button>
        <button className={`tab-btn ${lbTab === 'weekly' ? 'active' : ''}`} onClick={() => setLbTab('weekly')}>
          This Week
        </button>
        <button className={`tab-btn ${lbTab === 'movers' ? 'active' : ''}`} onClick={() => setLbTab('movers')}>
          🚀 Top Movers
        </button>
      </div>

      {lbTab === 'movers' ? (
        <div className="movers-list">
          {movers.length === 0 && <p className="no-data">No movers this week yet.</p>}
          {movers.map((m, i) => (
            <div key={m.userId} className="mover-card">
              <span className="mover-rank">#{i + 1}</span>
              <span className="mover-name">{m.username}</span>
              <span className="mover-xp">+{m.xpGained} XP</span>
              <span className={`mover-change ${m.rankChange > 0 ? 'up' : m.rankChange < 0 ? 'down' : ''}`}>
                {m.rankChange > 0 ? `↑${m.rankChange}` : m.rankChange < 0 ? `↓${Math.abs(m.rankChange)}` : '—'}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="leaderboard-table">
          <div className="lb-header">
            <span className="lb-col-rank">#</span>
            <span className="lb-col-user">Player</span>
            <span className="lb-col-level">Level</span>
            <span className="lb-col-xp">XP</span>
            <span className="lb-col-streak">Streak</span>
            <span className="lb-col-action"></span>
          </div>
          {activeBoard.map((entry) => (
            <div
              key={entry.userId}
              className={`lb-row ${entry.userId === user?.id ? 'lb-row-you' : ''} ${entry.rank <= 3 ? 'lb-row-top' : ''}`}
            >
              <span className="lb-col-rank">
                {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : entry.rank}
              </span>
              <span className="lb-col-user">
                {entry.username}
                {entry.userId === user?.id && <small className="you-tag"> (You)</small>}
              </span>
              <span className="lb-col-level">
                <span className="lb-level-badge">{entry.level.name}</span>
              </span>
              <span className="lb-col-xp">{lbTab === 'weekly' ? entry.weeklyXp : entry.xp}</span>
              <span className="lb-col-streak">{entry.streak > 0 ? `🔥${entry.streak}` : '-'}</span>
              <span className="lb-col-action">
                {entry.userId !== user?.id && (
                  <button className="btn-compare" onClick={() => handleCompare(entry.userId)}>
                    Compare
                  </button>
                )}
              </span>
            </div>
          ))}
          {activeBoard.length === 0 && (
            <div className="lb-empty">No users yet. Be the first to earn XP!</div>
          )}
        </div>
      )}

      {comparison && (
        <div className="compare-modal" onClick={() => setComparison(null)}>
          <div className="compare-card" onClick={e => e.stopPropagation()}>
            <h3>Head to Head</h3>
            <button className="compare-close" onClick={() => setComparison(null)}>✕</button>
            <div className="compare-grid">
              <div className="compare-col">
                <div className="compare-name">{comparison.userA.username}</div>
                <div className="compare-stat"><strong>{comparison.userA.xp}</strong> XP</div>
                <div className="compare-stat"><strong>#{comparison.userA.rank}</strong> Rank</div>
                <div className="compare-stat"><strong>{comparison.userA.quizAccuracy}%</strong> Quiz Accuracy</div>
                <div className="compare-stat"><strong>{comparison.userA.streak}</strong> 🔥 Streak</div>
                <div className="compare-stat"><strong>{comparison.userA.predictionAccuracy}%</strong> Prediction Acc.</div>
              </div>
              <div className="compare-vs">VS</div>
              <div className="compare-col">
                <div className="compare-name">{comparison.userB.username}</div>
                <div className="compare-stat"><strong>{comparison.userB.xp}</strong> XP</div>
                <div className="compare-stat"><strong>#{comparison.userB.rank}</strong> Rank</div>
                <div className="compare-stat"><strong>{comparison.userB.quizAccuracy}%</strong> Quiz Accuracy</div>
                <div className="compare-stat"><strong>{comparison.userB.streak}</strong> 🔥 Streak</div>
                <div className="compare-stat"><strong>{comparison.userB.predictionAccuracy}%</strong> Prediction Acc.</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
