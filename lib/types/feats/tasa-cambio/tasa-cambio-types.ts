export interface TasaCambio {
  id: string;
  fecha: string;
  usd_a_eur: number;
  usd_a_cup: number;
  created_at?: string;
}

export interface TasaCambioCreateRequest {
  fecha: string;
  usd_a_eur: number;
  usd_a_cup: number;
}
