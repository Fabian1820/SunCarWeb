import { useCallback, useEffect, useState } from "react"
import { BancoService } from "@/lib/api-services"
import type { Banco, BancoCreateData } from "@/lib/types/feats/wallet/banco-types"

export function useBancos(enabled: boolean) {
  const [bancos, setBancos] = useState<Banco[]>([])
  const [loading, setLoading] = useState(false)
  const [creando, setCreando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    try {
      const data = await BancoService.listar()
      setBancos(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar los bancos")
    } finally {
      setLoading(false)
    }
  }, [enabled])

  const crear = useCallback(
    async (data: BancoCreateData): Promise<Banco> => {
      setCreando(true)
      setError(null)
      try {
        const banco = await BancoService.crear(data)
        setBancos((prev) => [...prev, banco].sort((a, b) => a.nombre.localeCompare(b.nombre)))
        return banco
      } catch (err) {
        const message = err instanceof Error ? err.message : "No se pudo crear el banco"
        setError(message)
        throw new Error(message)
      } finally {
        setCreando(false)
      }
    },
    [],
  )

  const eliminar = useCallback(async (bancoId: string): Promise<void> => {
    setEliminando(true)
    setError(null)
    try {
      await BancoService.eliminar(bancoId)
      setBancos((prev) => prev.filter((b) => b.id !== bancoId))
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo eliminar el banco"
      setError(message)
      throw new Error(message)
    } finally {
      setEliminando(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { bancos, loading, creando, eliminando, error, reload: load, crear, eliminar }
}
