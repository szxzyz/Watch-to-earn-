import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

type Language = 'en' | 'ru' | 'fa' | 'ar' | 'tr' | 'es' | 'pt' | 'id' | 'bn' | 'de' | 'ja' | 'ko';

export const SUPPORTED_LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'id', label: 'Indonesia', flag: '🇮🇩' },
  { code: 'bn', label: 'বাংলা', flag: '🇧🇩' },
  { code: 'fa', label: 'فارسی', flag: '🇮🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
];

// All visible strings in the app that should be translated
export const APP_STRINGS = [
  // Home page
  'Mining Power', 'Watch Ads to Boost Mining', 'Complete Tasks to Earn More',
  '24 HOURS OF VALIDITY', 'Daily Tasks', 'Open', 'Invite', 'Withdraw', 'Menu',
  'Mining Paused', 'You were inactive for 48 hours.', 'Open the app to resume mining.',
  'Resume Mining', 'Claim', 'Member since', 'Mining Paused',
  'You were inactive for 2 days. Mining has resumed now that you\'re back.',
  // Tasks
  'Tasks', 'Promoted Tasks', 'No promoted tasks', 'Completed', 'Back',
  'Start', 'Share', 'Locked', 'Watching...', 'Check-in', 'Claim',
  // Withdrawal
  'SAT Withdrawal', 'Available Balance', 'Destination address',
  "Don't have an address yet?", 'Amount (SAT)', 'Max', 'Withdraw Fee',
  'Min. Withdrawal', 'You Receive', 'Withdraw SAT', 'Close',
  'Almost There!', 'Watch ads to unlock your withdrawal.',
  'Ads keep this platform free for everyone. Thank you for your support!',
  'Progress',
  // Invite
  'Invite Friends', 'Earn', 'per friend', 'Total referrals', 'Active',
  'Copy Link', 'Referrals', 'Copied!', 'Refresh', 'No referrals yet',
  'Your referral link', 'Share Link',
  // Menu / Wallet
  'Wallet', 'Balance', 'History', 'Withdrawal History', 'No withdrawals yet',
  'Pending', 'Approved', 'Rejected', 'Mining Stats', 'Total Mined',
  'Rate', 'Check for Updates', 'Daily Check-in', 'Share with Friends',
  'Reward', 'Settings', 'Boosts', 'Active Boosts', 'No active boosts',
  // Settings
  'My UID', 'Contact Support', 'Legal Information', 'Terms & Conditions',
  'Privacy Policy', 'Acceptable Use Policy', 'Admin Panel',
  // Misc
  'Loading...', 'Error', 'Success', 'Copied to clipboard!',
  'Select Language', 'App Language', 'Watch', 'Wait', 'Check',
];

const BASE_TRANSLATIONS: Record<string, string> = {
  home: 'Home', shop: 'Shop', menu: 'Menu', settings: 'Settings',
  my_uid: 'My UID', language: 'Language', contact_support: 'Contact Support',
  legal_info: 'Legal Information', terms_conditions: 'Terms & Conditions',
  privacy_policy: 'Privacy Policy', acceptable_use: 'Acceptable Use Policy',
  copied: 'Copied to clipboard!', close: 'Close', axn_balance: 'AXN Balance',
  user_account: 'User Account', active: 'Active', user_uid: 'User UID',
  account_localization: 'Account & Localization', support_legal: 'Support & Legal',
  app_language: 'App Language', invite_friends: 'Invite Friends',
  earn_commissions: 'Earn Commissions', watch_ads: 'Watch Ads',
  daily_reward: 'Daily Reward', mining_status: 'Mining Status', rank: 'Rank',
  total_axn: 'Total AXN', total_usd: 'Total USD', mining_power: 'Mining Power',
  earn: 'Earn', referrals: 'Referrals', invite_friends_earn: 'Invite friends and earn',
  referral_desc_prefix: '10% of their AXN and When your friend buys a plan you get',
  referral_desc_suffix: 'instantly', user_referred: 'User referred',
  successful: 'Successful', copy_link: 'Copy Link', total_axn_mined: 'Total AXN Mined',
  total_ton_earned: 'Total TON Earned', mined_axn: 'MINED AXN', upgrade: 'UPGRADE',
  claim: 'CLAIM', convert: 'Convert', promo: 'Promo', back: 'Back',
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  tText: (text: string) => string;
  translateText: (text: string) => Promise<string>;
  isTranslating: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Tokens that must NEVER be translated (currency units, hash-rate units, brand acronyms).
// Matches "SAT", "BTC", and any hash-rate like "MH/s", "GH/s", "TH/s", "kH/s", "H/s".
const PROTECTED_REGEX = /\bSAT\b|\bBTC\b|\b[KkMmGgTtPp]?H\/s\b/g;

function maskProtected(text: string): { masked: string; tokens: string[] } {
  const tokens: string[] = [];
  const masked = text.replace(PROTECTED_REGEX, (match) => {
    tokens.push(match);
    return `__P${tokens.length - 1}__`;
  });
  return { masked, tokens };
}

function unmaskProtected(translated: string, tokens: string[]): string {
  if (!tokens.length) return translated;
  return translated.replace(/__P(\d+)__/g, (_m, i) => tokens[Number(i)] ?? `__P${i}__`);
}

async function googleTranslateBulk(texts: string[], targetLang: string): Promise<string[]> {
  if (targetLang === 'en' || texts.length === 0) return texts;
  try {
    const masks = texts.map(maskProtected);
    const SEPARATOR = ' ||||| ';
    const joined = masks.map((m) => m.masked).join(SEPARATOR);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(joined)}`;
    const res = await fetch(url);
    if (!res.ok) return texts;
    const data = await res.json();
    if (!data || !data[0]) return texts;
    const fullTranslated = data[0].map((seg: any[]) => seg[0] || '').join('');
    const parts = fullTranslated.split(/\s*\|\|\|\|\|\s*/);
    return texts.map((orig, i) => {
      const t = parts[i]?.trim();
      if (!t) return orig;
      return unmaskProtected(t, masks[i].tokens) || orig;
    });
  } catch {
    return texts;
  }
}

// ──────────── Whole-page DOM translator ────────────
// Stores original English text per node so we can restore on switch back to 'en'
const nodeOriginals = new WeakMap<Text, string>();
const elementOriginals = new WeakMap<HTMLElement, { placeholder?: string; title?: string; ariaLabel?: string }>();

function shouldTranslateText(txt: string): boolean {
  if (!txt || !txt.trim()) return false;
  // Strip protected tokens (SAT/BTC/MH-s/GH-s/etc.), numbers, and punctuation —
  // if nothing alphabetic remains, the text is purely a unit/number and shouldn't be translated.
  const stripped = txt
    .replace(PROTECTED_REGEX, '')
    .replace(/[\d.,+\-\s/%]/g, '');
  if (!/[A-Za-z]{2,}/.test(stripped)) return false;
  return true;
}

function collectTranslatableNodes(root: Node): Text[] {
  const out: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const t = node as Text;
      const parent = t.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      const tag = parent.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'CODE') return NodeFilter.FILTER_REJECT;
      if (parent.closest('[data-no-translate]')) return NodeFilter.FILTER_REJECT;
      if (parent.isContentEditable) return NodeFilter.FILTER_REJECT;
      // ALWAYS accept nodes we've already seen (we know their English originals);
      // this is essential when switching from one non-English language to another —
      // their current text is in the OLD language and would otherwise be filtered out.
      if (nodeOriginals.has(t)) return NodeFilter.FILTER_ACCEPT;
      const txt = t.nodeValue || '';
      if (!shouldTranslateText(txt)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  let n: Node | null;
  while ((n = walker.nextNode())) out.push(n as Text);
  return out;
}

function collectAttrElements(root: Node): HTMLElement[] {
  if (!(root instanceof Element) && root !== document.body) return [];
  const startEl = root instanceof Element ? root : document.body;
  const all = startEl.querySelectorAll<HTMLElement>('[placeholder], [title], [aria-label]');
  return Array.from(all).filter(el => !el.closest('[data-no-translate]'));
}

async function googleTranslateSingle(text: string, targetLang: string): Promise<string> {
  if (targetLang === 'en' || !text.trim()) return text;
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) return text;
    const data = await res.json();
    return data?.[0]?.[0]?.[0] || text;
  } catch {
    return text;
  }
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try { return (localStorage.getItem('app_language') as Language) || 'en'; } catch { return 'en'; }
  });

  // Key-based cache: { lang -> { key -> translatedValue } }
  const keyCache = useRef<Record<string, Record<string, string>>>({ en: BASE_TRANSLATIONS });
  // Text-based cache: { lang -> { originalEnglish -> translated } }
  const textCache = useRef<Record<string, Record<string, string>>>({ en: {} });

  const [activeLang, setActiveLang] = useState<Language>(language);
  const [isTranslating, setIsTranslating] = useState(false);

  // Pre-warm the localStorage cache synchronously so the very first render can use it.
  if (language !== 'en' && !textCache.current[language]) {
    try {
      const stored = localStorage.getItem(`ttext_v2_${language}`);
      if (stored) textCache.current[language] = JSON.parse(stored);
    } catch {}
    try {
      const storedKeys = localStorage.getItem(`translations_${language}`);
      if (storedKeys) keyCache.current[language] = JSON.parse(storedKeys);
    } catch {}
  }

  // setLanguage: pre-fetch ALL currently-visible English strings BEFORE flipping
  // the active language. This guarantees the flip is instant — no English flash,
  // no partial translation, no stuck-old-language popups.
  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang);
    try { localStorage.setItem('app_language', lang); } catch {}

    if (lang === 'en') {
      setActiveLang('en');
      return;
    }

    setIsTranslating(true);
    try {
      // 1. Hydrate caches from localStorage (instant)
      if (!keyCache.current[lang]) {
        const storedKeys = localStorage.getItem(`translations_${lang}`);
        if (storedKeys) keyCache.current[lang] = JSON.parse(storedKeys);
      }
      if (!textCache.current[lang]) {
        const storedText = localStorage.getItem(`ttext_v2_${lang}`);
        if (storedText) textCache.current[lang] = JSON.parse(storedText);
        else textCache.current[lang] = {};
      }

      const keyCacheLang = keyCache.current[lang] || (keyCache.current[lang] = {});
      const textCacheLang = textCache.current[lang]!;

      // 2. Collect every currently-visible English string from the DOM right now
      const visibleStrings = new Set<string>();
      collectTranslatableNodes(document.body).forEach((node) => {
        const orig = nodeOriginals.get(node) ?? node.nodeValue ?? '';
        const t = orig.trim();
        if (t) visibleStrings.add(t);
      });
      collectAttrElements(document.body).forEach((el) => {
        const saved = elementOriginals.get(el);
        const placeholder = saved?.placeholder ?? el.getAttribute('placeholder') ?? '';
        const title = saved?.title ?? el.getAttribute('title') ?? '';
        const aria = saved?.ariaLabel ?? el.getAttribute('aria-label') ?? '';
        [placeholder, title, aria].forEach((s) => {
          const t = s.trim();
          if (t && shouldTranslateText(t)) visibleStrings.add(t);
        });
      });

      // 3. Fetch translations for everything not already cached
      const baseValues = Object.values(BASE_TRANSLATIONS);
      const baseKeys = Object.keys(BASE_TRANSLATIONS);
      const baseMissingIdx = baseKeys
        .map((k, i) => ({ k, i }))
        .filter(({ k }) => !(k in keyCacheLang));
      const textMissing = [...visibleStrings, ...APP_STRINGS].filter(
        (s, i, arr) => arr.indexOf(s) === i && !(s in textCacheLang),
      );

      const missingTotal = baseMissingIdx.map(({ i }) => baseValues[i]).concat(textMissing);
      if (missingTotal.length > 0) {
        const CHUNK = 30;
        const translated: string[] = [];
        for (let i = 0; i < missingTotal.length; i += CHUNK) {
          const chunk = missingTotal.slice(i, i + CHUNK);
          const out = await googleTranslateBulk(chunk, lang);
          translated.push(...out);
        }
        // Distribute results back
        baseMissingIdx.forEach(({ k }, idx) => {
          keyCacheLang[k] = translated[idx] || baseValues[idx] || k;
        });
        textMissing.forEach((s, idx) => {
          textCacheLang[s] = translated[baseMissingIdx.length + idx] || s;
        });
        try { localStorage.setItem(`translations_${lang}`, JSON.stringify(keyCacheLang)); } catch {}
        try { localStorage.setItem(`ttext_v2_${lang}`, JSON.stringify(textCacheLang)); } catch {}
      }

      // 4. NOW flip the active language — DOM translator below applies synchronously
      setActiveLang(lang);
    } catch {
      setActiveLang(lang);
    } finally {
      setIsTranslating(false);
    }
  }, []);

  // On initial mount, hydrate the saved language so it persists across reloads.
  React.useEffect(() => {
    if (language === 'en') {
      setActiveLang('en');
    } else {
      setActiveLang(language);
      // Background-refresh missing translations for newly added UI strings
      setLanguage(language);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ────────── Whole-page translation engine ──────────
  // useLayoutEffect → runs synchronously after DOM mutations and BEFORE the browser
  // paints, so the user never sees a flash of untranslated text.
  React.useLayoutEffect(() => {
    let cancelled = false;
    let scheduled = false;
    let observer: MutationObserver | null = null;
    let isApplying = false;

    const lang = activeLang;
    const cache = lang === 'en' ? null : (textCache.current[lang] || (textCache.current[lang] = {}));

    const observerOpts: MutationObserverInit = {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label'],
    };

    const apply = () => {
      if (cancelled || isApplying) return;
      isApplying = true;

      // Pause the observer while we mutate so we don't trigger ourselves
      observer?.disconnect();
      try {
        const textNodes = collectTranslatableNodes(document.body);
        const attrEls = collectAttrElements(document.body);

        if (lang === 'en') {
          // Restore originals
          textNodes.forEach((node) => {
            const orig = nodeOriginals.get(node);
            if (orig !== undefined && node.nodeValue !== orig) node.nodeValue = orig;
          });
          attrEls.forEach((el) => {
            const orig = elementOriginals.get(el);
            if (!orig) return;
            if (orig.placeholder !== undefined && el.getAttribute('placeholder') !== orig.placeholder) el.setAttribute('placeholder', orig.placeholder);
            if (orig.title !== undefined && el.getAttribute('title') !== orig.title) el.setAttribute('title', orig.title);
            if (orig.ariaLabel !== undefined && el.getAttribute('aria-label') !== orig.ariaLabel) el.setAttribute('aria-label', orig.ariaLabel);
          });
          return;
        }

        const c = cache!;
        const missing = new Set<string>();

        // Apply text nodes
        for (const node of textNodes) {
          let orig = nodeOriginals.get(node);
          if (orig === undefined) {
            orig = node.nodeValue || '';
            nodeOriginals.set(node, orig);
          }
          const text = orig.trim();
          if (!text) continue;
          const trans = c[text];
          if (trans) {
            const leading = orig.match(/^\s*/)?.[0] || '';
            const trailing = orig.match(/\s*$/)?.[0] || '';
            const newValue = leading + trans + trailing;
            if (node.nodeValue !== newValue) node.nodeValue = newValue;
          } else {
            missing.add(text);
          }
        }

        // Apply attributes
        for (const el of attrEls) {
          let orig = elementOriginals.get(el);
          if (!orig) {
            orig = {
              placeholder: el.getAttribute('placeholder') || undefined,
              title: el.getAttribute('title') || undefined,
              ariaLabel: el.getAttribute('aria-label') || undefined,
            };
            elementOriginals.set(el, orig);
          }
          const tryApply = (attr: 'placeholder' | 'title' | 'aria-label', text?: string) => {
            if (!text || !shouldTranslateText(text)) return;
            const t = text.trim();
            const trans = c[t];
            if (trans) {
              if (el.getAttribute(attr) !== trans) el.setAttribute(attr, trans);
            } else {
              missing.add(t);
            }
          };
          tryApply('placeholder', orig.placeholder);
          tryApply('title', orig.title);
          tryApply('aria-label', orig.ariaLabel);
        }

        // Async-fetch only what we don't have yet (rare — only newly-rendered strings)
        if (missing.size > 0) {
          const list = Array.from(missing);
          (async () => {
            const CHUNK = 25;
            for (let i = 0; i < list.length; i += CHUNK) {
              if (cancelled || activeLang !== lang) return;
              const chunk = list.slice(i, i + CHUNK);
              const out = await googleTranslateBulk(chunk, lang);
              chunk.forEach((s, idx) => { c[s] = out[idx] || s; });
            }
            try { localStorage.setItem(`ttext_v2_${lang}`, JSON.stringify(c)); } catch {}
            if (!cancelled && activeLang === lang) apply();
          })();
        }
      } finally {
        isApplying = false;
        // Re-attach observer
        if (!cancelled) observer?.observe(document.body, observerOpts);
      }
    };

    const schedule = () => {
      if (scheduled || isApplying) return;
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        apply();
      });
    };

    // Apply IMMEDIATELY (synchronously) — no debounce on the initial pass
    apply();

    observer = new MutationObserver(schedule);
    observer.observe(document.body, observerOpts);

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [activeLang]);

  // Key-based lookup (for Settings keys)
  const t = useCallback((key: string): string => {
    const cache = keyCache.current[activeLang] || keyCache.current['en'] || {};
    return cache[key] || BASE_TRANSLATIONS[key] || key;
  }, [activeLang]);

  // Text-based lookup (for any hardcoded string)
  const tText = useCallback((text: string): string => {
    if (activeLang === 'en') return text;
    const cache = textCache.current[activeLang];
    return cache?.[text] || text;
  }, [activeLang]);

  const translateText = useCallback(async (text: string): Promise<string> => {
    if (language === 'en') return text;
    // Check text cache first
    const cache = textCache.current[language];
    if (cache?.[text]) return cache[text];
    const result = await googleTranslateSingle(text, language);
    if (!textCache.current[language]) textCache.current[language] = {};
    textCache.current[language][text] = result;
    return result;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, tText, translateText, isTranslating }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
