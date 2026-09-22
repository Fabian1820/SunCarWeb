/**
 * Tipos de Solineras. Reflejan las respuestas de `/api/solineras` (backend
 * SunCarBackend, presentation/routers/solineras_*.py). Los campos siguen el
 * snake_case en español del backend.
 *
 * Todas las fechas llegan en ISO UTC ("2026-09-21T14:49:50Z"); para mostrarlas
 * se convierten a hora de Cuba con `lib/utils/solineras.ts`.
 */

export type TipoVehiculo =
  | "moto"
  | "motorina"
  | "bicicleta"
  | "triciclo"
  | "tricitaxi"
  | "bicitaxi"
  | "auto"
  | "equipo"
  | "otro"

export type EstadoSolinera = "en_obra" | "operativa" | "pausada" | "cerrada"

/** Estado que fija una persona en un puesto. */
export type EstadoPuestoManual = "operativo" | "fuera_servicio" | "falla"

/** Estado que se ve en el panel: lo deduce el backend de las cargas en curso. */
export type EstadoPuestoVista = "libre" | "cargando" | "terminada" | "fuera_servicio" | "falla"

export type TipoToma = "110V" | "220V" | "otro"

export type Moneda = "CUP" | "USD" | "EUR"

export type MetodoPago = "efectivo" | "transferencia" | "transfermovil" | "enzona"

export type EstadoCarga = "cargando" | "terminada" | "cobrada" | "retirada" | "anulada"

export type EstadoReserva = "confirmada" | "presentada" | "no_presentada" | "cancelada"

export type EstadoComprobante = "pendiente" | "validado" | "rechazado"

// --- Configuración ---------------------------------------------------------

export interface HorarioDia {
  /** 1 = lunes ... 7 = domingo */
  dia_semana: number
  activo: boolean
  /** HH:MM, hora de Cuba */
  apertura: string
  cierre: string
}

export interface ConfiguracionSolinera {
  horario: HorarioDia[]
  gracia_reserva_min: number
  gracia_retiro_min: number
  tiempo_maximo_min: number
  duracion_minima_min: number
  intervalo_reserva_min: number
  reserva_anticipacion_max_dias: number
  presentacion_anticipada_min: number
  metodos_pago: MetodoPago[]
  monedas_aceptadas: Moneda[]
}

// --- Red -------------------------------------------------------------------

export interface Puesto {
  id: string
  solinera_id: string
  codigo: string
  nombre?: string | null
  tipo_toma: TipoToma
  potencia_max_kw?: number | null
  /** Vacío = admite cualquier vehículo. */
  tipos_vehiculo: TipoVehiculo[]
  nota?: string | null
  estado_manual: EstadoPuestoManual
  motivo_estado?: string | null
  activo: boolean
}

export interface Solinera {
  id: string
  codigo: string
  nombre: string
  estado: EstadoSolinera
  provincia_codigo?: string | null
  provincia_nombre?: string | null
  municipio?: string | null
  direccion?: string | null
  latitud?: number | null
  longitud?: number | null
  telefono?: string | null
  responsable?: string | null
  configuracion?: ConfiguracionSolinera
  /** Solo en el listado */
  puestos_total?: number
  puestos_operativos?: number
  vehiculos_en_puesto?: number
  turno_abierto?: boolean
  /** Solo en el detalle */
  puestos?: Puesto[]
}

export interface SolineraCreateData {
  nombre: string
  estado?: EstadoSolinera
  provincia_codigo?: string | null
  provincia_nombre?: string | null
  municipio?: string | null
  direccion?: string | null
  latitud?: number | null
  longitud?: number | null
  telefono?: string | null
  responsable?: string | null
  cantidad_puestos?: number
  tipo_toma?: TipoToma
}

export type SolineraUpdateData = Partial<Omit<SolineraCreateData, "cantidad_puestos" | "tipo_toma">>

export interface PuestoCreateData {
  codigo?: string | null
  nombre?: string | null
  tipo_toma?: TipoToma
  potencia_max_kw?: number | null
  tipos_vehiculo?: TipoVehiculo[]
  nota?: string | null
}

export type PuestoUpdateData = Partial<Omit<PuestoCreateData, "codigo">> & { activo?: boolean }

// --- Tarifas ---------------------------------------------------------------

export interface Tarifa {
  id: string
  solinera_id: string
  nombre: string
  /** null = vale para cualquier vehículo que no tenga tarifa propia. */
  tipo_vehiculo: TipoVehiculo | null
  moneda: Moneda
  precio_hora: number
  fraccion_min: number
  minimo_min: number
  activa: boolean
  version: number
}

export interface TarifaCreateData {
  nombre?: string | null
  tipo_vehiculo?: TipoVehiculo | null
  moneda: Moneda
  precio_hora: number
  fraccion_min: number
  minimo_min: number
  activa?: boolean
}

export type TarifaUpdateData = Partial<Omit<TarifaCreateData, "tipo_vehiculo">>

// --- Clientes y vehículos --------------------------------------------------

export interface Vehiculo {
  id: string
  solinera_id: string
  cliente_id: string
  tipo: TipoVehiculo
  marca?: string | null
  modelo?: string | null
  chapa?: string | null
  voltaje_v?: number | null
  capacidad_ah?: number | null
  kwh_estimados?: number | null
  nota?: string | null
  activo: boolean
}

export interface ClienteSolinera {
  id: string
  solinera_id: string
  nombre: string
  telefono?: string | null
  carnet_identidad?: string | null
  direccion?: string | null
  nota?: string | null
  bloqueado: boolean
  motivo_bloqueo?: string | null
  activo: boolean
  creado_en?: string
  vehiculos: Vehiculo[]
}

export interface ClienteCreateData {
  nombre: string
  telefono?: string | null
  carnet_identidad?: string | null
  direccion?: string | null
  nota?: string | null
}

export type ClienteUpdateData = Partial<ClienteCreateData> & { activo?: boolean }

export interface VehiculoCreateData {
  tipo: TipoVehiculo
  marca?: string | null
  modelo?: string | null
  chapa?: string | null
  voltaje_v?: number | null
  capacidad_ah?: number | null
  nota?: string | null
}

export type VehiculoUpdateData = Partial<VehiculoCreateData> & { activo?: boolean }

// --- Cargas ----------------------------------------------------------------

export interface TarifaCopiada {
  id: string
  nombre?: string
  version: number
  moneda: Moneda
  precio_hora: number
  fraccion_min: number
  minimo_min: number
}

export type AlertaCarga = "excedida" | "maximo" | "ocupando"

export interface Carga {
  id: string
  /** CAR-SOL-AAAAMMDD-NNNN */
  codigo: string
  solinera_id: string
  solinera_nombre?: string
  puesto_id: string
  puesto_codigo: string
  cliente: { id: string; nombre: string; telefono?: string | null; carnet_identidad?: string | null }
  vehiculo: {
    id: string
    tipo: TipoVehiculo
    marca?: string | null
    modelo?: string | null
    chapa?: string | null
    voltaje_v?: number | null
    capacidad_ah?: number | null
    kwh_estimados?: number | null
  }
  reserva_id?: string | null
  /** null si la carga se hizo sin turno abierto. */
  turno_id: string | null
  estado: EstadoCarga
  inicio: string
  /** Tiempo que el cliente pidió cargar (sale en el ticket). */
  duracion_prevista_min: number
  fin_previsto: string
  fin_carga?: string | null
  retirado_en?: string | null
  tarifa: TarifaCopiada
  moneda: Moneda
  /** null hasta que la carga termina. */
  importe: number | null
  pagado: number
  /** Lo que resta por cobrar; null mientras la carga sigue en curso. */
  pendiente: number | null
  minutos_transcurridos: number
  /** Negativo = ya pasó del tiempo pedido. null si la carga ya terminó. */
  minutos_restantes: number | null
  /** En curso: lo que va costando ahora. Terminada: el importe final. */
  importe_acumulado: number
  /** Desde que terminó de cargar, en minutos (terminada o cobrada). */
  minutos_esperando?: number
  minutos_cargados?: number
  minutos_cobrados?: number
  alertas: AlertaCarga[]
  nota?: string | null
  motivo_anulacion?: string | null
  creado_por_nombre?: string
  /** Solo en el detalle */
  pagos?: PagoSolinera[]
}

export interface CargaIniciarData {
  cliente_id: string
  vehiculo_id: string
  puesto_id: string
  duracion_prevista_min: number
  reserva_id?: string | null
  nota?: string | null
}

// --- Panel en vivo ---------------------------------------------------------

export interface PuestoPanel {
  id: string
  codigo: string
  nombre?: string | null
  tipo_toma?: TipoToma
  potencia_max_kw?: number | null
  tipos_vehiculo: TipoVehiculo[]
  estado: EstadoPuestoVista
  estado_manual: EstadoPuestoManual
  motivo_estado?: string | null
  carga: Carga | null
}

export interface AlertaPanel {
  tipo: "excedida" | "maximo" | "ocupando" | "puesto_falla" | "puesto_fuera_servicio"
  gravedad: "critica" | "aviso"
  puesto_id: string
  puesto_codigo: string
  carga_id?: string
  carga_codigo?: string
  mensaje: string
}

export interface ReservaSolinera {
  id: string
  codigo: string
  solinera_id: string
  cliente: { id: string; nombre: string; telefono?: string | null }
  cliente_id: string
  vehiculo: { id: string; tipo: TipoVehiculo; marca?: string | null; modelo?: string | null; chapa?: string | null }
  vehiculo_id: string
  inicio: string
  fin: string
  duracion_min: number
  vence_en: string
  estado: EstadoReserva
  nota?: string | null
  motivo_cancelacion?: string | null
  carga_id?: string | null
  /** Solo en el panel: ya llegó su hora y sigue dentro de la gracia. */
  esperando?: boolean
}

export interface PanelSolinera {
  solinera: { id: string; codigo: string; nombre: string; estado: EstadoSolinera }
  ahora: string
  turno: { id: string; abierto_en: string; abierto_por_nombre?: string } | null
  resumen: {
    puestos_total: number
    libres: number
    cargando: number
    terminadas: number
    fuera_servicio: number
    reservas_proximas: number
  }
  puestos: PuestoPanel[]
  reservas: ReservaSolinera[]
  alertas: AlertaPanel[]
  configuracion: { tiempo_maximo_min: number; gracia_retiro_min: number; gracia_reserva_min: number }
}

// --- Reservas --------------------------------------------------------------

export interface SlotDisponibilidad {
  inicio: string
  fin: string
  /** HH:MM, hora de Cuba */
  hora_inicio: string
  hora_fin: string
  libres: number
  disponible: boolean
}

export interface DisponibilidadDia {
  fecha: string
  duracion_min: number
  tipo_vehiculo: TipoVehiculo
  laborable: boolean
  apertura: string | null
  cierre: string | null
  puestos_elegibles?: number
  slots: SlotDisponibilidad[]
}

export interface ReservaCreateData {
  cliente_id: string
  vehiculo_id: string
  /** ISO; sin zona se entiende hora de Cuba. */
  inicio: string
  duracion_min: number
  nota?: string | null
}

// --- Turnos ----------------------------------------------------------------

export type MontosPorMoneda = Partial<Record<Moneda, number>>

export interface TotalesTurno {
  por_metodo: Partial<Record<MetodoPago, MontosPorMoneda>>
  efectivo: MontosPorMoneda
  comprobantes_pendientes: number
}

export interface Turno {
  id: string
  solinera_id: string
  estado: "abierto" | "cerrado"
  abierto_en: string
  abierto_por_ci?: string
  abierto_por_nombre?: string
  fondo_inicial: MontosPorMoneda
  nota_apertura?: string | null
  cerrado_en?: string
  cerrado_por_nombre?: string
  efectivo_esperado?: MontosPorMoneda
  efectivo_contado?: MontosPorMoneda
  diferencia?: MontosPorMoneda
  nota_cierre?: string | null
  totales: TotalesTurno
  /** Solo al cerrar: cargas terminadas que siguen sin cobrarse. */
  cargas_sin_cobrar?: number
}

export interface TurnoAbrirData {
  fondo_inicial: MontosPorMoneda
  nota?: string | null
}

export interface TurnoCerrarData {
  contado: MontosPorMoneda
  nota?: string | null
}

// --- Pagos -----------------------------------------------------------------

export interface PagoSolinera {
  id: string
  solinera_id: string
  carga_id: string
  carga_codigo: string
  /** null si el pago se registró sin turno abierto. */
  turno_id: string | null
  cliente_nombre?: string
  metodo: MetodoPago
  monto: number
  moneda: Moneda
  tasa_cambio?: number | null
  /** Lo que aporta a la carga, en la moneda de la carga. */
  monto_aplicado: number
  moneda_carga: Moneda
  comprobante: {
    url: string
    numero_transaccion: string
    estado: EstadoComprobante
    resuelto_por_nombre?: string
    resuelto_en?: string
    motivo_rechazo?: string | null
  } | null
  estado: "registrado" | "cancelado"
  nota?: string | null
  registrado_por_nombre?: string
  creado_en: string
  motivo_cancelacion?: string | null
}

export interface PagoCreateData {
  carga_id: string
  metodo: MetodoPago
  /** En la moneda del pago: lo que entra en caja, sin el cambio devuelto. */
  monto: number
  moneda: Moneda
  /** CUP por cada unidad de moneda extranjera; solo si la moneda difiere de la de la carga. */
  tasa_cambio?: number | null
  numero_transaccion?: string | null
  comprobante_url?: string | null
  nota?: string | null
}

export interface ListaPaginada<T> {
  data: T[]
  total: number
  skip: number
  limit: number
}
