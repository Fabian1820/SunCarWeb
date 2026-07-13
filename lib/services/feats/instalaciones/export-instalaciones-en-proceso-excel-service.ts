import { exportToExcel, generateFilename } from "@/lib/export-service";
import {
  cargarNombresPorCodigo,
  enLotes,
  fetchMaterialesDeCliente,
  formatEntregado,
  nombreMaterial,
} from "@/lib/services/feats/instalaciones/export-instalaciones-shared";
import type { Cliente } from "@/lib/api-types";

const telefonoDe = (c: Cliente): string =>
  [c.telefono, c.telefono_adicional]
    .map((t) => String(t || "").trim())
    .filter(Boolean)
    .join(" / ");

export interface ExportInstalacionesEnProcesoResult {
  count: number;
  filename: string;
}

export class ExportInstalacionesEnProcesoExcelService {
  /**
   * Exporta las instalaciones en proceso recibidas (ya filtradas en pantalla).
   * Una fila por cliente; el código, nombre, cantidad y estado de entrega de
   * cada material de su oferta confirmada se apilan dentro de esa misma fila
   * (igual que el export de vales de salida).
   */
  static async exportar(
    clients: Cliente[],
  ): Promise<ExportInstalacionesEnProcesoResult> {
    const [nombresPorCodigo, materialesPorCliente] = await Promise.all([
      cargarNombresPorCodigo(),
      enLotes(clients, 8, async (client) => ({
        client,
        materiales: await fetchMaterialesDeCliente(client.numero),
      })),
    ]);

    const rows = materialesPorCliente.map(({ client, materiales }) => ({
      cliente: client.nombre || "Sin nombre",
      telefono: telefonoDe(client),
      direccion: client.direccion || "",
      falta_instalacion: client.falta_instalacion || "",
      material_codigo: materiales.map((m) => m.codigo),
      material: materiales.map((m) => nombreMaterial(m, nombresPorCodigo)),
      cantidad: materiales.map((m) => m.cantidad),
      entregado: materiales.map((m) =>
        formatEntregado(m.cantidad, m.totalEntregado),
      ),
    }));

    const filename = generateFilename("instalaciones_en_proceso");

    await exportToExcel({
      title: "Suncar SRL - Instalaciones en Proceso",
      subtitle: `Registros: ${clients.length}`,
      filename,
      columns: [
        { header: "Cliente", key: "cliente", width: 28 },
        { header: "Teléfono", key: "telefono", width: 20 },
        { header: "Dirección", key: "direccion", width: 34 },
        { header: "Qué Falta", key: "falta_instalacion", width: 30 },
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

    return { count: clients.length, filename };
  }
}
