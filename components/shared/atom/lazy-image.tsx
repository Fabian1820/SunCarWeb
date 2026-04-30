"use client";

import { useEffect, useRef, useState } from "react";

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  fallback?: React.ReactNode;
  /** Margin around viewport to start loading before element is visible (default: "120px") */
  rootMargin?: string;
}

/**
 * Carga la imagen solo cuando el contenedor entra al viewport.
 * Muestra un placeholder animado mientras espera y al cargar.
 */
export function LazyImage({
  src,
  alt,
  className,
  imgClassName,
  fallback,
  rootMargin = "120px",
}: LazyImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0, rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div ref={containerRef} className={className}>
      {!isInView || hasError ? (
        // Placeholder or fallback
        hasError && fallback ? (
          fallback
        ) : (
          <div className="w-full h-full bg-gray-100 animate-pulse rounded" />
        )
      ) : (
        <>
          {!isLoaded && (
            <div className="absolute inset-0 bg-gray-100 animate-pulse rounded" />
          )}
          <img
            src={src}
            alt={alt}
            className={imgClassName}
            onLoad={() => setIsLoaded(true)}
            onError={() => {
              setHasError(true);
              setIsLoaded(true);
            }}
          />
          {hasError && fallback && fallback}
        </>
      )}
    </div>
  );
}
