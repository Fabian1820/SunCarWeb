export interface Worker {
  id: string
  name: string
  role: "jefe" | "trabajador"
  phone?: string
  email?: string
}

export interface Brigade {
  id: string
  name: string
  leader: Worker
  members: Worker[]
  createdAt: string
  isActive: boolean
}

export interface BrigadeFormData {
  name: string
  leaderName: string
  leaderPhone?: string
  leaderEmail?: string
  members: Array<{
    name: string
    phone?: string
    email?: string
  }>
}
