// Tipos de la feature "Transferencias bancarias" (Leads/Clientes → Wallet
// Bancos → Pagos Cliente). Ver plan completo en la sesión de implementación:
// flujo de doble confirmación (comercial crea → admin de wallet
// acepta/rechaza), reusando `Banco`/`WalletTransaction` de Wallet y `Pago` de
// Cobros Clientes.
//
// Patrón Backend (snake_case) / Frontend (camelCase) + conversor, igual que
// `lib/types/feats/wallet-manager/wallet-permiso-types.ts`.

export type TransferenciaBancariaEstado =
  | "pendiente"
  | "procesando"
  | "aceptada"
  | "rechazada"
  | "cancelada";

export type TransferenciaBancariaMoneda = "USD" | "EUR" | "CUP" | "MLC";

export interface ComprobanteTransferenciaBancariaBackend {
  url: string;
  nombre: string;
  tamano: number;
  mime_type: string;
  subido_por_ci: string;
  subido_por_nombre: string;
  created_at: string;
}

export interface ComprobanteTransferenciaBancaria {
  url: string;
  nombre: string;
  tamano: number;
  mimeType: string;
  subidoPorCi: string;
  subidoPorNombre: string;
  createdAt: Date;
}

function convertComprobanteToFrontend(
  backend: ComprobanteTransferenciaBancariaBackend,
): ComprobanteTransferenciaBancaria {
  return {
    url: backend.url,
    nombre: backend.nombre,
    tamano: backend.tamano,
    mimeType: backend.mime_type,
    subidoPorCi: backend.subido_por_ci,
    subidoPorNombre: backend.subido_por_nombre,
    createdAt: new Date(backend.created_at),
  };
}

export interface TransferenciaBancariaBackend {
  id: string;
  lead_id?: string | null;
  cliente_id?: string | null;
  cliente_numero?: string | null;

  oferta_id: string;
  monto: number;
  moneda: TransferenciaBancariaMoneda;
  tasa_cambio: number;
  monto_usd?: number | null;

  banco_id: string;
  banco_nombre: string;

  comprobante_cliente?: ComprobanteTransferenciaBancariaBackend | null;
  comprobante_admin?: ComprobanteTransferenciaBancariaBackend | null;

  // Datos de facturación — texto libre, editable, nunca forzado desde lead/cliente
  nombre_completo_cliente: string;
  pais_residencia: string;
  tipo_documento_identidad: string;
  numero_documento_identidad: string;
  direccion_residencia: string;
  telefono: string;
  correo?: string | null;
  contacto_en_cuba?: string | null;
  direccion_instalacion_cuba: string;
  notas?: string | null;

  estado: TransferenciaBancariaEstado;

  creado_por_ci: string;
  creado_por_nombre: string;
  created_at: string;
  editado_por_ci?: string | null;
  editado_por_nombre?: string | null;
  fecha_actualizacion?: string | null;

  resuelto_por_ci?: string | null;
  resuelto_por_nombre?: string | null;
  fecha_resolucion?: string | null;
  motivo_rechazo?: string | null;

  cancelado_por_ci?: string | null;
  fecha_cancelacion?: string | null;

  wallet_transaction_id?: string | null;
  pago_id?: string | null;
}

export interface TransferenciaBancaria {
  id: string;
  leadId: string | null;
  clienteId: string | null;
  clienteNumero: string | null;

  ofertaId: string;
  monto: number;
  moneda: TransferenciaBancariaMoneda;
  tasaCambio: number;
  montoUsd: number | null;

  bancoId: string;
  bancoNombre: string;

  comprobanteCliente: ComprobanteTransferenciaBancaria | null;
  comprobanteAdmin: ComprobanteTransferenciaBancaria | null;

  nombreCompletoCliente: string;
  paisResidencia: string;
  tipoDocumentoIdentidad: string;
  numeroDocumentoIdentidad: string;
  direccionResidencia: string;
  telefono: string;
  correo: string | null;
  contactoEnCuba: string | null;
  direccionInstalacionCuba: string;
  notas: string | null;

  estado: TransferenciaBancariaEstado;

  creadoPorCi: string;
  creadoPorNombre: string;
  createdAt: Date;
  editadoPorCi: string | null;
  editadoPorNombre: string | null;
  fechaActualizacion: Date | null;

  resueltoPorCi: string | null;
  resueltoPorNombre: string | null;
  fechaResolucion: Date | null;
  motivoRechazo: string | null;

  canceladoPorCi: string | null;
  fechaCancelacion: Date | null;

  walletTransactionId: string | null;
  pagoId: string | null;
}

export function convertTransferenciaBancariaToFrontend(
  backend: TransferenciaBancariaBackend,
): TransferenciaBancaria {
  return {
    id: backend.id,
    leadId: backend.lead_id ?? null,
    clienteId: backend.cliente_id ?? null,
    clienteNumero: backend.cliente_numero ?? null,

    ofertaId: backend.oferta_id,
    monto: backend.monto,
    moneda: backend.moneda,
    tasaCambio: backend.tasa_cambio,
    montoUsd: backend.monto_usd ?? null,

    bancoId: backend.banco_id,
    bancoNombre: backend.banco_nombre,

    comprobanteCliente: backend.comprobante_cliente
      ? convertComprobanteToFrontend(backend.comprobante_cliente)
      : null,
    comprobanteAdmin: backend.comprobante_admin
      ? convertComprobanteToFrontend(backend.comprobante_admin)
      : null,

    nombreCompletoCliente: backend.nombre_completo_cliente,
    paisResidencia: backend.pais_residencia,
    tipoDocumentoIdentidad: backend.tipo_documento_identidad,
    numeroDocumentoIdentidad: backend.numero_documento_identidad,
    direccionResidencia: backend.direccion_residencia,
    telefono: backend.telefono,
    correo: backend.correo ?? null,
    contactoEnCuba: backend.contacto_en_cuba ?? null,
    direccionInstalacionCuba: backend.direccion_instalacion_cuba,
    notas: backend.notas ?? null,

    estado: backend.estado,

    creadoPorCi: backend.creado_por_ci,
    creadoPorNombre: backend.creado_por_nombre,
    createdAt: new Date(backend.created_at),
    editadoPorCi: backend.editado_por_ci ?? null,
    editadoPorNombre: backend.editado_por_nombre ?? null,
    fechaActualizacion: backend.fecha_actualizacion
      ? new Date(backend.fecha_actualizacion)
      : null,

    resueltoPorCi: backend.resuelto_por_ci ?? null,
    resueltoPorNombre: backend.resuelto_por_nombre ?? null,
    fechaResolucion: backend.fecha_resolucion
      ? new Date(backend.fecha_resolucion)
      : null,
    motivoRechazo: backend.motivo_rechazo ?? null,

    canceladoPorCi: backend.cancelado_por_ci ?? null,
    fechaCancelacion: backend.fecha_cancelacion
      ? new Date(backend.fecha_cancelacion)
      : null,

    walletTransactionId: backend.wallet_transaction_id ?? null,
    pagoId: backend.pago_id ?? null,
  };
}

// Comprobante que envía la comercial al crear/editar — mismo shape que
// `ComprobanteTransferenciaBancariaIn` del backend (snake_case, sin metadata
// de quién/cuándo lo subió: eso lo agrega el backend).
export interface ComprobanteTransferenciaBancariaIn {
  url: string;
  nombre: string;
  tamano: number;
  mime_type: string;
}

// Datos que envía el diálogo de la comercial al crear/editar. Exactamente uno
// de lead_id/cliente_id debe estar presente (según el origen del diálogo).
export interface TransferenciaBancariaCreateData {
  lead_id?: string;
  cliente_id?: string;
  cliente_numero?: string;
  oferta_id: string;
  banco_id: string;
  monto: number;
  moneda: TransferenciaBancariaMoneda;
  tasa_cambio?: number;
  comprobante_cliente?: ComprobanteTransferenciaBancariaIn;
  nombre_completo_cliente: string;
  pais_residencia: string;
  tipo_documento_identidad: string;
  numero_documento_identidad: string;
  direccion_residencia: string;
  telefono: string;
  correo?: string;
  contacto_en_cuba?: string;
  direccion_instalacion_cuba: string;
  notas?: string;
}

export type TransferenciaBancariaUpdateData =
  Partial<TransferenciaBancariaCreateData>;

// Respuesta de `POST /transferencias-bancarias/upload-comprobante` — mismo
// shape que `UploadComprobanteResponse` de pagos (`pago_responses.py`).
export interface UploadComprobanteTransferenciaResponse {
  success: boolean;
  message: string;
  url: string;
  filename: string;
  size: number;
  content_type: string;
}

// Datos opcionales del comprobante que sube el admin de wallet al aceptar.
export interface AceptarTransferenciaBancariaData {
  comprobante_admin_url?: string;
  comprobante_admin_nombre?: string;
  comprobante_admin_tamano?: number;
  comprobante_admin_mime_type?: string;
}
