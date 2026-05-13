import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Predictions() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMyPredictions()
      .then(data => setPredictions(data.predictions))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading predictions...</div>;

  const correct = predictions.filter(p => p.is_correct === 1).length;
  const resolved = predictions.filter(p => p.is_correct !== null).length;
  const accuracy = resolved > 0 ? Math.round((correct / resolved) * 100) : 0;

  return (
    <div className="predictions-page">
      <h1>My Predictions</h1>

      <div className="pred-stats-bar">
        <div className="pred-stat">
          <span className="pred-stat-val">{predictions.length}</span>
          <span className="pred-stat-label">Total</span>
        </div>
        <div className="pred-stat">
          <span className="pred-stat-val">{correct}</span>
          <span className="pred-stat-label">Correct</span>
        </div>
        <div className="pred-stat">
          <span className="pred-stat-val">{accuracy}%</span>
          <span className="pred-stat-label">Accuracy</span>
        </div>
      </div>

      <div className="pred-list">
        {predictions.length === 0 && <p className="no-data">No predictions yet. Go to Matches to predict!</p>}
        {predictions.map(p => (
          <div key={p.id} className={`pred-card ${p.is_correct === 1 ? 'pred-correct' : p.is_correct === 0 ? 'pred-wrong' : 'pred-pending'}`}>
            <div className="pred-match">
              <span>{p.team_a} vs {p.team_b}</span>
              <span className="pred-date">{new Date(p.match_date).toLocaleDateString()}</span>
            </div>
            <div className="pred-detail">
              <span className="pred-pick">Your pick: <strong>{p.prediction}</strong></span>
              {p.is_correct === 1 && <span className="pred-badge correct">✓ Correct (+20 XP)</span>}
              {p.is_correct === 0 && <span className="pred-badge wrong">✗ Wrong</span>}
              {p.is_correct === null && <span className="pred-badge pending">⏳ Pending</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
