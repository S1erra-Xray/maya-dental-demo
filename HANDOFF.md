# Handoff: Maya Dental — Clinic Desk

The contract this prototype commits to. Backend development implements it, dashboard development
ports the screens. Keep it in sync with `src/api`, `src/mocks` and `src/pages`: the import into
BusinessOSTemplate reads this file, not your memory.

| | |
|---|---|
| Prototype | `maya-dental-demo` · https://github.com/S1erra-Xray/maya-dental-demo |
| Demo | https://s1erra-xray.github.io/maya-dental-demo/ |
| Built against web | see `.prototype-kit/source.json` (`webCommit`) |
| Status | draft <!-- draft → ready-for-import → imported (wave-N) --> |

## Summary

Front-desk panel for a two-location dental clinic (Maya Dental, South and West Edmonton), modelled on
mayadentalclinic.com: the day schedule per location and provider, the inbox of booking requests that
come from the website form / phone / Google Business, patient records with coverage (self-pay, private
insurance with direct billing, Canadian Dental Care Plan) and the clinic fee guide (procedure codes,
durations, fees, CDCP eligibility).

## Backend modules

| Module | New / existing | Route prefix | Notes |
|---|---|---|---|
| Clinic | new | `/api/v1/clinic` | locations, providers, services (fee guide), patients, appointments, booking requests |

## Entities

Audit fields (`createdAtUtc`, `updatedAtUtc`) come from the framework. All money is CAD, `decimal(10,2)`.
Times are stored UTC; the clinic day is evaluated in the location's `timeZone` (`America/Edmonton`).

### Location (reference data, seeded)

| Field | Type | Required | Constraints |
|---|---|---|---|
| id | uuid | yes | |
| name | string | yes | max 64, unique |
| address | string | yes | max 256 |
| timeZone | string | yes | IANA id |
| hours | `OpeningHoursDto[]` | yes | one per open weekday: `dayOfWeek` int 0–6 (0 = Sunday), `opensAt`/`closesAt` `HH:mm` |

### Provider (reference data; managed later via Identity users)

| Field | Type | Required | Constraints |
|---|---|---|---|
| id | uuid | yes | |
| displayName | string | yes | max 128 |
| role | `ProviderRole` | yes | |
| locationIds | uuid[] | yes | ≥ 1 |
| isActive | bool | yes | |

### Service (fee guide entry)

| Field | Type | Required | Constraints |
|---|---|---|---|
| id | uuid | yes | server-generated |
| code | string | yes | max 10, unique among services, `[A-Z0-9]+` |
| name | string | yes | max 128 |
| category | `ServiceCategory` | yes | |
| durationMinutes | int | yes | 5–240, multiple of 5 |
| fee | decimal | yes | ≥ 0 (0 = free consult) |
| cdcpEligible | bool | yes | default false |
| isActive | bool | yes | default true; inactive services can't be booked |

### Patient

| Field | Type | Required | Constraints |
|---|---|---|---|
| id | uuid | yes | server-generated |
| chartNumber | string | yes | server-generated `MD-#####`, read-only |
| firstName / lastName | string | yes | max 64 each |
| dateOfBirth | date (`YYYY-MM-DD`) | yes | not in the future |
| phone | string | yes | max 32 |
| email | string | no | max 256, email |
| preferredLocationId | uuid | yes | existing location |
| preferredLanguage | `PreferredLanguage` | yes | default `English` |
| coverage | `CoverageType` | yes | default `SelfPay` |
| insurerName | string | when `coverage = PrivateInsurance` | max 128 |
| directBilling | bool | yes | only meaningful for `PrivateInsurance`; false otherwise |
| notes | string | no | max 2000 (front-desk notes, not clinical) |
| lastVisitAtUtc | date-time | no | computed: last `Completed` appointment |
| nextAppointmentAtUtc | date-time | no | computed: next `Scheduled`/`Confirmed` appointment |

### Appointment

| Field | Type | Required | Constraints |
|---|---|---|---|
| id | uuid | yes | |
| patientId | uuid | yes | existing patient |
| patientName | string | yes | denormalized, read-only |
| locationId | uuid | yes | provider must work at the location |
| providerId / providerName | uuid / string | yes | active provider |
| serviceId / serviceName / serviceCode | uuid / string / string | yes | active service |
| startsAtUtc | date-time | yes | inside the location's opening hours (start and end) |
| durationMinutes | int | yes | 5–240; defaults to the service duration |
| status | `AppointmentStatus` | yes | `Scheduled` on create |
| isEmergency | bool | yes | default false |
| notes | string | no | max 1000 |
| cancellationReason | string | no | set on `Cancelled` |

Rules: a provider can't have two overlapping active appointments (statuses other than `Cancelled`/`NoShow`).
Status transitions: `Scheduled → Confirmed | Cancelled`, `Confirmed → CheckedIn | Cancelled | NoShow`,
`Scheduled → NoShow`, `CheckedIn → Completed`. `Completed`, `Cancelled`, `NoShow` are final. Only
`Scheduled`/`Confirmed` can be edited (rescheduled).

### BookingRequest

| Field | Type | Required | Constraints |
|---|---|---|---|
| id | uuid | yes | |
| number | string | yes | server-generated `BR-####` |
| fullName | string | yes | max 128 |
| phone | string | yes | max 32 |
| email | string | no | max 256 |
| preferredLocationId | uuid | yes | |
| reason | string | yes | max 1000 (free text from the form) |
| serviceCategory | `ServiceCategory` | no | what the visitor picked on the form |
| preferredTimes | string | no | max 256 |
| isNewPatient | bool | yes | |
| isEmergency | bool | yes | |
| coverage | `CoverageType` | yes | |
| source | `BookingSource` | yes | |
| status | `BookingRequestStatus` | yes | `New` on create |
| patientId / appointmentId | uuid | no | set by `book` |
| declineReason | string | no | set by `decline` |

Enums (string-serialized):
`ProviderRole` = `Dentist` · `Hygienist`;
`ServiceCategory` = `Preventive` · `Restorative` · `Cosmetic` · `Orthodontics` · `Periodontics` · `Endodontics` · `OralSurgery` · `Prosthodontics` · `Emergency`;
`CoverageType` = `SelfPay` · `PrivateInsurance` · `Cdcp`;
`PreferredLanguage` = `English` · `Tagalog` · `Other`;
`AppointmentStatus` = `Scheduled` · `Confirmed` · `CheckedIn` · `Completed` · `NoShow` · `Cancelled`;
`BookingRequestStatus` = `New` · `Contacted` · `Booked` · `Declined`;
`BookingSource` = `Website` · `Phone` · `GoogleBusiness`.

## Endpoints

Lists return `PagedResponse<T>` unless noted; commands return the id (`string`); deletes return 204;
errors are ProblemDetails (validation: 400 with field-keyed `errors`).

| Method | Path | Request | Response | Errors | Permission | Screen |
|---|---|---|---|---|---|---|
| GET | `/api/v1/clinic/locations` | — | `LocationDto[]` (not paged) | — | `Permissions.ClinicLocations.View` | all |
| GET | `/api/v1/clinic/providers` | query: `locationId?` | `ProviderDto[]` (not paged, active only) | — | `Permissions.ClinicProviders.View` | Schedule, Requests |
| GET | `/api/v1/clinic/services` | query: `search`, `category`, `activeOnly`, `pageNumber`, `pageSize`, `sortBy`, `sortDir` | `PagedResponse<ServiceDto>` | — | `Permissions.ClinicServices.View` | Fee guide, Schedule |
| POST | `/api/v1/clinic/services` | `CreateServiceCommand` { code, name, category, durationMinutes, fee, cdcpEligible, isActive } | `string` | 400 (incl. duplicate code) | `Permissions.ClinicServices.Create` | Fee guide |
| PUT | `/api/v1/clinic/services/{id}` | `UpdateServiceCommand` { id, …create fields } | `string` | 400, 404 | `Permissions.ClinicServices.Update` | Fee guide |
| DELETE | `/api/v1/clinic/services/{id}` | — | 204 | 404, 409 when appointments reference it (deactivate instead) | `Permissions.ClinicServices.Delete` | Fee guide |
| GET | `/api/v1/clinic/patients` | query: `search` (name, chart no., phone, email), `locationId`, `coverage`, paging, sort | `PagedResponse<PatientDto>` | — | `Permissions.Patients.View` | Patients, Schedule |
| GET | `/api/v1/clinic/patients/{id}` | — | `PatientDto` | 404 | `Permissions.Patients.View` | Patient |
| POST | `/api/v1/clinic/patients` | `CreatePatientCommand` { firstName, lastName, dateOfBirth, phone, email?, preferredLocationId, preferredLanguage, coverage, insurerName?, directBilling, notes? } | `string` | 400 | `Permissions.Patients.Create` | Patients |
| PUT | `/api/v1/clinic/patients/{id}` | `UpdatePatientCommand` { id, …create fields } | `string` | 400, 404 | `Permissions.Patients.Update` | Patients, Patient |
| GET | `/api/v1/clinic/appointments` | query: `fromUtc`, `toUtc`, `locationId`, `providerId`, `patientId`, `status`, paging, `sortBy` (default `startsAtUtc`), `sortDir` | `PagedResponse<AppointmentDto>` | — | `Permissions.Appointments.View` | Schedule, Patient |
| GET | `/api/v1/clinic/appointments/{id}` | — | `AppointmentDto` | 404 | `Permissions.Appointments.View` | — |
| POST | `/api/v1/clinic/appointments` | `CreateAppointmentCommand` { patientId, locationId, providerId, serviceId, startsAtUtc, durationMinutes?, isEmergency, notes? } | `string` | 400 (outside hours, overlap, provider not at location, inactive service) | `Permissions.Appointments.Create` | Schedule |
| PUT | `/api/v1/clinic/appointments/{id}` | `UpdateAppointmentCommand` { id, …create fields } | `string` | 400, 404, 409 (final status) | `Permissions.Appointments.Update` | Schedule |
| POST | `/api/v1/clinic/appointments/{id}/status` | `ChangeAppointmentStatusCommand` { status, reason? } | `string` | 400 (reason required for `Cancelled`), 404, 409 (transition not allowed) | `Permissions.Appointments.Update` | Schedule, Patient |
| GET | `/api/v1/clinic/booking-requests` | query: `search`, `status`, `locationId`, paging, sort | `PagedResponse<BookingRequestDto>` | — | `Permissions.BookingRequests.View` | Requests |
| POST | `/api/v1/clinic/booking-requests` | `SubmitBookingRequestCommand` { fullName, phone, email?, preferredLocationId, reason, serviceCategory?, preferredTimes?, isNewPatient, isEmergency, coverage } | `string` | 400, 429 | **anonymous** (website form; rate-limited + captcha) | — (website) |
| POST | `/api/v1/clinic/booking-requests/{id}/contact` | — | `string` | 404, 409 (not `New`) | `Permissions.BookingRequests.Update` | Requests |
| POST | `/api/v1/clinic/booking-requests/{id}/book` | `BookBookingRequestCommand` { patientId? (null → create patient from the request), dateOfBirth? (required when patientId is null), providerId, serviceId, startsAtUtc, durationMinutes? } | `string` (appointment id) | 400 (same rules as create appointment), 404, 409 (already booked/declined) | `Permissions.BookingRequests.Update` + `Permissions.Appointments.Create` | Requests |
| POST | `/api/v1/clinic/booking-requests/{id}/decline` | `DeclineBookingRequestCommand` { reason } | `string` | 400, 404, 409 | `Permissions.BookingRequests.Update` | Requests |

## Permissions

| Permission | Basic | Why |
|---|---|---|
| `Permissions.ClinicLocations.View` | yes | filters everywhere |
| `Permissions.ClinicProviders.View` | yes | filters, booking |
| `Permissions.ClinicServices.View` | yes | fee guide, booking |
| `Permissions.ClinicServices.Create` / `.Update` / `.Delete` | no | office manager |
| `Permissions.Patients.View` | no | front desk, providers |
| `Permissions.Patients.Create` / `.Update` | no | front desk |
| `Permissions.Appointments.View` | no | front desk, providers |
| `Permissions.Appointments.Create` / `.Update` | no | front desk |
| `Permissions.BookingRequests.View` / `.Update` | no | front desk |

Suggested roles: **FrontDesk** (all except ClinicServices.Create/Update/Delete), **Provider** (View only),
**OfficeManager** (everything).

## Screens

| Route | Page (export) | Namespace | Nav label | Icon | Nav permission |
|---|---|---|---|---|---|
| `/schedule` | `src/pages/clinic/schedule.tsx` (`SchedulePage`) | `clinic` | Schedule | `CalendarDays` | `Permissions.Appointments.View` |
| `/booking-requests` | `src/pages/clinic/booking-requests.tsx` (`BookingRequestsPage`) | `clinic` | Booking requests | `Inbox` | `Permissions.BookingRequests.View` |
| `/patients` | `src/pages/clinic/patients.tsx` (`PatientsPage`) | `clinic` | Patients | `Users` | `Permissions.Patients.View` |
| `/patients/:id` | `src/pages/clinic/patient-detail.tsx` (`PatientDetailPage`) | `clinic` | — | — | — |
| `/fee-guide` | `src/pages/clinic/fee-guide.tsx` (`FeeGuidePage`) | `clinic` | Fee guide | `Receipt` | `Permissions.ClinicServices.View` |

Scenarios the demo shows (they become the Playwright specs):

1. Schedule: today's appointments load; switching location / provider / day narrows the list; the day
   summary (booked, confirmed, checked in, emergencies, booked value) follows the filters.
2. Schedule: walk an appointment through Confirm → Check in → Complete; cancel one with a reason;
   mark a no-show.
3. Schedule: create an appointment; outside opening hours and provider double-booking come back as
   field errors from the server; picking a service sets the duration.
4. Booking requests: inbox opens on `New`, emergencies first; mark one contacted; book a new-patient
   request (patient is created, appointment appears on the schedule); decline one with a reason.
5. Patients: search by name / chart number / phone; filter by coverage and location; create a patient
   (insurer is required for private insurance); open the patient card with upcoming and past visits.
6. Fee guide: filter by category, search by code; create a service (duplicate code → 400); edit the fee;
   deleting a service that has appointments returns 409, deactivate instead.

## Requests for web

- New `EntityUnit` values + `common.json` plurals: `appointment`, `patient`, `request`, `service`.
  The prototype uses `item` meanwhile.
- No new npm dependencies.

## Out of scope / assumptions

- Data comes from the public site (locations, opening hours, service lines, CDCP / direct billing /
  financing, Tagalog-speaking staff). People, patients, requests and **fees are fictional**; fees are
  illustrative, not the actual Alberta Dental Fee Guide. Procedure codes look like CDA codes; custom
  codes (`PM001`, `PP001`) for PerioMonitor / Perio Protect.
- Both locations share one opening-hours table, as on the site. The prototype renders times in the
  browser's time zone; the backend must evaluate hours in `America/Edmonton`.
- No clinical charting, X-rays, treatment plans, insurance pre-estimates (eDI / CDAnet), Beautifi
  financing, invoices or payments — candidates for the next iteration.
- No reminders (SMS / email) — the site mentions follow-up reminders; a notification job is a later step.
- Providers are read-only reference data here; in the product they map to Identity users.
- The anonymous `POST /booking-requests` endpoint is contract-only (the website form), not shown in the demo.
