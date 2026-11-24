// Shared labels, tones and date helpers for the Clinic pages.
import type { ParseKeys } from "i18next";
import type {
  AppointmentStatus,
  BookingRequestStatus,
  BookingSource,
  CoverageType,
  LocationDto,
  PreferredLanguage,
  ProviderRole,
  ServiceCategory,
} from "@/api/clinic";
import type { EntityStatusTone } from "@/components/list";
import i18n from "@/i18n";
import { pad2 } from "@/lib/list-helpers";

const uiLocale = () => i18n.resolvedLanguage ?? "en-US";

type Key = ParseKeys<"clinic">;

export const APPOINTMENT_STATUS_LABEL = {
  Scheduled: "appointmentStatus.Scheduled",
  Confirmed: "appointmentStatus.Confirmed",
  CheckedIn: "appointmentStatus.CheckedIn",
  Completed: "appointmentStatus.Completed",
  NoShow: "appointmentStatus.NoShow",
  Cancelled: "appointmentStatus.Cancelled",
} satisfies Record<AppointmentStatus, Key>;

export const APPOINTMENT_STATUS_TONE: Record<AppointmentStatus, EntityStatusTone> = {
  Scheduled: "default",
  Confirmed: "info",
  CheckedIn: "warning",
  Completed: "success",
  NoShow: "danger",
  Cancelled: "default",
};

export const REQUEST_STATUS_LABEL = {
  New: "requestStatus.New",
  Contacted: "requestStatus.Contacted",
  Booked: "requestStatus.Booked",
  Declined: "requestStatus.Declined",
} satisfies Record<BookingRequestStatus, Key>;

export const REQUEST_STATUS_TONE: Record<BookingRequestStatus, EntityStatusTone> = {
  New: "info",
  Contacted: "warning",
  Booked: "success",
  Declined: "default",
};

export const SOURCE_LABEL = {
  Website: "source.Website",
  Phone: "source.Phone",
  GoogleBusiness: "source.GoogleBusiness",
} satisfies Record<BookingSource, Key>;

export const COVERAGE_LABEL = {
  SelfPay: "coverage.SelfPay",
  PrivateInsurance: "coverage.PrivateInsurance",
  Cdcp: "coverage.Cdcp",
} satisfies Record<CoverageType, Key>;

export const COVERAGE_TONE: Record<CoverageType, EntityStatusTone> = {
  SelfPay: "default",
  PrivateInsurance: "info",
  Cdcp: "success",
};

export const LANGUAGE_LABEL = {
  English: "language.English",
  Tagalog: "language.Tagalog",
  Other: "language.Other",
} satisfies Record<PreferredLanguage, Key>;

export const ROLE_LABEL = {
  Dentist: "role.Dentist",
  Hygienist: "role.Hygienist",
} satisfies Record<ProviderRole, Key>;

export const CATEGORY_LABEL = {
  Preventive: "category.Preventive",
  Restorative: "category.Restorative",
  Cosmetic: "category.Cosmetic",
  Orthodontics: "category.Orthodontics",
  Periodontics: "category.Periodontics",
  Endodontics: "category.Endodontics",
  OralSurgery: "category.OralSurgery",
  Prosthodontics: "category.Prosthodontics",
  Emergency: "category.Emergency",
} satisfies Record<ServiceCategory, Key>;

export const CURRENCY = "CAD";

export const TEXTAREA_CLASS =
  "flex w-full rounded-lg border border-[var(--color-input)] bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-[oklch(from_var(--color-muted-foreground)_l_c_h_/_0.6)] focus-visible:border-[var(--color-ring)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[oklch(from_var(--color-ring)_l_c_h_/_0.5)]";

// ─── Dates (clinic day = browser local day in the prototype) ──────────────

/** "YYYY-MM-DD" for a local date. */
export function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** "HH:mm" for a local time. */
export function toTimeInput(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Local midnight of a "YYYY-MM-DD" value. */
export function parseDateInput(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** ISO UTC instant for a local date + "HH:mm". */
export function combineLocal(date: string, time: string): string {
  const day = parseDateInput(date);
  const [h, min] = time.split(":").map(Number);
  day.setHours(h || 0, min || 0, 0, 0);
  return day.toISOString();
}

export function addDays(value: string, days: number): string {
  const d = parseDateInput(value);
  d.setDate(d.getDate() + days);
  return toDateInput(d);
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat(uiLocale(), { hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

export function formatDayLong(value: string): string {
  return new Intl.DateTimeFormat(uiLocale(), {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parseDateInput(value));
}

export function endOf(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

export function ageFrom(dateOfBirth: string, now = new Date()): number {
  const dob = parseDateInput(dateOfBirth);
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

export function hoursFor(location: LocationDto | undefined, date: string) {
  if (!location) return undefined;
  return location.hours.find((h) => h.dayOfWeek === parseDateInput(date).getDay());
}
