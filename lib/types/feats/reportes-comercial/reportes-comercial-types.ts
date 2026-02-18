export interface InstalacionPendiente {
  id: string
  tipo: 'lead' | 'cliente'
  nombre: string
  telefono: string
  direccion: string
  provincia: string
  estado: string
  oferta: string
  falta: string
  comentario: string
  fuente: string
  numero?: string
  fecha_contacto?: string
}

export interface PendientesInstalacionFilters {
  searchTerm?: string
  tipo?: 'todos' | 'leads' | 'clientes'
  provincia?: string
  estado?: 'todos' | 'en-proceso' | 'pendientes'
}

// Tipo para el endpoint /ofertas/confeccion/personalizadas-con-pagos
export interface ResultadoComercial {
  id: string
  numero_oferta: string
  nombre_automatico: string
  nombre_completo: string
  total_materiales: number
  margen_porcentaje: number
  margen_dolares: number
  precio_final: number
  monto_pendiente: number
  fecha_creacion: string
  contacto: {
    tipo: 'cliente' | 'lead' | 'lead_sin_agregar'
    numero: string | null
    nombre: string
    telefono: string | null
    direccion: string | null
    comercial: string | null  // Campo del comercial asignado
  }
  pagos_data: Array<{
    id: string
    oferta_id: string
    monto: number
    monto_usd: number
    moneda: string
    tasa_cambio: number
    fecha: string
    tipo_pago: string
    metodo_pago: string
    pago_cliente: boolean
    nombre_pagador: string
    notas?: string
  }>
  total_pagado: number
  fecha_primer_pago: string
}

// Tipo adaptado del endpoint temporal /pagos/ofertas-con-pagos
export interface ResultadoComercialTemporal {
  oferta_id: string
  numero_oferta: string
  nombre_automatico: string
  nombre_completo: string
  tipo_oferta: string
  estado: string
  precio_final: number
  monto_pendiente: number
  almacen_id: string
  almacen_nombre: string | null
  pagos: Array<{
    id: string
    oferta_id: string
    monto: number
    monto_usd: number
    moneda: string
    tasa_cambio: number
    fecha: string
    tipo_pago: string
    metodo_pago: string
    pago_cliente: boolean
    nombre_pagador: string | null
    notas?: string | null
  }>
  total_pagado: number
  cantidad_pagos: number
  contacto: {
    nombre: string | null
    telefono: string | null
    carnet: string | null
    direccion: string | null
    codigo: string | null
    tipo_contacto: 'cliente' | 'lead' | 'lead_sin_agregar' | null
  }
  // Campos calculados en el frontend
  fecha_primer_pago?: string
  comercial?: string | null
}

export interface ResultadosComercialFilters {
  searchTerm?: string
  comercial?: string
  fechaInicio?: string
  fechaFin?: string
  mes?: string
  anio?: string
}

export interface EstadisticaComercial {
  comercial: string
  ofertas_cerradas: number
  total_margen: number
}
