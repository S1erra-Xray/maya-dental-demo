import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  MoreHorizontal,
  Plus,
  Siren,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { ParseKeys } from "i18next";
import {
  changeAppointmentStatus,
  listLocations,
  listProviders,
  searchAppointments,
  searchServices,
  type AppointmentDto,
  type AppointmentStatus,
  type ChangeAppointmentStatusInput,
} from "@/api/clinic";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Combobox,
  EntityDetailStat,
  EntityEmpty,
  EntityFilterPill,
  EntityListCard,
  EntityListHeader,
  EntityListLoading,
  EntityListRow,
  EntityPageHeader,
  EntityStatusBadge,
  ErrorBand,
  Field,
} from "@/components/list";
import { describe, formatMoney } from "@/lib/list-helpers";
import { AppointmentEditorDialog, type AppointmentEditorState } from "./appointment-editor";
import {
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_STATUS_TONE,
  CURRENCY,
  TEXTAREA_CLASS,
  addDays,
  endOf,
  formatDayLong,
  formatTime,
  hoursFor,
  parseDateInput,
  toDateInput,
} from "./clinic-shared";

const COLUMNS = "grid-cols-[132px_minmax(0,1.3fr)_minmax(0,1.2fr)_minmax(0,1fr)_120px_150px]";

/** The one forward step offered as a button per status. */
const NEXT_STEP: Partial<Record<AppointmentStatus, { status: AppointmentStatus; label: ParseKeys<"clinic"> }>> = {
  Scheduled: { status: "Confirmed", label: "action.confirm" },
  Confirmed: { status: "CheckedIn", label: "action.checkIn" },
  CheckedIn: { status: "Completed", label: "action.complete" },
};

const NOT_BOOKED: readonly AppointmentStatus[] = ["Cancelled", "NoShow"];

export function SchedulePage() {
  const { t } = useTranslation("clinic");
  const [params, setParams] = useSearchParams();
  const today = toDateInput(new Date());
  const date = params.get("date") || today;
  const [locationId, setLocationId] = useState<string | null>(null);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [editor, setEditor] = useState<AppointmentEditorState>({ mode: "closed" });
  const [cancelling, setCancelling] = useState<AppointmentDto | null>(null);

  const setDate = (next: string) => {
    const copy = new URLSearchParams(params);
    if (next === today) copy.delete("date");
    else copy.set("date", next);
    setParams(copy, { replace: true });
  };

  const locationsQuery = useQuery({ queryKey: ["clinic", "locations"], queryFn: listLocations, staleTime: Infinity });
  const providersQuery = useQuery({ queryKey: ["clinic", "providers"], queryFn: () => listProviders(), staleTime: Infinity });
  const servicesQuery = useQuery({
    queryKey: ["clinic", "services", { pageSize: 200 }],
    queryFn: () => searchServices({ pageSize: 200 }),
  });

  const fromUtc = parseDateInput(date).toISOString();
  const toUtc = parseDateInput(addDays(date, 1)).toISOString();
  const query = useQuery({
    queryKey: ["clinic", "appointments", { fromUtc, toUtc, locationId, providerId }],
    queryFn: () => searchAppointments({ fromUtc, toUtc, locationId, providerId, pageSize: 500 }),
    placeholderData: keepPreviousData,
  });

  const queryClient = useQueryClient();
  const statusMutation = useMutation({
    mutationFn: (input: ChangeAppointmentStatusInput) => changeAppointmentStatus(input),
    onSuccess: (_id, input) => {
      toast.success(t("toast.statusChanged", { status: t(APPOINTMENT_STATUS_LABEL[input.status]) }));
      void queryClient.invalidateQueries({ queryKey: ["clinic", "appointments"] });
      void queryClient.invalidateQueries({ queryKey: ["clinic", "patients"] });
      void queryClient.invalidateQueries({ queryKey: ["clinic", "patient"] });
    },
    onError: (err) => toast.error(t("toast.statusFailed"), { description: describe(err) }),
  });

  const locations = locationsQuery.data ?? [];
  const items = query.data?.items ?? [];
  const feeById = useMemo(
    () => new Map((servicesQuery.data?.items ?? []).map((s) => [s.id, s.fee])),
    [servicesQuery.data],
  );
  const providerOptions = (providersQuery.data ?? [])
    .filter((p) => !locationId || p.locationIds.includes(locationId))
    .map((p) => ({ value: p.id, label: p.displayName }));
  const locationName = (id: string) => locations.find((l) => l.id === id)?.name ?? "—";

  const booked = items.filter((a) => !NOT_BOOKED.includes(a.status));
  const stats = {
    booked: booked.length,
    confirmed: booked.filter((a) => a.status === "Confirmed").length,
    arrived: booked.filter((a) => a.status === "CheckedIn" || a.status === "Completed").length,
    emergencies: booked.filter((a) => a.isEmergency).length,
    value: booked.reduce((sum, a) => sum + (feeById.get(a.serviceId) ?? 0), 0),
  };

  const dayHours = locationId ? hoursFor(locations.find((l) => l.id === locationId), date) : hoursFor(locations[0], date);

  return (
    <div className="space-y-4 sm:space-y-6">
      <EntityPageHeader
        icon={CalendarDays}
        title={t("schedule.title")}
        total={query.data?.totalCount ?? null}
        description={t("schedule.description")}
      >
        <Button
          onClick={() => setEditor({ mode: "create", date, locationId })}
          className="h-9 gap-1.5 rounded-lg px-4 text-[13px] font-semibold"
        >
          <Plus className="size-4" />
          {t("action.newAppointment")}
        </Button>
      </EntityPageHeader>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-1">
          <Button variant="outline" size="icon-xs" aria-label={t("schedule.prevDay")} onClick={() => setDate(addDays(date, -1))}>
            <ChevronLeft />
          </Button>
          <Button variant={date === today ? "soft" : "outline"} size="xs" onClick={() => setDate(today)}>
            {t("schedule.today")}
          </Button>
          <Button variant="outline" size="icon-xs" aria-label={t("schedule.nextDay")} onClick={() => setDate(addDays(date, 1))}>
            <ChevronRight />
          </Button>
        </div>
        <Input
          type="date"
          aria-label={t("schedule.pickDay")}
          value={date}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          className="h-8 w-[150px]"
        />
        <div className="min-w-0">
          <div className="font-display text-[15px] font-semibold tracking-tight">{formatDayLong(date)}</div>
          <div className="text-[11.5px] text-[var(--color-muted-foreground)]">
            {dayHours ? t("schedule.openHours", { opens: dayHours.opensAt, closes: dayHours.closesAt }) : t("schedule.closed")}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <EntityFilterPill<string | null>
          label={t("filter.location")}
          value={locationId}
          onChange={(next) => {
            setLocationId(next);
            setProviderId(null);
          }}
          options={[{ value: null, label: t("filter.allLocations") }, ...locations.map((l) => ({ value: l.id, label: l.name }))]}
        />
        <Combobox
          variant="filter"
          label={t("filter.provider")}
          value={providerId}
          onChange={setProviderId}
          clearable
          options={providerOptions}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <EntityDetailStat icon={CalendarCheck} value={stats.booked} label={t("schedule.stat.booked")} tone="primary" />
        <EntityDetailStat icon={ClipboardCheck} value={stats.confirmed} label={t("schedule.stat.confirmed")} />
        <EntityDetailStat icon={UserCheck} value={stats.arrived} label={t("schedule.stat.arrived")} tone="success" />
        <EntityDetailStat icon={Siren} value={stats.emergencies} label={t("schedule.stat.emergencies")} tone={stats.emergencies > 0 ? "danger" : "default"} />
        <EntityDetailStat icon={CircleDollarSign} value={formatMoney(stats.value, CURRENCY)} label={t("schedule.stat.value")} tone="warning" />
      </div>

      {query.isError && <ErrorBand message={describe(query.error)} />}

      {query.isLoading && items.length === 0 ? (
        <EntityListLoading desktopColumns={COLUMNS} />
      ) : items.length === 0 ? (
        <EntityEmpty
          icon={CalendarDays}
          title={t("schedule.empty.title")}
          body={dayHours ? t("schedule.empty.body") : t("schedule.empty.closedBody")}
          action={
            <Button onClick={() => setEditor({ mode: "create", date, locationId })} className="h-9 rounded-lg px-4 text-[13px]">
              <Plus className="mr-1.5 size-4" />
              {t("action.newAppointment")}
            </Button>
          }
        />
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {items.map((a) => (
              <MobileCard
                key={a.id}
                appointment={a}
                locationName={locationName(a.locationId)}
                pending={statusMutation.isPending}
                onStep={(status) => statusMutation.mutate({ id: a.id, status })}
                onEdit={() => setEditor({ mode: "edit", appointment: a })}
                onCancel={() => setCancelling(a)}
              />
            ))}
          </div>
          <EntityListCard className="hidden md:block">
            <EntityListHeader className={COLUMNS}>
              <span>{t("col.time")}</span>
              <span>{t("col.patient")}</span>
              <span>{t("col.service")}</span>
              <span>{t("col.provider")}</span>
              <span>{t("col.status")}</span>
              <span />
            </EntityListHeader>
            {items.map((a, i) => (
              <EntityListRow
                key={a.id}
                className={COLUMNS}
                isLast={i === items.length - 1}
                dim={NOT_BOOKED.includes(a.status) || a.status === "Completed"}
              >
                <div className="whitespace-nowrap font-mono text-[12.5px] tabular-nums">
                  <div className="font-semibold">{formatTime(a.startsAtUtc)}</div>
                  <div className="text-[11px] text-[var(--color-muted-foreground)]">
                    {formatTime(endOf(a.startsAtUtc, a.durationMinutes))} · {t("unit.minutes", { count: a.durationMinutes })}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Link
                      to={`/patients/${a.patientId}`}
                      className="truncate text-[14px] font-medium hover:text-[var(--color-primary)] hover:underline"
                    >
                      {a.patientName}
                    </Link>
                    {a.isEmergency && (
                      <AlertTriangle aria-label={t("badge.emergency")} className="size-3.5 shrink-0 text-[var(--color-destructive)]" />
                    )}
                  </div>
                  {a.status === "Cancelled" && a.cancellationReason ? (
                    <div className="truncate text-[12px] text-[var(--color-muted-foreground)]" title={a.cancellationReason}>
                      {t("schedule.cancelledBecause", { reason: a.cancellationReason })}
                    </div>
                  ) : a.notes ? (
                    <div className="truncate text-[12px] text-[var(--color-muted-foreground)]" title={a.notes}>{a.notes}</div>
                  ) : null}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[13px]">{a.serviceName}</div>
                  <code className="font-mono text-[11px] text-[var(--color-muted-foreground)]">{a.serviceCode}</code>
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[13px]">{a.providerName}</div>
                  <div className="truncate text-[11.5px] text-[var(--color-muted-foreground)]">{locationName(a.locationId)}</div>
                </div>
                <EntityStatusBadge tone={APPOINTMENT_STATUS_TONE[a.status]} withDot>
                  {t(APPOINTMENT_STATUS_LABEL[a.status])}
                </EntityStatusBadge>
                <RowActions
                  appointment={a}
                  pending={statusMutation.isPending}
                  onStep={(status) => statusMutation.mutate({ id: a.id, status })}
                  onEdit={() => setEditor({ mode: "edit", appointment: a })}
                  onCancel={() => setCancelling(a)}
                />
              </EntityListRow>
            ))}
          </EntityListCard>
        </>
      )}

      <AppointmentEditorDialog state={editor} onClose={() => setEditor({ mode: "closed" })} />
      <CancelAppointmentDialog appointment={cancelling} onClose={() => setCancelling(null)} />
    </div>
  );
}

type RowActionProps = {
  appointment: AppointmentDto;
  pending: boolean;
  onStep: (status: AppointmentStatus) => void;
  onEdit: () => void;
  onCancel: () => void;
};

function RowActions({ appointment, pending, onStep, onEdit, onCancel }: RowActionProps) {
  const { t } = useTranslation("clinic");
  const next = NEXT_STEP[appointment.status];
  const editable = appointment.status === "Scheduled" || appointment.status === "Confirmed";
  return (
    <div className="flex items-center justify-end gap-1">
      {next && (
        <Button size="xs" variant={next.status === "CheckedIn" ? "default" : "soft"} disabled={pending} onClick={() => onStep(next.status)}>
          {t(next.label)}
        </Button>
      )}
      {editable && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon-xs" variant="ghost" aria-label={t("action.more", { name: appointment.patientName })}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onEdit}>{t("action.reschedule")}</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onStep("NoShow")}>{t("action.markNoShow")}</DropdownMenuItem>
            <DropdownMenuItem destructive onSelect={onCancel}>{t("action.cancelAppointment")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

function MobileCard({ appointment: a, locationName, ...actions }: RowActionProps & { locationName: string }) {
  const { t } = useTranslation("clinic");
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-[12px] tabular-nums text-[var(--color-muted-foreground)]">
            {formatTime(a.startsAtUtc)}–{formatTime(endOf(a.startsAtUtc, a.durationMinutes))}
          </div>
          <Link to={`/patients/${a.patientId}`} className="flex items-center gap-1.5 text-[14px] font-medium">
            {a.patientName}
            {a.isEmergency && <AlertTriangle aria-label={t("badge.emergency")} className="size-3.5 text-[var(--color-destructive)]" />}
          </Link>
          <div className="truncate text-[12px] text-[var(--color-muted-foreground)]">
            {a.serviceName} · {a.providerName} · {locationName}
          </div>
        </div>
        <EntityStatusBadge tone={APPOINTMENT_STATUS_TONE[a.status]} withDot>
          {t(APPOINTMENT_STATUS_LABEL[a.status])}
        </EntityStatusBadge>
      </div>
      <div className="mt-2">
        <RowActions appointment={a} {...actions} />
      </div>
    </div>
  );
}

function CancelAppointmentDialog({ appointment, onClose }: { appointment: AppointmentDto | null; onClose: () => void }) {
  const { t } = useTranslation("clinic");
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [seededFor, setSeededFor] = useState<string | null>(null);
  if ((appointment?.id ?? null) !== seededFor) {
    setSeededFor(appointment?.id ?? null);
    setReason("");
  }
  const mutation = useMutation({
    mutationFn: (input: ChangeAppointmentStatusInput) => changeAppointmentStatus(input),
    onSuccess: () => {
      toast.success(t("toast.appointmentCancelled"));
      void queryClient.invalidateQueries({ queryKey: ["clinic", "appointments"] });
      void queryClient.invalidateQueries({ queryKey: ["clinic", "patients"] });
      void queryClient.invalidateQueries({ queryKey: ["clinic", "patient"] });
      onClose();
    },
  });
  const close = () => {
    mutation.reset();
    onClose();
  };
  return (
    <Dialog open={!!appointment} onOpenChange={(open) => (!open ? close() : undefined)}>
      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (appointment) mutation.mutate({ id: appointment.id, status: "Cancelled", reason: reason.trim() });
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-[var(--color-destructive)]">{t("cancelDialog.title")}</DialogTitle>
            <DialogDescription>
              {appointment
                ? t("cancelDialog.body", {
                    patient: appointment.patientName,
                    service: appointment.serviceName,
                    time: formatTime(appointment.startsAtUtc),
                  })
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-3">
            {mutation.error && <ErrorBand message={describe(mutation.error)} />}
            <Field id="cancel-reason" label={t("field.reason")} required>
              <textarea
                id="cancel-reason"
                rows={2}
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("placeholder.cancelReason")}
                className={TEXTAREA_CLASS}
                autoFocus
              />
            </Field>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={mutation.isPending}>{t("action.keep")}</Button>
            </DialogClose>
            <Button type="submit" variant="destructive" disabled={mutation.isPending}>
              {t("action.cancelAppointment")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
