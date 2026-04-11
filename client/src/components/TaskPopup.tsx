import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle, Loader2,
} from "lucide-react";
import { RiLoginCircleFill, RiShareForwardFill, RiRobotFill } from "react-icons/ri";
import { MdOndemandVideo } from "react-icons/md";
import { BsLightningChargeFill } from "react-icons/bs";
import { FaFire, FaGem, FaTelegramPlane, FaGlobe } from "react-icons/fa";
import { showNotification } from "@/components/AppNotification";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { formatHashrate } from "@/lib/hashrate";

interface PromotedTask {
  id: string;
  type: string;
  taskType: string;
  title: string;
  link: string | null;
  rewardAXN: number;
  rewardType: string;
  isAdminTask: boolean;
  priority: number;
}

interface TaskPopupProps {
  onClose: () => void;
}

interface DailyTaskDef {
  id: string;
  label: string;
  rewardPerHour: number;
  icon: React.ReactNode;
  requiredAds?: number;
  isShare?: boolean;
  isLogin?: boolean;
}

const DAILY_TASKS: DailyTaskDef[] = [
  { id: "login",  label: "Login",                icon: <RiLoginCircleFill className="w-5 h-5" style={{ color: "#a78bfa" }} />,        rewardPerHour: 0.001, isLogin: true },
  { id: "share",  label: "Share App",             icon: <RiShareForwardFill className="w-5 h-5" style={{ color: "#38bdf8" }} />,      rewardPerHour: 0.001, isShare: true },
  { id: "ads15",  label: "Active 15 Ad Miner",    icon: <MdOndemandVideo className="w-5 h-5" style={{ color: "#34d399" }} />,         rewardPerHour: 0.002, requiredAds: 15 },
  { id: "ads25",  label: "Active 25 Ad Miner",    icon: <BsLightningChargeFill className="w-5 h-5" style={{ color: "#F5C542" }} />,   rewardPerHour: 0.005, requiredAds: 25 },
  { id: "ads60",  label: "Active 60 Ad Miner",    icon: <FaFire className="w-5 h-5" style={{ color: "#fb923c" }} />,                  rewardPerHour: 0.01,  requiredAds: 60 },
  { id: "ads120", label: "Active 120 Ad Miner",   icon: <FaGem className="w-5 h-5" style={{ color: "#22d3ee" }} />,                   rewardPerHour: 0.03,  requiredAds: 120 },
];

export default function TaskPopup({ onClose }: TaskPopupProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [clickedTasks, setClickedTasks] = useState<Set<string>>(new Set());
  const [completedPromoted, setCompletedPromoted] = useState<Set<string>>(new Set());
  const [shareStarted, setShareStarted] = useState(false);

  const { data: botInfo } = useQuery<{ username: string }>({
    queryKey: ["/api/bot-info"],
    queryFn: async () => {
      const res = await fetch("/api/bot-info", { credentials: "include" });
      if (!res.ok) return { username: "" };
      return res.json();
    },
    staleTime: 300000,
    retry: false,
  });
  const botUsername = botInfo?.username || import.meta.env.VITE_BOT_USERNAME || "";

  const adsWatchedToday: number = (user as any)?.adsWatchedToday || 0;

  const { data: dailyStatus, isLoading: dailyLoading } = useQuery<{
    success: boolean;
    claimed: string[];
    adsWatchedToday: number;
  }>({
    queryKey: ["/api/daily-tasks/status"],
    queryFn: async () => {
      const res = await fetch("/api/daily-tasks/status", { credentials: "include" });
      if (!res.ok) return { success: true, claimed: [], adsWatchedToday: 0 };
      return res.json();
    },
    retry: false,
  });

  const claimedDaily = new Set(dailyStatus?.claimed || []);
  const serverAdsWatched = dailyStatus?.adsWatchedToday ?? adsWatchedToday;

  const { data: promotedData, isLoading: promotedLoading } = useQuery<{
    success: boolean;
    tasks: PromotedTask[];
    completedTaskIds: string[];
  }>({
    queryKey: ["/api/tasks/home/unified"],
    queryFn: async () => {
      const res = await fetch("/api/tasks/home/unified", { credentials: "include" });
      if (!res.ok) return { success: true, tasks: [], completedTaskIds: [] };
      return res.json();
    },
    retry: false,
  });

  const promotedTasks = promotedData?.tasks || [];
  const serverCompleted = promotedData?.completedTaskIds || [];
  const allCompletedPromoted = new Set([...serverCompleted, ...completedPromoted]);

  useEffect(() => {
    if (dailyStatus && !claimedDaily.has("login")) {
      claimDailyMutation.mutate("login");
    }
  }, [dailyStatus]);

  const claimDailyMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch("/api/daily-tasks/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ taskId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to claim");
      return { ...data, taskId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-tasks/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mining/state"] });
      if (data.taskId !== "login") {
        showNotification(`+${formatHashrate(data.boostRatePerHour)} boost for 24h!`, "success");
      }
    },
    onError: (error: any) => {
      if (!error.message?.includes("Already claimed")) {
        showNotification(error.message || "Failed to claim", "error");
      }
    },
  });

  const handleDailyTask = (task: DailyTaskDef) => {
    if (claimedDaily.has(task.id)) return;

    if (task.isLogin) {
      claimDailyMutation.mutate(task.id);
      return;
    }

    if (task.isShare) {
      const tgWebApp = (window as any).Telegram?.WebApp;
      const refCode = (user as any)?.referralCode || "";
      const link = `https://t.me/${botUsername}?start=${refCode}`;
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent("Join me on Lightning Sats!")}`;
      if (tgWebApp?.openTelegramLink) tgWebApp.openTelegramLink(shareUrl);
      else window.open(shareUrl, "_blank");
      setShareStarted(true);
      return;
    }

    if (task.requiredAds !== undefined) {
      if (serverAdsWatched >= task.requiredAds) {
        claimDailyMutation.mutate(task.id);
      } else {
        showNotification(`Watch ${task.requiredAds} ads today to unlock this task.`, "info");
      }
      return;
    }
  };

  const handleShareClaim = () => {
    claimDailyMutation.mutate("share");
    setShareStarted(false);
  };

  const startPromotedMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch(`/api/advertiser-tasks/${taskId}/click`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to start task");
      return data;
    },
    onSuccess: (_, taskId) => {
      setClickedTasks((prev) => new Set(prev).add(taskId));
      showNotification("Task started! Click Claim to earn your reward.", "info");
    },
    onError: (error: any) => {
      showNotification(error.message || "Failed to start task", "error");
    },
  });

  const claimPromotedMutation = useMutation({
    mutationFn: async ({ taskId, taskType, link }: { taskId: string; taskType: string; link: string | null }) => {
      if (taskType === "channel" && link) {
        const username = link.replace("https://t.me/", "").split("?")[0];
        const telegramData = (window as any).Telegram?.WebApp?.initData || "";
        const resVerify = await fetch("/api/tasks/verify/channel", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-telegram-data": telegramData },
          body: JSON.stringify({ channelId: `@${username}` }),
          credentials: "include",
        });
        const verifyData = await resVerify.json();
        if (!resVerify.ok || !verifyData.isJoined) {
          throw new Error("Please join the channel to complete this task.");
        }
      }
      const res = await fetch(`/api/advertiser-tasks/${taskId}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to claim reward");
      setCompletedPromoted((prev) => { const next = new Set(prev); next.add(taskId); return next; });
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/home/unified"] });
      const sat = Number(data.reward ?? 0);
      showNotification(`+${formatHashrate(sat)} earned!`, "success");
    },
    onError: (error: any) => {
      showNotification(error.message || "Failed to claim reward", "error");
    },
  });

  const handlePromoted = (task: PromotedTask) => {
    if (allCompletedPromoted.has(task.id)) return;
    if (clickedTasks.has(task.id)) {
      claimPromotedMutation.mutate({ taskId: task.id, taskType: task.taskType, link: task.link });
      return;
    }
    if (task.link) window.open(task.link, "_blank");
    startPromotedMutation.mutate(task.id);
  };

  const getPromotedIcon = (task: PromotedTask) => {
    if (task.taskType === "channel") return <FaTelegramPlane className="w-5 h-5" style={{ color: "#38bdf8" }} />;
    if (task.taskType === "bot") return <RiRobotFill className="w-5 h-5" style={{ color: "#a78bfa" }} />;
    return <FaGlobe className="w-5 h-5" style={{ color: "#34d399" }} />;
  };

  const pendingPromoted = promotedTasks.filter((t) => !allCompletedPromoted.has(t.id));
  const donePromoted = promotedTasks.filter((t) => allCompletedPromoted.has(t.id));

  const isClaimingDaily = claimDailyMutation.isPending;
  const isClaimingPromoted = claimPromotedMutation.isPending;
  const isStartingPromoted = startPromotedMutation.isPending;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[300] bg-[#0a0a0a] flex flex-col"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 26, stiffness: 220 }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/5 flex-shrink-0 flex items-center justify-center relative">
          <h2 className="text-white font-black text-base uppercase tracking-tight italic">Tasks</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {/* ── Daily Tasks ── */}
          <div>
            <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-3">Daily Tasks</p>
            {dailyLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2.5">
                {DAILY_TASKS.map((task) => {
                  const isClaimed = claimedDaily.has(task.id);
                  const isClaiming = isClaimingDaily && claimDailyMutation.variables === task.id;
                  const canClaim = task.requiredAds !== undefined
                    ? serverAdsWatched >= task.requiredAds
                    : true;
                  const isShareReady = task.isShare && shareStarted && !isClaimed;
                  const isLocked = task.requiredAds !== undefined && !canClaim && !isClaimed;

                  return (
                    <div
                      key={task.id}
                      className={`bg-[#141414] border rounded-2xl p-4 flex items-center justify-between gap-3 transition-opacity ${
                        isClaimed ? "border-green-500/20 opacity-60" : "border-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 w-8 flex items-center justify-center">
                          {isClaimed ? <CheckCircle className="w-5 h-5 text-green-400" /> : task.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-bold text-sm leading-snug truncate">{task.label}</p>
                          <p className="text-[#F5C542] text-[11px] font-bold mt-0.5">
                            +{formatHashrate(task.rewardPerHour)}
                          </p>
                          {isLocked && (
                            <p className="text-white/30 text-[10px] mt-0.5">
                              {serverAdsWatched}/{task.requiredAds} ads watched
                            </p>
                          )}
                        </div>
                      </div>

                      {isClaimed ? (
                        <div className="flex-shrink-0 h-9 px-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        </div>
                      ) : task.isLogin ? (
                        <div className="flex-shrink-0 h-9 px-4 rounded-xl bg-[#F5C542]/10 border border-[#F5C542]/20 flex items-center">
                          {isClaiming ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F5C542]" /> : <CheckCircle className="w-4 h-4 text-[#F5C542]" />}
                        </div>
                      ) : isShareReady ? (
                        <button
                          onClick={handleShareClaim}
                          disabled={isClaimingDaily}
                          className="flex-shrink-0 h-9 px-5 rounded-xl text-xs font-black uppercase tracking-wide bg-green-500 text-white transition-all active:scale-[0.96] disabled:opacity-50"
                        >
                          {isClaiming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Claim"}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDailyTask(task)}
                          disabled={isClaimingDaily || isLocked}
                          className={`flex-shrink-0 h-9 px-5 rounded-xl text-xs font-black uppercase tracking-wide transition-all active:scale-[0.96] disabled:opacity-40 ${
                            isLocked
                              ? "bg-white/5 border border-white/10 text-white/30 cursor-not-allowed"
                              : canClaim && !task.isShare
                              ? "bg-[#F5C542] text-black"
                              : "bg-[#F5C542] text-black"
                          }`}
                        >
                          {isClaiming ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : isLocked ? (
                            "Locked"
                          ) : task.isShare ? (
                            "Share"
                          ) : (
                            "Claim"
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Promoted Tasks ── */}
          <div>
            <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-3">Promoted Tasks</p>
            {promotedLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
              </div>
            ) : promotedTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <p className="text-white/20 text-sm font-bold uppercase tracking-widest">No promoted tasks</p>
              </div>
            ) : (
              <>
                {pendingPromoted.length > 0 && (
                  <div className="space-y-2.5">
                    {pendingPromoted.map((task) => {
                      const isClicked = clickedTasks.has(task.id);
                      return (
                        <div
                          key={task.id}
                          className="bg-[#141414] border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex-shrink-0 w-8 flex items-center justify-center">
                              {getPromotedIcon(task)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-white font-bold text-sm leading-snug truncate">{task.title}</p>
                              <p className="text-[#F5C542] text-[11px] font-bold mt-0.5">
                                +{formatHashrate(task.rewardAXN)}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handlePromoted(task)}
                            disabled={isStartingPromoted || isClaimingPromoted}
                            className={`flex-shrink-0 h-9 px-5 rounded-xl text-xs font-black uppercase tracking-wide transition-all active:scale-[0.96] disabled:opacity-50 ${
                              isClicked ? "bg-green-500 text-white" : "bg-[#F5C542] text-black"
                            }`}
                          >
                            {(isStartingPromoted || isClaimingPromoted) ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : isClicked ? "Claim" : "Start"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {donePromoted.length > 0 && (
                  <div className="space-y-2 mt-3">
                    <p className="text-white/20 text-[10px] font-black uppercase tracking-widest px-0.5">Completed</p>
                    {donePromoted.map((task) => (
                      <div
                        key={task.id}
                        className="bg-[#141414] border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-3 opacity-50"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex-shrink-0 w-8 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-white/60 font-bold text-sm leading-snug truncate">{task.title}</p>
                            <p className="text-green-400 text-[11px] font-bold mt-0.5">+{formatHashrate(task.rewardAXN)}</p>
                          </div>
                        </div>
                        <div className="flex-shrink-0 h-9 px-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Bottom Back Button */}
        <div className="px-5 py-4 border-t border-white/5 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full h-12 bg-[#141414] border border-white/8 rounded-2xl font-black uppercase tracking-wider text-white text-sm hover:bg-white/5 transition-all active:scale-[0.98]"
          >
            Back
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
