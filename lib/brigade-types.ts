// Tipos que coinciden con el backend FastAPI
export interface Trabajador {
  id: string
  CI: string // Carnet de identidad
  nombre: string
  tiene_contraseña: boolean
  telefono?: string
  email?: string
}

export interface Brigada {
  _id?: string; // id real de MongoDB
  id?: string; // id alternativo si el backend lo devuelve así
  lider_ci: string; // CI del líder (identificador principal)
  lider: Trabajador;
  integrantes: Trabajador[]; // Lista de trabajadores (no incluye al líder)
}

// Tipos para las peticiones al backend
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

// Tipos para el frontend (mantener compatibilidad)
export interface Worker {
  id: string
  name: string
  ci: string
  role: "jefe" | "trabajador"
  phone?: string
  email?: string
}

export interface Brigade {
  id: string
  _id?: string // Para compatibilidad con el backend y evitar errores de linter
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
