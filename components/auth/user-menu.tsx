"use client"

import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/shared/atom/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/shared/molecule/dropdown-menu"
import { LogOut, User } from "lucide-react"

export function UserMenu() {
  const { user, logout } = useAuth()

  if (!user) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label="Abrir men\xFA de cuenta"
          className="flex items-center justify-center gap-0 sm:gap-2 bg-white hover:bg-orange-50 border-orange-200 hover:border-orange-300 rounded-full sm:rounded-md h-9 w-9 sm:h-9 sm:w-auto px-0 sm:px-3"
        >
          <User className="h-4 w-4 text-orange-600" />
          <span className="hidden sm:inline text-gray-700">{user.nombre}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-sm">
          <div className="font-medium text-gray-900">{user.nombre}</div>
          <div className="text-xs text-gray-500">CI: {user.ci}</div>
          <div className="text-xs text-gray-500 mt-1">
            <span className="font-medium">Cargo:</span> {user.rol}
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="text-red-600 cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Cerrar Sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
