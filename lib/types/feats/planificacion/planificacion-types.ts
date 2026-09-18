export type TipoTrabajo =
  | "visita"
  | "instalacion_nueva"
  | "instalacion_en_proceso"
  | "averia"
  | "actualizacion";

/** Instalar es cosa de una brigada entera; el resto lo puede hacer una persona. */
export const TIPOS_QUE_ADMITEN_TRABAJADOR: TipoTrabajo[] = [
  "visita",
  "averia",
  "actualizacion",
];

export const ETIQUETA_TIPO: Record<TipoTrabajo, string> = {
  visita: "Visita",
  instalacion_nueva: "Instalación nueva",
  instalacion_en_proceso: "Instalación en proceso",
  averia: "Avería",
  actualizacion: "Actualización",
};

export interface Asignado {
  tipo: "brigada" | "trabajador";
  id: string;
  nombre: string;
}

export interface TrabajoPlanificado {
  id: string;
  tipo: TipoTrabajo;
  cliente_numero?: string | null;
  lead_id?: string | null;
  nombre: string;
  direccion: string;
  asignado: Asignado;
  nota?: string | null;
  estado: "planificado" | "cumplido" | "no_realizado";
  cerrado_en?: string | null;
  cerrado_por?: string | null;
  referencia_id?: string | null;
  comentario_cierre?: string | null;
}

export interface Planificacion {
  id?: string;
  fecha: string;
  trabajos: TrabajoPlanificado[];
  creada_por?: string | null;
  /** Quiénes crearon o editaron este plan, de la bitácora de auditoría; sin repetidos. */
  hecho_por?: string[];
  confirmada_por_ci?: string | null;
  confirmada_por_nombre?: string | null;
  /** ISO. Se limpia sola al volver a guardar el plan: hay que confirmarlo de nuevo. */
  confirmada_en?: string | null;
}

/** Un cliente o lead que puede entrar en el plan. */
export interface CandidatoPlanificacion {
  tipo_entidad: "cliente" | "lead";
  lead_id: string | null;
  cliente_numero: string | null;
  nombre: string;
  telefono: string;
  direccion: string;
  municipio: string;
  /** Provincia de montaje: con el municipio, sirve para filtrar por zona. */
  provincia?: string;
  estado: string;
  /** Solo en averías: qué está roto. */
  detalle?: string;
  /** Última visita hecha, para abrir su informe. */
  visita_id?: string | null;
  visita_fecha?: string | null;
  /** Lo que anotó quien fue a la visita. */
  visita_observaciones?: string | null;
  /** La oferta que el cliente confirmó: es lo que se va a montar. */
  oferta_confirmada?: { id: string; numero: string; nombre: string } | null;
  /** "YYYY-MM-DD": desde cuándo espera este trabajo. */
  esperando_desde?: string | null;
}
