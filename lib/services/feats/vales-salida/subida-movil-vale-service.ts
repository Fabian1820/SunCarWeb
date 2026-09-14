/**
 * Cliente de la pagina publica de subida desde el movil.
 *
 * No usa `apiRequest`: esa funcion adjunta el `auth_token` de SunCar desde
 * localStorage, y aqui quien sube es un telefono sin sesion. El unico
 * credencial es el token del QR, que viene en la URL, vale 15 minutos y solo
 * sirve para el vale para el que se genero.
 */

import { API_BASE_URL } from "@/lib/api-config";
import type {
  AdjuntoValeSalida,
  ContextoSubidaMovilVale,
} from "@/lib/api-types";

const BASE = `${API_BASE_URL}/operaciones/vales-salida/subida-movil`;

async function leerJson(response: Response): Promise<any> {
  const texto = await response.text();
  if (!texto.trim()) return {};
  try {
    return JSON.parse(texto);
  } catch {
    return { detail: texto.slice(0, 500) };
  }
}

function mensajeDeError(data: any, fallback: string): string {
  return data?.detail || data?.message || fallback;
}

export const SubidaMovilValeService = {
  /** Datos del vale al que apunta el token, para confirmar antes de subir. */
  async getContexto(token: string): Promise<ContextoSubidaMovilVale> {
    const response = await fetch(`${BASE}/contexto`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await leerJson(response);
    if (!response.ok) {
      throw new Error(
        mensajeDeError(data, "El enlace no es valido o ya caduco"),
      );
    }
    return data.data as ContextoSubidaMovilVale;
  },

  /** Sube los documentos. El vale destino lo decide el token, no esta peticion. */
  async subir(token: string, files: File[]): Promise<AdjuntoValeSalida[]> {
    const form = new FormData();
    files.forEach((f) => form.append("archivos", f));
    form.append("categoria", "vale_firmado");

    const response = await fetch(`${BASE}/adjuntos`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await leerJson(response);
    if (!response.ok) {
      throw new Error(mensajeDeError(data, "No se pudo subir el documento"));
    }
    return Array.isArray(data?.data) ? (data.data as AdjuntoValeSalida[]) : [];
  },
};
