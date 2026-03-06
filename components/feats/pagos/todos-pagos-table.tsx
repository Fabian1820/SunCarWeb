"use client";

import React, { useState, useMemo } from "react";
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
import { Label } from "@/components/shared/atom/label";
import { Input } from "@/components/shared/molecule/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import {
  Loader2,
  ChevronDown,
  ChevronRight,
  Receipt,
  FileText,
  Search,
} from "lucide-react";
import type { OfertaConPagos } from "@/lib/services/feats/pagos/pago-service";
import { ExportComprobanteService } from "@/lib/services/feats/pagos/export-comprobante-service";
import { FacturaContabilidadService } from "@/lib/services/feats/facturas/factura-contabilidad-service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

interface TodosPagosTableProps {
  ofertasConPagos: OfertaConPagos[];
  loading: boolean;
  showSearch?: boolean;
  onFacturaCreada?: () => void | Promise<void>;
}

const toCleanString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const getTodayInputDate = () => {
  const today = new Date();
  const localDate = new Date(
    today.getTime() - today.getTimezoneOffset() * 60000,
  );
  return localDate.toISOString().slice(0, 10);
};

const normalizeEstadoKey = (estado: string) =>
  estado
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const ESTADO_CLIENTE_LABELS: Record<string, string> = {
  "equipo instalado con exito": "Equipo instalado con éxito",
  "pendiente de instalacion": "Pendiente de instalación",
  "instalacion en proceso": "Instalación en Proceso",
  "esperando equipo": "Esperando equipo",
  "no interesado": "No interesado",
  "pendiente de presupuesto": "Pendiente de presupuesto",
  "pendiente de visita": "Pendiente de visita",
  "pendiente de visitarnos": "Pendiente de visitarnos",
  proximamente: "Próximamente",
  "revisando ofertas": "Revisando ofertas",
  "sin respuesta": "Sin respuesta",
};

const ESTADO_CLIENTE_BADGE_CLASS: Record<string, string> = {
  "equipo instalado con exito": "bg-green-100 text-green-700 border-green-300",
  "pendiente de instalacion": "bg-amber-100 text-amber-800 border-amber-300",
  "instalacion en proceso": "bg-blue-100 text-blue-700 border-blue-300",
  "esperando equipo": "bg-cyan-100 text-cyan-800 border-cyan-300",
  "no interesado": "bg-slate-200 text-slate-700 border-slate-300",
  "pendiente de presupuesto": "bg-purple-100 text-purple-800 border-purple-300",
  "pendiente de visita": "bg-sky-100 text-sky-800 border-sky-300",
  "pendiente de visitarnos": "bg-pink-100 text-pink-800 border-pink-300",
  proximamente: "bg-indigo-100 text-indigo-800 border-indigo-300",
  "revisando ofertas": "bg-violet-100 text-violet-800 border-violet-300",
  "sin respuesta": "bg-red-100 text-red-700 border-red-300",
};

const normalizeEstadoClienteLabel = (estado: string) =>
  ESTADO_CLIENTE_LABELS[normalizeEstadoKey(estado)] || estado;

const getEstadoCliente = (oferta: OfertaConPagos): string => {
  const estado =
    toCleanString(oferta.contacto?.estado) ||
    toCleanString(oferta.contacto?.estado_cliente) ||
    toCleanString(oferta.estado_cliente) ||
    toCleanString(oferta.cliente_estado) ||
    toCleanString(oferta.cliente?.estado) ||
    toCleanString(oferta.lead?.estado) ||
    "Sin estado";

  return normalizeEstadoClienteLabel(estado);
};

const getEstadoClienteBadgeClass = (estado: string) => {
  return (
    ESTADO_CLIENTE_BADGE_CLASS[normalizeEstadoKey(estado)] ||
    "bg-gray-100 text-gray-700 border-gray-300"
  );
};

const parseNullableNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toEpochMs = (value: string): number => {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
};

const roundToCents = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const getMontoAplicadoUsd = (pago: OfertaConPagos["pagos"][number]): number => {
  const diferencia = pago.diferencia?.monto ?? 0;
  return Math.max(0, pago.monto_usd - diferencia);
};

const ordenarPagosCronologicamente = (
  pagos: OfertaConPagos["pagos"],
): OfertaConPagos["pagos"] =>
  [...pagos].sort((a, b) => {
    const diffFecha = toEpochMs(a.fecha) - toEpochMs(b.fecha);
    if (diffFecha !== 0) return diffFecha;

    const diffCreacion =
      toEpochMs(a.fecha_creacion) - toEpochMs(b.fecha_creacion);
    if (diffCreacion !== 0) return diffCreacion;

    return a.id.localeCompare(b.id);
  });

export function TodosPagosTable({
  ofertasConPagos,
  loading,
  showSearch = true,
  onFacturaCreada,
}: TodosPagosTableProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [expandedOfertas, setExpandedOfertas] = useState<Set<string>>(
    new Set(),
  );
  const [expandedExcedentes, setExpandedExcedentes] = useState<Set<string>>(
    new Set(),
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [ofertaParaFacturar, setOfertaParaFacturar] =
    useState<OfertaConPagos | null>(null);
  const [nombreFactura, setNombreFactura] = useState("");
  const [fechaEmision, setFechaEmision] = useState(getTodayInputDate);
  const [creandoFactura, setCreandoFactura] = useState(false);

  // Filtrar ofertas según búsqueda
  const filteredOfertas = useMemo(() => {
    if (!searchTerm) return ofertasConPagos;

    const term = searchTerm.toLowerCase();
    return ofertasConPagos.filter((oferta) => {
      const clienteNombre = oferta.contacto?.nombre || "";
      const clienteTelefono = oferta.contacto?.telefono || "";
      const clienteCarnet = oferta.contacto?.carnet || "";
      const estadoCliente = getEstadoCliente(oferta).toLowerCase();

      return (
        oferta.numero_oferta.toLowerCase().includes(term) ||
        clienteNombre.toLowerCase().includes(term) ||
        clienteTelefono.includes(term) ||
        clienteCarnet.includes(term) ||
        oferta.almacen_nombre?.toLowerCase().includes(term) ||
        estadoCliente.includes(term)
      );
    });
  }, [ofertasConPagos, searchTerm]);

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

  const toggleOferta = (ofertaId: string) => {
    const newExpanded = new Set(expandedOfertas);
    if (newExpanded.has(ofertaId)) {
      newExpanded.delete(ofertaId);
    } else {
      newExpanded.add(ofertaId);
    }
    setExpandedOfertas(newExpanded);
  };

  const toggleExcedente = (pagoId: string) => {
    const newExpanded = new Set(expandedExcedentes);
    if (newExpanded.has(pagoId)) {
      newExpanded.delete(pagoId);
    } else {
      newExpanded.add(pagoId);
    }
    setExpandedExcedentes(newExpanded);
  };

  const getTotalesParaPago = (
    oferta: OfertaConPagos,
    pagoId: string,
  ): { totalPagadoAnteriormente: number; pendienteDespuesPago: number } => {
    const pagosOrdenados = ordenarPagosCronologicamente(oferta.pagos);
    const indicePago = pagosOrdenados.findIndex((p) => p.id === pagoId);

    if (indicePago < 0) {
      return {
        totalPagadoAnteriormente: 0,
        pendienteDespuesPago: roundToCents(Math.max(0, oferta.precio_final)),
      };
    }

    const totalPagadoAnteriormente = pagosOrdenados
      .slice(0, indicePago)
      .reduce((sum, p) => sum + getMontoAplicadoUsd(p), 0);

    const totalPagadoConEste =
      totalPagadoAnteriormente +
      getMontoAplicadoUsd(pagosOrdenados[indicePago]);

    const pendienteCrudo = oferta.precio_final - totalPagadoConEste;
    const pendienteNormalizado =
      pendienteCrudo < 0.01 && pendienteCrudo > -0.01
        ? 0
        : Math.max(0, pendienteCrudo);

    return {
      totalPagadoAnteriormente: roundToCents(totalPagadoAnteriormente),
      pendienteDespuesPago: roundToCents(pendienteNormalizado),
    };
  };

  const handleExportarComprobante = (
    oferta: OfertaConPagos,
    pago: OfertaConPagos["pagos"][number],
  ) => {
    const { totalPagadoAnteriormente, pendienteDespuesPago } =
      getTotalesParaPago(oferta, pago.id);

    ExportComprobanteService.generarComprobantePDF({
      pago: pago,
      oferta: {
        numero_oferta: oferta.numero_oferta,
        nombre_completo: oferta.nombre_completo,
        precio_final: oferta.precio_final,
      },
      contacto: {
        nombre: oferta.contacto.nombre || "No especificado",
        carnet: oferta.contacto.carnet ?? undefined,
        telefono: oferta.contacto.telefono ?? undefined,
        direccion: oferta.contacto.direccion ?? undefined,
      },
      total_pagado_anteriormente:
        totalPagadoAnteriormente > 0 ? totalPagadoAnteriormente : undefined,
      monto_pendiente_despues_pago: pendienteDespuesPago,
    });
  };

  const openMoveDialog = (oferta: OfertaConPagos) => {
    setOfertaParaFacturar(oferta);
    setNombreFactura(oferta.numero_oferta || "");
    setFechaEmision(getTodayInputDate());
    setMoveDialogOpen(true);
  };

  const closeMoveDialog = (open: boolean) => {
    setMoveDialogOpen(open);
    if (!open && !creandoFactura) {
      setOfertaParaFacturar(null);
      setNombreFactura("");
      setFechaEmision(getTodayInputDate());
    }
  };

  const handleMoverAFacturacion = async () => {
    if (!ofertaParaFacturar) return;

    const numeroFactura = nombreFactura.trim();
    if (!numeroFactura) {
      toast({
        title: "Nombre de factura requerido",
        description: "Debes escribir un nombre para la factura.",
        variant: "destructive",
      });
      return;
    }

    if (!fechaEmision) {
      toast({
        title: "Fecha requerida",
        description: "Debes seleccionar la fecha de emisión.",
        variant: "destructive",
      });
      return;
    }

    setCreandoFactura(true);
    try {
      const emitidaPor =
        toCleanString(user?.nombre) || toCleanString(user?.ci) || "Sistema";
      const tipoContacto = toCleanString(
        ofertaParaFacturar.contacto?.tipo_contacto,
      );
      if (tipoContacto && tipoContacto !== "cliente") {
        throw new Error(
          "Solo se pueden emitir facturas de contabilidad para ofertas asociadas a clientes.",
        );
      }

      const idOfertaConfeccion =
        toCleanString(ofertaParaFacturar.oferta_id) ||
        toCleanString(ofertaParaFacturar.numero_oferta);

      if (!idOfertaConfeccion) {
        throw new Error("La oferta no tiene un identificador válido.");
      }

      const fechaEmisionIso = new Date(
        `${fechaEmision}T12:00:00`,
      ).toISOString();
      const payload = {
        numero_factura: numeroFactura,
        fecha_emision: fechaEmisionIso,
        emitida_por: emitidaPor,
        id_oferta_confeccion: idOfertaConfeccion,
      };

      const response = await FacturaContabilidadService.crearFactura(payload);

      if (
        response?.success === false ||
        response?.error?.message ||
        response?.detail
      ) {
        throw new Error(
          response.error?.message ||
            response.detail ||
            response.message ||
            "No se pudo mover la oferta a facturación.",
        );
      }

      if (!response?.id) {
        throw new Error(
          "El backend no confirmó la creación de la factura de contabilidad.",
        );
      }

      toast({
        title: "Factura enviada a contabilidad",
        description: `Factura ${numeroFactura} creada correctamente.`,
      });

      if (onFacturaCreada) {
        try {
          await onFacturaCreada();
        } catch (refreshError) {
          console.error(
            "No se pudo refrescar la vista tras crear factura de contabilidad:",
            refreshError,
          );
        }
      }

      setMoveDialogOpen(false);
      setOfertaParaFacturar(null);
      setNombreFactura("");
      setFechaEmision(getTodayInputDate());
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo crear la factura de contabilidad para esta oferta.";
      toast({
        title: "Error al mover a facturación",
        description: message,
        variant: "destructive",
      });
    } finally {
      setCreandoFactura(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (ofertasConPagos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No hay cobros registrados</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por cliente, N° oferta, CI, teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {filteredOfertas.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No se encontraron resultados</p>
        </div>
      ) : (
        <div className="text-sm text-gray-600 mb-2">
          Mostrando {filteredOfertas.length} de {ofertasConPagos.length} ofertas
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]"></TableHead>
            <TableHead className="w-[110px]">N° Oferta</TableHead>
            <TableHead className="w-[160px]">Cliente</TableHead>
            <TableHead className="w-[140px]">Estado Cliente</TableHead>
            <TableHead className="w-[100px]">CI</TableHead>
            <TableHead className="text-right w-[110px]">Precio Final</TableHead>
            <TableHead className="text-right w-[120px]">
              Total Materiales
            </TableHead>
            <TableHead className="text-right w-[110px]">Ganancia</TableHead>
            <TableHead className="text-right w-[110px]">
              Total Cobrado
            </TableHead>
            <TableHead className="text-right w-[110px]">Pendiente</TableHead>
            <TableHead className="w-[80px] text-center">Cobros</TableHead>
            <TableHead className="w-[140px]">Almacén</TableHead>
            <TableHead className="w-[70px] text-center">Acción</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredOfertas.map((oferta) => {
            const isExpanded = expandedOfertas.has(oferta.oferta_id);
            return (
              <React.Fragment key={oferta.oferta_id}>
                {/* Fila principal de la oferta */}
                <TableRow
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleOferta(oferta.oferta_id)}
                >
                  <TableCell className="py-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-sm py-3">
                    <div className="break-words">{oferta.numero_oferta}</div>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex flex-col max-w-[160px] gap-0.5">
                      <span className="font-medium text-sm break-words">
                        {oferta.contacto.nombre || "Sin contacto"}
                      </span>
                      <span className="text-xs text-gray-500">
                        {oferta.contacto.codigo || "-"}
                      </span>
                      {oferta.contacto.telefono && (
                        <span className="text-xs text-gray-600 break-words">
                          {oferta.contacto.telefono}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge
                      variant="outline"
                      className={getEstadoClienteBadgeClass(
                        getEstadoCliente(oferta),
                      )}
                    >
                      {getEstadoCliente(oferta)}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3">
                    <span className="text-sm break-words">
                      {oferta.contacto.carnet || "-"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-sm py-3">
                    <div className="break-words">
                      {formatCurrency(oferta.precio_final)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-sm py-3">
                    {(() => {
                      const totalMateriales = parseNullableNumber(
                        oferta.total_materiales ?? oferta.totalMateriales,
                      );
                      return (
                        <div className="break-words text-slate-700">
                          {totalMateriales !== null
                            ? formatCurrency(totalMateriales)
                            : "-"}
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-sm py-3">
                    {(() => {
                      const totalMateriales = parseNullableNumber(
                        oferta.total_materiales ?? oferta.totalMateriales,
                      );
                      const ganancia =
                        totalMateriales !== null
                          ? oferta.precio_final - totalMateriales
                          : null;
                      return (
                        <div className="break-words text-blue-700">
                          {ganancia !== null ? formatCurrency(ganancia) : "-"}
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-sm py-3">
                    <div className="break-words text-green-700">
                      {formatCurrency(oferta.total_pagado)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-sm py-3">
                    <div className="break-words text-orange-700">
                      {formatCurrency(oferta.monto_pendiente)}
                    </div>
                  </TableCell>
                  <TableCell className="text-center py-3">
                    <Badge
                      variant="outline"
                      className="bg-blue-50 text-blue-700"
                    >
                      {oferta.cantidad_pagos}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3">
                    <span className="text-sm break-words">
                      {oferta.almacen_nombre || "-"}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      title="Mover a facturación"
                      aria-label="Mover a facturación"
                      onClick={(e) => {
                        e.stopPropagation();
                        openMoveDialog(oferta);
                      }}
                    >
                      <Receipt className="h-4 w-4" />
                      <span className="sr-only">Mover a facturación</span>
                    </Button>
                  </TableCell>
                </TableRow>

                {/* Filas expandidas con los pagos */}
                {isExpanded && (
                  <TableRow>
                    <TableCell colSpan={13} className="bg-gray-50 p-0">
                      <div className="p-3 border-t border-gray-200">
                        <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <span className="h-1 w-1 rounded-full bg-blue-600"></span>
                          Detalle de Cobros ({oferta.cantidad_pagos})
                        </h4>
                        <div className="space-y-2">
                          {/* Ordenar pagos por fecha (más antiguos primero) */}
                          {ordenarPagosCronologicamente(oferta.pagos).map(
                            (pago, index) => {
                              const { pendienteDespuesPago } =
                                getTotalesParaPago(oferta, pago.id);

                              return (
                                <div
                                  key={pago.id}
                                  className="bg-white rounded border border-gray-200 p-2 shadow-sm"
                                >
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                    {/* Columna 1: Información del Pago */}
                                    <div className="space-y-1.5">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-gray-500">
                                          #{index + 1}
                                        </span>
                                        {getTipoPagoBadge(pago.tipo_pago)}
                                      </div>
                                      <div>
                                        <span className="text-xs text-gray-500 block">
                                          Fecha
                                        </span>
                                        <span className="text-sm font-medium text-gray-900">
                                          {formatDate(pago.fecha)}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-xs text-gray-500 block">
                                          Monto Cobrado
                                        </span>
                                        <span className="text-sm font-semibold text-green-700">
                                          {formatCurrency(pago.monto)}{" "}
                                          {pago.moneda}
                                        </span>
                                        {pago.moneda !== "USD" && (
                                          <div className="text-xs text-gray-500">
                                            Tasa: {pago.tasa_cambio} →{" "}
                                            {formatCurrency(pago.monto_usd)} USD
                                          </div>
                                        )}
                                        {pago.moneda === "USD" && (
                                          <div className="text-xs text-green-600">
                                            = {formatCurrency(pago.monto_usd)}{" "}
                                            USD
                                          </div>
                                        )}
                                      </div>
                                      {pago.diferencia && (
                                        <div className="mt-1">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleExcedente(pago.id);
                                            }}
                                            className="text-xs text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1 cursor-pointer"
                                          >
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
                                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                              />
                                            </svg>
                                            Excedente: +
                                            {formatCurrency(
                                              pago.diferencia.monto,
                                            )}
                                            <svg
                                              className={`w-3 h-3 transition-transform ${expandedExcedentes.has(pago.id) ? "rotate-180" : ""}`}
                                              fill="none"
                                              stroke="currentColor"
                                              viewBox="0 0 24 24"
                                            >
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M19 9l-7 7-7-7"
                                              />
                                            </svg>
                                          </button>
                                          {expandedExcedentes.has(pago.id) && (
                                            <p className="text-xs text-gray-700 italic mt-1 pl-4">
                                              {pago.diferencia.justificacion}
                                            </p>
                                          )}
                                        </div>
                                      )}
                                      <div>
                                        <span className="text-xs text-gray-500 block">
                                          Pendiente después
                                        </span>
                                        <span className="text-sm font-semibold text-orange-700">
                                          {formatCurrency(pendienteDespuesPago)}{" "}
                                          USD
                                        </span>
                                      </div>
                                    </div>

                                    {/* Columna 2: Método de Pago */}
                                    <div className="space-y-1.5">
                                      <div>
                                        <span className="text-xs font-semibold text-gray-500 block mb-1">
                                          MÉTODO
                                        </span>
                                        {getMetodoPagoBadge(pago.metodo_pago)}
                                      </div>
                                      {pago.metodo_pago === "efectivo" &&
                                        pago.recibido_por && (
                                          <div>
                                            <span className="text-xs text-gray-500 block">
                                              Recibido por
                                            </span>
                                            <span className="text-sm font-medium text-gray-900">
                                              {pago.recibido_por}
                                            </span>
                                          </div>
                                        )}
                                      {(pago.metodo_pago ===
                                        "transferencia_bancaria" ||
                                        pago.metodo_pago === "stripe") &&
                                        pago.comprobante_transferencia && (
                                          <div>
                                            <span className="text-xs text-gray-500 block">
                                              Comprobante
                                            </span>
                                            <a
                                              href={
                                                pago.comprobante_transferencia
                                              }
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                                              onClick={(e) =>
                                                e.stopPropagation()
                                              }
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
                                          </div>
                                        )}
                                    </div>

                                    {/* Columna 3: Pagador */}
                                    <div className="space-y-1.5">
                                      <div>
                                        <span className="text-xs font-semibold text-gray-500 block">
                                          PAGADOR
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-sm font-medium text-gray-900 block">
                                          {pago.nombre_pagador ||
                                            oferta.contacto.nombre ||
                                            "No especificado"}
                                        </span>
                                        {!pago.pago_cliente && (
                                          <Badge
                                            variant="outline"
                                            className="bg-orange-50 text-orange-700 text-xs mt-1"
                                          >
                                            Tercero
                                          </Badge>
                                        )}
                                      </div>
                                      {pago.carnet_pagador && (
                                        <div>
                                          <span className="text-xs text-gray-500 block">
                                            CI
                                          </span>
                                          <span className="text-sm text-gray-700">
                                            {pago.carnet_pagador}
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Columna 4: Desglose de Billetes */}
                                    <div className="space-y-1.5">
                                      {pago.metodo_pago === "efectivo" &&
                                        pago.desglose_billetes &&
                                        Object.keys(pago.desglose_billetes)
                                          .length > 0 && (
                                          <div>
                                            <span className="text-xs font-semibold text-gray-500 block mb-1">
                                              DESGLOSE
                                            </span>
                                            <div className="space-y-0.5 bg-gray-50 rounded p-1.5 border border-gray-200">
                                              {Object.entries(
                                                pago.desglose_billetes,
                                              )
                                                .sort(
                                                  ([a], [b]) =>
                                                    parseFloat(b) -
                                                    parseFloat(a),
                                                )
                                                .map(
                                                  ([
                                                    denominacion,
                                                    cantidad,
                                                  ]) => (
                                                    <div
                                                      key={denominacion}
                                                      className="flex justify-between text-xs"
                                                    >
                                                      <span className="text-gray-600">
                                                        {cantidad}x{" "}
                                                        {denominacion}
                                                      </span>
                                                      <span className="font-medium text-gray-900">
                                                        {formatCurrency(
                                                          parseFloat(
                                                            denominacion,
                                                          ) * cantidad,
                                                        )}
                                                      </span>
                                                    </div>
                                                  ),
                                                )}
                                            </div>
                                          </div>
                                        )}
                                      {pago.notas && (
                                        <div>
                                          <span className="text-xs text-gray-500 block">
                                            Notas
                                          </span>
                                          <span className="text-xs text-gray-700 italic">
                                            {pago.notas}
                                          </span>
                                        </div>
                                      )}

                                      {/* Botón de exportar comprobante */}
                                      <div className="pt-1">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleExportarComprobante(
                                              oferta,
                                              pago,
                                            );
                                          }}
                                          className="w-full h-7 text-xs"
                                        >
                                          <FileText className="h-3 w-3 mr-1" />
                                          Comprobante
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            },
                          )}
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

      <Dialog open={moveDialogOpen} onOpenChange={closeMoveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mover a facturación</DialogTitle>
            <DialogDescription>
              {ofertaParaFacturar ? (
                <>
                  Oferta <strong>{ofertaParaFacturar.numero_oferta}</strong> de{" "}
                  <strong>
                    {ofertaParaFacturar.contacto.nombre || "Sin contacto"}
                  </strong>
                </>
              ) : (
                "Completa los datos de la factura."
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre-factura-mover">Nombre de factura</Label>
              <Input
                id="nombre-factura-mover"
                value={nombreFactura}
                onChange={(e) => setNombreFactura(e.target.value)}
                placeholder="Ej: FC-2026-001"
                disabled={creandoFactura}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha-emision-mover">Fecha de emisión</Label>
              <Input
                id="fecha-emision-mover"
                type="date"
                value={fechaEmision}
                onChange={(e) => setFechaEmision(e.target.value)}
                disabled={creandoFactura}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => closeMoveDialog(false)}
              disabled={creandoFactura}
            >
              Cancelar
            </Button>
            <Button onClick={handleMoverAFacturacion} disabled={creandoFactura}>
              {creandoFactura ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                "Crear factura"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
