// Tipos para el sistema de Archivo de Nóminas Mensual (Recursos Humanos)

/**
 * Trabajador en una nómina archivada
 * NOTA: dias_no_trabajados es ARRAY (igual que en datos actuales) para mantener consistencia
 */
export interface TrabajadorArchivoRH {
  CI: string
  nombre: string
  cargo: string
  porcentaje_fijo_estimulo: number
  porcentaje_variable_estimulo: number
  salario_fijo: number
  alimentacion: number
  dias_trabajables: number
  dias_no_trabajados: number[]  // Array de días no trabajados
  salario_calculado: number     // Calculado antes de guardar
}

/**
 * Nómina mensual archivada (inmutable)
 */
export interface ArchivoNominaRH {
  id: string
  ingreso_mensual_id: string       // ID del ingreso mensual asociado
  mes: number                      // 1-12 (denormalizado)
  anio: number                     // >= 2000 (denormalizado)
  ingreso_mensual_monto: number    // Monto del ingreso (denormalizado)
  total_salario_fijo: number       // Suma de todos los salarios fijos
  total_alimentacion: number       // Suma de todas las alimentaciones
  total_salario_calculado: number  // Suma de todos los salarios calculados
  fecha_creacion: string           // ISO timestamp
  trabajadores: TrabajadorArchivoRH[]
}

/**
 * Request para crear una nueva nómina
 */
export interface CrearArchivoNominaRequest {
  ingreso_mensual_id: string       // ID del ingreso mensual existente
  total_salario_fijo: number
  total_alimentacion: number
  total_salario_calculado: number
  resetear_trabajadores?: boolean  // Por defecto true - resetea dias_no_trabajados y porcentaje_variable_estimulo
  crear_siguiente_ingreso?: boolean // Por defecto true - crea automáticamente el siguiente ingreso con monto 0
  trabajadores: TrabajadorArchivoRH[]
}

/**
 * Response al crear nómina
 */
export interface CrearArchivoNominaResponse {
  id: string
  ingreso_mensual_id: string
  mes: number
  anio: number
  siguiente_ingreso_id: string | null  // ID del siguiente ingreso creado automáticamente
  message: string
}

/**
 * Lista de nóminas archivadas
 */
export interface ListaArchivosNominaResponse {
  nominas: ArchivoNominaRH[]
  total: number
}

/**
 * Respuesta simplificada del endpoint /api/archivo-rh/simplificado
 * Solo incluye datos esenciales para listados
 */
export interface ArchivoNominaSimplificado {
  mes: number
  anio: number
  periodo: string
  ingreso_mensual_monto: number
  cantidad_trabajadores: number
  total_salario_fijo: number
  total_alimentacion: number
  total_salario_calculado: number
}