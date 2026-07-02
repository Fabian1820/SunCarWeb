"use client";

import { useState, type ReactNode } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/shared/atom/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/shared/molecule/dialog";
import Link from "next/link";
import { LogOut, User, KeyRound, IdCard } from "lucide-react";
import { ChangePasswordDialog } from "@/components/auth/change-password-dialog";
import { WorkerAvatarUploader } from "@/components/feats/worker/worker-avatar";

interface UserMenuProps {
  /**
   * Trigger personalizado. Si se provee, reemplaza al botón por defecto
   * (se renderiza con asChild). Útil para usarlo como fila de perfil en el
   * sidebar y evitar mostrar el nombre dos veces.
   */
  trigger?: ReactNode;
  /** @deprecated Conservado por compatibilidad; ya no se usa (la vista es un diálogo). */
  align?: "start" | "center" | "end";
}

export function UserMenu({ trigger }: UserMenuProps) {
  const { user, logout, updateUserFoto } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogTrigger asChild>
          {trigger ?? (
            <Button
              variant="outline"
              size="sm"
              aria-label="Abrir perfil"
              className="flex items-center justify-center gap-0 sm:gap-2 bg-white hover:bg-emerald-50 border-emerald-200 hover:border-emerald-300 rounded-full sm:rounded-md h-9 w-9 sm:h-9 sm:w-auto px-0 sm:px-3"
            >
              <User className="h-4 w-4 text-emerald-600" />
              <span className="hidden sm:inline text-gray-700">
                {user.nombre}
              </span>
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mi Perfil</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center gap-6 py-2">
            <WorkerAvatarUploader
              ci={user.ci}
              fotoPerfil={user.foto_perfil}
              nombre={user.nombre}
              size="lg"
              onChange={(foto) => updateUserFoto(foto)}
            />

            <div className="w-full rounded-xl border border-gray-100 bg-gray-50 p-4 text-center">
              <p className="text-base font-semibold text-gray-900">{user.nombre}</p>
              <p className="text-sm text-gray-500">CI: {user.ci}</p>
              <p className="mt-1 text-sm text-gray-500">
                <span className="font-medium">Cargo:</span> {user.rol}
              </p>
            </div>

            <div className="flex w-full flex-col gap-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                asChild
              >
                <Link href="/mi-tarjeta" onClick={() => setIsProfileOpen(false)}>
                  <IdCard className="mr-2 h-4 w-4" />
                  Mi tarjeta de presentación
                  <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                    Prueba
                  </span>
                </Link>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setIsProfileOpen(false);
                  setIsChangePasswordOpen(true);
                }}
              >
                <KeyRound className="mr-2 h-4 w-4" />
                Cambiar Contraseña
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={logout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ChangePasswordDialog
        open={isChangePasswordOpen}
        onOpenChange={setIsChangePasswordOpen}
      />
    </>
  );
}
