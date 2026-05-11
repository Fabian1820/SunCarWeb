import { useCallback, useEffect, useState } from "react"
import { WalletPermisoService } from "@/lib/api-services"
import type {
  WalletPermiso,
  WalletPermisoUpdateData,
} from "@/lib/types/feats/wallet-manager/wallet-permiso-types"
import { convertWalletPermisoToFrontend } from "@/lib/types/feats/wallet-manager/wallet-permiso-types"

export function useWalletPermisos() {
  const [permisos, setPermisos] = useState<WalletPermiso[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await WalletPermisoService.getAll()
      setPermisos(data.map(convertWalletPermisoToFrontend))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando permisos")
    } finally {
      setLoading(false)
    }
  }, [])

  const update = useCallback(
    async (ci: string, data: WalletPermisoUpdateData): Promise<boolean> => {
      try {
        const updated = await WalletPermisoService.update(ci, data)
        const converted = convertWalletPermisoToFrontend(updated)
        setPermisos((prev) => {
          const idx = prev.findIndex((p) => p.usuarioCi === ci)
          if (idx >= 0) {
            const next = [...prev]
            next[idx] = converted
            return next
          }
          return [...prev, converted]
        })
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error actualizando")
        return false
      }
    },
    []
  )

  useEffect(() => {
    void load()
  }, [load])

  return {
    permisos,
    loading,
    error,
    reload: load,
    update,
    clearError: () => setError(null),
  }
}

export function useMyWalletPermiso() {
  const [permiso, setPermiso] = useState<WalletPermiso | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await WalletPermisoService.getMe()
      setPermiso(convertWalletPermisoToFrontend(data))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando permisos")
      setPermiso(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { permiso, loading, error, reload: load }
}
