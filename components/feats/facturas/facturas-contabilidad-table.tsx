"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/molecule/table";
import { Button } from "@/components/shared/atom/button";
import { Badge } from "@/components/shared/atom/badge";
import { Loader2, FileText } from "lucide-react";
import type { FacturaContabilidad } from "@/lib/services/feats/facturas/factura-contabilidad-service";
import {
  ExportFacturaContabilidadService,
  type FacturaContabilidadExportContext,
} from "@/lib/services/feats/facturas/export-factura-contabilidad-service";

interface FacturasContabilidadTableProps {
  facturas: FacturaContabilidad[];
  loading: boolean;
  exportContextByOferta?: Record<string, FacturaContabilidadExportContext>;
}

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export function FacturasContabilidadTable({
  facturas,
  loading,
  exportContextByOferta = {},
}: FacturasContabilidadTableProps) {
  const [exportingId, setExportingId] = useState<string | null>(null);

  const handleExportPdf = async (factura: FacturaContabilidad) => {
    setExportingId(factura.id);
    try {
      const contextKey = (factura.id_oferta_confeccion || "").trim();
      const context = exportContextByOferta[contextKey];
      await ExportFacturaContabilidadService.generarPDF(factura, context);
    } finally {
      setExportingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (facturas.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No hay facturas emitidas registradas</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[150px]">Nro Factura</TableHead>
          <TableHead className="w-[140px]">Fecha Emision</TableHead>
          <TableHead className="w-[180px]">Emitida Por</TableHead>
          <TableHead className="w-[180px]">Oferta Confeccion</TableHead>
          <TableHead className="w-[120px]">Nro Cliente</TableHead>
          <TableHead className="w-[140px]">Creada</TableHead>
          <TableHead className="w-[120px] text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {facturas.map((factura) => (
          <TableRow key={factura.id} className="hover:bg-gray-50">
            <TableCell className="font-semibold">
              {factura.numero_factura}
            </TableCell>
            <TableCell>{formatDate(factura.fecha_emision)}</TableCell>
            <TableCell>{factura.emitida_por}</TableCell>
            <TableCell>
              <Badge variant="outline">{factura.id_oferta_confeccion}</Badge>
            </TableCell>
            <TableCell>{factura.numero_cliente || "-"}</TableCell>
            <TableCell>{formatDate(factura.fecha_creacion)}</TableCell>
            <TableCell className="text-right">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  handleExportPdf(factura).catch((error) => {
                    console.error("Error exportando factura emitida:", error);
                  });
                }}
                disabled={exportingId === factura.id}
              >
                {exportingId === factura.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                <span className="ml-2">PDF</span>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
