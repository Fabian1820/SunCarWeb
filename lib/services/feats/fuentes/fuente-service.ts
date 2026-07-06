import { apiRequest } from "../../../api-config"
import type { Fuente, FuenteCreateData, FuenteUpdateData, TrabajadorOpcion } from "../../../types/feats/fuentes/fuente-types"

const BASE = "/fuentes"

function extractError(res: any): string | null {
  if (!res) return null
  if (res.success === false) return res.message || res.detail || "Error en fuentes"
  return null
}

export interface UsoFuente {
  fuente_nombre: string
  total_leads: number
  total_clientes: number
  total: number
}

export class FuenteService {
  static async getFuentes(activo?: boolean): Promise<Fuente[]> {
    const query = typeof activo === "boolean" ? `?activo=${activo}` : ""
    const res = await apiRequest<any>(`${BASE}/${query}`)
    const err = extractError(res)
    if (err) throw new Error(err)
    return res.data ?? []
  }

  static async getUso(id: string): Promise<UsoFuente> {
    const res = await apiRequest<any>(`${BASE}/${id}/uso`)
    if (!res?.success) throw new Error(res?.detail?.mensaje || res?.message || "Error")
    return res as UsoFuente
  }

  static async desactivar(id: string, nuevaFuenteNombre?: string): Promise<{ reasignados: number }> {
    const res = await apiRequest<any>(`${BASE}/${id}/desactivar`, {
      method: "POST",
      body: JSON.stringify({ nueva_fuente_nombre: nuevaFuenteNombre ?? null }),
    })
    // 409 viene como error HTTP — apiRequest lo lanza, lo captura el caller
    if (!res?.success) throw new Error(res?.message || "Error al desactivar")
    return { reasignados: res.reasignados ?? 0 }
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

  static async activar(id: string): Promise<Fuente> {
    return FuenteService.updateFuente(id, { activo: true })
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
