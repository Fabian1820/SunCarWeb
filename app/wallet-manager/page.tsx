"use client"

import Link from "next/link"
import { Button } from "@/components/shared/atom/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shared/molecule/card"
import { Wallet } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

/**
 * "Gestión de Wallet" se retiró en sep-2026. Sus dos interruptores (ver todas
 * las billeteras y administrar) son ahora sub-permisos de `wallet`
 * (`wallet/ver-todos`, `wallet/admin`) y se asignan en Gestión de Permisos, como
 * cualquier otro permiso. La ruta queda solo para quien la tenga guardada.
 */
export default function WalletManagerPage() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-blue-600" />
            Los permisos de billetera se movieron
          </CardTitle>
          <CardDescription>
            "Ver todas las billeteras" y "Administrar billetera" se asignan ahora
            en Gestión de Permisos, dentro del módulo Billetera.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          {user?.is_superAdmin ? (
            <Link href="/permisos" className="flex-1">
              <Button className="w-full">Ir a Gestión de Permisos</Button>
            </Link>
          ) : null}
          <Link href="/wallet" className="flex-1">
            <Button variant="outline" className="w-full">
              Ir a la Billetera
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
