"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { Card, CardContent } from "@/components/shared/molecule/card";
import { Badge } from "@/components/shared/atom/badge";
import { Button } from "@/components/shared/atom/button";
import { Progress } from "@/components/shared/atom/progress";
import {
  ArrowLeft,
  Building2,
  Eye,
  Package,
  Download,
  Edit,
  Trash2,
} from "lucide-react";
import { useMaterials } from "@/hooks/use-materials";
import { useEffect, useMemo, useState } from "react";
import type { OfertaConfeccion } from "@/hooks/use-ofertas-confeccion";
import { GenerarLinkPagoConfeccionButton } from "./generar-link-pago-confeccion-button";

interface VerOfertaClienteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  oferta: OfertaConfeccion | null;
  ofertas?: OfertaConfeccion[];
  onEditar?: (oferta: OfertaConfeccion) => void;
  onEliminar?: (oferta: OfertaConfeccion) => void;
  onExportar?: (oferta: OfertaConfeccion) => void;
}

const getEstadoBadge = (estado: string) => {
  const badges = {
    en_revision: {
      label: "En Revisión",
      className: "bg-yellow-100 text-yellow-800",
    },
    aprobada_para_enviar: {
      label: "Aprobada",
      className: "bg-blue-100 text-blue-800",
    },
    enviada_a_cliente: {
      label: "Enviada",
      className: "bg-purple-100 text-purple-800",
    },
    confirmada_por_cliente: {
      label: "Confirmada",
      className: "bg-green-100 text-green-800",
    },
    reservada: {
      label: "Reservada",
      className: "bg-orange-100 text-orange-800",
    },
    rechazada: { label: "Rechazada", className: "bg-red-100 text-red-800" },
    cancelada: { label: "Cancelada", className: "bg-slate-200 text-slate-700" },
  };
  return badges[estado as keyof typeof badges] || badges.en_revision;
};

const formatCurrency = (value: number) => {
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
};

const formatCurrencyWithSymbol = (value: number, symbol: string) => {
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return symbol === "CUP" ? `${formatted} CUP` : `${symbol}${formatted}`;
};

const formatDateTime = (value?: string) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

const formatDateOnly = (value?: string) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-ES", {
    dateStyle: "short",
  });
};

export function VerOfertaClienteDialog({
  open,
  onOpenChange,
  oferta: ofertaInicial,
  ofertas = [],
  onEditar,
  onEliminar,
  onExportar,
}: VerOfertaClienteDialogProps) {
  const { materials } = useMaterials();
  const [modoVista, setModoVista] = useState<"listado" | "detalle">("detalle");
  const [ofertaSeleccionadaIndex, setOfertaSeleccionadaIndex] = useState(0);

  const ofertasDisponibles = useMemo(() => {
    if (ofertas.length > 0) return ofertas;
    return ofertaInicial ? [ofertaInicial] : [];
  }, [ofertas, ofertaInicial]);

  useEffect(() => {
    if (!open) {
      setModoVista("detalle");
      setOfertaSeleccionadaIndex(0);
      return;
    }

    if (ofertasDisponibles.length > 1) {
      setModoVista("listado");
      setOfertaSeleccionadaIndex(0);
      return;
    }

    setModoVista("detalle");
    setOfertaSeleccionadaIndex(0);
  }, [open, ofertasDisponibles.length]);

  const oferta = useMemo(() => {
    if (ofertasDisponibles.length === 0) return null;
    return ofertasDisponibles[ofertaSeleccionadaIndex] ?? ofertasDisponibles[0];
  }, [ofertasDisponibles, ofertaSeleccionadaIndex]);

  // Manejar el cierre del diálogo
  const handleClose = () => {
    // Si estamos en modo detalle y hay múltiples ofertas, regresar al listado
    if (modoVista === "detalle" && ofertasDisponibles.length > 1) {
      setModoVista("listado");
      return;
    }

    // Si estamos en listado o solo hay una oferta, cerrar el diálogo
    onOpenChange(false);
  };

  // Crear mapa de materiales para obtener fotos
  const materialesMap = useMemo(() => {
    const map = new Map<
      string,
      { foto?: string; nombre?: string; descripcion?: string }
    >();
    materials.forEach((material) => {
      const codigo = material.codigo?.toString();
      if (!codigo) return;
      map.set(codigo, {
        foto: material.foto,
        nombre: material.nombre,
        descripcion: material.descripcion,
      });
    });
    return map;
  }, [materials]);

  // Calcular totales y conversión solo si hay oferta
  const calcularTotalesDetalle = () => {
    if (!oferta)
      return { base: 0, contribucion: 0, totalSinRedondeo: 0, redondeo: 0 };
    const base =
      (oferta.subtotal_con_margen || 0) +
      (oferta.costo_transportacion || 0) +
      (oferta.total_elementos_personalizados || 0) +
      (oferta.total_costos_extras || 0);
    const porcentaje = oferta.porcentaje_contribucion || 0;
    const contribucion = oferta.aplica_contribucion
      ? base * (porcentaje / 100)
      : 0;
    const totalSinRedondeo = base + contribucion;
    const redondeo = (oferta.precio_final || 0) - totalSinRedondeo;
    return { base, contribucion, totalSinRedondeo, redondeo };
  };

  const calcularConversion = () => {
    if (!oferta) return null;
    const moneda = oferta.moneda_pago || "USD";
    const tasa = oferta.tasa_cambio || 0;
    if (moneda === "USD" || tasa <= 0) return null;
    const base = oferta.precio_final || 0;
    const convertido = moneda === "EUR" ? base / tasa : base * tasa;
    return { moneda, tasa, convertido };
  };

  const totalesDetalle = calcularTotalesDetalle();
  const conversionDetalle = calcularConversion();
  const materialesEntregadosDetalle = useMemo(() => {
    return (oferta?.items || []).map((item, index) => {
      const entregas = Array.isArray(item.entregas)
        ? item.entregas.map((entrega) => ({
            cantidad: Number(entrega?.cantidad || 0),
            fecha: entrega?.fecha || "",
          }))
        : [];
      const totalEntregado = entregas.reduce(
        (sum, entrega) => sum + (Number(entrega.cantidad) || 0),
        0,
      );
      const pendienteCalculado = Math.max(
        0,
        (Number(item.cantidad) || 0) - totalEntregado,
      );
      const pendiente =
        Number.isFinite(Number(item.cantidad_pendiente_por_entregar)) &&
        item.cantidad_pendiente_por_entregar !== undefined
          ? Number(item.cantidad_pendiente_por_entregar)
          : pendienteCalculado;

      return {
        id: `${item.material_codigo || "sin-codigo"}-${index}`,
        descripcion: item.descripcion || "Material sin descripción",
        material_codigo: item.material_codigo || "--",
        cantidadTotal: Number(item.cantidad) || 0,
        totalEntregado,
        cantidadPendiente: pendiente,
        entregas,
      };
    });
  }, [oferta]);
  const precioFinalOferta = oferta
    ? Math.max(0, Number(oferta.precio_final || 0))
    : 0;
  const montoPendienteOferta = oferta
    ? Math.max(0, Number(oferta.monto_pendiente || 0))
    : 0;
  const montoPagadoOferta = Math.max(
    0,
    precioFinalOferta - montoPendienteOferta,
  );
  const porcentajePagadoOferta =
    precioFinalOferta > 0
      ? Math.min(100, (montoPagadoOferta / precioFinalOferta) * 100)
      : 0;

  // Early return DESPUÉS de todos los hooks
  if (!oferta) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>No hay oferta seleccionada</DialogTitle>
          </DialogHeader>
          <div className="flex-1 flex items-center justify-center">
            <p className="text-slate-500">
              No se pudo cargar la información de la oferta.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="flex flex-wrap items-center gap-2">
              {modoVista === "listado" ? (
                <span className="text-lg font-semibold">
                  Ofertas del cliente ({ofertasDisponibles.length})
                </span>
              ) : (
                <>
                  <span className="text-lg font-semibold">{oferta.nombre}</span>
                  {ofertasDisponibles.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setModoVista("listado")}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Volver al listado
                    </Button>
                  )}
                </>
              )}
            </DialogTitle>

            {/* Botones de acción - solo en modo detalle */}
            {modoVista === "detalle" && oferta && (
              <div className="flex items-center gap-2">
                {onExportar && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onExportar(oferta)}
                    title="Exportar oferta"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
                <GenerarLinkPagoConfeccionButton
                  oferta={oferta}
                  variant="outline"
                  size="sm"
                />
                {onEditar && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onEditar(oferta)}
                    title="Editar oferta"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                {onEliminar && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => onEliminar(oferta)}
                    title="Eliminar oferta"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogHeader>

        {modoVista === "listado" ? (
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            <div className="space-y-3">
              {ofertasDisponibles.map((ofertaItem, index) => (
                <Card
                  key={`${ofertaItem.id || ofertaItem.numero_oferta || index}`}
                  className="border border-slate-200 hover:border-orange-300 transition-colors"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-semibold text-slate-900 truncate">
                            {ofertaItem.nombre}
                          </h4>
                          <Badge
                            className={
                              getEstadoBadge(ofertaItem.estado).className
                            }
                          >
                            {getEstadoBadge(ofertaItem.estado).label}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500">
                          Nro: {ofertaItem.numero_oferta || ofertaItem.id}
                        </p>
                        <p className="text-xs text-slate-500">
                          Precio:{" "}
                          {ofertaItem.moneda_pago === "USD"
                            ? `$${formatCurrency(ofertaItem.precio_final || 0)}`
                            : formatCurrencyWithSymbol(
                                ofertaItem.precio_final || 0,
                                ofertaItem.moneda_pago === "EUR"
                                  ? "EUR "
                                  : "CUP",
                              )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {onExportar && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onExportar(ofertaItem)}
                            title="Exportar oferta"
                            className="h-8 w-8 p-0"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        {onEditar && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onEditar(ofertaItem)}
                            title="Editar oferta"
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {onEliminar && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                            onClick={() => onEliminar(ofertaItem)}
                            title="Eliminar oferta"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          className="bg-orange-600 hover:bg-orange-700 text-white"
                          onClick={() => {
                            setOfertaSeleccionadaIndex(index);
                            setModoVista("detalle");
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : !oferta ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-slate-500">
              No se pudo cargar la información de la oferta.
            </p>
          </div>
        ) : (
          <>
            <Card className="border-slate-200 mb-4 shrink-0">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Progreso de pago</span>
                  <span className="font-semibold text-slate-900">
                    {porcentajePagadoOferta.toFixed(1)}%
                  </span>
                </div>
                <Progress
                  value={porcentajePagadoOferta}
                  className="h-2.5 bg-slate-200 [&>div]:bg-emerald-500"
                />
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>
                    Pagado:{" "}
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(montoPagadoOferta)}
                    </span>
                  </span>
                  <span>
                    Pendiente:{" "}
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(montoPendienteOferta)}
                    </span>
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-[360px,1fr] gap-6 flex-1 min-h-0 overflow-hidden">
              {/* Columna izquierda - Información general */}
              <div className="h-full min-h-0 overflow-hidden">
                <div className="space-y-4 pr-1 lg:pr-2 overflow-y-auto max-h-full">
                  {/* Foto de portada */}
                  <Card className="overflow-hidden border-slate-200">
                    <CardContent className="p-0">
                      <div className="relative h-52 bg-gradient-to-br from-slate-50 via-orange-50 to-yellow-100 overflow-hidden">
                        {oferta.foto_portada ? (
                          <img
                            src={oferta.foto_portada}
                            alt={oferta.nombre}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="h-20 w-20 rounded-2xl bg-white/80 border border-orange-100 flex items-center justify-center shadow-sm">
                              <Building2 className="h-10 w-10 text-orange-400" />
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Información de la oferta */}
                  <Card className="border-slate-200">
                    <CardContent className="p-4 space-y-3">
                      <div className="text-sm text-slate-500">
                        Información de la oferta
                      </div>
                      <div className="space-y-2 text-sm text-slate-700">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Tipo</span>
                          <span className="font-semibold text-slate-900">
                            {oferta.tipo === "personalizada"
                              ? "Personalizada"
                              : "Genérica"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Estado</span>
                          <span className="font-semibold text-slate-900">
                            {getEstadoBadge(oferta.estado).label}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Almacén</span>
                          <span className="font-semibold text-slate-900">
                            {oferta.almacen_nombre || "--"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Número</span>
                          <span className="font-semibold text-slate-900">
                            {oferta.numero_oferta || oferta.id}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Información del cliente */}
                  {oferta.tipo === "personalizada" && (
                    <Card className="border-slate-200">
                      <CardContent className="p-4 space-y-3">
                        <div className="text-sm text-slate-500">
                          Información del cliente
                        </div>
                        <div className="space-y-2 text-sm text-slate-700">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Nombre</span>
                            <span className="font-semibold text-slate-900">
                              {oferta.cliente_nombre || "--"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Número</span>
                            <span className="font-semibold text-slate-900">
                              {oferta.cliente_numero || "--"}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Totales */}
                  <Card className="border-slate-200">
                    <CardContent className="p-4 space-y-3">
                      <div className="text-sm text-slate-500">Totales</div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Total materiales</span>
                          <span className="font-semibold text-slate-900">
                            {formatCurrency(oferta.total_materiales || 0)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Margen comercial</span>
                          <span className="font-semibold text-slate-900">
                            {oferta.margen_comercial ?? 0}%
                          </span>
                        </div>
                        {oferta.margen_instalacion !== undefined &&
                          oferta.margen_instalacion > 0 && (
                            <div className="flex items-center justify-between text-slate-600">
                              <span>Margen instalación</span>
                              <span className="font-semibold text-slate-900">
                                {formatCurrency(oferta.margen_instalacion)}
                              </span>
                            </div>
                          )}
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Subtotal con margen</span>
                          <span className="font-semibold text-slate-900">
                            {formatCurrency(oferta.subtotal_con_margen || 0)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Transporte</span>
                          <span className="font-semibold text-slate-900">
                            {formatCurrency(oferta.costo_transportacion || 0)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Costos extras</span>
                          <span className="font-semibold text-slate-900">
                            {formatCurrency(oferta.total_costos_extras || 0)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Elementos personalizados</span>
                          <span className="font-semibold text-slate-900">
                            {formatCurrency(
                              oferta.total_elementos_personalizados || 0,
                            )}
                          </span>
                        </div>
                        {oferta.descuento_porcentaje !== undefined &&
                          oferta.descuento_porcentaje > 0 && (
                            <div className="flex items-center justify-between text-red-600">
                              <span>
                                Descuento ({oferta.descuento_porcentaje}%)
                              </span>
                              <span className="font-semibold">
                                -{formatCurrency(oferta.monto_descuento || 0)}
                              </span>
                            </div>
                          )}
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Contribución</span>
                          <span className="font-semibold text-slate-900">
                            {formatCurrency(totalesDetalle.contribucion)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Total sin redondeo</span>
                          <span className="font-semibold text-slate-900">
                            {formatCurrency(totalesDetalle.totalSinRedondeo)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Redondeo</span>
                          <span className="font-semibold text-slate-900">
                            {formatCurrency(totalesDetalle.redondeo)}
                          </span>
                        </div>

                        {/* Información de pago */}
                        <div className="pt-2 border-t border-slate-200 space-y-2 text-sm text-slate-600">
                          <div className="text-sm text-slate-500">Pago</div>
                          <div className="flex items-center justify-between">
                            <span>Pago por transferencia</span>
                            <span className="font-semibold text-slate-900">
                              {oferta.pago_transferencia ? "Sí" : "No"}
                            </span>
                          </div>
                          {oferta.pago_transferencia && oferta.datos_cuenta && (
                            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
                              {oferta.datos_cuenta}
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <span>Aplica contribución</span>
                            <span className="font-semibold text-slate-900">
                              {oferta.aplica_contribucion ? "Sí" : "No"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Formas de pago acordadas</span>
                            <span className="font-semibold text-slate-900">
                              {oferta.formas_pago_acordadas ? "Sí" : "No"}
                            </span>
                          </div>
                          {oferta.formas_pago_acordadas && (
                            <div className="space-y-2 rounded-md border border-slate-200 bg-white px-3 py-2">
                              <div className="flex items-center justify-between text-xs text-slate-600">
                                <span>Cantidad de pagos</span>
                                <span className="font-semibold text-slate-900">
                                  {oferta.cantidad_pagos_acordados ??
                                    oferta.pagos_acordados?.length ??
                                    0}
                                </span>
                              </div>
                              {(oferta.pagos_acordados || []).map(
                                (pago, index) => (
                                  <div
                                    key={`${pago.fecha_estimada}-${index}`}
                                    className="rounded border border-slate-200 bg-slate-50 px-2 py-2 text-xs text-slate-700 space-y-1"
                                  >
                                    <div className="font-semibold text-slate-800">
                                      Pago #{index + 1}
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span>Monto</span>
                                      <span className="font-medium text-slate-900">
                                        {formatCurrency(pago.monto_usd || 0)}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span>Método</span>
                                      <span className="font-medium text-slate-900 capitalize">
                                        {pago.metodo_pago}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span>Fecha estimada</span>
                                      <span className="font-medium text-slate-900">
                                        {formatDateTime(pago.fecha_estimada)}
                                      </span>
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>
                          )}
                          {oferta.aplica_contribucion && (
                            <div className="flex items-center justify-between">
                              <span>% Contribución</span>
                              <span className="font-semibold text-slate-900">
                                {oferta.porcentaje_contribucion || 0}%
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Moneda de pago */}
                        <div className="pt-2 border-t border-slate-200 space-y-2 text-sm text-slate-600">
                          <div className="flex items-center justify-between">
                            <span>Moneda de pago</span>
                            <span className="font-semibold text-slate-900">
                              {oferta.moneda_pago || "USD"}
                            </span>
                          </div>
                          {oferta.moneda_pago &&
                            oferta.moneda_pago !== "USD" && (
                              <div className="flex items-center justify-between">
                                <span>
                                  {oferta.moneda_pago === "EUR"
                                    ? "1 EUR ="
                                    : "1 USD ="}
                                </span>
                                <span className="font-semibold text-slate-900">
                                  {formatCurrencyWithSymbol(
                                    oferta.tasa_cambio || 0,
                                    oferta.moneda_pago === "EUR" ? "$" : "CUP",
                                  )}
                                </span>
                              </div>
                            )}
                        </div>

                        {/* Precio final */}
                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-slate-800">
                          <span className="font-semibold">Precio final</span>
                          <span className="text-lg font-bold text-orange-600">
                            {formatCurrency(oferta.precio_final || 0)}
                          </span>
                        </div>

                        {/* Compensación y Asumido por Empresa */}
                        {(oferta.compensacion ||
                          oferta.asumido_por_empresa) && (
                          <div className="pt-2 border-t border-slate-200 space-y-2">
                            {oferta.compensacion && (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-orange-700 font-medium">
                                    Compensación
                                  </span>
                                  <span className="font-semibold text-orange-700">
                                    -{" "}
                                    {formatCurrency(
                                      oferta.compensacion.monto_usd || 0,
                                    )}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-600 italic">
                                  {oferta.compensacion.justificacion}
                                </p>
                              </div>
                            )}
                            {oferta.asumido_por_empresa && (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-blue-700 font-medium">
                                    Asumido por Empresa
                                  </span>
                                  <span className="font-semibold text-blue-700">
                                    -{" "}
                                    {formatCurrency(
                                      oferta.asumido_por_empresa.monto_usd || 0,
                                    )}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-600 italic">
                                  {oferta.asumido_por_empresa.justificacion}
                                </p>
                              </div>
                            )}
                            <div className="flex items-center justify-between pt-2 border-t border-orange-200 bg-orange-50 px-3 py-2 rounded-md">
                              <span className="font-semibold text-orange-900">
                                Monto Pendiente Real
                              </span>
                              <span className="text-lg font-bold text-orange-900">
                                {formatCurrency(
                                  (oferta.precio_final || 0) -
                                    (oferta.compensacion?.monto_usd || 0) -
                                    (oferta.asumido_por_empresa?.monto_usd ||
                                      0),
                                )}
                              </span>
                            </div>
                          </div>
                        )}

                        {conversionDetalle && (
                          <div className="flex items-center justify-between text-slate-800">
                            <span className="font-semibold">
                              Precio final en {conversionDetalle.moneda}
                            </span>
                            <span className="text-lg font-bold text-orange-600">
                              {formatCurrencyWithSymbol(
                                conversionDetalle.convertido,
                                conversionDetalle.moneda === "EUR"
                                  ? "EUR "
                                  : "CUP",
                              )}
                            </span>
                          </div>
                        )}

                        {/* Progreso de pago */}
                        <div className="pt-2 border-t border-slate-200 space-y-2">
                          <div className="flex items-center justify-between text-sm text-slate-600">
                            <span>Progreso de pago</span>
                            <span className="font-semibold text-slate-900">
                              {porcentajePagadoOferta.toFixed(1)}%
                            </span>
                          </div>
                          <Progress
                            value={porcentajePagadoOferta}
                            className="h-2.5 bg-slate-200 [&>div]:bg-emerald-500"
                          />
                          <div className="flex items-center justify-between text-xs text-slate-600">
                            <span>
                              Pagado:{" "}
                              <span className="font-semibold text-slate-900">
                                {formatCurrency(montoPagadoOferta)}
                              </span>
                            </span>
                            <span>
                              Pendiente:{" "}
                              <span className="font-semibold text-slate-900">
                                {formatCurrency(montoPendienteOferta)}
                              </span>
                            </span>
                          </div>
                        </div>

                        {/* Notas */}
                        {oferta.notas && (
                          <div className="pt-2 border-t border-slate-200 text-xs text-slate-500">
                            <span className="font-semibold text-slate-600">
                              Notas:
                            </span>{" "}
                            {oferta.notas}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Columna derecha - Materiales */}
              <div className="space-y-4 overflow-y-auto pr-1 lg:pr-3">
                <Card className="border-slate-200">
                  <CardContent className="p-4 space-y-4">
                    <div className="text-sm text-slate-500">
                      Materiales de la oferta
                    </div>

                    {(oferta.items || []).length === 0 ? (
                      <div className="text-sm text-slate-500">
                        No hay materiales registrados.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {Object.entries(
                          (oferta.items || []).reduce<
                            Record<string, NonNullable<typeof oferta.items>>
                          >((acc, item) => {
                            const key = item.seccion || "Sin sección";
                            if (!acc[key]) acc[key] = [];
                            acc[key].push(item);
                            return acc;
                          }, {}),
                        ).map(([seccion, items]) => (
                          <div key={seccion} className="space-y-2">
                            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                              {seccion}
                            </div>
                            <div className="divide-y divide-slate-100 rounded-lg border border-slate-100 bg-white">
                              {items.map((item, idx) => {
                                const material = materialesMap.get(
                                  item.material_codigo?.toString(),
                                );
                                return (
                                  <div
                                    key={`${item.material_codigo}-${idx}`}
                                    className="flex items-center gap-3 p-3"
                                  >
                                    <div className="h-12 w-12 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                                      {material?.foto ? (
                                        <img
                                          src={material.foto}
                                          alt={item.descripcion}
                                          className="w-full h-full object-contain"
                                        />
                                      ) : (
                                        <Package className="h-6 w-6 text-slate-300" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-slate-900 line-clamp-1">
                                        {item.descripcion}
                                      </p>
                                      <p className="text-xs text-slate-500">
                                        {item.categoria} · Código{" "}
                                        {item.material_codigo}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm font-semibold text-slate-900">
                                        {item.cantidad} u
                                      </p>
                                      <p className="text-xs text-slate-500">
                                        ${formatCurrency(item.precio)}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
