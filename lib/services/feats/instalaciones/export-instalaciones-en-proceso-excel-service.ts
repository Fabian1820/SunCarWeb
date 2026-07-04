import { apiRequest } from "@/lib/api-config";
import { MaterialService } from "@/lib/api-services";
import { exportToExcel, generateFilename } from "@/lib/export-service";
import {
  normalizeOfertaConfeccion,
  seleccionarOfertaConfirmada,
} from "@/hooks/use-ofertas-confeccion";
import type { Cliente } from "@/lib/api-types";

interface MaterialInstalacion {
  codigo: string;
  descripcion: string;
  cantidad: number;
}

const normCodigo = (value?: string | null): string =>
  String(value || "").trim().toLowerCase();

/**
 * Catálogo código(normalizado) -> nombre del material. El item de la oferta
 * solo guarda `descripcion`, no el nombre; para mostrar el NOMBRE del material
 * (igual que el export de vales de salida) se enriquece desde el catálogo.
 */
const cargarNombresPorCodigo = async (): Promise<Map<string, string>> => {
  const map = new Map<string, string>();
  try {
    const materiales = await MaterialService.getAllMaterials();
    for (const m of materiales) {
      const codigo = normCodigo((m as { codigo?: string }).codigo);
      if (!codigo) continue;
      const nombre = String(
        (m as { nombre?: string }).nombre || (m as { descripcion?: string }).descripcion || "",
      ).trim();
      if (nombre) map.set(codigo, nombre);
    }
  } catch {
    // Si falla el catálogo, se cae al `descripcion` del item de la oferta.
  }
  return map;
};

/**
 * Trae los materiales (código, nombre, cantidad) de la oferta confirmada más
 * reciente de un cliente, usando el mismo endpoint que el diálogo de entregas
 * (`/ofertas/confeccion/cliente/{numero}`). Los `ofertas` embebidos en el
 * cliente NO traen los items, por eso hace falta esta llamada.
 */
async function fetchMaterialesDeCliente(numero: string): Promise<MaterialInstalacion[]> {
  const candidato = String(numero || "").trim();
  if (!candidato) return [];
  try {
    const response = await apiRequest<any>(
      `/ofertas/confeccion/cliente/${encodeURIComponent(candidato)}`,
      { method: "GET" },
    );

    const payload = response?.data ?? response;
    const ofertasRaw: any[] = Array.isArray(payload?.ofertas)
      ? payload.ofertas
      : Array.isArray(response?.ofertas)
        ? response.ofertas
        : Array.isArray(payload)
          ? payload
          : payload?.oferta
            ? [payload.oferta]
            : payload && (payload.items || payload.materiales || payload.numero_oferta)
              ? [payload]
              : [];

    if (ofertasRaw.length === 0) return [];

    const ofertas = ofertasRaw.map(normalizeOfertaConfeccion);
    const mejor = seleccionarOfertaConfirmada(ofertas);
    const items = mejor?.items ?? [];

    return items.map((item) => ({
      codigo: String(item.material_codigo || ""),
      descripcion: String(item.descripcion || ""),
      cantidad: Number(item.cantidad) || 0,
    }));
  } catch {
    return [];
  }
}

/** Ejecuta las promesas en lotes para no saturar el backend. */
async function enLotes<T, R>(
  items: T[],
  size: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const lote = items.slice(i, i + size);
    const res = await Promise.all(lote.map(fn));
    out.push(...res);
  }
  return out;
}

const telefonoDe = (c: Cliente): string =>
  [c.telefono, c.telefono_adicional].map((t) => String(t || "").trim()).filter(Boolean).join(" / ");

export interface ExportInstalacionesEnProcesoResult {
  count: number;
  filename: string;
}

export class ExportInstalacionesEnProcesoExcelService {
  /**
   * Exporta las instalaciones en proceso recibidas (ya filtradas en pantalla).
   * Una fila por cliente; el código, nombre y cantidad de cada material de su
   * oferta confirmada se apilan dentro de esa misma fila (igual que el export
   * de vales de salida).
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

    // Nombre del material: catálogo por código; si no está, cae al `descripcion`
    // guardado en la oferta.
    const nombreDe = (m: MaterialInstalacion): string =>
      nombresPorCodigo.get(normCodigo(m.codigo)) || m.descripcion || m.codigo;

    const rows = materialesPorCliente.map(({ client, materiales }) => ({
      cliente: client.nombre || "Sin nombre",
      telefono: telefonoDe(client),
      direccion: client.direccion || "",
      falta_instalacion: client.falta_instalacion || "",
      material_codigo: materiales.map((m) => m.codigo),
      material: materiales.map((m) => nombreDe(m)),
      cantidad: materiales.map((m) => m.cantidad),
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
      ],
      data: rows,
      stackedColumnKeys: ["material_codigo", "material", "cantidad"],
    });

    return { count: clients.length, filename };
  }
}
