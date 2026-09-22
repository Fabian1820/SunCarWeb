import { apiRequest } from "@/lib/api-config"
import type { MaterialesComprometidosData } from "@/lib/types/feats/reportes-comercial/materiales-comprometidos-types"

interface MaterialesComprometidosResponse {
  success?: boolean
  message?: string
  detail?: string
  data?: MaterialesComprometidosData
}

export class MaterialesComprometidosService {
  static async obtener(): Promise<MaterialesComprometidosData> {
    const raw = await apiRequest<MaterialesComprometidosResponse>("/reportes-comercial/materiales-comprometidos")
    if (!raw || raw.success === false || !raw.data) {
      throw new Error(raw?.detail || raw?.message || "No se pudo cargar el reporte")
    }
    return raw.data
  }
}
