import { apiRequest } from '../../../api-config'
import type { Contacto, ContactoResponse, ContactoUpdateData } from '../../../contacto-types'

export const ContactoService = {
  async getContactos(): Promise<Contacto[]> {
    try {
      const response = await apiRequest<ContactoResponse>('/contactos/')
      return Array.isArray(response.data) ? response.data : []
    } catch (error) {
      console.error('Error al obtener contactos del backend:', error)
      throw new Error(
        'No se pudieron cargar los datos de contacto. El endpoint /api/contactos/ no está disponible en el backend.'
      )
    }
  },

  async getContactoById(id: string): Promise<Contacto> {
    try {
      const response = await apiRequest<ContactoResponse>(`/contactos/${id}`)
      return response.data as Contacto
    } catch (error) {
      console.error('Error al obtener contacto por ID:', error)
      throw new Error(
        `No se pudo cargar el contacto con ID ${id}. El endpoint /api/contactos/${id} no está disponible en el backend.`
      )
    }
  },

  async updateContacto(id: string, data: ContactoUpdateData): Promise<Contacto> {
    try {
      const response = await apiRequest<ContactoResponse>(`/contactos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      })
      return response.data as Contacto
    } catch (error) {
      console.error('Error al actualizar contacto:', error)
      throw new Error(
        `No se pudo actualizar el contacto con ID ${id}. El endpoint PUT /api/contactos/${id} no está disponible en el backend.`
      )
    }
  },
}
