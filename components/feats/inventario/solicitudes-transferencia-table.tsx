"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Textarea } from "@/components/shared/molecule/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog"
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ArrowRightLeft,
  Package,
  Pencil,
} from "lucide-react"
import { InventarioService } from "@/lib/api-services"
import type {
  Almacen,
  MaterialFaltante,
  SolicitudTransferencia,
  SolicitudTransferenciaEstado,
} from "@/lib/inventario-types"
import type { Material } from "@/lib/material-types"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { SolicitudTransferenciaDialog } from "./solicitud-transferencia-dialog"

interface SolicitudesTransferenciaTableProps {
  almacenes: Almacen[]
  materiales: Material[]
  currentAlmacenId?: string
  onResolved?: () => void
}

const ESTADO_CONFIG: Record<
  string,
  { label: string; icon: typeof Clock; color: string; bg: string }
> = {
  pendiente: {
    label: "Pendiente",
    icon: Clock,
    color: "text-yellow-700",
    bg: "bg-yellow-50 border-yellow-200",
  },
  procesando: {
    label: "Procesando",
    icon: Clock,
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
  },
  aprobada: {
    label: "Aprobada",
    icon: CheckCircle2,
    color: "text-green-700",
    bg: "bg-green-50 border-green-200",
  },
  denegada: {
    label: "Denegada",
    icon: XCircle,
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
  },
}

// Fallback para cualquier estado no mapeado (evita "undefined is not an object"
// al leer config.icon si el backend introduce un estado nuevo).
const ESTADO_FALLBACK = {
  label: "—",
  icon: Clock,
  color: "text-gray-600",
  bg: "bg-gray-50 border-gray-200",
}

function formatFecha(fecha?: string | null) {
  if (!fecha) return "—"
  try {
    return new Date(fecha).toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return fecha
  }
}

export function SolicitudesTransferenciaTable({
  almacenes,
  materiales,
  currentAlmacenId,
  onResolved,
}: SolicitudesTransferenciaTableProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [solicitudes, setSolicitudes] = useState<SolicitudTransferencia[]>([])
  const [loading, setLoading] = useState(true)
  const [estadoFilter, setEstadoFilter] = useState<string>("all")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Resolve dialog
  const [resolveDialog, setResolveDialog] = useState<{
    solicitud: SolicitudTransferencia
    action: "aprobar" | "denegar"
  } | null>(null)
  const [comentario, setComentario] = useState("")
  const [resolving, setResolving] = useState(false)
  // Materiales con faltante en origen devueltos por el backend al aprobar.
  const [faltantes, setFaltantes] = useState<MaterialFaltante[]>([])
  // Id de la solicitud colgada que se está resolviendo (boton "Resolver")
  const [resolvingColgada, setResolvingColgada] = useState<string | null>(null)

  // Edit dialog
  const [editingSolicitud, setEditingSolicitud] = useState<SolicitudTransferencia | null>(null)

  const almacenNombreMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const a of almacenes) {
      if (a.id) map.set(a.id, a.nombre)
    }
    return map
  }, [almacenes])

  const materialMap = useMemo(() => {
    const byId = new Map<string, Material>()
    const byCodigo = new Map<string, Material>()
    for (const m of materiales) {
      if (m.id) byId.set(m.id, m)
      byCodigo.set(String(m.codigo), m)
    }
    return { byId, byCodigo }
  }, [materiales])

  const fetchSolicitudes = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (currentAlmacenId) params.almacen_id = currentAlmacenId
      const data =
        await InventarioService.getSolicitudesTransferencia(params)
      setSolicitudes(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Error fetching solicitudes:", err)
      setSolicitudes([])
    } finally {
      setLoading(false)
    }
  }, [currentAlmacenId])

  useEffect(() => {
    fetchSolicitudes()
  }, [fetchSolicitudes])

  const handleResolve = async () => {
    if (!resolveDialog) return
    setResolving(true)
    setFaltantes([])
    try {
      if (resolveDialog.action === "aprobar") {
        await InventarioService.aprobarSolicitudTransferencia(
          resolveDialog.solicitud.id,
          comentario || undefined,
        )
      } else {
        await InventarioService.denegarSolicitudTransferencia(
          resolveDialog.solicitud.id,
          comentario || undefined,
        )
      }
      setResolveDialog(null)
      setComentario("")
      await fetchSolicitudes()
      onResolved?.()
    } catch (err) {
      console.error("Error resolving solicitud:", err)
      const errFaltantes = (err as { faltantes?: MaterialFaltante[] })?.faltantes
      if (Array.isArray(errFaltantes) && errFaltantes.length > 0) {
        // Mantener el diálogo abierto y listar los materiales en falta debajo.
        setFaltantes(errFaltantes)
      }
      toast({
        title:
          resolveDialog.action === "aprobar"
            ? "No se pudo aprobar la solicitud"
            : "No se pudo denegar la solicitud",
        description:
          err instanceof Error
            ? err.message
            : "Ocurrió un error inesperado. Intenta nuevamente.",
        variant: "destructive",
      })
    } finally {
      setResolving(false)
    }
  }

  // Resuelve una solicitud colgada en 'procesando': el backend libera a
  // 'pendiente' si no se movió stock, o la cierra 'aprobada' si ya se aplicó.
  const handleResolverColgada = async (solicitud: SolicitudTransferencia) => {
    setResolvingColgada(solicitud.id)
    try {
      await InventarioService.resolverSolicitudTransferencia(solicitud.id)
      await fetchSolicitudes()
      onResolved?.()
    } catch (err) {
      console.error("Error resolviendo solicitud colgada:", err)
      toast({
        title: "No se pudo resolver la solicitud",
        description:
          err instanceof Error
            ? err.message
            : "Ocurrió un error inesperado. Intenta nuevamente.",
        variant: "destructive",
      })
    } finally {
      setResolvingColgada(null)
    }
  }

  // Separate into sent and received
  const { enviadas, recibidas } = useMemo(() => {
    const filtered =
      estadoFilter === "all"
        ? solicitudes
        : solicitudes.filter((s) => s.estado === estadoFilter)

    if (!currentAlmacenId) {
      return { enviadas: filtered, recibidas: [] }
    }

    return {
      enviadas: filtered.filter(
        (s) => s.almacen_origen_id === currentAlmacenId,
      ),
      recibidas: filtered.filter(
        (s) => s.almacen_destino_id === currentAlmacenId,
      ),
    }
  }, [solicitudes, estadoFilter, currentAlmacenId])

  const resolveMaterial = (item: { material_id: string; material_codigo?: string }) => {
    return (
      materialMap.byId.get(item.material_id) ||
      materialMap.byCodigo.get(item.material_codigo || "") ||
      undefined
    )
  }

  const getMaterialNombre = (item: { material_id: string; material_codigo?: string }) => {
    const mat = resolveMaterial(item)
    return mat?.nombre || mat?.descripcion || item.material_codigo || item.material_id
  }

  const renderSolicitudRow = (
    solicitud: SolicitudTransferencia,
    isReceived: boolean,
  ) => {
    const config = ESTADO_CONFIG[solicitud.estado] ?? ESTADO_FALLBACK
    const Icon = config.icon
    const isExpanded = expandedId === solicitud.id
    const canResolve = isReceived && solicitud.estado === "pendiente"
    const canEdit = !isReceived && solicitud.estado === "pendiente"

    return (
      <div key={solicitud.id} className={`border rounded-md ${config.bg}`}>
        <button
          type="button"
          className="w-full px-3 py-2.5 flex items-center gap-3 text-left text-sm hover:bg-black/5 transition-colors rounded-md"
          onClick={() => setExpandedId(isExpanded ? null : solicitud.id)}
        >
          <Icon className={`h-4 w-4 shrink-0 ${config.color}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium truncate">
                {almacenNombreMap.get(solicitud.almacen_origen_id) ||
                  "Almacén desconocido"}
              </span>
              <ArrowRightLeft className="h-3 w-3 text-gray-400 shrink-0" />
              <span className="font-medium truncate">
                {almacenNombreMap.get(solicitud.almacen_destino_id) ||
                  "Almacén desconocido"}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {solicitud.items.length} material(es) ·{" "}
              {formatFecha(solicitud.fecha_solicitud)} · por{" "}
              {solicitud.solicitante}
            </div>
          </div>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.color} ${config.bg}`}
          >
            {config.label}
          </span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </button>

        {isExpanded && (
          <div className="px-3 pb-3 space-y-2 border-t border-black/10 pt-2">
            {/* Items table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b">
                    <th className="text-left py-1 pr-2">Material</th>
                    <th className="text-right py-1 px-2">Cantidad</th>
                    <th className="text-left py-1 pl-2">Ubicación</th>
                  </tr>
                </thead>
                <tbody>
                  {solicitud.items.map((item, i) => {
                    const mat = resolveMaterial(item)
                    const nombre = mat?.nombre || mat?.descripcion || item.material_codigo || item.material_id
                    const codigoReal = mat?.codigo || (item.material_codigo && item.material_codigo !== item.material_id ? item.material_codigo : undefined)
                    return (
                      <tr key={i} className="border-b border-black/5 last:border-0">
                        <td className="py-1 pr-2">
                          <div className="flex items-center gap-2">
                            {mat?.foto ? (
                              <img
                                src={mat.foto}
                                alt={nombre}
                                className="h-8 w-8 rounded object-contain border border-gray-200 bg-white shrink-0 p-0.5"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = "none"
                                }}
                              />
                            ) : (
                              <div className="h-8 w-8 rounded bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                                <Package className="h-4 w-4 text-gray-400" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="truncate">{nombre}</div>
                              {codigoReal && (
                                <div className="text-xs text-gray-400 font-mono">
                                  ({codigoReal})
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="text-right py-1 px-2 font-medium align-middle">
                          {item.cantidad}
                        </td>
                        <td className="py-1 pl-2 text-gray-500 align-middle">
                          {item.ubicacion_en_almacen || "—"}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Extra info */}
            {solicitud.motivo && (
              <p className="text-xs text-gray-600">
                <span className="font-medium">Motivo:</span>{" "}
                {solicitud.motivo}
              </p>
            )}
            {solicitud.referencia && (
              <p className="text-xs text-gray-600">
                <span className="font-medium">Referencia:</span>{" "}
                {solicitud.referencia}
              </p>
            )}
            {solicitud.aprobador && (
              <p className="text-xs text-gray-600">
                <span className="font-medium">
                  {solicitud.estado === "aprobada" ? "Aprobado" : "Denegado"}{" "}
                  por:
                </span>{" "}
                {solicitud.aprobador} ·{" "}
                {formatFecha(solicitud.fecha_resolucion)}
              </p>
            )}
            {solicitud.comentario_resolucion && (
              <p className="text-xs text-gray-600">
                <span className="font-medium">Comentario:</span>{" "}
                {solicitud.comentario_resolucion}
              </p>
            )}

            {/* Action buttons */}
            {canResolve && (
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={(e) => {
                    e.stopPropagation()
                    setResolveDialog({ solicitud, action: "aprobar" })
                  }}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Aprobar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation()
                    setResolveDialog({ solicitud, action: "denegar" })
                  }}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Denegar
                </Button>
              </div>
            )}

            {solicitud.estado === "procesando" && (
              <div className="flex flex-col gap-1 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={resolvingColgada === solicitud.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    void handleResolverColgada(solicitud)
                  }}
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${resolvingColgada === solicitud.id ? "animate-spin" : ""}`} />
                  {resolvingColgada === solicitud.id ? "Resolviendo..." : "Resolver (destrabar)"}
                </Button>
                <p className="text-[11px] text-gray-500">
                  Quedó bloqueada a mitad de una aprobación. Esto la libera para reintentar.
                </p>
              </div>
            )}

            {canEdit && (
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-300 text-amber-700 hover:bg-amber-50"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingSolicitud(solicitud)
                  }}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Editar
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5 text-amber-600" />
          Solicitudes de Traspaso
        </h3>
        <div className="flex items-center gap-2">
          <Select value={estadoFilter} onValueChange={setEstadoFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="pendiente">Pendientes</SelectItem>
              <SelectItem value="aprobada">Aprobadas</SelectItem>
              <SelectItem value="denegada">Denegadas</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchSolicitudes}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
          <span className="ml-2 text-gray-500">Cargando solicitudes...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Received requests */}
          {currentAlmacenId && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Recibidas ({recibidas.length})
              </h4>
              {recibidas.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4 border rounded-md border-dashed">
                  No hay solicitudes recibidas
                </p>
              ) : (
                <div className="space-y-2">
                  {recibidas.map((s) => renderSolicitudRow(s, true))}
                </div>
              )}
            </div>
          )}

          {/* Sent requests */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              {currentAlmacenId
                ? `Enviadas (${enviadas.length})`
                : `Todas (${enviadas.length})`}
            </h4>
            {enviadas.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4 border rounded-md border-dashed">
                No hay solicitudes enviadas
              </p>
            ) : (
              <div className="space-y-2">
                {enviadas.map((s) => renderSolicitudRow(s, false))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit dialog */}
      {editingSolicitud && (
        <SolicitudTransferenciaDialog
          open={!!editingSolicitud}
          onOpenChange={(open) => {
            if (!open) setEditingSolicitud(null)
          }}
          almacenes={almacenes}
          materiales={materiales}
          stock={[]}
          currentAlmacenId={currentAlmacenId}
          solicitud={editingSolicitud}
          onSuccess={() => {
            setEditingSolicitud(null)
            fetchSolicitudes()
            onResolved?.()
          }}
        />
      )}

      {/* Approve/Deny dialog */}
      <Dialog
        open={!!resolveDialog}
        onOpenChange={(open) => {
          if (!open) {
            setResolveDialog(null)
            setComentario("")
            setFaltantes([])
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {resolveDialog?.action === "aprobar"
                ? "Aprobar Solicitud de Traspaso"
                : "Denegar Solicitud de Traspaso"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {resolveDialog && (
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md space-y-1">
                <p>
                  <span className="font-medium">De:</span>{" "}
                  {almacenNombreMap.get(
                    resolveDialog.solicitud.almacen_origen_id,
                  ) || "—"}
                </p>
                <p>
                  <span className="font-medium">A:</span>{" "}
                  {almacenNombreMap.get(
                    resolveDialog.solicitud.almacen_destino_id,
                  ) || "—"}
                </p>
                <p>
                  <span className="font-medium">Materiales:</span>{" "}
                  {resolveDialog.solicitud.items.length} item(s)
                </p>
                <p>
                  <span className="font-medium">Solicitante:</span>{" "}
                  {resolveDialog.solicitud.solicitante}
                </p>
              </div>
            )}

            {faltantes.length > 0 && (
              <div className="text-sm bg-red-50 border border-red-200 p-3 rounded-md space-y-2">
                <p className="font-medium text-red-700">
                  No hay stock suficiente en el almacén origen para{" "}
                  {faltantes.length} material(es):
                </p>
                <ul className="space-y-2">
                  {faltantes.map((f) => (
                    <li
                      key={f.material_id}
                      className="flex items-center gap-3 bg-white rounded-md p-2 border border-red-100"
                    >
                      {f.foto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={f.foto}
                          alt={f.nombre || f.codigo}
                          className="h-10 w-10 rounded object-cover flex-shrink-0 border"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <Package className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">
                          {f.nombre || "(sin nombre)"}
                        </p>
                        <p className="text-xs text-gray-500">
                          Código: {f.codigo}
                        </p>
                      </div>
                      <div className="text-right text-xs flex-shrink-0">
                        <p className="text-red-600 font-medium">
                          Faltan{" "}
                          {Math.max(
                            0,
                            f.cantidad_solicitada - f.cantidad_disponible,
                          )}
                        </p>
                        <p className="text-gray-500">
                          {f.cantidad_disponible} / {f.cantidad_solicitada}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {resolveDialog?.action === "aprobar" && faltantes.length === 0 && (
              <div className="text-sm text-amber-700 bg-amber-50 p-3 rounded-md">
                Al aprobar, el stock se moverá automáticamente del almacén
                origen al destino.
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">
                Comentario (opcional)
              </label>
              <Textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Comentario sobre la decisión..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setResolveDialog(null)
                  setComentario("")
                }}
                disabled={resolving}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleResolve}
                disabled={resolving}
                className={
                  resolveDialog?.action === "aprobar"
                    ? "bg-green-600 hover:bg-green-700"
                    : ""
                }
                variant={
                  resolveDialog?.action === "denegar"
                    ? "destructive"
                    : "default"
                }
              >
                {resolving && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                {resolveDialog?.action === "aprobar" ? "Aprobar" : "Denegar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
