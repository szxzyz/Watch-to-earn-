import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Shield, ShieldOff, Cpu, HardDrive, Activity,
  Wrench, ChevronUp, AlertTriangle, CheckCircle, Play,
  Loader2, X, Info
} from "lucide-react";
import { showNotification } from "@/components/AppNotification";
import { apiRequest } from "@/lib/queryClient";

interface MachineState {
  miningLevel: number;
  capacityLevel: number;
  cpuLevel: number;
  miningRate: number;
  capacity: number;
  cpuDurationSec: number;
  minedAxn: number;
  cpuRunning: boolean;
  cpuRemainingSeconds: number;
  hasEnergy: boolean;
  antivirusActive: boolean;
  machineHealth: number;
  energyCost: number;
  repairCost: number;
  antivirusCost: number;
  upgMining: number;
  upgCapacity: number;
  upgCpu: number;
  isMaxLevel: boolean;
  balance: number;
  pendingVirusDamage: number;
  nextVirusIn: number;
}

function formatTime(seconds: number): string {
  if (seconds <= 0) return "00:00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function formatAXN(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toFixed(n >= 10 ? 1 : 2);
}

export default function MiningMachinePanel() {
  const queryClient = useQueryClient();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [cpuCountdown, setCpuCountdown] = useState(0);

  const { data: state, isLoading } = useQuery<MachineState>({
    queryKey: ["/api/axn-mining/state"],
    refetchInterval: 15000,
    retry: false,
  });

  useEffect(() => {
    if (!state) return;
    if (state.cpuRunning && state.cpuRemainingSeconds > 0) {
      setCpuCountdown(state.cpuRemainingSeconds);
    } else {
      setCpuCountdown(0);
    }
  }, [state?.cpuRemainingSeconds, state?.cpuRunning]);

  useEffect(() => {
    if (cpuCountdown <= 0) return;
    const t = setInterval(() => setCpuCountdown(p => Math.max(0, p - 1)), 1000);
    return () => clearInterval(t);
  }, [cpuCountdown]);

  const [localMined, setLocalMined] = useState(0);
  useEffect(() => {
    if (state) setLocalMined(state.minedAxn);
  }, [state?.minedAxn]);

  // Virus attack countdown (ticks down every second when AV is off)
  const [virusCountdown, setVirusCountdown] = useState(120);
  useEffect(() => {
    if (!state) return;
    setVirusCountdown(state.nextVirusIn ?? 120);
  }, [state?.nextVirusIn, state?.antivirusActive]);

  useEffect(() => {
    if (!state || state.antivirusActive) return;
    const t = setInterval(() => {
      setVirusCountdown(prev => {
        if (prev <= 1) return 120; // reset after attack (server will apply damage on next fetch)
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [state?.antivirusActive]);

  useEffect(() => {
    if (!state?.cpuRunning || !state?.miningRate) return;
    const t = setInterval(() => {
      setLocalMined(prev => Math.min(prev + state.miningRate, state.capacity));
    }, 1000);
    return () => clearInterval(t);
  }, [state?.cpuRunning, state?.miningRate, state?.capacity]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/axn-mining/state"] });
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
  }, [queryClient]);

  const startCpuMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/axn-mining/start-cpu").then(r => r.json()),
    onSuccess: (d) => { showNotification(d.message, "success"); invalidate(); },
    onError: (e: any) => showNotification(e.message || "Failed", "error"),
  });

  const claimMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/axn-mining/claim").then(r => r.json()),
    onSuccess: (d) => {
      showNotification(`+${d.amount?.toFixed(2)} AXN claimed!`, "success");
      setLocalMined(0);
      invalidate();
    },
    onError: (e: any) => showNotification(e.message || "Nothing to claim", "error"),
  });

  const refillMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/axn-mining/refill-energy").then(r => r.json()),
    onSuccess: (d) => { showNotification(d.message, "success"); invalidate(); },
    onError: (e: any) => showNotification(e.message || "Failed", "error"),
  });

  const repairMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/axn-mining/repair").then(r => r.json()),
    onSuccess: (d) => { showNotification(d.message, "success"); invalidate(); },
    onError: (e: any) => showNotification(e.message || "Failed", "error"),
  });

  const antivirusMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/axn-mining/toggle-antivirus").then(r => r.json()),
    onSuccess: (d) => { showNotification(d.message, d.active ? "success" : "info"); invalidate(); },
    onError: (e: any) => showNotification(e.message || "Failed", "error"),
  });

  const upgradeMutation = useMutation({
    mutationFn: (type: string) => apiRequest("POST", "/api/axn-mining/upgrade", { type }).then(r => r.json()),
    onSuccess: (d) => { showNotification(d.message, "success"); invalidate(); },
    onError: (e: any) => showNotification(e.message || "Failed", "error"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[#F5C542]" />
      </div>
    );
  }

  if (!state) return null;

  const capacityPct = Math.min(100, (localMined / state.capacity) * 100);
  const healthColor = state.machineHealth > 60 ? "#22c55e" : state.machineHealth > 30 ? "#f59e0b" : "#ef4444";
  const canClaim = localMined >= 0.01;
  const cpuFinished = !state.cpuRunning && state.cpuRemainingSeconds === 0;

  return (
    <div className="w-full space-y-3">
      {/* Virus Warning */}
      <AnimatePresence>
        {!state.antivirusActive && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-red-950/60 border border-red-500/30 rounded-xl px-4 py-3"
          >
            <div className="flex items-center gap-2.5 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-red-300 text-xs font-bold">Antivirus OFF — Your machine is exposed!</p>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-white/50 text-[10px] font-semibold uppercase tracking-wider">Next attack in</span>
                <span className="text-red-400 text-xs font-black tabular-nums">{virusCountdown}s</span>
              </div>
              {state.pendingVirusDamage > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-red-400 text-[10px] font-black">-{state.pendingVirusDamage} AXN</span>
                  <span className="text-white/30 text-[10px]">·</span>
                  <span className="text-red-400/70 text-[10px] font-semibold">-{state.pendingVirusDamage * 5}% health drained</span>
                </div>
              )}
            </div>
            <div className="mt-2 h-1 rounded-full bg-red-900/40 overflow-hidden">
              <div
                className="h-full rounded-full bg-red-500 transition-all duration-1000"
                style={{ width: `${((120 - virusCountdown) / 120) * 100}%` }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Health Warning */}
      {state.machineHealth < 40 && (
        <div className="flex items-center gap-2.5 bg-amber-950/60 border border-amber-500/30 rounded-xl px-4 py-2.5">
          <Wrench className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-amber-300 text-xs font-semibold">
            Machine health critical ({state.machineHealth}%)! Repair now to keep mining.
          </p>
        </div>
      )}

      {/* Main Machine Card */}
      <div className="bg-[#0e0e0e] border border-[#222] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#1a1a1a]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#F5C542]/10 flex items-center justify-center">
              <span className="text-base">⛏️</span>
            </div>
            <div>
              <p className="text-white text-sm font-black leading-none">AXN Mining Rig</p>
              <p className="text-white/30 text-[10px] font-semibold uppercase tracking-wider mt-0.5">
                Mining Lv.{state.miningLevel} · Cap Lv.{state.capacityLevel} · CPU Lv.{state.cpuLevel}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {state.antivirusActive ? (
              <div className="flex items-center gap-1 bg-green-500/10 border border-green-500/20 rounded-full px-2 py-0.5">
                <Shield className="w-3 h-3 text-green-400" />
                <span className="text-green-400 text-[10px] font-black uppercase">Protected</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 bg-red-500/10 border border-red-500/20 rounded-full px-2 py-0.5">
                <ShieldOff className="w-3 h-3 text-red-400" />
                <span className="text-red-400 text-[10px] font-black uppercase">Exposed</span>
              </div>
            )}
          </div>
        </div>

        {/* Mining Display */}
        <div className="px-4 py-4">
          {/* Mined AXN */}
          <div className="text-center mb-4">
            <div
              className="text-4xl font-black tabular-nums tracking-tight"
              style={{ color: state.cpuRunning ? '#4ade80' : '#ffffff60' }}
            >
              {localMined.toFixed(4)}
            </div>
            <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest mt-1">AXN Mined</p>
          </div>

          {/* Capacity Progress */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1.5">
              <div className="flex items-center gap-1.5">
                <HardDrive className="w-3 h-3 text-[#F5C542]" />
                <span className="text-white/50 text-[10px] font-bold uppercase tracking-wider">Capacity</span>
              </div>
              <span className="text-white/60 text-[10px] font-black tabular-nums">
                {localMined.toFixed(2)} / {state.capacity} AXN
              </span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: capacityPct > 90 ? '#ef4444' : 'linear-gradient(90deg,#F5C542,#d4920a)' }}
                animate={{ width: `${capacityPct}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {/* Mining Rate */}
            <div className="bg-[#161616] rounded-xl p-2.5 text-center border border-[#1e1e1e]">
              <Activity className="w-3.5 h-3.5 text-[#F5C542] mx-auto mb-1" />
              <p className="text-white text-xs font-black tabular-nums">{state.miningRate}/s</p>
              <p className="text-white/30 text-[9px] uppercase tracking-wide mt-0.5">Rate</p>
            </div>
            {/* CPU Timer */}
            <div className="bg-[#161616] rounded-xl p-2.5 text-center border border-[#1e1e1e]">
              <Cpu className="w-3.5 h-3.5 text-blue-400 mx-auto mb-1" />
              <p className={`text-xs font-black tabular-nums ${state.cpuRunning ? 'text-blue-300' : 'text-white/40'}`}>
                {state.cpuRunning ? formatTime(cpuCountdown) : 'Idle'}
              </p>
              <p className="text-white/30 text-[9px] uppercase tracking-wide mt-0.5">CPU</p>
            </div>
            {/* Machine Health */}
            <div className="bg-[#161616] rounded-xl p-2.5 text-center border border-[#1e1e1e]">
              <Wrench className="w-3.5 h-3.5 mx-auto mb-1" style={{ color: healthColor }} />
              <p className="text-xs font-black tabular-nums" style={{ color: healthColor }}>
                {state.machineHealth}%
              </p>
              <p className="text-white/30 text-[9px] uppercase tracking-wide mt-0.5">Health</p>
              <div className="mt-1.5 h-1 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${state.machineHealth}%`, background: healthColor }}
                />
              </div>
            </div>
          </div>

          {/* Energy Bar */}
          <div className="flex items-center gap-3 bg-[#161616] rounded-xl px-3 py-2.5 border border-[#1e1e1e] mb-4">
            <div className="flex items-center gap-1.5 flex-1">
              <Zap className={`w-3.5 h-3.5 flex-shrink-0 ${state.hasEnergy ? 'text-[#F5C542]' : 'text-white/20'}`} />
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-white/50 text-[10px] font-bold uppercase tracking-wider">Energy</span>
                  <span className={`text-[10px] font-black ${state.hasEnergy ? 'text-[#F5C542]' : 'text-white/30'}`}>
                    {state.hasEnergy ? 'FULL' : 'EMPTY'}
                  </span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: state.hasEnergy ? '100%' : '0%',
                      background: 'linear-gradient(90deg,#F5C542,#d4920a)',
                    }}
                  />
                </div>
              </div>
            </div>
            {!state.hasEnergy && (
              <button
                onClick={() => refillMutation.mutate()}
                disabled={refillMutation.isPending}
                className="flex-shrink-0 h-7 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider text-black active:scale-95 transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#F5C542,#d4920a)' }}
              >
                {refillMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : `+${state.energyCost} AXN`}
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            {/* Start CPU / Claim row */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => startCpuMutation.mutate()}
                disabled={
                  startCpuMutation.isPending ||
                  state.cpuRunning ||
                  !state.hasEnergy ||
                  state.machineHealth <= 0
                }
                className="h-11 rounded-xl flex items-center justify-center gap-1.5 font-black text-xs uppercase tracking-widest transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                style={
                  !state.cpuRunning && state.hasEnergy && state.machineHealth > 0
                    ? { background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', color: '#fff', boxShadow: '0 0 14px rgba(59,130,246,0.3)' }
                    : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.25)' }
                }
              >
                {startCpuMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : state.cpuRunning ? (
                  <><Cpu className="w-3.5 h-3.5" /> Running</>
                ) : (
                  <><Play className="w-3.5 h-3.5" /> Start CPU</>
                )}
              </button>

              <button
                onClick={() => claimMutation.mutate()}
                disabled={claimMutation.isPending || !canClaim}
                className="h-11 rounded-xl flex items-center justify-center gap-1.5 font-black text-xs uppercase tracking-widest transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                style={canClaim ? {
                  background: 'linear-gradient(135deg,#F5C542,#d4920a)',
                  color: '#000',
                  boxShadow: '0 0 14px rgba(245,197,66,0.3)',
                } : {
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.25)',
                }}
              >
                {claimMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '⬇ Claim AXN'}
              </button>
            </div>

            {/* Repair + Antivirus row */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => repairMutation.mutate()}
                disabled={repairMutation.isPending || state.machineHealth >= 100}
                className="h-9 rounded-xl flex items-center justify-center gap-1.5 font-bold text-[11px] uppercase tracking-wider transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                style={state.machineHealth < 100 ? {
                  background: 'rgba(239,68,68,0.12)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  color: '#f87171',
                } : {
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.2)',
                }}
              >
                {repairMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : (
                  <><Wrench className="w-3 h-3" /> Repair ({state.repairCost})</>
                )}
              </button>

              <button
                onClick={() => antivirusMutation.mutate()}
                disabled={antivirusMutation.isPending}
                className="h-9 rounded-xl flex items-center justify-center gap-1.5 font-bold text-[11px] uppercase tracking-wider transition-all active:scale-[0.97] disabled:opacity-40"
                style={state.antivirusActive ? {
                  background: 'rgba(34,197,94,0.12)',
                  border: '1px solid rgba(34,197,94,0.25)',
                  color: '#4ade80',
                } : {
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  color: '#f87171',
                }}
              >
                {antivirusMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : state.antivirusActive ? (
                  <><Shield className="w-3 h-3" /> AV ON</>
                ) : (
                  <><ShieldOff className="w-3 h-3" /> AV OFF ({state.antivirusCost})</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade Section */}
      <div className="bg-[#0e0e0e] border border-[#222] rounded-2xl overflow-hidden">
        <button
          onClick={() => setUpgradeOpen(p => !p)}
          className="w-full flex items-center justify-between px-4 py-3.5"
        >
          <div className="flex items-center gap-2">
            <ChevronUp
              className={`w-4 h-4 text-[#F5C542] transition-transform ${upgradeOpen ? '' : 'rotate-180'}`}
            />
            <span className="text-white text-sm font-black uppercase tracking-wider">Upgrade Machine</span>
          </div>
          <span className="text-white/30 text-xs font-semibold">
            {state.miningLevel >= 25 && state.capacityLevel >= 25 && state.cpuLevel >= 25 ? 'MAX' : 'Tap to expand'}
          </span>
        </button>

        <AnimatePresence>
          {upgradeOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-2 border-t border-[#1a1a1a] pt-3">
                {/* Mining Upgrade */}
                <UpgradeRow
                  icon={<Activity className="w-4 h-4 text-[#F5C542]" />}
                  label="Mining Speed"
                  currentLevel={state.miningLevel}
                  currentValue={`${state.miningRate}/s`}
                  nextValue={state.miningLevel < 25 ? `${(state.miningRate + 0.01).toFixed(2)}/s` : undefined}
                  cost={state.upgMining}
                  balance={state.balance}
                  isMax={state.miningLevel >= 25}
                  isPending={upgradeMutation.isPending}
                  onUpgrade={() => upgradeMutation.mutate('mining')}
                />
                {/* Capacity Upgrade */}
                <UpgradeRow
                  icon={<HardDrive className="w-4 h-4 text-blue-400" />}
                  label="Capacity"
                  currentLevel={state.capacityLevel}
                  currentValue={`${state.capacity} AXN`}
                  nextValue={state.capacityLevel < 25 ? `${state.capacity + 24} AXN` : undefined}
                  cost={state.upgCapacity}
                  balance={state.balance}
                  isMax={state.capacityLevel >= 25}
                  isPending={upgradeMutation.isPending}
                  onUpgrade={() => upgradeMutation.mutate('capacity')}
                />
                {/* CPU Upgrade */}
                <UpgradeRow
                  icon={<Cpu className="w-4 h-4 text-purple-400" />}
                  label="CPU Duration"
                  currentLevel={state.cpuLevel}
                  currentValue={`${state.cpuDurationSec / 60}min`}
                  nextValue={state.cpuLevel < 25 ? `${(state.cpuDurationSec / 60) + 30}min` : undefined}
                  cost={state.upgCpu}
                  balance={state.balance}
                  isMax={state.cpuLevel >= 25}
                  isPending={upgradeMutation.isPending}
                  onUpgrade={() => upgradeMutation.mutate('cpu')}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info Footer */}
      <div className="flex items-start gap-2 bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2.5">
        <Info className="w-3.5 h-3.5 text-white/20 flex-shrink-0 mt-0.5" />
        <p className="text-white/25 text-[10px] leading-relaxed">
          Start CPU to begin mining. Claim before capacity fills.
          Keep antivirus ON to avoid AXN loss from virus attacks.
          Repair machine if health drops below 40%.
        </p>
      </div>
    </div>
  );
}

interface UpgradeRowProps {
  icon: React.ReactNode;
  label: string;
  currentLevel: number;
  currentValue: string;
  nextValue?: string;
  cost: number;
  balance: number;
  isMax: boolean;
  isPending: boolean;
  onUpgrade: () => void;
}

function UpgradeRow({ icon, label, currentLevel, currentValue, nextValue, cost, balance, isMax, isPending, onUpgrade }: UpgradeRowProps) {
  const canAfford = balance >= cost;

  return (
    <div className="flex items-center gap-3 bg-[#141414] rounded-xl px-3 py-2.5 border border-[#1e1e1e]">
      <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-white text-xs font-black">{label}</span>
          <span className="text-white/30 text-[9px] font-bold bg-white/5 rounded px-1 py-0.5">Lv.{currentLevel}</span>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-white/50 text-[10px] tabular-nums">{currentValue}</span>
          {nextValue && !isMax && (
            <>
              <span className="text-white/20 text-[10px]">→</span>
              <span className="text-[#F5C542] text-[10px] font-bold tabular-nums">{nextValue}</span>
            </>
          )}
        </div>
      </div>
      {isMax ? (
        <div className="flex items-center gap-1 px-2.5 py-1 bg-[#F5C542]/10 rounded-lg">
          <CheckCircle className="w-3 h-3 text-[#F5C542]" />
          <span className="text-[#F5C542] text-[10px] font-black uppercase">MAX</span>
        </div>
      ) : (
        <button
          onClick={onUpgrade}
          disabled={isPending || !canAfford}
          className={`flex-shrink-0 h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
            canAfford
              ? 'text-black'
              : 'text-white/30 border border-white/10 bg-transparent'
          }`}
          style={canAfford ? { background: 'linear-gradient(135deg,#F5C542,#d4920a)' } : {}}
        >
          {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : (
            <span>{cost >= 1000 ? `${(cost / 1000).toFixed(0)}k` : cost}</span>
          )}
        </button>
      )}
    </div>
  );
}
