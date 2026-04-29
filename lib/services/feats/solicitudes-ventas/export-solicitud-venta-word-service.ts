import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  AlignmentType,
  BorderStyle,
  WidthType,
  ImageRun,
  ShadingType,
  VerticalAlign,
  TableLayoutType,
  LineRuleType,
} from "docx";
import type { SolicitudVenta } from "@/lib/api-types";

// ─── Constantes globales ─────────────────────────────────────────────────────

const EMPRESA_NOMBRE = "MPM SOLARCARRO S.R.L";
const EMPRESA_NIT = "50004469717";
const EMPRESA_DIRECCION =
  "Zapata e/A y B, #1453, Plaza de la Revolución, La Habana";
const LUGAR_EMISION =
  "30 y 17, Vedado, Municipio Plaza, Provincia La Habana";

// Tipografía: Arial 12pt = 24 half-points
const FONT = "Arial";
const SZ = 24;           // 12 pt  – cuerpo general
const SZ_SM = 22;        // 11 pt  – celdas secundarias
const SZ_TITLE = 36;     // 18 pt  – título del documento
const SZ_SECTION = 26;   // 13 pt  – encabezados de sección

// Interlineado 1.5 en unidades twip (240 = simple, 360 = 1.5, 480 = doble)
const LINE_SPACING = { line: 360, lineRule: LineRuleType.AUTO };

// Espaciado entre párrafos
const SP = { before: 120, after: 120, ...LINE_SPACING };   // cuerpo normal
const SP_TIGHT = { before: 60, after: 60, ...LINE_SPACING }; // dentro de celdas
const SP_LOOSE = { before: 200, after: 100, ...LINE_SPACING }; // antes de secciones

// Colores
const COLOR_HEADER_BG = "1F4E79";   // azul oscuro para encabezados de sección
const COLOR_HEADER_TEXT = "FFFFFF"; // blanco
const COLOR_ROW_ALT = "EEF4FB";    // azul muy claro para filas alternas
const COLOR_BORDER = "A0AEBE";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (date: Date): string =>
  date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const downloadDocx = async (doc: Document, filename: string): Promise<void> => {
  const buffer = await Packer.toBlob(doc);
  const url = window.URL.createObjectURL(buffer);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
};

const loadLogoArrayBuffer = async (): Promise<ArrayBuffer | null> => {
  for (const src of ["/logo Solarcarro.png", "/logo Suncar.png", "/logo.png"]) {
    try {
      const res = await fetch(src);
      if (!res.ok) continue;
      return await res.arrayBuffer();
    } catch {
      /* intentional */
    }
  }
  return null;
};

// Bordes
const noBorder = {
  top:    { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left:   { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right:  { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};

const thinBorder = {
  top:    { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
  left:   { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
  right:  { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
};

// Shading helpers
const shadingDark = { type: ShadingType.SOLID, color: COLOR_HEADER_BG,  fill: COLOR_HEADER_BG };
const shadingAlt  = { type: ShadingType.SOLID, color: COLOR_ROW_ALT,    fill: COLOR_ROW_ALT };

// ─── Builders de celda ───────────────────────────────────────────────────────

/** Celda de encabezado de sección (fondo azul, texto blanco, centrado) */
const headerCell = (text: string, colSpan = 1) =>
  new TableCell({
    borders: thinBorder,
    shading: shadingDark,
    verticalAlign: VerticalAlign.CENTER,
    columnSpan: colSpan,
    margins: { top: 100, bottom: 100, left: 140, right: 140 },
    children: [
      new Paragraph({
        children: [
          new TextRun({ text, bold: true, size: SZ_SECTION, font: FONT, color: COLOR_HEADER_TEXT }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: SP_TIGHT,
      }),
    ],
  });

/** Celda con etiqueta en negrita y valor */
const fieldCell = (label: string, value: string, alt = false) =>
  new TableCell({
    borders: thinBorder,
    shading: alt ? shadingAlt : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 80, bottom: 80, left: 140, right: 140 },
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: `${label}: `, bold: true, size: SZ_SM, font: FONT }),
          new TextRun({ text: value || "-", size: SZ_SM, font: FONT }),
        ],
        spacing: SP_TIGHT,
      }),
    ],
  });

/** Celda para rellenar a mano */
const blankCell = (label: string) =>
  new TableCell({
    borders: thinBorder,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 80, bottom: 80, left: 140, right: 140 },
    children: [
      new Paragraph({
        children: [new TextRun({ text: `${label}:`, bold: true, size: SZ_SM, font: FONT })],
        spacing: { before: 60, after: 40, ...LINE_SPACING },
      }),
      new Paragraph({
        children: [new TextRun({ text: "_".repeat(38), size: SZ_SM, font: FONT, color: "666666" })],
        spacing: { before: 40, after: 60, ...LINE_SPACING },
      }),
    ],
  });

/** Celda de tabla de mercancías – encabezado */
const mercHeaderCell = (text: string) =>
  new TableCell({
    borders: thinBorder,
    shading: shadingDark,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, size: SZ_SM, font: FONT, color: COLOR_HEADER_TEXT })],
        alignment: AlignmentType.CENTER,
        spacing: SP_TIGHT,
      }),
    ],
  });

/** Celda de tabla de mercancías – dato */
const mercDataCell = (text: string, centered = false, alt = false) =>
  new TableCell({
    borders: thinBorder,
    shading: alt ? shadingAlt : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    children: [
      new Paragraph({
        children: [new TextRun({ text, size: SZ_SM, font: FONT })],
        alignment: centered ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: SP_TIGHT,
      }),
    ],
  });

// ─── Header del documento (logo esquina izquierda + título derecha) ───────────

const buildDocHeader = (
  logoBuffer: ArrayBuffer | null,
  title: string,
  subtitle?: string,
): Table =>
  new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          // Columna izquierda: logo
          new TableCell({
            borders: noBorder,
            width: { size: 22, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            children: logoBuffer
              ? [
                  new Paragraph({
                    children: [
                      new ImageRun({
                        data: logoBuffer,
                        transformation: { width: 120, height: 80 },
                        type: "png",
                      }),
                    ],
                    alignment: AlignmentType.LEFT,
                    spacing: { before: 0, after: 0 },
                  }),
                ]
              : [new Paragraph({ children: [] })],
          }),
          // Columna derecha: título del documento
          new TableCell({
            borders: noBorder,
            width: { size: 78, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: title, bold: true, size: SZ_TITLE, font: FONT, color: "1F4E79" }),
                ],
                alignment: AlignmentType.RIGHT,
                spacing: { before: 0, after: subtitle ? 40 : 0, ...LINE_SPACING },
              }),
              ...(subtitle
                ? [
                    new Paragraph({
                      children: [
                        new TextRun({ text: subtitle, size: SZ_SM, font: FONT, color: "555555", italics: true }),
                      ],
                      alignment: AlignmentType.RIGHT,
                      spacing: { before: 0, after: 0, ...LINE_SPACING },
                    }),
                  ]
                : []),
            ],
          }),
        ],
      }),
    ],
  });

// Línea divisora elegante (párrafo con borde inferior)
const divider = () =>
  new Paragraph({
    children: [],
    spacing: { before: 40, after: 200 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: COLOR_HEADER_BG },
    },
  });

// Párrafo de cuerpo estándar
const bodyParagraph = (runs: TextRun[], alignment = AlignmentType.LEFT) =>
  new Paragraph({ children: runs, alignment, spacing: SP });

// Párrafo de sección (título sin tabla)
const sectionHeading = (text: string) =>
  new Paragraph({
    children: [new TextRun({ text, bold: true, size: SZ_SECTION, font: FONT, color: "1F4E79" })],
    spacing: SP_LOOSE,
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_HEADER_BG } },
  });

// ══════════════════════════════════════════════════════════════════════════════
//  CONDUCE LEGAL
// ══════════════════════════════════════════════════════════════════════════════

export async function generarConduceLegal(solicitud: SolicitudVenta): Promise<void> {
  const logoBuffer = await loadLogoArrayBuffer();
  const cliente = solicitud.cliente_venta;
  const materiales = solicitud.materiales || [];
  const today = formatDate(new Date());
  const codigo = solicitud.codigo || solicitud.id.slice(-6).toUpperCase();

  // ── Encabezado ──
  const docHeader = buildDocHeader(logoBuffer, "CONDUCE LEGAL DE MERCANCÍA", `Código: ${codigo}`);

  // ── Empresa ──
  const empresaTable = new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [headerCell("DATOS DE LA EMPRESA", 2)] }),
      new TableRow({
        children: [
          fieldCell("Empresa", EMPRESA_NOMBRE, false),
          fieldCell("NIT", EMPRESA_NIT, false),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            borders: thinBorder,
            shading: shadingAlt,
            columnSpan: 2,
            margins: { top: 80, bottom: 80, left: 140, right: 140 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "Dirección: ", bold: true, size: SZ_SM, font: FONT }),
                  new TextRun({ text: EMPRESA_DIRECCION, size: SZ_SM, font: FONT }),
                ],
                spacing: SP_TIGHT,
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // ── Destinatario ──
  const destinatarioTable = new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [headerCell("DATOS DEL DESTINATARIO", 2)] }),
      new TableRow({
        children: [
          fieldCell("Nombre", cliente?.nombre || "-", false),
          fieldCell("CI", cliente?.ci || "-", false),
        ],
      }),
      new TableRow({
        children: [
          fieldCell("Dirección", cliente?.direccion || "-", true),
          fieldCell("Teléfono", cliente?.telefono || "-", true),
        ],
      }),
    ],
  });

  // ── Transporte ──
  const transporteTable = new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [headerCell("DATOS DEL TRANSPORTE", 2)] }),
      new TableRow({
        children: [blankCell("Nombre del conductor"), blankCell("CI")],
      }),
      new TableRow({
        children: [blankCell("Destino"), blankCell("Placa del vehículo")],
      }),
    ],
  });

  // ── Mercancía ──
  const mercanciaRows =
    materiales.length > 0
      ? materiales.map((m, i) =>
          new TableRow({
            children: [
              mercDataCell(
                m.material?.descripcion || m.material_descripcion || m.descripcion || "-",
                false,
                i % 2 === 1,
              ),
              mercDataCell(m.um || m.material?.um || "-", true, i % 2 === 1),
              mercDataCell(String(m.cantidad ?? "-"), true, i % 2 === 1),
            ],
          }),
        )
      : [
          new TableRow({
            children: [
              new TableCell({
                borders: thinBorder,
                columnSpan: 3,
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: "Sin materiales", size: SZ_SM, font: FONT, italics: true })],
                    alignment: AlignmentType.CENTER,
                    spacing: SP_TIGHT,
                  }),
                ],
              }),
            ],
          }),
        ];

  const mercanciaTable = new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          mercHeaderCell("Descripción"),
          mercHeaderCell("Unidad de medida"),
          mercHeaderCell("Cantidad"),
        ],
      }),
      ...mercanciaRows,
    ],
  });

  // ── Pie de página ──
  const footer = [
    new Paragraph({ children: [], spacing: { before: 240, after: 0 } }),
    bodyParagraph([
      new TextRun({ text: "Fecha de emisión:  ", bold: true, size: SZ, font: FONT }),
      new TextRun({ text: today, size: SZ, font: FONT }),
    ]),
    bodyParagraph([
      new TextRun({ text: "Lugar de emisión:  ", bold: true, size: SZ, font: FONT }),
      new TextRun({ text: LUGAR_EMISION, size: SZ, font: FONT }),
    ]),
    new Paragraph({ children: [], spacing: { before: 200, after: 0 } }),
  ];

  const firmaTable = new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: noBorder,
            width: { size: 55, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [new TextRun({ text: "Personal autorizado:", bold: true, size: SZ, font: FONT })],
                spacing: { before: 60, after: 80, ...LINE_SPACING },
              }),
              new Paragraph({
                children: [new TextRun({ text: "_".repeat(45), size: SZ, font: FONT, color: "666666" })],
                spacing: { before: 0, after: 60, ...LINE_SPACING },
              }),
            ],
          }),
          new TableCell({
            borders: noBorder,
            width: { size: 45, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [new TextRun({ text: "Firma:", bold: true, size: SZ, font: FONT })],
                spacing: { before: 60, after: 80, ...LINE_SPACING },
              }),
              new Paragraph({
                children: [new TextRun({ text: "_".repeat(35), size: SZ, font: FONT, color: "666666" })],
                spacing: { before: 0, after: 60, ...LINE_SPACING },
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT, size: SZ },
        },
      },
    },
    sections: [
      {
        properties: {
          page: { margin: { top: 900, bottom: 900, left: 1200, right: 1200 } },
        },
        children: [
          docHeader,
          divider(),
          empresaTable,
          new Paragraph({ children: [], spacing: { before: 180, after: 0 } }),
          destinatarioTable,
          new Paragraph({ children: [], spacing: { before: 180, after: 0 } }),
          transporteTable,
          sectionHeading("DATOS DE LA MERCANCÍA"),
          mercanciaTable,
          ...footer,
          firmaTable,
        ],
      },
    ],
  });

  await downloadDocx(doc, `Conduce_Legal_${codigo}.docx`);
}

// ══════════════════════════════════════════════════════════════════════════════
//  CERTIFICADO DE GARANTÍA
// ══════════════════════════════════════════════════════════════════════════════

export async function generarCertificadoGarantia(solicitud: SolicitudVenta): Promise<void> {
  const logoBuffer = await loadLogoArrayBuffer();
  const cliente = solicitud.cliente_venta;
  const materiales = solicitud.materiales || [];
  const codigo = solicitud.codigo || solicitud.id.slice(-6).toUpperCase();

  // ── Encabezado ──
  const docHeader = buildDocHeader(logoBuffer, "CERTIFICADO DE GARANTÍA", `Código: ${codigo}`);

  // ── Intro ──
  const intro = bodyParagraph([
    new TextRun({
      text: "Por medio del presente certificado, SOLARCARRO S.R.L. garantiza a:",
      size: SZ,
      font: FONT,
    }),
  ]);

  // ── Datos del cliente ──
  const clienteTable = new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          fieldCell("Nombre", cliente?.nombre || "-", false),
          fieldCell("CI", cliente?.ci || "-", false),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            borders: thinBorder,
            shading: shadingAlt,
            columnSpan: 2,
            margins: { top: 80, bottom: 80, left: 140, right: 140 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "Dirección: ", bold: true, size: SZ_SM, font: FONT }),
                  new TextRun({ text: cliente?.direccion || "-", size: SZ_SM, font: FONT }),
                ],
                spacing: SP_TIGHT,
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            borders: thinBorder,
            columnSpan: 2,
            margins: { top: 80, bottom: 80, left: 140, right: 140 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "Firma del cliente: ", bold: true, size: SZ_SM, font: FONT }),
                  new TextRun({ text: "_".repeat(50), size: SZ_SM, font: FONT, color: "666666" }),
                ],
                spacing: SP_TIGHT,
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // ── Texto previo a productos ──
  const productosIntro = bodyParagraph([
    new TextRun({
      text: "La calidad y el correcto funcionamiento de los productos detallados a continuación:",
      size: SZ,
      font: FONT,
    }),
  ]);

  // ── Lista de productos expandida por cantidad ──
  const productoParagraphs: Paragraph[] = [];
  for (const m of materiales) {
    const desc =
      m.material?.descripcion || m.material_descripcion || m.descripcion || "-";
    const qty = m.cantidad || 1;
    for (let i = 0; i < qty; i++) {
      productoParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${desc}`, bold: true, size: SZ, font: FONT }),
          ],
          spacing: { before: 120, after: 40, ...LINE_SPACING },
          indent: { left: 200 },
          bullet: { level: 0 },
        }),
      );
      productoParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Código serie: ", bold: true, size: SZ_SM, font: FONT }),
            new TextRun({ text: "_".repeat(40), size: SZ_SM, font: FONT, color: "666666" }),
          ],
          spacing: { before: 40, after: 100, ...LINE_SPACING },
          indent: { left: 200 },
        }),
      );
    }
  }

  if (materiales.length === 0) {
    productoParagraphs.push(
      new Paragraph({
        children: [new TextRun({ text: "Sin productos registrados.", size: SZ, font: FONT, italics: true })],
        spacing: SP,
        indent: { left: 200 },
      }),
    );
  }

  // ── Condiciones ──
  const condiciones = [
    sectionHeading("CONDICIONES DE LA GARANTÍA"),
    new Paragraph({
      children: [
        new TextRun({
          text: "La presente garantía cubre defectos de fabricación y fallas de funcionamiento durante un período de ____ meses a partir de la fecha de compra.",
          size: SZ,
          font: FONT,
        }),
      ],
      spacing: SP,
      bullet: { level: 0 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "La garantía no cubre daños causados por mal uso, accidentes, manipulación indebida, desgaste natural o intervenciones no autorizadas, daños provocados por desastres naturales o variaciones de voltaje.",
          size: SZ,
          font: FONT,
        }),
      ],
      spacing: SP,
      bullet: { level: 0 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Para hacer efectiva la garantía, el cliente deberá presentar este certificado.",
          size: SZ,
          font: FONT,
        }),
      ],
      spacing: SP,
      bullet: { level: 0 },
    }),
    sectionHeading("PROCEDIMIENTO PARA RECLAMOS"),
    new Paragraph({
      children: [
        new TextRun({
          text: "Presentar este certificado, junto al equipo dañado.",
          size: SZ,
          font: FONT,
        }),
      ],
      spacing: SP,
      numbering: { reference: "claim-numbering", level: 0 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "El producto será evaluado en un plazo de hasta 7 días hábiles y, de proceder, reparado o reemplazado según corresponda.",
          size: SZ,
          font: FONT,
        }),
      ],
      spacing: SP,
      numbering: { reference: "claim-numbering", level: 0 },
    }),
    new Paragraph({ children: [], spacing: { before: 200, after: 0 } }),
    bodyParagraph([
      new TextRun({ text: "Fecha de emisión: ", bold: true, size: SZ, font: FONT }),
      new TextRun({ text: "_".repeat(22), size: SZ, font: FONT, color: "666666" }),
    ]),
    bodyParagraph([
      new TextRun({ text: "Nombre y apellidos del comercial: ", bold: true, size: SZ, font: FONT }),
      new TextRun({ text: "_".repeat(30), size: SZ, font: FONT, color: "666666" }),
      new TextRun({ text: "     Firma: ", bold: true, size: SZ, font: FONT }),
      new TextRun({ text: "_".repeat(15), size: SZ, font: FONT, color: "666666" }),
    ]),
  ];

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "claim-numbering",
          levels: [
            {
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: { indent: { left: 400, hanging: 260 } },
                run: { font: FONT, size: SZ },
              },
            },
          ],
        },
      ],
    },
    styles: {
      default: {
        document: { run: { font: FONT, size: SZ } },
      },
    },
    sections: [
      {
        properties: {
          page: { margin: { top: 900, bottom: 900, left: 1200, right: 1200 } },
        },
        children: [
          docHeader,
          divider(),
          intro,
          clienteTable,
          sectionHeading("PRODUCTOS GARANTIZADOS"),
          productosIntro,
          ...productoParagraphs,
          ...condiciones,
        ],
      },
    ],
  });

  await downloadDocx(doc, `Garantia_${codigo}.docx`);
}

// ══════════════════════════════════════════════════════════════════════════════

export async function generarAmbos(solicitud: SolicitudVenta): Promise<void> {
  await generarConduceLegal(solicitud);
  await generarCertificadoGarantia(solicitud);
}
