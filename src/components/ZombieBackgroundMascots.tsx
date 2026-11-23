import React from 'react';
import pirateZombieUrl from '../assets/images/zombie_mascot.png';
import suitZombieUrl from '../assets/images/zombie_suit.png';

export const ZombieBackgroundMascots: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0"
    >
      {/* 1. Справа сверху: пиратский зомби в правом углу (сочный, видимый, плавно парит) */}
      <div
        className="absolute top-20 sm:top-24 right-2 sm:right-4 xl:right-[max(1rem,calc(50vw-640px-5.5rem))] 2xl:right-[max(1.5rem,calc(50vw-640px-6.5rem))] opacity-85 hover:opacity-100 transition-opacity duration-300 animate-zombie-float"
        style={{ '--zombie-rot': '10deg' } as React.CSSProperties}
      >
        <img
          src={pirateZombieUrl}
          alt=""
          className="w-12 sm:w-16 md:w-20 lg:w-24 h-auto object-contain filter drop-shadow-[0_0_14px_rgba(163,230,53,0.35)] drop-shadow-[0_4px_12px_rgba(0,0,0,0.85)]"
          draggable={false}
        />
      </div>

      {/* 2. Слева прямо посередине страницы: деловой зомби с языком (нужно пролистать вниз до середины) */}
      <div
        className="absolute top-[1500px] sm:top-[1650px] lg:top-[1750px] left-2 sm:left-4 xl:left-[max(1rem,calc(50vw-640px-5.5rem))] 2xl:left-[max(1.5rem,calc(50vw-640px-6.5rem))] opacity-85 hover:opacity-100 transition-opacity duration-300 animate-zombie-float-alt -scale-x-100"
        style={{ '--zombie-rot': '-6deg' } as React.CSSProperties}
      >
        <img
          src={suitZombieUrl}
          alt=""
          className="w-12 sm:w-16 md:w-20 lg:w-24 h-auto object-contain filter drop-shadow-[0_0_14px_rgba(163,230,53,0.35)] drop-shadow-[0_4px_12px_rgba(0,0,0,0.85)]"
          draggable={false}
        />
      </div>

      {/* 3. Справа снизу: пиратский зомби ближе к шоуруму и категориям */}
      <div
        className="absolute top-[2500px] sm:top-[2700px] lg:top-[2850px] right-2 sm:right-4 xl:right-[max(1rem,calc(50vw-640px-5.5rem))] 2xl:right-[max(1.5rem,calc(50vw-640px-6.5rem))] opacity-80 hover:opacity-100 transition-opacity duration-300 animate-zombie-float -scale-x-100"
        style={{ '--zombie-rot': '8deg' } as React.CSSProperties}
      >
        <img
          src={pirateZombieUrl}
          alt=""
          className="w-12 sm:w-16 md:w-20 lg:w-24 h-auto object-contain filter drop-shadow-[0_0_14px_rgba(163,230,53,0.3)] drop-shadow-[0_4px_12px_rgba(0,0,0,0.85)]"
          draggable={false}
        />
      </div>
    </div>
  );
};


