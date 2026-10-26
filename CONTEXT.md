---
type: repository
status: active
owner_repo: MohammedAbdelshafy/nadeen-rsvp-site
product_name: Nadeen RSVP Site
source_of_truth: https://github.com/MohammedAbdelshafy/nadeen-rsvp-site
---

# Nadeen RSVP Site CONTEXT

One job: let invited guests respond to an event invitation and capture the details needed by the host.

## Inputs
- Guest page: [index.html](index.html)
- Form behavior: [script.js](script.js)
- Admin page: [admin.html](admin.html)
- Data integration: [api](api/) and [supabase_schema.sql](supabase_schema.sql)

## Process
1. Confirm the current date, place, RSVP deadline and guest-facing wording.
2. Collect only the information needed for the event.
3. Validate attendance, selected meal and optional notes.
4. Protect the admin functions and RSVP data from public access.
5. Follow the event's data retention and deletion needs.

## Output
An RSVP record and the information the host needs to plan the event.

## Check
Test submission, validation, duplicate handling, admin authorization and data storage before publishing. Do not reuse stale event details or place guest records in Git.
