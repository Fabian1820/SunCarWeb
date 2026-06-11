"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { Button } from "@/components/shared/atom/button";
import { Badge } from "@/components/shared/atom/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/shared/molecule/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/molecule/table";
import { CreditCard, PackageOpen, Ban } from "lucide-react";
import type { Consignacion } from "@/lib/types/feats/consignaciones/consignacion-types";
import {
  CONSIGNACION_ESTADO_BADGE_CLASSES,
  CONSIGNACION_ESTADO_LABELS,
} from "@/lib/types/feats/consignaciones/consignacion-types";

interface ConsignacionDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consignacion: Consignacion | null;
  onRegistrarPago?: (c: Consignacion) => void;
  onRegistrarDevolucion?: (c: Consignacion) => void;
  onAnular?: (c: Consignacion) => void;
}

const formatMoney = (n: number, moneda: string) =>
  new Intl.NumberFormat("es-CU", {
    style: "currency",
    currency: moneda || "USD",
    minimumFractionDigits: 2,
  }).format(n || 0);

const formatDateTime = (iso?: string | null) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-CU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

const isAbierta = (estado: string) =>
  estado === "activa" ||
  estado === "pagada_parcial" ||
  estado === "devuelta_parcial" ||
  estado === "mixta_parcial";

export function ConsignacionDetailDialog({
  open,
  onOpenChange,
  consignacion,
  onRegistrarPago,
  onRegistrarDevolucion,
  onAnular,
}: ConsignacionDetailDialogProps) {
  if (!consignacion) return null;

  const c = consignacion;
  const moneda = c.moneda || "USD";

  const materialInfoById: Record<
    string,
    { codigo?: string | null; descripcion?: string | null; um?: string | null }
  > = {};
  c.materiales_entregados.forEach((m) => {
    materialInfoById[m.material_id] = {
      codigo: m.material_codigo,
      descripcion: m.material_descripcion,
      um: m.um,
    };
  });

  const pendientesPorMaterial = c.materiales_entregados.map((m) => {
    const devueltoAcum = c.devoluciones
      .flatMap((d) => d.materiales)
      .filter((md) => md.material_id === m.material_id)
      .reduce((acc, md) => acc + md.cantidad, 0);
    return {
      ...m,
      cantidad_devuelta: devueltoAcum,
      cantidad_pendiente: Math.max(m.cantidad - devueltoAcum, 0),
    };
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Consignación
            <Badge
              variant="outline"
              className={
                CONSIGNACION_ESTADO_BADGE_CLASSES[c.estado] ??
                "bg-gray-100 text-gray-700"
              }
            >
              {CONSIGNACION_ESTADO_LABELS[c.estado] ?? c.estado}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
              <span>
                <span className="text-gray-500">Solicitud:</span>{" "}
                <span className="font-medium">
                  {c.solicitud_codigo ?? `#${c.solicitud_venta_id.slice(-6)}`}
                </span>
              </span>
              {c.cliente_nombre && (
                <span>
                  <span className="text-gray-500">Cliente:</span>{" "}
                  <span className="font-medium">{c.cliente_nombre}</span>
                </span>
              )}
              {c.almacen_nombre && (
                <span>
                  <span className="text-gray-500">Almacén:</span>{" "}
                  <span className="font-medium">{c.almacen_nombre}</span>
                </span>
              )}
              <span className="text-gray-500">
                Creada {formatDateTime(c.fecha_creacion)}
              </span>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-lg border bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Total</div>
            <div className="text-lg font-semibold">
              {formatMoney(c.monto_total, moneda)}
            </div>
          </div>
          <div className="rounded-lg border bg-emerald-50 p-3">
            <div className="text-xs text-emerald-700">Pagado en efectivo</div>
            <div className="text-lg font-semibold text-emerald-800">
              {formatMoney(c.monto_pagado_efectivo, moneda)}
            </div>
          </div>
          <div className="rounded-lg border bg-purple-50 p-3">
            <div className="text-xs text-purple-700">Devuelto en mercancía</div>
            <div className="text-lg font-semibold text-purple-800">
              {formatMoney(c.valor_devuelto, moneda)}
            </div>
          </div>
          <div className="rounded-lg border bg-amber-50 p-3">
            <div className="text-xs text-amber-700">Pendiente</div>
            <div className="text-lg font-semibold text-amber-800">
              {formatMoney(c.monto_pendiente, moneda)}
            </div>
            {c.saldo_a_favor > 0 && (
              <div className="mt-1 text-xs text-blue-700">
                Saldo a favor: {formatMoney(c.saldo_a_favor, moneda)}
              </div>
            )}
          </div>
        </div>

        {isAbierta(c.estado) && (
          <div className="flex flex-wrap gap-2">
            {onRegistrarPago && (
              <Button size="sm" onClick={() => onRegistrarPago(c)}>
                <CreditCard className="mr-2 h-4 w-4" />
                Vincular pago
              </Button>
            )}
            {onRegistrarDevolucion && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRegistrarDevolucion(c)}
              >
                <PackageOpen className="mr-2 h-4 w-4" />
                Registrar devolución
              </Button>
            )}
            {onAnular && (
              <Button
                size="sm"
                variant="ghost"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => onAnular(c)}
              >
                <Ban className="mr-2 h-4 w-4" />
                Anular
              </Button>
            )}
          </div>
        )}

        <Tabs defaultValue="materiales" className="mt-2">
          <TabsList>
            <TabsTrigger value="materiales">
              Materiales ({c.materiales_entregados.length})
            </TabsTrigger>
            <TabsTrigger value="pagos">
              Pagos ({c.pagos_ids.length})
            </TabsTrigger>
            <TabsTrigger value="devoluciones">
              Devoluciones ({c.devoluciones.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="materiales">
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Devuelto</TableHead>
                    <TableHead className="text-right">Pendiente</TableHead>
                    <TableHead className="text-right">Precio (cong.)</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendientesPorMaterial.map((m) => (
                    <TableRow key={m.material_id}>
                      <TableCell className="font-mono text-xs">
                        {m.material_codigo ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {m.material_descripcion ?? "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {m.cantidad}
                        {m.um ? ` ${m.um}` : ""}
                      </TableCell>
                      <TableCell className="text-right text-sm text-purple-700">
                        {m.cantidad_devuelta}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold">
                        {m.cantidad_pendiente}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatMoney(m.precio_unitario_consignado, moneda)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatMoney(m.subtotal_consignado, moneda)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="pagos">
            {(c.pagos ?? []).length === 0 ? (
              <div className="rounded-lg border bg-gray-50 p-6 text-center text-sm text-gray-500">
                Aún no se ha vinculado ningún pago a esta consignación.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Recibido por</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(c.pagos ?? []).map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm">
                          {p.fecha
                            ? new Date(p.fecha).toLocaleDateString("es-CU", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm capitalize">
                          {(p.metodo_pago ?? "—").replace(/_/g, " ")}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {p.recibido_por ?? "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold">
                          {formatMoney(p.monto, p.moneda)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="devoluciones">
            {c.devoluciones.length === 0 ? (
              <div className="rounded-lg border bg-gray-50 p-6 text-center text-sm text-gray-500">
                Aún no se ha registrado ninguna devolución.
              </div>
            ) : (
              <div className="space-y-3">
                {c.devoluciones.map((d) => (
                  <div key={d.id} className="rounded-lg border bg-white p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-sm">
                        <span className="font-semibold">
                          {formatDateTime(d.fecha)}
                        </span>
                        {d.registrado_por_ci && (
                          <span className="ml-2 text-xs text-gray-500">
                            por {d.registrado_por_ci}
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-semibold text-purple-700">
                        {formatMoney(d.valor_total, moneda)}
                      </div>
                    </div>
                    {d.notas && (
                      <div className="mb-2 text-xs italic text-gray-600">
                        {d.notas}
                      </div>
                    )}
                    {d.solicitud_entrada_almacen_id && (
                      <div className="mb-2 text-xs text-gray-500">
                        Sol. entrada almacén:{" "}
                        <span className="font-mono">
                          {d.solicitud_entrada_almacen_id}
                        </span>
                      </div>
                    )}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Material</TableHead>
                          <TableHead className="text-right">Cantidad</TableHead>
                          <TableHead className="text-right">Precio</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {d.materiales.map((md, idx) => {
                          const info = materialInfoById[md.material_id];
                          return (
                          <TableRow key={`${d.id}-${md.material_id}-${idx}`}>
                            <TableCell>
                              <div className="text-sm font-medium">
                                {info?.descripcion ?? "—"}
                              </div>
                              <div className="text-xs text-gray-500">
                                {info?.codigo ?? `#${md.material_id.slice(-6)}`}
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {md.cantidad}
                              {info?.um ? ` ${info.um}` : ""}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {formatMoney(
                                md.precio_unitario_consignado,
                                moneda,
                              )}
                            </TableCell>
                            <TableCell className="text-right text-sm font-semibold">
                              {formatMoney(md.valor, moneda)}
                            </TableCell>
                          </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {c.notas && (
          <div className="mt-2 rounded-lg border bg-gray-50 p-3 text-sm">
            <div className="text-xs font-semibold text-gray-500">Notas</div>
            <div className="mt-1 whitespace-pre-wrap text-gray-700">
              {c.notas}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
