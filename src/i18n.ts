// PROTOTYPE-ONLY. English-only i18n with the same contract as web's src/i18n.ts: default export
// `i18n`, one namespace per area, flat dotted keys, en-US catalogs type every t() key. The en-US
// files port to web unchanged; web adds other languages itself.
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enCommon from "@/locales/en-US/common.json";
import enPrototype from "@/locales/en-US/prototype.json";
import enClinic from "@/locales/en-US/clinic.json";

type Catalog = Record<string, string>;

// Add one line per namespace (the file name in src/locales/en-US without .json).
const enCatalogs = {
  common: enCommon,
  prototype: enPrototype,
  clinic: enClinic,
} satisfies Record<string, Catalog>;

export type Catalogs = typeof enCatalogs;

export async function initI18n(): Promise<void> {
  await i18n.use(initReactI18next).init({
    resources: { "en-US": enCatalogs },
    lng: "en-US",
    fallbackLng: "en-US",
    ns: Object.keys(enCatalogs),
    defaultNS: "common",
    interpolation: { escapeValue: false },
  });
}

export default i18n;
