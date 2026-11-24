import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  COVERAGE_TYPES,
  PREFERRED_LANGUAGES,
  createPatient,
  listLocations,
  updatePatient,
  type CoverageType,
  type CreatePatientInput,
  type PatientDto,
  type PreferredLanguage,
  type UpdatePatientInput,
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
import { Combobox, EntityFilterPill, ErrorBand, Field } from "@/components/list";
import { describe } from "@/lib/list-helpers";
import { COVERAGE_LABEL, LANGUAGE_LABEL, TEXTAREA_CLASS } from "./clinic-shared";

export type PatientEditorState = { mode: "closed" } | { mode: "create" } | { mode: "edit"; patient: PatientDto };

/** Create / edit patient dialog shared by the patient list and the patient card. */
export function PatientEditorDialog({
  state,
  onClose,
  onCreated,
}: {
  state: PatientEditorState;
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const { t } = useTranslation("clinic");
  const queryClient = useQueryClient();
  const isOpen = state.mode !== "closed";
  const patient = state.mode === "edit" ? state.patient : undefined;
  const locationsQuery = useQuery({ queryKey: ["clinic", "locations"], queryFn: listLocations, staleTime: Infinity, enabled: isOpen });

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [locationId, setLocationId] = useState<string | null>(null);
  const [language, setLanguage] = useState<PreferredLanguage>("English");
  const [coverage, setCoverage] = useState<CoverageType>("SelfPay");
  const [insurerName, setInsurerName] = useState("");
  const [directBilling, setDirectBilling] = useState(false);
  const [notes, setNotes] = useState("");

  const seedKey = isOpen ? (patient?.id ?? "new") : null;
  const [seededFor, setSeededFor] = useState<string | null>(null);
  if (seedKey !== seededFor) {
    setSeededFor(seedKey);
    setFirstName(patient?.firstName ?? "");
    setLastName(patient?.lastName ?? "");
    setDateOfBirth(patient?.dateOfBirth ?? "");
    setPhone(patient?.phone ?? "");
    setEmail(patient?.email ?? "");
    setLocationId(patient?.preferredLocationId ?? null);
    setLanguage(patient?.preferredLanguage ?? "English");
    setCoverage(patient?.coverage ?? "SelfPay");
    setInsurerName(patient?.insurerName ?? "");
    setDirectBilling(patient?.directBilling ?? false);
    setNotes(patient?.notes ?? "");
  }

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["clinic", "patients"] });
    void queryClient.invalidateQueries({ queryKey: ["clinic", "patient"] });
    void queryClient.invalidateQueries({ queryKey: ["clinic", "appointments"] });
  };
  const createMutation = useMutation({
    mutationFn: (input: CreatePatientInput) => createPatient(input),
    onSuccess: (id) => {
      toast.success(t("toast.patientCreated"));
      invalidate();
      onClose();
      onCreated?.(id);
    },
  });
  const updateMutation = useMutation({
    mutationFn: (input: UpdatePatientInput) => updatePatient(input),
    onSuccess: () => {
      toast.success(t("toast.patientUpdated"));
      invalidate();
      onClose();
    },
  });
  const isPending = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error ?? updateMutation.error;
  const close = () => {
    createMutation.reset();
    updateMutation.reset();
    onClose();
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const payload: CreatePatientInput = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dateOfBirth,
      phone: phone.trim(),
      email: email.trim() || null,
      preferredLocationId: locationId ?? "",
      preferredLanguage: language,
      coverage,
      insurerName: coverage === "PrivateInsurance" ? insurerName.trim() || null : null,
      directBilling: coverage === "PrivateInsurance" && directBilling,
      notes: notes.trim() || null,
    };
    if (patient) updateMutation.mutate({ id: patient.id, ...payload });
    else createMutation.mutate(payload);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? close() : undefined)}>
      <DialogContent className="!max-w-xl">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{patient ? t("patientEditor.editTitle") : t("patientEditor.createTitle")}</DialogTitle>
            <DialogDescription>
              {patient ? t("patientEditor.editDescription", { chart: patient.chartNumber }) : t("patientEditor.createDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {error && <ErrorBand message={describe(error)} />}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="patient-first" label={t("field.firstName")} required>
                <Input id="patient-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={64} autoFocus />
              </Field>
              <Field id="patient-last" label={t("field.lastName")} required>
                <Input id="patient-last" value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={64} />
              </Field>
              <Field id="patient-dob" label={t("field.dateOfBirth")} required>
                <Input id="patient-dob" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
              </Field>
              <Field id="patient-phone" label={t("field.phone")} required>
                <Input id="patient-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={32} placeholder="(780) 555-0100" />
              </Field>
              <Field id="patient-email" label={t("field.email")}>
                <Input id="patient-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={256} />
              </Field>
              <Field id="patient-location" label={t("field.preferredLocation")} required>
                <Combobox
                  id="patient-location"
                  label={t("field.preferredLocation")}
                  value={locationId}
                  onChange={setLocationId}
                  placeholder={t("placeholder.chooseLocation")}
                  options={(locationsQuery.data ?? []).map((l) => ({ value: l.id, label: l.name }))}
                />
              </Field>
            </div>
            <Field id="patient-language" label={t("field.language")}>
              <EntityFilterPill<PreferredLanguage>
                label={t("field.language")}
                value={language}
                onChange={setLanguage}
                options={PREFERRED_LANGUAGES.map((l) => ({ value: l, label: t(LANGUAGE_LABEL[l]) }))}
              />
            </Field>
            <Field id="patient-coverage" label={t("field.coverage")}>
              <EntityFilterPill<CoverageType>
                label={t("field.coverage")}
                value={coverage}
                onChange={setCoverage}
                options={COVERAGE_TYPES.map((c) => ({ value: c, label: t(COVERAGE_LABEL[c]) }))}
              />
            </Field>
            {coverage === "PrivateInsurance" && (
              <div className="grid items-end gap-4 sm:grid-cols-2">
                <Field id="patient-insurer" label={t("field.insurer")} required>
                  <Input id="patient-insurer" value={insurerName} onChange={(e) => setInsurerName(e.target.value)} maxLength={128} placeholder={t("placeholder.insurer")} />
                </Field>
                <div className="flex h-9 items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] px-3">
                  <span id="patient-direct-label" className="text-[13px]">{t("field.directBilling")}</span>
                  <Switch checked={directBilling} onCheckedChange={setDirectBilling} aria-labelledby="patient-direct-label" />
                </div>
              </div>
            )}
            {coverage === "Cdcp" && <p className="text-[12px] text-[var(--color-muted-foreground)]">{t("hint.cdcp")}</p>}
            <Field id="patient-notes" label={t("field.frontDeskNotes")} hint={t("hint.notesNotClinical")}>
              <textarea id="patient-notes" rows={2} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} className={TEXTAREA_CLASS} />
            </Field>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isPending}>{t("action.cancel")}</Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? t("action.saving") : patient ? t("action.save") : t("action.addPatient")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
