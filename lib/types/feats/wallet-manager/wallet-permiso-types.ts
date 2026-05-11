export interface WalletPermisoBackend {
  usuario_ci: string
  ver_todos: boolean
  es_admin: boolean
  updated_at?: string | null
  updated_by_ci?: string | null
}

export interface WalletPermiso {
  usuarioCi: string
  verTodos: boolean
  esAdmin: boolean
  updatedAt: Date | null
  updatedByCi: string | null
}

export interface WalletPermisoUpdateData {
  ver_todos: boolean
  es_admin: boolean
}

export function convertWalletPermisoToFrontend(
  backend: WalletPermisoBackend
): WalletPermiso {
  return {
    usuarioCi: backend.usuario_ci,
    verTodos: !!backend.ver_todos,
    esAdmin: !!backend.es_admin,
    updatedAt: backend.updated_at ? new Date(backend.updated_at) : null,
    updatedByCi: backend.updated_by_ci || null,
  }
}
