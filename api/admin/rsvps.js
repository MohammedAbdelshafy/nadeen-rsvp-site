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

function verifyAuth(req) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;

  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
  const customHeader = req.headers['x-admin-password'];

  return token === adminPassword || customHeader === adminPassword;
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
      return res.status(500).json({ error: error.message });
    }

    const total = data.length;
    const attendingCount = data.filter(r => r.attending).length;
    const notAttendingCount = data.filter(r => !r.attending).length;
    const beefCount = data.filter(r => r.attending && r.meal === 'beef').length;
    const chickenCount = data.filter(r => r.attending && r.meal === 'chicken').length;

    return res.status(200).json({
      summary: {
        total,
        attending: attendingCount,
        notAttending: notAttendingCount,
        beef: beefCount,
        chicken: chickenCount
      },
      rsvps: data
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
