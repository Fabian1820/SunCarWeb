export interface Banco {
  id: string;
  nombre: string;
  creado_por_ci: string;
  creado_por_nombre: string;
  created_at: string;
}

export interface BancoCreateData {
  nombre: string;
}
