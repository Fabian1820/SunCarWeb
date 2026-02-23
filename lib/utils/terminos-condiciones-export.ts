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

export interface PagoAcordadoExportPayload {
  monto_usd?: number | null;
  metodo_pago?: string | null;
  fecha_estimada?: string | null;
}

export interface OfertaTerminosCondicionesContext {
  formas_pago_acordadas?: boolean | null;
  cantidad_pagos_acordados?: number | null;
  pagos_acordados?: PagoAcordadoExportPayload[] | null;
}

export interface BuildTerminosCondicionesOptions {
  oferta?: OfertaTerminosCondicionesContext | null;
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

const formatearMetodoPago = (metodo?: string | null): string => {
  if (!metodo) return "--";
  const metodoNormalizado = metodo.toLowerCase();
  if (metodoNormalizado === "efectivo") return "Efectivo";
  if (metodoNormalizado === "transferencia") return "Transferencia";
  if (metodoNormalizado === "stripe") return "Stripe";
  return metodo;
};

const formatearFechaPago = (fecha?: string | null): string => {
  if (!fecha) return "--";
  const parsed = new Date(fecha);
  if (Number.isNaN(parsed.getTime())) return fecha;
  return parsed.toLocaleDateString("es-ES", {
    dateStyle: "short",
  });
};

const construirTextoPagosAcordados = (
  oferta?: OfertaTerminosCondicionesContext | null,
): string | null => {
  if (!oferta?.formas_pago_acordadas) return null;

  const pagos = Array.isArray(oferta.pagos_acordados)
    ? oferta.pagos_acordados
    : [];
  const cantidadPagos = Math.max(
    0,
    Math.floor(Number(oferta.cantidad_pagos_acordados) || 0),
  );

  if (pagos.length === 0) {
    if (cantidadPagos > 0) {
      return `Cantidad de pagos acordados: ${cantidadPagos}`;
    }
    return "Pagos acordados con el cliente.";
  }

  const lineas = pagos.map((pago, index) => {
    const monto = Number(pago?.monto_usd);
    const montoFormateado = Number.isFinite(monto)
      ? `${monto.toFixed(2)} USD`
      : "--";
    const metodoFormateado = formatearMetodoPago(pago?.metodo_pago);
    const fechaFormateada = formatearFechaPago(pago?.fecha_estimada);
    return `Pago ${index + 1}: Monto ${montoFormateado}; Método de pago ${metodoFormateado}; Fecha estimada ${fechaFormateada}.`;
  });

  if (cantidadPagos > 0 && cantidadPagos !== pagos.length) {
    lineas.push(
      `Cantidad de pagos acordados registrada: ${cantidadPagos} (detalles: ${pagos.length}).`,
    );
  }

  return lineas.join("\n");
};

export function buildTerminosCondicionesHtml(
  payload?: TerminosCondicionesPayload | null,
  options?: BuildTerminosCondicionesOptions,
): string | null {
  if (!payload) return null;

  const titulo = resolverCampo(payload, ["titulo"]);
  const formasPagoAcordadas = construirTextoPagosAcordados(options?.oferta);
  const formasPago =
    formasPagoAcordadas ||
    resolverCampo(payload, ["formas_pago", "formasPago"]);
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
      label: formasPagoAcordadas ? "PAGOS ACORDADOS" : "FORMAS DE PAGO",
      value: formasPagoAcordadas
        ? formasPagoAcordadas
        : limpiarContenidoSeccion(formasPago, "formas?\\s+de\\s+pago"),
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
