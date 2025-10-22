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
  LeadCreateData,
  LeadUpdateData,
  LeadConversionRequest,
} from './types/feats/leads/lead-types'

export type {
  Cliente,
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
  OrdenTrabajoResponse,
} from './types/feats/ordenes-trabajo/orden-trabajo-types'
