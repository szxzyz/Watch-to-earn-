import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2, Send, Bot as BotIcon, ArrowLeft, Trash2,
  Info, Handshake, Loader2, CheckCircle, Clock, TrendingUp, FileText, Plus,
} from "lucide-react";
import { showNotification } from "@/components/AppNotification";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Task {
  id: string;
  taskType: string;
  title: string;
  link: string;
  totalClicksRequired: number;
  currentClicks: number;
  costPerClick: string;
  totalCost: string;
  status: string;
  advertiserId: string;
  createdAt: string;
  completedAt?: string;
}

type Tab = "create" | "my-tasks";

export default function CreateTask() {
  const { user, isLoading } = useAuth();
  const { isAdmin } = useAdmin();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [tab, setTab] = useState<Tab>("create");
  const [taskType, setTaskType] = useState<"channel" | "bot" | "partner" | null>(null);
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [totalClicks, setTotalClicks] = useState("100");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [showVerifyInfo, setShowVerifyInfo] = useState(false);

  const MIN_CLICKS = 100;

  const { data: myTasksData, isLoading: myTasksLoading } = useQuery<{ success: boolean; tasks: Task[] }>({
    queryKey: ["/api/advertiser-tasks/my-tasks"],
    retry: false,
    refetchOnMount: true,
  });

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/advertiser-tasks/create", {
        taskType,
        title,
        link,
        totalClicksRequired: parseInt(totalClicks) || MIN_CLICKS,
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      return data;
    },
    onSuccess: () => {
      showNotification("Task created successfully!", "success");
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser-tasks/my-tasks"] });
      setTitle(""); setLink(""); setTotalClicks("100"); setTaskType(null); setIsVerified(false);
      setTab("my-tasks");
    },
    onError: (error: Error) => {
      showNotification(error.message || "Failed to create task", "error");
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await apiRequest("DELETE", `/api/advertiser-tasks/${taskId}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      return data;
    },
    onSuccess: () => {
      showNotification("Task deleted!", "success");
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser-tasks/my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser-tasks"] });
      setTaskToDelete(null);
    },
    onError: (error: Error) => {
      showNotification(error.message || "Failed to delete task", "error");
    },
  });

  const handleVerifyChannel = async () => {
    if (!link.trim()) { showNotification("Please enter a channel link first", "error"); return; }
    setIsVerifying(true);
    try {
      const response = await apiRequest("POST", "/api/advertiser-tasks/verify-channel", { channelLink: link });
      const data = await response.json();
      if (data.success) { setIsVerified(true); showNotification("Channel verified!", "success"); }
      else showNotification(data.message || "Verification failed", "error");
    } catch { showNotification("Failed to verify channel", "error"); }
    finally { setIsVerifying(false); }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskType) { showNotification("Please select a task type", "error"); return; }
    if (!title.trim()) { showNotification("Please enter a task title", "error"); return; }
    const urlPattern = /(https?:\/\/|t\.me\/|\.com|\.net|\.org|\.io|www\.)/i;
    if (urlPattern.test(title)) { showNotification("Links are not allowed in title", "error"); return; }
    if (!link.trim()) { showNotification("Please enter a valid link", "error"); return; }
    const clicksNum = parseInt(totalClicks) || 0;
    if (clicksNum < MIN_CLICKS) { showNotification(`Minimum ${MIN_CLICKS} clicks required`, "error"); return; }
    if (taskType === "channel" && !isVerified) { showNotification("Please verify your channel first", "error"); return; }
    createTaskMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[300] bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-[300] bg-[#0a0a0a] flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-white/40 text-sm font-bold text-center">Admin access required to create tasks.</p>
        <button
          onClick={() => setLocation("/")}
          className="bg-[#F5C542] text-black font-black rounded-2xl px-8 py-3 text-sm"
        >
          Go Home
        </button>
      </div>
    );
  }

  const myTasks = myTasksData?.tasks || [];
  const activeTasks = myTasks.filter(t => ["running", "under_review", "paused"].includes(t.status));
  const completedTasks = myTasks.filter(t => ["completed", "rejected"].includes(t.status));

  const taskTypes = [
    { id: "channel" as const, label: "Channel", icon: <Send className="w-4 h-4" />, color: "blue" },
    { id: "bot" as const, label: "Bot / Link", icon: <BotIcon className="w-4 h-4" />, color: "purple" },
    { id: "partner" as const, label: "Partner", icon: <Handshake className="w-4 h-4" />, color: "green" },
  ];

  const accentMap: Record<string, string> = {
    blue: "border-blue-500 bg-blue-500/10 text-blue-400",
    purple: "border-purple-500 bg-purple-500/10 text-purple-400",
    green: "border-green-500 bg-green-500/10 text-green-400",
  };

  return (
    <motion.div
      className="fixed inset-0 z-[300] bg-[#0a0a0a] flex flex-col"
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 26, stiffness: 220 }}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5 flex-shrink-0 flex items-center gap-3">
        <button
          onClick={() => setLocation("/admin")}
          className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-4 h-4 text-white/60" />
        </button>
        <h2 className="text-white font-black text-base uppercase tracking-tight italic flex-1">Task Manager</h2>
        <div className="flex bg-white/5 rounded-xl p-1 gap-1">
          <button
            onClick={() => setTab("create")}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide transition-all ${
              tab === "create" ? "bg-[#F5C542] text-black" : "text-white/40"
            }`}
          >
            Create
          </button>
          <button
            onClick={() => setTab("my-tasks")}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide transition-all ${
              tab === "my-tasks" ? "bg-[#F5C542] text-black" : "text-white/40"
            }`}
          >
            Tasks
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <AnimatePresence mode="wait">
          {tab === "create" ? (
            <motion.div
              key="create"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.18 }}
              className="space-y-5"
            >
              {/* Task Type */}
              <div>
                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-3">Task Type</p>
                <div className="grid grid-cols-3 gap-2">
                  {taskTypes.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => { setTaskType(t.id); setIsVerified(false); }}
                      className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${
                        taskType === t.id
                          ? accentMap[t.color]
                          : "bg-[#141414] border-white/5 text-white/40"
                      }`}
                    >
                      {t.icon}
                      <span className="text-[10px] font-black uppercase tracking-wide">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {taskType && (
                <form onSubmit={handleCreate} className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="text-white/40 text-[10px] font-black uppercase tracking-widest block mb-2">Task Title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Short description of the task"
                      className="w-full bg-[#141414] border border-white/8 rounded-2xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#F5C542]/40 transition-colors"
                    />
                  </div>

                  {/* Link */}
                  <div>
                    <label className="text-white/40 text-[10px] font-black uppercase tracking-widest block mb-2">
                      {taskType === "partner" ? "Task Link (Any URL)" : taskType === "channel" ? "Telegram Channel Link" : "Bot / Website Link"}
                    </label>
                    <input
                      type="text"
                      value={link}
                      onChange={(e) => { setLink(e.target.value); setIsVerified(false); }}
                      placeholder={
                        taskType === "partner" ? "https://example.com" :
                        taskType === "channel" ? "https://t.me/yourchannel" :
                        "https://t.me/yourbot"
                      }
                      className="w-full bg-[#141414] border border-white/8 rounded-2xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#F5C542]/40 transition-colors"
                    />
                  </div>

                  {/* Verify Channel */}
                  {taskType === "channel" && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleVerifyChannel}
                        disabled={isVerifying || !link.trim()}
                        className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-2xl text-sm font-black uppercase tracking-wide transition-all disabled:opacity-40 ${
                          isVerified
                            ? "bg-green-500/10 border border-green-500/30 text-green-400"
                            : "bg-white/5 border border-white/10 text-white/60"
                        }`}
                      >
                        {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> :
                         isVerified ? <><CheckCircle2 className="w-4 h-4" /> Verified</> :
                         "Verify Channel"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowVerifyInfo(true)}
                        className="w-11 h-11 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center text-white/40"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Clicks */}
                  <div>
                    <label className="text-white/40 text-[10px] font-black uppercase tracking-widest block mb-2">
                      Total Clicks Required
                    </label>
                    <input
                      type="number"
                      min={taskType === "partner" ? 1 : MIN_CLICKS}
                      step="100"
                      value={totalClicks}
                      onChange={(e) => setTotalClicks(e.target.value)}
                      className="w-full bg-[#141414] border border-white/8 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#F5C542]/40 transition-colors"
                    />
                    <p className="text-white/25 text-[10px] mt-1.5 px-1">
                      Minimum {taskType === "partner" ? 1 : MIN_CLICKS} clicks
                      {taskType !== "partner" && " · Free for admin"}
                    </p>
                  </div>

                  {/* Create Button */}
                  <button
                    type="submit"
                    disabled={createTaskMutation.isPending || (taskType === "channel" && !isVerified)}
                    className="w-full h-13 bg-[#F5C542] text-black font-black text-sm uppercase tracking-widest rounded-2xl disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.98] transition-all py-3.5"
                  >
                    {createTaskMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <><Plus className="w-4 h-4" /> Publish Task</>
                    )}
                  </button>
                </form>
              )}

              {!taskType && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <p className="text-white/20 text-sm font-bold text-center">Select a task type above to get started</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="my-tasks"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              {myTasksLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
                </div>
              ) : myTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <FileText className="w-10 h-10 text-white/10" />
                  <p className="text-white/30 text-sm font-bold text-center">No tasks created yet</p>
                  <button
                    onClick={() => setTab("create")}
                    className="bg-[#F5C542] text-black font-black text-sm rounded-2xl px-6 py-3"
                  >
                    Create First Task
                  </button>
                </div>
              ) : (
                <>
                  {activeTasks.length > 0 && (
                    <div className="space-y-2.5">
                      <p className="text-white/30 text-[10px] font-black uppercase tracking-widest">Active ({activeTasks.length})</p>
                      {activeTasks.map((task) => {
                        const progress = Math.min((task.currentClicks / task.totalClicksRequired) * 100, 100);
                        const remaining = task.totalClicksRequired - task.currentClicks;
                        return (
                          <div key={task.id} className="bg-[#141414] border border-white/5 rounded-2xl p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className="w-8 h-8 rounded-xl bg-[#F5C542]/10 border border-[#F5C542]/20 flex items-center justify-center flex-shrink-0">
                                  {task.taskType === "channel" ? <Send className="w-3.5 h-3.5 text-[#F5C542]" /> :
                                   task.taskType === "partner" ? <Handshake className="w-3.5 h-3.5 text-[#F5C542]" /> :
                                   <BotIcon className="w-3.5 h-3.5 text-[#F5C542]" />}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-white font-bold text-sm truncate">{task.title}</p>
                                  <span className="text-[10px] font-bold text-green-400 uppercase">{task.status}</span>
                                </div>
                              </div>
                              <button
                                onClick={() => setTaskToDelete(task)}
                                className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0 ml-2"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                              </button>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-white/40 mb-2">
                              <div className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />{task.currentClicks}/{task.totalClicksRequired} clicks</div>
                              <div className="flex items-center gap-1"><Clock className="w-3 h-3" />{remaining} remaining</div>
                            </div>
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-[#F5C542] to-[#d4920a] rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {completedTasks.length > 0 && (
                    <div className="space-y-2.5">
                      <p className="text-white/30 text-[10px] font-black uppercase tracking-widest">Completed</p>
                      {completedTasks.map((task) => (
                        <div key={task.id} className="bg-[#141414] border border-white/5 rounded-2xl p-4 opacity-50 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                            <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white/60 font-bold text-sm truncate">{task.title}</p>
                            <span className="text-[10px] font-bold text-white/30 uppercase">{task.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
        <AlertDialogContent className="bg-[#141414] border border-white/10 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Task?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              This will permanently delete "{taskToDelete?.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => taskToDelete && deleteTaskMutation.mutate(taskToDelete.id)}
              className="bg-red-500 text-white"
            >
              {deleteTaskMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Verify Info Dialog */}
      <AlertDialog open={showVerifyInfo} onOpenChange={setShowVerifyInfo}>
        <AlertDialogContent className="bg-[#141414] border border-white/10 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Channel Verification</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              The bot must be added as an admin to your channel for verification. This allows the system to confirm that your channel link is valid and accessible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowVerifyInfo(false)} className="bg-[#F5C542] text-black">Got it</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
