# Nadeen RSVP Website

A small event website with a guest-facing RSVP page, supporting assets and an admin view.

## Where things live

- `index.html`, `script.js`, `style.css`: public event page.
- `admin.html`, `admin.js`: admin interface.
- `api/`: server-side routes.
- `supabase_schema.sql`: database schema.
- `vercel.json`: deployment configuration.

## Before changing or deploying

- Check the current data flow and database policies before changing guest records.
- Keep admin routes behind authentication and verify authorization on the server, not only in the browser.
- Do not commit service-role keys, private guest details or admin credentials.
- Test an RSVP and admin workflow with fictional data before using it for a real event.

This repository is a standalone event website, not part of the MBM product code. The technical slug remains `nadeen-rsvp-site`.
