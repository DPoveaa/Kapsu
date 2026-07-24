import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export interface MeteorItem {
  id: number;
  startX: number;  // relativo ao container (pode ser negativo se acima)
  startY: number;  // relativo ao container (negativo = acima do header)
  endX: number;
  endY: number;
  duration: number;
  delay: number;
  size: number;
  tailLength: number;
  tailThickness: number;
  glowColor: string;
  glowIntensity: number;
}

interface ShootingStarCanvasProps {
  meteors: MeteorItem[];
}

/**
 * Renderiza meteoros dentro do data-kapsu-header-stars-container via portal.
 * O container usa clip-path: inset(-200px 0 0 0) para:
 *   - Permitir estrelas entrarem vindas de cima (inset negativo no topo)
 *   - Clippear estritamente na borda inferior do header (inset 0 no fundo)
 *   - Sem overflow-hidden (que causava corte brusco visual)
 * 
 * A animação faz fade-out de opacity:1 → 0 entre 72% e 100%.
 * O endY é calculado para que opacity chegue a 0 exatamente na borda inferior,
 * tornando o clipping inferior imperceptível.
 */
export const ShootingStarCanvas: React.FC<ShootingStarCanvasProps> = ({ meteors }) => {
  const [containerEl, setContainerEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const el = Array.from(
        document.querySelectorAll<HTMLElement>('[data-kapsu-header-stars-container]')
      ).find((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      if (el) setContainerEl(el);
    }
  }, []);

  if (!meteors || meteors.length === 0) return null;

  const content = (
    <div className="absolute inset-0 pointer-events-none z-0">
      {meteors.map((m) => {
        const dx = m.endX - m.startX;
        const dy = m.endY - m.startY;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        return (
          <div
            key={m.id}
            className="absolute pointer-events-none transform-gpu"
            style={{
              left: `${m.startX}px`,
              top: `${m.startY}px`,
              opacity: 0,
              transformOrigin: 'center center',
              animation: `meteorFly ${m.duration}ms linear ${m.delay}ms forwards`,
              '--tx': `${dx}px`,
              '--ty': `${dy}px`,
            } as React.CSSProperties}
          >
            <div
              className="relative flex items-center justify-end"
              style={{
                transform: `rotate(${angle}deg)`,
                transformOrigin: 'right center',
              }}
            >
              {/* 1. PARTÍCULAS CINTILANTES ATRÁS DA CAUDA */}
              <div
                className="absolute top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-80"
                style={{ right: `${m.tailLength + 4}px` }}
              >
                <div
                  className="rounded-full animate-particle-fade-1"
                  style={{
                    width: `${m.tailThickness * 0.8}px`,
                    height: `${m.tailThickness * 0.8}px`,
                    backgroundColor: m.glowColor,
                    boxShadow: `0 0 ${m.glowIntensity * 0.6}px ${m.glowColor}`,
                  }}
                />
                <div
                  className="rounded-full opacity-60 animate-particle-fade-2"
                  style={{
                    width: `${m.tailThickness * 0.5}px`,
                    height: `${m.tailThickness * 0.5}px`,
                    backgroundColor: '#FFFFFF',
                  }}
                />
              </div>

              {/* 2. CAUDA EM DEGRADÊ */}
              <div
                className="rounded-full opacity-95"
                style={{
                  height: `${m.tailThickness}px`,
                  width: `${m.tailLength}px`,
                  background: `linear-gradient(to right, transparent, ${m.glowColor}88, white)`,
                  boxShadow: `0 0 ${m.glowIntensity}px ${m.glowColor}`,
                }}
              />

              {/* 3. PONTA EM ESTRELA DE 4 PONTOS */}
              <div
                className="relative flex-shrink-0 text-white ml-[-3px]"
                style={{
                  filter: `drop-shadow(0 0 ${m.glowIntensity}px ${m.glowColor})`,
                }}
              >
                <svg
                  width={m.size}
                  height={m.size}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="animate-spin-slow"
                >
                  <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
                </svg>
              </div>
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes meteorFly {
          0%   { opacity: 0;   transform: translate(0px, 0px) scale(0.5); }
          10%  { opacity: 1; }
          72%  { opacity: 1; }
          100% { opacity: 0;   transform: translate(var(--tx), var(--ty)) scale(1.05); }
        }
        @keyframes particleFade1 {
          0%   { opacity: 0; transform: scale(0.2); }
          50%  { opacity: 1; transform: scale(1.2); }
          100% { opacity: 0; transform: scale(0.1); }
        }
        .animate-particle-fade-1 { animation: particleFade1 350ms ease-out infinite; }
        .animate-particle-fade-2 { animation: particleFade1 450ms ease-out 100ms infinite; }
      `}</style>
    </div>
  );

  if (containerEl) {
    return createPortal(content, containerEl);
  }
  return null;
};

export default ShootingStarCanvas;
