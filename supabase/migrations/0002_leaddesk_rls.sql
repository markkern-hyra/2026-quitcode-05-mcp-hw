-- LeadDesk: close public.leads to the Supabase Data API roles.
--
-- The LeadDesk app keeps its data in process memory and never reads this table through the Data API,
-- so anon and authenticated need no rights on it at all. RLS stays on as a second lock: with no policy
-- for them, a later GRANT alone does not reopen the table.
-- The policy names the agent's read-only MCP role (Supabase MCP URL with read_only=true, the A/B "client"
-- profile) as the one reader. That role has BYPASSRLS, so it reads the table even without the policy: the
-- policy states who may read, it does not grant the access. (Comment corrected after the migration was
-- applied; the statements below are unchanged.)

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.leads FROM anon, authenticated;

CREATE POLICY "read-only MCP role reads leads" ON public.leads
  FOR SELECT
  TO supabase_read_only_user
  USING (true);
