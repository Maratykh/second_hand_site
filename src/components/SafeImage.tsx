import React, { useEffect, useState } from 'react';
import { Shirt } from 'lucide-react';

interface SafeImageProps {
  src?: string;
  fallbackSrc?: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  fallbackSrc,
  alt,
  className = '',
  fallbackLabel,
}) => {
  const [failedPrimary, setFailedPrimary] = useState(false);
  const [failedFallback, setFailedFallback] = useState(false);

  useEffect(() => {
    setFailedPrimary(false);
  }, [src]);

  useEffect(() => {
    setFailedFallback(false);
  }, [fallbackSrc]);

  const activeSrc =
    !failedPrimary && src
      ? src
      : !failedFallback && fallbackSrc
        ? fallbackSrc
        : undefined;

  if (!activeSrc) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#16161A] to-[#0E0E11] text-zinc-500 p-4 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Shirt className="w-8 h-8 mb-2 stroke-[1.5] text-zinc-600" aria-hidden="true" />
        <span className="text-xs text-zinc-500 line-clamp-2 max-w-[180px]">
          {fallbackLabel || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={activeSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => {
        if (!failedPrimary && src) {
          setFailedPrimary(true);
        } else {
          setFailedFallback(true);
        }
      }}
      className={className}
      loading="lazy"
      decoding="async"
    />
  );
};
