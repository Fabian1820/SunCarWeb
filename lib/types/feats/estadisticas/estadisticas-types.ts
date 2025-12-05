// Tipos para el backend
export interface EstadisticasCrecimientoBackend {
  año: number
  mes: number
  clientes_mes_actual: number
  clientes_mes_anterior: number
  diferencia: number
  porcentaje_cambio: number
  potencia_inversores: number
  potencia_paneles: number
}

// Tipos para el frontend
export interface EstadisticasCrecimiento {
  año: number
  mes: number
  clientesMesActual: number
  clientesMesAnterior: number
  diferencia: number
  porcentajeCambio: number
  potenciaInversores: number
  potenciaPaneles: number
}

// Función de conversión
export function convertEstadisticasToFrontend(
  backend: EstadisticasCrecimientoBackend
): EstadisticasCrecimiento {
  return {
    año: backend.año,
    mes: backend.mes,
    clientesMesActual: backend.clientes_mes_actual,
    clientesMesAnterior: backend.clientes_mes_anterior,
    diferencia: backend.diferencia,
    porcentajeCambio: backend.porcentaje_cambio,
    potenciaInversores: backend.potencia_inversores,
    potenciaPaneles: backend.potencia_paneles,
  }
}

// Parámetros de consulta
export interface EstadisticasParams {
  año: number
  mes: number
}

// Tipos para la línea de tiempo (Nuevo Endpoint)
export interface EstadisticaLineaTiempoItemBackend {
  año: number
  mes: number
  numero_clientes: number
  numero_leads: number
  conversion_rate: number
  potencia_inversores: number
  potencia_paneles: number
}

export interface EstadisticaLineaTiempoResponse {
  success: boolean
  message: string
  data: EstadisticaLineaTiempoItemBackend[]
}

export interface EstadisticaLineaTiempoItemFrontend {
  año: number
  mes: number
  numeroClientes: number
  numeroLeads: number
  conversionRate: number
  potenciaInversores: number
  potenciaPaneles: number
  // Campos calculados para compatibilidad visual si es necesario, o nuevos
  diferencia?: number
  porcentajeCambio?: number
}

export function convertLineaTiempoToFrontend(
  backend: EstadisticaLineaTiempoItemBackend
): EstadisticaLineaTiempoItemFrontend {
  return {
    año: backend.año,
    mes: backend.mes,
    numeroClientes: backend.numero_clientes,
    numeroLeads: backend.numero_leads,
    conversionRate: backend.conversion_rate,
    potenciaInversores: backend.potencia_inversores,
    potenciaPaneles: backend.potencia_paneles,
  }
}
