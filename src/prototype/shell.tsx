// PROTOTYPE-ONLY. A light stand-in for web's AppShell: sidebar, demo banner and theme switch. No auth, realtime or command palette. Not ported: pages render inside web's AppShell.
import { Suspense, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Moon, RotateCcw, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { env } from "@/env";
import { cn } from "@/lib/cn";
import { resetMockData } from "@/mocks/store";
import { NAV_ITEMS, type PrototypeNavItem } from "./nav";

const TITLE = "Maya Dental — Clinic Desk";

export function PrototypeShell() {
  const { t } = useTranslation("prototype");
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  const toggleTheme = () => {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("fsh.theme", next ? "dark" : "light");
    setDark(next);
  };
  const resetDemo = () => {
    resetMockData();
    window.location.reload();
  };

  return (
    <div className="flex min-h-full flex-col">
      {env.mock && (
        <div className="flex items-center justify-center gap-3 bg-[var(--color-primary)] px-4 py-1.5 text-[12px] text-[var(--color-primary-foreground)]">
          <span>{t("banner.text")}</span>
          <button type="button" onClick={resetDemo} className="inline-flex cursor-pointer items-center gap-1 underline underline-offset-2">
            <RotateCcw className="size-3" />
            {t("banner.reset")}
          </button>
        </div>
      )}
      <div className="flex flex-1">
        <aside className="hidden w-60 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-card)] p-4 md:block">
          <div className="mb-6 px-2 font-display text-[15px] font-semibold tracking-tight">{TITLE}</div>
          <nav aria-label={t("nav.primary")} className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <NavEntry key={item.to} item={item} />
            ))}
          </nav>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-4 py-2 sm:px-6">
            <nav aria-label={t("nav.primary")} className="flex gap-1 overflow-x-auto md:hidden">
              {NAV_ITEMS.map((item) => (
                <NavEntry key={item.to} item={item} />
              ))}
            </nav>
            <div className="ml-auto flex gap-1">
              <Button variant="ghost" size="sm" aria-label={t("theme.toggle")} onClick={toggleTheme}>
                {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </Button>
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
            <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  );
}

function NavEntry({ item }: { item: PrototypeNavItem }) {
  const { t } = useTranslation(item.ns);
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
          isActive
            ? "bg-[oklch(from_var(--color-primary)_l_c_h_/_0.10)] text-[var(--color-primary)]"
            : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]",
        )
      }
    >
      <Icon className="size-4" />
      {t(item.labelKey as never)}
    </NavLink>
  );
}

export function NotFoundPage() {
  const { t } = useTranslation("prototype");
  return (
    <div className="space-y-3 py-16 text-center">
      <h1 className="font-display text-2xl font-semibold">{t("notFound.title")}</h1>
      <NavLink to="/" className="text-[var(--color-primary)] underline underline-offset-2">
        {t("notFound.back")}
      </NavLink>
    </div>
  );
}
