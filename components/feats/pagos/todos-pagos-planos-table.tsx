"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/molecule/table";
import { Badge } from "@/components/shared/atom/badge";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Loader2, FileText, Pencil, Search } from "lucide-react";
import type {
  OfertaConPagos,
  Pago,
} from "@/lib/services/feats/pagos/pago-service";
import { ExportComprobanteService } from "@/lib/services/feats/pagos/export-comprobante-service";
import { EditarPagoDialog } from "./editar-pago-dialog";

interface TodosPagosPlanosTableProps {
  ofertasConPagos: OfertaConPagos[];
  loading: boolean;
  onPagoUpdated?: () => void;
  showSearch?: boolean;
}

interface PagoConOferta extends Pago {
  oferta: {
    numero_oferta: string;
    nombre_completo: string;
    precio_final: number;
    monto_pendiente: number;
  };
  contacto: {
    nombre: string | null;
    telefono: string | null;
    carnet: string | null;
    codigo: string | null;
    tipo_contacto: "cliente" | "lead" | "lead_sin_agregar" | null;
    direccion: string | null;
  };
  pendienteDespuesPago?: number;
}

export function TodosPagosPlanosTable({
  ofertasConPagos,
  loading,
  onPagoUpdated,
  showSearch = true,
}: TodosPagosPlanosTableProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPago, setSelectedPago] = useState<PagoConOferta | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  console.log(
    "📊 TodosPagosPlanosTable - Ofertas con pagos recibidas:",
    ofertasConPagos.length,
  );
  if (ofertasConPagos.length > 0) {
    console.log("📊 Primer pago de ejemplo:", ofertasConPagos[0]?.pagos[0]);
  }

  // Aplanar todos los pagos de todas las ofertas
  const todosPagos: PagoConOferta[] = ofertasConPagos.flatMap((oferta) =>
    oferta.pagos.map((pago) => ({
      ...pago,
      oferta: {
        numero_oferta: oferta.numero_oferta,
        nombre_completo: oferta.nombre_completo,
        precio_final: oferta.precio_final,
        monto_pendiente: oferta.monto_pendiente,
      },
      contacto: {
        ...oferta.contacto,
        direccion: oferta.contacto.direccion || null,
      },
    })),
  );

  // Ordenar por fecha más reciente primero
  const pagosOrdenados = [...todosPagos].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
  );

  // Calcular el pendiente después de cada pago
  const pagosConPendiente = pagosOrdenados.map((pago) => {
    // Encontrar la oferta original
    const ofertaOriginal = ofertasConPagos.find(
      (o) => o.numero_oferta === pago.oferta.numero_oferta,
    );
    if (!ofertaOriginal) return { ...pago, pendienteDespuesPago: 0 };

    // Ordenar los pagos de la oferta por fecha
    const pagosOfertaOrdenados = [...ofertaOriginal.pagos].sort(
      (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
    );

    // Encontrar el índice de este pago
    const indicePago = pagosOfertaOrdenados.findIndex((p) => p.id === pago.id);

    // Calcular total pagado hasta este pago (inclusive), excluyendo diferencias
    const totalPagadoHastaAqui = pagosOfertaOrdenados
      .slice(0, indicePago + 1)
      .reduce((sum, p) => {
        // Si el pago tiene diferencia, restar ese monto
        const montoEfectivo =
          p.diferencia && p.diferencia.monto > 0
            ? p.monto_usd - p.diferencia.monto
            : p.monto_usd;
        return sum + montoEfectivo;
      }, 0);

    // Calcular pendiente después de este pago
    let pendienteDespuesPago =
      ofertaOriginal.precio_final - totalPagadoHastaAqui;

    // Si es muy cercano a 0, mostrarlo como 0
    if (pendienteDespuesPago < 0.01 && pendienteDespuesPago > -0.01) {
      pendienteDespuesPago = 0;
    }

    return { ...pago, pendienteDespuesPago };
  });

  // Filtrar pagos según búsqueda
  const filteredPagos = useMemo(() => {
    if (!searchTerm) return pagosConPendiente;

    const term = searchTerm.toLowerCase();
    return pagosConPendiente.filter((pago) => {
      const clienteNombre = pago.contacto?.nombre || "";
      const clienteTelefono = pago.contacto?.telefono || "";
      const clienteCarnet = pago.contacto?.carnet || "";
      const nombrePagador = pago.nombre_pagador || "";
      const carnetPagador = pago.carnet_pagador || "";

      return (
        pago.oferta.numero_oferta.toLowerCase().includes(term) ||
        pago.oferta.nombre_completo.toLowerCase().includes(term) ||
        clienteNombre.toLowerCase().includes(term) ||
        clienteTelefono.includes(term) ||
        clienteCarnet.includes(term) ||
        nombrePagador.toLowerCase().includes(term) ||
        carnetPagador.includes(term) ||
        pago.id.toLowerCase().includes(term)
      );
    });
  }, [pagosConPendiente, searchTerm]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getTipoPagoBadge = (tipo: string) => {
    return tipo === "anticipo" ? (
      <Badge variant="default" className="bg-blue-100 text-blue-700">
        Anticipo
      </Badge>
    ) : (
      <Badge variant="default" className="bg-purple-100 text-purple-700">
        Pendiente
      </Badge>
    );
  };

  const getMetodoPagoBadge = (metodo: string) => {
    const badges = {
      efectivo: <Badge className="bg-green-100 text-green-700">Efectivo</Badge>,
      transferencia_bancaria: (
        <Badge className="bg-orange-100 text-orange-700">Transferencia</Badge>
      ),
      stripe: <Badge className="bg-indigo-100 text-indigo-700">Stripe</Badge>,
    };
    return badges[metodo as keyof typeof badges] || <Badge>{metodo}</Badge>;
  };

  const handleExportarComprobante = (pago: PagoConOferta) => {
    console.log("Datos del contacto (planos):", pago.contacto);
    console.log("Carnet del contacto (planos):", pago.contacto.carnet);
    console.log("Pago completo (planos):", pago);

    // Encontrar la oferta original para calcular el total pagado anteriormente
    const ofertaOriginal = ofertasConPagos.find(
      (o) => o.numero_oferta === pago.oferta.numero_oferta,
    );

    // Calcular el total pagado antes de este pago (pagos con fecha anterior)
    let totalPagadoAnteriormente = 0;
    if (ofertaOriginal) {
      const fechaPagoActual = new Date(pago.fecha).getTime();
      totalPagadoAnteriormente = ofertaOriginal.pagos
        .filter((p) => new Date(p.fecha).getTime() < fechaPagoActual)
        .reduce((sum, p) => sum + p.monto_usd, 0);
    }

    ExportComprobanteService.generarComprobantePDF({
      pago: pago,
      oferta: {
        numero_oferta: pago.oferta.numero_oferta,
        nombre_completo: pago.oferta.nombre_completo,
        precio_final: pago.oferta.precio_final,
      },
      contacto: {
        nombre: pago.contacto.nombre || "No especificado",
        carnet: pago.contacto.carnet || undefined,
        telefono: pago.contacto.telefono || undefined,
        direccion: pago.contacto.direccion || undefined,
      },
      total_pagado_anteriormente:
        totalPagadoAnteriormente > 0 ? totalPagadoAnteriormente : undefined,
    });
  };

  const handleEditarPago = (pago: PagoConOferta) => {
    setSelectedPago(pago);
    setEditDialogOpen(true);
  };

  const handlePagoEditSuccess = (montoPendienteActualizado?: number) => {
    setEditDialogOpen(false);

    // Si recibimos el monto pendiente actualizado, actualizar la UI inmediatamente
    if (montoPendienteActualizado !== undefined && selectedPago) {
      console.log(
        "💰 Actualizando monto pendiente en UI:",
        montoPendienteActualizado,
      );
      console.log("📝 Oferta afectada:", selectedPago.oferta.numero_oferta);

      // Actualizar el monto pendiente en el objeto de la oferta seleccionada
      selectedPago.oferta.monto_pendiente = montoPendienteActualizado;
    }

    setSelectedPago(null);
    console.log("🔄 Recargando datos después de editar pago...");
    if (onPagoUpdated) {
      onPagoUpdated();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (pagosConPendiente.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No hay cobros registrados</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto space-y-4">
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por cliente, N° oferta, CI, teléfono, pagador, ID pago..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {filteredPagos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No se encontraron resultados</p>
        </div>
      ) : (
        <div className="text-sm text-gray-600 mb-2">
          Mostrando {filteredPagos.length} de {pagosConPendiente.length} cobros
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">ID</TableHead>
            <TableHead className="w-[100px]">Fecha</TableHead>
            <TableHead className="w-[130px]">N° Oferta</TableHead>
            <TableHead>Oferta</TableHead>
            <TableHead className="text-right w-[90px]">Monto Cobrado</TableHead>
            <TableHead className="text-right w-[90px]">Pendiente</TableHead>
            <TableHead className="w-[120px]">Tipo/Método</TableHead>
            <TableHead className="w-[130px]">Cliente/Pagador</TableHead>
            <TableHead className="w-[70px]">Recibido</TableHead>
            <TableHead className="w-[120px] text-center">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredPagos.map((pago) => (
            <TableRow key={pago.id} className="hover:bg-gray-50">
              <TableCell className="font-mono text-xs py-3">
                {pago.id.slice(-8)}
              </TableCell>
              <TableCell className="text-sm py-3 whitespace-nowrap">
                {formatDate(pago.fecha)}
              </TableCell>
              <TableCell className="font-medium text-sm py-3">
                {pago.oferta.numero_oferta}
              </TableCell>
              <TableCell className="py-3">
                <div className="text-sm text-gray-700">
                  {pago.oferta.nombre_completo}
                </div>
              </TableCell>
              <TableCell className="text-right py-3">
                {pago.moneda !== "USD" ? (
                  <div className="text-sm">
                    <div className="text-gray-600">
                      {formatCurrency(pago.monto)} {pago.moneda}
                    </div>
                    <div className="font-semibold text-green-700">
                      {formatCurrency(pago.monto_usd)}
                    </div>
                  </div>
                ) : (
                  <div className="font-semibold text-sm text-green-700">
                    {formatCurrency(pago.monto_usd)}
                  </div>
                )}
                {pago.diferencia && (
                  <div className="mt-1 text-xs">
                    <Badge
                      variant="outline"
                      className="bg-orange-50 text-orange-700"
                    >
                      +{formatCurrency(pago.diferencia.monto)}
                    </Badge>
                  </div>
                )}
              </TableCell>
              <TableCell className="text-right py-3">
                <div className="font-semibold text-sm text-orange-700">
                  {formatCurrency(pago.pendienteDespuesPago ?? 0)}
                </div>
              </TableCell>
              <TableCell className="py-3">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {getTipoPagoBadge(pago.tipo_pago)}
                    {getMetodoPagoBadge(pago.metodo_pago)}
                  </div>
                  {pago.metodo_pago === "efectivo" &&
                    pago.desglose_billetes &&
                    Object.keys(pago.desglose_billetes).length > 0 && (
                      <details className="text-xs text-gray-600">
                        <summary className="cursor-pointer text-blue-600 hover:underline">
                          Ver desglose
                        </summary>
                        <div className="mt-1.5 space-y-1 bg-gray-50 rounded p-2 border border-gray-200">
                          {Object.entries(pago.desglose_billetes)
                            .sort(([a], [b]) => parseFloat(b) - parseFloat(a))
                            .map(([denominacion, cantidad]) => (
                              <div
                                key={denominacion}
                                className="flex justify-between text-xs"
                              >
                                <span>
                                  {cantidad}x {denominacion}
                                </span>
                                <span className="font-medium">
                                  {formatCurrency(
                                    parseFloat(denominacion) *
                                      (cantidad as number),
                                  )}
                                </span>
                              </div>
                            ))}
                        </div>
                      </details>
                    )}
                </div>
              </TableCell>
              <TableCell className="py-3">
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-sm">
                    {pago.nombre_pagador ||
                      pago.contacto.nombre ||
                      "No especificado"}
                  </span>
                  {!pago.pago_cliente && (
                    <Badge
                      variant="outline"
                      className="bg-orange-50 text-orange-700 w-fit text-xs"
                    >
                      Tercero
                    </Badge>
                  )}
                  {pago.carnet_pagador && (
                    <span className="text-xs text-gray-500">
                      CI: {pago.carnet_pagador}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="py-3">
                <div className="text-sm">
                  {pago.metodo_pago === "efectivo" && pago.recibido_por && (
                    <span className="text-gray-700">{pago.recibido_por}</span>
                  )}
                  {(pago.metodo_pago === "transferencia_bancaria" ||
                    pago.metodo_pago === "stripe") &&
                    pago.comprobante_transferencia && (
                      <a
                        href={pago.comprobante_transferencia}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline inline-flex items-center gap-1"
                      >
                        Ver
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </a>
                    )}
                  {!pago.recibido_por && !pago.comprobante_transferencia && "-"}
                  {pago.diferencia && (
                    <details className="mt-1 text-xs">
                      <summary className="cursor-pointer text-orange-600 hover:underline">
                        Ver justificación excedente
                      </summary>
                      <div className="mt-1 p-2 bg-orange-50 border border-orange-200 rounded">
                        <p className="text-gray-700 italic">
                          {pago.diferencia.justificacion}
                        </p>
                      </div>
                    </details>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-center py-3">
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditarPago(pago)}
                    className="h-8 w-8 p-0"
                    title="Editar pago"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportarComprobante(pago)}
                    className="h-8 w-8 p-0"
                    title="Exportar comprobante"
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Diálogo de edición de pago */}
      {selectedPago && (
        <EditarPagoDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          pago={selectedPago}
          oferta={selectedPago.oferta}
          onSuccess={handlePagoEditSuccess}
        />
      )}
    </div>
  );
}
