// Servicio de almacenamiento local para órdenes de trabajo
// Mientras el backend no está implementado

import type { OrdenTrabajo, CreateOrdenTrabajoRequest } from './api-types'

const STORAGE_KEY = 'suncar_ordenes_trabajo'

export class LocalOrdenesTrabajoService {
  // Obtener todas las órdenes del localStorage
  static getAll(): OrdenTrabajo[] {
    if (typeof window === 'undefined') return []

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Error al leer órdenes del localStorage:', error)
      return []
    }
  }

  // Guardar una orden en localStorage
  static create(ordenData: CreateOrdenTrabajoRequest, brigadaNombre?: string, clienteNombre?: string): OrdenTrabajo {
    const ordenes = this.getAll()

    const nuevaOrden: OrdenTrabajo = {
      id: `orden-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      brigada_id: ordenData.brigada_id,
      brigada_nombre: brigadaNombre,
      cliente_numero: ordenData.cliente_numero,
      cliente_nombre: clienteNombre || 'Cliente',
      tipo_reporte: ordenData.tipo_reporte,
      fecha_ejecucion: ordenData.fecha_ejecucion,
      comentarios: ordenData.comentarios,
      fecha_creacion: new Date().toISOString(),
      estado: 'pendiente'
    }

    ordenes.push(nuevaOrden)
    this.save(ordenes)

    return nuevaOrden
  }

  // Actualizar una orden
  static update(id: string, updates: Partial<OrdenTrabajo>): boolean {
    const ordenes = this.getAll()
    const index = ordenes.findIndex(o => o.id === id)

    if (index === -1) return false

    ordenes[index] = { ...ordenes[index], ...updates }
    this.save(ordenes)

    return true
  }

  // Eliminar una orden
  static delete(id: string): boolean {
    const ordenes = this.getAll()
    const filtered = ordenes.filter(o => o.id !== id)

    if (filtered.length === ordenes.length) return false

    this.save(filtered)
    return true
  }

  // Obtener una orden por ID
  static getById(id: string): OrdenTrabajo | null {
    const ordenes = this.getAll()
    return ordenes.find(o => o.id === id) || null
  }

  // Guardar en localStorage
  private static save(ordenes: OrdenTrabajo[]): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ordenes))
    } catch (error) {
      console.error('Error al guardar órdenes en localStorage:', error)
    }
  }

  // Limpiar todas las órdenes (para testing)
  static clear(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(STORAGE_KEY)
  }
}
