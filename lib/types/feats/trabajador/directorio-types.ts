export interface TrabajadorDirectorioItem {
  CI: string
  nombre: string
  cargo?: string
  telefono?: string | null
  foto_perfil?: string | null
}

export interface DirectorioTelefonicoResponse {
  success: boolean
  message: string
  data: TrabajadorDirectorioItem[]
}
