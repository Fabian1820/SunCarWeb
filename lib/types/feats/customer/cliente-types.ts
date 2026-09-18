import type {
  ElementoPersonalizado,
  OfertaEmbebida,
  OfertaAsignacion,
  OfertaConfeccionResumen,
} from "../leads/lead-types";
import type { Averia } from "../averias/averia-types";

export interface ClienteFoto {
  url: string;
  fecha: string;
  /**
   * Categoría histórica: solo aparece en registros antiguos (instalacion/averia/visita).
   * Los archivos nuevos ya no se categorizan al subir, así que llega null/undefined.
   */
  tipo?: "instalacion" | "averia" | "visita" | null;
  /** Qué es el archivo, puesto por quien lo sube. Solo en archivos nuevos. */
  concepto?: string | null;
  /** Nombre de quien subió el archivo. Solo en archivos nuevos. */
  subida_por?: string | null;
  /** Agrupa varios archivos subidos juntos bajo el mismo concepto. */
  grupo_id?: string | null;
}

/**
 * Equipo principal del cliente, acumulando todas sus ofertas confirmadas: una
 * ampliación posterior suma sobre la instalación original.
 *
 * `fuente` dice de dónde salió el dato — "ofertas_confirmadas" (el sistema
 * vivo), "snapshot_cliente" (el legado congelado en `ofertas[0]`, para
 * clientes anteriores al módulo de confección), "mixta", o `null` cuando no
 * hay equipo registrado. Un componente en `null` significa "no se sabe", no
 * "cero": esos clientes quedan fuera de cualquier filtro por capacidad.
 */
export interface CapacidadEquipos {
  inversor_kw: number | null;
  bateria_kwh: number | null;
  paneles: number | null;
  fuente: "ofertas_confirmadas" | "snapshot_cliente" | "mixta" | null;
}

/**
 * Familia de un equipo del cliente. La caja combinadora no tiene sección
 * propia en las ofertas: el backend la reconoce por el nombre. Las estructuras
 * no son equipo a propósito — se deducen del número de paneles.
 */
export type CategoriaEquipo =
  | "INVERSORES"
  | "BATERIAS"
  | "PANELES"
  | "MPPT"
  | "CAJA_COMBINADORA"
  | "OTRO";

export type EstadoEquipo = "activo" | "retirado" | "sustituido";

export type OrigenEquipo =
  | "oferta_confirmada"
  | "migracion_oferta"
  | "migracion_snapshot"
  | "alta_manual"
  | "equipo_propio_cliente";

/**
 * Un equipo tal como está hoy en casa del cliente (`clientes.equipos`).
 *
 * Es la proyección de un log de movimientos, así que no se edita como campo:
 * cada cambio es un movimiento con motivo. `cantidad_actual` es lo ofertado
 * —la base— y `cantidad_entregada` lo que respalda un vale; la diferencia es
 * la discrepancia, que en la mayoría de los clientes existe porque las
 * entregas no se registraron.
 */
export interface EquipoCliente {
  equipo_key: string;
  material_id: string | null;
  material_codigo: string | null;
  descripcion: string;
  categoria: CategoriaEquipo;
  marca: string | null;
  potencia_kw: number | null;
  /** Foto actual del material en el catálogo; solo en las respuestas de /equipos. */
  foto?: string | null;
  cantidad_actual: number;
  /** Según almacén (vales menos devoluciones), calculado al leer la ficha. */
  cantidad_entregada: number;
  estado: EstadoEquipo;
  numeros_serie: string[];
  es_equipo_propio: boolean;
  origen_inicial: OrigenEquipo | null;
  pendiente_resolver_material: boolean;
  fecha_alta: string | null;
  fecha_ultimo_cambio: string | null;
  total_movimientos: number;
  /** Solo viene en las respuestas de /equipos; en el listado se calcula. */
  discrepancia?: number;
  tiene_discrepancia?: boolean;
}

export type TipoMovimientoEquipo =
  | "alta"
  | "ajuste_cantidad"
  | "sustitucion"
  | "retiro"
  | "correccion";

export type MotivoCambioEquipo =
  | "instalacion_inicial"
  | "ampliacion"
  | "garantia"
  | "autorizado_direccion"
  | "correccion_dato"
  | "venta_adicional"
  | "retiro"
  | "migracion";

/** Un cambio en los equipos de un cliente. Inmutable. */
export interface MovimientoEquipoCliente {
  id: string | null;
  cliente_numero: string;
  equipo_key: string;
  tipo: TipoMovimientoEquipo;
  cantidad_delta: number;
  cantidad_entregada_delta: number;
  material_id: string | null;
  material_codigo: string | null;
  descripcion: string;
  categoria: CategoriaEquipo;
  marca: string | null;
  potencia_kw: number | null;
  numero_serie: string | null;
  origen: OrigenEquipo;
  oferta_id: string | null;
  numero_oferta: string | null;
  sustituye_a: string | null;
  motivo: MotivoCambioEquipo;
  nota: string | null;
  autorizado_por: string | null;
  actor_ci: string | null;
  actor_nombre: string | null;
  /** Cuándo pasó en la realidad. */
  fecha_efectiva: string;
  /** Cuándo se tecleó. */
  fecha_registro: string;
}

export interface Cliente {
  id?: string; // ID de MongoDB (transformado desde _id por el backend)
  numero: string;
  nombre: string;
  direccion: string;
  telefono?: string;
  telefono_adicional?: string;
  fecha_contacto?: string;
  estado?: string;
  fuente?: string;
  fuente_referencia?: string;
  referencia?: string;
  pais_contacto?: string;
  comentario?: string;
  provincia_montaje?: string;
  municipio?: string;
  comercial?: string;
  ofertas?: OfertaEmbebida[];
  elementos_personalizados?: ElementoPersonalizado[];
  latitud?: number | string;
  longitud?: number | string;
  carnet_identidad?: string;
  fecha_instalacion?: string;
  fecha_montaje?: string;
  fecha_creacion?: string;
  created_at?: string;
  updated_at?: string;
  comprobante_pago_url?: string;
  metodo_pago?: string;
  moneda?: string;
  falta_instalacion?: string; // Qué le falta a la instalación (solo para estado "Instalación en proceso")
  averias?: Averia[]; // Array de averías del cliente
  fotos?: ClienteFoto[]; // Evidencias (fotos/videos) del cliente
  prioridad?: "Ninguna" | "Urgente" | "Alta" | "Media" | "Baja";
  motivo_visita?: string; // Campo temporal para crear visita automática cuando estado = "Pendiente de visita"
  tipo_persona?: string;
  tipo_negocio?: string; // "BTB" | "BTC", del cliente en sí (no del equipo del comercial)
  oferta_confeccion?: OfertaConfeccionResumen | null;
  capacidad_equipos?: CapacidadEquipos | null;
  /**
   * Ficha de equipos (log proyectado). Ausente mientras no se haya migrado el
   * cliente o, en los nuevos, hasta que pase a "Equipo instalado con éxito".
   */
  equipos?: EquipoCliente[] | null;
  equipos_actualizado_en?: string | null;
  es_trabajador_suncar?: boolean;
  activo?: boolean;
}

export interface ClienteResponse {
  success: boolean;
  message: string;
  data: Cliente | Cliente[] | null;
  total?: number;
  skip?: number;
  limit?: number;
}

export interface ClienteCreateData {
  numero: string;
  nombre: string;
  direccion: string;
  telefono?: string;
  telefono_adicional?: string;
  fecha_contacto?: string;
  estado?: string;
  fuente?: string;
  fuente_referencia?: string;
  referencia?: string;
  pais_contacto?: string;
  comentario?: string;
  provincia_montaje?: string;
  municipio?: string;
  comercial?: string;
  ofertas?: OfertaAsignacion[]; // Al crear: solo enviar oferta_id + cantidad
  elementos_personalizados?: ElementoPersonalizado[];
  latitud?: number | string;
  longitud?: number | string;
  carnet_identidad?: string;
  fecha_instalacion?: string;
  fecha_montaje?: string;
  comprobante_pago_url?: string;
  metodo_pago?: string;
  moneda?: string;
  falta_instalacion?: string; // Qué le falta a la instalación
  fotos?: ClienteFoto[];
  equipo_propio?: boolean; // Si el equipo es propio del cliente (código con P)
  es_trabajador_suncar?: boolean;
  prioridad?: "Ninguna" | "Urgente" | "Alta" | "Media" | "Baja";
  motivo_visita?: string; // Campo temporal para crear visita automática cuando estado = "Pendiente de visita"
  tipo_persona?: string;
  tipo_negocio?: string; // "BTB" | "BTC", del cliente en sí (no del equipo del comercial)
}

export interface ClienteSimpleCreateData {
  numero: string;
  nombre: string;
  direccion: string;
  telefono?: string;
  comprobante_pago_url?: string;
  metodo_pago?: string;
  moneda?: string;
  falta_instalacion?: string; // Qué le falta a la instalación
}

export type ClienteUpdateData = Partial<ClienteCreateData> & {
  fecha_equipo_instalado?: string;
};
