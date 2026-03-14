import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface MembershipStatus {
  channelMember: boolean;
  channelUrl: string;
  channelName: string;
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
          channelUrl: data.channelUrl || "https://t.me/LightningSatoshi",
          channelName: data.channelName || "Channel",
        });
        
        if (!data.channelMember) {
          if (!isInitialCheck) {
            setError("Please join the channel first!");
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

  const handleContinue = () => {
    checkMembership(false);
  };

  const allJoined = membershipStatus?.channelMember;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-5">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl overflow-hidden">
            <img src="/btc-icon.jpg" alt="Bitcoin" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-white font-bold text-xl tracking-tight mb-1">Join to Continue</h1>
          <p className="text-white/40 text-sm">Join our channel to access the app</p>
        </div>

        {error && (
          <div className="mb-4 py-2.5 px-3.5 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-red-400 text-xs text-center">{error}</p>
          </div>
        )}

        <div className="space-y-2.5 mb-6">
          {/* Channel Join Button */}
          <button
            onClick={() => openLink(membershipStatus?.channelUrl || "https://t.me/LightningSatoshi")}
            className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
              membershipStatus?.channelMember
                ? "bg-[#F5C542]/10 border-[#F5C542]/30"
                : "bg-white/5 border-white/8 hover:border-white/20 active:scale-[0.98]"
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                membershipStatus?.channelMember ? "bg-[#F5C542]/15" : "bg-white/8"
              }`}>
                <svg className={`w-5 h-5 ${membershipStatus?.channelMember ? "text-[#F5C542]" : "text-white/60"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
              </div>
              <div className="text-left">
                <p className={`font-semibold text-sm ${membershipStatus?.channelMember ? "text-white" : "text-white/80"}`}>
                  Join Channel
                </p>
                <p className="text-white/30 text-[10px] mt-0.5">Required to access the app</p>
              </div>
            </div>
            {membershipStatus?.channelMember ? (
              <div className="w-6 h-6 rounded-full bg-[#F5C542]/20 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-[#F5C542]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <span className="text-[#F5C542] text-[10px] font-black tracking-widest uppercase bg-[#F5C542]/10 px-2.5 py-1 rounded-lg">JOIN</span>
            )}
          </button>
        </div>

        <button
          onClick={handleContinue}
          disabled={isChecking}
          className="w-full py-3.5 px-4 bg-[#F5C542] text-black font-black rounded-2xl transition-all hover:bg-[#F5C542]/90 disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase tracking-widest active:scale-[0.98]"
        >
          {isChecking ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Checking...
            </span>
          ) : allJoined ? (
            "Continue"
          ) : (
            "I've Joined"
          )}
        </button>
      </div>
    </div>
  );
}
