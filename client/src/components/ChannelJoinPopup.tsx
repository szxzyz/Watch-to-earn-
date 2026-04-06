import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Send, Users, Check, Loader2, ArrowRight } from "lucide-react";

interface MembershipStatus {
  channelMember: boolean;
  groupMember: boolean;
  channelUrl: string;
  groupUrl: string;
  channelName: string;
  groupName: string;
}

interface ChannelJoinPopupProps {
  telegramId: string;
  onVerified: () => void;
}

export default function ChannelJoinPopup({ telegramId, onVerified }: ChannelJoinPopupProps) {
  const queryClient = useQueryClient();
  const [isChecking, setIsChecking] = useState(false);
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  const checkMembership = async (isInitialCheck = false) => {
    if (isChecking) return;

    setIsChecking(true);
    setError(null);

    try {
      const headers: Record<string, string> = {};
      const tg = window.Telegram?.WebApp;
      if (tg?.initData) {
        headers['x-telegram-data'] = tg.initData;
      }

      const response = await fetch(`/api/check-membership?t=${Date.now()}`, { headers });
      const data = await response.json();

      if (data.success && data.isVerified) {
        onVerified();
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        return;
      }

      if (data.success) {
        setMembershipStatus({
          channelMember: data.channelMember || false,
          groupMember: data.groupMember || false,
          channelUrl: data.channelUrl || "https://t.me/LightningSatoshi",
          groupUrl: data.groupUrl || "https://t.me/LightningSatoshiCommunity",
          channelName: data.channelName || "Channel",
          groupName: data.groupName || "Group",
        });

        if (!isInitialCheck) {
          if (!data.channelMember && !data.groupMember) {
            setError("Please join both the channel and the group first.");
          } else if (!data.channelMember) {
            setError("Please join the channel first.");
          } else if (!data.groupMember) {
            setError("Please join the group first.");
          }
        }
      } else if (!isInitialCheck) {
        setError(data.message || "Failed to verify membership.");
      }
    } catch (err) {
      console.error("Membership check error:", err);
      if (!isInitialCheck) {
        setError("Failed to check membership. Please try again.");
      }
    } finally {
      setIsChecking(false);
      setHasInitialized(true);
    }
  };

  useEffect(() => {
    if (!hasInitialized) {
      checkMembership(true);
    }
  }, [telegramId, hasInitialized]);

  const openLink = (url: string) => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(url);
    } else {
      window.open(url, "_blank");
    }
  };

  const allJoined = membershipStatus?.channelMember && membershipStatus?.groupMember;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0a0a0a] flex items-center justify-center p-5">
      <div className="w-full max-w-sm">

        {/* Icon */}
        <div className="w-14 h-14 flex items-center justify-center mx-auto mb-5">
          <img
            src="/btc-icon.jpg"
            alt="Bitcoin"
            className="w-14 h-14 rounded-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>

        <h1 className="text-white font-black text-xl text-center mb-2 tracking-tight">
          Join to Continue
        </h1>
        <p className="text-white/40 text-sm text-center mb-7 leading-relaxed">
          Join our channel and group to access the app and start earning
        </p>

        {error && (
          <div className="mb-4 py-2.5 px-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
            <p className="text-red-400 text-xs text-center font-semibold">{error}</p>
          </div>
        )}

        <div className="space-y-2.5 mb-5">
          {/* Channel */}
          <button
            onClick={() => openLink(membershipStatus?.channelUrl || "https://t.me/LightningSatoshi")}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all active:scale-[0.98] ${
              membershipStatus?.channelMember
                ? "bg-green-500/5 border-green-500/20"
                : "bg-[#141414] border-white/8 hover:border-white/15"
            }`}
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
              membershipStatus?.channelMember
                ? "bg-green-500/15 border border-green-500/20"
                : "bg-white/5 border border-white/8"
            }`}>
              <Send className={`w-5 h-5 ${membershipStatus?.channelMember ? "text-green-400" : "text-white/50"}`} strokeWidth={1.5} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-white font-bold text-sm">Main Channel</p>
              <p className="text-white/35 text-[11px] mt-0.5">News & announcements</p>
            </div>
            <div className="flex-shrink-0">
              {membershipStatus?.channelMember ? (
                <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-green-400" strokeWidth={2.5} />
                </div>
              ) : (
                <span className="text-yellow-400 text-[11px] font-black tracking-widest uppercase bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 rounded-xl">
                  JOIN
                </span>
              )}
            </div>
          </button>

          {/* Group */}
          <button
            onClick={() => openLink(membershipStatus?.groupUrl || "https://t.me/LightningSatoshiCommunity")}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all active:scale-[0.98] ${
              membershipStatus?.groupMember
                ? "bg-green-500/5 border-green-500/20"
                : "bg-[#141414] border-white/8 hover:border-white/15"
            }`}
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
              membershipStatus?.groupMember
                ? "bg-green-500/15 border border-green-500/20"
                : "bg-white/5 border border-white/8"
            }`}>
              <Users className={`w-5 h-5 ${membershipStatus?.groupMember ? "text-green-400" : "text-white/50"}`} strokeWidth={1.5} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-white font-bold text-sm">Community Group</p>
              <p className="text-white/35 text-[11px] mt-0.5">Chat with miners</p>
            </div>
            <div className="flex-shrink-0">
              {membershipStatus?.groupMember ? (
                <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-green-400" strokeWidth={2.5} />
                </div>
              ) : (
                <span className="text-yellow-400 text-[11px] font-black tracking-widest uppercase bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 rounded-xl">
                  JOIN
                </span>
              )}
            </div>
          </button>
        </div>

        <button
          onClick={() => checkMembership(false)}
          disabled={isChecking}
          className="w-full h-12 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          style={{
            background: allJoined
              ? 'linear-gradient(135deg, #F5C542 0%, #d4920a 100%)'
              : 'rgba(255,255,255,0.07)',
            color: allJoined ? '#000' : 'rgba(255,255,255,0.5)',
            border: allJoined ? 'none' : '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {isChecking ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : allJoined ? (
            <>Continue <ArrowRight className="w-4 h-4" /></>
          ) : (
            "I've Joined — Verify"
          )}
        </button>

      </div>
    </div>
  );
}
