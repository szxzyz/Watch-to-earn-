import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppNotification from "@/components/AppNotification";
import { useEffect, lazy, Suspense, useState, memo, useCallback, useRef } from "react";
import { setupDeviceTracking } from "@/lib/deviceId";
import BanScreen from "@/components/BanScreen";
import CountryBlockedScreen from "@/components/CountryBlockedScreen";
import SeasonEndOverlay from "@/components/SeasonEndOverlay";
import { SeasonEndContext } from "@/lib/SeasonEndContext";
import { useAdmin } from "@/hooks/useAdmin";
import ChannelJoinPopup from "@/components/ChannelJoinPopup";

declare global {
  interface Window {
    show_10401872: (type?: string | { type: string; inAppSettings: any }) => Promise<void>;
  }
}

const Home = lazy(() => import("@/pages/Home"));
const Landing = lazy(() => import("@/pages/Landing"));
const Admin = lazy(() => import("@/pages/Admin"));
const Profile = lazy(() => import("@/pages/Profile"));
const CreateTask = lazy(() => import("@/pages/CreateTask"));
const CountryControls = lazy(() => import("@/pages/CountryControls"));
const NotFound = lazy(() => import("@/pages/not-found"));

const PageLoader = memo(function PageLoader() {
  return null;
});

function LoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a]">
      <div className="absolute w-64 h-64 bg-[#F5C542]/5 rounded-full blur-[100px]" />
      <div className="relative flex flex-col items-center gap-6 z-10">
        <div className="relative w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-[#F5C542]/20 animate-ping" />
          <div className="absolute inset-0 rounded-full border border-[#F5C542]/10" />
          <div className="w-full h-full rounded-full overflow-hidden border border-[#F5C542]/30 shadow-lg">
            <img src="/btc-icon.jpg" alt="Bitcoin" className="w-full h-full object-cover" />
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-white font-black text-lg tracking-widest uppercase">Lightning Sats</h1>
          <p className="text-[#8E8E93] text-[10px] font-semibold uppercase tracking-widest mt-1">Mine · Earn · Withdraw</p>
        </div>
        <div className="flex items-center gap-1.5 mt-2">
          <div className="w-1.5 h-1.5 bg-[#F5C542] rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
          <div className="w-1.5 h-1.5 bg-[#F5C542] rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
          <div className="w-1.5 h-1.5 bg-[#F5C542] rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
        </div>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/task/create" component={CreateTask} />
        <Route path="/create-task" component={CreateTask} />
        <Route path="/profile" component={Profile} />
        <Route path="/admin" component={Admin} />
        <Route path="/admin/country-controls" component={CountryControls} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function AppContent() {
  const [showSeasonEnd, setShowSeasonEnd] = useState(false);
  const [seasonLockActive, setSeasonLockActive] = useState(false);
  const { isAdmin } = useAdmin();
  const inAppAdIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const inAppAdInitialized = useRef(false);
  const [popupAdsEnabled, setPopupAdsEnabled] = useState(true);
  const [popupAdInterval, setPopupAdInterval] = useState(60);
  
  const isDevMode = import.meta.env.DEV || import.meta.env.MODE === 'development';

  useEffect(() => {
    if (isDevMode) return;
    // Fetch popup ad settings
    fetch("/api/app-settings")
      .then(res => res.json())
      .then(settings => {
        setPopupAdsEnabled(settings.popupAdsEnabled !== false);
        setPopupAdInterval(settings.popupAdInterval || 60);
      })
      .catch(() => {});
  }, [isDevMode]);

  useEffect(() => {
    if (isDevMode) return;
    if (inAppAdInitialized.current) return;
    if (!popupAdsEnabled) return;
    inAppAdInitialized.current = true;

    const showInAppAd = () => {
      if (typeof window.show_10401872 === 'function') {
        console.log('🎬 Showing In-App Interstitial ad...');
        window.show_10401872({
          type: 'inApp',
          inAppSettings: {
            frequency: 999,
            capping: 24,
            interval: 15,
            timeout: 0,
            everyPage: false
          }
        }).then(() => {
          console.log('✅ In-App Interstitial ad shown');
        }).catch((error) => {
          console.log('⚠️ In-App Interstitial ad error:', error);
        });
      } else {
        console.log('⚠️ Monetag SDK not available for In-App ads');
      }
    };

    const intervalMs = popupAdInterval * 1000;
    const initialDelay = setTimeout(() => {
      showInAppAd();
      
      inAppAdIntervalRef.current = setInterval(() => {
        showInAppAd();
      }, intervalMs);
    }, 5000);

    return () => {
      clearTimeout(initialDelay);
      if (inAppAdIntervalRef.current) {
        clearInterval(inAppAdIntervalRef.current);
      }
    };
  }, [popupAdsEnabled, popupAdInterval]);

  useEffect(() => {
    const checkSeasonStatus = () => {
      fetch("/api/app-settings")
        .then(res => res.json())
        .then(settings => {
          if (settings.seasonBroadcastActive) {
            setSeasonLockActive(true);
            setShowSeasonEnd(true);
          } else {
            setSeasonLockActive(false);
            localStorage.removeItem("season_end_seen");
          }
        })
        .catch(() => {});
    };

    checkSeasonStatus();
    const interval = setInterval(checkSeasonStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCloseSeasonEnd = () => {
    if (!seasonLockActive) {
      localStorage.setItem("season_end_seen", "true");
      setShowSeasonEnd(false);
    }
  };

  const shouldShowSeasonEnd = showSeasonEnd && !isAdmin;

  return (
    <SeasonEndContext.Provider value={{ showSeasonEnd: shouldShowSeasonEnd }}>
      <AppNotification />
      {shouldShowSeasonEnd && <SeasonEndOverlay onClose={handleCloseSeasonEnd} isLocked={seasonLockActive} />}
      <Router />
    </SeasonEndContext.Provider>
  );
}

import { LanguageProvider } from "@/hooks/useLanguage";
import { ThemeProvider } from "@/hooks/useTheme";
import { showNotification } from "@/components/AppNotification";

function App() {
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState<string>();
  const [isCountryBlocked, setIsCountryBlocked] = useState(false);
  const [userCountryCode, setUserCountryCode] = useState<string | null>(null);
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [isCheckingCountry, setIsCheckingCountry] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [isChannelVerified, setIsChannelVerified] = useState<boolean>(true);
  const [isCheckingMembership, setIsCheckingMembership] = useState(true);
  
  const isDevMode = import.meta.env.DEV || import.meta.env.MODE === 'development';

  const checkMembership = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      const tg = window.Telegram?.WebApp;
      if (tg?.initData) {
        headers['x-telegram-data'] = tg.initData;
      }
      
      const response = await fetch('/api/check-membership', { headers });
      const data = await response.json();
      
      if (data.success) {
        if (data.banned) {
          setIsBanned(true);
          return;
        }
        setIsChannelVerified(data.isVerified);
      }
    } catch (err) {
      console.error("Membership check error:", err);
    } finally {
      setIsCheckingMembership(false);
    }
  }, []);

  useEffect(() => {
    checkMembership();
  }, [checkMembership]);

  const checkCountry = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      
      const tg = window.Telegram?.WebApp;
      if (tg?.initData) {
        headers['x-telegram-data'] = tg.initData;
      }
      
      const cachedUser = localStorage.getItem("tg_user");
      if (cachedUser) {
        try {
          const user = JSON.parse(cachedUser);
          headers['x-user-id'] = user.id.toString();
        } catch {}
      }
      
      const response = await fetch('/api/check-country', { 
        cache: 'no-store',
        headers
      });
      const data = await response.json();
      
      if (data.country) {
        setUserCountryCode(data.country.toUpperCase());
      }
      
      if (data.blocked) {
        setIsCountryBlocked(true);
      } else {
        setIsCountryBlocked(false);
      }
    } catch (err) {
      console.error("Country check error:", err);
    } finally {
      setIsCheckingCountry(false);
    }
  }, []);

  useEffect(() => {
    checkCountry();
  }, [checkCountry]);

  useEffect(() => {
    const handleCountryBlockChange = (event: CustomEvent) => {
      const { action, countryCode } = event.detail;
      
      console.log(`Country block change: ${countryCode} - ${action}`);
      
      if (userCountryCode && countryCode === userCountryCode) {
        if (action === 'blocked') {
          setIsCountryBlocked(true);
        } else if (action === 'unblocked') {
          setIsCountryBlocked(false);
        }
      }
    };
    
    window.addEventListener('countryBlockChanged', handleCountryBlockChange as EventListener);
    
    return () => {
      window.removeEventListener('countryBlockChanged', handleCountryBlockChange as EventListener);
    };
  }, [userCountryCode]);

  useEffect(() => {
    if (isCheckingCountry || isCountryBlocked) {
      return;
    }

    if (isDevMode) {
      console.log('Development mode: Skipping Telegram authentication');
      setTelegramId('dev-user-123');
      setIsAuthenticating(false);
      return;
    }
    
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      
      if (tg.initDataUnsafe?.user) {
        localStorage.setItem("tg_user", JSON.stringify(tg.initDataUnsafe.user));
        setTelegramId(tg.initDataUnsafe.user.id.toString());
      }
      
      if (tg.initDataUnsafe?.start_param) {
        localStorage.setItem("tg_start_param", tg.initDataUnsafe.start_param);
      }
      
      const { deviceId, fingerprint } = setupDeviceTracking();
      
      const headers: Record<string, string> = { 
        "Content-Type": "application/json",
        "x-device-id": deviceId,
        "x-device-fingerprint": JSON.stringify(fingerprint)
      };
      let body: any = {};
      let userTelegramId: string | null = null;
      
      const startParam = tg.initDataUnsafe?.start_param || localStorage.getItem("tg_start_param");
      
      if (tg.initData) {
        body = { initData: tg.initData };
        if (startParam) {
          body.startParam = startParam;
        }
        if (tg.initDataUnsafe?.user?.id) {
          userTelegramId = tg.initDataUnsafe.user.id.toString();
        }
      } else {
        const cachedUser = localStorage.getItem("tg_user");
        if (cachedUser) {
          try {
            const user = JSON.parse(cachedUser);
            headers["x-user-id"] = user.id.toString();
            userTelegramId = user.id.toString();
            if (startParam) {
              body.startParam = startParam;
            }
          } catch {}
        }
      }
      
      fetch("/api/auth/telegram", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      })
        .then(res => res.json())
        .then(data => {
          if (data.referralProcessed) {
            localStorage.removeItem("tg_start_param");
          }
          if (data.banned) {
            setIsBanned(true);
            setBanReason(data.reason);
          } else if (userTelegramId) {
            setTelegramId(userTelegramId);
          }
          setIsAuthenticating(false);
        })
        .catch(() => {
          setIsAuthenticating(false);
        });
    } else {
      setIsAuthenticating(false);
    }
  }, [isDevMode, isCheckingCountry, isCountryBlocked]);

  if (isBanned) {
    return <BanScreen reason={banReason} />;
  }

  if (isCheckingCountry || isAuthenticating || isCheckingMembership) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a]">
        {/* Subtle glow */}
        <div className="absolute w-64 h-64 bg-[#F5C542]/5 rounded-full blur-[100px]" />

        <div className="relative flex flex-col items-center gap-6 z-10">
          {/* Bitcoin icon ring */}
          <div className="relative w-20 h-20 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-[#F5C542]/20 animate-ping" />
            <div className="absolute inset-0 rounded-full border border-[#F5C542]/10" />
            <div className="w-full h-full rounded-full overflow-hidden border border-[#F5C542]/30 shadow-lg">
              <img src="/btc-icon.jpg" alt="Bitcoin" className="w-full h-full object-cover" />
            </div>
          </div>

          {/* App name */}
          <div className="text-center">
            <h1 className="text-white font-black text-lg tracking-widest uppercase">
              Lightning Sats
            </h1>
            <p className="text-[#8E8E93] text-[10px] font-semibold uppercase tracking-widest mt-1">
              Mine · Earn · Withdraw
            </p>
          </div>

          {/* Loading dots */}
          <div className="flex items-center gap-1.5 mt-2">
            <div className="w-1.5 h-1.5 bg-[#F5C542] rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
            <div className="w-1.5 h-1.5 bg-[#F5C542] rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
            <div className="w-1.5 h-1.5 bg-[#F5C542] rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
          </div>
        </div>
      </div>
    );
  }

  if (isCountryBlocked) {
    return <CountryBlockedScreen />;
  }

  if (!telegramId && !isDevMode) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 mx-auto mb-8 rounded-full border-2 border-white/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-white mb-4 tracking-tight">Open in Telegram</h1>
          <p className="text-white/60 text-base leading-relaxed">
            Please open this app from Telegram to continue.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          {!isChannelVerified && (
            <Suspense fallback={null}>
              <ChannelJoinPopup 
                telegramId={telegramId || ""} 
                onVerified={() => {
                  setIsChannelVerified(true);
                  showNotification("Verification successful! Welcome.", "success");
                }} 
              />
            </Suspense>
          )}
          <AppContent />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
