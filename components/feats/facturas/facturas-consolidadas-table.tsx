"use client";

import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/molecule/table";
import { Button } from "@/components/shared/atom/button";
import { Card, CardContent } from "@/components/shared/molecule/card";
import {
  Edit,
  Eye,
  ChevronDown,
  ChevronRight,
  Ban,
  PlusCircle,
} from "lucide-react";
import { EstadoBadge } from "./estado-badge";
import type { FacturaConsolidada } from "@/lib/types/feats/facturas/factura-types";
import { ClienteDetallesDialog } from "@/components/feats/customer/cliente-detalles-dialog";
import type { Cliente } from "@/lib/api-types";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/api-config";

interface FacturasConsolidadasTableProps {
  facturas: FacturaConsolidada[];
  loading?: boolean;
  onEdit: (factura: FacturaConsolidada) => void;
  onViewDetails: (factura: FacturaConsolidada) => void;
  onAddVale: (factura: FacturaConsolidada) => void;
  onAnular: (factura: FacturaConsolidada) => void;
  reversed?: boolean;
  modeVentas?: boolean;
}

export function FacturasConsolidadasTable({
  facturas,
  loading,
  onEdit,
  onViewDetails,
  onAddVale,
  onAnular,
  reversed = false,
  modeVentas = false,
}: FacturasConsolidadasTableProps) {
  const [clienteDialogOpen, setClienteDialogOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [loadingCliente, setLoadingCliente] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const { token } = useAuth();

  const facturasMostradas = reversed ? [...facturas].reverse() : facturas;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const handleClienteClick = async (clienteCodigo: string | undefined) => {
    if (!clienteCodigo || !token) return;

    setLoadingCliente(true);
    try {
      const data = await apiRequest<Cliente>(`/clientes/${clienteCodigo}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedCliente(data);
      setClienteDialogOpen(true);
    } catch (error) {
      console.error("Error cargando cliente:", error);
    } finally {
      setLoadingCliente(false);
    }
  };

  const toggleRow = (numeroFactura: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(numeroFactura)) {
      newExpanded.delete(numeroFactura);
    } else {
      newExpanded.add(numeroFactura);
    }
    setExpandedRows(newExpanded);
  };

  const calcularGananciaTotal = (factura: FacturaConsolidada): number => {
    if (factura.ofertas.length === 0) return 0;
    const totalPrecioFinal = factura.ofertas.reduce(
      (sum, oferta) => sum + oferta.precio_final,
      0,
    );
    return totalPrecioFinal - factura.total_factura;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (facturas.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <p className="text-gray-500">No se encontraron facturas</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Número Factura</TableHead>
                  <TableHead>Mes</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">
                    Total Materiales Facturados
                  </TableHead>
                  {modeVentas ? (
                    <TableHead className="text-right">Monto Pagado</TableHead>
                  ) : (
                    <>
                      <TableHead className="text-right">Monto Cobrado</TableHead>
                      <TableHead className="text-right">
                        Monto Pendiente Materiales
                      </TableHead>
                      <TableHead className="text-right">
                        Precio Final Oferta
                      </TableHead>
                      <TableHead className="text-right">Ganancia Actual</TableHead>
                    </>
                  )}
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {facturasMostradas.map((factura) => {
                  const isExpanded = expandedRows.has(factura.numero_factura);
                  const hasOfertas = factura.ofertas.length > 0;
                  const isAnulada = factura.anulada === true;
                  const totalPrecioFinal = factura.ofertas.reduce(
                    (sum, oferta) => sum + oferta.precio_final,
                    0,
                  );
                  const gananciaTotal = calcularGananciaTotal(factura);

                  return (
                    <React.Fragment key={factura.numero_factura}>
                      <TableRow
                        className={
                          isAnulada
                            ? "bg-red-50/80 hover:bg-red-100/70"
                            : "hover:bg-gray-50"
                        }
                      >
                        <TableCell>
                          {hasOfertas && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleRow(factura.numero_factura)}
                              className="h-6 w-6 p-0"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </TableCell>
                        <TableCell
                          className={`font-medium ${isAnulada ? "text-red-700" : ""}`}
                        >
                          {factura.numero_factura}
                        </TableCell>
                        <TableCell className="capitalize">
                          {factura.mes || "N/A"}
                        </TableCell>
                        <TableCell>{factura.fecha || "N/A"}</TableCell>
                        <TableCell>
                          {factura.cliente_nombre ? (
                            factura.cliente_codigo ? (
                              <button
                                onClick={() =>
                                  handleClienteClick(factura.cliente_codigo)
                                }
                                className="text-orange-600 hover:text-orange-700 hover:underline font-medium text-left"
                                disabled={loadingCliente}
                              >
                                {factura.cliente_nombre}
                              </button>
                            ) : (
                              <span className="text-gray-900 font-medium text-left block">
                                {factura.cliente_nombre}
                              </span>
                            )
                          ) : (
                            <span className="text-gray-500 italic text-left block">
                              {factura.tipo === "cliente_directo"
                                ? "Cliente Directo"
                                : factura.subtipo === "brigada"
                                  ? "Brigada"
                                  : "Sin cliente"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(factura.total_factura)}
                        </TableCell>
                        {modeVentas ? (
                          <TableCell
                            className={`text-right font-medium ${(factura.total_pagado ?? factura.total_factura) < factura.total_factura ? "text-blue-600" : "text-green-600"}`}
                          >
                            {formatCurrency(factura.total_pagado ?? factura.total_factura)}
                          </TableCell>
                        ) : (
                          <>
                            <TableCell
                              className={`text-right font-medium ${factura.total_cobrado_todas_ofertas > 0 ? "text-green-600" : "text-gray-600"}`}
                            >
                              {formatCurrency(factura.total_cobrado_todas_ofertas)}
                            </TableCell>
                            <TableCell
                              className={`text-right font-medium ${factura.monto_pendiente_materiales > 0 ? "text-red-600" : "text-gray-600"}`}
                            >
                              {formatCurrency(factura.monto_pendiente_materiales)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {hasOfertas ? formatCurrency(totalPrecioFinal) : "-"}
                            </TableCell>
                            <TableCell
                              className={`text-right font-semibold ${gananciaTotal !== 0 ? "text-blue-600" : "text-gray-600"}`}
                            >
                              {hasOfertas ? formatCurrency(gananciaTotal) : "-"}
                            </TableCell>
                          </>
                        )}
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onAddVale(factura)}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              disabled={factura.anulada === true}
                              title={
                                factura.anulada
                                  ? "Factura anulada"
                                  : "Agregar vale"
                              }
                            >
                              <PlusCircle className="h-4 w-4" />
                              <span className="sr-only">Agregar vale</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onViewDetails(factura)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEdit(factura)}
                              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              disabled={factura.anulada === true}
                              title={
                                factura.anulada
                                  ? "Factura anulada"
                                  : "Editar factura"
                              }
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onAnular(factura)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              disabled={factura.anulada === true}
                              title={
                                factura.anulada
                                  ? "Factura anulada"
                                  : "Anular factura"
                              }
                            >
                              <Ban className="h-4 w-4" />
                              <span className="sr-only">Anular factura</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Fila expandida con detalles de ofertas */}
                      {isExpanded && hasOfertas && (
                        <TableRow className="bg-orange-50/30">
                          <TableCell colSpan={13} className="p-4">
                            <div className="bg-white rounded-lg border border-orange-200 overflow-hidden">
                              <div className="bg-orange-100 px-4 py-2 border-b border-orange-200">
                                <span className="text-sm font-semibold text-orange-800">
                                  Ofertas Asociadas ({factura.ofertas.length})
                                </span>
                              </div>
                              <div className="divide-y divide-gray-200">
                                {factura.ofertas.map((oferta, idx) => (
                                  <div
                                    key={oferta.oferta_id}
                                    className="px-4 py-3 hover:bg-gray-50 grid grid-cols-12 gap-4 items-center"
                                  >
                                    <div className="col-span-1 text-sm text-gray-500 font-medium">
                                      #{idx + 1}
                                    </div>
                                    <div className="col-span-4">
                                      <p className="text-sm font-semibold text-gray-900">
                                        {oferta.numero_oferta}
                                      </p>
                                      <p className="text-xs text-gray-500 mt-0.5">
                                        {oferta.nombre_automatico}
                                      </p>
                                    </div>
                                    <div className="col-span-2 text-right">
                                      <p className="text-xs text-gray-500">
                                        Precio Final
                                      </p>
                                      <p className="text-sm font-semibold text-gray-900">
                                        {formatCurrency(oferta.precio_final)}
                                      </p>
                                    </div>
                                    <div className="col-span-2 text-right">
                                      <p className="text-xs text-gray-500">
                                        Cobrado
                                      </p>
                                      <p
                                        className={`text-sm font-semibold ${oferta.monto_cobrado > 0 ? "text-green-600" : "text-gray-600"}`}
                                      >
                                        {formatCurrency(oferta.monto_cobrado)}
                                      </p>
                                    </div>
                                    <div className="col-span-2 text-right">
                                      <p className="text-xs text-gray-500">
                                        Pendiente
                                      </p>
                                      <p
                                        className={`text-sm font-semibold ${oferta.monto_pendiente > 0 ? "text-red-600" : "text-gray-600"}`}
                                      >
                                        {formatCurrency(oferta.monto_pendiente)}
                                      </p>
                                    </div>
                                    <div className="col-span-1 text-right">
                                      <span
                                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                          oferta.monto_pendiente === 0
                                            ? "bg-green-100 text-green-700"
                                            : "bg-orange-100 text-orange-700"
                                        }`}
                                      >
                                        {oferta.monto_pendiente === 0
                                          ? "Pagada"
                                          : "Pendiente"}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de detalles del cliente */}
      <ClienteDetallesDialog
        open={clienteDialogOpen}
        onOpenChange={setClienteDialogOpen}
        cliente={selectedCliente}
      />
    </>
  );
}
