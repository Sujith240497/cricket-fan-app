import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Insights() {
  const [insights, setInsights] = useState([]);
  const [moments, setMoments] = useState([]);
  const [multipliers, setMultipliers] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [ins, mom, mults] = await Promise.all([
          api.getInsights(),
          api.getMyMoments(5),
          api.getMultipliers()
        ]);
        setInsights(ins?.insights || []);
        setMoments(mom || []);
        setMultipliers(mults);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <p style={{ textAlign: 'center', padding: 40 }}>Analyzing your fan profile...</p>;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 20 }}>
      <h2>🧠 Fan Intelligence</h2>

      {/* Multiplier Status */}
      {multipliers && (
        <div style={{
          background: multipliers.combined > 1 ? '#2a1a3a' : '#1a1a2e',
          padding: 12, borderRadius: 8, marginBottom: 20,
          border: `1px solid ${multipliers.combined > 1 ? '#8844cc' : '#333'}`
        }}>
          <strong>Current XP Multiplier: {multipliers.combined}x</strong>
          {multipliers.multipliers.length > 0 && (
            <div style={{ fontSize: 13, color: '#ccc', marginTop: 4 }}>
              {multipliers.multipliers.map((m, i) => (
                <div key={i}>• {m.name}: {m.multiplier}x</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Insights */}
      {insights.length === 0 ? (
        <p style={{ color: '#888' }}>Play more to unlock personalized insights!</p>
      ) : (
        <div>
          <h3>Your Insights ({insights.length})</h3>
          {insights.map((insight, i) => (
            <div key={i} style={{
              background: '#1a1a2e', padding: 14, borderRadius: 8, marginBottom: 10,
              borderLeft: `4px solid ${insight.type === 'strength' ? '#4caf50' :
                insight.type === 'trend' ? '#ff8800' : '#4488cc'}`
            }}>
              <span style={{ fontSize: 20, marginRight: 10 }}>{insight.icon}</span>
              <span style={{ fontSize: 14 }}>{insight.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* My Moments */}
      {moments.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3>Your Top Moments</h3>
          {moments.map((m, i) => (
            <div key={i} style={{
              background: '#1a2a1a', padding: 10, borderRadius: 8, marginBottom: 8,
              border: m.is_top ? '1px solid #4caf50' : '1px solid #333'
            }}>
              <strong>{m.title}</strong>
              <div style={{ fontSize: 13, color: '#aaa' }}>{m.description}</div>
              <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                {m.moment_date} • {m.score} XP • {m.moment_type}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
