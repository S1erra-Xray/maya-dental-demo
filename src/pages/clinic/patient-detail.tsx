import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  History,
  Languages,
  Mail,
  MapPin,
  Pencil,
  Phone,
  StickyNote,
  UserX,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { getPatientById, listLocations, searchAppointments, type AppointmentDto } from "@/api/clinic";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  EntityDetailAvatar,
  EntityDetailBack,
  EntityDetailHero,
  EntityDetailMeta,
  EntityDetailSection,
  EntityDetailStat,
  EntityEmpty,
  EntityStatusBadge,
  ErrorBand,
} from "@/components/list";
import { describe, formatDate, formatDateTimeMono } from "@/lib/list-helpers";
import { AppointmentEditorDialog, type AppointmentEditorState } from "./appointment-editor";
import {
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_STATUS_TONE,
  COVERAGE_LABEL,
  COVERAGE_TONE,
  LANGUAGE_LABEL,
  ageFrom,
  toDateInput,
} from "./clinic-shared";
import { PatientEditorDialog, type PatientEditorState } from "./patient-editor";

export function PatientDetailPage() {
  const { t } = useTranslation("clinic");
  const { id = "" } = useParams();
  const [patientEditor, setPatientEditor] = useState<PatientEditorState>({ mode: "closed" });
  const [appointmentEditor, setAppointmentEditor] = useState<AppointmentEditorState>({ mode: "closed" });

  const query = useQuery({ queryKey: ["clinic", "patient", id], queryFn: () => getPatientById(id) });
  const visitsQuery = useQuery({
    queryKey: ["clinic", "appointments", { patientId: id }],
    queryFn: () => searchAppointments({ patientId: id, pageSize: 200, sortBy: "startsAtUtc", sortDir: "desc" }),
  });
  const locationsQuery = useQuery({ queryKey: ["clinic", "locations"], queryFn: listLocations, staleTime: Infinity });

  const back = <EntityDetailBack to="/patients" label={t("patient.back")} />;

  if (query.isLoading) {
    return (
      <div>
        {back}
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }
  if (query.isError || !query.data) {
    return (
      <div className="space-y-4">
        {back}
        <ErrorBand message={describe(query.error)} />
      </div>
    );
  }

  const p = query.data;
  const name = `${p.firstName} ${p.lastName}`;
  const visits = visitsQuery.data?.items ?? [];
  const now = Date.now();
  const upcoming = visits
    .filter((a) => new Date(a.startsAtUtc).getTime() >= now && a.status !== "Cancelled" && a.status !== "NoShow")
    .reverse();
  const past = visits.filter((a) => !upcoming.includes(a));
  const completed = visits.filter((a) => a.status === "Completed").length;
  const noShows = visits.filter((a) => a.status === "NoShow").length;
  const location = (locationsQuery.data ?? []).find((l) => l.id === p.preferredLocationId);

  return (
    <div className="space-y-5">
      {back}
      <EntityDetailHero
        avatar={<EntityDetailAvatar name={name} />}
        title={name}
        badges={
          <>
            <EntityStatusBadge tone={COVERAGE_TONE[p.coverage]}>{t(COVERAGE_LABEL[p.coverage])}</EntityStatusBadge>
            {p.preferredLanguage !== "English" && (
              <EntityStatusBadge tone="info">
                <Languages className="mr-1 size-3" />
                {t(LANGUAGE_LABEL[p.preferredLanguage])}
              </EntityStatusBadge>
            )}
          </>
        }
        subtitle={t("patient.subtitle", { chart: p.chartNumber, dob: formatDate(`${p.dateOfBirth}T12:00:00`), count: ageFrom(p.dateOfBirth) })}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setPatientEditor({ mode: "edit", patient: p })}>
              <Pencil className="size-3.5" />
              {t("action.edit")}
            </Button>
            <Button
              size="sm"
              onClick={() => setAppointmentEditor({ mode: "create", date: toDateInput(new Date()), patientId: p.id })}
            >
              <CalendarPlus className="size-3.5" />
              {t("action.bookVisit")}
            </Button>
          </>
        }
        stats={
          <>
            <EntityDetailStat icon={CheckCircle2} value={completed} label={t("patient.stat.completed")} tone="success" />
            <EntityDetailStat icon={UserX} value={noShows} label={t("patient.stat.noShows")} tone={noShows > 0 ? "danger" : "default"} />
            <EntityDetailStat icon={History} value={formatDate(p.lastVisitAtUtc)} label={t("patient.stat.lastVisit")} />
            <EntityDetailStat icon={CalendarClock} value={formatDate(p.nextAppointmentAtUtc)} label={t("patient.stat.nextVisit")} tone="primary" />
          </>
        }
        meta={
          <>
            <EntityDetailMeta icon={Phone}>{p.phone}</EntityDetailMeta>
            {p.email && <EntityDetailMeta icon={Mail}>{p.email}</EntityDetailMeta>}
            <EntityDetailMeta icon={MapPin}>{location?.name ?? "—"}</EntityDetailMeta>
            {p.insurerName && (
              <EntityDetailMeta icon={BadgeCheck}>
                {p.directBilling ? t("patient.insurerDirect", { insurer: p.insurerName }) : t("patient.insurerNoDirect", { insurer: p.insurerName })}
              </EntityDetailMeta>
            )}
          </>
        }
      />

      {p.notes && (
        <EntityDetailSection title={t("patient.notes")} icon={StickyNote}>
          <p className="whitespace-pre-line text-[13.5px]">{p.notes}</p>
        </EntityDetailSection>
      )}

      <EntityDetailSection title={t("patient.upcoming")} icon={CalendarClock} padded={false}>
        {upcoming.length === 0 ? (
          <p className="px-5 py-4 text-[13px] text-[var(--color-muted-foreground)]">{t("patient.noUpcoming")}</p>
        ) : (
          <VisitList visits={upcoming} />
        )}
      </EntityDetailSection>

      <EntityDetailSection title={t("patient.history")} icon={History} padded={false}>
        {visitsQuery.isError ? (
          <div className="p-4"><ErrorBand message={describe(visitsQuery.error)} /></div>
        ) : past.length === 0 ? (
          <EntityEmpty icon={History} title={t("patient.noHistory")} />
        ) : (
          <VisitList visits={past} />
        )}
      </EntityDetailSection>

      <PatientEditorDialog state={patientEditor} onClose={() => setPatientEditor({ mode: "closed" })} />
      <AppointmentEditorDialog state={appointmentEditor} onClose={() => setAppointmentEditor({ mode: "closed" })} />
    </div>
  );
}

function VisitList({ visits }: { visits: AppointmentDto[] }) {
  const { t } = useTranslation("clinic");
  return (
    <ul>
      {visits.map((a, i) => (
        <li
          key={a.id}
          className={`grid grid-cols-[190px_minmax(0,1fr)_110px] items-center gap-3 px-5 py-2.5 text-[13px] ${i < visits.length - 1 ? "border-b border-[oklch(from_var(--color-border)_l_c_h_/_0.3)]" : ""}`}
        >
          <span className="font-mono text-[11.5px] tabular-nums text-[var(--color-muted-foreground)]">{formatDateTimeMono(a.startsAtUtc)}</span>
          <div className="min-w-0">
            <div className="truncate">
              {a.serviceName}
              {a.isEmergency && <span className="ml-1.5 text-[11px] text-[var(--color-destructive)]">{t("badge.emergency")}</span>}
            </div>
            <div className="truncate text-[11.5px] text-[var(--color-muted-foreground)]">
              {a.providerName}
              {a.cancellationReason ? ` · ${a.cancellationReason}` : ""}
            </div>
          </div>
          <EntityStatusBadge tone={APPOINTMENT_STATUS_TONE[a.status]} withDot>
            {t(APPOINTMENT_STATUS_LABEL[a.status])}
          </EntityStatusBadge>
        </li>
      ))}
    </ul>
  );
}
