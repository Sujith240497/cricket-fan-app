import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

export default function LiveFeed() {
  const [events, setEvents] = useState([]);
  const [multipliers, setMultipliers] = useState(null);
  const [moment, setMoment] = useState(null);
  const [reacting, setReacting] = useState(null);
  const [message, setMessage] = useState('');

  const REACTION_TYPES = ['🔥', '😱', '💀', '🏏'];

  const loadData = useCallback(async () => {
    try {
      const [evts, mults, mom] = await Promise.all([
        api.getRecentEvents(15),
        api.getMultipliers(),
        api.getMomentOfDay()
      ]);
      setEvents(evts || []);
      setMultipliers(mults);
      setMoment(mom);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000); // poll every 15s
    return () => clearInterval(interval);
  }, [loadData]);

  const triggerTick = async () => {
    try {
      const newEvents = await api.tickLiveEvents();
      setMessage(newEvents.length ? `${newEvents.length} new event(s) generated!` : 'No new events this tick.');
      loadData();
    } catch (e) { setMessage('Tick failed'); }
    setTimeout(() => setMessage(''), 3000);
  };

  const react = async (eventId, type) => {
    setReacting(eventId);
    try {
      const result = await api.sendReaction(eventId, type);
      setMessage(`Reacted ${type}! +${result.xpEarned} XP${result.streakBonus ? ' (streak bonus!)' : ''}`);
      loadData();
    } catch (e) {
      setMessage(e.message || 'Already reacted');
    }
    setReacting(null);
    setTimeout(() => setMessage(''), 3000);
  };

  const intensityColor = (intensity) => {
    switch (intensity) {
      case 'critical': return '#ff4444';
      case 'high': return '#ff8800';
      case 'medium': return '#ffcc00';
      case 'low': return '#88cc88';
      default: return '#aaa';
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 20 }}>
      <h2>⚡ Live Feed</h2>

      {message && <div style={{ background: '#1a3a1a', padding: 10, borderRadius: 8, marginBottom: 15, color: '#4caf50' }}>{message}</div>}

      {/* Multiplier banner */}
      {multipliers && multipliers.combined > 1 && (
        <div style={{ background: '#2a1a3a', padding: 12, borderRadius: 8, marginBottom: 15, border: '1px solid #8844cc' }}>
          <strong>🚀 Active XP Multiplier: {multipliers.combined}x</strong>
          <div style={{ fontSize: 13, marginTop: 5, color: '#ccc' }}>
            {multipliers.multipliers.map((m, i) => (
              <span key={i} style={{ marginRight: 12 }}>{m.name}: {m.multiplier}x</span>
            ))}
            {multipliers.capped && <span style={{ color: '#ff8800' }}>(capped)</span>}
          </div>
        </div>
      )}

      {/* Moment of the Day */}
      {moment && moment.topMoment && (
        <div style={{ background: '#1a2a3a', padding: 12, borderRadius: 8, marginBottom: 15, border: '1px solid #4488cc' }}>
          <strong>{moment.topMoment.title}</strong>
          <div style={{ fontSize: 13, color: '#ccc', marginTop: 4 }}>{moment.topMoment.description}</div>
        </div>
      )}

      {/* Tick button (simulate event generation) */}
      <button onClick={triggerTick} style={{
        background: '#4caf50', color: '#fff', border: 'none', padding: '8px 16px',
        borderRadius: 6, cursor: 'pointer', marginBottom: 15, fontSize: 14
      }}>
        🏏 Simulate Match Tick
      </button>

      {/* Events */}
      {events.length === 0 ? (
        <p style={{ color: '#888' }}>No live events yet. Start a match and tick to generate events!</p>
      ) : (
        events.map(event => (
          <div key={event.id} style={{
            background: '#1a1a2e', padding: 14, borderRadius: 8, marginBottom: 10,
            borderLeft: `4px solid ${intensityColor(event.intensity)}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 16 }}>{event.title}</strong>
              <span style={{ fontSize: 12, color: '#888' }}>
                {event.xp_multiplier > 1 ? `${event.xp_multiplier}x XP` : ''}
              </span>
            </div>
            <p style={{ color: '#ccc', margin: '6px 0', fontSize: 14 }}>{event.description}</p>
            {event.team_a && (
              <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>
                {event.team_a} vs {event.team_b}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {REACTION_TYPES.map(type => (
                <button key={type} onClick={() => react(event.id, type)}
                  disabled={reacting === event.id}
                  style={{
                    fontSize: 20, background: 'transparent', border: '1px solid #333',
                    borderRadius: 6, padding: '4px 10px', cursor: 'pointer'
                  }}>
                  {type}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: '#555', marginTop: 6 }}>
              {new Date(event.created_at).toLocaleTimeString()}
              {event.is_active ? ' • 🟢 Active' : ' • ⚪ Ended'}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
