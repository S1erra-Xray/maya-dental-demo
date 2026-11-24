// PROTOTYPE-ONLY. Runtime config, same idea as web's src/env.ts: fetched once at boot from config.json.
// `mock: true` answers every apiFetch from src/mocks; `mock: false` sends it to `apiBase`.
// Not ported: web keeps its own env.ts.
type RuntimeConfig = {
  apiBase: string;
  mock: boolean;
};

let cached: RuntimeConfig | null = null;

export async function loadRuntimeConfig(): Promise<void> {
  if (cached !== null) return;
  // BASE_URL is "/<repo>/" on GitHub Pages, "/" locally.
  const res = await fetch(`${import.meta.env.BASE_URL}config.json`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to load config.json: ${res.status} ${res.statusText}`);
  }
  const cfg = (await res.json()) as Partial<RuntimeConfig>;
  cached = {
    apiBase: (cfg.apiBase ?? "").replace(/\/$/, ""),
    mock: cfg.mock ?? true,
  };
}

function get(): RuntimeConfig {
  if (cached === null) {
    throw new Error("Runtime config not loaded. main.tsx must await loadRuntimeConfig() first.");
  }
  return cached;
}

export const env = {
  get apiBase(): string { return get().apiBase; },
  get mock(): boolean { return get().mock; },
};
