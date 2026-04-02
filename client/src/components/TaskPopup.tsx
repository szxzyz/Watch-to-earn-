import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Send, ExternalLink, CheckCircle, Loader2, ClipboardList, Plus,
} from "lucide-react";
import { showNotification } from "@/components/AppNotification";
import { motion, AnimatePresence } from "framer-motion";
import { useAdmin } from "@/hooks/useAdmin";
import { useLocation } from "wouter";

interface Task {
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

export default function TaskPopup({ onClose }: TaskPopupProps) {
  const queryClient = useQueryClient();
  const { isAdmin } = useAdmin();
  const [, setLocation] = useLocation();
  const [clickedTasks, setClickedTasks] = useState<Set<string>>(new Set());
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

  const { data: tasksData, isLoading } = useQuery<{
    success: boolean;
    tasks: Task[];
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

  const tasks = tasksData?.tasks || [];
  const serverCompleted = tasksData?.completedTaskIds || [];
  const allCompleted = new Set([...serverCompleted, ...completedTasks]);

  const startMutation = useMutation({
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

  const claimMutation = useMutation({
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
      setCompletedTasks((prev) => { const next = new Set(prev); next.add(taskId); return next; });
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/home/unified"] });
      const sat = Number(data.reward ?? 0);
      showNotification(`+${sat.toLocaleString()} SAT earned!`, "success");
    },
    onError: (error: any) => {
      showNotification(error.message || "Failed to claim reward", "error");
    },
  });

  const handleTask = (task: Task) => {
    if (allCompleted.has(task.id)) return;
    if (clickedTasks.has(task.id)) {
      claimMutation.mutate({ taskId: task.id, taskType: task.taskType, link: task.link });
      return;
    }
    if (task.link) window.open(task.link, "_blank");
    startMutation.mutate(task.id);
  };

  const getIcon = (task: Task) => {
    if (task.taskType === "channel") return <Send className="w-5 h-5 text-[#F5C542]" />;
    return <ExternalLink className="w-5 h-5 text-[#F5C542]" />;
  };

  const pendingTasks = tasks.filter((t) => !allCompleted.has(t.id));
  const doneTasks = tasks.filter((t) => allCompleted.has(t.id));

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
        <div className="px-5 py-4 border-b border-white/5 flex-shrink-0 flex items-center justify-between">
          <h2 className="text-white font-black text-base uppercase tracking-tight italic">Tasks</h2>
          {isAdmin && (
            <button
              onClick={() => { onClose(); setLocation("/task/create"); }}
              className="flex items-center gap-1.5 bg-[#F5C542] text-black text-xs font-black px-3 py-2 rounded-xl active:scale-95 transition-transform"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Task
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <ClipboardList className="w-10 h-10 text-white/10" />
              <p className="text-white/30 text-sm font-bold uppercase tracking-widest">No tasks available</p>
            </div>
          ) : (
            <>
              {pendingTasks.length > 0 && (
                <div className="space-y-2.5">
                  {pendingTasks.map((task) => {
                    const isClicked = clickedTasks.has(task.id);
                    const isClaiming = claimMutation.isPending;
                    const isStarting = startMutation.isPending;
                    return (
                      <div
                        key={task.id}
                        className="bg-[#141414] border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-[#F5C542]/10 border border-[#F5C542]/20 flex items-center justify-center flex-shrink-0">
                            {getIcon(task)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-white font-bold text-sm leading-snug truncate">{task.title}</p>
                            <p className="text-[#F5C542] text-[11px] font-bold mt-0.5">
                              +{task.rewardAXN.toLocaleString()} SAT
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleTask(task)}
                          disabled={isStarting || isClaiming}
                          className={`flex-shrink-0 h-9 px-5 rounded-xl text-xs font-black uppercase tracking-wide transition-all active:scale-[0.96] disabled:opacity-50 ${
                            isClicked
                              ? "bg-green-500 text-white"
                              : "bg-[#F5C542] text-black"
                          }`}
                        >
                          {(isStarting || isClaiming) ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : isClicked ? "Claim" : "Start"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {doneTasks.length > 0 && (
                <div className="space-y-2">
                  <p className="text-white/30 text-[10px] font-black uppercase tracking-widest px-0.5">Completed</p>
                  {doneTasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-[#141414] border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-3 opacity-50"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-white/60 font-bold text-sm leading-snug truncate">{task.title}</p>
                          <p className="text-green-400 text-[11px] font-bold mt-0.5">
                            +{task.rewardAXN.toLocaleString()} SAT
                          </p>
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
