"use client"

import type { ReactNode } from "react"
import { Label } from "@/components/shared/atom/label"
import { cn } from "@/lib/utils"

interface SeccionProps {
  id: string
  titulo: string
  descripcion?: string
  /** Botones o controles a la derecha del título. */
  acciones?: ReactNode
  className?: string
  children: ReactNode
}

/** Una sección de la pantalla de configuración: título, texto de apoyo y contenido. */
export function Seccion({ id, titulo, descripcion, acciones, className, children }: SeccionProps) {
  return (
    <section aria-labelledby={id} className={cn("p-4 sm:p-6", className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id={id} className="text-base font-semibold">
            {titulo}
          </h3>
          {descripcion && (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{descripcion}</p>
          )}
        </div>
        {acciones}
      </div>
      {children}
    </section>
  )
}

/** Lo que hay que poner en `aria-describedby` del control de un `Campo` con este id. */
export const descripcionDe = (id: string) => `${id}-ayuda ${id}-error`

interface CampoProps {
  id: string
  etiqueta: string
  ayuda?: string
  error?: string
  className?: string
  children: ReactNode
}

/** Etiqueta, control, línea de ayuda y error de un campo de formulario. */
export function Campo({ id, etiqueta, ayuda, error, className, children }: CampoProps) {
  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      <Label htmlFor={id}>{etiqueta}</Label>
      {children}
      {ayuda && (
        <p id={`${id}-ayuda`} className="text-xs text-muted-foreground">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

/** Etiqueta de color para un estado. El color solo dice el estado, no adorna. */
export function EtiquetaEstado({
  className,
  children,
}: {
  className: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
        className,
      )}
    >
      {children}
    </span>
  )
}
