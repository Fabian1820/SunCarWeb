"use client"

import { AlertTriangle, Ban, CheckCircle2, Plug, Wallet, Wrench } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import {
  ETIQUETA_ESTADO_PUESTO,
  describirVehiculo,
  etiquetaVehiculo,
  formatearDuracion,
  formatearHora,
  formatearMonto,
} from "@/lib/utils/solineras"
import { cn } from "@/lib/utils"
import type { PuestoPanel } from "@/lib/types/feats/solineras/solinera-types"

interface Props {
  puesto: PuestoPanel
  /** Sin turno abierto no se puede iniciar ninguna carga. */
  puedeIniciar: boolean
  tiempoMaximoMin: number
  onIniciar: (puesto: PuestoPanel) => void
  onAbrirCarga: (cargaId: string, accion?: "terminar") => void
  onReportarFalla: (puesto: PuestoPanel) => void
  onRestablecer: (puesto: PuestoPanel) => void
}

const CONTORNO: Record<string, string> = {
  libre: "border-emerald-200 bg-emerald-50/50",
  cargando: "border-lime-400 bg-white",
  excedida: "border-amber-400 bg-amber-50/40",
  maximo: "border-red-400 bg-red-50/40",
  terminada: "border-amber-300 bg-amber-50/60",
  cobrada: "border-emerald-400 bg-emerald-50/60",
  falla: "border-red-300 bg-red-50/60",
  fuera_servicio: "border-slate-300 bg-slate-100/70",
}

const PASTILLA: Record<string, string> = {
  libre: "bg-emerald-100 text-emerald-900",
  cargando: "bg-lime-100 text-lime-900",
  excedida: "bg-amber-100 text-amber-900",
  maximo: "bg-red-100 text-red-900",
  terminada: "bg-amber-100 text-amber-900",
  cobrada: "bg-emerald-100 text-emerald-900",
  falla: "bg-red-100 text-red-900",
  fuera_servicio: "bg-slate-200 text-slate-700",
}

/** El aspecto de la tarjeta sale del estado del puesto y, dentro de «cargando», de sus alertas. */
function aspectoDe(puesto: PuestoPanel): { clave: string; etiqueta: string } {
  const carga = puesto.carga
  if (puesto.estado === "cargando" && carga) {
    if (carga.alertas.includes("maximo")) return { clave: "maximo", etiqueta: "Pasó el máximo" }
    if (carga.alertas.includes("excedida")) return { clave: "excedida", etiqueta: "Pasó de tiempo" }
    return { clave: "cargando", etiqueta: ETIQUETA_ESTADO_PUESTO.cargando }
  }
  if (puesto.estado === "terminada" && carga) {
    return carga.estado === "cobrada"
      ? { clave: "cobrada", etiqueta: "Cobrada" }
      : { clave: "terminada", etiqueta: "Por cobrar" }
  }
  return { clave: puesto.estado, etiqueta: ETIQUETA_ESTADO_PUESTO[puesto.estado] }
}

export function PuestoCard({
  puesto,
  puedeIniciar,
  tiempoMaximoMin,
  onIniciar,
  onAbrirCarga,
  onReportarFalla,
  onRestablecer,
}: Props) {
  const { clave, etiqueta } = aspectoDe(puesto)
  const carga = puesto.carga

  return (
    <article
      aria-label={`Puesto ${puesto.codigo}: ${etiqueta}`}
      className={cn("flex min-h-[11.5rem] flex-col rounded-xl border-2 p-4", CONTORNO[clave])}
    >
      <header className="flex items-center justify-between gap-2">
        <h3 className="font-mono text-base font-semibold">{puesto.codigo}</h3>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", PASTILLA[clave])}>{etiqueta}</span>
      </header>

      {/* --- Libre --- */}
      {puesto.estado === "libre" && (
        <>
          <p className="mt-3 text-sm text-muted-foreground">
            {[puesto.tipo_toma, puesto.potencia_max_kw ? `${puesto.potencia_max_kw} kW` : null]
              .filter(Boolean)
              .join(" · ")}
            {puesto.tipos_vehiculo.length > 0 && (
              <span className="block">Solo {puesto.tipos_vehiculo.map(etiquetaVehiculo).join(", ").toLowerCase()}</span>
            )}
          </p>
          <div className="mt-auto flex items-center justify-between gap-2 pt-4">
            <Button
              onClick={() => onIniciar(puesto)}
              disabled={!puedeIniciar}
              title={puedeIniciar ? undefined : "Abre un turno para iniciar cargas"}
              className="h-10 flex-1"
            >
              <Plug className="mr-2 h-4 w-4" />
              Iniciar carga
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 text-muted-foreground"
              onClick={() => onReportarFalla(puesto)}
              aria-label={`Reportar falla en ${puesto.codigo}`}
              title="Reportar falla"
            >
              <Wrench className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      {/* --- Cargando --- */}
      {puesto.estado === "cargando" && carga && (
        <>
          <div className="mt-3 min-w-0">
            <p className="truncate font-medium">{carga.cliente.nombre}</p>
            <p className="truncate text-sm text-muted-foreground">{describirVehiculo(carga.vehiculo)}</p>
          </div>

          <div className="mt-3">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="font-semibold tabular-nums">{formatearDuracion(carga.minutos_transcurridos)}</span>
              <span className="text-xs text-muted-foreground">
                de {formatearDuracion(carga.duracion_prevista_min)}
                {carga.minutos_restantes !== null &&
                  (carga.minutos_restantes >= 0
                    ? ` · quedan ${formatearDuracion(carga.minutos_restantes)}`
                    : ` · pasó ${formatearDuracion(-carga.minutos_restantes)}`)}
              </span>
            </div>
            <Barra carga={carga.minutos_transcurridos} previsto={carga.duracion_prevista_min} maximo={tiempoMaximoMin} clave={clave} />
          </div>

          <p className="mt-2 text-sm text-muted-foreground">
            Va en <strong className="tabular-nums text-foreground">{formatearMonto(carga.importe_acumulado, carga.moneda)}</strong>
          </p>

          <div className="mt-auto flex gap-2 pt-4">
            <Button className="h-10 flex-1" onClick={() => onAbrirCarga(carga.id, "terminar")}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Terminar
            </Button>
            <Button variant="outline" className="h-10" onClick={() => onAbrirCarga(carga.id)}>
              Ver
            </Button>
          </div>
        </>
      )}

      {/* --- Terminó, sigue en el puesto --- */}
      {puesto.estado === "terminada" && carga && (
        <>
          <div className="mt-3 min-w-0">
            <p className="truncate font-medium">{carga.cliente.nombre}</p>
            <p className="truncate text-sm text-muted-foreground">{describirVehiculo(carga.vehiculo)}</p>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Terminó a las {formatearHora(carga.fin_carga)}
            {carga.alertas.includes("ocupando") && carga.minutos_esperando !== undefined && (
              <span className="ml-1 font-medium text-amber-800">· hace {formatearDuracion(carga.minutos_esperando)}</span>
            )}
          </p>
          <p className="mt-1 text-sm">
            <strong className="tabular-nums">{formatearMonto(carga.importe, carga.moneda)}</strong>
            {carga.estado === "cobrada" ? (
              <span className="text-emerald-800"> · cobrado</span>
            ) : (
              <span className="text-amber-800">
                {" "}
                · faltan <span className="tabular-nums">{formatearMonto(carga.pendiente, carga.moneda)}</span>
              </span>
            )}
          </p>
          <div className="mt-auto pt-4">
            <Button className="h-10 w-full" onClick={() => onAbrirCarga(carga.id)}>
              {carga.estado === "cobrada" ? (
                "Entregar vehículo"
              ) : (
                <>
                  <Wallet className="mr-2 h-4 w-4" />
                  Cobrar
                </>
              )}
            </Button>
          </div>
        </>
      )}

      {/* --- Falla o fuera de servicio --- */}
      {(puesto.estado === "falla" || puesto.estado === "fuera_servicio") && (
        <>
          <p className="mt-3 flex items-start gap-2 text-sm">
            {puesto.estado === "falla" ? (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
            ) : (
              <Ban className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
            )}
            <span>{puesto.motivo_estado || "Sin motivo indicado"}</span>
          </p>
          <div className="mt-auto pt-4">
            <Button variant="outline" className="h-10 w-full" onClick={() => onRestablecer(puesto)}>
              Volver a operativo
            </Button>
          </div>
        </>
      )}
    </article>
  )
}

/** Progreso frente al tiempo pedido; se pone ámbar al pasarlo y roja al pasar el máximo. */
function Barra({ carga, previsto, maximo, clave }: { carga: number; previsto: number; maximo: number; clave: string }) {
  const porcentaje = Math.min(100, Math.round((carga / Math.max(previsto, 1)) * 100))
  const color = clave === "maximo" ? "bg-red-500" : clave === "excedida" ? "bg-amber-500" : "bg-lime-500"
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={previsto}
      aria-valuenow={Math.min(carga, previsto)}
      aria-label={`Tiempo de carga sobre ${previsto} minutos pedidos; el máximo es ${maximo}`}
      className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/10"
    >
      <div className={cn("h-full rounded-full transition-[width] duration-500", color)} style={{ width: `${porcentaje}%` }} />
    </div>
  )
}
