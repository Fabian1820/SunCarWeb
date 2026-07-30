import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ClienteService,
  type EquipoEnOferta,
} from "@/lib/services/feats/customer/cliente-service";

const CACHE_TTL_MS = 5 * 60 * 1000;

let cache: { at: number; equipos: EquipoEnOferta[] } | null = null;
let inFlight: Promise<EquipoEnOferta[]> | null = null;

async function fetchEquiposConCache(): Promise<EquipoEnOferta[]> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.equipos;
  if (inFlight) return inFlight;
  inFlight = ClienteService.getEquiposEnOfertas()
    .then((equipos) => {
      cache = { at: Date.now(), equipos };
      return equipos;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/**
 * Devuelve los materiales que aparecen en ofertas confirmadas por algún
 * cliente. Se usa para poblar el selector "equipo" del módulo Clientes:
 * solo se ofrecen los modelos realmente aceptados por un cliente, no
 * todo el catálogo.
 */
export function useEquiposEnOfertas() {
  const [equipos, setEquipos] = useState<EquipoEnOferta[]>(cache?.equipos ?? []);
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

  const porCategoria = useMemo(() => {
    const agrupado = new Map<string, EquipoEnOferta[]>();
    for (const eq of equipos) {
      if (!eq.categoria) continue;
      const lista = agrupado.get(eq.categoria) ?? [];
      lista.push(eq);
      agrupado.set(eq.categoria, lista);
    }
    return agrupado;
  }, [equipos]);

  return { equipos, porCategoria, loading, reload };
}
