import React, { useEffect } from "react";

export interface GoogleLanguageOption {
  code: string;
  bcp47: string;
  label: string;
}

export const GOOGLE_LANGUAGES: readonly GoogleLanguageOption[] = [
  { code: "ko", bcp47: "ko-KR", label: "🇰🇷 한국어 (Korean)" },
  { code: "en", bcp47: "en-US", label: "🇺🇸 English (US)" },
  { code: "ja", bcp47: "ja-JP", label: "🇯🇵 日本語 (Japanese)" },
  { code: "zh-CN", bcp47: "zh-CN", label: "🇨🇳 中文(简体)" },
  { code: "zh-TW", bcp47: "zh-TW", label: "🇹🇼 中文(繁體)" },
  { code: "es", bcp47: "es-ES", label: "🇪🇸 Español" },
  { code: "fr", bcp47: "fr-FR", label: "🇫🇷 Français" },
  { code: "de", bcp47: "de-DE", label: "🇩🇪 Deutsch" },
  { code: "pt", bcp47: "pt-BR", label: "🇧🇷 Português" },
  { code: "it", bcp47: "it-IT", label: "🇮🇹 Italiano" },
  { code: "ru", bcp47: "ru-RU", label: "🇷🇺 Русский" },
  { code: "ar", bcp47: "ar-SA", label: "🇸🇦 العربية" },
  { code: "hi", bcp47: "hi-IN", label: "🇮🇳 हिन्दी" },
  { code: "vi", bcp47: "vi-VN", label: "🇻🇳 Tiếng Việt" },
  { code: "th", bcp47: "th-TH", label: "🇹🇭 ไทย" },
  { code: "id", bcp47: "id-ID", label: "🇮🇩 Bahasa Indonesia" },
];

export function getBcp47ForLang(code: string): string {
  return GOOGLE_LANGUAGES.find((l) => l.code === code)?.bcp47 ?? "en-US";
}

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: {
      translate?: {
        TranslateElement?: new (
          options: { pageLanguage: string; includedLanguages?: string; autoDisplay?: boolean },
          elementId: string,
        ) => unknown;
      };
    };
  }
}

export interface GoogleLanguageSelectorProps {
  value: string;
  onChange: (langCode: string) => void;
}

function setGoogTransCookie(langCode: string) {
  if (typeof document === "undefined") return;
  if (langCode === "ko") {
    document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "googtrans=/ko/ko; path=/;";
  } else {
    document.cookie = `googtrans=/ko/${langCode}; path=/;`;
  }
}

function triggerGoogleTranslate(langCode: string, attempt = 0) {
  if (typeof document === "undefined") return;
  const combo = document.querySelector<HTMLSelectElement>(".goog-te-combo");
  if (!combo) {
    if (attempt < 15) {
      window.setTimeout(() => triggerGoogleTranslate(langCode, attempt + 1), 250);
    }
    return;
  }
  combo.value = langCode;
  combo.dispatchEvent(new Event("change", { bubbles: true }));
}

export const GoogleLanguageSelector: React.FC<GoogleLanguageSelectorProps> = ({ value, onChange }) => {
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const included = GOOGLE_LANGUAGES.map((l) => l.code).join(",");
    window.googleTranslateElementInit = () => {
      const Ctor = window.google?.translate?.TranslateElement;
      const host = document.getElementById("google_translate_element");
      if (Ctor && host && host.childElementCount === 0) {
        new Ctor(
          {
            pageLanguage: "ko",
            includedLanguages: included,
            autoDisplay: false,
          },
          "google_translate_element",
        );
      }
    };

    const existing = document.getElementById("google-translate-script");
    if (!existing) {
      const script = document.createElement("script");
      script.id = "google-translate-script";
      script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
    } else if (window.google?.translate?.TranslateElement) {
      window.googleTranslateElementInit();
    }
  }, []);

  useEffect(() => {
    setGoogTransCookie(value);
    if (value !== "ko") {
      triggerGoogleTranslate(value);
    }
  }, [value]);

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextCode = e.target.value;
    setGoogTransCookie(nextCode);
    triggerGoogleTranslate(nextCode);
    onChange(nextCode);
  };

  return (
    <div className="flex items-center gap-1" translate="no">
      <div id="google_translate_element" className="hidden" aria-hidden="true" />
      <label htmlFor="google-lang-select" className="sr-only">
        Language
      </label>
      <div className="relative flex items-center bg-slate-950 border border-emerald-500/40 rounded-lg px-2 py-1 shadow">
        <span className="text-xs mr-1" aria-hidden="true">
          🌐
        </span>
        <select
          id="google-lang-select"
          value={value}
          onChange={handleSelect}
          className="bg-slate-950 text-slate-100 text-[10px] sm:text-[11px] font-bold focus:outline-none cursor-pointer pr-1"
          aria-label="Google Multi-Country Language Selector"
        >
          {GOOGLE_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code} className="bg-slate-950 text-slate-100">
              {lang.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default GoogleLanguageSelector;
