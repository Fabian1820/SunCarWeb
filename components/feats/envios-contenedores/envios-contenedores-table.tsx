"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/shared/atom/badge";
import { Button } from "@/components/shared/atom/button";
import {
  ENVIO_CONTENEDOR_ESTADO_LABELS,
  TIPO_ENVIO_LABELS,
  type EnvioContenedor,
  type EstadoEnvioContenedor,
} from "@/lib/types/feats/envios-contenedores/envio-contenedor-types";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Package,
  Plane,
  Ship,
  Trash2,
} from "lucide-react";

interface EnviosContenedoresTableProps {
  envios: EnvioContenedor[];
  onDelete?: (id: string) => void;
}

const getEstadoClassName = (estado: EstadoEnvioContenedor) => {
  if (estado === "recibido") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (estado === "cancelado") return "bg-red-50 text-red-700 border-red-200";
  return "bg-blue-50 text-blue-700 border-blue-200";
};

const formatDate = (value?: string) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const TipoIcon = ({ tipo }: { tipo?: string }) => {
  if (tipo === "maritimo") return <Ship className="h-3.5 w-3.5 text-cyan-600" />;
  if (tipo === "aereo") return <Plane className="h-3.5 w-3.5 text-sky-600" />;
  return null;
};

export function EnviosContenedoresTable({ envios, onDelete }: EnviosContenedoresTableProps) {
  const router = useRouter();
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (envios.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay envíos de contenedores</h3>
        <p className="text-gray-600">Registra el primer envío para comenzar el control logístico.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Nombre</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Tipo</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Descripción</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Fecha envío</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Llegada aprox.</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Estado</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Pagado</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Materiales</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {envios.map((envio) => {
            const isExpanded = Boolean(expandedRows[envio.id]);

            return (
              <Fragment key={envio.id}>
                <tr className="border-b border-gray-100 hover:bg-gray-50 align-top">
                  <td className="py-4 px-4">
                    <p className="font-medium text-gray-900">{envio.nombre}</p>
                  </td>
                  <td className="py-4 px-4">
                    {envio.tipo_envio ? (
                      <span className="flex items-center gap-1.5 text-sm text-gray-700">
                        <TipoIcon tipo={envio.tipo_envio} />
                        {TIPO_ENVIO_LABELS[envio.tipo_envio]}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <p className="text-sm text-gray-700 max-w-[240px]">
                      {envio.descripcion?.trim() || "-"}
                    </p>
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-700">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {formatDate(envio.fecha_envio)}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-700">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {formatDate(envio.fecha_llegada_aproximada)}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <Badge variant="outline" className={getEstadoClassName(envio.estado)}>
                      {ENVIO_CONTENEDOR_ESTADO_LABELS[envio.estado]}
                    </Badge>
                  </td>
                  <td className="py-4 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        envio.pagado
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-yellow-50 text-yellow-700 border border-yellow-200"
                      }`}
                    >
                      {envio.pagado ? "Pagado" : "Pendiente"}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-gray-300"
                      onClick={() => toggleRow(envio.id)}
                    >
                      {envio.materiales.length} materiales
                      {isExpanded ? (
                        <ChevronUp className="ml-2 h-4 w-4" />
                      ) : (
                        <ChevronDown className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-cyan-300 text-cyan-700 hover:bg-cyan-50 gap-1.5"
                        onClick={() => router.push(`/envio-contenedores/${envio.id}/ficha-costo`)}
                      >
                        <ClipboardList className="h-4 w-4" />
                        <span className="hidden lg:inline">Ficha de costo</span>
                      </Button>
                      {onDelete && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => onDelete(envio.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>

                {isExpanded && (
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <td className="px-4 pb-4" colSpan={9}>
                      <div className="rounded-md border border-gray-200 bg-white overflow-hidden">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-100">
                              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Código
                              </th>
                              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Material
                              </th>
                              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Cantidad
                              </th>
                              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                P. CIF
                              </th>
                              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                P. Venta calc.
                              </th>
                              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                P. Instaladora calc.
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {envio.materiales.map((material, index) => (
                              <tr
                                key={`${envio.id}-${material.material_id}-${index}`}
                                className="border-b border-gray-50 last:border-b-0"
                              >
                                <td className="py-2 px-3 text-sm text-gray-700">
                                  {material.material_codigo || "-"}
                                </td>
                                <td className="py-2 px-3 text-sm text-gray-700">
                                  {material.material_nombre}
                                </td>
                                <td className="py-2 px-3 text-sm text-gray-700">
                                  {material.cantidad}
                                </td>
                                <td className="py-2 px-3 text-sm text-gray-700">
                                  {material.precio_unitario_cif > 0
                                    ? `$${material.precio_unitario_cif.toFixed(2)}`
                                    : "-"}
                                </td>
                                <td className="py-2 px-3 text-sm text-gray-700">
                                  {material.precio_venta_calc != null
                                    ? `$${material.precio_venta_calc.toFixed(2)}`
                                    : "-"}
                                </td>
                                <td className="py-2 px-3 text-sm text-gray-700">
                                  {material.precio_instaladora_calc != null
                                    ? `$${material.precio_instaladora_calc.toFixed(2)}`
                                    : "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
