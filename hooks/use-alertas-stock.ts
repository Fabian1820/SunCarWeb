"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  InventarioService,
  SolicitudEnvioService,
} from "@/lib/api-services";
import type {
  AlertaStockIgnorada,
  MaterialesEnSolicitudActiva,
} from "@/lib/types/feats/solicitudes-envio/solicitud-envio-types";
import type {
  AlmacenConMaterialesBajos,
  MaterialBajoMinimo,
} from "@/lib/types/feats/inventario/stock-minimo-types";

export interface MaterialBajoMinimoAgregado extends MaterialBajoMinimo {
  foto_disponible?: boolean | null;
  almacenes: Array<{
    almacen_id: string;
    almacen_nombre: string;
    cantidad_actual: number;
  }>;
  cantidad_total: number;
  deficit_total: number;
  ignorada: boolean;
  solicitudes_activas: Array<{ id: string; codigo: string; estado: string }>;
}

function agrupar(
  almacenes: AlmacenConMaterialesBajos[],
): MaterialBajoMinimoAgregado[] {
  const map = new Map<string, MaterialBajoMinimoAgregado>();
  for (const a of almacenes) {
    for (const m of a.materiales) {
      const key = m.material_id;
      const existing = map.get(key);
      if (existing) {
        existing.almacenes.push({
          almacen_id: a.almacen_id,
          almacen_nombre: a.almacen?.nombre ?? a.almacen_id,
          cantidad_actual: m.cantidad_actual,
        });
        existing.cantidad_total += m.cantidad_actual;
      } else {
        map.set(key, {
          ...m,
          almacenes: [
            {
              almacen_id: a.almacen_id,
              almacen_nombre: a.almacen?.nombre ?? a.almacen_id,
              cantidad_actual: m.cantidad_actual,
            },
          ],
          cantidad_total: m.cantidad_actual,
          deficit_total: Math.max(0, m.stockaje_minimo - m.cantidad_actual),
          ignorada: false,
          solicitudes_activas: [],
        });
      }
    }
  }
  // Recalcular deficit total con la suma
  for (const item of map.values()) {
    item.deficit_total = Math.max(
      0,
      item.stockaje_minimo - item.cantidad_total,
    );
  }
  return Array.from(map.values()).sort((a, b) => b.deficit_total - a.deficit_total);
}

/**
 * Carga materiales bajo mínimo (agregados por material), cruza con alertas
 * ignoradas y con solicitudes activas para pintar los badges en la tabla.
 */
export function useAlertasStock() {
  const [materiales, setMateriales] = useState<MaterialBajoMinimoAgregado[]>([]);
  const [ignoradas, setIgnoradas] = useState<AlertaStockIgnorada[]>([]);
  const [enSolicitud, setEnSolicitud] = useState<MaterialesEnSolicitudActiva>({});
  const [loading, setLoading] = useState(true);
  const [verIgnoradas, setVerIgnoradas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchIdRef = useRef(0);

  const load = useCallback(async () => {
    const id = ++fetchIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const [respBajos, listaIgnoradas, mapaActivas] = await Promise.all([
        InventarioService.getMaterialesBajoMinimo(),
        SolicitudEnvioService.listAlertasIgnoradas(),
        SolicitudEnvioService.materialesEnSolicitudActiva(),
      ]);
      if (id !== fetchIdRef.current) return;
      const ignoradasIds = new Set(listaIgnoradas.map((a) => a.material_id));
      const agrupados = agrupar(respBajos.data ?? []).map((m) => {
        const raw = respBajos.data
          ?.flatMap((a) => a.materiales)
          .find((x) => x.material_id === m.material_id) as
          | (MaterialBajoMinimo & { foto_disponible?: boolean | null })
          | undefined;
        return {
          ...m,
          foto_disponible: raw?.foto_disponible ?? null,
          ignorada: ignoradasIds.has(m.material_id),
          solicitudes_activas: mapaActivas[m.codigo] ?? [],
        };
      });
      setMateriales(agrupados);
      setIgnoradas(listaIgnoradas);
      setEnSolicitud(mapaActivas);
    } catch (e) {
      if (id === fetchIdRef.current)
        setError(e instanceof Error ? e.message : "Error cargando alertas");
    } finally {
      if (id === fetchIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtrados = useMemo(
    () =>
      verIgnoradas
        ? materiales.filter((m) => m.ignorada)
        : materiales.filter((m) => !m.ignorada),
    [materiales, verIgnoradas],
  );

  const ignorar = useCallback(
    async (materialId: string, motivo?: string) => {
      await SolicitudEnvioService.ignorarAlerta(materialId, motivo);
      await load();
    },
    [load],
  );

  const reactivar = useCallback(
    async (materialId: string) => {
      await SolicitudEnvioService.reactivarAlerta(materialId);
      await load();
    },
    [load],
  );

  return {
    materiales: filtrados,
    todosMateriales: materiales,
    ignoradas,
    enSolicitud,
    loading,
    error,
    verIgnoradas,
    setVerIgnoradas,
    reload: load,
    ignorar,
    reactivar,
  };
}
