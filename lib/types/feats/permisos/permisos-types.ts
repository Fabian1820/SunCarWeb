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
  // El backend rechaza (400) modulo_ids vacío salvo que esto venga en true.
  // Evita que un fallo silencioso al cargar los permisos actuales termine
  // borrando por accidente todos los permisos previos de un trabajador.
  confirmar_vacio?: boolean
}

export interface TrabajadorConPermisos {
  ci: string
  nombre: string
  modulos: string[] // Nombres de módulos asignados
}
