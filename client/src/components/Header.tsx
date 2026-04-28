import { useQuery } from "@tanstack/react-query";
import { forwardRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Check } from "lucide-react";
import { useLanguage, SUPPORTED_LANGUAGES } from "@/hooks/useLanguage";
import { showNotification } from "@/components/AppNotification";

const Header = forwardRef<HTMLDivElement>((_, ref) => {
  const { data: user } = useQuery<any>({
    queryKey: ['/api/auth/user'],
    retry: false,
  });

  const { language, setLanguage, isTranslating } = useLanguage();
  const [langPickerOpen, setLangPickerOpen] = useState(false);

  const photoUrl = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.photo_url;
  const name = (user as any)?.firstName
    ? `${(user as any).firstName}${(user as any).lastName ? ' ' + (user as any).lastName : ''}`
    : (user as any)?.username || 'User';
  const uid = (user as any)?.referralCode || (user as any)?.id?.slice(0, 8) || '—';
  const memberSince = (user as any)?.createdAt
    ? new Date((user as any).createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  const satBalance = Math.floor(parseFloat((user as any)?.balance || "0"));
  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];

  const handleSelectLanguage = (code: typeof language) => {
    setLanguage(code);
    setLangPickerOpen(false);
    const label = SUPPORTED_LANGUAGES.find(l => l.code === code)?.label || code;
    showNotification(`Language changed to ${label}`, 'success');
  };

  return (
    <>
      <div
        ref={ref}
        className="fixed top-0 left-0 right-0 z-40 bg-[#0f0f0f]/95 border-b border-white/5 backdrop-blur-md"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}
      >
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 border border-white/10">
              {photoUrl ? (
                <img src={photoUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#F5C542] to-[#d4920a] flex items-center justify-center text-black font-black text-base">
                  {name[0]?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-white font-black text-sm leading-none truncate">{name}</p>
              <p className="text-white/40 text-[11px] mt-1">
                ID: <span className="text-[#F5C542] font-bold">{uid}</span>
              </p>
              {memberSince && (
                <p className="text-white/30 text-[10px] mt-0.5">Member since {memberSince}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Flag / Language Button */}
            <button
              onClick={() => setLangPickerOpen(true)}
              className="w-9 h-9 rounded-xl bg-[#111] border border-[#222] flex items-center justify-center text-lg active:scale-95 transition-transform relative"
              aria-label="Change language"
            >
              {isTranslating ? (
                <span className="w-3.5 h-3.5 border-2 border-[#F5C542]/60 border-t-[#F5C542] rounded-full animate-spin block" />
              ) : (
                currentLang.flag
              )}
            </button>

            {/* SAT Balance */}
            <div className="flex items-center gap-1.5 bg-[#111] border border-[#222] rounded-2xl px-3 py-2">
              <img src="/sat-icon.png" alt="SAT" className="w-4 h-4 rounded-full object-cover" />
              <span className="text-white font-black text-sm tabular-nums">
                {satBalance.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Language Picker Bottom Sheet */}
      <AnimatePresence>
        {langPickerOpen && (
          <motion.div
            className="fixed inset-0 z-[999] flex items-end justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setLangPickerOpen(false)}
            />
            <motion.div
              className="relative w-full max-w-md bg-[#0d0d0d] border-t border-[#1a1a1a] rounded-t-3xl overflow-hidden"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "tween", duration: 0.22, ease: "easeOut" }}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>

              <div className="flex items-center justify-center px-5 py-3 border-b border-[#1a1a1a]">
                <span className="text-white font-black text-sm uppercase tracking-wide">Select Language</span>
              </div>

              <div className="max-h-[60vh] overflow-y-auto py-1.5" data-no-translate>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleSelectLanguage(lang.code)}
                    className={`w-full flex items-center justify-between px-5 py-3.5 transition-all active:bg-white/5 ${
                      language === lang.code ? 'bg-[#F5C542]/8' : 'hover:bg-white/4'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="text-2xl leading-none">{lang.flag}</span>
                      <div className="text-left">
                        <p className={`text-sm font-bold leading-none ${language === lang.code ? 'text-[#F5C542]' : 'text-white'}`}>
                          {lang.label}
                        </p>
                      </div>
                    </div>
                    {language === lang.code && (
                      <Check className="w-4 h-4 text-[#F5C542] flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              {isTranslating && (
                <div className="px-5 py-3 border-t border-[#1a1a1a] flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#F5C542] rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-[#F5C542] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-1.5 h-1.5 bg-[#F5C542] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <span className="text-white/40 text-xs ml-1">Translating…</span>
                </div>
              )}

              <div className="h-5" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

Header.displayName = 'Header';

export default Header;
