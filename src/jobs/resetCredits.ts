/**
 * resetCredits.ts
 *
 * Schedules the daily credit reset job using node-cron.
 * Runs inside the Next.js Node.js runtime via the instrumentation hook.
 *
 * Schedule: top of every hour (0 * * * *)
 * What it does: calls reset_free_plan_credits() in Postgres, which resets
 * credits to 20 for any free-plan user whose local midnight has passed.
 */

import cron from 'node-cron';
import { sql } from 'drizzle-orm';
import { db } from '@/libs/DB';

/**
 * Starts the hourly credit reset cron job.
 * Should be called once at server startup (from instrumentation.ts).
 */
export function startCreditResetJob() {
  // Run every minute — '* * * * *'
  // We check every minute so that users get their credits reset within 1 minute
  // of their local midnight, rather than waiting up to 59 minutes for the next
  // top-of-hour fire. The SQL function is idempotent: it only resets a user once
  // per day (guarded by resets_at < NOW()), so running frequently is safe.
  cron.schedule('* * * * *', async () => {
    try {
      // Call the Postgres function we created in reset_daily_credits.sql.
      // It resets credits for free-plan users whose local midnight has passed.
      await db.execute(sql`SELECT reset_free_plan_credits()`);
      console.log('[credit-reset] ran at', new Date().toISOString());
    } catch (err) {
      // Log the error but don't crash the server
      console.error('[credit-reset] failed:', err);
    }
  });

  console.log('[credit-reset] job scheduled — runs every hour');
}
