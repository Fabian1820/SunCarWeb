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
} from "lucide-react"
import { InventarioService } from "@/lib/api-services"
import type {
  Almacen,
  SolicitudTransferencia,
  SolicitudTransferenciaEstado,
} from "@/lib/inventario-types"
import type { Material } from "@/lib/material-types"
import { useAuth } from "@/contexts/auth-context"

interface SolicitudesTransferenciaTableProps {
  almacenes: Almacen[]
  materiales: Material[]
  currentAlmacenId?: string
  onResolved?: () => void
}

const ESTADO_CONFIG: Record<
  SolicitudTransferenciaEstado,
  { label: string; icon: typeof Clock; color: string; bg: string }
> = {
  pendiente: {
    label: "Pendiente",
    icon: Clock,
    color: "text-yellow-700",
    bg: "bg-yellow-50 border-yellow-200",
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
    } finally {
      setResolving(false)
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

  const getMaterialNombre = (item: { material_id: string; material_codigo?: string }) => {
    const mat =
      materialMap.byId.get(item.material_id) ||
      materialMap.byCodigo.get(item.material_codigo || "")
    return mat?.descripcion || mat?.nombre || item.material_codigo || item.material_id
  }

  const renderSolicitudRow = (
    solicitud: SolicitudTransferencia,
    isReceived: boolean,
  ) => {
    const config = ESTADO_CONFIG[solicitud.estado]
    const Icon = config.icon
    const isExpanded = expandedId === solicitud.id
    const canResolve = isReceived && solicitud.estado === "pendiente"

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
                  {solicitud.items.map((item, i) => (
                    <tr key={i} className="border-b border-black/5 last:border-0">
                      <td className="py-1 pr-2">
                        {getMaterialNombre(item)}
                        {item.material_codigo && (
                          <span className="text-xs text-gray-400 ml-1">
                            ({item.material_codigo})
                          </span>
                        )}
                      </td>
                      <td className="text-right py-1 px-2 font-medium">
                        {item.cantidad}
                      </td>
                      <td className="py-1 pl-2 text-gray-500">
                        {item.ubicacion_en_almacen || "—"}
                      </td>
                    </tr>
                  ))}
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

      {/* Approve/Deny dialog */}
      <Dialog
        open={!!resolveDialog}
        onOpenChange={(open) => {
          if (!open) {
            setResolveDialog(null)
            setComentario("")
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

            {resolveDialog?.action === "aprobar" && (
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
