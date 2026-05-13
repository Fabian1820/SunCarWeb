"use client"

import React, { useEffect, useMemo, useState } from "react"
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
  Briefcase,
  Wrench,
  User,
  AlertTriangle,
  Filter,
  X,
  Package,
  CalendarDays,
  FileText,
  Boxes,
} from "lucide-react"
import type { OfertaObra, OfertaDetalleObras } from "@/hooks/use-obras-terminadas"
import type {
  PagoObra,
  MaterialOferta,
  TrabajoDiarioObra,
  ValeSalidaObra,
  ObrasTerminadasFiltros,
} from "@/lib/services/feats/obras-terminadas/obras-terminadas-service"
import { ExportComprobanteService } from "@/lib/services/feats/pagos/export-comprobante-service"
import { cn } from "@/lib/utils"

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

const safeText = (value: unknown, fallback = ""): string => {
  const text = String(value || "").trim()
  return text || fallback
}

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

const getEstadoLabel = (raw: string): string =>
  ESTADO_LABELS[normalizeEstadoKey(raw)] || raw

const getEstadoBadgeClass = (estado: string) =>
  ESTADO_BADGE[normalizeEstadoKey(estado)] ||
  "bg-gray-100 text-gray-700 border-gray-300"

const toEpochMs = (value: string): number => {
  const t = new Date(value).getTime()
  return Number.isFinite(t) ? t : 0
}

const roundToCents = (v: number) =>
  Math.round((v + Number.EPSILON) * 100) / 100

const getMontoAplicadoUsd = (p: PagoObra) =>
  Math.max(0, (p.monto_usd ?? 0) - (p.diferencia ?? 0))

const ordenarPagos = (pagos: PagoObra[]) =>
  [...pagos].sort((a, b) => {
    const d = toEpochMs(a.fecha ?? "") - toEpochMs(b.fecha ?? "")
    if (d !== 0) return d
    const dc = toEpochMs(a.fecha_creacion ?? "") - toEpochMs(b.fecha_creacion ?? "")
    if (dc !== 0) return dc
    return (a.id ?? "").localeCompare(b.id ?? "")
  })

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

const getDateRangeParams = (state: DateFilterState) => {
  if (state.mode === "off") return { desde: undefined, hasta: undefined }
  return {
    desde: state.desde || undefined,
    hasta: state.hasta || undefined,
  }
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
   Panel: MATERIALES DE LA OFERTA
───────────────────────────────────────────── */

function MaterialesPanel({ materiales }: { materiales: MaterialOferta[] }) {
  if (!materiales.length)
    return <p className="text-center py-4 text-sm text-gray-500">No hay materiales registrados para esta oferta</p>

  return (
    <div className="rounded-md border border-slate-200">
      <table className="w-full text-sm table-fixed">
        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
          <tr>
            <th className="w-[50%] text-left px-3 py-2.5 font-semibold">Material</th>
            <th className="w-[12%] text-right px-3 py-2.5 font-semibold">Cant.</th>
            <th className="w-[19%] text-right px-3 py-2.5 font-semibold">Precio</th>
            <th className="w-[19%] text-right px-3 py-2.5 font-semibold">P. Original</th>
          </tr>
        </thead>
        <tbody>
          {materiales.map((m, idx) => (
            <tr key={m.material_codigo || idx} className="align-top border-t border-slate-200 hover:bg-slate-50 transition-colors">
              <td className="px-3 py-2.5">
                <span className="block text-xs font-medium text-slate-800 break-words">{m.descripcion || m.material_codigo || "—"}</span>
                {m.material_codigo && <p className="text-[10px] text-slate-400">{m.material_codigo}</p>}
              </td>
              <td className="px-3 py-2.5 text-xs text-right font-medium whitespace-nowrap">{m.cantidad ?? "—"}</td>
              <td className="px-3 py-2.5 text-xs text-right whitespace-nowrap">{m.precio != null ? fmtCurrency(m.precio) : "—"}</td>
              <td className="px-3 py-2.5 text-xs text-right text-slate-500 whitespace-nowrap">{m.precio_original != null ? fmtCurrency(m.precio_original) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Panel: PAGOS
───────────────────────────────────────────── */

function PagosPanel({ pagos, oferta }: { pagos: PagoObra[]; oferta: OfertaObra }) {
  const pagosOrdenados = ordenarPagos(pagos)
  if (!pagosOrdenados.length)
    return <p className="text-center py-4 text-sm text-gray-500">No hay pagos registrados</p>

  const precioFinal = oferta.precio_final ?? 0

  return (
    <div className="space-y-2">
      {pagosOrdenados.map((pago, index) => {
        const pagoId = pago.id ?? String(index)
        const sorted = pagosOrdenados
        const idx = sorted.findIndex((p) => p.id === pagoId)
        const antes = idx >= 0 ? sorted.slice(0, idx).reduce((s, p) => s + getMontoAplicadoUsd(p), 0) : 0
        const conEste = idx >= 0 ? antes + getMontoAplicadoUsd(sorted[idx]) : antes
        const pendiente = precioFinal - conEste
        const pendienteDespuesPago = roundToCents(
          pendiente < 0.01 && pendiente > -0.01 ? 0 : Math.max(0, pendiente),
        )
        const metodo = pago.metodo_pago ?? ""
        const moneda = pago.moneda ?? "USD"

        return (
          <div key={pagoId} className="bg-white rounded border border-gray-200 p-2 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
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
                <div><span className="text-xs text-gray-500 block">Devuelto</span><span className="text-sm font-semibold text-red-700">{fmtCurrency(pago.total_devuelto ?? 0)} USD</span></div>
                {pago.diferencia != null && pago.diferencia > 0 && (
                  <div className="text-xs text-orange-600 font-medium">Excedente: +{fmtCurrency(pago.diferencia)}</div>
                )}
                <div><span className="text-xs text-gray-500 block">Pendiente después</span><span className="text-sm font-semibold text-orange-700">{fmtCurrency(pendienteDespuesPago)} USD</span></div>
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-gray-500 block">MÉTODO</span>
                <MetodoPagoBadge metodo={metodo} />
                {metodo === "efectivo" && pago.recibido_por && <div><span className="text-xs text-gray-500 block">Recibido por</span><span className="text-sm">{pago.recibido_por}</span></div>}
                {(metodo === "transferencia_bancaria" || metodo === "stripe") && pago.comprobante_transferencia && (
                  <div><span className="text-xs text-gray-500 block">Comprobante</span><a href={pago.comprobante_transferencia} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">Ver →</a></div>
                )}
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-gray-500 block">PAGADOR</span>
                <span className="text-sm font-medium text-gray-900 block">{pago.nombre_pagador || oferta.nombre_completo || "No especificado"}</span>
                {!pago.pago_cliente && <Badge variant="outline" className="bg-orange-50 text-orange-700 text-xs">Tercero</Badge>}
                {pago.carnet_pagador && <div><span className="text-xs text-gray-500 block">CI</span><span className="text-sm">{pago.carnet_pagador}</span></div>}
              </div>
              <div className="space-y-1.5">
                {pago.notas && <div><span className="text-xs text-gray-500 block">Notas</span><span className="text-xs text-gray-700 italic">{pago.notas}</span></div>}
                <div className="pt-1">
                  <Button variant="outline" size="sm" onClick={() => ExportComprobanteService.generarComprobantePDF({ pago: pago as never, oferta: { numero_oferta: oferta.numero_oferta ?? "", nombre_completo: oferta.nombre_completo ?? "", precio_final: oferta.precio_final ?? 0 }, contacto: { nombre: oferta.nombre_completo || "No especificado", carnet: oferta.carnet_identidad ?? undefined }, monto_pendiente_despues_pago: pendienteDespuesPago })} className="w-full h-7 text-xs">
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
   Panel: TRABAJOS DIARIOS
───────────────────────────────────────────── */

function TrabajosPanel({ trabajos }: { trabajos: TrabajoDiarioObra[] }) {
  if (!trabajos.length)
    return <p className="text-center py-4 text-sm text-gray-500">No hay trabajos diarios registrados</p>

  const sorted = [...trabajos].sort((a, b) => {
    const fa = safeText(a.fecha || a.created_at).slice(0, 10)
    const fb = safeText(b.fecha || b.created_at).slice(0, 10)
    return fb.localeCompare(fa)
  })

  return (
    <div className="rounded-md border border-slate-200">
      <table className="w-full text-sm table-fixed">
        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
          <tr>
            <th className="w-[18%] text-left px-3 py-2.5 font-semibold">Fecha</th>
            <th className="w-[26%] text-left px-3 py-2.5 font-semibold">Instaladores</th>
            <th className="w-[40%] text-left px-3 py-2.5 font-semibold">Instalación</th>
            <th className="w-[16%] text-left px-3 py-2.5 font-semibold">Estado</th>
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
                <td className="px-3 py-3 break-words">
                  <p className={cn("text-xs font-semibold mb-1", averia ? "text-red-700" : "text-slate-600")}>{tipo}</p>
                  {averia ? (
                    <>
                      {t.problema_encontrado && <p className="text-xs text-red-600"><span className="font-medium">Problema:</span> {t.problema_encontrado}</p>}
                      {t.solucion && <p className="text-xs text-slate-600 mt-0.5"><span className="font-medium">Solución:</span> {t.solucion}</p>}
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
                        <Badge key={mi} variant="outline" className="text-[10px] px-1.5 py-0 text-slate-500">{m.nombre} ×{m.cantidad_utilizada}</Badge>
                      ))}
                      {t.materiales_utilizados.length > 4 && <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-slate-400">+{t.materiales_utilizados.length - 4} más</Badge>}
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
    return <p className="text-center py-4 text-sm text-gray-500">No hay vales de salida registrados</p>

  const sorted = [...vales].sort((a, b) => {
    const fa = safeText(a.fecha_creacion).slice(0, 10)
    const fb = safeText(b.fecha_creacion).slice(0, 10)
    return fb.localeCompare(fa)
  })

  return (
    <div className="rounded-md border border-slate-200">
      <table className="w-full text-sm table-fixed">
        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
          <tr>
            <th className="w-[16%] text-left px-3 py-2.5 font-semibold">Código</th>
            <th className="w-[16%] text-left px-3 py-2.5 font-semibold">Fecha</th>
            <th className="w-[16%] text-left px-3 py-2.5 font-semibold">Estado</th>
            <th className="w-[36%] text-left px-3 py-2.5 font-semibold">Materiales</th>
            <th className="w-[16%] text-left px-3 py-2.5 font-semibold">Recogido por</th>
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
                <td className="px-3 py-3 break-words">
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
                    <div className="space-y-1.5">
                      {materiales.map((m, mi) => {
                        const nombre = m.material?.nombre || m.material?.descripcion || "Material"
                        const codigo = m.material?.codigo || m.material?.descripcion || "—"
                        return (
                          <div key={mi} className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5">
                            <div className="flex items-start gap-2">
                              <Package className="mt-0.5 h-3 w-3 text-slate-400 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-slate-600 shrink-0">
                                    ×{m.cantidad ?? 0}
                                  </Badge>
                                  <span className="text-xs text-slate-700 break-words leading-tight">{nombre}</span>
                                </div>
                                <p className="mt-0.5 text-[10px] text-slate-500 break-words">Código: {codigo}</p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">Sin materiales</span>
                  )}
                </td>
                <td className="px-3 py-3 text-xs text-slate-600 break-words">
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

type SectionTab = "materiales" | "pagos" | "trabajos" | "vales"

/* ─────────────────────────────────────────────
   Componente principal
───────────────────────────────────────────── */

interface ObrasTerminadasTableProps {
  ofertasConPagos: OfertaObra[]
  loading: boolean
  fetchDetalle: (ofertaId: string) => Promise<void>
  detalleCache: Record<string, OfertaDetalleObras>
  detalleLoading: Record<string, boolean>
  detalleError: Record<string, string>
  serverFiltros: ObrasTerminadasFiltros
  onServerFiltersChange: (filtros: ObrasTerminadasFiltros) => void
}

export function ObrasTerminadasTable({
  ofertasConPagos,
  loading,
  fetchDetalle,
  detalleCache,
  detalleLoading,
  detalleError,
  serverFiltros,
  onServerFiltersChange,
}: ObrasTerminadasTableProps) {
  const [expandedOfertas, setExpandedOfertas] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<Record<string, SectionTab>>({})

  const [searchTerm, setSearchTerm] = useState(serverFiltros.q ?? "")
  const [comercialFilter, setComercialFilter] = useState(serverFiltros.comercial ?? "todos")
  const [estadoPago, setEstadoPago] = useState<"todos" | "pagado" | "pendiente">("todos")
  const [filtroFechaCliente, setFiltroFechaCliente] = useState<DateFilterState>(initialDateFilter)
  const [filtroFechaEquipo, setFiltroFechaEquipo] = useState<DateFilterState>(initialDateFilter)
  const [showFilters, setShowFilters] = useState(true)

  const getRowKey = (oferta: OfertaObra, index: number) =>
    oferta.oferta_id ?? oferta.numero_oferta ?? `row-${index}`

  const getDetalleKey = (oferta: OfertaObra) =>
    oferta.oferta_id ?? ""

  const toggleOferta = (oferta: OfertaObra, rowId: string) => {
    const detalleId = getDetalleKey(oferta)
    const next = new Set(expandedOfertas)
    if (next.has(rowId)) {
      next.delete(rowId)
    } else {
      next.add(rowId)
      setActiveTab((prev) => ({ ...prev, [rowId]: prev[rowId] || "materiales" }))
      if (detalleId) fetchDetalle(detalleId)
    }
    setExpandedOfertas(next)
  }

  const clearAllFilters = () => {
    setSearchTerm("")
    setComercialFilter("todos")
    setEstadoPago("todos")
    setFiltroFechaCliente(initialDateFilter())
    setFiltroFechaEquipo(initialDateFilter())
    onServerFiltersChange({})
  }

  const activeFilterCount = [
    searchTerm.trim() !== "",
    comercialFilter !== "todos",
    estadoPago !== "todos",
    filtroFechaCliente.mode !== "off",
    filtroFechaEquipo.mode !== "off",
  ].filter(Boolean).length

  useEffect(() => {
    const t = setTimeout(() => {
      const fechaCreacion = getDateRangeParams(filtroFechaCliente)
      const fechaEquipo = getDateRangeParams(filtroFechaEquipo)

      onServerFiltersChange({
        q: searchTerm.trim() || undefined,
        comercial: comercialFilter !== "todos" ? comercialFilter : undefined,
        estado_pago: estadoPago,
        fecha_creacion_desde: fechaCreacion.desde,
        fecha_creacion_hasta: fechaCreacion.hasta,
        fecha_equipo_desde: fechaEquipo.desde,
        fecha_equipo_hasta: fechaEquipo.hasta,
      })
    }, 250)
    return () => clearTimeout(t)
  }, [searchTerm, comercialFilter, estadoPago, filtroFechaCliente, filtroFechaEquipo, onServerFiltersChange])

  const comerciales = useMemo(() => {
    const set = new Set<string>()
    for (const o of ofertasConPagos) {
      const c = (o.comercial || "").trim()
      if (c) set.add(c)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"))
  }, [ofertasConPagos])

  const filteredOfertas = ofertasConPagos

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
        <p className="text-gray-500">No hay obras terminadas registradas</p>
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
            <div className="flex flex-wrap gap-4 items-start">
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

              <div className="flex flex-col gap-1 min-w-[220px]">
                <span className="text-xs font-semibold text-gray-500">Comercial</span>
                <select
                  value={comercialFilter}
                  onChange={(e) => setComercialFilter(e.target.value)}
                  className="h-8 rounded border border-gray-300 px-2 text-sm text-gray-700 focus:border-orange-400 focus:outline-none"
                >
                  <option value="todos">Todos</option>
                  {comerciales.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

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
                      {v === "todos" ? "Todos" : v === "pagado" ? "Pagado" : "Con saldo"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-6">
              <DateFilterWidget
                label="Fecha creación cliente"
                icon={<CalendarDays className="h-3.5 w-3.5" />}
                state={filtroFechaCliente}
                onChange={setFiltroFechaCliente}
              />
              <DateFilterWidget
                label="Fecha equipo instalado"
                icon={<CalendarDays className="h-3.5 w-3.5" />}
                state={filtroFechaEquipo}
                onChange={setFiltroFechaEquipo}
              />
            </div>
          </div>
        )}
      </div>

      {/* Contador */}
      <div className="text-sm text-gray-500 px-1">
        Mostrando <strong>{filteredOfertas.length}</strong> de {ofertasConPagos.length} obras
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
        <div className="bg-white rounded-lg border border-orange-100 shadow-sm">
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow className="bg-orange-50/50">
                <TableHead className="w-8" />
                <TableHead className="w-[26%] text-xs">Cliente</TableHead>
                <TableHead className="w-[14%] text-xs">Comercial</TableHead>
                <TableHead className="w-[10%] text-xs">F. Creación</TableHead>
                <TableHead className="w-[10%] text-xs">F. Eq. Instalado</TableHead>
                <TableHead className="w-[10%] text-right text-xs">Precio Oferta</TableHead>
                <TableHead className="w-[10%] text-right text-xs">Total Mat.</TableHead>
                <TableHead className="w-[10%] text-right text-xs">Cobrado</TableHead>
                <TableHead className="w-[10%] text-right text-xs">Devuelto</TableHead>
                <TableHead className="w-[10%] text-right text-xs">Pendiente</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOfertas.map((oferta, index) => {
                const rowId = getRowKey(oferta, index)
                const detalleId = getDetalleKey(oferta)
                const isExpanded = expandedOfertas.has(rowId)
                const estadoCliente = oferta.estado_cliente ? getEstadoLabel(oferta.estado_cliente) : "Sin estado"
                const montoPendiente = oferta.monto_pendiente ?? 0
                const pagado = montoPendiente <= 0.01
                const tab = activeTab[rowId] || "materiales"

                const detalle = detalleId ? detalleCache[detalleId] : undefined
                const isDetalleLoading = !!(detalleId ? detalleLoading[detalleId] : false)
                const detalleErr = detalleId ? detalleError[detalleId] : undefined

                return (
                  <React.Fragment key={rowId}>
                    <TableRow
                      className={cn(
                        "cursor-pointer transition-colors",
                        isExpanded ? "bg-orange-50" : "hover:bg-orange-50/50",
                      )}
                      onClick={() => toggleOferta(oferta, rowId)}
                    >
                      <TableCell className="py-2.5">
                        {isExpanded
                          ? <ChevronDown className="h-4 w-4 text-gray-500" />
                          : <ChevronRight className="h-4 w-4 text-gray-500" />}
                      </TableCell>
                      <TableCell className="py-2.5 align-top">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-sm leading-tight truncate" title={oferta.cliente_nombre || oferta.nombre_completo || "Sin cliente"}>
                            {oferta.cliente_nombre || oferta.nombre_completo || "Sin cliente"}
                          </span>
                          <span className="text-xs text-gray-500 truncate" title={oferta.numero_oferta || "-"}>
                            {oferta.numero_oferta || "-"}
                          </span>
                          <div className="pt-0.5">
                            <Badge variant="outline" className={`text-xs px-2 py-0 ${getEstadoBadgeClass(estadoCliente)}`}>
                              {estadoCliente}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5 text-sm text-slate-700 truncate" title={oferta.comercial || "-"}>
                        {oferta.comercial || <span className="text-gray-400 text-xs">—</span>}
                      </TableCell>
                      <TableCell className="py-2.5 text-sm text-gray-600 whitespace-nowrap">
                        {oferta.fecha_creacion ? fmtDate(oferta.fecha_creacion) : <span className="text-gray-400">—</span>}
                      </TableCell>
                      <TableCell className="py-2.5 text-sm text-gray-600 whitespace-nowrap">
                        {oferta.fecha_equipo_instalado ? fmtDate(oferta.fecha_equipo_instalado) : <span className="text-gray-400">—</span>}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-sm py-2.5 whitespace-nowrap tabular-nums">{fmtCurrency(oferta.precio_final ?? 0)}</TableCell>
                      <TableCell className="text-right text-sm py-2.5 text-slate-700 whitespace-nowrap tabular-nums">{oferta.total_materiales != null ? fmtCurrency(oferta.total_materiales) : "-"}</TableCell>
                      <TableCell className="text-right text-sm py-2.5 text-green-700 font-semibold whitespace-nowrap tabular-nums">{fmtCurrency(oferta.total_pagado ?? 0)}</TableCell>
                      <TableCell className="text-right text-sm py-2.5 text-red-700 font-semibold whitespace-nowrap tabular-nums">{fmtCurrency(oferta.total_devuelto ?? 0)}</TableCell>
                      <TableCell className="text-right text-sm py-2.5 font-semibold whitespace-nowrap tabular-nums">
                        <span className={pagado ? "text-green-600" : "text-orange-700"}>
                          {fmtCurrency(montoPendiente)}
                        </span>
                      </TableCell>
                    </TableRow>

                    {/* Panel expandido */}
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={10} className="bg-orange-50/60 p-0" onClick={(e) => e.stopPropagation()}>
                          <div className="border-t border-orange-200 p-3">
                            <div className="flex gap-1 mb-3 border-b border-orange-200 pb-2">
                              {([
                                { key: "materiales" as const, icon: <Boxes className="h-3.5 w-3.5" />, label: "Materiales", count: detalle?.materiales?.length },
                                { key: "pagos" as const, icon: <FileText className="h-3.5 w-3.5" />, label: "Pagos", count: detalle?.pagos?.length },
                                { key: "trabajos" as const, icon: <Wrench className="h-3.5 w-3.5" />, label: "Trabajos Diarios", count: detalle?.trabajos?.length },
                                { key: "vales" as const, icon: <Package className="h-3.5 w-3.5" />, label: "Vales", count: detalle?.vales?.length },
                              ]).map((t) => (
                                <button
                                  key={t.key}
                                  onClick={() => setActiveTab((p) => ({ ...p, [rowId]: t.key }))}
                                  className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t transition-colors",
                                    tab === t.key ? "bg-white border border-orange-200 text-orange-700 shadow-sm" : "text-gray-500 hover:text-gray-700",
                                  )}
                                >
                                  {t.icon}
                                  {t.label} {detalle && t.count != null ? `(${t.count})` : ""}
                                </button>
                              ))}
                            </div>

                            {isDetalleLoading ? (
                              <div className="flex items-center justify-center py-10 gap-2 text-gray-500">
                                <Loader2 className="h-5 w-5 animate-spin text-orange-400" />
                                <span className="text-sm">Cargando datos...</span>
                              </div>
                            ) : detalleErr ? (
                              <div className="flex items-center gap-2 py-6 px-4 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
                                <AlertTriangle className="h-4 w-4 shrink-0" />
                                <span>{detalleErr}</span>
                                <button
                                  onClick={() => detalleId && fetchDetalle(detalleId)}
                                  className="ml-auto text-xs underline hover:no-underline"
                                >
                                  Reintentar
                                </button>
                              </div>
                            ) : (
                              <>
                                {tab === "materiales" && <MaterialesPanel materiales={detalle?.materiales ?? []} />}
                                {tab === "pagos" && <PagosPanel pagos={detalle?.pagos ?? []} oferta={oferta} />}
                                {tab === "trabajos" && <TrabajosPanel trabajos={detalle?.trabajos ?? []} />}
                                {tab === "vales" && <ValesPanel vales={detalle?.vales ?? []} />}
                              </>
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
