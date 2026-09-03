/**
 * Generación de las opciones de exportación (PDF/Excel) de una oferta de confección.
 *
 * Esta lógica vivía duplicada casi literalmente en tres componentes
 * (ofertas-confeccionadas-view, clients-table y leads-table). Las tres copias
 * habían divergido: las de clientes y leads calculaban el subtotal como
 * `total_materiales + margen_instalacion`, olvidando `margen_materiales`, lo que
 * hacía que la nota "(Redondeado desde X $)" imprimiera un importe ~18% menor
 * que el real; y usaban etiquetas de sección distintas a las de la vista de
 * confección. Este módulo unifica sobre la versión de ofertas-confeccionadas-view,
 * que es la que coincide con `precio_sin_redondeo` del backend y con los labels
 * de confeccion-ofertas-view.
 *
 * Cualquier cambio en el PDF de ofertas se hace AQUÍ, una sola vez.
 */

import { calcularDescuentosOferta } from "@/lib/utils/oferta-descuentos";

/** Batería cuyo nombre se rotula de forma especial en el desglose. */
const CODIGO_BATERIA_ESPECIAL_NOMBRE = "FLS48100SCG01";

const toNumberSafe = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/** Etiquetas de sección: mismas que usa confeccion-ofertas-view al construir la oferta. */
const SECCION_LABELS: ReadonlyArray<readonly [string, string]> = [
  ["INVERSORES", "Inversores"],
  ["BATERIAS", "Baterías"],
  ["PANELES", "Paneles"],
  ["MPPT", "MPPT"],
  ["ESTRUCTURAS", "Estructuras"],
  ["CABLEADO_DC", "Cableado DC"],
  ["CABLEADO_AC", "Cableado AC"],
  ["CANALIZACION", "Canalización"],
  ["TIERRA", "Tierra"],
  ["PROTECCIONES_ELECTRICAS", "Protecciones Eléctricas y Gabinetes"],
  ["MATERIAL_VARIO", "Material vario"],
];

const seccionLabelMap = new Map<string, string>(
  SECCION_LABELS.map(([id, label]) => [id, label]),
);

/** Componentes que dan nombre al sistema. Todos opcionales: hay ofertas sin baterías. */
interface ComponentesPrincipalesNombre {
  inversor?: { cantidad?: number; potencia?: number };
  bateria?: { cantidad?: number; capacidad?: number };
  panel?: { cantidad?: number };
}

/** 16, 10,5 — sin los ceros de relleno que deja toFixed. */
const formatearMagnitud = (valor: number) =>
  Number.parseFloat(valor.toFixed(2)).toString();

/** "a", "a y b", "a, b y c". */
const unirConY = (partes: string[]) =>
  partes.length <= 1
    ? partes.join("")
    : `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;

/**
 * Descripción legible del sistema, SOLO para el nombre del PDF exportado.
 *
 * El nombre corto de la oferta ("I-2x8kW+B-1x10kWh+P-12x590W") es interno: al
 * cliente le llega un archivo que no sabe leer. Aquí las cantidades se suman
 * (dos inversores de 8 kW son 16 kW de inversor) y los paneles van por
 * unidades, que es como los cuenta el cliente. Dentro del PDF y en pantalla la
 * oferta se sigue llamando igual que siempre.
 *
 * Va en telegrama a propósito ("SFV 3kW Inversor, 5.12kWh Baterías y 4
 * Paneles"): con la frase entera y el nombre del cliente detrás, el archivo
 * salía tan largo que en el gestor de descargas y en los adjuntos de correo se
 * cortaba antes de llegar a la parte útil.
 *
 * Devuelve "" si no hay ningún componente reconocido, para que quien llama
 * pueda caer al nombre corto.
 */
export function nombreDescriptivoSistema(
  componentes: ComponentesPrincipalesNombre | null | undefined,
): string {
  const partes: string[] = [];

  const inversor = componentes?.inversor;
  const potenciaInversor =
    (inversor?.cantidad || 0) * (inversor?.potencia || 0);
  if (potenciaInversor > 0) {
    // Siempre en singular: es la potencia sumada, no el número de inversores.
    partes.push(`${formatearMagnitud(potenciaInversor)}kW Inversor`);
  }

  const bateria = componentes?.bateria;
  const capacidadBaterias =
    (bateria?.cantidad || 0) * (bateria?.capacidad || 0);
  if (capacidadBaterias > 0) {
    partes.push(`${formatearMagnitud(capacidadBaterias)}kWh Baterías`);
  }

  const cantidadPaneles = componentes?.panel?.cantidad || 0;
  if (cantidadPaneles > 0) {
    partes.push(
      `${cantidadPaneles} ${cantidadPaneles === 1 ? "Panel" : "Paneles"}`,
    );
  }

  if (partes.length === 0) return "";
  return `SFV ${unirConY(partes)}`;
}

/** Quita lo que ningún sistema de archivos acepta y colapsa espacios. */
const limpiarParaNombreArchivo = (valor: string) =>
  (valor || "")
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const ESTADO_LABELS: Record<string, string> = {
  en_revision: "En Revisión",
  aprobada_para_enviar: "Aprobada",
  enviada_a_cliente: "Enviada",
  confirmada_por_cliente: "Confirmada",
  reservada: "Reservada",
  rechazada: "Rechazada",
  cancelada: "Cancelada",
  agotada: "Agotada",
};

/**
 * Igual que el `getEstadoBadge` de ofertas-confeccionadas-view: un estado
 * desconocido cae en "En Revisión", no en el código crudo.
 */
export function etiquetaEstadoOferta(estado: string): string {
  return ESTADO_LABELS[estado] ?? ESTADO_LABELS.en_revision;
}

/**
 * Totales derivados de la oferta para las notas de contribución y redondeo.
 *
 * `base` parte de `subtotal_con_margen` (materiales + margen completo), que es
 * lo que guarda el backend. Verificado contra `precio_sin_redondeo` en 46/46
 * ofertas reales; la variante que sumaba solo `margen_instalacion` acertaba 5/46.
 */
export function calcularTotalesDetalle(oferta: any) {
  const base =
    (oferta.subtotal_con_margen || 0) +
    (oferta.costo_transportacion || 0) +
    (oferta.total_elementos_personalizados || 0) +
    (oferta.total_costos_extras || 0);
  const porcentaje = oferta.porcentaje_contribucion || 0;
  const contribucion = oferta.aplica_contribucion
    ? base * (porcentaje / 100)
    : 0;
  const totalSinRedondeo = base + contribucion;
  const redondeo = (oferta.precio_final || 0) - totalSinRedondeo;
  return { base, contribucion, totalSinRedondeo, redondeo };
}

/**
 * Construye el índice `id de marca -> nombre` que espera la exportación,
 * descartando las marcas incompletas.
 */
export function construirMarcasMap(
  marcas: Array<{ id?: string; nombre?: string }>,
): Map<string, string> {
  const map = new Map<string, string>();
  marcas.forEach((marca) => {
    if (marca.id && marca.nombre) map.set(marca.id, marca.nombre);
  });
  return map;
}

/** Contacto ya resuelto por el componente que llama. */
export interface ContactoExportacionOferta {
  cliente?: any | null;
  lead?: any | null;
}

export interface GenerarOpcionesExportacionOfertaParams
  extends ContactoExportacionOferta {
  oferta: any;
  /** Catálogo de materiales, para fotos, marcas y potencias. */
  materials: any[];
  /** id de marca -> nombre. */
  marcasMap: Map<string, string>;
  /**
   * HTML de términos y condiciones ya construido. `buildTerminosCondicionesHtml`
   * devuelve null cuando no hay payload, así que se admite null además de "".
   */
  terminosCondicionesExport?: string | null;
}

export function generarOpcionesExportacionOferta({
  oferta,
  materials,
  marcasMap,
  cliente,
  lead,
  terminosCondicionesExport = "",
}: GenerarOpcionesExportacionOfertaParams) {
  // Índice de materiales por código, para foto/nombre/descripción.
  const materialesMap = new Map<
    string,
    { foto?: string; nombre?: string; descripcion?: string }
  >();
  materials.forEach((material) => {
    const codigo = material.codigo?.toString();
    if (!codigo) return;
    materialesMap.set(codigo, {
      foto: material.foto,
      nombre: material.nombre,
      descripcion: material.descripcion,
    });
  });

  // Orden de secciones (mismo orden que en confección de ofertas)
  const ordenSeccionesBase = [
    "INVERSORES",
    "BATERIAS",
    "PANELES",
    "MPPT",
    "ESTRUCTURAS",
    "CABLEADO_DC",
    "CABLEADO_AC",
    "CANALIZACION",
    "TIERRA",
    "PROTECCIONES_ELECTRICAS",
    "MATERIAL_VARIO",
  ];

  // Agregar secciones personalizadas al final si existen
  const seccionesPersonalizadasOferta = oferta.secciones_personalizadas || [];
  const ordenSecciones = [
    ...ordenSeccionesBase,
    ...seccionesPersonalizadasOferta.map((s: any) => s.id),
  ];

  // Función para ordenar items por sección
  const ordenarItemsPorSeccion = (items: any[]) => {
    return [...items].sort((a, b) => {
      const indexA = ordenSecciones.indexOf(a.seccion);
      const indexB = ordenSecciones.indexOf(b.seccion);

      // Si la sección no está en el orden predefinido, ponerla al final
      const posA = indexA === -1 ? 999 : indexA;
      const posB = indexB === -1 ? 999 : indexB;

      return posA - posB;
    });
  };

  // Ordenar items de la oferta
  const itemsOrdenados = ordenarItemsPorSeccion(oferta.items || []);

  // Crear mapa de fotos
  const fotosMap = new Map<string, string>();
  itemsOrdenados.forEach((item) => {
    const material = materials.find(
      (m) => m.codigo.toString() === item.material_codigo,
    );
    if (material?.foto) {
      fotosMap.set(item.material_codigo?.toString(), material.foto);
    }
  });

  // Calcular margen por material (simplificado - en la oferta guardada ya viene calculado)
  const margenPorMaterial = new Map<string, number>();
  itemsOrdenados.forEach((item) => {
    // El margen ya está incluido en el precio final de cada item
    margenPorMaterial.set(item.material_codigo?.toString(), 0);
  });

  const tasaCambioNumero = oferta.tasa_cambio || 0;

  // El descuento y la compensación NO están dentro de precio_final (ver
  // lib/utils/oferta-descuentos.ts), así que el PDF los tiene que restar
  // explícitamente para mostrar lo que realmente paga el cliente.
  const descuentosOferta = calcularDescuentosOferta(oferta as any);

  const tieneMonedaCambio =
    oferta.moneda_pago !== "USD" && tasaCambioNumero > 0;
  const codigoMonedaCambio = tieneMonedaCambio ? oferta.moneda_pago : "USD";
  const simboloMonedaCambio =
    oferta.moneda_pago === "EUR"
      ? "€"
      : oferta.moneda_pago === "CUP"
        ? "CUP"
        : "$";
  const convertirMontoMonedaPago = (monto: number) => {
    if (!tieneMonedaCambio) return monto;
    return oferta.moneda_pago === "EUR"
      ? monto / tasaCambioNumero
      : monto * tasaCambioNumero;
  };

  /**
   * Paso con el que se fijó el precio final en USD, para volver a aplicarlo
   * sobre el importe ya convertido.
   *
   * El redondeo del backend es `ceil(total_sin_redondeo / 10) * 10`, pero el
   * comercial puede fijar el precio a mano, así que el paso NO se asume: se
   * deduce del propio precio final. En CUP la conversión multiplica y el
   * número sigue saliendo redondo, pero en EUR divide entre la tasa y 8.500 $
   * se convertían en 7.870,37 € — el redondeo se perdía por el camino.
   *
   * Si el precio final tiene céntimos, el comercial eligió no redondear y el
   * convertido tampoco se toca.
   */
  const pasoRedondeoPrecio = (precio: number) => {
    if (!Number.isFinite(precio) || precio <= 0) return 0;
    const centavos = Math.round(precio * 100);
    if (centavos % 1000 === 0) return 10;
    if (centavos % 500 === 0) return 5;
    if (centavos % 100 === 0) return 1;
    return 0;
  };
  const pasoRedondeo = pasoRedondeoPrecio(descuentosOferta.precioFinal);
  const redondearMontoMonedaPago = (monto: number) =>
    tieneMonedaCambio && pasoRedondeo > 0
      ? Math.ceil(monto / pasoRedondeo) * pasoRedondeo
      : monto;

  /**
   * Importes del bloque de totales, ya en la moneda de pago.
   *
   * Solo se redondea el bruto, una vez; el descuento y la compensación se
   * convierten exactos y el neto se deriva restándolos. Así el desglose del
   * documento del cliente sigue cuadrando (bruto − descuentos = total a pagar)
   * en vez de redondear cada línea por separado y descuadrar la resta.
   */
  const precioFinalMonedaPago = redondearMontoMonedaPago(
    convertirMontoMonedaPago(descuentosOferta.precioFinal),
  );
  const montoDescuentoMonedaPago = convertirMontoMonedaPago(
    descuentosOferta.montoDescuento,
  );
  const montoCompensacionMonedaPago = convertirMontoMonedaPago(
    descuentosOferta.montoCompensacion,
  );
  const precioRealMonedaPago = Math.max(
    0,
    precioFinalMonedaPago -
      montoDescuentoMonedaPago -
      montoCompensacionMonedaPago,
  );

  /**
   * Filas que van justo debajo de cada "Precio final": el desglose de lo que
   * se descuenta y el neto resultante. Van marcadas como sección "Descuento"
   * para que el checkbox "Incluir descuento" del diálogo de exportación las
   * gobierne en bloque; al desmarcarlo el PDF vuelve a mostrar solo el bruto.
   *
   * `detallado` añade las columnas extra que solo existen en el export
   * completo (precio unitario, margen). `enMonedaPago` emite los importes ya
   * convertidos y coherentes con el bruto redondeado, para los documentos del
   * cliente; el export completo los quiere en USD.
   */
  const filasDescuentoPdf = (detallado: boolean, enMonedaPago = false) => {
    if (!descuentosOferta.tieneDescuento) return [];

    const montoDescuento = enMonedaPago
      ? montoDescuentoMonedaPago
      : descuentosOferta.montoDescuento;
    const montoCompensacion = enMonedaPago
      ? montoCompensacionMonedaPago
      : descuentosOferta.montoCompensacion;
    const precioReal = enMonedaPago
      ? precioRealMonedaPago
      : descuentosOferta.precioReal;

    const base: Record<string, any> = {
      material_codigo: "",
      seccion: "Descuento",
      cantidad: "",
      ...(detallado
        ? { precio_unitario: "", porcentaje_margen: "", margen: "" }
        : {}),
    };

    const filas: Record<string, any>[] = [];

    // Tipos propios a propósito: el renderizador del PDF agrupa las filas por
    // `tipo` e ignora el orden del array. Con "Descuento" caían en el grupo del
    // descuento porcentual antiguo, que se pinta ANTES del precio final, y con
    // "TOTAL" la fila del neto quedaba como totales[1], que nadie dibuja.
    // Con estos dos tipos, export-service las pinta bajo el precio final.
    if (montoDescuento > 0) {
      filas.push({
        ...base,
        tipo: "DescuentoNeto",
        descripcion: descuentosOferta.justificacionDescuento
          ? `Descuento — ${descuentosOferta.justificacionDescuento}`
          : "Descuento",
        total: `- ${montoDescuento.toFixed(2)}`,
      });
    }

    if (montoCompensacion > 0) {
      filas.push({
        ...base,
        tipo: "DescuentoNeto",
        descripcion: descuentosOferta.justificacionCompensacion
          ? `Compensación — ${descuentosOferta.justificacionCompensacion}`
          : "Compensación",
        total: `- ${montoCompensacion.toFixed(2)}`,
      });
    }

    filas.push({
      ...base,
      tipo: "TotalAPagar",
      descripcion: "Total a pagar",
      total: precioReal.toFixed(2),
    });

    return filas;
  };

  // Se muestra el precio real, no el bruto: es el importe que el cliente va a
  // pagar en la moneda acordada. Sin descuentos ambos coinciden.
  const montoConvertido = tieneMonedaCambio ? precioRealMonedaPago : 0;
  const convertirTextoTotalMonedaPago = (valor: unknown) => {
    if (
      !tieneMonedaCambio ||
      valor === null ||
      valor === undefined ||
      valor === ""
    ) {
      return valor;
    }

    if (typeof valor === "number") {
      return convertirMontoMonedaPago(valor).toFixed(2);
    }

    const valorStr = valor.toString().trim();
    const esNegativo = valorStr.startsWith("-");
    const normalizado = valorStr.replace(",", ".").replace(/[^0-9.-]/g, "");
    const numero = Number.parseFloat(normalizado);

    if (!Number.isFinite(numero)) return valor;

    const montoBase = esNegativo ? -Math.abs(numero) : numero;
    const convertido = convertirMontoMonedaPago(montoBase);
    const textoMonto = Math.abs(convertido).toFixed(2);
    return convertido < 0 ? `- ${textoMonto}` : textoMonto;
  };

  // Filas cuyo `total` no hay que convertir aquí. "Datos" lleva el número de
  // cuenta: al convertirlo, el limpiado de no-dígitos lo transformaba en una
  // cifra y el cliente recibía la cuenta destrozada. "Conversión" ya viene en
  // la moneda de pago y volver a convertirla la elevaría al cuadrado. Los tres
  // tipos del bloque de totales llegan ya convertidos y redondeados desde
  // `precioFinalMonedaPago` / `filasDescuentoPdf`.
  const TIPOS_TOTAL_SIN_CONVERTIR = new Set([
    "Info",
    "Tasa",
    "Conversión",
    "Datos",
    "TOTAL",
    "DescuentoNeto",
    "TotalAPagar",
  ]);

  const convertirFilasAMonedaPago = (filas: any[]) => {
    if (!tieneMonedaCambio) return filas;
    return filas.map((fila) =>
      TIPOS_TOTAL_SIN_CONVERTIR.has(fila?.tipo)
        ? fila
        : { ...fila, total: convertirTextoTotalMonedaPago(fila?.total) },
    );
  };

  // Debug: ver campos de descuento de la oferta
  console.log("🔍 DEBUG - Oferta completa:", oferta);
  console.log("🔍 DEBUG - Descuento:", {
    descuento_porcentaje: oferta.descuento_porcentaje,
    monto_descuento: oferta.monto_descuento,
    subtotal_con_descuento: oferta.subtotal_con_descuento,
  });

  // Extraer componentes principales del nombre_completo de la oferta
  const componentesPrincipales: any = {};
  const nombreCompleto = oferta.nombre_completo || oferta.nombre || "";

  console.log("📝 Extrayendo componentes de:", nombreCompleto);

  // Extraer batería (buscar patrón como "16.0kWh Batería" o "1x 16.0kWh")
  const bateriaMatch =
    nombreCompleto.match(
      /(\d+)x?\s*(\d+(?:\.\d+)?)\s*kwh\s+(?:de\s+)?bater[ií]a/i,
    ) ||
    nombreCompleto.match(/(\d+(?:\.\d+)?)\s*kwh\s+(?:de\s+)?bater[ií]a/i);

  if (bateriaMatch) {
    let cantidad = 1;
    let capacidad = 0;

    if (bateriaMatch[2]) {
      // Formato: "1x 16.0kWh"
      cantidad = parseInt(bateriaMatch[1]);
      capacidad = parseFloat(bateriaMatch[2]);
    } else {
      // Formato: "16.0kWh"
      capacidad = parseFloat(bateriaMatch[1]);
    }

    componentesPrincipales.bateria = {
      cantidad: cantidad,
      capacidad: capacidad,
    };

    console.log("🔋 Batería extraída:", componentesPrincipales.bateria);
  }

  // Extraer inversor (buscar patrón como "10kW" o "10.0kW")
  const inversorMatch = nombreCompleto.match(
    /(\d+(?:\.\d+)?)\s*kw\s+(?:de\s+)?inversor/i,
  );
  if (inversorMatch) {
    const potencia = parseFloat(inversorMatch[1]);

    // Buscar marca en el nombre
    const marcaMatch = nombreCompleto.match(
      /(?:inversor|fabricante)\s+(\w+)/i,
    );
    const marca = marcaMatch ? marcaMatch[1] : undefined;

    componentesPrincipales.inversor = {
      cantidad: 1,
      potencia: potencia,
      marca: marca,
    };
  }

  // Extraer paneles (buscar patrón como "20x 590W" o "590W Panel")
  const panelMatch =
    nombreCompleto.match(
      /(\d+)x?\s*(\d+(?:\.\d+)?)\s*w\s+(?:de\s+)?panel/i,
    ) || nombreCompleto.match(/(\d+(?:\.\d+)?)\s*w\s+(?:de\s+)?panel/i);

  if (panelMatch) {
    let cantidad = 1;
    let potencia = 0;

    if (panelMatch[2]) {
      // Formato: "20x 590W"
      cantidad = parseInt(panelMatch[1]);
      potencia = parseFloat(panelMatch[2]);
    } else {
      // Formato: "590W"
      potencia = parseFloat(panelMatch[1]);
    }

    componentesPrincipales.panel = {
      cantidad: cantidad,
      potencia: potencia,
    };
  }

  const componentesGuardados = oferta.componentes_principales || {};
  const normalizarCodigo = (value: unknown) =>
    (value ?? "").toString().trim();
  const seleccionarItemsComponente = (
    seccion: string,
    codigoSeleccionado?: string,
  ) => {
    const itemsSeccion = itemsOrdenados.filter(
      (item) => item.seccion === seccion,
    );
    if (itemsSeccion.length === 0) return [];

    const codigoSeleccionadoNorm = normalizarCodigo(codigoSeleccionado);
    if (codigoSeleccionadoNorm) {
      const itemsSeleccionados = itemsSeccion.filter(
        (item) =>
          normalizarCodigo(item.material_codigo) === codigoSeleccionadoNorm,
      );
      if (itemsSeleccionados.length > 0) return itemsSeleccionados;
      console.warn(
        `⚠️ Código seleccionado ${codigoSeleccionadoNorm} no encontrado en ${seccion}. Se usa fallback.`,
      );
    }

    const codigoFallback = normalizarCodigo(itemsSeccion[0]?.material_codigo);
    return itemsSeccion.filter(
      (item) => normalizarCodigo(item.material_codigo) === codigoFallback,
    );
  };

  // Buscar inversor (sección INVERSORES): priorizar código seleccionado guardado
  const itemsInversores = seleccionarItemsComponente(
    "INVERSORES",
    componentesGuardados.inversor_seleccionado,
  );
  if (itemsInversores.length > 0) {
    const codigoInversor = normalizarCodigo(
      itemsInversores[0]?.material_codigo,
    );
    const cantidadInversor = itemsInversores.reduce(
      (sum, item) => sum + (Number(item.cantidad) || 0),
      0,
    );
    const material = materials.find(
      (m) => m.codigo.toString() === codigoInversor,
    );

    // Usar el campo potenciaKW del material directamente
    const potencia = material?.potenciaKW || 0;

    // Buscar marca del inversor
    const marcaId = material?.marca_id;
    const marca = marcaId ? marcasMap.get(marcaId) : undefined;

    componentesPrincipales.inversor = {
      codigo: codigoInversor,
      cantidad: cantidadInversor,
      potencia: potencia,
      marca: marca,
    };
  }

  // Buscar batería (sección BATERIAS): priorizar código seleccionado guardado
  const itemsBaterias = seleccionarItemsComponente(
    "BATERIAS",
    componentesGuardados.bateria_seleccionada,
  );
  if (itemsBaterias.length > 0) {
    const codigoBateria = normalizarCodigo(itemsBaterias[0]?.material_codigo);
    const cantidadBateriaSeleccionada = itemsBaterias.reduce(
      (sum, item) => sum + (Number(item.cantidad) || 0),
      0,
    );
    const materialSeleccionado = materials.find(
      (m) => m.codigo.toString() === codigoBateria,
    );
    const itemsBateriaEspecial = itemsOrdenados.filter(
      (item) =>
        item.seccion === "BATERIAS" &&
        normalizarCodigo(item.material_codigo) ===
          normalizarCodigo(CODIGO_BATERIA_ESPECIAL_NOMBRE) &&
        normalizarCodigo(item.material_codigo) !== codigoBateria,
    );
    const cantidadBateriaEspecial = itemsBateriaEspecial.reduce(
      (sum, item) => sum + (Number(item.cantidad) || 0),
      0,
    );
    const materialEspecial = materials.find(
      (m) => m.codigo.toString() === CODIGO_BATERIA_ESPECIAL_NOMBRE,
    );

    // Usar el campo potenciaKW del material directamente (para baterías es la capacidad en kWh)
    const capacidadSeleccionada = materialSeleccionado?.potenciaKW || 0;
    const capacidadEspecial =
      cantidadBateriaEspecial > 0 ? materialEspecial?.potenciaKW || 0 : 0;
    const cantidadBateria =
      cantidadBateriaSeleccionada + cantidadBateriaEspecial;
    const capacidadTotal =
      cantidadBateriaSeleccionada * capacidadSeleccionada +
      cantidadBateriaEspecial * capacidadEspecial;
    const capacidad =
      cantidadBateria > 0 ? capacidadTotal / cantidadBateria : 0;

    console.log("🔋 DEBUG Batería:", {
      material_codigo: codigoBateria,
      material_nombre: materialSeleccionado?.nombre,
      potenciaKW: materialSeleccionado?.potenciaKW,
      cantidad_sel: cantidadBateriaSeleccionada,
      capacidad_sel: capacidadSeleccionada,
      cantidad_fls: cantidadBateriaEspecial,
      capacidad_fls: capacidadEspecial,
      cantidad_total: cantidadBateria,
      capacidad_promedio: capacidad,
      capacidad_total: capacidadTotal,
      cantidad: cantidadBateria,
    });

    componentesPrincipales.bateria = {
      codigo: codigoBateria,
      cantidad: cantidadBateria,
      capacidad: capacidad,
    };
  }

  // Buscar paneles (sección PANELES): priorizar código seleccionado guardado
  const itemsPaneles = seleccionarItemsComponente(
    "PANELES",
    componentesGuardados.panel_seleccionado,
  );
  if (itemsPaneles.length > 0) {
    const codigoPanel = normalizarCodigo(itemsPaneles[0]?.material_codigo);
    const cantidadPanel = itemsPaneles.reduce(
      (sum, item) => sum + (Number(item.cantidad) || 0),
      0,
    );
    const material = materials.find(
      (m) => m.codigo.toString() === codigoPanel,
    );

    // Para paneles, potenciaKW está en kW, pero necesitamos en W para el cálculo
    const potenciaKW = material?.potenciaKW || 0;
    const potencia = potenciaKW * 1000;

    componentesPrincipales.panel = {
      codigo: codigoPanel,
      cantidad: cantidadPanel,
      potencia: potencia,
    };
  }

  // Nombre del archivo exportado. Se calcula aquí, y no arriba, porque necesita
  // los componentes principales ya resueltos contra el catálogo de materiales.
  let baseFilename = limpiarParaNombreArchivo(
    nombreDescriptivoSistema(componentesPrincipales) ||
      // Sin componentes reconocidos queda el nombre corto de siempre. Las
      // comas se sustituyen ANTES que los espacios: al revés salía "+_".
      oferta.nombre
        .replace(/[<>:"/\\|?*]/g, "")
        .replace(/,\s*/g, "+")
        .replace(/\s+/g, "_")
        .replace(/_+/g, "_"),
  );

  // Si es personalizada, agregar nombre del cliente/lead
  if (oferta.tipo === "personalizada") {
    let nombreContacto = "";

    if (cliente?.nombre) {
      nombreContacto = cliente.nombre;
    } else if (lead?.nombre_completo || lead?.nombre) {
      nombreContacto = lead.nombre_completo || lead.nombre;
    } else if (oferta.nombre_lead_sin_agregar) {
      nombreContacto = oferta.nombre_lead_sin_agregar;
    }

    const nombreLimpio = limpiarParaNombreArchivo(nombreContacto);
    if (nombreLimpio) {
      baseFilename = `${baseFilename} - ${nombreLimpio}`;
    }
  }

  // EXPORTACIÓN COMPLETA
  const rowsCompleto: any[] = [];
  itemsOrdenados.forEach((item) => {
    // Buscar el label de la sección (puede ser estándar o personalizada)
    let seccionLabel = seccionLabelMap.get(item.seccion) ?? item.seccion;

    // Si no está en el mapa estándar, buscar en secciones personalizadas
    if (
      seccionLabel === item.seccion &&
      seccionesPersonalizadasOferta.length > 0
    ) {
      const seccionPersonalizada = seccionesPersonalizadasOferta.find(
        (s: any) => s.id === item.seccion,
      );
      if (seccionPersonalizada) {
        seccionLabel = seccionPersonalizada.label;
      }
    }

    // Buscar el nombre del material
    const material = materialesMap.get(item.material_codigo?.toString());
    const nombreMaterial = material?.nombre || item.descripcion;

    // Obtener margen asignado desde el item (viene de la BD)
    const margenAsignado = toNumberSafe((item as any).margen_asignado);
    const costoItem = item.precio * item.cantidad;

    // Calcular porcentaje desde el margen asignado
    const porcentajeMargen =
      costoItem > 0 && margenAsignado > 0
        ? (margenAsignado / costoItem) * 100
        : 0;

    const esCableado =
      item.seccion === "CABLEADO_AC" || item.seccion === "CABLEADO_DC";
    rowsCompleto.push({
      material_codigo: item.material_codigo,
      seccion: seccionLabel,
      tipo: "Material",
      descripcion: nombreMaterial,
      cantidad: esCableado ? `hasta ${item.cantidad}` : item.cantidad,
      precio_unitario: item.precio.toFixed(2),
      porcentaje_margen: `${porcentajeMargen.toFixed(2)}%`,
      margen: margenAsignado.toFixed(2),
      total: (costoItem + margenAsignado).toFixed(2),
    });
  });

  // Calcular total de materiales (suma de todos los items)
  const totalMateriales = itemsOrdenados.reduce((sum, item) => {
    const margenAsignado = toNumberSafe((item as any).margen_asignado);
    const costoItem = item.precio * item.cantidad;
    return sum + costoItem + margenAsignado;
  }, 0);

  // Agregar secciones personalizadas de tipo costo
  if (seccionesPersonalizadasOferta.length > 0) {
    seccionesPersonalizadasOferta.forEach((seccion: any) => {
      if (
        seccion.tipo === "extra" &&
        seccion.tipo_extra === "costo" &&
        seccion.costos_extras
      ) {
        seccion.costos_extras.forEach((costo: any) => {
          rowsCompleto.push({
            material_codigo: "",
            seccion: seccion.label,
            tipo: "Costo extra",
            descripcion: costo.descripcion,
            cantidad: costo.cantidad,
            precio_unitario: costo.precio_unitario.toFixed(2),
            porcentaje_margen: "",
            margen: "",
            total: (costo.cantidad * costo.precio_unitario).toFixed(2),
          });
        });
      }
    });
  }

  // Agregar fila de total de materiales
  rowsCompleto.push({
    material_codigo: "",
    seccion: "Totales",
    tipo: "Subtotal",
    descripcion: "Total de materiales",
    cantidad: "",
    precio_unitario: "",
    porcentaje_margen: "",
    margen: "",
    total: totalMateriales.toFixed(2),
  });

  // Agregar servicio de instalación si existe
  console.log("🔍 DEBUG - Margen instalación:", {
    margen_instalacion: oferta.margen_instalacion,
    tiene_margen: oferta.margen_instalacion && oferta.margen_instalacion > 0,
    oferta_completa: oferta,
  });

  if (oferta.margen_instalacion && oferta.margen_instalacion > 0) {
    console.log("✅ Agregando servicio de instalación a rowsCompleto");
    rowsCompleto.push({
      material_codigo: "",
      seccion: "Servicios",
      tipo: "Servicio",
      descripcion: "Costo de instalación y puesta en marcha",
      cantidad: 1,
      precio_unitario: oferta.margen_instalacion.toFixed(2),
      porcentaje_margen: "",
      margen: "",
      total: oferta.margen_instalacion.toFixed(2),
    });
  }

  if (oferta.costo_transportacion && oferta.costo_transportacion > 0) {
    rowsCompleto.push({
      material_codigo: "",
      seccion: "Logística",
      tipo: "Transportación",
      descripcion: "Costo de transportación",
      cantidad: 1,
      precio_unitario: oferta.costo_transportacion.toFixed(2),
      porcentaje_margen: "",
      margen: "",
      total: oferta.costo_transportacion.toFixed(2),
    });
  }

  // Agregar descuento si existe
  const descuentoPorcentaje =
    parseFloat(oferta.descuento_porcentaje as any) || 0;
  const montoDescuento = parseFloat(oferta.monto_descuento as any) || 0;

  console.log("🔍 DEBUG Descuento:", {
    descuento_porcentaje_original: oferta.descuento_porcentaje,
    descuento_porcentaje_parseado: descuentoPorcentaje,
    monto_descuento_original: oferta.monto_descuento,
    monto_descuento_parseado: montoDescuento,
    tiene_descuento: descuentoPorcentaje > 0,
  });

  // Agregar contribución si aplica (ANTES del descuento)
  if (oferta.aplica_contribucion && oferta.porcentaje_contribucion) {
    const totalesCalc = calcularTotalesDetalle(oferta);
    rowsCompleto.push({
      material_codigo: "",
      seccion: "Contribución",
      tipo: "Contribucion",
      descripcion: `Contribución (${oferta.porcentaje_contribucion}%)`,
      cantidad: 1,
      precio_unitario: "",
      porcentaje_margen: "",
      margen: "",
      total: totalesCalc.contribucion.toFixed(2),
    });
  }

  if (descuentoPorcentaje > 0) {
    console.log("✅ Agregando descuento al PDF:", montoDescuento);
    rowsCompleto.push({
      material_codigo: "",
      seccion: "Descuento",
      tipo: "Descuento",
      descripcion: `Descuento aplicado (${descuentoPorcentaje}%)`,
      cantidad: 1,
      precio_unitario: "",
      porcentaje_margen: "",
      margen: "",
      total: `- ${montoDescuento.toFixed(2)}`,
    });
  }

  rowsCompleto.push({
    material_codigo: "",
    seccion: "Totales",
    tipo: "TOTAL",
    descripcion: "Precio final",
    cantidad: "",
    precio_unitario: "",
    porcentaje_margen: "",
    margen: "",
    total: (oferta.precio_final || 0).toFixed(2),
  });
  rowsCompleto.push(...filasDescuentoPdf(true));

  // Datos de pago
  if (
    oferta.pago_transferencia ||
    oferta.aplica_contribucion ||
    (oferta.moneda_pago !== "USD" && tasaCambioNumero > 0)
  ) {
    if (oferta.pago_transferencia) {
      rowsCompleto.push({
        material_codigo: "",
        seccion: "PAGO",
        tipo: "Info",
        descripcion: "✓ Pago por transferencia",
        cantidad: "",
        precio_unitario: "",
        porcentaje_margen: "",
        margen: "",
        total: "",
      });

      if (oferta.datos_cuenta) {
        rowsCompleto.push({
          material_codigo: "",
          seccion: "PAGO",
          tipo: "Datos",
          descripcion: "Datos de la cuenta",
          cantidad: "",
          precio_unitario: "",
          porcentaje_margen: "",
          margen: "",
          total: oferta.datos_cuenta,
        });
      }
    }

    // Contribución ya se agregó arriba, antes del descuento

    rowsCompleto.push({
      material_codigo: "",
      seccion: "PAGO",
      tipo: "TOTAL",
      descripcion: "Precio Final",
      cantidad: "",
      precio_unitario: "",
      porcentaje_margen: "",
      margen: "",
      total: (oferta.precio_final || 0).toFixed(2),
    });
    rowsCompleto.push(...filasDescuentoPdf(true));

    const totalesCalc = calcularTotalesDetalle(oferta);
    if (Math.abs(totalesCalc.redondeo) > 0.01) {
      rowsCompleto.push({
        material_codigo: "",
        seccion: "PAGO",
        tipo: "Nota",
        descripcion: `(Redondeado desde ${totalesCalc.totalSinRedondeo.toFixed(2)} $)`,
        cantidad: "",
        precio_unitario: "",
        porcentaje_margen: "",
        margen: "",
        total: "",
      });
    }

    if (oferta.moneda_pago !== "USD" && tasaCambioNumero > 0) {
      const simboloMoneda = oferta.moneda_pago === "EUR" ? "€" : "CUP";
      const nombreMoneda =
        oferta.moneda_pago === "EUR" ? "Euros (EUR)" : "Pesos Cubanos (CUP)";

      rowsCompleto.push({
        material_codigo: "",
        seccion: "PAGO",
        tipo: "Info",
        descripcion: "Moneda de pago",
        cantidad: "",
        precio_unitario: "",
        porcentaje_margen: "",
        margen: "",
        total: nombreMoneda,
      });

      const tasaTexto =
        oferta.moneda_pago === "EUR"
          ? `1 EUR = ${tasaCambioNumero} USD`
          : `1 USD = ${tasaCambioNumero} CUP`;

      rowsCompleto.push({
        material_codigo: "",
        seccion: "PAGO",
        tipo: "Tasa",
        descripcion: tasaTexto,
        cantidad: "",
        precio_unitario: "",
        porcentaje_margen: "",
        margen: "",
        total: "",
      });

      rowsCompleto.push({
        material_codigo: "",
        seccion: "PAGO",
        tipo: "Conversión",
        descripcion: `Precio en ${oferta.moneda_pago}`,
        cantidad: "",
        precio_unitario: "",
        porcentaje_margen: "",
        margen: "",
        total: `${montoConvertido.toFixed(2)} ${simboloMoneda}`,
      });
    }
  }

  const exportOptionsCompleto = {
    title: "Oferta - Exportación completa",
    subtitle:
      oferta.nombre_completo &&
      oferta.nombre_completo !== "0.00" &&
      isNaN(Number(oferta.nombre_completo))
        ? oferta.nombre_completo
        : oferta.nombre,
    columns: [
      { header: "Sección", key: "seccion", width: 18 },
      { header: "Tipo", key: "tipo", width: 12 },
      { header: "Descripción", key: "descripcion", width: 45 },
      { header: "Cant", key: "cantidad", width: 8 },
      { header: "P.Unit ($)", key: "precio_unitario", width: 12 },
      { header: "% Margen", key: "porcentaje_margen", width: 8 },
      { header: "Margen ($)", key: "margen", width: 14 },
      { header: "Total ($)", key: "total", width: 14 },
    ],
    data: rowsCompleto,
    logoUrl: "/brand/suncar-v1-iso.png",
    clienteData:
      oferta.tipo === "personalizada" && cliente
        ? {
            numero: cliente.numero || cliente.id,
            nombre: cliente.nombre,
            carnet_identidad: cliente.carnet_identidad,
            telefono: cliente.telefono,
            provincia_montaje: cliente.provincia_montaje,
            direccion: cliente.direccion,
            atencion_de: cliente.nombre,
          }
        : undefined,
    leadData:
      oferta.tipo === "personalizada" && lead
        ? {
            id: lead.id,
            nombre: lead.nombre_completo || lead.nombre,
            telefono: lead.telefono,
            email: lead.email,
            provincia: lead.provincia_montaje ?? lead.provincia,
            direccion: lead.direccion,
            atencion_de: lead.nombre_completo || lead.nombre,
          }
        : undefined,
    leadSinAgregarData:
      oferta.tipo === "personalizada" && oferta.nombre_lead_sin_agregar
        ? {
            nombre: oferta.nombre_lead_sin_agregar,
            atencion_de: oferta.nombre_lead_sin_agregar,
          }
        : undefined,
    ofertaData: {
      numero_oferta: oferta.numero_oferta || oferta.id,
      nombre_oferta: oferta.nombre_completo || oferta.nombre,
      tipo_oferta: oferta.tipo === "generica" ? "Genérica" : "Personalizada",
      estado: etiquetaEstadoOferta(oferta.estado),
    },
    incluirFotos: true,
    fotosMap,
    componentesPrincipales,
    terminosCondiciones: (() => {
      console.log(
        "📄 Pasando términos a exportOptionsCompleto:",
        terminosCondicionesExport
          ? "SÍ (" + terminosCondicionesExport.length + " caracteres)"
          : "NO",
      );
      return terminosCondicionesExport || undefined;
    })(),
    seccionesPersonalizadas: seccionesPersonalizadasOferta.filter(
      (s: any) =>
        s.tipo === "extra" &&
        (s.tipo_extra === "escritura" || s.tipo_extra === "costo"),
    ),
  };

  // EXPORTACIÓN SIN PRECIOS
  const rowsSinPrecios: any[] = [];
  itemsOrdenados.forEach((item) => {
    // Buscar el label de la sección (puede ser estándar o personalizada)
    let seccionLabel = seccionLabelMap.get(item.seccion) ?? item.seccion;

    // Si no está en el mapa estándar, buscar en secciones personalizadas
    if (
      seccionLabel === item.seccion &&
      seccionesPersonalizadasOferta.length > 0
    ) {
      const seccionPersonalizada = seccionesPersonalizadasOferta.find(
        (s: any) => s.id === item.seccion,
      );
      if (seccionPersonalizada) {
        seccionLabel = seccionPersonalizada.label;
      }
    }

    // Buscar el nombre del material
    const material = materialesMap.get(item.material_codigo?.toString());
    const nombreMaterial = material?.nombre || item.descripcion;

    const esCableado =
      item.seccion === "CABLEADO_AC" || item.seccion === "CABLEADO_DC";
    rowsSinPrecios.push({
      material_codigo: item.material_codigo,
      seccion: seccionLabel,
      tipo: "Material",
      descripcion: nombreMaterial,
      cantidad: esCableado ? `hasta ${item.cantidad}` : item.cantidad,
    });
  });

  // Agregar secciones personalizadas de tipo costo (sin precios)
  if (seccionesPersonalizadasOferta.length > 0) {
    seccionesPersonalizadasOferta.forEach((seccion: any) => {
      if (
        seccion.tipo === "extra" &&
        seccion.tipo_extra === "costo" &&
        seccion.costos_extras
      ) {
        seccion.costos_extras.forEach((costo: any) => {
          rowsSinPrecios.push({
            material_codigo: "",
            seccion: seccion.label,
            tipo: "Costo extra",
            descripcion: costo.descripcion,
            cantidad: costo.cantidad,
          });
        });
      }
    });
  }

  // Agregar fila de total de materiales (sin precio en exportación sin precios)
  rowsSinPrecios.push({
    material_codigo: "",
    seccion: "Totales",
    tipo: "Subtotal",
    descripcion: "Total de materiales",
    cantidad: "",
  });

  // Agregar servicio de instalación si existe
  console.log(
    "🔍 DEBUG SIN PRECIOS - Margen instalación:",
    oferta.margen_instalacion,
  );

  if (oferta.margen_instalacion && oferta.margen_instalacion > 0) {
    console.log("✅ Agregando servicio de instalación a rowsSinPrecios");
    rowsSinPrecios.push({
      material_codigo: "",
      seccion: "Servicios",
      tipo: "Servicio",
      descripcion: "Costo de instalación y puesta en marcha",
      cantidad: 1,
    });
  }

  // Agregar transportación con su valor
  if (oferta.costo_transportacion && oferta.costo_transportacion > 0) {
    rowsSinPrecios.push({
      material_codigo: "",
      seccion: "Logística",
      tipo: "Transportación",
      descripcion: "Costo de transportación",
      cantidad: 1,
      total: oferta.costo_transportacion.toFixed(2),
    });
  }

  // Agregar contribución con su valor
  if (oferta.aplica_contribucion && oferta.porcentaje_contribucion) {
    const totalesCalc = calcularTotalesDetalle(oferta);
    rowsSinPrecios.push({
      material_codigo: "",
      seccion: "Contribución",
      tipo: "Contribucion",
      descripcion: `Contribución (${oferta.porcentaje_contribucion}%)`,
      cantidad: 1,
      total: totalesCalc.contribucion.toFixed(2),
    });
  }

  // Agregar descuento con su valor
  if (oferta.descuento_porcentaje && oferta.descuento_porcentaje > 0) {
    const montoDescuento = oferta.monto_descuento || 0;
    rowsSinPrecios.push({
      material_codigo: "",
      seccion: "Descuento",
      tipo: "Descuento",
      descripcion: `Descuento aplicado (${oferta.descuento_porcentaje}%)`,
      cantidad: 1,
      total: `- ${montoDescuento.toFixed(2)}`,
    });
  }

  rowsSinPrecios.push({
    material_codigo: "",
    seccion: "Totales",
    tipo: "TOTAL",
    descripcion: "Precio Total",
    cantidad: "",
    total: precioFinalMonedaPago.toFixed(2),
  });
  rowsSinPrecios.push(...filasDescuentoPdf(false, true));

  // Datos de pago para sin precios
  if (
    oferta.pago_transferencia ||
    oferta.aplica_contribucion ||
    (oferta.moneda_pago !== "USD" && tasaCambioNumero > 0)
  ) {
    if (oferta.pago_transferencia) {
      rowsSinPrecios.push({
        material_codigo: "",
        seccion: "PAGO",
        tipo: "Info",
        descripcion: "✓ Pago por transferencia",
        cantidad: "",
      });

      if (oferta.datos_cuenta) {
        rowsSinPrecios.push({
          material_codigo: "",
          seccion: "PAGO",
          tipo: "Datos",
          descripcion: "Datos de la cuenta",
          cantidad: "",
          total: oferta.datos_cuenta,
        });
      }
    }

    if (oferta.aplica_contribucion && oferta.porcentaje_contribucion) {
      rowsSinPrecios.push({
        material_codigo: "",
        seccion: "PAGO",
        tipo: "Info",
        descripcion: `✓ Aplicar ${oferta.porcentaje_contribucion}% de Contribución`,
        cantidad: "",
      });
    }

    rowsSinPrecios.push({
      material_codigo: "",
      seccion: "PAGO",
      tipo: "TOTAL",
      descripcion: "Precio Final",
      cantidad: "",
      total: precioFinalMonedaPago.toFixed(2),
    });
    rowsSinPrecios.push(...filasDescuentoPdf(false, true));

    const totalesCalc = calcularTotalesDetalle(oferta);
    // La nota del redondeo va en USD; en un documento ya convertido confunde.
    if (Math.abs(totalesCalc.redondeo) > 0.01 && !tieneMonedaCambio) {
      rowsSinPrecios.push({
        material_codigo: "",
        seccion: "PAGO",
        tipo: "Nota",
        descripcion: `(Redondeado desde ${totalesCalc.totalSinRedondeo.toFixed(2)} $)`,
        cantidad: "",
      });
    }

    if (tieneMonedaCambio) {
      const simboloMoneda = oferta.moneda_pago === "EUR" ? "€" : "CUP";
      const nombreMoneda =
        oferta.moneda_pago === "EUR" ? "Euros (EUR)" : "Pesos Cubanos (CUP)";

      rowsSinPrecios.push({
        material_codigo: "",
        seccion: "PAGO",
        tipo: "Info",
        descripcion: "Moneda de pago",
        cantidad: "",
        total: nombreMoneda,
      });

      // Sin fila "Tasa": al cliente se le da el importe en su moneda, no el
      // tipo de cambio con el que se calculó. Sigue estando en la exportación
      // completa, que es la interna.

      rowsSinPrecios.push({
        material_codigo: "",
        seccion: "PAGO",
        tipo: "Conversión",
        descripcion: `Precio en ${oferta.moneda_pago}`,
        cantidad: "",
        total: `${montoConvertido.toFixed(2)} ${simboloMoneda}`,
      });
    }
  }

  const exportOptionsSinPrecios = {
    title: "Oferta - Cliente sin precios",
    subtitle:
      oferta.nombre_completo &&
      oferta.nombre_completo !== "0.00" &&
      isNaN(Number(oferta.nombre_completo))
        ? oferta.nombre_completo
        : oferta.nombre,
    columns: [
      { header: "Material", key: "descripcion", width: 60 },
      { header: "Cant", key: "cantidad", width: 10 },
    ],
    // Sin precios no lleva columna de importes, pero el bloque de pago sí trae
    // el precio final: va en la moneda acordada con el cliente.
    data: convertirFilasAMonedaPago(rowsSinPrecios),
    logoUrl: "/brand/suncar-v1-iso.png",
    clienteData:
      oferta.tipo === "personalizada" && cliente
        ? {
            numero: cliente.numero || cliente.id,
            nombre: cliente.nombre,
            carnet_identidad: cliente.carnet_identidad,
            telefono: cliente.telefono,
            provincia_montaje: cliente.provincia_montaje,
            direccion: cliente.direccion,
            atencion_de: cliente.nombre,
          }
        : undefined,
    leadData:
      oferta.tipo === "personalizada" && lead
        ? {
            id: lead.id,
            nombre: lead.nombre_completo || lead.nombre,
            telefono: lead.telefono,
            email: lead.email,
            provincia: lead.provincia_montaje ?? lead.provincia,
            direccion: lead.direccion,
            atencion_de: lead.nombre_completo || lead.nombre,
          }
        : undefined,
    leadSinAgregarData:
      oferta.tipo === "personalizada" && oferta.nombre_lead_sin_agregar
        ? {
            nombre: oferta.nombre_lead_sin_agregar,
            atencion_de: oferta.nombre_lead_sin_agregar,
          }
        : undefined,
    ofertaData: {
      numero_oferta: oferta.numero_oferta || oferta.id,
      nombre_oferta: oferta.nombre_completo || oferta.nombre,
      tipo_oferta: oferta.tipo === "generica" ? "Genérica" : "Personalizada",
      estado: etiquetaEstadoOferta(oferta.estado),
    },
    incluirFotos: true,
    fotosMap,
    sinPrecios: true,
    // Aunque no lleve columna de importes, el bloque de precio final sí los
    // pinta, y sin esto salían convertidos a euros pero rotulados con "$".
    simboloMoneda: tieneMonedaCambio ? simboloMonedaCambio : "$",
    codigoMoneda: codigoMonedaCambio,
    componentesPrincipales,
    terminosCondiciones: terminosCondicionesExport || undefined,
    seccionesPersonalizadas: seccionesPersonalizadasOferta.filter(
      (s: any) =>
        s.tipo === "extra" &&
        (s.tipo_extra === "escritura" || s.tipo_extra === "costo"),
    ),
  };

  // EXPORTACIÓN CLIENTE CON PRECIOS
  const rowsClienteConPrecios: any[] = [];
  itemsOrdenados.forEach((item) => {
    // Buscar el label de la sección (puede ser estándar o personalizada)
    let seccionLabel = seccionLabelMap.get(item.seccion) ?? item.seccion;

    // Si no está en el mapa estándar, buscar en secciones personalizadas
    if (
      seccionLabel === item.seccion &&
      seccionesPersonalizadasOferta.length > 0
    ) {
      const seccionPersonalizada = seccionesPersonalizadasOferta.find(
        (s: any) => s.id === item.seccion,
      );
      if (seccionPersonalizada) {
        seccionLabel = seccionPersonalizada.label;
      }
    }

    // Calcular el total con margen incluido
    const margenAsignado = (item as any).margen_asignado || 0;
    const costoItem = item.precio * item.cantidad;
    const totalConMargen = costoItem + margenAsignado;

    // Buscar el nombre del material
    const material = materialesMap.get(item.material_codigo?.toString());
    const nombreMaterial = material?.nombre || item.descripcion;

    const esCableado =
      item.seccion === "CABLEADO_AC" || item.seccion === "CABLEADO_DC";
    rowsClienteConPrecios.push({
      material_codigo: item.material_codigo,
      seccion: seccionLabel,
      tipo: "Material",
      descripcion: nombreMaterial,
      cantidad: esCableado ? `hasta ${item.cantidad}` : item.cantidad,
      total: totalConMargen.toFixed(2),
    });
  });

  // Calcular total de materiales para cliente con precios
  const totalMaterialesCliente = itemsOrdenados.reduce((sum, item) => {
    const margenAsignado = (item as any).margen_asignado || 0;
    const costoItem = item.precio * item.cantidad;
    return sum + costoItem + margenAsignado;
  }, 0);

  // Calcular total de costos extras para cliente con precios
  let totalCostosExtrasCliente = 0;
  if (seccionesPersonalizadasOferta.length > 0) {
    seccionesPersonalizadasOferta.forEach((seccion: any) => {
      if (
        seccion.tipo === "extra" &&
        seccion.tipo_extra === "costo" &&
        seccion.costos_extras
      ) {
        seccion.costos_extras.forEach((costo: any) => {
          totalCostosExtrasCliente += costo.cantidad * costo.precio_unitario;
        });
      }
    });
  }

  // Agregar secciones personalizadas de tipo costo
  if (seccionesPersonalizadasOferta.length > 0) {
    seccionesPersonalizadasOferta.forEach((seccion: any) => {
      if (
        seccion.tipo === "extra" &&
        seccion.tipo_extra === "costo" &&
        seccion.costos_extras
      ) {
        seccion.costos_extras.forEach((costo: any) => {
          rowsClienteConPrecios.push({
            material_codigo: "",
            seccion: seccion.label,
            tipo: "Costo extra",
            descripcion: costo.descripcion,
            cantidad: costo.cantidad,
            total: (costo.cantidad * costo.precio_unitario).toFixed(2),
          });
        });
      }
    });
  }

  // Agregar fila de total de materiales
  rowsClienteConPrecios.push({
    material_codigo: "",
    seccion: "Totales",
    tipo: "Subtotal",
    descripcion: "Total de materiales",
    cantidad: "",
    total: totalMaterialesCliente.toFixed(2),
  });

  // Agregar total de costos extras si hay
  if (totalCostosExtrasCliente > 0) {
    rowsClienteConPrecios.push({
      material_codigo: "",
      seccion: "Totales",
      tipo: "Subtotal",
      descripcion: "Total costos extras",
      cantidad: "",
      total: totalCostosExtrasCliente.toFixed(2),
    });
  }

  // Agregar servicio de instalación si existe
  console.log(
    "🔍 DEBUG CLIENTE PRECIOS - Margen instalación:",
    oferta.margen_instalacion,
  );

  if (oferta.margen_instalacion && oferta.margen_instalacion > 0) {
    console.log(
      "✅ Agregando servicio de instalación a rowsClienteConPrecios",
    );
    rowsClienteConPrecios.push({
      material_codigo: "",
      seccion: "Servicios",
      tipo: "Servicio",
      descripcion: "Costo de instalación y puesta en marcha",
      cantidad: 1,
      total: oferta.margen_instalacion.toFixed(2),
    });
  }

  if (oferta.costo_transportacion && oferta.costo_transportacion > 0) {
    rowsClienteConPrecios.push({
      material_codigo: "",
      seccion: "Logística",
      tipo: "Transportación",
      descripcion: "Costo de transportación",
      cantidad: 1,
      total: oferta.costo_transportacion.toFixed(2),
    });
  }

  // Agregar contribución si aplica
  if (oferta.aplica_contribucion && oferta.porcentaje_contribucion) {
    const totalesCalc = calcularTotalesDetalle(oferta);
    rowsClienteConPrecios.push({
      material_codigo: "",
      seccion: "Contribución",
      tipo: "Contribucion",
      descripcion: `Contribución (${oferta.porcentaje_contribucion}%)`,
      cantidad: 1,
      total: totalesCalc.contribucion.toFixed(2),
    });
  }

  // Agregar descuento si aplica
  if (oferta.descuento_porcentaje && oferta.descuento_porcentaje > 0) {
    const montoDescuento = oferta.monto_descuento || 0;
    rowsClienteConPrecios.push({
      material_codigo: "",
      seccion: "Descuento",
      tipo: "Descuento",
      descripcion: `Descuento aplicado (${oferta.descuento_porcentaje}%)`,
      cantidad: 1,
      total: `- ${montoDescuento.toFixed(2)}`,
    });
  }

  rowsClienteConPrecios.push({
    material_codigo: "",
    seccion: "Totales",
    tipo: "TOTAL",
    descripcion: "PRECIO TOTAL",
    cantidad: "",
    total: precioFinalMonedaPago.toFixed(2),
  });
  rowsClienteConPrecios.push(...filasDescuentoPdf(false, true));

  // Datos de pago para cliente con precios
  if (
    oferta.pago_transferencia ||
    oferta.aplica_contribucion ||
    (oferta.moneda_pago !== "USD" && tasaCambioNumero > 0)
  ) {
    if (oferta.pago_transferencia) {
      rowsClienteConPrecios.push({
        descripcion: "✓ Pago por transferencia",
        cantidad: "",
        seccion: "PAGO",
        tipo: "Info",
      });

      if (oferta.datos_cuenta) {
        rowsClienteConPrecios.push({
          descripcion: "Datos de la cuenta",
          cantidad: "",
          total: oferta.datos_cuenta,
          seccion: "PAGO",
          tipo: "Datos",
        });
      }
    }

    if (oferta.aplica_contribucion && oferta.porcentaje_contribucion) {
      const totalesCalc = calcularTotalesDetalle(oferta);

      rowsClienteConPrecios.push({
        descripcion: `✓ Aplicar ${oferta.porcentaje_contribucion}% de Contribución`,
        cantidad: "",
        seccion: "PAGO",
        tipo: "Info",
      });

      rowsClienteConPrecios.push({
        descripcion: "Contribución",
        cantidad: "",
        total: totalesCalc.contribucion.toFixed(2),
        seccion: "PAGO",
        tipo: "Monto",
      });
    }

    rowsClienteConPrecios.push({
      descripcion: "Precio Final",
      cantidad: "",
      total: precioFinalMonedaPago.toFixed(2),
      seccion: "PAGO",
      tipo: "TOTAL",
    });
    rowsClienteConPrecios.push(...filasDescuentoPdf(false, true));

    const totalesCalc = calcularTotalesDetalle(oferta);
    // La nota del redondeo va en USD; en un documento ya convertido confunde.
    if (Math.abs(totalesCalc.redondeo) > 0.01 && !tieneMonedaCambio) {
      rowsClienteConPrecios.push({
        descripcion: `(Redondeado desde ${totalesCalc.totalSinRedondeo.toFixed(2)} $)`,
        cantidad: "",
        seccion: "PAGO",
        tipo: "Nota",
      });
    }

    if (tieneMonedaCambio) {
      const simboloMoneda = oferta.moneda_pago === "EUR" ? "€" : "CUP";
      const nombreMoneda =
        oferta.moneda_pago === "EUR" ? "Euros (EUR)" : "Pesos Cubanos (CUP)";

      rowsClienteConPrecios.push({
        descripcion: "Moneda de pago",
        cantidad: "",
        total: nombreMoneda,
        seccion: "PAGO",
        tipo: "Info",
      });

      // Sin fila "Tasa": ver la nota en la exportación sin precios.

      rowsClienteConPrecios.push({
        descripcion: `Precio en ${oferta.moneda_pago}`,
        cantidad: "",
        total: `${montoConvertido.toFixed(2)} ${simboloMoneda}`,
        seccion: "PAGO",
        tipo: "Conversión",
      });
    }
  }

  const exportOptionsClienteConPrecios = {
    title: "Oferta - Cliente con precios",
    subtitle:
      oferta.nombre_completo &&
      oferta.nombre_completo !== "0.00" &&
      isNaN(Number(oferta.nombre_completo))
        ? oferta.nombre_completo
        : oferta.nombre,
    columns: [
      { header: "Material", key: "descripcion", width: 50 },
      { header: "Cant", key: "cantidad", width: 10 },
      { header: `Total (${codigoMonedaCambio})`, key: "total", width: 15 },
    ],
    // Los importes van en la moneda con la que se guardó la oferta. Antes esto
    // salía siempre en USD y el importe en la moneda acordada solo aparecía
    // como una línea suelta al final del PDF.
    data: convertirFilasAMonedaPago(rowsClienteConPrecios),
    logoUrl: "/brand/suncar-v1-iso.png",
    clienteData:
      oferta.tipo === "personalizada" && cliente
        ? {
            numero: cliente.numero || cliente.id,
            nombre: cliente.nombre,
            carnet_identidad: cliente.carnet_identidad,
            telefono: cliente.telefono,
            provincia_montaje: cliente.provincia_montaje,
            direccion: cliente.direccion,
            atencion_de: cliente.nombre,
          }
        : undefined,
    leadData:
      oferta.tipo === "personalizada" && lead
        ? {
            id: lead.id,
            nombre: lead.nombre_completo || lead.nombre,
            telefono: lead.telefono,
            email: lead.email,
            provincia: lead.provincia_montaje ?? lead.provincia,
            direccion: lead.direccion,
            atencion_de: lead.nombre_completo || lead.nombre,
          }
        : undefined,
    leadSinAgregarData:
      oferta.tipo === "personalizada" && oferta.nombre_lead_sin_agregar
        ? {
            nombre: oferta.nombre_lead_sin_agregar,
            atencion_de: oferta.nombre_lead_sin_agregar,
          }
        : undefined,
    ofertaData: {
      numero_oferta: oferta.numero_oferta || oferta.id,
      nombre_oferta: oferta.nombre_completo || oferta.nombre,
      tipo_oferta: oferta.tipo === "generica" ? "Genérica" : "Personalizada",
      estado: etiquetaEstadoOferta(oferta.estado),
    },
    incluirFotos: true,
    fotosMap,
    conPreciosCliente: true,
    simboloMoneda: tieneMonedaCambio ? simboloMonedaCambio : "$",
    codigoMoneda: codigoMonedaCambio,
    componentesPrincipales,
    terminosCondiciones: terminosCondicionesExport || undefined,
    seccionesPersonalizadas: seccionesPersonalizadasOferta.filter(
      (s: any) =>
        s.tipo === "extra" &&
        (s.tipo_extra === "escritura" || s.tipo_extra === "costo"),
    ),
  };

  return {
    exportOptionsCompleto,
    exportOptionsSinPrecios,
    exportOptionsClienteConPrecios,
    baseFilename,
  };
}
