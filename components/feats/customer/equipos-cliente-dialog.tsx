"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  FileText,
  Loader2,
  Minus,
  MoreHorizontal,
  Pencil,
  Plus,
  Undo2,
  type LucideIcon,
} from "lucide-react"
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
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/shared/atom/badge"
import { Button } from "@/components/shared/atom/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/shared/molecule/dropdown-menu"
import { Portal as TooltipPortal } from "@radix-ui/react-tooltip"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/shared/molecule/tooltip"
import { useAuth } from "@/contexts/auth-context"
import type { CapacidadEquipos, EquipoCliente, MovimientoEquipoCliente, TraspasoEquipos } from "@/lib/api-types"
import {
  EquiposClienteService,
  type OfertaPendienteInstalar,
} from "@/lib/services/feats/customer/equipos-cliente-service"
import { CATEGORIA_EQUIPO_UI, formatFechaCorta } from "./equipos-cliente-cell"
import { EquipoAccionDialog, FotoMaterial, type ModoAccionEquipo } from "./equipo-cliente-accion-dialog"
import { TraspasoEquiposDialog } from "./traspaso-equipos-dialog"

/** Sub-permiso aditivo: tener el módulo Clientes no lo concede. */
const PERMISO_TRASPASO = "clientes/traspaso-equipos"

const TIPO_MOVIMIENTO_UI: Record<
  MovimientoEquipoCliente["tipo"],
  { label: string; color: string; icon: LucideIcon }
> = {
  alta: { label: "Alta", color: "bg-emerald-100 text-emerald-700", icon: Plus },
  ajuste_cantidad: { label: "Ajuste", color: "bg-blue-100 text-blue-700", icon: Pencil },
  sustitucion: { label: "Sustitución", color: "bg-purple-100 text-purple-700", icon: ArrowRightLeft },
  retiro: { label: "Retiro", color: "bg-red-100 text-red-700", icon: Minus },
  correccion: { label: "Corrección", color: "bg-gray-100 text-gray-700", icon: FileText },
  traspaso_salida: { label: "Sale", color: "bg-orange-100 text-orange-700", icon: ArrowUpRight },
  traspaso_entrada: { label: "Entra", color: "bg-teal-100 text-teal-700", icon: ArrowDownLeft },
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
  traspaso: "Traspaso entre clientes",
}

const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2))
const signo = (n: number) => (n > 0 ? `+${num(n)}` : num(n))

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

  // Si parte de lo entregado llegó (o se fue) con un traspaso, no todo es de
  // un vale de este cliente: se dice "Entregado" a secas y el detalle lo aclara.
  const conTraspaso = vales.some((v) => v.traspaso)
  const entregado = (
    <span className={vales.length > 0 ? "cursor-help underline decoration-dotted underline-offset-2" : ""}>
      {conTraspaso ? "Entregado" : "Entregado con vale"}: {num(equipo.cantidad_entregada)}
    </span>
  )

  return (
    <div className="mt-1 text-[12px] text-gray-500">
      {vales.length > 0 ? (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>{entregado}</TooltipTrigger>
            {/* Al body, no dentro del diálogo: el TooltipContent compartido no usa
                portal, y dentro del diálogo lo recortaba su overflow-y-auto y lo
                descolocaba el transform que lo centra. */}
            <TooltipPortal>
            <TooltipContent
              side="top"
              align="start"
              collisionPadding={12}
              className="z-[100] max-w-sm break-words text-xs"
            >
              <ul className="space-y-1">
                {vales.map((v, i) =>
                  v.traspaso ? (
                    <li key={`${v.codigo}-${i}`}>
                      <span className="font-semibold">{v.codigo ?? "Traspaso"}</span>
                      {v.fecha && ` · ${formatFechaCorta(v.fecha)}`}
                      {` · ${signo(v.cantidad)} u `}
                      {v.traspaso.tipo === "entrada" ? `de ${v.traspaso.cliente_numero}` : `a ${v.traspaso.cliente_numero}`}
                    </li>
                  ) : (
                    <li key={`${v.codigo}-${i}`}>
                      <span className="font-semibold">{v.codigo ?? "Vale"}</span>
                      {v.fecha && ` · ${formatFechaCorta(v.fecha)}`}
                      {` · ${num(v.cantidad)} u`}
                      {v.devuelto > 0 && ` (devueltas ${num(v.devuelto)})`}
                      {v.recogido_por && ` · recogió ${v.recogido_por}`}
                    </li>
                  ),
                )}
              </ul>
            </TooltipContent>
            </TooltipPortal>
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
  /** Sin él la fila es de solo lectura: lo contratado no se edita aquí, sino en la oferta. */
  onAccion?: (modo: ModoAccionEquipo) => void
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
            {/* Un retirado o sustituido está a 0: la etiqueta ya dice qué le pasó. */}
            {activo && (
              <span className="text-sm font-semibold text-gray-900">{num(equipo.cantidad_actual)}x</span>
            )}
            <span className="break-words text-sm text-gray-800">{equipo.nombre || equipo.descripcion}</span>
          </div>
          {onAccion && (
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
          )}
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
  // Dentro de un mismo día manda el orden en que se registró: la hora de la
  // fecha efectiva no dice nada (el formulario la manda a mediodía y otras
  // acciones con la hora real), y ordenar por ella desordenaba el día.
  const ordenados = [...movimientos].sort((a, b) => {
    const dia = (b.fecha_efectiva ?? "").slice(0, 10).localeCompare((a.fecha_efectiva ?? "").slice(0, 10))
    return dia !== 0 ? dia : (b.fecha_registro ?? "").localeCompare(a.fecha_registro ?? "")
  })
  // Solo se juntan movimientos seguidos: juntar uno con otro separado por un
  // tercero cambiaría el orden en que pasaron las cosas.
  const grupos: GrupoHistorial[] = []
  for (const m of ordenados) {
    const dia = (m.fecha_efectiva ?? "").slice(0, 10)
    const clave = [
      dia,
      m.motivo,
      m.numero_oferta ?? "",
      m.traspaso_id ?? "",
      m.actor_ci ?? "",
      m.autorizado_por ?? "",
    ].join("|")
    const ultimo = grupos[grupos.length - 1]
    if (ultimo && ultimo.clave.startsWith(clave + "#")) {
      ultimo.movimientos.push(m)
    } else {
      grupos.push({ clave: `${clave}#${grupos.length}`, fecha: m.fecha_efectiva, movimientos: [m] })
    }
  }
  return grupos
}

function tipoDelGrupo(movimientos: MovimientoEquipoCliente[]): MovimientoEquipoCliente["tipo"] {
  // Una sustitución son dos movimientos (sale uno, entra otro): manda ella.
  if (movimientos.some((m) => m.tipo === "sustitucion")) return "sustitucion"
  return movimientos[0].tipo
}

function Historial({
  movimientos,
  traspasos,
  onRevertir,
}: {
  movimientos: MovimientoEquipoCliente[]
  /** Documentos de los traspasos que aparecen, por `traspaso_id`. */
  traspasos: Record<string, TraspasoEquipos>
  /** Sin él no se ofrece revertir (falta el permiso). */
  onRevertir?: (traspaso: TraspasoEquipos) => void
}) {
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
        // Un traspaso se titula por su documento y dice con quién fue: el
        // motivo ("traspaso entre clientes") no añade nada al título.
        const traspaso = primero.traspaso_id ? traspasos[primero.traspaso_id] : undefined
        const esIntercambio =
          !!primero.traspaso_id && new Set(grupo.movimientos.map((m) => m.tipo)).size > 1
        const Icon = esIntercambio ? ArrowRightLeft : cfg.icon
        const titulo = primero.traspaso_id
          ? `${esIntercambio ? "Intercambio" : tipo === "traspaso_salida" ? "Traspaso a otro cliente" : "Traspaso de otro cliente"}${
              primero.traspaso_codigo ? ` · ${primero.traspaso_codigo}` : ""
            }`
          : `${cfg.label} · ${MOTIVO_LABEL[primero.motivo] ?? primero.motivo}`
        const color = esIntercambio ? "bg-indigo-100 text-indigo-700" : cfg.color
        const contraparte = primero.contraparte_cliente_numero
          ? `con ${primero.contraparte_cliente_nombre ? `${primero.contraparte_cliente_nombre} (${primero.contraparte_cliente_numero})` : primero.contraparte_cliente_numero}`
          : null
        // Solo lo que le sirve al operador: la oferta de la que salió, si el
        // equipo es del cliente, quién lo hizo y quién lo autorizó. El origen
        // técnico del dato (migración, alta automática) no le dice nada.
        const detalles = [
          contraparte,
          primero.numero_oferta && `Oferta ${primero.numero_oferta}`,
          grupo.movimientos.every((m) => m.origen === "equipo_propio_cliente") && "Equipo propio del cliente",
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
            <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${color}`}>
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1 rounded border border-gray-100 bg-white p-2">
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${color}`}>{titulo}</span>
                <span className="shrink-0 text-[11px] text-gray-400">{formatFechaCorta(grupo.fecha)}</span>
              </div>
              <ul className="space-y-0.5">
                {grupo.movimientos.map((m, i) => (
                  <li key={m.id ?? i} className="break-words text-gray-800">
                    {m.cantidad_delta !== 0 && <span className="font-semibold">{signo(m.cantidad_delta)} </span>}
                    {m.nombre || m.descripcion}
                    {(m.numeros_serie?.length ?? 0) > 0 && (
                      <span className="text-gray-400"> · serie {m.numeros_serie?.join(", ")}</span>
                    )}
                    {m.origen === "equipo_propio_cliente" &&
                      !grupo.movimientos.every((x) => x.origen === "equipo_propio_cliente") && (
                        <span className="text-gray-400"> · propio del cliente</span>
                      )}
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
              {traspaso?.revertido_por && (
                <p className="mt-1 text-[11px] text-gray-500">
                  Revertido con {traspasos[traspaso.revertido_por]?.codigo ?? "otro traspaso"}
                </p>
              )}
              {traspaso && !traspaso.revertido_por && !traspaso.revierte_a && onRevertir && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-6 px-2 text-[11px] text-gray-600"
                  onClick={() => onRevertir(traspaso)}
                >
                  <Undo2 className="mr-1 h-3 w-3" />
                  Revertir
                </Button>
              )}
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
  /** Tras un cambio: la ficha nueva y cuántas ofertas siguen pendientes, para la fila de la tabla. */
  onCambio?: (
    numero: string,
    equipos: EquipoCliente[],
    pendientes: number,
    capacidad: CapacidadEquipos | null,
  ) => void
}

const hoyISO = () => new Date().toISOString().slice(0, 10)

export function EquiposClienteDialog({
  open,
  onOpenChange,
  clienteNumero,
  clienteNombre,
  clienteEstado,
  onCambio,
}: EquiposClienteDialogProps) {
  const { toast } = useToast()
  const { hasExactPermission } = useAuth()
  const puedeTraspasar = hasExactPermission(PERMISO_TRASPASO)
  const [traspasoAbierto, setTraspasoAbierto] = useState(false)
  const [traspasos, setTraspasos] = useState<Record<string, TraspasoEquipos>>({})
  const [aRevertir, setARevertir] = useState<TraspasoEquipos | null>(null)
  const [notaRevertir, setNotaRevertir] = useState("")
  const [revirtiendo, setRevirtiendo] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [equipos, setEquipos] = useState<EquipoCliente[]>([])
  const [pendientes, setPendientes] = useState<OfertaPendienteInstalar[]>([])
  const [historial, setHistorial] = useState<MovimientoEquipoCliente[]>([])
  const [accion, setAccion] = useState<{ modo: ModoAccionEquipo; equipo: EquipoCliente | null } | null>(null)
  const [aInstalar, setAInstalar] = useState<OfertaPendienteInstalar | null>(null)
  const [fechaInstalada, setFechaInstalada] = useState(hoyISO())
  const [notaInstalada, setNotaInstalada] = useState("")
  const [instalando, setInstalando] = useState(false)

  const cargar = useCallback(
    async (avisarCambio: boolean) => {
      if (!clienteNumero) return
      setCargando(true)
      setError(null)
      try {
        const [vista, movimientos] = await Promise.all([
          EquiposClienteService.getEquipos(clienteNumero),
          EquiposClienteService.getHistorial(clienteNumero),
        ])
        setEquipos(vista.equipos)
        setPendientes(vista.pendientes)
        setHistorial(movimientos)
        // Los documentos de traspaso solo hacen falta si el historial tiene
        // alguno; si fallan, el historial se ve igual, sin el botón de revertir.
        setTraspasos({})
        if (movimientos.some((m) => m.traspaso_id)) {
          EquiposClienteService.getTraspasos(clienteNumero)
            .then((lista) => setTraspasos(Object.fromEntries(lista.map((t) => [t.traspaso_id, t]))))
            .catch(() => setTraspasos({}))
        }
        if (avisarCambio)
          onCambio?.(
            clienteNumero,
            vista.equipos,
            vista.pendientes.length,
            vista.capacidad ? { ...vista.capacidad, fuente: "ficha" } : null,
          )
      } catch (err: unknown) {
        setEquipos([])
        setPendientes([])
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

  const confirmarInstalada = async () => {
    if (!clienteNumero || !aInstalar) return
    setInstalando(true)
    try {
      await EquiposClienteService.instalarOferta(clienteNumero, aInstalar.ofertaId, {
        fecha_efectiva: fechaInstalada ? `${fechaInstalada}T12:00:00Z` : null,
        nota: notaInstalada.trim() || null,
      })
      toast({ title: `${aInstalar.numeroOferta ?? "La oferta"} pasó a la ficha` })
      setAInstalar(null)
      await cargar(true)
    } catch (err) {
      toast({
        title: "No se marcó como instalada",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      })
    } finally {
      setInstalando(false)
    }
  }

  /** Refresca la fila del otro cliente en la tabla: su ficha también cambió. */
  const avisarOtro = async (numero: string) => {
    try {
      const vista = await EquiposClienteService.getEquipos(numero)
      onCambio?.(
        numero,
        vista.equipos,
        vista.pendientes.length,
        vista.capacidad ? { ...vista.capacidad, fuente: "ficha" } : null,
      )
    } catch {
      // La tabla lo verá al recargar; el traspaso ya está hecho.
    }
  }

  const confirmarRevertir = async () => {
    if (!clienteNumero || !aRevertir) return
    setRevirtiendo(true)
    try {
      const reversion = await EquiposClienteService.revertirTraspaso(
        clienteNumero,
        aRevertir.traspaso_id,
        notaRevertir.trim(),
      )
      toast({ title: `${aRevertir.codigo} revertido con ${reversion.codigo}` })
      const otro =
        aRevertir.cliente_a.numero === clienteNumero ? aRevertir.cliente_b.numero : aRevertir.cliente_a.numero
      setARevertir(null)
      await cargar(true)
      void avisarOtro(otro)
    } catch (err) {
      toast({
        title: "No se revirtió el traspaso",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      })
    } finally {
      setRevirtiendo(false)
    }
  }

  const activos = ordenar(equipos.filter((e) => e.estado === "activo" && e.cantidad_actual > 0))
  const fuera = ordenar(equipos.filter((e) => !(e.estado === "activo" && e.cantidad_actual > 0)))
  const hayAlgo = activos.length > 0 || fuera.length > 0 || pendientes.length > 0

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
                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                  {puedeTraspasar && (
                    <Button size="sm" variant="outline" onClick={() => setTraspasoAbierto(true)}>
                      <ArrowRightLeft className="mr-1 h-4 w-4" />
                      Traspaso / intercambio
                    </Button>
                  )}
                  <Button size="sm" onClick={() => setAccion({ modo: "agregar", equipo: null })}>
                    <Plus className="mr-1 h-4 w-4" />
                    Agregar equipo
                  </Button>
                </div>
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
              {/* Lo instalado: las ofertas que ya entraron en la ficha, más lo cargado a mano. */}
              {(activos.length > 0 || pendientes.length === 0) && (
                <section>
                  <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Tiene instalado
                  </h4>
                  {activos.length > 0 ? (
                    <ul className="space-y-1.5">
                      {activos.map((e) => (
                        <FilaEquipo key={e.equipo_key} equipo={e} onAccion={(m) => setAccion({ modo: m, equipo: e })} />
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-400">
                      Sin equipos registrados. Usa «Agregar equipo» para cargar lo que tiene.
                    </p>
                  )}
                </section>
              )}

              {/* Cada oferta confirmada que aún no entró: una ampliación por poner, o todo si
                  nunca se instaló. Se decide por oferta, no por el estado del cliente. */}
              {pendientes.map((p) => (
                <section key={p.ofertaId}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                      Pendiente de instalar{p.numeroOferta ? ` · ${p.numeroOferta}` : ""}
                    </h4>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => {
                        setFechaInstalada(hoyISO())
                        setNotaInstalada("")
                        setAInstalar(p)
                      }}
                    >
                      Marcar como instalada
                    </Button>
                  </div>
                  <ul className="space-y-1.5">
                    {ordenar(p.equipos).map((e) => (
                      <FilaEquipo key={`${p.ofertaId}-${e.equipo_key}`} equipo={e} />
                    ))}
                  </ul>
                </section>
              ))}

              {fuera.length > 0 && (
                <section>
                  <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Retirados o sustituidos
                  </h4>
                  <ul className="space-y-1.5">
                    {fuera.map((e) => (
                      <FilaEquipo key={e.equipo_key} equipo={e} onAccion={(m) => setAccion({ modo: m, equipo: e })} />
                    ))}
                  </ul>
                </section>
              )}

              <section>
                <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Historial</h4>
                {historial.length === 0 && pendientes.length > 0 ? (
                  <p className="text-xs text-gray-400">
                    El historial empieza cuando se instale una oferta.
                  </p>
                ) : (
                  <Historial
                    movimientos={historial}
                    traspasos={traspasos}
                    onRevertir={
                      puedeTraspasar
                        ? (t) => {
                            setNotaRevertir("")
                            setARevertir(t)
                          }
                        : undefined
                    }
                  />
                )}
              </section>

              {!hayAlgo && (
                <p className="text-xs text-gray-400">
                  Este cliente no tiene ofertas confirmadas ni equipos registrados.
                </p>
              )}
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
          hayOfertasPendientes={pendientes.length > 0}
          onHecho={() => void cargar(true)}
        />
      )}

      {clienteNumero && (
        <TraspasoEquiposDialog
          open={traspasoAbierto}
          onOpenChange={setTraspasoAbierto}
          cliente={{ numero: clienteNumero, nombre: clienteNombre ?? null }}
          equipos={equipos}
          onHecho={(otro) => {
            void cargar(true)
            void avisarOtro(otro)
          }}
        />
      )}

      <Dialog open={!!aRevertir} onOpenChange={(o) => !o && !revirtiendo && setARevertir(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Revertir {aRevertir?.codigo}</DialogTitle>
            <DialogDescription>
              Se registra un traspaso al revés entre {aRevertir?.cliente_a.nombre ?? aRevertir?.cliente_a.numero} y{" "}
              {aRevertir?.cliente_b.nombre ?? aRevertir?.cliente_b.numero}. Los dos quedan en el historial. No se puede si
              alguno ya no tiene lo que recibió.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label className="text-xs">Por qué se revierte *</Label>
            <Textarea
              rows={2}
              value={notaRevertir}
              onChange={(e) => setNotaRevertir(e.target.value)}
              placeholder="Ej.: se registró con el cliente equivocado"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setARevertir(null)} disabled={revirtiendo}>
              Cancelar
            </Button>
            <Button onClick={confirmarRevertir} disabled={revirtiendo || notaRevertir.trim().length < 3}>
              {revirtiendo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Revertir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!aInstalar} onOpenChange={(o) => !o && setAInstalar(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Marcar como instalada</DialogTitle>
            <DialogDescription>
              Los equipos de {aInstalar?.numeroOferta ?? "esta oferta"} pasan a la ficha del cliente
              y empiezan a contar en su historial.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Fecha en que se instaló</Label>
              <Input
                type="date"
                value={fechaInstalada}
                max={hoyISO()}
                onChange={(e) => setFechaInstalada(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Nota</Label>
              <Textarea
                rows={2}
                value={notaInstalada}
                onChange={(e) => setNotaInstalada(e.target.value)}
                placeholder="Opcional: cómo se supo, qué se comprobó"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAInstalar(null)} disabled={instalando}>
              Cancelar
            </Button>
            <Button onClick={confirmarInstalada} disabled={instalando}>
              {instalando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Marcar como instalada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
