import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import KapsuOrbitalPortal from './KapsuOrbitalPortal';
import { getBrazilMoonPhase, MOON_PHASE_NAMES } from '../../utils/moonPhase';

export interface KapsuThemeControlProps {
  className?: string;
  compact?: boolean;
  interactive?: boolean;
  orbitalTarget?: boolean;
  renderPortal?: boolean;
  portalVisible?: boolean;
}

const CLICK_DELAY_MS = 280;

export const KapsuThemeControl: React.FC<KapsuThemeControlProps> = ({
  className = '',
  interactive = true,
  orbitalTarget = true,
  renderPortal = true,
  portalVisible = true,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isAnimating, setIsAnimating] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [realMoonMode, setRealMoonMode] = useState(false);
  const horizonRef = useRef<HTMLDivElement>(null);
  const clickTimeoutRef = useRef<number | null>(null);
  const clickCountRef = useRef(0);

  const dispatch = (name: string, detail?: Record<string, unknown>) => {
    window.dispatchEvent(new CustomEvent(name, detail ? { detail } : undefined));
  };

  useEffect(() => {
    dispatch('kapsu-orbital-target-changed');
  }, [orbitalTarget]);

  useEffect(() => {
    dispatch('kapsu-moon-phase-changed', { phase: realMoonMode ? getBrazilMoonPhase() : 0 });
    if (!realMoonMode) return;
    const interval = window.setInterval(() => dispatch('kapsu-moon-phase-changed', { phase: getBrazilMoonPhase() }), 60 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [realMoonMode]);

  useEffect(() => () => {
    if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
  }, []);

  const handleClick = (event: React.MouseEvent | React.KeyboardEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!interactive || isAnimating) return;

    clickCountRef.current += 1;
    if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    clickTimeoutRef.current = window.setTimeout(() => {
      const clicks = clickCountRef.current;
      clickCountRef.current = 0;
      if (clicks >= 2) {
        setRealMoonMode(current => !current);
        return;
      }
      setIsAnimating(true);
      dispatch('kapsu-start-orbital-anim');
      window.setTimeout(() => setIsAnimating(false), 2450);
    }, CLICK_DELAY_MS);
  };

  const phase = realMoonMode ? getBrazilMoonPhase() : 0;
  const moonDescription = realMoonMode
    ? `${MOON_PHASE_NAMES[phase]} (fase real no Brasil)`
    : 'Lua Cheia (padrao)';
  const tooltip = `${moonDescription}. 1 clique: trocar tema. 2 cliques: alternar fase real.`;

  return (
    <div className={`relative inline-flex items-center select-none ${className}`} ref={horizonRef} data-kapsu-horizon={orbitalTarget ? 'true' : undefined} data-kapsu-theme-animation="true" aria-hidden={!interactive}>
      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label={tooltip}
        title={tooltip}
        aria-pressed={isDark}
        disabled={isAnimating || !interactive}
        tabIndex={interactive ? 0 : -1}
        className={`group relative flex h-11 w-11 flex-col items-center justify-center rounded-full border-0 bg-transparent transition-all duration-300 transform-gpu focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-pointer ${isAnimating ? 'opacity-70' : 'cursor-pointer hover:scale-110 active:scale-95'}`}
      >
        <div className="pointer-events-none absolute -bottom-0.5 left-1/2 z-25 flex w-8 -translate-x-1/2 flex-col items-center">
          {isDark ? (
            <div className="flex w-full flex-col items-center gap-0.5">
              <div className={`h-[1.5px] rounded-full bg-gradient-to-r from-transparent via-emerald-300/80 to-transparent transition-all duration-300 ${isHovered ? 'w-8 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'w-6 opacity-70'}`} />
              <div className="h-[1px] w-4 rounded-full bg-emerald-400/40" />
            </div>
          ) : (
            <div className={`h-[1.5px] rounded-full bg-gradient-to-r from-transparent via-amber-400/90 to-transparent transition-all duration-300 ${isHovered ? 'w-8 shadow-[0_0_8px_rgba(245,158,11,0.8)]' : 'w-6 opacity-70'}`} />
          )}
        </div>
      </button>
      {renderPortal && <KapsuOrbitalPortal visible={portalVisible} />}
    </div>
  );
};

export default KapsuThemeControl;