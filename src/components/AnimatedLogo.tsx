import { useState, useEffect, useRef } from 'react';
import orelhaLogo from '../images/orelha_logo_128.webp';
import olhoLogo from '../images/olho_logo_128.webp';
import pupilaNormalEsquerdo from '../images/pupila_esquerda_base_128.webp';
import pupilaNormalDireito from '../images/pupila_direita_base_128.webp';
import pupilaDormindoEsquerdo from '../images/pupila_dormindo_esquerda_128.webp';
import pupilaDormindoDireito from '../images/pupila_dormindo_direita_128.webp';
import nariz from '../images/nariz_128.webp';
import comprimidoEsquerdo from '../images/comprimido_esquerdo_128.webp';
import comprimidoDireito from '../images/comprimido_direito_128.webp';

interface AnimatedLogoProps {
  className?: string;
  alt?: string;
  forceSleeping?: boolean;
}

interface ZBubble {
  id: number;
  delay: number;
}

export default function AnimatedLogo({ className = '', forceSleeping = false }: AnimatedLogoProps) {
  const [isBlinking, setIsBlinking] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [capsuleOpen, setCapsuleOpen] = useState(false);
  const [showGlowPulse, setShowGlowPulse] = useState(false);
  const [zBubbles, setZBubbles] = useState<ZBubble[]>([]);

  const blinkChanceRef = useRef(10);
  const zChanceRef = useRef(10);
  const intervalRef = useRef<number | null>(null);
  const zIntervalRef = useRef<number | null>(null);
  const zIdCounterRef = useRef(0);
  const eyesClosed = forceSleeping || isBlinking;

  // Ouve o evento de controle orbital da cápsula
  useEffect(() => {
    const handleOrbitalEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;

      if (detail.phase === 'opening') {
        setCapsuleOpen(true);
        setShowGlowPulse(false);
      } else if (detail.phase === 'closing') {
        setCapsuleOpen(false);
        setTimeout(() => {
          setShowGlowPulse(true);
          setTimeout(() => setShowGlowPulse(false), 600);
        }, 280);
      } else if (detail.phase === 'idle') {
        setCapsuleOpen(false);
        setShowGlowPulse(false);
      }
    };

    window.addEventListener('kapsu-orbital-toggle', handleOrbitalEvent);
    return () => window.removeEventListener('kapsu-orbital-toggle', handleOrbitalEvent);
  }, []);

  // Detecta modo escuro
  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
      if (isDark) {
        setIsBlinking(true);
      } else {
        setIsBlinking(false);
      }
    };

    checkDarkMode();

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  // Piscar de olhos no modo claro
  useEffect(() => {
    if (isDarkMode || forceSleeping) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const checkBlink = () => {
      const randomValue = Math.random() * 100;
      if (randomValue < blinkChanceRef.current) {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 250);
        blinkChanceRef.current = 10;
      } else {
        blinkChanceRef.current = Math.min(blinkChanceRef.current + 10, 80);
      }
    };

    intervalRef.current = window.setInterval(checkBlink, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isDarkMode, forceSleeping]);

  // Bolhas Z Z z no modo escuro
  useEffect(() => {
    if (!isDarkMode) {
      setZBubbles([]);
      if (zIntervalRef.current) clearInterval(zIntervalRef.current);
      return;
    }

    const checkZ = () => {
      const randomValue = Math.random() * 100;
      if (randomValue < zChanceRef.current) {
        const newZ: ZBubble = {
          id: zIdCounterRef.current++,
          delay: Math.random() * 200,
        };

        setZBubbles((prev) => [...prev.slice(-4), newZ]);
        setTimeout(() => {
          setZBubbles((prev) => prev.filter((z) => z.id !== newZ.id));
        }, 2200);

        zChanceRef.current = 10;
      } else {
        zChanceRef.current = Math.min(zChanceRef.current + 5, 100);
      }
    };

    const intervalTime = 5000;
    zIntervalRef.current = window.setInterval(checkZ, intervalTime);
    const timeoutId = window.setTimeout(checkZ, intervalTime);

    return () => {
      if (zIntervalRef.current) clearInterval(zIntervalRef.current);
      clearTimeout(timeoutId);
    };
  }, [isDarkMode]);

  return (
    <div
      data-kapsu-capsule="true"
      className={`relative inline-flex items-center justify-center transition-all duration-300 animate-logo-glow ${className}`}
    >
      {/* Container principal com proporção mantida */}
      <div className="relative w-full h-full" style={{ aspectRatio: '1 / 1' }}>
        {/* Orelha Esquerda */}
        <img
          src={orelhaLogo}
          alt=""
          className="absolute"
          style={{
            top: '-3%',
            left: '-5%',
            width: '48%',
            height: 'auto',
            zIndex: 1,
            objectFit: 'contain',
            transform: 'scaleX(-1)',
            transformOrigin: 'center center',
          }}
        />

        {/* Orelha Direita */}
        <img
          src={orelhaLogo}
          alt=""
          className="absolute"
          style={{
            top: '-3%',
            right: '-5%',
            width: '48%',
            height: 'auto',
            zIndex: 1,
            objectFit: 'contain',
            transform: 'none',
            transformOrigin: 'center center',
          }}
        />

        {/* Olho Esquerdo */}
        <img
          src={olhoLogo}
          alt=""
          className="absolute panda-eye-left"
          style={{
            top: '22%',
            left: '22%',
            width: '25%',
            height: 'auto',
            zIndex: 2,
            objectFit: 'contain',
            transform: 'scaleX(-1)',
            transformOrigin: 'center center',
          }}
        />

        {/* Pupila Esquerda */}
        <img
          src={eyesClosed ? pupilaDormindoEsquerdo : pupilaNormalEsquerdo}
          alt=""
          className="absolute panda-pupil-left"
          style={{
            top: '27%',
            left: '34%',
            width: '7.5%',
            height: 'auto',
            zIndex: 3,
            objectFit: 'contain',
            pointerEvents: 'none',
          }}
        />

        {/* Olho Direito */}
        <img
          src={olhoLogo}
          alt=""
          className="absolute panda-eye-right"
          style={{
            top: '22%',
            right: '22%',
            width: '25%',
            height: 'auto',
            zIndex: 2,
            objectFit: 'contain',
            transform: 'none',
            transformOrigin: 'center center',
          }}
        />

        {/* Pupila Direita */}
        <img
          src={eyesClosed ? pupilaDormindoDireito : pupilaNormalDireito}
          alt=""
          className="absolute panda-pupil-right"
          style={{
            top: '27%',
            right: '34%',
            width: '7.5%',
            height: 'auto',
            zIndex: 3,
            objectFit: 'contain',
            pointerEvents: 'none',
          }}
        />

        {/* Nariz */}
        <img
          src={nariz}
          alt=""
          className="absolute"
          style={{
            top: '29%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '25%',
            height: 'auto',
            zIndex: 2,
            objectFit: 'contain',
          }}
        />



        {/* Comprimido Esquerdo (Metade Verde da Cápsula) - Abre estritamente na horizontal (X-axis) */}
        <img
          src={comprimidoEsquerdo}
          alt=""
          data-kapsu-capsule-seam="true"
          className="absolute"
          style={{
            bottom: '19%',
            left: '-1%',
            width: '51%',
            height: 'auto',
            zIndex: 2,
            objectFit: 'contain',
            transition: 'transform 550ms cubic-bezier(0.16, 1, 0.3, 1), filter 500ms ease',
            transform: capsuleOpen ? 'translateX(-16px)' : 'translateX(0px)',
            filter: showGlowPulse
              ? 'drop-shadow(0 0 12px rgba(16, 185, 129, 0.95))'
              : 'none',
          }}
        />

        {/* Comprimido Direito (Metade Branca da Cápsula) - Abre estritamente na horizontal (X-axis) */}
        <img
          src={comprimidoDireito}
          alt=""
          className="absolute"
          style={{
            bottom: '19%',
            right: '-1%',
            width: '51%',
            height: 'auto',
            zIndex: 2,
            objectFit: 'contain',
            transition: 'transform 550ms cubic-bezier(0.16, 1, 0.3, 1), filter 500ms ease',
            transform: capsuleOpen ? 'translateX(16px)' : 'translateX(0px)',
            filter: showGlowPulse
              ? 'drop-shadow(0 0 12px rgba(16, 185, 129, 0.95))'
              : 'none',
          }}
        />
      </div>

      {/* Bolhas Z do Sono no modo escuro */}
      {zBubbles.map((zBubble, index) => (
        <div
          key={zBubble.id}
          className="absolute text-2xl sm:text-3xl font-bold text-gray-400 dark:text-gray-500 pointer-events-none z-50"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            animation: `zFloat${zBubble.id} 2s ${zBubble.delay}ms ease-out forwards`,
            opacity: 0,
          }}
        >
          <style>{`
            @keyframes zFloat${zBubble.id} {
              0% {
                opacity: 0;
                transform: translate(-50%, -50%) translateY(0px) translateX(${index * 5 - 5}px) rotate(0deg) scale(0.8);
              }
              5% {
                opacity: 1;
                transform: translate(-50%, -50%) translateY(-8px) translateX(${index * 5 - 5}px) rotate(-4deg) scale(0.95);
              }
              100% {
                opacity: 0;
                transform: translate(-50%, -50%) translateY(-120px) translateX(${(index * 6 - 3) * 0.3}px) rotate(${index % 2 === 0 ? -2 : 2}deg) scale(0.5);
              }
            }
          `}</style>
          Z
        </div>
      ))}
    </div>
  );
}
