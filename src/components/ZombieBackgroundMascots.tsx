import React from 'react';
import mascotUrl from '../assets/images/zombie_mascot.png';

export const ZombieBackgroundMascots: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0"
    >
      {/* 1. Справа сверху: компактный, лёгкий водяной знак в фоне */}
      <div
        className="absolute top-20 sm:top-24 right-1.5 sm:right-3 xl:right-[max(0.75rem,calc(50vw-640px-3.75rem))] 2xl:right-[max(1rem,calc(50vw-640px-4.5rem))] opacity-25 sm:opacity-35 hover:opacity-65 transition-opacity duration-300 animate-zombie-float"
        style={{ '--zombie-rot': '10deg' } as React.CSSProperties}
      >
        <img
          src={mascotUrl}
          alt=""
          className="w-9 sm:w-11 md:w-13 h-auto object-contain filter drop-shadow-[0_0_10px_rgba(163,230,53,0.2)] drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
          draggable={false}
        />
      </div>

      {/* 2. Посередине слева: уменьшенный, полупрозрачный, в фоновом слое z-0 */}
      <div
        className="absolute top-[620px] sm:top-[700px] xl:top-[640px] left-1 sm:left-2 xl:left-[max(0.75rem,calc(50vw-640px-3.75rem))] 2xl:left-[max(1rem,calc(50vw-640px-4.5rem))] opacity-25 sm:opacity-35 hover:opacity-65 transition-opacity duration-300 animate-zombie-float-alt -scale-x-100"
        style={{ '--zombie-rot': '-8deg' } as React.CSSProperties}
      >
        <img
          src={mascotUrl}
          alt=""
          className="w-9 sm:w-11 md:w-13 h-auto object-contain filter drop-shadow-[0_0_10px_rgba(163,230,53,0.18)] drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
          draggable={false}
        />
      </div>
    </div>
  );
};

