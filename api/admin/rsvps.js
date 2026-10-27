import { createClient } from '@supabase/supabase-js';

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-admin-password'
  );
}

export function verifyAuth(req) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;

  // The admin token is accepted ONLY from the Authorization header, the
  // x-admin-password header, or a POST body field — never from the URL
  // query string, where it would leak into browser history, server access
  // logs, and Referer headers.
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : authHeader.trim();
  const customHeader = (req.headers['x-admin-password'] || '').trim();
  const body = (req.body && typeof req.body === 'object') ? req.body : {};
  const bodyToken = String(body.password || body.token || '').trim();

  return token === adminPassword || customHeader === adminPassword || bodyToken === adminPassword;
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!verifyAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized: Invalid Admin Password' });
  }

  try {
    // ENV REQUIREMENT: SUPABASE_SERVICE_ROLE_KEY must be set on the server.
    // RLS on public.rsvps grants the anon key no access, so there is no
    // anon-key fallback — the service-role key is server-only and must
    // never be exposed to the browser (no VITE_ prefix).
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase credentials missing on server (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required).' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('rsvps')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Database query failed: ' + error.message });
    }

    const guestList = data || [];
    const total = guestList.length;
    const attendingCount = guestList.filter(r => r.attending).length;
    const notAttendingCount = guestList.filter(r => !r.attending).length;
    const beefCount = guestList.filter(r => r.attending && r.meal === 'beef').length;
    const chickenCount = guestList.filter(r => r.attending && r.meal === 'chicken').length;

    return res.status(200).json({
      summary: {
        total,
        attending: attendingCount,
        notAttending: notAttendingCount,
        beef: beefCount,
        chicken: chickenCount
      },
      rsvps: guestList
    });
  } catch (err) {
    console.error('Admin query error:', err);
    return res.status(500).json({ error: 'Internal server error: ' + (err.message || 'Unknown error') });
  }
}
