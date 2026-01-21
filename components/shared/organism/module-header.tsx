"use client"

import { useLayoutEffect, useRef, type ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
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
  backHref = "/",
  backLabel = "Volver al Dashboard",
  backButton,
  actions,
  className,
}: ModuleHeaderProps) {
  const headerRef = useRef<HTMLElement>(null)

  // Si se proporciona backButton, usar esos valores
  const finalBackHref = backButton?.href || backHref
  const finalBackLabel = backButton?.label || backLabel

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
            <Link href={finalBackHref} className="flex shrink-0" aria-label={finalBackLabel} title={finalBackLabel}>
              <Button
                variant="ghost"
                size="icon"
                className="touch-manipulation h-9 w-9 sm:h-10 sm:w-auto sm:px-4 sm:rounded-md gap-2"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">{finalBackLabel}</span>
                <span className="sr-only">{finalBackLabel}</span>
              </Button>
            </Link>

            <div className="p-0 rounded-full bg-white shadow border border-orange-200 flex items-center justify-center h-9 w-9 sm:h-12 sm:w-12 shrink-0">
              <img
                src="/logo.png"
                alt="Logo SunCar"
                className="h-7 w-7 sm:h-10 sm:w-10 object-contain rounded-full"
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
