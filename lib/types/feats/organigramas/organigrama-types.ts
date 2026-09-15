/**
 * Organigrama por área. Es un árbol de cajas:
 *   - la raíz es el cargo de dirección ("DIRECTORA DE VENTAS", con sus plazas);
 *   - cada hijo es un área o departamento (caja verde);
 *   - cada caja tiene su lista de cargos con las plazas de cada uno.
 */

/** Con subáreas, los cargos cuelgan del tronco como apoyo, a este lado. */
export type LadoCargo = "derecha" | "izquierda";

export interface CargoOrganigrama {
  id: string;
  nombre: string;
  cantidad: number;
  lado: LadoCargo;
}

export interface NodoOrganigrama {
  id: string;
  nombre: string;
  /** Plazas del cargo que nombra la propia caja. Se usa en la raíz. */
  cantidad: number | null;
  /** Unidades iguales con la misma plantilla (p. ej. 3 tiendas). */
  unidades: number;
  cargos: CargoOrganigrama[];
  hijos: NodoOrganigrama[];
}

export interface Organigrama {
  id: string;
  nombre: string;
  descripcion: string | null;
  raiz: NodoOrganigrama;
  creado_en: string | null;
  actualizado_en: string | null;
  creado_por: string | null;
  actualizado_por: string | null;
}

export interface OrganigramaUpsertRequest {
  nombre: string;
  descripcion?: string | null;
  /** Al crear es opcional: el backend arranca con la caja de dirección. */
  raiz?: NodoOrganigrama;
}
