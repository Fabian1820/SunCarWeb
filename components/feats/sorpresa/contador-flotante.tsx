"use client"

import { useEffect, useRef, useState } from "react"
import { Heart, Pencil, Check, X } from "lucide-react"
import { useSorpresa } from "@/hooks/use-sorpresa"
import { useCountdown } from "@/hooks/use-countdown"

function isoToDateInput(iso: string): string {
  // "2026-06-20T00:00:00" -> "2026-06-20"
  return iso.slice(0, 10)
}

function dateInputToISO(date: string): string {
  // "2026-06-20" -> "2026-06-20T00:00:00"
  return `${date}T00:00:00`
}

export function ContadorFlotante() {
  const { esUsuarioSorpresa, completada, hidratado, fechaRegreso, setFechaRegreso } = useSorpresa()
  const { days, hours, minutes, seconds } = useCountdown(fechaRegreso)
  const [abierto, setAbierto] = useState(false)
  const [editando, setEditando] = useState(false)
  const [valorTemporal, setValorTemporal] = useState(isoToDateInput(fechaRegreso))
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    setValorTemporal(isoToDateInput(fechaRegreso))
  }, [fechaRegreso])

  useEffect(() => {
    if (!abierto) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setAbierto(false)
        setEditando(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [abierto])

  if (!hidratado || !esUsuarioSorpresa || !completada) return null

  const guardar = () => {
    if (valorTemporal) {
      setFechaRegreso(dateInputToISO(valorTemporal))
      setEditando(false)
    }
  }

  const fechaFormateada = new Date(fechaRegreso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })

  return (
    <div className="fixed top-3 right-3 z-[60]">
      <button
        ref={buttonRef}
        onClick={() => setAbierto((v) => !v)}
        className="group inline-flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur border border-rose-200 px-3 py-1.5 shadow-sm hover:shadow-md hover:border-rose-300 transition"
        title="Cuenta regresiva"
      >
        <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
        <span className="text-xs font-medium text-stone-700 tabular-nums">
          {days}d {String(hours).padStart(2, "0")}h
        </span>
      </button>

      {abierto && (
        <div
          ref={popoverRef}
          className="absolute right-0 mt-2 w-80 rounded-xl bg-white border border-stone-200 shadow-xl p-4 animate-in fade-in slide-in-from-top-1 duration-200"
        >
          <p className="text-[10px] uppercase tracking-widest text-stone-400 text-center mb-3">
            Para volver a vernos
          </p>

          <div className="flex items-start justify-center gap-3 mb-4">
            {[
              { label: "días", value: days },
              { label: "horas", value: hours },
              { label: "min", value: minutes },
              { label: "seg", value: seconds },
            ].map((it) => (
              <div key={it.label} className="flex flex-col items-center min-w-[44px]">
                <span className="font-serif text-2xl text-rose-700 tabular-nums leading-none">
                  {String(it.value).padStart(2, "0")}
                </span>
                <span className="text-[9px] uppercase tracking-widest text-stone-500 mt-1">
                  {it.label}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-stone-100 pt-3">
            {!editando ? (
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-stone-600">
                  <p className="text-[10px] uppercase tracking-wider text-stone-400">Regreso</p>
                  <p className="font-medium">{fechaFormateada}</p>
                </div>
                <button
                  onClick={() => setEditando(true)}
                  className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-rose-700 px-2 py-1 rounded transition"
                >
                  <Pencil className="w-3 h-3" /> editar
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-stone-400">
                  Nueva fecha de regreso
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={valorTemporal}
                    onChange={(e) => setValorTemporal(e.target.value)}
                    className="flex-1 text-xs border border-stone-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                  <button
                    onClick={guardar}
                    className="inline-flex items-center justify-center w-7 h-7 rounded bg-rose-600 hover:bg-rose-700 text-white transition"
                    title="Guardar"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setEditando(false)
                      setValorTemporal(isoToDateInput(fechaRegreso))
                    }}
                    className="inline-flex items-center justify-center w-7 h-7 rounded bg-stone-100 hover:bg-stone-200 text-stone-600 transition"
                    title="Cancelar"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
