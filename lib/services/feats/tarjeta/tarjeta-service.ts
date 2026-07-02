/* eslint-disable @typescript-eslint/no-explicit-any */

import { apiRequest } from '../../../api-config'

export interface RedesSociales {
  linkedin?: string | null
  instagram?: string | null
  facebook?: string | null
  web?: string | null
}

export interface MiTarjeta {
  id?: string | null
  trabajador_ci: string
  slug: string
  activa: boolean
  nombre: string
  titulo?: string | null
  empresa: string
  foto_url?: string | null
  bio?: string | null
  telefono?: string | null
  whatsapp?: string | null
  email?: string | null
  sede?: string | null
  redes: RedesSociales
  vistas: number
  guardados_contacto: number
}

export interface ActualizarTarjetaPayload {
  titulo?: string | null
  bio?: string | null
  telefono?: string | null
  whatsapp?: string | null
  email?: string | null
  sede?: string | null
  redes?: RedesSociales
  activa?: boolean
}

/**
 * Servicio de la Tarjeta de Presentación del trabajador autenticado.
 * Todos los endpoints /mi-tarjeta usan el JWT (apiRequest adjunta el Bearer),
 * así que el backend resuelve el CI del token: el trabajador solo edita LA SUYA.
 */
export class TarjetaService {
  /** Obtiene (auto-provisiona si es la primera vez) la tarjeta del trabajador logueado. */
  static async getMiTarjeta(): Promise<MiTarjeta | null> {
    const res = await apiRequest<{ success?: boolean; data?: MiTarjeta }>('/tarjetas/mi-tarjeta')
    if (res?.success && res.data) return res.data
    return null
  }

  /** Actualiza los datos de vitrina de la tarjeta. */
  static async actualizarMiTarjeta(payload: ActualizarTarjetaPayload): Promise<MiTarjeta | null> {
    const res = await apiRequest<{ success?: boolean; data?: MiTarjeta; message?: string }>(
      '/tarjetas/mi-tarjeta',
      { method: 'PUT', body: JSON.stringify(payload) },
    )
    if (res?.success && res.data) return res.data
    return null
  }

  /** Sube/reemplaza la foto de la tarjeta (bucket "tarjetas", independiente de la foto de perfil). */
  static async subirFoto(file: File): Promise<MiTarjeta | null> {
    const formData = new FormData()
    formData.append('foto', file)
    const res = await apiRequest<{ success?: boolean; data?: MiTarjeta }>(
      '/tarjetas/mi-tarjeta/foto',
      { method: 'POST', body: formData },
    )
    if (res?.success && res.data) return res.data
    return null
  }
}
