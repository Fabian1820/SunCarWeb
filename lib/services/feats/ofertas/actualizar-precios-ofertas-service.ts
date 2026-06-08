import { apiRequest } from "@/lib/api-config";

export interface ResultadoActualizacionPrecios {
  actualizadas: number;
  sin_cambios: number;
  errores: string[];
}

/**
 * Dispara el job de backend que sincroniza los precios de los items de las
 * ofertas confección genéricas aprobadas con los precios actuales del catálogo.
 *
 * El backend usa la regla:
 *   precio_instaladora > 0 ? precio_instaladora : precio
 */
export async function actualizarPreciosOfertasGenericas(): Promise<ResultadoActualizacionPrecios> {
  const response = await apiRequest<{
    success: boolean;
    message: string;
    data: ResultadoActualizacionPrecios;
  }>("/ofertas/confeccion/jobs/actualizar-precios-genericas", {
    method: "POST",
  });

  return response.data ?? { actualizadas: 0, sin_cambios: 0, errores: [] };
}
