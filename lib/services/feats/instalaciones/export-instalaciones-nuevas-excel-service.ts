import { exportToExcel, generateFilename } from "@/lib/export-service";
import {
  cargarNombresPorCodigo,
  enLotes,
  fetchMaterialesDeCliente,
  fetchMaterialesDeLead,
  formatEntregado,
  nombreMaterial,
} from "@/lib/services/feats/instalaciones/export-instalaciones-shared";
import type { InstalacionNueva } from "@/lib/types/feats/instalaciones/instalaciones-types";

export interface ExportInstalacionesNuevasResult {
  count: number;
  filename: string;
}

const ubicacionDe = (i: InstalacionNueva): string =>
  [i.municipio, i.provincia]
    .map((v) => String(v || "").trim())
    .filter(Boolean)
    .join(", ");

export class ExportInstalacionesNuevasExcelService {
  /**
   * Exporta las instalaciones nuevas recibidas (ya filtradas en pantalla).
   * Una fila por instalación; el código, nombre, cantidad y estado de entrega de
   * cada material de su oferta confirmada se apilan dentro de esa misma fila.
   *
   * Una instalación nueva puede ser un CLIENTE (se busca su oferta por número) o
   * un LEAD (por id), de ahí la ramificación por `tipo`.
   */
  static async exportar(
    instalaciones: InstalacionNueva[],
  ): Promise<ExportInstalacionesNuevasResult> {
    const [nombresPorCodigo, materialesPorInstalacion] = await Promise.all([
      cargarNombresPorCodigo(),
      enLotes(instalaciones, 8, async (instalacion) => ({
        instalacion,
        materiales:
          instalacion.tipo === "lead"
            ? await fetchMaterialesDeLead(instalacion.id)
            : await fetchMaterialesDeCliente(String(instalacion.numero || "")),
      })),
    ]);

    const rows = materialesPorInstalacion.map(({ instalacion, materiales }) => ({
      cliente: instalacion.nombre || "Sin nombre",
      tipo: instalacion.tipo === "lead" ? "Lead" : "Cliente",
      telefono: String(instalacion.telefono || "").trim(),
      direccion: instalacion.direccion || "",
      ubicacion: ubicacionDe(instalacion),
      material_codigo: materiales.map((m) => m.codigo),
      material: materiales.map((m) => nombreMaterial(m, nombresPorCodigo)),
      cantidad: materiales.map((m) => m.cantidad),
      entregado: materiales.map((m) =>
        formatEntregado(m.cantidad, m.totalEntregado),
      ),
    }));

    const filename = generateFilename("instalaciones_nuevas");

    await exportToExcel({
      title: "Suncar SRL - Instalaciones Nuevas",
      subtitle: `Registros: ${instalaciones.length}`,
      filename,
      columns: [
        { header: "Cliente", key: "cliente", width: 28 },
        { header: "Tipo", key: "tipo", width: 10 },
        { header: "Teléfono", key: "telefono", width: 20 },
        { header: "Dirección", key: "direccion", width: 34 },
        { header: "Ubicación", key: "ubicacion", width: 26 },
        { header: "Código", key: "material_codigo", width: 16 },
        { header: "Material", key: "material", width: 40 },
        { header: "Cantidad", key: "cantidad", width: 10 },
        { header: "Entregado", key: "entregado", width: 26 },
      ],
      data: rows,
      stackedColumnKeys: [
        "material_codigo",
        "material",
        "cantidad",
        "entregado",
      ],
    });

    return { count: instalaciones.length, filename };
  }
}
