import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import NotificationBell from './components/NotificationBell';

// Lazy load pages
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Quiz = lazy(() => import('./pages/Quiz'));
const DailyChallenge = lazy(() => import('./pages/DailyChallenge'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Matches = lazy(() => import('./pages/Matches'));
const Predictions = lazy(() => import('./pages/Predictions'));
const Battles = lazy(() => import('./pages/Battles'));
const KohliMode = lazy(() => import('./pages/KohliMode'));
const FanCard = lazy(() => import('./pages/FanCard'));
const Referrals = lazy(() => import('./pages/Referrals'));
const Titles = lazy(() => import('./pages/Titles'));
const LiveFeed = lazy(() => import('./pages/LiveFeed'));
const Timeline = lazy(() => import('./pages/Timeline'));
const Insights = lazy(() => import('./pages/Insights'));

function Navbar() {
  const { user, logout } = useAuth();
  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">🏏 Fan Identity</Link>
      {user && (
        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/battles">⚔️ Battles</Link>
          <Link to="/kohli">🏏 Kohli</Link>
          <Link to="/matches">Matches</Link>
          <Link to="/live">⚡ Live</Link>
          <Link to="/leaderboard">Rank</Link>
          <Link to="/insights">🧠</Link>
          <Link to="/timeline">📜</Link>
          <Link to="/fan-card">Card</Link>
          {user.level && <span className="nav-level">{user.level.name}</span>}
          <span className="nav-xp">{user.xp || 0} XP</span>
          {user.streak > 0 && <span className="nav-streak">🔥{user.streak}</span>}
          <NotificationBell />
          <button onClick={logout} className="btn-logout">Logout</button>
        </div>
      )}
    </nav>
  );
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  return user ? children : <Navigate to="/login" />;
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  return !user ? children : <Navigate to="/" />;
}

export default function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="main">
        <Suspense fallback={<div className="loading">Loading...</div>}>
          <Routes>
            <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
            <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
            <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/quiz" element={<PrivateRoute><Quiz /></PrivateRoute>} />
            <Route path="/daily" element={<PrivateRoute><DailyChallenge /></PrivateRoute>} />
            <Route path="/leaderboard" element={<PrivateRoute><Leaderboard /></PrivateRoute>} />
            <Route path="/matches" element={<PrivateRoute><Matches /></PrivateRoute>} />
            <Route path="/predictions" element={<PrivateRoute><Predictions /></PrivateRoute>} />
            <Route path="/battles" element={<PrivateRoute><Battles /></PrivateRoute>} />
            <Route path="/kohli" element={<PrivateRoute><KohliMode /></PrivateRoute>} />
            <Route path="/fan-card" element={<PrivateRoute><FanCard /></PrivateRoute>} />
            <Route path="/referrals" element={<PrivateRoute><Referrals /></PrivateRoute>} />
            <Route path="/titles" element={<PrivateRoute><Titles /></PrivateRoute>} />
            <Route path="/live" element={<PrivateRoute><LiveFeed /></PrivateRoute>} />
            <Route path="/timeline" element={<PrivateRoute><Timeline /></PrivateRoute>} />
            <Route path="/insights" element={<PrivateRoute><Insights /></PrivateRoute>} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
