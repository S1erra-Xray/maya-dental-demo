import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { BadgeCheck, ChevronRight, Plus, Search, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { COVERAGE_TYPES, listLocations, searchPatients, type CoverageType, type PatientDto } from "@/api/clinic";
import { Button } from "@/components/ui/button";
import {
  EntityEmpty,
  EntityFilterPill,
  EntityInitialsAvatar,
  EntityListCard,
  EntityListHeader,
  EntityListLoading,
  EntityListRow,
  EntityPageHeader,
  EntityPager,
  EntitySearch,
  EntityStatusBadge,
  ErrorBand,
} from "@/components/list";
import { describe, formatDate } from "@/lib/list-helpers";
import { COVERAGE_LABEL, COVERAGE_TONE, ageFrom } from "./clinic-shared";
import { PatientEditorDialog, type PatientEditorState } from "./patient-editor";

const PAGE_SIZE = 20;
const COLUMNS = "grid-cols-[minmax(0,1.4fr)_minmax(0,1.1fr)_minmax(0,1fr)_130px_130px_24px]";

export function PatientsPage() {
  const { t } = useTranslation("clinic");
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [locationId, setLocationId] = useState<string | null>(null);
  const [coverage, setCoverage] = useState<CoverageType | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [editor, setEditor] = useState<PatientEditorState>({ mode: "closed" });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPageNumber(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const locationsQuery = useQuery({ queryKey: ["clinic", "locations"], queryFn: listLocations, staleTime: Infinity });
  const query = useQuery({
    queryKey: ["clinic", "patients", { search: debouncedSearch, locationId, coverage, pageNumber, pageSize: PAGE_SIZE }],
    queryFn: () =>
      searchPatients({ search: debouncedSearch || undefined, locationId, coverage, pageNumber, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const locations = locationsQuery.data ?? [];
  const data = query.data;
  const items = data?.items ?? [];
  const filtered = debouncedSearch.length > 0 || locationId !== null || coverage !== null;
  const open = (p: PatientDto) => navigate(`/patients/${p.id}`);

  return (
    <div className="space-y-4 sm:space-y-6">
      <EntityPageHeader icon={Users} title={t("patients.title")} total={data?.totalCount ?? null} description={t("patients.description")}>
        <Button onClick={() => setEditor({ mode: "create" })} className="h-9 gap-1.5 rounded-lg px-4 text-[13px] font-semibold">
          <Plus className="size-4" />
          {t("action.newPatient")}
        </Button>
      </EntityPageHeader>

      <EntitySearch value={search} onChange={setSearch} placeholder={t("patients.searchPlaceholder")} />

      <div className="flex flex-wrap items-center gap-2">
        <EntityFilterPill<string | null>
          label={t("filter.location")}
          value={locationId}
          onChange={(next) => {
            setLocationId(next);
            setPageNumber(1);
          }}
          options={[{ value: null, label: t("filter.allLocations") }, ...locations.map((l) => ({ value: l.id, label: l.name }))]}
        />
        <EntityFilterPill<CoverageType | null>
          label={t("filter.coverage")}
          value={coverage}
          onChange={(next) => {
            setCoverage(next);
            setPageNumber(1);
          }}
          options={[{ value: null, label: t("filter.all") }, ...COVERAGE_TYPES.map((c) => ({ value: c, label: t(COVERAGE_LABEL[c]) }))]}
        />
      </div>

      {query.isError && <ErrorBand message={describe(query.error)} />}

      {query.isLoading && items.length === 0 ? (
        <EntityListLoading desktopColumns={COLUMNS} />
      ) : items.length === 0 ? (
        <EntityEmpty
          icon={filtered ? Search : Users}
          title={filtered ? t("patients.empty.filteredTitle") : t("patients.empty.title")}
          body={filtered ? t("patients.empty.filteredBody") : t("patients.empty.body")}
          action={
            filtered ? (
              <Button variant="outline" onClick={() => { setSearch(""); setLocationId(null); setCoverage(null); }} className="h-9 rounded-lg px-4 text-[13px]">
                {t("action.clearFilters")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div>
          <EntityListCard>
            <EntityListHeader className={`hidden md:grid ${COLUMNS}`}>
              <span>{t("col.patient")}</span>
              <span>{t("col.contact")}</span>
              <span>{t("col.coverage")}</span>
              <span>{t("col.lastVisit")}</span>
              <span>{t("col.nextVisit")}</span>
              <span />
            </EntityListHeader>
            {items.map((p, i) => (
              <EntityListRow
                key={p.id}
                className="grid-cols-1 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.1fr)_minmax(0,1fr)_130px_130px_24px]"
                isLast={i === items.length - 1}
                onClick={() => open(p)}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <EntityInitialsAvatar name={`${p.firstName} ${p.lastName}`} size={36} />
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-medium group-hover:text-[var(--color-primary)]">
                      {p.lastName}, {p.firstName}
                    </div>
                    <div className="text-[11.5px] text-[var(--color-muted-foreground)]">
                      <code className="font-mono">{p.chartNumber}</code> · {t("patients.age", { count: ageFrom(p.dateOfBirth) })}
                    </div>
                  </div>
                </div>
                <div className="min-w-0 text-[12.5px]">
                  <div className="truncate tabular-nums">{p.phone}</div>
                  <div className="truncate text-[var(--color-muted-foreground)]">{p.email ?? "—"}</div>
                </div>
                <div className="min-w-0">
                  <EntityStatusBadge tone={COVERAGE_TONE[p.coverage]}>{t(COVERAGE_LABEL[p.coverage])}</EntityStatusBadge>
                  {p.insurerName && (
                    <div className="mt-0.5 flex items-center gap-1 truncate text-[11.5px] text-[var(--color-muted-foreground)]">
                      {p.insurerName}
                      {p.directBilling && <BadgeCheck aria-label={t("field.directBilling")} className="size-3 text-[var(--color-success)]" />}
                    </div>
                  )}
                </div>
                <span className="text-[12px] text-[var(--color-muted-foreground)]">{formatDate(p.lastVisitAtUtc)}</span>
                <span className="text-[12px]">{formatDate(p.nextAppointmentAtUtc)}</span>
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

      <PatientEditorDialog state={editor} onClose={() => setEditor({ mode: "closed" })} onCreated={(id) => navigate(`/patients/${id}`)} />
    </div>
  );
}
