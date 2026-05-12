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
): { inv: Componente | null; bats: Componente[]; pan: Componente | null } {
  const items = oc.items ?? [];
  const cp = oc.componentes_principales ?? {};

  console.log("[bats] cp:", cp);
  console.log("[bats] items:", items.map(it => ({ codigo: it.material_codigo, seccion: it.seccion, categoria: it.categoria, desc: it.descripcion })));

  const rawInv = findItem(items, cp.inversor_seleccionado, "INVERSORES");
  const rawPan = findItem(items, cp.panel_seleccionado, "PANELES");

  // Todas las baterías: por sección, por categoria, o por código principal como último recurso
  const codigoPrincipal = cp.bateria_seleccionada != null ? String(cp.bateria_seleccionada) : null;
  const rawBats = items.filter((it) => {
    if (it.seccion && norm(it.seccion) === "BATERIAS") return true;
    if (it.categoria && norm(it.categoria) === "BATERIAS") return true;
    return false;
  });

  // Si no encontramos nada por sección/categoria, caer en el findItem original como último recurso
  const batsFinales =
    rawBats.length > 0
      ? rawBats
      : [findItem(items, cp.bateria_seleccionada, "BATERIAS")].filter(Boolean) as ItemOfertaConfeccionResumen[];

  return {
    inv: rawInv ? { cantidad: rawInv.cantidad, descripcion: rawInv.descripcion } : null,
    bats: batsFinales.map((b) => ({ cantidad: b.cantidad, descripcion: b.descripcion })),
    pan: rawPan ? { cantidad: rawPan.cantidad, descripcion: rawPan.descripcion } : null,
  };
}
