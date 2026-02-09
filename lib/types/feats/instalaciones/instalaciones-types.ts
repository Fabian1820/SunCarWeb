export interface PendienteVisita {
  id: string
  tipo: 'lead' | 'cliente'
  nombre: string
  telefono: string
  direccion: string
  provincia: string
  estado: string
  oferta: string
  comentario: string
  fuente: string
  numero?: string
  fecha_contacto?: string
}

export interface PendientesVisitaFilters {
  searchTerm?: string
  tipo?: 'todos' | 'leads' | 'clientes'
  provincia?: string
}
