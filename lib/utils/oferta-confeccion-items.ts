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

export type TipoComponentePrincipal = "inversor" | "bateria" | "panel";

export type ComponentePrincipal = {
  tipo: TipoComponentePrincipal;
  codigo: string;
  descripcion: string | null;
};

/** Los tres componentes que pueden dar la letra de marca del código de cliente,
 *  en orden de prioridad, con la sección de los items donde vive cada uno. */
const COMPONENTES_PRINCIPALES = [
  { tipo: "inversor", seccion: "INVERSORES" },
  { tipo: "bateria", seccion: "BATERIAS" },
  { tipo: "panel", seccion: "PANELES" },
] as const;

/**
 * Mismo criterio que el backend al generar el código de cliente: inversor >
 * batería > panel, tomados de componentes_principales y, si la oferta no los
 * trae marcados, deducidos de los items por sección.
 *
 * Sirve para que el checklist de "Convertir lead a cliente" compruebe lo mismo
 * que valida el backend, en vez de decir "todo listo" y fallar después.
 */
export function resolverComponentePrincipal(
  oc: OfertaConfeccionResumen | null | undefined,
): ComponentePrincipal | null {
  if (!oc) return null;
  const items = oc.items ?? [];
  const cp = oc.componentes_principales ?? {};
  const marcados: Record<TipoComponentePrincipal, string | null | undefined> = {
    inversor: cp.inversor_seleccionado,
    bateria: cp.bateria_seleccionada,
    panel: cp.panel_seleccionado,
  };

  const describir = (codigo: string): string | null =>
    items.find(
      (it) => it.material_codigo != null && String(it.material_codigo) === codigo,
    )?.descripcion ?? null;

  for (const { tipo } of COMPONENTES_PRINCIPALES) {
    const codigo = String(marcados[tipo] ?? "").trim();
    if (codigo) return { tipo, codigo, descripcion: describir(codigo) };
  }

  for (const { tipo, seccion } of COMPONENTES_PRINCIPALES) {
    const item = items.find(
      (it) =>
        (it.seccion != null && norm(it.seccion) === seccion) ||
        (it.categoria != null && norm(it.categoria) === seccion),
    );
    const codigo = String(item?.material_codigo ?? "").trim();
    if (codigo) return { tipo, codigo, descripcion: item?.descripcion ?? null };
  }

  return null;
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
