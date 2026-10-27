-- ==============================================================================
-- Nadeen & Omar Soiree - RSVP Database Schema for Supabase
-- ==============================================================================
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/prgmwljhbjtcjmwnjaao
-- 2. Go to the "SQL Editor" in the left sidebar.
-- 3. Click "New query", paste this entire script, and click "Run".
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.rsvps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    attending BOOLEAN NOT NULL DEFAULT true,
    meal TEXT,
    dietary TEXT,
    message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for phone lookups and deduplication
CREATE INDEX IF NOT EXISTS idx_rsvps_phone ON public.rsvps(phone);

-- Index for attending filter
CREATE INDEX IF NOT EXISTS idx_rsvps_attending ON public.rsvps(attending);

-- Enable Row Level Security (RLS)
ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;

-- NO public/anon access to this table.
-- RSVP submissions must flow through the validating serverless API
-- (api/submit.js), which writes with the service-role key (see the policy
-- below). Anonymous clients must NOT be able to INSERT directly through
-- PostgREST — a permissive insert policy would bypass all of the API's
-- validation/sanitization. With RLS enabled and no anon policies, direct
-- anon access is denied by default.
-- Drop the old permissive policy if a previous version of this script
-- created it, so re-running this script closes the hole on live databases.
DROP POLICY IF EXISTS "Enable insert for all users" ON public.rsvps;

-- Allow service role full access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'rsvps' AND policyname = 'Enable full access for service role'
    ) THEN
        CREATE POLICY "Enable full access for service role" ON public.rsvps
            USING (auth.role() = 'service_role')
            WITH CHECK (auth.role() = 'service_role');
    END IF;
END
$$;

-- Trigger to auto-update updated_at on record changes
CREATE OR REPLACE FUNCTION update_rsvps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_rsvps_updated_at ON public.rsvps;
CREATE TRIGGER trigger_rsvps_updated_at
    BEFORE UPDATE ON public.rsvps
    FOR EACH ROW
    EXECUTE FUNCTION update_rsvps_updated_at();
