import jsPDF from "jspdf";
import type {
  CargoOrganigrama,
  NodoOrganigrama,
} from "@/lib/types/feats/organigramas/organigrama-types";

/**
 * Motor de diagramado del organigrama.
 *
 * Convierte el árbol en una lista de primitivas ya posicionadas (líneas,
 * cajas, números e insignias) en puntos tipográficos. La vista previa SVG y
 * el PDF dibujan exactamente esa lista, así que lo que se ve al editar es lo
 * que sale en el PDF.
 *
 * Reglas, calcadas de los organigramas de RRHH:
 *   - Área sin subáreas: la caja y, debajo, sus cargos en lista con una línea
 *     a la izquierda y las plazas delante de cada cargo.
 *   - Área con subáreas: los cargos cuelgan del tronco como apoyo (a la
 *     derecha o a la izquierda) y las subáreas van en fila debajo.
 *   - Unidades > 1 (Tiendas 1·2·3): insignias numeradas bajo la caja.
 */

export type Medidor = (texto: string, tamano: number) => number;

export interface LineaOrganigrama {
  tipo: "linea";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface CajaOrganigrama {
  tipo: "caja";
  variante: "raiz" | "area" | "cargo";
  x: number;
  y: number;
  w: number;
  h: number;
  radio: number;
  texto: string;
  tamano: number;
  /** El nombre está vacío y se muestra un texto de relleno. */
  vacio: boolean;
  nodoId: string;
  cargoId?: string;
}

export interface NumeroOrganigrama {
  tipo: "numero";
  x: number;
  /** Centro vertical del texto. */
  y: number;
  texto: string;
  tamano: number;
  alinear: "left" | "right";
}

export interface InsigniaOrganigrama {
  tipo: "insignia";
  x: number;
  y: number;
  w: number;
  h: number;
  texto: string;
  tamano: number;
}

export type ElementoOrganigrama =
  | LineaOrganigrama
  | CajaOrganigrama
  | NumeroOrganigrama
  | InsigniaOrganigrama;

export interface LayoutOrganigrama {
  ancho: number;
  alto: number;
  elementos: ElementoOrganigrama[];
}

export const COLORES_ORGANIGRAMA = {
  raiz: "#2E5E1E",
  area: "#437A10",
  cargoFondo: "#FFFFFF",
  cargoBorde: "#3B6B1B",
  cargoTexto: "#2E5E1E",
  textoCaja: "#FFFFFF",
  linea: "#C7CDD6",
  numero: "#111111",
  insignia: "#2E5E1E",
  vacio: "#9CA3AF",
  seleccion: "#F59E0B",
} as const;

export const GROSOR_LINEA = 2.4;
export const GROSOR_BORDE_CARGO = 0.8;

const M = {
  margen: 16,
  raiz: { h: 30, tamano: 11.5, padX: 22, minW: 200, radio: 9 },
  area: { h: 25, tamano: 9.5, padX: 18, minW: 150, radio: 8 },
  cargo: { h: 18, tamano: 6.8, padX: 14, minW: 120, minWLado: 150, separacion: 5 },
  numero: { tamano: 11, tamanoRaiz: 13, separacion: 6 },
  lista: { sangria: 10, tick: 6, antes: 9, trasNumero: 4 },
  lado: { brazo: 20, tick: 12, antes: 10 },
  hermanos: 26,
  bus: { antes: 16, caida: 14, unico: 22 },
  insignias: { diametro: 16, fila: 26, paso: 44, max: 6, tamano: 6.5 },
};

const TAMANO_MAXIMO_CACHE = 4000;
const cacheMedidas = new Map<string, number>();
let docMedicion: jsPDF | null = null;

/** Mide con las métricas de Helvetica Bold de jsPDF, las mismas del PDF. */
export const medirTextoPdf: Medidor = (texto, tamano) => {
  const clave = `${tamano}|${texto}`;
  const guardada = cacheMedidas.get(clave);
  if (guardada !== undefined) return guardada;

  let ancho: number;
  try {
    if (!docMedicion) {
      docMedicion = new jsPDF({ unit: "pt" });
      docMedicion.setFont("helvetica", "bold");
    }
    docMedicion.setFontSize(tamano);
    ancho = docMedicion.getTextWidth(texto);
  } catch {
    ancho = texto.length * tamano * 0.62;
  }

  if (cacheMedidas.size > TAMANO_MAXIMO_CACHE) cacheMedidas.clear();
  cacheMedidas.set(clave, ancho);
  return ancho;
};

const mayusculas = (texto: string) => texto.trim().toLocaleUpperCase("es-ES");

const linea = (x1: number, y1: number, x2: number, y2: number): LineaOrganigrama => ({
  tipo: "linea",
  x1,
  y1,
  x2,
  y2,
});

function trasladar(el: ElementoOrganigrama, dx: number, dy: number): ElementoOrganigrama {
  if (el.tipo === "linea") {
    return { ...el, x1: el.x1 + dx, y1: el.y1 + dy, x2: el.x2 + dx, y2: el.y2 + dy };
  }
  return { ...el, x: el.x + dx, y: el.y + dy };
}

interface Bloque {
  ancho: number;
  alto: number;
  /** X del centro de la caja principal, desde el borde izquierdo del bloque. */
  ancla: number;
  elementos: ElementoOrganigrama[];
}

/** Capas de dibujo: las líneas quedan siempre por debajo de cajas y textos. */
interface Capas {
  lineas: ElementoOrganigrama[];
  cajas: ElementoOrganigrama[];
  textos: ElementoOrganigrama[];
}

const capasVacias = (): Capas => ({ lineas: [], cajas: [], textos: [] });

function medirCajaPrincipal(nodo: NodoOrganigrama, esRaiz: boolean, medir: Medidor) {
  const estilo = esRaiz ? M.raiz : M.area;
  const nombre = mayusculas(nodo.nombre);
  const texto = nombre || (esRaiz ? "CARGO PRINCIPAL" : "ÁREA SIN NOMBRE");
  const w = Math.max(estilo.minW, medir(texto, estilo.tamano) + estilo.padX * 2);
  const numero = nodo.cantidad !== null ? String(nodo.cantidad) : null;
  const tamanoNumero = esRaiz ? M.numero.tamanoRaiz : M.numero.tamano;
  const anchoNumero = numero
    ? M.numero.separacion * 1.5 + medir(numero, tamanoNumero)
    : 0;
  return { estilo, texto, vacio: !nombre, w, h: estilo.h, numero, tamanoNumero, anchoNumero };
}

function dibujarCajaPrincipal(
  nodo: NodoOrganigrama,
  esRaiz: boolean,
  caja: ReturnType<typeof medirCajaPrincipal>,
  x: number,
  capas: Capas,
) {
  capas.cajas.push({
    tipo: "caja",
    variante: esRaiz ? "raiz" : "area",
    x,
    y: 0,
    w: caja.w,
    h: caja.h,
    radio: caja.estilo.radio,
    texto: caja.texto,
    tamano: caja.estilo.tamano,
    vacio: caja.vacio,
    nodoId: nodo.id,
  });
  if (caja.numero) {
    capas.textos.push({
      tipo: "numero",
      x: x + caja.w + M.numero.separacion * 1.5,
      y: caja.h / 2,
      texto: caja.numero,
      tamano: caja.tamanoNumero,
      alinear: "left",
    });
  }
}

function medirCargos(cargos: CargoOrganigrama[], minW: number, medir: Medidor) {
  let anchoPildora = minW;
  let anchoNumero = 0;
  for (const cargo of cargos) {
    const texto = mayusculas(cargo.nombre) || "CARGO SIN NOMBRE";
    anchoPildora = Math.max(anchoPildora, medir(texto, M.cargo.tamano) + M.cargo.padX * 2);
    anchoNumero = Math.max(anchoNumero, medir(String(cargo.cantidad), M.numero.tamano));
  }
  const alto =
    cargos.length * M.cargo.h + Math.max(0, cargos.length - 1) * M.cargo.separacion;
  return { anchoPildora, anchoNumero, alto };
}

function pildora(
  nodo: NodoOrganigrama,
  cargo: CargoOrganigrama,
  x: number,
  y: number,
  w: number,
): CajaOrganigrama {
  const nombre = mayusculas(cargo.nombre);
  return {
    tipo: "caja",
    variante: "cargo",
    x,
    y,
    w,
    h: M.cargo.h,
    radio: M.cargo.h / 2,
    texto: nombre || "CARGO SIN NOMBRE",
    tamano: M.cargo.tamano,
    vacio: !nombre,
    nodoId: nodo.id,
    cargoId: cargo.id,
  };
}

/** Insignias de unidades bajo la caja. Siempre caben dentro de su ancho. */
function dibujarInsignias(
  nodo: NodoOrganigrama,
  anchoCaja: number,
  ancla: number,
  yBaseCaja: number,
  capas: Capas,
  medir: Medidor,
): { alto: number; cy: number; xDer: number } | null {
  const n = nodo.unidades;
  if (!n || n <= 1) return null;

  const d = M.insignias.diametro;
  const cy = yBaseCaja + M.insignias.fila / 2;

  if (n > M.insignias.max) {
    const texto = `${n} UNIDADES`;
    const w = medir(texto, M.insignias.tamano) + 16;
    capas.textos.push({
      tipo: "insignia",
      x: ancla - w / 2,
      y: cy - d / 2,
      w,
      h: d,
      texto,
      tamano: M.insignias.tamano,
    });
    return { alto: M.insignias.fila, cy, xDer: ancla + w / 2 };
  }

  const paso = Math.min(M.insignias.paso, (anchoCaja - 24) / (n - 1));
  const inicio = ancla - (paso * (n - 1)) / 2;
  const fin = ancla + (paso * (n - 1)) / 2;
  capas.lineas.push(linea(inicio, cy, fin, cy));
  for (let i = 0; i < n; i++) {
    capas.textos.push({
      tipo: "insignia",
      x: inicio + i * paso - d / 2,
      y: cy - d / 2,
      w: d,
      h: d,
      texto: String(i + 1),
      tamano: M.insignias.tamano,
    });
  }
  return { alto: M.insignias.fila, cy, xDer: fin };
}

function bloqueSinSubareas(nodo: NodoOrganigrama, esRaiz: boolean, medir: Medidor): Bloque {
  const capas = capasVacias();
  const caja = medirCajaPrincipal(nodo, esRaiz, medir);
  const ancla = caja.w / 2;
  dibujarCajaPrincipal(nodo, esRaiz, caja, 0, capas);

  let y = caja.h;
  let ancho = caja.w + caja.anchoNumero;
  const insignias = dibujarInsignias(nodo, caja.w, ancla, y, capas, medir);
  if (insignias) y += insignias.alto;

  if (nodo.cargos.length) {
    const grupo = medirCargos(nodo.cargos, M.cargo.minW, medir);
    const lineaX = M.lista.sangria;
    const bordeNumero = lineaX + M.lista.tick + 2 + grupo.anchoNumero;
    const xPildora = bordeNumero + M.lista.trasNumero;

    let fila = y + M.lista.antes;
    let ultimoCentro = fila + M.cargo.h / 2;
    for (const cargo of nodo.cargos) {
      const cy = fila + M.cargo.h / 2;
      const numero = String(cargo.cantidad);
      const inicioNumero = bordeNumero - medir(numero, M.numero.tamano);
      capas.lineas.push(linea(lineaX, cy, inicioNumero - 1.5, cy));
      capas.textos.push({
        tipo: "numero",
        x: bordeNumero,
        y: cy,
        texto: numero,
        tamano: M.numero.tamano,
        alinear: "right",
      });
      capas.cajas.push(pildora(nodo, cargo, xPildora, fila, grupo.anchoPildora));
      ultimoCentro = cy;
      fila += M.cargo.h + M.cargo.separacion;
    }

    capas.lineas.push(linea(lineaX, caja.h, lineaX, ultimoCentro));
    if (insignias) capas.lineas.push(linea(lineaX, insignias.cy, insignias.xDer, insignias.cy));
    y = fila - M.cargo.separacion;
    ancho = Math.max(ancho, xPildora + grupo.anchoPildora);
  } else if (insignias) {
    capas.lineas.push(linea(ancla, caja.h, ancla, insignias.cy));
  }

  return {
    ancho,
    alto: y,
    ancla,
    elementos: [...capas.lineas, ...capas.cajas, ...capas.textos],
  };
}

function dibujarCargosLaterales(
  nodo: NodoOrganigrama,
  cargos: CargoOrganigrama[],
  grupo: ReturnType<typeof medirCargos>,
  tronco: number,
  arriba: number,
  sentido: 1 | -1,
  capas: Capas,
) {
  const brazoX = tronco + sentido * M.lado.brazo;
  const centros = cargos.map(
    (_, i) => arriba + i * (M.cargo.h + M.cargo.separacion) + M.cargo.h / 2,
  );
  const primero = centros[0];
  const ultimo = centros[centros.length - 1];

  capas.lineas.push(linea(tronco, (primero + ultimo) / 2, brazoX, (primero + ultimo) / 2));
  if (cargos.length > 1) capas.lineas.push(linea(brazoX, primero, brazoX, ultimo));

  cargos.forEach((cargo, i) => {
    const cy = centros[i];
    const xPildora =
      sentido > 0 ? brazoX + M.lado.tick : brazoX - M.lado.tick - grupo.anchoPildora;
    capas.lineas.push(
      linea(brazoX, cy, sentido > 0 ? xPildora : xPildora + grupo.anchoPildora, cy),
    );
    capas.cajas.push(pildora(nodo, cargo, xPildora, cy - M.cargo.h / 2, grupo.anchoPildora));
    capas.textos.push({
      tipo: "numero",
      x:
        sentido > 0
          ? xPildora + grupo.anchoPildora + M.numero.separacion
          : xPildora - M.numero.separacion,
      y: cy,
      texto: String(cargo.cantidad),
      tamano: M.numero.tamano,
      alinear: sentido > 0 ? "left" : "right",
    });
  });
}

function bloqueConSubareas(nodo: NodoOrganigrama, esRaiz: boolean, medir: Medidor): Bloque {
  const hijos = nodo.hijos.map((hijo) => bloque(hijo, false, medir));
  const desplazamientos: number[] = [];
  let cursor = 0;
  for (const hijo of hijos) {
    desplazamientos.push(cursor);
    cursor += hijo.ancho + M.hermanos;
  }
  const anchoHijos = cursor - M.hermanos;
  const primeraAncla = desplazamientos[0] + hijos[0].ancla;
  const ultimaAncla = desplazamientos[hijos.length - 1] + hijos[hijos.length - 1].ancla;
  const troncoEnHijos = (primeraAncla + ultimaAncla) / 2;

  const caja = medirCajaPrincipal(nodo, esRaiz, medir);
  const derecha = nodo.cargos.filter((c) => c.lado !== "izquierda");
  const izquierda = nodo.cargos.filter((c) => c.lado === "izquierda");
  const grupoDer = derecha.length ? medirCargos(derecha, M.cargo.minWLado, medir) : null;
  const grupoIzq = izquierda.length ? medirCargos(izquierda, M.cargo.minWLado, medir) : null;
  const extensionGrupo = (grupo: ReturnType<typeof medirCargos> | null) =>
    grupo
      ? M.lado.brazo + M.lado.tick + grupo.anchoPildora + M.numero.separacion + grupo.anchoNumero
      : 0;

  const extIzq = Math.max(troncoEnHijos, caja.w / 2, extensionGrupo(grupoIzq));
  const extDer = Math.max(
    anchoHijos - troncoEnHijos,
    caja.w / 2 + caja.anchoNumero,
    extensionGrupo(grupoDer),
  );
  const ancla = extIzq;
  const dxHijos = ancla - troncoEnHijos;

  const capas = capasVacias();
  dibujarCajaPrincipal(nodo, esRaiz, caja, ancla - caja.w / 2, capas);

  let y = caja.h;
  const insignias = dibujarInsignias(nodo, caja.w, ancla, y, capas, medir);
  if (insignias) y += insignias.alto;

  if (grupoDer || grupoIzq) {
    y += M.lado.antes;
    if (grupoDer) dibujarCargosLaterales(nodo, derecha, grupoDer, ancla, y, 1, capas);
    if (grupoIzq) dibujarCargosLaterales(nodo, izquierda, grupoIzq, ancla, y, -1, capas);
    y += Math.max(grupoDer?.alto ?? 0, grupoIzq?.alto ?? 0);
  }

  const unico = hijos.length === 1;
  const yBus = y + M.bus.antes;
  const arribaHijos = unico ? y + M.bus.unico : yBus + M.bus.caida;

  capas.lineas.push(linea(ancla, caja.h, ancla, unico ? arribaHijos : yBus));
  if (!unico) {
    capas.lineas.push(linea(dxHijos + primeraAncla, yBus, dxHijos + ultimaAncla, yBus));
    hijos.forEach((hijo, i) => {
      const x = dxHijos + desplazamientos[i] + hijo.ancla;
      capas.lineas.push(linea(x, yBus, x, arribaHijos));
    });
  }

  const elementosHijos = hijos.flatMap((hijo, i) =>
    hijo.elementos.map((el) => trasladar(el, dxHijos + desplazamientos[i], arribaHijos)),
  );

  return {
    ancho: extIzq + extDer,
    alto: arribaHijos + Math.max(...hijos.map((h) => h.alto)),
    ancla,
    elementos: [...capas.lineas, ...elementosHijos, ...capas.cajas, ...capas.textos],
  };
}

function bloque(nodo: NodoOrganigrama, esRaiz: boolean, medir: Medidor): Bloque {
  return nodo.hijos.length
    ? bloqueConSubareas(nodo, esRaiz, medir)
    : bloqueSinSubareas(nodo, esRaiz, medir);
}

export function calcularLayoutOrganigrama(
  raiz: NodoOrganigrama,
  medir: Medidor = medirTextoPdf,
): LayoutOrganigrama {
  const b = bloque(raiz, true, medir);
  const m = M.margen;
  return {
    ancho: b.ancho + m * 2,
    alto: b.alto + m * 2,
    elementos: b.elementos.map((el) => trasladar(el, m, m)),
  };
}
