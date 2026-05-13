import cron from 'node-cron';
import { getMatches, processCompletedMatches } from './services/matchDataProviderService.js';
import { isConfigured } from './services/cricketDataApiService.js';
import { info, error as logError } from './utils/logger.js';
import { audit } from './services/auditService.js';

let schedulerRunning = false;

export function startScheduler() {
  if (!isConfigured()) {
    info('Scheduler: CricketData API not configured, using fallback data only.');
    return;
  }

  if (schedulerRunning) return;
  schedulerRunning = true;

  // Live matches: every 1 minute
  cron.schedule('*/1 * * * *', async () => {
    try {
      await getMatches('live');
    } catch (err) {
      logError(`Scheduler [live]: ${err.message}`);
    }
  });

  // Upcoming matches: every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    try {
      await getMatches('upcoming');
    } catch (err) {
      logError(`Scheduler [upcoming]: ${err.message}`);
    }
  });

  // Recent results: every 30 minutes + process predictions
  cron.schedule('*/30 * * * *', async () => {
    try {
      await getMatches('completed');
      await processCompletedMatches();
    } catch (err) {
      logError(`Scheduler [completed]: ${err.message}`);
    }
  });

  info('Scheduler: Background sync started (live=1min, upcoming/recent=30min)');
  audit(null, 'scheduler_started', { intervals: { live: '1min', upcoming: '30min', recent: '30min' } });
}
