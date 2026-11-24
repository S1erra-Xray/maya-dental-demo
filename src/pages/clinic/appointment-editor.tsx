import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  createAppointment,
  listLocations,
  listProviders,
  searchPatients,
  searchServices,
  updateAppointment,
  type AppointmentDto,
  type CreateAppointmentInput,
  type UpdateAppointmentInput,
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
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Combobox, ErrorBand, Field } from "@/components/list";
import { describe, formatMoney } from "@/lib/list-helpers";
import {
  CURRENCY,
  TEXTAREA_CLASS,
  combineLocal,
  hoursFor,
  toDateInput,
  toTimeInput,
} from "./clinic-shared";

export type AppointmentEditorState =
  | { mode: "closed" }
  | { mode: "create"; date: string; patientId?: string | null; locationId?: string | null }
  | { mode: "edit"; appointment: AppointmentDto };

/** Create / reschedule dialog shared by the schedule and the patient card. */
export function AppointmentEditorDialog({
  state,
  onClose,
}: {
  state: AppointmentEditorState;
  onClose: () => void;
}) {
  const { t } = useTranslation("clinic");
  const queryClient = useQueryClient();
  const isOpen = state.mode !== "closed";
  const appointment = state.mode === "edit" ? state.appointment : undefined;

  const locationsQuery = useQuery({
    queryKey: ["clinic", "locations"],
    queryFn: listLocations,
    staleTime: Infinity,
    enabled: isOpen,
  });
  const providersQuery = useQuery({
    queryKey: ["clinic", "providers"],
    queryFn: () => listProviders(),
    staleTime: Infinity,
    enabled: isOpen,
  });
  const servicesQuery = useQuery({
    queryKey: ["clinic", "services", { activeOnly: true, pageSize: 200 }],
    queryFn: () => searchServices({ activeOnly: true, pageSize: 200, sortBy: "code", sortDir: "asc" }),
    enabled: isOpen,
  });
  const patientsQuery = useQuery({
    queryKey: ["clinic", "patients", { pageSize: 500 }],
    queryFn: () => searchPatients({ pageSize: 500, sortBy: "lastName", sortDir: "asc" }),
    enabled: isOpen,
  });

  const locations = locationsQuery.data ?? [];
  const services = servicesQuery.data?.items ?? [];

  const [patientId, setPatientId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("");
  const [isEmergency, setIsEmergency] = useState(false);
  const [notes, setNotes] = useState("");

  // Re-seed the draft whenever the dialog opens or its target changes (adjust state during render).
  const seedKey = state.mode === "closed" ? null : state.mode === "edit" ? state.appointment.id : `new:${state.date}:${state.patientId ?? ""}`;
  const [seededFor, setSeededFor] = useState<string | null>(null);
  if (seedKey !== seededFor) {
    setSeededFor(seedKey);
    if (state.mode === "edit") {
      const a = state.appointment;
      const start = new Date(a.startsAtUtc);
      setPatientId(a.patientId);
      setLocationId(a.locationId);
      setProviderId(a.providerId);
      setServiceId(a.serviceId);
      setDate(toDateInput(start));
      setTime(toTimeInput(start));
      setDuration(String(a.durationMinutes));
      setIsEmergency(a.isEmergency);
      setNotes(a.notes ?? "");
    } else if (state.mode === "create") {
      setPatientId(state.patientId ?? null);
      setLocationId(state.locationId ?? null);
      setProviderId(null);
      setServiceId(null);
      setDate(state.date);
      setTime("");
      setDuration("");
      setIsEmergency(false);
      setNotes("");
    }
  }

  // Default the location from the patient's preference, and the time from the opening hour.
  const patients = patientsQuery.data?.items ?? [];
  const effectiveLocationId =
    locationId ?? patients.find((p) => p.id === patientId)?.preferredLocationId ?? null;
  const location = locations.find((l) => l.id === effectiveLocationId);
  const hours = hoursFor(location, date);
  const effectiveTime = time || hours?.opensAt || "";

  const providerOptions = useMemo(
    () =>
      (providersQuery.data ?? [])
        .filter((p) => !effectiveLocationId || p.locationIds.includes(effectiveLocationId))
        .map((p) => ({ value: p.id, label: p.displayName })),
    [providersQuery.data, effectiveLocationId],
  );

  const onSaved = (message: string) => {
    toast.success(message);
    void queryClient.invalidateQueries({ queryKey: ["clinic", "appointments"] });
    void queryClient.invalidateQueries({ queryKey: ["clinic", "patients"] });
    void queryClient.invalidateQueries({ queryKey: ["clinic", "patient"] });
    onClose();
  };
  const createMutation = useMutation({
    mutationFn: (input: CreateAppointmentInput) => createAppointment(input),
    onSuccess: () => onSaved(t("toast.appointmentCreated")),
  });
  const updateMutation = useMutation({
    mutationFn: (input: UpdateAppointmentInput) => updateAppointment(input),
    onSuccess: () => onSaved(t("toast.appointmentUpdated")),
  });
  const isPending = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error ?? updateMutation.error;

  const close = () => {
    createMutation.reset();
    updateMutation.reset();
    onClose();
  };

  const selectedService = services.find((s) => s.id === serviceId);
  const canSubmit = !!patientId && !!effectiveLocationId && !!providerId && !!serviceId && !!date && !!effectiveTime;

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;
    const payload: CreateAppointmentInput = {
      patientId: patientId!,
      locationId: effectiveLocationId!,
      providerId: providerId!,
      serviceId: serviceId!,
      startsAtUtc: combineLocal(date, effectiveTime),
      durationMinutes: duration ? Number(duration) : null,
      isEmergency,
      notes: notes.trim() || null,
    };
    if (appointment) updateMutation.mutate({ id: appointment.id, ...payload });
    else createMutation.mutate(payload);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? close() : undefined)}>
      <DialogContent className="!max-w-xl">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{appointment ? t("appointmentEditor.editTitle") : t("appointmentEditor.createTitle")}</DialogTitle>
            <DialogDescription>
              {hours && location
                ? t("appointmentEditor.hours", { location: location.name, opens: hours.opensAt, closes: hours.closesAt })
                : t("appointmentEditor.description")}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {error && <ErrorBand message={describe(error)} />}
            <Field id="appt-patient" label={t("field.patient")} required>
              <Combobox
                id="appt-patient"
                label={t("field.patient")}
                value={patientId}
                onChange={setPatientId}
                searchable
                placeholder={t("placeholder.choosePatient")}
                options={patients.map((p) => ({
                  value: p.id,
                  label: `${p.lastName}, ${p.firstName}`,
                  hint: p.chartNumber,
                }))}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="appt-location" label={t("field.location")} required>
                <Combobox
                  id="appt-location"
                  label={t("field.location")}
                  value={effectiveLocationId}
                  onChange={(next) => {
                    setLocationId(next);
                    setProviderId(null);
                  }}
                  placeholder={t("placeholder.chooseLocation")}
                  options={locations.map((l) => ({ value: l.id, label: l.name }))}
                />
              </Field>
              <Field id="appt-provider" label={t("field.provider")} required>
                <Combobox
                  id="appt-provider"
                  label={t("field.provider")}
                  value={providerId}
                  onChange={setProviderId}
                  placeholder={t("placeholder.chooseProvider")}
                  options={providerOptions}
                />
              </Field>
            </div>
            <Field id="appt-service" label={t("field.service")} required hint={selectedService ? t("hint.serviceFee", { fee: formatMoney(selectedService.fee, CURRENCY), minutes: selectedService.durationMinutes }) : undefined}>
              <Combobox
                id="appt-service"
                label={t("field.service")}
                value={serviceId}
                onChange={(next) => {
                  setServiceId(next);
                  const service = services.find((s) => s.id === next);
                  if (service) {
                    setDuration(String(service.durationMinutes));
                    if (service.category === "Emergency") setIsEmergency(true);
                  }
                }}
                searchable
                placeholder={t("placeholder.chooseService")}
                options={services.map((s) => ({ value: s.id, label: `${s.code} · ${s.name}`, hint: t("unit.minutes", { count: s.durationMinutes }) }))}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field id="appt-date" label={t("field.date")} required>
                <Input id="appt-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </Field>
              <Field id="appt-time" label={t("field.time")} required>
                <Input id="appt-time" type="time" step={300} value={effectiveTime} onChange={(e) => setTime(e.target.value)} required />
              </Field>
              <Field id="appt-duration" label={t("field.durationMinutes")}>
                <Input id="appt-duration" type="number" min={5} max={240} step={5} value={duration} onChange={(e) => setDuration(e.target.value)} />
              </Field>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] px-3 py-2.5">
              <div>
                <div id="appt-emergency-label" className="text-[13px] font-medium">{t("field.emergency")}</div>
                <div className="text-[12px] text-[var(--color-muted-foreground)]">{t("hint.emergency")}</div>
              </div>
              <Switch checked={isEmergency} onCheckedChange={setIsEmergency} aria-labelledby="appt-emergency-label" />
            </div>
            <Field id="appt-notes" label={t("field.notes")}>
              <textarea id="appt-notes" rows={2} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} className={TEXTAREA_CLASS} />
            </Field>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isPending}>{t("action.cancel")}</Button>
            </DialogClose>
            <Button type="submit" disabled={isPending || !canSubmit}>
              {isPending ? t("action.saving") : appointment ? t("action.save") : t("action.book")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
