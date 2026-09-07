"use client"

import Link from "next/link"
import { Layers, type LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Fondo del contenedor del icono, a tono con `iconClass`. Antes era siempre
 * gris neutro sin importar el color del icono (que además hoy es casi
 * siempre el mismo emerald), y eso hacía que todas las tarjetas se vieran
 * igual de "blancas". Se necesita un mapa literal porque Tailwind arma sus
 * clases en build time: no puede construir "bg-emerald-50" a partir de un
 * string dinámico, solo reconoce clases que aparecen escritas tal cual.
 */
const TINTE_POR_COLOR: Record<string, { bg: string; ring: string; hover: string }> = {
  emerald: { bg: "bg-emerald-50", ring: "ring-emerald-100", hover: "group-hover:bg-emerald-100" },
  teal: { bg: "bg-teal-50", ring: "ring-teal-100", hover: "group-hover:bg-teal-100" },
  sky: { bg: "bg-sky-50", ring: "ring-sky-100", hover: "group-hover:bg-sky-100" },
  blue: { bg: "bg-blue-50", ring: "ring-blue-100", hover: "group-hover:bg-blue-100" },
  indigo: { bg: "bg-indigo-50", ring: "ring-indigo-100", hover: "group-hover:bg-indigo-100" },
  violet: { bg: "bg-violet-50", ring: "ring-violet-100", hover: "group-hover:bg-violet-100" },
  rose: { bg: "bg-rose-50", ring: "ring-rose-100", hover: "group-hover:bg-rose-100" },
  red: { bg: "bg-red-50", ring: "ring-red-100", hover: "group-hover:bg-red-100" },
  orange: { bg: "bg-orange-50", ring: "ring-orange-100", hover: "group-hover:bg-orange-100" },
  amber: { bg: "bg-amber-50", ring: "ring-amber-100", hover: "group-hover:bg-amber-100" },
  gray: { bg: "bg-gray-50", ring: "ring-gray-100", hover: "group-hover:bg-gray-100" },
}

function tinteDesdeIconClass(iconClass?: string) {
  const color = iconClass?.match(/text-([a-z]+)-\d+/)?.[1]
  return TINTE_POR_COLOR[color ?? "emerald"] ?? TINTE_POR_COLOR.emerald
}

/**
 * Tarjeta de módulo. Es la misma en el dashboard y dentro de los hubs
 * (Facturación, Instalaciones, Compras…), para que un submódulo se vea igual
 * que un módulo principal y no parezca otra aplicación.
 */
interface ModuleCardProps {
  title: string
  description?: string
  icon: LucideIcon
  /** Color del icono, ej. "text-emerald-600". */
  iconClass?: string
  /** Destino. Si no se pasa, hace falta `onClick`. */
  href?: string
  onClick?: () => void
  /**
   * Recorta la descripción a dos líneas. Para cuando el texto lo escribe el
   * usuario (la dirección de un almacén, p. ej.) y una tarjeta con una
   * dirección larga estiraría toda la fila.
   */
  clampDescription?: boolean
  /**
   * El módulo contiene submódulos: la tarjeta se dibuja apilada sobre otras y
   * lleva la etiqueta "Varias secciones", para que a simple vista se sepa que
   * dentro hay más cosas y no una pantalla suelta.
   */
  tieneSubmodulos?: boolean
  /** Esquina superior derecha, ej. la estrella de favoritos del dashboard. */
  cornerAction?: ReactNode
  className?: string
}

export function ModuleCard({
  title,
  description,
  icon: Icon,
  iconClass,
  href,
  onClick,
  clampDescription,
  tieneSubmodulos,
  cornerAction,
  className,
}: ModuleCardProps) {
  const tinte = tinteDesdeIconClass(iconClass)

  const contenido = (
    <>
      {cornerAction ? (
        <div className="absolute right-3 top-3 z-20">{cornerAction}</div>
      ) : null}

      <div
        className={cn(
          "mb-4 flex h-12 w-12 items-center justify-center rounded-xl ring-1 transition-colors",
          tinte.bg,
          tinte.ring,
          tinte.hover,
        )}
      >
        <Icon className={cn("h-6 w-6", iconClass ?? "text-emerald-600")} />
      </div>

      <h4 className="mb-1 text-base font-semibold text-gray-900">{title}</h4>

      {description ? (
        <p
          className={cn(
            "text-sm leading-relaxed text-gray-500",
            clampDescription && "line-clamp-2",
          )}
          title={clampDescription ? description : undefined}
        >
          {description}
        </p>
      ) : null}

      {/* El `mt-auto` del contenedor ancla la etiqueta abajo: si no, en una
          fila de tarjetas estiradas queda a distinta altura en cada una según
          lo larga que sea su descripción. */}
      {tieneSubmodulos ? (
        <div className="mt-auto pt-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
            <Layers className="h-3 w-3" />
            Varias secciones
          </span>
        </div>
      ) : null}
    </>
  )

  const clasesTarjeta = cn(
    "relative z-10 flex flex-1 cursor-pointer flex-col items-center rounded-2xl border border-gray-200/70 p-5 text-center shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400",
    // Con la pila detrás, una tarjeta translúcida deja ver las capas y se
    // ensucia; se opaca solo en ese caso.
    tieneSubmodulos ? "bg-white" : "bg-white/80",
    className,
  )

  // Con `cornerAction` la tarjeta lleva un botón dentro (la estrella), así que
  // no puede ser un <a>: se usa el div clicable. Sin él, un Link de verdad
  // permite abrir el módulo en otra pestaña.
  const tarjeta =
    href && !cornerAction ? (
      <Link href={href} className={clasesTarjeta}>
        {contenido}
      </Link>
    ) : (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onClick?.()
          }
        }}
        className={clasesTarjeta}
      >
        {contenido}
      </div>
    )

  return (
    <div className={cn("group relative flex h-full flex-col", tieneSubmodulos && "pb-3")}>
      {/* Las dos "hojas" que asoman por debajo son el aviso de que el módulo
          no es una pantalla suelta. */}
      {tieneSubmodulos ? (
        <>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-6 bottom-0 h-6 rounded-2xl border border-gray-300/70 bg-white shadow-sm transition-all duration-300 group-hover:-bottom-1"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-3 bottom-1.5 h-6 rounded-2xl border border-gray-300/80 bg-white shadow-sm transition-all duration-300 group-hover:bottom-0.5"
          />
        </>
      ) : null}
      {tarjeta}
    </div>
  )
}
