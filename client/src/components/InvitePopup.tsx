import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, Share2, Users, Zap, CheckCircle, XCircle, Loader2, UserPlus, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showNotification } from "@/components/AppNotification";
import { motion, AnimatePresence } from "framer-motion";

interface ReferralItem {
  refereeId: string;
  name: string;
  username?: string;
  totalSatsEarned: number;
  referralStatus: string;
  channelMember: boolean;
  groupMember: boolean;
  isActive: boolean;
  miningBoost: number;
}

interface InvitePopupProps {
  onClose: () => void;
}

export default function InvitePopup({ onClose }: InvitePopupProps) {
  const [isSharing, setIsSharing] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery<any>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 60000,
  });

  const { data: referralData, isLoading: referralsLoading } = useQuery<{ referrals: ReferralItem[] }>({
    queryKey: ["/api/referrals/list"],
    retry: false,
    staleTime: 30000,
  });

  const syncBoostsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/referrals/sync-boosts", {
        method: "POST",
        credentials: "include",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referrals/list"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  // Auto-sync boosts when popup opens
  useEffect(() => {
    syncBoostsMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const botUsername =
    (import.meta.env.VITE_BOT_USERNAME as string) || "MoneyAdzbot";
  const referralLink = user?.referralCode
    ? `https://t.me/${botUsername}?start=${user.referralCode}`
    : "";

  const referrals = referralData?.referrals || [];
  const activeReferrals = referrals.filter((r) => r.isActive);
  const totalBoost = activeReferrals.length * 0.1;

  const copyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    showNotification("Link copied!", "success");
  };

  const shareLink = async () => {
    if (!referralLink || isSharing) return;
    setIsSharing(true);
    try {
      const tgWebApp = (window as any).Telegram?.WebApp;
      const shareTitle = "💵 Earn SAT by completing tasks and watching ads.";
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareTitle)}`;
      if (tgWebApp?.openTelegramLink) {
        tgWebApp.openTelegramLink(shareUrl);
      } else {
        window.open(shareUrl, "_blank");
      }
    } catch {}
    setIsSharing(false);
  };

  const membershipLabel = (r: ReferralItem) => {
    if (r.channelMember && r.groupMember) return null;
    if (!r.channelMember && !r.groupMember) return "Left channel & group";
    if (!r.channelMember) return "Left channel";
    return "Left group";
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] flex items-end justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Popup sheet */}
        <motion.div
          className="relative w-full max-w-md bg-[#0f0f0f] border border-white/10 rounded-t-2xl overflow-hidden"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          style={{ maxHeight: "90vh", overflowY: "auto" }}
        >
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          {/* Header */}
          <div className="flex items-center px-5 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-400" />
              <h2 className="text-white font-bold text-base">Invite Friends</h2>
            </div>
          </div>

          <div className="px-5 py-4 space-y-4">
            {/* How it works */}
            <div className="space-y-2">
              <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">How It Works</p>
              <div className="flex items-start gap-3 bg-white/5 rounded-xl p-3">
                <Link2 className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white text-xs font-bold">Share your link</p>
                  <p className="text-white/50 text-xs mt-0.5">Send your unique invite link to friends.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-white/5 rounded-xl p-3">
                <Users className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white text-xs font-bold">Friend joins &amp; stays active</p>
                  <p className="text-white/50 text-xs mt-0.5">They must join the channel and group to count.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-white/5 rounded-xl p-3">
                <Zap className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white text-xs font-bold">You earn +0.1 SAT/h per friend</p>
                  <p className="text-white/50 text-xs mt-0.5">More friends = faster mining, up to 100/h Sats.</p>
                </div>
              </div>
            </div>

            {/* Current boost */}
            {activeReferrals.length > 0 && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
                <Zap className="w-5 h-5 text-green-400 flex-shrink-0" />
                <div>
                  <p className="text-green-400 font-bold text-sm">
                    Active Boost: +{totalBoost.toFixed(1)}/h
                  </p>
                  <p className="text-white/50 text-xs">
                    {activeReferrals.length} active friend
                    {activeReferrals.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            )}

            {/* Invite link */}
            <div>
              <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">
                Your Invite Link
              </p>
              <div className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white/70 font-mono mb-2 break-all">
                {referralLink || "Loading..."}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={copyLink}
                  disabled={!referralLink}
                  className="h-10 bg-white/10 hover:bg-white/15 text-white border-0 text-xs font-semibold"
                  variant="ghost"
                >
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  Copy Link
                </Button>
                <Button
                  onClick={shareLink}
                  disabled={!referralLink || isSharing}
                  className="h-10 bg-blue-600 hover:bg-blue-500 text-white border-0 text-xs font-semibold"
                >
                  {isSharing ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Share2 className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  {isSharing ? "Sharing..." : "Share"}
                </Button>
              </div>
            </div>

            {/* Referral list */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-white/50 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  Your Friends ({referrals.length})
                </p>
                {referrals.length > 0 && (
                  <button
                    onClick={() => syncBoostsMutation.mutate()}
                    disabled={syncBoostsMutation.isPending}
                    className="text-blue-400 text-xs hover:text-blue-300 transition-colors flex items-center gap-1"
                  >
                    {syncBoostsMutation.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      "Refresh"
                    )}
                  </button>
                )}
              </div>

              {referralsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                </div>
              ) : referrals.length === 0 ? (
                <div className="text-center py-6 text-white/30 text-sm">
                  No friends invited yet.
                  <br />
                  <span className="text-xs">
                    Share your link to start boosting!
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  {referrals.map((r, i) => {
                    const label = membershipLabel(r);
                    return (
                      <div
                        key={i}
                        className={`rounded-xl px-3.5 py-3 border ${
                          r.isActive
                            ? "bg-green-500/5 border-green-500/20"
                            : "bg-white/5 border-white/10"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-white text-sm font-semibold truncate">
                                {r.name}
                              </span>
                              {r.isActive ? (
                                <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-red-400/70 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-white/40 text-xs mt-0.5">
                              ID: {r.refereeId}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-yellow-400 text-xs font-bold">
                              {r.totalSatsEarned.toLocaleString()} SAT
                            </p>
                            {r.isActive && (
                              <p className="text-green-400 text-xs font-semibold">
                                +0.1/h
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              r.isActive
                                ? "bg-green-500/20 text-green-400"
                                : r.referralStatus === "completed"
                                ? "bg-red-500/20 text-red-400"
                                : "bg-yellow-500/20 text-yellow-400"
                            }`}
                          >
                            {r.isActive
                              ? "Active"
                              : r.referralStatus === "pending"
                              ? "Pending"
                              : "Inactive"}
                          </span>
                          {label && (
                            <span className="text-[10px] text-red-400/70">
                              ({label})
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Bottom padding for safe area */}
          <div className="h-6" />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
