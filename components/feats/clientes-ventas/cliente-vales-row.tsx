"use client";

import { Badge } from "@/components/shared/atom/badge";
import { Button } from "@/components/shared/atom/button";
import { Eye, FileOutput, Loader2 } from "lucide-react";
import type { ValeSalida } from "@/lib/api-types";
import { ValeSalidaService } from "@/lib/api-services";
import { useEffect, useState } from "react";
import { ValeSalidaDetailDialog } from "@/components/feats/vales-salida/vale-salida-detail-dialog";

interface ClienteValesRowProps {
  clienteVentaId: string;
}

export function ClienteValesRow({
  clienteVentaId,
}: ClienteValesRowProps) {
  const [vales, setVales] = useState<ValeSalida[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVale, setSelectedVale] = useState<ValeSalida | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    const fetchVales = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await ValeSalidaService.getValesPorClienteVenta(
          clienteVentaId
        );
        setVales(data);
      } catch (err) {
        console.error("Error al cargar vales de salida:", err);
        setError(
          err instanceof Error ? err.message : "Error al cargar vales"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchVales();
  }, [clienteVentaId]);

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

  const handleViewDetails = (vale: ValeSalida) => {
    setSelectedVale(vale);
    setIsDetailOpen(true);
  };

  if (isLoading) {
    return (
      <tr>
        <td colSpan={8} className="py-4 px-4 bg-gray-50">
          <div className="flex items-center justify-center gap-2 text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Cargando vales de salida...</span>
          </div>
        </td>
      </tr>
    );
  }

  if (error) {
    return (
      <tr>
        <td colSpan={8} className="py-4 px-4 bg-red-50">
          <div className="text-center text-sm text-red-700">Error: {error}</div>
        </td>
      </tr>
    );
  }

  if (vales.length === 0) {
    return (
      <tr>
        <td colSpan={8} className="py-4 px-4 bg-gray-50">
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <FileOutput className="h-4 w-4" />
            <span className="text-sm">
              No hay vales de salida para este cliente
            </span>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <>
      {vales.map((vale) => (
        <tr key={vale.id} className="bg-gray-50 border-b border-gray-200">
          <td className="py-3 px-4 pl-12" colSpan={2}>
            <div className="flex items-center gap-2">
              <FileOutput className="h-4 w-4 text-orange-600" />
              <Badge
                variant="outline"
                className="bg-orange-50 text-orange-700 border-orange-200 font-mono text-xs"
              >
                {vale.codigo || vale.id.slice(-6).toUpperCase()}
              </Badge>
            </div>
          </td>
          <td className="py-3 px-4 text-sm text-gray-700" colSpan={4}>
            {formatDate(vale.fecha_creacion)}
          </td>
          <td className="py-3 px-4" colSpan={2}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleViewDetails(vale)}
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
              title="Ver detalles del vale"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </td>
        </tr>
      ))}
      <ValeSalidaDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        vale={selectedVale}
      />
    </>
  );
}
