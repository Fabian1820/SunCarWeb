"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useSorpresa } from "@/hooks/use-sorpresa"
import { useCountdown } from "@/hooks/use-countdown"
import {
  CARTA_LINEAS,
  MENSAJE_INTRIGA,
  MENSAJE_WHATSAPP,
  SUBTITULO_REVEAL,
  TELEFONO_WHATSAPP,
  TEXTO_BOTON_CERRAR,
  TEXTO_BOTON_INTRIGA,
  TEXTO_CONTADOR_REVEAL,
  TITULO_INTRIGA,
  TITULO_REVEAL,
} from "@/lib/sorpresa-config"

type Fase = "intriga" | "esperando" | "reveal"

export function SorpresaScreen() {
  const { marcarCompletada, fechaRegreso } = useSorpresa()
  const [fase, setFase] = useState<Fase>("intriga")
  const clickConfirmadoRef = useRef(false)

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible" && clickConfirmadoRef.current) {
        setFase("reveal")
      }
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [])

  const whatsappUrl = useMemo(
    () => `https://wa.me/${TELEFONO_WHATSAPP}?text=${encodeURIComponent(MENSAJE_WHATSAPP)}`,
    [],
  )

  const onContinuar = () => {
    clickConfirmadoRef.current = true
    setFase("esperando")
    window.open(whatsappUrl, "_blank", "noopener,noreferrer")
  }

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-gradient-to-br from-[#fdf6ef] via-[#fbeadd] to-[#f7d9c4]">
      {fase === "reveal" && <FloatingHearts />}

      <div className="relative min-h-full flex items-center justify-center px-6 sm:px-10 py-12">
        <div className="w-full max-w-2xl text-center">
        {fase === "intriga" && (
          <div className="animate-in fade-in duration-700">
            <p className="text-xs uppercase tracking-[0.3em] text-stone-500 mb-6">Sistema</p>
            <h1 className="font-serif text-3xl sm:text-4xl text-stone-800 mb-4">{TITULO_INTRIGA}</h1>
            <p className="text-stone-600 text-base sm:text-lg leading-relaxed max-w-md mx-auto mb-10">
              {MENSAJE_INTRIGA}
            </p>
            <button
              onClick={onContinuar}
              className="inline-flex items-center gap-2 rounded-full bg-stone-800 hover:bg-stone-900 text-white px-8 py-3 text-sm font-medium tracking-wide transition shadow-sm hover:shadow-md"
            >
              {TEXTO_BOTON_INTRIGA}
            </button>
          </div>
        )}

        {fase === "esperando" && (
          <div className="animate-in fade-in duration-500">
            <div className="mx-auto mb-6 h-10 w-10 rounded-full border-2 border-stone-300 border-t-stone-700 animate-spin" />
            <p className="text-stone-600 text-sm">Esperando confirmación...</p>
            <button
              onClick={() => {
                clickConfirmadoRef.current = true
                setFase("reveal")
              }}
              className="mt-10 text-xs text-stone-400 hover:text-stone-600 underline-offset-4 hover:underline transition"
            >
              ya volví
            </button>
          </div>
        )}

        {fase === "reveal" && (
          <Reveal
            titulo={TITULO_REVEAL}
            subtitulo={SUBTITULO_REVEAL}
            lineas={CARTA_LINEAS}
            fechaRegresoISO={fechaRegreso}
            onCerrar={marcarCompletada}
          />
        )}
        </div>
      </div>
    </div>
  )
}

function Reveal({
  titulo,
  subtitulo,
  lineas,
  fechaRegresoISO,
  onCerrar,
}: {
  titulo: string
  subtitulo: string
  lineas: string[]
  fechaRegresoISO: string
  onCerrar: () => void
}) {
  const [terminado, setTerminado] = useState(false)

  return (
    <div className="animate-in fade-in duration-1000">
      <h1 className="font-serif text-4xl sm:text-5xl text-stone-800 mb-3">{titulo}</h1>
      {subtitulo && (
        <p className="text-stone-500 italic mb-8 text-sm sm:text-base">{subtitulo}</p>
      )}

      <CartaTypewriter lineas={lineas} onTerminar={() => setTerminado(true)} />

      {terminado && (
        <div className="mt-14 animate-in fade-in slide-in-from-bottom-2 duration-1000">
          <p className="text-xs uppercase tracking-[0.3em] text-stone-500 mb-5">
            {TEXTO_CONTADOR_REVEAL}
          </p>
          <CountdownBlock targetISO={fechaRegresoISO} size="large" />
          <button
            type="button"
            onClick={onCerrar}
            className="relative z-10 mt-12 inline-flex items-center gap-2 rounded-full bg-rose-700 hover:bg-rose-800 active:bg-rose-900 text-white px-8 py-3 text-sm font-medium tracking-wide transition shadow-sm hover:shadow-md cursor-pointer"
          >
            {TEXTO_BOTON_CERRAR}
          </button>
        </div>
      )}
    </div>
  )
}

function CartaTypewriter({
  lineas,
  onTerminar,
}: {
  lineas: string[]
  onTerminar: () => void
}) {
  const [textoVisible, setTextoVisible] = useState<string[]>([])
  const onTerminarRef = useRef(onTerminar)
  onTerminarRef.current = onTerminar

  useEffect(() => {
    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    // Pre-procesar en arrays de "code points" para no romper emojis al hacer slice.
    const lineasChars = lineas.map((l) => Array.from(l))

    const CHAR_DELAY = 22
    const PAUSE_BETWEEN = 380

    let lineaIndex = 0
    let charIndex = 0

    const step = () => {
      if (cancelled) return
      if (lineaIndex >= lineasChars.length) {
        onTerminarRef.current()
        return
      }
      const chars = lineasChars[lineaIndex]
      if (charIndex < chars.length) {
        charIndex++
        const snapshot = chars.slice(0, charIndex).join("")
        setTextoVisible((prev) => {
          const copy = [...prev]
          copy[lineaIndex] = snapshot
          return copy
        })
        timeoutId = setTimeout(step, CHAR_DELAY)
      } else {
        lineaIndex++
        charIndex = 0
        timeoutId = setTimeout(step, PAUSE_BETWEEN)
      }
    }

    step()

    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [lineas])

  return (
    <div className="space-y-5 text-left max-w-xl mx-auto">
      {lineas.map((linea, i) => {
        const visible = textoVisible[i] ?? ""
        if (i > 0 && !visible) return null
        const total = Array.from(linea).length
        const visibleLen = Array.from(visible).length
        return (
          <p
            key={i}
            className="font-serif text-stone-700 text-base sm:text-lg leading-relaxed"
          >
            {visible}
            {visibleLen < total && (
              <span className="inline-block w-[2px] h-5 bg-stone-500 ml-0.5 align-middle animate-pulse" />
            )}
          </p>
        )
      })}
    </div>
  )
}

function CountdownBlock({
  targetISO,
  size = "large",
}: {
  targetISO: string
  size?: "large" | "small"
}) {
  const { days, hours, minutes, seconds } = useCountdown(targetISO)
  const items = [
    { label: "días", value: days },
    { label: "horas", value: hours },
    { label: "min", value: minutes },
    { label: "seg", value: seconds },
  ]
  const numCls =
    size === "large"
      ? "font-serif text-4xl sm:text-5xl text-rose-700 tabular-nums"
      : "font-serif text-2xl text-rose-700 tabular-nums"
  const labelCls =
    size === "large"
      ? "text-[10px] uppercase tracking-widest text-stone-500 mt-1"
      : "text-[9px] uppercase tracking-widest text-stone-500 mt-0.5"
  return (
    <div className="flex items-start justify-center gap-4 sm:gap-6">
      {items.map((it) => (
        <div key={it.label} className="flex flex-col items-center">
          <span className={numCls}>{String(it.value).padStart(2, "0")}</span>
          <span className={labelCls}>{it.label}</span>
        </div>
      ))}
    </div>
  )
}

function FloatingHearts() {
  const hearts = Array.from({ length: 12 })
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {hearts.map((_, i) => {
        const left = (i * 8.3) % 100
        const delay = (i * 0.7) % 8
        const duration = 12 + (i % 5) * 2
        const size = 10 + (i % 4) * 4
        return (
          <span
            key={i}
            className="absolute text-rose-300/60"
            style={{
              left: `${left}%`,
              bottom: `-40px`,
              fontSize: `${size}px`,
              animation: `sorpresa-float ${duration}s linear ${delay}s infinite`,
            }}
          >
            ♥
          </span>
        )
      })}
      <style jsx>{`
        @keyframes sorpresa-float {
          0% {
            transform: translateY(0) translateX(0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          100% {
            transform: translateY(-110vh) translateX(20px) rotate(40deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}
