import { AlertTriangle, ShieldOff, Unlock } from "lucide-react";
import { useState, useEffect } from "react";

interface BanScreenProps {
  reason?: string;
  banType?: string;
  adminBanReason?: string;
}

export default function BanScreen({ reason, banType, adminBanReason }: BanScreenProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isUnbanning, setIsUnbanning] = useState(false);
  const [unbanError, setUnbanError] = useState<string | null>(null);
  const [unbanSuccess, setUnbanSuccess] = useState(false);

  const isAdminBan = banType === "admin";

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg?.initData && tg?.initDataUnsafe?.user?.id) {
      const userId = tg.initDataUnsafe.user.id.toString();
      const adminId = import.meta.env.VITE_TELEGRAM_ADMIN_ID;
      setIsAdmin(userId === adminId);
    }
  }, []);

  const handleContactSupport = () => {
    window.open('https://t.me/szxzyz', '_blank');
  };

  const handleSelfUnban = async () => {
    setIsUnbanning(true);
    setUnbanError(null);
    try {
      const tg = window.Telegram?.WebApp;
      const initData = tg?.initData;
      if (!initData) {
        setUnbanError("Telegram WebApp not available");
        return;
      }
      const response = await fetch('/api/admin/self-unban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData }),
      });
      const data = await response.json();
      if (data.success) {
        setUnbanSuccess(true);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setUnbanError(data.message || "Failed to unban");
      }
    } catch {
      setUnbanError("Network error. Please try again.");
    } finally {
      setIsUnbanning(false);
    }
  };

  if (isAdminBan) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0a0a]">
        <div className="max-w-sm w-full">
          <div className="bg-[#111] border border-white/8 rounded-2xl p-8 shadow-2xl flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center border-2 border-orange-500/30">
              <ShieldOff className="w-10 h-10 text-orange-400" />
            </div>

            <div className="space-y-3">
              <h1 className="text-xl font-black text-white tracking-tight">
                Account Disabled
              </h1>
              <p className="text-gray-400 text-sm leading-relaxed">
                Your account has been disabled by admin.
              </p>

              {(adminBanReason || reason) && (
                <div className="mt-2 p-3 bg-orange-500/5 border border-orange-500/20 rounded-xl text-left">
                  <p className="text-[10px] font-black uppercase tracking-widest text-orange-400/70 mb-1.5">
                    Reason
                  </p>
                  <p className="text-sm text-white font-semibold">
                    {adminBanReason || reason}
                  </p>
                </div>
              )}

              <p className="text-gray-500 text-xs mt-2">
                If you believe this is a mistake, please{" "}
                <button
                  onClick={handleContactSupport}
                  className="text-orange-400 hover:text-orange-300 font-semibold underline underline-offset-4 transition-colors"
                >
                  contact support
                </button>
                .
              </p>
            </div>

            {unbanSuccess && (
              <div className="w-full p-3 bg-green-950/30 border border-green-500/30 rounded-xl">
                <p className="text-green-400 text-sm font-semibold">Successfully unbanned! Reloading...</p>
              </div>
            )}
            {unbanError && (
              <div className="w-full p-3 bg-red-950/30 border border-red-500/30 rounded-xl">
                <p className="text-red-400 text-sm">{unbanError}</p>
              </div>
            )}

            {isAdmin && !unbanSuccess && (
              <button
                onClick={handleSelfUnban}
                disabled={isUnbanning}
                className="w-full py-3 px-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isUnbanning ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Unlock className="w-5 h-5" />
                    Admin Self-Unban
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0a0a]">
      <div className="max-w-sm w-full">
        <div className="bg-[#111] border border-white/8 rounded-2xl p-8 shadow-2xl flex flex-col items-center text-center space-y-6">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center border-2 border-red-500/30">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>

          <div className="space-y-3">
            <h1 className="text-xl font-black text-white tracking-tight">
              Account Restricted
            </h1>
            <p className="text-gray-400 text-sm leading-relaxed">
              Your account is temporarily restricted due to unusual activity. Please try again later.
            </p>

            {reason && (
              <div className="mt-2 p-3 bg-red-500/5 border border-red-500/20 rounded-xl text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-red-400/70 mb-1.5">
                  Details
                </p>
                <p className="text-xs text-gray-400">{reason}</p>
              </div>
            )}

            <p className="text-gray-500 text-xs mt-2">
              If you believe this is a mistake, please{" "}
              <button
                onClick={handleContactSupport}
                className="text-red-400 hover:text-red-300 font-semibold underline underline-offset-4 transition-colors"
              >
                contact support
              </button>
              .
            </p>
          </div>

          {unbanSuccess && (
            <div className="w-full p-3 bg-green-950/30 border border-green-500/30 rounded-xl">
              <p className="text-green-400 text-sm font-semibold">Successfully unbanned! Reloading...</p>
            </div>
          )}
          {unbanError && (
            <div className="w-full p-3 bg-red-950/30 border border-red-500/30 rounded-xl">
              <p className="text-red-400 text-sm">{unbanError}</p>
            </div>
          )}

          {isAdmin && !unbanSuccess && (
            <button
              onClick={handleSelfUnban}
              disabled={isUnbanning}
              className="w-full py-3 px-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isUnbanning ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Unlock className="w-5 h-5" />
                  Admin Self-Unban
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
