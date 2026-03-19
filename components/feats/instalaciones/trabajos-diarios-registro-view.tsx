"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shared/molecule/card";
import { useToast } from "@/hooks/use-toast";
import { TrabajadorService, TrabajosDiariosService } from "@/lib/api-services";
import type { TrabajoDiarioRegistro } from "@/lib/types/feats/instalaciones/trabajos-diarios-types";
import { TrabajoDiarioForm } from "./trabajo-diario-form";
import { Plus } from "lucide-react";

type Worker = {
  CI?: string;
  nombre?: string;
  is_brigadista?: boolean;
};

const toDateInput = (value: Date) => {
  const yyyy = value.getFullYear();
  const mm = String(value.getMonth() + 1).padStart(2, "0");
  const dd = String(value.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const safeText = (value: unknown) => String(value || "").trim();

interface TrabajosDiariosRegistroViewProps {
  onCreateRequested: () => void;
}

export function TrabajosDiariosRegistroView({
  onCreateRequested,
}: TrabajosDiariosRegistroViewProps) {
  const { toast } = useToast();
  const [fecha, setFecha] = useState("");
  const [trabajadorFiltro, setTrabajadorFiltro] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [trabajos, setTrabajos] = useState<TrabajoDiarioRegistro[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedTrabajo, setSelectedTrabajo] =
    useState<TrabajoDiarioRegistro | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);

  const workersOptions = useMemo(
    () =>
      (workers || [])
        .filter((w) => Boolean(safeText(w.CI) || safeText(w.nombre)))
        .sort((a, b) =>
          safeText(a.nombre).localeCompare(safeText(b.nombre), "es"),
        ),
    [workers],
  );

  const loadWorkers = useCallback(async () => {
    try {
      const data = await TrabajadorService.getAllTrabajadores();
      setWorkers((data as unknown as Worker[]) || []);
    } catch {
      setWorkers([]);
    }
  }, []);

  const loadTrabajos = useCallback(async () => {
    if (!fecha) {
      setTrabajos([]);
      setSelectedId("");
      setSelectedTrabajo(null);
      return;
    }

    setLoading(true);
    try {
      const rows = await TrabajosDiariosService.getTrabajos({
        fecha,
        instaladores: trabajadorFiltro ? [trabajadorFiltro] : [],
      });
      setTrabajos(rows || []);
      if (!rows || rows.length === 0) {
        setSelectedId("");
        setSelectedTrabajo(null);
        return;
      }

      const keepSelected = rows.find(
        (t) => safeText(t.id || t.vale_id) === selectedId,
      );
      if (keepSelected) {
        setSelectedTrabajo(keepSelected);
      } else {
        const firstId = safeText(rows[0].id || rows[0].vale_id);
        setSelectedId(firstId);
        setSelectedTrabajo(rows[0]);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudieron cargar trabajos";
      toast({ title: "Error", description: message, variant: "destructive" });
      setTrabajos([]);
      setSelectedId("");
      setSelectedTrabajo(null);
    } finally {
      setLoading(false);
    }
  }, [fecha, selectedId, toast, trabajadorFiltro]);

  useEffect(() => {
    void loadWorkers();
  }, [loadWorkers]);

  useEffect(() => {
    void loadTrabajos();
  }, [loadTrabajos]);

  const trabajosFiltrados = useMemo(() => trabajos, [trabajos]);

  useEffect(() => {
    if (!selectedId) return;
    const found = trabajosFiltrados.find(
      (t) => safeText(t.id || t.vale_id) === selectedId,
    );
    if (found) setSelectedTrabajo(found);
  }, [selectedId, trabajosFiltrados]);

  const handleSave = async () => {
    if (!selectedTrabajo) return;
    if (!safeText(selectedTrabajo.id)) {
      toast({
        title: "No editable",
        description:
          "El trabajo seleccionado no tiene ID para editar en backend.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const saved = await TrabajosDiariosService.updateTrabajo(
        selectedTrabajo.id as string,
        selectedTrabajo,
      );

      const savedId = safeText(
        saved.id ||
          saved.vale_id ||
          selectedTrabajo.id ||
          selectedTrabajo.vale_id,
      );
      const nextRows = [...trabajos];
      const index = nextRows.findIndex(
        (item) => safeText(item.id || item.vale_id) === selectedId,
      );
      if (index >= 0) nextRows[index] = { ...selectedTrabajo, ...saved };
      else nextRows.unshift({ ...selectedTrabajo, ...saved });
      setTrabajos(nextRows);
      setSelectedId(savedId || selectedId);
      setSelectedTrabajo({ ...selectedTrabajo, ...saved });
      toast({
        title: "Guardado",
        description: "Trabajo diario actualizado correctamente.",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo guardar en backend";
      toast({
        title: "Aviso",
        description: `${message}. Se mantienen los cambios en pantalla para no perder datos.`,
      });
      const nextRows = [...trabajos];
      const index = nextRows.findIndex(
        (item) => safeText(item.id || item.vale_id) === selectedId,
      );
      if (index >= 0) nextRows[index] = selectedTrabajo;
      setTrabajos(nextRows);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Buscar trabajos diarios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                placeholder={toDateInput(new Date())}
              />
            </div>
            <div className="space-y-2">
              <Label>Trabajador</Label>
              <Select
                value={trabajadorFiltro || "__all__"}
                onValueChange={(val) =>
                  setTrabajadorFiltro(val === "__all__" ? "" : val)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  {workersOptions.map((worker, index) => {
                    const ci = safeText(worker.CI);
                    const nombre = safeText(worker.nombre) || "Trabajador";
                    const value = ci || nombre;
                    return (
                      <SelectItem key={`${value}-${index}`} value={value}>
                        {ci ? `${nombre} (${ci})` : nombre}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button
                type="button"
                onClick={() => void loadTrabajos()}
                disabled={loading}
              >
                {loading ? "Buscando..." : "Buscar"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onCreateRequested}
              >
                <Plus className="h-4 w-4 mr-1" />
                Crear trabajo diario
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-stretch">
        <Card className="xl:col-span-1 h-[72vh] min-h-[560px] flex flex-col">
          <CardHeader>
            <CardTitle className="text-base">
              Resultados ({trabajosFiltrados.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 flex-1 overflow-y-auto">
            {loading ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : trabajosFiltrados.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay trabajos para estos filtros.
              </p>
            ) : (
              trabajosFiltrados.map((trabajo) => {
                const rowId = safeText(trabajo.id || trabajo.vale_id);
                const active = rowId === selectedId;
                return (
                  <button
                    key={rowId}
                    type="button"
                    className={`w-full text-left border rounded-md p-3 transition ${
                      active
                        ? "border-blue-500 bg-blue-50"
                        : "hover:bg-slate-50"
                    }`}
                    onClick={() => {
                      setSelectedId(rowId);
                      setSelectedTrabajo(trabajo);
                    }}
                  >
                    <p className="font-medium text-sm">
                      {safeText(
                        trabajo.vale_codigo,
                        safeText(trabajo.id, "Trabajo"),
                      )}
                    </p>
                    <p className="text-xs text-slate-600">
                      Cliente: {safeText(trabajo.cliente_nombre, "N/A")}
                    </p>
                    <p className="text-xs text-slate-600">
                      Responsable:{" "}
                      {safeText(trabajo.responsable_recogida, "N/A")}
                    </p>
                    <p className="text-xs text-slate-600">
                      Tipo: {safeText(trabajo.tipo_trabajo, "Sin definir")}
                    </p>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2 h-[72vh] min-h-[560px] flex flex-col">
          <CardHeader>
            <CardTitle className="text-base">
              Registrar datos de trabajo
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            {!selectedTrabajo ? (
              <p className="text-sm text-muted-foreground">
                Selecciona un trabajo de la lista para introducir inicio, fin y
                materiales.
              </p>
            ) : (
              <TrabajoDiarioForm
                value={selectedTrabajo}
                onChange={setSelectedTrabajo}
                onSubmit={() => void handleSave()}
                submitLabel="Guardar datos del trabajo"
                isSaving={saving}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
