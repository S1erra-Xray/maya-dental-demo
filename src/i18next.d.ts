import "i18next";
import type { Catalogs } from "@/i18n";

// Types every t() key against the en-US catalogs, as in web: a key the namespace lacks fails tsc.
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: Catalogs;
  }
}
