import { useCallback, useEffect, useState } from "react"
import { WalletPermisoService } from "@/lib/api-services"
import type { WalletPermiso } from "@/lib/types/feats/wallet-manager/wallet-permiso-types"
import { convertWalletPermisoToFrontend } from "@/lib/types/feats/wallet-manager/wallet-permiso-types"

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
