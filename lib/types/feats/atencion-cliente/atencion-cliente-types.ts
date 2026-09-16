/**
 * Tipos del módulo de Atención al Cliente: la guardia de WhatsApp, su
 * planificación y el reparto de los leads que salen de esas conversaciones.
 */

export interface ComercialAtencion {
  CI: string;
  nombre: string;
  cargo: string;
  es_apoyo_instaladora?: boolean;
}

/** Un turno tal y como se define en la plantilla semanal. */
export interface TurnoConfig {
  clave: string;
  nombre: string;
  /** HH:MM en 24h. */
  inicio: string;
  fin: string;
}

export interface ConfiguracionAtencion {
  /** "0" = lunes … "6" = domingo. Lista vacía = ese día no se planifica. */
  dias: Record<string, TurnoConfig[]>;
  nombres_dias: string[];
  actualizada_por_ci?: string | null;
  fecha_actualizacion?: string | null;
}

export interface SuplenciaRegistro {
  sale_ci: string;
  entra_ci: string;
  motivo?: string | null;
  registrada_por_ci?: string | null;
  fecha: string;
}

export interface ComercialEnTurno {
  CI: string;
  nombre: string;
  cargo?: string | null;
}

export interface TurnoPlanificado {
  clave: string;
  nombre: string;
  inicio: string;
  fin: string;
  nota?: string | null;
  comerciales: ComercialEnTurno[];
  suplencias: SuplenciaRegistro[];
}

export interface DiaPlanificado {
  fecha: string;
  dia_semana: string;
  /** false = nadie lo ha planificado; los turnos son los de la plantilla. */
  planificado: boolean;
  turnos: TurnoPlanificado[];
  actualizada_por_ci?: string | null;
  fecha_actualizacion?: string | null;
}

export interface EstadoDia extends DiaPlanificado {
  hora_local: string;
  turno_vigente: string | null;
  de_guardia: ComercialEnTurno[];
  /** true cuando TODOS los comerciales están de guardia: sin nadie fuera, la
   *  exclusión no se puede aplicar y se permite repartirse a uno mismo. */
  autoasignacion_habilitada: boolean;
  destinatarios_reparto: ComercialEnTurno[];
}

export interface CambioImpacto {
  turno: string;
  tipo: "desaparece" | "cambia_horario" | "aparece";
  detalle: string;
  comerciales: string[];
}

export interface ImpactoConfiguracion {
  desde: string;
  dias_planificados: number;
  dias_afectados: { fecha: string; dia_semana: string; cambios: CambioImpacto[] }[];
  guardias_que_se_pierden: number;
}

export interface LeadDelDia {
  id: string;
  nombre?: string;
  telefono?: string;
  estado?: string;
  fecha_registro?: string;
  registrado_por_ci?: string;
  comercial?: string | null;
  comercial_ci?: string | null;
  activo?: boolean;
}

export interface SupervisionPersona {
  CI: string;
  nombre: string;
  registrados: number;
  repartidos: number;
  sin_repartir: number;
  /** Registrados en un día en el que esa persona no estaba de guardia. */
  fuera_de_turno: number;
  dias_con_registro: number;
  dias_de_guardia: number;
}

export interface SupervisionResumen {
  desde: string;
  hasta: string;
  por_persona: SupervisionPersona[];
  totales: { registrados: number; repartidos: number; sin_repartir: number };
}

export interface ResumenRotacionComercial {
  CI: string;
  nombre: string;
  total: number;
  por_turno: Record<string, number>;
}

export interface ResultadoRotacion {
  dias_generados: number;
  /** Días que ya estaban planificados y no se tocaron. */
  dias_respetados: string[];
  resumen_por_comercial: ResumenRotacionComercial[];
}
