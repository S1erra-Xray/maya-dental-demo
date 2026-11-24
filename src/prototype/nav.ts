// PROTOTYPE-ONLY. Sidebar entries. On import each entry becomes a web nav-data.ts item: the label
// moves to web's `common` catalog as `nav.<key>`, and `perm` comes from HANDOFF.md.
import { CalendarDays, Inbox, Receipt, Users, type LucideIcon } from "lucide-react";
import type { ParseKeys } from "i18next";
import type { Catalogs } from "@/i18n";

type Namespace = keyof Catalogs;

export type PrototypeNavItem = {
  [N in Namespace]: { to: string; ns: N; labelKey: ParseKeys<N>; icon: LucideIcon };
}[Namespace];

export const NAV_ITEMS: readonly PrototypeNavItem[] = [
  { to: "/schedule", ns: "clinic", labelKey: "nav.schedule", icon: CalendarDays },
  { to: "/booking-requests", ns: "clinic", labelKey: "nav.requests", icon: Inbox },
  { to: "/patients", ns: "clinic", labelKey: "nav.patients", icon: Users },
  { to: "/fee-guide", ns: "clinic", labelKey: "nav.fees", icon: Receipt },
];
