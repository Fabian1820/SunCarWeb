import type { 
  Worker, 
  Brigade as FrontendBrigade, 
  BrigadeFormData,
  Trabajador, 
  Brigada as BackendBrigada, 
  BrigadaRequest, 
  TeamMember 
} from '../brigade-types'

// Convertir de Backend a Frontend
export function convertTrabajadorToWorker(trabajador: Trabajador): Worker {
  return {
    id: trabajador.id,
    name: trabajador.nombre,
    ci: trabajador.CI,
    role: trabajador.rol,
    phone: trabajador.telefono,
    email: trabajador.email,
  }
}

export function convertBrigadaToFrontend(brigada: BackendBrigada): FrontendBrigade {
  return {
    id: brigada.lider_ci, // Usar el CI del líder como ID
    leader: convertTrabajadorToWorker(brigada.lider),
    members: brigada.integrantes.map(convertTrabajadorToWorker),
  }
}

// Convertir de Frontend a Backend
export function convertWorkerToTrabajador(worker: Worker): Trabajador {
  return {
    id: worker.id,
    nombre: worker.name,
    CI: worker.ci,
    rol: worker.role,
    telefono: worker.phone,
    email: worker.email,
  }
}

export function convertBrigadeFormDataToRequest(formData: BrigadeFormData): BrigadaRequest {
  return {
    lider: {
      nombre: formData.leaderName,
      CI: formData.leaderCi,
      telefono: formData.leaderPhone,
      email: formData.leaderEmail,
    },
    integrantes: formData.members
      .filter(m => m.name.trim() !== '' && m.ci.trim() !== '')
      .map(member => ({
        nombre: member.name,
        CI: member.ci,
        telefono: member.phone,
        email: member.email,
      })),
  }
}

export function convertFrontendBrigadeToRequest(brigade: FrontendBrigade): BrigadaRequest {
  return {
    lider: {
      nombre: brigade.leader.name,
      CI: brigade.leader.ci,
      telefono: brigade.leader.phone,
      email: brigade.leader.email,
    },
    integrantes: brigade.members.map(member => ({
      nombre: member.name,
      CI: member.ci,
      telefono: member.phone,
      email: member.email,
    })),
  }
}

// Convertir trabajador individual para agregar a brigada
export function convertWorkerToTeamMember(worker: { name: string; ci: string; phone?: string; email?: string }): TeamMember {
  return {
    nombre: worker.name,
    CI: worker.ci,
    telefono: worker.phone,
    email: worker.email,
  }
} 