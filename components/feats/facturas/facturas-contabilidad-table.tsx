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
import { Loader2, FileText } from "lucide-react";
import type { FacturaContabilidad } from "@/lib/services/feats/facturas/factura-contabilidad-service";
import {
  ExportFacturaContabilidadService,
  type FacturaContabilidadExportContext,
} from "@/lib/services/feats/facturas/export-factura-contabilidad-service";
import { ClienteService, TasaCambioService } from "@/lib/api-services";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  const getFechaFacturaKey = (fechaEmision: string): string => {
    const raw = String(fechaEmision || "").trim();
    const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return "";
    const year = parsed.getFullYear();
    const month = `${parsed.getMonth() + 1}`.padStart(2, "0");
    const day = `${parsed.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const normalizeTipoPersona = (value?: string | null): "Natural" | "Jurídica" | null => {
    const normalized = String(value || "")
      .trim()
      .toLowerCase();
    if (!normalized) return null;
    if (normalized === "juridica" || normalized === "jurídica") return "Jurídica";
    if (normalized === "natural") return "Natural";
    return null;
  };

  const getClienteNit = (cliente: Record<string, unknown>): string | null => {
    const candidates = [
      cliente.carnet_identidad,
      cliente.nit,
      cliente.NIT,
      cliente.numero_nit,
      cliente.no_nit,
      cliente.nit_cliente,
    ];
    for (const value of candidates) {
      const text = String(value || "").trim();
      if (text) return text;
    }
    return null;
  };

  const handleExportPdf = async (factura: FacturaContabilidad) => {
    setExportingId(factura.id);
    try {
      const contextKey = (factura.id_oferta_confeccion || "").trim();
      const baseContext = exportContextByOferta[contextKey];
      const context: FacturaContabilidadExportContext = { ...(baseContext || {}) };

      const numeroCliente = String(factura.numero_cliente || "").trim();
      if (numeroCliente) {
        const cliente = (await ClienteService.getClienteByNumero(
          numeroCliente,
        )) as unknown as Record<string, unknown> | null;
        if (!cliente) {
          throw new Error(
            `No se encontró el cliente ${numeroCliente} para validar su tipo de persona.`,
          );
        }

        const tipoPersona = normalizeTipoPersona(
          String(cliente.tipo_persona || ""),
        );
        if (!tipoPersona) {
          throw new Error(
            `El cliente ${numeroCliente} no tiene tipo_persona definido.`,
          );
        }

        const clienteNit = getClienteNit(cliente);
        const clienteCi = String(cliente.carnet_identidad || "").trim() || null;
        context.clienteTipoPersona = tipoPersona;
        context.clienteNit = clienteNit;
        context.clienteCiRepresentante = clienteCi;
        context.clienteNombre =
          String(cliente.nombre || "").trim() || context.clienteNombre || null;
        context.clienteDireccion =
          String(cliente.direccion || "").trim() ||
          context.clienteDireccion ||
          null;
        context.clienteTelefono =
          String(cliente.telefono || "").trim() || context.clienteTelefono || null;
        context.clienteDocumento =
          tipoPersona === "Jurídica"
            ? clienteNit || clienteCi || context.clienteDocumento || null
            : clienteCi || context.clienteDocumento || null;
      }

      const fechaFacturaKey = getFechaFacturaKey(factura.fecha_emision);
      if (!fechaFacturaKey) {
        throw new Error("No se pudo determinar la fecha de emisión de la factura.");
      }

      const tasaDia = await TasaCambioService.getTasaCambioByFecha(fechaFacturaKey);
      if (!tasaDia || Number(tasaDia.usd_a_cup || 0) <= 0) {
        throw new Error(
          `No hay tasa de cambio registrada para la fecha ${fechaFacturaKey}.`,
        );
      }

      const precioFinalUsd = Number(context.precioFinalUsd || 0);
      if (!Number.isFinite(precioFinalUsd) || precioFinalUsd <= 0) {
        throw new Error(
          "No se encontró el precio final de la oferta para calcular el importe en CUP.",
        );
      }

      context.importe = precioFinalUsd * Number(tasaDia.usd_a_cup);
      context.moneda = "CUP";
      context.tasaCambioUsdCup = Number(tasaDia.usd_a_cup);
      context.fechaTasa = tasaDia.fecha;

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
          <TableHead className="w-[260px]">Oferta</TableHead>
          <TableHead className="w-[180px]">Cliente</TableHead>
          <TableHead className="w-[140px]">Creada</TableHead>
          <TableHead className="w-[120px] text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {facturas.map((factura) => {
          const contextKey = (factura.id_oferta_confeccion || "").trim();
          const rowContext = exportContextByOferta[contextKey];
          const ofertaNombre =
            (rowContext?.ofertaNombreCompleto || "").trim() ||
            "Sin nombre de oferta";
          const clienteNombre =
            (rowContext?.clienteNombre || "").trim() || "Sin nombre de cliente";

          return (
            <TableRow key={factura.id} className="hover:bg-gray-50">
              <TableCell className="font-semibold">
                {factura.numero_factura}
              </TableCell>
              <TableCell>{formatDate(factura.fecha_emision)}</TableCell>
              <TableCell>{factura.emitida_por}</TableCell>
              <TableCell>{ofertaNombre}</TableCell>
              <TableCell>{clienteNombre}</TableCell>
              <TableCell>{formatDate(factura.fecha_creacion)}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleExportPdf(factura).catch((error) => {
                      console.error("Error exportando factura emitida:", error);
                      toast({
                        title: "Error al exportar factura",
                        description:
                          error instanceof Error
                            ? error.message
                            : "No se pudo exportar el PDF de la factura.",
                        variant: "destructive",
                      });
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
          );
        })}
      </TableBody>
    </Table>
  );
}
