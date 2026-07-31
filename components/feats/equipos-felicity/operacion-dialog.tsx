"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/atom/input";
import { Label } from "@/components/shared/atom/label";
import { Textarea } from "@/components/shared/molecule/textarea";
import { Badge } from "@/components/shared/atom/badge";
import { useToast } from "@/hooks/use-toast";
import { useOperacionSobreDispositivo } from "@/hooks/use-equipos-felicity";
import {
  CLASE_NIVEL_RIESGO,
  CONFIRMACION_REQUERIDA,
  ETIQUETA_NIVEL_RIESGO,
  type OperacionCatalogoItem,
} from "@/lib/types/feats/equipos-felicity/equipos-felicity-types";
import { AlertTriangle, Loader2, TestTube2 } from "lucide-react";

interface OperacionDialogProps {
  sn: string;
  item: OperacionCatalogoItem | null;
  onOpenChange: (open: boolean) => void;
  onEjecutado: () => void;
}

export function OperacionDialog({ sn, item, onOpenChange, onEjecutado }: OperacionDialogProps) {
  const { toast } = useToast();
  const { previsualizando, ejecutando, previsualizar, ejecutar } = useOperacionSobreDispositivo(sn);

  const [segundos, setSegundos] = useState("300");
  const [zonaHoraria, setZonaHoraria] = useState("");
  const [alarmaId, setAlarmaId] = useState("");
  const [nota, setNota] = useState("");
  const [settingCode, setSettingCode] = useState("");
  const [settingValue, setSettingValue] = useState("");
  const [motivo, setMotivo] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [avisoEnlace, setAvisoEnlace] = useState<string | null>(null);
  const [errorPrevia, setErrorPrevia] = useState<string | null>(null);

  useEffect(() => {
    if (!item) return;
    setSegundos("300");
    setZonaHoraria("");
    setAlarmaId("");
    setNota("");
    setSettingCode("");
    setSettingValue("");
    setMotivo("");
    setConfirmacion("");
    setAvisoEnlace(null);
    setErrorPrevia(null);

    previsualizar(item.operacion, {}).then((res) => {
      if (res.ok) {
        setAvisoEnlace((res.data?.aviso_enlace as string) || null);
      } else {
        setErrorPrevia(res.error || null);
      }
    });
  }, [item, previsualizar]);

  if (!item) return null;

  const construirParametros = (): Record<string, unknown> => {
    switch (item.operacion) {
      case "cambiar_frecuencia_reporte":
        return { segundos: Number(segundos) };
      case "sincronizar_hora":
        return zonaHoraria.trim() ? { zona_horaria: zonaHoraria.trim() } : {};
      case "gestionar_alarma":
        return {
          alarma_id: alarmaId.trim(),
          estado: "1",
          ...(nota.trim() ? { nota: nota.trim() } : {}),
        };
      case "cambiar_parametro":
        return { settingCode: settingCode.trim(), settingValue: settingValue.trim() };
      default:
        return {};
    }
  };

  const parametrosValidos = (): boolean => {
    switch (item.operacion) {
      case "cambiar_frecuencia_reporte": {
        const n = Number(segundos);
        return Number.isFinite(n) && n >= 30 && n <= 3600;
      }
      case "gestionar_alarma":
        return alarmaId.trim().length > 0;
      case "cambiar_parametro":
        return settingCode.trim().length > 0;
      default:
        return true;
    }
  };

  const motivoValido = !item.requiere_motivo || motivo.trim().length >= 10;
  const confirmacionValida =
    !item.requiere_confirmacion || confirmacion.trim() === CONFIRMACION_REQUERIDA;

  const puedeEnviar = parametrosValidos() && motivoValido && confirmacionValida;

  const handleEjecutar = async (simular: boolean) => {
    const res = await ejecutar({
      operacion: item.operacion,
      parametros: construirParametros(),
      motivo: motivo.trim() || undefined,
      confirmacion: confirmacion.trim() || undefined,
      simular,
    });
    if (res.ok) {
      toast({
        title: simular ? "Simulación completada" : "Operación enviada",
        description: res.message || `Estado: ${res.data?.estado ?? "—"}`,
      });
      onEjecutado();
      onOpenChange(false);
    } else {
      toast({ title: "No se pudo ejecutar", description: res.error, variant: "destructive" });
    }
  };

  return (
    <Dialog open={Boolean(item)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {item.operacion}
            <Badge variant="outline" className={CLASE_NIVEL_RIESGO[item.nivel_riesgo]}>
              {ETIQUETA_NIVEL_RIESGO[item.nivel_riesgo]}
            </Badge>
          </DialogTitle>
          <DialogDescription>{item.advertencia}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {avisoEnlace && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              {avisoEnlace}
            </div>
          )}
          {errorPrevia && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {errorPrevia}
            </div>
          )}
          {previsualizando && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Revisando el equipo...
            </div>
          )}

          {item.operacion === "cambiar_frecuencia_reporte" && (
            <div className="space-y-1.5">
              <Label htmlFor="segundos">Segundos entre reportes (30–3600)</Label>
              <Input
                id="segundos"
                type="number"
                min={30}
                max={3600}
                value={segundos}
                onChange={(e) => setSegundos(e.target.value)}
              />
            </div>
          )}

          {item.operacion === "sincronizar_hora" && (
            <div className="space-y-1.5">
              <Label htmlFor="zona_horaria">
                Zona horaria <span className="text-gray-400 font-normal">(opcional)</span>
              </Label>
              <Input
                id="zona_horaria"
                value={zonaHoraria}
                onChange={(e) => setZonaHoraria(e.target.value)}
                placeholder="Usa la del equipo si se deja vacío"
              />
            </div>
          )}

          {item.operacion === "gestionar_alarma" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="alarma_id">ID de la alarma</Label>
                <Input
                  id="alarma_id"
                  value={alarmaId}
                  onChange={(e) => setAlarmaId(e.target.value)}
                  placeholder="Ver pestaña de Alarmas"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nota">
                  Nota <span className="text-gray-400 font-normal">(opcional)</span>
                </Label>
                <Input id="nota" value={nota} onChange={(e) => setNota(e.target.value)} />
              </div>
            </>
          )}

          {item.operacion === "cambiar_parametro" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="setting_code">Código del parámetro (settingCode)</Label>
                <Input
                  id="setting_code"
                  value={settingCode}
                  onChange={(e) => setSettingCode(e.target.value)}
                  placeholder="Ver pestaña Avanzado → Parámetros"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="setting_value">Nuevo valor</Label>
                <Input
                  id="setting_value"
                  value={settingValue}
                  onChange={(e) => setSettingValue(e.target.value)}
                />
              </div>
              <p className="text-xs text-gray-400">
                Verifica el código y el rango permitido en la pestaña Avanzado → Parámetros antes de confirmar.
              </p>
            </>
          )}

          {item.requiere_motivo && (
            <div className="space-y-1.5">
              <Label htmlFor="motivo">Motivo (mínimo 10 caracteres)</Label>
              <Textarea
                id="motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Explica por qué se hace este cambio"
                className="min-h-[80px]"
              />
            </div>
          )}

          {item.requiere_confirmacion && (
            <div className="space-y-1.5">
              <Label htmlFor="confirmacion">
                Escribe <span className="font-mono font-semibold">{CONFIRMACION_REQUERIDA}</span> para
                confirmar
              </Label>
              <Input
                id="confirmacion"
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
                placeholder={CONFIRMACION_REQUERIDA}
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => handleEjecutar(true)}
            disabled={!puedeEnviar || ejecutando}
          >
            {ejecutando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <TestTube2 className="h-4 w-4 mr-2" />}
            Simular
          </Button>
          <Button
            onClick={() => handleEjecutar(false)}
            disabled={!puedeEnviar || ejecutando}
            className={
              item.nivel_riesgo === "CRITICO"
                ? "bg-rose-600 hover:bg-rose-700"
                : item.nivel_riesgo === "PRECAUCION"
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-teal-600 hover:bg-teal-700"
            }
          >
            {ejecutando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Ejecutar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
