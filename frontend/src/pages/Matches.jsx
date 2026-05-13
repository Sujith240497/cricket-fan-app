import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Matches() {
  const [upcoming, setUpcoming] = useState([]);
  const [live, setLive] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(null);
  const [toast, setToast] = useState(null);
  const [tab, setTab] = useState('upcoming');
  const [meta, setMeta] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const loadMatches = () => {
    Promise.all([
      api.getUpcomingMatches(),
      api.getLiveMatches(),
      api.getCompletedMatches()
    ])
      .then(([u, l, c]) => {
        setUpcoming(u.matches);
        setLive(l.matches);
        setCompleted(c.matches);
        setMeta(u.meta || l.meta || c.meta || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadMatches(); }, []);

  async function handleSync() {
    setSyncing(true);
    try {
      await api.syncMatches();
      setToast('Matches synced from CricketData.org!');
      loadMatches();
    } catch (err) {
      setToast(err.message || 'Sync failed');
    }
    setSyncing(false);
    setTimeout(() => setToast(null), 3000);
  }

  async function handlePredict(matchId, team) {
    setPredicting(matchId);
    try {
      await api.makePrediction(matchId, team);
      setToast(`Predicted: ${team} will win!`);
      setUpcoming(prev => prev.map(m =>
        m.id === matchId ? { ...m, predicted: team } : m
      ));
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setToast(err.message);
      setTimeout(() => setToast(null), 3000);
    } finally {
      setPredicting(null);
    }
  }

  if (loading) return <div className="loading">Loading matches...</div>;

  return (
    <div className="matches-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Matches</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {meta && <span style={{ fontSize: 11, color: '#888' }}>Source: {meta.source || 'fallback'}</span>}
          <button onClick={handleSync} disabled={syncing}
            style={{ fontSize: 12, padding: '4px 10px', borderRadius: 4, background: '#2a4a6a', color: '#fff', border: 'none', cursor: 'pointer' }}>
            {syncing ? '⏳ Syncing...' : '🔄 Sync'}
          </button>
        </div>
      </div>

      {toast && <div className="toast-msg">{toast}</div>}

      <div className="tab-bar">
        {[['upcoming', 'Upcoming'], ['live', 'Live'], ['completed', 'Completed']].map(([key, label]) => (
          <button
            key={key}
            className={`tab-btn ${tab === key ? 'active' : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
            {key === 'live' && live.length > 0 && <span className="live-dot"></span>}
          </button>
        ))}
      </div>

      {tab === 'upcoming' && (
        <div className="match-list">
          {upcoming.length === 0 && <p className="no-data">No upcoming matches.</p>}
          {upcoming.map(match => (
            <div key={match.id} className="match-card">
              <div className="match-teams">
                <span className="team">{match.team_a}</span>
                <span className="match-vs">vs</span>
                <span className="team">{match.team_b}</span>
              </div>
              <div className="match-info">
                <span>{new Date(match.match_date).toLocaleDateString()}</span>
                {match.venue && <span className="match-venue">{match.venue}</span>}
                {match.series_name && <span style={{ fontSize: 11, color: '#888', display: 'block' }}>{match.series_name}</span>}
              </div>
              {match.predicted ? (
                <div className="prediction-made">Predicted: <strong>{match.predicted}</strong></div>
              ) : (
                <div className="predict-actions">
                  <button
                    className="btn-predict"
                    onClick={() => handlePredict(match.id, match.team_a)}
                    disabled={predicting === match.id}
                  >
                    {match.team_a}
                  </button>
                  <span className="predict-or">or</span>
                  <button
                    className="btn-predict"
                    onClick={() => handlePredict(match.id, match.team_b)}
                    disabled={predicting === match.id}
                  >
                    {match.team_b}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'live' && (
        <div className="match-list">
          {live.length === 0 && <p className="no-data">No live matches right now.</p>}
          {live.map(match => (
            <div key={match.id} className="match-card match-live">
              <span className="live-badge">LIVE</span>
              <div className="match-teams">
                <span className="team">{match.team_a}</span>
                <span className="match-vs">vs</span>
                <span className="team">{match.team_b}</span>
              </div>
              <div className="match-info">
                {match.venue && <span className="match-venue">{match.venue}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'completed' && (
        <div className="match-list">
          {completed.length === 0 && <p className="no-data">No completed matches yet.</p>}
          {completed.map(match => (
            <div key={match.id} className="match-card match-completed">
              <div className="match-teams">
                <span className={`team ${match.winner === match.team_a ? 'team-winner' : ''}`}>{match.team_a}</span>
                <span className="match-vs">vs</span>
                <span className={`team ${match.winner === match.team_b ? 'team-winner' : ''}`}>{match.team_b}</span>
              </div>
              <div className="match-info">
                <span>{new Date(match.match_date).toLocaleDateString()}</span>
                <span className="match-winner">Winner: {match.winner}</span>
                {match.result_text && <span style={{ fontSize: 11, color: '#aaa', display: 'block' }}>{match.result_text}</span>}
                {match.series_name && <span style={{ fontSize: 11, color: '#888', display: 'block' }}>{match.series_name}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
