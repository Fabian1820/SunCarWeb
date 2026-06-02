// Central type exports grouped by feature. Keeps legacy import paths intact while colocation
// lives under lib/types/feats.

export type {
  BackendMaterial,
  BackendCatalogoProductos,
  BackendCategoria,
  Material,
} from "./types/feats/materials/material-types";
export {
  transformBackendToFrontend,
  transformCategories,
} from "./types/feats/materials/material-types";

export type {
  Lead,
  LeadResponse,
  LeadCreateData,
  LeadUpdateData,
  LeadConversionRequest,
  LeadFoto,
  OfertaAsignacion,
  OfertaEmbebida,
  ElementoPersonalizado,
} from "./types/feats/leads/lead-types";

export type {
  Cliente,
  ClienteFoto,
  ClienteResponse,
  ClienteCreateData,
  ClienteSimpleCreateData,
  ClienteUpdateData,
} from "./types/feats/customer/cliente-types";

export type { Trabajador, Brigada } from "./types/feats/brigade/brigade-types";

export type {
  MensajeCliente,
  RespuestaMensaje,
} from "./types/feats/customer-service/customer-service-types";

export type {
  ElementoOferta,
  CreateElementoRequest,
  UpdateElementoRequest,
  Oferta,
  OfertaSimplificada,
  CreateOfertaRequest,
  UpdateOfertaRequest,
} from "./types/feats/ofertas/oferta-types";

export type {
  InventarioMovimientoTipo,
  Almacen,
  Tienda,
  StockItem,
  MovimientoInventario,
  AlmacenCreateData,
  AlmacenUpdateData,
  TiendaCreateData,
  TiendaUpdateData,
  MovimientoCreateData,
  VentaItem,
  VentaCreateData,
} from "./types/feats/inventario/inventario-types";

export type {
  InstalacionPendiente,
  PendientesInstalacionFilters,
  EstadoEquiposData,
  CategoriaEquipos,
  EquipoDetalle,
  ClienteConEquipo,
} from "./types/feats/reportes-comercial/reportes-comercial-types";

export type {
  SolicitudMaterial,
  SolicitudMaterialAnularData,
  SolicitudMaterialCreateData,
  SolicitudMaterialUpdateData,
  SolicitudMaterialItem,
  SolicitudMaterialItemDetalle,
  SolicitudMaterialListResponse,
  SolicitudMaterialSummary,
  SolicitudMaterialSummaryResponse,
  MaterialSugerido,
  MaterialesSugeridosResponse,
} from "./types/feats/solicitudes-materiales/solicitud-material-types";

export type {
  ValeSalida,
  ValeSalidaCreateData,
  ValeSalidaAnularData,
  ValeSalidaListResponse,
  ValeSalidaSummary,
  ValeSalidaSummaryMaterial,
  ValeSalidaSummaryResponse,
  DevolucionValeCreateData,
  DevolucionVale,
  DevolucionValeMaterial,
  DevolucionValeMaterialPayload,
  DevolucionValeResumen,
  DevolucionValeResumenMaterial,
  ValeSolicitudPendiente,
  ValeSolicitudTipo,
  ValeSalidaMaterialItem,
  ValeSalidaMaterialItemDetalle,
  ValeSolicitudInfo,
  ValeTrabajadorInfo,
  ValeAlmacenInfo,
  ValeClienteInfo,
  ValeMaterialInfo,
} from "./types/feats/vales-salida/vale-salida-types";

export type {
  ClienteVenta,
  ClienteVentaCreateData,
  ClienteVentaUpdateData,
  ClienteVentaListResponse,
} from "./types/feats/clientes-ventas/cliente-venta-types";

export type {
  OfertaVenta,
  OfertaVentaMaterialDetalle,
  OfertaVentaCreateData,
  OfertaVentaUpdateData,
  OfertaVentaListParams,
  OfertaVentaListResponse,
  EstadoOfertaVenta,
} from "./types/feats/ofertas-venta/oferta-venta-types";

export type {
  SolicitudVenta,
  SolicitudVentaAnularData,
  SolicitudVentaCreateData,
  SolicitudVentaUpdateData,
  SolicitudVentaMaterialItem,
  SolicitudVentaMaterialItemDetalle,
  SolicitudVentaListParams,
  SolicitudVentaListResponse,
  SolicitudVentaSummary,
  SolicitudVentaSummaryAgregados,
  SolicitudVentaSummaryResponse,
  SolicitudVentaAlmacenInfo,
  SolicitudVentaTrabajadorInfo,
  SolicitudVentaPlanPagosData,
  SolicitudVentaSummaryMaterial,
  MaterialVentaInfo,
  MaterialVentaWeb,
} from "./types/feats/solicitudes-ventas/solicitud-venta-types";

export type {
  Sede,
  SedeTipo,
  SedeUpsertRequest,
} from "./types/feats/sedes/sede-types";

export type {
  Departamento,
  DepartamentoUpsertRequest,
} from "./types/feats/departamentos/departamento-types";

export type {
  Reserva,
  MaterialReserva,
  MaterialReservaConsumir,
  ReservaCreateData,
  ReservaUpdateData,
  ReservaConsumirData,
  ReservaListParams,
  ReservaListResponse,
  ReservaEstado,
  ReservaOrigen,
  ReservaClienteTipo,
} from "./types/feats/reservas-ventas/reserva-venta-types";
