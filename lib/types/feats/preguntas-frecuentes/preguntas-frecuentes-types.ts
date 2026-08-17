export interface PreguntaFrecuente {
  id: string;
  pregunta: string;
  respuesta: string;
  activa: boolean;
  orden: number;
  /** Marca manual de revision. No la usa el asistente. */
  revisada?: boolean;
}

export interface PreguntaFrecuenteCreateData {
  pregunta: string;
  respuesta: string;
  activa: boolean;
  orden: number;
  revisada?: boolean;
}

export type PreguntaFrecuenteUpdateData = Partial<PreguntaFrecuenteCreateData>;
