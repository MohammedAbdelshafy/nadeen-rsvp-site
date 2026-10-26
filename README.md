# Nadeen RSVP Site

A small event-invitation website with an RSVP form, attendance choice, meal selection and an optional message.

## Main files

- [index.html](index.html) — guest-facing invitation and RSVP form
- [script.js](script.js) — client-side form behavior
- [admin.html](admin.html) and [admin.js](admin.js) — event administration UI
- [api/](api/) and [supabase_schema.sql](supabase_schema.sql) — backing data integration
- [vercel.json](vercel.json) — deployment configuration

## Before reusing or publishing

The current page contains a specific event date, venue, names and RSVP deadline. Confirm those details, access permissions, form behavior and data retention before reusing it for another event. Guest names, phone numbers and meal choices are personal information; do not copy real RSVP records into source control.

This project is a standalone event site, separate from the MBM product portfolio.
