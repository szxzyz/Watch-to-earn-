import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Play, Clock, Shield, Zap, Loader2 } from "lucide-react";
import { showNotification } from "@/components/AppNotification";

declare global {
  interface Window {
    show_10401872: (type?: string | { type: string; inAppSettings: any }) => Promise<void>;
    Adsgram: {
      init: (config: { blockId: string }) => {
        show: () => Promise<void>;
      };
    };
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
      const rewardAmount = data?.rewardBoost || (section === 'section1' ? 0.0015 : 0.0001);
      showNotification(`+${rewardAmount} Mining speed boost earned!`, "success");
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
      if (typeof window.show_10401872 === 'function') {
        monetagStartTimeRef.current = Date.now();
        window.show_10401872()
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
          await window.Adsgram.init({ blockId: "20372" }).show();
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

  const handleStartEarning = async () => {
    if (isShowingAds) return;
    
    setIsShowingAds(true);
    sessionRewardedRef.current = false;
    
    try {
      // STEP 1: Show Monetag ad - User must watch at least 3 seconds
      setCurrentAdStep('monetag');
      let monetagResult;
      try {
        monetagResult = await showMonetagAd();
      } catch (e) {
        console.error('Monetag fatal error:', e);
        monetagResult = { success: false, watchedFully: false, unavailable: false };
      }
      
      // Reset state immediately after ad closes to prevent black screen if something hangs
      if (!monetagResult.success && !monetagResult.watchedFully) {
        setCurrentAdStep('idle');
        setIsShowingAds(false);
      }

      // Handle Monetag unavailable
      if (monetagResult.unavailable) {
        showNotification("Ads not available. Please try again later.", "error");
        setIsShowingAds(false);
        setCurrentAdStep('idle');
        return;
      }
      
      // Check if Monetag was closed before 3 seconds
      if (!monetagResult.watchedFully) {
        showNotification("Claimed too fast!", "error");
        return;
      }
      
      // Monetag was watched fully (at least 3 seconds)
      if (!monetagResult.success) {
        showNotification("Ad failed. Please try again.", "error");
        return;
      }
      
      // STEP 3: Grant reward after Monetag complete successfully
      setCurrentAdStep('verifying');
      
      if (!sessionRewardedRef.current) {
        sessionRewardedRef.current = true;
        
        // Optimistic UI update - only ONE increment to progress
        const rewardAmount = appSettings?.rewardPerAd || 2;
        queryClient.setQueryData(["/api/auth/user"], (old: any) => {
          if (!old) return old;
          return {
            ...old,
            tonBalance: String(parseFloat(old?.tonBalance || '0') + (appSettings?.affiliateCommission || 0.1) * rewardAmount / 100),
            balance: String(parseFloat(old?.balance || '0') + rewardAmount),
            adsWatchedToday: (old?.adsWatchedToday || 0) + 1
          };
        });
        
        // Sync with backend - single reward call
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
      // Always reset state on completion or error
      setCurrentAdStep('idle');
      setIsShowingAds(false);
    }
  };

  const adsWatchedToday = section === 'section1' ? (user?.adSection1Count || 0) : (user?.adSection2Count || 0);
  const dailyLimit = section === 'section1' 
    ? (parseInt(appSettings?.ad_section1_limit || '250')) 
    : (parseInt(appSettings?.ad_section2_limit || '250'));

  const sectionReward = section === 'section1'
    ? (appSettings?.ad_section1_reward || '0.0015')
    : (appSettings?.ad_section2_reward || '0.0001');

  return (
    <div className="bg-[#1a1a1a] border border-blue-500/20 rounded-2xl p-3 flex flex-col gap-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.4)] relative overflow-hidden group">
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="flex items-center gap-2.5 relative z-10">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#0d0d0d] border border-white/5 overflow-hidden shadow-inner">
          <img
            src="/images/ads_icon.png"
            alt="Ads"
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-0.5">
            <span className="text-blue-400 text-[12px] font-black tabular-nums leading-none">{sectionReward}/h</span>
            <span className="text-[#8E8E93] text-[9px] font-bold uppercase tracking-wider leading-none">AD ({adsWatchedToday}/{dailyLimit})</span>
          </div>
        </div>
      </div>

      <Button
        onClick={handleStartEarning}
        disabled={isShowingAds || adsWatchedToday >= dailyLimit}
        className="relative z-10 w-full rounded-xl h-9 font-black text-[11px] uppercase tracking-widest bg-blue-500 text-white hover:bg-blue-600 border-none transition-all active:scale-95 shadow-[0_0_20px_rgba(59,130,246,0.15)]"
      >
        {isShowingAds ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>{currentAdStep === 'monetag' ? 'Wait' : 'Check'}</span>
          </div>
        ) : (
          <span className="flex items-center gap-1.5">
            <Play className="w-3 h-3 fill-current" />
            Claim
          </span>
        )}
      </Button>
    </div>
  );
}
