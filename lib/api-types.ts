// Central type exports grouped by feature. Keeps legacy import paths intact while colocation
// lives under lib/types/feats.

export type {
  BackendMaterial,
  BackendCatalogoProductos,
  BackendCategoria,
  Material,
} from './types/feats/materials/material-types'
export { transformBackendToFrontend, transformCategories } from './types/feats/materials/material-types'

export type {
  Lead,
  LeadResponse,
  LeadPaginatedData,
  LeadCreateData,
  LeadUpdateData,
  LeadConversionRequest,
  OfertaAsignacion,
  OfertaEmbebida,
  ElementoPersonalizado,
} from './types/feats/leads/lead-types'

export type {
  Cliente,
  ClienteFoto,
  ClienteResponse,
  ClienteCreateData,
  ClienteSimpleCreateData,
  ClienteUpdateData,
} from './types/feats/customer/cliente-types'

export type { Trabajador, Brigada } from './types/feats/brigade/brigade-types'

export type { MensajeCliente, RespuestaMensaje } from './types/feats/customer-service/customer-service-types'

export type {
  ElementoOferta,
  CreateElementoRequest,
  UpdateElementoRequest,
  Oferta,
  OfertaSimplificada,
  CreateOfertaRequest,
  UpdateOfertaRequest,
} from './types/feats/ofertas/oferta-types'

export type {
  TipoReporte,
  OrdenTrabajo,
  CreateOrdenTrabajoRequest,
  UpdateOrdenTrabajoRequest,
  CreateOrdenTrabajoResponse,
  ListOrdenesTrabajoResponse,
  CreateOrdenTrabajoItem,
} from './types/feats/ordenes-trabajo/orden-trabajo-types'

export type {
  ArticuloTienda,
  ArticuloTiendaFormData,
  ArticuloTiendaCreateData,
  ArticuloTiendaUpdateData,
  ArticuloTiendaFilters,
  BackendArticuloTiendaResponse,
  EspecificacionesSugeridas,
} from './types/feats/articulos-tienda/articulos-tienda-types'

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
} from './types/feats/inventario/inventario-types'

export type {
  InstalacionPendiente,
  PendientesInstalacionFilters,
  EstadoEquiposData,
  CategoriaEquipos,
  EquipoDetalle,
  ClienteConEquipo,
} from './types/feats/reportes-comercial/reportes-comercial-types'
