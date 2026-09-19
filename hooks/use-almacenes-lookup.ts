"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { InventarioService } from "@/lib/api-services";
import type { Almacen } from "@/lib/types/feats/inventario/inventario-types";

/**
 * Lista de almacenes + resolución id → nombre. Existe para no mostrar el
 * ObjectId crudo del almacén en tablas y detalles, y para poder elegirlo en un
 * selector en vez de escribirlo a mano.
 */
export function useAlmacenesLookup() {
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await InventarioService.getAlmacenes();
      setAlmacenes(Array.isArray(data) ? data : []);
    } catch {
      // Sin almacenes el selector queda vacío y el detalle cae al id: no es
      // motivo para tumbar la pantalla entera.
      setAlmacenes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const porId = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of almacenes) {
      if (a.id) map.set(a.id, a.nombre);
    }
    return map;
  }, [almacenes]);

  const nombreDe = useCallback(
    (id?: string | null): string | null => {
      if (!id) return null;
      return porId.get(id) ?? id;
    },
    [porId],
  );

  return { almacenes, loading, nombreDe, reload: load };
}
