"use client";

import { Package } from "lucide-react";
import { LazyImage } from "@/components/shared/atom/lazy-image";

interface MaterialImageProps {
  /** URL de la foto del material (viene del catálogo). */
  foto?: string | null;
  /**
   * Estado del health check server-side de la foto:
   *  - `true`  → foto servible.
   *  - `null`/`undefined` → no verificada aún; se intenta descargar.
   *  - `false` → verificada como rota (502 en MinIO) → NO se pide, va directo al fallback.
   */
  fotoDisponible?: boolean | null;
  alt?: string;
  /** Clase del contenedor (posicionamiento). Debe permitir `relative` — LazyImage lo usa internamente. */
  className?: string;
  /** Clase de la etiqueta <img> renderizada por LazyImage. */
  imgClassName?: string;
  /**
   * Nodo a mostrar si no hay foto, está rota, o el request falla.
   * Por defecto: icono Package.
   */
  fallback?: React.ReactNode;
}

/**
 * Foto de material del catálogo, uniforme en toda la app.
 * - Salta el request cuando `fotoDisponible === false` (health check).
 * - Lazy loading vía IntersectionObserver (rootMargin 120px).
 * - Fallback visual estable si la carga falla en runtime (evita huecos).
 *
 * Ver `foto_verification_service.py` (backend) y
 * `POST /api/admin/verificar-fotos-materiales` para el health check.
 */
export function MaterialImage({
  foto,
  fotoDisponible,
  alt,
  className,
  imgClassName,
  fallback,
}: MaterialImageProps) {
  const finalFallback = fallback ?? (
    <Package className="h-6 w-6 text-slate-300" />
  );
  if (!foto || fotoDisponible === false) {
    return <>{finalFallback}</>;
  }
  return (
    <LazyImage
      src={foto}
      alt={alt ?? ""}
      className={
        className ??
        "relative w-full h-full flex items-center justify-center"
      }
      imgClassName={imgClassName ?? "w-full h-full object-contain"}
      fallback={finalFallback}
    />
  );
}
