import { getDb, initDb } from './db.js';

initDb();
const db = getDb();

const matches = [
  // Upcoming matches
  { team_a: 'India', team_b: 'Australia', match_date: '2026-05-18T14:00:00Z', venue: 'MCG, Melbourne', status: 'upcoming' },
  { team_a: 'England', team_b: 'South Africa', match_date: '2026-05-19T10:00:00Z', venue: "Lord's, London", status: 'upcoming' },
  { team_a: 'Pakistan', team_b: 'New Zealand', match_date: '2026-05-20T09:00:00Z', venue: 'National Stadium, Karachi', status: 'upcoming' },
  { team_a: 'Sri Lanka', team_b: 'Bangladesh', match_date: '2026-05-21T14:30:00Z', venue: 'R. Premadasa, Colombo', status: 'upcoming' },
  { team_a: 'India', team_b: 'England', match_date: '2026-05-25T14:00:00Z', venue: 'Wankhede, Mumbai', status: 'upcoming' },
  { team_a: 'Australia', team_b: 'Pakistan', match_date: '2026-05-26T10:00:00Z', venue: 'SCG, Sydney', status: 'upcoming' },
  // Live matches
  { team_a: 'West Indies', team_b: 'Afghanistan', match_date: '2026-05-13T09:30:00Z', venue: 'Sabina Park, Kingston', status: 'live' },
  // Completed matches
  { team_a: 'India', team_b: 'Pakistan', match_date: '2026-05-10T14:00:00Z', venue: 'Eden Gardens, Kolkata', status: 'completed', winner: 'India' },
  { team_a: 'Australia', team_b: 'England', match_date: '2026-05-09T10:00:00Z', venue: 'The Gabba, Brisbane', status: 'completed', winner: 'Australia' },
  { team_a: 'South Africa', team_b: 'New Zealand', match_date: '2026-05-08T08:00:00Z', venue: 'Newlands, Cape Town', status: 'completed', winner: 'South Africa' },
  { team_a: 'Sri Lanka', team_b: 'West Indies', match_date: '2026-05-07T14:30:00Z', venue: 'Galle International', status: 'completed', winner: 'Sri Lanka' },
  { team_a: 'Bangladesh', team_b: 'Afghanistan', match_date: '2026-05-06T09:00:00Z', venue: 'Sher-e-Bangla, Dhaka', status: 'completed', winner: 'Afghanistan' },
];

// Clear old matches and re-seed
db.exec('DELETE FROM predictions');
db.exec('DELETE FROM matches');

const insert = db.prepare(`
  INSERT INTO matches (team_a, team_b, match_date, venue, status, winner)
  VALUES (@team_a, @team_b, @match_date, @venue, @status, @winner)
`);

const insertMany = db.transaction((items) => {
  for (const item of items) {
    insert.run({ ...item, winner: item.winner || null });
  }
});

insertMany(matches);
console.log(`Seeded ${matches.length} matches (Upcoming: ${matches.filter(m=>m.status==='upcoming').length}, Live: ${matches.filter(m=>m.status==='live').length}, Completed: ${matches.filter(m=>m.status==='completed').length}).`);
