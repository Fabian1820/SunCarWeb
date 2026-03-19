"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { Badge } from "@/components/shared/atom/badge";
import {
  ClipboardList,
  Package,
  User,
  Warehouse,
  Ban,
  RotateCcw,
} from "lucide-react";
import type { SolicitudVenta } from "@/lib/api-types";

interface SolicitudVentaDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitud: SolicitudVenta | null;
}

export function SolicitudVentaDetailDialog({
  open,
  onOpenChange,
  solicitud,
}: SolicitudVentaDetailDialogProps) {
  if (!solicitud) return null;

  const formatDate = (value?: string) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const estado = solicitud.estado?.toLowerCase();
  const isUsada = estado === "usada";
  const isAnulada = estado === "anulada";
  const formatTraceId = (value?: string | null) =>
    value ? value.slice(-6).toUpperCase() : "-";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-indigo-600" />
            Detalle de solicitud de venta
            <Badge
              variant="outline"
              className="ml-2 bg-indigo-50 text-indigo-700 border-indigo-200 font-mono"
            >
              {solicitud.codigo || solicitud.id.slice(-6).toUpperCase()}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h3 className="text-sm font-semibold text-gray-700">
                Cliente venta
              </h3>
              <p className="text-sm font-medium text-gray-900">
                {solicitud.cliente_venta?.nombre || "-"}
              </p>
              <p className="text-sm text-gray-600">
                Numero: {solicitud.cliente_venta?.numero || "-"}
              </p>
              <p className="text-sm text-gray-600">
                Telefono: {solicitud.cliente_venta?.telefono || "-"}
              </p>
              <p className="text-sm text-gray-600">
                CI: {solicitud.cliente_venta?.ci || "-"}
              </p>
              <p className="text-sm text-gray-600">
                Direccion: {solicitud.cliente_venta?.direccion || "-"}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h3 className="text-sm font-semibold text-gray-700">
                Meta datos
              </h3>
              <p className="text-sm text-gray-600 flex items-center gap-1.5">
                <Warehouse className="h-4 w-4 text-gray-400" />
                Almacen: {solicitud.almacen?.nombre || "-"}
              </p>
              <p className="text-sm text-gray-600 flex items-center gap-1.5">
                <User className="h-4 w-4 text-gray-400" />
                Trabajador: {solicitud.trabajador?.nombre || "-"}
              </p>
              <p className="text-sm text-gray-600">
                Estado:{" "}
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
              </p>
              <p className="text-sm text-gray-600">
                Creada: {formatDate(solicitud.fecha_creacion)}
              </p>
              <p className="text-sm text-gray-600">
                Actualizada: {formatDate(solicitud.fecha_actualizacion)}
              </p>
            </div>
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

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Package className="h-4 w-4 text-gray-500" />
              Materiales
              <Badge
                variant="outline"
                className="bg-blue-50 text-blue-700 border-blue-200"
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
                    <th className="text-left py-2 px-3 font-medium text-gray-700 w-24">
                      Codigo
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
                  {(solicitud.materiales || []).map((material, index) => (
                    <tr
                      key={index}
                      className="border-b last:border-b-0 hover:bg-gray-50"
                    >
                      <td className="py-2 px-3 text-gray-900 font-medium">
                        {material.material?.nombre ||
                          material.material?.descripcion ||
                          material.material_descripcion ||
                          material.descripcion ||
                          "-"}
                      </td>
                      <td className="py-2 px-3 text-gray-600 font-mono text-xs">
                        {material.material?.codigo ||
                          material.material_codigo ||
                          material.codigo ||
                          "-"}
                      </td>
                      <td className="py-2 px-3 text-gray-600">
                        {material.material?.um || material.um || "-"}
                      </td>
                      <td className="py-2 px-3 text-right text-gray-900 font-semibold">
                        {material.cantidad}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
