/**
 * Types para el módulo de Existencias Contabilidad
 */

// Material contable (del backend)
export interface MaterialContabilidadBackend {
  id: string
  codigo_contabilidad: string
  nombre?: string
  descripcion: string
  um: string
  cantidad_contabilidad: number
  precio_contabilidad: number  // CUP
}

// Material contable (frontend)
export interface MaterialContabilidad {
  id: string
  codigoContabilidad: string
  nombre?: string
  descripcion: string
  um: string
  cantidadContabilidad: number
  precioContabilidad: number  // CUP
}

// Ticket de salida (backend)
export interface TicketContabilidadBackend {
  id: string
  numero_ticket: string
  fecha_creacion: string
  materiales: TicketMaterialBackend[]
}

export interface TicketMaterialBackend {
  material_id: string
  cantidad: number
  codigo_contabilidad?: string
  descripcion?: string
  um?: string
  precio_unitario?: number
}

// Ticket de salida (frontend)
export interface TicketContabilidad {
  id: string
  numeroTicket: string
  fechaCreacion: Date
  materiales: TicketMaterial[]
}

export interface TicketMaterial {
  materialId: string
  cantidad: number
  codigoContabilidad?: string
  descripcion?: string
  um?: string
  precioUnitario?: number
}

// Request para crear ticket
export interface CrearTicketRequest {
  materiales: {
    material_id: string
    cantidad: number
  }[]
}

// Request para dar entrada
export interface EntradaContabilidadRequest {
  cantidad: number
}

// Conversion Functions
export function convertMaterialContabilidadToFrontend(
  backend: MaterialContabilidadBackend
): MaterialContabilidad {
  return {
    id: backend.id,
    codigoContabilidad: backend.codigo_contabilidad,
    nombre: backend.nombre,
    descripcion: backend.descripcion,
    um: backend.um,
    cantidadContabilidad: backend.cantidad_contabilidad,
    precioContabilidad: backend.precio_contabilidad,
  }
}

export function convertTicketToFrontend(
  backend: TicketContabilidadBackend
): TicketContabilidad {
  return {
    id: backend.id,
    numeroTicket: backend.numero_ticket,
    fechaCreacion: new Date(backend.fecha_creacion),
    materiales: backend.materiales.map(m => ({
      materialId: m.material_id,
      cantidad: m.cantidad,
      codigoContabilidad: m.codigo_contabilidad,
      descripcion: m.descripcion,
      um: m.um,
      precioUnitario: m.precio_unitario,
    })),
  }
}
