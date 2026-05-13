import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Timeline() {
  const [timeline, setTimeline] = useState([]);
  const [reactionStats, setReactionStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [tl, stats] = await Promise.all([
          api.getTimeline(40),
          api.getMyReactionStats()
        ]);
        setTimeline(tl || []);
        setReactionStats(stats);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, []);

  const iconForType = (entryType, eventType) => {
    if (entryType === 'reaction') return eventType;
    const icons = {
      quiz_correct: '✅', quiz_incorrect: '❌', level_up: '🆙',
      daily_bonus: '📅', kohli: '🏏', battle: '⚔️',
      referral: '🤝', prediction: '🔮', reaction: '💬'
    };
    return icons[eventType] || '📌';
  };

  if (loading) return <p style={{ textAlign: 'center', padding: 40 }}>Loading timeline...</p>;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 20 }}>
      <h2>📜 Your Cricket Timeline</h2>

      {/* Reaction Stats Card */}
      {reactionStats && (
        <div style={{ background: '#1a2a3a', padding: 14, borderRadius: 8, marginBottom: 20, border: '1px solid #335' }}>
          <h3 style={{ margin: '0 0 8px' }}>Your Reaction Profile</h3>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 14 }}>
            <span>Total Reactions: <strong>{reactionStats.totalReactions}</strong></span>
            <span>This Week: <strong>{reactionStats.weeklyReactions}</strong></span>
            <span>Engagement: <strong>{reactionStats.engagementScore}/100</strong></span>
            {reactionStats.favoriteReaction && (
              <span>Favorite: <strong>{reactionStats.favoriteReaction}</strong></span>
            )}
          </div>
          {reactionStats.byType?.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', gap: 12 }}>
              {reactionStats.byType.map((r, i) => (
                <span key={i} style={{ fontSize: 13, color: '#aaa' }}>
                  {r.reaction_type} {r.count}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      {timeline.length === 0 ? (
        <p style={{ color: '#888' }}>No activity yet. Start playing to build your timeline!</p>
      ) : (
        <div style={{ borderLeft: '2px solid #333', paddingLeft: 20, marginLeft: 10 }}>
          {timeline.map((item, i) => (
            <div key={i} style={{
              position: 'relative', marginBottom: 16, padding: '10px 14px',
              background: '#1a1a2e', borderRadius: 8
            }}>
              <div style={{
                position: 'absolute', left: -30, top: 12, width: 18, height: 18,
                background: '#2a2a4a', borderRadius: '50%', textAlign: 'center',
                fontSize: 12, lineHeight: '18px'
              }}>
                {iconForType(item.entry_type, item.event_type)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14 }}>{item.description || item.event_type}</span>
                {item.xp > 0 && <span style={{ color: '#4caf50', fontWeight: 'bold' }}>+{item.xp} XP</span>}
              </div>
              <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                {new Date(item.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
