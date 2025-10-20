// Brigade & worker types shared between backend payloads and frontend forms.

export interface Trabajador {
  id: string
  CI: string
  nombre: string
  tiene_contraseña: boolean
  telefono?: string
  email?: string
}

export interface Brigada {
  _id?: string
  id?: string
  lider_ci: string
  lider: Trabajador
  integrantes: Trabajador[]
}

export interface BrigadaRequest {
  lider: {
    nombre: string
    CI: string
    telefono?: string
    email?: string
  }
  integrantes: Array<{
    nombre: string
    CI: string
    telefono?: string
    email?: string
  }>
}

export interface TeamMember {
  nombre: string
  CI: string
  telefono?: string
  email?: string
}

export interface Worker {
  id: string
  name: string
  ci: string
  role: 'jefe' | 'trabajador'
  phone?: string
  email?: string
}

export interface Brigade {
  id: string
  _id?: string
  leader: Worker
  members: Worker[]
}

export interface BrigadeFormData {
  leaderName: string
  leaderCi: string
  leaderPhone?: string
  leaderEmail?: string
  members: Array<{
    name: string
    ci: string
    phone?: string
    email?: string
  }>
}
