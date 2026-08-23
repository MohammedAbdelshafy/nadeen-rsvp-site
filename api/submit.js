import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

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

// Clean and normalize phone numbers (digits and leading + only)
export function normalizePhone(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let cleaned = raw.trim();
  const hasLeadingPlus = cleaned.startsWith('+');
  const digitsOnly = cleaned.replace(/\D/g, '');
  if (!digitsOnly) return '';
  return hasLeadingPlus ? `+${digitsOnly}` : digitsOnly;
}

// Sanitize text strings to remove potential HTML tags, scripts, and control characters
export function sanitizeString(val, maxLength = 255) {
  if (val === null || val === undefined) return '';
  if (typeof val !== 'string') return String(val).slice(0, maxLength);
  return val
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim()
    .slice(0, maxLength);
}

// Optional helper to notify Telegram on each submission
async function notifyTelegram(rsvp) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const attendingText = rsvp.attending ? '✅ YES, Attending' : '❌ NOT Attending';
  const mealText = rsvp.attending ? (rsvp.meal ? rsvp.meal.toUpperCase() : 'Not specified') : 'N/A';
  const dietaryText = rsvp.attending ? (rsvp.dietary || 'None') : 'N/A';
  const messageText = rsvp.message || 'None';

  const text = `💌 *New RSVP Submitted!*\n\n` +
    `👤 *Name:* ${rsvp.name}\n` +
    `📱 *WhatsApp:* \`${rsvp.phone}\`\n` +
    `✨ *Attending:* ${attendingText}\n` +
    `🍽️ *Meal Choice:* ${mealText}\n` +
    `🥗 *Dietary:* ${dietaryText}\n` +
    `💬 *Message:* ${messageText}\n` +
    `⏰ *Time:* ${new Date().toLocaleString()}\n\n` +
    `🔗 *Guest Link:* [nadeen-rsvp-site.vercel.app](https://nadeen-rsvp-site.vercel.app/)`;

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

// Optional helper to notify the bride via email
async function notifyBrideEmail(rsvp) {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  
  if (!user || !pass) {
    console.warn('Email notification skipped: SMTP_USER or SMTP_PASS missing');
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });

  const guestName = rsvp.name || 'Unknown';
  const attendingText = rsvp.attending ? 'Attending' : 'Not attending';
  const mealText = rsvp.attending ? (rsvp.meal || 'N/A') : 'N/A';
  const dietaryText = rsvp.attending ? (rsvp.dietary || 'N/A') : 'N/A';
  const messageText = rsvp.message || 'None';
  const timestamp = new Date().toLocaleString();

  const textBody = `Nadeen has received a new RSVP.

Guest:
${guestName}

WhatsApp:
${rsvp.phone || 'N/A'}

Attendance:
${attendingText}

Meal:
${mealText}

Dietary restrictions:
${dietaryText}

Message:
${messageText}

Submitted:
${timestamp}

RSVP website:
https://mohammedabdelshafy.github.io/nadeen-rsvp-site/`;

  try {
    await transporter.sendMail({
      from: `"Nadeen RSVP" <${user}>`,
      to: 'Nadeenabdelshafyy@gmail.com',
      subject: `🌸 New Nadeen RSVP — ${guestName}`,
      text: textBody
    });
    console.log('Bride email notification sent successfully.');
  } catch (err) {
    console.error('Email notification error:', err);
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
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Malformed request: JSON body required.' });
    }

    const { fullName, name, whatsapp, phone, attending, plate, meal, dietary, message } = req.body;

    // 1. Name Validation
    const rawName = name !== undefined ? name : fullName;
    const guestName = sanitizeString(rawName, 100);
    if (!guestName || guestName.length < 2) {
      return res.status(400).json({ error: 'Please enter a valid full name (2–100 characters).' });
    }

    // 2. Phone Validation & Normalization
    const rawPhone = phone !== undefined ? phone : whatsapp;
    const guestPhone = normalizePhone(rawPhone);
    const digitsCount = guestPhone.replace(/\D/g, '').length;
    if (!guestPhone || digitsCount < 8 || digitsCount > 20) {
      return res.status(400).json({ error: 'Please enter a valid WhatsApp or phone number (8–20 digits).' });
    }

    // 3. Attendance Validation
    let isAttending = false;
    if (typeof attending === 'boolean') {
      isAttending = attending;
    } else if (typeof attending === 'string') {
      const lowerAttending = attending.toLowerCase().trim();
      if (lowerAttending === 'yes' || lowerAttending === 'true' || lowerAttending === 'attending') {
        isAttending = true;
      } else if (lowerAttending === 'no' || lowerAttending === 'false' || lowerAttending === 'declined') {
        isAttending = false;
      } else {
        return res.status(400).json({ error: 'Invalid attendance value. Please choose Yes or No.' });
      }
    } else {
      return res.status(400).json({ error: 'Please indicate whether you will be attending.' });
    }

    // 4. Meal Validation (Required if attending)
    let guestMeal = null;
    if (isAttending) {
      const rawMeal = String(meal || plate || '').toLowerCase().trim();
      if (!rawMeal) {
        return res.status(400).json({ error: 'Please choose your plate (Beef or Chicken).' });
      }
      if (rawMeal !== 'beef' && rawMeal !== 'chicken') {
        return res.status(400).json({ error: 'Invalid meal choice. Please select either Beef or Chicken.' });
      }
      guestMeal = rawMeal;
    }

    // 5. Optional fields with length limits
    const guestDietary = isAttending ? sanitizeString(dietary, 250) : null;
    const guestMessage = sanitizeString(message, 500);

    // 6. Supabase Persistence
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        error: 'Backend configuration error: Supabase credentials are not configured on the server.'
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

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
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Database error: ' + error.message });
    }

    // Await Telegram notification so serverless function doesn't terminate before it finishes
    await notifyTelegram(payload);
    await notifyBrideEmail(payload);

    return res.status(200).json({
      success: true,
      message: 'RSVP recorded successfully!',
      data: data
    });
  } catch (err) {
    console.error('Submission error:', err);
    return res.status(500).json({ error: 'Internal server error: ' + (err.message || 'Unknown error') });
  }
}
