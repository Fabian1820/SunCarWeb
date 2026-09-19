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

export type SeveridadAlerta = "critico" | "bajo" | "ok";

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
  severidad: SeveridadAlerta;
}

export interface AlertasFiltros {
  q: string;
  /** "todos" o el id del almacén; con uno fijado el stock deja de agregarse. */
  almacenId: string;
  /** "todos" | "sin-pedir" | "pedidos" */
  enSolicitud: "todos" | "sin-pedir" | "pedidos";
}

export const DEFAULT_ALERTAS_PAGE_SIZE = 20;

export function severidadDe(
  cantidad: number,
  stockajeMinimo: number,
): SeveridadAlerta {
  if (cantidad <= 0) return "critico";
  if (cantidad < stockajeMinimo) return "critico";
  if (cantidad <= stockajeMinimo * 1.2) return "bajo";
  return "ok";
}

const RANK_SEVERIDAD: Record<SeveridadAlerta, number> = {
  critico: 0,
  bajo: 1,
  ok: 2,
};

/**
 * Agrupa por material las filas que el backend devuelve por almacén. Con
 * `almacenId` fijado se restringe a ese almacén (el stock deja de ser la suma).
 */
function agrupar(
  almacenes: AlmacenConMaterialesBajos[],
  almacenId: string,
): MaterialBajoMinimoAgregado[] {
  const map = new Map<string, MaterialBajoMinimoAgregado>();
  for (const a of almacenes) {
    if (almacenId !== "todos" && a.almacen_id !== almacenId) continue;
    for (const m of a.materiales) {
      const entradaAlmacen = {
        almacen_id: a.almacen_id,
        almacen_nombre: a.almacen?.nombre ?? a.almacen_id,
        cantidad_actual: m.cantidad_actual,
      };
      const existing = map.get(m.material_id);
      if (existing) {
        existing.almacenes.push(entradaAlmacen);
        existing.cantidad_total += m.cantidad_actual;
      } else {
        map.set(m.material_id, {
          ...m,
          foto_disponible:
            (m as MaterialBajoMinimo & { foto_disponible?: boolean | null })
              .foto_disponible ?? null,
          almacenes: [entradaAlmacen],
          cantidad_total: m.cantidad_actual,
          deficit_total: 0,
          ignorada: false,
          solicitudes_activas: [],
          severidad: "critico",
        });
      }
    }
  }
  for (const item of map.values()) {
    item.deficit_total = Math.max(0, item.stockaje_minimo - item.cantidad_total);
    item.severidad = severidadDe(item.cantidad_total, item.stockaje_minimo);
  }
  return Array.from(map.values());
}

/** Bajo mínimo → cerca del mínimo → resto; dentro de cada tramo, mayor déficit. */
function ordenarPorSeveridad(
  items: MaterialBajoMinimoAgregado[],
): MaterialBajoMinimoAgregado[] {
  return [...items].sort((a, b) => {
    const ds = RANK_SEVERIDAD[a.severidad] - RANK_SEVERIDAD[b.severidad];
    if (ds !== 0) return ds;
    if (b.deficit_total !== a.deficit_total)
      return b.deficit_total - a.deficit_total;
    return a.nombre.localeCompare(b.nombre);
  });
}

/**
 * Carga materiales bajo mínimo (agregados por material), cruza con alertas
 * ignoradas y con solicitudes activas para pintar los badges en la tabla.
 *
 * Se pide `incluir_ignoradas` porque el backend las excluye por defecto: sin
 * eso la vista "Ver ignoradas" no tendría nada que mostrar nunca. El filtrado
 * activas/ignoradas se hace aquí.
 *
 * El filtrado y la paginación son de cliente a propósito: la fuente devuelve
 * filas por almacén y hay que agregarlas por material antes de poder ordenar
 * por severidad, así que paginar en el servidor daría páginas incoherentes.
 */
export function useAlertasStock() {
  const [almacenesRaw, setAlmacenesRaw] = useState<AlmacenConMaterialesBajos[]>(
    [],
  );
  const [ignoradas, setIgnoradas] = useState<AlertaStockIgnorada[]>([]);
  const [enSolicitudMap, setEnSolicitudMap] =
    useState<MaterialesEnSolicitudActiva>({});
  const [loading, setLoading] = useState(true);
  const [verIgnoradas, setVerIgnoradas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_ALERTAS_PAGE_SIZE);
  const [filtros, setFiltros] = useState<AlertasFiltros>({
    q: "",
    almacenId: "todos",
    enSolicitud: "todos",
  });
  const fetchIdRef = useRef(0);

  const load = useCallback(async () => {
    const id = ++fetchIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const [respBajos, listaIgnoradas, mapaActivas] = await Promise.all([
        // Con las ignoradas incluidas: sin ellas «Ver ignoradas» sale vacía y
        // no hay fila desde la que reactivar. El filtro de abajo las separa.
        InventarioService.getMaterialesBajoMinimo({ incluir_ignoradas: true }),
        SolicitudEnvioService.listAlertasIgnoradas(),
        SolicitudEnvioService.materialesEnSolicitudActiva(),
      ]);
      if (id !== fetchIdRef.current) return;
      setAlmacenesRaw(respBajos.data ?? []);
      setIgnoradas(listaIgnoradas);
      setEnSolicitudMap(mapaActivas);
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

  /** Almacenes presentes en la respuesta, para el selector de filtro. */
  const almacenesDisponibles = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of almacenesRaw) {
      map.set(a.almacen_id, a.almacen?.nombre ?? a.almacen_id);
    }
    return Array.from(map.entries())
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [almacenesRaw]);

  const todosMateriales = useMemo(() => {
    const ignoradasIds = new Set(ignoradas.map((a) => a.material_id));
    return agrupar(almacenesRaw, filtros.almacenId).map((m) => ({
      ...m,
      ignorada: ignoradasIds.has(m.material_id),
      solicitudes_activas: enSolicitudMap[m.codigo] ?? [],
    }));
  }, [almacenesRaw, ignoradas, enSolicitudMap, filtros.almacenId]);

  const filtrados = useMemo(() => {
    const q = filtros.q.trim().toLowerCase();
    const base = todosMateriales.filter((m) => {
      if (verIgnoradas ? !m.ignorada : m.ignorada) return false;
      if (filtros.enSolicitud === "sin-pedir" && m.solicitudes_activas.length > 0)
        return false;
      if (filtros.enSolicitud === "pedidos" && m.solicitudes_activas.length === 0)
        return false;
      if (!q) return true;
      return (
        m.codigo.toLowerCase().includes(q) ||
        m.nombre.toLowerCase().includes(q) ||
        (m.descripcion ?? "").toLowerCase().includes(q)
      );
    });
    return ordenarPorSeveridad(base);
  }, [todosMateriales, verIgnoradas, filtros.q, filtros.enSolicitud]);

  const total = filtrados.length;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  const pageSegura = Math.min(page, totalPages);

  const pagina = useMemo(
    () => filtrados.slice((pageSegura - 1) * pageSize, pageSegura * pageSize),
    [filtrados, pageSegura, pageSize],
  );

  const updateFiltros = useCallback((patch: Partial<AlertasFiltros>) => {
    setFiltros((prev) => ({ ...prev, ...patch }));
    setPage(1);
  }, []);

  const cambiarVerIgnoradas = useCallback((valor: boolean) => {
    setVerIgnoradas(valor);
    setPage(1);
  }, []);

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
    /** Página actual ya filtrada y ordenada por severidad. */
    materiales: pagina,
    todosMateriales,
    almacenesDisponibles,
    ignoradas,
    enSolicitud: enSolicitudMap,
    total,
    page: pageSegura,
    pageSize,
    totalPages,
    setPage,
    setPageSize,
    filtros,
    updateFiltros,
    loading,
    error,
    verIgnoradas,
    setVerIgnoradas: cambiarVerIgnoradas,
    reload: load,
    ignorar,
    reactivar,
  };
}
