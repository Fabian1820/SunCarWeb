import { apiRequest } from "@/lib/api-config"
import type { MaterialesEnOfertasData } from "@/lib/types/feats/reportes-comercial/materiales-ofertas-types"

interface MaterialesEnOfertasResponse {
  success?: boolean
  message?: string
  detail?: string
  data?: MaterialesEnOfertasData
}

/** Estados de una oferta de confección, tal como los guarda el backend. */
export const ESTADOS_OFERTA_REPORTE = [
  { value: "confirmada_por_cliente", label: "Confirmada por cliente" },
  { value: "reservada", label: "Reservada" },
  { value: "enviada_a_cliente", label: "Enviada a cliente" },
  { value: "aprobada_para_enviar", label: "Aprobada para enviar" },
  { value: "en_revision", label: "En revisión" },
  { value: "cancelada", label: "Cancelada" },
] as const

export const MAX_MATERIALES_REPORTE = 20

export class MaterialesOfertasService {
  static async buscar(codigos: string[], estadosOferta: string[]): Promise<MaterialesEnOfertasData> {
    const qs = new URLSearchParams()
    qs.set("codigos", codigos.join(","))
    if (estadosOferta.length > 0) qs.set("estados_oferta", estadosOferta.join(","))

    const raw = await apiRequest<MaterialesEnOfertasResponse>(
      `/reportes-comercial/materiales-en-ofertas?${qs.toString()}`,
    )
    if (!raw || raw.success === false || !raw.data) {
      throw new Error(raw?.detail || raw?.message || "No se pudo cargar el reporte")
    }
    return raw.data
  }
}
