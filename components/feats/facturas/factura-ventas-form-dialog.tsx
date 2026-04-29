"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/shared/molecule/dialog";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import { Checkbox } from "@/components/shared/molecule/checkbox";
import { Eye, Loader2, Package, Search, X, User, DollarSign } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { ClienteVentaService } from "@/lib/services/feats/clientes-ventas/cliente-venta-service";
import { facturaService } from "@/lib/services/feats/facturas/factura-service";
import { DevolucionValeService } from "@/lib/api-services";
import type {
  Factura,
} from "@/lib/types/feats/facturas/factura-types";
import type {
  ValeSalida,
  ValeSalidaMaterialItemDetalle,
} from "@/lib/api-types";
import type { ClienteVenta } from "@/lib/types/feats/clientes-ventas/cliente-venta-types";
import type { Material } from "@/lib/material-types";

interface FacturaVentasFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  factura?: Factura | null;
  prefillClienteId?: string | null;
  prefillVales?: ValeSalida[] | null;
  onSave: (
    factura: Omit<Factura, "id" | "fecha_creacion" | "total">,
  ) => Promise<void>;
  onGetNumeroSugerido: () => Promise<{
    numero_sugerido: string;
    mensaje: string;
  }>;
  materials: Material[];
}

type MaterialWithOptionalIds = Material & {
  _id?: string;
  material_id?: string;
};

const buildValeCode = (vale: ValeSalida) =>
  vale.codigo ||
  vale.solicitud_venta?.codigo ||
  vale.solicitud_material?.codigo ||
  vale.solicitud?.codigo ||
  `VALE-${vale.id.slice(-6).toUpperCase()}`;

const getValeClienteName = (vale: ValeSalida) =>
  vale.solicitud_venta?.cliente_venta?.nombre ||
  vale.solicitud_venta?.cliente?.nombre ||
  vale.solicitud_material?.cliente?.nombre ||
  vale.solicitud?.cliente_venta?.nombre ||
  vale.solicitud?.cliente?.nombre ||
  "Sin cliente";

const getValeItemCode = (item: ValeSalidaMaterialItemDetalle) =>
  item.codigo || item.material_codigo || item.material?.codigo || "-";

const getValeItemDescription = (item: ValeSalidaMaterialItemDetalle) =>
  item.descripcion ||
  item.material_descripcion ||
  item.material?.descripcion ||
  item.material?.nombre ||
  "Sin descripcion";

const toSafeNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeMaterialId = (value: unknown): string =>
  String(value ?? "").trim();

const ajustarValeConDevoluciones = async (
  vale: ValeSalida,
): Promise<ValeSalida> => {
  const valeId = String(vale.id || "").trim();
  if (!valeId || !Array.isArray(vale.materiales) || vale.materiales.length === 0) {
    return vale;
  }

  try {
    const resumen = await DevolucionValeService.getResumenPorVale(valeId);
    const restantesPorMaterial = new Map<string, number>();

    (resumen?.materiales || []).forEach((material) => {
      const materialId = normalizeMaterialId(material.material_id);
      if (!materialId) return;
      restantesPorMaterial.set(materialId, toSafeNumber(material.cantidad_devuelta));
    });

    if (restantesPorMaterial.size === 0) return vale;

    const materialesAjustados = vale.materiales.map((material) => {
      const materialId = normalizeMaterialId(material.material_id);
      const cantidadOriginal = toSafeNumber(material.cantidad);
      if (!materialId || cantidadOriginal <= 0) return material;

      const restanteDevuelto = toSafeNumber(restantesPorMaterial.get(materialId));
      if (restanteDevuelto <= 0) return material;

      const descuento = Math.min(cantidadOriginal, restanteDevuelto);
      restantesPorMaterial.set(materialId, restanteDevuelto - descuento);

      return {
        ...material,
        cantidad: Math.max(0, cantidadOriginal - descuento),
      };
    });

    return { ...vale, materiales: materialesAjustados };
  } catch {
    return vale;
  }
};

const findMaterialForValeItem = (
  item: ValeSalidaMaterialItemDetalle,
  materials: Material[],
) => {
  const itemCode =
    item.codigo?.toString().trim().toUpperCase() ||
    item.material_codigo?.toString().trim().toUpperCase() ||
    item.material?.codigo?.toString().trim().toUpperCase() ||
    "";

  if (itemCode) {
    const byCode = materials.find(
      (material) =>
        String(material.codigo || "").trim().toUpperCase() === itemCode,
    );
    if (byCode) return byCode;
  }

  const itemId = (item.material_id || "").toString().trim();
  if (!itemId) return null;

  return (
    materials.find((material) => {
      const m = material as MaterialWithOptionalIds;
      const candidates = [m._id, material.id, m.material_id, material.producto_id]
        .filter((v): v is string => Boolean(v))
        .map((v) => v.toString());
      return candidates.includes(itemId);
    }) || null
  );
};

// Mapea un vale de salida al formato de vale de factura sin descuentos (ventas usa precio original)
const mapValeToFacturaVale = (
  vale: ValeSalida,
  materials: Material[],
): Factura["vales"][number] => {
  const items = (vale.materiales || []).map((item, index) => {
    const matchedMaterial = findMaterialForValeItem(item, materials);
    const materialCode =
      item.codigo?.toString() ||
      item.material_codigo?.toString() ||
      item.material?.codigo?.toString() ||
      matchedMaterial?.codigo?.toString() ||
      `ITEM-${index + 1}`;
    const materialDescription =
      item.descripcion ||
      item.material_descripcion ||
      item.material?.descripcion ||
      item.material?.nombre ||
      matchedMaterial?.descripcion ||
      "Sin descripcion";
    // Ventas: precio original sin descuento automático
    const precio = Number(item.material?.precio ?? matchedMaterial?.precio ?? 0);

    return {
      material_id: (item.material_id || matchedMaterial?.id || "").toString(),
      codigo: materialCode,
      descripcion: materialDescription,
      precio,
      cantidad: Number(item.cantidad || 0),
    };
  });

  return {
    id: vale.id,
    id_vale_salida: vale.id,
    fecha: vale.fecha_creacion || new Date().toISOString(),
    items,
  };
};

// Selector inline de ClienteVenta
function ClienteVentaSelector({
  clientes,
  value,
  onChange,
  loading,
}: {
  clientes: ClienteVenta[];
  value: string;
  onChange: (id: string) => void;
  loading: boolean;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showResults, setShowResults] = useState(false);

  const selected = clientes.find((c) => c.id === value);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return clientes.filter(
      (c) =>
        c.nombre?.toLowerCase().includes(term) ||
        c.numero?.toLowerCase().includes(term) ||
        c.telefono?.toLowerCase().includes(term),
    );
  }, [clientes, searchTerm]);

  const handleSelect = (id: string) => {
    onChange(id);
    setSearchTerm("");
    setShowResults(false);
  };

  const handleClear = () => {
    onChange("");
    setSearchTerm("");
    setShowResults(false);
  };

  return (
    <div className="space-y-2">
      <Label>Buscar cliente de ventas</Label>
      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando clientes...
        </div>
      )}
      {selected ? (
        <div className="flex items-center gap-2 rounded-md border border-blue-300 bg-blue-50 p-3">
          <User className="h-4 w-4 text-blue-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-gray-900 truncate">{selected.nombre}</p>
            {selected.numero && (
              <p className="text-xs text-gray-500">N° {selected.numero}</p>
            )}
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={handleClear} className="h-6 w-6 shrink-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre, número o teléfono..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              onBlur={() => setTimeout(() => setShowResults(false), 200)}
              className="pl-9"
            />
          </div>
          {showResults && filtered.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-52 overflow-y-auto">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                  onMouseDown={() => handleSelect(c.id)}
                >
                  <p className="font-medium text-sm text-gray-900">{c.nombre}</p>
                  {c.numero && <p className="text-xs text-gray-500">N° {c.numero}</p>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function FacturaVentasFormDialog({
  open,
  onOpenChange,
  factura,
  prefillClienteId = null,
  prefillVales,
  onSave,
  onGetNumeroSugerido,
  materials,
}: FacturaVentasFormDialogProps) {
  const { token } = useAuth();
  const hasPrefilledVales = !factura && (prefillVales?.length || 0) > 0;

  const [formData, setFormData] = useState<
    Omit<Factura, "id" | "fecha_creacion" | "total">
  >({
    numero_factura: "",
    tipo: "venta",
    subtipo: "cliente",
    cliente_id: null,
    trabajador_ci: null,
    nombre_responsable: null,
    vales: [],
    pagada: true,
    terminada: true,
  });

  const [clientes, setClientes] = useState<ClienteVenta[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [loadingNumero, setLoadingNumero] = useState(false);
  const [valesDisponibles, setValesDisponibles] = useState<ValeSalida[]>([]);
  const [loadingVales, setLoadingVales] = useState(false);
  const [valesError, setValesError] = useState<string | null>(null);
  const [selectedValeIds, setSelectedValeIds] = useState<string[]>([]);
  const [valePreview, setValePreview] = useState<ValeSalida | null>(null);
  const [saving, setSaving] = useState(false);
  const [itemDiscounts, setItemDiscounts] = useState<Record<string, number>>({});

  const loadClientes = useCallback(async () => {
    setLoadingClientes(true);
    try {
      const data = await ClienteVentaService.getClientes({ limit: 500 });
      setClientes(data);
    } catch {
      setClientes([]);
    } finally {
      setLoadingClientes(false);
    }
  }, []);

  const loadNumeroSugerido = useCallback(async () => {
    setLoadingNumero(true);
    try {
      const result = await onGetNumeroSugerido();
      setFormData((prev) => ({ ...prev, numero_factura: result.numero_sugerido }));
    } catch {
      // noop
    } finally {
      setLoadingNumero(false);
    }
  }, [onGetNumeroSugerido]);

  // Cargar datos base al abrir
  useEffect(() => {
    if (open && token) {
      loadClientes();
      if (!factura) loadNumeroSugerido();
    }
  }, [open, token, factura, loadClientes, loadNumeroSugerido]);

  // Poblar form al editar o prefill
  useEffect(() => {
    if (factura && open) {
      setFormData({
        numero_factura: factura.numero_factura,
        tipo: "venta",
        subtipo: "cliente",
        cliente_id: factura.cliente_id || null,
        trabajador_ci: null,
        nombre_responsable: null,
        nombre_cliente: factura.nombre_cliente,
        vales: factura.vales,
        pagada: true,
        terminada: true,
      });
      setSelectedValeIds([]);
      setValesDisponibles([]);
      // Reconstruir descuentos por ítem desde los datos guardados
      const initialDiscounts: Record<string, number> = {};
      factura.vales.forEach((vale) => {
        const valeId = vale.id_vale_salida || vale.id || "";
        vale.items.forEach((item, itemIndex) => {
          if (item.descuento) {
            initialDiscounts[`${valeId}-${itemIndex}`] = item.descuento;
          }
        });
      });
      setItemDiscounts(initialDiscounts);
    } else if (!factura && open) {
      let cancelled = false;
      const loadPrefill = async () => {
        const valesPrefill = prefillVales || [];
        const valesAjustados = await Promise.all(
          valesPrefill.map((vale) => ajustarValeConDevoluciones(vale)),
        );
        if (cancelled) return;

        const mappedPrefillVales = valesAjustados.map((vale) =>
          mapValeToFacturaVale(vale, materials),
        );

        setFormData({
          numero_factura: "",
          tipo: "venta",
          subtipo: "cliente",
          cliente_id: prefillClienteId || null,
          trabajador_ci: null,
          nombre_responsable: null,
          vales: mappedPrefillVales,
          pagada: true,
          terminada: true,
        });
        setSelectedValeIds(valesAjustados.map((v) => v.id));
        setValesDisponibles(valesAjustados);
      };

      void loadPrefill();
      return () => { cancelled = true; };
    }
  }, [factura, open, prefillClienteId, prefillVales, materials]);

  // Cargar vales disponibles cuando el cliente cambia
  useEffect(() => {
    if (!open || !!factura) return;
    if (hasPrefilledVales) return;

    const clienteId = formData.cliente_id;
    if (!clienteId) {
      setValesDisponibles([]);
      setValesError(null);
      setSelectedValeIds([]);
      setFormData((prev) => ({ ...prev, vales: [] }));
      return;
    }

    let cancelled = false;

    const loadVales = async () => {
      setLoadingVales(true);
      setValesError(null);
      try {
        // Para ventas: solo cliente_id (ObjectId de clientes_ventas), solicitud_tipo: "venta"
        const allVales = await facturaService.obtenerValesDisponibles({
          solicitud_tipo: "venta",
          cliente_id: clienteId,
          skip: 0,
          limit: 200,
        });
        const valesAjustados = await Promise.all(
          allVales.map((vale) => ajustarValeConDevoluciones(vale)),
        );
        if (cancelled) return;
        setValesDisponibles(valesAjustados);
      } catch (error) {
        if (cancelled) return;
        setValesDisponibles([]);
        setValesError(
          error instanceof Error ? error.message : "No se pudieron cargar los vales del cliente",
        );
      } finally {
        if (!cancelled) setLoadingVales(false);
      }
    };

    loadVales();
    return () => { cancelled = true; };
  }, [open, factura, formData.cliente_id, hasPrefilledVales]);

  // Sincronizar vales seleccionados con formData
  useEffect(() => {
    if (!open || !!factura) return;
    if (hasPrefilledVales) return;

    const selectedVales = valesDisponibles.filter((vale) =>
      selectedValeIds.includes(vale.id),
    );
    const mappedVales = selectedVales.map((vale) =>
      mapValeToFacturaVale(vale, materials),
    );
    setFormData((prev) => ({ ...prev, vales: mappedVales }));
  }, [open, factura, valesDisponibles, selectedValeIds, materials, hasPrefilledVales]);

  const handleClienteChange = (clienteId: string) => {
    const selected = clientes.find((c) => c.id === clienteId);
    setFormData((prev) => ({
      ...prev,
      // Para ventas: guardamos el ObjectId del clienteVenta
      cliente_id: clienteId || null,
      nombre_cliente: selected?.nombre || prev.nombre_cliente || undefined,
      vales: [],
    }));
    setSelectedValeIds([]);
    setValesDisponibles([]);
    setValesError(null);
    setItemDiscounts({});
  };

  const handleValeCheckedChange = (valeId: string, checked: boolean) => {
    setSelectedValeIds((prev) => {
      if (checked) {
        if (prev.includes(valeId)) return prev;
        return [...prev, valeId];
      }
      return prev.filter((id) => id !== valeId);
    });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("es-ES");
  };

  const valesSeleccionables = useMemo(
    () => !factura && !hasPrefilledVales && Boolean(formData.cliente_id),
    [factura, formData.cliente_id, hasPrefilledVales],
  );

  const totalMateriales = useMemo(
    () =>
      formData.vales.reduce(
        (sum, vale) =>
          sum +
          vale.items.reduce((s, item) => s + item.precio * item.cantidad, 0),
        0,
      ),
    [formData.vales],
  );

  const getItemKey = (valeId: string, itemIndex: number) => `${valeId}-${itemIndex}`;

  // Monto pagado calculado desde los precios con descuento por ítem
  const montoPagadoEfectivo = useMemo(() => {
    return formData.vales.reduce((total, vale) => {
      const valeId = vale.id_vale_salida || vale.id || "";
      return total + vale.items.reduce((sum, item, itemIndex) => {
        const key = getItemKey(valeId, itemIndex);
        const discount = itemDiscounts[key] ?? 0;
        return sum + item.precio * (1 - discount / 100) * item.cantidad;
      }, 0);
    }, 0);
  }, [formData.vales, itemDiscounts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const selectedCliente = clientes.find((c) => c.id === formData.cliente_id);
      // Enriquecer ítems con descuento y precio_pagado por ítem
      const valesConDescuento = formData.vales.map((vale) => {
        const valeId = vale.id_vale_salida || vale.id || "";
        return {
          ...vale,
          items: vale.items.map((item, itemIndex) => {
            const key = getItemKey(valeId, itemIndex);
            const discount = itemDiscounts[key] ?? 0;
            if (discount > 0) {
              return {
                ...item,
                descuento: discount,
                precio_pagado: Math.round(item.precio * (1 - discount / 100) * 100) / 100,
              };
            }
            return { ...item, descuento: null, precio_pagado: null };
          }),
        };
      });
      const payload: Omit<Factura, "id" | "fecha_creacion" | "total"> = {
        ...formData,
        numero_factura: formData.numero_factura.trim(),
        tipo: "venta",
        subtipo: "cliente",
        cliente_id: formData.cliente_id || null,
        trabajador_ci: null,
        nombre_responsable: null,
        nombre_cliente: selectedCliente?.nombre || formData.nombre_cliente || undefined,
        pagada: true,
        terminada: true,
        vales: valesConDescuento,
      };
      await onSave(payload);
      onOpenChange(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error guardando factura");
    } finally {
      setSaving(false);
    }
  };

  const isFormValid = () =>
    Boolean(formData.numero_factura.trim()) &&
    Boolean(formData.cliente_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {factura ? "Editar Factura de Ventas" : "Nueva Factura de Ventas"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Número de Factura */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Número de Factura</Label>
              <div className="flex gap-2">
                <Input
                  value={formData.numero_factura}
                  onChange={(e) =>
                    setFormData({ ...formData, numero_factura: e.target.value })
                  }
                  placeholder="SC251140"
                  disabled={loadingNumero}
                  required
                />
                {!factura && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={loadNumeroSugerido}
                    disabled={loadingNumero}
                  >
                    {loadingNumero ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Sugerir"
                    )}
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <div className="h-10 flex items-center rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-600">
                Venta — Cliente
              </div>
            </div>
          </div>

          {/* Selector de cliente de ventas */}
          <ClienteVentaSelector
            clientes={clientes}
            value={formData.cliente_id || ""}
            onChange={handleClienteChange}
            loading={loadingClientes}
          />

          {/* Vales disponibles */}
          {valesSeleccionables && (
            <div className="space-y-3 border border-blue-200 rounded-lg p-4 bg-blue-50/40">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold text-gray-900">
                    Vales de salida de ventas del cliente
                  </Label>
                  <p className="text-xs text-gray-600 mt-1">
                    Selecciona los vales que formarán parte de esta factura.
                  </p>
                </div>
                {loadingVales && (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                )}
              </div>

              {valesError && (
                <p className="text-sm text-red-600">{valesError}</p>
              )}

              {!loadingVales && !valesError && valesDisponibles.length === 0 && (
                <p className="text-sm text-gray-600">
                  No se encontraron vales de salida de ventas para este cliente.
                </p>
              )}

              {!loadingVales && valesDisponibles.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {valesDisponibles.map((vale) => {
                    const isChecked = selectedValeIds.includes(vale.id);
                    return (
                      <div
                        key={vale.id}
                        className={`flex items-center justify-between rounded-md border p-3 bg-white ${
                          isChecked ? "border-blue-400" : "border-gray-200"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id={`vale-${vale.id}`}
                            checked={isChecked}
                            onCheckedChange={(checked) =>
                              handleValeCheckedChange(vale.id, checked === true)
                            }
                          />
                          <div className="space-y-1">
                            <Label
                              htmlFor={`vale-${vale.id}`}
                              className="cursor-pointer text-sm font-medium"
                            >
                              {buildValeCode(vale)}
                            </Label>
                            <p className="text-xs text-gray-600">
                              Cliente: {getValeClienteName(vale)}
                            </p>
                            <p className="text-xs text-gray-600 flex items-center gap-2">
                              <span>Fecha: {formatDate(vale.fecha_creacion)}</span>
                              <span className="inline-flex items-center gap-1">
                                <Package className="h-3 w-3" />
                                {(vale.materiales || []).length} materiales
                              </span>
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setValePreview(vale)}
                          title="Ver materiales"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="text-xs text-gray-700">
                Vales seleccionados:{" "}
                <span className="font-semibold">{selectedValeIds.length}</span>
              </p>
            </div>
          )}

          {/* Descuentos por material */}
          {formData.vales.length > 0 && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-600" />
                Descuentos por material (máx. 20% por ítem)
              </Label>
              <div className="space-y-4">
                {formData.vales.map((vale) => {
                  const valeId = vale.id_vale_salida || vale.id || "";
                  return (
                    <div key={valeId} className="border border-blue-200 rounded-lg overflow-hidden">
                      <div className="bg-blue-50 px-4 py-2 border-b border-blue-200">
                        <span className="text-xs font-semibold text-blue-800">
                          Vale {valeId.slice(-8).toUpperCase()}
                        </span>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {/* Encabezado columnas */}
                        <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs text-gray-500 font-medium bg-gray-50">
                          <div className="col-span-1"></div>
                          <div className="col-span-4">Material</div>
                          <div className="col-span-1 text-right">Cant.</div>
                          <div className="col-span-2 text-right">Precio unit.</div>
                          <div className="col-span-2 text-center">Desc. %</div>
                          <div className="col-span-2 text-right">Subtotal</div>
                        </div>
                        {vale.items.map((item, itemIndex) => {
                          const key = getItemKey(valeId, itemIndex);
                          const discount = itemDiscounts[key] ?? 0;
                          const precioConDesc = item.precio * (1 - discount / 100);
                          const subtotal = precioConDesc * item.cantidad;
                          const matchedMaterial = materials.find(
                            (m) =>
                              m.codigo?.toString() === item.codigo ||
                              m.id?.toString() === item.material_id,
                          );
                          const fotoUrl = matchedMaterial?.foto || null;
                          return (
                            <div key={key} className="grid grid-cols-12 gap-2 px-4 py-2 items-center text-sm">
                              <div className="col-span-1 flex items-center justify-center">
                                {fotoUrl ? (
                                  <img
                                    src={fotoUrl}
                                    alt={item.codigo}
                                    className="h-9 w-9 rounded object-cover border border-gray-200"
                                  />
                                ) : (
                                  <div className="h-9 w-9 rounded bg-gray-100 border border-gray-200 flex items-center justify-center">
                                    <Package className="h-4 w-4 text-gray-400" />
                                  </div>
                                )}
                              </div>
                              <div className="col-span-4">
                                <p className="text-sm font-semibold text-gray-800 truncate">{item.codigo}</p>
                                <p className="text-sm text-gray-700 truncate">{item.descripcion}</p>
                              </div>
                              <div className="col-span-1 text-right text-gray-700">{item.cantidad}</div>
                              <div className="col-span-2 text-right text-gray-700">${item.precio.toFixed(2)}</div>
                              <div className="col-span-2">
                                <Input
                                  type="number"
                                  min={0}
                                  max={20}
                                  step={0.5}
                                  value={discount}
                                  onChange={(e) => {
                                    const val = Math.min(20, Math.max(0, parseFloat(e.target.value) || 0));
                                    setItemDiscounts((prev) => ({ ...prev, [key]: val }));
                                  }}
                                  className="text-center h-8 text-sm px-1"
                                />
                              </div>
                              <div className={`col-span-2 text-right font-semibold ${discount > 0 ? "text-blue-600" : "text-gray-800"}`}>
                                ${subtotal.toFixed(2)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between items-center border-t pt-3 text-sm">
                <div className="space-y-0.5 text-gray-500">
                  <p>Total materiales (sin descuento): <span className="font-semibold text-gray-700">${totalMateriales.toFixed(2)}</span></p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Monto a cobrar al cliente</p>
                  <p className="text-lg font-bold text-blue-700">${montoPagadoEfectivo.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700"
              disabled={!isFormValid() || saving}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : factura ? (
                "Actualizar Factura"
              ) : (
                "Crear Factura"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Preview de materiales del vale */}
      <Dialog
        open={Boolean(valePreview)}
        onOpenChange={(nextOpen) => { if (!nextOpen) setValePreview(null); }}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Materiales del vale{" "}
              {valePreview ? buildValeCode(valePreview) : ""}
            </DialogTitle>
          </DialogHeader>
          {valePreview && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Cliente: {getValeClienteName(valePreview)}
              </p>
              <div className="space-y-2">
                {valePreview.materiales?.length ? (
                  valePreview.materiales.map((material, index) => (
                    <div
                      key={`${material.material_id}-${index}`}
                      className="rounded-md border border-gray-200 bg-white p-3 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {getValeItemCode(material)} — {getValeItemDescription(material)}
                        </p>
                      </div>
                      <div className="text-sm font-semibold">
                        Cant: {material.cantidad || 0}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-600">
                    Este vale no tiene materiales registrados.
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
