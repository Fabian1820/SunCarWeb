export interface WalletPermisoBackend {
  usuario_ci: string
  ver_todos: boolean
  es_admin: boolean
  gestionar_banco_global: boolean
  updated_at?: string | null
  updated_by_ci?: string | null
}

export interface WalletPermiso {
  usuarioCi: string
  verTodos: boolean
  esAdmin: boolean
  gestionarBancoGlobal: boolean
  updatedAt: Date | null
  updatedByCi: string | null
}

export interface WalletPermisoUpdateData {
  ver_todos: boolean
  es_admin: boolean
  gestionar_banco_global: boolean
}

export function convertWalletPermisoToFrontend(
  backend: WalletPermisoBackend
): WalletPermiso {
  return {
    usuarioCi: backend.usuario_ci,
    verTodos: !!backend.ver_todos,
    esAdmin: !!backend.es_admin,
    gestionarBancoGlobal: !!backend.gestionar_banco_global,
    updatedAt: backend.updated_at ? new Date(backend.updated_at) : null,
    updatedByCi: backend.updated_by_ci || null,
  }
}
