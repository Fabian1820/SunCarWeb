export interface PendienteVisita {
  id: string
  tipo: 'lead' | 'cliente'
  nombre: string
  telefono: string
  direccion: string
  provincia: string
  municipio: string
  estado: string
  comentario: string
  fuente: string
  referencia: string
  comercial: string
  prioridad: string
  fecha_contacto: string
  ofertas?: any[] // Array de ofertas (mismo formato que leads/clientes)
  // Campos exclusivos de clientes
  numero?: string
  carnet_identidad?: string
  latitud?: string
  longitud?: string
}

export interface PendientesVisitaFilters {
  searchTerm?: string
  tipo?: 'todos' | 'leads' | 'clientes'
  provincia?: string
}
