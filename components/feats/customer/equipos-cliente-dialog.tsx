"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AlertTriangle,
  ArrowRightLeft,
  FileText,
  Loader2,
  Minus,
  MoreHorizontal,
  Pencil,
  Plus,
  type LucideIcon,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog"
import { Badge } from "@/components/shared/atom/badge"
import { Button } from "@/components/shared/atom/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/shared/molecule/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/shared/molecule/tooltip"
import type { EquipoCliente, MovimientoEquipoCliente } from "@/lib/api-types"
import { EquiposClienteService } from "@/lib/services/feats/customer/equipos-cliente-service"
import { CATEGORIA_EQUIPO_UI, formatFechaCorta } from "./equipos-cliente-cell"
import { EquipoAccionDialog, FotoMaterial, type ModoAccionEquipo } from "./equipo-cliente-accion-dialog"

const TIPO_MOVIMIENTO_UI: Record<
  MovimientoEquipoCliente["tipo"],
  { label: string; color: string; icon: LucideIcon }
> = {
  alta: { label: "Alta", color: "bg-emerald-100 text-emerald-700", icon: Plus },
  ajuste_cantidad: { label: "Ajuste", color: "bg-blue-100 text-blue-700", icon: Pencil },
  sustitucion: { label: "Sustitución", color: "bg-purple-100 text-purple-700", icon: ArrowRightLeft },
  retiro: { label: "Retiro", color: "bg-red-100 text-red-700", icon: Minus },
  correccion: { label: "Corrección", color: "bg-gray-100 text-gray-700", icon: FileText },
}

const MOTIVO_LABEL: Record<MovimientoEquipoCliente["motivo"], string> = {
  instalacion_inicial: "Instalación inicial",
  ampliacion: "Ampliación",
  garantia: "Garantía",
  autorizado_direccion: "Autorizado por dirección",
  correccion_dato: "Corrección de dato",
  venta_adicional: "Venta adicional",
  retiro: "Retiro",
  migracion: "Registro inicial",
}

const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2))
const signo = (n: number) => (n > 0 ? `+${num(n)}` : num(n))

const normalizar = (s?: string | null) =>
  (s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()

/**
 * Qué se puede afirmar del equipo según el estado del cliente. Un cliente
 * pendiente de instalación tiene el equipo contratado, no puesto: decir "tiene"
 * es falso para él.
 */
function tituloSegunEstado(estado?: string | null): { titulo: string; instalado: boolean } {
  const e = normalizar(estado)
  if (e === "equipo instalado con exito") return { titulo: "Tiene instalado", instalado: true }
  if (e === "instalacion en proceso") return { titulo: "Contratado · instalación en proceso", instalado: false }
  if (e === "pendiente de instalacion" || e === "esperando equipo")
    return { titulo: "Contratado · pendiente de instalar", instalado: false }
  if (e === "no interesado") return { titulo: "Contratado · cliente no interesado", instalado: false }
  return { titulo: "Equipos", instalado: false }
}

const ordenar = (equipos: EquipoCliente[]) =>
  [...equipos].sort(
    (a, b) =>
      (CATEGORIA_EQUIPO_UI[a.categoria]?.orden ?? 9) - (CATEGORIA_EQUIPO_UI[b.categoria]?.orden ?? 9) ||
      a.descripcion.localeCompare(b.descripcion),
  )

/**
 * Qué decir cuando lo entregado con vale no llega a lo ofertado. Solo "falta
 * entregar" va en ámbar: es la única entrega pendiente de verdad. En un cliente
 * instalado el hueco casi siempre tiene otra explicación, y pintarlo como
 * alarma haría que nadie mirara las que sí lo son.
 */
const EXPLICACION_UI: Record<
  NonNullable<EquipoCliente["explicacion_faltante"]>,
  { texto: (n: string) => string; clase: string; ayuda: string }
> = {
  falta_entregar: {
    texto: (n) => `Falta entregar ${n}`,
    clase: "text-amber-700",
    ayuda: "El cliente aún no está instalado y este equipo no ha salido de almacén.",
  },
  anterior_a_vales: {
    texto: (n) => `${n} sin vale · anterior al sistema de vales`,
    clase: "text-gray-500",
    ayuda: "Se vendió antes de que existieran los vales de salida, así que no puede tener uno.",
  },
  sin_vale: {
    texto: (n) => `${n} sin vale · probablemente del cliente`,
    clase: "text-gray-500",
    ayuda:
      "El cliente está instalado y no hay vale de este equipo: lo más probable es que lo aportara él. También puede haber salido con otro material del catálogo del mismo modelo.",
  },
  propio_cliente: {
    texto: () => "Propio del cliente · no pasa por almacén",
    clase: "text-gray-500",
    ayuda: "Equipo del cliente: no se entrega con vale.",
  },
}

function LineaEntrega({ equipo }: { equipo: EquipoCliente }) {
  const vales = equipo.vales_entrega ?? []
  const diferencia = equipo.cantidad_actual - equipo.cantidad_entregada
  const explicacion = equipo.explicacion_faltante ? EXPLICACION_UI[equipo.explicacion_faltante] : null

  const entregado = (
    <span className={vales.length > 0 ? "cursor-help underline decoration-dotted underline-offset-2" : ""}>
      Entregado con vale: {num(equipo.cantidad_entregada)}
    </span>
  )

  return (
    <div className="mt-1 text-[12px] text-gray-500">
      {vales.length > 0 ? (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>{entregado}</TooltipTrigger>
            <TooltipContent side="top" className="max-w-sm text-xs">
              <ul className="space-y-1">
                {vales.map((v, i) => (
                  <li key={`${v.codigo}-${i}`}>
                    <span className="font-semibold">{v.codigo ?? "Vale"}</span>
                    {v.fecha && ` · ${formatFechaCorta(v.fecha)}`}
                    {` · ${num(v.cantidad)} u`}
                    {v.devuelto > 0 && ` (devueltas ${num(v.devuelto)})`}
                    {v.recogido_por && ` · recogió ${v.recogido_por}`}
                  </li>
                ))}
              </ul>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        entregado
      )}
      {explicacion && (
        <span className={`ml-1 ${explicacion.clase}`} title={explicacion.ayuda}>
          · {explicacion.texto(num(diferencia))}
        </span>
      )}
      {diferencia < -0.001 && (
        <span className="ml-1 text-blue-700">· Entregado de más {num(-diferencia)}</span>
      )}
    </div>
  )
}

function FilaEquipo({
  equipo,
  onAccion,
}: {
  equipo: EquipoCliente
  onAccion: (modo: ModoAccionEquipo) => void
}) {
  const ui = CATEGORIA_EQUIPO_UI[equipo.categoria] ?? CATEGORIA_EQUIPO_UI.OTRO
  const activo = equipo.estado === "activo" && equipo.cantidad_actual > 0
  // Lo del registro antiguo es una referencia, no un dato comprobado. Cualquier
  // cambio posterior (una corrección, un ajuste) significa que alguien lo revisó.
  const porVerificar = equipo.origen_inicial === "migracion_snapshot" && equipo.total_movimientos <= 1

  return (
    <li className="flex items-start gap-3 rounded-md border border-gray-100 bg-white p-2.5">
      <FotoMaterial url={equipo.foto} size={56} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-sm font-semibold text-gray-900">{num(equipo.cantidad_actual)}x</span>
            <span className="break-words text-sm text-gray-800">{equipo.nombre || equipo.descripcion}</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 flex-shrink-0 p-0" title="Acciones">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {activo && <DropdownMenuItem onClick={() => onAccion("ajustar")}>Ajustar cantidad</DropdownMenuItem>}
              {activo && <DropdownMenuItem onClick={() => onAccion("sustituir")}>Sustituir</DropdownMenuItem>}
              {activo && <DropdownMenuItem onClick={() => onAccion("retirar")}>Retirar</DropdownMenuItem>}
              <DropdownMenuItem onClick={() => onAccion("corregir")}>Corregir datos</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-gray-500">
          <span>{ui.label}</span>
          {equipo.marca && <span>· {equipo.marca}</span>}
          {equipo.potencia_kw != null && equipo.categoria !== "CAJA_COMBINADORA" && (
            <span>
              · {num(equipo.potencia_kw)} {equipo.categoria === "BATERIAS" ? "kWh" : "kW"} c/u
            </span>
          )}
          {!activo && (
            <Badge variant="outline" className="border-gray-200 bg-gray-100 px-1.5 py-0 text-[11px] text-gray-600">
              {equipo.estado === "sustituido" ? "Sustituido" : "Retirado"}
            </Badge>
          )}
          {equipo.es_equipo_propio && (
            <Badge variant="outline" className="px-1.5 py-0 text-[11px]">
              Propio del cliente
            </Badge>
          )}
          {porVerificar && (
            <Badge
              variant="outline"
              className="border-amber-200 bg-amber-50 px-1.5 py-0 text-[11px] text-amber-700"
              title="Viene del registro antiguo del cliente, anterior a las ofertas: puede no ser exacto."
            >
              Por verificar
            </Badge>
          )}
        </div>
        {/* Lo entregado lo dice almacén y solo existe para equipos del catálogo. */}
        {activo && equipo.material_id && <LineaEntrega equipo={equipo} />}
        {equipo.numeros_serie.length > 0 && (
          <div className="mt-1 text-[12px] text-gray-500">Serie: {equipo.numeros_serie.join(", ")}</div>
        )}
      </div>
    </li>
  )
}

type GrupoHistorial = {
  clave: string
  fecha: string
  movimientos: MovimientoEquipoCliente[]
}

/**
 * Junta en una sola tarjeta lo que es el mismo hecho: misma fecha, mismo
 * motivo, misma oferta y misma persona. Una instalación da de alta el inversor,
 * las baterías y los paneles a la vez; verlos como tres tarjetas repetidas no
 * dice nada que no diga una. Lo que difiere en quién o por qué va aparte.
 */
function agruparHistorial(movimientos: MovimientoEquipoCliente[]): GrupoHistorial[] {
  const grupos: GrupoHistorial[] = []
  const indice = new Map<string, GrupoHistorial>()
  for (const m of movimientos) {
    const dia = (m.fecha_efectiva ?? "").slice(0, 10)
    const clave = [dia, m.motivo, m.numero_oferta ?? "", m.actor_ci ?? "", m.autorizado_por ?? ""].join("|")
    let grupo = indice.get(clave)
    if (!grupo) {
      grupo = { clave, fecha: m.fecha_efectiva, movimientos: [] }
      indice.set(clave, grupo)
      grupos.push(grupo)
    }
    grupo.movimientos.push(m)
  }
  return grupos
}

function tipoDelGrupo(movimientos: MovimientoEquipoCliente[]): MovimientoEquipoCliente["tipo"] {
  // Una sustitución son dos movimientos (sale uno, entra otro): manda ella.
  if (movimientos.some((m) => m.tipo === "sustitucion")) return "sustitucion"
  return movimientos[0].tipo
}

function Historial({ movimientos }: { movimientos: MovimientoEquipoCliente[] }) {
  if (movimientos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 py-6 text-xs text-gray-400">
        <FileText className="h-6 w-6 text-gray-300" />
        Sin movimientos registrados
      </div>
    )
  }

  return (
    <ol className="space-y-2">
      {agruparHistorial(movimientos).map((grupo) => {
        const primero = grupo.movimientos[0]
        const tipo = tipoDelGrupo(grupo.movimientos)
        const cfg = TIPO_MOVIMIENTO_UI[tipo] ?? { label: tipo, color: "bg-gray-100 text-gray-700", icon: FileText }
        const Icon = cfg.icon
        // Solo lo que le sirve al operador: la oferta de la que salió, si el
        // equipo es del cliente, quién lo hizo y quién lo autorizó. El origen
        // técnico del dato (migración, alta automática) no le dice nada.
        const detalles = [
          primero.numero_oferta && `Oferta ${primero.numero_oferta}`,
          grupo.movimientos.some((m) => m.origen === "equipo_propio_cliente") && "Equipo propio del cliente",
          primero.actor_nombre && `por ${primero.actor_nombre}`,
          primero.autorizado_por && `autorizó ${primero.autorizado_por}`,
        ].filter(Boolean)
        // La nota de los datos del registro antiguo la escribió el sistema, no
        // una persona: la etiqueta "Por verificar" de la ficha ya lo dice.
        const notas = Array.from(
          new Set(
            grupo.movimientos
              .filter((m) => m.origen !== "migracion_snapshot" && m.nota)
              .map((m) => m.nota as string),
          ),
        )
        const variosTipos = new Set(grupo.movimientos.map((m) => m.tipo)).size > 1
        return (
          <li key={grupo.clave} className="flex gap-2 text-xs">
            <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${cfg.color}`}>
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1 rounded border border-gray-100 bg-white p-2">
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${cfg.color}`}>
                  {cfg.label} · {MOTIVO_LABEL[primero.motivo] ?? primero.motivo}
                </span>
                <span className="shrink-0 text-[11px] text-gray-400">{formatFechaCorta(grupo.fecha)}</span>
              </div>
              <ul className="space-y-0.5">
                {grupo.movimientos.map((m, i) => (
                  <li key={m.id ?? i} className="break-words text-gray-800">
                    {m.cantidad_delta !== 0 && <span className="font-semibold">{signo(m.cantidad_delta)} </span>}
                    {m.nombre || m.descripcion}
                    {variosTipos && (
                      <span className="text-gray-400"> · {TIPO_MOVIMIENTO_UI[m.tipo]?.label.toLowerCase()}</span>
                    )}
                  </li>
                ))}
              </ul>
              {detalles.length > 0 && <p className="mt-1 text-[11px] text-gray-500">{detalles.join(" · ")}</p>}
              {notas.map((n) => (
                <p key={n} className="mt-1 whitespace-pre-wrap break-words text-gray-600">
                  {n}
                </p>
              ))}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

interface EquiposClienteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clienteNumero: string | null
  clienteNombre?: string | null
  clienteEstado?: string | null
  /** Tras un cambio, la ficha nueva: la tabla la usa para refrescar la fila. */
  onCambio?: (numero: string, equipos: EquipoCliente[]) => void
}

export function EquiposClienteDialog({
  open,
  onOpenChange,
  clienteNumero,
  clienteNombre,
  clienteEstado,
  onCambio,
}: EquiposClienteDialogProps) {
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [equipos, setEquipos] = useState<EquipoCliente[]>([])
  const [historial, setHistorial] = useState<MovimientoEquipoCliente[]>([])
  const [accion, setAccion] = useState<{ modo: ModoAccionEquipo; equipo: EquipoCliente | null } | null>(null)

  const cargar = useCallback(
    async (avisarCambio: boolean) => {
      if (!clienteNumero) return
      setCargando(true)
      setError(null)
      try {
        const [resEquipos, movimientos] = await Promise.all([
          EquiposClienteService.getEquipos(clienteNumero),
          EquiposClienteService.getHistorial(clienteNumero),
        ])
        setEquipos(resEquipos.equipos)
        setHistorial(movimientos)
        if (avisarCambio) onCambio?.(clienteNumero, resEquipos.equipos)
      } catch (err: unknown) {
        setEquipos([])
        setHistorial([])
        setError(err instanceof Error ? err.message : "No se pudieron cargar los equipos")
      } finally {
        setCargando(false)
      }
    },
    [clienteNumero, onCambio],
  )

  useEffect(() => {
    if (open) void cargar(false)
  }, [open, cargar])

  const { titulo } = tituloSegunEstado(clienteEstado)
  const activos = ordenar(equipos.filter((e) => e.estado === "activo" && e.cantidad_actual > 0))
  const fuera = ordenar(equipos.filter((e) => !(e.estado === "activo" && e.cantidad_actual > 0)))

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3 pr-6">
              <div>
                <DialogTitle>Equipos del cliente</DialogTitle>
                <DialogDescription>
                  {clienteNombre ? `${clienteNombre} · ` : ""}
                  {clienteNumero}
                  {clienteEstado ? ` · ${clienteEstado}` : ""}
                </DialogDescription>
              </div>
              {!cargando && !error && (
                <Button size="sm" onClick={() => setAccion({ modo: "agregar", equipo: null })}>
                  <Plus className="mr-1 h-4 w-4" />
                  Agregar equipo
                </Button>
              )}
            </div>
          </DialogHeader>

          {cargando && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando equipos…
            </div>
          )}

          {!cargando && error && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span className="break-words">{error}</span>
            </div>
          )}

          {!cargando && !error && (
            <div className="space-y-5">
              <section>
                <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{titulo}</h4>
                {activos.length > 0 ? (
                  <ul className="space-y-1.5">
                    {activos.map((e) => (
                      <FilaEquipo
                        key={e.equipo_key}
                        equipo={e}
                        onAccion={(modo) => setAccion({ modo, equipo: e })}
                      />
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400">
                    Sin equipos registrados. Usa «Agregar equipo» para cargar lo que tiene.
                  </p>
                )}
              </section>

              {fuera.length > 0 && (
                <section>
                  <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Retirados o sustituidos
                  </h4>
                  <ul className="space-y-1.5">
                    {fuera.map((e) => (
                      <FilaEquipo
                        key={e.equipo_key}
                        equipo={e}
                        onAccion={(modo) => setAccion({ modo, equipo: e })}
                      />
                    ))}
                  </ul>
                </section>
              )}

              <section>
                <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Historial</h4>
                <Historial movimientos={historial} />
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {clienteNumero && accion && (
        <EquipoAccionDialog
          open={!!accion}
          onOpenChange={(o) => {
            if (!o) setAccion(null)
          }}
          modo={accion.modo}
          equipo={accion.equipo}
          clienteNumero={clienteNumero}
          onHecho={() => void cargar(true)}
        />
      )}
    </>
  )
}
