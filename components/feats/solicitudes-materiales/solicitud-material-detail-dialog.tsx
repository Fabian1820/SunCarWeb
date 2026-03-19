"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { Badge } from "@/components/shared/atom/badge";
import {
  Package,
  Warehouse,
  User,
  Calendar,
  Phone,
  MapPin,
  Hash,
  Briefcase,
  Ban,
  RotateCcw,
} from "lucide-react";
import type { SolicitudMaterial } from "@/lib/api-types";
import {
  formatFechaRecogida,
  getFechaRecogidaBadge,
} from "@/lib/utils/fecha-recogida";

interface SolicitudMaterialDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitud: SolicitudMaterial | null;
}

export function SolicitudMaterialDetailDialog({
  open,
  onOpenChange,
  solicitud,
}: SolicitudMaterialDetailDialogProps) {
  if (!solicitud) return null;
  const estado = solicitud.estado?.toLowerCase();
  const isUsada = estado === "usada";
  const isAnulada = estado === "anulada";

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  };
  const formatTraceId = (value?: string | null) =>
    value ? value.slice(-6).toUpperCase() : "-";

  const getMaterialName = (mat: SolicitudMaterial["materiales"][number]) =>
    mat.material?.nombre ||
    mat.material?.descripcion ||
    mat.material_descripcion ||
    mat.descripcion ||
    mat.material_codigo ||
    mat.codigo ||
    mat.material_id;

  const getMaterialCodigo = (mat: SolicitudMaterial["materiales"][number]) =>
    mat.material?.codigo || mat.material_codigo || mat.codigo || "";

  const getMaterialFoto = (mat: SolicitudMaterial["materiales"][number]) =>
    mat.material?.foto;

  const recogidaBadge = getFechaRecogidaBadge(solicitud.fecha_recogida);
  const recogidaBadgeClass =
    recogidaBadge.kind === "today" || recogidaBadge.kind === "unknown"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : recogidaBadge.kind === "tomorrow"
        ? "bg-blue-50 text-blue-700 border-blue-200"
        : recogidaBadge.kind === "future"
          ? "bg-amber-50 text-amber-700 border-amber-200"
          : "bg-red-50 text-red-700 border-red-200";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-purple-600" />
            Detalle de Solicitud
            <Badge
              variant="outline"
              className="ml-2 bg-purple-50 text-purple-700 border-purple-200 font-mono text-xs"
            >
              {solicitud.codigo || solicitud.id.slice(-6).toUpperCase()}
            </Badge>
            <Badge
              variant="outline"
              className={
                isUsada
                  ? "bg-orange-50 text-orange-700 border-orange-200"
                  : isAnulada
                    ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }
            >
              {isUsada ? "Usada" : isAnulada ? "Anulada" : "Nueva"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Fechas */}
          <div className="flex gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>Creado: {formatDate(solicitud.fecha_creacion)}</span>
            </div>
            {solicitud.fecha_actualizacion && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>
                  Actualizado: {formatDate(solicitud.fecha_actualizacion)}
                </span>
              </div>
            )}
          </div>

          {isAnulada ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1.5">
                <Ban className="h-4 w-4" />
                Datos de anulacion
              </h3>
              <div className="space-y-1.5 text-sm text-red-800">
                <p>
                  Motivo:{" "}
                  <span className="font-medium">
                    {solicitud.motivo_anulacion || "No especificado"}
                  </span>
                </p>
                <p>
                  Anulada por CI:{" "}
                  <span className="font-medium">
                    {solicitud.anulada_por_ci || "-"}
                  </span>
                </p>
                <p>
                  Fecha anulacion:{" "}
                  <span className="font-medium">
                    {formatDate(solicitud.anulada_en || undefined)}
                  </span>
                </p>
              </div>
            </div>
          ) : null}

          {(solicitud.solicitud_origen_id ||
            solicitud.solicitud_reabierta_id) && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-1.5">
                <RotateCcw className="h-4 w-4" />
                Trazabilidad de reapertura
              </h3>
              <div className="space-y-1.5 text-sm text-emerald-800">
                <p>
                  Solicitud origen:{" "}
                  <span className="font-mono font-medium">
                    {formatTraceId(solicitud.solicitud_origen_id)}
                  </span>
                </p>
                <p>
                  Solicitud reabierta:{" "}
                  <span className="font-mono font-medium">
                    {formatTraceId(solicitud.solicitud_reabierta_id)}
                  </span>
                </p>
                <p>
                  Reabierta por CI:{" "}
                  <span className="font-medium">
                    {solicitud.reabierta_por_ci || "-"}
                  </span>
                </p>
                <p>
                  Fecha reapertura:{" "}
                  <span className="font-medium">
                    {formatDate(solicitud.reabierta_en || undefined)}
                  </span>
                </p>
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-gray-500" />
              Recogida
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Fecha:</span>
                <span className="font-medium text-gray-900">
                  {formatFechaRecogida(solicitud.fecha_recogida)}
                </span>
                <Badge
                  variant="outline"
                  className={`text-xs ${recogidaBadgeClass}`}
                >
                  {recogidaBadge.label}
                </Badge>
              </div>
              <div>
                <span className="text-gray-500">Responsable:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {solicitud.responsable_recogida || "Sin responsable"}
                </span>
              </div>
            </div>
          </div>

          {/* Cliente */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
              <User className="h-4 w-4 text-gray-500" />
              Cliente
            </h3>
            {solicitud.cliente ? (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Nombre:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {solicitud.cliente.nombre || "—"}
                  </span>
                </div>
                {solicitud.cliente.numero && (
                  <div>
                    <span className="text-gray-500">N° Cliente:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {solicitud.cliente.numero}
                    </span>
                  </div>
                )}
                {solicitud.cliente.telefono && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3 text-gray-400" />
                    <span className="text-gray-700">
                      {solicitud.cliente.telefono}
                    </span>
                  </div>
                )}
                {solicitud.cliente.direccion && (
                  <div className="flex items-center gap-1 col-span-2">
                    <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-700">
                      {solicitud.cliente.direccion}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">
                Sin cliente asignado
              </p>
            )}
          </div>

          {/* Almacén y Creador */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                <Warehouse className="h-4 w-4 text-gray-500" />
                Almacén
              </h3>
              {solicitud.almacen ? (
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-gray-900">
                    {solicitud.almacen.nombre}
                  </p>
                  {solicitud.almacen.codigo && (
                    <div className="flex items-center gap-1 text-gray-500">
                      <Hash className="h-3 w-3" />
                      <span>{solicitud.almacen.codigo}</span>
                    </div>
                  )}
                  {solicitud.almacen.responsable && (
                    <p className="text-gray-500">
                      Resp.: {solicitud.almacen.responsable}
                    </p>
                  )}
                  {solicitud.almacen.direccion && (
                    <div className="flex items-center gap-1 text-gray-500">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span>{solicitud.almacen.direccion}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400">—</p>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                <User className="h-4 w-4 text-gray-500" />
                Creado por
              </h3>
              {solicitud.trabajador ? (
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-gray-900">
                    {solicitud.trabajador.nombre || "—"}
                  </p>
                  {solicitud.trabajador.ci && (
                    <div className="flex items-center gap-1 text-gray-500">
                      <Hash className="h-3 w-3" />
                      <span>CI: {solicitud.trabajador.ci}</span>
                    </div>
                  )}
                  {solicitud.trabajador.cargo && (
                    <div className="flex items-center gap-1 text-gray-500">
                      <Briefcase className="h-3 w-3" />
                      <span>{solicitud.trabajador.cargo}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400">—</p>
              )}
            </div>
          </div>

          {/* Materiales */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
              <Package className="h-4 w-4 text-gray-500" />
              Materiales
              <Badge
                variant="outline"
                className="ml-1 bg-blue-50 text-blue-700 border-blue-200 text-xs"
              >
                {solicitud.materiales?.length || 0} items
              </Badge>
            </h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left py-2 px-3 font-medium text-gray-700">
                      Material
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700 w-20">
                      UM
                    </th>
                    <th className="text-right py-2 px-3 font-medium text-gray-700 w-24">
                      Cantidad
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(solicitud.materiales || []).map((mat, idx) => {
                    const foto = getMaterialFoto(mat);
                    const nombre = getMaterialName(mat);
                    const codigo = getMaterialCodigo(mat);
                    return (
                      <tr
                        key={idx}
                        className="border-b last:border-b-0 hover:bg-gray-50"
                      >
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            {foto ? (
                              <img
                                src={foto}
                                alt={nombre}
                                className="h-9 w-9 rounded object-cover border border-gray-200 flex-shrink-0"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display =
                                    "none";
                                }}
                              />
                            ) : (
                              <div className="h-9 w-9 rounded bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                                <Package className="h-4 w-4 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-900 leading-tight">
                                {nombre}
                              </p>
                              {codigo && (
                                <p className="text-xs text-gray-400">
                                  {codigo}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-gray-500">
                          {mat.um || mat.material?.um || "U"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-gray-900">
                          {mat.cantidad}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
