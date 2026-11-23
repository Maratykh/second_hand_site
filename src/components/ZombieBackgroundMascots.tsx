import React from 'react';
import mascotUrl from '../assets/images/zombie_mascot.png';

export const ZombieBackgroundMascots: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none select-none overflow-hidden z-0"
    >
      {/* Mascot 1: Top-Right background (Subtle, floating) */}
      <div
        className="absolute top-24 sm:top-28 right-3 sm:right-8 md:right-14 opacity-20 hover:opacity-80 transition-opacity duration-500 animate-zombie-float hidden sm:block"
        style={{ '--zombie-rot': '12deg' } as React.CSSProperties}
      >
        <img
          src={mascotUrl}
          alt=""
          className="w-16 sm:w-20 md:w-24 h-auto object-contain filter drop-shadow-[0_0_14px_rgba(163,230,53,0.2)]"
          loading="lazy"
          draggable={false}
        />
      </div>

      {/* Mascot 2: Bottom-Left background (Peeking from the corner) */}
      <div
        className="absolute bottom-6 sm:bottom-10 left-3 sm:left-6 md:left-10 opacity-25 hover:opacity-85 transition-opacity duration-500 animate-zombie-float-alt"
        style={{ '--zombie-rot': '-10deg' } as React.CSSProperties}
      >
        <img
          src={mascotUrl}
          alt=""
          className="w-16 sm:w-20 md:w-24 h-auto object-contain filter drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]"
          loading="lazy"
          draggable={false}
        />
      </div>

      {/* Mascot 3: Mid-Right edge (Flipped, atmospheric) */}
      <div
        className="absolute top-[52%] -right-2 sm:right-4 md:right-8 opacity-15 hover:opacity-65 transition-opacity duration-500 animate-zombie-float hidden lg:block -scale-x-100"
        style={{ '--zombie-rot': '8deg' } as React.CSSProperties}
      >
        <img
          src={mascotUrl}
          alt=""
          className="w-14 sm:w-16 md:w-20 h-auto object-contain filter drop-shadow-[0_0_12px_rgba(255,46,147,0.15)]"
          loading="lazy"
          draggable={false}
        />
      </div>
    </div>
  );
};
