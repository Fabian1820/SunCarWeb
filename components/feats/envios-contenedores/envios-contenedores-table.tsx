"use client";

import { Fragment, useState } from "react";
import { Badge } from "@/components/shared/atom/badge";
import { Button } from "@/components/shared/atom/button";
import {
  ENVIO_CONTENEDOR_ESTADO_LABELS,
  type EnvioContenedor,
  type EstadoEnvioContenedor,
} from "@/lib/types/feats/envios-contenedores/envio-contenedor-types";
import { Calendar, ChevronDown, ChevronUp, Package } from "lucide-react";

interface EnviosContenedoresTableProps {
  envios: EnvioContenedor[];
}

const getEstadoClassName = (estado: EstadoEnvioContenedor) => {
  if (estado === "recibido") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (estado === "cancelado") {
    return "bg-red-50 text-red-700 border-red-200";
  }

  return "bg-blue-50 text-blue-700 border-blue-200";
};

const formatDate = (value?: string) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";

  return parsed.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export function EnviosContenedoresTable({ envios }: EnviosContenedoresTableProps) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (envios.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No hay envíos de contenedores
        </h3>
        <p className="text-gray-600">
          Registra el primer envío para comenzar el control logístico.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Nombre</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Descripción</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Fecha envío</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Llegada aprox.</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Estado</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Materiales</th>
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
                    <p className="text-sm text-gray-700 max-w-[320px]">
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
                    <Badge
                      variant="outline"
                      className={getEstadoClassName(envio.estado)}
                    >
                      {ENVIO_CONTENEDOR_ESTADO_LABELS[envio.estado]}
                    </Badge>
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
                </tr>

                {isExpanded && (
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <td className="px-4 pb-4" colSpan={6}>
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
