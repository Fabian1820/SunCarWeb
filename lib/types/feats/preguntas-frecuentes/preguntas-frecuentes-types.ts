export interface PreguntaFrecuente {
  id: string;
  pregunta: string;
  respuesta: string;
  activa: boolean;
  orden: number;
}

export interface PreguntaFrecuenteCreateData {
  pregunta: string;
  respuesta: string;
  activa: boolean;
  orden: number;
}

export type PreguntaFrecuenteUpdateData = Partial<PreguntaFrecuenteCreateData>;
