import type { ItemOfertaConfeccionResumen, OfertaConfeccionResumen } from "@/lib/types/feats/leads/lead-types";

type Componente = { cantidad: number; descripcion: string };

function norm(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
}

function findItem(
  items: ItemOfertaConfeccionResumen[],
  codigo: string | null | undefined,
  seccion: string,
): ItemOfertaConfeccionResumen | undefined {
  // 1. Por código con coerción a string (corrige mismatch numérico de MongoDB)
  if (codigo != null) {
    const byCode = items.find(
      (it) => it.material_codigo != null && String(it.material_codigo) === String(codigo),
    );
    if (byCode) return byCode;
  }
  // 2. Por sección normalizada sin tildes (BATERÍAS === BATERIAS)
  return items.find((it) => it.seccion != null && norm(it.seccion) === norm(seccion));
}

export function extraerComponentesDeOfertaConfeccion(
  oc: OfertaConfeccionResumen,
): { inv: Componente | null; bat: Componente | null; pan: Componente | null } {
  const items = oc.items ?? [];
  const cp = oc.componentes_principales ?? {};

  console.log("[oferta-confeccion] cp:", cp);
  console.log("[oferta-confeccion] items:", items.map(it => ({ codigo: it.material_codigo, seccion: it.seccion, desc: it.descripcion })));

  const raw = {
    inv: findItem(items, cp.inversor_seleccionado, "INVERSORES"),
    bat: findItem(items, cp.bateria_seleccionada, "BATERIAS"),
    pan: findItem(items, cp.panel_seleccionado, "PANELES"),
  };

  console.log("[oferta-confeccion] resultado:", { inv: raw.inv?.descripcion, bat: raw.bat?.descripcion, pan: raw.pan?.descripcion });

  return {
    inv: raw.inv ? { cantidad: raw.inv.cantidad, descripcion: raw.inv.descripcion } : null,
    bat: raw.bat ? { cantidad: raw.bat.cantidad, descripcion: raw.bat.descripcion } : null,
    pan: raw.pan ? { cantidad: raw.pan.cantidad, descripcion: raw.pan.descripcion } : null,
  };
}
