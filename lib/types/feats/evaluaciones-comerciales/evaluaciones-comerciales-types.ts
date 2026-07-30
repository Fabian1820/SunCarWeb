export type CriteriosActitud = {
  trato_al_cliente?: number | null;
  trato_a_companeros?: number | null;
  disposicion_para_tareas?: number | null;
  colaboracion?: number | null;
  observaciones?: string | null;
};

export type CriteriosDocumentacion = {
  manejo_de_contratos?: number | null;
  calidad_informacion_sistema?: number | null;
  cumplimiento_de_procedimientos?: number | null;
  observaciones?: string | null;
};

export type EvaluacionComercial = {
  id: string;
  comercial_ci: string;
  comercial_nombre?: string | null;
  periodo_inicio: string;
  periodo_fin: string;
  actitud: CriteriosActitud;
  documentacion: CriteriosDocumentacion;
  firmada: boolean;
  firmada_por_ci?: string | null;
  firmada_por_nombre?: string | null;
  firmada_en?: string | null;
  creada_por_ci?: string | null;
  creada_por_nombre?: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
};

export type ComercialAlcance = {
  CI: string;
  nombre: string;
  cargo: string;
};

export type AlcanceEvaluaciones = {
  rol:
    | "super_admin"
    | "jefe_instaladora"
    | "jefe_comercial_general"
    | "jefe_equipo"
    | "comercial";
  comerciales: ComercialAlcance[];
};

export type ListaEvaluaciones = {
  rol: AlcanceEvaluaciones["rol"];
  evaluaciones: EvaluacionComercial[];
};

export type WhatsappCsatRespuesta = {
  rating?: number | null;
  feedback?: string | null;
  fecha?: string | null;
  conversation_id?: number | null;
  contact_nombre?: string | null;
};

export type WhatsappDatos = {
  disponible: boolean;
  razon?: string | null;
  datos?: {
    agente: { id: number; nombre: string; email?: string };
    resumen_conversaciones?: {
      conversaciones_abiertas?: number | null;
      conversaciones_sin_atender?: number | null;
      resueltas?: number | null;
      tiempo_primera_respuesta_seg?: number | null;
      tiempo_resolucion_seg?: number | null;
    } | null;
    csat_resumen?: {
      total_respuestas?: number | null;
      csat_pct?: number | null;
      promedio_rating?: number | null;
    } | null;
    csat_respuestas: WhatsappCsatRespuesta[];
  } | null;
};

export type OfertasDatos = {
  creadas: number;
  confirmadas_sin_pagos: number;
  confirmadas_con_anticipo: number;
  obras_terminadas: number;
  monto_vendido: number;
  monto_cobrado: number;
  razon?: string | null;
};
