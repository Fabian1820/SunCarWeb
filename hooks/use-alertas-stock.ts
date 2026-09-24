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
import { normalizeSearchText } from "@/lib/utils/string-utils";

export type SeveridadAlerta = "critico" | "bajo" | "ok";

/** Un almacén donde el material está en o por debajo de su mínimo. */
export interface AlmacenEnAlerta {
  almacen_id: string;
  almacen_nombre: string;
  cantidad_actual: number;
  /** Lo que le falta a ESTE almacén para llegar al mínimo. */
  deficit: number;
  severidad: SeveridadAlerta;
}

export interface MaterialBajoMinimoAgregado extends MaterialBajoMinimo {
  foto_disponible?: boolean | null;
  /** Solo los almacenes en alerta: el mínimo se aplica almacén a almacén. */
  almacenes: AlmacenEnAlerta[];
  /** Suma de lo que le falta a cada almacén en alerta. */
  deficit_total: number;
  ignorada: boolean;
  /**
   * Silenciada y hoy sin alerta en ningún almacén. Solo aparece en «Ver
   * ignoradas», para poder reactivarla.
   */
  sin_alerta_actual: boolean;
  solicitudes_activas: Array<{ id: string; codigo: string; estado: string }>;
  /** La peor de sus almacenes. */
  severidad: SeveridadAlerta;
}

export interface AlertasFiltros {
  q: string;
  /** "todos" o el id del almacén. */
  almacenId: string;
  /** "todos" | "sin-pedir" | "pedidos" */
  enSolicitud: "todos" | "sin-pedir" | "pedidos";
}

export const DEFAULT_ALERTAS_PAGE_SIZE = 20;

/**
 * El backend ya solo devuelve filas en o bajo el mínimo (y nunca con mínimo
 * 0), así que aquí "bajo" significa "justo en el mínimo".
 */
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
 * Agrupa por material las filas que el backend devuelve por almacén.
 *
 * El mínimo es POR ALMACÉN. Antes se sumaba el stock de los almacenes en
 * alerta y se comparaba con un único mínimo, lo que mezclaba las dos cosas:
 * un material con 20 de mínimo y 12 en cada uno de dos almacenes salía "sin
 * déficit" (24 ≥ 20). Ahora cada almacén aporta su propio déficit.
 */
function agrupar(
  almacenes: AlmacenConMaterialesBajos[],
  almacenId: string,
): MaterialBajoMinimoAgregado[] {
  const map = new Map<string, MaterialBajoMinimoAgregado>();
  for (const a of almacenes) {
    if (almacenId !== "todos" && a.almacen_id !== almacenId) continue;
    for (const m of a.materiales) {
      const entrada: AlmacenEnAlerta = {
        almacen_id: a.almacen_id,
        almacen_nombre: a.almacen?.nombre ?? a.almacen_id,
        cantidad_actual: m.cantidad_actual,
        deficit: Math.max(0, m.stockaje_minimo - m.cantidad_actual),
        severidad: severidadDe(m.cantidad_actual, m.stockaje_minimo),
      };
      const existing = map.get(m.material_id);
      if (existing) {
        existing.almacenes.push(entrada);
      } else {
        map.set(m.material_id, {
          ...m,
          foto_disponible:
            (m as MaterialBajoMinimo & { foto_disponible?: boolean | null })
              .foto_disponible ?? null,
          almacenes: [entrada],
          deficit_total: 0,
          ignorada: false,
          sin_alerta_actual: false,
          solicitudes_activas: [],
          severidad: "critico",
        });
      }
    }
  }
  for (const item of map.values()) {
    item.almacenes.sort((x, y) => y.deficit - x.deficit);
    item.deficit_total = item.almacenes.reduce((acc, x) => acc + x.deficit, 0);
    item.severidad = item.almacenes.reduce<SeveridadAlerta>(
      (peor, x) =>
        RANK_SEVERIDAD[x.severidad] < RANK_SEVERIDAD[peor] ? x.severidad : peor,
      "ok",
    );
  }
  return Array.from(map.values());
}

/** Fila de «Ver ignoradas» para un material silenciado que hoy no está en alerta. */
function filaSinAlerta(a: AlertaStockIgnorada): MaterialBajoMinimoAgregado {
  return {
    material_id: a.material_id,
    codigo: a.material_codigo ?? a.material_id,
    nombre: a.material_nombre ?? a.material_codigo ?? a.material_id,
    descripcion: "",
    categoria: "",
    um: "",
    foto: null,
    cantidad_actual: 0,
    stockaje_minimo: 0,
    diferencia: 0,
    ubicacion_en_almacen: null,
    foto_disponible: null,
    almacenes: [],
    deficit_total: 0,
    ignorada: true,
    sin_alerta_actual: true,
    solicitudes_activas: [],
    severidad: "ok",
  };
}

/** Bajo mínimo → en el mínimo → resto; dentro de cada tramo, mayor déficit. */
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

/** Cada palabra tiene que aparecer (sin importar tildes ni el orden). */
function coincide(m: MaterialBajoMinimoAgregado, palabras: string[]): boolean {
  if (palabras.length === 0) return true;
  const texto = normalizeSearchText(`${m.codigo} ${m.nombre} ${m.descripcion ?? ""}`);
  return palabras.every((p) => texto.includes(p));
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
        // Con las ignoradas incluidas: sin ellas «Ver ignoradas» no puede
        // mostrar su stock. El filtro de abajo las separa.
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

  const todosMateriales = useMemo<MaterialBajoMinimoAgregado[]>(() => {
    const ignoradasIds = new Set(ignoradas.map((a) => a.material_id));
    return agrupar(almacenesRaw, filtros.almacenId).map((m) => ({
      ...m,
      ignorada: ignoradasIds.has(m.material_id),
      solicitudes_activas: enSolicitudMap[m.material_id] ?? [],
    }));
  }, [almacenesRaw, ignoradas, enSolicitudMap, filtros.almacenId]);

  const filtrados = useMemo(() => {
    const palabras = normalizeSearchText(filtros.q).split(/\s+/).filter(Boolean);
    let base = todosMateriales.filter((m) =>
      verIgnoradas ? m.ignorada : !m.ignorada,
    );
    if (verIgnoradas && filtros.almacenId === "todos") {
      // Las silenciadas que hoy no están bajo mínimo no vienen en la fuente de
      // alertas; sin esto el botón decía "Ver ignoradas (1)" y la lista salía
      // vacía, sin forma de reactivarlas.
      const conAlerta = new Set(base.map((m) => m.material_id));
      base = base.concat(
        ignoradas.filter((a) => !conAlerta.has(a.material_id)).map(filaSinAlerta),
      );
    }
    base = base.filter((m) => {
      if (filtros.enSolicitud === "sin-pedir" && m.solicitudes_activas.length > 0)
        return false;
      if (filtros.enSolicitud === "pedidos" && m.solicitudes_activas.length === 0)
        return false;
      return coincide(m, palabras);
    });
    return ordenarPorSeveridad(base);
  }, [
    todosMateriales,
    ignoradas,
    verIgnoradas,
    filtros.q,
    filtros.enSolicitud,
    filtros.almacenId,
  ]);

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
