import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Play, Clock, Shield, Zap, Loader2, Timer } from "lucide-react";
import { showNotification } from "@/components/AppNotification";
import { formatHashrate } from "@/lib/hashrate";

declare global {
  interface Window {
    show_9368336: (type?: string | { type: string; inAppSettings: any }) => Promise<void>;
    show_10401872: (type?: string | { type: string; inAppSettings: any }) => Promise<void>;
    Adsgram: {
      init: (config: { blockId: string }) => {
        show: () => Promise<void>;
      };
    };
    showGiga: (placement: string) => Promise<void>;
  }
}

interface AdWatchingSectionProps {
  user: any;
  section?: 'section1' | 'section2';
}

export default function AdWatchingSection({ user, section = 'section1' }: AdWatchingSectionProps) {
  const queryClient = useQueryClient();
  const [isShowingAds, setIsShowingAds] = useState(false);
  const [currentAdStep, setCurrentAdStep] = useState<'idle' | 'monetag' | 'adsgram' | 'verifying'>('idle');
  const sessionRewardedRef = useRef(false);
  const monetagStartTimeRef = useRef<number>(0);

  const { data: appSettings } = useQuery({
    queryKey: ["/api/app-settings"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/app-settings");
      return response.json();
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const watchAdMutation = useMutation({
    mutationFn: async (adType: string) => {
      const response = await apiRequest("POST", "/api/ads/watch", { adType, section });
      if (!response.ok) {
        const error = await response.json();
        throw { status: response.status, ...error };
      }
      return response.json();
    },
    onSuccess: async (data) => {
      if (section === 'section2') {
        const minutes = Number(data?.minutesAdded ?? 0);
        if (minutes > 0) {
          showNotification(`+${minutes} mining minute${minutes === 1 ? '' : 's'} added!`, "success");
        } else {
          showNotification(`Mining time added!`, "success");
        }
      } else {
        const rewardAmount = data?.rewardBoost || 0.0015;
        showNotification(`+${formatHashrate(rewardAmount)} boost earned!`, "success");
      }
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mining/state"] });
    },
    onError: (error: any) => {
      sessionRewardedRef.current = false;
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      if (error.status === 429) {
        showNotification(`Daily ad limit reached`, "error");
      } else if (error.status === 401 || error.status === 403) {
        showNotification("Authentication error. Please refresh the page.", "error");
      } else if (error.message) {
        showNotification(`Error: ${error.message}`, "error");
      } else {
        showNotification("Network error. Check your connection and try again.", "error");
      }
    },
  });

  const showMonetagAd = (): Promise<{ success: boolean; watchedFully: boolean; unavailable: boolean }> => {
    return new Promise((resolve) => {
      const showFn = typeof window.show_9368336 === 'function'
        ? window.show_9368336
        : typeof window.show_10401872 === 'function'
        ? window.show_10401872
        : null;
      if (showFn) {
        monetagStartTimeRef.current = Date.now();
        showFn()
          .then(() => {
            const watchDuration = Date.now() - monetagStartTimeRef.current;
            const watchedAtLeast3Seconds = watchDuration >= 3000;
            resolve({ success: true, watchedFully: watchedAtLeast3Seconds, unavailable: false });
          })
          .catch((error) => {
            console.error('Monetag ad error:', error);
            const watchDuration = Date.now() - monetagStartTimeRef.current;
            const watchedAtLeast3Seconds = watchDuration >= 3000;
            resolve({ success: false, watchedFully: watchedAtLeast3Seconds, unavailable: false });
          });
      } else {
        resolve({ success: false, watchedFully: false, unavailable: true });
      }
    });
  };

  const showAdsgramAd = (): Promise<boolean> => {
    return new Promise(async (resolve) => {
      if (window.Adsgram) {
        try {
          await window.Adsgram.init({ blockId: "25128" }).show();
          resolve(true);
        } catch (error) {
          console.error('Adsgram ad error:', error);
          resolve(false);
        }
      } else {
        resolve(false);
      }
    });
  };

  const showGigaPubAd = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window.showGiga === 'function') {
        window.showGiga("main")
          .then(() => resolve(true))
          .catch((e) => {
            console.error('GigaPub ad error:', e);
            resolve(false);
          });
      } else {
        resolve(false);
      }
    });
  };

  const handleStartEarning = async () => {
    if (isShowingAds) return;
    
    setIsShowingAds(true);
    sessionRewardedRef.current = false;
    
    try {
      // BOTH SECTIONS: Monetag
      setCurrentAdStep('monetag');
      let monetagResult;
      try {
        monetagResult = await showMonetagAd();
      } catch (e) {
        console.error('Monetag fatal error:', e);
        monetagResult = { success: false, watchedFully: false, unavailable: false };
      }

      if (!monetagResult.success && !monetagResult.watchedFully) {
        setCurrentAdStep('idle');
        setIsShowingAds(false);
      }

      if (monetagResult.unavailable) {
        showNotification("Ads not available. Please try again later.", "error");
        setIsShowingAds(false);
        setCurrentAdStep('idle');
        return;
      }

      if (!monetagResult.watchedFully) {
        showNotification("Claimed too fast!", "error");
        return;
      }

      if (!monetagResult.success) {
        showNotification("Ad failed. Please try again.", "error");
        return;
      }

      // Grant reward after ad completes
      setCurrentAdStep('verifying');
      
      if (!sessionRewardedRef.current) {
        sessionRewardedRef.current = true;
        
        try {
          await watchAdMutation.mutateAsync('monetag');
        } catch (e) {
          console.error('Reward mutation failed:', e);
        }
      }
    } catch (error) {
      console.error('handleStartEarning global error:', error);
      showNotification("An unexpected error occurred. Please try again.", "error");
    } finally {
      setCurrentAdStep('idle');
      setIsShowingAds(false);
    }
  };

  const adsWatchedToday = section === 'section1' ? (user?.adSection1Count || 0) : (user?.adSection2Count || 0);
  const dailyLimit = section === 'section1' 
    ? (parseInt(appSettings?.ad_section1_limit || '250')) 
    : (parseInt(appSettings?.ad_section2_limit || '250'));

  const sectionRewardHashrate = section === 'section1'
    ? (appSettings?.ad_section1_reward || '0.0015')
    : (appSettings?.ad_section2_reward || '0.0001');
  const minutesPerAd = parseInt(appSettings?.ad_section2_minutes_reward || '5');

  const isMinutesSection = section === 'section2';

  return (
    <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-4 flex flex-col gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.4)] relative overflow-hidden group">
      <div className="absolute -inset-1 bg-gradient-to-r from-white/0 via-white/3 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="flex-1 min-w-0 relative z-10 flex flex-col items-center text-center gap-1">
        {isMinutesSection ? (
          <>
            <span className="text-white text-[15px] font-black tabular-nums leading-none">+{minutesPerAd} Min</span>
            <span className="text-[#8E8E93] text-[10px] font-bold uppercase tracking-wider leading-none">Mining Time</span>
          </>
        ) : (
          <>
            <span className="text-white text-[15px] font-black tabular-nums leading-none">+{formatHashrate(parseFloat(sectionRewardHashrate))}</span>
            <span className="text-[#8E8E93] text-[10px] font-bold uppercase tracking-wider leading-none">24 hours of validity</span>
          </>
        )}
      </div>

      <Button
        onClick={handleStartEarning}
        disabled={isShowingAds || adsWatchedToday >= dailyLimit}
        className="relative z-10 w-full rounded-xl h-10 font-black text-[11px] uppercase tracking-widest bg-[#F5C542] hover:bg-yellow-400 text-black border-none transition-all active:scale-95 shadow-[0_0_20px_rgba(245,197,66,0.15)]"
      >
        {isShowingAds ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>{currentAdStep === 'monetag' || currentAdStep === 'adsgram' ? 'Wait' : 'Check'}</span>
          </div>
        ) : (
          <span className="flex items-center gap-1.5">
            <Play className="w-3 h-3 fill-current" />
            {adsWatchedToday}/{dailyLimit}
          </span>
        )}
      </Button>
    </div>
  );
}
