/**
 * Citas de clientes y leads con las comerciales.
 *
 * Fecha y hora se manejan como texto ("YYYY-MM-DD", "HH:MM") igual que en el
 * backend: son horas de pared de la oficina y pasarlas por Date solo
 * introduciría zona horaria donde no hace falta.
 */

/** "agendada" es el estado vivo; el resto son cierres. */
export type EstadoCita = "agendada" | "confirmada" | "no_vino" | "cancelada";

/** "espontanea" = llegó sin cita, la atendió una comercial de WhatsApp. */
export type TipoCita = "agendada" | "espontanea";

export const ESTADOS_CITA: EstadoCita[] = [
  "agendada",
  "confirmada",
  "no_vino",
  "cancelada",
];

export const ETIQUETA_ESTADO: Record<EstadoCita, string> = {
  agendada: "Agendada",
  confirmada: "Vino",
  no_vino: "No vino",
  cancelada: "Cancelada",
};

export const CLASE_ESTADO: Record<EstadoCita, string> = {
  agendada: "bg-blue-100 text-blue-800 border-blue-200",
  confirmada: "bg-green-100 text-green-800 border-green-200",
  no_vino: "bg-amber-100 text-amber-800 border-amber-200",
  cancelada: "bg-slate-100 text-slate-600 border-slate-200",
};

/** 1 = lunes ... 7 = domingo, igual que isoweekday() en Python. */
export const DIAS_SEMANA: { valor: number; nombre: string; corto: string }[] = [
  { valor: 1, nombre: "Lunes", corto: "Lun" },
  { valor: 2, nombre: "Martes", corto: "Mar" },
  { valor: 3, nombre: "Miércoles", corto: "Mié" },
  { valor: 4, nombre: "Jueves", corto: "Jue" },
  { valor: 5, nombre: "Viernes", corto: "Vie" },
  { valor: 6, nombre: "Sábado", corto: "Sáb" },
  { valor: 7, nombre: "Domingo", corto: "Dom" },
];

export interface EventoCita {
  accion: string;
  detalle?: string | null;
  usuario?: string | null;
  fecha: string;
}

export interface Cita {
  id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;

  /** CI de la comercial. El nombre viene desnormalizado para listar sin joins. */
  comercial_ci: string;
  comercial_nombre?: string | null;

  cliente_numero?: string | null;
  lead_id?: string | null;
  contacto_nombre: string;
  contacto_telefono?: string | null;

  tipo: TipoCita;
  estado: EstadoCita;

  motivo?: string | null;
  notas?: string | null;

  veces_pospuesta: number;
  historial: EventoCita[];

  creado_por?: string | null;
  fecha_creacion: string;
  fecha_actualizacion?: string | null;
}

export interface CitaCreateData {
  fecha: string;
  hora_inicio: string;
  comercial_ci: string;
  cliente_numero?: string | null;
  lead_id?: string | null;
  contacto_nombre?: string | null;
  contacto_telefono?: string | null;
  motivo?: string | null;
  notas?: string | null;
}

export interface CitaEspontaneaData {
  comercial_ci: string;
  fecha?: string | null;
  hora_inicio?: string | null;
  cliente_numero?: string | null;
  lead_id?: string | null;
  contacto_nombre?: string | null;
  contacto_telefono?: string | null;
  motivo?: string | null;
  notas?: string | null;
}

/** Solo datos descriptivos: fecha, hora y comercial van por posponer/reasignar. */
export interface CitaUpdateData {
  contacto_nombre?: string | null;
  contacto_telefono?: string | null;
  motivo?: string | null;
  notas?: string | null;
}

export interface CitasFiltros {
  fecha_desde?: string;
  fecha_hasta?: string;
  comercial_ci?: string;
  estado?: string;
  tipo?: string;
  cliente_numero?: string;
  lead_id?: string;
  q?: string;
  skip?: number;
  limit?: number;
}

// --- Configuración ---------------------------------------------------------

export interface HorarioDia {
  dia_semana: number;
  activo: boolean;
  hora_inicio: string;
  hora_fin: string;
  duracion_slot_minutos: number;
  /** CIs de las comerciales que ese día reciben visitas agendadas. */
  comerciales_visitas: string[];
  /** CIs de las comerciales que ese día atienden WhatsApp. */
  comerciales_whatsapp: string[];
}

export interface ConfiguracionCitas {
  id?: string | null;
  dias: HorarioDia[];
  fecha_actualizacion?: string | null;
  actualizado_por?: string | null;
}

// --- Disponibilidad --------------------------------------------------------

export interface SlotDisponibilidad {
  hora_inicio: string;
  hora_fin: string;
  libre: boolean;
  cita: Cita | null;
}

export interface AgendaComercial {
  comercial_ci: string;
  comercial_nombre: string;
  slots: SlotDisponibilidad[];
  libres: number;
  ocupados: number;
}

export interface Disponibilidad {
  fecha: string;
  dia_semana: number;
  dia_nombre: string;
  laborable: boolean;
  hora_inicio?: string;
  hora_fin?: string;
  duracion_slot_minutos?: number;
  slots: { hora_inicio: string; hora_fin: string }[];
  comerciales: AgendaComercial[];
  comerciales_whatsapp: { comercial_ci: string; comercial_nombre: string }[];
}

// --- Resumen ---------------------------------------------------------------

export interface ResumenComercial {
  comercial_ci: string;
  comercial_nombre: string;
  total: number;
  agendada: number;
  confirmada: number;
  no_vino: number;
  cancelada: number;
}

export interface ResumenCitas {
  fecha_desde: string;
  fecha_hasta: string;
  total: number;
  espontaneas: number;
  por_estado: Record<EstadoCita, number>;
  por_comercial: ResumenComercial[];
  /** % de asistencia sobre las citas ya cerradas; null si no hay ninguna. */
  tasa_asistencia: number | null;
}
