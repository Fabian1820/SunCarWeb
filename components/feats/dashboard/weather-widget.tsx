"use client"

import { useEffect, useState } from "react"

const LAT = 23.1136
const LON = -82.3666
const TZ = "America/Havana"

type HourData = {
  hour: number
  temp: number
  precipProb: number
  code: number
  radiation: number // shortwave_radiation W/m²
}

function decodeWMO(code: number) {
  if (code === 0)   return { label: "Despejado",            emoji: "☀️",  isThunder: false, isRain: false }
  if (code <= 3)    return { label: "Parcialmente nublado",  emoji: "⛅",  isThunder: false, isRain: false }
  if (code <= 48)   return { label: "Nublado / Neblina",     emoji: "🌫️", isThunder: false, isRain: false }
  if (code <= 57)   return { label: "Llovizna",              emoji: "🌦️", isThunder: false, isRain: true  }
  if (code <= 65)   return { label: "Lluvia",                emoji: "🌧️", isThunder: false, isRain: true  }
  if (code <= 82)   return { label: "Chubascos",             emoji: "🌧️", isThunder: false, isRain: true  }
  if (code === 95)  return { label: "Tormenta eléctrica",    emoji: "⛈️",  isThunder: true,  isRain: true  }
  if (code >= 96)   return { label: "Tormenta con granizo",  emoji: "⛈️",  isThunder: true,  isRain: true  }
  return             { label: "Nublado",                     emoji: "☁️",  isThunder: false, isRain: false }
}

// Hora 24h → "4 pm" / "6 am" / "12 pm"
function fmtHour(h: number): string {
  const period = h < 12 ? "am" : "pm"
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12} ${period}`
}

type RainSummary = {
  text: string
  hasRain: boolean
  hasThunder: boolean
}

// Mensaje personal y cercano sobre la lluvia, en bloques con AM/PM
function buildRainSummary(hours: HourData[]): RainSummary {
  const day = hours.filter(h => h.hour >= 6 && h.hour <= 21)
  if (!day.length) return { text: "No hay datos del clima por ahora 🤔", hasRain: false, hasThunder: false }

  type Bloque = { from: number; to: number; isThunder: boolean }
  const bloques: Bloque[] = []
  let cur: Bloque | null = null

  for (const h of day) {
    const dec = decodeWMO(h.code)
    const hasEvent = dec.isRain || dec.isThunder || h.precipProb >= 40
    if (hasEvent) {
      if (!cur) cur = { from: h.hour, to: h.hour, isThunder: dec.isThunder }
      else { cur.to = h.hour; if (dec.isThunder) cur.isThunder = true }
    } else if (cur) {
      bloques.push(cur); cur = null
    }
  }
  if (cur) bloques.push(cur)

  if (!bloques.length) {
    return { text: "Día seco, puedes salir tranquilo 😎", hasRain: false, hasThunder: false }
  }

  const hasThunder = bloques.some(b => b.isThunder)

  const franjas = bloques.map(b =>
    b.from === b.to ? `a las ${fmtHour(b.from)}` : `de ${fmtHour(b.from)} a ${fmtHour(b.to)}`
  )
  const cuando = franjas.join(" y ")

  const text = hasThunder
    ? `Ojo, se esperan tormentas eléctricas ${cuando}. Mejor resguárdate ⛈️😬`
    : `Cuídate al salir y lleva paraguas, lloverá ${cuando} 🌂🙂`

  return { text, hasRain: true, hasThunder }
}

type Condition = {
  label: string
  emoji: string
  tone: "good" | "moderate" | "bad"
}

// Clasifica qué tan bien generarán los paneles en un período dado,
// según despeje del cielo y lluvia.
function classifyConditions(hours: HourData[]): Condition {
  if (!hours.length) return { label: "Sin datos", emoji: "🤔", tone: "moderate" }

  let score = 0
  for (const h of hours) {
    const dec = decodeWMO(h.code)
    let s: number
    if (dec.isThunder || dec.isRain) s = 0
    else if (h.code === 0) s = 2
    else if (h.code <= 3) s = 1
    else s = 0
    if (h.precipProb >= 50) s = Math.min(s, 0)
    score += s
  }
  const avg = score / hours.length

  if (avg >= 1.4) return { label: "Generando bien 😄",   emoji: "☀️", tone: "good" }
  if (avg >= 0.7) return { label: "Generación regular 😐", emoji: "⛅", tone: "moderate" }
  return                 { label: "Poco generando 😟",    emoji: "🌧️", tone: "bad" }
}

export function WeatherWidget() {
  const [hours, setHours] = useState<HourData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
      `&hourly=temperature_2m,precipitation_probability,weather_code,shortwave_radiation` +
      `&timezone=${encodeURIComponent(TZ)}&forecast_days=1`
    )
      .then(r => r.json())
      .then(data => {
        setHours(
          (data.hourly.time as string[]).map((t, i) => ({
            hour: new Date(t).getHours(),
            temp: Math.round(data.hourly.temperature_2m[i]),
            precipProb: data.hourly.precipitation_probability[i] ?? 0,
            code: data.hourly.weather_code[i] ?? 0,
            radiation: data.hourly.shortwave_radiation[i] ?? 0,
          }))
        )
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="rounded-2xl border border-gray-200/70 bg-white/80 p-5 shadow-sm animate-pulse h-32" />
  }
  if (error || !hours.length) return null

  const now = new Date()
  const currentHour = hours.find(h => h.hour === now.getHours()) ?? hours[0]
  const dec = decodeWMO(currentHour.code)
  const rainSummary = buildRainSummary(hours)

  const condActual = classifyConditions([currentHour])

  const headerBg = rainSummary.hasThunder ? "bg-amber-50" : rainSummary.hasRain ? "bg-blue-50" : "bg-white/80"
  const headerText = rainSummary.hasThunder ? "text-amber-800" : rainSummary.hasRain ? "text-blue-800" : "text-gray-700"

  const condTone = {
    good:     "bg-emerald-50 text-emerald-700 border-emerald-200",
    moderate: "bg-amber-50 text-amber-700 border-amber-200",
    bad:      "bg-blue-50 text-blue-700 border-blue-200",
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200/70 bg-white/80 shadow-sm backdrop-blur-sm">
      {/* Clima */}
      <div className={`flex items-center gap-4 px-5 py-4 ${headerBg}`}>
        <span className="select-none text-4xl leading-none">{dec.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="mb-0.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
            La Habana · {now.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short" })}
          </p>
          <p className={`text-sm font-medium leading-snug ${headerText}`}>{rainSummary.text}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="text-2xl font-bold text-gray-800">{currentHour.temp}°C</p>
          <p className="text-xs text-gray-400">{dec.label}</p>
        </div>
      </div>

      {/* Estado actual de generación de paneles */}
      <div className={`flex items-center gap-3 border-t border-gray-100 px-5 py-3 ${condTone[condActual.tone]}`}>
        <span className="text-2xl leading-none">{condActual.emoji}</span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider opacity-60">Paneles ahora mismo</p>
          <p className="text-sm font-bold">{condActual.label}</p>
        </div>
        <div className="flex-1" />
      </div>
    </div>
  )
}
