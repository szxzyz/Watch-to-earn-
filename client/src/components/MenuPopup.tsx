import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Receipt, Shield, Trophy, Users, Wifi, TrendingDown, CalendarDays, Crown,
  ChevronRight, ArrowLeft, CheckCircle, XCircle, Clock, Loader2,
  Youtube, Instagram, Video, Link2, CheckSquare, Square, Plus, ScrollText, AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";

interface MenuPopupProps {
  onClose: () => void;
}

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

export default function MenuPopup({ onClose }: MenuPopupProps) {
  const { user } = useAuth();
  const photoUrl = typeof window !== "undefined" && (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.photo_url;
  const name = (user as any)?.firstName ? `${(user as any).firstName}${(user as any).lastName ? " " + (user as any).lastName : ""}` : (user as any)?.username || "User";
  const uid = (user as any)?.referralCode || (user as any)?.id?.slice(0, 8) || "—";
  const memberSince = (user as any)?.createdAt ? new Date((user as any).createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null;

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
    totalUsers: number;
    onlineNow: number;
    totalWithdrawals: number;
    projectAgeDays: number;
    membership: string;
    userJoinedDate: string | null;
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
      {/* ── Bottom Sheet ── */}
      <AnimatePresence>
        <motion.div
          className="fixed inset-0 z-[200] flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            className="relative w-full max-w-md bg-[#0f0f0f] border border-white/10 rounded-t-2xl overflow-hidden"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            style={{ maxHeight: "75vh", overflowY: "auto" }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Profile Info */}
            <div className="px-5 pt-3 pb-4 flex items-center gap-3 border-b border-white/5">
              <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border border-white/10">
                {photoUrl ? (
                  <img src={photoUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#F5C542] to-[#d4920a] flex items-center justify-center text-black font-black text-lg">
                    {name[0]?.toUpperCase() || "U"}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-white font-black text-sm leading-none truncate">{name}</p>
                <p className="text-white/40 text-[11px] mt-1">ID: <span className="text-[#F5C542] font-bold">{uid}</span></p>
                {memberSince && (
                  <p className="text-white/30 text-[10px] mt-0.5">Member since {memberSince}</p>
                )}
              </div>
            </div>

            <div className="px-4 py-4 space-y-1.5">
              {/* Project Statistics */}
              <MenuItem
                icon={<Users className="w-4 h-4 text-blue-400" />}
                iconBg="bg-blue-500/10"
                label="Project Statistics"
                onClick={() => setOverlay("stats")}
              />

              {/* Contest */}
              <MenuItem
                icon={<Trophy className="w-4 h-4 text-[#F5C542]" />}
                iconBg="bg-yellow-500/10"
                label="Contest"
                onClick={() => setOverlay("contest")}
              />

              {/* Transactions */}
              <MenuItem
                icon={<Receipt className="w-4 h-4 text-green-400" />}
                iconBg="bg-green-500/10"
                label="Transactions"
                onClick={() => setOverlay("transactions")}
              />

              {/* Legal Info */}
              <MenuItem
                icon={<Shield className="w-4 h-4 text-purple-400" />}
                iconBg="bg-purple-500/10"
                label="Legal Info"
                onClick={() => setOverlay("legal")}
              />
            </div>

            <div className="h-4" />
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* ── Project Statistics Overlay ── */}
      <AnimatePresence>
        {overlay === "stats" && (
          <motion.div className="fixed inset-0 bg-[#0a0a0a] z-[300] flex flex-col" {...slideIn}>
            <OverlayHeader title="Project Statistics" />
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {!projectStats ? (
                <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 text-white/30 animate-spin" /></div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <StatCard icon={<Users className="w-5 h-5 text-blue-400" />} bg="bg-blue-500/10" label="Users" value={projectStats.totalUsers.toLocaleString()} />
                  <StatCard icon={<Wifi className="w-5 h-5 text-green-400" />} bg="bg-green-500/10" label="Online Now" value={projectStats.onlineNow.toLocaleString()} />
                  <StatCard icon={<TrendingDown className="w-5 h-5 text-yellow-400" />} bg="bg-yellow-500/10" label="Withdrawals" value={`${Math.floor(projectStats.totalWithdrawals).toLocaleString()} SAT`} />
                  <StatCard icon={<CalendarDays className="w-5 h-5 text-purple-400" />} bg="bg-purple-500/10" label="App Age" value={`${projectStats.projectAgeDays} days`} />
                  <StatCard icon={<Crown className="w-5 h-5 text-[#F5C542]" />} bg="bg-yellow-500/10" label="Membership" value={projectStats.membership || "Free"} wide />
                  {projectStats.userJoinedDate && (
                    <StatCard icon={<CalendarDays className="w-5 h-5 text-cyan-400" />} bg="bg-cyan-500/10" label="You Joined"
                      value={new Date(projectStats.userJoinedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      wide
                    />
                  )}
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
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {!showSubmitForm ? (
                <>
                  {/* Hero */}
                  <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#F5C542]/20 via-[#F5C542]/5 to-transparent border border-[#F5C542]/20 p-4">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#F5C542]/10 rounded-full blur-2xl" />
                    <div className="relative z-10">
                      <div className="w-10 h-10 rounded-xl bg-[#F5C542]/20 border border-[#F5C542]/30 flex items-center justify-center mb-3">
                        <Trophy className="w-5 h-5 text-[#F5C542]" />
                      </div>
                      <p className="text-white font-black text-sm leading-snug">
                        Tell others about Lightning Sats, and get up to{" "}
                        <span className="text-[#F5C542]">10,000,000 sats</span> for each video.
                      </p>
                    </div>
                  </div>

                  {/* Rules */}
                  <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Rules</p>
                  <div className="space-y-2">
                    <div className="bg-[#141414] border border-white/5 rounded-2xl p-3.5">
                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#F5C542]/20 flex items-center justify-center text-[#F5C542] font-black text-[10px] flex-shrink-0">1</span>
                        <div>
                          <p className="text-white font-bold text-xs">Create Content</p>
                          <p className="text-white/50 text-[11px] leading-relaxed mt-1">Make a fun video about Lightning Sats and post it on:</p>
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
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#141414] border border-white/5 rounded-2xl p-3.5">
                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#F5C542]/20 flex items-center justify-center text-[#F5C542] font-black text-[10px] flex-shrink-0">2</span>
                        <div>
                          <p className="text-white font-bold text-xs">Include Your Invite Link</p>
                          <p className="text-white/50 text-[11px] leading-relaxed mt-1">Attach your ID or Invite Link in the video description.</p>
                          <p className="text-[#F5C542]/70 text-[10px] mt-1 flex items-center gap-1"><Link2 className="w-2.5 h-2.5" />Get Your Invite Link in the Friends Section</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#141414] border border-white/5 rounded-2xl p-3.5">
                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#F5C542]/20 flex items-center justify-center text-[#F5C542] font-black text-[10px] flex-shrink-0">3</span>
                        <div>
                          <p className="text-white font-bold text-xs">Send the Link</p>
                          <p className="text-white/50 text-[11px] leading-relaxed mt-1">Once your video reaches 100+ views, send us the link.</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#141414] border border-white/5 rounded-2xl p-3.5">
                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#F5C542]/20 flex items-center justify-center text-[#F5C542] font-black text-[10px] flex-shrink-0">4</span>
                        <div>
                          <p className="text-white font-bold text-xs">Earn Rewards</p>
                          <p className="text-white/50 text-[11px] leading-relaxed mt-1">The more views, the bigger the reward. Up to <span className="text-[#F5C542] font-bold">10,000,000 Sats</span> per video.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowSubmitForm(true)}
                    className="w-full flex items-center justify-center gap-2 bg-[#F5C542] hover:bg-[#F5C542]/90 text-black font-black text-sm rounded-2xl py-3.5 transition-all active:scale-[0.98]"
                  >
                    <Plus className="w-4 h-4" />Add Content and Earn
                  </button>
                  <div className="h-2" />
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
                  <button onClick={resetContest} className="flex items-center gap-1.5 text-white/40 text-xs hover:text-white/60 transition-colors">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>

                  <div>
                    <label className="text-white/40 text-[10px] font-semibold uppercase tracking-wide block mb-1.5">Link to your content</label>
                    <input
                      type="url" value={link} onChange={(e) => setLink(e.target.value)}
                      placeholder="Paste your video link here"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#F5C542]/40 transition-colors"
                    />
                  </div>

                  <div>
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

                  <div className="space-y-2.5">
                    <label className="text-white/40 text-[10px] font-semibold uppercase tracking-wide block">Confirmation</label>
                    {[
                      { state: check1, set: setCheck1, label: "I confirm that the number of views is correct" },
                      { state: check2, set: setCheck2, label: "My invite link or my ID is indicated under the video" },
                      { state: check3, set: setCheck3, label: "I understand that providing incorrect data may restrict my access" },
                    ].map((item, i) => (
                      <button key={i} onClick={() => item.set(!item.state)} className="w-full flex items-start gap-2.5 text-left">
                        <div className="flex-shrink-0 mt-0.5">
                          {item.state
                            ? <CheckSquare style={{ width: 18, height: 18 }} className="text-[#F5C542]" />
                            : <Square style={{ width: 18, height: 18 }} className="text-white/30" />}
                        </div>
                        <span className="text-white/60 text-xs leading-relaxed">{item.label}</span>
                      </button>
                    ))}
                  </div>

                  {contestMutation.isError && (
                    <p className="text-red-400 text-xs text-center">{(contestMutation.error as Error).message}</p>
                  )}

                  <button
                    onClick={() => canSubmit && contestMutation.mutate({ link: link.trim(), viewsRange: selectedRange! })}
                    disabled={!canSubmit || contestMutation.isPending}
                    className={`w-full py-3.5 rounded-2xl font-black text-sm transition-all ${canSubmit && !contestMutation.isPending ? "bg-[#F5C542] text-black hover:bg-[#F5C542]/90 active:scale-[0.98]" : "bg-white/10 text-white/30 cursor-not-allowed"}`}
                  >
                    {contestMutation.isPending ? "Submitting..." : "Submit"}
                  </button>
                  <div className="h-2" />
                </>
              )}
            </div>
            {!showSubmitForm && !submitted && <OverlayFooter onClose={() => { resetContest(); setOverlay(null); }} />}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function MenuItem({ icon, iconBg, label, onClick }: { icon: React.ReactNode; iconBg: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-[#141414] border border-white/5 rounded-2xl px-4 py-3.5 flex items-center justify-between hover:bg-white/[0.04] transition-all active:scale-[0.98]"
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-xl ${iconBg} flex items-center justify-center`}>{icon}</div>
        <span className="text-white font-bold text-sm">{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-white/20" />
    </button>
  );
}

function StatCard({ icon, bg, label, value, wide }: { icon: React.ReactNode; bg: string; label: string; value: string; wide?: boolean }) {
  return (
    <div className={`bg-[#141414] border border-white/5 rounded-2xl p-4 flex items-center gap-3 ${wide ? "col-span-2" : ""}`}>
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest">{label}</p>
        <p className="text-white font-black text-sm leading-tight truncate">{value}</p>
      </div>
    </div>
  );
}

function OverlayHeader({ title }: { title: string }) {
  return (
    <div className="px-5 py-4 border-b border-white/5">
      <h2 className="text-white font-black text-base uppercase tracking-tight italic">{title}</h2>
    </div>
  );
}

function OverlayFooter({ onClose }: { onClose: () => void }) {
  return (
    <div className="px-5 py-4 border-t border-white/5">
      <button
        onClick={onClose}
        className="w-full h-12 bg-[#141414] border border-white/8 rounded-2xl font-black uppercase tracking-wider text-white text-sm hover:bg-white/5 transition-all active:scale-[0.98]"
      >
        Back
      </button>
    </div>
  );
}
