"use client"

import { Fragment, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Switch } from "@/components/shared/molecule/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select"
import { AlertTriangle, BookOpen, ChevronDown, ChevronRight, Download, Info, Loader2, RefreshCw, Search } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/shared/molecule/popover"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { normalizeSearchText } from "@/lib/utils/string-utils"
import { MaterialesComprometidosService } from "@/lib/services/feats/reportes-comercial/materiales-comprometidos-service"
import { ExportMaterialesComprometidosExcelService } from "@/lib/services/feats/reportes-comercial/export-materiales-comprometidos-excel-service"
import {
  ETIQUETA_SECCION,
  almacenesDeLasOfertas,
  calcularCobertura,
  construirFilasMateriales,
  diasDesde,
  etiquetaSeccion,
  filtrarOfertas,
  formatearCantidad,
} from "@/lib/services/feats/reportes-comercial/materiales-comprometidos-calculo"
import {
  ETIQUETA_TIPO_CONTACTO,
  formatearFecha,
  formatearMoneda,
} from "@/lib/services/feats/reportes-comercial/materiales-ofertas-resumen"
import type {
  CoberturaOferta,
  FilaMaterialComprometido,
  MaterialComprometido,
  MaterialesComprometidosData,
  OfertaComprometida,
} from "@/lib/types/feats/reportes-comercial/materiales-comprometidos-types"

const CLASE_ESTADO: Record<string, string> = {
  "Pendiente de instalación": "bg-amber-50 text-amber-800 border-amber-200",
  "Instalación en Proceso": "bg-emerald-50 text-emerald-800 border-emerald-200",
  "Esperando equipo": "bg-orange-50 text-orange-800 border-orange-200",
}

type Vista = "material" | "oferta"
type FiltroCobertura = "todas" | "completa" | "incompleta"

function chip(activo: boolean) {
  return cn(
    "rounded-full border px-3 py-1 text-sm transition-colors",
    activo ? "border-emerald-600 bg-emerald-600 text-white" : "border-gray-300 bg-white text-gray-700 hover:border-emerald-400",
  )
}

function nombreMaterial(m: MaterialComprometido) {
  return m.nombre || m.descripcion || "sin nombre"
}

function Dias({ iso }: { iso: string | null }) {
  const dias = diasDesde(iso)
  if (dias === null) return <span className="text-gray-400">—</span>
  return (
    <span
      className={cn(
        "tabular-nums whitespace-nowrap",
        dias > 60 ? "font-semibold text-red-700" : dias > 30 ? "text-amber-700" : "text-gray-700",
      )}
      title={`Desde el ${formatearFecha(iso)}`}
    >
      {dias} d
    </span>
  )
}

function Contacto({ oferta }: { oferta: OfertaComprometida }) {
  return (
    <>
      <p className="text-gray-900">{oferta.contacto_nombre || "(sin nombre)"}</p>
      <p className="text-xs text-gray-500">
        {[oferta.contacto_tipo ? ETIQUETA_TIPO_CONTACTO[oferta.contacto_tipo] : null, oferta.cliente_numero]
          .filter(Boolean)
          .join(" · ")}
      </p>
    </>
  )
}

function EstadoPill({ estado }: { estado: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        CLASE_ESTADO[estado] ?? "bg-gray-50 text-gray-700 border-gray-200",
      )}
    >
      {estado}
    </span>
  )
}

/** Cabecera de columna con una ⓘ que explica qué es (se abre al tocar, también en móvil). */
function Cabecera({ texto, ayuda, derecha = true }: { texto: string; ayuda: string; derecha?: boolean }) {
  return (
    <th className={cn("px-3 py-2 font-medium", derecha && "text-right")}>
      <span className={cn("inline-flex items-center gap-1", derecha && "justify-end")}>
        {texto}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`Qué es «${texto}»`}
              onClick={(e) => e.stopPropagation()}
              className="rounded-full text-gray-400 hover:text-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 text-left text-xs font-normal normal-case tracking-normal text-gray-700">
            {ayuda}
          </PopoverContent>
        </Popover>
      </span>
    </th>
  )
}

/** "Faltan 370" / "Sobran 12" / "Justo": la diferencia dicha en palabras. */
function SobraFalta({ valor }: { valor: number }) {
  if (Math.abs(valor) < 0.005) return <span className="font-semibold text-gray-600">Justo</span>
  const falta = valor < 0
  return (
    <span className={cn("font-semibold whitespace-nowrap", falta ? "text-red-700" : "text-emerald-700")}>
      {falta ? "Faltan" : "Sobran"} {formatearCantidad(Math.abs(valor))}
    </span>
  )
}

const CLAVE_GUIA = "reportes-comercial:comprometidos:guia-plegada"

function GuiaDeLectura({ estados }: { estados: string[] }) {
  const [abierta, setAbierta] = useState(true)
  useEffect(() => {
    try {
      if (localStorage.getItem(CLAVE_GUIA) === "1") setAbierta(false)
    } catch {}
  }, [])
  const cambiar = () => {
    setAbierta((prev) => {
      try {
        localStorage.setItem(CLAVE_GUIA, prev ? "1" : "0")
      } catch {}
      return !prev
    })
  }

  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50/70">
      <button
        type="button"
        onClick={cambiar}
        aria-expanded={abierta}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-sky-900"
      >
        <BookOpen className="h-4 w-4 flex-shrink-0" />
        Cómo leer este reporte
        {abierta ? <ChevronDown className="ml-auto h-4 w-4" /> : <ChevronRight className="ml-auto h-4 w-4" />}
      </button>
      {abierta && (
        <div className="space-y-3 border-t border-sky-200 px-4 pb-4 pt-3 text-sm text-gray-700">
          <p>
            Aquí está el material que <strong>ya le debemos a clientes que pagaron</strong> y todavía no tienen el equipo
            instalado: ofertas confirmadas, con al menos un pago, y el cliente en{" "}
            {estados.map((e, i) => (
              <Fragment key={e}>
                {i > 0 && (i === estados.length - 1 ? " o " : ", ")}«{e}»
              </Fragment>
            ))}
            .
          </p>
          <div className="rounded-md border border-sky-200 bg-white p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Ejemplo con un material</p>
            <ul className="space-y-1">
              <li>
                <strong>En las ofertas: 10.</strong> Las ofertas comprometidas llevan 10 paneles.
              </li>
              <li>
                <strong>Ya salió del almacén: 4.</strong> Un vale ya se llevó 4 a la obra. Ya no están en el almacén.
              </li>
              <li>
                <strong>Falta por sacar: 6.</strong> Esto es lo que tiene que haber en el almacén.
              </li>
              <li>
                <strong>Stock disponible: 5 → Faltan 1.</strong> Con lo que hay no alcanza; hay que comprar o traer 1.
              </li>
            </ul>
          </div>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Ya salió del almacén</strong> se toma de lo anotado como entregado en la oferta o, si es mayor, de los
              vales de salida del cliente (menos lo devuelto). Cuando lo dicen los vales verás la marca{" "}
              <span className="rounded bg-sky-100 px-1 text-[11px] font-medium text-sky-800">según vales</span>.
            </li>
            <li>
              <strong>Stock disponible</strong> es lo que puede salir para instalar en los almacenes marcados en «Comparar con el stock de»:
              Instaladora + Común, sin lo apartado para ventas y sin lo reservado por otras ventas.
            </li>
            <li>
              <strong>Por oferta</strong> ordena a los clientes por la fecha de su primer pago y dice a quién se le puede
              instalar ya con el stock de hoy y qué le falta a cada uno.
            </li>
            <li>
              Si un vale sacó un material distinto al de la oferta (un sustituto), la oferta lo sigue mostrando como
              pendiente: revisa esos casos a mano.
            </li>
          </ul>
          <p className="text-xs text-gray-500">Toca la ⓘ de cada columna para ver qué significa.</p>
        </div>
      )}
    </div>
  )
}

export function MaterialesComprometidosReport() {
  const { toast } = useToast()
  const [datos, setDatos] = useState<MaterialesComprometidosData | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [almacenes, setAlmacenes] = useState<string[]>([])
  const [estados, setEstados] = useState<string[]>([])
  const [incluirSinPago, setIncluirSinPago] = useState(false)
  const [tipoMaterial, setTipoMaterial] = useState("principales")
  const [soloFaltantes, setSoloFaltantes] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const [vista, setVista] = useState<Vista>("material")
  const [filtroCobertura, setFiltroCobertura] = useState<FiltroCobertura>("todas")
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set())
  const [exportando, setExportando] = useState(false)

  const cargar = async () => {
    setCargando(true)
    setError(null)
    try {
      const resultado = await MaterialesComprometidosService.obtener()
      setDatos(resultado)
      setAlmacenes((previos) => (previos.length > 0 ? previos : almacenesDeLasOfertas(resultado)))
    } catch (e: any) {
      setError(e?.message || "No se pudo cargar el reporte")
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtros = useMemo(
    () => ({ incluirSinPago, estados, tipoMaterial, almacenes }),
    [incluirSinPago, estados, tipoMaterial, almacenes],
  )

  const ofertas = useMemo(() => (datos ? filtrarOfertas(datos, filtros) : []), [datos, filtros])
  const filas = useMemo(() => (datos ? construirFilasMateriales(datos, ofertas, almacenes) : []), [datos, ofertas, almacenes])
  const cobertura = useMemo(() => (datos ? calcularCobertura(datos, ofertas, almacenes) : []), [datos, ofertas, almacenes])

  const nombreAlmacen = useMemo(() => new Map((datos?.almacenes ?? []).map((a) => [a.id, a.nombre])), [datos])

  const secciones = useMemo(() => {
    const presentes = new Set((datos?.ofertas ?? []).flatMap((o) => o.lineas.map((l) => l.seccion || "")))
    presentes.delete("")
    const orden = Object.keys(ETIQUETA_SECCION)
    return Array.from(presentes).sort((a, b) => {
      const ia = orden.indexOf(a)
      const ib = orden.indexOf(b)
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b)
    })
  }, [datos])

  const sinPago = useMemo(() => (datos ? datos.ofertas.filter((o) => !o.tiene_pago).length : 0), [datos])

  const termino = normalizeSearchText(busqueda.trim())

  const filasVisibles = useMemo(
    () =>
      filas.filter((f) => {
        if (soloFaltantes && f.diferencia >= 0) return false
        if (!termino) return true
        return normalizeSearchText(
          [f.material.codigo, f.material.nombre, f.material.descripcion, f.material.categoria].filter(Boolean).join(" "),
        ).includes(termino)
      }),
    [filas, soloFaltantes, termino],
  )

  const coberturaVisible = useMemo(
    () =>
      cobertura.filter((c) => {
        if (filtroCobertura === "completa" && c.estado === "incompleta") return false
        if (filtroCobertura === "incompleta" && c.estado !== "incompleta") return false
        if (!termino) return true
        return normalizeSearchText(
          [
            c.oferta.numero_oferta,
            c.oferta.contacto_nombre,
            c.oferta.cliente_numero,
            ...c.oferta.lineas.map((l) => l.codigo),
          ]
            .filter(Boolean)
            .join(" "),
        ).includes(termino)
      }),
    [cobertura, filtroCobertura, termino],
  )

  const kpis = useMemo(() => {
    const conPago = ofertas.filter((o) => o.tiene_pago)
    const cobrado = ofertas.reduce((s, o) => s + o.cobrado_usd, 0)
    const conFaltante = filas.filter((f) => f.diferencia < 0)
    const costo = conFaltante.reduce((s, f) => s + (f.costoFaltante ?? 0), 0)
    const sinCosto = conFaltante.filter((f) => f.costoFaltante === null).length
    const completas = cobertura.filter((c) => c.estado === "completa").length
    const yaSalio = cobertura.filter((c) => c.estado === "nada_pendiente").length
    const masAntigua = conPago.reduce<string | null>(
      (min, o) => (o.fecha_primer_pago && (!min || o.fecha_primer_pago < min) ? o.fecha_primer_pago : min),
      null,
    )
    return { ofertas: ofertas.length, cobrado, conFaltante: conFaltante.length, costo, sinCosto, completas, yaSalio, masAntigua }
  }, [ofertas, filas, cobertura])

  const toggle = <T,>(lista: T[], valor: T) => (lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor])

  const toggleAbierto = (clave: string) =>
    setAbiertos((prev) => {
      const siguiente = new Set(prev)
      if (siguiente.has(clave)) siguiente.delete(clave)
      else siguiente.add(clave)
      return siguiente
    })

  const exportar = async () => {
    if (!datos || filas.length === 0) {
      toast({ title: "Sin datos", description: "No hay materiales que exportar con estos filtros." })
      return
    }
    setExportando(true)
    try {
      await ExportMaterialesComprometidosExcelService.exportar(filasVisibles, cobertura, {
        almacenes: almacenes.map((id) => nombreAlmacen.get(id) || id),
        estados: estados.length ? estados : datos.estados_sin_instalar,
        incluirSinPago,
        tipoMaterial: tipoMaterial === "todos" ? "Todos" : tipoMaterial === "principales" ? "Equipos principales" : etiquetaSeccion(tipoMaterial),
        generadoEn: datos.generado_en,
        nombreAlmacen: (id) => nombreAlmacen.get(id) || id,
      })
      toast({ title: "Excel generado", description: "Se descargó el reporte de materiales comprometidos." })
    } catch (e) {
      console.error("Error exportando materiales comprometidos:", e)
      toast({ title: "Error", description: "No se pudo generar el Excel", variant: "destructive" })
    } finally {
      setExportando(false)
    }
  }

  if (!datos) {
    return (
      <div className="space-y-4">
        {error ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-red-800">{error}</p>
              <Button variant="outline" size="sm" onClick={cargar}>
                Reintentar
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white/60 p-10 text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            Calculando lo comprometido…
          </div>
        )}
      </div>
    )
  }

  const hayAlmacenes = almacenes.length > 0

  return (
    <div className="space-y-6">
      <GuiaDeLectura estados={datos.estados_sin_instalar} />

      {/* Filtros */}
      <Card className="border-l-4 border-l-emerald-600">
        <CardContent className="space-y-4 p-4">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <Label>Comparar con el stock de</Label>
              <div className="flex gap-3 whitespace-nowrap text-xs">
                <button type="button" className="text-emerald-700 hover:underline" onClick={() => setAlmacenes(datos.almacenes.map((a) => a.id))}>
                  Todos
                </button>
                <button type="button" className="text-emerald-700 hover:underline" onClick={() => setAlmacenes(almacenesDeLasOfertas(datos))}>
                  Los de las ofertas
                </button>
                <button type="button" className="text-gray-500 hover:underline" onClick={() => setAlmacenes([])}>
                  Ninguno
                </button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {datos.almacenes.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  aria-pressed={almacenes.includes(a.id)}
                  onClick={() => setAlmacenes((prev) => toggle(prev, a.id))}
                  className={chip(almacenes.includes(a.id))}
                >
                  {a.nombre}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Label>Estado del cliente</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" aria-pressed={estados.length === 0} onClick={() => setEstados([])} className={chip(estados.length === 0)}>
                  Todos
                </button>
                {datos.estados_sin_instalar.map((estado) => (
                  <button
                    key={estado}
                    type="button"
                    aria-pressed={estados.includes(estado)}
                    onClick={() => setEstados((prev) => toggle(prev, estado))}
                    className={chip(estados.includes(estado))}
                  >
                    {estado}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <Switch checked={incluirSinPago} onCheckedChange={setIncluirSinPago} />
              Incluir confirmadas sin pago ({sinPago})
            </label>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="md:w-56">
              <Label>Tipo de material</Label>
              <Select value={tipoMaterial} onValueChange={setTipoMaterial}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="principales">Equipos principales</SelectItem>
                  {secciones.map((s) => (
                    <SelectItem key={s} value={s}>
                      {etiquetaSeccion(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label htmlFor="busqueda-comprometidos">Buscar</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="busqueda-comprometidos"
                  placeholder={vista === "material" ? "Código o nombre del material…" : "Cliente, nº de oferta, código…"}
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={cargar} disabled={cargando} className="gap-2" title="Volver a calcular">
                <RefreshCw className={cn("h-4 w-4", cargando && "animate-spin")} />
                <span className="hidden sm:inline">Actualizar</span>
              </Button>
              <Button variant="outline" onClick={exportar} disabled={exportando} className="gap-2">
                {exportando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <p className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {error}. Se muestran los datos anteriores.
        </p>
      )}

      {/* Totales */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 [&>*]:min-w-0">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Ofertas comprometidas</p>
            <p className="mt-1 break-words text-xl font-semibold tabular-nums sm:text-2xl text-gray-900">{kpis.ofertas}</p>
            <p className="mt-1 text-xs text-gray-600">
              {formatearMoneda(kpis.cobrado)} cobrado
              {kpis.masAntigua && <> · la más antigua pagó hace {diasDesde(kpis.masAntigua)} d</>}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Se pueden instalar ya</p>
            <p className="mt-1 break-words text-xl font-semibold tabular-nums sm:text-2xl text-gray-900">
              {hayAlmacenes ? kpis.completas : "—"}
              {hayAlmacenes && <span className="text-base font-normal text-gray-500"> de {kpis.ofertas - kpis.yaSalio}</span>}
            </p>
            <p className="mt-1 text-xs text-gray-600">
              Con el stock elegido, por orden de pago
              {kpis.yaSalio > 0 && <> · {kpis.yaSalio} ya sacaron todo</>}
              {tipoMaterial === "todos" && (
                <>
                  {" · "}
                  <button type="button" className="text-emerald-700 hover:underline" onClick={() => setTipoMaterial("principales")}>
                    ver solo equipos principales
                  </button>
                </>
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Materiales que faltan</p>
            <p className={cn("mt-1 break-words text-xl font-semibold tabular-nums sm:text-2xl", kpis.conFaltante > 0 ? "text-red-700" : "text-gray-900")}>
              {hayAlmacenes ? kpis.conFaltante : "—"}
              {hayAlmacenes && <span className="text-base font-normal text-gray-500"> de {filas.length}</span>}
            </p>
            <p className="mt-1 text-xs text-gray-600">Lo que falta por sacar supera el stock disponible</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Costo de reponer</p>
            <p className="mt-1 break-words text-xl font-semibold tabular-nums sm:text-2xl text-gray-900">{hayAlmacenes ? formatearMoneda(kpis.costo) : "—"}</p>
            <p className="mt-1 text-xs text-gray-600">
              Comprar lo que falta, al costo del kárdex
              {kpis.sinCosto > 0 && <> · {kpis.sinCosto} sin costo conocido</>}
            </p>
          </CardContent>
        </Card>
      </div>

      {!hayAlmacenes && (
        <p className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
          Elige al menos un almacén para ver la diferencia con el stock y qué instalaciones se pueden hacer.
        </p>
      )}

      {/* Vistas */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
          {(
            [
              ["material", "Por material"],
              ["oferta", "Por oferta"],
            ] as const
          ).map(([valor, etiqueta]) => (
            <button
              key={valor}
              type="button"
              aria-pressed={vista === valor}
              onClick={() => setVista(valor)}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium",
                vista === valor ? "bg-emerald-600 text-white" : "text-gray-700 hover:bg-gray-50",
              )}
            >
              {etiqueta}
            </button>
          ))}
        </div>
        {vista === "material" ? (
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <Switch checked={soloFaltantes} onCheckedChange={setSoloFaltantes} />
            Solo los que faltan
          </label>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["todas", "Todas"],
                ["completa", "Se pueden instalar"],
                ["incompleta", "Les falta material"],
              ] as const
            ).map(([valor, etiqueta]) => (
              <button
                key={valor}
                type="button"
                aria-pressed={filtroCobertura === valor}
                onClick={() => setFiltroCobertura(valor)}
                className={chip(filtroCobertura === valor)}
              >
                {etiqueta}
              </button>
            ))}
          </div>
        )}
      </div>

      {vista === "material" ? (
        <TablaMateriales
          filas={filasVisibles}
          abiertos={abiertos}
          onToggle={toggleAbierto}
          almacenesElegidos={almacenes}
          nombreAlmacen={nombreAlmacen}
          hayAlmacenes={hayAlmacenes}
        />
      ) : (
        <TablaOfertas cobertura={coberturaVisible} hayAlmacenes={hayAlmacenes} nombreAlmacen={nombreAlmacen} />
      )}

      <p className="text-xs text-gray-400">
Calculado el {formatearFecha(datos.generado_en)} a las {datos.generado_en.slice(11, 16)}. «Actualizar» vuelve a calcular.
      </p>
    </div>
  )
}

function TablaMateriales({
  filas,
  abiertos,
  onToggle,
  almacenesElegidos,
  nombreAlmacen,
  hayAlmacenes,
}: {
  filas: FilaMaterialComprometido[]
  abiertos: Set<string>
  onToggle: (clave: string) => void
  almacenesElegidos: string[]
  nombreAlmacen: Map<string, string>
  hayAlmacenes: boolean
}) {
  if (filas.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-gray-600">No hay materiales con estos filtros.</CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-3 py-2 font-medium">Material</th>
                <Cabecera texto="Ofertas" ayuda="Cuántas ofertas comprometidas llevan este material." />
                <Cabecera
                  texto="En las ofertas"
                  ayuda="Suma de lo que piden las ofertas comprometidas, incluido lo que ya salió del almacén."
                />
                <Cabecera
                  texto="Ya salió del almacén"
                  ayuda="Lo que ya se llevaron a las obras. Sale de lo anotado como entregado en la oferta o, si es mayor, de los vales de salida del cliente menos lo devuelto."
                />
                <Cabecera
                  texto="Falta por sacar"
                  ayuda="En las ofertas − ya salió. Es lo que todavía tiene que haber en el almacén para terminar esas instalaciones."
                />
                <Cabecera
                  texto="Stock disponible"
                  ayuda="Lo que puede salir para instalar en los almacenes marcados: Instaladora + Común, sin lo apartado para ventas. Si hay reservas activas de otras ventas se indican debajo y se descuentan."
                />
                <Cabecera
                  texto="Sobra / Falta"
                  ayuda="Stock disponible − reservado por otras ventas − falta por sacar. «Faltan» es lo que hay que comprar o traer de otro almacén."
                />
                <Cabecera
                  texto="En compras"
                  ayuda="Unidades en compras que aún no han entrado al almacén (solicitadas, enviadas o arribadas). Debajo, si alcanzan para cubrir lo que falta."
                />
                <Cabecera
                  texto="Costo de lo que falta"
                  ayuda="Faltante × costo unitario del kárdex (o del catálogo si el kárdex no lo tiene). No descuenta las compras en curso."
                />
                <Cabecera
                  texto="Espera"
                  ayuda="Días desde el primer pago del cliente que lleva más tiempo esperando este material. En rojo, más de 60 días."
                />
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => {
                const abierto = abiertos.has(f.material.clave)
                const falta = f.diferencia < 0
                return (
                  <Fragment key={f.material.clave}>
                    <tr
                      className={cn("cursor-pointer border-b border-gray-100 align-top hover:bg-gray-50", abierto && "bg-gray-50")}
                      onClick={() => onToggle(f.material.clave)}
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-start gap-1">
                          {abierto ? (
                            <ChevronDown className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500" />
                          ) : (
                            <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500" />
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{f.material.codigo}</p>
                            <p className="text-xs text-gray-600">{nombreMaterial(f.material)}</p>
                            <p className="text-[11px] text-gray-400">
                              {etiquetaSeccion(f.material.seccion)}
                              {!f.material.en_catalogo && <span className="ml-1 text-amber-700">· no está en el catálogo</span>}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{f.ofertas.length}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatearCantidad(f.comprometido)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-600">
                        {f.salido ? formatearCantidad(f.salido) : <span className="text-gray-300">–</span>}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatearCantidad(f.pendiente)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {hayAlmacenes ? formatearCantidad(f.stock) : "—"}
                        {f.reservadoOtros > 0 && (
                          <p className="text-[11px] text-gray-500">{formatearCantidad(f.reservadoOtros)} reservado por otras ventas</p>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {hayAlmacenes ? <SobraFalta valor={f.diferencia} /> : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {f.enCamino ? (
                          <>
                            {formatearCantidad(f.enCamino)}
                            {hayAlmacenes && falta && (
                              <p className={cn("text-[11px]", f.faltanteNeto > 0 ? "text-red-600" : "text-emerald-700")}>
                                {f.faltanteNeto > 0 ? `y aún faltarían ${formatearCantidad(f.faltanteNeto)}` : "cubren lo que falta"}
                              </p>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-300">–</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {!hayAlmacenes || !falta ? (
                          <span className="text-gray-300">–</span>
                        ) : f.costoFaltante === null ? (
                          <span className="text-xs text-gray-500">sin costo</span>
                        ) : (
                          formatearMoneda(f.costoFaltante)
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Dias iso={f.primerPago} />
                      </td>
                    </tr>
                    {abierto && (
                      <tr className="border-b bg-gray-50/60">
                        <td colSpan={10} className="px-4 pb-4 pt-1">
                          <DetalleMaterial fila={f} almacenesElegidos={almacenesElegidos} nombreAlmacen={nombreAlmacen} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function DetalleMaterial({
  fila,
  almacenesElegidos,
  nombreAlmacen,
}: {
  fila: FilaMaterialComprometido
  almacenesElegidos: string[]
  nombreAlmacen: Map<string, string>
}) {
  const m = fila.material
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-600">
        {m.costo_unitario !== null && (
          <span>
            Costo: {formatearMoneda(m.costo_unitario)} {m.costo_fuente === "catalogo" && "(del catálogo)"}
          </span>
        )}
        {m.precio_catalogo !== null && <span>Precio catálogo: {formatearMoneda(m.precio_catalogo)}</span>}
        <span>Valor de venta de lo pendiente: {formatearMoneda(fila.valorPendiente)}</span>
        {m.stockaje_minimo ? <span>Stock mínimo: {formatearCantidad(m.stockaje_minimo)}</span> : null}
      </div>

      <div>
        <p className="mb-1 text-xs font-medium text-gray-700">Dónde hay (Instaladora + Común)</p>
        {fila.stockPorAlmacen.length === 0 ? (
          <p className="text-xs text-gray-500">En ningún almacén.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {fila.stockPorAlmacen.map((s) => (
              <span
                key={s.almacen_id}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-xs",
                  almacenesElegidos.includes(s.almacen_id)
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : "border-gray-200 bg-white text-gray-700",
                )}
              >
                {nombreAlmacen.get(s.almacen_id) || s.almacen_id}: <strong className="tabular-nums">{formatearCantidad(s.disponible)}</strong>
              </span>
            ))}
          </div>
        )}
      </div>

      {fila.compras.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-gray-700">Compras en curso</p>
          <ul className="space-y-0.5 text-xs text-gray-700">
            {fila.compras.map((c) => (
              <li key={c.compra_id}>
                {formatearCantidad(c.cantidad)} · {c.compra_nombre || "Compra"} · {c.estado}
                {c.fecha_llegada_aproximada && <> · llega ~{formatearFecha(c.fecha_llegada_aproximada)}</>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="px-3 py-2 font-medium">Nº oferta</th>
              <th className="px-3 py-2 font-medium">Cliente</th>
              <th className="px-3 py-2 font-medium">Estado</th>
              <th className="px-3 py-2 font-medium">Primer pago</th>
              <th className="px-3 py-2 text-right font-medium">Cobrado</th>
              <th className="px-3 py-2 text-right font-medium">En la oferta</th>
              <th className="px-3 py-2 text-right font-medium">Ya salió</th>
              <th className="px-3 py-2 text-right font-medium">Falta por sacar</th>
            </tr>
          </thead>
          <tbody>
            {fila.ofertas.map(({ oferta, cantidad, salido, pendiente, segunVales }) => (
              <tr key={oferta.oferta_id} className="border-t border-gray-100 align-top">
                <td className="px-3 py-2 font-medium whitespace-nowrap text-gray-900">
                  {oferta.numero_oferta || "—"}
                  {!oferta.tiene_pago && (
                    <span className="ml-1 rounded bg-gray-100 px-1 text-[10px] font-medium text-gray-600">sin pago</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <Contacto oferta={oferta} />
                </td>
                <td className="px-3 py-2">
                  <EstadoPill estado={oferta.estado} />
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                  {formatearFecha(oferta.fecha_primer_pago)} <Dias iso={oferta.fecha_primer_pago} />
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{formatearMoneda(oferta.cobrado_usd)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatearCantidad(cantidad)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                  {salido ? formatearCantidad(salido) : <span className="text-gray-300">–</span>}
                  {segunVales && (
                    <span
                      className="ml-1 whitespace-nowrap rounded bg-sky-100 px-1 text-[10px] font-medium text-sky-800"
                      title="La oferta no lo tiene anotado como entregado; lo dicen los vales de salida del cliente"
                    >
                      según vales
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">
                  {pendiente ? formatearCantidad(pendiente) : <span className="font-normal text-gray-400">salió todo</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TablaOfertas({
  cobertura,
  hayAlmacenes,
  nombreAlmacen,
}: {
  cobertura: CoberturaOferta[]
  hayAlmacenes: boolean
  nombreAlmacen: Map<string, string>
}) {
  if (cobertura.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-gray-600">No hay ofertas con estos filtros.</CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Cola por orden de pago</CardTitle>
        <p className="text-sm text-gray-600">
          Se recorren de quien pagó primero a quien pagó último. A cada oferta se le aparta el stock solo si alcanza para todo
          lo que le falta por salir; si no alcanza, no bloquea a las siguientes.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-y bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-3 py-2 text-right font-medium">#</th>
                <th className="px-3 py-2 font-medium">Oferta</th>
                <th className="px-3 py-2 font-medium">Cliente</th>
                <th className="px-3 py-2 font-medium">Estado</th>
                <th className="px-3 py-2 text-right font-medium">Espera</th>
                <th className="px-3 py-2 text-right font-medium">Cobrado</th>
                <th className="px-3 py-2 font-medium">Material</th>
              </tr>
            </thead>
            <tbody>
              {cobertura.map((c) => {
                const o = c.oferta
                return (
                  <tr key={o.oferta_id} className="border-b border-gray-100 align-top">
                    <td className="px-3 py-2 text-right tabular-nums text-gray-500">{c.turno}</td>
                    <td className="px-3 py-2">
                      <p className="font-medium whitespace-nowrap text-gray-900">
                        {o.numero_oferta || "—"}
                        {!o.tiene_pago && (
                          <span className="ml-1 rounded bg-gray-100 px-1 text-[10px] font-medium text-gray-600">sin pago</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">{o.nombre_oferta}</p>
                      {o.almacen_id && <p className="text-[11px] text-gray-400">{nombreAlmacen.get(o.almacen_id) || ""}</p>}
                    </td>
                    <td className="px-3 py-2">
                      <Contacto oferta={o} />
                    </td>
                    <td className="px-3 py-2">
                      <EstadoPill estado={o.estado} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Dias iso={o.fecha_primer_pago} />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                      {formatearMoneda(o.cobrado_usd)}
                      {o.precio_final ? <p className="text-[11px] text-gray-500">de {formatearMoneda(o.precio_final)}</p> : null}
                    </td>
                    <td className="px-3 py-2">
                      {c.estado === "nada_pendiente" ? (
                        <span className="text-xs text-gray-500">Ya salió todo del almacén</span>
                      ) : !hayAlmacenes ? (
                        <span className="text-xs text-gray-500">{c.lineasPendientes} materiales por sacar</span>
                      ) : c.estado === "completa" ? (
                        <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                          Se puede instalar: hay todo ({c.lineasPendientes} materiales)
                        </span>
                      ) : (
                        <div className="space-y-1">
                          <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800">
                            Faltan {c.faltan.length} de {c.lineasPendientes} materiales
                          </span>
                          <ul className="text-xs text-gray-700">
                            {c.faltan.slice(0, 4).map((f) => (
                              <li key={f.material.clave}>
                                <span className="font-medium tabular-nums">{formatearCantidad(f.falta)}</span>
                                {f.falta !== f.pendiente && (
                                  <span className="text-gray-400"> de {formatearCantidad(f.pendiente)}</span>
                                )}{" "}
                                × {f.material.codigo} <span className="text-gray-500">{nombreMaterial(f.material)}</span>
                              </li>
                            ))}
                            {c.faltan.length > 4 && <li className="text-gray-500">y {c.faltan.length - 4} más</li>}
                          </ul>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
