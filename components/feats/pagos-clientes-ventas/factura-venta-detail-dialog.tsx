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
            <div><span className="font-semibold">Emitida por:</span> {factura.emitida_por || "—"}</div>
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
            <div className="border rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-2">Fecha</th>
                    <th className="text-right p-2">Monto</th>
                    <th className="text-right p-2">USD</th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.length === 0 ? (
                    <tr><td className="p-2 text-gray-500" colSpan={3}>Sin pagos</td></tr>
                  ) : (
                    pagos.map((p, idx) => (
                      <tr key={`pag-${p.id || idx}`} className="border-t">
                        <td className="p-2">{p.fecha || "—"}</td>
                        <td className="p-2 text-right">{money(p.monto)} {p.moneda || "USD"}</td>
                        <td className="p-2 text-right">{money(p.monto_usd)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="text-right font-semibold text-red-600">
            Monto pendiente: {money(factura.monto_pendiente)}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
