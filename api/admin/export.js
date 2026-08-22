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
  const queryToken = req.query ? req.query.token : null;

  return token === adminPassword || customHeader === adminPassword || queryToken === adminPassword;
}

// Escape cell values for CSV formatting
function escapeCSV(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

function generateCSV(data) {
  const headers = ['ID', 'Full Name', 'WhatsApp / Phone', 'Attending', 'Meal Choice', 'Dietary Restrictions', 'Message to Bride', 'Submitted At'];
  const rows = data.map(r => [
    escapeCSV(r.id),
    escapeCSV(r.name),
    escapeCSV(r.phone),
    escapeCSV(r.attending ? 'Yes' : 'No'),
    escapeCSV(r.meal || 'N/A'),
    escapeCSV(r.dietary || 'None'),
    escapeCSV(r.message || ''),
    escapeCSV(r.created_at ? new Date(r.created_at).toLocaleString() : '')
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\r\n');
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

    const csvContent = generateCSV(data);
    const action = (req.query && req.query.action) || (req.body && req.body.action) || 'download';

    const total = data.length;
    const attendingCount = data.filter(r => r.attending).length;
    const notAttendingCount = data.filter(r => !r.attending).length;
    const beefCount = data.filter(r => r.attending && r.meal === 'beef').length;
    const chickenCount = data.filter(r => r.attending && r.meal === 'chicken').length;

    // Action 1: Send directly to Telegram
    if (action === 'telegram') {
      const tgToken = process.env.TELEGRAM_BOT_TOKEN;
      const tgChatId = process.env.TELEGRAM_CHAT_ID;

      if (!tgToken || !tgChatId) {
        return res.status(400).json({
          error: 'Telegram credentials (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID) are not configured on the server.'
        });
      }

      const caption = `📊 *Nadeen & Omar RSVP Export*\n` +
        `📅 *Export Date:* ${new Date().toLocaleString()}\n\n` +
        `👥 *Total Responses:* ${total}\n` +
        `✅ *Attending:* ${attendingCount}\n` +
        `❌ *Not Attending:* ${notAttendingCount}\n` +
        `🥩 *Beef Plates:* ${beefCount}\n` +
        `🍗 *Chicken Plates:* ${chickenCount}\n\n` +
        `📎 Attached is the full guest CSV report.`;

      const formData = new FormData();
      formData.append('chat_id', tgChatId);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      formData.append('document', blob, `nadeen_rsvp_export_${Date.now()}.csv`);
      formData.append('caption', caption);
      formData.append('parse_mode', 'Markdown');

      const tgResponse = await fetch(`https://api.telegram.org/bot${tgToken}/sendDocument`, {
        method: 'POST',
        body: formData
      });

      const tgResult = await tgResponse.json();

      if (!tgResult.ok) {
        return res.status(500).json({
          error: `Telegram delivery failed: ${tgResult.description || 'Unknown error'}`
        });
      }

      return res.status(200).json({
        success: true,
        message: 'RSVP CSV export and summary report successfully sent to Telegram!',
        telegramResult: tgResult
      });
    }

    // Action 2: Direct browser CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="nadeen_rsvps_${new Date().toISOString().slice(0,10)}.csv"`);
    return res.status(200).send(csvContent);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
