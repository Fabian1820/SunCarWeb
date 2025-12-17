"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"

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
  const isMobile = useIsMobile()
  
  return (
    <header className={cn("fixed-header", className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3 sm:py-6 gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Link href={backHref} className="flex shrink-0" aria-label={backLabel} title={backLabel}>
              <Button variant="ghost" size="icon" className="touch-manipulation">
                <ArrowLeft className="h-4 w-4" />
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
              <h1 className={cn(
                "font-bold text-gray-900 flex items-center gap-2",
                isMobile ? "text-base" : "text-xl"
              )}>
                <span className="truncate">{title}</span>
                {badge && (
                  <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0", badge.className)}>
                    {badge.text}
                  </span>
                )}
              </h1>
              {subtitle && (
                <p className={cn("text-gray-600", isMobile ? "text-xs hidden" : "text-sm block")}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {actions ? <div className="flex items-center gap-2 shrink-0">{actions}</div> : null}
        </div>
      </div>
    </header>
  )
}

