import { useCallback, useEffect, useMemo, useState } from "react";
import { EquipoComercialService } from "@/lib/services/feats/distribucion-comerciales/equipo-comercial-service";
import type { EquipoComercial } from "@/lib/types/feats/distribucion-comerciales/distribucion-types";

const CACHE_TTL_MS = 5 * 60 * 1000;

let cache: { at: number; equipos: EquipoComercial[] } | null = null;
let inFlight: Promise<EquipoComercial[]> | null = null;

async function fetchEquiposConCache(): Promise<EquipoComercial[]> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.equipos;
  if (inFlight) return inFlight;
  inFlight = EquipoComercialService.getEquipos(false)
    .then((equipos) => {
      cache = { at: Date.now(), equipos };
      return equipos;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export type FiltroEquipoComercial = "todos" | string; // "todos" | equipo.id

/**
 * Mapa comercial (nombre) → equipo comercial, para poder filtrar Leads y
 * Clientes por equipo (B2B / B2C) y mostrar la etiqueta en la tabla.
 * Se apoya en /equipos-comerciales/, la misma fuente que usa el módulo
 * Distribución de Comerciales.
 */
export function useComercialEquipoMap() {
  const [equipos, setEquipos] = useState<EquipoComercial[]>(cache?.equipos ?? []);
  const [loading, setLoading] = useState(!cache);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchEquiposConCache();
      setEquipos(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!cache) void reload();
  }, [reload]);

  const equiposActivos = useMemo(
    () => equipos.filter((e) => e.activo),
    [equipos],
  );

  /** nombre del comercial (tal cual se guarda en lead.comercial / cliente.comercial) → nombre del equipo */
  const equipoPorComercial = useMemo(() => {
    const map = new Map<string, { id: string; nombre: string }>();
    for (const equipo of equiposActivos) {
      for (const integrante of equipo.integrantes) {
        map.set(integrante.nombre, { id: equipo.id, nombre: equipo.nombre });
      }
    }
    return map;
  }, [equiposActivos]);

  const nombreEquipo = useCallback(
    (comercial?: string | null): string | null => {
      if (!comercial) return null;
      return equipoPorComercial.get(comercial)?.nombre ?? null;
    },
    [equipoPorComercial],
  );

  /** Comerciales (nombres) que integran un equipo dado, para armar el filtro backend. */
  const comercialesDeEquipo = useCallback(
    (equipoId: string): string[] => {
      const equipo = equiposActivos.find((e) => e.id === equipoId);
      return equipo ? equipo.integrantes.map((i) => i.nombre) : [];
    },
    [equiposActivos],
  );

  return {
    equipos: equiposActivos,
    loading,
    equipoPorComercial,
    nombreEquipo,
    comercialesDeEquipo,
  };
}
