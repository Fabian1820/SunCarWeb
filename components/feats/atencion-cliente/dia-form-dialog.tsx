"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/atom/input";
import { Label } from "@/components/shared/atom/label";
import { Checkbox } from "@/components/shared/molecule/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import { Loader2, UserMinus } from "lucide-react";
import { AtencionClienteService } from "@/lib/services/feats/atencion-cliente/atencion-cliente-service";
import { useToast } from "@/hooks/use-toast";
import type {
  ComercialAtencion,
  DiaPlanificado,
} from "@/lib/types/feats/atencion-cliente/atencion-cliente-types";

interface TurnoEditable {
  clave: string;
  nombre: string;
  inicio: string;
  fin: string;
  comerciales: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (abierto: boolean) => void;
  dia: DiaPlanificado | null;
  comerciales: ComercialAtencion[];
  onGuardado: () => void;
}

/**
 * Planifica un día suelto. Las horas se pueden cambiar solo para este día
 * (la afectación puntual de la que habla el planificador) sin tocar la
 * plantilla semanal, porque lo que se guarda es una copia, no una referencia.
 */
export function DiaFormDialog({
  open,
  onOpenChange,
  dia,
  comerciales,
  onGuardado,
}: Props) {
  const { toast } = useToast();
  const [turnos, setTurnos] = useState<TurnoEditable[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [suplencia, setSuplencia] = useState({
    turno: "",
    sale: "",
    entra: "",
    motivo: "",
  });

  useEffect(() => {
    if (!open || !dia) return;
    setTurnos(
      dia.turnos.map((t) => ({
        clave: t.clave,
        nombre: t.nombre,
        inicio: t.inicio,
        fin: t.fin,
        comerciales: t.comerciales.map((c) => c.CI),
      })),
    );
    setSuplencia({ turno: "", sale: "", entra: "", motivo: "" });
  }, [open, dia]);

  if (!dia) return null;

  const deGuardiaEseDia = new Set(turnos.flatMap((t) => t.comerciales));

  const alternarComercial = (indice: number, ci: string) => {
    setTurnos((previos) =>
      previos.map((turno, i) => {
        if (i !== indice) return turno;
        return turno.comerciales.includes(ci)
          ? { ...turno, comerciales: turno.comerciales.filter((x) => x !== ci) }
          : { ...turno, comerciales: [...turno.comerciales, ci] };
      }),
    );
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      await AtencionClienteService.guardarDia(dia.fecha, turnos);
      toast({ title: `Guardia del ${dia.fecha} guardada` });
      onGuardado();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "No se pudo guardar",
        description: error instanceof Error ? error.message : "Error",
        variant: "destructive",
      });
    } finally {
      setGuardando(false);
    }
  };

  const quitarGuardia = async () => {
    setGuardando(true);
    try {
      await AtencionClienteService.borrarDia(dia.fecha);
      toast({ title: `El ${dia.fecha} queda sin guardia` });
      onGuardado();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "No se pudo quitar la guardia",
        description: error instanceof Error ? error.message : "Error",
        variant: "destructive",
      });
    } finally {
      setGuardando(false);
    }
  };

  const registrarSuplencia = async () => {
    if (!suplencia.turno || !suplencia.sale || !suplencia.entra) return;
    setGuardando(true);
    try {
      await AtencionClienteService.registrarSuplencia(
        dia.fecha,
        suplencia.turno,
        suplencia.sale,
        suplencia.entra,
        suplencia.motivo || undefined,
      );
      toast({ title: "Suplencia registrada" });
      onGuardado();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "No se pudo registrar la suplencia",
        description: error instanceof Error ? error.message : "Error",
        variant: "destructive",
      });
    } finally {
      setGuardando(false);
    }
  };

  const turnoSuplencia = dia.turnos.find((t) => t.clave === suplencia.turno);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Guardia del {dia.fecha}{" "}
            <span className="text-sm font-normal text-gray-500">
              ({dia.dia_semana})
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {turnos.length === 0 && (
            <p className="text-sm text-gray-500">
              Este día no tiene turnos en la plantilla. Cámbialo en Horarios
              predeterminados si debería tener guardia.
            </p>
          )}

          {turnos.map((turno, indice) => (
            <div key={turno.clave} className="rounded-lg border border-gray-200 p-3">
              <div className="flex flex-wrap items-end gap-2">
                <span className="font-medium text-gray-900">{turno.nombre}</span>
                <div>
                  <Label className="text-xs text-gray-500">Desde</Label>
                  <Input
                    type="time"
                    value={turno.inicio}
                    onChange={(e) =>
                      setTurnos((previos) =>
                        previos.map((t, i) =>
                          i === indice ? { ...t, inicio: e.target.value } : t,
                        ),
                      )
                    }
                    className="h-9 w-28"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Hasta</Label>
                  <Input
                    type="time"
                    value={turno.fin}
                    onChange={(e) =>
                      setTurnos((previos) =>
                        previos.map((t, i) =>
                          i === indice ? { ...t, fin: e.target.value } : t,
                        ),
                      )
                    }
                    className="h-9 w-28"
                  />
                </div>
                <span className="ml-auto text-xs text-gray-500">
                  {turno.comerciales.length} de guardia
                </span>
              </div>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1">
                {comerciales.map((comercial) => {
                  const marcado = turno.comerciales.includes(comercial.CI);
                  const enOtroTurno =
                    !marcado && deGuardiaEseDia.has(comercial.CI);
                  return (
                    <label
                      key={comercial.CI}
                      className={`flex items-center gap-2 rounded px-2 py-1 text-sm ${
                        enOtroTurno
                          ? "text-gray-400"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <Checkbox
                        checked={marcado}
                        disabled={enOtroTurno}
                        onCheckedChange={() =>
                          alternarComercial(indice, comercial.CI)
                        }
                      />
                      <span>{comercial.nombre}</span>
                      {enOtroTurno && (
                        <span className="text-xs">(ya está en otro turno)</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          {dia.planificado && dia.turnos.some((t) => t.comerciales.length > 0) && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-900">
                <UserMinus className="h-4 w-4" />
                Registrar una suplencia
              </div>
              <p className="text-xs text-gray-600">
                Sustituye a quien no pudo cubrir y deja constancia del cambio.
                Guardar la suplencia aplica el cambio de inmediato.
              </p>
              <div className="flex flex-wrap gap-2">
                <Select
                  value={suplencia.turno}
                  onValueChange={(v) =>
                    setSuplencia((s) => ({ ...s, turno: v, sale: "" }))
                  }
                >
                  <SelectTrigger className="h-9 w-40">
                    <SelectValue placeholder="Turno" />
                  </SelectTrigger>
                  <SelectContent>
                    {dia.turnos.map((t) => (
                      <SelectItem key={t.clave} value={t.clave}>
                        {t.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={suplencia.sale}
                  onValueChange={(v) => setSuplencia((s) => ({ ...s, sale: v }))}
                >
                  <SelectTrigger className="h-9 w-44">
                    <SelectValue placeholder="Quién falta" />
                  </SelectTrigger>
                  <SelectContent>
                    {(turnoSuplencia?.comerciales || []).map((c) => (
                      <SelectItem key={c.CI} value={c.CI}>
                        {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={suplencia.entra}
                  onValueChange={(v) => setSuplencia((s) => ({ ...s, entra: v }))}
                >
                  <SelectTrigger className="h-9 w-44">
                    <SelectValue placeholder="Quién cubre" />
                  </SelectTrigger>
                  <SelectContent>
                    {comerciales
                      .filter((c) => !deGuardiaEseDia.has(c.CI))
                      .map((c) => (
                        <SelectItem key={c.CI} value={c.CI}>
                          {c.nombre}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Motivo (opcional)"
                  value={suplencia.motivo}
                  onChange={(e) =>
                    setSuplencia((s) => ({ ...s, motivo: e.target.value }))
                  }
                  className="h-9 w-48"
                />
                <Button
                  variant="outline"
                  className="h-9"
                  onClick={registrarSuplencia}
                  disabled={
                    guardando ||
                    !suplencia.turno ||
                    !suplencia.sale ||
                    !suplencia.entra
                  }
                >
                  Registrar
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-between gap-2">
            {dia.planificado ? (
              <Button
                variant="outline"
                className="text-red-600 border-red-200"
                onClick={quitarGuardia}
                disabled={guardando}
              >
                Quitar guardia del día
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={guardar} disabled={guardando}>
                {guardando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
