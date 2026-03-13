import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowDownCircle, ArrowUpCircle, Clock, CheckCircle2, XCircle, Send, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface TransactionsOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TransactionsOverlay({ open, onOpenChange }: TransactionsOverlayProps) {
  const { data, isLoading } = useQuery<any>({
    queryKey: ['/api/transactions'],
    enabled: open,
  });

  const deposits = data?.deposits || [];
  const withdrawals = data?.withdrawals || [];
  const sentTransfers = data?.sentTransfers || [];
  const receivedTransfers = data?.receivedTransfers || [];

  const allActivity = [
    ...deposits.map((d: any) => ({ ...d, activityType: 'deposit' })),
    ...withdrawals.map((w: any) => ({ ...w, activityType: 'withdrawal' })),
    ...sentTransfers.map((t: any) => ({ ...t, activityType: 'sent' })),
    ...receivedTransfers.map((t: any) => ({ ...t, activityType: 'received' })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'approved':
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'failed':
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default: return <Clock className="w-4 h-4 text-amber-400" />;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'deposit': return <ArrowDownCircle className="w-5 h-5 text-green-400" />;
      case 'withdrawal': return <ArrowUpCircle className="w-5 h-5 text-blue-400" />;
      case 'sent': return <Send className="w-5 h-5 text-orange-400" />;
      case 'received': return <Inbox className="w-5 h-5 text-emerald-400" />;
      default: return <Clock className="w-5 h-5 text-zinc-400" />;
    }
  };

  const getActivityBg = (type: string) => {
    switch (type) {
      case 'deposit': return 'bg-green-500/10';
      case 'withdrawal': return 'bg-blue-500/10';
      case 'sent': return 'bg-orange-500/10';
      case 'received': return 'bg-emerald-500/10';
      default: return 'bg-zinc-500/10';
    }
  };

  const getActivityLabel = (item: any) => {
    switch (item.activityType) {
      case 'deposit': return 'Deposit';
      case 'withdrawal': return 'Withdrawal';
      case 'sent': return `Sent to ${item.senderUsername ? `@${item.senderUsername}` : item.receiverId?.substring(0, 8) + '...'}`;
      case 'received': return `Received from ${item.senderUsername ? `@${item.senderUsername}` : item.senderId?.substring(0, 8) + '...'}`;
      default: return 'Transaction';
    }
  };

  const getAmountDisplay = (item: any) => {
    if (item.activityType === 'sent') {
      return { prefix: '-', color: 'text-orange-400', amount: `${Math.floor(parseFloat(item.amount)).toLocaleString()} SAT` };
    }
    if (item.activityType === 'received') {
      return { prefix: '+', color: 'text-emerald-400', amount: `${Math.floor(parseFloat(item.amount)).toLocaleString()} SAT` };
    }
    if (item.activityType === 'deposit') {
      return { prefix: '+', color: 'text-green-400', amount: `${parseFloat(item.amount).toFixed(4)} TON` };
    }
    return { prefix: '-', color: 'text-blue-400', amount: `${parseFloat(item.amount).toFixed(4)} TON` };
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed inset-0 bg-[#050505] z-[100] flex flex-col"
        >
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white uppercase tracking-tight italic">
              Transactions
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isLoading ? (
              <div className="flex justify-center p-8">
                <Clock className="w-6 h-6 text-zinc-500 animate-spin" />
              </div>
            ) : allActivity.length === 0 ? (
              <div className="text-center p-8 text-zinc-500 font-bold uppercase text-xs tracking-widest">
                No transactions yet
              </div>
            ) : (
              allActivity.map((item: any) => {
                const { prefix, color, amount } = getAmountDisplay(item);
                return (
                  <div key={`${item.activityType}-${item.id}`} className="bg-[#141414] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getActivityBg(item.activityType)}`}>
                        {getActivityIcon(item.activityType)}
                      </div>
                      <div>
                        <p className="font-black text-white uppercase text-xs tracking-tight">
                          {getActivityLabel(item)}
                        </p>
                        {item.note && (
                          <p className="text-[9px] text-zinc-500 font-bold italic mt-0.5">"{item.note}"</p>
                        )}
                        <p className="text-[10px] text-zinc-500 font-bold mt-0.5">
                          {item.createdAt ? format(new Date(item.createdAt), 'MMM dd, yyyy HH:mm') : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-black text-sm ${color}`}>
                        {prefix}{amount}
                      </p>
                      {item.status && (
                        <div className="flex items-center justify-end gap-1 mt-1">
                          {getStatusIcon(item.status)}
                          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{item.status}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-6 border-t border-white/5">
            <Button 
              className="w-full h-14 bg-[#141414] border border-white/5 rounded-2xl font-black uppercase italic tracking-wider text-white"
              onClick={() => onOpenChange(false)}
            >
              Back
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
