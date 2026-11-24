import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarPlus,
  ChevronRight,
  Clock,
  Globe,
  Inbox,
  Mail,
  MapPin,
  Phone,
  PhoneCall,
  Search,
  UserPlus,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  BOOKING_REQUEST_STATUSES,
  bookBookingRequest,
  declineBookingRequest,
  listLocations,
  listProviders,
  markBookingRequestContacted,
  searchBookingRequests,
  searchPatients,
  searchServices,
  type BookBookingRequestInput,
  type BookingRequestDto,
  type BookingRequestStatus,
  type DeclineBookingRequestInput,
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
import {
  Combobox,
  EntityEmpty,
  EntityFilterPill,
  EntityListCard,
  EntityListHeader,
  EntityListLoading,
  EntityListRow,
  EntityPageHeader,
  EntityPager,
  EntitySearch,
  EntityStatusBadge,
  ErrorBand,
  Field,
} from "@/components/list";
import { describe, formatDateTimeMono, formatRelative } from "@/lib/list-helpers";
import {
  CATEGORY_LABEL,
  COVERAGE_LABEL,
  REQUEST_STATUS_LABEL,
  REQUEST_STATUS_TONE,
  SOURCE_LABEL,
  TEXTAREA_CLASS,
  addDays,
  combineLocal,
  hoursFor,
  toDateInput,
} from "./clinic-shared";

const PAGE_SIZE = 20;
const COLUMNS = "grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)_minmax(0,1fr)_110px_24px]";

type Dialogs =
  | { mode: "closed" }
  | { mode: "view"; request: BookingRequestDto }
  | { mode: "book"; request: BookingRequestDto }
  | { mode: "decline"; request: BookingRequestDto };

export function BookingRequestsPage() {
  const { t } = useTranslation("clinic");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<BookingRequestStatus | null>("New");
  const [locationId, setLocationId] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [dialog, setDialog] = useState<Dialogs>({ mode: "closed" });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPageNumber(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const locationsQuery = useQuery({ queryKey: ["clinic", "locations"], queryFn: listLocations, staleTime: Infinity });
  const query = useQuery({
    queryKey: ["clinic", "booking-requests", { search: debouncedSearch, status, locationId, pageNumber, pageSize: PAGE_SIZE }],
    queryFn: () =>
      searchBookingRequests({ search: debouncedSearch || undefined, status, locationId, pageNumber, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const locations = locationsQuery.data ?? [];
  const locationName = (id: string) => locations.find((l) => l.id === id)?.name ?? "—";
  const data = query.data;
  const items = data?.items ?? [];
  const filtered = debouncedSearch.length > 0 || locationId !== null;

  return (
    <div className="space-y-4 sm:space-y-6">
      <EntityPageHeader
        icon={Inbox}
        tone="info"
        title={t("requests.title")}
        total={data?.totalCount ?? null}
        description={t("requests.description")}
      />

      <EntitySearch value={search} onChange={setSearch} placeholder={t("requests.searchPlaceholder")} />

      <div className="flex flex-wrap items-center gap-2">
        <EntityFilterPill<BookingRequestStatus | null>
          label={t("filter.status")}
          value={status}
          onChange={(next) => {
            setStatus(next);
            setPageNumber(1);
          }}
          options={[
            ...BOOKING_REQUEST_STATUSES.map((s) => ({ value: s, label: t(REQUEST_STATUS_LABEL[s]) })),
            { value: null, label: t("filter.all") },
          ]}
        />
        <EntityFilterPill<string | null>
          label={t("filter.location")}
          value={locationId}
          onChange={(next) => {
            setLocationId(next);
            setPageNumber(1);
          }}
          options={[{ value: null, label: t("filter.allLocations") }, ...locations.map((l) => ({ value: l.id, label: l.name }))]}
        />
      </div>

      {query.isError && <ErrorBand message={describe(query.error)} />}

      {query.isLoading && items.length === 0 ? (
        <EntityListLoading desktopColumns={COLUMNS} />
      ) : items.length === 0 ? (
        <EntityEmpty
          icon={filtered ? Search : Inbox}
          title={filtered ? t("requests.empty.filteredTitle") : t("requests.empty.title")}
          body={filtered ? t("requests.empty.filteredBody") : t("requests.empty.body")}
        />
      ) : (
        <div>
          <EntityListCard>
            <EntityListHeader className={`hidden md:grid ${COLUMNS}`}>
              <span>{t("col.requester")}</span>
              <span>{t("col.reason")}</span>
              <span>{t("col.preferred")}</span>
              <span>{t("col.status")}</span>
              <span />
            </EntityListHeader>
            {items.map((r, i) => (
              <EntityListRow
                key={r.id}
                className="grid-cols-1 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)_minmax(0,1fr)_110px_24px]"
                isLast={i === items.length - 1}
                dim={r.status === "Declined"}
                onClick={() => setDialog({ mode: "view", request: r })}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[14px] font-medium">{r.fullName}</span>
                    {r.isEmergency && (
                      <EntityStatusBadge tone="danger">
                        <AlertTriangle className="mr-1 size-3" />
                        {t("badge.emergency")}
                      </EntityStatusBadge>
                    )}
                  </div>
                  <div className="text-[11.5px] text-[var(--color-muted-foreground)]">
                    <code className="font-mono">{r.number}</code> · {t(SOURCE_LABEL[r.source])} · {formatRelative(r.createdAtUtc)}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="line-clamp-2 text-[13px]">{r.reason}</div>
                  <div className="mt-0.5 flex flex-wrap gap-1.5 text-[11px] text-[var(--color-muted-foreground)]">
                    {r.serviceCategory && <span>{t(CATEGORY_LABEL[r.serviceCategory])}</span>}
                    {r.isNewPatient && <span>· {t("badge.newPatient")}</span>}
                    <span>· {t(COVERAGE_LABEL[r.coverage])}</span>
                  </div>
                </div>
                <div className="min-w-0 text-[12px]">
                  <div className="truncate">{locationName(r.preferredLocationId)}</div>
                  <div className="truncate text-[var(--color-muted-foreground)]">{r.preferredTimes ?? "—"}</div>
                </div>
                <div>
                  <EntityStatusBadge tone={REQUEST_STATUS_TONE[r.status]} withDot>
                    {t(REQUEST_STATUS_LABEL[r.status])}
                  </EntityStatusBadge>
                </div>
                <ChevronRight className="hidden size-4 text-[var(--color-border)] md:block" />
              </EntityListRow>
            ))}
          </EntityListCard>
          <EntityPager
            page={data?.pageNumber ?? 1}
            totalPages={data?.totalPages ?? 1}
            hasPrev={!!data?.hasPrevious}
            hasNext={!!data?.hasNext}
            onPrev={() => setPageNumber((p) => Math.max(1, p - 1))}
            onNext={() => setPageNumber((p) => p + 1)}
          />
        </div>
      )}

      <RequestDialog
        request={dialog.mode === "view" ? dialog.request : null}
        locationName={locationName}
        onClose={() => setDialog({ mode: "closed" })}
        onBook={(request) => setDialog({ mode: "book", request })}
        onDecline={(request) => setDialog({ mode: "decline", request })}
      />
      <BookDialog request={dialog.mode === "book" ? dialog.request : null} onClose={() => setDialog({ mode: "closed" })} />
      <DeclineDialog request={dialog.mode === "decline" ? dialog.request : null} onClose={() => setDialog({ mode: "closed" })} />
    </div>
  );
}

// ─── Request card ─────────────────────────────────────────────────────────

function RequestDialog({
  request,
  locationName,
  onClose,
  onBook,
  onDecline,
}: {
  request: BookingRequestDto | null;
  locationName: (id: string) => string;
  onClose: () => void;
  onBook: (r: BookingRequestDto) => void;
  onDecline: (r: BookingRequestDto) => void;
}) {
  const { t } = useTranslation("clinic");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const contactMutation = useMutation({
    mutationFn: (id: string) => markBookingRequestContacted(id),
    onSuccess: () => {
      toast.success(t("toast.requestContacted"));
      void queryClient.invalidateQueries({ queryKey: ["clinic", "booking-requests"] });
      onClose();
    },
    onError: (err) => toast.error(t("toast.actionFailed"), { description: describe(err) }),
  });
  const open = request !== null && (request.status === "New" || request.status === "Contacted");

  return (
    <Dialog open={!!request} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="!max-w-lg">
        {request && (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2">
                {request.fullName}
                <EntityStatusBadge tone={REQUEST_STATUS_TONE[request.status]} withDot>
                  {t(REQUEST_STATUS_LABEL[request.status])}
                </EntityStatusBadge>
                {request.isEmergency && <EntityStatusBadge tone="danger">{t("badge.emergency")}</EntityStatusBadge>}
              </DialogTitle>
              <DialogDescription>
                {t("requests.received", { number: request.number, source: t(SOURCE_LABEL[request.source]), when: formatDateTimeMono(request.createdAtUtc) })}
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="space-y-4">
              <p className="rounded-lg bg-[var(--color-muted)] px-3 py-2.5 text-[13.5px]">{request.reason}</p>
              <dl className="grid grid-cols-[20px_1fr] gap-x-2 gap-y-2 text-[13px]">
                <Phone className="mt-0.5 size-3.5 text-[var(--color-muted-foreground)]" aria-hidden />
                <dd>{request.phone}</dd>
                <Mail className="mt-0.5 size-3.5 text-[var(--color-muted-foreground)]" aria-hidden />
                <dd>{request.email ?? "—"}</dd>
                <MapPin className="mt-0.5 size-3.5 text-[var(--color-muted-foreground)]" aria-hidden />
                <dd>{locationName(request.preferredLocationId)}</dd>
                <Clock className="mt-0.5 size-3.5 text-[var(--color-muted-foreground)]" aria-hidden />
                <dd>{request.preferredTimes ?? "—"}</dd>
                <Globe className="mt-0.5 size-3.5 text-[var(--color-muted-foreground)]" aria-hidden />
                <dd>
                  {[
                    request.serviceCategory ? t(CATEGORY_LABEL[request.serviceCategory]) : null,
                    request.isNewPatient ? t("badge.newPatient") : t("badge.existingPatient"),
                    t(COVERAGE_LABEL[request.coverage]),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </dd>
              </dl>
              {request.status === "Declined" && request.declineReason && (
                <p className="text-[12.5px] text-[var(--color-muted-foreground)]">{t("requests.declinedBecause", { reason: request.declineReason })}</p>
              )}
            </DialogBody>
            <DialogFooter className="flex-wrap gap-2">
              {request.status === "Booked" && request.patientId && (
                <Button variant="outline" onClick={() => navigate(`/patients/${request.patientId}`)}>{t("action.openPatient")}</Button>
              )}
              {open && (
                <Button variant="outline" onClick={() => onDecline(request)}>
                  <XCircle className="size-4" />
                  {t("action.decline")}
                </Button>
              )}
              {request.status === "New" && (
                <Button variant="outline" disabled={contactMutation.isPending} onClick={() => contactMutation.mutate(request.id)}>
                  <PhoneCall className="size-4" />
                  {t("action.markContacted")}
                </Button>
              )}
              {open && (
                <Button onClick={() => onBook(request)}>
                  <CalendarPlus className="size-4" />
                  {t("action.bookVisit")}
                </Button>
              )}
              {!open && (
                <DialogClose asChild>
                  <Button variant="outline">{t("action.close")}</Button>
                </DialogClose>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Book ─────────────────────────────────────────────────────────────────

function BookDialog({ request, onClose }: { request: BookingRequestDto | null; onClose: () => void }) {
  const { t } = useTranslation("clinic");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isOpen = request !== null;
  const phoneDigits = (request?.phone ?? "").replace(/\D/g, "");

  const locationsQuery = useQuery({ queryKey: ["clinic", "locations"], queryFn: listLocations, staleTime: Infinity, enabled: isOpen });
  const providersQuery = useQuery({
    queryKey: ["clinic", "providers", { locationId: request?.preferredLocationId }],
    queryFn: () => listProviders(request?.preferredLocationId),
    enabled: isOpen,
  });
  const servicesQuery = useQuery({
    queryKey: ["clinic", "services", { activeOnly: true, pageSize: 200 }],
    queryFn: () => searchServices({ activeOnly: true, pageSize: 200, sortBy: "code", sortDir: "asc" }),
    enabled: isOpen,
  });
  const matchesQuery = useQuery({
    queryKey: ["clinic", "patients", { search: phoneDigits }],
    queryFn: () => searchPatients({ search: phoneDigits, pageSize: 5 }),
    enabled: isOpen && phoneDigits.length >= 7,
  });

  const matches = matchesQuery.data?.items ?? [];
  const location = (locationsQuery.data ?? []).find((l) => l.id === request?.preferredLocationId);

  const [patientChoice, setPatientChoice] = useState<string | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [providerId, setProviderId] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const [seededFor, setSeededFor] = useState<string | null>(null);
  if ((request?.id ?? null) !== seededFor) {
    setSeededFor(request?.id ?? null);
    setPatientChoice(null);
    setDateOfBirth("");
    setProviderId(null);
    setServiceId(null);
    const today = toDateInput(new Date());
    setDate(request?.isEmergency ? today : addDays(today, 1));
    setTime("");
  }

  // Existing patient found by phone → preselect it; otherwise the server creates one.
  const effectivePatient = patientChoice ?? (matches[0]?.id || "new");
  const isNew = effectivePatient === "new";
  const hours = hoursFor(location, date);
  const effectiveTime = time || hours?.opensAt || "";

  const serviceOptions = useMemo(() => {
    const all = servicesQuery.data?.items ?? [];
    const wanted = request?.isEmergency ? "Emergency" : request?.serviceCategory;
    const sorted = [...all].sort((a, b) => Number(b.category === wanted) - Number(a.category === wanted));
    return sorted.map((s) => ({ value: s.id, label: `${s.code} · ${s.name}`, hint: t("unit.minutes", { count: s.durationMinutes }) }));
  }, [servicesQuery.data, request?.isEmergency, request?.serviceCategory, t]);

  const mutation = useMutation({
    mutationFn: (input: BookBookingRequestInput) => bookBookingRequest(input),
    onSuccess: (_id, input) => {
      void queryClient.invalidateQueries({ queryKey: ["clinic"] });
      const day = toDateInput(new Date(input.startsAtUtc));
      toast.success(t("toast.requestBooked"), {
        action: { label: t("action.openSchedule"), onClick: () => navigate(`/schedule?date=${day}`) },
      });
      onClose();
    },
  });
  const close = () => {
    mutation.reset();
    onClose();
  };

  const canSubmit = !!providerId && !!serviceId && !!date && !!effectiveTime && (!isNew || !!dateOfBirth);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!request || !canSubmit) return;
    mutation.mutate({
      id: request.id,
      patientId: isNew ? null : effectivePatient,
      dateOfBirth: isNew ? dateOfBirth : null,
      providerId: providerId!,
      serviceId: serviceId!,
      startsAtUtc: combineLocal(date, effectiveTime),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => (!o ? close() : undefined)}>
      <DialogContent className="!max-w-xl">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{t("bookDialog.title", { name: request?.fullName ?? "" })}</DialogTitle>
            <DialogDescription>
              {location && hours
                ? t("appointmentEditor.hours", { location: location.name, opens: hours.opensAt, closes: hours.closesAt })
                : location?.name}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {mutation.error && <ErrorBand message={describe(mutation.error)} />}
            <Field id="book-patient" label={t("field.patient")} required hint={isNew ? t("hint.newPatientFromRequest") : undefined}>
              <Combobox
                id="book-patient"
                label={t("field.patient")}
                value={effectivePatient}
                onChange={(next) => setPatientChoice(next ?? "new")}
                options={[
                  ...matches.map((p) => ({ value: p.id, label: `${p.firstName} ${p.lastName}`, hint: p.chartNumber })),
                  { value: "new", label: t("bookDialog.createPatient", { name: request?.fullName ?? "" }), prefix: <UserPlus className="size-3.5" /> },
                ]}
              />
            </Field>
            {isNew && (
              <Field id="book-dob" label={t("field.dateOfBirth")} required>
                <Input id="book-dob" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} required />
              </Field>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="book-provider" label={t("field.provider")} required>
                <Combobox
                  id="book-provider"
                  label={t("field.provider")}
                  value={providerId}
                  onChange={setProviderId}
                  placeholder={t("placeholder.chooseProvider")}
                  options={(providersQuery.data ?? []).map((p) => ({ value: p.id, label: p.displayName }))}
                />
              </Field>
              <Field id="book-service" label={t("field.service")} required>
                <Combobox
                  id="book-service"
                  label={t("field.service")}
                  value={serviceId}
                  onChange={setServiceId}
                  searchable
                  placeholder={t("placeholder.chooseService")}
                  options={serviceOptions}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="book-date" label={t("field.date")} required>
                <Input id="book-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </Field>
              <Field id="book-time" label={t("field.time")} required>
                <Input id="book-time" type="time" step={300} value={effectiveTime} onChange={(e) => setTime(e.target.value)} required />
              </Field>
            </div>
            {request?.preferredTimes && (
              <p className="text-[12px] text-[var(--color-muted-foreground)]">{t("bookDialog.preferred", { times: request.preferredTimes })}</p>
            )}
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={mutation.isPending}>{t("action.cancel")}</Button>
            </DialogClose>
            <Button type="submit" disabled={mutation.isPending || !canSubmit}>
              {mutation.isPending ? t("action.saving") : t("action.book")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Decline ──────────────────────────────────────────────────────────────

function DeclineDialog({ request, onClose }: { request: BookingRequestDto | null; onClose: () => void }) {
  const { t } = useTranslation("clinic");
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [seededFor, setSeededFor] = useState<string | null>(null);
  if ((request?.id ?? null) !== seededFor) {
    setSeededFor(request?.id ?? null);
    setReason("");
  }
  const mutation = useMutation({
    mutationFn: (input: DeclineBookingRequestInput) => declineBookingRequest(input),
    onSuccess: () => {
      toast.success(t("toast.requestDeclined"));
      void queryClient.invalidateQueries({ queryKey: ["clinic", "booking-requests"] });
      onClose();
    },
  });
  const close = () => {
    mutation.reset();
    onClose();
  };
  return (
    <Dialog open={!!request} onOpenChange={(o) => (!o ? close() : undefined)}>
      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (request) mutation.mutate({ id: request.id, reason: reason.trim() });
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("declineDialog.title")}</DialogTitle>
            <DialogDescription>{t("declineDialog.body", { number: request?.number ?? "", name: request?.fullName ?? "" })}</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-3">
            {mutation.error && <ErrorBand message={describe(mutation.error)} />}
            <Field id="decline-reason" label={t("field.reason")} required>
              <textarea
                id="decline-reason"
                rows={2}
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("placeholder.declineReason")}
                className={TEXTAREA_CLASS}
                autoFocus
              />
            </Field>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={mutation.isPending}>{t("action.cancel")}</Button>
            </DialogClose>
            <Button type="submit" variant="destructive" disabled={mutation.isPending}>{t("action.decline")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
