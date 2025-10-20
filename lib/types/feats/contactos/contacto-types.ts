// Contact information types used by customer service admin tools.

export interface Contacto {
  id: string
  telefono: string
  correo: string
  direccion: string
}

export interface ContactoResponse {
  success: boolean
  message: string
  data: Contacto | Contacto[]
}

export interface ContactoUpdateData {
  telefono: string
  correo: string
  direccion: string
}
