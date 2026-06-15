-- ============================================================
-- TravelBeez · Insurance · trip_items.policy_issue_lease_at
-- ============================================================
-- Race-safe Auras order claim. issuePolicy reads metadata.order_id (jsonb), and
-- only calls addContract when it is undefined; it then persists order_id. Between
-- that read and the persist there is NO lock, so two concurrent confirm paths
-- (the Viva webhook + the success-URL action, both run confirmTrip's side-effects)
-- can each see "no order yet" and BOTH call addContract → a DUPLICATE Auras order.
--
-- This nullable timestamp is an atomic single-owner lease, claimed with ONE
-- conditional UPDATE BEFORE addContract (twin of Fix B's confirmation_email_sent_at):
--   UPDATE public.trip_items SET policy_issue_lease_at = now()
--   WHERE id = $1 AND item_type = 'insurance'
--     AND (policy_issue_lease_at IS NULL
--          OR policy_issue_lease_at < now() - interval '5 minutes')
--   RETURNING id;
-- Postgres serialises the concurrent claims via the row lock, so EXACTLY one
-- caller wins (1 row) and proceeds to addContract; the other gets 0 rows and
-- skips. The 5-minute expiry self-heals a lease left stranded by a crash mid-
-- addContract, so the resumable backstop (a failed policy retried on the next
-- confirm) is preserved — unlike a permanent claim.
--
-- Enum YOK → normal transaction güvenli. Run: SQL Editor → New query → Run.
-- ============================================================

ALTER TABLE public.trip_items
  ADD COLUMN IF NOT EXISTS policy_issue_lease_at timestamptz;

-- ============================================================
-- VERIFY (ayrı çalıştır):
--   select column_name, data_type, is_nullable
--   from information_schema.columns
--   where table_schema = 'public' and table_name = 'trip_items'
--     and column_name = 'policy_issue_lease_at';
-- ============================================================
