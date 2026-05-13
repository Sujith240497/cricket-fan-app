import { getDb, initDb } from './db.js';

initDb();
const db = getDb();

const questions = [
  // EASY
  {
    question: 'How many players are there in a cricket team?',
    option_a: '9', option_b: '10', option_c: '11', option_d: '12',
    correct_option: 'C', category: 'rules', difficulty: 'easy',
    explanation: 'A standard cricket team consists of 11 players on the field.'
  },
  {
    question: 'What is the term for scoring zero runs in cricket?',
    option_a: 'Nil', option_b: 'Zero', option_c: 'Duck', option_d: 'Blank',
    correct_option: 'C', category: 'general', difficulty: 'easy',
    explanation: "Getting out without scoring is called a \"duck\", possibly from \"duck's egg\" (shape of 0)."
  },
  {
    question: 'What does LBW stand for in cricket?',
    option_a: 'Left Before Wicket', option_b: 'Leg Before Wicket', option_c: 'Leg Behind Wicket', option_d: 'Left Behind Wicket',
    correct_option: 'B', category: 'rules', difficulty: 'easy',
    explanation: "LBW stands for Leg Before Wicket — a dismissal when the ball hits the batsman's leg in line with the stumps."
  },
  {
    question: 'Who is known as the "God of Cricket"?',
    option_a: 'Brian Lara', option_b: 'Ricky Ponting', option_c: 'Sachin Tendulkar', option_d: 'Virat Kohli',
    correct_option: 'C', category: 'general', difficulty: 'easy',
    explanation: 'Sachin Tendulkar is widely regarded as the "God of Cricket" for his unmatched career in international cricket.'
  },
  {
    question: 'What is a "hat-trick" in cricket?',
    option_a: 'Scoring three centuries in a row', option_b: 'Taking three wickets in three consecutive balls', option_c: 'Hitting three sixes in a row', option_d: 'Winning three matches in a row',
    correct_option: 'B', category: 'rules', difficulty: 'easy',
    explanation: 'A hat-trick occurs when a bowler takes a wicket on each of three consecutive deliveries.'
  },
  {
    question: 'How many runs is a boundary along the ground worth?',
    option_a: '2', option_b: '4', option_c: '6', option_d: '8',
    correct_option: 'B', category: 'rules', difficulty: 'easy',
    explanation: 'A ball that crosses the boundary along the ground scores 4 runs.'
  },
  {
    question: 'What shape is a cricket ball?',
    option_a: 'Oval', option_b: 'Cylindrical', option_c: 'Spherical', option_d: 'Flat',
    correct_option: 'C', category: 'general', difficulty: 'easy',
    explanation: 'A cricket ball is spherical, made of cork and leather, weighing about 155-163 grams.'
  },
  {
    question: 'How many stumps are in a set of wickets?',
    option_a: '2', option_b: '3', option_c: '4', option_d: '5',
    correct_option: 'B', category: 'rules', difficulty: 'easy',
    explanation: 'Each wicket has 3 stumps (leg, middle, off) with 2 bails on top.'
  },
  // MEDIUM
  {
    question: 'What is the maximum number of overs per bowler in a 50-over ODI match?',
    option_a: '8', option_b: '10', option_c: '12', option_d: '15',
    correct_option: 'B', category: 'rules', difficulty: 'medium',
    explanation: 'In a 50-over ODI, each bowler can bowl a maximum of 10 overs (one-fifth of the total).'
  },
  {
    question: 'Which country won the first ever Cricket World Cup in 1975?',
    option_a: 'Australia', option_b: 'England', option_c: 'West Indies', option_d: 'India',
    correct_option: 'C', category: 'history', difficulty: 'medium',
    explanation: 'The West Indies won the inaugural 1975 Cricket World Cup, held in England.'
  },
  {
    question: 'In which year did India win their first T20 World Cup?',
    option_a: '2007', option_b: '2009', option_c: '2011', option_d: '2013',
    correct_option: 'A', category: 'history', difficulty: 'medium',
    explanation: "India won the inaugural ICC T20 World Cup in 2007 in South Africa under MS Dhoni's captaincy."
  },
  {
    question: 'Which country has won the most Cricket World Cups?',
    option_a: 'India', option_b: 'West Indies', option_c: 'Australia', option_d: 'England',
    correct_option: 'C', category: 'history', difficulty: 'medium',
    explanation: 'Australia holds the record with the most ODI World Cup titles (6 titles).'
  },
  {
    question: 'Who captained India to their 2011 World Cup victory?',
    option_a: 'Virat Kohli', option_b: 'Sourav Ganguly', option_c: 'MS Dhoni', option_d: 'Rahul Dravid',
    correct_option: 'C', category: 'history', difficulty: 'medium',
    explanation: 'MS Dhoni captained India to victory in the 2011 World Cup final against Sri Lanka in Mumbai.'
  },
  {
    question: 'Which stadium is known as the "Home of Cricket"?',
    option_a: 'Melbourne Cricket Ground', option_b: 'Eden Gardens', option_c: 'The Oval', option_d: "Lord's Cricket Ground",
    correct_option: 'D', category: 'general', difficulty: 'medium',
    explanation: "Lord's Cricket Ground in London is referred to as the Home of Cricket, founded in 1814."
  },
  {
    question: 'What is a "Powerplay" in limited-overs cricket?',
    option_a: 'When batsmen can hit freely', option_b: 'Fielding restrictions period', option_c: 'Extra runs given', option_d: 'Time for team substitution',
    correct_option: 'B', category: 'rules', difficulty: 'medium',
    explanation: 'A Powerplay is a set of overs where fielding restrictions apply, allowing fewer fielders outside the inner circle.'
  },
  {
    question: 'Which format of cricket has a maximum of 20 overs per side?',
    option_a: 'Test', option_b: 'ODI', option_c: 'T20', option_d: 'The Hundred',
    correct_option: 'C', category: 'rules', difficulty: 'medium',
    explanation: 'T20 (Twenty20) cricket limits each team to a maximum of 20 overs per innings.'
  },
  {
    question: 'Who holds the record for most runs in ODI career?',
    option_a: 'Ricky Ponting', option_b: 'Sachin Tendulkar', option_c: 'Kumar Sangakkara', option_d: 'Virat Kohli',
    correct_option: 'B', category: 'records', difficulty: 'medium',
    explanation: 'Sachin Tendulkar holds the all-time record with 18,426 runs in ODI cricket.'
  },
  // HARD
  {
    question: 'Who holds the record for the highest individual score in ODI cricket?',
    option_a: 'Sachin Tendulkar', option_b: 'Rohit Sharma', option_c: 'Martin Guptill', option_d: 'Fakhar Zaman',
    correct_option: 'B', category: 'records', difficulty: 'hard',
    explanation: 'Rohit Sharma holds the record with 264 runs against Sri Lanka in 2014 at Eden Gardens, Kolkata.'
  },
  {
    question: 'Which bowler has taken the most wickets in Test cricket?',
    option_a: 'Shane Warne', option_b: 'James Anderson', option_c: 'Anil Kumble', option_d: 'Muthiah Muralidaran',
    correct_option: 'D', category: 'records', difficulty: 'hard',
    explanation: 'Muthiah Muralidaran holds the record with 800 Test wickets for Sri Lanka.'
  },
  {
    question: 'Who scored the fastest century in ODI cricket history?',
    option_a: 'AB de Villiers', option_b: 'Chris Gayle', option_c: 'Shahid Afridi', option_d: 'Corey Anderson',
    correct_option: 'A', category: 'records', difficulty: 'hard',
    explanation: 'AB de Villiers scored the fastest ODI century in just 31 balls against the West Indies in 2015.'
  },
  {
    question: 'Which format of cricket was introduced most recently?',
    option_a: 'Test Cricket', option_b: 'ODI', option_c: 'T20', option_d: 'The Hundred',
    correct_option: 'D', category: 'general', difficulty: 'hard',
    explanation: 'The Hundred was introduced by the ECB in 2021 as a 100-ball-per-innings format.'
  },
  {
    question: 'What is the "Duckworth-Lewis-Stern" method used for?',
    option_a: 'Calculating bowling average', option_b: 'Revising targets in rain-affected matches', option_c: 'Ranking teams', option_d: 'Setting field placements',
    correct_option: 'B', category: 'rules', difficulty: 'hard',
    explanation: 'The DLS method is a mathematical formula to calculate target scores in rain-interrupted limited-overs matches.'
  },
  {
    question: 'Who has taken the most wickets in a single Test innings?',
    option_a: 'Anil Kumble', option_b: 'Jim Laker', option_c: 'Muthiah Muralidaran', option_d: 'Shane Warne',
    correct_option: 'B', category: 'records', difficulty: 'hard',
    explanation: 'Jim Laker took 10 wickets for 53 runs (10/53) against Australia at Old Trafford in 1956.'
  },
  {
    question: 'Which batsman scored 400 not out in a Test innings?',
    option_a: 'Don Bradman', option_b: 'Brian Lara', option_c: 'Matthew Hayden', option_d: 'Virender Sehwag',
    correct_option: 'B', category: 'records', difficulty: 'hard',
    explanation: 'Brian Lara scored 400 not out against England in Antigua in 2004, the highest individual Test score.'
  },
  {
    question: "What is Don Bradman's career Test batting average?",
    option_a: '89.78', option_b: '95.14', option_c: '99.94', option_d: '102.30',
    correct_option: 'C', category: 'records', difficulty: 'hard',
    explanation: "Don Bradman's legendary Test average of 99.94 is widely considered the greatest achievement in any sport."
  },
  {
    question: 'Who was the first cricketer to score a double century in ODI cricket?',
    option_a: 'Sachin Tendulkar', option_b: 'Rohit Sharma', option_c: 'Chris Gayle', option_d: 'Martin Guptill',
    correct_option: 'A', category: 'records', difficulty: 'hard',
    explanation: 'Sachin Tendulkar scored the first ODI double century (200*) against South Africa in Gwalior in 2010.'
  }
];

// Clear old questions and re-seed
db.exec('DELETE FROM user_answers');
db.exec('DELETE FROM daily_challenges');
db.exec('DELETE FROM battle_answers');
db.exec('DELETE FROM battles');
db.exec('DELETE FROM questions');

const insert = db.prepare(`
  INSERT INTO questions (question, option_a, option_b, option_c, option_d, correct_option, category, difficulty, explanation, mode, time_limit)
  VALUES (@question, @option_a, @option_b, @option_c, @option_d, @correct_option, @category, @difficulty, @explanation, @mode, @time_limit)
`);

const insertMany = db.transaction((items) => {
  for (const item of items) {
    insert.run({ mode: 'normal', time_limit: 30, ...item });
  }
});

insertMany(questions);

// Kohli Mode questions (pressure-based, chase-themed)
const kohliQuestions = [
  {
    question: 'In the 2016 IPL, Kohli scored how many centuries in a single season?',
    option_a: '2', option_b: '3', option_c: '4', option_d: '5',
    correct_option: 'C', category: 'kohli', difficulty: 'hard',
    explanation: 'Virat Kohli scored 4 centuries in IPL 2016, a record for a single season.',
    mode: 'kohli', time_limit: 15
  },
  {
    question: 'What was India\'s target when Kohli scored 82* in the 2016 T20 WC vs Australia?',
    option_a: '161', option_b: '178', option_c: '192', option_d: '201',
    correct_option: 'A', category: 'kohli', difficulty: 'hard',
    explanation: 'India chased 161 with Kohli\'s masterclass 82* off 51 balls in Mohali.',
    mode: 'kohli', time_limit: 15
  },
  {
    question: 'How many ODI centuries did Kohli score while chasing?',
    option_a: '18', option_b: '22', option_c: '26', option_d: '30',
    correct_option: 'C', category: 'kohli', difficulty: 'hard',
    explanation: 'Kohli has 26 ODI centuries while chasing, the most by any batsman.',
    mode: 'kohli', time_limit: 15
  },
  {
    question: 'What score was Kohli stranded at in the 2023 WC Final?',
    option_a: '54', option_b: '75', option_c: '99', option_d: '77',
    correct_option: 'A', category: 'kohli', difficulty: 'hard',
    explanation: 'Kohli scored 54 in the 2023 World Cup Final which India lost to Australia.',
    mode: 'kohli', time_limit: 15
  },
  {
    question: 'Against which team did Kohli play the "Desert Storm" knock of 183 in 2012?',
    option_a: 'Sri Lanka', option_b: 'Pakistan', option_c: 'Australia', option_d: 'Bangladesh',
    correct_option: 'B', category: 'kohli', difficulty: 'hard',
    explanation: 'Kohli\'s 183 against Pakistan in the 2012 Asia Cup is one of his finest chasing knocks.',
    mode: 'kohli', time_limit: 15
  },
  {
    question: 'In the famous 2014 Adelaide Test, what was Kohli\'s score in the 4th innings chase?',
    option_a: '115', option_b: '141', option_c: '101', option_d: '141',
    correct_option: 'A', category: 'kohli', difficulty: 'hard',
    explanation: 'Kohli scored 141 in the first innings and 28 in the second, totaling 169 runs.',
    mode: 'kohli', time_limit: 15
  },
  {
    question: 'How many T20I centuries has Kohli scored (as of 2024)?',
    option_a: '0', option_b: '1', option_c: '2', option_d: '3',
    correct_option: 'B', category: 'kohli', difficulty: 'hard',
    explanation: 'Kohli has scored 1 T20I century, against Afghanistan in 2022 Asia Cup.',
    mode: 'kohli', time_limit: 15
  },
  {
    question: 'What is Kohli\'s highest score in a successful chase in Tests?',
    option_a: '141', option_b: '149', option_c: '103', option_d: '115',
    correct_option: 'A', category: 'kohli', difficulty: 'hard',
    explanation: 'Kohli\'s 141 in Adelaide 2014 was in a chase (India fell short by 48 runs though).',
    mode: 'kohli', time_limit: 15
  }
];

insertMany(kohliQuestions);
console.log(`Seeded ${questions.length} normal + ${kohliQuestions.length} Kohli Mode questions.`);

