import { createClient } from '@supabase/supabase-js';

// Helper to set CORS headers
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
}

// Clean and normalize phone numbers
function normalizePhone(raw) {
  if (!raw) return '';
  const digits = raw.replace(/[^\d+]/g, '').trim();
  return digits;
}

// Optional helper to notify Telegram on each submission
async function notifyTelegram(rsvp) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const attendingText = rsvp.attending ? '✅ YES, Attending' : '❌ NOT Attending';
  const mealText = rsvp.attending ? (rsvp.meal ? rsvp.meal.toUpperCase() : 'Not specified') : 'N/A';
  const dietaryText = rsvp.dietary ? rsvp.dietary : 'None';
  const messageText = rsvp.message ? rsvp.message : 'None';

  const text = `💌 *New RSVP Submitted!*\n\n` +
    `👤 *Name:* ${rsvp.name}\n` +
    `📱 *WhatsApp:* \`${rsvp.phone}\`\n` +
    `✨ *Attending:* ${attendingText}\n` +
    `🍽️ *Meal Choice:* ${mealText}\n` +
    `🥗 *Dietary:* ${dietaryText}\n` +
    `💬 *Message:* ${messageText}\n` +
    `⏰ *Time:* ${new Date().toLocaleString()}`;

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      })
    });
  } catch (err) {
    console.error('Telegram notification error:', err);
  }
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { fullName, name, whatsapp, phone, attending, plate, meal, dietary, message } = req.body || {};

    const guestName = (name || fullName || '').trim();
    const guestPhone = normalizePhone(phone || whatsapp);
    const isAttending = attending === true || attending === 'yes' || attending === 'true';
    const guestMeal = isAttending ? (meal || plate || 'beef').toLowerCase() : null;
    const guestDietary = (dietary || '').trim();
    const guestMessage = (message || '').trim();

    if (!guestName || guestName.length < 2) {
      return res.status(400).json({ error: 'Please enter a valid full name.' });
    }

    if (!guestPhone || guestPhone.length < 8) {
      return res.status(400).json({ error: 'Please enter a valid WhatsApp or phone number.' });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        error: 'Backend configuration error: Supabase credentials are missing on the server.'
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Upsert on phone so duplicate submissions update the guest response instead of failing
    const payload = {
      name: guestName,
      phone: guestPhone,
      attending: isAttending,
      meal: guestMeal,
      dietary: guestDietary,
      message: guestMessage
    };

    const { data, error } = await supabase
      .from('rsvps')
      .upsert(payload, { onConflict: 'phone' })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Failed to record RSVP: ' + error.message });
    }

    // Trigger Telegram notification in background
    notifyTelegram(payload).catch(console.error);

    return res.status(200).json({
      success: true,
      message: 'RSVP recorded successfully!',
      data: data
    });
  } catch (err) {
    console.error('Submission error:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
}
