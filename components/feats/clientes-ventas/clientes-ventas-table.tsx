"use client";

import React from "react";
import { Badge } from "@/components/shared/atom/badge";
import { Button } from "@/components/shared/atom/button";
import {
  ChevronDown,
  ChevronRight,
  MapPin,
  Pencil,
  Phone,
  ShoppingCart,
  Trash2,
  UserRound,
} from "lucide-react";
import type { ClienteVenta } from "@/lib/api-types";
import { useState } from "react";
import { ClienteValesRow } from "./cliente-vales-row";

interface ClientesVentasTableProps {
  clientes: ClienteVenta[];
  onEdit?: (cliente: ClienteVenta) => void;
  onDelete?: (cliente: ClienteVenta) => void;
  onAgregarOferta?: (cliente: ClienteVenta) => void;
}

export function ClientesVentasTable({
  clientes,
  onEdit,
  onDelete,
  onAgregarOferta,
}: ClientesVentasTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (clienteId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(clienteId)) {
        newSet.delete(clienteId);
      } else {
        newSet.add(clienteId);
      }
      return newSet;
    });
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

  if (clientes.length === 0) {
    return (
      <div className="text-center py-12">
        <UserRound className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No hay clientes ventas registrados
        </h3>
        <p className="text-gray-600">
          Crea un cliente venta para comenzar a generar solicitudes de ventas.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* ═══ MOBILE: lista de cards ═══════════════════════════════ */}
      <div className="md:hidden space-y-3">
        {clientes.map((cliente) => {
          const isExpanded = expandedRows.has(cliente.id);
          const ubicacion = [cliente.provincia, cliente.municipio, cliente.direccion]
            .filter(Boolean)
            .join(" · ");
          return (
            <div
              key={cliente.id}
              className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden"
            >
              {/* header del card */}
              <div className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => toggleRow(cliente.id)}
                    className="flex items-start gap-2 min-w-0 flex-1 text-left touch-manipulation -m-1 p-1 rounded-md active:bg-gray-50"
                    aria-label="Ver vales de salida"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 mt-1 text-gray-500 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 mt-1 text-gray-500 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <Badge
                        variant="outline"
                        className="bg-teal-50 text-teal-700 border-teal-200 font-mono text-[11px] mb-1"
                      >
                        {cliente.numero || cliente.id.slice(-6).toUpperCase()}
                      </Badge>
                      <p className="font-semibold text-gray-900 text-sm break-words leading-tight">
                        {cliente.nombre}
                      </p>
                    </div>
                  </button>
                </div>

                {/* datos: telefono + CI */}
                {(cliente.telefono || cliente.ci) && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
                    {cliente.telefono && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3 text-gray-400 shrink-0" />
                        <span>{cliente.telefono}</span>
                      </span>
                    )}
                    {cliente.ci && (
                      <span className="inline-flex items-center gap-1">
                        <span className="text-gray-400">CI:</span>
                        <span className="font-mono">{cliente.ci}</span>
                      </span>
                    )}
                  </div>
                )}

                {/* comercial */}
                <div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-teal-50 text-teal-700 border border-teal-200">
                    <UserRound className="h-3 w-3" />
                    {cliente.comercial || "SunCar"}
                  </span>
                </div>

                {/* ubicación */}
                {ubicacion && (
                  <div className="flex items-start gap-1.5 text-xs text-gray-600">
                    <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
                    <span className="break-words">{ubicacion}</span>
                  </div>
                )}

                {/* fecha */}
                {cliente.fecha_creacion && (
                  <p className="text-[11px] text-gray-400">
                    Creado: {formatDate(cliente.fecha_creacion)}
                  </p>
                )}
              </div>

              {/* acciones — botones a ancho completo */}
              <div className="grid grid-cols-3 border-t border-gray-200 divide-x divide-gray-200">
                {onAgregarOferta && (
                  <button
                    type="button"
                    onClick={() => onAgregarOferta(cliente)}
                    className="h-11 flex items-center justify-center gap-1.5 text-teal-700 text-xs font-medium active:bg-teal-50 touch-manipulation"
                    title="Agregar oferta"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    <span>Oferta</span>
                  </button>
                )}
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(cliente)}
                    className="h-11 flex items-center justify-center gap-1.5 text-blue-700 text-xs font-medium active:bg-blue-50 touch-manipulation"
                    title="Editar cliente"
                  >
                    <Pencil className="h-4 w-4" />
                    <span>Editar</span>
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(cliente)}
                    className="h-11 flex items-center justify-center gap-1.5 text-red-700 text-xs font-medium active:bg-red-50 touch-manipulation"
                    title="Eliminar cliente"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Eliminar</span>
                  </button>
                )}
              </div>

              {/* expanded: vales */}
              {isExpanded && (
                <ClienteValesRow clienteVentaId={cliente.id} mode="card" />
              )}
            </div>
          );
        })}
      </div>

      {/* ═══ DESKTOP: tabla ══════════════════════════════════════ */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-900 w-12"></th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Numero</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Nombre</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Telefono</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">CI</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Comercial</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Provincia</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Municipio</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Direccion</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Creado</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((cliente) => {
              const isExpanded = expandedRows.has(cliente.id);
              return (
                <React.Fragment key={cliente.id}>
                  <tr
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-4 px-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRow(cliente.id)}
                        className="p-1 h-8 w-8"
                        title="Ver vales de salida"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </td>
                    <td className="py-4 px-4">
                      <Badge
                        variant="outline"
                        className="bg-teal-50 text-teal-700 border-teal-200 font-mono"
                      >
                        {cliente.numero || cliente.id.slice(-6).toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 font-medium text-gray-900">
                      {cliente.nombre}
                    </td>
                    <td className="py-4 px-4 text-gray-700">{cliente.telefono || "-"}</td>
                    <td className="py-4 px-4 text-gray-700">{cliente.ci || "-"}</td>
                    <td className="py-4 px-4 text-gray-700">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">
                        {cliente.comercial || "SunCar"}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-gray-700">{cliente.provincia || "-"}</td>
                    <td className="py-4 px-4 text-gray-700">{cliente.municipio || "-"}</td>
                    <td className="py-4 px-4 text-gray-700">{cliente.direccion || "-"}</td>
                    <td className="py-4 px-4 text-gray-700">
                      {formatDate(cliente.fecha_creacion)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        {onAgregarOferta && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onAgregarOferta(cliente)}
                            className="border-teal-300 text-teal-700 hover:bg-teal-50 h-8 w-8 p-0"
                            title="Agregar oferta"
                          >
                            <ShoppingCart className="h-4 w-4" />
                          </Button>
                        )}
                        {onEdit && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEdit(cliente)}
                            className="border-blue-300 text-blue-700 hover:bg-blue-50 h-8 w-8 p-0"
                            title="Editar cliente"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDelete(cliente)}
                            className="border-red-300 text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                            title="Eliminar cliente"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {isExpanded && <ClienteValesRow clienteVentaId={cliente.id} />}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
