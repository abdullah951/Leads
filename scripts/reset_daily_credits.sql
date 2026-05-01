-- =============================================================================
-- reset_daily_credits.sql
--
-- PURPOSE:
--   Resets the daily credit allowance (20 credits) for free-plan users at
--   midnight in THEIR OWN local timezone, not server/UTC midnight.
--
-- HOW TO USE:
--   1. Run STEP 1 once to add the timezone column to the user table.
--   2. Run STEP 2 once to create the reset function.
--   3. Run STEP 3 once to schedule it with pg_cron (runs every hour).
--      pg_cron must be installed: https://github.com/citusdata/pg_cron
--      On most managed Postgres providers (Supabase, RDS, etc.) it is available.
--
--   If you do NOT have pg_cron, see STEP 4 for running the function manually
--   or scheduling it via an external cron (e.g., Linux crontab, GitHub Actions).
--
-- TIMEZONE FORMAT:
--   Values must be valid IANA timezone names, e.g. 'America/New_York',
--   'Europe/London', 'Asia/Karachi'. The default is 'UTC'.
--   Your frontend should capture the user's timezone at login/signup and
--   store it via the API (see note at the bottom of this file).
-- =============================================================================


-- =============================================================================
-- STEP 1 — Add timezone column to the user table (run once, safe to re-run)
-- =============================================================================

ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';

-- Optional: add a check constraint so only valid IANA names can be stored.
-- Postgres validates the value when it is used in AT TIME ZONE, not at insert.
-- You may want to validate on the application side before saving.

COMMENT ON COLUMN "user".timezone IS
  'IANA timezone name for the user, e.g. America/New_York. Used to reset daily credits at local midnight.';


-- =============================================================================
-- STEP 2 — Create (or replace) the reset function
--
-- Logic:
--   For every free-plan user whose CURRENT local time is between 00:00 and
--   00:59 (i.e., it just turned midnight in their timezone) AND whose credits
--   have NOT yet been reset today, set remaining = daily_limit and push
--   resets_at forward by 24 hours.
--
--   We identify "not yet reset today" by checking:
--     resets_at < NOW()   — the stored next-reset time is in the past,
--                           meaning the reset is overdue.
--
--   This function is designed to be called once per hour by pg_cron.
--   Running it more often is safe (it is idempotent within the same hour).
-- =============================================================================

CREATE OR REPLACE FUNCTION reset_free_plan_credits()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  -- How many rows were updated (for logging)
  updated_count INTEGER;
BEGIN

  -- Update user_credit rows where:
  --   1. The user has a free + active subscription
  --   2. The current time in the user's local timezone is between 00:00–00:59
  --      (midnight window — the job runs every hour so this window is enough)
  --   3. The stored resets_at is in the past (not yet reset for the new day)
  WITH eligible_users AS (
    SELECT
      uc.id            AS credit_id,
      uc.daily_limit,
      u.timezone
    FROM user_credit uc

    -- Join to get the user's timezone
    INNER JOIN "user" u
      ON u.id = uc.user_id

    -- Only free, active subscribers
    INNER JOIN user_subscription us
      ON us.user_id = uc.user_id
     AND us.plan    = 'free'
     AND us.status  = 'active'

    WHERE
      -- The reset time has already passed (credits are stale / overdue for reset)
      uc.resets_at < NOW()

      -- AND it is currently the midnight hour (00:xx) in the user's local timezone.
      -- This ensures we only reset exactly once per day, during the first hour
      -- after local midnight, even if the cron fires slightly late.
      AND EXTRACT(HOUR FROM (NOW() AT TIME ZONE u.timezone)) = 0
  )
  UPDATE user_credit
  SET
    -- Restore full daily allowance
    remaining  = eligible_users.daily_limit,
    -- Push resets_at to midnight of the NEXT day in the user's own timezone.
    -- We compute "today's midnight in user tz" then add 1 day.
    resets_at  = (
                   DATE_TRUNC('day', NOW() AT TIME ZONE eligible_users.timezone)
                   + INTERVAL '1 day'
                 ) AT TIME ZONE eligible_users.timezone,
    updated_at = NOW()
  FROM eligible_users
  WHERE user_credit.id = eligible_users.credit_id;

  -- Capture how many rows changed for the log
  GET DIAGNOSTICS updated_count = ROW_COUNT;

  -- Log the result so you can check cron_job_run_details in pg_cron
  RAISE NOTICE 'reset_free_plan_credits: reset credits for % user(s) at %',
    updated_count, NOW();

END;
$$;

COMMENT ON FUNCTION reset_free_plan_credits() IS
  'Resets daily credits to the daily_limit for free-plan users whose local midnight has passed. Designed to be called every minute by pg_cron so credits reset within 1 minute of local midnight.';


-- =============================================================================
-- STEP 3 — Schedule the function with pg_cron (run once)
--
-- This schedules reset_free_plan_credits() to run every minute.
-- Running every minute ensures users get their credits reset within 1 minute
-- of their local midnight, rather than waiting up to 59 minutes.
-- The function is idempotent — it resets each user at most once per day.
--
-- pg_cron uses UTC cron syntax: '* * * * *' = every minute.
--
-- If the job already exists, the DO block unschedules it first (safe re-run).
-- =============================================================================

DO $$
BEGIN
  -- Only schedule if pg_cron extension is present
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Unschedule any existing version of this job first (safe re-run)
    PERFORM cron.unschedule('reset_daily_credits');

    -- Schedule: run every minute so credits reset within 1 minute of local midnight
    PERFORM cron.schedule(
      'reset_daily_credits',           -- job name (unique identifier)
      '* * * * *',                     -- cron expression: every minute
      'SELECT reset_free_plan_credits()' -- SQL to execute
    );

    RAISE NOTICE 'pg_cron job "reset_daily_credits" scheduled successfully.';
  ELSE
    RAISE NOTICE 'pg_cron is not installed. Run reset_free_plan_credits() manually or via an external cron. See STEP 4 below.';
  END IF;
END;
$$;


-- =============================================================================
-- STEP 4 — Without pg_cron: external cron alternative
--
-- If your Postgres host does not support pg_cron, call the function from
-- an external scheduler instead. Examples:
--
-- Linux crontab (runs every minute):
--   * * * * * psql "$DATABASE_URL" -c "SELECT reset_free_plan_credits();"
--
-- GitHub Actions (.github/workflows/reset-credits.yml):
--   on:
--     schedule:
--       - cron: '* * * * *'   # every minute
--   jobs:
--     reset:
--       runs-on: ubuntu-latest
--       steps:
--         - run: psql "${{ secrets.DATABASE_URL }}" -c "SELECT reset_free_plan_credits();"
--
-- Node.js script (node-cron):
--   cron.schedule('0 * * * *', async () => {
--     await db.execute(sql`SELECT reset_free_plan_credits()`);
--   });
-- =============================================================================


-- =============================================================================
-- STEP 5 — (Optional) Backfill: reset overdue credits RIGHT NOW
--
-- If some users already have stale credits (resets_at in the past but still 0),
-- this one-off UPDATE resets them immediately regardless of their local time.
-- Run this once after deploying the column + function to clear any backlog.
-- =============================================================================

UPDATE user_credit uc
SET
  remaining  = uc.daily_limit,
  resets_at  = (
                 DATE_TRUNC('day', NOW() AT TIME ZONE u.timezone)
                 + INTERVAL '1 day'
               ) AT TIME ZONE u.timezone,
  updated_at = NOW()
FROM "user" u
INNER JOIN user_subscription us
  ON us.user_id = u.id
 AND us.plan    = 'free'
 AND us.status  = 'active'
WHERE uc.user_id = u.id
  AND uc.resets_at < NOW()   -- overdue for reset
  AND uc.remaining < uc.daily_limit; -- not yet reset (still depleted)


-- =============================================================================
-- FRONTEND NOTE — Capturing the user's timezone
--
-- On the browser, get the user's IANA timezone name with:
--   Intl.DateTimeFormat().resolvedOptions().timeZone
--   // e.g. "America/New_York"
--
-- Send it to a PATCH /api/auth/timezone (or include it in the signup payload)
-- and store it in the user.timezone column.
--
-- Minimal API handler example (Next.js App Router):
--
--   export async function PATCH(request: Request) {
--     const auth = await requireAuth();
--     if (auth instanceof NextResponse) return auth;
--     const { timezone } = await request.json();
--     // Basic validation — Intl will throw if the timezone is invalid
--     try { Intl.DateTimeFormat(undefined, { timeZone: timezone }); }
--     catch { return NextResponse.json({ message: 'Invalid timezone' }, { status: 400 }); }
--     await db.update(userSchema)
--       .set({ timezone })
--       .where(eq(userSchema.id, auth.userId));
--     return NextResponse.json({ ok: true });
--   }
-- =============================================================================
