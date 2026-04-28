import { forwardRef } from "react";
import { HiMenuAlt2, HiUserGroup } from "react-icons/hi";

interface HeaderProps {
  onMenuClick?: () => void;
  onInviteClick?: () => void;
}

const Header = forwardRef<HTMLDivElement, HeaderProps>(({ onMenuClick, onInviteClick }, ref) => {
  return (
    <div
      ref={ref}
      className="fixed top-0 left-0 right-0 z-40 bg-[#0f0f0f]/95 border-b border-white/5 backdrop-blur-md"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}
    >
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
        <button
          onClick={onMenuClick}
          aria-label="Open menu"
          className="p-1 active:scale-95 transition-transform"
        >
          <HiMenuAlt2 className="w-7 h-7" style={{ color: "#60a5fa" }} />
        </button>

        <button
          onClick={onInviteClick}
          aria-label="Invite friends"
          className="p-1 active:scale-95 transition-transform"
        >
          <HiUserGroup className="w-7 h-7" style={{ color: "#F5C542" }} />
        </button>
      </div>
    </div>
  );
});

Header.displayName = 'Header';

export default Header;
