import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Shield } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface WalletSectionProps {
  axnBalance: number;
  tonBalance: number;
  uid: string;
  isAdmin?: boolean;
  onAdminClick?: () => void;
  onWithdraw: () => void;
}

export default function WalletSection({ axnBalance, tonBalance, uid, isAdmin, onAdminClick, onWithdraw }: WalletSectionProps) {
  const satBalance = Math.floor(axnBalance);

  return (
    <Card className="minimal-card mb-3">
      <CardContent className="pt-3 pb-3">
        <div className="flex items-center justify-between gap-3">
          {/* SAT Balance */}
          <div className="flex items-center gap-2">
            <span className="text-[#F5C542] text-xl font-bold">₿</span>
            <div className="text-white font-bold text-xl">{satBalance.toLocaleString()} SAT</div>
          </div>

          {/* Withdraw Button */}
          <Button
            onClick={onWithdraw}
            className="h-10 w-[120px] btn-primary"
          >
            <div className="flex items-center justify-center gap-2 w-full">
              <Download className="w-4 h-4 flex-shrink-0" />
              <span className="text-center">Withdraw</span>
            </div>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
