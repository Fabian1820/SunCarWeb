"use client";

import { useEffect, useState } from "react";
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
  Paperclip,
  Download,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/shared/atom/button";
import type { DevolucionValeResumen, ValeSalida } from "@/lib/api-types";
import { DevolucionValeService } from "@/lib/api-services";
import {
  formatFechaRecogida,
  getFechaRecogidaBadge,
} from "@/lib/utils/fecha-recogida";
import { parseFechaUtc } from "@/lib/utils/fecha-utc";
import {
  DEVOLUCION_PARCIAL_CLASS,
  esDevolucionParcial,
  getValeEstadoInfo,
} from "@/lib/utils/vale-salida-estado";
import { claveSerie } from "@/lib/utils/numeros-serie";

interface ValeSalidaDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vale: ValeSalida | null;
  onRegistrarDevolucion?: (vale: ValeSalida) => void;
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

const fmtCantidad = (valor: number) =>
  Number.isInteger(valor) ? String(valor) : valor.toFixed(2);

export function ValeSalidaDetailDialog({
  open,
  onOpenChange,
  vale,
  onRegistrarDevolucion,
}: ValeSalidaDetailDialogProps) {
  // Lo devuelto de cada material no viene en el vale: se pide aparte al abrir el
  // detalle. Si falla, el detalle se ve igual, solo que sin el desglose.
  const [resumenDevolucion, setResumenDevolucion] =
    useState<DevolucionValeResumen | null>(null);
  const valeId = vale?.id;
  useEffect(() => {
    setResumenDevolucion(null);
    if (!open || !valeId) return;
    let cancelado = false;
    DevolucionValeService.getResumenPorVale(valeId)
      .then((resumen) => {
        if (!cancelado) setResumenDevolucion(resumen);
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [open, valeId]);

  if (!vale) return null;

  const devueltoPorMaterial = new Map<string, number>();
  // Series que ya volvieron al almacén, para tacharlas en la tabla.
  const seriesDevueltas = new Set<string>();
  for (const m of resumenDevolucion?.materiales ?? []) {
    devueltoPorMaterial.set(String(m.material_id), Number(m.cantidad_devuelta) || 0);
    for (const s of m.numeros_serie_devueltos ?? []) {
      seriesDevueltas.add(`${m.material_id}|${claveSerie(s)}`);
    }
  }
  const totalDevuelto = Array.from(devueltoPorMaterial.values()).reduce(
    (acc, n) => acc + n,
    0,
  );
  const totalSalida = (resumenDevolucion?.materiales ?? []).reduce(
    (acc, m) => acc + (Number(m.cantidad_salida) || 0),
    0,
  );
  const hayDevoluciones = totalDevuelto > 0;
  const estadoInfo = getValeEstadoInfo(vale.estado);
  const devolucionParcial = esDevolucionParcial(vale.estado, hayDevoluciones);

  const solicitud =
    vale.solicitud_material || vale.solicitud_venta || vale.solicitud;
  const solicitudTipo = getSolicitudTipo(vale);
  const tipoStyles = getTipoStyles(solicitudTipo);
  const adjuntos = vale.adjuntos ?? [];

  const formatDate = (dateStr?: string) => {
    const fecha = parseFechaUtc(dateStr);
    if (!fecha) return "-";
    return fecha.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
  const valeBloqueadoDevolucion =
    vale.estado === "anulado" || vale.estado === "devuelto";
  // Las solicitudes de venta no traen fecha_recogida y el resumen del vale
  // tampoco incluye fecha_creacion, asi que en ese caso queda sin fecha.
  const recogidaFecha = solicitud?.fecha_recogida || null;
  const recogidaBadge = getFechaRecogidaBadge(recogidaFecha);
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
            <FileOutput className="h-5 w-5 text-emerald-600" />
            Detalle de Vale de Salida
            <Badge
              variant="outline"
              className="ml-2 bg-emerald-50 text-emerald-700 border-emerald-200 font-mono text-xs"
            >
              {vale.codigo || vale.id.slice(-6).toUpperCase()}
            </Badge>
            <Badge variant="outline" className={tipoStyles}>
              {solicitudTipo === "venta" ? "Venta" : "Material"}
            </Badge>
            <Badge variant="outline" className={estadoInfo.className}>
              {estadoInfo.label}
            </Badge>
            {devolucionParcial ? (
              <Badge variant="outline" className={DEVOLUCION_PARCIAL_CLASS}>
                Devolución parcial
              </Badge>
            ) : null}
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

          {hayDevoluciones ? (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <Undo2 className="h-4 w-4 shrink-0" />
              <span>
                {vale.estado === "devuelto"
                  ? "Este vale fue devuelto completamente."
                  : "Este vale tiene devoluciones parciales."}{" "}
                Devuelto: <strong>{fmtCantidad(totalDevuelto)}</strong> de{" "}
                <strong>{fmtCantidad(totalSalida)}</strong> unidades.
              </span>
            </div>
          ) : null}

          {onRegistrarDevolucion ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="text-sm text-blue-800">
                Registre devoluciones de materiales para este vale.
              </p>
              <Button
                type="button"
                onClick={() => onRegistrarDevolucion(vale)}
                disabled={valeBloqueadoDevolucion}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                title={
                  vale.estado === "anulado"
                    ? "No se puede devolver en un vale anulado"
                    : vale.estado === "devuelto"
                      ? "El vale ya fue devuelto completamente"
                      : "Registrar devolucion"
                }
              >
                <Undo2 className="h-4 w-4 mr-2" />
                Registrar devolucion
              </Button>
            </div>
          ) : null}

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
                        {formatFechaRecogida(recogidaFecha)}
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
                    {hayDevoluciones ? (
                      <th className="text-right py-2 px-3 font-medium text-gray-700 w-24">
                        Devuelto
                      </th>
                    ) : null}
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
                    const devuelto =
                      devueltoPorMaterial.get(String(mat.material_id)) ?? 0;
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
                        {hayDevoluciones ? (
                          <td className="py-2.5 px-3 text-right font-semibold text-amber-700">
                            {devuelto > 0 ? (
                              fmtCantidad(devuelto)
                            ) : (
                              <span className="text-xs font-normal text-gray-400">
                                -
                              </span>
                            )}
                          </td>
                        ) : null}
                        <td className="py-2.5 px-3">
                          {(mat.numeros_serie?.length ?? 0) > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {mat.numeros_serie!.map((serie) => {
                                const devuelta = seriesDevueltas.has(
                                  `${mat.material_id}|${claveSerie(serie)}`,
                                );
                                return (
                                  <span
                                    key={serie}
                                    title={devuelta ? "Devuelta al almacén" : undefined}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-mono ${
                                      devuelta
                                        ? "bg-gray-50 text-gray-400 border-gray-200 line-through"
                                        : "bg-blue-50 text-blue-700 border-blue-200"
                                    }`}
                                  >
                                    <Hash className="h-3 w-3" />
                                    {serie}
                                  </span>
                                );
                              })}
                            </div>
                          ) : mat.numero_serie ? (
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

          {/* Documentos adjuntos (solo lectura).
              Subir, reemplazar y borrar se hacen desde el boton del clip en la
              columna Acciones: este dialogo es de consulta. */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Paperclip className="h-4 w-4 text-gray-500" />
              <h4 className="text-sm font-semibold text-gray-900">
                Documentos adjuntos
              </h4>
              {adjuntos.length > 0 ? (
                <Badge
                  variant="outline"
                  className="bg-emerald-50 text-emerald-700 border-emerald-200"
                >
                  {adjuntos.length}
                </Badge>
              ) : null}
            </div>

            {adjuntos.length === 0 ? (
              <p className="text-sm text-gray-500 rounded-lg border border-dashed border-gray-300 px-3 py-4 text-center">
                Sin el vale firmado adjunto. Se adjunta desde el boton del clip
                en la lista de vales.
              </p>
            ) : (
              <ul className="space-y-2">
                {adjuntos.map((adjunto) => {
                  const esImagen =
                    adjunto.tipo === "imagen" ||
                    !!adjunto.mime_type?.startsWith("image/");
                  return (
                    <li
                      key={adjunto.id}
                      className="flex items-center gap-3 rounded-lg border border-gray-200 p-2.5"
                    >
                      <div className="h-10 w-10 rounded bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                        {esImagen ? (
                          <ImageIcon className="h-4 w-4 text-gray-400" />
                        ) : (
                          <FileText className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {adjunto.nombre}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(adjunto.created_at)}
                          {adjunto.origen === "movil" ? " · desde el movil" : ""}
                        </p>
                      </div>
                      {adjunto.download_url ? (
                        <a
                          href={adjunto.download_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 flex-shrink-0"
                          title="Abrir o descargar"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
