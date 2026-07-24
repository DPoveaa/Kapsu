import React from 'react';

export interface MoonIconProps {
  phase?: number; // 0: Cheia, 1: Gibosa Minguante, 2: Quarto Minguante, 3: Minguante, 4: Nova, 5: Crescente, 6: Quarto Crescente, 7: Gibosa Crescente
  className?: string;
  size?: number;
}

export const MOON_PHASE_NAMES = [
  'Lua Cheia 🌕',
  'Gibosa Minguante 🌖',
  'Quarto Minguante 🌗',
  'Lua Minguante 🌘',
  'Lua Nova 🌑',
  'Lua Crescente 🌒',
  'Quarto Crescente 🌓',
  'Gibosa Crescente 🌔',
];

export const MoonIcon: React.FC<MoonIconProps> = ({
  phase = 0, // Padrão: Lua Cheia sólida
  className = 'w-7 h-7',
  size = 28,
}) => {
  const currentPhase = Math.abs(phase) % 8;

  // Calculamos a máscara da sombra conforme a fase (0 a 7)
  // 0 = Cheia (sem sombra), 4 = Nova (sombra total), 2 = Quarto Minguante, 6 = Quarto Crescente
  const shadowPaths: { [key: number]: string } = {
    0: '', // Cheia (100% visível)
    1: 'M 12 2 A 10 10 0 0 1 12 22 A 6 10 0 0 0 12 2 Z', // Gibosa Minguante
    2: 'M 12 2 A 10 10 0 0 1 12 22 Z', // Quarto Minguante (Metade direita sombreada)
    3: 'M 12 2 A 10 10 0 0 1 12 22 A 6 10 0 0 1 12 2 Z', // Minguante
    4: 'M 12 2 A 10 10 0 1 1 12 22 A 10 10 0 1 1 12 2 Z', // Nova (Sombra total com brilho no contorno)
    5: 'M 12 2 A 10 10 0 0 0 12 22 A 6 10 0 0 1 12 2 Z', // Crescente
    6: 'M 12 2 A 10 10 0 0 0 12 22 Z', // Quarto Crescente (Metade esquerda sombreada)
    7: 'M 12 2 A 10 10 0 0 0 12 22 A 6 10 0 0 0 12 2 Z', // Gibosa Crescente
  };

  const shadowPath = shadowPaths[currentPhase];

  return (
    <div className={`relative inline-flex items-center justify-center pointer-events-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-[0_0_12px_rgba(167,243,208,0.9)] transition-all duration-500 transform-gpu"
      >
        <defs>
          {/* Gradiente da Superfície da Lua (Prata / Pérola / Marfim Sólido) */}
          <radialGradient id="moonSurfaceGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="40%" stopColor="#E5E7EB" />
            <stop offset="85%" stopColor="#CBD5E1" />
            <stop offset="100%" stopColor="#94A3B8" />
          </radialGradient>

          {/* Gradiente da Sombra das Fases */}
          <linearGradient id="moonShadowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0F1714" stopOpacity="0.88" />
            <stop offset="100%" stopColor="#080C0A" stopOpacity="0.95" />
          </linearGradient>

          {/* Textura dos Crateras da Lua */}
          <radialGradient id="craterGrad" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#94A3B8" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#64748B" stopOpacity="0.5" />
          </radialGradient>
        </defs>

        {/* 1. DISCO SÓLIDO BASE DA LUA (Com Gradiente Pérola) */}
        <circle cx="12" cy="12" r="10" fill="url(#moonSurfaceGrad)" />

        {/* 2. CRATERAS VETORIAIS DE ALTA DEFINIÇÃO (Detalhamento Realista) */}
        <g opacity="0.75">
          {/* Cratera Grande Superior Direita */}
          <circle cx="15.5" cy="8" r="2.2" fill="url(#craterGrad)" />
          <circle cx="15" cy="7.7" r="1.8" fill="#CBD5E1" opacity="0.3" />

          {/* Cratera Central Inferior */}
          <circle cx="11" cy="15.5" r="2.8" fill="url(#craterGrad)" />
          <circle cx="10.5" cy="15.2" r="2.2" fill="#CBD5E1" opacity="0.25" />

          {/* Cratera Menor Esquerda */}
          <circle cx="7.5" cy="10" r="1.5" fill="url(#craterGrad)" />

          {/* Mini Crateras de Detalhe */}
          <circle cx="14" cy="13" r="1" fill="url(#craterGrad)" />
          <circle cx="9" cy="6.5" r="0.9" fill="url(#craterGrad)" />
        </g>

        {/* 3. SOMBRA INTERATIVA DA FASE DA LUA (Caso não seja Lua Cheia) */}
        {shadowPath && (
          <path d={shadowPath} fill="url(#moonShadowGrad)" className="transition-all duration-700 ease-out" />
        )}

        {/* 4. ANEL DE BRILHO VETORIAL EM VOLTA DA LUA */}
        <circle cx="12" cy="12" r="10" stroke="#A7F3D0" strokeWidth="0.75" strokeOpacity="0.6" fill="none" />
      </svg>
    </div>
  );
};

export default MoonIcon;
