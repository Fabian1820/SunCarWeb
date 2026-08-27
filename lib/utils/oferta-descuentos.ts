/**
 * Descuentos de una oferta de confección.
 *
 * En la oferta conviven tres campos que rebajan lo que paga el cliente, y no se
 * aplican en el mismo momento:
 *
 * - `descuento_porcentaje` / `monto_descuento`: sistema anterior. Se calcula
 *   sobre el subtotal con margen y **ya está descontado dentro de
 *   `precio_final`**, así que no vuelve a restarse aquí.
 * - `asumido_por_empresa`: el descuento vigente. Monto fijo o porcentaje sobre
 *   el precio final. NO está dentro de `precio_final`.
 * - `compensacion`: mismo tratamiento que el anterior, pero por un fallo del
 *   servicio. Tampoco está dentro de `precio_final`.
 *
 * `precio_final` se mantiene como precio bruto a propósito: el backend valida
 * que caiga dentro de la banda de redondeo
 * `[precio_sin_redondeo, precio_redondeo_maximo]`, y es la base de facturación
 * y de la validación de pagos. El neto se deriva, no se guarda.
 *
 * Ojo: `monto_pendiente` NO sirve para deducir el descuento, porque además de
 * estos dos conceptos se decrementa con cada pago registrado.
 */

interface AjusteOferta {
  monto_usd?: number | null;
  justificacion?: string | null;
}

interface OfertaConDescuentos {
  precio_final?: number | null;
  asumido_por_empresa?: AjusteOferta | null;
  compensacion?: AjusteOferta | null;
  descuento_porcentaje?: number | null;
  monto_descuento?: number | null;
}

export interface DescuentosOferta {
  /** Descuento vigente (campo `asumido_por_empresa`). */
  montoDescuento: number;
  justificacionDescuento: string;
  /** Compensación por fallo del servicio. */
  montoCompensacion: number;
  justificacionCompensacion: string;
  /** Descuento heredado, ya incluido dentro de `precio_final`. */
  descuentoAnteriorPorcentaje: number;
  montoDescuentoAnterior: number;
  /** Suma de lo que se resta del precio final (descuento + compensación). */
  totalDescontado: number;
  /** Precio final bruto, tal como se guarda y se factura. */
  precioFinal: number;
  /** Precio final menos descuento y compensación. Nunca negativo. */
  precioReal: number;
  /** true si hay algo que restar del precio final. */
  tieneDescuento: boolean;
}

const aNumero = (valor: unknown): number => {
  const n = Number(valor ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export function calcularDescuentosOferta(
  oferta: OfertaConDescuentos | null | undefined,
): DescuentosOferta {
  const precioFinal = aNumero(oferta?.precio_final);

  const montoDescuento = Math.max(0, aNumero(oferta?.asumido_por_empresa?.monto_usd));
  const montoCompensacion = Math.max(0, aNumero(oferta?.compensacion?.monto_usd));
  const totalDescontado = montoDescuento + montoCompensacion;

  return {
    montoDescuento,
    justificacionDescuento: oferta?.asumido_por_empresa?.justificacion || "",
    montoCompensacion,
    justificacionCompensacion: oferta?.compensacion?.justificacion || "",
    descuentoAnteriorPorcentaje: aNumero(oferta?.descuento_porcentaje),
    montoDescuentoAnterior: aNumero(oferta?.monto_descuento),
    totalDescontado,
    precioFinal,
    // Se acota a 0 igual que hace el backend al calcular monto_pendiente.
    precioReal: Math.max(0, precioFinal - totalDescontado),
    tieneDescuento: totalDescontado > 0,
  };
}
