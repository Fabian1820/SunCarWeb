"use client"

import { useLayoutEffect, useRef, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import { resolverDestinoVolver } from "@/lib/navegacion-modulos"
import { cn } from "@/lib/utils"

type ModuleHeaderBadge = {
  text: string
  className: string
}

type ModuleHeaderBackButton = {
  href: string
  label: string
}

interface ModuleHeaderProps {
  title: string
  subtitle?: string
  badge?: ModuleHeaderBadge
  /** Sobrescribe el destino de "Volver". Por defecto se deduce de la ruta. */
  backHref?: string
  backLabel?: string
  backButton?: ModuleHeaderBackButton
  actions?: ReactNode
  className?: string
}

export function ModuleHeader({
  title,
  subtitle,
  badge,
  backHref,
  backLabel,
  backButton,
  actions,
  className,
}: ModuleHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const headerRef = useRef<HTMLElement>(null)

  // Por defecto, "Volver" sube un nivel en la jerarquía real de la app: de un
  // submódulo a su hub, y de un módulo al área de la barra lateral desde la
  // que se entró. Antes caía siempre en "/" y sacaba al usuario al inicio.
  // Las páginas que pasan backHref/backButton mandan sobre esto.
  const destino = resolverDestinoVolver(pathname ?? "/")
  const finalBackHref = backButton?.href || backHref || destino.href
  const finalBackLabel = backButton?.label || backLabel || destino.label

  const computeOffset = () => {
    if (typeof window === "undefined") return 16
    if (window.innerWidth >= 1024) return 24
    if (window.innerWidth >= 640) return 20
    return 16
  }

  useLayoutEffect(() => {
    const element = headerRef.current
    if (!element) return

    const updateHeight = () => {
      const height = Math.ceil(element.getBoundingClientRect().height)
      const offset = computeOffset()
      document.documentElement.style.setProperty("--module-header-height", `${height}px`)
      document.documentElement.style.setProperty("--fixed-header-height", `${height}px`)
      document.documentElement.style.setProperty("--content-with-fixed-header-padding", `${height + offset}px`)

      // Also push inline padding to content areas in case they mount after load
      document.querySelectorAll<HTMLElement>(".content-with-fixed-header").forEach((node) => {
        node.style.paddingTop = `${height + offset}px`
      })
    }

    const resizeObserver = new ResizeObserver(updateHeight)
    updateHeight()
    resizeObserver.observe(element)
    window.addEventListener("resize", updateHeight)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener("resize", updateHeight)
      document.documentElement.style.removeProperty("--module-header-height")
      document.documentElement.style.removeProperty("--fixed-header-height")
      document.documentElement.style.removeProperty("--content-with-fixed-header-padding")
    }
  }, [])

  return (
    <header ref={headerRef} className={cn("fixed-header", className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3 sm:py-6 gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="icon"
              className="touch-manipulation h-9 w-9 sm:h-10 sm:w-auto sm:px-4 sm:rounded-md gap-2 shrink-0"
              aria-label={finalBackLabel}
              title={finalBackLabel}
              onClick={() => router.push(finalBackHref)}
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              {/* Las etiquetas de área son largas ("Volver a Gestión de
                  Almacenes"); se acotan para no comerse el título. */}
              <span className="hidden max-w-[15rem] truncate sm:inline-block">
                {finalBackLabel}
              </span>
              <span className="sr-only">{finalBackLabel}</span>
            </Button>

            <div className="rounded-xl bg-suncar-primary shadow-sm flex items-center justify-center h-9 w-9 sm:h-12 sm:w-12 shrink-0 p-1.5 sm:p-2">
              <img
                src="/brand/suncar-v1-iso.png"
                alt="Logo Suncar"
                className="h-full w-full object-contain"
              />
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-xl lg:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <span className="truncate">{title}</span>
                {badge && (
                  <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0", badge.className)}>
                    {badge.text}
                  </span>
                )}
              </h1>
              {subtitle && (
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {actions ? (
            <div className="flex items-center gap-2 shrink-0 [&_button]:h-9 [&_button]:w-9 [&_a]:h-9 [&_a]:w-9 sm:[&_button]:h-auto sm:[&_button]:w-auto sm:[&_button]:px-4 sm:[&_button]:py-2 sm:[&_a]:h-auto sm:[&_a]:w-auto sm:[&_a]:px-4 sm:[&_a]:py-2">
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
