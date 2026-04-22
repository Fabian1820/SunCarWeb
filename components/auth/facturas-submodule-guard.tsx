"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { SOLO_PAGOS_CLIENTES_CIS } from "@/lib/facturacion-access"

export function FacturasSubmoduleGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  const bloqueado = !!user?.ci && SOLO_PAGOS_CLIENTES_CIS.includes(user.ci)

  useEffect(() => {
    if (!isLoading && bloqueado) {
      router.replace("/facturas/pagos-clientes")
    }
  }, [isLoading, bloqueado, router])

  if (bloqueado) return null
  return <>{children}</>
}
