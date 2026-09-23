"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, ArrowLeft, ArrowRight, Loader2, Minus, Plus, Search, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Textarea } from "@/components/shared/molecule/textarea"
import { Button } from "@/components/shared/atom/button"
import { Badge } from "@/components/shared/atom/badge"
import { useToast } from "@/hooks/use-toast"
import type { CapacidadEquipos, EquipoCliente } from "@/lib/api-types"
import { ClienteService } from "@/lib/services/feats/customer/cliente-service"
import {
  EquiposClienteService,
  type LineaTraspasoPedido,
} from "@/lib/services/feats/customer/equipos-cliente-service"
import { CATEGORIA_EQUIPO_UI } from "./equipos-cliente-cell"
import { FotoMaterial } from "./equipo-cliente-accion-dialog"

type ClienteRef = { numero: string; nombre: string | null }

const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2))
const hoyISO = () => new Date().toISOString().slice(0, 10)
const nuevoId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `tr-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

const activos = (equipos: EquipoCliente[]) =>
  equipos
    .filter((e) => e.estado === "activo" && e.cantidad_actual > 0)
    .sort(
      (a, b) =>
        (CATEGORIA_EQUIPO_UI[a.categoria]?.orden ?? 9) - (CATEGORIA_EQUIPO_UI[b.categoria]?.orden ?? 9) ||
        (a.nombre || a.descripcion).localeCompare(b.nombre || b.descripcion),
    )

/**
 * Misma regla que `EquipoClienteService.calcular_capacidad` del backend: los
 * accesorios (rack, kit, caja, backup, wifi) no suman, salvo lo que viene del
 * registro antiguo. Solo sirve para la vista previa; la cifra buena la
 * devuelve el backend al guardar.
 */
const ACCESORIO = /\b(KIT|CAJA\s+COMBINADORA|RACK|BACKUP|MODULO\s+DE\s+WIFI)\b/i
const sinTildes = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "")

function capacidad(lineas: Array<{ equipo: EquipoCliente; cantidad: number }>): Omit<CapacidadEquipos, "fuente"> {
  let inv = 0
  let bat = 0
  let pan = 0
  const visto = { inv: false, bat: false, pan: false }
  for (const { equipo, cantidad } of lineas) {
    if (cantidad <= 0) continue
    if (equipo.origen_inicial !== "migracion_snapshot" && ACCESORIO.test(sinTildes(equipo.nombre || equipo.descripcion)))
      continue
    if (equipo.categoria === "PANELES") {
      pan += cantidad
      visto.pan = true
    } else if (equipo.potencia_kw) {
      if (equipo.categoria === "INVERSORES") {
        inv += equipo.potencia_kw * cantidad
        visto.inv = true
      } else if (equipo.categoria === "BATERIAS") {
        bat += equipo.potencia_kw * cantidad
        visto.bat = true
      }
    }
  }
  return {
    inversor_kw: visto.inv ? Math.round(inv * 1000) / 1000 : null,
    bateria_kwh: visto.bat ? Math.round(bat * 1000) / 1000 : null,
    paneles: visto.pan ? pan : null,
  }
}

const textoCapacidad = (c: Omit<CapacidadEquipos, "fuente">) =>
  [
    c.inversor_kw != null && `${num(c.inversor_kw)} kW`,
    c.bateria_kwh != null && `${num(c.bateria_kwh)} kWh`,
    c.paneles != null && `${num(c.paneles)} paneles`,
  ]
    .filter(Boolean)
    .join(" · ") || "sin equipos"

/** Buscador del otro cliente. Desde 3 caracteres, como el de las citas. */
function BuscadorCliente({ excluir, onElegir }: { excluir: string; onElegir: (c: ClienteRef) => void }) {
  const [termino, setTermino] = useState("")
  const [resultados, setResultados] = useState<ClienteRef[]>([])
  const [buscando, setBuscando] = useState(false)
  const [buscado, setBuscado] = useState(false)

  useEffect(() => {
    const texto = termino.trim()
    if (texto.length < 3) {
      setResultados([])
      setBuscado(false)
      return
    }
    let cancelado = false
    const timer = setTimeout(async () => {
      setBuscando(true)
      try {
        const res = await ClienteService.getClientes({ q: texto, limit: 10 }).catch(() => null)
        if (cancelado) return
        setResultados(
          (res?.clients ?? [])
            .filter((c) => c.numero && c.numero !== excluir)
            .map((c) => ({ numero: c.numero, nombre: c.nombre || null })),
        )
        setBuscado(true)
      } finally {
        if (!cancelado) setBuscando(false)
      }
    }, 350)
    return () => {
      cancelado = true
      clearTimeout(timer)
    }
  }, [termino, excluir])

  return (
    <div className="space-y-2">
      <Label className="text-xs">Cliente con el que se hace el traspaso</Label>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
        <Input
          autoFocus
          className="pl-8"
          value={termino}
          onChange={(e) => setTermino(e.target.value)}
          placeholder="Nombre, número o teléfono"
        />
        {buscando && <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-gray-400" />}
      </div>
      {resultados.length > 0 && (
        <ul className="max-h-64 divide-y overflow-y-auto rounded-md border">
          {resultados.map((c) => (
            <li key={c.numero}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                onClick={() => onElegir(c)}
              >
                <span className="truncate">{c.nombre || "(sin nombre)"}</span>
                <span className="shrink-0 text-xs text-gray-500">{c.numero}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {buscado && !buscando && resultados.length === 0 && (
        <p className="text-xs text-gray-400">Ningún cliente coincide.</p>
      )}
    </div>
  )
}

/** Cuántas unidades de un equipo pasan al otro lado, de 0 a lo que tiene. */
function FilaTraspaso({
  equipo,
  cantidad,
  series,
  onCantidad,
  onSeries,
}: {
  equipo: EquipoCliente
  cantidad: number
  series: string
  onCantidad: (n: number) => void
  onSeries: (t: string) => void
}) {
  const ui = CATEGORIA_EQUIPO_UI[equipo.categoria] ?? CATEGORIA_EQUIPO_UI.OTRO
  const max = equipo.cantidad_actual
  const fijar = (n: number) => onCantidad(Math.max(0, Math.min(max, Number.isFinite(n) ? n : 0)))
  return (
    <li className={`rounded-md border p-2 ${cantidad > 0 ? "border-emerald-300 bg-emerald-50/50" : "border-gray-100 bg-white"}`}>
      <div className="flex items-center gap-2">
        <FotoMaterial url={equipo.foto} size={40} />
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm text-gray-800">{equipo.nombre || equipo.descripcion}</p>
          <p className="text-[11px] text-gray-500">
            {ui.label} · tiene {num(max)}
            {equipo.es_equipo_propio && " · propio del cliente"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button type="button" variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => fijar(cantidad - 1)} disabled={cantidad <= 0}>
            <Minus className="h-3 w-3" />
          </Button>
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            max={max}
            value={cantidad}
            onChange={(e) => fijar(parseFloat(e.target.value))}
            className="h-7 w-14 px-1 text-center text-sm"
            aria-label={`Unidades de ${equipo.nombre || equipo.descripcion} que pasan`}
          />
          <Button type="button" variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => fijar(cantidad + 1)} disabled={cantidad >= max}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>
      {cantidad > 0 && (
        <Input
          value={series}
          onChange={(e) => onSeries(e.target.value)}
          placeholder="Números de serie (opcional, separados por coma)"
          className="mt-2 h-7 text-xs"
        />
      )}
    </li>
  )
}

interface TraspasoEquiposDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cliente: ClienteRef
  /** La ficha del cliente cargado, tal como la tiene el diálogo de equipos. */
  equipos: EquipoCliente[]
  /** Tras guardar: el otro cliente, para refrescar también su fila. */
  onHecho: (otro: string) => void
}

export function TraspasoEquiposDialog({ open, onOpenChange, cliente, equipos, onHecho }: TraspasoEquiposDialogProps) {
  const { toast } = useToast()
  // Un id por formulario abierto: si la petición se repite, el backend devuelve
  // el mismo traspaso en vez de crear otro.
  const [traspasoId, setTraspasoId] = useState(nuevoId)
  const [otro, setOtro] = useState<ClienteRef | null>(null)
  const [equiposOtro, setEquiposOtro] = useState<EquipoCliente[]>([])
  const [cargandoOtro, setCargandoOtro] = useState(false)
  const [errorOtro, setErrorOtro] = useState<string | null>(null)
  const [cantidades, setCantidades] = useState<Record<string, number>>({})
  const [series, setSeries] = useState<Record<string, string>>({})
  const [nota, setNota] = useState("")
  const [autorizadoPor, setAutorizadoPor] = useState("")
  const [fecha, setFecha] = useState(hoyISO())
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (!open) return
    setTraspasoId(nuevoId())
    setOtro(null)
    setEquiposOtro([])
    setErrorOtro(null)
    setCantidades({})
    setSeries({})
    setNota("")
    setAutorizadoPor("")
    setFecha(hoyISO())
  }, [open])

  useEffect(() => {
    if (!otro) return
    let cancelado = false
    setCargandoOtro(true)
    setErrorOtro(null)
    EquiposClienteService.getEquipos(otro.numero)
      .then((v) => !cancelado && setEquiposOtro(v.equipos))
      .catch((e) => !cancelado && setErrorOtro(e instanceof Error ? e.message : String(e)))
      .finally(() => !cancelado && setCargandoOtro(false))
    return () => {
      cancelado = true
    }
  }, [otro])

  const propios = useMemo(() => activos(equipos), [equipos])
  const ajenos = useMemo(() => activos(equiposOtro), [equiposOtro])
  const clave = (desde: string, key: string) => `${desde}|${key}`

  const lineas: LineaTraspasoPedido[] = useMemo(() => {
    if (!otro) return []
    const de = (desde: string, lista: EquipoCliente[]) =>
      lista
        .map((e) => ({ e, n: cantidades[clave(desde, e.equipo_key)] ?? 0 }))
        .filter(({ n }) => n > 0)
        .map(({ e, n }) => ({
          desde,
          equipo_key: e.equipo_key,
          cantidad: n,
          numeros_serie: (series[clave(desde, e.equipo_key)] ?? "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }))
    return [...de(cliente.numero, propios), ...de(otro.numero, ajenos)]
  }, [otro, cantidades, series, cliente.numero, propios, ajenos])

  /** Lo que tendrá cada uno después, para la vista previa. */
  const despues = (numero: string, suyos: EquipoCliente[], delOtro: EquipoCliente[], otroNumero: string) => {
    const mapa = new Map<string, { equipo: EquipoCliente; cantidad: number }>()
    for (const e of suyos)
      mapa.set(e.equipo_key, { equipo: e, cantidad: e.cantidad_actual - (cantidades[clave(numero, e.equipo_key)] ?? 0) })
    for (const e of delOtro) {
      const n = cantidades[clave(otroNumero, e.equipo_key)] ?? 0
      if (n <= 0) continue
      const previo = mapa.get(e.equipo_key)
      mapa.set(e.equipo_key, { equipo: previo?.equipo ?? e, cantidad: (previo?.cantidad ?? 0) + n })
    }
    return Array.from(mapa.values())
  }

  const resumen = otro
    ? [
        { quien: cliente, antes: propios, luego: despues(cliente.numero, propios, ajenos, otro.numero) },
        { quien: otro, antes: ajenos, luego: despues(otro.numero, ajenos, propios, cliente.numero) },
      ].map(({ quien, antes, luego }) => {
        const a = capacidad(antes.map((e) => ({ equipo: e, cantidad: e.cantidad_actual })))
        const d = capacidad(luego)
        const avisos = [
          a.inversor_kw != null && d.inversor_kw == null && "se queda sin inversor",
          a.bateria_kwh != null && d.bateria_kwh == null && "se queda sin baterías",
          a.paneles != null && d.paneles == null && "se queda sin paneles",
        ].filter(Boolean) as string[]
        return { quien, antes: textoCapacidad(a), despues: textoCapacidad(d), avisos }
      })
    : []

  const seriesDeMas = lineas.find((l) => (l.numeros_serie?.length ?? 0) > l.cantidad)
  const puedeEnviar = !!otro && lineas.length > 0 && nota.trim().length >= 3 && !seriesDeMas && !enviando

  const todo = (desde: string, lista: EquipoCliente[], valor: "todo" | "nada") =>
    setCantidades((prev) => {
      const nuevo = { ...prev }
      for (const e of lista) nuevo[clave(desde, e.equipo_key)] = valor === "todo" ? e.cantidad_actual : 0
      return nuevo
    })

  const enviar = async () => {
    if (!otro || !puedeEnviar) return
    setEnviando(true)
    try {
      const traspaso = await EquiposClienteService.traspasar(cliente.numero, {
        traspaso_id: traspasoId,
        cliente_destino: otro.numero,
        lineas,
        nota: nota.trim(),
        autorizado_por: autorizadoPor.trim() || null,
        fecha_efectiva: fecha ? `${fecha}T12:00:00Z` : null,
      })
      toast({ title: `Traspaso ${traspaso.codigo} registrado`, description: `${cliente.nombre ?? cliente.numero} ⇄ ${otro.nombre ?? otro.numero}` })
      onHecho(otro.numero)
      onOpenChange(false)
    } catch (err) {
      toast({
        title: "No se registró el traspaso",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      })
    } finally {
      setEnviando(false)
    }
  }

  // Función y no componente: definido aquí dentro, un componente se montaría
  // de nuevo en cada tecla y el campo de series perdería el foco.
  const columna = (quien: ClienteRef, lista: EquipoCliente[], destino: ClienteRef) => (
    <section className="min-w-0">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-semibold text-gray-900">{quien.nombre || quien.numero}</h4>
          <p className="text-[11px] text-gray-500">
            {quien.numero} · da a {destino.nombre || destino.numero}
          </p>
        </div>
        {lista.length > 0 && (
          <div className="flex shrink-0 gap-1">
            <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => todo(quien.numero, lista, "todo")}>
              Todo
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => todo(quien.numero, lista, "nada")}>
              Nada
            </Button>
          </div>
        )}
      </div>
      {lista.length > 0 ? (
        <ul className="space-y-1.5">
          {lista.map((e) => {
            const k = clave(quien.numero, e.equipo_key)
            return (
              <FilaTraspaso
                key={k}
                equipo={e}
                cantidad={cantidades[k] ?? 0}
                series={series[k] ?? ""}
                onCantidad={(n) => setCantidades((p) => ({ ...p, [k]: n }))}
                onSeries={(t) => setSeries((p) => ({ ...p, [k]: t }))}
              />
            )
          })}
        </ul>
      ) : (
        <p className="rounded-md border border-dashed p-3 text-xs text-gray-400">Sin equipos instalados en su ficha.</p>
      )}
    </section>
  )

  return (
    <Dialog open={open} onOpenChange={(o) => !enviando && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Traspaso / intercambio de equipos</DialogTitle>
          <DialogDescription>
            Marca en cada lado cuántas unidades pasan al otro cliente. Un solo lado es un traspaso; los dos, un
            intercambio. Lo entregado viaja con cada unidad y todo queda en el historial de los dos.
          </DialogDescription>
        </DialogHeader>

        {!otro ? (
          <BuscadorCliente excluir={cliente.numero} onElegir={setOtro} />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 rounded-md bg-gray-50 px-3 py-2 text-sm">
              <span className="min-w-0 truncate">
                <span className="font-medium">{cliente.nombre || cliente.numero}</span>
                <span className="mx-2 text-gray-400">⇄</span>
                <span className="font-medium">{otro.nombre || otro.numero}</span>
              </span>
              <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0 text-xs" onClick={() => { setOtro(null); setCantidades({}); setSeries({}) }}>
                <X className="mr-1 h-3 w-3" />
                Cambiar cliente
              </Button>
            </div>

            {cargandoOtro ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando equipos de {otro.nombre || otro.numero}…
              </div>
            ) : errorOtro ? (
              <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span className="break-words">{errorOtro}</span>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {columna(cliente, propios, otro)}
                {columna(otro, ajenos, cliente)}
              </div>
            )}

            {lineas.length > 0 && (
              <section className="rounded-md border bg-white p-3">
                <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Resultado</h4>
                <ul className="mb-3 space-y-1 text-sm">
                  {lineas.map((l) => {
                    const lista = l.desde === cliente.numero ? propios : ajenos
                    const e = lista.find((x) => x.equipo_key === l.equipo_key)
                    const va = l.desde === cliente.numero ? otro : cliente
                    return (
                      <li key={clave(l.desde, l.equipo_key)} className="flex items-center gap-1.5 text-gray-700">
                        {l.desde === cliente.numero ? (
                          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        ) : (
                          <ArrowLeft className="h-3.5 w-3.5 shrink-0 text-sky-600" />
                        )}
                        <span className="font-semibold">{num(l.cantidad)}x</span>
                        <span className="truncate">{e?.nombre || e?.descripcion}</span>
                        <span className="shrink-0 text-xs text-gray-400">a {va.nombre || va.numero}</span>
                      </li>
                    )
                  })}
                </ul>
                <div className="grid gap-2 sm:grid-cols-2">
                  {resumen.map((r) => (
                    <div key={r.quien.numero} className="rounded bg-gray-50 p-2 text-xs">
                      <p className="font-medium text-gray-800">{r.quien.nombre || r.quien.numero}</p>
                      <p className="text-gray-500">
                        {r.antes} <span className="mx-1">→</span> <span className="text-gray-800">{r.despues}</span>
                      </p>
                      {r.avisos.map((a) => (
                        <Badge key={a} variant="outline" className="mt-1 border-amber-200 bg-amber-50 text-[11px] text-amber-700">
                          {a}
                        </Badge>
                      ))}
                    </div>
                  ))}
                </div>
                {seriesDeMas && (
                  <p className="mt-2 text-xs text-red-600">
                    Hay más números de serie que unidades en una línea.
                  </p>
                )}
              </section>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label className="text-xs">Por qué se hace *</Label>
                <Textarea
                  rows={2}
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="Ej.: el cliente vendió el inversor a su vecino; cambio acordado por garantía…"
                />
              </div>
              <div>
                <Label className="text-xs">Autorizado por</Label>
                <Input value={autorizadoPor} onChange={(e) => setAutorizadoPor(e.target.value)} placeholder="Opcional" />
              </div>
              <div>
                <Label className="text-xs">Fecha en que se hizo</Label>
                <Input type="date" value={fecha} max={hoyISO()} onChange={(e) => setFecha(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={enviar} disabled={!puedeEnviar}>
            {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar traspaso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
