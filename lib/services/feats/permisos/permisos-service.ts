import { apiRequest } from '@/lib/api-config'
import { Modulo, ModuloCreateData, PermisosUpdateData } from '@/lib/types/feats/permisos/permisos-types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const extractApiError = (response: any): string | null => {
  if (!response) return null
  if (response.success === false) {
    return (
      response?.error?.message ||
      response?.message ||
      response?.detail ||
      'No se pudo completar la operación.'
    )
  }
  return null
}

export const PermisosService = {
  // ============= MÓDULOS =============

  /**
   * Obtiene todos los módulos del sistema
   */
  async getAllModulos(): Promise<Modulo[]> {
    const response = await apiRequest<{
      success: boolean
      message: string
      data: Array<{ id: string; nombre: string }>
    }>('/modulos/')

    return response.data.map(m => ({ id: m.id, nombre: m.nombre }))
  },

  /**
   * Crea un nuevo módulo
   */
  async createModulo(data: ModuloCreateData): Promise<string> {
    const response = await apiRequest<{
      success: boolean
      message: string
      modulo_id: string
    }>('/modulos/', {
      method: 'POST',
      body: JSON.stringify(data),
    })

    return response.modulo_id
  },

  /**
   * Elimina un módulo por su ID
   */
  async deleteModulo(moduloId: string): Promise<void> {
    await apiRequest<{
      success: boolean
      message: string
    }>(`/modulos/${moduloId}`, {
      method: 'DELETE',
    })
  },

  // ============= PERMISOS =============

  /**
   * Actualiza los permisos de un trabajador (upsert)
   */
  async updateTrabajadorPermisos(
    trabajadorCi: string,
    data: PermisosUpdateData
  ): Promise<void> {
    const response = await apiRequest<{
      success: boolean
      message: string
    }>(`/permisos/trabajador/${trabajadorCi}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })

    // apiRequest no lanza excepción en errores con cuerpo JSON (ej. el 400 que
    // devuelve el backend cuando se intenta guardar modulo_ids vacío sin
    // confirmar_vacio): normaliza a success:false y lo devuelve tal cual, así
    // que hay que revisarlo explícitamente para no "guardar" en silencio.
    const error = extractApiError(response)
    if (error) {
      throw new Error(error)
    }
  },

  /**
   * Obtiene los nombres de módulos asignados a un trabajador
   */
  async getTrabajadorModulosNombres(trabajadorCi: string): Promise<string[]> {
    const response = await apiRequest<{
      success: boolean
      message: string
      data: string[]
    }>(`/permisos/trabajador/${trabajadorCi}/modulos-nombres`)

    // apiRequest no lanza excepción en errores con cuerpo JSON (ej. un 500 del
    // backend), solo normaliza a success:false — hay que revisarlo aquí para
    // que el .catch() del diálogo de permisos detecte el fallo y no arranque
    // en silencio desde una lista vacía.
    const error = extractApiError(response)
    if (error) {
      throw new Error(error)
    }

    return response.data
  },

  /**
   * Obtiene lista de CIs de trabajadores que tienen al menos un permiso
   */
  async getTrabajadoresConPermisos(): Promise<string[]> {
    const response = await apiRequest<{
      success: boolean
      message: string
      data: string[]
    }>('/permisos/trabajadores-con-permisos')

    return response.data
  },

  // ============= AUTENTICACIÓN ADMIN =============

  /**
   * Registra o actualiza la contraseña administrativa de un trabajador
   */
  async registerAdminPassword(
    ci: string,
    adminPass: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await apiRequest<{
      success: boolean
      message: string
    }>('/auth/register-admin', {
      method: 'POST',
      body: JSON.stringify({ ci, adminPass }),
    })

    return response
  },

  /**
   * Cambia la contraseña administrativa del usuario autenticado.
   * Requiere token JWT válido en Authorization.
   */
  async changeOwnAdminPassword(
    currentAdminPass: string,
    newAdminPass: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await apiRequest<{
      success: boolean
      message: string
    }>('/auth/change-admin-password', {
      method: 'POST',
      body: JSON.stringify({ currentAdminPass, newAdminPass }),
    })

    return response
  },
}
