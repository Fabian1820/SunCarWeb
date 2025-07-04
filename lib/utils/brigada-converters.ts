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
    id: trabajador.id || trabajador.CI, // Usar CI como fallback si no hay ID
    name: trabajador.nombre,
    ci: trabajador.CI,
    role: trabajador.tiene_contraseña ? "jefe" : "trabajador",
    phone: trabajador.telefono,
    email: trabajador.email,
  }
}

export function convertBrigadaToFrontend(brigada: BackendBrigada): FrontendBrigade {
  return {
    id: brigada.id || '', // Usar solo el id real de la brigada, nunca undefined
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
    tiene_contraseña: worker.role === "jefe",
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