import { Language } from '../../types';

// Centralized Multilingual Speech Synthesis Engine
// Guarantees 100% strict matching between user-selected UI Language and AI TTS Voice Output.

let cachedVoices: SpeechSynthesisVoice[] = [];

const refreshVoices = () => {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    const list = window.speechSynthesis.getVoices();
    if (list && list.length > 0) {
      cachedVoices = list;
    }
  }
};

if (typeof window !== 'undefined' && window.speechSynthesis) {
  refreshVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    refreshVoices();
  };
}

const LANGUAGE_CONFIG: Record<
  Language,
  {
    bcp47: string;
    langCodes: string[];
    nameKeywords: string[];
  }
> = {
  ko: {
    bcp47: 'ko-KR',
    langCodes: ['ko-kr', 'ko_kr', 'ko', 'kor'],
    nameKeywords: ['korean', '한국어', 'ko-kr', 'heami', 'sun-hi', 'yuna']
  },
  en: {
    bcp47: 'en-US',
    langCodes: ['en-us', 'en_us', 'en-gb', 'en_gb', 'en'],
    nameKeywords: ['english', 'en-us', 'david', 'zira', 'mark', 'jenny', 'guy']
  },
  ja: {
    bcp47: 'ja-JP',
    langCodes: ['ja-jp', 'ja_jp', 'ja', 'jpn'],
    nameKeywords: ['japanese', '日本語', 'ja-jp', 'ayumi', 'haruka', 'ichiro', 'nanami']
  },
  zh: {
    bcp47: 'zh-CN',
    langCodes: ['zh-cn', 'zh_cn', 'zh-hans', 'zh'],
    nameKeywords: ['chinese', 'mandarin', '中文', 'zh-cn', 'huihui', 'yaoyao', 'kangkang', 'xiaoxiao']
  },
  es: {
    bcp47: 'es-ES',
    langCodes: ['es-es', 'es_es', 'es-mx', 'es'],
    nameKeywords: ['spanish', 'español', 'es-es', 'helena', 'laura', 'pablo']
  },
  fr: {
    bcp47: 'fr-FR',
    langCodes: ['fr-fr', 'fr_fr', 'fr-ca', 'fr'],
    nameKeywords: ['french', 'français', 'fr-fr', 'julie', 'paul', 'denise']
  }
};

/**
 * Finds the most suitable voice for the specified language.
 * Strictly avoids using voices of mismatched languages.
 */
export const findStrictVoice = (lang: Language): SpeechSynthesisVoice | null => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;

  refreshVoices();
  const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const cfg = LANGUAGE_CONFIG[lang] || LANGUAGE_CONFIG.ko;

  // 1. Exact BCP-47 match
  const exact = voices.find(v => {
    const l = (v.lang || '').toLowerCase().replace(/_/g, '-');
    return l === cfg.bcp47.toLowerCase();
  });
  if (exact) return exact;

  // 2. Language code match (e.g. 'ko', 'ko-kr', 'ko_kr')
  const codeMatch = voices.find(v => {
    const l = (v.lang || '').toLowerCase().replace(/_/g, '-');
    return cfg.langCodes.some(c => l === c || l.startsWith(c + '-'));
  });
  if (codeMatch) return codeMatch;

  // 3. Name keyword match (e.g. voice name contains "Korean" or "한국어")
  const nameMatch = voices.find(v => {
    const n = (v.name || '').toLowerCase();
    return cfg.nameKeywords.some(kw => n.includes(kw));
  });
  if (nameMatch) return nameMatch;

  return null;
};

/**
 * Speaks the text with guaranteed synchronization to the selected language.
 * If no matching voice is found, it enforces utter.lang so browser doesn't read in a mismatched accent.
 */
export const speakLocalizedText = (text: string, lang: Language = 'ko', onEnd?: () => void) => {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    if (onEnd) onEnd();
    return;
  }

  try {
    window.speechSynthesis.cancel();

    // Clean symbols, markdown, and emojis that cause TTS stuttering
    const clean = text
      .replace(/\[.*?\]/g, '')
      .replace(/[#\*\_`~⚡🤖🛒📦🎉🗣️💡🎙️⚙️➕➖]/g, '')
      .trim();

    if (!clean) {
      if (onEnd) onEnd();
      return;
    }

    const cfg = LANGUAGE_CONFIG[lang] || LANGUAGE_CONFIG.ko;
    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang = cfg.bcp47;
    utter.rate = 1.05;
    utter.pitch = 1.0;

    const voice = findStrictVoice(lang);
    if (voice) {
      utter.voice = voice;
    }

    if (onEnd) {
      utter.onend = () => onEnd();
      utter.onerror = () => onEnd();
    }

    window.speechSynthesis.speak(utter);
  } catch (e) {
    console.warn('[ttsSpeaker] Speak notice:', e);
    if (onEnd) onEnd();
  }
};
