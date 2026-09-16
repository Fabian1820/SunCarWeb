// Contact information types used by customer service admin tools.

export interface Contacto {
  id: string
  telefono: string
  correo: string
  direccion: string
  /**
   * Código de 2 dígitos de la provincia. `null` marca el contacto NACIONAL,
   * que es el respaldo que se usa cuando una provincia no tiene el suyo, y el
   * que muestran el pie de página y la portada de la web pública.
   */
  provincia_codigo?: string | null
  provincia_nombre?: string | null
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
  provincia_codigo?: string | null
  provincia_nombre?: string | null
}

export type ContactoCreateData = ContactoUpdateData
