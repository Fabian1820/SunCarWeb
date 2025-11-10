// Tipos para el módulo de permisos y gestión de módulos

export interface Modulo {
  id: string
  nombre: string
}

export interface ModuloCreateData {
  nombre: string
}

export interface PermisosUpdateData {
  modulo_ids: string[]
}

export interface TrabajadorConPermisos {
  ci: string
  nombre: string
  modulos: string[] // Nombres de módulos asignados
}
