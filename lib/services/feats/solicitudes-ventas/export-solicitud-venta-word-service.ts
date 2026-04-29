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
  HeadingLevel,
  ImageRun,
  ShadingType,
  VerticalAlign,
  TableLayoutType,
} from "docx";
import type { SolicitudVenta } from "@/lib/api-types";

const EMPRESA_NOMBRE = "MPM SOLARCARRO S.R.L";
const EMPRESA_NIT = "50004469717";
const EMPRESA_DIRECCION =
  "Zapata e/A y B, #1453, Plaza de la Revolución, La Habana";
const LUGAR_EMISION =
  "30 y 17, Vedado, Municipio Plaza, Provincia La Habana";

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
  const candidates = ["/logo Solarcarro.png", "/logo Suncar.png", "/logo.png"];
  for (const src of candidates) {
    try {
      const res = await fetch(src);
      if (!res.ok) continue;
      return await res.arrayBuffer();
    } catch {
      // try next
    }
  }
  return null;
};

const noBorder = {
  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};

const thinBorder = {
  top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
  left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
  right: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
};

const headerShading = {
  type: ShadingType.SOLID,
  color: "D9D9D9",
  fill: "D9D9D9",
};

const boldCell = (text: string, shading = false) =>
  new TableCell({
    borders: thinBorder,
    shading: shading ? headerShading : undefined,
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, size: 20 })],
        spacing: { before: 40, after: 40 },
      }),
    ],
  });

const labelValueCell = (label: string, value: string) =>
  new TableCell({
    borders: thinBorder,
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: `${label}: `, bold: true, size: 20 }),
          new TextRun({ text: value || "-", size: 20 }),
        ],
        spacing: { before: 40, after: 40 },
      }),
    ],
  });

const emptySignCell = (label: string) =>
  new TableCell({
    borders: thinBorder,
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        children: [new TextRun({ text: `${label}: `, bold: true, size: 20 })],
        spacing: { before: 40, after: 40 },
      }),
      new Paragraph({
        children: [new TextRun({ text: "_".repeat(35), size: 20 })],
        spacing: { before: 20, after: 40 },
      }),
    ],
  });

const sectionTitle = (text: string) =>
  new Paragraph({
    children: [new TextRun({ text, bold: true, size: 22 })],
    spacing: { before: 160, after: 80 },
    shading: headerShading,
    indent: { left: 80 },
  });

// ─────────────────────────────────────────────
//  CONDUCE LEGAL
// ─────────────────────────────────────────────

export async function generarConduceLegal(
  solicitud: SolicitudVenta,
): Promise<void> {
  const logoBuffer = await loadLogoArrayBuffer();
  const cliente = solicitud.cliente_venta;
  const materiales = solicitud.materiales || [];
  const today = formatDate(new Date());

  const headerParagraphs: Paragraph[] = [];

  if (logoBuffer) {
    headerParagraphs.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: logoBuffer,
            transformation: { width: 90, height: 60 },
            type: "png",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 80 },
      }),
    );
  }

  headerParagraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "CONDUCE LEGAL DE MERCANCÍA",
          bold: true,
          size: 32,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 160 },
    }),
  );

  // Datos empresa
  const empresaTable = new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: thinBorder,
            shading: headerShading,
            columnSpan: 2,
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "DATOS DE LA EMPRESA",
                    bold: true,
                    size: 22,
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 40, after: 40 },
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          labelValueCell("Empresa", EMPRESA_NOMBRE),
          labelValueCell("NIT", EMPRESA_NIT),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            borders: thinBorder,
            columnSpan: 2,
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "Dirección: ", bold: true, size: 20 }),
                  new TextRun({ text: EMPRESA_DIRECCION, size: 20 }),
                ],
                spacing: { before: 40, after: 40 },
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // Datos destinatario
  const destinatarioTable = new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: thinBorder,
            shading: headerShading,
            columnSpan: 2,
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "DATOS DEL DESTINATARIO",
                    bold: true,
                    size: 22,
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 40, after: 40 },
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          labelValueCell("Nombre", cliente?.nombre || "-"),
          labelValueCell("CI", cliente?.ci || "-"),
        ],
      }),
      new TableRow({
        children: [
          labelValueCell("Dirección", cliente?.direccion || "-"),
          labelValueCell("Teléfono", cliente?.telefono || "-"),
        ],
      }),
    ],
  });

  // Datos transporte
  const transporteTable = new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: thinBorder,
            shading: headerShading,
            columnSpan: 2,
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "DATOS DEL TRANSPORTE",
                    bold: true,
                    size: 22,
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 40, after: 40 },
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          emptySignCell("Nombre del conductor"),
          emptySignCell("CI"),
        ],
      }),
      new TableRow({
        children: [
          emptySignCell("Destino"),
          emptySignCell("Placa del vehículo"),
        ],
      }),
    ],
  });

  // Datos de la mercancía
  const mercanciaHeaderRow = new TableRow({
    children: [
      boldCell("Descripción", true),
      boldCell("Unidad de medida", true),
      boldCell("Cantidad", true),
    ],
  });

  const mercanciaRows =
    materiales.length > 0
      ? materiales.map(
          (m) =>
            new TableRow({
              children: [
                new TableCell({
                  borders: thinBorder,
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text:
                            m.material?.descripcion ||
                            m.material_descripcion ||
                            m.descripcion ||
                            "-",
                          size: 20,
                        }),
                      ],
                      spacing: { before: 40, after: 40 },
                    }),
                  ],
                }),
                new TableCell({
                  borders: thinBorder,
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: m.um || m.material?.um || "-",
                          size: 20,
                        }),
                      ],
                      alignment: AlignmentType.CENTER,
                      spacing: { before: 40, after: 40 },
                    }),
                  ],
                }),
                new TableCell({
                  borders: thinBorder,
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: String(m.cantidad ?? "-"),
                          size: 20,
                        }),
                      ],
                      alignment: AlignmentType.CENTER,
                      spacing: { before: 40, after: 40 },
                    }),
                  ],
                }),
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
                    children: [
                      new TextRun({ text: "Sin materiales", size: 20 }),
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 40, after: 40 },
                  }),
                ],
              }),
            ],
          }),
        ];

  const mercanciaTable = new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [mercanciaHeaderRow, ...mercanciaRows],
  });

  // Footer
  const footerParagraphs = [
    new Paragraph({ spacing: { before: 160, after: 0 }, children: [] }),
    new Paragraph({
      children: [
        new TextRun({ text: "Fecha de emisión: ", bold: true, size: 20 }),
        new TextRun({ text: today, size: 20 }),
      ],
      spacing: { before: 80, after: 40 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Lugar de emisión: ", bold: true, size: 20 }),
        new TextRun({ text: LUGAR_EMISION, size: 20 }),
      ],
      spacing: { before: 40, after: 80 },
    }),
    new Paragraph({ spacing: { before: 80, after: 0 }, children: [] }),
  ];

  // Firma
  const firmaTable = new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: noBorder,
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Personal autorizado:",
                    bold: true,
                    size: 20,
                  }),
                ],
                spacing: { before: 40, after: 40 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "_".repeat(40), size: 20 }),
                ],
                spacing: { before: 20, after: 40 },
              }),
            ],
          }),
          new TableCell({
            borders: noBorder,
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "Firma:", bold: true, size: 20 }),
                ],
                spacing: { before: 40, after: 40 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "_".repeat(40), size: 20 }),
                ],
                spacing: { before: 20, after: 40 },
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, bottom: 720, left: 1080, right: 1080 },
          },
        },
        children: [
          ...headerParagraphs,
          empresaTable,
          sectionTitle(""),
          destinatarioTable,
          sectionTitle(""),
          transporteTable,
          sectionTitle("DATOS DE LA MERCANCÍA"),
          mercanciaTable,
          ...footerParagraphs,
          firmaTable,
        ],
      },
    ],
  });

  const codigo =
    solicitud.codigo || solicitud.id.slice(-6).toUpperCase();
  await downloadDocx(doc, `Conduce_Legal_${codigo}.docx`);
}

// ─────────────────────────────────────────────
//  CERTIFICADO DE GARANTÍA
// ─────────────────────────────────────────────

export async function generarCertificadoGarantia(
  solicitud: SolicitudVenta,
): Promise<void> {
  const logoBuffer = await loadLogoArrayBuffer();
  const cliente = solicitud.cliente_venta;
  const materiales = solicitud.materiales || [];
  const today = formatDate(new Date());

  const headerParagraphs: Paragraph[] = [];

  if (logoBuffer) {
    headerParagraphs.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: logoBuffer,
            transformation: { width: 90, height: 60 },
            type: "png",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 80 },
      }),
    );
  }

  headerParagraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "CERTIFICADO DE GARANTÍA",
          bold: true,
          size: 32,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 120 },
    }),
  );

  // Intro texto
  const introParagraphs = [
    new Paragraph({
      children: [
        new TextRun({
          text: "Por medio del presente certificado, SOLARCARRO S.R.L. garantiza a:",
          size: 22,
        }),
      ],
      spacing: { before: 80, after: 120 },
    }),
  ];

  // Info cliente
  const clienteTable = new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          labelValueCell("Nombre", cliente?.nombre || "-"),
          labelValueCell("CI", cliente?.ci || "-"),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            borders: thinBorder,
            columnSpan: 2,
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "Dirección: ", bold: true, size: 20 }),
                  new TextRun({ text: cliente?.direccion || "-", size: 20 }),
                ],
                spacing: { before: 40, after: 40 },
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
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "Firma: ", bold: true, size: 20 }),
                  new TextRun({ text: "_".repeat(50), size: 20 }),
                ],
                spacing: { before: 40, after: 40 },
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // Texto productos
  const productosIntroParagraph = new Paragraph({
    children: [
      new TextRun({
        text: "La calidad y el correcto funcionamiento de los productos detallados a continuación:",
        size: 22,
      }),
    ],
    spacing: { before: 120, after: 80 },
  });

  // Expand items by quantity
  const productoParagraphs: Paragraph[] = [];
  for (const m of materiales) {
    const descripcion =
      m.material?.descripcion ||
      m.material_descripcion ||
      m.descripcion ||
      "-";
    const cantidad = m.cantidad || 1;
    for (let i = 0; i < cantidad; i++) {
      productoParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: `• ${descripcion}`, size: 20 }),
          ],
          spacing: { before: 60, after: 20 },
        }),
      );
      productoParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: "  Código: ", bold: true, size: 20 }),
            new TextRun({ text: "_".repeat(45), size: 20 }),
          ],
          spacing: { before: 20, after: 40 },
        }),
      );
    }
  }

  if (materiales.length === 0) {
    productoParagraphs.push(
      new Paragraph({
        children: [new TextRun({ text: "Sin productos", size: 20 })],
        spacing: { before: 40, after: 40 },
      }),
    );
  }

  // Condiciones
  const condicionesParagraphs = [
    new Paragraph({
      children: [
        new TextRun({ text: "CONDICIONES DE LA GARANTÍA:", bold: true, size: 22 }),
      ],
      spacing: { before: 160, after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "•\tLa presente garantía cubre defectos de fabricación y fallas de funcionamiento durante un período de ____ meses a partir de la fecha de compra.",
          size: 20,
        }),
      ],
      spacing: { before: 60, after: 60 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "•\tLa garantía no cubre daños causados por mal uso, accidentes, manipulación indebida, desgaste natural o intervenciones no autorizadas, daños provocados por desastres naturales o variaciones de voltaje.",
          size: 20,
        }),
      ],
      spacing: { before: 60, after: 60 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "•\tPara hacer efectiva la garantía, el cliente deberá presentar este certificado.",
          size: 20,
        }),
      ],
      spacing: { before: 60, after: 120 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "PROCEDIMIENTO PARA RECLAMOS:",
          bold: true,
          size: 22,
        }),
      ],
      spacing: { before: 120, after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "1.\tPresentar este certificado, junto al equipo dañado;",
          size: 20,
        }),
      ],
      spacing: { before: 60, after: 60 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "2.\tEl producto será evaluado en un plazo de hasta 7 días hábiles y, de proceder, reparado o reemplazado según corresponda.",
          size: 20,
        }),
      ],
      spacing: { before: 60, after: 120 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Fecha de emisión: ", bold: true, size: 20 }),
        new TextRun({ text: "_".repeat(20), size: 20 }),
      ],
      spacing: { before: 80, after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Nombre y apellidos del comercial: ",
          bold: true,
          size: 20,
        }),
        new TextRun({ text: "_".repeat(35), size: 20 }),
        new TextRun({ text: "  Firma: ", bold: true, size: 20 }),
        new TextRun({ text: "_".repeat(15), size: 20 }),
      ],
      spacing: { before: 80, after: 80 },
    }),
  ];

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, bottom: 720, left: 1080, right: 1080 },
          },
        },
        children: [
          ...headerParagraphs,
          ...introParagraphs,
          clienteTable,
          productosIntroParagraph,
          ...productoParagraphs,
          ...condicionesParagraphs,
        ],
      },
    ],
  });

  const codigo =
    solicitud.codigo || solicitud.id.slice(-6).toUpperCase();
  await downloadDocx(doc, `Garantia_${codigo}.docx`);
}

export async function generarAmbos(solicitud: SolicitudVenta): Promise<void> {
  await generarConduceLegal(solicitud);
  await generarCertificadoGarantia(solicitud);
}
