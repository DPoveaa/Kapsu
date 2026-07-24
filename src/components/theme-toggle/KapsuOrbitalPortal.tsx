import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../context/ThemeContext';
import MoonIcon from './MoonIcon';
import SunIcon from './SunIcon';
import StarSparkles from './StarSparkles';
import ShootingStarCanvas, { MeteorItem } from './ShootingStarCanvas';

export const KapsuOrbitalPortal: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const [animStage, setAnimStage] = useState<'idle' | 'opening' | 'orbiting' | 'closing'>('idle');
  const [progress, setProgress] = useState(0);
  const [targetTheme, setTargetTheme] = useState<'light' | 'dark'>(isDark ? 'dark' : 'light');
  const [moonPhase, setMoonPhase] = useState<number>(0);
  const [meteors, setMeteors] = useState<MeteorItem[]>([]);

  const [capsulePos, setCapsulePos] = useState({ x: 0, y: 0 });
  const [horizonPos, setHorizonPos] = useState({ x: 0, y: 0 });
  const [headerBounds, setHeaderBounds] = useState<{ top: number; bottom: number; left: number; right: number } | null>(null);
  const [isMeasured, setIsMeasured] = useState(false);

  const animFrameRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);
  const isDarkRef = useRef(isDark);
  const toggleThemeRef = useRef(toggleTheme);
  const failedRollsRef = useRef(0);
  const meteorIdCounterRef = useRef(0);

  useEffect(() => {
    isDarkRef.current = isDark;
    toggleThemeRef.current = toggleTheme;
  }, [isDark, toggleTheme]);

  // Carrega fase da lua salva no localStorage
  useEffect(() => {
    try {
      const savedPhase = localStorage.getItem('kapsu_moon_phase');
      if (savedPhase !== null) {
        setMoonPhase(parseInt(savedPhase, 10));
      }
    } catch {
      // Ignora falhas de localStorage
    }

    const handlePhaseChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail.phase === 'number') {
        setMoonPhase(detail.phase);
      }
    };

    const handleForceSingleMeteor = () => {
      spawnSingleMeteor();
    };

    const handleForceMeteorShower = () => {
      spawnMeteorShower();
    };

    window.addEventListener('kapsu-moon-phase-changed', handlePhaseChange);
    window.addEventListener('kapsu-trigger-shooting-star', handleForceSingleMeteor);
    window.addEventListener('kapsu-trigger-meteor-shower', handleForceMeteorShower);

    return () => {
      window.removeEventListener('kapsu-moon-phase-changed', handlePhaseChange);
      window.removeEventListener('kapsu-trigger-shooting-star', handleForceSingleMeteor);
      window.removeEventListener('kapsu-trigger-meteor-shower', handleForceMeteorShower);
    };
  }, []);

  // GERADOR DIVERSIFICADO DE METEOROS COM VÔO FLUIDO E DESMONTAGEM SÍNCRONA
  const spawnSingleMeteor = (delay = 0, forcedDirection?: boolean) => {
    setTimeout(() => {
      updateCoordinates();

      const minX = capsulePos.x - 45;
      const maxX = horizonPos.x + 20;
      const rangeX = Math.max(90, maxX - minX);

      const containerEl = Array.from(
        document.querySelectorAll('[data-kapsu-header-stars-container]')
      ).find((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      const containerRect = containerEl ? containerEl.getBoundingClientRect() : null;
      const containerLeft = containerRect ? containerRect.left : 0;
      const startX = minX + Math.random() * rangeX - containerLeft;

      // startY relativo ao container: estrela começa 45px acima do topo do header
      const relStartY = containerRect ? -45 : -45;
      const containerHeight = containerRect ? containerRect.height : (headerBounds ? headerBounds.bottom - headerBounds.top : 80);

      // endY calculado para que opacity=0 coincida com a borda inferior do container:
      // Na animação, opacity chega a 0 em 100%, e o star já está invisível em ~72%.
      // Para o clipping ser imperceptível, endY deve ser tal que em 72% a estrela
      // ainda esteja dentro do container, e em 100% (já opacity=0) passe da borda.
      // endY = relStartY + (containerHeight - relStartY) / 0.72
      const totalTravel = (containerHeight - relStartY) / 0.72;
      const relEndY = relStartY + totalTravel;

      const startY = relStartY;
      const endY = relEndY;

      const dirRight = forcedDirection !== undefined ? forcedDirection : Math.random() > 0.5;
      const deltaX = 35 + Math.random() * 45;
      const endX = dirRight ? startX + deltaX : startX - deltaX;

      const duration = 750 + Math.random() * 380;
      const size = 10 + Math.random() * 12;
      const tailLength = 24 + Math.random() * 24;
      const tailThickness = 1.5 + Math.random() * 2;

      const colors = ['#A7F3D0', '#FDE047', '#6EE7B7', '#FFFFFF'];
      const glowColor = colors[Math.floor(Math.random() * colors.length)];
      const glowIntensity = 8 + Math.random() * 12;

      const newMeteor: MeteorItem = {
        id: meteorIdCounterRef.current++,
        startX,
        startY,
        endX,
        endY,
        duration,
        delay: 0,
        size,
        tailLength,
        tailThickness,
        glowColor,
        glowIntensity,
      };

      setMeteors((prev) => [...prev, newMeteor]);

      // Desmontagem síncrona exatamente no término da duração da animação (sem congelamentos)
      setTimeout(() => {
        setMeteors((prev) => prev.filter((m) => m.id !== newMeteor.id));
      }, duration);
    }, delay);
  };

  // CHUVA DE ESTRELAS CADENTES
  const spawnMeteorShower = () => {
    failedRollsRef.current = 0;
    const showerDirRight = Math.random() > 0.5;

    for (let i = 0; i < 7; i++) {
      spawnSingleMeteor(i * 450, showerDirRight);
    }
  };

  // SISTEMA DE SORTE E PITY ESTRITAMENTE NO MODO ESCURO
  useEffect(() => {
    if (!isDark || animStage !== 'idle') return;

    const rollTimer = setInterval(() => {
      let chance = 0.001; // Base 1 em 1000
      const failed = failedRollsRef.current;

      if (failed >= 3 && failed < 6) {
        chance = 0.15 + (failed - 3) * 0.25;
      } else if (failed >= 6) {
        chance = 1.0;
      }

      if (Math.random() < chance) {
        if (Math.random() < 0.05) {
          spawnMeteorShower();
        } else {
          spawnSingleMeteor();
          failedRollsRef.current = 0;
        }
      } else {
        failedRollsRef.current += 1;
      }
    }, 4500);

    return () => clearInterval(rollTimer);
  }, [isDark, animStage]);

  // Recalcula coordenadas BoundingBox exatas
  const updateCoordinates = () => {
    if (typeof document === 'undefined') return;

    const firstVisible = (selector: string) =>
      Array.from(document.querySelectorAll(selector)).find((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });

    const capsuleSeamEl = firstVisible('[data-kapsu-capsule-seam]');
    const capsuleRootEl = firstVisible('[data-kapsu-capsule]');
    const horizonEl = firstVisible('[data-kapsu-horizon="true"]');
    const headerEl = firstVisible('[data-kapsu-header-stars-container]') ?? firstVisible('header');

    if (headerEl) {
      const headRect = headerEl.getBoundingClientRect();
      setHeaderBounds({
        top: headRect.top,
        bottom: headRect.bottom,
        left: headRect.left,
        right: headRect.right,
      });
    }

    if (horizonEl && (capsuleSeamEl || capsuleRootEl)) {
      const hRect = horizonEl.getBoundingClientRect();

      if (capsuleSeamEl) {
        const sRect = capsuleSeamEl.getBoundingClientRect();
        setCapsulePos({
          x: sRect.right,
          y: sRect.top + sRect.height / 2,
        });
      } else if (capsuleRootEl) {
        const cRect = capsuleRootEl.getBoundingClientRect();
        setCapsulePos({
          x: cRect.left + cRect.width / 2,
          y: cRect.top + cRect.height * 0.71,
        });
      }

      setHorizonPos({
        x: hRect.left + hRect.width / 2,
        y: hRect.top + hRect.height / 2,
      });

      setIsMeasured(true);
    }
  };

  useEffect(() => {
    updateCoordinates();
    const t1 = setTimeout(updateCoordinates, 80);
    const t2 = setTimeout(updateCoordinates, 350);

    window.addEventListener('resize', updateCoordinates);
    window.addEventListener('scroll', updateCoordinates);
    window.addEventListener('kapsu-orbital-target-changed', updateCoordinates);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', updateCoordinates);
      window.removeEventListener('scroll', updateCoordinates);
      window.removeEventListener('kapsu-orbital-target-changed', updateCoordinates);
    };
  }, []);

  // Ouve o evento de disparo da animação orbital
  useEffect(() => {
    const handleTrigger = () => {
      if (isAnimatingRef.current) return;
      isAnimatingRef.current = true;

      updateCoordinates();
      const nextTheme = isDarkRef.current ? 'light' : 'dark';
      setTargetTheme(nextTheme);

      const openingDuration = 550;
      const orbitDuration = 1200;
      const closingSettleDuration = 600;
      const fullTransitionDuration = 1900;

      toggleThemeRef.current(fullTransitionDuration);
      if (nextTheme === 'dark') {
        window.dispatchEvent(new CustomEvent('kapsu-dark-just-activated'));
      }

      setAnimStage('opening');
      window.dispatchEvent(new CustomEvent('kapsu-orbital-toggle', { detail: { phase: 'opening' } }));

      setTimeout(() => {
        setAnimStage('orbiting');
        let startTime: number | null = null;
        const duration = orbitDuration;
        // O tema já começou a interpolar junto com a abertura da cápsula.
        let themeSwitched = true;
        let closingTriggered = false;

        const step = (timestamp: number) => {
          if (!startTime) startTime = timestamp;
          const elapsed = timestamp - startTime;
          const p = Math.min(elapsed / duration, 1);
          setProgress(p);

          if (p >= 0.68 && !themeSwitched) {
            themeSwitched = true;
            // Tempo restante até o fim do orbiting + closing settle ≈ (1-p)*duration + 300ms
            const remainingMs = Math.round((1 - p) * duration + 300);
            const goingDark = nextTheme === 'dark';
            toggleThemeRef.current(remainingMs);
            if (goingDark) {
              // Sinaliza que o escuro acabou de ser ativado — StarSparkles faz fade-in
              window.dispatchEvent(new CustomEvent('kapsu-dark-just-activated'));
            }
          }

          if (p >= 0.78 && !closingTriggered) {
            closingTriggered = true;
            setAnimStage('closing');
            window.dispatchEvent(new CustomEvent('kapsu-orbital-toggle', { detail: { phase: 'closing' } }));
          }

          if (p < 1) {
            animFrameRef.current = requestAnimationFrame(step);
          } else {
            setTimeout(() => {
              setAnimStage('idle');
              setProgress(0);
              isAnimatingRef.current = false;
              window.dispatchEvent(new CustomEvent('kapsu-orbital-toggle', { detail: { phase: 'idle' } }));
            }, closingSettleDuration);
          }
        };

        animFrameRef.current = requestAnimationFrame(step);
      }, openingDuration);
    };

    window.addEventListener('kapsu-start-orbital-anim', handleTrigger);
    return () => {
      window.removeEventListener('kapsu-start-orbital-anim', handleTrigger);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  if (!isMeasured || typeof document === 'undefined') return null;

  const easeSmooth = (t: number) => 1 - Math.pow(1 - t, 4);
  const pEased = easeSmooth(progress);

  const isSwitchingToDark = targetTheme === 'dark';

  // ---- POSICIONAMENTO E ÓRBITA DO SOL ----
  let sunX = horizonPos.x;
  let sunY = horizonPos.y;
  let sunScale = 1;
  let sunOpacity = 1;
  let sunZIndex = 999999;

  // ---- POSICIONAMENTO E ÓRBITA DA LUA ----
  let moonX = horizonPos.x;
  let moonY = horizonPos.y;
  let moonScale = 1;
  let moonOpacity = 1;
  let moonZIndex = 999999;

  if (animStage === 'idle') {
    if (!isDark) {
      sunX = horizonPos.x;
      sunY = horizonPos.y;
      sunScale = 1;
      sunOpacity = 1;
      sunZIndex = 999999;

      moonX = capsulePos.x;
      moonY = capsulePos.y;
      moonScale = 0.65;
      moonOpacity = 0;
      moonZIndex = 1;
    } else {
      moonX = horizonPos.x;
      moonY = horizonPos.y;
      moonScale = 1;
      moonOpacity = 1;
      moonZIndex = 999999;

      sunX = capsulePos.x;
      sunY = capsulePos.y;
      sunScale = 0.65;
      sunOpacity = 0;
      sunZIndex = 1;
    }
  } else if (animStage === 'opening') {
    if (isSwitchingToDark) {
      moonX = capsulePos.x;
      moonY = capsulePos.y;
      moonScale = 0.65;
      moonOpacity = 1;
      moonZIndex = 1;

      sunX = horizonPos.x;
      sunY = horizonPos.y;
      sunScale = 1;
      sunOpacity = 1;
      sunZIndex = 999999;
    } else {
      sunX = capsulePos.x;
      sunY = capsulePos.y;
      sunScale = 0.65;
      sunOpacity = 1;
      sunZIndex = 1;

      moonX = horizonPos.x;
      horizonPos.y;
      moonScale = 1;
      moonOpacity = 1;
      moonZIndex = 999999;
    }
  } else if (animStage === 'orbiting') {
    if (isSwitchingToDark) {
      const startX = capsulePos.x;
      const startY = capsulePos.y;
      const endX = horizonPos.x;
      const endY = horizonPos.y;

      moonX = startX + (endX - startX) * pEased;
      const arcHeight = -42 * Math.sin(pEased * Math.PI);
      moonY = startY + (endY - startY) * pEased + arcHeight;
      moonScale = 0.65 + 0.35 * pEased;
      moonOpacity = 1;
      moonZIndex = 999999;

      const sStartX = horizonPos.x;
      const sStartY = horizonPos.y;
      const sEndX = capsulePos.x;
      const sEndY = capsulePos.y;

      sunX = sStartX + (sEndX - sStartX) * pEased;
      const sArcHeight = 32 * Math.sin(pEased * Math.PI);
      sunY = sStartY + (sEndY - sStartY) * pEased + sArcHeight;
      sunScale = 1 - 0.35 * pEased;
      sunOpacity = Math.max(0, 1 - pEased * 1.05);
      sunZIndex = 999;
    } else {
      const startX = capsulePos.x;
      const startY = capsulePos.y;
      const endX = horizonPos.x;
      const endY = horizonPos.y;

      sunX = startX + (endX - startX) * pEased;
      const arcHeight = -42 * Math.sin(pEased * Math.PI);
      sunY = startY + (endY - startY) * pEased + arcHeight;
      sunScale = 0.65 + 0.35 * pEased;
      sunOpacity = 1;
      sunZIndex = 999999;

      const mStartX = horizonPos.x;
      const mStartY = horizonPos.y;
      const mEndX = capsulePos.x;
      const mEndY = capsulePos.y;

      moonX = mStartX + (mEndX - mStartX) * pEased;
      const mArcHeight = 32 * Math.sin(pEased * Math.PI);
      moonY = mStartY + (mEndY - mStartY) * pEased + mArcHeight;
      moonScale = 1 - 0.35 * pEased;
      moonOpacity = Math.max(0, 1 - pEased * 1.05);
      moonZIndex = 999;
    }
  } else if (animStage === 'closing') {
    if (targetTheme === 'dark') {
      moonX = horizonPos.x;
      moonY = horizonPos.y;
      moonScale = 1;
      moonOpacity = 1;
      moonZIndex = 999999;

      sunX = capsulePos.x;
      sunY = capsulePos.y;
      sunScale = 0.65;
      sunOpacity = 0;
      sunZIndex = 1;
    } else {
      sunX = horizonPos.x;
      sunY = horizonPos.y;
      sunScale = 1;
      sunOpacity = 1;
      sunZIndex = 999999;

      moonX = capsulePos.x;
      moonY = capsulePos.y;
      moonScale = 0.65;
      moonOpacity = 0;
      sunZIndex = 1;
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 pointer-events-none z-[999999] overflow-visible"
      data-kapsu-theme-animation="true"
    >
      {/* ── 0. CAMADA DE ESTRELAS CADENTES ── */}
      {isDark && <ShootingStarCanvas meteors={meteors} />}

      {/* ── 1. ELEMENTO CELESTIAL ÚNICO: SOL HD COM ANIMAÇÃO IDLE SOLAR ── */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-opacity duration-300 pointer-events-none"
        style={{
          left: `${sunX}px`,
          top: `${sunY}px`,
          transform: `translate(-50%, -50%) scale(${sunScale})`,
          opacity: sunOpacity,
          zIndex: sunZIndex,
        }}
      >
        <SunIcon size={28} />
      </div>

      {/* ── 2. ELEMENTO CELESTIAL ÚNICO: LUA SÓLIDA HD COM FASES E ESTRELAS PASSANTES ── */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-opacity duration-300 pointer-events-none"
        style={{
          left: `${moonX}px`,
          top: `${moonY}px`,
          transform: `translate(-50%, -50%) scale(${moonScale})`,
          opacity: moonOpacity,
          zIndex: moonZIndex,
        }}
      >
        <div className="relative flex items-center justify-center">
          <MoonIcon phase={moonPhase} size={28} className="w-7 h-7 relative z-10" />
          {isDark && animStage === 'idle' && <StarSparkles />}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default KapsuOrbitalPortal;
