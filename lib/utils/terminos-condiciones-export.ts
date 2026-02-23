export interface TerminosCondicionesPayload {
  id?: string;
  activo?: boolean;
  texto?: string | null;
  titulo?: string | null;
  formas_pago?: string | null;
  formasPago?: string | null;
  reserva_equipos?: string | null;
  reservaEquipos?: string | null;
  garantia?: string | null;
  garantía?: string | null;
  validez_presupuesto?: string | null;
  validezPresupuesto?: string | null;
  secciones?: {
    titulo?: string | null;
    formas_pago?: string | null;
    reserva_equipos?: string | null;
    garantia?: string | null;
    validez_presupuesto?: string | null;
    formasPago?: string | null;
    reservaEquipos?: string | null;
    validezPresupuesto?: string | null;
  } | null;
}

const normalizarTexto = (value?: string | null): string => (value || "").trim();

const escaparHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const textoPlanoAHtml = (value: string): string =>
  escaparHtml(value).replace(/\n/g, "<br>");

const limpiarContenidoSeccion = (
  value: string,
  etiquetaRegex: string,
): string => {
  if (!value) return "";

  let limpio = value;

  // Caso combinado: "2. Formas de pago: ..."
  const regexCombinado = new RegExp(
    `^\\s*[2-5]\\s*[\\.\\)\\-:]?\\s*${etiquetaRegex}\\s*:?\\s*`,
    "i",
  );
  limpio = limpio.replace(regexCombinado, "");

  // Quitar prefijo numerado al inicio (2., 3., 4., 5.)
  limpio = limpio.replace(/^\s*[2-5]\s*[\.\)\-:]?\s*/, "");

  // Quitar encabezado repetido de la sección
  const regexEtiqueta = new RegExp(`^\\s*${etiquetaRegex}\\s*:?\\s*`, "i");
  limpio = limpio.replace(regexEtiqueta, "");

  return limpio.trim();
};

const resolverCampo = (
  payload: TerminosCondicionesPayload,
  keys: string[],
): string => {
  for (const key of keys) {
    const valueDirecto = (payload as Record<string, unknown>)[key];
    if (typeof valueDirecto === "string" && valueDirecto.trim())
      return valueDirecto.trim();

    const secciones = payload.secciones as
      | Record<string, unknown>
      | null
      | undefined;
    const valueSeccion = secciones?.[key];
    if (typeof valueSeccion === "string" && valueSeccion.trim())
      return valueSeccion.trim();
  }
  return "";
};

export function buildTerminosCondicionesHtml(
  payload?: TerminosCondicionesPayload | null,
): string | null {
  if (!payload) return null;

  const titulo = resolverCampo(payload, ["titulo"]);
  const formasPago = resolverCampo(payload, ["formas_pago", "formasPago"]);
  const reservaEquipos = resolverCampo(payload, [
    "reserva_equipos",
    "reservaEquipos",
  ]);
  const garantia = resolverCampo(payload, ["garantia", "garantía"]);
  const validezPresupuesto = resolverCampo(payload, [
    "validez_presupuesto",
    "validezPresupuesto",
  ]);

  const tieneEstructura =
    "titulo" in payload ||
    "formas_pago" in payload ||
    "formasPago" in payload ||
    "reserva_equipos" in payload ||
    "reservaEquipos" in payload ||
    "garantia" in payload ||
    "garantía" in payload ||
    "validez_presupuesto" in payload ||
    "validezPresupuesto" in payload ||
    !!payload.secciones;

  const secciones = [
    {
      label: "FORMAS DE PAGO",
      value: limpiarContenidoSeccion(formasPago, "formas?\\s+de\\s+pago"),
    },
    {
      label: "RESERVA DE EQUIPOS",
      value: limpiarContenidoSeccion(
        reservaEquipos,
        "reserva\\s+de\\s+equipos?",
      ),
    },
    {
      label: "GARANTÍA",
      value: limpiarContenidoSeccion(garantia, "garant[ií]a"),
    },
    {
      label: "VALIDEZ DEL PRESUPUESTO",
      value: limpiarContenidoSeccion(
        validezPresupuesto,
        "validez\\s+del?\\s+presupuesto",
      ),
    },
  ].filter((section) => section.value);

  if (tieneEstructura) {
    const partes: string[] = [];

    if (titulo) {
      partes.push(`<h3>${textoPlanoAHtml(titulo)}</h3>`);
    }

    secciones.forEach((section) => {
      partes.push(`<p><strong>${section.label}</strong></p>`);
      partes.push(`<p>${textoPlanoAHtml(section.value)}</p>`);
    });

    if (partes.length > 0) {
      return partes.join("\n");
    }
  }

  // Fallback legacy para respuestas antiguas que solo traen `texto`
  const textoLegacy = normalizarTexto(payload.texto);
  return textoLegacy || null;
}
