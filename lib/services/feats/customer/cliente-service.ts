/* eslint-disable @typescript-eslint/no-explicit-any */

import { apiRequest } from '../../../api-config'

export class ClienteService {
  static async getClientes(params: {
    numero?: string
    nombre?: string
    direccion?: string
  } = {}): Promise<{ data: any[]; success?: boolean; message?: string }> {
    const search = new URLSearchParams()
    if (params.numero) search.append('numero', params.numero)
    if (params.nombre) search.append('nombre', params.nombre)
    if (params.direccion) search.append('direccion', params.direccion)
    const endpoint = `/clientes/${search.toString() ? `?${search.toString()}` : ''}`
    const result = await apiRequest<any[]>(endpoint)
    return { data: Array.isArray(result) ? result : [], success: true }
  }

  static async crearCliente(data: {
    numero: string
    nombre: string
    direccion: string
    latitud: string
    longitud: string
    telefono?: string
    carnet_identidad?: string
    equipo_instalado?: string
    fecha_instalacion?: string
  }): Promise<{ success: boolean; message?: string; data?: any }> {
    const response = await apiRequest<{ success: boolean; message?: string; data?: any }>(`/clientes/`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response
  }

  static async crearClienteSimple(data: {
    numero: string
    nombre: string
    direccion: string
    latitud?: string
    longitud?: string
    telefono?: string
    carnet_identidad?: string
    equipo_instalado?: string
    fecha_instalacion?: string
  }): Promise<{ success: boolean; message?: string; data?: any }> {
    const response = await apiRequest<{ success: boolean; message?: string; data?: any }>(`/clientes/simple`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response
  }

  static async verificarCliente(numero: string): Promise<{ success: boolean; message?: string; data?: any }> {
    const endpoint = `/clientes/${encodeURIComponent(numero)}/verificar`
    return apiRequest(endpoint)
  }

  static async verificarClientePorIdentificador(
    identifier: string
  ): Promise<{ success: boolean; message?: string; data?: { numero?: string; nombre?: string } | null }> {
    const response = await apiRequest<{ success: boolean; message?: string; data?: { numero?: string; nombre?: string } | null }>(
      `/clientes/verificar`,
      {
        method: 'POST',
        body: JSON.stringify({ identifier }),
      }
    )
    return response
  }

  static async actualizarCliente(
    numero: string,
    data: Partial<{
      nombre: string
      direccion: string
      latitud: string
      longitud: string
      telefono: string
      carnet_identidad: string
      equipo_instalado: string
      fecha_instalacion: string
    }>
  ): Promise<{ success: boolean; message?: string }> {
    const response = await apiRequest<{ success: boolean; message?: string }>(`/clientes/${encodeURIComponent(numero)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    return response
  }

  static async eliminarCliente(numero: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiRequest<{ success: boolean; message?: string }>(`/clientes/${encodeURIComponent(numero)}`, {
      method: 'DELETE',
    })
    return response
  }
}
