import { useQuery } from "@tanstack/react-query";
import { forwardRef } from "react";

const Header = forwardRef<HTMLDivElement>((_, ref) => {
  const { data: user } = useQuery<any>({
    queryKey: ['/api/auth/user'],
    retry: false,
  });

  const photoUrl = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.photo_url;
  const name = (user as any)?.firstName
    ? `${(user as any).firstName}${(user as any).lastName ? ' ' + (user as any).lastName : ''}`
    : (user as any)?.username || 'User';
  const uid = (user as any)?.referralCode || (user as any)?.id?.slice(0, 8) || '—';
  const memberSince = (user as any)?.createdAt
    ? new Date((user as any).createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  const satBalance = Math.floor(parseFloat((user as any)?.balance || "0"));

  return (
    <div
      ref={ref}
      className="fixed top-0 left-0 right-0 z-40 bg-[#0f0f0f]/95 border-b border-white/5 backdrop-blur-md"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}
    >
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 border border-white/10">
            {photoUrl ? (
              <img src={photoUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#F5C542] to-[#d4920a] flex items-center justify-center text-black font-black text-base">
                {name[0]?.toUpperCase() || 'U'}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-white font-black text-sm leading-none truncate">{name}</p>
            <p className="text-white/40 text-[11px] mt-1">
              ID: <span className="text-[#F5C542] font-bold">{uid}</span>
            </p>
            {memberSince && (
              <p className="text-white/30 text-[10px] mt-0.5">Member since {memberSince}</p>
            )}
          </div>
        </div>

        {/* SAT Balance */}
        <div className="flex items-center gap-1.5 bg-[#141414] border border-white/8 rounded-2xl px-3 py-2">
          <img src="/sat-icon.png" alt="SAT" className="w-4 h-4 rounded-full object-cover" />
          <span className="text-white font-black text-sm tabular-nums">
            {satBalance.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
});

Header.displayName = 'Header';

export default Header;
