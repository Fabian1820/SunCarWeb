/**
 * Quién creó y quién tocó por última vez un documento.
 *
 * Lo pone el backend solo, en cualquier colección, desde el 24-sep-2026
 * (SunCarBackend, infrastucture/trazabilidad). Los documentos anteriores no lo
 * traen, y los que se modificaron después pueden traer `modificado` sin `creado`.
 */
export interface SelloTrazabilidad {
  ci?: string | null;
  nombre?: string | null;
  /** ISO en UTC. */
  fecha?: string | null;
  /** "PUT /api/clientes/123": la acción que escribió el documento. */
  origen?: string | null;
  /** Identificador de la petición en la bitácora (Auditoría). */
  request_id?: string | null;
}

export interface Trazabilidad {
  creado?: SelloTrazabilidad | null;
  modificado?: SelloTrazabilidad | null;
}

/** Lo que se puede consultar en `GET /trazabilidad/{recurso}/{id}` (lista cerrada del backend). */
export type RecursoTrazabilidad =
  | "clientes"
  | "leads"
  | "ofertas-confeccion"
  | "citas"
  | "trabajadores"
  | "trabajos-diarios"
  | "vales-salida"
  | "solicitudes-materiales"
  | "solicitudes-ventas"
  | "solicitudes-entrada-almacen"
  | "solicitudes-envio"
  | "reservas"
  | "consignaciones"
  | "compras"
  | "facturas"
  | "facturas-ventas"
  | "facturas-solar-carros"
  | "transferencias-bancarias";
