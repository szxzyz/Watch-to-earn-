import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { User, Receipt, ChevronRight, Shield, ArrowLeft, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface MenuPopupProps {
  onClose: () => void;
}

type View = "main" | "transactions" | "legal";

export default function MenuPopup({ onClose }: MenuPopupProps) {
  const [view, setView] = useState<View>("main");

  const { data: user } = useQuery<any>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 60000,
  });

  const { data: txData, isLoading: txLoading } = useQuery<any>({
    queryKey: ["/api/withdrawals"],
    enabled: view === "transactions",
    retry: false,
  });

  const telegramUser =
    typeof window !== "undefined"
      ? (window as any).Telegram?.WebApp?.initDataUnsafe?.user
      : null;

  const photoUrl = telegramUser?.photo_url || user?.profileImageUrl || null;
  const displayName = user?.firstName || telegramUser?.first_name || "User";
  const username = user?.telegramUsername || telegramUser?.username || null;
  const telegramId = user?.telegramId || telegramUser?.id?.toString() || null;

  const withdrawals = txData?.withdrawals || [];

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

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] flex items-end justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          className="relative w-full max-w-md bg-[#0f0f0f] border border-white/10 rounded-t-2xl overflow-hidden"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          style={{ maxHeight: "90vh", overflowY: "auto" }}
        >
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-white/5">
            {view !== "main" && (
              <button
                onClick={() => setView("main")}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-white" />
              </button>
            )}
            <h2 className="text-white font-bold text-base">
              {view === "main" ? "Menu" : view === "transactions" ? "Transactions" : "Legal Info"}
            </h2>
          </div>

          {/* Main View */}
          {view === "main" && (
            <div className="px-5 py-4 space-y-3">
              {/* Account Info */}
              <div className="bg-white/5 rounded-2xl p-4">
                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-3">
                  Account Info
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full overflow-hidden border border-white/10 bg-[#1a1a1a] flex items-center justify-center flex-shrink-0">
                    {photoUrl ? (
                      <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-white/40" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm truncate">{displayName}</p>
                    {username && (
                      <p className="text-white/50 text-xs mt-0.5">@{username}</p>
                    )}
                    {telegramId && (
                      <p className="text-white/30 text-[10px] mt-1 font-mono">ID: {telegramId}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Transactions */}
              <button
                onClick={() => setView("transactions")}
                className="w-full flex items-center justify-between bg-white/5 rounded-2xl p-4 hover:bg-white/10 transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <Receipt className="w-5 h-5 text-blue-400" />
                  <span className="text-white font-bold text-sm">Transactions</span>
                </div>
                <ChevronRight className="w-4 h-4 text-white/30" />
              </button>

              {/* Legal Info */}
              <button
                onClick={() => setView("legal")}
                className="w-full flex items-center justify-between bg-white/5 rounded-2xl p-4 hover:bg-white/10 transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-blue-400" />
                  <span className="text-white font-bold text-sm">Legal Info</span>
                </div>
                <ChevronRight className="w-4 h-4 text-white/30" />
              </button>
            </div>
          )}

          {/* Transactions View */}
          {view === "transactions" && (
            <div className="px-5 py-4">
              {txLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                </div>
              ) : withdrawals.length === 0 ? (
                <div className="text-center py-10 text-white/30 text-sm">
                  No transactions yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {withdrawals.map((w: any) => (
                    <div key={w.id} className="bg-white/5 rounded-xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(w.status)}
                        <div>
                          <p className="text-white text-xs font-bold">{w.method || "Withdrawal"}</p>
                          <p className="text-white/40 text-[10px] mt-0.5">
                            {w.createdAt ? format(new Date(w.createdAt), "dd MMM yyyy") : "—"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white text-xs font-bold">{parseFloat(w.amount || "0").toLocaleString()} SAT</p>
                        <p className={`text-[10px] font-semibold capitalize ${getStatusColor(w.status)}`}>
                          {w.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Legal View */}
          {view === "legal" && (
            <div className="px-5 py-4 space-y-3 text-xs text-white/50 leading-relaxed">
              <div className="bg-white/5 rounded-2xl p-4">
                <p className="text-white/70 font-bold mb-2">Terms of Use</p>
                <p>By using this app, you agree to our terms. Rewards are in SAT (satoshis) and are subject to availability. Rewards may change at any time without prior notice.</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-4">
                <p className="text-white/70 font-bold mb-2">Privacy Policy</p>
                <p>We collect only your Telegram user data (name, username, ID) to identify your account. We do not share your data with third parties. Your data is securely stored and used solely to operate the app.</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-4">
                <p className="text-white/70 font-bold mb-2">Disclaimer</p>
                <p>This app is not affiliated with Telegram. Withdrawals are subject to minimum balance requirements and admin review.</p>
              </div>
            </div>
          )}

          <div className="h-6" />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
