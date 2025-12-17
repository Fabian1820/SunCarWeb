"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import { cn } from "@/lib/utils"

type ModuleHeaderBadge = {
  text: string
  className: string
}

interface ModuleHeaderProps {
  title: string
  subtitle?: string
  badge?: ModuleHeaderBadge
  backHref?: string
  backLabel?: string
  actions?: ReactNode
  className?: string
}

export function ModuleHeader({
  title,
  subtitle,
  badge,
  backHref = "/",
  backLabel = "Volver al Dashboard",
  actions,
  className,
}: ModuleHeaderProps) {
  return (
    <header className={cn("fixed-header", className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3 sm:py-6 gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Link href={backHref} className="flex shrink-0" aria-label={backLabel} title={backLabel}>
              <Button variant="ghost" size="icon" className="touch-manipulation h-9 w-9 sm:h-10 sm:w-10">
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="sr-only">{backLabel}</span>
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
            <div className="flex items-center gap-2 shrink-0 [&>button]:h-9 [&>button]:w-9 sm:[&>button]:h-auto sm:[&>button]:w-auto sm:[&>button]:px-4 sm:[&>button]:py-2">
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}

