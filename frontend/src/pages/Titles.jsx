import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Titles() {
  const [titles, setTitles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAllTitles()
      .then(data => setTitles(data.titles))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading titles...</div>;

  const unlocked = titles.filter(t => t.unlocked);
  const locked = titles.filter(t => !t.unlocked);

  return (
    <div className="titles-page">
      <h1>🏆 Fan Titles</h1>
      <p className="titles-subtitle">Unlock titles by achieving milestones!</p>

      <div className="titles-progress">
        <span>{unlocked.length}/{titles.length} unlocked</span>
        <div className="titles-bar">
          <div className="titles-bar-fill" style={{ width: `${(unlocked.length / titles.length) * 100}%` }} />
        </div>
      </div>

      {unlocked.length > 0 && (
        <div className="titles-section">
          <h3>Unlocked</h3>
          <div className="titles-grid">
            {unlocked.map(t => (
              <div key={t.key} className="title-card unlocked">
                <span className="title-icon">🏅</span>
                <span className="title-name">{t.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="titles-section">
        <h3>Locked</h3>
        <div className="titles-grid">
          {locked.map(t => (
            <div key={t.key} className="title-card locked">
              <span className="title-icon">🔒</span>
              <span className="title-name">{t.title}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
