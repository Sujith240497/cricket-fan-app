import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const OPTION_KEYS = ['A', 'B', 'C', 'D'];
const OPTION_FIELDS = { A: 'option_a', B: 'option_b', C: 'option_c', D: 'option_d' };

export default function DailyChallenge() {
  const { updateUser } = useAuth();
  const [challenge, setChallenge] = useState(null);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [score, setScore] = useState({ correct: 0, xpEarned: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [levelUpMsg, setLevelUpMsg] = useState(null);
  const [allDone, setAllDone] = useState(false);

  useEffect(() => {
    api.getDailyChallenge()
      .then(data => {
        const c = data.challenge;
        setChallenge(c);
        if (c.completed) {
          setAllDone(true);
        } else if (c.answers?.length > 0) {
          // Resume from where user left off
          const answeredIds = new Set(c.answers.map(a => a.question_id));
          const nextUnanswered = c.questions.findIndex(q => !answeredIds.has(q.id));
          if (nextUnanswered === -1) {
            setAllDone(true);
          } else {
            setCurrent(nextUnanswered);
          }
          const correctAnswers = c.answers.filter(a => a.is_correct).length;
          const totalXpEarned = c.answers.reduce((sum, a) => sum + (a.xp_earned || 0), 0);
          setScore({ correct: correctAnswers, xpEarned: totalXpEarned });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSelect(option) {
    if (result || submitting || !challenge) return;
    setSelected(option);
    setSubmitting(true);
    setLevelUpMsg(null);

    try {
      const data = await api.submitDailyAnswer(challenge.questions[current].id, option);
      setResult(data);
      updateUser({ xp: data.totalXp, level: data.level });
      if (data.correct) {
        setScore(s => ({ correct: s.correct + 1, xpEarned: s.xpEarned + data.xpEarned }));
      }
      if (data.levelUp?.leveledUp) {
        setLevelUpMsg(`Level Up! You are now a ${data.levelUp.newLevelName}!`);
      }
      if (data.allDone) {
        setAllDone(true);
      }
    } catch {
      setResult({ error: true });
    } finally {
      setSubmitting(false);
    }
  }

  function handleNext() {
    if (allDone || current + 1 >= challenge.questions.length) {
      setAllDone(true);
      setResult(null);
      return;
    }
    setCurrent(c => c + 1);
    setSelected(null);
    setResult(null);
    setLevelUpMsg(null);
  }

  if (loading) return <div className="loading">Loading daily challenge...</div>;

  if (!challenge || !challenge.questions?.length) {
    return (
      <div className="quiz">
        <h1>Daily Challenge</h1>
        <div className="quiz-status">
          <p>Could not load today's challenge. Try again later.</p>
          <Link to="/" className="btn-play" style={{ marginTop: '1rem', display: 'inline-block' }}>Dashboard</Link>
        </div>
      </div>
    );
  }

  if (allDone) {
    return (
      <div className="quiz">
        <h1>Daily Challenge</h1>
        <div className="quiz-complete">
          <h2>Challenge Complete!</h2>
          <div className="score">{score.correct} / {challenge.questions.length} correct</div>
          <div className="xp-earned">+{score.xpEarned} XP earned today</div>
          <Link to="/" className="btn" style={{ display: 'block', textDecoration: 'none', textAlign: 'center' }}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const q = challenge.questions[current];
  const isBonus = q.difficulty === 'hard';

  return (
    <div className="quiz">
      <h1>Daily Challenge</h1>

      {levelUpMsg && <div className="level-up-toast">{levelUpMsg}</div>}

      <div className="question-card">
        <div className="question-meta">
          <span>Question {current + 1} of {challenge.questions.length}</span>
          {isBonus && <span className="bonus-tag">BONUS</span>}
          <span className={`diff-tag diff-${q.difficulty}`}>{q.difficulty}</span>
        </div>
        <div className="question-text">{q.question}</div>
        <div className="options">
          {OPTION_KEYS.map(key => {
            let className = 'option-btn';
            if (result && !result.error) {
              if (key === result.correctOption) className += ' correct';
              else if (key === selected && !result.correct) className += ' incorrect';
            }
            return (
              <button
                key={key}
                className={className}
                onClick={() => handleSelect(key)}
                disabled={!!result}
              >
                <strong>{key}.</strong> {q[OPTION_FIELDS[key]]}
              </button>
            );
          })}
        </div>
        {result && !result.error && (
          <>
            <div className={`result-msg ${result.correct ? 'correct' : 'incorrect'}`}>
              {result.message}
            </div>
            {result.explanation && (
              <div className="explanation">{result.explanation}</div>
            )}
          </>
        )}
        {result && (
          <button className="btn" onClick={handleNext} style={{ marginTop: '1rem' }}>
            {allDone || current + 1 >= challenge.questions.length ? 'See Results' : 'Next Question'}
          </button>
        )}
      </div>
    </div>
  );
}
