import React, { useMemo, useState, useEffect } from 'react';

interface StarConfig {
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  size: string;
  color: string;
  shadow: string;
  duration: number;   // duração total do ciclo em segundos
  delay: number;      // delay do ciclo de piscar em segundos
  minOpacity: number; // nunca some totalmente (0.12 a 0.22)
  maxOpacity: number; // nunca acende forte (0.55 a 0.82)
  minScale: number;
  maxScale: number;
  rotatePeak: number;
  fadeInDelay: number; // atraso individual para o fade-in de entrada
}

function generateStars(): StarConfig[] {
  const rand = (min: number, max: number) => min + Math.random() * (max - min);
  const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

  const positions = [
    { top: '-8px', right: '-5px' },   // topo direito — Rúbidea
    { top: '-3px', left: '-3px' },    // topo esquerdo — Mimosa
    { bottom: '3px', right: '-10px' }, // baixo direito — Estrela de Magalhães
    { bottom: '-3px', left: '-6px' }, // baixo esquerdo — Pálida
    { bottom: '8px', left: '-5px' },  // meio esquerdo — Intrometida
  ];

  const colors = [
    { color: 'text-emerald-200', shadow: 'drop-shadow(0 0 5px rgba(167,243,208,0.85))' },
    { color: 'text-emerald-300', shadow: 'drop-shadow(0 0 5px rgba(52,211,153,0.75))' },
    { color: 'text-white',       shadow: 'drop-shadow(0 0 6px rgba(255,255,255,0.85))' },
    { color: 'text-teal-200',    shadow: 'drop-shadow(0 0 5px rgba(153,246,228,0.8))' },
    { color: 'text-emerald-100', shadow: 'drop-shadow(0 0 7px rgba(255,255,255,0.9))' },
  ];

  const sizes = ['w-3 h-3', 'w-2.5 h-2.5', 'w-3.5 h-3.5', 'w-2 h-2', 'w-3 h-3'];

  return positions.map((pos, i) => ({
    ...pos,
    size: sizes[i % sizes.length],
    color: colors[i % colors.length].color,
    shadow: colors[i % colors.length].shadow,
    duration: rand(3.2, 6.8),
    delay: rand(0, 3.5),
    fadeInDelay: rand(0.1, 0.8), // escalonamento orgânico do fade-in de entrada
    minOpacity: rand(0.12, 0.22),
    maxOpacity: rand(0.55, 0.82),
    minScale: rand(0.25, 0.4),
    maxScale: rand(0.85, 1.15),
    rotatePeak: randInt(-60, 75),
  }));
}

export const StarSparkles: React.FC = () => {
  const stars = useMemo(() => generateStars(), []);

  // Controla se as estrelas estão em modo fade-in de entrada (logo após trocar para escuro)
  const [isFadingIn, setIsFadingIn] = useState(true);

  useEffect(() => {
    // Inicia com fade-in por padrão (componente monta ao trocar para escuro)
    const fadeInTimer = setTimeout(() => setIsFadingIn(false), 900);

    const handleDarkActivated = () => {
      setIsFadingIn(true);
      clearTimeout(fadeInTimer);
      setTimeout(() => setIsFadingIn(false), 900);
    };

    window.addEventListener('kapsu-dark-just-activated', handleDarkActivated);
    return () => {
      clearTimeout(fadeInTimer);
      window.removeEventListener('kapsu-dark-just-activated', handleDarkActivated);
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {stars.map((star, i) => (
        <div
          key={i}
          className={`absolute ${isFadingIn ? 'kapsu-star-fadein-' + i : 'animate-star-unique-' + i}`}
          style={{
            top: star.top,
            left: star.left,
            right: star.right,
            bottom: star.bottom,
          }}
        >
          <svg
            className={`${star.size} ${star.color}`}
            style={{ filter: star.shadow }}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
          </svg>
        </div>
      ))}

      <style>{[
        // Keyframes e classes do ciclo normal de piscar
        ...stars.map((star, i) => `
          @keyframes starSparkleUnique${i} {
            0%   { opacity: ${star.minOpacity}; transform: scale(${star.minScale}) rotate(0deg); }
            45%  { opacity: ${star.maxOpacity}; transform: scale(${star.maxScale}) rotate(${star.rotatePeak}deg); }
            100% { opacity: ${star.minOpacity}; transform: scale(${star.minScale}) rotate(0deg); }
          }
          .animate-star-unique-${i} {
            animation: starSparkleUnique${i} ${star.duration.toFixed(2)}s ease-in-out ${star.delay.toFixed(2)}s infinite;
          }
        `),
        // Keyframes e classes do fade-in de entrada (começa invisível, chega à opacidade mínima suavemente)
        ...stars.map((star, i) => `
          @keyframes starFadeIn${i} {
            0%   { opacity: 0; transform: scale(${star.minScale}) rotate(0deg); }
            100% { opacity: ${star.minOpacity}; transform: scale(${star.minScale}) rotate(0deg); }
          }
          .kapsu-star-fadein-${i} {
            animation: starFadeIn${i} 0.8s ease-out ${star.fadeInDelay.toFixed(2)}s forwards;
            opacity: 0;
          }
        `),
      ].join('\n')}</style>
    </div>
  );
};

export default StarSparkles;
