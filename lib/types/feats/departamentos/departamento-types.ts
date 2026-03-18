export interface Departamento {
  id: string;
  nombre: string;
  activo: boolean;
}

export interface DepartamentoUpsertRequest {
  nombre: string;
  activo?: boolean;
}
