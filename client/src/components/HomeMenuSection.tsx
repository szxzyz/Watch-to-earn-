import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Receipt, Shield, Trophy, Users, Wifi, CalendarDays,
  ChevronRight, ArrowLeft, CheckCircle, XCircle, Clock, Loader2,
  Youtube, Instagram, Video, Link2, CheckSquare, Square, Plus, ScrollText, AlertCircle,
  BarChart3, Scale, Sparkles, Zap, TrendingUp, Activity, RefreshCw, Star,
  Moon, Sun, Crown,
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useAdmin } from "@/hooks/useAdmin";
import { useLocation } from "wouter";

type Overlay = "transactions" | "contest" | "legal" | "stats" | null;

const VIEW_RANGES = [
  { label: "100 – 999 Views", value: "100-999", reward: "100 sats" },
  { label: "1K – 4.9K Views", value: "1k-4.9k", reward: "250 sats" },
  { label: "5K – 9.9K Views", value: "5k-9.9k", reward: "500 sats" },
  { label: "10K – 49.9K Views", value: "10k-49.9k", reward: "1K sats" },
  { label: "50K – 99.9K Views", value: "50k-99.9k", reward: "5K sats" },
  { label: "100K – 499.9K Views", value: "100k-499.9k", reward: "10K sats" },
  { label: "500K – 999.9K Views", value: "500k-999.9k", reward: "25K sats" },
  { label: "1M+ Views", value: "1m+", reward: "100K sats" },
];

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString();
}

function fmtAge(days: number): string {
  if (days >= 30) return `${Math.floor(days / 30)}mo ${days % 30}d`;
  return `${days}d`;
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-[#141414] border border-white/5 hover:bg-white/5 active:scale-[0.98] transition-all"
    >
      <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <span className="flex-1 text-left text-white font-bold text-sm">{label}</span>
      <ChevronRight className="w-4 h-4 text-white/20" />
    </button>
  );
}

function StatCard({
  icon, label, value, accent, wide, live,
}: {
  icon: React.ReactNode; label: string; value: string; accent: string; wide?: boolean; live?: boolean;
}) {
  const accentMap: Record<string, string> = {
    blue: "border-blue-500/20 bg-blue-500/5",
    green: "border-green-500/20 bg-green-500/5",
    purple: "border-purple-500/20 bg-purple-500/5",
    yellow: "border-[#F5C542]/20 bg-[#F5C542]/5",
    cyan: "border-cyan-500/20 bg-cyan-500/5",
    orange: "border-orange-500/20 bg-orange-500/5",
    indigo: "border-indigo-500/20 bg-indigo-500/5",
    teal: "border-teal-500/20 bg-teal-500/5",
  };
  return (
    <div className={`rounded-2xl p-3 border ${accentMap[accent] || "border-white/5 bg-white/3"} ${wide ? "col-span-2" : ""}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        {live && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
      </div>
      <p className="text-white font-black text-base">{value}</p>
      <p className="text-white/40 text-[10px] mt-0.5">{label}</p>
    </div>
  );
}

function OverlayHeader({ title }: { title: string }) {
  return (
    <div className="px-5 py-4 border-b border-white/5 flex-shrink-0">
      <h2 className="text-white font-black text-base uppercase tracking-tight italic">{title}</h2>
    </div>
  );
}

function OverlayFooter({ onClose }: { onClose: () => void }) {
  return (
    <div className="px-5 py-4 border-t border-white/5 flex-shrink-0">
      <button
        onClick={onClose}
        className="w-full h-12 bg-[#141414] border border-white/8 rounded-2xl font-black uppercase tracking-wider text-white text-sm hover:bg-white/5 transition-all active:scale-[0.98]"
      >
        Back
      </button>
    </div>
  );
}

function ThemeMenuItem({ theme, setTheme }: { theme: string; setTheme: (t: string) => void }) {
  return (
    <div className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-[#141414] border border-white/5">
      <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
        {theme === "dark" ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-[#F5C542]" />}
      </div>
      <span className="flex-1 text-left text-white font-bold text-sm">Theme</span>
      <div className="flex items-center gap-1 bg-white/5 rounded-full p-1">
        <button
          onClick={() => setTheme("light")}
          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide transition-all ${
            theme === "light" ? "bg-[#F5C542] text-black" : "text-white/40"
          }`}
        >
          Light
        </button>
        <button
          onClick={() => setTheme("dark")}
          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide transition-all ${
            theme === "dark" ? "bg-white/15 text-white" : "text-white/40"
          }`}
        >
          Dark
        </button>
      </div>
    </div>
  );
}

export default function HomeMenuSection() {
  const { theme, setTheme } = useTheme();
  const { isAdmin } = useAdmin();
  const [, setLocation] = useLocation();
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [link, setLink] = useState("");
  const [selectedRange, setSelectedRange] = useState<string | null>(null);
  const [check1, setCheck1] = useState(false);
  const [check2, setCheck2] = useState(false);
  const [check3, setCheck3] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: txData, isLoading: txLoading } = useQuery<any>({
    queryKey: ["/api/withdrawals"],
    enabled: overlay === "transactions",
    retry: false,
  });

  const { data: projectStats } = useQuery<{
    totalUsers: number; onlineNow: number; totalWithdrawalsAmount: number;
    totalWithdrawalsCount: number; projectAgeDays: number; totalEarnings: number;
    todayEarnings: number; dau: number; wau: number; totalReferrals: number;
    uptimePct: number; retentionRate: number;
  }>({
    queryKey: ["/api/project/stats"],
    enabled: overlay === "stats",
    retry: false,
    staleTime: 30000,
  });

  const withdrawals = txData?.withdrawals || [];

  const contestMutation = useMutation({
    mutationFn: async (data: { link: string; viewsRange: string }) => {
      const res = await fetch("/api/contest/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Submission failed");
      }
      return res.json();
    },
    onSuccess: () => setSubmitted(true),
  });

  const canSubmit = link.trim() !== "" && selectedRange !== null && check1 && check2 && check3;

  const resetContest = () => {
    setLink(""); setSelectedRange(null);
    setCheck1(false); setCheck2(false); setCheck3(false);
    setSubmitted(false); setShowSubmitForm(false);
  };

  const getStatusIcon = (status: string) => {
    const s = status?.toLowerCase();
    if (s?.includes("approved") || s?.includes("success") || s?.includes("paid"))
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (s?.includes("reject") || s?.includes("failed"))
      return <XCircle className="w-4 h-4 text-red-400" />;
    return <Clock className="w-4 h-4 text-yellow-400" />;
  };

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (s?.includes("approved") || s?.includes("success") || s?.includes("paid")) return "text-green-400";
    if (s?.includes("reject") || s?.includes("failed")) return "text-red-400";
    return "text-yellow-400";
  };

  const slideIn = {
    initial: { x: "100%" },
    animate: { x: 0 },
    exit: { x: "100%" },
    transition: { type: "spring", damping: 26, stiffness: 220 },
  };

  return (
    <>
      <div className="space-y-1.5">
        <p className="text-white/30 text-[10px] font-black uppercase tracking-widest px-0.5 mb-2">Menu</p>
        <MenuItem
          icon={<BarChart3 className="w-5 h-5 text-blue-400" />}
          label="Project Statistics"
          onClick={() => setOverlay("stats")}
        />
        <MenuItem
          icon={<Sparkles className="w-5 h-5 text-[#F5C542]" />}
          label="Contest"
          onClick={() => setOverlay("contest")}
        />
        <MenuItem
          icon={<Receipt className="w-5 h-5 text-green-400" />}
          label="Transactions"
          onClick={() => setOverlay("transactions")}
        />
        <MenuItem
          icon={<Scale className="w-5 h-5 text-purple-400" />}
          label="Legal Info"
          onClick={() => setOverlay("legal")}
        />
        {isAdmin && (
          <MenuItem
            icon={<Crown className="w-5 h-5 text-amber-400" />}
            label="Admin Panel"
            onClick={() => setLocation("/admin")}
          />
        )}
        <ThemeMenuItem theme={theme} setTheme={setTheme} />
      </div>

      {/* ── Project Statistics Overlay ── */}
      <AnimatePresence>
        {overlay === "stats" && (
          <motion.div className="fixed inset-0 bg-[#0a0a0a] z-[300] flex flex-col" {...slideIn}>
            <OverlayHeader title="Project Statistics" />
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {!projectStats ? (
                <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 text-white/30 animate-spin" /></div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-2.5 px-1">Core</p>
                    <div className="grid grid-cols-2 gap-2.5">
                      <StatCard icon={<Users className="w-4 h-4 text-blue-400" />} label="Total Users" value={fmtNum(projectStats.totalUsers)} accent="blue" />
                      <StatCard icon={<Wifi className="w-4 h-4 text-green-400" />} label="Online Now" value={fmtNum(projectStats.onlineNow)} accent="green" live />
                      <StatCard icon={<CalendarDays className="w-4 h-4 text-purple-400" />} label="Project Age" value={fmtAge(projectStats.projectAgeDays)} accent="purple" />
                      <StatCard icon={<TrendingUp className="w-4 h-4 text-[#F5C542]" />} label="Earnings Distributed" value={`${fmtNum(projectStats.totalEarnings)} SAT`} accent="yellow" />
                      <StatCard icon={<Receipt className="w-4 h-4 text-cyan-400" />} label="Total Withdrawals" value={`${fmtNum(projectStats.totalWithdrawalsAmount)} SAT`} accent="cyan" wide />
                    </div>
                  </div>
                  <div>
                    <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-2.5 px-1">Advanced</p>
                    <div className="grid grid-cols-2 gap-2.5">
                      <StatCard icon={<Zap className="w-4 h-4 text-orange-400" />} label="Today Earnings" value={`${fmtNum(projectStats.todayEarnings)} SAT`} accent="orange" wide />
                      <StatCard icon={<Activity className="w-4 h-4 text-blue-300" />} label="Daily Active" value={fmtNum(projectStats.dau)} accent="blue" />
                      <StatCard icon={<Activity className="w-4 h-4 text-indigo-400" />} label="Weekly Active" value={fmtNum(projectStats.wau)} accent="indigo" />
                    </div>
                  </div>
                  <div>
                    <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-2.5 px-1">Pro</p>
                    <div className="grid grid-cols-2 gap-2.5">
                      <StatCard icon={<Users className="w-4 h-4 text-teal-400" />} label="Total Referrals" value={fmtNum(projectStats.totalReferrals)} accent="teal" />
                      <StatCard icon={<RefreshCw className="w-4 h-4 text-green-400" />} label="System Uptime" value={`${projectStats.uptimePct}%`} accent="green" />
                      <StatCard icon={<Star className="w-4 h-4 text-[#F5C542]" />} label="Retention Rate" value={`${projectStats.retentionRate}%`} accent="yellow" wide />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <OverlayFooter onClose={() => setOverlay(null)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Transactions Overlay ── */}
      <AnimatePresence>
        {overlay === "transactions" && (
          <motion.div className="fixed inset-0 bg-[#0a0a0a] z-[300] flex flex-col" {...slideIn}>
            <OverlayHeader title="Transactions" />
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              {txLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 text-white/30 animate-spin" /></div>
              ) : withdrawals.length === 0 ? (
                <div className="text-center py-12 text-white/30 text-sm font-bold uppercase tracking-widest">No transactions yet</div>
              ) : (
                withdrawals.map((w: any) => (
                  <div key={w.id} className="bg-[#141414] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(w.status)}
                      <div>
                        <p className="text-white text-xs font-black uppercase tracking-tight">{w.method || "Withdrawal"}</p>
                        <p className="text-white/40 text-[10px] mt-0.5">{w.createdAt ? format(new Date(w.createdAt), "dd MMM yyyy") : "—"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white text-sm font-black">{parseFloat(w.amount || "0").toLocaleString()} SAT</p>
                      <p className={`text-[10px] font-bold capitalize mt-0.5 ${getStatusColor(w.status)}`}>{w.status}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <OverlayFooter onClose={() => setOverlay(null)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Legal Info Overlay ── */}
      <AnimatePresence>
        {overlay === "legal" && (
          <motion.div className="fixed inset-0 bg-[#0a0a0a] z-[300] flex flex-col" {...slideIn}>
            <OverlayHeader title="Legal Info" />
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 text-xs text-white/50 leading-relaxed">
              <div className="bg-[#141414] border border-white/5 rounded-2xl p-4">
                <p className="text-white font-black text-sm mb-2 flex items-center gap-2"><ScrollText className="w-4 h-4 text-orange-400" /> Terms of Use</p>
                <p>By using this app, you agree to our terms. Rewards are in SAT (satoshis) and are subject to availability. Rewards may change at any time without prior notice.</p>
              </div>
              <div className="bg-[#141414] border border-white/5 rounded-2xl p-4">
                <p className="text-white font-black text-sm mb-2 flex items-center gap-2"><Shield className="w-4 h-4 text-purple-400" /> Privacy Policy</p>
                <p>We collect only your Telegram user data (name, username, ID) to identify your account. We do not share your data with third parties. Your data is securely stored and used solely to operate the app.</p>
              </div>
              <div className="bg-[#141414] border border-white/5 rounded-2xl p-4">
                <p className="text-white font-black text-sm mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-400" /> Disclaimer</p>
                <p>This app is not affiliated with Telegram. Withdrawals are subject to minimum balance requirements and admin review.</p>
              </div>
            </div>
            <OverlayFooter onClose={() => setOverlay(null)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Contest Overlay ── */}
      <AnimatePresence>
        {overlay === "contest" && (
          <motion.div className="fixed inset-0 bg-[#0a0a0a] z-[300] flex flex-col" {...slideIn}>
            <OverlayHeader title="Contest" />
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {!showSubmitForm ? (
                <>
                  <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#F5C542]/20 via-[#F5C542]/5 to-transparent border border-[#F5C542]/20 p-4 mb-3">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#F5C542]/10 rounded-full blur-2xl" />
                    <div className="relative z-10">
                      <div className="w-9 h-9 rounded-xl bg-[#F5C542]/20 border border-[#F5C542]/30 flex items-center justify-center mb-2.5">
                        <Sparkles className="w-4 h-4 text-[#F5C542]" />
                      </div>
                      <p className="text-white font-black text-sm leading-snug">
                        Tell others about Lightning Sats, and get up to{" "}
                        <span className="text-[#F5C542]">10,000,000 sats</span> for each video.
                      </p>
                    </div>
                  </div>
                  <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-2 px-0.5">Rules</p>
                  <div className="space-y-2 mb-3">
                    {[
                      {
                        n: "1", title: "Create Content", desc: "Make a fun video about Lightning Sats and post it on:",
                        extra: (
                          <div className="flex gap-1.5 flex-wrap mt-1.5">
                            <div className="flex items-center gap-1 bg-red-500/10 border border-red-500/20 rounded-lg px-2 py-1">
                              <Youtube className="w-3 h-3 text-red-400" /><span className="text-red-400 text-[10px] font-bold">YouTube Shorts</span>
                            </div>
                            <div className="flex items-center gap-1 bg-pink-500/10 border border-pink-500/20 rounded-lg px-2 py-1">
                              <Instagram className="w-3 h-3 text-pink-400" /><span className="text-pink-400 text-[10px] font-bold">Instagram Reels</span>
                            </div>
                            <div className="flex items-center gap-1 bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-2 py-1">
                              <Video className="w-3 h-3 text-cyan-400" /><span className="text-cyan-400 text-[10px] font-bold">TikTok</span>
                            </div>
                          </div>
                        )
                      },
                      { n: "2", title: "Include Your Invite Link", desc: "Attach your ID or Invite Link in the video description." },
                      { n: "3", title: "Send the Link", desc: "Once your video reaches 100+ views, send us the link." },
                      { n: "4", title: "Earn Rewards", desc: "The more views, the bigger the reward. Up to", highlight: "10,000,000 Sats" },
                    ].map((rule) => (
                      <div key={rule.n} className="bg-[#141414] border border-white/5 rounded-2xl p-3">
                        <div className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#F5C542]/20 flex items-center justify-center text-[#F5C542] font-black text-[10px] flex-shrink-0">{rule.n}</span>
                          <div>
                            <p className="text-white font-bold text-xs">{rule.title}</p>
                            <p className="text-white/50 text-[11px] leading-relaxed mt-0.5">
                              {rule.desc}{(rule as any).highlight && <> <span className="text-[#F5C542] font-bold">{(rule as any).highlight}</span> per video.</>}
                            </p>
                            {(rule as any).extra}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowSubmitForm(true)}
                    className="w-full flex items-center justify-center gap-2 bg-[#F5C542] hover:bg-[#F5C542]/90 text-black font-black text-sm rounded-2xl py-3.5 transition-all active:scale-[0.98] mb-3"
                  >
                    <Plus className="w-4 h-4" />Add Content and Earn
                  </button>
                </>
              ) : submitted ? (
                <div className="flex flex-col items-center gap-4 text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                    <Trophy className="w-8 h-8 text-green-400" />
                  </div>
                  <div>
                    <p className="text-white font-black text-base">Submitted!</p>
                    <p className="text-white/50 text-xs mt-1 leading-relaxed">Your submission has been sent for review. You'll be notified once verified.</p>
                  </div>
                  <button onClick={() => { resetContest(); setOverlay(null); }} className="bg-[#F5C542] text-black font-black text-sm rounded-2xl px-8 py-3">Done</button>
                </div>
              ) : (
                <>
                  <button onClick={resetContest} className="flex items-center gap-1.5 text-white/40 text-xs hover:text-white/60 transition-colors mb-3">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <div className="mb-3">
                    <label className="text-white/40 text-[10px] font-semibold uppercase tracking-wide block mb-1.5">Link to your content</label>
                    <input
                      type="url" value={link} onChange={(e) => setLink(e.target.value)}
                      placeholder="Paste your video link here"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#F5C542]/40 transition-colors"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="text-white/40 text-[10px] font-semibold uppercase tracking-wide block mb-1.5">Number of Views</label>
                    <div className="space-y-1.5">
                      {VIEW_RANGES.map((r) => (
                        <button key={r.value} onClick={() => setSelectedRange(r.value)}
                          className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 border transition-all ${selectedRange === r.value ? "bg-[#F5C542]/10 border-[#F5C542]/40" : "bg-white/5 border-white/5"}`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selectedRange === r.value ? "border-[#F5C542] bg-[#F5C542]" : "border-white/30"}`}>
                              {selectedRange === r.value && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                            </div>
                            <span className="text-white/80 text-xs">{r.label}</span>
                          </div>
                          <span className="text-[#F5C542] font-bold text-xs">{r.reward}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2.5 mb-3">
                    <label className="text-white/40 text-[10px] font-semibold uppercase tracking-wide block">Confirmation</label>
                    {[
                      { state: check1, set: setCheck1, label: "I confirm that the number of views is correct" },
                      { state: check2, set: setCheck2, label: "My invite link or my ID is indicated under the video" },
                      { state: check3, set: setCheck3, label: "I understand that providing incorrect data may restrict my access" },
                    ].map((item, i) => (
                      <button key={i} onClick={() => item.set(!item.state)} className="w-full flex items-start gap-2.5 text-left">
                        {item.state
                          ? <CheckSquare className="w-4 h-4 text-[#F5C542] flex-shrink-0 mt-0.5" />
                          : <Square className="w-4 h-4 text-white/20 flex-shrink-0 mt-0.5" />}
                        <span className="text-white/60 text-xs leading-relaxed">{item.label}</span>
                      </button>
                    ))}
                  </div>
                  <button
                    disabled={!canSubmit || contestMutation.isPending}
                    onClick={() => contestMutation.mutate({ link: link.trim(), viewsRange: selectedRange! })}
                    className="w-full flex items-center justify-center gap-2 bg-[#F5C542] hover:bg-[#F5C542]/90 disabled:opacity-40 text-black font-black text-sm rounded-2xl py-3.5 transition-all active:scale-[0.98]"
                  >
                    {contestMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit"}
                  </button>
                </>
              )}
            </div>
            <OverlayFooter onClose={() => { setOverlay(null); resetContest(); }} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
