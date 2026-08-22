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

  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : authHeader.trim();
  const customHeader = (req.headers['x-admin-password'] || '').trim();
  const queryToken = (req.query && req.query.token ? String(req.query.token) : '').trim();

  return token === adminPassword || customHeader === adminPassword || queryToken === adminPassword;
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
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase credentials missing on server.' });
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
