import { ObrasTerminadasService } from "./obras-terminadas-service";

/** Saldo pendiente acumulado de un cliente (puede tener varias ofertas con deuda). */
export interface PendientePagoCliente {
  clienteNumero: string;
  clienteNombre: string;
  comercial: string | null;
  montoPendiente: number;
  obras: number;
}

export const normalizeClienteNumeroPendientes = (value?: string | null) =>
  (value ?? "")
    .toString()
    .normalize("NFKC")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const PAGINA = 500;

/**
 * Trae, en el menor número de peticiones posible, todas las ofertas con saldo
 * pendiente sin importar el estado del cliente (a diferencia del PDF de
 * "Cobros pendientes" de informe-dirección, que por defecto solo mira las
 * obras terminadas). El backend ya filtra por `estado_pago=pendiente`, así
 * que solo bajamos filas que sí suman al total.
 */
export async function fetchPendientesPago(): Promise<
  Map<string, PendientePagoCliente>
> {
  const mapa = new Map<string, PendientePagoCliente>();
  let skip = 0;

  for (;;) {
    const resp = await ObrasTerminadasService.getDatos({
      skip,
      limit: PAGINA,
      estado_pago: "pendiente",
    });
    const filas = resp.data || [];

    for (const f of filas) {
      const numero = normalizeClienteNumeroPendientes(f.cliente_numero);
      if (!numero) continue;
      const monto = Number(f.monto_pendiente ?? 0);
      if (monto <= 0) continue;

      const previo = mapa.get(numero);
      if (previo) {
        previo.montoPendiente += monto;
        previo.obras += 1;
        if (!previo.comercial && f.comercial) previo.comercial = f.comercial;
      } else {
        mapa.set(numero, {
          clienteNumero: numero,
          clienteNombre: f.cliente_nombre || "",
          comercial: f.comercial || null,
          montoPendiente: monto,
          obras: 1,
        });
      }
    }

    skip += PAGINA;
    if (!filas.length || skip >= (resp.total ?? 0)) break;
  }

  return mapa;
}
