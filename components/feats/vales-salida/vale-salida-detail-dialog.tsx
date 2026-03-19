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
  User,
  Calendar,
  Hash,
  Briefcase,
  FileOutput,
  FileText,
  Undo2,
} from "lucide-react";
import type { ValeSalida } from "@/lib/api-types";
import {
  formatFechaRecogida,
  getFechaRecogidaBadge,
} from "@/lib/utils/fecha-recogida";

interface ValeSalidaDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vale: ValeSalida | null;
}

const getSolicitudTipo = (vale: ValeSalida): "material" | "venta" => {
  if (vale.solicitud_tipo === "venta") return "venta";
  if (vale.solicitud_venta_id || vale.solicitud_venta) return "venta";
  return "material";
};

const getTipoStyles = (tipo: "material" | "venta") =>
  tipo === "venta"
    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
    : "bg-amber-50 text-amber-700 border-amber-200";

const getEstadoStyles = (estado?: string) =>
  estado === "anulado"
    ? "bg-red-50 text-red-700 border-red-200"
    : "bg-emerald-50 text-emerald-700 border-emerald-200";

export function ValeSalidaDetailDialog({
  open,
  onOpenChange,
  vale,
}: ValeSalidaDetailDialogProps) {
  if (!vale) return null;

  const solicitud =
    vale.solicitud_material || vale.solicitud_venta || vale.solicitud;
  const solicitudTipo = getSolicitudTipo(vale);
  const tipoStyles = getTipoStyles(solicitudTipo);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "-";
    }
  };

  const getMaterialName = (mat: ValeSalida["materiales"][number]) =>
    mat.material?.nombre ||
    mat.material?.descripcion ||
    mat.material_descripcion ||
    mat.descripcion ||
    mat.material_codigo ||
    mat.codigo ||
    mat.material_id;

  const getMaterialCodigo = (mat: ValeSalida["materiales"][number]) =>
    mat.material?.codigo || mat.material_codigo || mat.codigo || "";

  const getMaterialFoto = (mat: ValeSalida["materiales"][number]) =>
    mat.material?.foto;

  const solicitudCodigo =
    solicitud?.codigo ||
    vale.solicitud_material_id?.slice(-6).toUpperCase() ||
    vale.solicitud_venta_id?.slice(-6).toUpperCase() ||
    vale.solicitud_id?.slice(-6).toUpperCase();

  const solicitudCliente =
    solicitud?.cliente_venta?.nombre || solicitud?.cliente?.nombre;
  const recogidaResponsable =
    vale.recogido_por || solicitud?.responsable_recogida || null;
  const recogidaBadge = getFechaRecogidaBadge(solicitud?.fecha_recogida);
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
            <FileOutput className="h-5 w-5 text-orange-600" />
            Detalle de Vale de Salida
            <Badge
              variant="outline"
              className="ml-2 bg-orange-50 text-orange-700 border-orange-200 font-mono text-xs"
            >
              {vale.codigo || vale.id.slice(-6).toUpperCase()}
            </Badge>
            <Badge variant="outline" className={tipoStyles}>
              {solicitudTipo === "venta" ? "Venta" : "Material"}
            </Badge>
            <Badge variant="outline" className={getEstadoStyles(vale.estado)}>
              {vale.estado === "anulado" ? "Anulado" : "Usado"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="flex gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>Creado: {formatDate(vale.fecha_creacion)}</span>
            </div>
            {vale.fecha_actualizacion ? (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>Actualizado: {formatDate(vale.fecha_actualizacion)}</span>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-gray-500" />
                Solicitud
              </h3>
              {solicitud ? (
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-1">
                    <Hash className="h-3 w-3 text-gray-400" />
                    <span className="font-medium text-gray-900 font-mono">
                      {solicitudCodigo}
                    </span>
                  </div>
                  {solicitudCliente ? (
                    <p className="text-gray-600">
                      Cliente:{" "}
                      <span className="font-medium">{solicitudCliente}</span>
                    </p>
                  ) : null}
                  {solicitud.almacen?.nombre ? (
                    <p className="text-gray-500">
                      Almacen: {solicitud.almacen.nombre}
                    </p>
                  ) : null}
                  {solicitud.estado ? (
                    <Badge variant="outline" className="text-xs mt-1">
                      {solicitud.estado}
                    </Badge>
                  ) : null}
                  {solicitud.motivo_anulacion ? (
                    <p className="text-red-700 text-xs mt-1">
                      Motivo anulacion solicitud: {solicitud.motivo_anulacion}
                    </p>
                  ) : null}
                  <div className="pt-1 border-t border-gray-200 mt-2">
                    <p className="text-gray-600">
                      Recogida:{" "}
                      <span className="font-medium text-gray-900">
                        {formatFechaRecogida(solicitud.fecha_recogida)}
                      </span>
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[11px] ${recogidaBadgeClass}`}
                      >
                        {recogidaBadge.label}
                      </Badge>
                      <span className="text-xs text-gray-600">
                        {recogidaResponsable || "Sin responsable"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">-</p>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                <User className="h-4 w-4 text-gray-500" />
                Creado por
              </h3>
              {vale.trabajador ? (
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-gray-900">
                    {vale.trabajador.nombre || "-"}
                  </p>
                  {vale.trabajador.ci ? (
                    <div className="flex items-center gap-1 text-gray-500">
                      <Hash className="h-3 w-3" />
                      <span>CI: {vale.trabajador.ci}</span>
                    </div>
                  ) : null}
                  {vale.trabajador.cargo ? (
                    <div className="flex items-center gap-1 text-gray-500">
                      <Briefcase className="h-3 w-3" />
                      <span>{vale.trabajador.cargo}</span>
                    </div>
                  ) : null}
                </div>
              ) : vale.creado_por_ci ? (
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-1 text-gray-500">
                    <Hash className="h-3 w-3" />
                    <span>CI: {vale.creado_por_ci}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">-</p>
              )}
            </div>
          </div>

          {vale.estado === "anulado" ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1.5">
                <Undo2 className="h-4 w-4" />
                Anulacion
              </h3>
              <div className="space-y-2 text-sm">
                <p className="text-red-800">
                  Motivo:{" "}
                  <span className="font-medium">
                    {vale.motivo_anulacion || "No especificado"}
                  </span>
                </p>
                <p className="text-red-700">
                  La solicitud asociada tambien queda anulada con el mismo
                  motivo.
                </p>
                {vale.movimientos_ids?.length ? (
                  <p className="text-red-700">
                    Movimientos generados: {vale.movimientos_ids.length}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
              <Package className="h-4 w-4 text-gray-500" />
              Materiales
              <Badge
                variant="outline"
                className="ml-1 bg-blue-50 text-blue-700 border-blue-200 text-xs"
              >
                {vale.total_materiales ?? vale.materiales?.length ?? 0} items
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
                    <th className="text-left py-2 px-3 font-medium text-gray-700 w-32">
                      N° Series
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(vale.materiales || []).map((mat, idx) => {
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
                                onError={(event) => {
                                  (
                                    event.target as HTMLImageElement
                                  ).style.display = "none";
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
                              {codigo ? (
                                <p className="text-xs text-gray-400">
                                  {codigo}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-gray-500">
                          {mat.um || mat.material?.um || "U"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-gray-900">
                          {mat.cantidad}
                        </td>
                        <td className="py-2.5 px-3">
                          {mat.numero_serie ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-xs font-mono">
                              <Hash className="h-3 w-3" />
                              {mat.numero_serie}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
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
