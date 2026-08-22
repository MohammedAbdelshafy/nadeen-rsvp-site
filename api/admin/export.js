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

// Escape cell values according to RFC 4180 CSV standard
export function escapeCSV(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export function generateCSV(data) {
  // Required columns: Name, Phone, Attending, Meal, Dietary Restrictions, Message, Timestamp
  const headers = ['Name', 'Phone', 'Attending', 'Meal', 'Dietary Restrictions', 'Message', 'Timestamp'];
  const rows = data.map(r => [
    escapeCSV(r.name),
    escapeCSV(r.phone),
    escapeCSV(r.attending ? 'Yes' : 'No'),
    escapeCSV(r.attending ? (r.meal || 'N/A') : 'N/A'),
    escapeCSV(r.dietary || 'None'),
    escapeCSV(r.message || ''),
    escapeCSV(r.created_at ? new Date(r.created_at).toISOString() : '')
  ]);

  // Include UTF-8 Byte Order Mark (BOM) so Excel opens Arabic and special characters cleanly
  const bom = '\uFEFF';
  return bom + [headers.join(','), ...rows.map(row => row.join(','))].join('\r\n');
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
    const csvContent = generateCSV(guestList);
    const action = (req.query && req.query.action) || (req.body && req.body.action) || 'download';

    const total = guestList.length;
    const attendingCount = guestList.filter(r => r.attending).length;
    const notAttendingCount = guestList.filter(r => !r.attending).length;
    const beefCount = guestList.filter(r => r.attending && r.meal === 'beef').length;
    const chickenCount = guestList.filter(r => r.attending && r.meal === 'chicken').length;

    // Action 1: Send directly to Telegram
    if (action === 'telegram') {
      const tgToken = process.env.TELEGRAM_BOT_TOKEN;
      const tgChatId = process.env.TELEGRAM_CHAT_ID;

      if (!tgToken || !tgChatId) {
        return res.status(400).json({
          error: 'Telegram credentials (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID) are not configured on the server.',
          status: 'UNCONFIGURED_TELEGRAM'
        });
      }

      const summaryText = `📊 *Nadeen & Omar RSVP Export Summary*\n\n` +
        `📅 *Export Timestamp:* ${new Date().toUTCString()}\n\n` +
        `👥 *Total Responses:* ${total}\n` +
        `✅ *Attending:* ${attendingCount}\n` +
        `❌ *Not Attending:* ${notAttendingCount}\n` +
        `🥩 *Beef Plates:* ${beefCount}\n` +
        `🍗 *Chicken Plates:* ${chickenCount}\n\n` +
        `📎 Attached is the full guest CSV export.`;

      const formData = new FormData();
      formData.append('chat_id', tgChatId);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      formData.append('document', blob, `nadeen_rsvps_${new Date().toISOString().slice(0, 10)}.csv`);
      formData.append('caption', summaryText);
      formData.append('parse_mode', 'Markdown');

      const tgResponse = await fetch(`https://api.telegram.org/bot${tgToken}/sendDocument`, {
        method: 'POST',
        body: formData
      });

      const tgResult = await tgResponse.json();

      if (!tgResult.ok) {
        return res.status(500).json({
          error: `Telegram API error: ${tgResult.description || 'Unknown failure'}`
        });
      }

      return res.status(200).json({
        success: true,
        message: 'RSVP CSV export and summary report successfully delivered to Telegram!',
        summary: {
          total,
          attending: attendingCount,
          notAttending: notAttendingCount,
          beef: beefCount,
          chicken: chickenCount
        }
      });
    }

    // Action 2: Direct browser CSV download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="nadeen_rsvps_${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.status(200).send(csvContent);

  } catch (err) {
    console.error('Export error:', err);
    return res.status(500).json({ error: 'Export failed: ' + (err.message || 'Unknown error') });
  }
}
