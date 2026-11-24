# Maya Dental — Clinic Desk (prototype)

Clickable prototype of a front-desk panel for **Maya Dental Clinic** (South and West Edmonton), modelled on
[mayadentalclinic.com](https://mayadentalclinic.com). Built as a slice of the BusinessOS dashboard: same
components, tokens, `apiFetch` and i18n, mock data behind the API contract.

**Demo:** https://s1erra-xray.github.io/maya-dental-demo/ · **Contract for the backend:** [HANDOFF.md](HANDOFF.md)

## Screens

- **Schedule** — day view across both locations: filters by location and provider, day summary
  (booked, confirmed, arrived, emergencies, booked value), Confirm → Check in → Complete, no-show,
  cancel with a reason, create / reschedule with server checks for opening hours and double-booking.
- **Booking requests** — inbox of requests from the website form, phone and Google Business; emergencies
  first; mark contacted, book (creates the patient when new), decline with a reason.
- **Patients** — search by name, chart number, phone or email; filters by location and coverage
  (self-pay, private insurance with direct billing, CDCP); patient card with upcoming visits and history.
- **Fee guide** — procedure codes, durations, fees, CDCP eligibility; deleting a used service is refused
  (409), deactivate instead.

## Assumptions

- Locations, opening hours, service lines, CDCP / direct billing and Tagalog-speaking staff come from the
  public site. People, patients, requests and fees are **fictional**; fees are illustrative, not the actual
  Alberta Dental Fee Guide.
- The schedule is generated relative to today, so the demo always has a live day. Edits are kept in the
  browser (localStorage) until the next calendar day or "Reset demo data".
- Times render in the browser's time zone; the real backend evaluates hours in `America/Edmonton`.
- Out of scope: clinical charting, X-rays, insurance pre-estimates, payments, reminders, sign-in.

## Run locally

```bash
npm install
npm run dev
```
