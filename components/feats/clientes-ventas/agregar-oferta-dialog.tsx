"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { Card, CardContent } from "@/components/shared/molecule/card";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import { Badge } from "@/components/shared/atom/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import {
  Loader2,
  Search,
  Trash2,
  ShoppingCart,
  Package,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { apiRequest } from "@/lib/api-config";
import { InventarioService, SolicitudVentaService } from "@/lib/api-services";
import type { Almacen, MaterialVentaWeb, StockItem, OfertaVenta } from "@/lib/api-types";
import type { ClienteVenta } from "@/lib/api-types";
import { useToast } from "@/hooks/use-toast";

// ─── tipos locales ────────────────────────────────────────────────
interface LineaCarrito {
  material_id: string;
  codigo: string;
  descripcion: string;
  um: string;
  precio: number;
  cantidad: number;
  stock_disponible: number | null;
  descuento_porcentaje: number;
  descuento_tipo: "%" | "$";
  descuento_display: string;
  /** Máximo descuento permitido para este material (0-100). undefined = sin límite */
  max_descuento?: number;
}

const ESTADOS = [
  { value: "enviada", label: "Enviada" },
  { value: "confirmada", label: "Confirmada" },
  { value: "cancelada", label: "Cancelada" },
  { value: "pagada", label: "Pagada" },
];
const METODOS_PAGO = ["Efectivo", "Transferencia", "Tarjeta", "Otro"];
const MONEDAS = ["CUP", "USD", "MLC", "EUR"];

function fmt(n: number) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildStockMap(items: StockItem[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) {
    if (item.material_id) map.set(item.material_id, item.cantidad);
    if (item.material_codigo)
      map.set(`c:${item.material_codigo.trim().toLowerCase()}`, item.cantidad);
  }
  return map;
}

function lookupStock(map: Map<string, number>, id: string, codigo?: string): number | null {
  if (map.size === 0) return null;
  if (id && map.has(id)) return map.get(id)!;
  if (codigo) {
    const key = `c:${codigo.trim().toLowerCase()}`;
    if (map.has(key)) return map.get(key)!;
  }
  return 0;
}

// ─── componente ────────────────────────────────────────────────────
interface AgregarOfertaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente: ClienteVenta;
  onCreated?: () => void;
  /** Si se pasa, el dialog opera en modo edición (PATCH en lugar de POST) */
  ofertaToEdit?: OfertaVenta | null;
}

export function AgregarOfertaDialog({
  open,
  onOpenChange,
  cliente,
  onCreated,
  ofertaToEdit,
}: AgregarOfertaDialogProps) {
  const isEditMode = Boolean(ofertaToEdit);
  const { toast } = useToast();

  const [catalogo, setCatalogo] = useState<MaterialVentaWeb[]>([]);
  const [loadingCatalogo, setLoadingCatalogo] = useState(false);

  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [loadingAlmacenes, setLoadingAlmacenes] = useState(false);
  const [almacenId, setAlmacenId] = useState("");

  const stockMapRef = useRef<Map<string, number>>(new Map());
  const [loadingStock, setLoadingStock] = useState(false);
  const [stockVersion, setStockVersion] = useState(0);

  const [busqueda, setBusqueda] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [carrito, setCarrito] = useState<LineaCarrito[]>([]);

  const [estado, setEstado] = useState("enviada");
  const [metodoPago, setMetodoPago] = useState("");
  const [moneda, setMoneda] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ── reset + carga inicial ─────────────────────────────────────
  useEffect(() => {
    if (!open) return;

    stockMapRef.current = new Map();
    setStockVersion(0);
    setBusqueda("");
    setFiltroCategoria("");

    if (ofertaToEdit) {
      // Modo edición: pre-poblar desde la oferta existente
      setAlmacenId(ofertaToEdit.almacen_id ?? "");
      setEstado(ofertaToEdit.estado ?? "enviada");
      setMetodoPago(ofertaToEdit.metodo_pago ?? "");
      setMoneda(ofertaToEdit.moneda_pago ?? "");
      setCarrito(
        ofertaToEdit.materiales.map((m) => ({
          material_id: m.material_id,
          codigo: m.codigo ?? "",
          descripcion: m.descripcion ?? m.material_id,
          um: m.um ?? "u",
          precio: m.precio,
          cantidad: m.cantidad,
          stock_disponible: null, // se actualiza cuando carga el stock
          descuento_porcentaje: m.descuento_porcentaje ?? 0,
          descuento_tipo: "%" as const,
          descuento_display: String(m.descuento_porcentaje ?? 0),
        })),
      );
    } else {
      // Modo creación: limpiar todo
      setAlmacenId("");
      setCarrito([]);
      setEstado("enviada");
      setMetodoPago("");
      setMoneda("");
    }

    setLoadingCatalogo(true);
    SolicitudVentaService.getMaterialesVendiblesWeb()
      .then((data) => setCatalogo(data))
      .catch(() => setCatalogo([]))
      .finally(() => setLoadingCatalogo(false));

    setLoadingAlmacenes(true);
    InventarioService.getAlmacenes()
      .then((data) => setAlmacenes(data))
      .catch(() => setAlmacenes([]))
      .finally(() => setLoadingAlmacenes(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── stock al cambiar almacén ──────────────────────────────────
  useEffect(() => {
    if (!almacenId) {
      stockMapRef.current = new Map();
      setStockVersion((v) => v + 1);
      return;
    }
    setLoadingStock(true);
    InventarioService.getStock({ almacen_id: almacenId, limit: 500 })
      .then(({ data }) => {
        stockMapRef.current = buildStockMap(data);
        setStockVersion((v) => v + 1);
        setCarrito((prev) =>
          prev.map((l) => ({
            ...l,
            stock_disponible: lookupStock(stockMapRef.current, l.material_id, l.codigo),
          })),
        );
      })
      .catch(() => {
        stockMapRef.current = new Map();
        setStockVersion((v) => v + 1);
      })
      .finally(() => setLoadingStock(false));
  }, [almacenId]);

  // ── categorías únicas del catálogo ───────────────────────────
  const categoriasUnicas = useMemo(() => {
    const set = new Set<string>();
    catalogo.forEach((m) => { if (m.categoria) set.add(m.categoria); });
    return Array.from(set).sort();
  }, [catalogo]);

  // ── catálogo cruzado con stock ────────────────────────────────
  const materialesVisibles = useMemo(() => {
    void stockVersion;
    const q = busqueda.trim().toLowerCase();
    return catalogo
      .filter((m) => {
        if (filtroCategoria && m.categoria !== filtroCategoria) return false;
        if (!q) return true;
        return (
          m.nombre?.toLowerCase().includes(q) ||
          m.codigo?.toLowerCase().includes(q) ||
          m.descripcion?.toLowerCase().includes(q) ||
          m.categoria?.toLowerCase().includes(q)
        );
      })
      .map((m) => ({
        ...m,
        stock: almacenId ? lookupStock(stockMapRef.current, m.id, m.codigo) : null,
      }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogo, busqueda, carrito, almacenId, stockVersion]);

  // ── cálculos ──────────────────────────────────────────────────
  const { totalBruto, totalFinal } = useMemo(() => {
    let bruto = 0;
    let final = 0;
    for (const l of carrito) {
      const subtotalBruto = l.precio * l.cantidad;
      const maxPct = l.max_descuento ?? 100;
      const pct = Math.min(l.descuento_porcentaje, maxPct);
      const subtotalFinal = subtotalBruto * (1 - pct / 100);
      bruto += subtotalBruto;
      final += subtotalFinal;
    }
    return { totalBruto: bruto, totalFinal: final };
  }, [carrito]);

  const hasDescuentoError = carrito.some(
    (l) => l.max_descuento !== undefined && l.descuento_porcentaje > l.max_descuento,
  );

  // ── carrito helpers ───────────────────────────────────────────
  function agregarAlCarrito(mat: MaterialVentaWeb & { stock?: number | null }) {
    setCarrito((prev) => {
      const existente = prev.find((l) => l.material_id === mat.id);
      if (existente) {
        // sumar +1 igual que en confección (respetando stock)
        const max = existente.stock_disponible ?? Infinity;
        if (existente.cantidad >= max) return prev;
        return prev.map((l) =>
          l.material_id === mat.id ? { ...l, cantidad: l.cantidad + 1 } : l,
        );
      }
      return [
        ...prev,
        {
          material_id: mat.id,
          codigo: mat.codigo,
          descripcion: mat.nombre ?? mat.descripcion ?? mat.codigo,
          um: mat.um ?? "u",
          precio: mat.precio ?? 0,
          cantidad: 1,
          stock_disponible: mat.stock ?? null,
          descuento_porcentaje: 0,
          descuento_tipo: "%",
          descuento_display: "0",
          max_descuento: typeof mat.porciento_rebajable_venta === "number" ? mat.porciento_rebajable_venta : undefined,
        },
      ];
    });
  }

  function cambiarCantidad(materialId: string, nuevaCantidad: number) {
    if (nuevaCantidad <= 0) {
      setCarrito((prev) => prev.filter((l) => l.material_id !== materialId));
      return;
    }
    setCarrito((prev) =>
      prev.map((l) => {
        if (l.material_id !== materialId) return l;
        const max = l.stock_disponible ?? Infinity;
        return { ...l, cantidad: Math.min(nuevaCantidad, max) };
      }),
    );
  }

  function eliminarDelCarrito(materialId: string) {
    setCarrito((prev) => prev.filter((l) => l.material_id !== materialId));
  }

  function cantidadEnCarrito(materialId: string) {
    return carrito.find((l) => l.material_id === materialId)?.cantidad ?? 0;
  }

  function handleDescuentoChange(materialId: string, value: string) {
    setCarrito((prev) =>
      prev.map((item) => {
        if (item.material_id !== materialId) return item;
        const raw = Number(value);
        if (!Number.isFinite(raw) || raw < 0) {
          return { ...item, descuento_display: value };
        }
        // Convertir a % para comparar con el máximo
        const pct = item.descuento_tipo === "$"
          ? (item.precio > 0 ? (raw / item.precio) * 100 : 0)
          : raw;
        const maxPct = item.max_descuento ?? 100;
        const descuento_porcentaje = Math.min(pct, maxPct);
        // Si se recortó, corregir también el display
        const displayFinal = pct > maxPct
          ? (item.descuento_tipo === "$"
              ? (item.precio * maxPct / 100).toFixed(2)
              : String(maxPct))
          : value;
        return { ...item, descuento_display: displayFinal, descuento_porcentaje };
      }),
    );
  }

  function handleDescuentoTipoChange(materialId: string, tipo: "%" | "$") {
    setCarrito((prev) =>
      prev.map((item) => {
        if (item.material_id !== materialId) return item;
        const display =
          tipo === "$"
            ? (item.precio * item.descuento_porcentaje / 100).toFixed(2)
            : String(item.descuento_porcentaje);
        return { ...item, descuento_tipo: tipo, descuento_display: display };
      }),
    );
  }

  // ── enviar ────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!almacenId) { toast({ title: "Selecciona un almacén", variant: "destructive" }); return; }
    if (carrito.length === 0) { toast({ title: "Agrega al menos un material", variant: "destructive" }); return; }

    setSubmitting(true);
    try {
      const materialesPayload = carrito.map((l) => ({
        material_id: l.material_id,
        cantidad: l.cantidad,
        precio: l.precio,
        ...(l.descuento_porcentaje > 0
          ? { descuento_porcentaje: parseFloat(Math.min(l.descuento_porcentaje, l.max_descuento ?? 100).toFixed(4)) }
          : {}),
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let raw: any;

      if (isEditMode && ofertaToEdit) {
        // PATCH — modo edición
        const patchPayload: Record<string, unknown> = {
          almacen_id: almacenId,
          materiales: materialesPayload,
          estado,
          ...(metodoPago ? { metodo_pago: metodoPago } : {}),
          ...(moneda ? { moneda_pago: moneda } : {}),
        };
        raw = await apiRequest<any>(`/operaciones/ofertas-ventas/${encodeURIComponent(ofertaToEdit.id)}`, {
          method: "PATCH",
          body: JSON.stringify(patchPayload),
        });
      } else {
        // POST — modo creación
        const postPayload: Record<string, unknown> = {
          cliente_venta_id: cliente.id,
          almacen_id: almacenId,
          materiales: materialesPayload,
          estado,
          ...(metodoPago ? { metodo_pago: metodoPago } : {}),
          ...(moneda ? { moneda_pago: moneda } : {}),
        };
        raw = await apiRequest<any>("/operaciones/ofertas-ventas/", {
          method: "POST",
          body: JSON.stringify(postPayload),
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((raw as any).success === false) throw new Error((raw as any).message || "Error al procesar la oferta");

      toast({
        title: isEditMode ? "Oferta actualizada" : "Oferta creada",
        description: isEditMode
          ? "Los cambios se guardaron correctamente"
          : `Oferta para ${cliente.nombre} creada correctamente`,
      });
      onCreated?.();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "No se pudo procesar la oferta",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  // ─────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-hidden flex flex-col p-0">
        {/* header */}
        <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ShoppingCart className="h-5 w-5 text-orange-600" />
            {isEditMode ? "Editar Oferta" : "Nueva Oferta"} —{" "}
            <span className="text-orange-600 font-semibold">{cliente.nombre}</span>
            {isEditMode && ofertaToEdit?.codigo && (
              <span className="text-sm font-normal text-gray-500">({ofertaToEdit.codigo})</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">

          {/* ══ columna izquierda: catálogo en cards ══ */}
          <div className="w-[48%] border-r flex flex-col overflow-hidden">

            {/* sticky: almacén + buscador */}
            <div className="sticky top-0 z-10 px-4 pt-4 pb-3 border-b bg-white shrink-0 space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-slate-700 whitespace-nowrap">Almacén:</label>
                <Select value={almacenId} onValueChange={setAlmacenId} disabled={loadingAlmacenes}>
                  <SelectTrigger className={`flex-1 h-9 ${!almacenId ? "border-orange-300 bg-orange-50" : ""}`}>
                    <SelectValue placeholder={loadingAlmacenes ? "Cargando..." : "Seleccionar almacén"} />
                  </SelectTrigger>
                  <SelectContent>
                    {almacenes.map((a) => (
                      <SelectItem key={a.id ?? a.nombre} value={a.id ?? a.nombre}>{a.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {almacenId && (
                  <Badge variant="outline" className="text-xs shrink-0">
                    {materialesVisibles.length} mat.
                  </Badge>
                )}
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  {loadingCatalogo
                    ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />
                    : <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  }
                  <Input
                    className="pl-10 h-9"
                    placeholder={loadingCatalogo ? "Cargando catálogo..." : "Buscar por descripción o código..."}
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    disabled={loadingCatalogo}
                  />
                  {busqueda && (
                    <button type="button" onClick={() => setBusqueda("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs">
                      ✕
                    </button>
                  )}
                </div>

                <Select
                  value={filtroCategoria || "__all__"}
                  onValueChange={(v) => setFiltroCategoria(v === "__all__" ? "" : v)}
                  disabled={loadingCatalogo}
                >
                  <SelectTrigger className="h-9 w-40 shrink-0 text-xs">
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[260px] overflow-y-auto">
                    <SelectItem value="__all__">Todas</SelectItem>
                    {categoriasUnicas.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!almacenId && (
                <p className="text-xs text-orange-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  Selecciona un almacén para ver el stock disponible
                </p>
              )}
            </div>

            {/* grid de cards */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {loadingCatalogo ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                </div>
              ) : materialesVisibles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                  <Package className="h-12 w-12 text-gray-300" />
                  <p className="text-base font-medium text-gray-600">
                    {busqueda ? `Sin resultados para "${busqueda}"` : "No hay materiales vendibles"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {materialesVisibles.map((mat) => {
                    const enCarrito = cantidadEnCarrito(mat.id);
                    const stock = mat.stock;

                    return (
                      <Card
                        key={mat.id}
                        className="cursor-pointer hover:shadow-md transition-shadow border border-slate-200 bg-white overflow-hidden"
                        onClick={() => agregarAlCarrito(mat)}
                      >
                        <CardContent className="p-2 flex flex-col h-full">
                          {/* imagen */}
                          <div className="relative h-16 bg-gradient-to-br from-slate-50 to-slate-100 rounded-md mb-1.5 flex items-center justify-center overflow-hidden border border-slate-200">
                            {mat.foto ? (
                              <>
                                <img
                                  src={mat.foto}
                                  alt={mat.nombre ?? mat.descripcion}
                                  className="w-full h-full object-contain p-2"
                                  onError={(e) => {
                                    const t = e.target as HTMLImageElement;
                                    t.style.display = "none";
                                    const fb = t.nextElementSibling as HTMLElement;
                                    if (fb) fb.classList.remove("hidden");
                                  }}
                                />
                                <div className="hidden w-full h-full items-center justify-center">
                                  <Package className="h-5 w-5 text-slate-300" />
                                </div>
                              </>
                            ) : (
                              <Package className="h-5 w-5 text-slate-300" />
                            )}
                            {/* badge cantidad en carrito */}
                            {enCarrito > 0 && (
                              <span className="absolute top-2 right-2 rounded-full bg-orange-600 text-white text-xs font-bold px-2.5 py-1 shadow-lg border-2 border-white z-10">
                                {enCarrito}
                              </span>
                            )}
                          </div>

                          {/* badge stock — viene de getStock cruzado */}
                          {almacenId && (
                            loadingStock ? (
                              <div className="mb-1 flex items-center gap-1 text-[10px] text-gray-400">
                                <Loader2 className="h-2.5 w-2.5 animate-spin" /> stock...
                              </div>
                            ) : stock !== null ? (
                              <div className="mb-1">
                                <span className={`inline-block rounded text-white text-[10px] font-semibold px-1.5 py-0.5 ${
                                  stock > 10 ? "bg-emerald-600" : stock > 0 ? "bg-amber-600" : "bg-red-600"
                                }`}>
                                  Stock: {stock}
                                </span>
                              </div>
                            ) : null
                          )}

                          {/* nombre */}
                          <div className="flex-1 flex flex-col min-h-0">
                            <h3 className="font-medium text-xs line-clamp-2 text-slate-900 break-words mb-1"
                              title={mat.nombre ?? mat.descripcion}>
                              {mat.nombre ?? mat.descripcion}
                            </h3>

                            {mat.codigo && (
                              <p className="text-[10px] font-mono text-gray-400 mb-1 truncate">
                                {mat.codigo}
                              </p>
                            )}

                            <div className="mt-auto space-y-1">
                              <div className="flex items-center justify-between gap-1">
                                <p className="text-sm font-semibold text-orange-600">
                                  ${mat.precio != null ? fmt(mat.precio) : "0.00"}
                                </p>
                              </div>

                              {mat.categoria && (
                                <Badge variant="outline"
                                  className="text-[10px] border-blue-200 text-blue-700 bg-blue-50 w-fit max-w-full truncate px-1.5 py-0"
                                  title={mat.categoria}>
                                  {mat.categoria}
                                </Badge>
                              )}

                              {/* controles de cantidad */}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ══ columna derecha: tabla de materiales + resumen ══ */}
          <div className="w-[52%] flex flex-col overflow-hidden">

            {/* tabla de materiales con descuento por ítem */}
            <div className="flex-1 overflow-y-auto">
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Materiales seleccionados
                </p>
                {carrito.length > 0 && (
                  <Badge variant="outline" className="text-xs bg-orange-50 text-orange-600 border-orange-200">
                    {carrito.length} ítem{carrito.length !== 1 ? "s" : ""}
                  </Badge>
                )}
              </div>

              {carrito.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                  <ShoppingCart className="h-10 w-10" />
                  <p className="text-sm">Agrega materiales desde la izquierda</p>
                </div>
              ) : (
                <div className="px-2 pb-2">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-t">
                        <th className="text-left py-2 px-2 font-medium text-gray-600">Material</th>
                        <th className="text-center py-2 px-1 font-medium text-gray-600 w-16">Cant.</th>
                        <th className="text-right py-2 px-1 font-medium text-gray-600 w-16">P.Unit</th>
                        <th className="text-left py-2 px-1 font-medium text-gray-600 w-36">Descuento</th>
                        <th className="text-right py-2 px-1 font-medium text-gray-600 w-16">Total</th>
                        <th className="w-7" />
                      </tr>
                    </thead>
                    <tbody>
                      {carrito.map((linea) => {
                        const sinStock = linea.stock_disponible !== null && linea.cantidad > (linea.stock_disponible ?? Infinity);
                        const pct = linea.descuento_porcentaje;
                        const maxPct = linea.max_descuento ?? 100;
                        const descuentoExcedido = pct > maxPct;
                        const precioConDesc = linea.precio * (1 - Math.min(pct, maxPct) / 100);
                        const totalLinea = precioConDesc * linea.cantidad;
                        return (
                          <tr key={linea.material_id}
                            className={`border-b last:border-b-0 ${sinStock ? "bg-red-50/60" : ""}`}>
                            {/* nombre */}
                            <td className="py-2 px-2">
                              <p className="font-medium text-gray-900 break-words leading-tight">
                                {linea.descripcion}
                              </p>
                              <p className="text-[10px] text-gray-400">
                                {linea.codigo}{linea.um ? ` · ${linea.um}` : ""}
                                {linea.stock_disponible !== null && (
                                  <span className={sinStock ? " text-red-600 font-semibold" : ""}>
                                    {" · Stock: "}{linea.stock_disponible}
                                  </span>
                                )}
                              </p>
                            </td>
                            {/* cantidad */}
                            <td className="py-2 px-1 w-16">
                              <Input
                                type="number" min="0" step="1"
                                className="h-7 w-14 text-center text-xs"
                                value={linea.cantidad}
                                onChange={(e) => cambiarCantidad(linea.material_id, parseInt(e.target.value) || 0)}
                              />
                            </td>
                            {/* precio unit */}
                            <td className="py-2 px-1 text-right text-gray-700 w-16">
                              {linea.precio > 0 ? `$${linea.precio.toFixed(2)}` : <span className="text-gray-400">—</span>}
                            </td>
                            {/* descuento con toggle % / $ */}
                            <td className="py-2 px-1 w-36">
                              <div className="flex items-center gap-1">
                                <div className="flex rounded border border-gray-200 overflow-hidden shrink-0">
                                  <button type="button"
                                    onClick={() => handleDescuentoTipoChange(linea.material_id, "%")}
                                    className={`px-1.5 py-1 text-[10px] transition-colors ${linea.descuento_tipo === "%" ? "bg-orange-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                                    %
                                  </button>
                                  <button type="button"
                                    onClick={() => handleDescuentoTipoChange(linea.material_id, "$")}
                                    disabled={linea.precio <= 0}
                                    className={`px-1.5 py-1 text-[10px] transition-colors ${linea.descuento_tipo === "$" ? "bg-orange-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"} disabled:opacity-40`}>
                                    $
                                  </button>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <Input
                                    type="number" min="0" step={linea.descuento_tipo === "$" ? "0.01" : "0.5"}
                                    value={linea.descuento_display}
                                    onChange={(e) => handleDescuentoChange(linea.material_id, e.target.value)}
                                    className={`h-7 text-right w-full text-xs ${descuentoExcedido ? "border-red-400" : ""}`}
                                  />
                                  {linea.max_descuento !== undefined && (
                                    <p className="text-[10px] text-right leading-tight mt-0.5 text-gray-400">
                                      máx {linea.max_descuento}%
                                    </p>
                                  )}
                                  {pct > 0 && !descuentoExcedido && (
                                    <p className="text-[10px] text-right leading-tight mt-0.5 text-orange-500">
                                      {linea.descuento_tipo === "$"
                                        ? `= ${pct.toFixed(1)}%`
                                        : `= $${(linea.precio * pct / 100).toFixed(2)}`}
                                    </p>
                                  )}
                                  {descuentoExcedido && (
                                    <p className="text-[10px] text-right leading-tight mt-0.5 text-red-600 font-semibold">
                                      máx {maxPct}%
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            {/* total línea */}
                            <td className="py-2 px-1 text-right font-medium text-gray-800 w-16">
                              {linea.precio > 0
                                ? <span className={pct > 0 ? "text-green-700" : ""}>${fmt(totalLinea)}</span>
                                : <span className="text-gray-400">—</span>}
                            </td>
                            {/* eliminar */}
                            <td className="py-2 px-1">
                              <button onClick={() => eliminarDelCarrito(linea.material_id)}
                                className="text-red-400 hover:text-red-600">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {carrito.length > 0 && (
                      <tfoot>
                        <tr className="border-t bg-gray-50">
                          <td colSpan={4} className="py-2 px-2 text-right text-xs font-semibold text-gray-700">
                            Total a pagar
                          </td>
                          <td className="py-2 px-1 text-right font-bold text-gray-900 text-xs">
                            ${fmt(totalFinal)}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </div>

            {/* panel inferior: estado + moneda + método + botones */}
            <div className="border-t px-4 py-3 space-y-3 bg-gray-50 shrink-0">
              {/* totales */}
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Total bruto</span>
                <span className="font-medium">${fmt(totalBruto)}</span>
              </div>

              {/* precio final */}
              <div className="flex justify-between items-center bg-orange-600 text-white rounded-lg px-3 py-2">
                <span className="text-sm font-medium">Precio final</span>
                <span className="text-lg font-bold">${fmt(totalFinal)}</span>
              </div>

              {/* estado + moneda */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-gray-600 mb-1 block">Estado <span className="text-red-500">*</span></Label>
                  <Select value={estado} onValueChange={setEstado}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ESTADOS.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-gray-600 mb-1 block">Moneda</Label>
                  <Select value={moneda} onValueChange={setMoneda}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Opcional" /></SelectTrigger>
                    <SelectContent>
                      {MONEDAS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs text-gray-600 mb-1 block">Método de pago</Label>
                <Select value={metodoPago} onValueChange={setMetodoPago}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    {METODOS_PAGO.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1 h-9"
                  onClick={() => onOpenChange(false)} disabled={submitting}>
                  Cancelar
                </Button>
                <Button className="flex-1 h-9 bg-orange-600 hover:bg-orange-700 text-white"
                  onClick={handleSubmit}
                  disabled={submitting || carrito.length === 0 || !almacenId || hasDescuentoError}>
                  {submitting
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{isEditMode ? "Guardando..." : "Creando..."}</>
                    : <><ChevronRight className="h-4 w-4 mr-1" />{isEditMode ? "Guardar cambios" : "Crear oferta"}</>
                  }
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
