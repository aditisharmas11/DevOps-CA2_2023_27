import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import { fr } from "./locales/fr";
import { ar } from "./locales/ar";
import { en } from "./locales/en";

export const SUPPORTED_LANGS = ["fr", "en", "ar"] as const;

export type Lang = (typeof SUPPORTED_LANGS)[number];

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        fr: {
          translation: fr,
        },
        en: {
          translation: en,
        },
        ar: {
          translation: ar,
        },
      },

      fallbackLng: "fr",

      supportedLngs: SUPPORTED_LANGS as unknown as string[],

      interpolation: {
        escapeValue: false,
      },

      detection: {
        order: ["localStorage", "navigator"],
        caches: ["localStorage"],
        lookupLocalStorage: "batir-tchad-lang",
      },
    });
}

export function applyDir(lang: string) {
  if (typeof document === "undefined") return;

  const isRtl = lang.startsWith("ar");

  const language = lang.startsWith("en")
    ? "en"
    : isRtl
      ? "ar"
      : "fr";

  document.documentElement.lang = language;
  document.documentElement.dir = isRtl ? "rtl" : "ltr";
}

i18n.on("languageChanged", applyDir);

if (typeof window !== "undefined") {
  applyDir(i18n.language || "fr");
}

export default i18n;