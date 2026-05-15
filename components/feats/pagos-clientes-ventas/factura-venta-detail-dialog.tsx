"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import type { FacturaVentaResumen } from "@/lib/types/feats/pagos-clientes-ventas/pago-cliente-venta-types";

interface FacturaVentaDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  factura: FacturaVentaResumen | null;
}

const money = (v?: number) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return "$0.00";
  return `$${n.toFixed(2)}`;
};

export function FacturaVentaDetailDialog({
  open,
  onOpenChange,
  factura,
}: FacturaVentaDetailDialogProps) {
  if (!factura) return null;

  const solicitudes = Array.isArray(factura.solicitudes_vinculadas)
    ? factura.solicitudes_vinculadas
    : [];
  const pagos = Array.isArray(factura.pagos) ? factura.pagos : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalle de Factura {factura.numero_factura || "—"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div><span className="font-semibold">Número de factura:</span> {factura.numero_factura || "—"}</div>
            <div><span className="font-semibold">Fecha:</span> {factura.fecha || "—"}</div>
            <div><span className="font-semibold">Cliente:</span> {factura.cliente || "—"}</div>
            <div><span className="font-semibold">Emitida por:</span> {factura.emitida_por_nombre || factura.emitida_por || "—"}</div>
            <div className="md:col-span-2">
              <span className="font-semibold">Solicitudes vinculadas:</span>{" "}
              {solicitudes.length
                ? solicitudes.map((s) => s.codigo_solicitud).filter(Boolean).join(", ")
                : "—"}
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Materiales</h4>
            <div className="border rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-2">Material</th>
                    <th className="text-right p-2">Cantidad</th>
                    <th className="text-right p-2">Precio</th>
                    <th className="text-right p-2">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {solicitudes.length === 0 ? (
                    <tr><td className="p-2 text-gray-500" colSpan={4}>Sin materiales</td></tr>
                  ) : (
                    solicitudes.flatMap((s, sidx) => {
                      const mats = Array.isArray(s.materiales) ? s.materiales : [];
                      if (mats.length === 0) {
                        return [
                          <tr key={`sol-${sidx}-empty`} className="border-t">
                            <td className="p-2 text-gray-500" colSpan={4}>
                              {s.codigo_solicitud || "Solicitud"} sin materiales detallados
                            </td>
                          </tr>,
                        ];
                      }
                      return mats.map((m, midx) => {
                        if (typeof m === "string") {
                          return (
                            <tr key={`sol-${sidx}-mat-${midx}`} className="border-t">
                              <td className="p-2">{m}</td>
                              <td className="p-2 text-right">—</td>
                              <td className="p-2 text-right">—</td>
                              <td className="p-2 text-right">—</td>
                            </tr>
                          );
                        }
                        const row = m as {
                          material_descripcion?: string;
                          descripcion?: string;
                          nombre?: string;
                          cantidad?: number;
                          precio?: number;
                          subtotal?: number;
                        };
                        const cantidad = Number(row.cantidad || 0);
                        const precio = Number(row.precio || 0);
                        const descPct = Number((row as { descuento_porcentaje?: number }).descuento_porcentaje ?? 0);
                        const precioConDesc = (row as { precio_con_descuento?: number }).precio_con_descuento;
                        const subtotal = precioConDesc != null
                          ? Number(precioConDesc) * cantidad
                          : Number(row.subtotal || (descPct > 0 ? precio * (1 - descPct / 100) * cantidad : precio * cantidad) || 0);
                        return (
                          <tr key={`sol-${sidx}-mat-${midx}`} className="border-t">
                            <td className="p-2">
                              {row.material_descripcion || row.descripcion || row.nombre || "Material"}
                              {descPct > 0 && (
                                <span className="ml-1 text-xs text-orange-600">(-{descPct.toFixed(1)}%)</span>
                              )}
                            </td>
                            <td className="p-2 text-right">{cantidad}</td>
                            <td className="p-2 text-right">{money(precio)}</td>
                            <td className="p-2 text-right">{money(subtotal)}</td>
                          </tr>
                        );
                      });
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div><span className="font-semibold">Total precio materiales:</span> {money(factura.total_precio_materiales)}</div>
            <div><span className="font-semibold">Descuento:</span> {money(factura.total_descuento_monto)}</div>
            <div><span className="font-semibold">Precio final:</span> {money(factura.total_a_pagar)}</div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Pagos registrados</h4>
            {pagos.length === 0 ? (
              <div className="text-gray-500 border rounded p-3">Sin pagos</div>
            ) : (
              <div className="space-y-3">
                {pagos.map((p, idx) => {
                  const moneda = p.moneda || "USD";
                  const monto = Number(p.monto || 0);
                  const metodo = p.metodo_pago || "";
                  const METODO_LABELS: Record<string, string> = {
                    efectivo: "Efectivo",
                    transferencia_bancaria: "Transferencia",
                    stripe: "Stripe",
                    financiacion: "Financiación",
                  };
                  const desglose = p.desglose_billetes;
                  const desgloseEntries = desglose && typeof desglose === "object"
                    ? Object.entries(desglose).filter(([, cant]) => Number(cant) > 0)
                    : [];
                  return (
                    <div key={`pag-${p.id || idx}`} className="border rounded p-3 space-y-1.5">
                      {pagos.length > 1 && (
                        <div className="text-xs font-semibold text-indigo-600 mb-1">Pago {idx + 1} — {p.fecha || "—"}</div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-500">Monto Pagado:</span>
                        <span className={`font-bold ${moneda === "USD" ? "text-green-700" : moneda === "EUR" ? "text-purple-700" : "text-blue-700"}`}>
                          {monto.toLocaleString("en-US", { minimumFractionDigits: 2 })} {moneda}
                        </span>
                      </div>
                      {moneda !== "USD" && p.tasa_cambio && Number(p.tasa_cambio) > 0 && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Tasa de Cambio:</span>
                            <span className="font-medium">{Number(p.tasa_cambio).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Equivalente USD:</span>
                            <span className="font-medium text-green-700">
                              {money(p.monto_usd ?? (moneda === "EUR" ? monto * Number(p.tasa_cambio) : monto / Number(p.tasa_cambio)))}
                            </span>
                          </div>
                        </>
                      )}
                      {metodo === "efectivo" && desgloseEntries.length > 0 && (
                        <div>
                          <span className="text-gray-500">Desglose de Billetes:</span>
                          <div className="ml-4 mt-0.5 space-y-0.5">
                            {desgloseEntries.map(([den, cant]) => (
                              <div key={den} className="flex justify-between text-gray-600">
                                <span>{cant} x {den} {moneda}</span>
                                <span>{(Number(den) * Number(cant)).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {metodo && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Forma de Pago:</span>
                          <span className="font-medium">{METODO_LABELS[metodo] || metodo}</span>
                        </div>
                      )}
                      {p.recibido_por && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Recibido por:</span>
                          <span className="font-medium">{p.recibido_por}</span>
                        </div>
                      )}
                      {p.notas && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Notas:</span>
                          <span className="text-gray-700">{p.notas}</span>
                        </div>
                      )}
                      {p.monto_pendiente_despues_pago != null && (
                        <div className="flex justify-between border-t pt-1.5 mt-1">
                          <span className="font-semibold text-gray-500">Monto Pendiente:</span>
                          <span className={`font-bold ${Number(p.monto_pendiente_despues_pago) > 0 ? "text-red-600" : "text-green-700"}`}>
                            {money(p.monto_pendiente_despues_pago)} USD
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="text-right font-semibold text-red-600">
            Monto pendiente: {money(factura.monto_pendiente)}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
