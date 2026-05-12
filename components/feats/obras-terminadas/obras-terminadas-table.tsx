"use client"

import React, { useState, useMemo } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/molecule/table"
import { Badge } from "@/components/shared/atom/badge"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import {
  Loader2,
  ChevronDown,
  ChevronRight,
  Search,
  FileText,
  Briefcase,
  Wrench,
  User,
  AlertTriangle,
  Filter,
  X,
  Package,
  CalendarDays,
} from "lucide-react"
import type { OfertaObra, DetalleCliente } from "@/hooks/use-obras-terminadas"
import type { PagoObra, TrabajoDiarioObra, ValeSalidaObra } from "@/lib/services/feats/obras-terminadas/obras-terminadas-service"
import { ExportComprobanteService } from "@/lib/services/feats/pagos/export-comprobante-service"
import { cn } from "@/lib/utils"

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

const safeText = (value: unknown, fallback = ""): string => {
  const text = String(value || "").trim()
  return text || fallback
}

const toCleanString = (value: unknown): string | null => {
  if (typeof value !== "string") return null
  const t = value.trim()
  return t.length > 0 ? t : null
}

const parseNullableNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const n = Number(value.trim().replace(",", "."))
    return Number.isFinite(n) ? n : null
  }
  return null
}

const toEpochMs = (value: string): number => {
  const t = new Date(value).getTime()
  return Number.isFinite(t) ? t : 0
}

const roundToCents = (v: number) =>
  Math.round((v + Number.EPSILON) * 100) / 100

const normalizeEstadoKey = (estado: string) =>
  estado
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()

const ESTADO_LABELS: Record<string, string> = {
  "equipo instalado con exito": "Equipo instalado con éxito",
  "pendiente de instalacion": "Pendiente de instalación",
  "instalacion en proceso": "Instalación en Proceso",
  "esperando equipo": "Esperando equipo",
  "no interesado": "No interesado",
  "pendiente de presupuesto": "Pendiente de presupuesto",
  "pendiente de visita": "Pendiente de visita",
  "pendiente de visitarnos": "Pendiente de visitarnos",
  proximamente: "Próximamente",
  "revisando ofertas": "Revisando ofertas",
  "sin respuesta": "Sin respuesta",
}

const ESTADO_BADGE: Record<string, string> = {
  "equipo instalado con exito": "bg-green-100 text-green-700 border-green-300",
  "pendiente de instalacion": "bg-amber-100 text-amber-800 border-amber-300",
  "instalacion en proceso": "bg-blue-100 text-blue-700 border-blue-300",
  "esperando equipo": "bg-cyan-100 text-cyan-800 border-cyan-300",
  "no interesado": "bg-slate-200 text-slate-700 border-slate-300",
  "pendiente de presupuesto": "bg-purple-100 text-purple-800 border-purple-300",
  "pendiente de visita": "bg-sky-100 text-sky-800 border-sky-300",
  "pendiente de visitarnos": "bg-pink-100 text-pink-800 border-pink-300",
  proximamente: "bg-indigo-100 text-indigo-800 border-indigo-300",
  "revisando ofertas": "bg-violet-100 text-violet-800 border-violet-300",
  "sin respuesta": "bg-red-100 text-red-700 border-red-300",
}

const getEstadoCliente = (o: OfertaObra): string => {
  const raw =
    toCleanString(o.contacto?.estado) ||
    toCleanString(o.estado) ||
    "Sin estado"
  return ESTADO_LABELS[normalizeEstadoKey(raw)] || raw
}

const getEstadoBadgeClass = (estado: string) =>
  ESTADO_BADGE[normalizeEstadoKey(estado)] ||
  "bg-gray-100 text-gray-700 border-gray-300"

const getMontoAplicadoUsd = (p: PagoObra) =>
  Math.max(0, (p.monto_usd ?? 0) - (p.diferencia ?? 0))

const getTotalDevueltoOferta = (o: OfertaObra): number => {
  if (typeof o.total_devuelto === "number") return o.total_devuelto
  if (Array.isArray(o.devoluciones))
    return o.devoluciones.reduce((s: number, d) => s + Number(d.monto_devuelto || 0), 0)
  return 0
}

const getTotalDevueltoPago = (p: PagoObra): number => {
  if (typeof p.total_devuelto === "number") return p.total_devuelto
  return 0
}

const ordenarPagos = (pagos: PagoObra[]) =>
  [...pagos].sort((a, b) => {
    const d = toEpochMs(a.fecha ?? "") - toEpochMs(b.fecha ?? "")
    if (d !== 0) return d
    const dc = toEpochMs(a.fecha_creacion ?? "") - toEpochMs(b.fecha_creacion ?? "")
    if (dc !== 0) return dc
    return (a.id ?? "").localeCompare(b.id ?? "")
  })

const getTotalesParaPago = (oferta: OfertaObra, pagoId: string) => {
  const sorted = ordenarPagos(oferta.pagos ?? [])
  const precioFinal = oferta.precio_final ?? 0
  const idx = sorted.findIndex((p) => p.id === pagoId)
  if (idx < 0)
    return { totalPagadoAnteriormente: 0, pendienteDespuesPago: roundToCents(Math.max(0, precioFinal)) }
  const antes = sorted.slice(0, idx).reduce((s, p) => s + getMontoAplicadoUsd(p), 0)
  const conEste = antes + getMontoAplicadoUsd(sorted[idx])
  const pendiente = precioFinal - conEste
  return {
    totalPagadoAnteriormente: roundToCents(antes),
    pendienteDespuesPago: roundToCents(
      pendiente < 0.01 && pendiente > -0.01 ? 0 : Math.max(0, pendiente),
    ),
  }
}

/* ─────────────────────────────────────────────
   Date utils
───────────────────────────────────────────── */

const todayStr = (): string => new Date().toISOString().slice(0, 10)

const mesActualRange = (): { desde: string; hasta: string } => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const desde = new Date(year, month, 1).toISOString().slice(0, 10)
  const hasta = new Date(year, month + 1, 0).toISOString().slice(0, 10)
  return { desde, hasta }
}

const dateInRange = (dateStr: string | null | undefined, desde: string, hasta: string): boolean => {
  if (!dateStr) return false
  const d = dateStr.slice(0, 10)
  return d >= desde && d <= hasta
}

/* ─────────────────────────────────────────────
   Formatters
───────────────────────────────────────────── */

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(v)

const fmtDate = (s: string): string => {
  const text = safeText(s)
  if (!text) return "Sin fecha"
  const onlyDate = text.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (onlyDate) {
    const local = new Date(Number(onlyDate[1]), Number(onlyDate[2]) - 1, Number(onlyDate[3]))
    return local.toLocaleDateString("es-ES")
  }
  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? text.slice(0, 10) : parsed.toLocaleDateString("es-ES", { year: "numeric", month: "short", day: "numeric" })
}

/* ─────────────────────────────────────────────
   Badges
───────────────────────────────────────────── */

const TipoPagoBadge = ({ tipo }: { tipo: string }) => {
  if (tipo === "anticipo") return <Badge className="bg-blue-100 text-blue-700">Anticipo</Badge>
  if (tipo === "completo") return <Badge className="bg-emerald-100 text-emerald-700">Completo</Badge>
  return <Badge className="bg-purple-100 text-purple-700">Pendiente</Badge>
}

const MetodoPagoBadge = ({ metodo }: { metodo: string }) => {
  if (metodo === "efectivo") return <Badge className="bg-green-100 text-green-700">Efectivo</Badge>
  if (metodo === "transferencia_bancaria") return <Badge className="bg-orange-100 text-orange-700">Transferencia</Badge>
  if (metodo === "stripe") return <Badge className="bg-indigo-100 text-indigo-700">Stripe</Badge>
  return <Badge>{metodo}</Badge>
}

const EstadoTrabajoBadge = ({ terminada }: { terminada?: boolean }) =>
  terminada ? (
    <Badge className="bg-emerald-100 text-emerald-800 text-[11px] font-medium">Terminada</Badge>
  ) : (
    <Badge className="bg-amber-100 text-amber-800 text-[11px] font-medium">Pendiente</Badge>
  )

const colorBarra = (t: TrabajoDiarioObra) => {
  const tipo = safeText(t.tipo_trabajo).toUpperCase()
  if (tipo.includes("AVERIA") || tipo.includes("AVERÍA")) return "bg-red-400"
  if (tipo.includes("NUEVA")) return "bg-orange-400"
  if (tipo.includes("PROCESO")) return "bg-blue-400"
  if (tipo.includes("ACTUALIZ")) return "bg-violet-500"
  return "bg-slate-400"
}

/* ─────────────────────────────────────────────
   Filter types & DateFilter widget
───────────────────────────────────────────── */

type DateFilterMode = "off" | "mes" | "rango"
interface DateFilterState { mode: DateFilterMode; desde: string; hasta: string }
const initialDateFilter = (): DateFilterState => {
  const mes = mesActualRange()
  return { mode: "off", desde: mes.desde, hasta: todayStr() }
}

function DateFilterWidget({
  label,
  icon,
  state,
  onChange,
}: {
  label: string
  icon: React.ReactNode
  state: DateFilterState
  onChange: (s: DateFilterState) => void
}) {
  const mes = mesActualRange()
  return (
    <div className="flex flex-col gap-1 min-w-[200px]">
      <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
        {icon} {label}
      </span>
      <div className="flex gap-1">
        <button
          onClick={() => onChange({ ...state, mode: state.mode === "mes" ? "off" : "mes", desde: mes.desde, hasta: mes.hasta })}
          className={cn(
            "px-2 py-1 text-xs rounded border transition-colors",
            state.mode === "mes"
              ? "bg-orange-500 text-white border-orange-500"
              : "border-gray-300 text-gray-600 hover:border-orange-400",
          )}
        >
          Este mes
        </button>
        <button
          onClick={() => onChange({ ...state, mode: state.mode === "rango" ? "off" : "rango" })}
          className={cn(
            "px-2 py-1 text-xs rounded border transition-colors",
            state.mode === "rango"
              ? "bg-orange-500 text-white border-orange-500"
              : "border-gray-300 text-gray-600 hover:border-orange-400",
          )}
        >
          Rango
        </button>
        {state.mode !== "off" && (
          <button
            onClick={() => onChange({ ...state, mode: "off" })}
            className="px-1.5 py-1 text-xs rounded border border-gray-200 text-gray-400 hover:text-gray-600"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      {state.mode === "rango" && (
        <div className="flex gap-1 items-center mt-0.5">
          <input
            type="date"
            value={state.desde}
            onChange={(e) => onChange({ ...state, desde: e.target.value })}
            className="text-xs border border-gray-300 rounded px-1.5 py-1 w-[120px] focus:outline-none focus:border-orange-400"
          />
          <span className="text-xs text-gray-400">—</span>
          <input
            type="date"
            value={state.hasta}
            onChange={(e) => onChange({ ...state, hasta: e.target.value })}
            className="text-xs border border-gray-300 rounded px-1.5 py-1 w-[120px] focus:outline-none focus:border-orange-400"
          />
        </div>
      )}
      {state.mode === "mes" && (
        <span className="text-[11px] text-orange-600">
          {fmtDate(state.desde)} — {fmtDate(state.hasta)}
        </span>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Panel: PAGOS
───────────────────────────────────────────── */

function PagosPanel({ oferta }: { oferta: OfertaObra }) {
  const [expandedExcedentes, setExpandedExcedentes] = useState<Set<string>>(new Set())
  const toggleExcedente = (id: string) => {
    const next = new Set(expandedExcedentes)
    next.has(id) ? next.delete(id) : next.add(id)
    setExpandedExcedentes(next)
  }
  const pagosOrdenados = ordenarPagos(oferta.pagos ?? [])
  if (!pagosOrdenados.length)
    return <p className="text-center py-4 text-sm text-gray-500">No hay pagos registrados</p>

  return (
    <div className="space-y-2">
      {pagosOrdenados.map((pago, index) => {
        const pagoId = pago.id ?? String(index)
        const { pendienteDespuesPago } = getTotalesParaPago(oferta, pagoId)
        const metodo = pago.metodo_pago ?? ""
        const moneda = pago.moneda ?? "USD"
        return (
          <div key={pagoId} className="bg-white rounded border border-gray-200 p-2 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Col 1 */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500">#{index + 1}</span>
                  <TipoPagoBadge tipo={pago.tipo_pago ?? ""} />
                </div>
                <div><span className="text-xs text-gray-500 block">Fecha</span><span className="text-sm font-medium">{fmtDate(pago.fecha ?? "")}</span></div>
                <div>
                  <span className="text-xs text-gray-500 block">Monto</span>
                  <span className="text-sm font-semibold text-green-700">{fmtCurrency(pago.monto ?? 0)} {moneda}</span>
                  {moneda !== "USD" && <p className="text-xs text-gray-500">Tasa: {pago.tasa_cambio} → {fmtCurrency(pago.monto_usd ?? 0)} USD</p>}
                </div>
                <div><span className="text-xs text-gray-500 block">Devuelto</span><span className="text-sm font-semibold text-red-700">{fmtCurrency(getTotalDevueltoPago(pago))} USD</span></div>
                {pago.diferencia != null && pago.diferencia > 0 && (
                  <div>
                    <button onClick={() => toggleExcedente(pagoId)} className="text-xs text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1">
                      ⚠ Excedente: +{fmtCurrency(pago.diferencia)}
                      <ChevronDown className={`h-3 w-3 transition-transform ${expandedExcedentes.has(pagoId) ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                )}
                <div><span className="text-xs text-gray-500 block">Pendiente después</span><span className="text-sm font-semibold text-orange-700">{fmtCurrency(pendienteDespuesPago)} USD</span></div>
              </div>
              {/* Col 2 */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-gray-500 block">MÉTODO</span>
                <MetodoPagoBadge metodo={metodo} />
                {metodo === "efectivo" && pago.recibido_por && <div><span className="text-xs text-gray-500 block">Recibido por</span><span className="text-sm">{pago.recibido_por}</span></div>}
                {(metodo === "transferencia_bancaria" || metodo === "stripe") && pago.comprobante_transferencia && (
                  <div><span className="text-xs text-gray-500 block">Comprobante</span><a href={pago.comprobante_transferencia} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">Ver →</a></div>
                )}
              </div>
              {/* Col 3 */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-gray-500 block">PAGADOR</span>
                <span className="text-sm font-medium text-gray-900 block">{pago.nombre_pagador || oferta.contacto?.nombre || "No especificado"}</span>
                {!pago.pago_cliente && <Badge variant="outline" className="bg-orange-50 text-orange-700 text-xs">Tercero</Badge>}
                {pago.carnet_pagador && <div><span className="text-xs text-gray-500 block">CI</span><span className="text-sm">{pago.carnet_pagador}</span></div>}
              </div>
              {/* Col 4 */}
              <div className="space-y-1.5">
                {metodo === "efectivo" && pago.desglose_billetes && Object.keys(pago.desglose_billetes).length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-gray-500 block mb-1">DESGLOSE</span>
                    <div className="space-y-0.5 bg-gray-50 rounded p-1.5 border border-gray-200">
                      {Object.entries(pago.desglose_billetes).sort(([a], [b]) => parseFloat(b) - parseFloat(a)).map(([den, cant]) => (
                        <div key={den} className="flex justify-between text-xs">
                          <span className="text-gray-600">{cant}x {den}</span>
                          <span className="font-medium">{fmtCurrency(parseFloat(den) * cant)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {pago.notas && <div><span className="text-xs text-gray-500 block">Notas</span><span className="text-xs text-gray-700 italic">{pago.notas}</span></div>}
                <div className="pt-1">
                  <Button variant="outline" size="sm" onClick={() => ExportComprobanteService.generarComprobantePDF({ pago: pago as never, oferta: { numero_oferta: oferta.numero_oferta ?? "", nombre_completo: oferta.nombre_completo ?? "", precio_final: oferta.precio_final ?? 0 }, contacto: { nombre: oferta.contacto?.nombre || "No especificado", carnet: oferta.contacto?.carnet ?? undefined, telefono: oferta.contacto?.telefono ?? undefined }, monto_pendiente_despues_pago: pendienteDespuesPago })} className="w-full h-7 text-xs">
                    <FileText className="h-3 w-3 mr-1" />Comprobante
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Panel: TRABAJOS DIARIOS — estilo tabla
───────────────────────────────────────────── */

function TrabajosPanel({ trabajos }: { trabajos: TrabajoDiarioObra[] }) {
  if (!trabajos.length)
    return <p className="text-center py-4 text-sm text-gray-500">No hay trabajos diarios registrados para este cliente</p>

  const sorted = [...trabajos].sort((a, b) => {
    const fa = safeText(a.fecha || a.created_at).slice(0, 10)
    const fb = safeText(b.fecha || b.created_at).slice(0, 10)
    return fb.localeCompare(fa)
  })

  return (
    <div className="overflow-x-auto rounded-md border border-slate-200">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
          <tr>
            <th className="text-left px-3 py-2.5 font-semibold w-[95px]">Fecha</th>
            <th className="text-left px-3 py-2.5 font-semibold min-w-[130px]">Instaladores</th>
            <th className="text-left px-3 py-2.5 font-semibold min-w-[260px]">Instalaci&oacute;n</th>
            <th className="text-left px-3 py-2.5 font-semibold w-[110px]">Estado</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((t, idx) => {
            const fecha = safeText(t.fecha || t.created_at).slice(0, 10)
            const tipo = safeText(t.tipo_trabajo, "Sin tipo")
            const averia = tipo.toUpperCase().includes("AVERIA") || tipo.toUpperCase().includes("AVERÍA")
            const instaladores: string[] = Array.isArray(t.instaladores)
              ? (t.instaladores.filter(Boolean) as string[])
              : []
            const inicioComentario = safeText(t.inicio)
            const finComentario = safeText(t.fin)
            const pendiente = t.queda_pendiente ? "Queda pendiente" : ""

            return (
              <tr key={t.id || idx} className="align-top border-t border-slate-200 hover:bg-slate-50 transition-colors">
                <td className="px-3 py-3 text-slate-600 whitespace-nowrap text-xs">{fmtDate(fecha)}</td>
                <td className="px-3 py-3">
                  <div className="flex gap-2">
                    <div className={cn("w-1 self-stretch rounded-full shrink-0 mt-0.5", colorBarra(t))} />
                    <div className="space-y-0.5">
                      {instaladores.length > 0
                        ? instaladores.map((ins, i) => (
                          <p key={i} className="text-xs text-slate-700 flex items-center gap-1">
                            <User className="h-3 w-3 text-slate-400 shrink-0" />{ins}
                          </p>
                        ))
                        : <p className="text-xs text-slate-400">Sin instaladores</p>}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <p className={cn("text-xs font-semibold mb-1", averia ? "text-red-700" : "text-slate-600")}>{tipo}</p>
                  {averia ? (
                    <>
                      {t.problema_encontrado && <p className="text-xs text-red-600"><span className="font-medium">Problema:</span> {t.problema_encontrado}</p>}
                      {t.solucion && <p className="text-xs text-slate-600 mt-0.5"><span className="font-medium">Soluci&oacute;n:</span> {t.solucion}</p>}
                    </>
                  ) : (
                    <>
                      {inicioComentario && <p className="text-xs text-slate-600"><span className="font-medium text-slate-700">Inicio:</span> {inicioComentario}</p>}
                      {finComentario && <p className="text-xs text-slate-600 mt-0.5"><span className="font-medium text-slate-700">Fin:</span> {finComentario}</p>}
                    </>
                  )}
                  {pendiente && <p className="text-xs text-amber-700 mt-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3 shrink-0" />{pendiente}</p>}
                  {Array.isArray(t.materiales_utilizados) && t.materiales_utilizados.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {t.materiales_utilizados.slice(0, 4).map((m, mi) => (
                        <Badge key={mi} variant="outline" className="text-[10px] px-1.5 py-0 text-slate-500">{m.nombre} &times;{m.cantidad_utilizada}</Badge>
                      ))}
                      {t.materiales_utilizados.length > 4 && <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-slate-400">+{t.materiales_utilizados.length - 4} m&aacute;s</Badge>}
                    </div>
                  )}
                </td>
                <td className="px-3 py-3"><EstadoTrabajoBadge terminada={t.instalacion_terminada ?? undefined} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Panel: VALES
───────────────────────────────────────────── */

function ValesPanel({ vales }: { vales: ValeSalidaObra[] }) {
  if (!vales.length)
    return <p className="text-center py-4 text-sm text-gray-500">No hay vales de salida registrados para este cliente</p>

  const sorted = [...vales].sort((a, b) => {
    const fa = safeText(a.fecha_creacion).slice(0, 10)
    const fb = safeText(b.fecha_creacion).slice(0, 10)
    return fb.localeCompare(fa)
  })

  return (
    <div className="overflow-x-auto rounded-md border border-slate-200">
      <table className="w-full min-w-[600px] text-sm">
        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
          <tr>
            <th className="text-left px-3 py-2.5 font-semibold w-[100px]">C&oacute;digo</th>
            <th className="text-left px-3 py-2.5 font-semibold w-[100px]">Fecha</th>
            <th className="text-left px-3 py-2.5 font-semibold w-[100px]">Estado</th>
            <th className="text-left px-3 py-2.5 font-semibold">Materiales</th>
            <th className="text-left px-3 py-2.5 font-semibold w-[120px]">Recogido por</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((vale, idx) => {
            const codigo = safeText(vale.codigo, `Vale ${idx + 1}`)
            const fecha = safeText(vale.fecha_creacion)
            const estado = safeText(vale.estado, "—")
            const recogido = safeText(vale.recogido_por)
            const materiales = vale.materiales || []

            return (
              <tr key={vale.id || idx} className="align-top border-t border-slate-200 hover:bg-slate-50 transition-colors">
                <td className="px-3 py-3">
                  <span className="text-xs font-semibold text-slate-800">{codigo}</span>
                </td>
                <td className="px-3 py-3 text-xs text-slate-600 whitespace-nowrap">
                  {fecha ? fmtDate(fecha) : "—"}
                </td>
                <td className="px-3 py-3">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[11px]",
                      estado === "anulado"
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200",
                    )}
                  >
                    {estado}
                  </Badge>
                  {vale.motivo_anulacion && (
                    <p className="text-[10px] text-red-600 mt-0.5 italic">{vale.motivo_anulacion}</p>
                  )}
                </td>
                <td className="px-3 py-3">
                  {materiales.length > 0 ? (
                    <div className="space-y-1">
                      {materiales.map((m, mi) => {
                        const nombre =
                          m.material?.nombre ||
                          m.material?.descripcion ||
                          "Material"
                        return (
                          <div key={mi} className="flex items-center gap-2 text-xs">
                            <Package className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="text-slate-700">{nombre}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-slate-500 ml-auto">
                              &times;{m.cantidad}
                            </Badge>
                            {m.numero_serie && (
                              <span className="text-[10px] text-slate-400">N/S: {m.numero_serie}</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">Sin materiales</span>
                  )}
                </td>
                <td className="px-3 py-3 text-xs text-slate-600">
                  {recogido || "—"}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Tipos de pestaña expandida
───────────────────────────────────────────── */

type SectionTab = "pagos" | "trabajos" | "vales"

/* ─────────────────────────────────────────────
   Componente principal
───────────────────────────────────────────── */

interface ObrasTerminadasTableProps {
  ofertasConPagos: OfertaObra[]
  loading: boolean
  fetchDetalle: (clienteNumero: string) => Promise<void>
  detalleCache: Record<string, DetalleCliente>
  detalleLoading: Record<string, boolean>
  detalleError: Record<string, string>
}

export function ObrasTerminadasTable({
  ofertasConPagos,
  loading,
  fetchDetalle,
  detalleCache,
  detalleLoading,
  detalleError,
}: ObrasTerminadasTableProps) {
  const [expandedOfertas, setExpandedOfertas] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<Record<string, SectionTab>>({})

  // Filtros
  const [searchTerm, setSearchTerm] = useState("")
  const [estadoPago, setEstadoPago] = useState<"todos" | "pagado" | "pendiente">("todos")
  const [filtroFechaCliente, setFiltroFechaCliente] = useState<DateFilterState>(initialDateFilter)
  const [filtroFechaInstalacion, setFiltroFechaInstalacion] = useState<DateFilterState>(initialDateFilter)
  const [filtroFechaPago, setFiltroFechaPago] = useState<DateFilterState>(initialDateFilter)
  const [showFilters, setShowFilters] = useState(true)

  const toggleOferta = (oferta: OfertaObra) => {
    const id = oferta.oferta_id ?? ""
    const clienteNum = (oferta.cliente_numero || oferta.contacto?.codigo || "").trim()
    const next = new Set(expandedOfertas)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
      setActiveTab((prev) => ({ ...prev, [id]: prev[id] || "pagos" }))
      // Carga lazy del detalle solo si hay número de cliente
      if (clienteNum) fetchDetalle(clienteNum)
    }
    setExpandedOfertas(next)
  }

  const clearAllFilters = () => {
    setSearchTerm("")
    setEstadoPago("todos")
    setFiltroFechaCliente(initialDateFilter())
    setFiltroFechaInstalacion(initialDateFilter())
    setFiltroFechaPago(initialDateFilter())
  }

  const activeFilterCount = [
    searchTerm.trim() !== "",
    estadoPago !== "todos",
    filtroFechaCliente.mode !== "off",
    filtroFechaInstalacion.mode !== "off",
    filtroFechaPago.mode !== "off",
  ].filter(Boolean).length

  const filteredOfertas = useMemo(() => {
    return ofertasConPagos.filter((o) => {
      // Búsqueda de texto
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        const matches =
          (o.numero_oferta ?? "").toLowerCase().includes(term) ||
          (o.contacto?.nombre || "").toLowerCase().includes(term) ||
          (o.contacto?.telefono || "").includes(term) ||
          (o.contacto?.carnet || "").includes(term) ||
          (o.almacen_nombre || "").toLowerCase().includes(term) ||
          (o.comercial_nombre || "").toLowerCase().includes(term) ||
          getEstadoCliente(o).toLowerCase().includes(term)
        if (!matches) return false
      }

      // Estado de pago
      const montoPendiente = o.monto_pendiente ?? 0
      if (estadoPago === "pagado" && montoPendiente > 0.01) return false
      if (estadoPago === "pendiente" && montoPendiente <= 0.01) return false

      // Fecha creación cliente
      if (filtroFechaCliente.mode !== "off") {
        if (!dateInRange(o.fecha_creacion, filtroFechaCliente.desde, filtroFechaCliente.hasta)) return false
      }

      // Fecha instalación
      if (filtroFechaInstalacion.mode !== "off") {
        if (!dateInRange(o.fecha_instalacion_cliente, filtroFechaInstalacion.desde, filtroFechaInstalacion.hasta)) return false
      }

      // Fecha de pagos (si algún pago cae en el rango)
      if (filtroFechaPago.mode !== "off") {
        const tienePageEnRango = (o.pagos ?? []).some((p) =>
          dateInRange(p.fecha, filtroFechaPago.desde, filtroFechaPago.hasta),
        )
        if (!tienePageEnRango) return false
      }

      return true
    })
  }, [ofertasConPagos, searchTerm, estadoPago, filtroFechaCliente, filtroFechaInstalacion, filtroFechaPago])

  if (loading)
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        <span className="ml-3 text-gray-600">Cargando datos...</span>
      </div>
    )

  if (ofertasConPagos.length === 0)
    return (
      <div className="text-center py-16">
        <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No hay obras con pagos registrados</p>
      </div>
    )

  return (
    <div className="w-full space-y-3">
      {/* ── Panel de filtros ── */}
      <div className="bg-white rounded-lg border border-orange-100 shadow-sm">
        <div
          className="flex items-center justify-between px-4 py-3 cursor-pointer"
          onClick={() => setShowFilters((v) => !v)}
        >
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-semibold text-gray-700">Filtros</span>
            {activeFilterCount > 0 && (
              <Badge className="bg-orange-500 text-white text-[11px] px-1.5 py-0">{activeFilterCount}</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); clearAllFilters() }}
                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Limpiar filtros
              </button>
            )}
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </div>
        </div>

        {showFilters && (
          <div className="px-4 pb-4 border-t border-orange-50 pt-3 space-y-4">
            {/* Fila 1: búsqueda + estado de pago */}
            <div className="flex flex-wrap gap-4 items-start">
              {/* Búsqueda */}
              <div className="flex-1 min-w-[220px]">
                <span className="text-xs font-semibold text-gray-500 flex items-center gap-1 mb-1">
                  <Search className="h-3.5 w-3.5" /> Búsqueda
                </span>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input
                    placeholder="Cliente, N° oferta, CI, comercial..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-8 text-sm"
                  />
                </div>
              </div>

              {/* Estado de pago */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-gray-500">Estado del pago</span>
                <div className="flex gap-1">
                  {(["todos", "pagado", "pendiente"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setEstadoPago(v)}
                      className={cn(
                        "px-2.5 py-1 text-xs rounded border transition-colors",
                        estadoPago === v
                          ? "bg-orange-500 text-white border-orange-500"
                          : "border-gray-300 text-gray-600 hover:border-orange-400",
                      )}
                    >
                      {v === "todos" ? "Todos" : v === "pagado" ? "✓ Pagado" : "⏳ Con saldo"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Fila 2: filtros de fecha */}
            <div className="flex flex-wrap gap-6">
              <DateFilterWidget
                label="Fecha creación cliente"
                icon={<CalendarDays className="h-3.5 w-3.5" />}
                state={filtroFechaCliente}
                onChange={setFiltroFechaCliente}
              />
              <DateFilterWidget
                label="Fecha fin instalación"
                icon={<CalendarDays className="h-3.5 w-3.5" />}
                state={filtroFechaInstalacion}
                onChange={setFiltroFechaInstalacion}
              />
              <DateFilterWidget
                label="Fecha de pagos"
                icon={<CalendarDays className="h-3.5 w-3.5" />}
                state={filtroFechaPago}
                onChange={setFiltroFechaPago}
              />
            </div>
          </div>
        )}
      </div>

      {/* Contador */}
      <div className="text-sm text-gray-500 px-1">
        Mostrando <strong>{filteredOfertas.length}</strong> de {ofertasConPagos.length} ofertas
        {filteredOfertas.length > 0 && (
          <span className="ml-3 text-blue-600 font-medium">
            Total cobrado: {fmtCurrency(filteredOfertas.reduce((s, o) => s + (o.total_pagado ?? 0), 0))} ·
            Pendiente: {fmtCurrency(filteredOfertas.reduce((s, o) => s + (o.monto_pendiente ?? 0), 0))}
          </span>
        )}
      </div>

      {filteredOfertas.length === 0 ? (
        <div className="text-center py-10 text-gray-500 text-sm bg-white rounded-lg border border-orange-100 p-6">
          No se encontraron resultados con los filtros aplicados
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-orange-100 shadow-sm overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-orange-50/50">
                <TableHead className="w-[40px]" />
                <TableHead className="w-[110px]">N° Oferta</TableHead>
                <TableHead className="min-w-[150px]">Cliente</TableHead>
                <TableHead className="w-[150px]">Estado Cliente</TableHead>
                <TableHead className="w-[100px]">CI</TableHead>
                <TableHead className="w-[110px]">Comercial</TableHead>
                <TableHead className="w-[95px]">F. Creación</TableHead>
                <TableHead className="w-[95px]">F. Instalación</TableHead>
                <TableHead className="text-right w-[105px]">Precio Final</TableHead>
                <TableHead className="text-right w-[100px]">Total Mat.</TableHead>
                <TableHead className="text-right w-[95px]">Ganancia</TableHead>
                <TableHead className="text-right w-[100px]">Cobrado</TableHead>
                <TableHead className="text-right w-[90px]">Devuelto</TableHead>
                <TableHead className="text-right w-[90px]">Pendiente</TableHead>
                <TableHead className="w-[60px] text-center">Cobros</TableHead>
                <TableHead className="w-[120px]">Almacén</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOfertas.map((oferta) => {
                const ofertaId = oferta.oferta_id ?? ""
                const isExpanded = expandedOfertas.has(ofertaId)
                const estadoCliente = getEstadoCliente(oferta)
                const totalMat = parseNullableNumber(oferta.total_materiales)
                const precioFinal = oferta.precio_final ?? 0
                const ganancia = totalMat !== null ? precioFinal - totalMat : null
                const totalDevuelto = getTotalDevueltoOferta(oferta)
                const tab = activeTab[ofertaId] || "pagos"
                const montoPendiente = oferta.monto_pendiente ?? 0
                const pagado = montoPendiente <= 0.01

                const clienteNum = (oferta.cliente_numero || oferta.contacto?.codigo || "").trim()
                const detalle = detalleCache[clienteNum]
                const isDetalleLoading = !!detalleLoading[clienteNum]
                const detalleErr = detalleError[clienteNum]
                const trabajosCliente = detalle?.trabajos ?? []
                const valesCliente = detalle?.vales ?? []

                return (
                  <React.Fragment key={ofertaId || oferta.numero_oferta}>
                    <TableRow
                      className={cn(
                        "cursor-pointer transition-colors",
                        isExpanded ? "bg-orange-50" : "hover:bg-orange-50/50",
                      )}
                      onClick={() => toggleOferta(oferta)}
                    >
                      <TableCell className="py-2.5">
                        {isExpanded
                          ? <ChevronDown className="h-4 w-4 text-gray-500" />
                          : <ChevronRight className="h-4 w-4 text-gray-500" />}
                      </TableCell>
                      <TableCell className="font-medium text-sm py-2.5">{oferta.numero_oferta}</TableCell>
                      <TableCell className="py-2.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-sm leading-tight">{oferta.contacto?.nombre || "Sin contacto"}</span>
                          <span className="text-xs text-gray-500">{oferta.contacto?.codigo || oferta.cliente_numero || "-"}</span>
                          {oferta.contacto?.telefono && <span className="text-xs text-gray-600">{oferta.contacto.telefono}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <Badge variant="outline" className={getEstadoBadgeClass(estadoCliente)}>{estadoCliente}</Badge>
                      </TableCell>
                      <TableCell className="py-2.5 text-sm text-gray-700">{oferta.contacto?.carnet || "-"}</TableCell>
                      <TableCell className="py-2.5 text-sm text-slate-700">
                        {oferta.comercial_nombre || <span className="text-gray-400 text-xs">—</span>}
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-gray-600">
                        {oferta.fecha_creacion ? fmtDate(oferta.fecha_creacion) : <span className="text-gray-400">—</span>}
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-gray-600">
                        {oferta.fecha_instalacion_cliente ? fmtDate(oferta.fecha_instalacion_cliente) : <span className="text-gray-400">—</span>}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-sm py-2.5">{fmtCurrency(precioFinal)}</TableCell>
                      <TableCell className="text-right text-sm py-2.5 text-slate-700">{totalMat !== null ? fmtCurrency(totalMat) : "-"}</TableCell>
                      <TableCell className="text-right text-sm py-2.5 text-blue-700 font-semibold">{ganancia !== null ? fmtCurrency(ganancia) : "-"}</TableCell>
                      <TableCell className="text-right text-sm py-2.5 text-green-700 font-semibold">{fmtCurrency(oferta.total_pagado ?? 0)}</TableCell>
                      <TableCell className="text-right text-sm py-2.5 text-red-700 font-semibold">{fmtCurrency(totalDevuelto)}</TableCell>
                      <TableCell className="text-right text-sm py-2.5 font-semibold">
                        <span className={pagado ? "text-green-600" : "text-orange-700"}>
                          {fmtCurrency(montoPendiente)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center py-2.5">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">{oferta.cantidad_pagos ?? 0}</Badge>
                      </TableCell>
                      <TableCell className="py-2.5 text-sm text-gray-700">{oferta.almacen_nombre || "-"}</TableCell>
                    </TableRow>

                    {/* Panel expandido */}
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={16} className="bg-orange-50/60 p-0" onClick={(e) => e.stopPropagation()}>
                          <div className="border-t border-orange-200 p-3">
                            {/* Tabs */}
                            <div className="flex gap-1 mb-3 border-b border-orange-200 pb-2">
                              <button
                                onClick={() => setActiveTab((p) => ({ ...p, [ofertaId]: "pagos" }))}
                                className={cn(
                                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t transition-colors",
                                  tab === "pagos" ? "bg-white border border-orange-200 text-orange-700 shadow-sm" : "text-gray-500 hover:text-gray-700",
                                )}
                              >
                                <FileText className="h-3.5 w-3.5" />
                                Pagos ({oferta.cantidad_pagos ?? 0})
                              </button>
                              <button
                                onClick={() => setActiveTab((p) => ({ ...p, [ofertaId]: "trabajos" }))}
                                className={cn(
                                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t transition-colors",
                                  tab === "trabajos" ? "bg-white border border-orange-200 text-orange-700 shadow-sm" : "text-gray-500 hover:text-gray-700",
                                )}
                              >
                                <Wrench className="h-3.5 w-3.5" />
                                Trabajos Diarios {detalle ? `(${trabajosCliente.length})` : ""}
                              </button>
                              <button
                                onClick={() => setActiveTab((p) => ({ ...p, [ofertaId]: "vales" }))}
                                className={cn(
                                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t transition-colors",
                                  tab === "vales" ? "bg-white border border-orange-200 text-orange-700 shadow-sm" : "text-gray-500 hover:text-gray-700",
                                )}
                              >
                                <Package className="h-3.5 w-3.5" />
                                Vales {detalle ? `(${valesCliente.length})` : ""}
                              </button>
                            </div>

                            {/* Pagos: siempre disponibles desde la carga inicial */}
                            {tab === "pagos" && <PagosPanel oferta={oferta} />}

                            {/* Trabajos y Vales: carga lazy */}
                            {(tab === "trabajos" || tab === "vales") && (
                              isDetalleLoading ? (
                                <div className="flex items-center justify-center py-10 gap-2 text-gray-500">
                                  <Loader2 className="h-5 w-5 animate-spin text-orange-400" />
                                  <span className="text-sm">Cargando datos...</span>
                                </div>
                              ) : detalleErr ? (
                                <div className="flex items-center gap-2 py-6 px-4 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
                                  <AlertTriangle className="h-4 w-4 shrink-0" />
                                  <span>{detalleErr}</span>
                                  <button
                                    onClick={() => clienteNum && fetchDetalle(clienteNum)}
                                    className="ml-auto text-xs underline hover:no-underline"
                                  >
                                    Reintentar
                                  </button>
                                </div>
                              ) : (
                                <>
                                  {tab === "trabajos" && <TrabajosPanel trabajos={trabajosCliente} />}
                                  {tab === "vales" && <ValesPanel vales={valesCliente} />}
                                </>
                              )
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
