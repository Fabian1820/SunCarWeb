"use client"

import { Fragment, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select"
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Download,
  Loader2,
  PackageSearch,
  Search,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { normalizeSearchText } from "@/lib/utils/string-utils"
import {
  MaterialesOfertasSelector,
  type MaterialSeleccionado,
} from "./materiales-ofertas-selector"
import {
  ESTADOS_OFERTA_REPORTE,
  MAX_MATERIALES_REPORTE,
  MaterialesOfertasService,
} from "@/lib/services/feats/reportes-comercial/materiales-ofertas-service"
import { ExportMaterialesOfertasExcelService } from "@/lib/services/feats/reportes-comercial/export-materiales-ofertas-excel-service"
import {
  ESTADOS_PENDIENTES_INSTALAR,
  ETIQUETA_TIPO_CONTACTO,
  construirResumen,
  estadoCanonico,
  estadoDeLinea,
  estadosNoCuadran,
  formatearFecha,
  formatearMoneda,
  ordenarEstados,
} from "@/lib/services/feats/reportes-comercial/materiales-ofertas-resumen"
import type {
  EstadoSegun,
  GrupoPrecio,
  LineaMaterialOferta,
  MaterialesEnOfertasData,
} from "@/lib/types/feats/reportes-comercial/materiales-ofertas-types"

const CLASE_ESTADO: Record<string, string> = {
  "Pendiente de instalación": "bg-amber-50 text-amber-800 border-amber-200",
  "Instalación en Proceso": "bg-emerald-50 text-emerald-800 border-emerald-200",
  "Esperando equipo": "bg-orange-50 text-orange-800 border-orange-200",
  "Equipo instalado con éxito": "bg-sky-50 text-sky-800 border-sky-200",
}

function claseEstado(estado: string) {
  return CLASE_ESTADO[estado] ?? "bg-gray-50 text-gray-700 border-gray-200"
}

/** Por encima de este número de líneas los grupos del detalle empiezan plegados. */
const LINEAS_PARA_PLEGAR = 40

function clave(grupo: GrupoPrecio) {
  return `${grupo.codigo}__${grupo.precio}`
}

function EstadoPill({ estado }: { estado: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap", claseEstado(estado))}>
      {estado}
    </span>
  )
}

export function MaterialesOfertasReport() {
  const { toast } = useToast()
  const [seleccionados, setSeleccionados] = useState<MaterialSeleccionado[]>([])
  const [estadosOferta, setEstadosOferta] = useState<string[]>(["confirmada_por_cliente"])
  const [datos, setDatos] = useState<MaterialesEnOfertasData | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [estadoSegun, setEstadoSegun] = useState<EstadoSegun>("cliente")
  const [estadosContacto, setEstadosContacto] = useState<string[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [exportando, setExportando] = useState(false)
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set())

  const buscar = async () => {
    if (seleccionados.length === 0) {
      toast({ title: "Elige al menos un material", variant: "destructive" })
      return
    }
    if (estadosOferta.length === 0) {
      toast({ title: "Elige al menos un estado de oferta", variant: "destructive" })
      return
    }
    setCargando(true)
    setError(null)
    try {
      const resultado = await MaterialesOfertasService.buscar(
        seleccionados.map((m) => m.codigo),
        estadosOferta,
      )
      setDatos(resultado)
      setAbiertos(
        resultado.lineas.length <= LINEAS_PARA_PLEGAR
          ? new Set(resultado.lineas.map((l) => `${l.codigo}__${l.precio}`))
          : new Set(),
      )
      if (resultado.truncado) {
        toast({
          title: "Resultado incompleto",
          description: `Hay más de ${resultado.total_lineas} líneas. Busca menos materiales a la vez.`,
          variant: "destructive",
        })
      }
    } catch (e: any) {
      setDatos(null)
      setError(e?.message || "No se pudo cargar el reporte")
    } finally {
      setCargando(false)
    }
  }

  const estadosDisponibles = useMemo(() => {
    if (!datos) return []
    const unidades = new Map<string, number>()
    for (const linea of datos.lineas) {
      const estado = estadoDeLinea(linea, estadoSegun)
      unidades.set(estado, (unidades.get(estado) || 0) + linea.cantidad)
    }
    return ordenarEstados(unidades.keys()).map((estado) => ({ estado, unidades: unidades.get(estado) || 0 }))
  }, [datos, estadoSegun])

  const lineasFiltradas = useMemo(() => {
    if (!datos) return []
    const termino = normalizeSearchText(busqueda.trim())
    return datos.lineas.filter((linea) => {
      if (estadosContacto.length > 0 && !estadosContacto.includes(estadoDeLinea(linea, estadoSegun))) {
        return false
      }
      if (termino) {
        const texto = normalizeSearchText(
          [linea.contacto_nombre, linea.numero_oferta, linea.cliente_numero, linea.nombre_oferta]
            .filter(Boolean)
            .join(" "),
        )
        if (!texto.includes(termino)) return false
      }
      return true
    })
  }, [datos, estadosContacto, estadoSegun, busqueda])

  const resumen = useMemo(
    () => (datos ? construirResumen(lineasFiltradas, datos.materiales, estadoSegun) : null),
    [datos, lineasFiltradas, estadoSegun],
  )

  const ofertasNoCuadran = useMemo(
    () => new Set(lineasFiltradas.filter(estadosNoCuadran).map((l) => l.oferta_id)).size,
    [lineasFiltradas],
  )

  const materialesSinLineas = useMemo(
    () => (datos ? datos.materiales.filter((m) => !datos.lineas.some((l) => l.codigo === m.codigo)) : []),
    [datos],
  )

  const soloPendientes =
    estadosContacto.length === ESTADOS_PENDIENTES_INSTALAR.length &&
    ESTADOS_PENDIENTES_INSTALAR.every((e) => estadosContacto.includes(e))

  const toggleEstadoOferta = (valor: string) =>
    setEstadosOferta((prev) => (prev.includes(valor) ? prev.filter((v) => v !== valor) : [...prev, valor]))

  const toggleEstadoContacto = (estado: string) =>
    setEstadosContacto((prev) => (prev.includes(estado) ? prev.filter((e) => e !== estado) : [...prev, estado]))

  const toggleGrupo = (id: string) =>
    setAbiertos((prev) => {
      const siguiente = new Set(prev)
      if (siguiente.has(id)) siguiente.delete(id)
      else siguiente.add(id)
      return siguiente
    })

  const todosLosGrupos = resumen ? resumen.materiales.flatMap((m) => m.grupos.map(clave)) : []
  const todoAbierto = todosLosGrupos.length > 0 && todosLosGrupos.every((id) => abiertos.has(id))

  const exportar = async () => {
    if (!datos || lineasFiltradas.length === 0) {
      toast({ title: "Sin datos", description: "No hay líneas que exportar con estos filtros." })
      return
    }
    setExportando(true)
    try {
      await ExportMaterialesOfertasExcelService.exportar(lineasFiltradas, datos.materiales, {
        estadosOferta: datos.estados_oferta,
        estadoSegun,
        estadosContacto,
        busqueda: busqueda.trim(),
      })
      toast({ title: "Excel generado", description: "Se descargó el reporte con el resumen y el detalle." })
    } catch (e: any) {
      console.error("Error exportando materiales en ofertas:", e)
      toast({ title: "Error", description: "No se pudo generar el Excel", variant: "destructive" })
    } finally {
      setExportando(false)
    }
  }

  const otroEstado = (linea: LineaMaterialOferta) =>
    estadoSegun === "cliente"
      ? `En la oferta: ${linea.estado_instalacion_oferta || "sin estado"}`
      : `Cliente: ${estadoCanonico(linea.estado_contacto)}`

  return (
    <div className="space-y-6">
      {/* Búsqueda */}
      <Card className="border-l-4 border-l-emerald-600">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Buscar materiales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <MaterialesOfertasSelector
            seleccionados={seleccionados}
            onChange={setSeleccionados}
            max={MAX_MATERIALES_REPORTE}
            disabled={cargando}
          />
          <div>
            <Label>Estado de la oferta</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {ESTADOS_OFERTA_REPORTE.map((estado) => {
                const activo = estadosOferta.includes(estado.value)
                return (
                  <button
                    key={estado.value}
                    type="button"
                    onClick={() => toggleEstadoOferta(estado.value)}
                    aria-pressed={activo}
                    className={cn(
                      "rounded-full border px-3 py-1 text-sm transition-colors",
                      activo
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:border-emerald-400",
                    )}
                  >
                    {estado.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={buscar}
              disabled={cargando || seleccionados.length === 0}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Buscar en ofertas
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-red-800">{error}</p>
            <Button variant="outline" size="sm" onClick={buscar}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      )}

      {!datos && !cargando && !error && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white/60 p-10 text-center">
          <PackageSearch className="mx-auto mb-3 h-10 w-10 text-gray-400" />
          <p className="font-medium text-gray-800">Elige uno o varios materiales y busca</p>
          <p className="mt-1 text-sm text-gray-600">
            Verás en qué ofertas están, a qué precio unitario y con qué cliente.
          </p>
        </div>
      )}

      {datos && resumen && (
        <>
          {/* Filtros sobre el resultado */}
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-end">
                <div className="md:w-64">
                  <Label>Estado según</Label>
                  <Select value={estadoSegun} onValueChange={(v) => setEstadoSegun(v as EstadoSegun)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cliente">El cliente (o el lead)</SelectItem>
                      <SelectItem value="oferta">La oferta (estado de instalación)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label htmlFor="busqueda-materiales-ofertas">Buscar en el resultado</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      id="busqueda-materiales-ofertas"
                      placeholder="Cliente, nº de oferta, nº de cliente…"
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Button variant="outline" onClick={exportar} disabled={exportando} className="gap-2">
                  {exportando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Exportar Excel
                </Button>
              </div>

              <div>
                <Label>Estado</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setEstadosContacto([])}
                    aria-pressed={estadosContacto.length === 0}
                    className={cn(
                      "rounded-full border px-3 py-1 text-sm",
                      estadosContacto.length === 0
                        ? "border-gray-800 bg-gray-800 text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:border-gray-500",
                    )}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setEstadosContacto([...ESTADOS_PENDIENTES_INSTALAR])}
                    aria-pressed={soloPendientes}
                    className={cn(
                      "rounded-full border px-3 py-1 text-sm",
                      soloPendientes
                        ? "border-emerald-700 bg-emerald-700 text-white"
                        : "border-emerald-300 bg-white text-emerald-800 hover:border-emerald-500",
                    )}
                  >
                    Falta instalar
                  </button>
                  <span className="mx-1 hidden w-px self-stretch bg-gray-200 sm:block" />
                  {estadosDisponibles.map(({ estado, unidades }) => {
                    const activo = estadosContacto.includes(estado)
                    return (
                      <button
                        key={estado}
                        type="button"
                        onClick={() => toggleEstadoContacto(estado)}
                        aria-pressed={activo}
                        className={cn(
                          "rounded-full border px-3 py-1 text-sm",
                          activo ? cn(claseEstado(estado), "ring-2 ring-offset-1 ring-emerald-500") : "border-gray-200 bg-white text-gray-700 hover:border-gray-400",
                        )}
                      >
                        {estado} <span className="text-xs opacity-70">· {unidades} u.</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Totales */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { etiqueta: "Unidades", valor: resumen.unidades.toLocaleString("es-ES") },
              { etiqueta: "Ofertas", valor: resumen.ofertas.toLocaleString("es-ES") },
              { etiqueta: "Importe", valor: formatearMoneda(resumen.importe) },
              {
                etiqueta: "Precios distintos",
                valor: resumen.materiales.reduce((n, m) => n + m.grupos.length, 0).toLocaleString("es-ES"),
              },
            ].map((kpi) => (
              <Card key={kpi.etiqueta}>
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">{kpi.etiqueta}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">{kpi.valor}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {(datos.truncado || ofertasNoCuadran > 0 || materialesSinLineas.length > 0) && (
            <div className="space-y-2">
              {datos.truncado && (
                <p className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  El resultado está incompleto: hay más líneas de las que se pueden mostrar. Busca menos materiales a la vez.
                </p>
              )}
              {ofertasNoCuadran > 0 && (
                <p className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  En {ofertasNoCuadran} {ofertasNoCuadran === 1 ? "oferta" : "ofertas"} el estado del cliente y el guardado
                  en la oferta no coinciden en si falta instalar. Están marcadas en el detalle; cambia «Estado según» para
                  contar con el otro.
                </p>
              )}
              {materialesSinLineas.length > 0 && (
                <p className="rounded-md border border-gray-200 bg-white p-3 text-sm text-gray-700">
                  Sin ofertas en estos estados: {materialesSinLineas.map((m) => m.codigo).join(", ")}
                </p>
              )}
            </div>
          )}

          {lineasFiltradas.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center text-gray-600">
                No hay líneas con estos filtros.
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Resumen por precio */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Resumen por precio</CardTitle>
                  <p className="text-sm text-gray-600">
                    Precio unitario de la línea, antes de repartir el margen. No es lo que paga el cliente.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                          <th className="py-2 pr-3 font-medium">Material</th>
                          <th className="py-2 pr-3 text-right font-medium">Precio</th>
                          {resumen.estados.map((estado) => (
                            <th key={estado} className="py-2 pr-3 text-right font-medium normal-case">
                              {estado}
                            </th>
                          ))}
                          <th className="py-2 pr-3 text-right font-medium">Unidades</th>
                          <th className="py-2 pr-3 text-right font-medium">Ofertas</th>
                          <th className="py-2 pr-3 text-right font-medium">Importe</th>
                          <th className="py-2 text-right font-medium">Ofertas del…</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resumen.materiales.map((rm) => (
                          <Fragment key={rm.material.codigo}>
                            {rm.grupos.map((grupo) => (
                              <tr key={clave(grupo)} className="border-b border-gray-100">
                                <td className="py-2 pr-3 font-medium text-gray-900">{rm.material.codigo}</td>
                                <td className="py-2 pr-3 text-right tabular-nums">{formatearMoneda(grupo.precio)}</td>
                                {resumen.estados.map((estado) => (
                                  <td key={estado} className="py-2 pr-3 text-right tabular-nums text-gray-700">
                                    {grupo.unidadesPorEstado[estado] || <span className="text-gray-300">–</span>}
                                  </td>
                                ))}
                                <td className="py-2 pr-3 text-right font-semibold tabular-nums">{grupo.unidades}</td>
                                <td className="py-2 pr-3 text-right tabular-nums">{grupo.ofertas}</td>
                                <td className="py-2 pr-3 text-right tabular-nums">{formatearMoneda(grupo.importe)}</td>
                                <td className="py-2 text-right text-xs tabular-nums text-gray-500 whitespace-nowrap">
                                  {formatearFecha(grupo.primera)} – {formatearFecha(grupo.ultima)}
                                </td>
                              </tr>
                            ))}
                            <tr className="border-b bg-emerald-50/70 font-semibold">
                              <td className="py-2 pr-3">Total {rm.material.codigo}</td>
                              <td className="py-2 pr-3" />
                              {resumen.estados.map((estado) => (
                                <td key={estado} className="py-2 pr-3 text-right tabular-nums">
                                  {rm.unidadesPorEstado[estado] || <span className="text-gray-300">–</span>}
                                </td>
                              ))}
                              <td className="py-2 pr-3 text-right tabular-nums">{rm.unidades}</td>
                              <td className="py-2 pr-3 text-right tabular-nums">{rm.ofertas}</td>
                              <td className="py-2 pr-3 text-right tabular-nums">{formatearMoneda(rm.importe)}</td>
                              <td className="py-2 text-right text-xs font-normal tabular-nums text-gray-600 whitespace-nowrap">
                                {formatearFecha(rm.primera)} – {formatearFecha(rm.ultima)}
                              </td>
                            </tr>
                          </Fragment>
                        ))}
                        {resumen.materiales.length > 1 && (
                          <tr className="bg-gray-900 font-semibold text-white">
                            <td className="py-2 pl-2 pr-3">Total</td>
                            <td className="py-2 pr-3" />
                            {resumen.estados.map((estado) => (
                              <td key={estado} className="py-2 pr-3 text-right tabular-nums">
                                {resumen.unidadesPorEstado[estado] || "–"}
                              </td>
                            ))}
                            <td className="py-2 pr-3 text-right tabular-nums">{resumen.unidades}</td>
                            <td className="py-2 pr-3 text-right tabular-nums">{resumen.ofertas}</td>
                            <td className="py-2 pr-3 text-right tabular-nums">{formatearMoneda(resumen.importe)}</td>
                            <td className="py-2 pr-2 text-right text-xs font-normal tabular-nums whitespace-nowrap">
                              {formatearFecha(resumen.primera)} – {formatearFecha(resumen.ultima)}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <ul className="mt-3 space-y-1 text-xs text-gray-600">
                    {resumen.materiales.map(({ material: m }) => (
                      <li key={m.codigo}>
                        <span className="font-medium text-gray-800">{m.codigo}</span>
                        {" · "}
                        {m.en_catalogo
                          ? `${m.nombre || m.descripcion || "sin nombre"} · catálogo hoy: ${formatearMoneda(m.precio_catalogo)}`
                          : "no está en el catálogo actual"}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Detalle */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
                  <CardTitle className="text-lg">Ofertas por precio</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAbiertos(todoAbierto ? new Set() : new Set(todosLosGrupos))}
                  >
                    {todoAbierto ? "Plegar todo" : "Desplegar todo"}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {resumen.materiales.map((rm) => (
                    <div key={rm.material.codigo} className="space-y-2">
                      {resumen.materiales.length > 1 && (
                        <h3 className="border-b pb-1 text-sm font-semibold text-gray-900">
                          {rm.material.codigo}
                          <span className="font-normal text-gray-600">
                            {" · "}
                            {rm.material.nombre || rm.material.descripcion || ""}
                          </span>
                        </h3>
                      )}
                      {rm.grupos.map((grupo) => {
                        const id = clave(grupo)
                        const abierto = abiertos.has(id)
                        return (
                          <div key={id} className="rounded-lg border border-gray-200">
                            <button
                              type="button"
                              onClick={() => toggleGrupo(id)}
                              aria-expanded={abierto}
                              className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 rounded-lg px-3 py-2 text-left hover:bg-gray-50"
                            >
                              {abierto ? (
                                <ChevronDown className="h-4 w-4 text-gray-500" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-gray-500" />
                              )}
                              <span className="font-semibold tabular-nums text-gray-900">
                                {formatearMoneda(grupo.precio)}
                              </span>
                              <span className="text-sm tabular-nums text-gray-600">
                                {grupo.unidades} u. · {grupo.ofertas} {grupo.ofertas === 1 ? "oferta" : "ofertas"} ·{" "}
                                {formatearMoneda(grupo.importe)}
                              </span>
                              <span className="flex flex-wrap gap-1">
                                {resumen.estados
                                  .filter((estado) => grupo.unidadesPorEstado[estado])
                                  .map((estado) => (
                                    <span
                                      key={estado}
                                      className={cn("rounded-full border px-2 py-0.5 text-xs", claseEstado(estado))}
                                    >
                                      {grupo.unidadesPorEstado[estado]} {estado.toLowerCase()}
                                    </span>
                                  ))}
                              </span>
                            </button>
                            {abierto && (
                              <div className="overflow-x-auto border-t">
                                <table className="w-full min-w-[760px] text-sm">
                                  <thead>
                                    <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                                      <th className="px-3 py-2 font-medium">Nº oferta</th>
                                      <th className="px-3 py-2 font-medium">Cliente</th>
                                      <th className="px-3 py-2 font-medium">Estado</th>
                                      <th className="px-3 py-2 font-medium">Creada</th>
                                      <th className="px-3 py-2 text-right font-medium">Cant.</th>
                                      <th className="px-3 py-2 text-right font-medium">Importe</th>
                                      <th className="px-3 py-2 text-right font-medium">Precio oferta</th>
                                      <th className="px-3 py-2 font-medium">Pago</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {grupo.lineas.map((linea, i) => {
                                      const estado = estadoDeLinea(linea, estadoSegun)
                                      return (
                                        <tr key={`${linea.oferta_id}-${i}`} className="border-t border-gray-100 align-top">
                                          <td className="px-3 py-2 whitespace-nowrap">
                                            <span className="font-medium text-gray-900">{linea.numero_oferta || "—"}</span>
                                            {linea.precio_editado && (
                                              <span
                                                className="ml-1 rounded bg-amber-100 px-1 text-[10px] font-medium text-amber-800"
                                                title={
                                                  linea.precio_original !== null
                                                    ? `Precio cambiado a mano. Catálogo al hacer la oferta: ${formatearMoneda(linea.precio_original)}`
                                                    : "Precio cambiado a mano"
                                                }
                                              >
                                                editado
                                              </span>
                                            )}
                                          </td>
                                          <td className="px-3 py-2">
                                            <p className="text-gray-900">{linea.contacto_nombre || "(sin nombre)"}</p>
                                            <p className="text-xs text-gray-500">
                                              {[
                                                linea.contacto_tipo ? ETIQUETA_TIPO_CONTACTO[linea.contacto_tipo] : null,
                                                linea.cliente_numero,
                                              ]
                                                .filter(Boolean)
                                                .join(" · ")}
                                            </p>
                                          </td>
                                          <td className="px-3 py-2">
                                            <div className="flex items-center gap-1">
                                              <EstadoPill estado={estado} />
                                              {estadosNoCuadran(linea) && (
                                                <span title={otroEstado(linea)} className="text-amber-600">
                                                  <AlertTriangle className="h-4 w-4" aria-label={otroEstado(linea)} />
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                          <td className="px-3 py-2 tabular-nums whitespace-nowrap text-gray-700">
                                            {formatearFecha(linea.fecha_creacion)}
                                          </td>
                                          <td className="px-3 py-2 text-right tabular-nums">{linea.cantidad}</td>
                                          <td className="px-3 py-2 text-right tabular-nums">{formatearMoneda(linea.importe)}</td>
                                          <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                                            {formatearMoneda(linea.precio_final_oferta)}
                                          </td>
                                          <td className="px-3 py-2 capitalize text-gray-700">{linea.estado_pago || "—"}</td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  )
}
