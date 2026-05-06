"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { Badge } from "@/components/shared/atom/badge";
import { Button } from "@/components/shared/atom/button";
import {
  ClipboardList,
  Package,
  User,
  Warehouse,
  Ban,
  RotateCcw,
  CreditCard,
} from "lucide-react";
import type { SolicitudVenta } from "@/lib/api-types";
import { GenerarLinkPagoSolicitudButton } from "./generar-link-pago-solicitud-button";

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
          <div className="flex items-center justify-between">
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
            <GenerarLinkPagoSolicitudButton
              solicitud={solicitud}
              variant="default"
              size="sm"
              showIcon={true}
            />
          </div>
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
              <div className="text-sm text-gray-600 flex items-center gap-1.5">
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
              </div>
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
            <div className="border rounded-lg overflow-x-auto">
              <table className="text-sm" style={{ minWidth: "580px" }}>
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left py-2 px-3 font-medium text-gray-700">Material</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-700 w-16">Cant.</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-700 w-24">P. Unit.</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-700 w-24">Desc.</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-700 w-24">P. c/desc.</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-700 w-24">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(solicitud.materiales || []).map((material, index) => {
                    const nombre =
                      material.material?.nombre ||
                      material.material?.descripcion ||
                      material.material_descripcion ||
                      material.descripcion || "-";
                    const codigo =
                      material.material?.codigo ||
                      material.material_codigo ||
                      material.codigo || "";
                    const um = material.material?.um || material.um || "";
                    const tieneDescuento = (material.descuento_porcentaje ?? 0) > 0;

                    return (
                      <tr key={index} className="border-b last:border-b-0 hover:bg-gray-50">
                        <td className="py-2 px-3">
                          <p className="font-medium text-gray-900 truncate max-w-[180px]" title={nombre}>{nombre}</p>
                          <p className="text-xs text-gray-400">{[codigo, um].filter(Boolean).join(" · ")}</p>
                        </td>
                        <td className="py-2 px-3 text-center text-gray-900 font-semibold">{material.cantidad}</td>
                        <td className="py-2 px-3 text-right text-gray-700">
                          {material.precio != null ? `$${material.precio.toFixed(2)}` : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {tieneDescuento ? (
                            <span className="text-orange-600">
                              {material.descuento_porcentaje}%
                              {material.precio != null && (
                                <span className="text-xs text-gray-400 ml-1">
                                  (${(material.precio * (material.descuento_porcentaje ?? 0) / 100).toFixed(2)})
                                </span>
                              )}
                            </span>
                          ) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="py-2 px-3 text-right text-gray-700">
                          {material.precio_con_descuento != null
                            ? `$${material.precio_con_descuento.toFixed(2)}`
                            : material.precio != null
                            ? `$${material.precio.toFixed(2)}`
                            : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-gray-900">
                          {material.subtotal != null
                            ? `$${material.subtotal.toFixed(2)}`
                            : <span className="text-gray-400">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {(solicitud.precio_total ?? 0) > 0 && (
                  <tfoot>
                    <tr className="bg-gray-50 border-t">
                      <td colSpan={5} className="py-2 px-3 text-right text-sm font-semibold text-gray-700">Total</td>
                      <td className="py-2 px-3 text-right font-bold text-gray-900">${(solicitud.precio_total ?? 0).toFixed(2)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
