import { apiRequest } from "@/lib/api-config"
import type {
  WalletPermisoBackend,
  WalletPermisoUpdateData,
} from "@/lib/types/feats/wallet-manager/wallet-permiso-types"

interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

export const WalletPermisoService = {
  async getMe(): Promise<WalletPermisoBackend> {
    const response = await apiRequest<ApiResponse<WalletPermisoBackend>>(
      "/wallet-permisos/me"
    )
    return response.data
  },

  async getAll(): Promise<WalletPermisoBackend[]> {
    const response = await apiRequest<ApiResponse<WalletPermisoBackend[]>>(
      "/wallet-permisos/"
    )
    return response.data || []
  },

  async getByCi(ci: string): Promise<WalletPermisoBackend> {
    const response = await apiRequest<ApiResponse<WalletPermisoBackend>>(
      `/wallet-permisos/${ci}`
    )
    return response.data
  },

  async update(
    ci: string,
    data: WalletPermisoUpdateData
  ): Promise<WalletPermisoBackend> {
    const response = await apiRequest<ApiResponse<WalletPermisoBackend>>(
      `/wallet-permisos/${ci}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    )
    return response.data
  },
}
