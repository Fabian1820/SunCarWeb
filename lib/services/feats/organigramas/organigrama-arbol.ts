/* eslint-disable @typescript-eslint/no-explicit-any */

import type {
  CargoOrganigrama,
  NodoOrganigrama,
} from "@/lib/types/feats/organigramas/organigrama-types";

/**
 * Operaciones puras sobre el árbol del organigrama. Todas devuelven un árbol
 * nuevo y conservan las ramas que no cambian, para que React y el historial de
 * deshacer puedan comparar por referencia.
 */

/** Los ids solo tienen que ser únicos dentro de un mismo organigrama. */
export function nuevoIdOrganigrama(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function nuevoCargo(): CargoOrganigrama {
  return { id: nuevoIdOrganigrama(), nombre: "", cantidad: 1, lado: "derecha" };
}

export function nuevaArea(): NodoOrganigrama {
  return {
    id: nuevoIdOrganigrama(),
    nombre: "",
    cantidad: null,
    unidades: 1,
    cargos: [],
    hijos: [],
  };
}

export function entero(valor: unknown, min: number, max: number, defecto: number): number {
  const n = Math.trunc(Number(valor));
  if (!Number.isFinite(n)) return defecto;
  return Math.min(max, Math.max(min, n));
}

export function normalizarNodo(raw: any): NodoOrganigrama {
  return {
    id: String(raw?.id || nuevoIdOrganigrama()),
    nombre: String(raw?.nombre ?? ""),
    cantidad:
      raw?.cantidad === null || raw?.cantidad === undefined
        ? null
        : entero(raw.cantidad, 0, 9999, 0),
    unidades: entero(raw?.unidades, 1, 50, 1),
    cargos: Array.isArray(raw?.cargos)
      ? raw.cargos.map((c: any) => ({
          id: String(c?.id || nuevoIdOrganigrama()),
          nombre: String(c?.nombre ?? ""),
          cantidad: entero(c?.cantidad, 0, 9999, 1),
          lado: c?.lado === "izquierda" ? "izquierda" : "derecha",
        }))
      : [],
    hijos: Array.isArray(raw?.hijos) ? raw.hijos.map(normalizarNodo) : [],
  };
}

/** Plazas de la caja, sus cargos y todo lo que cuelga de ella, por unidades. */
export function plazasDeNodo(nodo: NodoOrganigrama): number {
  const propias =
    (nodo.cantidad ?? 0) + nodo.cargos.reduce((suma, c) => suma + c.cantidad, 0);
  const deHijos = nodo.hijos.reduce((suma, h) => suma + plazasDeNodo(h), 0);
  return (propias + deHijos) * Math.max(1, nodo.unidades);
}

/** Áreas por debajo de la raíz, a cualquier nivel. */
export function contarAreas(nodo: NodoOrganigrama): number {
  return nodo.hijos.reduce((suma, h) => suma + 1 + contarAreas(h), 0);
}

/** Ids desde la raíz hasta el nodo `id`, ambos incluidos; null si no está. */
export function rutaHasta(raiz: NodoOrganigrama, id: string): string[] | null {
  if (raiz.id === id) return [raiz.id];
  for (const hijo of raiz.hijos) {
    const ruta = rutaHasta(hijo, id);
    if (ruta) return [raiz.id, ...ruta];
  }
  return null;
}

export function moverEnLista<T>(lista: T[], indice: number, delta: number): T[] {
  const destino = indice + delta;
  if (indice < 0 || destino < 0 || destino >= lista.length) return lista;
  const copia = [...lista];
  const [item] = copia.splice(indice, 1);
  copia.splice(destino, 0, item);
  return copia;
}

export function actualizarNodo(
  raiz: NodoOrganigrama,
  id: string,
  cambio: (nodo: NodoOrganigrama) => NodoOrganigrama,
): NodoOrganigrama {
  if (raiz.id === id) return cambio(raiz);
  let tocado = false;
  const hijos = raiz.hijos.map((hijo) => {
    const nuevo = actualizarNodo(hijo, id, cambio);
    if (nuevo !== hijo) tocado = true;
    return nuevo;
  });
  return tocado ? { ...raiz, hijos } : raiz;
}

/** Aplica `cambio` a la lista de hijos del nodo que contiene al hijo `id`. */
function actualizarPadreDe(
  raiz: NodoOrganigrama,
  id: string,
  cambio: (hijos: NodoOrganigrama[], indice: number) => NodoOrganigrama[],
): NodoOrganigrama {
  const indice = raiz.hijos.findIndex((h) => h.id === id);
  if (indice !== -1) return { ...raiz, hijos: cambio(raiz.hijos, indice) };
  let tocado = false;
  const hijos = raiz.hijos.map((hijo) => {
    const nuevo = actualizarPadreDe(hijo, id, cambio);
    if (nuevo !== hijo) tocado = true;
    return nuevo;
  });
  return tocado ? { ...raiz, hijos } : raiz;
}

export function eliminarNodo(raiz: NodoOrganigrama, id: string): NodoOrganigrama {
  return actualizarPadreDe(raiz, id, (hijos, indice) =>
    hijos.filter((_, i) => i !== indice),
  );
}

export function moverNodo(
  raiz: NodoOrganigrama,
  id: string,
  delta: number,
): NodoOrganigrama {
  return actualizarPadreDe(raiz, id, (hijos, indice) =>
    moverEnLista(hijos, indice, delta),
  );
}
