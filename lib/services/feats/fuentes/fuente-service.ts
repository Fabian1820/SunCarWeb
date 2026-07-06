import { apiRequest } from "../../../api-config"
import type { Fuente, FuenteCreateData, FuenteUpdateData, TrabajadorOpcion } from "../../../types/feats/fuentes/fuente-types"

const BASE = "/fuentes"

function extractError(res: any): string | null {
  if (!res) return null
  if (res.success === false) return res.message || res.detail || "Error en fuentes"
  return null
}

export class FuenteService {
  static async getFuentes(activo?: boolean): Promise<Fuente[]> {
    const query = typeof activo === "boolean" ? `?activo=${activo}` : ""
    const res = await apiRequest<any>(`${BASE}/${query}`)
    const err = extractError(res)
    if (err) throw new Error(err)
    return res.data ?? []
  }

  static async createFuente(data: FuenteCreateData): Promise<Fuente> {
    const res = await apiRequest<any>(`${BASE}/`, {
      method: "POST",
      body: JSON.stringify(data),
    })
    const err = extractError(res)
    if (err) throw new Error(err)
    return res.data
  }

  static async updateFuente(id: string, data: FuenteUpdateData): Promise<Fuente> {
    const res = await apiRequest<any>(`${BASE}/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
    const err = extractError(res)
    if (err) throw new Error(err)
    return res.data
  }

  static async deleteFuente(id: string): Promise<void> {
    const res = await apiRequest<any>(`${BASE}/${id}`, { method: "DELETE" })
    const err = extractError(res)
    if (err) throw new Error(err)
  }
}

export class TrabajadorOpcionesService {
  static async getOpciones(): Promise<TrabajadorOpcion[]> {
    const res = await apiRequest<any>("/trabajadores/opciones")
    if (res?.success === false) throw new Error(res.message || "Error")
    return res.data ?? []
  }
}
