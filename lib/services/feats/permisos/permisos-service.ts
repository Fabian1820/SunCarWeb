import { apiRequest } from '@/lib/api-config'
import { Modulo, ModuloCreateData, PermisosUpdateData } from '@/lib/types/feats/permisos/permisos-types'

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
    await apiRequest<{
      success: boolean
      message: string
    }>(`/permisos/trabajador/${trabajadorCi}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
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
}
