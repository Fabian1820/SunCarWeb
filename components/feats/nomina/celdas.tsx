"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

export function formatoMonto(valor: number | null | undefined): string {
  return (valor ?? 0).toLocaleString("es", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const claseInput =
  "h-8 w-full rounded-md border border-transparent bg-transparent px-2 text-right text-sm tabular-nums " +
  "hover:border-gray-200 focus:border-[#012928] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#012928] " +
  "disabled:cursor-not-allowed disabled:text-gray-500 disabled:hover:border-transparent"

interface CeldaNumeroProps {
  value: number
  onCommit: (valor: number) => void
  disabled?: boolean
  max?: number
  className?: string
  ariaLabel: string
}

/**
 * Celda numérica editable. Guarda al salir de la celda o con Enter, solo si el
 * valor cambió; Escape descarta. Mientras se teclea no la pisa el recálculo
 * que llega del servidor.
 */
export function CeldaNumero({
  value,
  onCommit,
  disabled,
  max,
  className,
  ariaLabel,
}: CeldaNumeroProps) {
  const [borrador, setBorrador] = useState<string | null>(null)

  const confirmar = () => {
    if (borrador === null) return
    const texto = borrador.trim().replace(",", ".")
    setBorrador(null)
    if (texto === "") return
    const numero = Number(texto)
    if (!Number.isFinite(numero) || numero < 0) return
    const limitado = max !== undefined ? Math.min(numero, max) : numero
    if (limitado !== value) onCommit(limitado)
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={ariaLabel}
      disabled={disabled}
      value={borrador ?? String(value)}
      onFocus={(e) => {
        setBorrador(String(value))
        e.currentTarget.select()
      }}
      onChange={(e) => setBorrador(e.target.value)}
      onBlur={confirmar}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur()
        if (e.key === "Escape") {
          setBorrador(null)
          e.currentTarget.blur()
        }
      }}
      className={cn(claseInput, value === 0 && borrador === null && "text-gray-400", className)}
    />
  )
}

interface CeldaTextoProps {
  value: string | null
  onCommit: (valor: string) => void
  disabled?: boolean
  placeholder?: string
  ariaLabel: string
  className?: string
}

export function CeldaTexto({ value, onCommit, disabled, placeholder, ariaLabel, className }: CeldaTextoProps) {
  const [borrador, setBorrador] = useState<string | null>(null)

  const confirmar = () => {
    if (borrador === null) return
    const texto = borrador.trim()
    setBorrador(null)
    if (texto !== (value ?? "")) onCommit(texto)
  }

  return (
    <input
      type="text"
      aria-label={ariaLabel}
      disabled={disabled}
      placeholder={placeholder}
      value={borrador ?? value ?? ""}
      onFocus={() => setBorrador(value ?? "")}
      onChange={(e) => setBorrador(e.target.value)}
      onBlur={confirmar}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur()
        if (e.key === "Escape") {
          setBorrador(null)
          e.currentTarget.blur()
        }
      }}
      className={cn(claseInput, "text-left", className)}
    />
  )
}
