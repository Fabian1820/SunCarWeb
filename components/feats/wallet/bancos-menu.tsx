"use client";

import { useState } from "react";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/atom/input";
import { Label } from "@/components/shared/atom/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/shared/molecule/dropdown-menu";
import { Check, ChevronDown, Landmark, Loader2, Plus, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Banco } from "@/lib/types/feats/wallet/banco-types";

interface BancosMenuProps {
  bancos: Banco[];
  loadingBancos: boolean;
  viewedBancoId: string | null;
  onSelectPersonal: () => void;
  onSelectBanco: (banco: Banco) => void;
  onCrearBanco: (nombre: string) => Promise<Banco>;
  creando: boolean;
}

export function BancosMenu({
  bancos,
  loadingBancos,
  viewedBancoId,
  onSelectPersonal,
  onSelectBanco,
  onCrearBanco,
  creando,
}: BancosMenuProps) {
  const { toast } = useToast();
  const [crearAbierto, setCrearAbierto] = useState(false);
  const [nombre, setNombre] = useState("");

  const bancoActivo = bancos.find((b) => b.id === viewedBancoId) || null;

  const handleCrear = async () => {
    const nombreLimpio = nombre.trim();
    if (nombreLimpio.length < 2) {
      toast({
        title: "Nombre inválido",
        description: "Escribe un nombre de al menos 2 caracteres.",
        variant: "destructive",
      });
      return;
    }
    try {
      const banco = await onCrearBanco(nombreLimpio);
      toast({ title: "Banco creado", description: `"${banco.nombre}" ya está disponible.` });
      setNombre("");
      setCrearAbierto(false);
      onSelectBanco(banco);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "No se pudo crear el banco",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="gap-1.5 border-slate-200 bg-white hover:bg-slate-50"
          >
            {bancoActivo ? (
              <Landmark className="h-4 w-4 text-blue-600" />
            ) : (
              <Wallet className="h-4 w-4 text-slate-500" />
            )}
            <span className="hidden sm:inline text-sm max-w-[140px] truncate">
              {bancoActivo ? bancoActivo.nombre : "Mi billetera"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuItem onClick={onSelectPersonal} className="cursor-pointer gap-2">
            <Wallet className="h-4 w-4 text-slate-500" />
            <span className="flex-1">Mi billetera personal</span>
            {!bancoActivo && <Check className="h-3.5 w-3.5 text-emerald-600" />}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {loadingBancos ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            </div>
          ) : bancos.length === 0 ? (
            <p className="px-2 py-2 text-xs text-slate-400">Aún no hay bancos creados</p>
          ) : (
            bancos.map((banco) => (
              <DropdownMenuItem
                key={banco.id}
                onClick={() => onSelectBanco(banco)}
                className="cursor-pointer gap-2"
              >
                <Landmark className="h-4 w-4 text-blue-600" />
                <span className="flex-1 truncate">{banco.nombre}</span>
                {bancoActivo?.id === banco.id && (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                )}
              </DropdownMenuItem>
            ))
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setTimeout(() => setCrearAbierto(true), 0);
            }}
            className="cursor-pointer gap-2 text-blue-700"
          >
            <Plus className="h-4 w-4" />
            Crear banco nuevo
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={crearAbierto} onOpenChange={setCrearAbierto}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-blue-600" />
              Crear banco
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Nombre identificador</Label>
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Banco Metropolitano"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleCrear();
                }}
              />
            </div>
            <Button
              onClick={() => void handleCrear()}
              disabled={creando}
              className="w-full gap-1.5"
            >
              {creando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Crear banco
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
