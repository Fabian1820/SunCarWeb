export type TipoTrabajoPlanificado =
  | "visita"
  | "entrega_equipamiento"
  | "instalacion_nueva"
  | "instalacion_en_proceso"
  | "averia";

export interface TrabajoPlanificable {
  uid: string;
  tipo: TipoTrabajoPlanificado;
  contactoTipo: "cliente" | "lead";
  contactoId: string;
  contactoNumero?: string;
  nombre: string;
  telefono: string;
  direccion: string;
  provincia?: string;
  municipio?: string;
  estado?: string;
  prioridad?: string;
  descripcionTrabajo: string;
  fechaReferencia?: string;
  comentarioModulo?: string;
  motivo?: string;
  comercial?: string;
  ofertas?: unknown[];
  fotos?: unknown[];
  faltaInstalacion?: string;
}

export interface BrigadaPlanificacionOption {
  id: string;
  nombre: string;
}

export interface TecnicoPlanificacionOption {
  id: string;
  nombre: string;
}

export interface PlanTrabajoItem {
  uid: string;
  tipo: TipoTrabajoPlanificado;
  nombre: string;
  telefono: string;
  direccion: string;
  descripcionTrabajo: string;
  brigadaId: string;
  brigadaNombre: string;
  comentario?: string;
  fechaReferencia?: string;
}

export interface PlanTrabajoDia {
  fecha: string;
  actualizadoEn: string;
  items: PlanTrabajoItem[];
}

export type PlanTrabajoStorage = Record<string, PlanTrabajoDia>;
