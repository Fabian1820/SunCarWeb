"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { PermisosService } from "@/lib/api-services"
import { Loader2, Lock, Eye, EyeOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface SetPasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trabajadorCi: string | null
  trabajadorNombre: string | null
  onPasswordSet: () => void
}

export function SetPasswordDialog({
  open,
  onOpenChange,
  trabajadorCi,
  trabajadorNombre,
  onPasswordSet,
}: SetPasswordDialogProps) {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const handleClose = () => {
    setPassword("")
    setConfirmPassword("")
    setShowPassword(false)
    setShowConfirmPassword(false)
    onOpenChange(false)
  }

  const handleSave = async () => {
    if (!trabajadorCi) return

    // Validaciones
    if (!password) {
      toast({
        title: "Error",
        description: "La contraseña no puede estar vacía",
        variant: "destructive",
      })
      return
    }

    if (password.length < 6) {
      toast({
        title: "Error",
        description: "La contraseña debe tener al menos 6 caracteres",
        variant: "destructive",
      })
      return
    }

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const result = await PermisosService.registerAdminPassword(
        trabajadorCi,
        password
      )

      if (result.success) {
        toast({
          title: "Contraseña establecida",
          description: `La contraseña administrativa de ${trabajadorNombre} fue establecida exitosamente`,
        })
        onPasswordSet()
        handleClose()
      } else {
        toast({
          title: "Error",
          description: result.message || "No se pudo establecer la contraseña",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo establecer la contraseña administrativa",
        variant: "destructive",
      })
      console.error("Error setting password:", error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-suncar-primary" />
            Establecer Contraseña Administrativa
          </DialogTitle>
          <DialogDescription>
            <span className="font-semibold">{trabajadorNombre}</span> (CI: {trabajadorCi})
            <br />
            Establezca una contraseña para acceso administrativo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Campo de contraseña */}
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingrese la contraseña"
                disabled={isSaving}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Mínimo 6 caracteres
            </p>
          </div>

          {/* Campo de confirmación */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme la contraseña"
                disabled={isSaving}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !password || !confirmPassword}
            className="bg-suncar-primary hover:bg-suncar-primary/90"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Guardando...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Establecer Contraseña
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
