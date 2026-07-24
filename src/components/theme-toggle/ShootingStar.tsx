import React from 'react';

export const ShootingStar: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible z-0">
      {/* Estrela Cadente com Cabeça Brilhante e Rastro Luminoso */}
      <div className="absolute -top-3 -right-3 w-16 h-[2px] animate-shooting-star-streak transform-gpu">
        {/* Rastro Gradiente de Luz (Cauda da Estrela) */}
        <div className="w-full h-full bg-gradient-to-l from-white via-emerald-300 to-transparent rounded-full shadow-[0_0_10px_rgba(167,243,208,0.9)]" />

        {/* Cabeça Brilhante de Centelha */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-[0_0_12px_rgba(255,255,255,1)]" />
      </div>

      {/* CSS Keyframes do Rastro da Estrela Cadente */}
      <style>{`
        @keyframes shootingStarStreak {
          0% {
            opacity: 0;
            transform: translate(0px, 0px) rotate(-35deg) scaleX(0.2);
          }
          15% {
            opacity: 1;
            transform: translate(-12px, 12px) rotate(-35deg) scaleX(1.3);
          }
          70% {
            opacity: 0.9;
            transform: translate(-55px, 55px) rotate(-35deg) scaleX(1.1);
          }
          100% {
            opacity: 0;
            transform: translate(-85px, 85px) rotate(-35deg) scaleX(0.1);
          }
        }
        .animate-shooting-star-streak {
          animation: shootingStarStreak 850ms cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default ShootingStar;
