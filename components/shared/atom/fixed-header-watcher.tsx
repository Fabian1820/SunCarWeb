"use client"

import { useLayoutEffect } from "react"
import { usePathname } from "next/navigation"

/**
 * Observa la altura del primer .fixed-header en la página y actualiza la
 * variable CSS --fixed-header-height para que el contenido se posicione
 * correctamente debajo sin superposición.
 */
export function FixedHeaderWatcher() {
  const pathname = usePathname()

  useLayoutEffect(() => {
    let resizeObserver: ResizeObserver | null = null

    const updateHeight = () => {
      const header = document.querySelector<HTMLElement>(".fixed-header")
      if (!header) {
        document.documentElement.style.removeProperty("--fixed-header-height")
        return
      }
      const height = Math.ceil(header.getBoundingClientRect().height)
      document.documentElement.style.setProperty("--fixed-header-height", `${height}px`)
    }

    const startObserving = () => {
      const header = document.querySelector<HTMLElement>(".fixed-header")
      if (!header) return

      resizeObserver = new ResizeObserver(updateHeight)
      resizeObserver.observe(header)
      updateHeight()
    }

    updateHeight()
    startObserving()
    window.addEventListener("resize", updateHeight)
    const retry = window.setTimeout(startObserving, 150)

    return () => {
      window.clearTimeout(retry)
      window.removeEventListener("resize", updateHeight)
      resizeObserver?.disconnect()
    }
  }, [pathname])

  return null
}
