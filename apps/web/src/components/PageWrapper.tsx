import React from 'react';

interface PageWrapperProps {
  children: React.ReactNode;
  /** Extra class for the inner container */
  containerClass?: string;
  /** Use centred flex layout (for auth pages) */
  centered?: boolean;
}

/**
 * Shared full-page wrapper that provides:
 *  - Dark gradient background
 *  - Animated orb decorations
 *  - Consistent footer
 */
const PageWrapper: React.FC<PageWrapperProps> = ({
  children,
  containerClass = '',
  centered = false,
}) => {
  return (
    <div className="page-bg flex flex-col">
      {/* Ambient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div
          className="orb w-[500px] h-[500px] bg-primary-600/15 -top-32 -left-32"
          style={{ animationDelay: '0s' }}
        />
        <div
          className="orb w-[600px] h-[600px] bg-accent-500/10 -bottom-48 -right-48"
          style={{ animationDelay: '1.5s' }}
        />
        <div
          className="orb w-[300px] h-[300px] bg-primary-400/10 top-1/2 left-2/3"
          style={{ animationDelay: '3s' }}
        />
      </div>

      {/* Grid noise overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg,transparent,transparent 40px,rgba(255,255,255,.3) 40px,rgba(255,255,255,.3) 41px), repeating-linear-gradient(90deg,transparent,transparent 40px,rgba(255,255,255,.3) 40px,rgba(255,255,255,.3) 41px)',
        }}
        aria-hidden
      />

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col">
        {children}
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/8 py-5 mt-8">
        <div className="container mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-white/35 text-sm">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="GECHO YEMKINA EQUB" className="h-6 w-6 object-contain opacity-70" />
            <span>© 2026 GECHO YEMKINA EQUB. All rights reserved.</span>
          </div>
          <div className="flex gap-4">
            <span className="hover:text-white/60 transition-colors cursor-pointer">Privacy</span>
            <span className="hover:text-white/60 transition-colors cursor-pointer">Terms</span>
            <span className="hover:text-white/60 transition-colors cursor-pointer">Support</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PageWrapper;
