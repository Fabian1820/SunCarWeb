/**
 * El mapa de Cuba de Planificación y cómo se ubica a cada cliente en él.
 *
 * El mapa lo genera scripts/generar-mapa-planificacion.py: ya viene
 * proyectado, en enteros y con la provincia de cada municipio. Los clientes
 * no tienen coordenadas, así que se ubican por el nombre del municipio.
 */

export interface MunicipioMapa {
  /** Nombre para mostrar. */
  n: string;
  /** Nombre normalizado. */
  k: string;
  /** Provincia, con su nombre para mostrar. */
  p: string;
  /** Punto donde va la etiqueta. */
  c: [number, number];
  /** Caja: minx, miny, maxx, maxy. */
  b: [number, number, number, number];
  /** Anillos como [x0, y0, x1, y1, ...]. */
  r: number[][];
  /** Único aunque el nombre se repita (San Luis está en dos provincias). */
  id: string;
  /** Clave de su provincia. */
  pk: string;
}

export interface ProvinciaMapa {
  n: string;
  k: string;
  c: [number, number];
  b: [number, number, number, number];
}

export interface MapaCuba {
  ancho: number;
  alto: number;
  provincias: ProvinciaMapa[];
  municipios: MunicipioMapa[];
  bordes: number[][];
}

export function claveZona(texto?: string | null): string {
  return (texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Formas en que aparecen escritos en la base de datos. */
const ALIAS_MUNICIPIO: Record<string, string> = {
  "habana del este": "la habana del este",
  "habana vieja": "la habana vieja",
  "plaza": "plaza de la revolucion",
  "10 de octubre": "diez de octubre",
  "cespedes": "carlos manuel de cespedes",
  "isla de pinos": "isla de la juventud",
  "isla juventud": "isla de la juventud",
  "la maya": "songo la maya",
  "songo": "songo la maya",
};

const ALIAS_PROVINCIA: Record<string, string> = {
  "habana": "la habana",
  "ciudad habana": "la habana",
  "ciudad de la habana": "la habana",
  "isla de pinos": "isla de la juventud",
};

let promesa: Promise<MapaCuba> | null = null;

export function cargarMapa(): Promise<MapaCuba> {
  if (!promesa) {
    promesa = fetch("/data/planificacion-cuba.json")
      .then((r) => {
        if (!r.ok) throw new Error(`Mapa: ${r.status}`);
        return r.json();
      })
      .then((datos: MapaCuba) => {
        const provPorNombre = new Map(datos.provincias.map((p) => [p.n, p.k]));
        for (const m of datos.municipios) {
          m.pk = provPorNombre.get(m.p) ?? claveZona(m.p);
          m.id = `${m.pk}/${m.k}`;
        }
        return datos;
      })
      .catch((e) => {
        promesa = null;
        throw e;
      });
  }
  return promesa;
}

export interface Ubicacion {
  provincia?: ProvinciaMapa;
  municipio?: MunicipioMapa;
}

const indices = new WeakMap<
  MapaCuba,
  { municipios: Map<string, MunicipioMapa[]>; provincias: Map<string, ProvinciaMapa> }
>();

function indice(mapa: MapaCuba) {
  let i = indices.get(mapa);
  if (!i) {
    const municipios = new Map<string, MunicipioMapa[]>();
    for (const m of mapa.municipios) {
      municipios.set(m.k, [...(municipios.get(m.k) ?? []), m]);
    }
    i = { municipios, provincias: new Map(mapa.provincias.map((p) => [p.k, p])) };
    indices.set(mapa, i);
  }
  return i;
}

function buscarProvincia(texto: string | undefined, mapa: MapaCuba): ProvinciaMapa | undefined {
  const { provincias } = indice(mapa);
  // A veces viene "Boyeros, La Habana": se prueba cada trozo.
  for (const trozo of [texto ?? "", ...(texto ?? "").split(",")]) {
    const k = claveZona(trozo);
    const p = provincias.get(ALIAS_PROVINCIA[k] ?? k);
    if (p) return p;
  }
  return undefined;
}

/** Dónde cae un cliente o lead. Sin municipio reconocible, al menos la provincia. */
export function ubicar(
  c: { municipio?: string | null; provincia?: string | null },
  mapa: MapaCuba,
): Ubicacion {
  const { municipios, provincias } = indice(mapa);
  const provinciaEscrita = buscarProvincia(c.provincia ?? undefined, mapa);
  const k = claveZona(c.municipio);
  const opciones = municipios.get(ALIAS_MUNICIPIO[k] ?? k) ?? [];
  const municipio =
    opciones.length > 1 && provinciaEscrita
      ? opciones.find((m) => m.pk === provinciaEscrita.k) ?? opciones[0]
      : opciones[0];
  if (municipio) return { municipio, provincia: provincias.get(municipio.pk) };
  return { provincia: provinciaEscrita };
}

export function rutaSvg(anillos: number[][]): string {
  let d = "";
  for (const r of anillos) {
    d += `M${r[0]} ${r[1]}`;
    for (let i = 2; i < r.length; i += 2) d += `L${r[i]} ${r[i + 1]}`;
    d += "Z";
  }
  return d;
}
