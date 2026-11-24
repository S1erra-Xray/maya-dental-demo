// PROTOTYPE-ONLY mock of the Clinic module (see HANDOFF.md). Validation messages follow
// FluentValidation's shape: 400 + field-keyed errors (PascalCase field names).
import type {
  AppointmentDto,
  AppointmentStatus,
  BookBookingRequestInput,
  BookingRequestDto,
  CreateAppointmentInput,
  CreatePatientInput,
  CreateServiceInput,
  PatientDto,
  ServiceDto,
} from "@/api/clinic";
import { mockError, type MockRoute } from "./router";
import { createCollection, newId, nowUtc, paginate, searchBy } from "./store";
import { buildClinicSeed, clinicSeed } from "./clinic-seed";

export { clinicSeed };

// The schedule is generated relative to "today". Data saved on an earlier day is stale (yesterday's
// "today" would still show as upcoming), so a new calendar day starts from a fresh seed.
const DAY_KEY = "proto-mock:clinic-day";
const todayKey = new Date().toDateString();
let seed = clinicSeed;
if (localStorage.getItem(DAY_KEY) !== todayKey) {
  ["services", "patients", "appointments", "bookingRequests"].forEach((name) =>
    localStorage.removeItem(`proto-mock:clinic-${name}`),
  );
  localStorage.setItem(DAY_KEY, todayKey);
  seed = buildClinicSeed();
}

const locations = seed.locations;
const providers = seed.providers;
const services = createCollection<ServiceDto>("clinic-services", seed.services);
const patients = createCollection<PatientDto>("clinic-patients", seed.patients);
const appointments = createCollection<AppointmentDto>("clinic-appointments", seed.appointments);
const requests = createCollection<BookingRequestDto>("clinic-bookingRequests", seed.bookingRequests);

type Errors = Record<string, string[]>;

function fail(errors: Errors): void {
  if (Object.keys(errors).length > 0) mockError(400, "One or more validation errors occurred.", errors);
}

function add(errors: Errors, field: string, message: string) {
  (errors[field] ??= []).push(message);
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function clock(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// ─── Derived patient fields ───────────────────────────────────────────────

const ACTIVE: readonly AppointmentStatus[] = ["Scheduled", "Confirmed", "CheckedIn"];

function withVisits(patient: PatientDto): PatientDto {
  const now = Date.now();
  let last: string | null = null;
  let next: string | null = null;
  for (const a of appointments.all()) {
    if (a.patientId !== patient.id) continue;
    const t = new Date(a.startsAtUtc).getTime();
    if (a.status === "Completed" && t <= now && (!last || a.startsAtUtc > last)) last = a.startsAtUtc;
    if ((a.status === "Scheduled" || a.status === "Confirmed") && t > now && (!next || a.startsAtUtc < next)) next = a.startsAtUtc;
  }
  return { ...patient, lastVisitAtUtc: last, nextAppointmentAtUtc: next };
}

// ─── Services ─────────────────────────────────────────────────────────────

function validateService(input: CreateServiceInput, id?: string) {
  const errors: Errors = {};
  const code = input.code?.trim().toUpperCase() ?? "";
  if (!code) add(errors, "Code", "'Code' must not be empty.");
  else if (!/^[A-Z0-9]{1,10}$/.test(code)) add(errors, "Code", "'Code' may contain only letters and digits (max 10).");
  else if (services.all().some((s) => s.code === code && s.id !== id)) add(errors, "Code", `Code '${code}' is already used by another service.`);
  if (!input.name?.trim()) add(errors, "Name", "'Name' must not be empty.");
  if (!(input.durationMinutes >= 5 && input.durationMinutes <= 240) || input.durationMinutes % 5 !== 0)
    add(errors, "DurationMinutes", "'Duration Minutes' must be between 5 and 240 and a multiple of 5.");
  if (!(input.fee >= 0)) add(errors, "Fee", "'Fee' must be greater than or equal to '0'.");
  fail(errors);
  return code;
}

// ─── Patients ─────────────────────────────────────────────────────────────

function validatePatient(input: CreatePatientInput) {
  const errors: Errors = {};
  if (!input.firstName?.trim()) add(errors, "FirstName", "'First Name' must not be empty.");
  if (!input.lastName?.trim()) add(errors, "LastName", "'Last Name' must not be empty.");
  if (!input.dateOfBirth) add(errors, "DateOfBirth", "'Date Of Birth' must not be empty.");
  else if (input.dateOfBirth > new Date().toISOString().slice(0, 10)) add(errors, "DateOfBirth", "'Date Of Birth' can't be in the future.");
  if (!input.phone?.trim()) add(errors, "Phone", "'Phone' must not be empty.");
  if (input.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email)) add(errors, "Email", "'Email' is not a valid email address.");
  if (!locations.some((l) => l.id === input.preferredLocationId)) add(errors, "PreferredLocationId", "Choose a location.");
  if (input.coverage === "PrivateInsurance" && !input.insurerName?.trim())
    add(errors, "InsurerName", "'Insurer Name' is required for private insurance.");
  fail(errors);
}

function patientFields(input: CreatePatientInput) {
  const isPrivate = input.coverage === "PrivateInsurance";
  return {
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    dateOfBirth: input.dateOfBirth,
    phone: input.phone.trim(),
    email: input.email?.trim() || null,
    preferredLocationId: input.preferredLocationId,
    preferredLanguage: input.preferredLanguage ?? "English",
    coverage: input.coverage,
    insurerName: isPrivate ? (input.insurerName?.trim() ?? null) : null,
    directBilling: isPrivate ? !!input.directBilling : false,
    notes: input.notes?.trim() || null,
  };
}

function nextChartNumber() {
  const max = patients.all().reduce((m, p) => Math.max(m, Number(p.chartNumber.slice(3)) || 0), 10000);
  return `MD-${String(max + 1).padStart(5, "0")}`;
}

// ─── Appointments ─────────────────────────────────────────────────────────

type Resolved = { service: ServiceDto; providerName: string; duration: number };

function validateAppointment(
  input: Omit<CreateAppointmentInput, "patientId"> & { patientId?: string | null },
  options: { ignoreId?: string; requirePatient?: boolean } = {},
): Resolved {
  const errors: Errors = {};
  const requirePatient = options.requirePatient ?? true;
  if (requirePatient && !patients.get(input.patientId ?? "")) add(errors, "PatientId", "Choose a patient.");
  const location = locations.find((l) => l.id === input.locationId);
  if (!location) add(errors, "LocationId", "Choose a location.");
  const provider = providers.find((p) => p.id === input.providerId && p.isActive);
  if (!provider) add(errors, "ProviderId", "Choose a provider.");
  else if (location && !provider.locationIds.includes(location.id))
    add(errors, "ProviderId", `${provider.displayName} doesn't work at ${location.name}.`);
  const service = services.get(input.serviceId ?? "");
  if (!service) add(errors, "ServiceId", "Choose a service.");
  else if (!service.isActive) add(errors, "ServiceId", `'${service.name}' is inactive and can't be booked.`);
  const duration = input.durationMinutes ?? service?.durationMinutes ?? 0;
  if (!(duration >= 5 && duration <= 240)) add(errors, "DurationMinutes", "'Duration Minutes' must be between 5 and 240.");

  const start = new Date(input.startsAtUtc ?? "");
  if (Number.isNaN(start.getTime())) add(errors, "StartsAtUtc", "'Starts At' must be a valid date and time.");
  else if (location && duration > 0) {
    const hours = location.hours.find((h) => h.dayOfWeek === start.getDay());
    const startMin = start.getHours() * 60 + start.getMinutes();
    const endMin = startMin + duration;
    const [oh, om] = (hours?.opensAt ?? "0:0").split(":").map(Number);
    const [ch, cm] = (hours?.closesAt ?? "0:0").split(":").map(Number);
    if (!hours || startMin < oh * 60 + om || endMin > ch * 60 + cm) {
      add(
        errors,
        "StartsAtUtc",
        hours
          ? `${location.name} is open ${hours.opensAt}–${hours.closesAt} on ${DAY_NAMES[start.getDay()]}; the visit must start and end within opening hours.`
          : `${location.name} is closed on ${DAY_NAMES[start.getDay()]}.`,
      );
    } else if (provider) {
      const s = start.getTime();
      const e = s + duration * 60_000;
      const clash = appointments
        .all()
        .find(
          (a) =>
            a.providerId === provider.id &&
            a.id !== options.ignoreId &&
            ACTIVE.includes(a.status) &&
            new Date(a.startsAtUtc).getTime() < e &&
            new Date(a.startsAtUtc).getTime() + a.durationMinutes * 60_000 > s,
        );
      if (clash) {
        add(
          errors,
          "StartsAtUtc",
          `${provider.displayName} is already booked ${clock(new Date(clash.startsAtUtc))}–${clock(new Date(new Date(clash.startsAtUtc).getTime() + clash.durationMinutes * 60_000))} (${clash.patientName}).`,
        );
      }
    }
  }
  fail(errors);
  return { service: service!, providerName: provider!.displayName, duration };
}

function insertAppointment(input: CreateAppointmentInput, resolved: Resolved): string {
  const patient = patients.get(input.patientId)!;
  const created: AppointmentDto = {
    id: newId(),
    patientId: patient.id,
    patientName: `${patient.firstName} ${patient.lastName}`,
    locationId: input.locationId,
    providerId: input.providerId,
    providerName: resolved.providerName,
    serviceId: resolved.service.id,
    serviceCode: resolved.service.code,
    serviceName: resolved.service.name,
    startsAtUtc: new Date(input.startsAtUtc).toISOString(),
    durationMinutes: resolved.duration,
    status: "Scheduled",
    isEmergency: !!input.isEmergency,
    notes: input.notes?.trim() || null,
    cancellationReason: null,
    createdAtUtc: nowUtc(),
  };
  return appointments.insert(created).id;
}

const TRANSITIONS: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  Scheduled: ["Confirmed", "Cancelled", "NoShow"],
  Confirmed: ["CheckedIn", "Cancelled", "NoShow"],
  CheckedIn: ["Completed"],
  Completed: [],
  NoShow: [],
  Cancelled: [],
};

// ─── Booking requests ─────────────────────────────────────────────────────

function requestOr404(id: string) {
  return requests.get(id) ?? mockError(404, "Booking request not found.");
}

function requireOpen(request: BookingRequestDto) {
  if (request.status === "Booked" || request.status === "Declined")
    mockError(409, `Booking request ${request.number} is already ${request.status.toLowerCase()}.`);
}

// Keep the given order: paginate() only sorts when sortBy names an existing field.
function keepOrder(query: URLSearchParams) {
  const q = new URLSearchParams(query);
  q.set("sortBy", "__none");
  return q;
}

// ─── Routes ───────────────────────────────────────────────────────────────

export const clinicRoutes: MockRoute[] = [
  { method: "GET", path: "/api/v1/clinic/locations", handler: () => locations },
  {
    method: "GET",
    path: "/api/v1/clinic/providers",
    handler: ({ query }) => {
      const locationId = query.get("locationId");
      return providers.filter((p) => p.isActive && (!locationId || p.locationIds.includes(locationId)));
    },
  },

  // Services
  {
    method: "GET",
    path: "/api/v1/clinic/services",
    handler: ({ query }) => {
      const category = query.get("category");
      const activeOnly = query.get("activeOnly") === "true";
      const found = searchBy(services.all(), query, ["code", "name"])
        .filter((s) => !category || s.category === category)
        .filter((s) => !activeOnly || s.isActive);
      const q = new URLSearchParams(query);
      if (!q.get("sortBy")) {
        q.set("sortBy", "code");
        q.set("sortDir", "asc");
      }
      return paginate(found, q);
    },
  },
  {
    method: "POST",
    path: "/api/v1/clinic/services",
    handler: ({ body }) => {
      const input = body as CreateServiceInput;
      const code = validateService(input);
      return services.insert({
        id: newId(),
        code,
        name: input.name.trim(),
        category: input.category,
        durationMinutes: input.durationMinutes,
        fee: Math.round(input.fee * 100) / 100,
        cdcpEligible: !!input.cdcpEligible,
        isActive: input.isActive ?? true,
        createdAtUtc: nowUtc(),
      }).id;
    },
  },
  {
    method: "PUT",
    path: "/api/v1/clinic/services/:id",
    handler: ({ params, body }) => {
      const input = body as CreateServiceInput;
      if (!services.get(params.id)) mockError(404, "Service not found.");
      const code = validateService(input, params.id);
      services.update(params.id, {
        code,
        name: input.name.trim(),
        category: input.category,
        durationMinutes: input.durationMinutes,
        fee: Math.round(input.fee * 100) / 100,
        cdcpEligible: !!input.cdcpEligible,
        isActive: !!input.isActive,
        updatedAtUtc: nowUtc(),
      });
      return params.id;
    },
  },
  {
    method: "DELETE",
    path: "/api/v1/clinic/services/:id",
    handler: ({ params }) => {
      const service = services.get(params.id) ?? mockError(404, "Service not found.");
      const used = appointments.all().filter((a) => a.serviceId === service.id).length;
      if (used > 0)
        mockError(409, `'${service.name}' is used by ${used} appointment(s). Deactivate it instead of deleting.`);
      services.remove(service.id);
      return undefined;
    },
  },

  // Patients
  {
    method: "GET",
    path: "/api/v1/clinic/patients",
    handler: ({ query }) => {
      const locationId = query.get("locationId");
      const coverage = query.get("coverage");
      const term = (query.get("search") ?? "").trim().toLowerCase();
      const digits = term.replace(/\D/g, "");
      const found = patients
        .all()
        .filter((p) => !locationId || p.preferredLocationId === locationId)
        .filter((p) => !coverage || p.coverage === coverage)
        .filter(
          (p) =>
            !term ||
            `${p.firstName} ${p.lastName}`.toLowerCase().includes(term) ||
            p.chartNumber.toLowerCase().includes(term) ||
            (p.email ?? "").toLowerCase().includes(term) ||
            (digits.length >= 3 && p.phone.replace(/\D/g, "").includes(digits)),
        )
        .map(withVisits);
      const q = new URLSearchParams(query);
      if (!q.get("sortBy")) {
        q.set("sortBy", "lastName");
        q.set("sortDir", "asc");
      }
      return paginate(found, q);
    },
  },
  {
    method: "GET",
    path: "/api/v1/clinic/patients/:id",
    handler: ({ params }) => withVisits(patients.get(params.id) ?? mockError(404, "Patient not found.")),
  },
  {
    method: "POST",
    path: "/api/v1/clinic/patients",
    handler: ({ body }) => {
      const input = body as CreatePatientInput;
      validatePatient(input);
      return patients.insert({
        id: newId(),
        chartNumber: nextChartNumber(),
        ...patientFields(input),
        createdAtUtc: nowUtc(),
      }).id;
    },
  },
  {
    method: "PUT",
    path: "/api/v1/clinic/patients/:id",
    handler: ({ params, body }) => {
      const input = body as CreatePatientInput;
      if (!patients.get(params.id)) mockError(404, "Patient not found.");
      validatePatient(input);
      const updated = patients.update(params.id, { ...patientFields(input), updatedAtUtc: nowUtc() })!;
      const name = `${updated.firstName} ${updated.lastName}`;
      appointments
        .all()
        .filter((a) => a.patientId === updated.id && a.patientName !== name)
        .forEach((a) => appointments.update(a.id, { patientName: name }));
      return params.id;
    },
  },

  // Appointments
  {
    method: "GET",
    path: "/api/v1/clinic/appointments",
    handler: ({ query }) => {
      const from = query.get("fromUtc");
      const to = query.get("toUtc");
      const locationId = query.get("locationId");
      const providerId = query.get("providerId");
      const patientId = query.get("patientId");
      const status = query.get("status");
      const found = appointments
        .all()
        .filter((a) => !from || a.startsAtUtc >= new Date(from).toISOString())
        .filter((a) => !to || a.startsAtUtc < new Date(to).toISOString())
        .filter((a) => !locationId || a.locationId === locationId)
        .filter((a) => !providerId || a.providerId === providerId)
        .filter((a) => !patientId || a.patientId === patientId)
        .filter((a) => !status || a.status === status);
      const q = new URLSearchParams(query);
      if (!q.get("sortBy")) {
        q.set("sortBy", "startsAtUtc");
        q.set("sortDir", "asc");
      }
      return paginate(found, q);
    },
  },
  {
    method: "GET",
    path: "/api/v1/clinic/appointments/:id",
    handler: ({ params }) => appointments.get(params.id) ?? mockError(404, "Appointment not found."),
  },
  {
    method: "POST",
    path: "/api/v1/clinic/appointments",
    handler: ({ body }) => {
      const input = body as CreateAppointmentInput;
      const resolved = validateAppointment(input);
      return insertAppointment(input, resolved);
    },
  },
  {
    method: "PUT",
    path: "/api/v1/clinic/appointments/:id",
    handler: ({ params, body }) => {
      const input = body as CreateAppointmentInput;
      const existing = appointments.get(params.id) ?? mockError(404, "Appointment not found.");
      if (existing.status !== "Scheduled" && existing.status !== "Confirmed")
        mockError(409, `A ${existing.status} appointment can't be changed.`);
      const resolved = validateAppointment(input, { ignoreId: existing.id });
      const patient = patients.get(input.patientId)!;
      appointments.update(existing.id, {
        patientId: patient.id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        locationId: input.locationId,
        providerId: input.providerId,
        providerName: resolved.providerName,
        serviceId: resolved.service.id,
        serviceCode: resolved.service.code,
        serviceName: resolved.service.name,
        startsAtUtc: new Date(input.startsAtUtc).toISOString(),
        durationMinutes: resolved.duration,
        isEmergency: !!input.isEmergency,
        notes: input.notes?.trim() || null,
        updatedAtUtc: nowUtc(),
      });
      return existing.id;
    },
  },
  {
    method: "POST",
    path: "/api/v1/clinic/appointments/:id/status",
    handler: ({ params, body }) => {
      const { status, reason } = (body ?? {}) as { status: AppointmentStatus; reason?: string | null };
      const existing = appointments.get(params.id) ?? mockError(404, "Appointment not found.");
      if (!TRANSITIONS[existing.status].includes(status))
        mockError(409, `Can't change the status from ${existing.status} to ${status}.`);
      if (status === "Cancelled" && !reason?.trim()) fail({ Reason: ["A reason is required to cancel an appointment."] });
      appointments.update(existing.id, {
        status,
        cancellationReason: status === "Cancelled" ? reason!.trim() : existing.cancellationReason,
        updatedAtUtc: nowUtc(),
      });
      return existing.id;
    },
  },

  // Booking requests
  {
    method: "GET",
    path: "/api/v1/clinic/booking-requests",
    handler: ({ query }) => {
      const status = query.get("status");
      const locationId = query.get("locationId");
      const found = searchBy(requests.all(), query, ["fullName", "number", "phone", "email", "reason"])
        .filter((r) => !status || r.status === status)
        .filter((r) => !locationId || r.preferredLocationId === locationId);
      // Default order: open emergencies first, then newest.
      const open = (r: BookingRequestDto) => r.status === "New" || r.status === "Contacted";
      const ordered = [...found].sort((a, b) => {
        const ea = open(a) && a.isEmergency ? 1 : 0;
        const eb = open(b) && b.isEmergency ? 1 : 0;
        if (ea !== eb) return eb - ea;
        return a.createdAtUtc < b.createdAtUtc ? 1 : -1;
      });
      return paginate(ordered, keepOrder(query));
    },
  },
  {
    method: "POST",
    path: "/api/v1/clinic/booking-requests/:id/contact",
    handler: ({ params }) => {
      const request = requestOr404(params.id);
      if (request.status !== "New") mockError(409, `Booking request ${request.number} is not new.`);
      requests.update(request.id, { status: "Contacted", updatedAtUtc: nowUtc() });
      return request.id;
    },
  },
  {
    method: "POST",
    path: "/api/v1/clinic/booking-requests/:id/book",
    handler: ({ params, body }) => {
      const input = body as Omit<BookBookingRequestInput, "id">;
      const request = requestOr404(params.id);
      requireOpen(request);
      const isNew = !input.patientId;
      const base = {
        locationId: request.preferredLocationId,
        providerId: input.providerId,
        serviceId: input.serviceId,
        startsAtUtc: input.startsAtUtc,
        durationMinutes: input.durationMinutes ?? null,
        isEmergency: request.isEmergency,
        notes: request.reason,
      };
      const errors: Errors = {};
      if (isNew && !input.dateOfBirth) add(errors, "DateOfBirth", "'Date Of Birth' is required to create the patient.");
      if (!isNew && !patients.get(input.patientId!)) add(errors, "PatientId", "Patient not found.");
      fail(errors);
      const resolved = validateAppointment({ ...base, patientId: input.patientId }, { requirePatient: !isNew });

      let patientId = input.patientId!;
      if (isNew) {
        const [first, ...rest] = request.fullName.trim().split(/\s+/);
        const patientInput: CreatePatientInput = {
          firstName: first,
          lastName: rest.join(" ") || "—",
          dateOfBirth: input.dateOfBirth!,
          phone: request.phone,
          email: request.email,
          preferredLocationId: request.preferredLocationId,
          preferredLanguage: "English",
          coverage: request.coverage,
          insurerName: request.coverage === "PrivateInsurance" ? "To be confirmed" : null,
          directBilling: false,
          notes: `Created from booking request ${request.number}.`,
        };
        validatePatient(patientInput);
        patientId = patients.insert({ id: newId(), chartNumber: nextChartNumber(), ...patientFields(patientInput), createdAtUtc: nowUtc() }).id;
      }
      const appointmentId = insertAppointment({ ...base, patientId }, resolved);
      requests.update(request.id, { status: "Booked", patientId, appointmentId, updatedAtUtc: nowUtc() });
      return appointmentId;
    },
  },
  {
    method: "POST",
    path: "/api/v1/clinic/booking-requests/:id/decline",
    handler: ({ params, body }) => {
      const { reason } = (body ?? {}) as { reason?: string };
      const request = requestOr404(params.id);
      requireOpen(request);
      if (!reason?.trim()) fail({ Reason: ["'Reason' must not be empty."] });
      requests.update(request.id, { status: "Declined", declineReason: reason!.trim(), updatedAtUtc: nowUtc() });
      return request.id;
    },
  },
];
