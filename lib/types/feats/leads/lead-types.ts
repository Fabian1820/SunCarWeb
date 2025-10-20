// Lead feature types aligned with backend payloads.

export interface Lead {
  id?: string
  fecha_contacto: string
  nombre: string
  telefono: string
  estado: string
  fuente?: string
  referencia?: string
  direccion?: string
  pais_contacto?: string
  necesidad?: string
  provincia_montaje?: string
}

export interface LeadResponse {
  success: boolean
  message: string
  data: Lead | Lead[] | null
}

export interface LeadCreateData {
  fecha_contacto: string
  nombre: string
  telefono: string
  estado: string
  fuente?: string
  referencia?: string
  direccion?: string
  pais_contacto?: string
  necesidad?: string
  provincia_montaje?: string
}

export interface LeadUpdateData {
  fecha_contacto?: string
  nombre?: string
  telefono?: string
  estado?: string
  fuente?: string
  referencia?: string
  direccion?: string
  pais_contacto?: string
  necesidad?: string
  provincia_montaje?: string
}
