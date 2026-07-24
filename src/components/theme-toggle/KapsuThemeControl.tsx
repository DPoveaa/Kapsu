import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import KapsuOrbitalPortal from './KapsuOrbitalPortal';
import { MOON_PHASE_NAMES } from './MoonIcon';

export interface KapsuThemeControlProps {
  className?: string;
  compact?: boolean;
  interactive?: boolean;
  orbitalTarget?: boolean;
  renderPortal?: boolean;
}

export const KapsuThemeControl: React.FC<KapsuThemeControlProps> = ({
  className = '',
  interactive = true,
  orbitalTarget = true,
  renderPortal = true,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [isAnimating, setIsAnimating] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [moonPhase, setMoonPhase] = useState<number>(0);
  const [phaseToastText, setPhaseToastText] = useState<string | null>(null);

  const horizonRef = useRef<HTMLDivElement>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clickCountRef = useRef<number>(0);
  const lastClickTimeRef = useRef<number>(0);
  const isHoldTriggeredRef = useRef(false);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('kapsu-orbital-target-changed'));
  }, [orbitalTarget]);

  // Carrega fase da lua inicial do localStorage
  useEffect(() => {
    try {
      const savedPhase = localStorage.getItem('kapsu_moon_phase');
      if (savedPhase !== null) {
        setMoonPhase(parseInt(savedPhase, 10));
      }
    } catch {
      // Ignora falhas de localStorage
    }

    try {
      const hintDismissed = localStorage.getItem('kapsu_theme_hint_dismissed');
      if (!hintDismissed) {
        setShowHint(true);
        const timer = setTimeout(() => dismissHint(), 4500);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignora falhas de localStorage
    }
  }, []);

  const dismissHint = () => {
    setShowHint(false);
    try {
      localStorage.setItem('kapsu_theme_hint_dismissed', 'true');
    } catch {
      // Ignora falhas de localStorage
    }
  };

  // PRESSIONAR E SEGURAR (Pressionar por > 450ms dispara Estrela Cadente Única para testes)
  const handleMouseDown = () => {
    isHoldTriggeredRef.current = false;
    holdTimeoutRef.current = setTimeout(() => {
      isHoldTriggeredRef.current = true;
      window.dispatchEvent(new CustomEvent('kapsu-trigger-shooting-star'));

      setPhaseToastText('⭐ Estrela Cadente!');
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => {
        setPhaseToastText(null);
      }, 2000);
    }, 450);
  };

  const handleMouseUp = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
  };

  // TRATAMENTO DE CLIQUES (1 clique: Tema, 2 cliques: Fase da Lua, 3 cliques: Chuva de Estrelas)
  const handleClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isHoldTriggeredRef.current) {
      isHoldTriggeredRef.current = false;
      return;
    }

    if (isAnimating) return;
    if (showHint) dismissHint();

    const now = Date.now();
    const timeDiff = now - lastClickTimeRef.current;
    lastClickTimeRef.current = now;

    if (timeDiff < 380) {
      clickCountRef.current += 1;
    } else {
      clickCountRef.current = 1;
    }

    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    clickTimeoutRef.current = setTimeout(() => {
      const count = clickCountRef.current;
      clickCountRef.current = 0;

      if (count === 3) {
        // ── 3 CLIQUES RÁPIDOS: Chuva de Estrelas Cadentes! ──
        window.dispatchEvent(new CustomEvent('kapsu-trigger-meteor-shower'));

        setPhaseToastText('🌌 Chuva de Estrelas Cadentes!');
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = setTimeout(() => {
          setPhaseToastText(null);
        }, 2800);
      } else if (count === 2) {
        // ── 2 CLIQUES RÁPIDOS: Cicla Fase da Lua (0 a 7) ──
        const nextPhase = (moonPhase + 1) % 8;
        setMoonPhase(nextPhase);

        try {
          localStorage.setItem('kapsu_moon_phase', nextPhase.toString());
        } catch {
          // Ignora falhas de localStorage
        }

        window.dispatchEvent(
          new CustomEvent('kapsu-moon-phase-changed', { detail: { phase: nextPhase } })
        );

        const phaseName = MOON_PHASE_NAMES[nextPhase];
        setPhaseToastText(phaseName);

        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = setTimeout(() => {
          setPhaseToastText(null);
        }, 2200);
      } else {
        // ── 1 CLIQUE SIMPLES: Troca Orbital de Tema ──
        setIsAnimating(true);
        window.dispatchEvent(new CustomEvent('kapsu-start-orbital-anim'));

        setTimeout(() => {
          setIsAnimating(false);
        }, 2450);
      }
    }, 280);
  };

  return (
    <div
      className={`relative inline-flex items-center select-none ${className}`}
      ref={horizonRef}
      data-kapsu-horizon={orbitalTarget ? 'true' : undefined}
      data-kapsu-theme-animation="true"
      aria-hidden={!interactive}
    >
      {/* Botão de Controle Acessível Invisível com Área Mínima de Toque (44x44px) */}
      <button
        type="button"
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        onMouseEnter={() => setIsHovered(true)}
        aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
        title={
          isDark
            ? 'Ativar modo claro (2 cliques: Mudar fase da lua | 3 cliques: Chuva de estrelas 🌌 | Segurar: Estrela cadente ⭐)'
            : 'Ativar modo escuro'
        }
        aria-pressed={isDark}
        disabled={isAnimating || !interactive}
        tabIndex={interactive ? 0 : -1}
        className={`
          group relative flex flex-col items-center justify-center
          w-11 h-11 rounded-full cursor-pointer transition-all duration-300 transform-gpu bg-transparent border-0
          focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 z-30
          ${isAnimating ? 'cursor-wait opacity-50' : 'hover:scale-110 active:scale-95'}
        `}
      >
        {/* ── DESIGN DO HORIZONTE DISCRETO EM BAIXO DO ÍCONE ── */}
        <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-8 pointer-events-none flex flex-col items-center z-25">
          {isDark ? (
            /* Horizonte Noturno: Reflexo de luar suave sobre a água com 2 linhas cintilantes */
            <div className="w-full flex flex-col items-center gap-0.5">
              <div
                className={`h-[1.5px] rounded-full bg-gradient-to-r from-transparent via-emerald-300/80 to-transparent transition-all duration-300 ${
                  isHovered ? 'w-8 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'w-6 opacity-70'
                }`}
              />
              <div className="h-[1px] w-4 rounded-full bg-emerald-400/40" />
            </div>
          ) : (
            /* Horizonte Diurno: Iluminação quente dourada */
            <div className="w-full flex flex-col items-center gap-0.5">
              <div
                className={`h-[1.5px] rounded-full bg-gradient-to-r from-transparent via-amber-400/90 to-transparent transition-all duration-300 ${
                  isHovered ? 'w-8 shadow-[0_0_8px_rgba(245,158,11,0.8)]' : 'w-6 opacity-70'
                }`}
              />
            </div>
          )}
        </div>
      </button>

      {/* Toast Flutuante Informativo */}
      {phaseToastText && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 animate-fade-in pointer-events-none">
          <div className="bg-emerald-950/95 text-emerald-100 text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-2xl border border-emerald-500/60 whitespace-nowrap flex items-center gap-1.5 backdrop-blur-md">
            <span>{phaseToastText}</span>
          </div>
        </div>
      )}

      {/* Tooltip de Orientação para Primeira Visita */}
      {showHint && !phaseToastText && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 animate-bounce-short pointer-events-auto">
          <div className="relative bg-emerald-900 text-emerald-100 text-[11px] font-semibold px-3 py-1.5 rounded-xl shadow-xl border border-emerald-600/50 whitespace-nowrap flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Escolha seu tema</span>
            <button
              type="button"
              onClick={dismissHint}
              className="ml-1 text-emerald-300 hover:text-white text-xs font-bold leading-none"
              aria-label="Fechar dica"
            >
              ×
            </button>
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-emerald-900 border-t border-l border-emerald-600/50 rotate-45" />
          </div>
        </div>
      )}

      {/* Portal Celestial Único (Gerencia o Sol, Lua, Estrelas e Chuva de Meteoros) */}
      {renderPortal && <KapsuOrbitalPortal />}
    </div>
  );
};

export default KapsuThemeControl;
