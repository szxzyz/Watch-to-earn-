import React from "react";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { useLocation } from "wouter";
import { 
  Copy, 
  ShieldCheck, 
  FileText, 
  Check, 
  ChevronRight, 
  X,
  ArrowLeftRight,
  Globe2,
  Headphones,
  Shield,
  ScrollText,
  AlertCircle,
  Plus,
  Minus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { showNotification } from "@/components/AppNotification";
import { motion, AnimatePresence } from "framer-motion";
import TransactionsOverlay from "@/components/TransactionsOverlay";
import TopUpPopup from "@/components/TopUpPopup";
import WithdrawalPopup from "@/components/WithdrawalPopup";

type Language = 'en' | 'ru';

export default function Profile() {
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [, navigate] = useLocation();
  const [copied, setCopied] = React.useState(false);
  const [selectedLegal, setSelectedLegal] = React.useState<string | null>(null);
  const [isLanguageOpen, setIsLanguageOpen] = React.useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = React.useState(false);
  const [isTransactionsOpen, setIsTransactionsOpen] = React.useState(false);
  const [isTopUpOpen, setIsTopUpOpen] = React.useState(false);

  const languages: { code: Language, name: string, flag: string }[] = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  ];

  const uid = (user as any)?.referralCode || (user as any)?.id?.slice(0, 8) || '00000';
  const tonAppBalance = parseFloat((user as any)?.tonAppBalance || "0");
  const tonWithdrawBalance = parseFloat((user as any)?.tonBalance || "0");

  const copyUid = () => {
    navigator.clipboard.writeText(uid);
    setCopied(true);
    showNotification(t('copied'), 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const selectLanguage = (code: Language) => {
    setLanguage(code);
    setIsLanguageOpen(false);
    showNotification(`Language changed to ${languages.find(l => l.code === code)?.name}`, 'success');
  };

  const openLink = (url: string) => {
    if ((window as any).Telegram?.WebApp?.openTelegramLink) {
      (window as any).Telegram.WebApp.openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const legalContent: Record<string, { title: string, content: React.ReactNode }> = {
    terms: {
      title: t('terms_conditions'),
      content: (
        <div className="space-y-4 text-gray-400 text-sm">
          <p className="text-[#B9FF66] font-bold">Last Updated: March 05, 2026</p>
          <p>Welcome to Money AXN. By accessing or using this app, you agree to comply with these Terms & Conditions. If you do not agree, please do not use the app.</p>
          <div>
            <h4 className="text-white font-bold mb-1 italic uppercase tracking-tighter">1. Eligibility</h4>
            <p>Users must be at least 13 years old. You represent that you are of legal age to form a binding contract. You are responsible for maintaining the confidentiality of your account and all activities that occur under your account.</p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-1 italic uppercase tracking-tighter">2. AXN Rewards</h4>
            <p>Money AXN is a free token earning application. Users can earn AXN tokens by completing tasks and referring others. AXN is credited to your virtual balance and can be converted to TON for withdrawal.</p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-1 italic uppercase tracking-tighter">3. Tasks & Referrals</h4>
            <p>Users earn rewards by completing advertiser tasks or inviting new users. Referral commissions are earned from the activities of successfully referred users.</p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-1 italic uppercase tracking-tighter">4. Withdrawals</h4>
            <p>AXN tokens can be converted to TON and withdrawn to your personal wallet. Withdrawals are subject to system verification, minimum limits, and available liquidity. Users must provide valid wallet addresses.</p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-1 italic uppercase tracking-tighter">5. Account Suspension & Bans</h4>
            <p>We reserve the right to suspend or permanently ban accounts without prior notice if we detect violations of our policies, including but not limited to: multiple accounts, bot usage, script automation, or exploitation of system bugs.</p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-1 italic uppercase tracking-tighter">6. Fraud & Abuse</h4>
            <p>Any attempt to manipulate the system, exploit technical vulnerabilities, or provide false information during verification will result in immediate termination of the account and forfeiture of all accumulated rewards.</p>
          </div>
        </div>
      )
    },
    privacy: {
      title: t('privacy_policy'),
      content: (
        <div className="space-y-4 text-gray-400 text-sm">
          <p>Money AXN respects your privacy and is committed to protecting your personal data.</p>
          <div>
            <h4 className="text-white font-bold mb-1 italic uppercase tracking-tighter">1. Data Collection</h4>
            <p>We collect essential data to provide our services, including your Telegram User ID (UID), device information (model, OS version), IP address, and app usage statistics.</p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-1 italic uppercase tracking-tighter">2. Data Storage & Security</h4>
            <p>Your data is stored securely using industry-standard encryption. We retain your information for as long as your account is active or as needed to provide you with our services and comply with legal obligations.</p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-1 italic uppercase tracking-tighter">3. Third-Party Services</h4>
            <p>We integrate with third-party payment gateways for processing TON transactions. These services may collect non-personal data according to their own privacy policies.</p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-1 italic uppercase tracking-tighter">4. Your Rights</h4>
            <p>You have the right to access, correct, or request the deletion of your data. Contact our support team for any privacy-related inquiries.</p>
          </div>
        </div>
      )
    },
    acceptable: {
      title: t('acceptable_use'),
      content: (
        <div className="space-y-4 text-gray-400 text-sm">
          <p>To maintain a fair ecosystem for all users, you must adhere to the following rules:</p>
          <div>
            <h4 className="text-rose-400 font-bold mb-1 flex items-center gap-2 italic uppercase tracking-tighter">
              Prohibited Actions
            </h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Creating or managing multiple accounts for a single user.</li>
              <li>Using automated bots, scripts, or any third-party software to simulate activity.</li>
              <li>Exploiting technical vulnerabilities or bugs for unauthorized gain.</li>
              <li>Attempting to manipulate conversion rates.</li>
              <li>Reverse-engineering, decompiling, or attempting to extract source code from the app.</li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-1 flex items-center gap-2 italic uppercase tracking-tighter">
              <ShieldCheck className="w-4 h-4 text-[#B9FF66]" />
              Multi-Account Abuse
            </h4>
            <p>Our system employs advanced detection for multi-account activity. Users found operating multiple profiles to inflate referral rewards will face permanent bans across all linked accounts.</p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-1 flex items-center gap-2 italic uppercase tracking-tighter">
              <Check className="w-4 h-4 text-green-500" />
              Compliance
            </h4>
            <p>All users must use the app in compliance with applicable local and international laws.</p>
          </div>
        </div>
      )
    }
  };

  const photoUrl = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.photo_url;

  return (
    <Layout>
      <main className="max-w-md mx-auto px-4 pt-4 pb-24 overflow-y-auto bg-[#050505]">
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] border-2 border-[#B9FF66]/30 flex items-center justify-center overflow-hidden shadow-lg shadow-[#B9FF66]/10">
              {photoUrl ? (
                <img 
                  src={photoUrl} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#B9FF66] to-[#80B542] flex items-center justify-center text-black font-black text-xl">
                  {(user as any)?.firstName?.[0] || 'U'}
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-white font-black text-lg leading-none tracking-tight">
                {(user as any)?.firstName || (user as any)?.username || 'User'}
              </span>
              <span className="text-[#B9FF66] text-[10px] font-black uppercase tracking-widest mt-1 opacity-90">
                ID: {uid}
              </span>
            </div>
          </div>
          
          <button 
            onClick={copyUid}
            className="bg-[#1a1a1a] p-2.5 rounded-xl border border-white/5 hover:bg-white/5 transition-all active:scale-95"
          >
            {copied ? <Check className="w-4 h-4 text-[#B9FF66]" /> : <Copy className="w-4 h-4 text-gray-400" />}
          </button>
        </div>

        <div className="bg-[#141414] rounded-2xl p-4 border border-white/5 mb-4">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-[#0d0d0d] rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-[#1a1a1a] border border-white/10 flex items-center justify-center">
                  <img src="/images/ton.png" alt="TON" className="w-4 h-4 object-cover rounded-full" />
                </div>
                <span className="text-[#8E8E93] text-[8px] font-black uppercase tracking-widest">App Balance</span>
              </div>
              <p className="text-2xl font-black text-white leading-none tabular-nums">
                {tonAppBalance.toFixed(3)}
              </p>
              <p className="text-[#B9FF66] text-[9px] font-bold uppercase tracking-wider mt-1">TON</p>
            </div>

            <div className="bg-[#0d0d0d] rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-[#1a1a1a] border border-white/10 flex items-center justify-center">
                  <img src="/images/ton.png" alt="TON" className="w-4 h-4 object-cover rounded-full" />
                </div>
                <span className="text-[#8E8E93] text-[8px] font-black uppercase tracking-widest">Withdraw</span>
              </div>
              <p className="text-2xl font-black text-white leading-none tabular-nums">
                {tonWithdrawBalance.toFixed(3)}
              </p>
              <p className="text-blue-400 text-[9px] font-bold uppercase tracking-wider mt-1">TON</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={() => setIsTopUpOpen(true)}
              className="h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-600/20"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Deposit
            </Button>
            <Button 
              onClick={() => setIsWithdrawOpen(true)}
              className="h-12 bg-white hover:bg-zinc-200 text-black rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-white/10"
            >
              <Minus className="w-4 h-4 mr-1.5" />
              Withdraw
            </Button>
          </div>
        </div>

        <div className="bg-[#141414] rounded-2xl p-4 border border-white/5 mb-4">
          <button 
            onClick={() => setIsTransactionsOpen(true)}
            className="w-full flex items-center justify-between hover:bg-white/[0.02] transition-all rounded-xl p-2 -m-2"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20 flex items-center justify-center">
                <ArrowLeftRight className="w-5 h-5 text-amber-400" strokeWidth={1.5} />
              </div>
              <div className="text-left">
                <span className="text-white font-bold text-sm block">Transactions</span>
                <span className="text-[#8E8E93] text-[10px] font-semibold">View all your activity</span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="bg-[#141414] rounded-2xl p-4 border border-white/5 space-y-2 mb-4">
          <h3 className="text-[9px] uppercase font-black text-[#8E8E93] tracking-widest mb-3 px-1">Quick Actions</h3>
          <ProfileItem 
            icon={<Globe2 className="w-5 h-5 text-purple-400" strokeWidth={1.5} />} 
            label="Language" 
            value={languages.find(l => l.code === language)?.name}
            onClick={() => setIsLanguageOpen(true)}
          />
          <ProfileItem 
            icon={<Headphones className="w-5 h-5 text-blue-400" strokeWidth={1.5} />} 
            label="Contact Support" 
            onClick={() => openLink('https://t.me/+fahpWJGmJEowZGQ1')}
          />
        </div>

        <div className="bg-[#141414] rounded-2xl p-4 border border-white/5 space-y-2 mb-4">
          <h3 className="text-[9px] uppercase font-black text-[#8E8E93] tracking-widest mb-3 px-1">Legal & Info</h3>
          <ProfileItem 
            icon={<Shield className="w-5 h-5 text-emerald-400" strokeWidth={1.5} />} 
            label="Terms & Conditions" 
            onClick={() => setSelectedLegal('terms')}
          />
          <ProfileItem 
            icon={<ScrollText className="w-5 h-5 text-orange-400" strokeWidth={1.5} />} 
            label="Privacy Policy" 
            onClick={() => setSelectedLegal('privacy')}
          />
          <ProfileItem 
            icon={<AlertCircle className="w-5 h-5 text-rose-400" strokeWidth={1.5} />} 
            label="Acceptable Use" 
            onClick={() => setSelectedLegal('acceptable')}
          />
          {(user as any)?.isAdmin && (
            <ProfileItem 
              icon={<ShieldCheck className="w-5 h-5 text-red-500" strokeWidth={1.5} />} 
              label="Admin Panel" 
              onClick={() => navigate('/admin')}
            />
          )}
        </div>

        <AnimatePresence>
          {selectedLegal && (
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-0 bg-[#050505] z-[100] flex flex-col"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white uppercase tracking-tight italic">
                  {legalContent[selectedLegal].title}
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {legalContent[selectedLegal].content}
              </div>
              <div className="p-6 border-t border-white/5">
                <Button 
                  className="w-full h-14 bg-[#141414] border border-white/5 rounded-2xl font-black uppercase italic tracking-wider text-white"
                  onClick={() => setSelectedLegal(null)}
                >
                  {t('back')}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isLanguageOpen && (
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-0 bg-[#050505] z-[100] flex flex-col"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white uppercase tracking-tight italic">
                  {t('app_language')}
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setIsLanguageOpen(false)}>
                  <X className="w-6 h-6" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => selectLanguage(lang.code)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                      language === lang.code 
                        ? "bg-[#B9FF66]/10 border-[#B9FF66] text-[#B9FF66]" 
                        : "bg-[#141414] border-white/5 text-gray-400"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{lang.flag}</span>
                      <span className="font-bold">{lang.name}</span>
                    </div>
                    {language === lang.code && <Check className="w-5 h-5" />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <TransactionsOverlay 
          open={isTransactionsOpen} 
          onOpenChange={setIsTransactionsOpen} 
        />

        <TopUpPopup
          open={isTopUpOpen}
          onOpenChange={setIsTopUpOpen}
          telegramId={(user as any)?.telegram_id || (user as any)?.id || ""}
        />

        <WithdrawalPopup
          open={isWithdrawOpen}
          onOpenChange={setIsWithdrawOpen}
          tonBalance={Number((user as any)?.tonAppBalance) || 0}
        />
      </main>
    </Layout>
  );
}

function ProfileItem({ icon, label, value, onClick }: { icon: React.ReactNode, label: string, value?: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="w-full bg-[#0d0d0d] border border-white/5 rounded-xl p-3.5 flex items-center justify-between hover:bg-white/[0.04] transition-all active:scale-[0.98]"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
          {icon}
        </div>
        <span className="font-bold text-[13px] text-gray-200">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {value && <span className="text-[10px] font-black text-[#B9FF66] bg-[#B9FF66]/10 px-2.5 py-1 rounded-lg uppercase">{value}</span>}
        <ChevronRight className="w-4 h-4 text-gray-600" />
      </div>
    </button>
  );
}
