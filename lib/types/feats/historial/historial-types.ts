/** Lo que devuelve /historial en el backend. */

export type TipoEventoHistorial =
  | "cliente"
  | "oferta_creada"
  | "oferta_confirmada"
  | "pago"
  | "visita"
  | "vale"
  | "devolucion"
  | "trabajo_diario"
  | "averia"
  | "averia_solucionada";

export interface MaterialEvento {
  nombre: string;
  cantidad: number;
  um?: string | null;
}

export interface EventoHistorial {
  tipo: TipoEventoHistorial;
  /** ISO en hora de Cuba; null si no se sabe cuándo pasó. */
  fecha: string | null;
  /** Solo se sabe el día, no la hora. */
  solo_dia: boolean;
  titulo: string;
  detalle?: string | null;
  lineas: string[];
  materiales: MaterialEvento[];
  estado?: string | null;
}

export interface ClienteHistorial {
  numero: string;
  nombre: string;
  direccion?: string | null;
  telefono?: string | null;
  estado?: string | null;
  provincia?: string | null;
  municipio?: string | null;
}

export interface HistorialCliente {
  cliente: ClienteHistorial;
  eventos: EventoHistorial[];
}

export interface EquipoHistorial {
  material_codigo: string;
  descripcion: string;
  potencia_kw?: number | null;
  marca?: string | null;
  foto?: string | null;
  unidades: number;
  clientes: number;
  ofertas: number;
}

export type ClaveCategoriaEquipo = "inversores" | "baterias" | "paneles";

export interface CategoriaEquipos {
  clave: ClaveCategoriaEquipo;
  nombre: string;
  equipos: EquipoHistorial[];
}

export interface ClienteDeEquipo extends ClienteHistorial {
  cantidad: number;
  ofertas: string[];
}

export interface ClientesDeEquipo {
  equipo: {
    material_codigo: string;
    descripcion: string;
    categoria?: string | null;
    potencia_kw?: number | null;
    marca?: string | null;
    unidades: number;
  };
  clientes: ClienteDeEquipo[];
}
