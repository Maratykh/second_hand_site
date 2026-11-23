import React from 'react';
import mascotUrl from '../assets/images/zombie_mascot.png';

export const ZombieBackgroundMascots: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none select-none overflow-hidden z-20"
    >
      {/* 1. Справа сверху: яркий маскот, зафиксирован на экране */}
      <div
        className="fixed top-20 sm:top-24 right-2 sm:right-5 md:right-8 opacity-85 hover:opacity-100 transition-opacity duration-300 animate-zombie-float"
        style={{ '--zombie-rot': '12deg' } as React.CSSProperties}
      >
        <img
          src={mascotUrl}
          alt=""
          className="w-16 sm:w-22 md:w-28 h-auto object-contain filter drop-shadow-[0_0_18px_rgba(163,230,53,0.35)] drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
          draggable={false}
        />
      </div>

      {/* 2. Посередине слева: яркий маскот, зафиксирован по вертикали, смотрит в центр сайта */}
      <div
        className="fixed top-1/2 -translate-y-1/2 left-1 sm:left-4 md:left-7 opacity-85 hover:opacity-100 transition-opacity duration-300 animate-zombie-float-alt -scale-x-100"
        style={{ '--zombie-rot': '-8deg' } as React.CSSProperties}
      >
        <img
          src={mascotUrl}
          alt=""
          className="w-16 sm:w-22 md:w-28 h-auto object-contain filter drop-shadow-[0_0_18px_rgba(163,230,53,0.3)] drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
          draggable={false}
        />
      </div>
    </div>
  );
};
