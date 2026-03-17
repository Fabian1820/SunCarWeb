"use client";

import { Badge } from "@/components/shared/atom/badge";
import { Button } from "@/components/shared/atom/button";
import { ChevronDown, ChevronRight, Pencil, Trash2, UserRound } from "lucide-react";
import type { ClienteVenta } from "@/lib/api-types";
import { useState } from "react";
import { ClienteSolicitudesRow } from "./cliente-solicitudes-row";

interface ClientesVentasTableProps {
  clientes: ClienteVenta[];
  onEdit?: (cliente: ClienteVenta) => void;
  onDelete?: (cliente: ClienteVenta) => void;
}

export function ClientesVentasTable({
  clientes,
  onEdit,
  onDelete,
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
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-gray-900 w-12"></th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Numero</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Nombre</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Telefono</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">CI</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Direccion</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Creado</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {clientes.map((cliente) => {
            const isExpanded = expandedRows.has(cliente.id);
            return (
              <>
                <tr
                  key={cliente.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-4 px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleRow(cliente.id)}
                      className="p-1 h-8 w-8"
                      title="Ver solicitudes de venta"
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
                  <td className="py-4 px-4 text-gray-700">{cliente.direccion || "-"}</td>
                  <td className="py-4 px-4 text-gray-700">
                    {formatDate(cliente.fecha_creacion)}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      {onEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEdit(cliente)}
                          className="border-blue-300 text-blue-700 hover:bg-blue-50"
                          title="Editar cliente"
                        >
                          <Pencil className="h-4 w-4 sm:mr-1" />
                          <span className="hidden sm:inline text-xs">Editar</span>
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDelete(cliente)}
                          className="border-red-300 text-red-700 hover:bg-red-50"
                          title="Eliminar cliente"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
                {isExpanded && <ClienteSolicitudesRow clienteVentaId={cliente.id} />}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
