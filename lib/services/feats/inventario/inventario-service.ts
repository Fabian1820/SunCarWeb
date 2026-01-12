/* eslint-disable @typescript-eslint/no-explicit-any */

import { apiRequest } from '../../../api-config'
import type {
  Almacen,
  AlmacenCreateData,
  AlmacenUpdateData,
  Tienda,
  TiendaCreateData,
  TiendaUpdateData,
  StockItem,
  MovimientoInventario,
  MovimientoCreateData,
  VentaCreateData,
} from '../../../inventario-types'

const extractArray = <T>(response: any): T[] => {
  if (Array.isArray(response)) return response
  if (response?.data) {
    return Array.isArray(response.data) ? response.data : [response.data]
  }
  return []
}

const extractItem = <T>(response: any): T => {
  if (response?.data) return response.data as T
  return response as T
}

export class InventarioService {
  static async getAlmacenes(): Promise<Almacen[]> {
    const response = await apiRequest<any>('/almacenes/')
    return extractArray<Almacen>(response)
  }

  static async createAlmacen(data: AlmacenCreateData): Promise<Almacen> {
    const response = await apiRequest<any>('/almacenes/', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return extractItem<Almacen>(response)
  }

  static async updateAlmacen(id: string, data: AlmacenUpdateData): Promise<Almacen> {
    const response = await apiRequest<any>(`/almacenes/${id}` , {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return extractItem<Almacen>(response)
  }

  static async deleteAlmacen(id: string): Promise<boolean> {
    const response = await apiRequest<any>(`/almacenes/${id}`, {
      method: 'DELETE',
    })
    if (response?.success === false) {
      throw new Error(response?.message || 'No se pudo eliminar el almacen')
    }
    return true
  }

  static async getTiendas(): Promise<Tienda[]> {
    const response = await apiRequest<any>('/tiendas/')
    return extractArray<Tienda>(response)
  }

  static async createTienda(data: TiendaCreateData): Promise<Tienda> {
    const response = await apiRequest<any>('/tiendas/', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return extractItem<Tienda>(response)
  }

  static async updateTienda(id: string, data: TiendaUpdateData): Promise<Tienda> {
    const response = await apiRequest<any>(`/tiendas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return extractItem<Tienda>(response)
  }

  static async deleteTienda(id: string): Promise<boolean> {
    const response = await apiRequest<any>(`/tiendas/${id}`, {
      method: 'DELETE',
    })
    if (response?.success === false) {
      throw new Error(response?.message || 'No se pudo eliminar la tienda')
    }
    return true
  }

  static async getStock(params?: { almacen_id?: string }): Promise<StockItem[]> {
    const search = new URLSearchParams()
    if (params?.almacen_id) search.set('almacen_id', params.almacen_id)
    const suffix = search.toString() ? `?${search.toString()}` : ''
    const response = await apiRequest<any>(`/inventario/stock${suffix}`)
    return extractArray<StockItem>(response)
  }

  static async getMovimientos(params?: {
    tipo?: string
    almacen_id?: string
    tienda_id?: string
    material_codigo?: string
  }): Promise<MovimientoInventario[]> {
    const search = new URLSearchParams()
    if (params?.tipo) search.set('tipo', params.tipo)
    if (params?.almacen_id) search.set('almacen_id', params.almacen_id)
    if (params?.tienda_id) search.set('tienda_id', params.tienda_id)
    if (params?.material_codigo) search.set('material_codigo', params.material_codigo)
    const suffix = search.toString() ? `?${search.toString()}` : ''
    const response = await apiRequest<any>(`/inventario/movimientos${suffix}`)
    return extractArray<MovimientoInventario>(response)
  }

  static async createMovimiento(data: MovimientoCreateData): Promise<MovimientoInventario> {
    const response = await apiRequest<any>('/inventario/movimientos', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return extractItem<MovimientoInventario>(response)
  }

  static async createVenta(data: VentaCreateData): Promise<any> {
    const response = await apiRequest<any>('/inventario/ventas', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response
  }
}
