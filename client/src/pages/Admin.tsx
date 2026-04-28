import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/useAdmin";
import Layout from "@/components/Layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Crown, ArrowLeft, Users, Pickaxe, Eye, TrendingUp, DollarSign,
  UserCheck, GitBranch, Search, ChevronLeft, ChevronRight,
  RefreshCw, Settings, Shield, LogOut, Globe, Ban, CheckCircle,
} from "lucide-react";
import { useLocation } from "wouter";

function fmt(n: number | string): string {
  const v = typeof n === "string" ? parseFloat(n) : n;
  if (isNaN(v) || !isFinite(v)) return "0";
  if (Math.abs(v) >= 1e12) return (v / 1e12).toFixed(1) + "T";
  if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(1) + "B";
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1) + "M";
  if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(1) + "K";
  return Math.round(v).toLocaleString();
}

function fmtSat(n: number | string): string {
  return fmt(n) + " SAT";
}

interface AdminStats {
  totalUsers: number;
  dailyActiveUsers: number;
  totalMiningSats: string;
  miningToday: string;
  totalAdsWatched: number;
  todayAdsWatched: number;
  totalSatsWithdrawn: string;
  todaySatsWithdrawn?: string;
  usersWithReferrals: number;
  pendingWithdrawals: number;
  successfulWithdrawals: number;
  rejectedWithdrawals: number;
  approvedWithdrawals?: number;
  rejectedWithdrawals2?: number;
  totalEarnings: string;
  totalWithdrawals: string;
}

type AdminTab = "summary" | "users" | "withdrawals" | "bans" | "countries" | "settings";

function MiniToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${value ? "bg-blue-500" : "bg-gray-600"}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${value ? "translate-x-5" : "translate-x-1"}`} />
    </button>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: any; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="bg-[#0f0f0f] border border-white/8 rounded-2xl p-4 flex flex-col gap-2 hover:border-white/20 transition-all">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div>
        <p className="text-[11px] text-gray-500 uppercase tracking-wider">{label}</p>
        <p className="text-lg font-bold text-white leading-tight">{value}</p>
        {sub && <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { toast } = useToast();
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<AdminTab>("summary");

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    refetchInterval: 30000,
    enabled: isAdmin,
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: () => apiRequest("GET", "/api/admin/users").then(r => r.json()),
    refetchInterval: 60000,
    enabled: isAdmin && activeTab === "users",
  });

  const { data: payoutData } = useQuery({
    queryKey: ["/api/admin/withdrawals/processed"],
    queryFn: () => apiRequest("GET", "/api/admin/withdrawals/processed").then(r => r.json()),
    refetchInterval: 30000,
    enabled: isAdmin && activeTab === "withdrawals",
  });

  const { data: pendingPayouts } = useQuery({
    queryKey: ["/api/admin/withdrawals/pending"],
    queryFn: () => apiRequest("GET", "/api/admin/withdrawals/pending").then(r => r.json()),
    refetchInterval: 15000,
    enabled: isAdmin && activeTab === "withdrawals",
  });

  if (adminLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center flex-col gap-4">
          <Shield className="w-12 h-12 text-red-400" />
          <p className="text-white font-semibold">Admin Access Required</p>
          <Button size="sm" onClick={() => setLocation("/")} variant="outline">Go Home</Button>
        </div>
      </Layout>
    );
  }

  const tabs: { id: AdminTab; label: string; icon: any }[] = [
    { id: "summary", label: "Summary", icon: TrendingUp },
    { id: "users", label: "Users", icon: Users },
    { id: "withdrawals", label: "Withdrawals", icon: DollarSign },
    { id: "bans", label: "Bans", icon: Shield },
    { id: "countries", label: "Countries", icon: Globe },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <Layout>
      <main className="min-h-screen bg-[#0a0a0a] text-white pb-20">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-[#0a0a0a]/95 backdrop-blur border-b border-white/5 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setLocation("/")} className="h-8 w-8 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-sm">Admin Panel</span>
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={() => { queryClient.invalidateQueries(); toast({ title: "Refreshed" }); }} className="h-8 w-8 p-0">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 px-4 py-2 overflow-x-auto border-b border-white/5">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <tab.icon className="w-3 h-3" />
              {tab.label}
              {tab.id === "withdrawals" && (stats?.pendingWithdrawals ?? 0) > 0 && (
                <span className="ml-1 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                  {stats!.pendingWithdrawals}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="px-4 pt-4">
          {activeTab === "summary" && <SummarySection stats={stats} isLoading={statsLoading} />}
          {activeTab === "users" && <UserSection usersData={usersData} isLoading={usersLoading} />}
          {activeTab === "withdrawals" && <WithdrawSection payoutData={payoutData} pendingData={pendingPayouts} />}
          {activeTab === "bans" && <BanSection />}
          {activeTab === "countries" && <CountrySection />}
          {activeTab === "settings" && <SettingsSection />}
        </div>
      </main>
    </Layout>
  );
}

/* ─── SUMMARY ─────────────────────────────────────────────────────────────── */

function SummarySection({ stats, isLoading }: { stats: AdminStats | undefined; isLoading: boolean }) {
  const statCards = [
    { icon: UserCheck, label: "Active Users Today", value: fmt(stats?.dailyActiveUsers ?? 0), sub: `of ${fmt(stats?.totalUsers ?? 0)} total`, color: "bg-blue-600" },
    { icon: Pickaxe, label: "Total Mining Sats", value: fmtSat(stats?.totalMiningSats ?? "0"), sub: "all time mined", color: "bg-orange-600" },
    { icon: TrendingUp, label: "Mining Today", value: fmtSat(stats?.miningToday ?? "0"), sub: "today all sources", color: "bg-green-600" },
    { icon: Eye, label: "Total Ads Watched", value: fmt(stats?.totalAdsWatched ?? 0), sub: "all time", color: "bg-purple-600" },
    { icon: Eye, label: "Ads Watched Today", value: fmt(stats?.todayAdsWatched ?? 0), sub: "today", color: "bg-indigo-600" },
    { icon: LogOut, label: "Total Sats Withdrawn", value: fmtSat(stats?.totalSatsWithdrawn ?? "0"), sub: `${fmt((stats as any)?.approvedWithdrawals ?? stats?.successfulWithdrawals ?? 0)} payouts done`, color: "bg-red-600" },
    { icon: DollarSign, label: "Withdrawn Today", value: fmtSat(stats?.todaySatsWithdrawn ?? "0"), sub: "approved today", color: "bg-rose-700" },
    { icon: GitBranch, label: "Users With Referrals", value: fmt(stats?.usersWithReferrals ?? 0), sub: "have invited friends", color: "bg-teal-600" },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-[#0f0f0f] h-24 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map((s, i) => (
          <StatCard key={i} {...s} />
        ))}
      </div>

    </div>
  );
}

/* ─── USERS ───────────────────────────────────────────────────────────────── */

function UserSection({ usersData, isLoading }: { usersData: any; isLoading: boolean }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<any>(null);
  const perPage = 8;

  const list: any[] = usersData?.users || usersData || [];

  const filtered = list.filter(u => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      u.firstName?.toLowerCase().includes(s) ||
      u.username?.toLowerCase().includes(s) ||
      u.telegram_id?.toString().includes(s) ||
      u.referralCode?.toLowerCase().includes(s)
    );
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  useEffect(() => { setPage(1); }, [search]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => <div key={i} className="bg-[#0f0f0f] h-16 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: "Total", value: list.length, color: "text-blue-400" },
            { label: "Active", value: list.filter((u: any) => !u.banned).length, color: "text-green-400" },
            { label: "Banned", value: list.filter((u: any) => u.banned).length, color: "text-red-400" },
          ].map(s => (
            <div key={s.label} className="bg-[#0f0f0f] border border-white/8 rounded-xl py-2">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <Input
            className="pl-8 h-8 text-xs bg-[#0f0f0f] border-white/10"
            placeholder="Search name, username, Telegram ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-white/8 rounded-xl">
          <Table>
            <TableHeader>
              <TableRow className="border-white/8 hover:bg-transparent">
                <TableHead className="text-[10px] text-gray-500 py-2">User</TableHead>
                <TableHead className="text-[10px] text-gray-500 py-2">TG ID</TableHead>
                <TableHead className="text-[10px] text-gray-500 py-2">Invites</TableHead>
                <TableHead className="text-[10px] text-gray-500 py-2">Speed</TableHead>
                <TableHead className="text-[10px] text-gray-500 py-2">Mined</TableHead>
                <TableHead className="text-[10px] text-gray-500 py-2">Withdrawn</TableHead>
                <TableHead className="text-[10px] text-gray-500 py-2">Status</TableHead>
                <TableHead className="text-[10px] text-gray-500 py-2"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-500 text-xs py-6">No users found</TableCell>
                </TableRow>
              ) : paged.map((u: any) => (
                <TableRow key={u.id} className="border-white/5 hover:bg-white/3">
                  <TableCell className="py-2">
                    <div>
                      <p className="text-xs font-medium text-white leading-tight">{u.firstName || "User"}</p>
                      <p className="text-[10px] text-gray-500">{u.username ? `@${u.username}` : "—"}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-[10px] font-mono text-blue-400 py-2">{u.telegram_id || "—"}</TableCell>
                  <TableCell className="py-2">
                    <span className="text-xs font-bold text-teal-400">{u.friendsInvited ?? u.referralCount ?? 0}</span>
                  </TableCell>
                  <TableCell className="text-[10px] text-orange-400 py-2">
                    {parseFloat(u.miningRate || u.referralMiningBoost || "0").toFixed(2)}/h
                  </TableCell>
                  <TableCell className="text-[10px] font-semibold text-white py-2">
                    {fmt(u.totalEarnings || u.balance || 0)} SAT
                  </TableCell>
                  <TableCell className="text-[10px] text-gray-300 py-2">
                    {fmt(u.totalWithdrawn || 0)} SAT
                  </TableCell>
                  <TableCell className="py-2">
                    {u.banned
                      ? <span className="text-[10px] bg-red-600/20 text-red-400 px-1.5 py-0.5 rounded-full border border-red-600/30">Banned</span>
                      : <span className="text-[10px] bg-green-600/20 text-green-400 px-1.5 py-0.5 rounded-full border border-green-600/30">Active</span>
                    }
                  </TableCell>
                  <TableCell className="py-2">
                    <Button size="sm" variant="ghost" onClick={() => setSelected(u)} className="h-6 w-6 p-0">
                      <Eye className="w-3 h-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{filtered.length} users</span>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-6 w-6 p-0">
                <ChevronLeft className="w-3 h-3" />
              </Button>
              <span>{page}/{totalPages}</span>
              <Button size="sm" variant="ghost" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-6 w-6 p-0">
                <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* User detail dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-sm bg-[#111] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-400" />
              User Profile
            </DialogTitle>
          </DialogHeader>
          {selected && <UserProfilePanel user={selected} onClose={() => setSelected(null)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function UserProfilePanel({ user: init, onClose }: { user: any; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [banning, setBanning] = useState(false);
  const [selectedBanReason, setSelectedBanReason] = useState<string>("");

  const ADMIN_BAN_REASONS = [
    "Inactive User",
    "Self Referral / Fraud Activity",
  ];

  const { data: userData } = useQuery({
    queryKey: ["/api/admin/user-withdrawals", init.id],
    queryFn: () => apiRequest("GET", `/api/admin/user-withdrawals/${init.id}`).then(r => r.json()),
  });

  const handleBan = async () => {
    if (!init.banned && !selectedBanReason) {
      toast({ title: "Please select a ban reason", variant: "destructive" });
      return;
    }
    setBanning(true);
    try {
      const r = await apiRequest("POST", "/api/admin/users/ban", {
        userId: init.id,
        banned: !init.banned,
        reason: init.banned ? "Unbanned by admin" : selectedBanReason,
        banType: init.banned ? "system" : "admin",
        adminBanReason: init.banned ? null : selectedBanReason,
      });
      const data = await r.json();
      if (data.success) {
        toast({ title: init.banned ? "User unbanned" : "User banned" });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
        onClose();
      }
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setBanning(false);
    }
  };

  const u = init;
  const totalWithdrawn = (userData as any[])?.reduce((sum: number, w: any) => {
    if (["success", "paid", "Approved", "approved", "completed"].includes(w.status)) {
      return sum + parseFloat(w.amount || "0");
    }
    return sum;
  }, 0) || 0;

  const rows = [
    ["Name", `${u.firstName || ""} ${u.lastName || ""}`.trim() || "—"],
    ["Username", u.username ? `@${u.username}` : "—"],
    ["Telegram ID", u.telegram_id || "—"],
    ["User ID", u.referralCode || u.id?.slice(0, 12) || "—"],
    ["Invite Count", u.friendsInvited ?? u.referralCount ?? 0],
    ["Mining Speed", `${(parseFloat(u.miningRate || "0") * 3600 + parseFloat(u.referralMiningBoost || "0")).toFixed(4)} SAT/h`],
    ["Total Mined", `${fmt(u.totalEarnings || "0")} SAT`],
    ["Total Withdrawn", `${fmt(totalWithdrawn)} SAT`],
    ["Last Active", u.updatedAt ? new Date(u.updatedAt).toLocaleString() : "—"],
    ["Status", u.banned ? "Banned" : "Active"],
    ["Join Date", u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"],
  ];

  return (
    <div className="space-y-3 max-h-[65vh] overflow-y-auto">
      {u.banned && (u.adminBanReason || u.bannedReason) && (
        <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-2 text-xs text-red-300">
          Ban reason: {u.adminBanReason || u.bannedReason}
        </div>
      )}
      <div className="space-y-1">
        {rows.map(([k, v]) => (
          <div key={k as string} className="flex justify-between items-center py-1 border-b border-white/5">
            <span className="text-[10px] text-gray-500">{k}</span>
            <span className={`text-xs font-medium ${k === "Status" ? (u.banned ? "text-red-400" : "text-green-400") : "text-white"}`}>
              {String(v)}
            </span>
          </div>
        ))}
      </div>
      {!u.banned && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Ban Reason (required)</p>
          <div className="space-y-1">
            {ADMIN_BAN_REASONS.map((reason) => (
              <button
                key={reason}
                onClick={() => setSelectedBanReason(reason)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs border transition-all ${
                  selectedBanReason === reason
                    ? "bg-red-700/30 border-red-600/60 text-red-300"
                    : "bg-[#0a0a0a] border-white/10 text-gray-400 hover:border-white/20"
                }`}
              >
                {reason}
              </button>
            ))}
          </div>
        </div>
      )}
      <Button
        size="sm"
        className={`w-full h-8 text-xs ${u.banned ? "bg-green-700 hover:bg-green-600" : "bg-red-700 hover:bg-red-600"}`}
        onClick={handleBan}
        disabled={banning || (!u.banned && !selectedBanReason)}
      >
        {banning ? "Processing..." : u.banned ? "Unban User" : "Ban User"}
      </Button>
    </div>
  );
}

/* ─── WITHDRAWALS ─────────────────────────────────────────────────────────── */

function WithdrawSection({ payoutData, pendingData }: { payoutData: any; pendingData: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 5;

  const allWithdrawals: any[] = [
    ...(pendingData?.withdrawals || pendingData || []),
    ...(payoutData?.withdrawals || payoutData || []),
  ];

  const filtered = allWithdrawals.filter(w => {
    const matchStatus =
      filter === "all" ? true :
      filter === "pending" ? w.status === "pending" :
      filter === "approved" ? ["success", "paid", "Approved", "approved", "completed"].includes(w.status) :
      w.status === "rejected";
    const s = search.toLowerCase();
    const matchSearch = !search || (
      w.user?.firstName?.toLowerCase().includes(s) ||
      w.user?.username?.toLowerCase().includes(s) ||
      w.user?.telegram_id?.toString().includes(s) ||
      w.details?.paymentDetails?.toLowerCase().includes(s) ||
      (w.transactionHash || "").toLowerCase().includes(s)
    );
    return matchStatus && matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  useEffect(() => { setPage(1); }, [filter, search]);

  const handleApprove = async (id: string) => {
    try {
      const r = await apiRequest("POST", `/api/admin/withdrawals/${id}/approve`, {});
      const d = await r.json();
      if (d.success) {
        toast({ title: "Withdrawal approved" });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals/pending"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals/processed"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      } else {
        toast({ title: d.message || "Failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleReject = async (id: string) => {
    try {
      const r = await apiRequest("POST", `/api/admin/withdrawals/${id}/reject`, { reason: "Rejected by admin" });
      const d = await r.json();
      if (d.success) {
        toast({ title: "Withdrawal rejected" });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals/pending"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals/processed"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      } else {
        toast({ title: d.message || "Failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const statusBadge = (status: string) => {
    if (["success", "paid", "Approved", "approved", "completed"].includes(status))
      return <span className="text-[10px] bg-green-600/20 text-green-400 px-1.5 py-0.5 rounded-full border border-green-600/30">Approved</span>;
    if (status === "rejected")
      return <span className="text-[10px] bg-red-600/20 text-red-400 px-1.5 py-0.5 rounded-full border border-red-600/30">Rejected</span>;
    return <span className="text-[10px] bg-yellow-600/20 text-yellow-400 px-1.5 py-0.5 rounded-full border border-yellow-600/30">Pending</span>;
  };

  const pendingCount = allWithdrawals.filter(w => w.status === "pending").length;

  return (
    <div className="space-y-3">
      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {(["pending", "all", "approved", "rejected"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${filter === f ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}
          >
            {f === "pending" ? `Pending (${pendingCount})` : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
        <Input
          className="pl-8 h-8 text-xs bg-[#0f0f0f] border-white/10"
          placeholder="Search name, address, TX ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      {paged.length === 0 ? (
        <div className="text-center py-10 text-gray-500 text-sm">No withdrawals found</div>
      ) : (
        <div className="space-y-2">
          {paged.map((w: any) => {
            const userName = w.user?.firstName || "User";
            const userUsername = w.user?.username ? `@${w.user.username}` : "—";
            const userId = w.user?.telegram_id || w.userId || "—";
            const address = w.details?.paymentDetails || w.address || "—";
            const amount = parseFloat(w.amount || "0");
            const fee = parseFloat(w.fee || "0");
            const date = w.createdAt ? new Date(w.createdAt).toLocaleString() : "—";
            const txId = w.transactionHash || w.txHash || "";

            return (
              <div key={w.id} className="bg-[#0f0f0f] border border-white/8 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-white">
                      {userName} <span className="text-gray-500 font-normal text-[10px]">{userUsername}</span>
                    </p>
                    <p className="text-[10px] text-gray-500">ID: {userId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">{fmt(amount)} SAT</p>
                    {fee > 0 && <p className="text-[10px] text-gray-500">Fee: {fmt(fee)} SAT</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <div>
                    <p className="text-[9px] text-gray-600 uppercase tracking-wide">Address</p>
                    <p className="text-[10px] text-blue-300 font-mono truncate max-w-[120px]" title={address}>{address}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-600 uppercase tracking-wide">Date</p>
                    <p className="text-[10px] text-gray-300">{date}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-600 uppercase tracking-wide">TX ID</p>
                    <p className="text-[10px] text-gray-400 font-mono" title={txId}>
                      {txId ? txId.slice(0, 14) + (txId.length > 14 ? "..." : "") : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-600 uppercase tracking-wide">Status</p>
                    {statusBadge(w.status)}
                  </div>
                </div>

                {w.rejectionReason && (
                  <p className="text-[10px] text-red-400">Reason: {w.rejectionReason}</p>
                )}

                {w.status === "pending" && (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={() => handleApprove(w.id)} className="flex-1 h-7 text-xs bg-green-700 hover:bg-green-600">
                      Approve
                    </Button>
                    <Button size="sm" onClick={() => handleReject(w.id)} className="flex-1 h-7 text-xs bg-red-700 hover:bg-red-600">
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{filtered.length} records</span>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-6 w-6 p-0">
              <ChevronLeft className="w-3 h-3" />
            </Button>
            <span>{page}/{totalPages}</span>
            <Button size="sm" variant="ghost" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-6 w-6 p-0">
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── BANS ────────────────────────────────────────────────────────────────── */

function BanSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [view, setView] = useState<"users" | "logs">("users");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [unbanningId, setUnbanningId] = useState<string | null>(null);
  const perPage = 5;

  const { data: banLogs } = useQuery({
    queryKey: ["/api/admin/ban-logs"],
    queryFn: () => apiRequest("GET", "/api/admin/ban-logs?limit=200").then(r => r.json()),
    refetchInterval: 30000,
  });

  const { data: bannedUsers } = useQuery({
    queryKey: ["/api/admin/banned-users-details"],
    queryFn: () => apiRequest("GET", "/api/admin/banned-users-details").then(r => r.json()),
    refetchInterval: 30000,
  });

  const { data: allUsersRaw } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: () => apiRequest("GET", "/api/admin/users").then(r => r.json()),
    refetchInterval: 60000,
  });

  const logs: any[] = banLogs || [];
  const banned: any[] = bannedUsers || [];
  const allUsers: any[] = allUsersRaw?.users || allUsersRaw || [];

  const filteredBanned = banned.filter(u => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      u.firstName?.toLowerCase().includes(s) ||
      u.username?.toLowerCase().includes(s) ||
      u.telegram_id?.toString().includes(s) ||
      u.deviceId?.toLowerCase().includes(s)
    );
  });

  const filteredLogs = logs.filter(l => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      l.reason?.toLowerCase().includes(s) ||
      l.bannedUserUid?.toLowerCase().includes(s) ||
      l.ip?.toLowerCase().includes(s)
    );
  });

  const data = view === "users" ? filteredBanned : filteredLogs;
  const totalPages = Math.ceil(data.length / perPage);
  const paged = data.slice((page - 1) * perPage, page * perPage);

  useEffect(() => { setPage(1); }, [view, search]);

  const handleUnban = async (userId: string) => {
    setUnbanningId(userId);
    try {
      const r = await apiRequest("POST", `/api/admin/users/${userId}/unban`);
      const d = await r.json();
      if (d.success) {
        toast({ title: "User unbanned" });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/banned-users-details"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/ban-logs"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      }
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setUnbanningId(null);
    }
  };

  const getMultipleAccounts = (u: any) => {
    if (!u.deviceId && !u.lastLoginIp) return [];
    return allUsers.filter((a: any) =>
      a.id !== u.id && (
        (u.deviceId && a.deviceId === u.deviceId) ||
        (u.lastLoginIp && a.lastLoginIp === u.lastLoginIp)
      )
    );
  };

  const getInviteNetwork = (userId: string) => {
    return allUsers.filter((a: any) => a.referredBy === userId);
  };

  const autoBans = logs.filter((l: any) => l.banType === "auto").length;
  const manualBans = logs.filter((l: any) => l.banType === "manual").length;

  return (
    <div className="space-y-3">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-[#0f0f0f] border border-white/8 rounded-xl py-2">
          <p className="text-lg font-bold text-red-400">{banned.length}</p>
          <p className="text-[10px] text-gray-500">Banned</p>
        </div>
        <div className="bg-[#0f0f0f] border border-white/8 rounded-xl py-2">
          <p className="text-lg font-bold text-orange-400">{autoBans}</p>
          <p className="text-[10px] text-gray-500">Auto-ban</p>
        </div>
        <div className="bg-[#0f0f0f] border border-white/8 rounded-xl py-2">
          <p className="text-lg font-bold text-purple-400">{manualBans}</p>
          <p className="text-[10px] text-gray-500">Manual</p>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex gap-1">
        {(["users", "logs"] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${view === v ? "bg-red-700 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}
          >
            {v === "users" ? `Banned Users (${banned.length})` : `Ban Logs (${logs.length})`}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
        <Input
          className="pl-8 h-8 text-xs bg-[#0f0f0f] border-white/10"
          placeholder="Search name, ID, IP, device..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Content */}
      {view === "users" ? (
        <div className="space-y-2">
          {(paged as any[]).length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No banned users</div>
          ) : (paged as any[]).map((u: any) => {
            const multi = getMultipleAccounts(u);
            const network = getInviteNetwork(u.id);
            return (
              <div key={u.id} className="bg-[#0f0f0f] border border-red-600/20 rounded-xl p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-white">
                      {u.firstName || "User"}
                      {u.username && <span className="text-gray-500 font-normal ml-1">@{u.username}</span>}
                    </p>
                    <p className="text-[10px] text-gray-500">TG: {u.telegram_id || "—"} · ID: {u.referralCode || u.id?.slice(0, 8)}</p>
                    {u.bannedReason && <p className="text-[10px] text-red-400 mt-0.5">Reason: {u.bannedReason}</p>}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleUnban(u.id)}
                    disabled={unbanningId === u.id}
                    className="h-6 text-[10px] px-2 bg-green-800 hover:bg-green-700"
                  >
                    {unbanningId === u.id ? "..." : "Unban"}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {u.deviceId && (
                    <div className="bg-white/3 rounded-lg p-1.5">
                      <p className="text-[9px] text-gray-600 uppercase">Device ID</p>
                      <p className="text-[10px] text-gray-400 font-mono truncate">{u.deviceId.slice(0, 16)}...</p>
                    </div>
                  )}
                  {u.lastLoginIp && (
                    <div className="bg-white/3 rounded-lg p-1.5">
                      <p className="text-[9px] text-gray-600 uppercase">Last IP</p>
                      <p className="text-[10px] text-gray-400 font-mono">{u.lastLoginIp}</p>
                    </div>
                  )}
                </div>

                {multi.length > 0 && (
                  <div className="bg-orange-900/10 border border-orange-600/20 rounded-lg p-2">
                    <p className="text-[10px] text-orange-400 font-semibold mb-1">
                      ⚠ {multi.length} Suspicious Account(s) — Same Device/IP
                    </p>
                    {multi.slice(0, 3).map((acc: any) => (
                      <p key={acc.id} className="text-[9px] text-gray-400">
                        • {acc.firstName || "User"} {acc.username ? `@${acc.username}` : ""} (TG: {acc.telegram_id})
                      </p>
                    ))}
                  </div>
                )}

                {network.length > 0 && (
                  <div className="bg-blue-900/10 border border-blue-600/20 rounded-lg p-2">
                    <p className="text-[10px] text-blue-400 font-semibold mb-1">
                      Invite Network ({network.length} user{network.length !== 1 ? "s" : ""} invited)
                    </p>
                    {network.slice(0, 3).map((acc: any) => (
                      <p key={acc.id} className="text-[9px] text-gray-400">
                        • {acc.firstName || "User"} {acc.username ? `@${acc.username}` : ""}
                      </p>
                    ))}
                    {network.length > 3 && <p className="text-[9px] text-gray-500">...and {network.length - 3} more</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {(paged as any[]).length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No ban logs</div>
          ) : (paged as any[]).map((log: any) => (
            <div key={log.id} className="bg-[#0f0f0f] border border-white/8 rounded-xl p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                  log.banType === "auto"
                    ? "bg-orange-600/20 text-orange-400 border-orange-600/30"
                    : "bg-purple-600/20 text-purple-400 border-purple-600/30"
                }`}>
                  {log.banType === "auto" ? "Auto-ban" : "Manual"}
                </span>
                <span className="text-[10px] text-gray-500">
                  {log.createdAt ? new Date(log.createdAt).toLocaleDateString() : "—"}
                </span>
              </div>
              <p className="text-xs text-white">{log.reason || "No reason"}</p>
              {log.bannedUserUid && <p className="text-[10px] text-gray-500">User: {log.bannedUserUid}</p>}
              {log.ip && <p className="text-[10px] text-gray-500 font-mono">IP: {log.ip}</p>}
              {log.deviceId && <p className="text-[10px] text-gray-500 font-mono">Device: {log.deviceId.slice(0, 16)}...</p>}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{data.length} records</span>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-6 w-6 p-0">
              <ChevronLeft className="w-3 h-3" />
            </Button>
            <span>{page}/{totalPages}</span>
            <Button size="sm" variant="ghost" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-6 w-6 p-0">
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── SETTINGS ────────────────────────────────────────────────────────────── */

type SettCat = "mining" | "affiliates" | "withdrawals" | "ads" | "other";

function SettingsSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cat, setCat] = useState<SettCat>("mining");
  const [saving, setSaving] = useState(false);

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["/api/admin/settings"],
    queryFn: () => apiRequest("GET", "/api/admin/settings").then(r => r.json()),
  });

  const [s, setS] = useState<Record<string, any>>({
    ad_section1_reward: "0.0015",
    ad_section1_limit: "250",
    ad_section2_reward: "0.0001",
    ad_section2_limit: "250",
    affiliateCommission: "10",
    referralBoostPerInvite: "0.02",
    referralRewardEnabled: false,
    minimum_withdrawal_sat: "100",
    withdrawal_fee_sat: "0",
    withdrawalInviteRequirementEnabled: true,
    minimumInvitesForWithdrawal: "3",
    channelJoinRequired: true,
    withdraw_ads_required: false,
  });

  useEffect(() => {
    if (settingsData) {
      setS({
        ad_section1_reward: settingsData.ad_section1_reward?.toString() || "0.0015",
        ad_section1_limit: settingsData.ad_section1_limit?.toString() || "250",
        ad_section2_reward: settingsData.ad_section2_reward?.toString() || "0.0001",
        ad_section2_limit: settingsData.ad_section2_limit?.toString() || "250",
        affiliateCommission: settingsData.affiliateCommission?.toString() || "10",
        referralBoostPerInvite: settingsData.referralBoostPerInvite?.toString() || "0.02",
        referralRewardEnabled: settingsData.referralRewardEnabled || false,
        minimum_withdrawal_sat: settingsData.minWithdrawalAmountTON?.toString() || "100",
        withdrawal_fee_sat: settingsData.withdrawalFeeTON?.toString() || "0",
        withdrawalInviteRequirementEnabled: settingsData.withdrawalInviteRequirementEnabled !== false,
        minimumInvitesForWithdrawal: settingsData.minimumInvitesForWithdrawal?.toString() || "3",
        channelJoinRequired: settingsData.channelJoinRequired !== false,
        withdraw_ads_required: Boolean(settingsData.withdraw_ads_required),
      });
    }
  }, [settingsData]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ad_section1_reward: s.ad_section1_reward,
        ad_section1_limit: parseInt(s.ad_section1_limit),
        ad_section2_reward: s.ad_section2_reward,
        ad_section2_limit: parseInt(s.ad_section2_limit),
        affiliateCommission: parseFloat(s.affiliateCommission),
        referralBoostPerInvite: parseFloat(s.referralBoostPerInvite),
        referralRewardEnabled: Boolean(s.referralRewardEnabled),
        minimum_withdrawal_sat: parseFloat(s.minimum_withdrawal_sat),
        withdrawal_fee_sat: parseFloat(s.withdrawal_fee_sat),
        withdrawalInviteRequirementEnabled: Boolean(s.withdrawalInviteRequirementEnabled),
        minimumInvitesForWithdrawal: parseInt(s.minimumInvitesForWithdrawal),
        channelJoinRequired: Boolean(s.channelJoinRequired),
        withdraw_ads_required: Boolean(s.withdraw_ads_required),
      };
      const r = await apiRequest("PUT", "/api/admin/settings", payload);
      const d = await r.json();
      if (d.success) {
        toast({ title: "Settings saved" });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      } else {
        toast({ title: d.message || "Failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error saving settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const cats: { id: SettCat; label: string }[] = [
    { id: "mining", label: "Mining" },
    { id: "affiliates", label: "Affiliates" },
    { id: "withdrawals", label: "Withdrawals" },
    { id: "ads", label: "Ads" },
    { id: "other", label: "Other" },
  ];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => <div key={i} className="bg-[#0f0f0f] h-16 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Category tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {cats.map(c => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              cat === c.id ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Mining */}
      {cat === "mining" && (
        <SettCard title="Mining Boost" icon={<Pickaxe className="w-3.5 h-3.5" />} color="text-orange-400">
          <p className="text-[11px] text-gray-500 leading-relaxed">
            Mining boost is earned by watching ads. Configure ad section rewards and limits in the <strong className="text-gray-300">Ads</strong> tab. Referral mining boost is in the <strong className="text-gray-300">Affiliates</strong> tab.
          </p>
        </SettCard>
      )}

      {/* Affiliates */}
      {cat === "affiliates" && (
        <SettCard title="Referral & Affiliates" icon={<GitBranch className="w-3.5 h-3.5" />} color="text-teal-400">
          <SettField label="Referral Mining Boost (SAT/h per invite)" hint="Extra SAT/hour added to inviter's mining rate per active referral. e.g. 0.02 = +0.02 SAT/h per friend">
            <Input type="number" step="0.001" value={s.referralBoostPerInvite} onChange={e => setS({ ...s, referralBoostPerInvite: e.target.value })} className="h-8 text-xs bg-[#0a0a0a] border-white/10" />
          </SettField>
          <SettField label="Affiliate Commission (%)" hint="Commission for affiliates">
            <Input type="number" value={s.affiliateCommission} onChange={e => setS({ ...s, affiliateCommission: e.target.value })} className="h-8 text-xs bg-[#0a0a0a] border-white/10" />
          </SettField>
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-xs text-white font-medium">Referral Bonus Enabled</p>
              <p className="text-[10px] text-gray-500">Give one-time bonus on referral activation</p>
            </div>
            <MiniToggle value={Boolean(s.referralRewardEnabled)} onChange={v => setS({ ...s, referralRewardEnabled: v })} />
          </div>
        </SettCard>
      )}

      {/* Withdrawals */}
      {cat === "withdrawals" && (
        <SettCard title="Withdrawal Settings" icon={<DollarSign className="w-3.5 h-3.5" />} color="text-green-400">
          <SettField label="Minimum Withdrawal (SAT)" hint="Minimum SAT required to withdraw">
            <Input type="number" value={s.minimum_withdrawal_sat} onChange={e => setS({ ...s, minimum_withdrawal_sat: e.target.value })} className="h-8 text-xs bg-[#0a0a0a] border-white/10" />
          </SettField>
          <SettField label="Withdrawal Fee (SAT)" hint="Fee deducted per withdrawal (0 = free)">
            <Input type="number" value={s.withdrawal_fee_sat} onChange={e => setS({ ...s, withdrawal_fee_sat: e.target.value })} className="h-8 text-xs bg-[#0a0a0a] border-white/10" />
          </SettField>
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-xs text-white font-medium">Invite Requirement</p>
              <p className="text-[10px] text-gray-500">Require inviting friends before withdrawing</p>
            </div>
            <MiniToggle value={Boolean(s.withdrawalInviteRequirementEnabled)} onChange={v => setS({ ...s, withdrawalInviteRequirementEnabled: v })} />
          </div>
          {s.withdrawalInviteRequirementEnabled && (
            <SettField label="Minimum Invites Required" hint="Friends user must invite before withdrawing">
              <Input type="number" value={s.minimumInvitesForWithdrawal} onChange={e => setS({ ...s, minimumInvitesForWithdrawal: e.target.value })} className="h-8 text-xs bg-[#0a0a0a] border-white/10" />
            </SettField>
          )}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-xs text-white font-medium">Withdraw Ads Requirement</p>
              <p className="text-[10px] text-gray-500">Require 100 ads watched before each withdrawal</p>
            </div>
            <MiniToggle value={Boolean(s.withdraw_ads_required)} onChange={v => setS({ ...s, withdraw_ads_required: v })} />
          </div>
        </SettCard>
      )}

      {/* Ads */}
      {cat === "ads" && (
        <SettCard title="Ad Settings" icon={<Eye className="w-3.5 h-3.5" />} color="text-purple-400">
          <div className="space-y-1 pb-1">
            <p className="text-[10px] font-semibold text-purple-400 uppercase tracking-wide">Section 1</p>
            <SettField label="Mining Boost Per Ad (SAT/h)" hint="SAT/h added to mining rate per Section 1 ad watched">
              <Input type="number" step="0.0001" value={s.ad_section1_reward} onChange={e => setS({ ...s, ad_section1_reward: e.target.value })} className="h-8 text-xs bg-[#0a0a0a] border-white/10" />
            </SettField>
            <SettField label="Daily Limit" hint="Max Section 1 ads per user per day">
              <Input type="number" value={s.ad_section1_limit} onChange={e => setS({ ...s, ad_section1_limit: e.target.value })} className="h-8 text-xs bg-[#0a0a0a] border-white/10" />
            </SettField>
          </div>
          <div className="border-t border-white/5 pt-3 space-y-1">
            <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wide">Section 2</p>
            <SettField label="Mining Boost Per Ad (SAT/h)" hint="SAT/h added to mining rate per Section 2 ad watched">
              <Input type="number" step="0.0001" value={s.ad_section2_reward} onChange={e => setS({ ...s, ad_section2_reward: e.target.value })} className="h-8 text-xs bg-[#0a0a0a] border-white/10" />
            </SettField>
            <SettField label="Daily Limit" hint="Max Section 2 ads per user per day">
              <Input type="number" value={s.ad_section2_limit} onChange={e => setS({ ...s, ad_section2_limit: e.target.value })} className="h-8 text-xs bg-[#0a0a0a] border-white/10" />
            </SettField>
          </div>
        </SettCard>
      )}

      {/* Other */}
      {cat === "other" && (
        <SettCard title="Other Settings" icon={<Settings className="w-3.5 h-3.5" />} color="text-gray-400">
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-xs text-white font-medium">Channel Join Required</p>
              <p className="text-[10px] text-gray-500">Block users who haven't joined the channel</p>
            </div>
            <MiniToggle value={Boolean(s.channelJoinRequired)} onChange={v => setS({ ...s, channelJoinRequired: v })} />
          </div>
        </SettCard>
      )}

      {/* Save button */}
      <Button
        onClick={save}
        disabled={saving}
        className="w-full h-10 text-sm font-semibold bg-blue-600 hover:bg-blue-500"
      >
        {saving ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
}

/* ─── COUNTRIES ───────────────────────────────────────────────────────────── */

function CountrySection() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <Globe className="w-12 h-12 text-blue-400" />
      <div className="text-center">
        <p className="text-white font-semibold text-sm mb-1">Country Block Controls</p>
        <p className="text-gray-400 text-xs">Manage blocked countries from the dedicated page.</p>
      </div>
      <Button
        onClick={() => setLocation("/admin/country-controls")}
        className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-6"
      >
        Open Country Controls
      </Button>
    </div>
  );
}

function SettCard({ title, icon, color, children }: {
  title: string; icon: React.ReactNode; color: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-[#0f0f0f] border border-white/8 rounded-xl p-4 space-y-4">
      <p className={`text-xs font-semibold flex items-center gap-1.5 ${color}`}>
        {icon}
        {title}
      </p>
      {children}
    </div>
  );
}

function SettField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-white font-medium">{label}</Label>
      {children}
      {hint && <p className="text-[10px] text-gray-500">{hint}</p>}
    </div>
  );
}
