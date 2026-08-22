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

-- Allow public insert access so direct client or backend can record RSVPs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'rsvps' AND policyname = 'Enable insert for all users'
    ) THEN
        CREATE POLICY "Enable insert for all users" ON public.rsvps
            FOR INSERT WITH CHECK (true);
    END IF;
END
$$;

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
