import { useCallback, useEffect, useState } from "react";
import { PresupuestoLogisticaService } from "@/lib/services/feats/presupuesto-logistica/presupuesto-logistica-service";
import type {
  DecisionItem,
  EstadoPresupuesto,
  PresupuestoCreateData,
  PresupuestoLogistica,
  PresupuestoUpdateData,
  SugerenciasPresupuesto,
} from "@/lib/types/feats/presupuesto-logistica/presupuesto-logistica-types";

interface UsePresupuestosLogisticaReturn {
  presupuestos: PresupuestoLogistica[];
  sugerencias: SugerenciasPresupuesto;
  loading: boolean;
  saving: boolean;
  error: string | null;
  anioFilter: number | "todos";
  setAnioFilter: (value: number | "todos") => void;
  estadoFilter: EstadoPresupuesto | "todos";
  setEstadoFilter: (value: EstadoPresupuesto | "todos") => void;
  recargar: () => Promise<void>;
  crear: (data: PresupuestoCreateData) => Promise<PresupuestoLogistica>;
  actualizar: (id: string, data: PresupuestoUpdateData) => Promise<PresupuestoLogistica>;
  enviar: (id: string) => Promise<PresupuestoLogistica>;
  revisar: (id: string, decisiones: DecisionItem[]) => Promise<PresupuestoLogistica>;
  resolver: (id: string, comentario?: string | null) => Promise<PresupuestoLogistica>;
  anular: (id: string, motivo: string) => Promise<PresupuestoLogistica>;
  clearError: () => void;
}

const SUGERENCIAS_VACIAS: SugerenciasPresupuesto = {
  materiales: [],
  locales: [],
  sedes_libres: [],
};

export function usePresupuestosLogistica(): UsePresupuestosLogisticaReturn {
  const [presupuestos, setPresupuestos] = useState<PresupuestoLogistica[]>([]);
  const [sugerencias, setSugerencias] =
    useState<SugerenciasPresupuesto>(SUGERENCIAS_VACIAS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [anioFilter, setAnioFilter] = useState<number | "todos">(
    new Date().getFullYear(),
  );
  const [estadoFilter, setEstadoFilter] = useState<EstadoPresupuesto | "todos">(
    "todos",
  );

  const recargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { presupuestos: data } = await PresupuestoLogisticaService.listar({
        anio: anioFilter === "todos" ? undefined : anioFilter,
        estado: estadoFilter === "todos" ? undefined : estadoFilter,
        limit: 300,
      });
      setPresupuestos(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los presupuestos");
      setPresupuestos([]);
    } finally {
      setLoading(false);
    }
  }, [anioFilter, estadoFilter]);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  useEffect(() => {
    PresupuestoLogisticaService.sugerencias()
      .then(setSugerencias)
      // Sin sugerencias el módulo sigue funcionando: son texto libre.
      .catch(() => setSugerencias(SUGERENCIAS_VACIAS));
  }, []);

  const aplicar = useCallback((actualizado: PresupuestoLogistica) => {
    setPresupuestos((previos) => {
      const existe = previos.some((p) => p.id === actualizado.id);
      return existe
        ? previos.map((p) => (p.id === actualizado.id ? actualizado : p))
        : [actualizado, ...previos];
    });
    return actualizado;
  }, []);

  const ejecutar = useCallback(
    async <T,>(accion: () => Promise<T>): Promise<T> => {
      setSaving(true);
      setError(null);
      try {
        return await accion();
      } catch (e) {
        const mensaje =
          e instanceof Error ? e.message : "No se pudo completar la operación";
        setError(mensaje);
        throw new Error(mensaje);
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  return {
    presupuestos,
    sugerencias,
    loading,
    saving,
    error,
    anioFilter,
    setAnioFilter,
    estadoFilter,
    setEstadoFilter,
    recargar,
    crear: (data) =>
      ejecutar(() => PresupuestoLogisticaService.crear(data).then(aplicar)),
    actualizar: (id, data) =>
      ejecutar(() => PresupuestoLogisticaService.actualizar(id, data).then(aplicar)),
    enviar: (id) =>
      ejecutar(() => PresupuestoLogisticaService.enviar(id).then(aplicar)),
    revisar: (id, decisiones) =>
      ejecutar(() => PresupuestoLogisticaService.revisar(id, decisiones).then(aplicar)),
    resolver: (id, comentario) =>
      ejecutar(() => PresupuestoLogisticaService.resolver(id, comentario).then(aplicar)),
    anular: (id, motivo) =>
      ejecutar(() => PresupuestoLogisticaService.anular(id, motivo).then(aplicar)),
    clearError: () => setError(null),
  };
}
