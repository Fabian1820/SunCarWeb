"use client"

import { useEffect, useState } from "react"
import { Cloud, CloudRain, CloudLightning, Sun, CloudDrizzle, Wind, Thermometer, Droplets } from "lucide-react"

// Coordenadas de La Habana
const LAT = 23.1136
const LON = -82.3666
const TZ = "America/Havana"

type HourData = {
  hour: number       // 0-23
  label: string      // "06:00"
  temp: number
  precipProb: number // 0-100
  precip: number     // mm
  code: number       // WMO weather code
}

type WeatherState = {
  hours: HourData[]
  fetchedAt: Date
}

// Descripción e icono por código WMO
function decodeWMO(code: number): { label: string; emoji: string; isThunder: boolean; isRain: boolean } {
  if (code === 0)                        return { label: "Despejado",           emoji: "☀️",  isThunder: false, isRain: false }
  if (code <= 3)                         return { label: "Parcialmente nublado", emoji: "⛅",  isThunder: false, isRain: false }
  if (code <= 48)                        return { label: "Neblina",              emoji: "🌫️", isThunder: false, isRain: false }
  if (code <= 57)                        return { label: "Llovizna",             emoji: "🌦️", isThunder: false, isRain: true  }
  if (code <= 65)                        return { label: "Lluvia",               emoji: "🌧️", isThunder: false, isRain: true  }
  if (code <= 77)                        return { label: "Nieve",                emoji: "❄️",  isThunder: false, isRain: false }
  if (code <= 82)                        return { label: "Chubascos",            emoji: "🌧️", isThunder: false, isRain: true  }
  if (code === 95)                       return { label: "Tormenta eléctrica",   emoji: "⛈️",  isThunder: true,  isRain: true  }
  if (code >= 96)                        return { label: "Tormenta con granizo", emoji: "⛈️",  isThunder: true,  isRain: true  }
  return { label: "Nublado", emoji: "☁️", isThunder: false, isRain: false }
}

function precipBar(prob: number) {
  const w = `${prob}%`
  const color = prob >= 80 ? "bg-red-400" : prob >= 50 ? "bg-amber-400" : prob >= 20 ? "bg-blue-400" : "bg-emerald-300"
  return (
    <div className="h-1 w-full rounded-full bg-gray-100 mt-1">
      <div className={`h-1 rounded-full ${color}`} style={{ width: w }} />
    </div>
  )
}

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const url =
          `https://api.open-meteo.com/v1/forecast` +
          `?latitude=${LAT}&longitude=${LON}` +
          `&hourly=temperature_2m,precipitation_probability,precipitation,weather_code` +
          `&timezone=${encodeURIComponent(TZ)}` +
          `&forecast_days=1`

        const res = await fetch(url)
        if (!res.ok) throw new Error("Error al cargar el clima")
        const data = await res.json()

        const hours: HourData[] = (data.hourly.time as string[]).map((t, i) => {
          const h = new Date(t).getHours()
          return {
            hour: h,
            label: `${String(h).padStart(2, "0")}:00`,
            temp: Math.round(data.hourly.temperature_2m[i]),
            precipProb: data.hourly.precipitation_probability[i] ?? 0,
            precip: data.hourly.precipitation[i] ?? 0,
            code: data.hourly.weather_code[i] ?? 0,
          }
        })

        setWeather({ hours, fetchedAt: new Date() })
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error desconocido")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200/70 bg-white/80 p-5 shadow-sm backdrop-blur-sm animate-pulse">
        <div className="h-4 w-32 rounded bg-gray-100 mb-4" />
        <div className="flex gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-20 w-14 rounded-xl bg-gray-100 flex-shrink-0" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !weather) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50/60 p-5 text-sm text-red-600">
        No se pudo cargar el clima: {error}
      </div>
    )
  }

  const now = new Date()
  const currentHour = now.getHours()

  // Horas laborales: 6:00 → 20:00
  const workHours = weather.hours.filter(h => h.hour >= 6 && h.hour <= 20)

  // Alertas: horas con tormenta o lluvia probable ≥ 50%
  const alerts = workHours.filter(h => {
    const dec = decodeWMO(h.code)
    return dec.isThunder || h.precipProb >= 50
  })

  const hasThunder = alerts.some(h => decodeWMO(h.code).isThunder)
  const hasRain = alerts.some(h => decodeWMO(h.code).isRain)

  // Resumen de alerta
  let alertBanner: React.ReactNode = null
  if (hasThunder) {
    alertBanner = (
      <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
        <span className="text-base">⛈️</span>
        <span>Se esperan <strong>tormentas eléctricas</strong> durante el día. Precaución al salir.</span>
      </div>
    )
  } else if (hasRain) {
    alertBanner = (
      <div className="flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-200 px-3 py-2 text-sm text-blue-800">
        <span className="text-base">🌧️</span>
        <span>Se esperan <strong>lluvias</strong> en algunas horas del día.</span>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-200/70 bg-white/80 shadow-sm backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Clima · La Habana</p>
          <p className="text-sm text-gray-500 mt-0.5">
            {now.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <p className="text-[10px] text-gray-300">Open-Meteo</p>
      </div>

      {/* Alerta */}
      {alertBanner && <div className="px-5 pb-3">{alertBanner}</div>}

      {/* Timeline horaria */}
      <div className="overflow-x-auto px-5 pb-5">
        <div className="flex gap-2 w-max">
          {workHours.map(h => {
            const dec = decodeWMO(h.code)
            const isPast = h.hour < currentHour
            const isCurrent = h.hour === currentHour
            return (
              <div
                key={h.hour}
                className={`flex flex-col items-center gap-1 rounded-xl px-2.5 py-3 min-w-[52px] transition-colors ${
                  isCurrent
                    ? "bg-emerald-50 ring-1 ring-emerald-200"
                    : isPast
                    ? "opacity-40"
                    : dec.isThunder
                    ? "bg-amber-50"
                    : dec.isRain
                    ? "bg-blue-50"
                    : ""
                }`}
              >
                <p className={`text-[11px] font-semibold ${isCurrent ? "text-emerald-700" : "text-gray-500"}`}>
                  {isCurrent ? "Ahora" : h.label}
                </p>
                <span className="text-xl leading-none">{dec.emoji}</span>
                <p className="text-xs font-bold text-gray-800">{h.temp}°</p>
                <p className={`text-[11px] font-semibold ${
                  h.precipProb >= 80 ? "text-red-500" :
                  h.precipProb >= 50 ? "text-amber-500" :
                  h.precipProb >= 20 ? "text-blue-500" : "text-gray-300"
                }`}>
                  {h.precipProb}%
                </p>
                {precipBar(h.precipProb)}
                {h.precip > 0 && (
                  <p className="text-[10px] text-blue-400">{h.precip.toFixed(1)}mm</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-4 border-t border-gray-100 px-5 py-2.5 text-[11px] text-gray-400">
        <span><span className="font-semibold text-gray-500">%</span> probabilidad lluvia</span>
        <span><span className="font-semibold text-blue-400">mm</span> acumulado</span>
        <span className="ml-auto">Hora local</span>
      </div>
    </div>
  )
}
