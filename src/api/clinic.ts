import { apiFetch } from "@/lib/api-client";
import type { PagedResponse } from "@/api/paged";

// ─── Enums (string-serialized via JsonStringEnumConverter) ───────────────

export type ProviderRole = "Dentist" | "Hygienist";

export type ServiceCategory =
  | "Preventive"
  | "Restorative"
  | "Cosmetic"
  | "Orthodontics"
  | "Periodontics"
  | "Endodontics"
  | "OralSurgery"
  | "Prosthodontics"
  | "Emergency";

export type CoverageType = "SelfPay" | "PrivateInsurance" | "Cdcp";

export type PreferredLanguage = "English" | "Tagalog" | "Other";

export type AppointmentStatus =
  | "Scheduled"
  | "Confirmed"
  | "CheckedIn"
  | "Completed"
  | "NoShow"
  | "Cancelled";

export type BookingRequestStatus = "New" | "Contacted" | "Booked" | "Declined";

export type BookingSource = "Website" | "Phone" | "GoogleBusiness";

export const SERVICE_CATEGORIES: readonly ServiceCategory[] = [
  "Preventive",
  "Restorative",
  "Cosmetic",
  "Orthodontics",
  "Periodontics",
  "Endodontics",
  "OralSurgery",
  "Prosthodontics",
  "Emergency",
] as const;

export const COVERAGE_TYPES: readonly CoverageType[] = ["SelfPay", "PrivateInsurance", "Cdcp"] as const;

export const PREFERRED_LANGUAGES: readonly PreferredLanguage[] = ["English", "Tagalog", "Other"] as const;

export const APPOINTMENT_STATUSES: readonly AppointmentStatus[] = [
  "Scheduled",
  "Confirmed",
  "CheckedIn",
  "Completed",
  "NoShow",
  "Cancelled",
] as const;

export const BOOKING_REQUEST_STATUSES: readonly BookingRequestStatus[] = [
  "New",
  "Contacted",
  "Booked",
  "Declined",
] as const;

// ─── DTOs ─────────────────────────────────────────────────────────────────

export type OpeningHoursDto = {
  /** 0 = Sunday … 6 = Saturday */
  dayOfWeek: number;
  /** "HH:mm", clinic local time */
  opensAt: string;
  closesAt: string;
};

export type LocationDto = {
  id: string;
  name: string;
  address: string;
  timeZone: string;
  hours: OpeningHoursDto[];
};

export type ProviderDto = {
  id: string;
  displayName: string;
  role: ProviderRole;
  locationIds: string[];
  isActive: boolean;
};

export type ServiceDto = {
  id: string;
  code: string;
  name: string;
  category: ServiceCategory;
  durationMinutes: number;
  fee: number;
  cdcpEligible: boolean;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
};

export type PatientDto = {
  id: string;
  chartNumber: string;
  firstName: string;
  lastName: string;
  /** "YYYY-MM-DD" */
  dateOfBirth: string;
  phone: string;
  email?: string | null;
  preferredLocationId: string;
  preferredLanguage: PreferredLanguage;
  coverage: CoverageType;
  insurerName?: string | null;
  directBilling: boolean;
  notes?: string | null;
  lastVisitAtUtc?: string | null;
  nextAppointmentAtUtc?: string | null;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
};

export type AppointmentDto = {
  id: string;
  patientId: string;
  patientName: string;
  locationId: string;
  providerId: string;
  providerName: string;
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  startsAtUtc: string;
  durationMinutes: number;
  status: AppointmentStatus;
  isEmergency: boolean;
  notes?: string | null;
  cancellationReason?: string | null;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
};

export type BookingRequestDto = {
  id: string;
  number: string;
  fullName: string;
  phone: string;
  email?: string | null;
  preferredLocationId: string;
  reason: string;
  serviceCategory?: ServiceCategory | null;
  preferredTimes?: string | null;
  isNewPatient: boolean;
  isEmergency: boolean;
  coverage: CoverageType;
  source: BookingSource;
  status: BookingRequestStatus;
  patientId?: string | null;
  appointmentId?: string | null;
  declineReason?: string | null;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
};

// ─── Inputs ───────────────────────────────────────────────────────────────

type Paging = {
  pageNumber?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
};

export type SearchServicesParams = Paging & {
  search?: string;
  category?: ServiceCategory | null;
  activeOnly?: boolean;
};

export type CreateServiceInput = {
  code: string;
  name: string;
  category: ServiceCategory;
  durationMinutes: number;
  fee: number;
  cdcpEligible: boolean;
  isActive: boolean;
};

export type UpdateServiceInput = CreateServiceInput & { id: string };

export type SearchPatientsParams = Paging & {
  search?: string;
  locationId?: string | null;
  coverage?: CoverageType | null;
};

export type CreatePatientInput = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  email?: string | null;
  preferredLocationId: string;
  preferredLanguage: PreferredLanguage;
  coverage: CoverageType;
  insurerName?: string | null;
  directBilling: boolean;
  notes?: string | null;
};

export type UpdatePatientInput = CreatePatientInput & { id: string };

export type SearchAppointmentsParams = Paging & {
  fromUtc?: string;
  toUtc?: string;
  locationId?: string | null;
  providerId?: string | null;
  patientId?: string | null;
  status?: AppointmentStatus | null;
};

export type CreateAppointmentInput = {
  patientId: string;
  locationId: string;
  providerId: string;
  serviceId: string;
  startsAtUtc: string;
  durationMinutes?: number | null;
  isEmergency: boolean;
  notes?: string | null;
};

export type UpdateAppointmentInput = CreateAppointmentInput & { id: string };

export type ChangeAppointmentStatusInput = {
  id: string;
  status: AppointmentStatus;
  reason?: string | null;
};

export type SearchBookingRequestsParams = Paging & {
  search?: string;
  status?: BookingRequestStatus | null;
  locationId?: string | null;
};

export type BookBookingRequestInput = {
  id: string;
  /** null → the server creates the patient from the request. */
  patientId?: string | null;
  /** Required when patientId is null. */
  dateOfBirth?: string | null;
  providerId: string;
  serviceId: string;
  startsAtUtc: string;
  durationMinutes?: number | null;
};

export type DeclineBookingRequestInput = { id: string; reason: string };

// ─── Endpoints ────────────────────────────────────────────────────────────

const BASE = "/api/v1";

function setPaging(q: URLSearchParams, params: Paging) {
  q.set("pageNumber", String(params.pageNumber ?? 1));
  q.set("pageSize", String(params.pageSize ?? 20));
  if (params.sortBy) q.set("sortBy", params.sortBy);
  if (params.sortDir) q.set("sortDir", params.sortDir);
}

// Locations & providers (reference data)

export function listLocations(): Promise<LocationDto[]> {
  return apiFetch<LocationDto[]>(`${BASE}/clinic/locations`);
}

export function listProviders(locationId?: string | null): Promise<ProviderDto[]> {
  const q = new URLSearchParams();
  if (locationId) q.set("locationId", locationId);
  const suffix = q.size > 0 ? `?${q.toString()}` : "";
  return apiFetch<ProviderDto[]>(`${BASE}/clinic/providers${suffix}`);
}

// Services (fee guide)

export function searchServices(params: SearchServicesParams = {}): Promise<PagedResponse<ServiceDto>> {
  const q = new URLSearchParams();
  if (params.search) q.set("search", params.search);
  if (params.category) q.set("category", params.category);
  if (params.activeOnly) q.set("activeOnly", "true");
  setPaging(q, params);
  return apiFetch<PagedResponse<ServiceDto>>(`${BASE}/clinic/services?${q.toString()}`);
}

export function createService(input: CreateServiceInput): Promise<string> {
  return apiFetch<string>(`${BASE}/clinic/services`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateService(input: UpdateServiceInput): Promise<string> {
  return apiFetch<string>(`${BASE}/clinic/services/${encodeURIComponent(input.id)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteService(id: string): Promise<void> {
  return apiFetch<void>(`${BASE}/clinic/services/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// Patients

export function searchPatients(params: SearchPatientsParams = {}): Promise<PagedResponse<PatientDto>> {
  const q = new URLSearchParams();
  if (params.search) q.set("search", params.search);
  if (params.locationId) q.set("locationId", params.locationId);
  if (params.coverage) q.set("coverage", params.coverage);
  setPaging(q, params);
  return apiFetch<PagedResponse<PatientDto>>(`${BASE}/clinic/patients?${q.toString()}`);
}

export function getPatientById(id: string): Promise<PatientDto> {
  return apiFetch<PatientDto>(`${BASE}/clinic/patients/${encodeURIComponent(id)}`);
}

export function createPatient(input: CreatePatientInput): Promise<string> {
  return apiFetch<string>(`${BASE}/clinic/patients`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updatePatient(input: UpdatePatientInput): Promise<string> {
  return apiFetch<string>(`${BASE}/clinic/patients/${encodeURIComponent(input.id)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

// Appointments

export function searchAppointments(
  params: SearchAppointmentsParams = {},
): Promise<PagedResponse<AppointmentDto>> {
  const q = new URLSearchParams();
  if (params.fromUtc) q.set("fromUtc", params.fromUtc);
  if (params.toUtc) q.set("toUtc", params.toUtc);
  if (params.locationId) q.set("locationId", params.locationId);
  if (params.providerId) q.set("providerId", params.providerId);
  if (params.patientId) q.set("patientId", params.patientId);
  if (params.status) q.set("status", params.status);
  setPaging(q, { sortBy: "startsAtUtc", sortDir: "asc", ...params });
  return apiFetch<PagedResponse<AppointmentDto>>(`${BASE}/clinic/appointments?${q.toString()}`);
}

export function getAppointmentById(id: string): Promise<AppointmentDto> {
  return apiFetch<AppointmentDto>(`${BASE}/clinic/appointments/${encodeURIComponent(id)}`);
}

export function createAppointment(input: CreateAppointmentInput): Promise<string> {
  return apiFetch<string>(`${BASE}/clinic/appointments`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAppointment(input: UpdateAppointmentInput): Promise<string> {
  return apiFetch<string>(`${BASE}/clinic/appointments/${encodeURIComponent(input.id)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function changeAppointmentStatus(input: ChangeAppointmentStatusInput): Promise<string> {
  return apiFetch<string>(`${BASE}/clinic/appointments/${encodeURIComponent(input.id)}/status`, {
    method: "POST",
    body: JSON.stringify({ status: input.status, reason: input.reason ?? null }),
  });
}

// Booking requests

export function searchBookingRequests(
  params: SearchBookingRequestsParams = {},
): Promise<PagedResponse<BookingRequestDto>> {
  const q = new URLSearchParams();
  if (params.search) q.set("search", params.search);
  if (params.status) q.set("status", params.status);
  if (params.locationId) q.set("locationId", params.locationId);
  setPaging(q, params);
  return apiFetch<PagedResponse<BookingRequestDto>>(`${BASE}/clinic/booking-requests?${q.toString()}`);
}

export function markBookingRequestContacted(id: string): Promise<string> {
  return apiFetch<string>(`${BASE}/clinic/booking-requests/${encodeURIComponent(id)}/contact`, {
    method: "POST",
  });
}

export function bookBookingRequest(input: BookBookingRequestInput): Promise<string> {
  const { id, ...body } = input;
  return apiFetch<string>(`${BASE}/clinic/booking-requests/${encodeURIComponent(id)}/book`, {
    method: "POST",
    body: JSON.stringify({
      patientId: body.patientId ?? null,
      dateOfBirth: body.dateOfBirth ?? null,
      providerId: body.providerId,
      serviceId: body.serviceId,
      startsAtUtc: body.startsAtUtc,
      durationMinutes: body.durationMinutes ?? null,
    }),
  });
}

export function declineBookingRequest(input: DeclineBookingRequestInput): Promise<string> {
  return apiFetch<string>(`${BASE}/clinic/booking-requests/${encodeURIComponent(input.id)}/decline`, {
    method: "POST",
    body: JSON.stringify({ reason: input.reason }),
  });
}
