import { useEffect, useState, type FormEvent } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Receipt, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  SERVICE_CATEGORIES,
  createService,
  deleteService,
  searchServices,
  updateService,
  type CreateServiceInput,
  type ServiceCategory,
  type ServiceDto,
  type UpdateServiceInput,
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
import { ApiRequestError } from "@/lib/api-client";
import { describe, formatMoney } from "@/lib/list-helpers";
import { CATEGORY_LABEL, CURRENCY } from "./clinic-shared";

const PAGE_SIZE = 25;
const COLUMNS = "grid-cols-[80px_minmax(0,1.6fr)_minmax(0,1fr)_80px_110px_90px_64px]";

type EditorState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; service: ServiceDto }
  | { mode: "delete"; service: ServiceDto };

export function FeeGuidePage() {
  const { t } = useTranslation("clinic");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState<ServiceCategory | null>(null);
  const [activeOnly, setActiveOnly] = useState(true);
  const [pageNumber, setPageNumber] = useState(1);
  const [editor, setEditor] = useState<EditorState>({ mode: "closed" });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPageNumber(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const query = useQuery({
    queryKey: ["clinic", "services", { search: debouncedSearch, category, activeOnly, pageNumber, pageSize: PAGE_SIZE }],
    queryFn: () =>
      searchServices({
        search: debouncedSearch || undefined,
        category,
        activeOnly,
        pageNumber,
        pageSize: PAGE_SIZE,
        sortBy: "code",
        sortDir: "asc",
      }),
    placeholderData: keepPreviousData,
  });

  const data = query.data;
  const items = data?.items ?? [];
  const filtered = debouncedSearch.length > 0 || category !== null;
  const close = () => setEditor({ mode: "closed" });

  return (
    <div className="space-y-4 sm:space-y-6">
      <EntityPageHeader icon={Receipt} tone="saffron" title={t("fees.title")} total={data?.totalCount ?? null} description={t("fees.description")}>
        <Button onClick={() => setEditor({ mode: "create" })} className="h-9 gap-1.5 rounded-lg px-4 text-[13px] font-semibold">
          <Plus className="size-4" />
          {t("action.newService")}
        </Button>
      </EntityPageHeader>

      <EntitySearch value={search} onChange={setSearch} placeholder={t("fees.searchPlaceholder")} />

      <div className="flex flex-wrap items-center gap-2">
        <Combobox
          variant="filter"
          label={t("filter.category")}
          value={category}
          onChange={(next) => {
            setCategory(next as ServiceCategory | null);
            setPageNumber(1);
          }}
          clearable
          options={SERVICE_CATEGORIES.map((c) => ({ value: c, label: t(CATEGORY_LABEL[c]) }))}
        />
        <EntityFilterPill<boolean>
          label={t("filter.active")}
          value={activeOnly}
          onChange={(next) => {
            setActiveOnly(next);
            setPageNumber(1);
          }}
          options={[
            { value: true, label: t("filter.activeOnly") },
            { value: false, label: t("filter.all") },
          ]}
        />
      </div>

      {query.isError && <ErrorBand message={describe(query.error)} />}

      {query.isLoading && items.length === 0 ? (
        <EntityListLoading desktopColumns={COLUMNS} />
      ) : items.length === 0 ? (
        <EntityEmpty
          icon={filtered ? Search : Receipt}
          title={filtered ? t("fees.empty.filteredTitle") : t("fees.empty.title")}
          body={filtered ? t("fees.empty.filteredBody") : t("fees.empty.body")}
        />
      ) : (
        <div>
          <EntityListCard>
            <EntityListHeader className={`hidden md:grid ${COLUMNS}`}>
              <span>{t("col.code")}</span>
              <span>{t("col.service")}</span>
              <span>{t("col.category")}</span>
              <span>{t("col.duration")}</span>
              <span className="text-right">{t("col.fee")}</span>
              <span>{t("col.cdcp")}</span>
              <span />
            </EntityListHeader>
            {items.map((s, i) => (
              <EntityListRow
                key={s.id}
                className="grid-cols-[64px_minmax(0,1fr)_auto] md:grid-cols-[80px_minmax(0,1.6fr)_minmax(0,1fr)_80px_110px_90px_64px]"
                isLast={i === items.length - 1}
                dim={!s.isActive}
              >
                <code className="font-mono text-[12.5px] font-semibold">{s.code}</code>
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-medium">{s.name}</div>
                  {!s.isActive && <div className="text-[11.5px] text-[var(--color-muted-foreground)]">{t("fees.inactive")}</div>}
                </div>
                <span className="hidden truncate text-[12.5px] text-[var(--color-muted-foreground)] md:block">{t(CATEGORY_LABEL[s.category])}</span>
                <span className="hidden text-[12.5px] tabular-nums md:block">{t("unit.minutes", { count: s.durationMinutes })}</span>
                <span className="text-right font-mono text-[13px] tabular-nums">
                  {s.fee === 0 ? t("fees.free") : formatMoney(s.fee, CURRENCY)}
                </span>
                <span className="hidden md:block">
                  {s.cdcpEligible ? <EntityStatusBadge tone="success">{t("badge.cdcp")}</EntityStatusBadge> : <span className="text-[var(--color-muted-foreground)]">—</span>}
                </span>
                <div className="hidden justify-end gap-1 md:flex">
                  <RowAction label={t("action.editNamed", { name: s.name })} onClick={() => setEditor({ mode: "edit", service: s })}>
                    <Pencil className="size-3.5" />
                  </RowAction>
                  <RowAction label={t("action.deleteNamed", { name: s.name })} onClick={() => setEditor({ mode: "delete", service: s })}>
                    <Trash2 className="size-3.5" />
                  </RowAction>
                </div>
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

      <ServiceEditorDialog state={editor} onClose={close} />
      <DeleteServiceDialog state={editor} onClose={close} onDeactivate={(service) => setEditor({ mode: "edit", service })} />
    </div>
  );
}

function RowAction({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-7 cursor-pointer place-items-center rounded-md text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
    >
      {children}
    </button>
  );
}

function ServiceEditorDialog({ state, onClose }: { state: EditorState; onClose: () => void }) {
  const { t } = useTranslation("clinic");
  const queryClient = useQueryClient();
  const isOpen = state.mode === "create" || state.mode === "edit";
  const service = state.mode === "edit" ? state.service : undefined;

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ServiceCategory | null>(null);
  const [duration, setDuration] = useState("");
  const [fee, setFee] = useState("");
  const [cdcpEligible, setCdcpEligible] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const seedKey = isOpen ? (service?.id ?? "new") : null;
  const [seededFor, setSeededFor] = useState<string | null>(null);
  if (seedKey !== seededFor) {
    setSeededFor(seedKey);
    setCode(service?.code ?? "");
    setName(service?.name ?? "");
    setCategory(service?.category ?? null);
    setDuration(service ? String(service.durationMinutes) : "30");
    setFee(service ? String(service.fee) : "");
    setCdcpEligible(service?.cdcpEligible ?? false);
    setIsActive(service?.isActive ?? true);
  }

  const onSaved = (message: string) => {
    toast.success(message);
    void queryClient.invalidateQueries({ queryKey: ["clinic", "services"] });
    onClose();
  };
  const createMutation = useMutation({
    mutationFn: (input: CreateServiceInput) => createService(input),
    onSuccess: () => onSaved(t("toast.serviceCreated")),
  });
  const updateMutation = useMutation({
    mutationFn: (input: UpdateServiceInput) => updateService(input),
    onSuccess: () => onSaved(t("toast.serviceUpdated")),
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
    if (!category) return;
    const payload: CreateServiceInput = {
      code: code.trim().toUpperCase(),
      name: name.trim(),
      category,
      durationMinutes: Number(duration),
      fee: Number(fee),
      cdcpEligible,
      isActive,
    };
    if (service) updateMutation.mutate({ id: service.id, ...payload });
    else createMutation.mutate(payload);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? close() : undefined)}>
      <DialogContent className="!max-w-lg">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{service ? t("serviceEditor.editTitle") : t("serviceEditor.createTitle")}</DialogTitle>
            <DialogDescription>{t("serviceEditor.description")}</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {error && <ErrorBand message={describe(error)} />}
            <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
              <Field id="service-code" label={t("field.code")} required>
                <Input id="service-code" value={code} onChange={(e) => setCode(e.target.value)} maxLength={10} className="font-mono uppercase" autoFocus />
              </Field>
              <Field id="service-name" label={t("field.name")} required>
                <Input id="service-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={128} />
              </Field>
            </div>
            <Field id="service-category" label={t("field.category")} required>
              <Combobox
                id="service-category"
                label={t("field.category")}
                value={category}
                onChange={(next) => setCategory(next as ServiceCategory | null)}
                placeholder={t("placeholder.chooseCategory")}
                options={SERVICE_CATEGORIES.map((c) => ({ value: c, label: t(CATEGORY_LABEL[c]) }))}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="service-duration" label={t("field.durationMinutes")} required>
                <Input id="service-duration" type="number" min={5} max={240} step={5} value={duration} onChange={(e) => setDuration(e.target.value)} />
              </Field>
              <Field id="service-fee" label={t("field.fee")} required hint={t("hint.fee")}>
                <Input id="service-fee" type="number" min={0} step="0.01" value={fee} onChange={(e) => setFee(e.target.value)} />
              </Field>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] px-3 py-2.5">
                <span id="service-cdcp-label" className="text-[13px]">{t("field.cdcpEligible")}</span>
                <Switch checked={cdcpEligible} onCheckedChange={setCdcpEligible} aria-labelledby="service-cdcp-label" />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] px-3 py-2.5">
                <span id="service-active-label" className="text-[13px]">{t("field.active")}</span>
                <Switch checked={isActive} onCheckedChange={setIsActive} aria-labelledby="service-active-label" />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isPending}>{t("action.cancel")}</Button>
            </DialogClose>
            <Button type="submit" disabled={isPending || !category || !fee}>
              {isPending ? t("action.saving") : t("action.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteServiceDialog({
  state,
  onClose,
  onDeactivate,
}: {
  state: EditorState;
  onClose: () => void;
  onDeactivate: (service: ServiceDto) => void;
}) {
  const { t } = useTranslation("clinic");
  const queryClient = useQueryClient();
  const service = state.mode === "delete" ? state.service : undefined;
  const mutation = useMutation({
    mutationFn: (id: string) => deleteService(id),
    onSuccess: () => {
      toast.success(t("toast.serviceDeleted"));
      void queryClient.invalidateQueries({ queryKey: ["clinic", "services"] });
      onClose();
    },
  });
  const close = () => {
    mutation.reset();
    onClose();
  };
  const conflict = mutation.error instanceof ApiRequestError && mutation.error.status === 409;

  return (
    <Dialog open={!!service} onOpenChange={(open) => (!open ? close() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-[var(--color-destructive)]">{t("deleteService.title")}</DialogTitle>
          <DialogDescription>{t("deleteService.body", { code: service?.code ?? "", name: service?.name ?? "" })}</DialogDescription>
        </DialogHeader>
        {mutation.error && (
          <DialogBody>
            <ErrorBand message={describe(mutation.error)} />
          </DialogBody>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={mutation.isPending}>{t("action.cancel")}</Button>
          </DialogClose>
          {conflict && service ? (
            <Button
              onClick={() => {
                mutation.reset();
                onDeactivate(service);
              }}
            >
              {t("action.editToDeactivate")}
            </Button>
          ) : (
            <Button variant="destructive" onClick={() => service && mutation.mutate(service.id)} disabled={mutation.isPending || !service}>
              {t("action.delete")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
