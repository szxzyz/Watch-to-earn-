import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { showNotification } from "@/components/AppNotification";
import { Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";

interface WithdrawalPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tonBalance: number;
}

export default function WithdrawalPopup({ open, onOpenChange, tonBalance }: WithdrawalPopupProps) {
  const queryClient = useQueryClient();
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const { data: appSettings } = useQuery<any>({
    queryKey: ['/api/app-settings'],
    staleTime: 30000,
  });

  const { data: user } = useQuery<any>({
    queryKey: ['/api/auth/user'],
    staleTime: 0,
  });

  const satBalance = Math.floor(parseFloat(user?.balance || "0"));
  const minWithdraw = appSettings?.minimum_withdrawal_sat ? parseFloat(appSettings.minimum_withdrawal_sat) : 20;
  const networkFee = appSettings?.withdrawal_fee_sat ? parseFloat(appSettings.withdrawal_fee_sat) : 10;

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/withdrawals", {
        address: withdrawAddress,
        amount: parseFloat(withdrawAmount).toString(),
        method: "SAT"
      });
      return res.json();
    },
    onSuccess: () => {
      showNotification("Withdrawal request submitted successfully", "success");
      onOpenChange(false);
      setWithdrawAddress("");
      setWithdrawAmount("");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/withdrawals"] });
    },
    onError: (error: any) => {
      let message = "Withdrawal failed";
      try {
        if (typeof error.message === 'string') {
          const trimmed = error.message.trim();
          if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            const parsed = JSON.parse(trimmed);
            if (parsed.message) message = parsed.message;
          } else {
            message = error.message;
          }
        }
      } catch (e) {
        message = error.message;
      }
      showNotification(message, "error");
    },
  });

  const handleWithdrawClick = () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount < minWithdraw) {
      showNotification(`Minimum withdrawal amount is ${minWithdraw} SAT`, "error");
      return;
    }
    if (amount > satBalance) {
      showNotification(`Insufficient balance. Available: ${satBalance} SAT`, "error");
      return;
    }
    if (!withdrawAddress.trim()) {
      showNotification("Please enter your withdrawal address (Bitcoin / Lightning / FaucetPay)", "error");
      return;
    }
    withdrawMutation.mutate();
  };

  const toReceive = withdrawAmount ? Math.max(0, parseFloat(withdrawAmount) - networkFee).toFixed(0) : "0";

  const handleMaxClick = () => {
    setWithdrawAmount(satBalance.toString());
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
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

            <div className="flex items-center px-5 py-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-yellow-400" />
                <h2 className="text-white font-bold text-base">SAT Withdrawal</h2>
              </div>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div className="bg-white/5 rounded-xl px-4 py-3 flex justify-between items-center">
                <span className="text-white/50 text-xs font-semibold">Available Balance</span>
                <span className="text-yellow-400 text-sm font-black tabular-nums">
                  {satBalance.toLocaleString()} SAT
                </span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-white/40 text-[10px] font-black uppercase tracking-widest">
                  Wallet Address
                </Label>
                <Input
                  placeholder="Bitcoin / Lightning / FaucetPay address"
                  value={withdrawAddress}
                  onChange={(e) => setWithdrawAddress(e.target.value)}
                  className="bg-white/5 border-white/10 text-white h-11 rounded-xl focus:ring-yellow-400/30 font-medium text-sm placeholder:text-white/20 placeholder:text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-white/40 text-[10px] font-black uppercase tracking-widest">
                  Amount (SAT)
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="bg-white/5 border-white/10 text-white h-11 rounded-xl font-bold text-sm pr-16 placeholder:text-white/20"
                  />
                  <button
                    onClick={handleMaxClick}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 text-[10px] font-black rounded-lg transition-all uppercase"
                  >
                    Max
                  </button>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-white/50 text-xs font-semibold">Withdraw Fee</span>
                  <span className="text-white text-xs font-bold">{networkFee} SAT</span>
                </div>
                <div className="h-[1px] bg-white/5" />
                <div className="flex justify-between items-center">
                  <span className="text-white/50 text-xs font-semibold">Min. Withdrawal</span>
                  <span className="text-white text-xs font-bold">{minWithdraw} SAT</span>
                </div>
                <div className="h-[1px] bg-white/5" />
                <div className="flex justify-between items-center">
                  <span className="text-white/50 text-xs font-semibold">You Receive</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-white text-sm font-black tabular-nums">
                      {parseInt(toReceive).toLocaleString()} SAT
                    </span>
                    <span className="text-yellow-400 text-base">₿</span>
                  </div>
                </div>
              </div>

              <Button
                className="w-full h-11 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl font-black text-sm uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 border-0"
                onClick={handleWithdrawClick}
                disabled={withdrawMutation.isPending}
              >
                {withdrawMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Withdraw SAT"
                )}
              </Button>

              <button
                onClick={() => onOpenChange(false)}
                className="w-full text-white/40 text-xs font-bold uppercase tracking-wider py-2 hover:text-white/60 transition-colors"
              >
                Close
              </button>
            </div>

            <div className="h-4" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
