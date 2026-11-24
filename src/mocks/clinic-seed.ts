// PROTOTYPE-ONLY seed for the Clinic module. Everything is fictional: people, phones (555 numbers),
// emails (example.com) and fees. Locations and opening hours follow the public mayadentalclinic.com.
// Appointments and requests are generated relative to "today" with a fixed PRNG, so every demo day has
// a believable schedule.
import type {
  AppointmentDto,
  AppointmentStatus,
  BookingRequestDto,
  LocationDto,
  OpeningHoursDto,
  PatientDto,
  ProviderDto,
  ServiceCategory,
  ServiceDto,
} from "@/api/clinic";

// ─── Reference data ───────────────────────────────────────────────────────

const HOURS: OpeningHoursDto[] = [
  { dayOfWeek: 0, opensAt: "09:00", closesAt: "16:00" },
  { dayOfWeek: 1, opensAt: "10:00", closesAt: "17:00" },
  { dayOfWeek: 2, opensAt: "11:00", closesAt: "18:00" },
  { dayOfWeek: 3, opensAt: "12:00", closesAt: "19:00" },
  { dayOfWeek: 4, opensAt: "12:00", closesAt: "19:00" },
  { dayOfWeek: 5, opensAt: "09:00", closesAt: "19:00" },
  { dayOfWeek: 6, opensAt: "08:00", closesAt: "17:00" },
];

export const SOUTH = "5a1d0000-0000-4000-8000-000000000001";
export const WEST = "5a1d0000-0000-4000-8000-000000000002";

const locations: LocationDto[] = [
  { id: SOUTH, name: "South Edmonton", address: "1643 102 St NW, Edmonton, AB T6J 5Z8", timeZone: "America/Edmonton", hours: HOURS },
  { id: WEST, name: "West Edmonton", address: "17520 100 Ave NW, Edmonton, AB T5S 2S2", timeZone: "America/Edmonton", hours: HOURS },
];

const pid = (n: number) => `7e0d0000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const providers: ProviderDto[] = [
  { id: pid(1), displayName: "Dr. Elena Navarro", role: "Dentist", locationIds: [SOUTH, WEST], isActive: true },
  { id: pid(2), displayName: "Dr. Marcus Chen", role: "Dentist", locationIds: [WEST], isActive: true },
  { id: pid(3), displayName: "Dr. Priya Shah", role: "Dentist", locationIds: [SOUTH], isActive: true },
  { id: pid(4), displayName: "Jasmine Reyes, RDH", role: "Hygienist", locationIds: [SOUTH], isActive: true },
  { id: pid(5), displayName: "Tyler Brooks, RDH", role: "Hygienist", locationIds: [WEST], isActive: true },
  { id: pid(6), displayName: "Angela Cruz, RDH", role: "Hygienist", locationIds: [SOUTH, WEST], isActive: true },
];

// ─── Fee guide (illustrative fees, CAD) ───────────────────────────────────

const sid = (n: number) => `5e7c0000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const S = (
  n: number,
  code: string,
  name: string,
  category: ServiceCategory,
  durationMinutes: number,
  fee: number,
  cdcpEligible: boolean,
  isActive = true,
): ServiceDto => ({
  id: sid(n),
  code,
  name,
  category,
  durationMinutes,
  fee,
  cdcpEligible,
  isActive,
  createdAtUtc: new Date(Date.UTC(2025, 0, 6, 16, n)).toISOString(),
});

const services: ServiceDto[] = [
  S(1, "01202", "Recall exam", "Preventive", 15, 48.5, true),
  S(2, "01103", "Comprehensive exam, new patient", "Preventive", 45, 121, true),
  S(3, "02142", "Bitewing X-rays, 2 films", "Preventive", 10, 42, true),
  S(4, "12101", "Topical fluoride treatment", "Preventive", 10, 25.75, true),
  S(5, "13401", "Airflow polishing", "Preventive", 20, 38, false),
  S(6, "14611", "Sports guard, custom", "Preventive", 30, 220, false),
  S(7, "14612", "Night guard for teeth grinding", "Preventive", 30, 480, false),
  S(8, "11111", "Scaling, 1 unit", "Periodontics", 15, 62, true),
  S(9, "11113", "Scaling, 3 units (cleaning)", "Periodontics", 45, 186, true),
  S(10, "PM001", "PerioMonitor gum screening", "Periodontics", 15, 35, false),
  S(11, "PP001", "Perio Protect custom trays", "Periodontics", 45, 650, false),
  S(12, "23111", "Tooth-coloured filling, 1 surface", "Restorative", 30, 165, true),
  S(13, "23112", "Tooth-coloured filling, 2 surfaces", "Restorative", 45, 215, true),
  S(14, "27211", "Porcelain crown", "Restorative", 90, 1250, false),
  S(15, "21111", "Amalgam filling, 1 surface (discontinued)", "Restorative", 30, 120, true, false),
  S(16, "33111", "Root canal therapy, 1 canal", "Endodontics", 90, 720, true),
  S(17, "71101", "Simple extraction", "OralSurgery", 30, 190, true),
  S(18, "51101", "Complete denture, upper", "Prosthodontics", 60, 1650, true),
  S(19, "62501", "Bridge, 3 units", "Prosthodontics", 120, 3400, false),
  S(20, "96202", "Professional teeth whitening, in-office", "Cosmetic", 90, 450, false),
  S(21, "96301", "Porcelain veneer, per tooth", "Cosmetic", 90, 1100, false),
  S(22, "BC001", "Bioclear restoration", "Cosmetic", 60, 380, false),
  S(23, "93101", "Invisalign consultation & 3D scan", "Orthodontics", 45, 0, false),
  S(24, "93201", "Invisalign comprehensive treatment", "Orthodontics", 60, 5800, false),
  S(25, "93301", "Invisalign progress check", "Orthodontics", 20, 0, false),
  S(26, "01205", "Emergency exam", "Emergency", 30, 75, true),
  S(27, "20111", "Palliative treatment for tooth pain", "Emergency", 30, 95, true),
];

// ─── Patients ─────────────────────────────────────────────────────────────

type P = Omit<PatientDto, "id" | "chartNumber" | "createdAtUtc" | "lastVisitAtUtc" | "nextAppointmentAtUtc" | "preferredLanguage" | "directBilling" | "insurerName" | "notes" | "email"> &
  Partial<Pick<PatientDto, "preferredLanguage" | "directBilling" | "insurerName" | "notes" | "email">>;

const patientRows: P[] = [
  { firstName: "Olivia", lastName: "Bennett", dateOfBirth: "1988-03-14", phone: "(780) 555-0101", email: "olivia.bennett@example.com", preferredLocationId: SOUTH, coverage: "PrivateInsurance", insurerName: "Alberta Blue Cross", directBilling: true },
  { firstName: "Miguel", lastName: "Santos", dateOfBirth: "1979-11-02", phone: "(780) 555-0102", email: "m.santos@example.com", preferredLocationId: WEST, coverage: "PrivateInsurance", insurerName: "Sun Life", directBilling: true, preferredLanguage: "Tagalog" },
  { firstName: "Ava", lastName: "Thompson", dateOfBirth: "2016-07-21", phone: "(780) 555-0103", email: "thompson.family@example.com", preferredLocationId: SOUTH, coverage: "Cdcp", notes: "Child patient. Parent: Rachel Thompson." },
  { firstName: "Noah", lastName: "Kowalski", dateOfBirth: "1951-01-30", phone: "(780) 555-0104", preferredLocationId: WEST, coverage: "Cdcp", notes: "Senior. Prefers morning appointments; hard of hearing — speak clearly." },
  { firstName: "Isabella", lastName: "Dela Cruz", dateOfBirth: "1993-09-09", phone: "(780) 555-0105", email: "isa.delacruz@example.com", preferredLocationId: SOUTH, coverage: "PrivateInsurance", insurerName: "Manulife", directBilling: true, preferredLanguage: "Tagalog", notes: "Invisalign in progress (aligner set 9 of 22)." },
  { firstName: "Liam", lastName: "O'Connor", dateOfBirth: "1985-05-17", phone: "(780) 555-0106", email: "liam.oconnor@example.com", preferredLocationId: WEST, coverage: "SelfPay" },
  { firstName: "Sophia", lastName: "Nguyen", dateOfBirth: "1990-12-01", phone: "(780) 555-0107", email: "sophia.n@example.com", preferredLocationId: SOUTH, coverage: "PrivateInsurance", insurerName: "Canada Life", directBilling: false, notes: "Plan does not allow assignment — patient pays and claims." },
  { firstName: "Ethan", lastName: "Patel", dateOfBirth: "2009-02-11", phone: "(780) 555-0108", preferredLocationId: WEST, coverage: "PrivateInsurance", insurerName: "Alberta Blue Cross", directBilling: true, notes: "Plays hockey — sports guard fitted last season." },
  { firstName: "Mia", lastName: "Garcia", dateOfBirth: "1972-08-25", phone: "(780) 555-0109", email: "mia.garcia@example.com", preferredLocationId: SOUTH, coverage: "Cdcp" },
  { firstName: "Lucas", lastName: "Martin", dateOfBirth: "1998-04-04", phone: "(780) 555-0110", email: "lucas.martin@example.com", preferredLocationId: WEST, coverage: "SelfPay", notes: "Interested in whitening before wedding in spring." },
  { firstName: "Charlotte", lastName: "Wright", dateOfBirth: "1965-10-19", phone: "(780) 555-0111", email: "c.wright@example.com", preferredLocationId: SOUTH, coverage: "PrivateInsurance", insurerName: "Green Shield Canada", directBilling: true },
  { firstName: "Benjamin", lastName: "Lee", dateOfBirth: "1982-06-08", phone: "(780) 555-0112", email: "ben.lee@example.com", preferredLocationId: WEST, coverage: "PrivateInsurance", insurerName: "Sun Life", directBilling: true },
  { firstName: "Amelia", lastName: "Reyes-Villanueva", dateOfBirth: "1959-03-03", phone: "(780) 555-0113", preferredLocationId: SOUTH, coverage: "Cdcp", preferredLanguage: "Tagalog", notes: "Upper denture fitted; follow-up for sore spots." },
  { firstName: "Henry", lastName: "Fraser", dateOfBirth: "1946-12-24", phone: "(780) 555-0114", preferredLocationId: WEST, coverage: "Cdcp" },
  { firstName: "Harper", lastName: "Mitchell", dateOfBirth: "2019-05-30", phone: "(780) 555-0115", email: "mitchell.home@example.com", preferredLocationId: SOUTH, coverage: "Cdcp", notes: "First visits — keep them short and fun." },
  { firstName: "Daniel", lastName: "Kim", dateOfBirth: "1991-01-15", phone: "(780) 555-0116", email: "daniel.kim@example.com", preferredLocationId: WEST, coverage: "PrivateInsurance", insurerName: "Desjardins Insurance", directBilling: true },
  { firstName: "Evelyn", lastName: "Campbell", dateOfBirth: "1977-07-07", phone: "(780) 555-0117", email: "evelyn.campbell@example.com", preferredLocationId: SOUTH, coverage: "SelfPay", notes: "Financing via Beautifi for crown + bridge." },
  { firstName: "Jacob", lastName: "Mendoza", dateOfBirth: "1987-09-27", phone: "(780) 555-0118", email: "jacob.mendoza@example.com", preferredLocationId: WEST, coverage: "PrivateInsurance", insurerName: "Manulife", directBilling: true, preferredLanguage: "Tagalog" },
  { firstName: "Abigail", lastName: "Scott", dateOfBirth: "2003-11-11", phone: "(780) 555-0119", email: "abby.scott@example.com", preferredLocationId: SOUTH, coverage: "PrivateInsurance", insurerName: "Alberta Blue Cross", directBilling: true },
  { firstName: "Alexander", lastName: "Wojciechowski-Hendricks", dateOfBirth: "1969-02-28", phone: "(780) 555-0120", email: "alex.wh@example.com", preferredLocationId: WEST, coverage: "SelfPay", preferredLanguage: "Other", notes: "Prefers Polish-speaking interpreter when available." },
  { firstName: "Grace", lastName: "Tan", dateOfBirth: "1995-08-13", phone: "(780) 555-0121", email: "grace.tan@example.com", preferredLocationId: SOUTH, coverage: "PrivateInsurance", insurerName: "Canada Life", directBilling: true },
  { firstName: "William", lastName: "Brown", dateOfBirth: "1958-04-16", phone: "(780) 555-0122", preferredLocationId: WEST, coverage: "Cdcp" },
  { firstName: "Chloe", lastName: "Aquino", dateOfBirth: "2012-10-05", phone: "(780) 555-0123", email: "aquino.family@example.com", preferredLocationId: SOUTH, coverage: "PrivateInsurance", insurerName: "Sun Life", directBilling: true, preferredLanguage: "Tagalog" },
  { firstName: "Samuel", lastName: "Wilson", dateOfBirth: "1983-12-19", phone: "(780) 555-0124", email: "sam.wilson@example.com", preferredLocationId: WEST, coverage: "SelfPay" },
];

// A larger, plainer population so the schedule doesn't revolve around the 24 hand-written records.
const FIRST = ["James", "Emma", "Ryan", "Hailey", "Nathan", "Megan", "Carlos", "Andrea", "Paolo", "Kristine", "Arjun", "Leah", "Owen", "Zoe", "Marco", "Bianca", "Tristan", "Nicole", "Jasper", "Camille", "Derek", "Faith", "Ian", "Joy", "Kyle", "Lorraine", "Mark", "Nina", "Oscar", "Paula"];
const LAST = ["Anderson", "Bautista", "Clarke", "Dumas", "Esguerra", "Fischer", "Gill", "Hughes", "Ibarra", "Jensen", "Khan", "Lacson", "MacDonald", "Novak", "Ortega", "Pascual", "Quinn", "Ramos", "Sandhu", "Tremblay", "Usman", "Vasquez", "Ward", "Yap", "Zielinski"];
const INSURERS = ["Alberta Blue Cross", "Sun Life", "Manulife", "Canada Life", "Green Shield Canada", "Desjardins Insurance"];

function generatedPatients(count: number): P[] {
  const rand = mulberry32(780555);
  const rows: P[] = [];
  for (let i = 0; i < count; i++) {
    const firstName = FIRST[Math.floor(rand() * FIRST.length)];
    const lastName = LAST[Math.floor(rand() * LAST.length)];
    const year = 1945 + Math.floor(rand() * 75);
    const roll = rand();
    const coverage = roll < 0.5 ? "PrivateInsurance" : roll < 0.78 ? "Cdcp" : "SelfPay";
    rows.push({
      firstName,
      lastName,
      dateOfBirth: `${year}-${String(1 + Math.floor(rand() * 12)).padStart(2, "0")}-${String(1 + Math.floor(rand() * 28)).padStart(2, "0")}`,
      phone: `(${i % 2 === 0 ? "587" : "825"}) 555-01${String(i % 100).padStart(2, "0")}`,
      email: rand() < 0.75 ? `${firstName}.${lastName}${i}@example.com`.toLowerCase() : null,
      preferredLocationId: rand() < 0.5 ? SOUTH : WEST,
      coverage,
      insurerName: coverage === "PrivateInsurance" ? INSURERS[Math.floor(rand() * INSURERS.length)] : null,
      directBilling: coverage === "PrivateInsurance" && rand() < 0.85,
      preferredLanguage: rand() < 0.18 ? "Tagalog" : "English",
    });
  }
  return rows;
}

const patients: PatientDto[] = [...patientRows, ...generatedPatients(120)].map((row, i) => ({
  id: `9a7e0000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
  chartNumber: `MD-${String(10240 + i * 7).padStart(5, "0")}`,
  email: null,
  insurerName: null,
  notes: null,
  preferredLanguage: "English",
  directBilling: false,
  ...row,
  createdAtUtc: new Date(Date.UTC(2023, (i * 5) % 12, 1 + ((i * 7) % 27), 17, 0)).toISOString(),
  lastVisitAtUtc: null,
  nextAppointmentAtUtc: null,
}));

// ─── Generated schedule ───────────────────────────────────────────────────

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DENTIST_MIX = [1, 2, 12, 13, 12, 14, 16, 17, 20, 21, 22, 23, 25, 25, 26, 27, 18];
const HYGIENIST_MIX = [9, 9, 9, 8, 1, 3, 4, 5, 10, 10, 11];
const NOTES = [
  "Sensitive to cold on lower left.",
  "Bring insurance card — new employer plan.",
  "Asked about whitening.",
  "Needs pre-medication per physician.",
  ...Array<null>(14).fill(null),
];

function minutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function locationFor(provider: ProviderDto, day: Date) {
  if (provider.locationIds.length === 1) return provider.locationIds[0];
  return day.getDay() % 2 === 0 ? provider.locationIds[0] : provider.locationIds[1];
}

function generateAppointments(today: Date): AppointmentDto[] {
  const rand = mulberry32(20180901);
  const pick = <T,>(list: readonly T[]) => list[Math.floor(rand() * list.length)];
  const now = Date.now();
  const result: AppointmentDto[] = [];
  let n = 0;

  // One visit per patient per week at most: a believable recall cadence.
  const lastVisitDay = new Map<string, number>();
  const pickPatient = (offset: number) => {
    for (let attempt = 0; attempt < 12; attempt++) {
      const candidate = pick(patients);
      const last = lastVisitDay.get(candidate.id);
      if (last === undefined || Math.abs(offset - last) >= 7) {
        lastVisitDay.set(candidate.id, offset);
        return candidate;
      }
    }
    return null;
  };

  for (let offset = -14; offset <= 10; offset++) {
    const day = new Date(today);
    day.setDate(day.getDate() + offset);
    const hours = HOURS.find((h) => h.dayOfWeek === day.getDay());
    if (!hours) continue;
    const open = minutes(hours.opensAt);
    const close = minutes(hours.closesAt);

    for (const provider of providers) {
      const locationId = locationFor(provider, day);
      // The far future is thinner than the near future, like a real book.
      const fill = offset > 5 ? 0.3 : offset > 1 ? 0.5 : 0.68;
      let cursor = open;
      while (cursor < close) {
        const service = services[(pick(provider.role === "Dentist" ? DENTIST_MIX : HYGIENIST_MIX)) - 1];
        const end = cursor + service.durationMinutes;
        if (end > close) break;
        if (rand() < fill) {
          const start = new Date(day);
          start.setHours(0, cursor, 0, 0);
          const endsAt = start.getTime() + service.durationMinutes * 60_000;
          const patient = pickPatient(offset);
          if (!patient) {
            cursor = end;
            continue;
          }
          const roll = rand();
          let status: AppointmentStatus;
          if (endsAt < now) status = roll < 0.86 ? "Completed" : roll < 0.93 ? "NoShow" : "Cancelled";
          else if (start.getTime() <= now) status = "CheckedIn";
          else if (offset <= 1) status = roll < 0.06 ? "Cancelled" : roll < 0.7 ? "Confirmed" : "Scheduled";
          else status = roll < 0.04 ? "Cancelled" : roll < 0.25 ? "Confirmed" : "Scheduled";
          n++;
          result.push({
            id: `a1b0${String(n).padStart(4, "0")}-0000-4000-8000-000000000000`,
            patientId: patient.id,
            patientName: `${patient.firstName} ${patient.lastName}`,
            locationId,
            providerId: provider.id,
            providerName: provider.displayName,
            serviceId: service.id,
            serviceCode: service.code,
            serviceName: service.name,
            startsAtUtc: start.toISOString(),
            durationMinutes: service.durationMinutes,
            status,
            isEmergency: service.category === "Emergency",
            notes: pick(NOTES),
            cancellationReason: status === "Cancelled" ? pick(["Patient is sick.", "Work conflict, will call back.", "Rescheduled by phone."]) : null,
            createdAtUtc: new Date(start.getTime() - (3 + Math.floor(rand() * 20)) * 86_400_000).toISOString(),
          });
        }
        cursor = end + (rand() < 0.35 ? 15 : 0);
      }
    }
  }
  return result;
}

function hoursAgo(h: number) {
  return new Date(Date.now() - h * 3_600_000).toISOString();
}

function generateRequests(appointments: readonly AppointmentDto[]): BookingRequestDto[] {
  const upcoming = (patientId: string) =>
    appointments.find((a) => a.patientId === patientId && new Date(a.startsAtUtc).getTime() > Date.now() && (a.status === "Scheduled" || a.status === "Confirmed"));
  const booked1 = patients[9];
  const booked2 = patients[4];
  const rid = (n: number) => `b0c0${String(n).padStart(4, "0")}-0000-4000-8000-000000000000`;
  const base = { email: null, serviceCategory: null, preferredTimes: null, patientId: null, appointmentId: null, declineReason: null } as const;
  return [
    { ...base, id: rid(1), number: "BR-1187", fullName: "Kevin Douglas", phone: "(780) 555-0141", email: "kevin.d@example.com", preferredLocationId: WEST, reason: "Cracked a molar on a popcorn kernel last night, sharp pain when chewing.", serviceCategory: "Emergency", preferredTimes: "Today, any time", isNewPatient: true, isEmergency: true, coverage: "PrivateInsurance", source: "Website", status: "New", createdAtUtc: hoursAgo(0.6) },
    { ...base, id: rid(2), number: "BR-1186", fullName: "Rosa Lim", phone: "(780) 555-0142", preferredLocationId: SOUTH, reason: "Swelling on the lower right side since yesterday.", serviceCategory: "Emergency", preferredTimes: "As soon as possible", isNewPatient: true, isEmergency: true, coverage: "Cdcp", source: "Phone", status: "New", createdAtUtc: hoursAgo(2.2) },
    { ...base, id: rid(3), number: "BR-1185", fullName: "Hannah Becker", phone: "(780) 555-0143", email: "hannah.becker@example.com", preferredLocationId: SOUTH, reason: "Would like an Invisalign consultation. I have mild crowding on the bottom teeth.", serviceCategory: "Orthodontics", preferredTimes: "Weekday evenings after 5 pm", isNewPatient: true, isEmergency: false, coverage: "PrivateInsurance", source: "Website", status: "New", createdAtUtc: hoursAgo(5) },
    { ...base, id: rid(4), number: "BR-1184", fullName: "Joseph Villanueva", phone: "(780) 555-0144", preferredLocationId: WEST, reason: "Family checkup for me, my wife and our two kids. Do you accept CDCP?", serviceCategory: "Preventive", preferredTimes: "Saturday morning", isNewPatient: true, isEmergency: false, coverage: "Cdcp", source: "GoogleBusiness", status: "New", createdAtUtc: hoursAgo(9) },
    { ...base, id: rid(5), number: "BR-1183", fullName: patients[0].firstName + " " + patients[0].lastName, phone: patients[0].phone, email: patients[0].email, preferredLocationId: SOUTH, reason: "Due for my cleaning, also my gums bleed a bit when flossing.", serviceCategory: "Periodontics", preferredTimes: "Fridays", isNewPatient: false, isEmergency: false, coverage: "PrivateInsurance", source: "Website", status: "New", createdAtUtc: hoursAgo(20) },
    { ...base, id: rid(6), number: "BR-1182", fullName: "Theresa Okafor", phone: "(780) 555-0146", email: "t.okafor@example.com", preferredLocationId: WEST, reason: "Interested in teeth whitening. How long does in-office whitening take?", serviceCategory: "Cosmetic", preferredTimes: "Sunday", isNewPatient: true, isEmergency: false, coverage: "SelfPay", source: "Website", status: "Contacted", createdAtUtc: hoursAgo(28), updatedAtUtc: hoursAgo(24) },
    { ...base, id: rid(7), number: "BR-1181", fullName: "Patrick Mercer", phone: "(780) 555-0147", preferredLocationId: SOUTH, reason: "Lost a filling, no pain yet.", serviceCategory: "Restorative", preferredTimes: "Tuesday or Wednesday after 3 pm", isNewPatient: true, isEmergency: false, coverage: "SelfPay", source: "Phone", status: "Contacted", createdAtUtc: hoursAgo(40), updatedAtUtc: hoursAgo(38) },
    { ...base, id: rid(8), number: "BR-1180", fullName: `${booked1.firstName} ${booked1.lastName}`, phone: booked1.phone, email: booked1.email, preferredLocationId: WEST, reason: "Whitening appointment before my wedding.", serviceCategory: "Cosmetic", isNewPatient: false, isEmergency: false, coverage: booked1.coverage, source: "Website", status: "Booked", patientId: booked1.id, appointmentId: upcoming(booked1.id)?.id ?? null, createdAtUtc: hoursAgo(60), updatedAtUtc: hoursAgo(55) },
    { ...base, id: rid(9), number: "BR-1179", fullName: `${booked2.firstName} ${booked2.lastName}`, phone: booked2.phone, email: booked2.email, preferredLocationId: SOUTH, reason: "Aligner progress check, set 9.", serviceCategory: "Orthodontics", isNewPatient: false, isEmergency: false, coverage: booked2.coverage, source: "Phone", status: "Booked", patientId: booked2.id, appointmentId: upcoming(booked2.id)?.id ?? null, createdAtUtc: hoursAgo(80), updatedAtUtc: hoursAgo(79) },
    { ...base, id: rid(10), number: "BR-1178", fullName: "Test Test", phone: "000", preferredLocationId: SOUTH, reason: "test", isNewPatient: true, isEmergency: false, coverage: "SelfPay", source: "Website", status: "Declined", declineReason: "Spam / test submission.", createdAtUtc: hoursAgo(100), updatedAtUtc: hoursAgo(99) },
    { ...base, id: rid(11), number: "BR-1177", fullName: "Gordon Fairweather", phone: "(780) 555-0149", preferredLocationId: WEST, reason: "Need a dental implant consultation.", serviceCategory: "OralSurgery", isNewPatient: true, isEmergency: false, coverage: "PrivateInsurance", source: "GoogleBusiness", status: "Declined", declineReason: "Implants not offered — referred to an oral surgeon.", createdAtUtc: hoursAgo(130), updatedAtUtc: hoursAgo(120) },
  ];
}

export type ClinicSeed = {
  locations: LocationDto[];
  providers: ProviderDto[];
  services: ServiceDto[];
  patients: PatientDto[];
  appointments: AppointmentDto[];
  bookingRequests: BookingRequestDto[];
};

/** Builds the seed for the given clinic day (local midnight). */
export function buildClinicSeed(today: Date = new Date()): ClinicSeed {
  const day = new Date(today);
  day.setHours(0, 0, 0, 0);
  const appointments = generateAppointments(day);
  return {
    locations,
    providers,
    services,
    patients,
    appointments,
    bookingRequests: generateRequests(appointments),
  };
}

export const clinicSeed: ClinicSeed = buildClinicSeed();
