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
  servicio_atencion_cliente?: string | null;
  servicioAtencionCliente?: string | null;
  sobre_nosotros?: string | null;
  sobreNosotros?: string | null;
  consideraciones_generales?: string | null;
  consideracionesGenerales?: string | null;
  secciones?: {
    titulo?: string | null;
    formas_pago?: string | null;
    reserva_equipos?: string | null;
    garantia?: string | null;
    validez_presupuesto?: string | null;
    formasPago?: string | null;
    reservaEquipos?: string | null;
    validezPresupuesto?: string | null;
    servicio_atencion_cliente?: string | null;
    servicioAtencionCliente?: string | null;
    sobre_nosotros?: string | null;
    sobreNosotros?: string | null;
    consideraciones_generales?: string | null;
    consideracionesGenerales?: string | null;
  } | null;
}

export interface PagoAcordadoExportPayload {
  monto_usd?: number | null;
  porcentaje_monto?: number | null;
  metodo_pago?: string | null;
  fecha_estimada?: string | null;
  justificacion?: string | null;
}

export interface EsquemaPagoExportPayload {
  anticipo?: number | null;
  entrega_suministros?: number | null;
  puesta_marcha?: number | null;
}

export interface OfertaTerminosCondicionesContext {
  formas_pago_acordadas?: boolean | null;
  cantidad_pagos_acordados?: number | null;
  pagos_acordados?: PagoAcordadoExportPayload[] | null;
  esquema_pago?: EsquemaPagoExportPayload | null;
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
    `^\\s*[2-9]\\s*[\\.\\)\\-:]?\\s*${etiquetaRegex}\\s*:?\\s*`,
    "i",
  );
  limpio = limpio.replace(regexCombinado, "");

  // Quitar prefijo numerado al inicio (2., 3., 4., ...)
  limpio = limpio.replace(/^\s*[2-9]\s*[\.\)\-:]?\s*/, "");

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
    const porcentaje = Number(pago?.porcentaje_monto);
    const porcentajeFormateado = Number.isFinite(porcentaje)
      ? `${porcentaje.toFixed(2)}%`
      : "--";
    const metodoFormateado = formatearMetodoPago(pago?.metodo_pago);
    const fechaFormateada = formatearFechaPago(pago?.fecha_estimada);
    const justificacion =
      typeof pago?.justificacion === "string" ? pago.justificacion.trim() : "";
    const baseLinea = `Pago ${index + 1}: Monto ${montoFormateado}; % del monto ${porcentajeFormateado}; Método de pago ${metodoFormateado}; Fecha estimada ${fechaFormateada}.`;
    return justificacion
      ? `${baseLinea} Justificación: ${justificacion}.`
      : baseLinea;
  });

  if (cantidadPagos > 0 && cantidadPagos !== pagos.length) {
    lineas.push(
      `Cantidad de pagos acordados registrada: ${cantidadPagos} (detalles: ${pagos.length}).`,
    );
  }

  return lineas.join("\n");
};

/** Quita ceros de cola: 50 -> "50", 33.5 -> "33.5". */
const formatearPorcentaje = (valor: number): string =>
  String(Number(valor.toFixed(2)));

/**
 * Reescribe las viñetas de "Formas de pago" con los porcentajes de la oferta.
 *
 * De la BD se conserva todo lo que no sea viñeta (la frase introductoria y el
 * párrafo de la moneda), de modo que ese texto se pueda seguir editando sin
 * tocar código. Solo el reparto de los tres hitos se genera aquí, porque es lo
 * único que cambia por oferta.
 */
const aplicarEsquemaPago = (
  textoBd: string,
  esquema?: EsquemaPagoExportPayload | null,
): string => {
  if (!esquema) return textoBd;

  const anticipo = Number(esquema.anticipo);
  const suministros = Number(esquema.entrega_suministros);
  const puestaMarcha = Number(esquema.puesta_marcha);
  if (
    !Number.isFinite(anticipo) ||
    !Number.isFinite(suministros) ||
    !Number.isFinite(puestaMarcha)
  ) {
    return textoBd;
  }

  // Un hito en 0 no se imprime: un "0 %" suelto en el PDF queda mal y no dice
  // nada. Pasa con repartos de dos tramos, p. ej. 50 / 0 / 50.
  const hayHitoPrevio = anticipo > 0 || suministros > 0;
  const vinetas = [
    anticipo > 0
      ? `• ${formatearPorcentaje(anticipo)} % del importe total de la oferta en concepto de anticipo, al momento de la aceptación y firma del presupuesto.`
      : null,
    suministros > 0
      ? `• ${formatearPorcentaje(suministros)} % a la entrega de los suministros.`
      : null,
    // "restante" solo tiene sentido si antes se enumeró algún otro pago.
    puestaMarcha > 0
      ? `• ${formatearPorcentaje(puestaMarcha)} % ${
          hayHitoPrevio ? "restante " : ""
        }con la puesta en marcha del sistema.`
      : null,
  ].filter((vineta): vineta is string => vineta !== null);

  // Reparto degenerado (todo a cero): se deja el texto de la BD como estaba.
  if (vinetas.length === 0) return textoBd;

  const esVineta = (linea: string) => /^\s*[•\-\u2022]/.test(linea);
  const lineas = textoBd.split("\n");
  const primeraVineta = lineas.findIndex(esVineta);

  // Si el texto de la BD no tiene viñetas, se insertan tras la primera línea.
  if (primeraVineta === -1) {
    const [intro, ...resto] = lineas;
    return [intro, ...vinetas, ...resto].join("\n");
  }

  const sinVinetas = lineas.filter((linea) => !esVineta(linea));
  const anteriores = sinVinetas.slice(0, primeraVineta);
  const posteriores = sinVinetas.slice(primeraVineta);
  return [...anteriores, ...vinetas, ...posteriores].join("\n");
};

export function buildTerminosCondicionesHtml(
  payload?: TerminosCondicionesPayload | null,
  options?: BuildTerminosCondicionesOptions,
): string | null {
  if (!payload) return null;

  const titulo = resolverCampo(payload, ["titulo"]);
  const formasPagoAcordadas = construirTextoPagosAcordados(options?.oferta);
  // Los pagos acordados (con montos y fechas) mandan sobre el esquema
  // porcentual: si se negocio un plan concreto, ese es el acuerdo real.
  const formasPago =
    formasPagoAcordadas ||
    aplicarEsquemaPago(
      resolverCampo(payload, ["formas_pago", "formasPago"]),
      options?.oferta?.esquema_pago,
    );
  const reservaEquipos = resolverCampo(payload, [
    "reserva_equipos",
    "reservaEquipos",
  ]);
  const garantia = resolverCampo(payload, ["garantia", "garantía"]);
  const validezPresupuesto = resolverCampo(payload, [
    "validez_presupuesto",
    "validezPresupuesto",
  ]);
  const servicioAtencionCliente = resolverCampo(payload, [
    "servicio_atencion_cliente",
    "servicioAtencionCliente",
  ]);
  const sobreNosotros = resolverCampo(payload, [
    "sobre_nosotros",
    "sobreNosotros",
  ]);
  const consideracionesGenerales = resolverCampo(payload, [
    "consideraciones_generales",
    "consideracionesGenerales",
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
    "servicio_atencion_cliente" in payload ||
    "servicioAtencionCliente" in payload ||
    "sobre_nosotros" in payload ||
    "sobreNosotros" in payload ||
    "consideraciones_generales" in payload ||
    "consideracionesGenerales" in payload ||
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
    {
      label: "SERVICIO DE ATENCIÓN AL CLIENTE",
      value: limpiarContenidoSeccion(
        servicioAtencionCliente,
        "servicio\\s+de\\s+atenci[oó]n\\s+al\\s+cliente",
      ),
    },
    {
      label: "SOBRE NOSOTROS",
      value: limpiarContenidoSeccion(sobreNosotros, "sobre\\s+nosotros"),
    },
    {
      label: "CONSIDERACIONES GENERALES",
      value: limpiarContenidoSeccion(
        consideracionesGenerales,
        "consideraciones?\\s+generales?",
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
