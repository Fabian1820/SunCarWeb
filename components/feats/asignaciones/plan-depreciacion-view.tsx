"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent } from "@/components/shared/molecule/card"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/atom/input"
import { Label } from "@/components/shared/atom/label"
import {
  FileBarChart2, RefreshCw, Search, AlertTriangle, TrendingDown, Wallet, Calendar,
} from "lucide-react"
import { AsignacionService } from "@/lib/api-services"
import { exportToExcel } from "@/lib/export-service"
import { useToast } from "@/hooks/use-toast"
import type {
  PlanDepreciacionFila,
  PlanDepreciacionTotales,
  PlanDepreciacionFiltros,
  TipoEntidad,
} from "@/lib/types/feats/asignaciones/asignacion-types"

const money = (n?: number | null) =>
  n == null || isNaN(Number(n)) ? "—" : `$${Number(n).toFixed(2)}`

const fmtFecha = (s?: string | null) => {
  if (!s) return "—"
  const d = new Date(s)
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("es-CU", { day: "2-digit", month: "2-digit", year: "numeric" })
}

const tipoLabel: Record<TipoEntidad, string> = {
  trabajador: "Trabajador",
  almacen: "Almacén",
  tienda: "Tienda",
  sede: "Sede",
}

export function PlanDepreciacionView() {
  const { toast } = useToast()
  const [data, setData] = useState<PlanDepreciacionFila[]>([])
  const [totales, setTotales] = useState<PlanDepreciacionTotales>({
    costo_total: 0, depreciacion_mensual: 0,
    valor_depreciado: 0, valor_residual: 0, cantidad_filas: 0,
  })
  const [loading, setLoading] = useState(false)
  const [busqueda, setBusqueda] = useState("")

  // Filtros del backend
  const [filtros, setFiltros] = useState<PlanDepreciacionFiltros>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await AsignacionService.getPlanDepreciacion(filtros)
      setData(res.data)
      setTotales(res.totales)
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "No se pudo cargar el plan",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [filtros, toast])

  useEffect(() => { load() }, [load])

  // Búsqueda local (sobre nombre, entidad, n/s, descripción)
  const filtrado = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return data
    return data.filter(f =>
      f.nombre.toLowerCase().includes(q) ||
      (f.entidad_nombre?.toLowerCase().includes(q) ?? false) ||
      f.entidad_id.toLowerCase().includes(q) ||
      (f.numero_serie?.toLowerCase().includes(q) ?? false) ||
      (f.descripcion?.toLowerCase().includes(q) ?? false)
    )
  }, [data, busqueda])

  const totallyDepreciated = filtrado.filter(f => f.valor_residual === 0).length

  const handleExport = async () => {
    try {
      await exportToExcel({
        title: "Plan de Depreciación — Suncar SRL",
        subtitle: `Generado: ${new Date().toLocaleString("es-CU")} · ${filtrado.length} activos`,
        filename: `plan-depreciacion-${new Date().toISOString().slice(0, 10)}.xlsx`,
        columns: [
          { header: "Entidad", key: "entidad", width: 25 },
          { header: "Tipo", key: "tipo", width: 12 },
          { header: "Recurso", key: "recurso", width: 30 },
          { header: "N° Serie", key: "serie", width: 14 },
          { header: "Descripción", key: "desc", width: 25 },
          { header: "Cantidad", key: "cant", width: 10 },
          { header: "Costo unit.", key: "costou", width: 12 },
          { header: "Costo total", key: "costot", width: 12 },
          { header: "Fecha asignación", key: "fasig", width: 14 },
          { header: "Inicio depreciación", key: "fdep", width: 14 },
          { header: "Meses transcurridos", key: "meses", width: 10 },
          { header: "Dep. mensual", key: "dmen", width: 12 },
          { header: "Valor depreciado", key: "vdep", width: 14 },
          { header: "Valor residual", key: "vres", width: 14 },
        ],
        data: filtrado.map(f => ({
          entidad: f.entidad_nombre ?? f.entidad_id,
          tipo: tipoLabel[f.entidad_tipo],
          recurso: f.nombre,
          serie: f.numero_serie ?? "",
          desc: f.descripcion ?? "",
          cant: f.cantidad,
          costou: Number(f.costo ?? 0),
          costot: f.costo_total,
          fasig: fmtFecha(f.fecha_asignacion),
          fdep: fmtFecha(f.fecha_inicio_depreciacion),
          meses: f.meses_transcurridos,
          dmen: f.depreciacion_mensual,
          vdep: f.valor_depreciado,
          vres: f.valor_residual,
        })),
      })
      toast({ title: "Listo", description: "Excel exportado" })
    } catch (e) {
      toast({ title: "Error", description: "No se pudo exportar", variant: "destructive" })
    }
  }

  const setFiltro = <K extends keyof PlanDepreciacionFiltros>(k: K, v: PlanDepreciacionFiltros[K]) =>
    setFiltros(prev => ({ ...prev, [k]: v }))

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <FileBarChart2 className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Plan de depreciación</h2>
              <p className="text-xs text-gray-500">
                Vista contable de los activos asignados. Depreciación lineal a 60 meses (5 años).
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
            <Button size="sm" onClick={handleExport} disabled={loading || filtrado.length === 0}>
              Exportar Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resumen ejecutivo */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-[11px] text-gray-500 uppercase">Activos</p>
            <p className="text-xl font-bold text-gray-800">{totales.cantidad_filas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[11px] text-gray-500 uppercase flex items-center gap-1">
              <Wallet className="h-3 w-3" /> Costo total
            </p>
            <p className="text-xl font-bold text-gray-800">{money(totales.costo_total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[11px] text-gray-500 uppercase flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Dep. mensual
            </p>
            <p className="text-xl font-bold text-amber-700">{money(totales.depreciacion_mensual)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[11px] text-gray-500 uppercase flex items-center gap-1">
              <TrendingDown className="h-3 w-3" /> Dep. acumulada
            </p>
            <p className="text-xl font-bold text-amber-700">{money(totales.valor_depreciado)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[11px] text-gray-500 uppercase">Valor residual</p>
            <p className="text-xl font-bold text-emerald-700">{money(totales.valor_residual)}</p>
            {totallyDepreciated > 0 && (
              <p className="text-[10px] text-red-600 flex items-center gap-1 mt-1">
                <AlertTriangle className="h-3 w-3" /> {totallyDepreciated} activos totalmente depreciados
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Filtros</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px]">Tipo de entidad</Label>
              <select
                className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white"
                value={filtros.entidad_tipo ?? ""}
                onChange={e => setFiltro("entidad_tipo", (e.target.value || undefined) as TipoEntidad | undefined)}
              >
                <option value="">Todas</option>
                <option value="trabajador">Trabajadores</option>
                <option value="almacen">Almacenes</option>
                <option value="tienda">Tiendas</option>
                <option value="sede">Sedes</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Tipo de ítem</Label>
              <select
                className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white"
                value={filtros.item_tipo ?? ""}
                onChange={e => setFiltro("item_tipo", (e.target.value || undefined) as any)}
              >
                <option value="">Todos</option>
                <option value="medio_basico">Medios básicos</option>
                <option value="material">Materiales</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Asignado desde</Label>
              <Input
                type="date"
                value={filtros.desde ? filtros.desde.slice(0, 10) : ""}
                onChange={e => setFiltro("desde", e.target.value ? new Date(e.target.value).toISOString() : undefined)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Asignado hasta</Label>
              <Input
                type="date"
                value={filtros.hasta ? filtros.hasta.slice(0, 10) : ""}
                onChange={e => setFiltro("hasta", e.target.value ? new Date(e.target.value + "T23:59:59").toISOString() : undefined)}
              />
            </div>
          </div>
          <div className="flex gap-4 text-xs flex-wrap">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={!!filtros.solo_depreciados}
                onChange={e => setFiltro("solo_depreciados", e.target.checked || undefined)}
              />
              Solo totalmente depreciados
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={!!filtros.solo_vigentes}
                onChange={e => setFiltro("solo_vigentes", e.target.checked || undefined)}
              />
              Solo con valor residual {">"} 0
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={!!filtros.incluir_inactivas}
                onChange={e => setFiltro("incluir_inactivas", e.target.checked || undefined)}
              />
              Incluir inactivas (transferidas/eliminadas)
            </label>
            {Object.keys(filtros).length > 0 && (
              <button
                onClick={() => setFiltros({})}
                className="text-xs text-blue-600 hover:underline ml-auto"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardContent className="p-4">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input
              className="pl-9"
              placeholder="Buscar por entidad, recurso, n/s o descripción..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>

          {loading && data.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">Cargando plan...</p>
          ) : filtrado.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">
              No hay activos que cumplan los criterios
            </p>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500 uppercase text-[10px]">
                    <th className="py-2 pr-2">Entidad</th>
                    <th className="py-2 pr-2">Recurso</th>
                    <th className="py-2 pr-2 text-center">Cant.</th>
                    <th className="py-2 pr-2 text-right">Costo u.</th>
                    <th className="py-2 pr-2 text-right">Costo total</th>
                    <th className="py-2 pr-2 text-center">Asignado</th>
                    <th className="py-2 pr-2 text-center">Meses</th>
                    <th className="py-2 pr-2 text-right">Dep./mes</th>
                    <th className="py-2 pr-2 text-right">Depreciado</th>
                    <th className="py-2 pr-2 text-right">Residual</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrado.map(f => {
                    const dep100 = f.valor_residual === 0 && (f.costo_total ?? 0) > 0
                    return (
                      <tr key={f.id} className="border-b border-gray-100 hover:bg-gray-50/60">
                        <td className="py-2 pr-2 align-top">
                          <p className="font-medium text-gray-800 truncate max-w-[14ch]" title={f.entidad_nombre ?? f.entidad_id}>
                            {f.entidad_nombre ?? f.entidad_id}
                          </p>
                          <p className="text-[10px] text-gray-400 capitalize">{tipoLabel[f.entidad_tipo]}</p>
                        </td>
                        <td className="py-2 pr-2 align-top">
                          <p className="font-medium truncate max-w-[18ch]" title={f.nombre}>{f.nombre}</p>
                          <div className="flex flex-wrap gap-1 text-[10px] text-gray-400">
                            <span className={`px-1 rounded ${f.item_tipo === 'medio_basico' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                              {f.item_tipo === 'medio_basico' ? 'MB' : 'MAT'}
                            </span>
                            {f.numero_serie && <span className="font-mono">{f.numero_serie}</span>}
                            {dep100 && (
                              <span className="text-red-600 font-medium flex items-center gap-0.5">
                                <AlertTriangle className="h-2.5 w-2.5" /> 100%
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 pr-2 text-center align-top">{f.cantidad}</td>
                        <td className="py-2 pr-2 text-right align-top">{money(f.costo)}</td>
                        <td className="py-2 pr-2 text-right font-medium align-top">{money(f.costo_total)}</td>
                        <td className="py-2 pr-2 text-center text-gray-500 align-top">{fmtFecha(f.fecha_asignacion)}</td>
                        <td className="py-2 pr-2 text-center align-top">
                          <span className="text-gray-500">{f.meses_transcurridos}/60</span>
                        </td>
                        <td className="py-2 pr-2 text-right text-amber-700 align-top">{money(f.depreciacion_mensual)}</td>
                        <td className="py-2 pr-2 text-right text-amber-700 align-top">{money(f.valor_depreciado)}</td>
                        <td className="py-2 pr-2 text-right text-emerald-700 font-semibold align-top">{money(f.valor_residual)}</td>
                      </tr>
                    )
                  })}
                </tbody>
                {/* Totales en pie */}
                <tfoot className="bg-emerald-50/40 border-t-2 border-emerald-200">
                  <tr className="font-semibold text-gray-800">
                    <td className="py-2 pr-2" colSpan={4}>TOTALES ({filtrado.length} filas)</td>
                    <td className="py-2 pr-2 text-right">
                      {money(filtrado.reduce((s, f) => s + f.costo_total, 0))}
                    </td>
                    <td colSpan={2}></td>
                    <td className="py-2 pr-2 text-right text-amber-700">
                      {money(filtrado.reduce((s, f) => s + f.depreciacion_mensual * f.cantidad, 0))}
                    </td>
                    <td className="py-2 pr-2 text-right text-amber-700">
                      {money(filtrado.reduce((s, f) => s + f.valor_depreciado, 0))}
                    </td>
                    <td className="py-2 pr-2 text-right text-emerald-700">
                      {money(filtrado.reduce((s, f) => s + f.valor_residual, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
