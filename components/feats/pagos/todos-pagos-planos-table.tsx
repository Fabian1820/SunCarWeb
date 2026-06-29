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
import { Loader2, FileText, RotateCcw, Search, Pencil } from "lucide-react";
import type {
  OfertaConPagos,
  Pago,
} from "@/lib/services/feats/pagos/pago-service";
import { ExportComprobanteService } from "@/lib/services/feats/pagos/export-comprobante-service";
import { getBaseACobrar } from "./todos-pagos-table";
import { RegistrarDevolucionPagoDialog } from "./registrar-devolucion-pago-dialog";
import { EditarPagoDialog } from "./editar-pago-dialog";
import { useAuth } from "@/contexts/auth-context";
import { puedeEditarCobro } from "@/lib/constants/pagos-permisos";
import { PagoTrazabilidad } from "./pago-trazabilidad";

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
    estado: string;
    compensacion?: { monto_usd: number; justificacion?: string } | null;
    asumido_por_empresa?: { monto_usd: number; justificacion?: string } | null;
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

const toEpochMs = (value: string): number => {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
};

const roundToCents = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const getMontoAplicadoUsd = (pago: Pago): number => {
  const diferencia = pago.diferencia?.monto ?? 0;
  return Math.max(0, pago.monto_usd - diferencia);
};

const ordenarPagosCronologicamente = (pagos: Pago[]): Pago[] =>
  [...pagos].sort((a, b) => {
    const diffFecha = toEpochMs(a.fecha) - toEpochMs(b.fecha);
    if (diffFecha !== 0) return diffFecha;

    const diffCreacion =
      toEpochMs(a.fecha_creacion) - toEpochMs(b.fecha_creacion);
    if (diffCreacion !== 0) return diffCreacion;

    return a.id.localeCompare(b.id);
  });

const isOfertaCancelada = (estado: string) =>
  estado.trim().toLowerCase() === "cancelada";

export function TodosPagosPlanosTable({
  ofertasConPagos,
  loading,
  onPagoUpdated,
  showSearch = true,
}: TodosPagosPlanosTableProps) {
  const { user } = useAuth();
  const puedeEditar = puedeEditarCobro(user?.ci);

  const [devolucionDialogOpen, setDevolucionDialogOpen] = useState(false);
  const [pagoParaDevolucion, setPagoParaDevolucion] =
    useState<PagoConOferta | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [pagoParaEditar, setPagoParaEditar] = useState<PagoConOferta | null>(
    null,
  );
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
        estado: oferta.estado,
        compensacion: oferta.compensacion,
        asumido_por_empresa: oferta.asumido_por_empresa,
      },
      contacto: {
        ...oferta.contacto,
        direccion: oferta.contacto.direccion || null,
      },
    })),
  );

  // Ordenar por fecha más reciente primero
  const pagosOrdenados = [...todosPagos].sort((a, b) => {
    const diffFecha = toEpochMs(b.fecha) - toEpochMs(a.fecha);
    if (diffFecha !== 0) return diffFecha;

    const diffCreacion =
      toEpochMs(b.fecha_creacion) - toEpochMs(a.fecha_creacion);
    if (diffCreacion !== 0) return diffCreacion;

    return b.id.localeCompare(a.id);
  });

  const getTotalesParaPago = (
    oferta: OfertaConPagos,
    pagoId: string,
  ): { totalPagadoAnteriormente: number; pendienteDespuesPago: number } => {
    if (isOfertaCancelada(oferta.estado || "")) {
      return {
        totalPagadoAnteriormente: 0,
        pendienteDespuesPago: 0,
      };
    }

    const pagosOrdenadosOferta = ordenarPagosCronologicamente(oferta.pagos);
    const indicePago = pagosOrdenadosOferta.findIndex((p) => p.id === pagoId);

    if (indicePago < 0) {
      return {
        totalPagadoAnteriormente: 0,
        pendienteDespuesPago: roundToCents(Math.max(0, getBaseACobrar(oferta))),
      };
    }

    const totalPagadoAnteriormente = pagosOrdenadosOferta
      .slice(0, indicePago)
      .reduce((sum, p) => sum + getMontoAplicadoUsd(p), 0);

    const totalPagadoConEste =
      totalPagadoAnteriormente +
      getMontoAplicadoUsd(pagosOrdenadosOferta[indicePago]);

    const pendienteCrudo = getBaseACobrar(oferta) - totalPagadoConEste;
    const pendienteNormalizado =
      pendienteCrudo < 0.01 && pendienteCrudo > -0.01
        ? 0
        : Math.max(0, pendienteCrudo);

    return {
      totalPagadoAnteriormente: roundToCents(totalPagadoAnteriormente),
      pendienteDespuesPago: roundToCents(pendienteNormalizado),
    };
  };

  // Calcular el pendiente después de cada pago
  const pagosConPendiente = pagosOrdenados.map((pago) => {
    // Encontrar la oferta original
    const ofertaOriginal = ofertasConPagos.find(
      (o) => o.numero_oferta === pago.oferta.numero_oferta,
    );
    if (!ofertaOriginal) return { ...pago, pendienteDespuesPago: 0 };
    const { pendienteDespuesPago } = getTotalesParaPago(
      ofertaOriginal,
      pago.id,
    );

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
    if (tipo === "anticipo") {
      return (
        <Badge variant="default" className="bg-blue-100 text-blue-700">
          Anticipo
        </Badge>
      );
    }

    if (tipo === "completo") {
      return (
        <Badge variant="default" className="bg-emerald-100 text-emerald-700">
          Completo
        </Badge>
      );
    }

    return (
      <Badge variant="default" className="bg-purple-100 text-purple-700">
        Pendiente
      </Badge>
    );
  };

  const getMetodoPagoBadge = (metodo: string) => {
    const badges = {
      efectivo: <Badge className="bg-green-100 text-green-700">Efectivo</Badge>,
      transferencia_bancaria: (
        <Badge className="bg-emerald-100 text-emerald-700">Transferencia</Badge>
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

    const baseACobrarFallback = Math.max(
      0,
      pago.oferta.precio_final -
        (pago.oferta.compensacion?.monto_usd ?? 0) -
        (pago.oferta.asumido_por_empresa?.monto_usd ?? 0),
    );

    const { totalPagadoAnteriormente, pendienteDespuesPago } = ofertaOriginal
      ? getTotalesParaPago(ofertaOriginal, pago.id)
      : {
          totalPagadoAnteriormente: 0,
          pendienteDespuesPago: roundToCents(
            Math.max(0, baseACobrarFallback - getMontoAplicadoUsd(pago)),
          ),
        };

    ExportComprobanteService.generarComprobantePDF({
      pago: pago,
      oferta: {
        numero_oferta: pago.oferta.numero_oferta,
        nombre_completo: pago.oferta.nombre_completo,
        precio_final: pago.oferta.precio_final,
        compensacion: pago.oferta.compensacion ?? undefined,
        asumido_por_empresa: pago.oferta.asumido_por_empresa ?? undefined,
      },
      contacto: {
        nombre: pago.contacto.nombre || "No especificado",
        carnet: pago.contacto.carnet || undefined,
        telefono: pago.contacto.telefono || undefined,
        direccion: pago.contacto.direccion || undefined,
      },
      total_pagado_anteriormente:
        totalPagadoAnteriormente > 0 ? totalPagadoAnteriormente : undefined,
      monto_pendiente_despues_pago: pendienteDespuesPago,
    });
  };

  const handleOpenDevolucionDialog = (pago: PagoConOferta) => {
    setPagoParaDevolucion(pago);
    setDevolucionDialogOpen(true);
  };

  const handleDevolucionSuccess = async () => {
    setDevolucionDialogOpen(false);
    setPagoParaDevolucion(null);
    if (onPagoUpdated) {
      await onPagoUpdated();
    }
  };

  const handleOpenEditDialog = (pago: PagoConOferta) => {
    setPagoParaEditar(pago);
    setEditDialogOpen(true);
  };

  const handleEditSuccess = async () => {
    setEditDialogOpen(false);
    setPagoParaEditar(null);
    if (onPagoUpdated) {
      await onPagoUpdated();
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
            <TableHead className="w-[170px] text-center">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredPagos.map((pago) => (
            <TableRow
              key={pago.id}
              className={
                isOfertaCancelada(pago.oferta.estado)
                  ? "bg-red-50 hover:bg-red-100 border-red-200"
                  : "hover:bg-gray-50"
              }
            >
              <TableCell className="font-mono text-xs py-3">
                {pago.id.slice(-8)}
              </TableCell>
              <TableCell className="text-sm py-3 whitespace-nowrap">
                {formatDate(pago.fecha)}
              </TableCell>
              <TableCell className="font-medium text-sm py-3">
                {pago.oferta.numero_oferta}
                {isOfertaCancelada(pago.oferta.estado) && (
                  <div className="mt-1">
                    <Badge className="bg-red-100 text-red-700">
                      Devolucion
                    </Badge>
                  </div>
                )}
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
                      className="bg-emerald-50 text-emerald-700"
                    >
                      +{formatCurrency(pago.diferencia.monto)}
                    </Badge>
                  </div>
                )}
              </TableCell>
              <TableCell className="text-right py-3">
                <div className="font-semibold text-sm text-emerald-700">
                  {formatCurrency(
                    isOfertaCancelada(pago.oferta.estado)
                      ? 0
                      : (pago.pendienteDespuesPago ?? 0),
                  )}
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
                      className="bg-emerald-50 text-emerald-700 w-fit text-xs"
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
                      <summary className="cursor-pointer text-emerald-600 hover:underline">
                        Ver justificación excedente
                      </summary>
                      <div className="mt-1 p-2 bg-emerald-50 border border-emerald-200 rounded">
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
                  {puedeEditar && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditDialog(pago)}
                      className="h-8 w-8 p-0 text-blue-700 border-blue-300 hover:bg-blue-50"
                      title="Editar cobro"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDevolucionDialog(pago)}
                    className="h-8 w-8 p-0 text-amber-700 border-amber-300 hover:bg-amber-50"
                    title="Registrar devolucion"
                  >
                    <RotateCcw className="h-4 w-4" />
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
                <PagoTrazabilidad pago={pago} className="justify-center mt-1.5" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {pagoParaDevolucion && (
        <RegistrarDevolucionPagoDialog
          open={devolucionDialogOpen}
          onOpenChange={setDevolucionDialogOpen}
          pago={pagoParaDevolucion}
          codigoCliente={pagoParaDevolucion.contacto?.codigo || null}
          onSuccess={handleDevolucionSuccess}
        />
      )}

      {puedeEditar && pagoParaEditar && (
        <EditarPagoDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          pago={pagoParaEditar}
          oferta={pagoParaEditar.oferta}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}
