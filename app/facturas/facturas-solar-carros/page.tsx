"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import jsPDF from "jspdf";
import { ArrowLeft, FileText, Loader2, Receipt } from "lucide-react";
import { Button } from "@/components/shared/atom/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shared/molecule/card";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import { Textarea } from "@/components/shared/molecule/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/shared/molecule/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  MaterialService,
  ClienteVentaService,
  SolicitudVentaService,
  TasaCambioService,
  ContabilidadService,
} from "@/lib/api-services";
import { apiRequest } from "@/lib/api-config";
import type { Cliente } from "@/lib/types/feats/customer/cliente-types";
import type { ClienteVenta } from "@/lib/types/feats/clientes-ventas/cliente-venta-types";
import type { SolicitudVenta } from "@/lib/types/feats/solicitudes-ventas/solicitud-venta-types";
import type { TasaCambio } from "@/lib/types/feats/tasa-cambio/tasa-cambio-types";
import type { Material } from "@/lib/types/feats/materials/material-types";

interface FacturaValeItem {
  material_id: string;
  codigo: string;
  descripcion: string;
  precio: number;
  cantidad: number;
}

interface InstaladoraRow {
  cliente: Cliente;
  componentesPrincipales: string[];
  ultimaFechaValeSalida: string | null;
  ofertaItems: FacturaValeItem[];
}

interface VentaCompraResumenItem {
  key: string;
  material_id: string;
  codigo: string;
  descripcion: string;
  cantidad: number;
  precio: number;
}

interface VentasRow {
  cliente: ClienteVenta;
  compras: VentaCompraResumenItem[];
}

interface OfertaFacturaData {
  items: FacturaValeItem[];
  precioFinalUsd: number;
}

interface EditableConceptMaterial extends FacturaValeItem {
  rowId: string;
  categoriaKey: "inversor" | "bateria" | "panel";
  codigoContabilidad: string;
  cantidadExistente: number;
  precioContabilidad: number;
  sinVinculo: boolean;
}

interface FacturaSolarCarroMaterialApi {
  codigo?: string;
  nombre_descripcion?: string;
  descripcion?: string;
  cantidad?: number;
}

interface FacturaSolarCarroApi {
  id?: string;
  _id?: string;
  no_factura?: string;
  fecha?: string;
  origen?: "instaladora" | "ventas" | string;
  cliente?: {
    telefono?: string;
    direccion?: string;
    documento_label?: string;
    documento_valor?: string;
    nombre?: string;
  } | null;
  materiales?: FacturaSolarCarroMaterialApi[];
}

interface FacturaSolarCarroView {
  id: string;
  noFactura: string;
  fecha: string;
  origen: "instaladora" | "ventas";
  cliente: {
    nombre: string;
    telefono: string;
    direccion: string;
    documentoLabel: string;
    documentoValor: string;
  };
  materiales: Array<{ codigo: string; descripcion: string; cantidad: number }>;
}

interface InstaladoExitoComponentePrincipal {
  material_id?: string;
  tipo?: string;
  codigo?: string;
  nombre?: string;
  cantidad?: number;
}

interface InstaladoExitoClienteApi {
  id?: string;
  cliente_id?: string;
  numero?: string;
  codigo_cliente?: string;
  nombre?: string;
  direccion?: string;
  telefono?: string;
  tipo_persona?: string;
  carnet_nit?: string;
  fecha_ultimo_vale_salida?: string | null;
  oferta_confeccion?: {
    id?: string;
    numero_oferta?: string;
    componentes_principales?: InstaladoExitoComponentePrincipal[];
  } | null;
}

type PersonaTipo = "natural" | "juridica";
type DetalleModo = "cantidades" | "potencias";

interface SolarFacturaDraft {
  numero_factura: string;
  fecha: string;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_direccion: string;
  cliente_documento: string;
  persona_tipo: PersonaTipo;
  detalle_modo: DetalleModo;
  concepto_manual: string;
  usar_concepto_manual: boolean;
  porcentaje_natural: number;
  tasa_cambio_cup: number;
  base_total_usd: number;
  moneda: "CUP";
}

type FacturaPreviewSource =
  | {
      kind: "instaladora";
      row: InstaladoraRow;
      items: FacturaValeItem[];
      baseJuridicaUsd: number;
    }
  | {
      kind: "ventas";
      row: VentasRow;
      items: FacturaValeItem[];
      baseJuridicaUsd: number;
    };

const EMPRESA = {
  nombre: "MPM SolarCarro S.R.L",
  direccion: "Zapata # 1453 e/ A y B, Plaza de la Revolución, La Habana",
  nit: "50004469717",
};

const normalizeKey = (value?: string | null) =>
  (value || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const parseNumero = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDate = (date?: string) => {
  if (!date) return "-";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("es-ES");
};

const formatMoney = (value: number, moneda: "USD" | "CUP") => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: moneda,
    minimumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
};

const formatAmountNumber = (value: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

const formatQty = (value: number) => {
  const safe = Number.isFinite(value) ? value : 0;
  return String(Math.round(safe));
};

const isLikelyPersistentId = (value: string) => {
  const v = String(value || "").trim();
  if (!v) return false;
  if (/^[a-fA-F0-9]{24}$/.test(v)) return true; // Mongo ObjectId
  if (v.length >= 20) return true; // UUID/otros ids largos
  return false;
};

const toDateInput = (value: Date) => {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const loadImageAsDataUrl = async (src: string): Promise<string> => {
  const response = await fetch(src, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`No se pudo cargar imagen: ${response.status}`);
  }
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === "string" && result.startsWith("data:")) {
        resolve(result);
        return;
      }
      reject(new Error("No se pudo convertir logo a base64"));
    };
    reader.onerror = () => reject(new Error("Error leyendo logo"));
    reader.readAsDataURL(blob);
  });
};

const detectCategory = (item: FacturaValeItem) => {
  const text = `${item.codigo} ${item.descripcion}`.toLowerCase();
  if (text.includes("inversor")) return "inversor";
  if (text.includes("bateria") || text.includes("batería")) return "bateria";
  if (text.includes("panel")) return "panel";
  return "otro";
};

const detectCategoryFromMaterial = (material: Material): "inversor" | "bateria" | "panel" | "otro" => {
  const raw = `${material.categoria || ""} ${material.codigo || ""} ${material.descripcion || ""} ${material.nombre || ""}`;
  const text = raw.toLowerCase();
  if (text.includes("inversor")) return "inversor";
  if (text.includes("bater") || text.includes("litio")) return "bateria";
  if (text.includes("panel")) return "panel";
  return "otro";
};

const pickCatalogMaterialForItem = (
  item: FacturaValeItem,
  catalog: Material[],
): Material | null => {
  const itemCode = String(item.codigo || "").trim();
  const itemDescKey = normalizeKey(item.descripcion);

  if (itemCode) {
    const byCode = catalog.find((m) => String(m.codigo || "").trim() === itemCode);
    if (byCode) return byCode;
  }

  const byDesc = catalog.find(
    (m) =>
      normalizeKey(m.descripcion) === itemDescKey ||
      normalizeKey(m.nombre) === itemDescKey,
  );
  return byDesc || null;
};

const extractSpecs = (item: FacturaValeItem) => {
  const text = `${item.codigo} ${item.descripcion}`.replace(/,/g, ".");
  const kwMatch = text.match(/(\d+(?:\.\d+)?)\s*k\s*w(?!h)/i);
  const kwhMatch = text.match(/(\d+(?:\.\d+)?)\s*k\s*w\s*h/i);
  const wMatch = text.match(/(\d+(?:\.\d+)?)\s*w\b/i);

  return {
    kw: kwMatch ? parseNumero(kwMatch[1]) : 0,
    kwh: kwhMatch ? parseNumero(kwhMatch[1]) : 0,
    w: wMatch ? parseNumero(wMatch[1]) : 0,
  };
};

const buildDetalleComponentes = (
  items: FacturaValeItem[],
  modo: DetalleModo,
): string[] => {
  const formatNum = (value: number, decimals = 2) => {
    const fixed = value.toFixed(decimals);
    return fixed.replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
  };

  type ComponentRow = {
    nombre: string;
    categoria: string;
    cantidad: number;
    potenciaUnit: number;
    unidad: "kW" | "kWh" | "W" | null;
  };

  const grouped = new Map<string, ComponentRow>();

  items.forEach((item) => {
    const cantidad = parseNumero(item.cantidad);
    if (cantidad <= 0) return;

    const categoria = detectCategory(item);
    const specs = extractSpecs(item);
    const nombre = String(item.descripcion || item.codigo || "Material").trim();
    const key = `${categoria}__${normalizeKey(nombre)}`;

    let potenciaUnit = 0;
    let unidad: "kW" | "kWh" | "W" | null = null;

    if (categoria === "inversor") {
      potenciaUnit = specs.kw || specs.w / 1000;
      unidad = "kW";
    } else if (categoria === "bateria") {
      potenciaUnit = specs.kwh || specs.kw;
      unidad = "kWh";
    } else if (categoria === "panel") {
      potenciaUnit = specs.w || specs.kw * 1000;
      unidad = "W";
    }

    const existing = grouped.get(key);
    if (existing) {
      existing.cantidad += cantidad;
      if (!existing.potenciaUnit && potenciaUnit) {
        existing.potenciaUnit = potenciaUnit;
        existing.unidad = unidad;
      }
    } else {
      grouped.set(key, {
        nombre,
        categoria,
        cantidad,
        potenciaUnit,
        unidad,
      });
    }
  });

  const rows = Array.from(grouped.values());
  if (rows.length === 0) {
    return ["Sin componentes principales"];
  }

  if (modo === "cantidades") {
    return rows
      .map((row) => {
        if (row.potenciaUnit > 0 && row.unidad) {
          const decimals = row.unidad === "W" ? 0 : 2;
          return `${formatNum(row.cantidad, 0)}x de ${row.nombre} de ${formatNum(row.potenciaUnit, decimals)}${row.unidad}`;
        }
        return `${formatNum(row.cantidad, 0)}x de ${row.nombre}`;
      });
  }

  return rows
    .map((row) => {
      if (parseNumero(row.cantidad) <= 1) {
        return row.nombre;
      }
      if (row.potenciaUnit > 0 && row.unidad) {
        const totalPotencia = row.potenciaUnit * row.cantidad;
        const decimals = row.unidad === "W" ? 0 : 2;
        return `${formatNum(totalPotencia, decimals)}${row.unidad} de ${row.nombre} de ${formatNum(row.potenciaUnit, decimals)}${row.unidad}`;
      }
      return `${formatNum(row.cantidad, 0)}x de ${row.nombre}`;
    })
    ;
};

const sumItemsTotalUsd = (items: FacturaValeItem[]) => {
  return items.reduce(
    (acc, item) => acc + parseNumero(item.precio) * parseNumero(item.cantidad),
    0,
  );
};

const scaleItemsToTargetUsd = (
  items: FacturaValeItem[],
  targetUsd: number,
): FacturaValeItem[] => {
  const current = sumItemsTotalUsd(items);
  const safeTarget = Math.max(parseNumero(targetUsd), 0);
  const cloned = items.map((item) => ({ ...item }));

  if (cloned.length === 0) return cloned;
  if (safeTarget === 0) {
    return cloned.map((item) => ({ ...item, precio: 0 }));
  }

  if (current > 0) {
    const ratio = safeTarget / current;
    return cloned.map((item) => ({
      ...item,
      precio: Math.round(item.precio * ratio * 100) / 100,
    }));
  }

  const qty = parseNumero(cloned[0].cantidad) || 1;
  cloned[0].precio = Math.round((safeTarget / qty) * 100) / 100;
  return cloned;
};

const formatComponentesPrincipalesDesdeEndpoint = (
  componentes: InstaladoExitoComponentePrincipal[] | undefined,
): { labels: string[]; items: FacturaValeItem[] } => {
  const list = Array.isArray(componentes) ? componentes : [];
  if (list.length === 0) return { labels: ["Sin componentes"], items: [] };

  const labels: string[] = [];
  const items: FacturaValeItem[] = [];

  list.forEach((comp, index) => {
    const cantidad = parseNumero(comp.cantidad);
    if (cantidad <= 0) return;

    const nombre = String(comp.nombre || "").trim();
    const codigo = String(comp.codigo || "").trim();
    const descripcion = nombre || codigo;
    if (!descripcion) return;

    labels.push(`${cantidad}x ${descripcion}`);
    items.push({
      material_id: String(comp.material_id || "").trim() || `${normalizeKey(comp.tipo || "principal")}-${index + 1}`,
      codigo: codigo || String(comp.tipo || "PRINCIPAL").toUpperCase(),
      descripcion,
      precio: 0,
      cantidad,
    });
  });

  return {
    labels: labels.length > 0 ? labels : ["Sin componentes"],
    items,
  };
};

const extractArray = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  const obj = payload as Record<string, unknown>;
  const data =
    obj.data && typeof obj.data === "object"
      ? (obj.data as Record<string, unknown>)
      : null;

  const candidates = [
    obj.ofertas,
    obj.ofertas_confeccion,
    data?.ofertas,
    data?.ofertas_confeccion,
    data?.data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
};

const extractFacturasSolarArray = (payload: unknown): FacturaSolarCarroApi[] => {
  if (Array.isArray(payload)) return payload as FacturaSolarCarroApi[];
  if (!payload || typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;
  const data = obj.data;
  if (Array.isArray(data)) return data as FacturaSolarCarroApi[];
  if (data && typeof data === "object") {
    const nested = data as Record<string, unknown>;
    if (Array.isArray(nested.facturas)) return nested.facturas as FacturaSolarCarroApi[];
    if (Array.isArray(nested.items)) return nested.items as FacturaSolarCarroApi[];
  }
  if (Array.isArray(obj.facturas)) return obj.facturas as FacturaSolarCarroApi[];
  if (Array.isArray(obj.items)) return obj.items as FacturaSolarCarroApi[];
  return [];
};

const mapItemsFromOfertaRaw = (ofertaRaw: unknown): FacturaValeItem[] => {
  if (!ofertaRaw || typeof ofertaRaw !== "object") return [];
  const oferta = ofertaRaw as Record<string, unknown>;
  const items = Array.isArray(oferta.items) ? oferta.items : [];

  return items
    .map((itemRaw, index) => {
      if (!itemRaw || typeof itemRaw !== "object") return null;
      const item = itemRaw as Record<string, unknown>;
      const cantidad = parseNumero(item.cantidad);
      if (cantidad <= 0) return null;

      return {
        material_id: String(
          item.material_codigo || item.material_id || `ITEM-${index + 1}`,
        ),
        codigo: String(item.material_codigo || item.codigo || `ITEM-${index + 1}`),
        descripcion: String(item.descripcion || item.material_descripcion || "Material"),
        precio: parseNumero(item.precio),
        cantidad,
      } satisfies FacturaValeItem;
    })
    .filter((item): item is FacturaValeItem => item !== null);
};

const getOfertaDataParaFactura = async (
  clienteNumero: string,
): Promise<OfertaFacturaData> => {
  const endpoint = `/ofertas/confeccion/cliente/${encodeURIComponent(clienteNumero)}`;
  const response = await apiRequest<unknown>(endpoint, { method: "GET" });
  const ofertas = extractArray(response);
  const ofertasValidas = ofertas.filter(
    (ofertaRaw): ofertaRaw is Record<string, unknown> =>
      !!ofertaRaw && typeof ofertaRaw === "object",
  );

  const esConfirmada = (oferta: Record<string, unknown>) => {
    const estado = normalizeKey(String(oferta.estado || oferta.status || ""));
    return estado.includes("confirmada_por_cliente") || estado.includes("confirmada_cliente");
  };

  const tieneComponentesPrincipales = (oferta: Record<string, unknown>) => {
    const inv = parseNumero(oferta.inversor_cantidad);
    const bat = parseNumero(oferta.bateria_cantidad);
    const pan = parseNumero(oferta.panel_cantidad);
    if (inv > 0 || bat > 0 || pan > 0) return true;
    return mapItemsFromOfertaRaw(oferta).length > 0;
  };

  const confirmadas = ofertasValidas.filter(esConfirmada);
  const confirmadasConComponentes = confirmadas.filter(tieneComponentesPrincipales);
  const seleccionadas =
    confirmadasConComponentes.length > 0
      ? confirmadasConComponentes
      : confirmadas.length > 0
        ? confirmadas
        : ofertasValidas;

  const items: FacturaValeItem[] = [];
  let precioFinalUsd = 0;

  seleccionadas.forEach((oferta) => {
    items.push(...mapItemsFromOfertaRaw(oferta));
    precioFinalUsd += parseNumero(oferta.precio_final || oferta.precio || 0);
  });

  if (precioFinalUsd <= 0) {
    precioFinalUsd = sumItemsTotalUsd(items);
  }

  return { items, precioFinalUsd };
};

const buildFallbackItemsFromClienteOferta = (
  cliente: Cliente,
): FacturaValeItem[] => {
  const oferta =
    Array.isArray(cliente.ofertas) && cliente.ofertas.length > 0
      ? cliente.ofertas[0]
      : null;
  if (!oferta) return [];

  const items: FacturaValeItem[] = [];

  if (parseNumero(oferta.inversor_cantidad) > 0) {
    items.push({
      material_id: "INVERSOR",
      codigo: oferta.inversor_codigo || "INVERSOR",
      descripcion: oferta.inversor_nombre || "Inversor",
      precio: 0,
      cantidad: parseNumero(oferta.inversor_cantidad),
    });
  }

  if (parseNumero(oferta.bateria_cantidad) > 0) {
    items.push({
      material_id: "BATERIA",
      codigo: oferta.bateria_codigo || "BATERIA",
      descripcion: oferta.bateria_nombre || "Batería",
      precio: 0,
      cantidad: parseNumero(oferta.bateria_cantidad),
    });
  }

  if (parseNumero(oferta.panel_cantidad) > 0) {
    items.push({
      material_id: "PANEL",
      codigo: oferta.panel_codigo || "PANEL",
      descripcion: oferta.panel_nombre || "Panel",
      precio: 0,
      cantidad: parseNumero(oferta.panel_cantidad),
    });
  }

  return items;
};

const buildNumeroFacturaSolar = (
  facturas: FacturaSolarCarroView[],
  date = new Date(),
) => {
  const year2 = String(date.getFullYear()).slice(-2);
  let maxSeq = 0;

  facturas.forEach((factura) => {
    const numero = String(factura.noFactura || "").trim();
    if (!/^\d{7}$/.test(numero)) return;
    if (!numero.endsWith(year2)) return;
    const seq = parseNumero(numero.slice(0, 5));
    if (seq > maxSeq) maxSeq = seq;
  });

  const nextSeq = maxSeq + 1;
  return `${String(nextSeq).padStart(5, "0")}${year2}`;
};

export default function FacturasSolarCarrosPage() {
  const { toast } = useToast();

  const [tab, setTab] = useState("instaladora");
  const [loading, setLoading] = useState(true);
  const [creatingClienteKey, setCreatingClienteKey] = useState<string | null>(null);
  const [creatingVentaKey, setCreatingVentaKey] = useState<string | null>(null);
  const [instaladoraRows, setInstaladoraRows] = useState<InstaladoraRow[]>([]);
  const [ventasRows, setVentasRows] = useState<VentasRow[]>([]);
  const [facturasSolar, setFacturasSolar] = useState<FacturaSolarCarroView[]>([]);
  const [searchInstaladora, setSearchInstaladora] = useState("");
  const [searchVentas, setSearchVentas] = useState("");

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSaving, setPreviewSaving] = useState(false);
  const [previewSource, setPreviewSource] = useState<FacturaPreviewSource | null>(null);
  const [previewDraft, setPreviewDraft] = useState<SolarFacturaDraft | null>(null);
  const [catalogMateriales, setCatalogMateriales] = useState<Material[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [editableConceptItems, setEditableConceptItems] = useState<EditableConceptMaterial[]>([]);

  const [loadingTasa, setLoadingTasa] = useState(false);
  const [tasaError, setTasaError] = useState<string | null>(null);

  const loadFacturasSolar = useCallback(async () => {
    const allFacturas: FacturaSolarCarroView[] = [];
    const seen = new Set<string>();
    const pageSize = 200;
    let skip = 0;

    while (true) {
      const raw = await apiRequest<unknown>(
        `/facturas-solar-carros/?skip=${skip}&limit=${pageSize}`,
        { method: "GET" },
      );
      const rowsRaw = extractFacturasSolarArray(raw);
      const rows = rowsRaw.map((factura, index) => {
        const noFactura = String(factura.no_factura || "").trim();
        const id = String(factura.id || factura._id || noFactura || `FS-${skip + index + 1}`);
        const origen = normalizeKey(factura.origen).includes("instaladora")
          ? "instaladora"
          : "ventas";
        const materiales = (Array.isArray(factura.materiales) ? factura.materiales : []).map(
          (m, idx) => ({
            codigo: String(m.codigo || `MAT-${idx + 1}`),
            descripcion: String(m.nombre_descripcion || m.descripcion || "Material"),
            cantidad: parseNumero(m.cantidad),
          }),
        );
        return {
          id,
          noFactura: noFactura || id,
          fecha: String(factura.fecha || ""),
          origen,
          cliente: {
            nombre: String(factura.cliente?.nombre || "-"),
            telefono: String(factura.cliente?.telefono || "-"),
            direccion: String(factura.cliente?.direccion || "-"),
            documentoLabel: String(factura.cliente?.documento_label || "Documento"),
            documentoValor: String(factura.cliente?.documento_valor || "-"),
          },
          materiales,
        } satisfies FacturaSolarCarroView;
      });
      if (rows.length === 0) break;

      rows.forEach((factura) => {
        const key = String(factura.id || factura.noFactura || "").trim();
        if (!key || seen.has(key)) return;
        seen.add(key);
        allFacturas.push(factura);
      });

      skip += rows.length;
      if (rows.length < pageSize) break;
    }

    const filtered = (allFacturas || [])
      .sort((a, b) => {
        const ta = new Date(a.fecha || 0).getTime();
        const tb = new Date(b.fecha || 0).getTime();
        return tb - ta;
      });
    setFacturasSolar(filtered);
  }, []);

  const loadInstaladoraRows = useCallback(async () => {
    const raw = await apiRequest<unknown>("/clientes/instalados-exito-detalle", {
      method: "GET",
    });

    const payload = raw as
      | InstaladoExitoClienteApi[]
      | { data?: InstaladoExitoClienteApi[]; clientes?: InstaladoExitoClienteApi[] };
    const rowsRaw = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.clientes)
          ? payload.clientes
          : [];

    const rows: InstaladoraRow[] = rowsRaw.map((item, index) => {
      const { labels, items } = formatComponentesPrincipalesDesdeEndpoint(
        item.oferta_confeccion?.componentes_principales,
      );

      const clienteId =
        String(item.numero || "").trim() ||
        String(item.codigo_cliente || "").trim() ||
        String(item.cliente_id || "").trim() ||
        String(item.id || "").trim() ||
        String(item.carnet_nit || "").trim() ||
        `INST-${index + 1}`;

      return {
        cliente: {
          id: String(item.id || item.cliente_id || clienteId),
          numero: clienteId,
          nombre: String(item.nombre || "Sin nombre"),
          direccion: String(item.direccion || ""),
          telefono: String(item.telefono || ""),
          tipo_persona: String(item.tipo_persona || ""),
          carnet_identidad: String(item.carnet_nit || ""),
        },
        componentesPrincipales: labels,
        ofertaItems: items,
        ultimaFechaValeSalida: item.fecha_ultimo_vale_salida || null,
      };
    });

    const sortedRows = [...rows].sort((a, b) => {
      const ta = a.ultimaFechaValeSalida
        ? new Date(a.ultimaFechaValeSalida).getTime()
        : 0;
      const tb = b.ultimaFechaValeSalida
        ? new Date(b.ultimaFechaValeSalida).getTime()
        : 0;
      return tb - ta;
    });

    setInstaladoraRows(sortedRows);
  }, []);

  const loadVentasRows = useCallback(async () => {
    const [clientesVentas, solicitudes] = await Promise.all([
      ClienteVentaService.getClientes({ skip: 0, limit: 2000 }),
      SolicitudVentaService.getSolicitudes({ skip: 0, limit: 2000 }),
    ]);

    const solicitudesList = Array.isArray(solicitudes) ? solicitudes : [];
    const comprasPorCliente = new Map<string, Map<string, VentaCompraResumenItem>>();

    solicitudesList.forEach((solicitud: SolicitudVenta) => {
      const estado = normalizeKey(solicitud.estado || "");
      if (estado === "anulada" || estado === "anulado") return;

      const cliente = solicitud.cliente_venta;
      const clienteId = (solicitud.cliente_venta_id || cliente?.id || "").trim();
      if (!clienteId) return;

      const mapCliente =
        comprasPorCliente.get(clienteId) ||
        new Map<string, VentaCompraResumenItem>();

      (solicitud.materiales || []).forEach((material) => {
        const codigo = String(
          material.material_codigo || material.codigo || material.material?.codigo || "",
        );
        const descripcion = String(
          material.material_descripcion ||
            material.descripcion ||
            material.material?.descripcion ||
            material.material?.nombre ||
            "Material",
        );

        const materialId = String(material.material_id || codigo || descripcion);
        const key = `${codigo}__${descripcion}`;
        const cantidadActual = parseNumero(material.cantidad);

        const existing = mapCliente.get(key);
        if (existing) {
          existing.cantidad += cantidadActual;
        } else {
          mapCliente.set(key, {
            key,
            material_id: materialId,
            codigo: codigo || "SIN-CODIGO",
            descripcion,
            cantidad: cantidadActual,
            precio: parseNumero(material.material?.precio),
          });
        }
      });

      comprasPorCliente.set(clienteId, mapCliente);
    });

    const rows: VentasRow[] = (clientesVentas || []).map((cliente) => {
      const comprasMap =
        comprasPorCliente.get(cliente.id) ||
        new Map<string, VentaCompraResumenItem>();
      const compras = Array.from(comprasMap.values()).filter(
        (item) => item.cantidad > 0,
      );
      return { cliente, compras };
    });

    setVentasRows(rows);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadInstaladoraRows(), loadVentasRows(), loadFacturasSolar()]);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los datos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [loadFacturasSolar, loadInstaladoraRows, loadVentasRows, toast]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const openPreview = (source: FacturaPreviewSource, draft: SolarFacturaDraft) => {
    setPreviewSource(source);
    setPreviewDraft(draft);
    setPreviewOpen(true);
  };

  const handleGenerarFacturaInstaladora = async (row: InstaladoraRow) => {
    const key = row.cliente.numero || row.cliente.id || row.cliente.nombre;
    setCreatingClienteKey(key);

    try {
      const clienteNumero = String(row.cliente.numero || "").trim();
      let ofertaData: OfertaFacturaData = { items: [], precioFinalUsd: 0 };

      if (clienteNumero && !clienteNumero.startsWith("INST-")) {
        try {
          ofertaData = await getOfertaDataParaFactura(clienteNumero);
        } catch {
          // Si falla lookup de oferta por cliente, usamos componentes del endpoint nuevo.
        }
      }

      let items = ofertaData.items;
      if (items.length === 0) {
        items = row.ofertaItems;
      }
      if (items.length === 0) {
        items = buildFallbackItemsFromClienteOferta(row.cliente);
      }

      if (items.length === 0) {
        throw new Error("El cliente no tiene materiales/componentes para facturar.");
      }

      const baseFromItems = sumItemsTotalUsd(items);
      const juridicaUsd = ofertaData.precioFinalUsd > 0 ? ofertaData.precioFinalUsd : baseFromItems;
      const persona_tipo: PersonaTipo =
        normalizeKey(row.cliente.tipo_persona).includes("jurid")
          ? "juridica"
          : "natural";

      openPreview(
        { kind: "instaladora", row, items, baseJuridicaUsd: juridicaUsd },
        {
          numero_factura: buildNumeroFacturaSolar(facturasSolar),
          fecha: toDateInput(new Date()),
          cliente_nombre: row.cliente.nombre || "",
          cliente_telefono: row.cliente.telefono || "",
          cliente_direccion: row.cliente.direccion || "",
          cliente_documento: row.cliente.carnet_identidad || "",
          persona_tipo,
          detalle_modo: "cantidades",
          concepto_manual: "",
          usar_concepto_manual: false,
          porcentaje_natural: 15,
          tasa_cambio_cup: 0,
          base_total_usd: baseFromItems,
          moneda: "CUP",
        },
      );
    } catch (error) {
      toast({
        title: "Error preparando factura",
        description:
          error instanceof Error
            ? error.message
            : "No se pudo preparar la factura.",
        variant: "destructive",
      });
    } finally {
      setCreatingClienteKey(null);
    }
  };

  const handleGenerarFacturaVentas = async (row: VentasRow) => {
    const key = row.cliente.id || row.cliente.numero || row.cliente.nombre;
    setCreatingVentaKey(key);

    try {
      const items: FacturaValeItem[] = row.compras.map((compra) => ({
        material_id: compra.material_id,
        codigo: compra.codigo,
        descripcion: compra.descripcion,
        precio: compra.precio,
        cantidad: compra.cantidad,
      }));

      if (items.length === 0) {
        throw new Error("El cliente no tiene compras para facturar.");
      }

      const baseUsd = sumItemsTotalUsd(items);
      openPreview(
        { kind: "ventas", row, items, baseJuridicaUsd: baseUsd },
        {
          numero_factura: buildNumeroFacturaSolar(facturasSolar),
          fecha: toDateInput(new Date()),
          cliente_nombre: row.cliente.nombre || "",
          cliente_telefono: row.cliente.telefono || "",
          cliente_direccion: row.cliente.direccion || "",
          cliente_documento: row.cliente.ci || "",
          persona_tipo: "natural",
          detalle_modo: "cantidades",
          concepto_manual: "",
          usar_concepto_manual: false,
          porcentaje_natural: 15,
          tasa_cambio_cup: 0,
          base_total_usd: baseUsd,
          moneda: "CUP",
        },
      );
    } catch (error) {
      toast({
        title: "Error preparando factura",
        description:
          error instanceof Error
            ? error.message
            : "No se pudo preparar la factura.",
        variant: "destructive",
      });
    } finally {
      setCreatingVentaKey(null);
    }
  };

  useEffect(() => {
    if (!previewOpen || !previewDraft?.fecha) return;

    let cancelled = false;
    setLoadingTasa(true);
    setTasaError(null);

    TasaCambioService.getTasaCambioByFecha(previewDraft.fecha)
      .then((data: TasaCambio) => {
        if (cancelled) return;
        const usdToCup = parseNumero(data.usd_a_cup);
        if (usdToCup > 0) {
          setPreviewDraft((prev) =>
            prev ? { ...prev, tasa_cambio_cup: usdToCup } : prev,
          );
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setTasaError(
          error instanceof Error
            ? error.message
            : "No se pudo cargar la tasa de cambio del día.",
        );
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingTasa(false);
      });

    return () => {
      cancelled = true;
    };
  }, [previewOpen, previewDraft?.fecha]);

  useEffect(() => {
    if (!previewOpen) return;
    if (catalogMateriales.length > 0) return;

    let cancelled = false;
    setLoadingCatalog(true);
    MaterialService.getAllMaterials()
      .then((data) => {
        if (cancelled) return;
        setCatalogMateriales(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (cancelled) return;
        setCatalogMateriales([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingCatalog(false);
      });

    return () => {
      cancelled = true;
    };
  }, [previewOpen, catalogMateriales.length]);

  useEffect(() => {
    if (!previewOpen || !previewSource) {
      setEditableConceptItems([]);
      return;
    }

    const basePrincipales = (previewSource.items || []).filter(
      (item) => detectCategory(item) !== "otro",
    );

    const mapped = basePrincipales.map((item, index) => {
      const catalogMatch = pickCatalogMaterialForItem(item, catalogMateriales);
      const category = detectCategory(item);
      const resolvedMaterialId =
        String(catalogMatch?.id || "").trim() ||
        (isLikelyPersistentId(String(item.material_id || ""))
          ? String(item.material_id)
          : "");
      const sinVinculo = !isLikelyPersistentId(resolvedMaterialId);
      return {
        ...item,
        material_id: resolvedMaterialId,
        rowId: `${item.material_id || item.codigo || "row"}-${index + 1}`,
        categoriaKey: (category === "inversor" || category === "bateria" || category === "panel"
          ? category
          : "panel") as "inversor" | "bateria" | "panel",
        codigoContabilidad: String(catalogMatch?.codigo_contabilidad || ""),
        cantidadExistente: parseNumero(catalogMatch?.cantidad_contabilidad),
        precioContabilidad: parseNumero(catalogMatch?.precio_contabilidad),
        sinVinculo,
        precio:
          parseNumero(item.precio) > 0
            ? parseNumero(item.precio)
            : parseNumero(catalogMatch?.precio),
      } satisfies EditableConceptMaterial;
    });

    setEditableConceptItems(mapped);
  }, [previewOpen, previewSource, catalogMateriales]);

  const itemsConceptoPrincipales = useMemo(() => {
    return editableConceptItems
      .filter(
        (item) =>
          parseNumero(item.cantidad) > 0 &&
          parseNumero(item.cantidadExistente) > 0 &&
          !item.sinVinculo,
      )
      .map((item) => ({
        material_id: item.material_id,
        codigo: item.codigo,
        descripcion: item.descripcion,
        precio: item.precio,
        cantidad: item.cantidad,
      }));
  }, [editableConceptItems]);

  const detalleComponentesLines = useMemo(() => {
    if (!previewDraft) return [] as string[];
    return buildDetalleComponentes(itemsConceptoPrincipales, previewDraft.detalle_modo);
  }, [itemsConceptoPrincipales, previewDraft]);

  const detalleComponentesInline = useMemo(
    () => detalleComponentesLines.join(", "),
    [detalleComponentesLines],
  );

  const conceptoAutomatico = useMemo(() => {
    if (!previewDraft) return "";

    if (previewDraft.persona_tipo === "juridica") {
      return `Instalación, montaje y puesta en marcha de sistema fotovoltaico:\n${detalleComponentesInline}.`;
    }

    return detalleComponentesLines.join("\n");
  }, [detalleComponentesInline, detalleComponentesLines, previewDraft]);

  const conceptoFinal = useMemo(() => {
    if (!previewDraft) return "";
    return previewDraft.usar_concepto_manual
      ? previewDraft.concepto_manual
      : conceptoAutomatico;
  }, [conceptoAutomatico, previewDraft]);

  const baseParaCalculoUsd = useMemo(() => {
    if (!previewSource || !previewDraft) return 0;

    if (previewDraft.persona_tipo === "juridica") {
      return previewSource.baseJuridicaUsd > 0
        ? previewSource.baseJuridicaUsd
        : previewDraft.base_total_usd;
    }

    const tasa = parseNumero(previewDraft.tasa_cambio_cup);
    const baseNaturalCup = editableConceptItems
      .filter(
        (item) => parseNumero(item.cantidad) > 0 && parseNumero(item.cantidadExistente) > 0,
      )
      .reduce(
        (acc, item) => acc + parseNumero(item.cantidad) * parseNumero(item.precioContabilidad),
        0,
      );
    return tasa > 0 ? baseNaturalCup / tasa : 0;
  }, [editableConceptItems, previewDraft, previewSource]);

  const baseNaturalCup = useMemo(() => {
    return editableConceptItems
      .filter(
        (item) => parseNumero(item.cantidad) > 0 && parseNumero(item.cantidadExistente) > 0,
      )
      .reduce(
        (acc, item) => acc + parseNumero(item.cantidad) * parseNumero(item.precioContabilidad),
        0,
      );
  }, [editableConceptItems]);

  const totalFacturarUsd = useMemo(() => {
    if (!previewDraft) return 0;

    if (previewDraft.persona_tipo === "juridica") {
      return baseParaCalculoUsd;
    }

    const totalCup = baseNaturalCup * (1 + parseNumero(previewDraft.porcentaje_natural) / 100);
    const tasa = parseNumero(previewDraft.tasa_cambio_cup);
    return tasa > 0 ? totalCup / tasa : 0;
  }, [baseNaturalCup, baseParaCalculoUsd, previewDraft]);

  const totalFacturarCup = useMemo(() => {
    if (!previewDraft) return 0;
    if (previewDraft.persona_tipo === "juridica") {
      return totalFacturarUsd * parseNumero(previewDraft.tasa_cambio_cup);
    }
    return baseNaturalCup * (1 + parseNumero(previewDraft.porcentaje_natural) / 100);
  }, [baseNaturalCup, previewDraft, totalFacturarUsd]);

  const aumentoNaturalUsd = useMemo(() => {
    if (!previewDraft || previewDraft.persona_tipo === "juridica") return 0;
    const aumentoCup = Math.max(0, totalFacturarCup - baseNaturalCup);
    const tasa = parseNumero(previewDraft.tasa_cambio_cup);
    return tasa > 0 ? aumentoCup / tasa : 0;
  }, [baseNaturalCup, previewDraft, totalFacturarCup]);

  const aumentoNaturalCup = useMemo(() => {
    if (!previewDraft || previewDraft.persona_tipo === "juridica") return 0;
    return Math.max(0, totalFacturarCup - baseNaturalCup);
  }, [baseNaturalCup, previewDraft, totalFacturarCup]);

  const clienteDocumentoLabel = previewDraft?.persona_tipo === "juridica" ? "NIT" : "Carnet";

  const handlePrintPreview = () => {
    if (!previewDraft) return;

    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;

    const html = `
      <html>
        <head>
          <title>Factura ${previewDraft.numero_factura}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 32px; color: #111; }
            .title { text-align: center; font-weight: 700; font-size: 22px; margin-bottom: 24px; }
            .top { display: flex; justify-content: space-between; gap: 24px; }
            .box { width: 48%; font-size: 14px; line-height: 1.45; }
            .line { border-top: 1px solid #cfcfcf; margin: 18px 0; }
            .label { font-weight: 700; }
            .sign { margin-top: 70px; display: flex; justify-content: space-between; }
            .sign-item { width: 45%; text-align: center; }
            .sign-line { border-top: 1px solid #666; margin-bottom: 8px; }
            .logo-wrap { text-align: center; margin-bottom: 10px; }
            .logo { max-width: 92px; max-height: 92px; object-fit: contain; }
          </style>
        </head>
        <body>
          <div class="logo-wrap">
            <img class="logo" src="/logo.png" alt="Logo empresa" />
          </div>
          <div class="title">FACTURA</div>
          <div class="top">
            <div class="box">
              <div><span class="label">Empresa instaladora:</span> ${EMPRESA.nombre}</div>
              <div><span class="label">Dirección:</span> ${EMPRESA.direccion}</div>
              <div><span class="label">NIT:</span> ${EMPRESA.nit}</div>
            </div>
            <div class="box">
              <div><span class="label">No factura:</span> ${previewDraft.numero_factura}</div>
              <div><span class="label">Fecha:</span> ${formatDate(previewDraft.fecha)}</div>
            </div>
          </div>
          <div class="line"></div>
          <div><span class="label">Datos del cliente</span></div>
          <div><span class="label">Nombre:</span> ${previewDraft.cliente_nombre || "-"}</div>
          <div><span class="label">Teléfono:</span> ${previewDraft.cliente_telefono || "-"}</div>
          <div><span class="label">Dirección:</span> ${previewDraft.cliente_direccion || "-"}</div>
          <div><span class="label">${clienteDocumentoLabel}:</span> ${previewDraft.cliente_documento || "-"}</div>
          <div class="line"></div>
          <div><span class="label">Concepto:</span></div>
          <div style="white-space: pre-line;">${conceptoFinal || "-"}</div>
          <div class="line"></div>
          <div style="margin-top:6px; display:flex; justify-content:space-between; gap:12px;">
            <span class="label">Monto total</span>
            <span>${formatAmountNumber(totalFacturarCup)} CUP</span>
          </div>
          <div class="sign">
            <div class="sign-item"><div class="sign-line"></div><div>Firma del Cliente</div></div>
            <div class="sign-item"><div class="sign-line"></div><div>Firma del Representante de la Empresa</div></div>
          </div>
          <script>
            window.onload = function () {
              window.print();
              window.onafterprint = function () { window.close(); };
            };
          </script>
        </body>
      </html>
    `;

    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  const handleDownloadPreviewPDF = async () => {
    if (!previewDraft) return;

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
    const marginX = 16;
    const pageW = doc.internal.pageSize.getWidth();
    const rightX = pageW - marginX;
    let y = 16;

    try {
      let logoDataUrl = "";
      try {
        logoDataUrl = await loadImageAsDataUrl("/logo.png");
      } catch {
        logoDataUrl = await loadImageAsDataUrl(`${window.location.origin}/logo.png`);
      }
      const logoW = 24;
      const logoH = 24;
      doc.addImage(logoDataUrl, "PNG", pageW / 2 - logoW / 2, y, logoW, logoH);
      y += logoH + 5;
    } catch {
      // Si falla el logo, continuar sin bloquear la descarga del PDF.
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("FACTURA", pageW / 2, y, { align: "center" });

    y += 8;
    const headerStartY = y;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Empresa instaladora: ${EMPRESA.nombre}`, marginX, y);
    y += 5;
    const dirLines = doc.splitTextToSize(`Dirección: ${EMPRESA.direccion}`, 112);
    doc.setFont("helvetica", "normal");
    doc.text(dirLines, marginX, y);
    y += dirLines.length * 4.5;
    doc.text(`NIT: ${EMPRESA.nit}`, marginX, y);

    const rightColX = pageW * 0.62;
    let yRight = headerStartY;
    doc.setFont("helvetica", "bold");
    doc.text(`No factura: ${previewDraft.numero_factura}`, rightColX, yRight);
    yRight += 5;
    doc.text(`Fecha: ${formatDate(previewDraft.fecha)}`, rightColX, yRight);

    y = Math.max(y + 7, yRight + 6);
    doc.setDrawColor(190, 190, 190);
    doc.line(marginX, y, rightX, y);
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.text("Datos del Cliente", marginX, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.text(`Nombre: ${previewDraft.cliente_nombre || "-"}`, marginX, y);
    y += 5;
    doc.text(`Teléfono: ${previewDraft.cliente_telefono || "-"}`, marginX, y);
    y += 5;
    const dirCliente = doc.splitTextToSize(
      `Dirección: ${previewDraft.cliente_direccion || "-"}`,
      180,
    );
    doc.text(dirCliente, marginX, y);
    y += dirCliente.length * 4.5;
    doc.text(`${clienteDocumentoLabel}: ${previewDraft.cliente_documento || "-"}`, marginX, y);

    y += 7;
    doc.line(marginX, y, rightX, y);
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.text("Concepto:", marginX, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    const conceptoLines = doc.splitTextToSize(conceptoFinal || "-", 180);
    doc.text(conceptoLines, marginX, y);
    y += conceptoLines.length * 4.5 + 4;

    doc.line(marginX, y, rightX, y);
    y += 7;

    doc.setFont("helvetica", "bold");
    doc.text("Monto total", marginX, y);
    doc.setFont("helvetica", "normal");
    doc.text(`${formatAmountNumber(totalFacturarCup)} CUP`, rightX, y, {
      align: "right",
    });

    y += 22;
    const lineW = 52;
    doc.setDrawColor(120, 120, 120);
    doc.line(marginX + 18, y, marginX + 18 + lineW, y);
    doc.line(rightX - 18 - lineW, y, rightX - 18, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.text("Firma del Cliente", marginX + 24, y);
    doc.text("Firma del Representante de la Empresa", rightX - 80, y);

    const safe = (previewDraft.numero_factura || "factura_solar")
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 60);
    doc.save(`factura_solar_carros_${safe}.pdf`);
  };

  const handleGuardarFactura = async () => {
    if (!previewDraft || !previewSource) return;

    setPreviewSaving(true);
    try {
      const bloqueados = editableConceptItems.filter(
        (item) => parseNumero(item.cantidad) > 0 && parseNumero(item.cantidadExistente) <= 0,
      );
      if (bloqueados.length > 0) {
        toast({
          title: "Material no disponible",
          description:
            "Hay materiales con existencia contable 0. Debe cambiarlos por otro o quitarlos antes de guardar.",
          variant: "destructive",
        });
        return;
      }

      const itemsParaFactura = itemsConceptoPrincipales.length > 0
        ? itemsConceptoPrincipales
        : previewSource.items;

      const materialesSalida = editableConceptItems
        .filter(
          (item) =>
            parseNumero(item.cantidad) > 0 &&
            parseNumero(item.cantidadExistente) > 0,
        )
        .map((item) => ({
          material_id: String(item.material_id || "").trim(),
          cantidad: parseNumero(item.cantidad),
          descripcion: String(item.descripcion || item.codigo || "Material"),
        }))
        .filter((m) => m.cantidad > 0);

      const sinIdReal = materialesSalida.filter(
        (m) => !isLikelyPersistentId(m.material_id),
      );
      if (sinIdReal.length > 0) {
        toast({
          title: "Material sin ID válido",
          description: `Debe cambiar estos materiales por uno del catálogo: ${sinIdReal
            .map((m) => m.descripcion)
            .join(", ")}`,
          variant: "destructive",
        });
        return;
      }

      const sinVinculoRows = editableConceptItems.filter(
        (item) => parseNumero(item.cantidad) > 0 && item.sinVinculo,
      );
      if (sinVinculoRows.length > 0) {
        toast({
          title: "Materiales sin vínculo",
          description: `Debe vincular al catálogo estos materiales: ${sinVinculoRows
            .map((m) => m.descripcion || m.codigo)
            .join(", ")}`,
          variant: "destructive",
        });
        return;
      }

      if (materialesSalida.length === 0) {
        toast({
          title: "Sin materiales válidos",
          description:
            "No hay materiales válidos para descontar en contabilidad. Debe seleccionar materiales del inventario.",
          variant: "destructive",
        });
        return;
      }

      // 1) Descontar de inventario contabilidad (cantidad_contabilidad)
      await ContabilidadService.crearTicket(
        materialesSalida.map((m) => ({
          material_id: m.material_id,
          cantidad: m.cantidad,
        })),
      );

      const adjustedItems = scaleItemsToTargetUsd(
        itemsParaFactura,
        totalFacturarUsd,
      );

      const nowIso = new Date().toISOString();
      const materialesPayload = adjustedItems.map((item) => {
        const editable = editableConceptItems.find(
          (e) =>
            normalizeKey(e.codigo) === normalizeKey(item.codigo) &&
            normalizeKey(e.descripcion) === normalizeKey(item.descripcion),
        );
        return {
          material_id: item.material_id,
          categoria_principal: detectCategory(item),
          codigo: item.codigo,
          nombre_descripcion: item.descripcion,
          cantidad: parseNumero(item.cantidad),
          codigo_contabilidad: editable?.codigoContabilidad || null,
          cantidad_contabilidad_disponible:
            editable && Number.isFinite(editable.cantidadExistente)
              ? editable.cantidadExistente
              : null,
          precio_contabilidad_cup:
            editable && Number.isFinite(editable.precioContabilidad)
              ? editable.precioContabilidad
              : null,
          precio_unitario_usd: parseNumero(item.precio),
          bloqueado_por_existencia: Boolean(
            editable && parseNumero(editable.cantidadExistente) <= 0,
          ),
        };
      });

      const payload = {
        no_factura: previewDraft.numero_factura,
        fecha: previewDraft.fecha,
        estado: "emitida",
        origen: previewSource.kind === "instaladora" ? "instaladora" : "ventas",
        empresa: {
          nombre: EMPRESA.nombre,
          direccion: EMPRESA.direccion,
          nit: EMPRESA.nit,
        },
        cliente: {
          cliente_id:
            previewSource.kind === "instaladora"
              ? previewSource.row.cliente.id || null
              : previewSource.row.cliente.id || null,
          numero_cliente:
            previewSource.kind === "instaladora"
              ? previewSource.row.cliente.numero || null
              : previewSource.row.cliente.numero || null,
          nombre: previewDraft.cliente_nombre,
          telefono: previewDraft.cliente_telefono || null,
          direccion: previewDraft.cliente_direccion || null,
          tipo_persona: previewDraft.persona_tipo,
          documento_label: clienteDocumentoLabel,
          documento_valor: previewDraft.cliente_documento || "",
        },
        configuracion: {
          detalle_modo: previewDraft.detalle_modo,
          usar_concepto_manual: previewDraft.usar_concepto_manual,
          concepto_manual: previewDraft.usar_concepto_manual
            ? previewDraft.concepto_manual
            : null,
          porcentaje_natural: parseNumero(previewDraft.porcentaje_natural),
          tasa_cambio_cup: parseNumero(previewDraft.tasa_cambio_cup),
        },
        materiales: materialesPayload,
        concepto: {
          texto_final: conceptoFinal,
          lineas_generadas: conceptoFinal.split("\n"),
        },
        totales: {
          base_natural_cup: previewDraft.persona_tipo === "natural" ? baseNaturalCup : 0,
          aumento_natural_cup: previewDraft.persona_tipo === "natural" ? aumentoNaturalCup : 0,
          aumento_natural_usd_equiv:
            previewDraft.persona_tipo === "natural" ? aumentoNaturalUsd : 0,
          total_usd: totalFacturarUsd,
          total_cup: totalFacturarCup,
          moneda_final: "CUP",
        },
        auditoria: {
          creado_por: "frontend",
          creado_en: nowIso,
          actualizado_por: null,
          actualizado_en: null,
          anulado_por: null,
          anulado_en: null,
          motivo_anulacion: null,
        },
      };

      try {
        // 2) Crear factura solar carros
        await apiRequest("/facturas-solar-carros/", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } catch (errorCrearFactura) {
        // 3) Rollback de inventario si falla creación de factura
        await Promise.allSettled(
          materialesSalida.map((m) =>
            ContabilidadService.registrarEntrada(m.material_id, m.cantidad),
          ),
        );
        throw errorCrearFactura;
      }

      toast({
        title: "Factura creada",
        description: `Factura ${previewDraft.numero_factura} guardada correctamente.`,
      });

      setPreviewOpen(false);
      setPreviewSource(null);
      setPreviewDraft(null);
      await loadFacturasSolar();
      setTab("facturas");
    } catch (error) {
      toast({
        title: "Error guardando factura",
        description:
          error instanceof Error
            ? error.message
            : "No se pudo guardar la factura.",
        variant: "destructive",
      });
    } finally {
      setPreviewSaving(false);
    }
  };

  const rowsVentasConCompras = useMemo(
    () => ventasRows.filter((row) => row.compras.length > 0),
    [ventasRows],
  );

  const instaladoraRowsFiltradas = useMemo(() => {
    const term = normalizeKey(searchInstaladora);
    if (!term) return instaladoraRows;

    return instaladoraRows.filter((row) => {
      const haystack = [
        row.cliente.nombre,
        row.cliente.direccion,
        row.cliente.telefono,
        row.cliente.tipo_persona,
        row.cliente.carnet_identidad,
        row.ultimaFechaValeSalida || "",
        ...row.componentesPrincipales,
      ]
        .map((value) => normalizeKey(value))
        .join(" ");

      return haystack.includes(term);
    });
  }, [instaladoraRows, searchInstaladora]);

  const rowsVentasConComprasFiltradas = useMemo(() => {
    const term = normalizeKey(searchVentas);
    if (!term) return rowsVentasConCompras;

    return rowsVentasConCompras.filter((row) => {
      const comprasTexto = row.compras
        .map((compra) => `${compra.codigo} ${compra.descripcion} ${compra.cantidad}`)
        .join(" ");

      const haystack = [
        row.cliente.nombre,
        row.cliente.direccion,
        row.cliente.telefono,
        row.cliente.ci,
        comprasTexto,
      ]
        .map((value) => normalizeKey(value))
        .join(" ");

      return haystack.includes(term);
    });
  }, [rowsVentasConCompras, searchVentas]);

  const getExistenciaClass = (existencia: number) => {
    const value = parseNumero(existencia);
    if (value <= 0) return "text-red-600 font-semibold";
    if (value <= 10) return "text-orange-600 font-semibold";
    return "text-gray-900";
  };

  const materialesCatalogPorCategoria = useMemo(() => {
    const out = {
      inversor: [] as Material[],
      bateria: [] as Material[],
      panel: [] as Material[],
    };

    (catalogMateriales || []).forEach((material) => {
      const cat = detectCategoryFromMaterial(material);
      if (cat === "inversor" || cat === "bateria" || cat === "panel") {
        out[cat].push(material);
      }
    });

    return out;
  }, [catalogMateriales]);

  const updateEditableCantidad = (rowId: string, cantidad: number) => {
    setEditableConceptItems((prev) =>
      prev.map((item) =>
        item.rowId === rowId
          ? { ...item, cantidad: Math.max(0, Math.round(parseNumero(cantidad))) }
          : item,
      ),
    );
  };

  const removeEditableItem = (rowId: string) => {
    setEditableConceptItems((prev) => prev.filter((item) => item.rowId !== rowId));
  };

  const replaceEditableItem = (rowId: string, materialId: string) => {
    setEditableConceptItems((prev) =>
      prev.map((item) => {
        if (item.rowId !== rowId) return item;
        const found = catalogMateriales.find((m) => m.id === materialId);
        if (!found) return item;
        return {
          ...item,
          material_id: found.id || item.material_id,
          codigo: String(found.codigo || item.codigo),
          descripcion: String(found.nombre || found.descripcion || item.descripcion),
          precio: parseNumero(found.precio) || item.precio,
          codigoContabilidad: String(found.codigo_contabilidad || ""),
          cantidadExistente: parseNumero(found.cantidad_contabilidad),
          precioContabilidad: parseNumero(found.precio_contabilidad),
          sinVinculo: !isLikelyPersistentId(String(found.id || "")),
          categoriaKey:
            detectCategoryFromMaterial(found) === "otro"
              ? item.categoriaKey
              : (detectCategoryFromMaterial(found) as "inversor" | "bateria" | "panel"),
        };
      }),
    );
  };

  const handleDownloadFacturaCreadaPDF = async (
    factura: FacturaSolarCarroView,
  ) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
    const marginX = 16;
    const pageW = doc.internal.pageSize.getWidth();
    const rightX = pageW - marginX;
    let y = 16;

    try {
      let logoDataUrl = "";
      try {
        logoDataUrl = await loadImageAsDataUrl("/logo.png");
      } catch {
        logoDataUrl = await loadImageAsDataUrl(`${window.location.origin}/logo.png`);
      }
      const logoW = 24;
      const logoH = 24;
      doc.addImage(logoDataUrl, "PNG", pageW / 2 - logoW / 2, y, logoW, logoH);
      y += logoH + 5;
    } catch {
      // continuar sin logo
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("FACTURA", pageW / 2, y, { align: "center" });
    y += 8;

    const headerStartY = y;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Empresa instaladora: ${EMPRESA.nombre}`, marginX, y);
    y += 5;
    const dirLines = doc.splitTextToSize(`Dirección: ${EMPRESA.direccion}`, 112);
    doc.setFont("helvetica", "normal");
    doc.text(dirLines, marginX, y);
    y += dirLines.length * 4.5;
    doc.text(`NIT: ${EMPRESA.nit}`, marginX, y);

    const rightColX = pageW * 0.62;
    let yRight = headerStartY;
    doc.setFont("helvetica", "bold");
    doc.text(`No factura: ${factura.noFactura}`, rightColX, yRight);
    yRight += 5;
    doc.text(`Fecha: ${formatDate(factura.fecha)}`, rightColX, yRight);

    y = Math.max(y + 7, yRight + 6);
    doc.setDrawColor(190, 190, 190);
    doc.line(marginX, y, rightX, y);
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.text("Datos del cliente", marginX, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.text(`Nombre: ${factura.cliente.nombre || "-"}`, marginX, y);
    y += 5;
    doc.text(`Teléfono: ${factura.cliente.telefono || "-"}`, marginX, y);
    y += 5;
    const dirCliente = doc.splitTextToSize(
      `Dirección: ${factura.cliente.direccion || "-"}`,
      180,
    );
    doc.text(dirCliente, marginX, y);
    y += dirCliente.length * 4.5;
    doc.text(
      `${factura.cliente.documentoLabel || "Documento"}: ${factura.cliente.documentoValor || "-"}`,
      marginX,
      y,
    );

    y += 7;
    doc.line(marginX, y, rightX, y);
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.text("Materiales facturados:", marginX, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    const materialesLines =
      factura.materiales.length > 0
        ? factura.materiales.map(
            (m) => `${formatQty(parseNumero(m.cantidad))}x ${m.descripcion || m.codigo}`,
          )
        : ["Sin materiales"];
    const matLines = doc.splitTextToSize(materialesLines.join("\n"), 180);
    doc.text(matLines, marginX, y);
    y += matLines.length * 4.5 + 4;

    doc.line(marginX, y, rightX, y);
    y += 7;

    doc.setFont("helvetica", "bold");
    doc.text("Monto total", marginX, y);
    doc.setFont("helvetica", "normal");
    doc.text("Consultar factura registrada", rightX, y, { align: "right" });

    y += 22;
    const lineW = 52;
    doc.setDrawColor(120, 120, 120);
    doc.line(marginX + 18, y, marginX + 18 + lineW, y);
    doc.line(rightX - 18 - lineW, y, rightX - 18, y);
    y += 5;
    doc.text("Firma del Cliente", marginX + 24, y);
    doc.text("Firma del Representante de la Empresa", rightX - 80, y);

    const safe = (factura.noFactura || "factura_solar")
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 60);
    doc.save(`factura_solar_carros_${safe}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <ModuleHeader
        title="Facturas Solar Carros"
        subtitle="Instaladora, Ventas y Facturas creadas"
        badge={{ text: "Solar Carros", className: "bg-sky-100 text-sky-800" }}
        className="bg-white shadow-sm border-b border-orange-100"
        actions={
          <Link href="/facturas">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
          </Link>
        }
      />

      <main className="content-with-fixed-header max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Receipt className="h-5 w-5 text-sky-700" />
              Gestión de Facturas Solar Carros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="mb-4 flex flex-wrap h-auto gap-2">
                <TabsTrigger value="instaladora">Instaladora</TabsTrigger>
                <TabsTrigger value="ventas">Ventas</TabsTrigger>
                <TabsTrigger value="facturas">Facturas Creadas</TabsTrigger>
              </TabsList>

              <TabsContent value="instaladora">
                {loading ? (
                  <div className="py-10 text-center text-gray-600">
                    Cargando clientes de instaladora...
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="max-w-md">
                      <Label htmlFor="search-instaladora">Buscar en Instaladora</Label>
                      <Input
                        id="search-instaladora"
                        placeholder="Nombre, teléfono, carnet, componente..."
                        value={searchInstaladora}
                        onChange={(e) => setSearchInstaladora(e.target.value)}
                      />
                    </div>
                    <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-slate-50">
                          <th className="text-left px-3 py-2">Nombre</th>
                          <th className="text-left px-3 py-2">Dirección</th>
                          <th className="text-left px-3 py-2">Teléfono</th>
                          <th className="text-left px-3 py-2">Tipo Persona</th>
                          <th className="text-left px-3 py-2">Carnet / NIT</th>
                          <th className="text-left px-3 py-2">Último vale de salida</th>
                          <th className="text-left px-3 py-2">Componentes principales</th>
                          <th className="text-right px-3 py-2">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {instaladoraRowsFiltradas.map((row) => {
                          const rowKey = row.cliente.numero || row.cliente.id || row.cliente.nombre;
                          const creating = creatingClienteKey === rowKey;
                          return (
                            <tr key={rowKey} className="border-b hover:bg-slate-50/60">
                              <td className="px-3 py-2 font-medium">{row.cliente.nombre}</td>
                              <td className="px-3 py-2">{row.cliente.direccion || "-"}</td>
                              <td className="px-3 py-2">{row.cliente.telefono || "-"}</td>
                              <td className="px-3 py-2">{row.cliente.tipo_persona || "-"}</td>
                              <td className="px-3 py-2">{row.cliente.carnet_identidad || "-"}</td>
                              <td className="px-3 py-2">{formatDate(row.ultimaFechaValeSalida || undefined)}</td>
                              <td className="px-3 py-2">
                                <ul className="space-y-1">
                                  {row.componentesPrincipales.map((comp, idx) => (
                                    <li key={`${rowKey}-comp-${idx}`}>{comp}</li>
                                  ))}
                                </ul>
                              </td>
                              <td className="px-3 py-2 text-right">
                                <Button
                                  size="sm"
                                  onClick={() => void handleGenerarFacturaInstaladora(row)}
                                  disabled={creating}
                                  className="h-7 px-2 text-xs bg-sky-600 hover:bg-sky-700 text-white"
                                >
                                  {creating ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <FileText className="h-3.5 w-3.5 mr-1" />
                                      Factura
                                    </>
                                  )}
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                        {instaladoraRowsFiltradas.length === 0 && (
                          <tr>
                            <td colSpan={8} className="text-center py-6 text-gray-500">
                              {searchInstaladora.trim()
                                ? "No hay resultados para la búsqueda en Instaladora."
                                : 'No hay clientes con estado "Equipo instalado con éxito".'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="ventas">
                {loading ? (
                  <div className="py-10 text-center text-gray-600">
                    Cargando clientes de ventas...
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="max-w-md">
                      <Label htmlFor="search-ventas">Buscar en Ventas</Label>
                      <Input
                        id="search-ventas"
                        placeholder="Nombre, CI/NIT, teléfono, material..."
                        value={searchVentas}
                        onChange={(e) => setSearchVentas(e.target.value)}
                      />
                    </div>
                    <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-slate-50">
                          <th className="text-left px-3 py-2">Nombre</th>
                          <th className="text-left px-3 py-2">Dirección</th>
                          <th className="text-left px-3 py-2">Teléfono</th>
                          <th className="text-left px-3 py-2">CI / NIT</th>
                          <th className="text-left px-3 py-2">Compras</th>
                          <th className="text-right px-3 py-2">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rowsVentasConComprasFiltradas.map((row) => {
                          const rowKey = row.cliente.id || row.cliente.numero || row.cliente.nombre;
                          const creating = creatingVentaKey === rowKey;
                          return (
                            <tr key={rowKey} className="border-b hover:bg-slate-50/60">
                              <td className="px-3 py-2 font-medium">{row.cliente.nombre}</td>
                              <td className="px-3 py-2">{row.cliente.direccion || "-"}</td>
                              <td className="px-3 py-2">{row.cliente.telefono || "-"}</td>
                              <td className="px-3 py-2">{row.cliente.ci || "-"}</td>
                              <td className="px-3 py-2">
                                <ul className="space-y-1">
                                  {row.compras.map((compra) => (
                                    <li key={compra.key}>
                                      {compra.cantidad}x {compra.descripcion || compra.codigo || "Material"}
                                    </li>
                                  ))}
                                </ul>
                              </td>
                              <td className="px-3 py-2 text-right">
                                <Button
                                  size="sm"
                                  onClick={() => void handleGenerarFacturaVentas(row)}
                                  disabled={creating}
                                  className="h-7 px-2 text-xs bg-sky-600 hover:bg-sky-700 text-white"
                                >
                                  {creating ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <FileText className="h-3.5 w-3.5 mr-1" />
                                      Factura
                                    </>
                                  )}
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                        {rowsVentasConComprasFiltradas.length === 0 && (
                          <tr>
                            <td colSpan={6} className="text-center py-6 text-gray-500">
                              {searchVentas.trim()
                                ? "No hay resultados para la búsqueda en Ventas."
                                : "No hay clientes de ventas con compras registradas."}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="facturas">
                {loading ? (
                  <div className="py-10 text-center text-gray-600">Cargando facturas...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-slate-50">
                          <th className="text-left px-3 py-2">No factura</th>
                          <th className="text-left px-3 py-2">Datos del cliente</th>
                          <th className="text-left px-3 py-2">Materiales facturados</th>
                          <th className="text-right px-3 py-2">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {facturasSolar.map((factura) => {
                          const rowKey = factura.id || factura.noFactura;
                          return (
                            <tr key={rowKey} className="border-b hover:bg-slate-50/60 align-top">
                              <td className="px-3 py-2">
                                <p className="font-semibold text-gray-900">{factura.noFactura}</p>
                                <p className="text-xs text-gray-600">
                                  {formatDate(factura.fecha)} | {factura.origen === "instaladora" ? "Instaladora" : "Ventas"}
                                </p>
                              </td>
                              <td className="px-3 py-2">
                                <p className="font-medium">{factura.cliente.nombre || "-"}</p>
                                <p className="text-xs text-gray-700">Tel: {factura.cliente.telefono || "-"}</p>
                                <p className="text-xs text-gray-700">Dir: {factura.cliente.direccion || "-"}</p>
                                <p className="text-xs text-gray-700">
                                  {factura.cliente.documentoLabel || "Documento"}: {factura.cliente.documentoValor || "-"}
                                </p>
                              </td>
                              <td className="px-3 py-2">
                                <ul className="space-y-1">
                                  {(factura.materiales || []).map((m, idx) => (
                                    <li key={`${rowKey}-mat-${idx}`}>
                                      {formatQty(parseNumero(m.cantidad))}x {m.descripcion || m.codigo}
                                    </li>
                                  ))}
                                  {(factura.materiales || []).length === 0 && <li>-</li>}
                                </ul>
                              </td>
                              <td className="px-3 py-2 text-right">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void handleDownloadFacturaCreadaPDF(factura)}
                                >
                                  <FileText className="h-4 w-4 mr-1" />
                                  Descargar PDF
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                        {facturasSolar.length === 0 && (
                          <tr>
                            <td colSpan={4} className="text-center py-6 text-gray-500">
                              No hay facturas Solar Carros creadas todavía.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vista previa y edición de factura</DialogTitle>
          </DialogHeader>

          {previewDraft && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Número</Label>
                    <Input
                      value={previewDraft.numero_factura}
                      onChange={(e) =>
                        setPreviewDraft((prev) =>
                          prev ? { ...prev, numero_factura: e.target.value } : prev,
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label>Fecha</Label>
                    <Input
                      type="date"
                      value={previewDraft.fecha}
                      onChange={(e) =>
                        setPreviewDraft((prev) =>
                          prev ? { ...prev, fecha: e.target.value } : prev,
                        )
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tipo de persona</Label>
                    <select
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      value={previewDraft.persona_tipo}
                      onChange={(e) =>
                        setPreviewDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                persona_tipo: e.target.value as PersonaTipo,
                              }
                            : prev,
                        )
                      }
                    >
                      <option value="natural">Natural</option>
                      <option value="juridica">Jurídica</option>
                    </select>
                  </div>
                  <div>
                    <Label>Mostrar componentes</Label>
                    <select
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      value={previewDraft.detalle_modo}
                      onChange={(e) =>
                        setPreviewDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                detalle_modo: e.target.value as DetalleModo,
                              }
                            : prev,
                        )
                      }
                    >
                      <option value="cantidades">Con cantidades</option>
                      <option value="potencias">Potencias / capacidades</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label>Nombre cliente</Label>
                  <Input
                    value={previewDraft.cliente_nombre}
                    onChange={(e) =>
                      setPreviewDraft((prev) =>
                        prev ? { ...prev, cliente_nombre: e.target.value } : prev,
                      )
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Teléfono</Label>
                    <Input
                      value={previewDraft.cliente_telefono}
                      onChange={(e) =>
                        setPreviewDraft((prev) =>
                          prev ? { ...prev, cliente_telefono: e.target.value } : prev,
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label>{clienteDocumentoLabel}</Label>
                    <Input
                      value={previewDraft.cliente_documento}
                      onChange={(e) =>
                        setPreviewDraft((prev) =>
                          prev ? { ...prev, cliente_documento: e.target.value } : prev,
                        )
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label>Dirección</Label>
                  <Input
                    value={previewDraft.cliente_direccion}
                    onChange={(e) =>
                      setPreviewDraft((prev) =>
                        prev ? { ...prev, cliente_direccion: e.target.value } : prev,
                      )
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tasa de cambio del día (USD→CUP)</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={previewDraft.tasa_cambio_cup}
                      onChange={(e) =>
                        setPreviewDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                tasa_cambio_cup: parseNumero(e.target.value),
                              }
                            : prev,
                        )
                      }
                    />
                    {loadingTasa && (
                      <p className="text-xs text-gray-500 mt-1">Cargando tasa...</p>
                    )}
                    {tasaError && (
                      <p className="text-xs text-red-600 mt-1">{tasaError}</p>
                    )}
                  </div>
                  <div>
                    <Label>% adicional (solo persona natural)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      disabled={previewDraft.persona_tipo === "juridica"}
                      value={previewDraft.porcentaje_natural}
                      onChange={(e) =>
                        setPreviewDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                porcentaje_natural: parseNumero(e.target.value),
                              }
                            : prev,
                        )
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Base CUP (contabilidad)</Label>
                    <Input disabled value={formatMoney(baseNaturalCup, "CUP")} />
                  </div>
                  <div>
                    <Label>Aumento por % (CUP)</Label>
                    <Input disabled value={formatMoney(aumentoNaturalCup, "CUP")} />
                  </div>
                  <div>
                    <Label>Total CUP con aumento</Label>
                    <Input disabled value={formatMoney(totalFacturarCup, "CUP")} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Total USD equivalente</Label>
                    <Input disabled value={formatMoney(baseParaCalculoUsd, "USD")} />
                  </div>
                  <div>
                    <Label>Aumento por % (USD)</Label>
                    <Input disabled value={formatMoney(aumentoNaturalUsd, "USD")} />
                  </div>
                  <div>
                    <Label>Total USD con aumento</Label>
                    <Input disabled value={formatMoney(totalFacturarUsd, "USD")} />
                  </div>
                </div>

                <div>
                  <Label>Concepto</Label>
                  <div className="mt-2 rounded-md border overflow-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b">
                          <th className="text-left px-2 py-1.5">Cant.</th>
                          <th className="text-left px-2 py-1.5">Nombre</th>
                          <th className="text-left px-2 py-1.5">Código</th>
                          <th className="text-left px-2 py-1.5">Código Contab.</th>
                          <th className="text-right px-2 py-1.5">Precio Contab. (CUP)</th>
                          <th className="text-right px-2 py-1.5">Existencia</th>
                          <th className="text-left px-2 py-1.5">Vínculo</th>
                          <th className="text-left px-2 py-1.5">Editar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editableConceptItems.map((item) => (
                          <tr key={item.rowId} className="border-b last:border-b-0 align-top">
                            <td className="px-2 py-1.5 min-w-[92px]">
                              <Input
                                type="number"
                                step="1"
                                min={0}
                                className="h-8 text-sm text-right tabular-nums"
                                value={formatQty(parseNumero(item.cantidad))}
                                onChange={(e) => updateEditableCantidad(item.rowId, parseNumero(e.target.value))}
                              />
                            </td>
                            <td className="px-2 py-1.5">{item.descripcion || "-"}</td>
                            <td className="px-2 py-1.5">{item.codigo || "-"}</td>
                            <td className="px-2 py-1.5">{item.codigoContabilidad || "-"}</td>
                            <td className="px-2 py-1.5 text-right">
                              {formatMoney(item.precioContabilidad, "CUP")}
                            </td>
                            <td className={`px-2 py-1.5 text-right ${getExistenciaClass(item.cantidadExistente)}`}>
                              <div>{item.cantidadExistente.toFixed(2)}</div>
                              {parseNumero(item.cantidadExistente) <= 0 && (
                                <div className="text-[10px] text-red-600">No se puede agregar</div>
                              )}
                            </td>
                            <td className="px-2 py-1.5">
                              {item.sinVinculo ? (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-red-100 text-red-700 font-semibold">
                                  Sin vínculo
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-green-100 text-green-700 font-semibold">
                                  Vinculado
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-1.5 space-y-1">
                              <select
                                className="w-full border rounded px-2 py-1"
                                defaultValue=""
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value) replaceEditableItem(item.rowId, value);
                                  e.currentTarget.value = "";
                                }}
                              >
                                <option value="" disabled>
                                  Cambiar por...
                                </option>
                                {(materialesCatalogPorCategoria[item.categoriaKey] || []).map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.codigo} - {m.nombre || m.descripcion}
                                  </option>
                                ))}
                              </select>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => removeEditableItem(item.rowId)}
                              >
                                Quitar
                              </Button>
                            </td>
                          </tr>
                        ))}
                        {editableConceptItems.length === 0 && (
                          <tr>
                            <td colSpan={8} className="px-2 py-3 text-center text-gray-500">
                              {loadingCatalog ? "Cargando materiales..." : "Sin componentes principales editables."}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <Textarea
                    className="mt-2"
                    value={conceptoFinal}
                    onChange={(e) =>
                      setPreviewDraft((prev) =>
                        prev
                          ? {
                              ...prev,
                              usar_concepto_manual: true,
                              concepto_manual: e.target.value,
                            }
                          : prev,
                      )
                    }
                    rows={4}
                  />
                  {previewDraft.usar_concepto_manual && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() =>
                        setPreviewDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                usar_concepto_manual: false,
                                concepto_manual: "",
                              }
                            : prev,
                        )
                      }
                    >
                      Restaurar concepto automático
                    </Button>
                  )}
                </div>

                <div>
                  <Label>Importe total en CUP</Label>
                  <Input disabled value={formatMoney(totalFacturarCup, "CUP")} />
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button variant="outline" onClick={handlePrintPreview}>
                    Imprimir
                  </Button>
                  <Button variant="outline" onClick={handleDownloadPreviewPDF}>
                    Descargar PDF
                  </Button>
                  <Button onClick={() => void handleGuardarFactura()} disabled={previewSaving}>
                    {previewSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Guardar factura"
                    )}
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border bg-white p-5 shadow-sm">
                <div className="flex justify-center mb-3">
                  <Image
                    src="/logo.png"
                    alt="Logo empresa"
                    width={64}
                    height={64}
                    className="h-16 w-16 object-contain"
                  />
                </div>
                <p className="text-center text-xl font-bold tracking-wide mb-5">FACTURA</p>

                <div className="flex justify-between gap-6 text-sm">
                  <div className="w-3/5 space-y-1">
                    <p>
                      <span className="font-semibold">Empresa instaladora:</span> {EMPRESA.nombre}
                    </p>
                    <p>
                      <span className="font-semibold">Dirección:</span> {EMPRESA.direccion}
                    </p>
                    <p>
                      <span className="font-semibold">NIT:</span> {EMPRESA.nit}
                    </p>
                  </div>
                  <div className="w-2/5 space-y-1">
                    <p>
                      <span className="font-semibold">No factura:</span> {previewDraft.numero_factura || "-"}
                    </p>
                    <p>
                      <span className="font-semibold">Fecha:</span> {formatDate(previewDraft.fecha)}
                    </p>
                  </div>
                </div>

                <div className="border-t my-4" />

                <div className="text-sm space-y-1">
                  <p className="font-semibold">Datos del cliente</p>
                  <p>
                    <span className="font-semibold">Nombre:</span> {previewDraft.cliente_nombre || "-"}
                  </p>
                  <p>
                    <span className="font-semibold">Teléfono:</span> {previewDraft.cliente_telefono || "-"}
                  </p>
                  <p>
                    <span className="font-semibold">Dirección:</span> {previewDraft.cliente_direccion || "-"}
                  </p>
                  <p>
                    <span className="font-semibold">{clienteDocumentoLabel}:</span> {previewDraft.cliente_documento || "-"}
                  </p>
                </div>

                <div className="border-t my-4" />

                <div className="text-sm space-y-2">
                  <p>
                    <span className="font-semibold">Concepto:</span>
                  </p>
                  <p className="whitespace-pre-line">{conceptoFinal || "-"}</p>
                  <div className="border-t pt-2 mt-2">
                    <p className="flex justify-between gap-3">
                      <span className="font-semibold">Monto total</span>
                      <span>{formatAmountNumber(totalFacturarCup)} CUP</span>
                    </p>
                  </div>
                </div>

                <div className="mt-16 flex justify-between gap-6 text-center text-sm">
                  <div className="w-1/2">
                    <div className="border-t mb-2" />
                    <p>Firma del Cliente</p>
                  </div>
                  <div className="w-1/2">
                    <div className="border-t mb-2" />
                    <p>Firma del Representante de la Empresa</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
