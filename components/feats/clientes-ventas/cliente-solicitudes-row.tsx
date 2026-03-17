"use client";

import { Badge } from "@/components/shared/atom/badge";
import { Loader2, Package, ShoppingCart } from "lucide-react";
import type { SolicitudVenta } from "@/lib/api-types";
import { SolicitudVentaService } from "@/lib/api-services";
import { useEffect, useState } from "react";

interface ClienteSolicitudesRowProps {
  clienteVentaId: string;
}

export function ClienteSolicitudesRow({
  clienteVentaId,
}: ClienteSolicitudesRowProps) {
  const [solicitudes, setSolicitudes] = useState<SolicitudVenta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSolicitudes = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await SolicitudVentaService.getSolicitudes({
          cliente_venta_id: clienteVentaId,
        });
        setSolicitudes(data);
      } catch (err) {
        console.error("Error al cargar solicitudes de venta:", err);
        setError(
          err instanceof Error ? err.message : "Error al cargar solicitudes"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchSolicitudes();
  }, [clienteVentaId]);

  const formatDate = (value?: string) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getEstadoBadgeColor = (estado?: string) => {
    switch (estado) {
      case "nueva":
        return "bg-green-50 text-green-700 border-green-200";
      case "usada":
        return "bg-gray-50 text-gray-700 border-gray-200";
      case "anulada":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  if (isLoading) {
    return (
      <tr>
        <td colSpan={7} className="py-4 px-4 bg-gray-50">
          <div className="flex items-center justify-center gap-2 text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Cargando solicitudes de venta...</span>
          </div>
        </td>
      </tr>
    );
  }

  if (error) {
    return (
      <tr>
        <td colSpan={7} className="py-4 px-4 bg-red-50">
          <div className="text-center text-sm text-red-700">
            Error: {error}
          </div>
        </td>
      </tr>
    );
  }

  if (solicitudes.length === 0) {
    return (
      <tr>
        <td colSpan={7} className="py-4 px-4 bg-gray-50">
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <ShoppingCart className="h-4 w-4" />
            <span className="text-sm">
              No hay solicitudes de venta para este cliente
            </span>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <>
      {solicitudes.map((solicitud) => (
        <tr key={solicitud.id} className="bg-gray-50 border-b border-gray-200">
          <td className="py-3 px-4 pl-12">
            <Badge
              variant="outline"
              className="bg-purple-50 text-purple-700 border-purple-200 font-mono text-xs"
            >
              {solicitud.codigo || solicitud.id.slice(-6).toUpperCase()}
            </Badge>
          </td>
          <td className="py-3 px-4">
            <Badge
              variant="outline"
              className={`text-xs ${getEstadoBadgeColor(solicitud.estado)}`}
            >
              {solicitud.estado || "N/A"}
            </Badge>
          </td>
          <td className="py-3 px-4 text-sm text-gray-700">
            {solicitud.almacen?.nombre || "-"}
          </td>
          <td className="py-3 px-4 text-sm text-gray-700">
            {solicitud.trabajador?.nombre || "-"}
          </td>
          <td className="py-3 px-4">
            <div className="flex items-center gap-1 text-sm text-gray-700">
              <Package className="h-3 w-3" />
              <span>{solicitud.materiales?.length || 0}</span>
            </div>
          </td>
          <td className="py-3 px-4 text-sm text-gray-700">
            {formatDate(solicitud.fecha_creacion)}
          </td>
          <td className="py-3 px-4"></td>
        </tr>
      ))}
    </>
  );
}
