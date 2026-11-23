import React from 'react';
import mascotUrl from '../assets/images/zombie_mascot.png';

export const ZombieBackgroundMascots: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none select-none overflow-hidden z-20"
    >
      {/* 1. Справа сверху: привязана к верхнему правому углу страницы (прокручивается вместе с сайтом) */}
      <div
        className="absolute top-24 sm:top-28 right-2 sm:right-6 md:right-10 opacity-85 hover:opacity-100 transition-opacity duration-300 animate-zombie-float"
        style={{ '--zombie-rot': '12deg' } as React.CSSProperties}
      >
        <img
          src={mascotUrl}
          alt=""
          className="w-18 sm:w-24 md:w-32 h-auto object-contain filter drop-shadow-[0_0_18px_rgba(163,230,53,0.35)] drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
          draggable={false}
        />
      </div>

      {/* 2. Посередине слева: привязана к середине страницы слева (остаётся на своём месте на странице при прокрутке) */}
      <div
        className="absolute top-[550px] sm:top-[700px] left-1 sm:left-4 md:left-8 opacity-85 hover:opacity-100 transition-opacity duration-300 animate-zombie-float-alt -scale-x-100"
        style={{ '--zombie-rot': '-8deg' } as React.CSSProperties}
      >
        <img
          src={mascotUrl}
          alt=""
          className="w-18 sm:w-24 md:w-32 h-auto object-contain filter drop-shadow-[0_0_18px_rgba(163,230,53,0.3)] drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
          draggable={false}
        />
      </div>
    </div>
  );
};
