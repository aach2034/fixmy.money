'use client';

import React, { memo, useMemo } from 'react';

interface AppLogoProps {
  src?: string; // Retained for backwards compatibility
  iconName?: string; // Retained for backwards compatibility
  size?: number; // Size for icon/image
  className?: string; // Additional classes
  onClick?: () => void; // Click handler
}

const AppLogo = memo(function AppLogo({
  size = 64,
  className = '',
  onClick,
}: AppLogoProps) {
  // Memoize className calculation
  const containerClassName = useMemo(() => {
    const classes = ['flex items-center'];
    if (onClick) classes.push('cursor-pointer hover:opacity-80 transition-opacity');
    if (className) classes.push(className);
    return classes.join(' ');
  }, [onClick, className]);

  return (
    <div className={containerClassName} onClick={onClick}>
      <span
        aria-hidden="true"
        className="grid flex-shrink-0 place-items-center rounded-[30%] bg-[#083a32] font-bold text-white"
        style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.42)) }}
      >
        F
      </span>
    </div>
  );
});

export default AppLogo;
