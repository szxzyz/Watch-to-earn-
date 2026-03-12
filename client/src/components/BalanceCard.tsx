
import { formatCurrency } from "@/lib/utils";

interface BalanceCardProps {
  user: any;
  stats: any;
}

export default function BalanceCard({ user, stats }: BalanceCardProps) {
  return (
    <div className="bg-[#1A1C20] border border-[#2F3238]/50 p-6 rounded-[20px] mt-4 text-center shadow-xl">
      <div className="text-[#B0B3B8] text-xs font-medium mb-2 uppercase tracking-wider">Available Balance</div>
      <div className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-2" data-testid="text-user-balance">
        <span className="text-[#F5C542] text-2xl">₿</span>
        {Math.floor(parseFloat(user?.balance || "0")).toLocaleString()} <span className="text-[#F5C542]">SAT</span>
      </div>
      <div className="text-sm text-[#B0B3B8] flex items-center justify-center gap-1">
        Satoshi (Bitcoin)
      </div>
    </div>
  );
}
