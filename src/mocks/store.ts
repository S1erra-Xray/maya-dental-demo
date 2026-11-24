// PROTOTYPE-ONLY. Mock persistence: seed data per collection, persisted to localStorage so edits made
// during a demo survive a reload. resetMockData() restores the seeds.
import type { PagedResponse } from "@/api/paged";

const STORAGE_PREFIX = "proto-mock:";

export type Entity = { id: string };

export type Collection<T extends Entity> = {
  all(): readonly T[];
  get(id: string): T | undefined;
  insert(item: T): T;
  update(id: string, patch: Partial<Omit<T, "id">>): T | undefined;
  remove(id: string): boolean;
};

export function createCollection<T extends Entity>(name: string, seed: readonly T[]): Collection<T> {
  const key = STORAGE_PREFIX + name;
  let items: readonly T[] = load<T>(key) ?? seed;

  const save = (next: readonly T[]): void => {
    items = next;
    localStorage.setItem(key, JSON.stringify(next));
  };

  return {
    all: () => items,
    get: (id) => items.find((item) => item.id === id),
    insert: (item) => {
      save([item, ...items]);
      return item;
    },
    update: (id, patch) => {
      const existing = items.find((item) => item.id === id);
      if (!existing) return undefined;
      const updated = { ...existing, ...patch };
      save(items.map((item) => (item.id === id ? updated : item)));
      return updated;
    },
    remove: (id) => {
      const next = items.filter((item) => item.id !== id);
      if (next.length === items.length) return false;
      save(next);
      return true;
    },
  };
}

export function resetMockData(): void {
  Object.keys(localStorage)
    .filter((key) => key.startsWith(STORAGE_PREFIX))
    .forEach((key) => localStorage.removeItem(key));
}

/** Case-insensitive `search` over the given text fields. */
export function searchBy<T>(
  items: readonly T[],
  query: URLSearchParams,
  fields: readonly (keyof T)[],
): readonly T[] {
  const term = (query.get("search") ?? "").trim().toLowerCase();
  if (!term) return items;
  return items.filter((item) =>
    fields.some((field) => String(item[field] ?? "").toLowerCase().includes(term)),
  );
}

/** Applies `sortBy`/`sortDir` (default: createdAtUtc desc when present) and FSH paging. */
export function paginate<T>(items: readonly T[], query: URLSearchParams): PagedResponse<T> {
  const sorted = sortItems(items, query);
  const pageSize = Math.max(1, Number(query.get("pageSize")) || 20);
  const totalCount = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const pageNumber = Math.min(Math.max(1, Number(query.get("pageNumber")) || 1), totalPages);
  const start = (pageNumber - 1) * pageSize;

  return {
    items: sorted.slice(start, start + pageSize),
    pageNumber,
    pageSize,
    totalCount,
    totalPages,
    hasNext: pageNumber < totalPages,
    hasPrevious: pageNumber > 1,
  };
}

export function newId(): string {
  return crypto.randomUUID();
}

export function nowUtc(): string {
  return new Date().toISOString();
}

function sortItems<T>(items: readonly T[], query: URLSearchParams): T[] {
  const sortBy = query.get("sortBy") ?? "createdAtUtc";
  const direction = query.get("sortDir") === "asc" ? 1 : -1;
  const first = items[0] as Record<string, unknown> | undefined;
  if (!first || !(sortBy in first)) return [...items];
  return [...items].sort((a, b) => {
    const left = (a as Record<string, unknown>)[sortBy];
    const right = (b as Record<string, unknown>)[sortBy];
    if (left === right) return 0;
    if (left === null || left === undefined) return 1;
    if (right === null || right === undefined) return -1;
    return (left < right ? -1 : 1) * direction;
  });
}

function load<T>(key: string): readonly T[] | undefined {
  const raw = localStorage.getItem(key);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T[];
  } catch {
    return undefined;
  }
}
