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
