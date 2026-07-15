export interface ComercialDistribucion {
  CI: string;
  nombre: string;
  cargo: "Comercial Instaladora" | "Comercial Ventas";
  es_apoyo_instaladora: boolean;
  equipo_id: string | null;
  equipo_nombre: string | null;
}

export interface IntegranteEquipoComercial {
  CI: string;
  nombre: string;
  cargo: string;
}

export interface EquipoComercial {
  id: string;
  nombre: string;
  activo: boolean;
  integrantes: IntegranteEquipoComercial[];
}
