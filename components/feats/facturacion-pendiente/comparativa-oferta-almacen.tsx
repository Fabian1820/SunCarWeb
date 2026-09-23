"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { AlertCircle, ChevronDown, ChevronRight, Loader2, Search, Wrench, X } from "lucide-react"
import {
  FacturacionPendienteService,
  type ClientePorFacturar,
  type ComparativaCliente,
  type EstadoComparacion,
  type MaterialComparado,
} from "@/lib/services/feats/facturacion-pendiente/facturacion-pendiente-service"
import { ESTADO_COMPARACION, ESTADO_FACTURACION, formatCantidad, formatFecha, formatMoney } from "./formato"

interface ComparativaOfertaAlmacenProps {
  /** Cliente elegido desde la lista de Por facturar. */
  clienteNumero: string | null
  onClienteChange: (numero: string | null) => void
}

type Filtro = "todos" | Exclude<EstadoComparacion, "no_ofertado">

export function ComparativaOfertaAlmacen({ clienteNumero, onClienteChange }: ComparativaOfertaAlmacenProps) {
  const [busqueda, setBusqueda] = useState("")
  const [resultados, setResultados] = useState<ClientePorFacturar[]>([])
  const [buscando, setBuscando] = useState(false)
  const [datos, setDatos] = useState<ComparativaCliente | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ofertasElegidas, setOfertasElegidas] = useState<string[]>([])
  const [filtro, setFiltro] = useState<Filtro>("todos")
  const [verNoOfertados, setVerNoOfertados] = useState(false)
  const [abierto, setAbierto] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Buscador de clientes instalados (incluye históricos y ya facturados).
  useEffect(() => {
    const q = busqueda.trim()
    if (q.length < 2) {
      setResultados([])
      return
    }
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      setBuscando(true)
      try {
        const r = await FacturacionPendienteService.listar(
          { q, vista: "todos", solo_pendientes: false, limit: 10 },
          ctrl.signal,
        )
        setResultados(r.data)
      } catch {
        if (!ctrl.signal.aborted) setResultados([])
      } finally {
        if (!ctrl.signal.aborted) setBuscando(false)
      }
    }, 300)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [busqueda])

  const cargar = useCallback(async (numero: string, ofertas: string[]) => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setCargando(true)
    setError(null)
    try {
      const r = await FacturacionPendienteService.comparativa(numero, ofertas, ctrl.signal)
      if (!ctrl.signal.aborted) setDatos(r)
    } catch (e) {
      if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : "No se pudo cargar la comparación")
    } finally {
      if (!ctrl.signal.aborted) setCargando(false)
    }
  }, [])

  useEffect(() => {
    setOfertasElegidas([])
    setFiltro("todos")
    setAbierto(null)
    if (clienteNumero) cargar(clienteNumero, [])
    else setDatos(null)
  }, [clienteNumero, cargar])

  const alternarOferta = (id: string) => {
    if (!clienteNumero) return
    const siguiente = ofertasElegidas.includes(id) ? ofertasElegidas.filter((x) => x !== id) : [...ofertasElegidas, id]
    setOfertasElegidas(siguiente)
    cargar(clienteNumero, siguiente)
  }

  const ofertados = useMemo(
    () => (datos?.materiales ?? []).filter((m) => m.estado !== "no_ofertado"),
    [datos],
  )
  const noOfertados = useMemo(
    () => (datos?.materiales ?? []).filter((m) => m.estado === "no_ofertado"),
    [datos],
  )
  const visibles = filtro === "todos" ? ofertados : ofertados.filter((m) => m.estado === filtro)
  const valorNoOfertado = noOfertados.reduce((s, m) => s + m.valor_salido, 0)

  return (
    <div className="space-y-4">
      {/* Cliente */}
      <div className="bg-white rounded-lg border border-emerald-100 shadow-sm p-4">
        {clienteNumero && datos ? (
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <p className="font-semibold text-gray-900">{datos.cliente_nombre}</p>
              <p className="text-xs text-gray-500">
                {datos.cliente_numero} · {datos.vales} vales de salida
              </p>
            </div>
            <Button variant="ghost" size="sm" className="ml-auto gap-1" onClick={() => onClienteChange(null)}>
              <X className="h-4 w-4" />
              Cambiar cliente
            </Button>
          </div>
        ) : (
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar cliente instalado por nombre o número..."
              className="pl-9"
            />
            {buscando && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />}
            {resultados.length > 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-md border bg-white shadow-lg max-h-72 overflow-y-auto">
                {resultados.map((c) => (
                  <button
                    key={c.cliente_numero}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-emerald-50"
                    onClick={() => {
                      setBusqueda("")
                      setResultados([])
                      onClienteChange(c.cliente_numero)
                    }}
                  >
                    <span className="font-medium">{c.cliente_nombre}</span>
                    <span className="text-xs text-gray-500"> · {c.cliente_numero} · {c.ofertas.length} ofertas</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {!clienteNumero && (
          <p className="mt-2 text-xs text-gray-500">
            Compara lo que se le ofertó al cliente en sus ofertas confirmadas con lo que salió del almacén: sus vales y,
            de antes del sistema de vales, las entregas anotadas en la oferta y las facturas hechas a mano (descontando
            devoluciones).
          </p>
        )}
      </div>

      {cargando && !datos && (
        <div className="flex items-center justify-center py-10 text-sm text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin mr-2 text-emerald-600" />
          Comparando...
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {datos && clienteNumero && (
        <>
          {/* Ofertas a comparar */}
          <div className="bg-white rounded-lg border border-emerald-100 shadow-sm p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-gray-600">Comparar con:</span>
              {datos.ofertas.map((o) => {
                const activa = ofertasElegidas.length === 0 || ofertasElegidas.includes(o.oferta_id)
                return (
                  <button
                    key={o.oferta_id}
                    onClick={() => alternarOferta(o.oferta_id)}
                    className={`rounded-full border px-2.5 py-1 transition-colors ${
                      activa ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-gray-200 text-gray-400"
                    }`}
                    title={ESTADO_FACTURACION[o.estado_facturacion].label}
                  >
                    {o.numero_oferta}
                    <span className="ml-1 opacity-70">· {ESTADO_FACTURACION[o.estado_facturacion].label.toLowerCase()}</span>
                  </button>
                )
              })}
              {ofertasElegidas.length > 0 && (
                <button className="text-emerald-700 underline" onClick={() => { setOfertasElegidas([]); cargar(clienteNumero, []) }}>
                  Todas
                </button>
              )}
              {cargando && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-center">
              {(["ok", "falta", "exceso", "no_ofertado"] as EstadoComparacion[]).map((e) => (
                <div key={e} className={`rounded-md border px-2 py-2 ${ESTADO_COMPARACION[e].className}`}>
                  <div className="text-lg font-semibold">{datos.resumen[e]}</div>
                  <div className="text-[11px]">{ESTADO_COMPARACION[e].label}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-600">
              Ofertado <strong>{formatMoney(datos.total_ofertado)}</strong> · Salido del almacén, valorado{" "}
              <strong>{formatMoney(datos.total_salido)}</strong> (precio de la oferta; si no está ofertado, del catálogo).
              Lo salido suma los vales y lo de antes del sistema de vales (entregas anotadas en la oferta y facturas
              hechas a mano), menos lo devuelto.
            </p>
          </div>

          {/* Materiales ofertados */}
          <div className="bg-white rounded-lg border border-emerald-100 shadow-sm p-4">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Materiales ofertados</h3>
              <div className="ml-auto flex gap-1 text-xs">
                {(["todos", "falta", "exceso", "ok"] as Filtro[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFiltro(f)}
                    className={`rounded-md px-2 py-1 ${filtro === f ? "bg-emerald-600 text-white" : "text-gray-600 hover:bg-emerald-50"}`}
                  >
                    {f === "todos" ? "Todos" : ESTADO_COMPARACION[f].label}
                  </button>
                ))}
              </div>
            </div>
            <TablaMateriales materiales={visibles} abierto={abierto} onAbrir={setAbierto} />
          </div>

          {/* No ofertados */}
          <div className="bg-white rounded-lg border border-emerald-100 shadow-sm p-4">
            <button className="flex w-full items-center gap-2 text-left" onClick={() => setVerNoOfertados((v) => !v)}>
              {verNoOfertados ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <h3 className="text-sm font-semibold text-gray-900">Salió sin estar en la oferta ({noOfertados.length})</h3>
              <span className="ml-auto text-xs text-gray-600">{formatMoney(valorNoOfertado)} a precio de catálogo</span>
            </button>
            <p className="mt-1 pl-6 text-xs text-gray-500">
              Suelen ser consumibles de la instalación (bridas, anclajes, cable) que la oferta no detalla uno a uno.
            </p>
            {verNoOfertados && (
              <div className="mt-3">
                <TablaMateriales materiales={noOfertados} abierto={abierto} onAbrir={setAbierto} />
              </div>
            )}
          </div>

          {/* Servicios */}
          {datos.servicios.length > 0 && (
            <div className="bg-white rounded-lg border border-emerald-100 shadow-sm p-4">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                <Wrench className="h-4 w-4" />
                Servicios vendidos (sin salida de almacén)
              </h3>
              <ul className="mt-2 space-y-1.5 text-xs text-gray-700">
                {datos.servicios.map((s) => (
                  <li key={s.id}>
                    <strong>{s.descripcion}</strong> · {formatMoney(s.precio_total)} · {s.facturado ? "facturado" : s.estado}
                    {s.lineas.length > 0 && (
                      <span className="text-gray-500"> — {s.lineas.map((l) => `${l.concepto} ${formatMoney(l.monto)}`).join(", ")}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function TablaMateriales({
  materiales,
  abierto,
  onAbrir,
}: {
  materiales: MaterialComparado[]
  abierto: string | null
  onAbrir: (clave: string | null) => void
}) {
  if (materiales.length === 0) {
    return <p className="py-4 text-center text-sm text-gray-500">No hay materiales en este apartado.</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="py-2 pr-2 font-medium">Material</th>
            <th className="py-2 px-2 font-medium text-right">Ofertado</th>
            <th className="py-2 px-2 font-medium text-right">Salió en vales</th>
            <th className="py-2 px-2 font-medium text-right" title="Entregas anotadas en la oferta o facturas hechas a mano, de antes del sistema de vales">
              Antes de los vales
            </th>
            <th className="py-2 px-2 font-medium text-right">Devuelto</th>
            <th className="py-2 px-2 font-medium text-right">Diferencia</th>
            <th className="py-2 pl-2 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody>
          {materiales.map((m) => {
            const clave = `${m.material_id ?? ""}|${m.codigo}`
            const estado = ESTADO_COMPARACION[m.estado]
            const expandido = abierto === clave
            return (
              <FilaMaterial key={clave} m={m} estado={estado} expandido={expandido} onToggle={() => onAbrir(expandido ? null : clave)} />
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function FilaMaterial({
  m,
  estado,
  expandido,
  onToggle,
}: {
  m: MaterialComparado
  estado: { label: string; className: string }
  expandido: boolean
  onToggle: () => void
}) {
  return (
    <>
      <tr className="border-b last:border-0 cursor-pointer hover:bg-gray-50" onClick={onToggle}>
        <td className="py-2 pr-2">
          <div className="font-medium text-gray-900">{m.nombre}</div>
          <div className="text-gray-500">{m.codigo}{m.um ? ` · ${m.um}` : ""}</div>
        </td>
        <td className="py-2 px-2 text-right">{formatCantidad(m.ofertado)}</td>
        <td className="py-2 px-2 text-right">{formatCantidad(m.salido)}</td>
        <td className="py-2 px-2 text-right">{m.antes_de_vales ? formatCantidad(m.antes_de_vales) : "—"}</td>
        <td className="py-2 px-2 text-right">{m.devuelto ? formatCantidad(m.devuelto) : "—"}</td>
        <td className={`py-2 px-2 text-right font-medium ${m.diferencia < 0 ? "text-amber-700" : m.diferencia > 0 ? "text-rose-700" : "text-gray-500"}`}>
          {m.diferencia > 0 ? "+" : ""}
          {formatCantidad(m.diferencia)}
        </td>
        <td className="py-2 pl-2">
          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${estado.className}`}>{estado.label}</span>
        </td>
      </tr>
      {expandido && (
        <tr className="bg-gray-50">
          <td colSpan={7} className="px-3 py-2">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="font-medium text-gray-700">En las ofertas</p>
                {m.por_oferta.length === 0 ? (
                  <p className="text-gray-500">No aparece en ninguna oferta comparada.</p>
                ) : (
                  <ul className="text-gray-600">
                    {m.por_oferta.map((o, i) => (
                      <li key={i}>{o.numero_oferta}: {formatCantidad(o.cantidad)}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="font-medium text-gray-700">En los vales</p>
                {m.por_vale.length === 0 ? (
                  <p className="text-gray-500">Ningún vale.</p>
                ) : (
                  <ul className="text-gray-600">
                    {m.por_vale.map((v, i) => (
                      <li key={i}>
                        {v.codigo_vale} · {formatFecha(v.fecha)}: {formatCantidad(v.cantidad)}
                        {v.facturado ? " · facturado" : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="font-medium text-gray-700">Antes de los vales</p>
                {m.previo.length === 0 ? (
                  <p className="text-gray-500">Nada.</p>
                ) : (
                  <>
                    <ul className="text-gray-600">
                      {m.previo.map((p, i) => (
                        <li key={i}>
                          {p.origen === "entregado_sin_vale" ? "Entrega anotada en " : "Factura manual "}
                          {p.referencia} · {formatFecha(p.fecha)}: {formatCantidad(p.cantidad)}
                          {p.descripcion && p.descripcion.toLowerCase() !== (m.nombre || "").toLowerCase() && (
                            <span className="text-gray-400"> ({p.descripcion})</span>
                          )}
                        </li>
                      ))}
                    </ul>
                    {m.entregado_sin_vale > 0 && m.facturado_sin_vale > 0 && (
                      <p className="mt-1 text-gray-500">Si las dos hablan de lo mismo, cuenta la mayor, no la suma.</p>
                    )}
                  </>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
