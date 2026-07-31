"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import {
  useConfiguracionEquipoOficina,
  useCuentaFelicity,
  useDispositivosFelicity,
} from "@/hooks/use-equipos-felicity";
import { Button } from "@/components/shared/atom/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import { ETIQUETA_TIPO_DISPOSITIVO } from "@/lib/types/feats/equipos-felicity/equipos-felicity-types";

function fechaLarga(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

/** Botón visible solo para superAdmin: define qué equipo Felicity representa la oficina. */
export function ConfigurarEquipoOficinaButton() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [snSeleccionado, setSnSeleccionado] = useState<string>("");

  const { vinculada, cargar: cargarCuenta } = useCuentaFelicity();
  const { dispositivos, loading: cargandoDispositivos, cargar: cargarDispositivos } =
    useDispositivosFelicity();
  const { config, loading: cargandoConfig, guardando, cargar: cargarConfig, guardar } =
    useConfiguracionEquipoOficina();

  useEffect(() => {
    if (!open) return;
    cargarCuenta();
    cargarDispositivos();
    cargarConfig();
  }, [open, cargarCuenta, cargarDispositivos, cargarConfig]);

  useEffect(() => {
    if (config?.dispositivo_sn) setSnSeleccionado(config.dispositivo_sn);
  }, [config]);

  if (!user?.is_superAdmin) return null;

  const handleGuardar = async () => {
    if (!snSeleccionado) return;
    const ok = await guardar(snSeleccionado);
    if (ok) {
      toast({ title: "Equipo de oficina configurado", description: "Ya se muestra en la barra lateral de todo el sistema." });
      setOpen(false);
    } else {
      toast({ title: "Error", description: "No se pudo configurar el equipo de oficina", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="flex justify-center pb-6 pt-2">
        <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="text-gray-500">
          <Building2 className="h-4 w-4" />
          Configurar equipo de oficina
        </Button>
      </div>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurar equipo de oficina</DialogTitle>
          <DialogDescription>
            Elige uno de tus equipos Felicity vinculados. Su batería y su corriente de la
            calle se mostrarán como estado de la oficina a todo el que entre al sistema.
          </DialogDescription>
        </DialogHeader>

        {vinculada === false ? (
          <p className="text-sm text-gray-600">
            Tu usuario no tiene una cuenta de FSolar vinculada todavía. Vincúlala primero en{" "}
            <Link href="/equipos-felicity" className="font-medium text-emerald-700 underline">
              Equipos Felicity
            </Link>{" "}
            y vuelve a intentarlo.
          </p>
        ) : (
          <div className="space-y-4">
            {cargandoDispositivos || cargandoConfig ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando equipos…
              </div>
            ) : dispositivos.length === 0 ? (
              <p className="text-sm text-gray-600">
                Tu cuenta de FSolar no tiene equipos sincronizados todavía.
              </p>
            ) : (
              <Select value={snSeleccionado} onValueChange={setSnSeleccionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un equipo" />
                </SelectTrigger>
                <SelectContent>
                  {dispositivos.map((d) => (
                    <SelectItem key={d.sn} value={d.sn}>
                      {(d.alias || d.modelo || d.sn)} · {ETIQUETA_TIPO_DISPOSITIVO[d.tipo] || d.tipo}
                      {d.planta_nombre ? ` · ${d.planta_nombre}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {config && (
              <p className="text-xs text-gray-400">
                Configurado actualmente por {config.configurado_por_nombre || config.configurado_por_ci} el{" "}
                {fechaLarga(config.configurado_en)}.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleGuardar} disabled={!snSeleccionado || guardando || vinculada === false}>
            {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
