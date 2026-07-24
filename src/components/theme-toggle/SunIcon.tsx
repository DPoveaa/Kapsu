import React from 'react';

interface SunIconProps {
  size?: number;
  className?: string;
}

export const SunIcon: React.FC<SunIconProps> = ({ size = 28, className = '' }) => {
  return (
    <div className={`relative flex items-center justify-center pointer-events-none select-none ${className}`}>
      {/* 1. CORONA SOLAR EM ANEL DE LUZ DEGRADÊ QUE RESPIRA E PULSA SUAVEMENTE */}
      <div
        className="absolute rounded-full bg-gradient-to-r from-amber-400/40 via-orange-400/30 to-yellow-300/40 blur-sm animate-sun-corona pointer-events-none"
        style={{
          width: `${size * 1.5}px`,
          height: `${size * 1.5}px`,
        }}
      />

      {/* 2. BRILHO DE CALOR EXTERNO QUE SUAVE E AQUECE O HORIZONTE */}
      <div
        className="absolute rounded-full bg-amber-500/20 blur-md animate-sun-glow pointer-events-none"
        style={{
          width: `${size * 1.8}px`,
          height: `${size * 1.8}px`,
        }}
      />

      {/* 3. VETOR DO SOL COM RAIOS EM ROTAÇÃO MAJESTOSA ULTRA-LENTA */}
      <div className="relative z-10 flex items-center justify-center">
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-amber-500 drop-shadow-[0_0_12px_rgba(245,158,11,0.9)]"
        >
          {/* RAIOS SOLARES QUE GIRAM SUAVEMENTE */}
          <g className="animate-spin-ultra-slow origin-center">
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </g>

          {/* NÚCLEO SOLAR COM NÚCLEO QUENTE CINTILANTE */}
          <circle
            cx="12"
            cy="12"
            r="4"
            fill="#F59E0B"
            fillOpacity="0.8"
            className="animate-sun-core origin-center"
          />
        </svg>
      </div>

      {/* ANIMAÇÕES CSS ELEGANTES E NATIVAS DO SOL IDLE */}
      <style>{`
        @keyframes sunCoronaPulse {
          0%, 100% {
            transform: scale(0.95);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.22);
            opacity: 0.85;
          }
        }
        @keyframes sunGlowPulse {
          0%, 100% {
            transform: scale(0.9);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.15);
            opacity: 0.6;
          }
        }
        @keyframes sunCorePulse {
          0%, 100% {
            transform: scale(1);
            fill-opacity: 0.75;
          }
          50% {
            transform: scale(1.08);
            fill-opacity: 0.95;
          }
        }
        @keyframes spinUltraSlow {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        .animate-sun-corona {
          animation: sunCoronaPulse 3.8s ease-in-out infinite;
        }
        .animate-sun-glow {
          animation: sunGlowPulse 4.2s ease-in-out infinite;
        }
        .animate-sun-core {
          animation: sunCorePulse 3.2s ease-in-out infinite;
        }
        .animate-spin-ultra-slow {
          animation: spinUltraSlow 22s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default SunIcon;
