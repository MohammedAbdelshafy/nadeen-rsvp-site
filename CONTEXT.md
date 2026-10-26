---
type: repository
status: active
owner_repo: MohammedAbdelshafy/nadeen-rsvp-site
product_name: Nadeen RSVP Website
source_of_truth: https://github.com/MohammedAbdelshafy/nadeen-rsvp-site
---

# Nadeen RSVP Website CONTEXT

One job: let invited guests submit their response and allow authorized organizers to manage responses.

## Inputs
- Public page: [index.html](index.html)
- Client logic: [script.js](script.js)
- Admin interface: [admin.html](admin.html), [admin.js](admin.js)
- API routes: [api](api/)
- Schema: [supabase_schema.sql](supabase_schema.sql)

## Process
1. Review the guest-facing page and RSVP form.
2. Validate input at the client and server boundaries.
3. Check database access rules and admin authorization.
4. Test create/update behavior with fictional guests.
5. Confirm no guest records or credentials appear in source control.

## Output
A working RSVP page and an access-controlled admin workflow, if the deployment and policies are configured correctly.

## Check
Test form validation, duplicate submissions, unauthorized admin/API access and database policy behavior. Do not treat a hidden admin button as access control.
