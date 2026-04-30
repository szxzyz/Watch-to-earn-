import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { useAdmin } from "@/hooks/useAdmin";
import { useAdFlow } from "@/hooks/useAdFlow";
import { useLocation } from "wouter";
import { SettingsPopup } from "@/components/SettingsPopup";
import InvitePopup from "@/components/InvitePopup";
import { useLanguage } from "@/hooks/useLanguage";
import Header from "@/components/Header";
import { Award, Wallet, RefreshCw, Flame, Ticket, Info, User as UserIcon, Clock, Loader2, Gift, Rocket, X, Bug, DollarSign, Coins, Send, Users, Check, ExternalLink, Plus, CalendarCheck, Bell, Star, Play, Zap, Settings, Film, Tv, ClipboardList as TaskIcon, UserPlus, Share2, Copy, LogOut, Download, ShieldCheck, Banknote } from "lucide-react";
import { MdMenu, MdGroups } from "react-icons/md";
import { DiamondIcon } from "@/components/DiamondIcon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { showNotification } from "@/components/AppNotification";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AnimatePresence, motion } from "framer-motion";
import WithdrawalPopup from "@/components/WithdrawalPopup";
import MenuPopup from "@/components/MenuPopup";
import MiningMachinePanel from "@/components/MiningMachinePanel";


// Unified Task Interface
interface UnifiedTask {
  id: string;
  type: 'advertiser';
  taskType: string;
  title: string;
  link: string | null;
  rewardAXN: number;
  rewardBUG?: number;
  rewardType: string;
  isAdminTask: boolean;
  isAdvertiserTask?: boolean;
  priority: number;
}

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

interface User {
  id?: string;
  telegramId?: string;
  balance?: string;
  tonBalance?: string;
  bugBalance?: string;
  lastStreakDate?: string;
  username?: string;
  firstName?: string;
  telegramUsername?: string;
  referralCode?: string;
  [key: string]: any;
}

export default function Home() {
  const { user, isLoading } = useAuth();
  const { isAdmin } = useAdmin();
  const { t, tText } = useLanguage();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [promoPopupOpen, setPromoPopupOpen] = useState(false);
  const [withdrawPopupOpen, setWithdrawPopupOpen] = useState(false);
  const [miningPausedBanner, setMiningPausedBanner] = useState(false);
  const [convertPopupOpen, setConvertPopupOpen] = useState(false);
  const [boosterPopupOpen, setBoosterPopupOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(88);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const update = () => setHeaderHeight(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [selectedConvertType, setSelectedConvertType] = useState<'' | 'BUG'>('');
  const [convertAmount, setConvertAmount] = useState<string>("");
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  
  const [shareWithFriendsStep, setShareWithFriendsStep] = useState<'idle' | 'sharing' | 'countdown' | 'ready' | 'claiming'>('idle');
  const [dailyCheckinStep, setDailyCheckinStep] = useState<'idle' | 'ads' | 'countdown' | 'ready' | 'claiming'>('idle');
  const [checkForUpdatesStep, setCheckForUpdatesStep] = useState<'idle' | 'opened' | 'countdown' | 'ready' | 'claiming'>('idle');
  const [checkForUpdatesCountdown, setCheckForUpdatesCountdown] = useState(3);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [timeUntilNextClaim, setTimeUntilNextClaim] = useState<string>("");
  const [isConverting, setIsConverting] = useState(false);
  
  const padBalance = parseFloat((user as User)?.balance || "0");

  const { runAdFlow } = useAdFlow();

  useEffect(() => {
    const PAUSE_THRESHOLD_MS = 48 * 60 * 60 * 1000;
    const key = "last_app_open_ts";
    const stored = localStorage.getItem(key);
    if (stored) {
      const diff = Date.now() - parseInt(stored, 10);
      if (diff > PAUSE_THRESHOLD_MS) {
        setMiningPausedBanner(true);
        setTimeout(() => setMiningPausedBanner(false), 6000);
      }
    }
    localStorage.setItem(key, String(Date.now()));
  }, []);

  const { data: leaderboardData } = useQuery<{
    userEarnerRank?: { rank: number; totalEarnings: string } | null;
  }>({
    queryKey: ['/api/leaderboard/monthly'],
    retry: false,
  });

  const { data: appSettings } = useQuery<any>({
    queryKey: ['/api/app-settings'],
    retry: false,
  });

  const { data: unifiedTasksData, isLoading: isLoadingTasks } = useQuery<{
    success: boolean;
    tasks: UnifiedTask[];
    completedTaskIds: string[];
    referralCode?: string;
  }>({
    queryKey: ['/api/tasks/home/unified'],
    queryFn: async () => {
      const res = await fetch('/api/tasks/home/unified', { credentials: 'include' });
      if (!res.ok) return { success: true, tasks: [], completedTaskIds: [] };
      return res.json();
    },
    retry: false,
  });

  const { data: missionStatus } = useQuery<any>({
    queryKey: ['/api/missions/status'],
    retry: false,
  });


  const { data: userData } = useQuery<{ referralCode?: string }>({
    queryKey: ['/api/auth/user'],
    retry: false,
    staleTime: 30000,
  });

  useEffect(() => {
    if (unifiedTasksData?.completedTaskIds) {
      setCompletedTasks(new Set(unifiedTasksData.completedTaskIds));
    } else {
      setCompletedTasks(new Set());
    }
  }, [unifiedTasksData]);

  const currentTask = unifiedTasksData?.tasks?.[0] || null;

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const typedUser = user as User;
      
      if (typedUser?.id) {
        const claimedTimestamp = localStorage.getItem(`streak_claimed_${typedUser.id}`);
        if (claimedTimestamp) {
          const claimedDate = new Date(claimedTimestamp);
          const nextClaimTime = new Date(claimedDate.getTime() + 5 * 60 * 1000);
          
          if (now.getTime() < nextClaimTime.getTime()) {
            setHasClaimed(true);
            const diff = nextClaimTime.getTime() - now.getTime();
            const minutes = Math.floor(diff / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            setTimeUntilNextClaim(`${minutes}:${seconds.toString().padStart(2, '0')}`);
            return;
          } else {
            setHasClaimed(false);
            localStorage.removeItem(`streak_claimed_${typedUser.id}`);
          }
        }
      }
      
      if ((user as User)?.lastStreakDate) {
        const lastClaim = new Date((user as User).lastStreakDate!);
        const minutesSinceLastClaim = (now.getTime() - lastClaim.getTime()) / (1000 * 60);
        
        if (minutesSinceLastClaim < 5) {
          setHasClaimed(true);
          const nextClaimTime = new Date(lastClaim.getTime() + 5 * 60 * 1000);
          const diff = nextClaimTime.getTime() - now.getTime();
          const minutes = Math.floor(diff / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setTimeUntilNextClaim(`${minutes}:${seconds.toString().padStart(2, '0')}`);
          return;
        }
      }
      
      setHasClaimed(false);
      setTimeUntilNextClaim("Available now");
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [(user as User)?.lastStreakDate, (user as User)?.id]);

  const convertMutation = useMutation({
    mutationFn: async ({ amount, convertTo }: { amount: number; convertTo: string }) => {
      const res = await fetch("/api/convert-to-ton", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ axnAmount: amount, convertTo }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to convert");
      }
      return data;
    },
    onSuccess: async () => {
      showNotification("Convert successful.", "success");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      setConvertPopupOpen(false);
    },
    onError: (error: Error) => {
      showNotification(error.message, "error");
    },
  });

  const [promoCode, setPromoCode] = useState("");
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [isClaimingStreak, setIsClaimingStreak] = useState(false);

  const claimStreakMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/streak/claim");
      if (!response.ok) {
        const error = await response.json();
        const errorObj = new Error(error.message || 'Failed to claim streak');
        (errorObj as any).isAlreadyClaimed = error.message === "Please wait 5 minutes before claiming again!";
        throw errorObj;
      }
      return response.json();
    },
    onSuccess: (data) => {
      setHasClaimed(true);
      const typedUser = user as User;
      if (typedUser?.id) {
        localStorage.setItem(`streak_claimed_${typedUser.id}`, new Date().toISOString());
      }
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      const rewardAmount = parseFloat(data.rewardEarned || '0');
      if (rewardAmount > 0) {
        const earnedSAT = Math.round(rewardAmount);
        showNotification(`You've claimed +${earnedSAT.toLocaleString()} SAT!`, "success");
      } else {
        showNotification("You've claimed your streak bonus!", "success");
      }
    },
    onError: (error: any) => {
      const notificationType = error.isAlreadyClaimed ? "info" : "error";
      showNotification(error.message || "Failed to claim streak", notificationType);
      if (error.isAlreadyClaimed) {
        setHasClaimed(true);
        const typedUser = user as User;
        if (typedUser?.id) {
          localStorage.setItem(`streak_claimed_${typedUser.id}`, new Date().toISOString());
        }
      }
    },
    onSettled: () => {
      setIsClaimingStreak(false);
    },
  });

  const redeemPromoMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/promo-codes/redeem", { code });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Invalid promo code");
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/earnings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      setPromoCode("");
      setPromoPopupOpen(false);
      setIsApplyingPromo(false);
      showNotification(data.message || "Promo applied successfully!", "success");
    },
    onError: (error: any) => {
      const message = error.message || "Invalid promo code";
      showNotification(message, "error");
      setIsApplyingPromo(false);
    },
  });

  const [clickedTasks, setClickedTasks] = useState<Set<string>>(new Set());

  const advertiserTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch(`/api/advertiser-tasks/${taskId}/click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to start task');
      return data;
    },
    onSuccess: async (data, taskId) => {
      setClickedTasks(prev => new Set(prev).add(taskId));
      showNotification("Task started! Click the claim button to earn your reward.", "info");
    },
    onError: (error: any) => {
      showNotification(error.message || 'Failed to start task', 'error');
    },
  });

  const claimAdvertiserTaskMutation = useMutation({
    mutationFn: async ({ taskId, taskType, link }: { taskId: string, taskType: string, link: string | null }) => {
      // Step 1: Real-time verification for channel tasks
      if (taskType === 'channel' && link) {
        const username = link.replace('https://t.me/', '').split('?')[0];
        const currentTelegramData = (window as any).Telegram?.WebApp?.initData || '';
        
        const resVerify = await fetch('/api/tasks/verify/channel', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-telegram-data': currentTelegramData || ''
          },
          body: JSON.stringify({ channelId: `@${username}` }),
          credentials: 'include',
        });
        
        const verifyData = await resVerify.json();
        if (!resVerify.ok || !verifyData.isJoined) {
          throw new Error('Please join the channel to complete this task.');
        }
      }

      // Step 2: Claim reward
      const res = await fetch(`/api/advertiser-tasks/${taskId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to claim reward');

      // Update local state to instantly hide the popup
      setCompletedTasks(prev => {
        const next = new Set(prev);
        next.add(taskId);
        return next;
      });

      return data;
    },
    onSuccess: async (data) => {
      // Background refetch to keep data in sync
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/home/unified'] });
      const satReward = Number(data.reward ?? 0);
      showNotification(`+${satReward.toLocaleString()} SAT earned!`, 'success');
    },
    onError: (error: any) => {
      showNotification(error.message || 'Failed to claim reward', 'error');
    },
  });

  const handleUnifiedTask = (task: UnifiedTask) => {
    if (!task) return;
    
    if (clickedTasks.has(task.id)) {
      claimAdvertiserTaskMutation.mutate({ taskId: task.id, taskType: task.taskType, link: task.link });
      return;
    }

    if (task.link) {
      window.open(task.link, '_blank');
      advertiserTaskMutation.mutate(task.id);
    } else {
      advertiserTaskMutation.mutate(task.id);
    }
  };

  const getTaskIcon = (task: UnifiedTask) => {
    return task.taskType === 'channel' ? <Send className="w-4 h-4" /> : 
           task.taskType === 'bot' ? <ExternalLink className="w-4 h-4" /> :
           <ExternalLink className="w-4 h-4" />;
  };

  const isTaskPending = advertiserTaskMutation.isPending;

  const showAdsgramAd = (): Promise<boolean> => {
    return new Promise(async (resolve) => {
      if ((window as any).Adsgram) {
        try {
          await (window as any).Adsgram.init({ blockId: "int-20373" }).show();
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

  const showMonetagAd = (): Promise<{ success: boolean; unavailable: boolean }> => {
    return new Promise((resolve) => {
      if (typeof window.show_10401872 === 'function') {
        window.show_10401872()
          .then(() => {
            resolve({ success: true, unavailable: false });
          })
          .catch((error) => {
            console.error('Monetag ad error:', error);
            resolve({ success: false, unavailable: false });
          });
      } else {
        resolve({ success: false, unavailable: true });
      }
    });
  };

  const showMonetagRewardedAd = (): Promise<{ success: boolean; unavailable: boolean }> => {
    return new Promise((resolve) => {
      console.log('🎬 Attempting to show Monetag rewarded ad...');
      if (typeof window.show_10401872 === 'function') {
        console.log('✅ Monetag SDK found, calling rewarded ad...');
        window.show_10401872()
          .then(() => {
            console.log('✅ Monetag rewarded ad completed successfully');
            resolve({ success: true, unavailable: false });
          })
          .catch((error) => {
            console.error('❌ Monetag rewarded ad error:', error);
            resolve({ success: false, unavailable: false });
          });
      } else {
        console.log('⚠️ Monetag SDK not available, skipping ad');
        resolve({ success: false, unavailable: true });
      }
    });
  };

  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [adStartTime, setAdStartTime] = useState<number>(0);
  const botUsername = import.meta.env.VITE_BOT_USERNAME || 'MoneyAXNbot';
  const referralLink = user?.referralCode 
    ? `https://t.me/${botUsername}?start=${user.referralCode}`
    : '';

  const copyReferralLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      showNotification('Link copied!', 'success');
    }
  };

  const [isSharing, setIsSharing] = useState(false);

  const shareReferralLink = async () => {
    if (!referralLink || isSharing) return;
    setIsSharing(true);
    
    try {
      const tgWebApp = (window as any).Telegram?.WebApp;
      
      // Native Telegram share: Use shareMessage() with prepared message from backend
      if (tgWebApp?.shareMessage) {
        try {
          // First, prepare the message on the backend
          const response = await fetch('/api/share/prepare-message', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          });
          const data = await response.json();
          
          if (data.success && data.messageId) {
            // Use the native Telegram share dialog with prepared message
            tgWebApp.shareMessage(data.messageId, (success: boolean) => {
              if (success) {
                showNotification('Message shared successfully!', 'success');
              }
              setIsSharing(false);
            });
            return;
          } else if (data.fallbackUrl) {
            // Backend returned fallback URL
            tgWebApp.openTelegramLink(data.fallbackUrl);
            setIsSharing(false);
            return;
          }
        } catch (error) {
          console.error('Prepare message error:', error);
        }
      }
      
      // Fallback: Use Telegram's native share URL dialog
      const shareTitle = `💵 Get paid for completing tasks and watching ads.`;
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareTitle)}`;
      
      if (tgWebApp?.openTelegramLink) {
        tgWebApp.openTelegramLink(shareUrl);
      } else {
        window.open(shareUrl, '_blank');
      }
    } catch (error) {
      console.error('Share error:', error);
    }
    
    setIsSharing(false);
  };

  const watchAdMutation = useMutation({
    mutationFn: async (adType: string) => {
      const response = await apiRequest("POST", "/api/ads/watch", { adType });
      if (!response.ok) {
        const error = await response.json();
        throw { status: response.status, ...error };
      }
      return response.json();
    },
    onSuccess: async (data) => {
      queryClient.setQueryData(["/api/auth/user"], (old: any) => ({
        ...old,
        balance: data.newBalance,
        adsWatchedToday: data.adsWatchedToday
      }));
      
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/earnings"] });
      
      showNotification(`You received ${Math.round(data.rewardAXN || 1000).toLocaleString()} SAT on your balance`, "success");
      setLoadingProvider(null);
    },
    onError: (error: any) => {
      if (error.status === 429) {
        const limit = error.limit || appSettings?.dailyAdLimit || 50;
        showNotification(`Daily ad limit reached (${limit} ads/day)`, "error");
      } else if (error.status === 401 || error.status === 403) {
        showNotification("Authentication error. Please refresh the page.", "error");
      } else if (error.message) {
        showNotification(`Error: ${error.message}`, "error");
      } else {
        showNotification("Network error. Check your connection and try again.", "error");
      }
      setLoadingProvider(null);
    },
  });


  const handleWatchAd = async (providerId: string) => {
    if (loadingProvider) return;
    
    setLoadingProvider(providerId);
    const startTime = Date.now();
    setAdStartTime(startTime);
    
    const handleAdCompletion = () => {
      const watchDuration = Date.now() - startTime;
      if (watchDuration < 3000) {
        showNotification("Claiming too fast!", "error");
        setLoadingProvider(null);
        return;
      }
      watchAdMutation.mutate(providerId);
    };

    const handleAdError = (error?: any) => {
      showNotification("Ad failed to load. Please try again.", "error");
      setLoadingProvider(null);
    };
    
    try {
      switch (providerId) {
        case 'monetag':
          if (typeof (window as any).show_10013974 === 'function') {
            (window as any).show_10013974()
              .then(() => {
                handleAdCompletion();
              })
              .catch((error: any) => {
                console.error('❌ Monetag ad error:', error);
                handleAdError(error);
              });
          } else {
            showNotification("Monetag not available. Try again later.", "error");
            setLoadingProvider(null);
          }
          break;
          
        case 'adexora':
          if (typeof (window as any).showAdexora === 'function') {
            (window as any).showAdexora()
              .then(() => {
                handleAdCompletion();
              })
              .catch((error: any) => {
                console.error('❌ Adexora ad error:', error);
                handleAdError(error);
              });
          } else {
            showNotification("Adexora not available. Please open in Telegram app.", "error");
            setLoadingProvider(null);
          }
          break;
          
        case 'adextra':
          const adExtraContainer = document.getElementById('353c332d4f2440f448057df79cb605e5d3d64ef0');
          if (adExtraContainer) {
            adExtraContainer.style.display = 'flex';
            adExtraContainer.style.alignItems = 'center';
            adExtraContainer.style.justifyContent = 'center';
            
            let closeBtn = document.getElementById('adextra-close-btn') as HTMLButtonElement | null;
            let skipBtn = document.getElementById('adextra-skip-btn') as HTMLButtonElement | null;
            
            if (!closeBtn) {
              closeBtn = document.createElement('button');
              closeBtn.id = 'adextra-close-btn';
              closeBtn.style.cssText = 'position:absolute;top:20px;right:20px;background:#4cd3ff;color:#000;border:none;padding:12px 24px;border-radius:8px;font-weight:bold;cursor:pointer;z-index:10000;display:none;';
              closeBtn.textContent = 'Claim Reward';
              adExtraContainer.appendChild(closeBtn);
            }
            
            if (!skipBtn) {
              skipBtn = document.createElement('button');
              skipBtn.id = 'adextra-skip-btn';
              skipBtn.style.cssText = 'position:absolute;top:20px;left:20px;background:#333;color:#fff;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;z-index:10000;';
              skipBtn.textContent = 'Close';
              adExtraContainer.appendChild(skipBtn);
            }
            
            closeBtn.style.display = 'none';
            skipBtn.style.display = 'block';
            let adLoadedAndViewed = false;
            let contentCheckInterval: NodeJS.Timeout | null = null;
            
            const checkForAdContent = () => {
              const hasContent = adExtraContainer.querySelector('iframe, img, video, div[class]');
              return hasContent !== null && adExtraContainer.childElementCount > 2;
            };
            
            contentCheckInterval = setInterval(() => {
              if (checkForAdContent()) {
                if (contentCheckInterval) clearInterval(contentCheckInterval);
                setTimeout(() => {
                  if (closeBtn) {
                    closeBtn.style.display = 'block';
                    adLoadedAndViewed = true;
                  }
                }, 5000);
              }
            }, 500);
            
            setTimeout(() => {
              if (contentCheckInterval) clearInterval(contentCheckInterval);
              if (!adLoadedAndViewed && closeBtn) {
                closeBtn.style.display = 'none';
              }
            }, 15000);
            
            const handleClaim = () => {
              if (contentCheckInterval) clearInterval(contentCheckInterval);
              adExtraContainer.style.display = 'none';
              if (closeBtn) closeBtn.style.display = 'none';
              if (skipBtn) skipBtn.style.display = 'none';
              closeBtn?.removeEventListener('click', handleClaim);
              skipBtn?.removeEventListener('click', handleSkip);
              
              if (adLoadedAndViewed) {
                handleAdCompletion();
              } else {
                showNotification("Ad did not load properly", "error");
                setLoadingProvider(null);
              }
            };
            
            const handleSkip = () => {
              if (contentCheckInterval) clearInterval(contentCheckInterval);
              adExtraContainer.style.display = 'none';
              if (closeBtn) closeBtn.style.display = 'none';
              if (skipBtn) skipBtn.style.display = 'none';
              closeBtn?.removeEventListener('click', handleClaim);
              skipBtn?.removeEventListener('click', handleSkip);
              showNotification("Ad skipped - no reward earned", "info");
              setLoadingProvider(null);
            };
            
            closeBtn.addEventListener('click', handleClaim);
            skipBtn.addEventListener('click', handleSkip);
          } else {
            showNotification("AdExtra not available. Try again later.", "error");
            setLoadingProvider(null);
          }
          break;
          
        case 'adsgram':
          if ((window as any).Adsgram) {
            try {
              await (window as any).Adsgram.init({ blockId: "int-18225" }).show();
              handleAdCompletion();
            } catch (error) {
              handleAdError(error);
            }
          } else {
            showNotification("Adsgram not available. Try again later.", "error");
            setLoadingProvider(null);
          }
          break;
          
        default:
          showNotification("Unknown ad provider", "error");
          setLoadingProvider(null);
      }
    } catch (error) {
      showNotification("Ad display failed. Please try again.", "error");
      setLoadingProvider(null);
    }
  };

  const adsWatchedToday = (user as any)?.adsWatchedToday || 0;
  const dailyLimit = appSettings?.dailyAdLimit || 50;

  const handleConvertClick = () => {
    setConvertPopupOpen(true);
  };

  const satBalance = Math.floor(parseFloat((user as User)?.balance || "0"));
  const withdrawBalance = satBalance;
  
  const displayName = (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.first_name || (user as User)?.firstName || (user as User)?.username || "User";
  const photoUrl = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.photo_url;

  const handleConvertConfirm = async () => {
    const amount = parseFloat(convertAmount);
    if (isNaN(amount) || amount <= 0) {
      showNotification("Please enter a valid amount", "error");
      return;
    }

    const minimumConvertAXN = selectedConvertType === '' 
      ? (appSettings?.minimumConvertAXN || 10000)
      : (selectedConvertType === 'BUG' ? (appSettings?.minimumConvertPadToBug || 1000) : (appSettings?.minimumConvertPadToTon || 10000));
    
    if (amount < minimumConvertAXN) {
      showNotification(`Minimum ${minimumConvertAXN.toLocaleString()} AXN required.`, "error");
      return;
    }

    if (padBalance < amount) {
      showNotification("Insufficient AXN balance", "error");
      return;
    }

    if (isConverting || convertMutation.isPending) return;
    
    setIsConverting(true);
    console.log('💱 Convert started, showing AdsGram ad first...');
    
    try {
      const monetagResult = await showMonetagRewardedAd();
      
      if (monetagResult.unavailable) {
        console.log('⚠️ Monetag unavailable, proceeding with convert');
        convertMutation.mutate({ amount, convertTo: selectedConvertType || 'TON' });
        return;
      }
      
      if (!monetagResult.success) {
        showNotification("Please watch the ad to convert.", "error");
        setIsConverting(false);
        return;
      }
      
      console.log('✅ Ad watched, converting');
      convertMutation.mutate({ amount, convertTo: selectedConvertType || 'TON' });
      
    } catch (error) {
      console.error('Convert error:', error);
      showNotification("Something went wrong. Please try again.", "error");
    } finally {
      setIsConverting(false);
    }
  };

  const canClaimStreak = !hasClaimed;

  const handleClaimStreak = async () => {
    if (isClaimingStreak || hasClaimed) return;
    
    setIsClaimingStreak(true);
    
    try {
      // Then show Monetag rewarded ad
      const monetagResult = await showMonetagRewardedAd();
      
      if (monetagResult.unavailable) {
        // If Monetag unavailable, proceed
        claimStreakMutation.mutate();
        return;
      }
      
      if (!monetagResult.success) {
        showNotification("Please watch the ad completely to claim your bonus.", "error");
        setIsClaimingStreak(false);
        return;
      }
      
      claimStreakMutation.mutate();
    } catch (error) {
      console.error('Streak claim failed:', error);
      showNotification("Failed to claim streak. Please try again.", "error");
      setIsClaimingStreak(false);
    }
  };

  useEffect(() => {
    if (checkForUpdatesStep === 'countdown' && checkForUpdatesCountdown > 0) {
      const timer = setTimeout(() => setCheckForUpdatesCountdown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (checkForUpdatesStep === 'countdown' && checkForUpdatesCountdown === 0) {
      setCheckForUpdatesStep('ready');
    }
  }, [checkForUpdatesStep, checkForUpdatesCountdown]);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      showNotification("Please enter a promo code", "error");
      return;
    }

    if (isApplyingPromo || redeemPromoMutation.isPending) return;
    
    setIsApplyingPromo(true);
    console.log('🎫 Promo code claim started, showing AdsGram ad first...');
    
    try {
      // Then show Monetag rewarded ad
      console.log('🎬 Proceeding with Monetag rewarded...');
      const monetagResult = await showMonetagRewardedAd();
      
      if (monetagResult.unavailable) {
        // If Monetag unavailable, proceed
        console.log('⚠️ Monetag unavailable, proceeding with promo claim');
        redeemPromoMutation.mutate(promoCode.trim().toUpperCase());
        return;
      }
      
      if (!monetagResult.success) {
        showNotification("Please watch the ad to claim your promo code.", "error");
        setIsApplyingPromo(false);
        return;
      }
      
      console.log('✅ Ad watched, claiming promo code');
      redeemPromoMutation.mutate(promoCode.trim().toUpperCase());
    } catch (error) {
      console.error('Promo claim error:', error);
      showNotification("Something went wrong. Please try again.", "error");
      setIsApplyingPromo(false);
    }
  };

  const handleBoosterClick = () => {
    setBoosterPopupOpen(true);
  };

  const handleWatchExtraAd = async () => {
    if (isTaskPending) return;
    
    showNotification("Ad sequence starting...", "info");
    
    try {
      // 1. Show Monetag
      const monetagResult = await showMonetagRewardedAd();
      if (!monetagResult.success && !monetagResult.unavailable) {
        throw new Error("Please watch the Monetag ad completely.");
      }
      
      // Small delay between ads
      await new Promise(resolve => setTimeout(resolve, 500));

      // 2. Show GigaPub
      console.log('🎬 Attempting GigaPub ad...');
      if (typeof (window as any).showGiga === 'function') {
        console.log('✅ Calling window.showGiga()');
        (window as any).showGiga();
        // Give some time for the ad to at least start showing
        await new Promise(resolve => setTimeout(resolve, 3000));
      } else {
        console.error("❌ GigaPub not available. Please refresh or check your ad blocker.");
        throw new Error("GigaPub ad service not ready. Please refresh.");
      }
      
      // 3. Reward
      const response = await apiRequest("POST", "/api/ads/extra-watch");
      if (!response.ok) {
        const error = await response.json();
        throw error;
      }
      const data = await response.json();
      
      queryClient.setQueryData(["/api/auth/user"], (old: any) => ({
        ...old,
        balance: data.newBalance,
        extraAdsWatchedToday: data.extraAdsWatchedToday
      }));
      
      showNotification(`You received ${data.rewardAXN} SAT for Extra Earn!`, "success");
    } catch (error: any) {
      console.error('Extra earn error:', error);
      showNotification(error.message || "Extra Earn ad failed", "error");
    }
  };

  const handleShareWithFriends = useCallback(() => {
    if (!referralLink) return;
    const tgWebApp = (window as any).Telegram?.WebApp;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent("Join me on this Mine-to-Earn app and start stacking SAT together!")}`;
    if (tgWebApp?.openTelegramLink) {
      tgWebApp.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, '_blank');
    }
    setShareWithFriendsStep('ready');
  }, [referralLink]);

  const shareWithFriendsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/missions/claim", { missionId: 'shareStory' });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/missions/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      showNotification("Rewards claimed!", "success");
      setShareWithFriendsStep('idle');
    }
  });

  const handleClaimShareWithFriends = useCallback(() => {
    shareWithFriendsMutation.mutate();
  }, [shareWithFriendsMutation]);

  const dailyCheckinMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/missions/claim", { missionId: 'dailyCheckin' });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/missions/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      showNotification("Daily check-in successful!", "success");
      setDailyCheckinStep('idle');
    }
  });

  const handleDailyCheckin = useCallback(async () => {
    if (missionStatus?.dailyCheckin?.claimed || dailyCheckinStep !== 'idle') return;
    setDailyCheckinStep('ads');
    const adResult = await runAdFlow();
    if (!adResult.monetagWatched) {
      showNotification("Please watch the ads completely to claim!", "error");
      setDailyCheckinStep('idle');
      return;
    }
    setDailyCheckinStep('ready');
  }, [missionStatus?.dailyCheckin?.claimed, dailyCheckinStep, runAdFlow]);

  const handleClaimDailyCheckin = useCallback(() => {
    if (dailyCheckinMutation.isPending) return;
    setDailyCheckinStep('claiming');
    dailyCheckinMutation.mutate();
  }, [dailyCheckinMutation]);

  const checkForUpdatesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/missions/claim", { missionId: 'checkForUpdates' });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/missions/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      showNotification("Rewards claimed!", "success");
      setCheckForUpdatesStep('idle');
    }
  });

  const handleCheckForUpdates = useCallback(() => {
    if (missionStatus?.checkForUpdates?.claimed || checkForUpdatesStep !== 'idle') return;
    const tgWebApp = (window as any).Telegram?.WebApp;
    const channelUrl = 'https://t.me/LightningSatoshi';
    if (tgWebApp?.openTelegramLink) {
      tgWebApp.openTelegramLink(channelUrl);
    } else if (tgWebApp?.openLink) {
      tgWebApp.openLink(channelUrl);
    } else {
      window.open(channelUrl, '_blank');
    }
    setCheckForUpdatesStep('opened');
    setCheckForUpdatesCountdown(3);
    const countdownInterval = setInterval(() => {
      setCheckForUpdatesCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setCheckForUpdatesStep('ready');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [missionStatus?.checkForUpdates?.claimed, checkForUpdatesStep]);

  const handleClaimCheckForUpdates = useCallback(() => {
    if (checkForUpdatesMutation.isPending) return;
    setCheckForUpdatesStep('claiming');
    checkForUpdatesMutation.mutate();
  }, [checkForUpdatesMutation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="flex gap-1 justify-center mb-4">
            <div className="w-2 h-2 rounded-full bg-[#4cd3ff] animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-[#4cd3ff] animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-[#4cd3ff] animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          <div className="text-foreground font-medium">Loading...</div>
        </div>
      </div>
    );
  }

  const userRank = leaderboardData?.userEarnerRank?.rank;

  return (
    <Layout>
      <Header ref={headerRef} />

      {/* Mining Paused Banner */}
      <AnimatePresence>
        {miningPausedBanner && (
          <motion.div
            initial={{ opacity: 0, y: -60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -60 }}
            transition={{ type: "spring", damping: 22, stiffness: 200 }}
            className="fixed top-16 left-0 right-0 z-[400] flex justify-center px-4"
          >
            <div className="w-full max-w-md bg-red-900/90 border border-red-500/40 rounded-2xl px-5 py-4 flex items-start gap-3 shadow-lg backdrop-blur-sm">
              <span className="text-2xl leading-none">⛔</span>
              <div className="flex-1 min-w-0">
                <p className="text-white font-black text-sm">Mining Paused</p>
                <p className="text-red-300 text-xs mt-0.5">You were inactive for 2 days. Mining has resumed now that you're back.</p>
              </div>
              <button onClick={() => setMiningPausedBanner(false)} className="text-red-400 hover:text-white transition-colors flex-shrink-0 mt-0.5">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-md mx-auto px-4 pb-24" style={{ paddingTop: headerHeight + 8 }}>
        {/* Balance & Stats Section */}
        <div className="mb-4 relative">

          <div className="w-full">
              {/* AXN MINING MACHINE */}
              <p className="text-center text-[10px] font-black uppercase tracking-[0.15em] text-white/30 mb-3">AXN Mining Machine</p>
              <MiningMachinePanel />
          </div>
        </div>

        {/* Footer */}
        <div id="footer01" className="mt-6 mb-2 text-center">
          <p className="text-[10px] text-white/20 font-medium">© 2026 LightningSatsbot</p>
        </div>

      </main>

      {false && boosterPopupOpen && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 px-4">
          <div className="bg-[#0d0d0d] rounded-2xl p-6 w-full max-w-sm border border-[#1a1a1a] relative">
            <div className="flex items-center justify-center gap-2 mb-6">
              <CalendarCheck className="w-5 h-5 text-[#4cd3ff]" />
              <h2 className="text-lg font-bold text-white">Daily Tasks</h2>
            </div>
            
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
              <div className="flex items-center justify-between bg-[#1a1a1a] rounded-lg p-3 hover:bg-[#222] transition">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-[#4cd3ff]" />
                    <p className="text-white text-sm font-medium truncate">Share with Friends</p>
                  </div>
                  <div className="text-xs text-gray-400 ml-6">
                    <p>Reward: <span className="text-white font-medium">{appSettings?.referralRewardAXN || '5'} SAT</span></p>
                  </div>
                </div>
                <div className="ml-3 flex-shrink-0">
                  {missionStatus?.shareStory?.claimed ? (
                    <div className="h-8 w-20 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <Check className="w-4 h-4 text-green-400" />
                    </div>
                  ) : shareWithFriendsStep === 'ready' || shareWithFriendsStep === 'claiming' ? (
                    <Button
                      onClick={handleClaimShareWithFriends}
                      disabled={shareWithFriendsMutation.isPending}
                      className="h-8 w-20 text-xs font-bold rounded-lg bg-green-500 hover:bg-green-600 text-white"
                    >
                      {shareWithFriendsMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Claim'}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleShareWithFriends}
                      disabled={!referralLink}
                      className="h-8 w-16 text-xs font-bold rounded-lg bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      Share
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between bg-[#1a1a1a] rounded-lg p-3 hover:bg-[#222] transition">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarCheck className="w-4 h-4 text-[#4cd3ff]" />
                    <p className="text-white text-sm font-medium truncate">Daily Check-in</p>
                  </div>
                  <div className="text-xs text-gray-400 ml-6">
                    <p>Reward: <span className="text-white font-medium">{appSettings?.dailyCheckinReward || '5'} SAT</span></p>
                  </div>
                </div>
                <div className="ml-3 flex-shrink-0">
                  {missionStatus?.dailyCheckin?.claimed ? (
                    <div className="h-8 w-20 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <Check className="w-4 h-4 text-green-400" />
                    </div>
                  ) : dailyCheckinStep === 'ads' ? (
                    <Button
                      disabled={true}
                      className="h-8 w-20 text-xs font-bold rounded-lg bg-purple-600 text-white"
                    >
                      Watching...
                    </Button>
                  ) : dailyCheckinStep === 'ready' || dailyCheckinStep === 'claiming' ? (
                    <Button
                      onClick={handleClaimDailyCheckin}
                      disabled={dailyCheckinMutation.isPending}
                      className="h-8 w-20 text-xs font-bold rounded-lg bg-green-500 hover:bg-green-600 text-white"
                    >
                      {dailyCheckinMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Claim'}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleDailyCheckin}
                      className="h-8 w-20 text-xs font-bold rounded-lg bg-[#4cd3ff] hover:bg-[#3db8e0] text-black"
                    >
                      Check-in
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between bg-[#1a1a1a] rounded-lg p-3 hover:bg-[#222] transition">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Rocket className="w-4 h-4 text-[#4cd3ff]" />
                    <p className="text-white text-sm font-medium truncate">Check for Updates</p>
                  </div>
                  <div className="text-xs text-gray-400 ml-6">
                    <p>Reward: <span className="text-white font-medium">{appSettings?.checkForUpdatesReward || '5'} SAT</span></p>
                  </div>
                </div>
                <div className="ml-3 flex-shrink-0">
                  {missionStatus?.checkForUpdates?.claimed ? (
                    <div className="h-8 w-20 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <Check className="w-4 h-4 text-green-400" />
                    </div>
                  ) : checkForUpdatesStep === 'opened' ? (
                    <div className="h-8 w-20 flex items-center justify-center gap-1 bg-[#1a1a1a] border border-[#4cd3ff]/30 rounded-lg">
                      <Clock size={12} className="text-[#4cd3ff]" />
                      <span className="text-white text-xs font-bold">{checkForUpdatesCountdown}s</span>
                    </div>
                  ) : checkForUpdatesStep === 'ready' || checkForUpdatesStep === 'claiming' ? (
                    <Button
                      onClick={handleClaimCheckForUpdates}
                      disabled={checkForUpdatesMutation.isPending}
                      className="h-8 w-20 text-xs font-bold rounded-lg bg-green-500 hover:bg-green-600 text-white"
                    >
                      {checkForUpdatesMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Claim'}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleCheckForUpdates}
                      className="h-8 w-20 text-xs font-bold rounded-lg bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      Open
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <Button
              onClick={() => setBoosterPopupOpen(false)}
              className="w-full mt-6 bg-[#1a1a1a] hover:bg-[#222] text-white border border-[#333] rounded-xl"
            >
              Close
            </Button>
          </div>
        </div>
      )}



      {/* Bottom Navigation — top-rounded, flush at bottom with slight side gap */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <div className="w-full max-w-md relative pointer-events-auto">
          {/* Soft gold ambient halo behind the center action */}
          <div
            aria-hidden
            className="absolute left-1/2 -translate-x-1/2 -top-4 w-44 h-16 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(closest-side, rgba(245,197,66,0.22), rgba(245,197,66,0) 70%)',
              filter: 'blur(8px)',
            }}
          />

          <div
            className="relative flex items-center overflow-hidden"
            style={{
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              background:
                'linear-gradient(180deg, rgba(22,22,22,0.96) 0%, rgba(10,10,10,0.98) 100%)',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              borderLeft: '1px solid rgba(255,255,255,0.06)',
              borderRight: '1px solid rgba(255,255,255,0.06)',
              boxShadow:
                '0 -10px 30px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            {/* Glowing accent rule — top edge highlight */}
            <div
              aria-hidden
              className="absolute top-0 left-0 right-0 h-px pointer-events-none"
              style={{
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(245,197,66,0.35) 50%, transparent 100%)',
              }}
            />

            {/* Invite */}
            <button
              onClick={() => setInviteOpen(true)}
              className="group flex-1 flex flex-col items-center pt-4 pb-5 gap-1.5 transition-all active:scale-95"
            >
              <MdGroups style={{ width: 24, height: 24, color: '#4FC3F7' }} />
              <span className="text-[9px] font-bold text-white/45 tracking-[0.14em] uppercase">
                {tText('Invite')}
              </span>
            </button>

            {/* Withdraw — elevated primary action */}
            <button
              onClick={() => setWithdrawPopupOpen(true)}
              className="group flex-[1.3] flex flex-col items-center pt-3 pb-5 gap-1.5 transition-all active:scale-95 relative"
            >
              <div
                className="flex items-center justify-center rounded-2xl px-5 py-2.5 gap-1.5 transition-all group-hover:brightness-110"
                style={{
                  background:
                    'linear-gradient(135deg, #FFD970 0%, #F5C542 45%, #d4920a 100%)',
                  boxShadow:
                    '0 6px 20px rgba(245,197,66,0.45), 0 2px 6px rgba(212,146,10,0.4), inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.15)',
                }}
              >
                <Banknote className="w-4 h-4 text-black/85" strokeWidth={2.5} />
                <span className="text-black text-[11px] font-black tracking-[0.12em] uppercase">
                  {tText('Withdraw')}
                </span>
              </div>
            </button>

            {/* Menu */}
            <button
              onClick={() => setMenuOpen(true)}
              className="group flex-1 flex flex-col items-center pt-4 pb-5 gap-1.5 transition-all active:scale-95"
            >
              <Settings style={{ width: 24, height: 24, color: '#FFD54F', strokeWidth: 2 }} />
              <span className="text-[9px] font-bold text-white/45 tracking-[0.14em] uppercase">
                {tText('Menu')}
              </span>
            </button>
          </div>
        </div>
      </div>

      {settingsOpen && (
        <SettingsPopup 
          onClose={() => setSettingsOpen(false)} 
        />
      )}

      {inviteOpen && <InvitePopup onClose={() => setInviteOpen(false)} />}
      {menuOpen && <MenuPopup onClose={() => setMenuOpen(false)} />}

      <WithdrawalPopup 
        open={withdrawPopupOpen}
        onOpenChange={setWithdrawPopupOpen}
        tonBalance={withdrawBalance}
      />

    </Layout>
  );
}
