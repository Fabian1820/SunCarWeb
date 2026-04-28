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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import { Eye, Loader2, Package } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { ClienteService } from "@/lib/services/feats/customer/cliente-service";
import { TrabajadorService } from "@/lib/services/feats/worker/trabajador-service";
import { facturaService } from "@/lib/services/feats/facturas/factura-service";
import { DevolucionValeService } from "@/lib/api-services";
import { ClienteSearchSelector } from "@/components/feats/cliente/cliente-search-selector";
import { TrabajadorSearchSelector } from "@/components/feats/worker/trabajador-search-selector";
import type {
  Factura,
  FacturaTipo,
  FacturaSubTipo,
} from "@/lib/types/feats/facturas/factura-types";
import type {
  Cliente,
  Trabajador,
  ValeSalida,
  ValeSalidaMaterialItemDetalle,
} from "@/lib/api-types";
import type { Material } from "@/lib/material-types";

interface FacturaFormDialogProps {
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

const CODIGOS_BATERIA_DESCUENTO_20 = new Set([
  "FLS48100SMG01",
  "FLS48100SCG01",
]);

const normalizeText = (value?: string | null) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();

const buildValeCode = (vale: ValeSalida) =>
  vale.codigo ||
  vale.solicitud_material?.codigo ||
  vale.solicitud_venta?.codigo ||
  vale.solicitud?.codigo ||
  `VALE-${vale.id.slice(-6).toUpperCase()}`;

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
        String(material.codigo || "")
          .trim()
          .toUpperCase() === itemCode,
    );
    if (byCode) return byCode;
  }

  const itemId = (item.material_id || "").toString().trim();
  if (!itemId) return null;

  return (
    materials.find((material) => {
      const materialWithOptionalIds = material as MaterialWithOptionalIds;
      const candidates = [
        materialWithOptionalIds._id,
        material.id,
        materialWithOptionalIds.material_id,
        material.producto_id,
      ]
        .filter((value): value is string => Boolean(value))
        .map((value) => value.toString());
      return candidates.includes(itemId);
    }) || null
  );
};

const resolveDiscountPercentage = ({
  tipoFactura,
  material,
  materialCode,
  materialCategory,
}: {
  tipoFactura: FacturaTipo;
  material?: Material | null;
  materialCode?: string;
  materialCategory?: string;
}) => {
  if (tipoFactura !== "instaladora") return 0;

  const normalizedCode = (materialCode || material?.codigo || "")
    .toString()
    .trim()
    .toUpperCase();
  if (CODIGOS_BATERIA_DESCUENTO_20.has(normalizedCode)) {
    return 20;
  }

  const normalizedCategory = normalizeText(
    materialCategory || material?.categoria || "",
  );
  const isInversor =
    normalizedCategory === "INVERSORES" || normalizedCategory === "INVERSOR";
  const isBateria =
    normalizedCategory === "BATERIAS" || normalizedCategory === "BATERIA";

  if (isInversor) return 15;
  if (isBateria) return 15;
  return 0;
};

const applyDiscount = (price: number, discountPercentage: number) => {
  if (discountPercentage <= 0) return price;
  const discounted = price * ((100 - discountPercentage) / 100);
  return Math.round(discounted * 100) / 100;
};

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

    return {
      ...vale,
      materiales: materialesAjustados,
    };
  } catch (error) {
    console.warn("No se pudo ajustar vale con devoluciones:", {
      valeId,
      error,
    });
    return vale;
  }
};

const mapValeToFacturaVale = (
  vale: ValeSalida,
  materials: Material[],
  tipoFactura: FacturaTipo,
): Factura["vales"][number] => {
  // Debug: verificar el vale original
  console.log("🔍 mapValeToFacturaVale - Vale original:", {
    id: vale.id,
    tipo_id: typeof vale.id,
    codigo: vale.codigo,
    tiene_id: !!vale.id,
    vale_completo: vale,
  });

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
    const basePrice = Number(
      item.material?.precio ?? matchedMaterial?.precio ?? 0,
    );
    const discountPercentage = resolveDiscountPercentage({
      tipoFactura,
      material: matchedMaterial,
      materialCode,
      materialCategory: item.material?.categoria,
    });

    return {
      material_id: (item.material_id || matchedMaterial?.id || "").toString(),
      codigo: materialCode,
      descripcion: materialDescription,
      precio: applyDiscount(basePrice, discountPercentage),
      cantidad: Number(item.cantidad || 0),
    };
  });

  const valeResultado = {
    id: vale.id, // ← Incluir el ID del vale de salida
    id_vale_salida: vale.id, // ← Referencia explícita para backend
    fecha: vale.fecha_creacion || new Date().toISOString(),
    items,
  };

  // Debug: verificar el vale resultante
  console.log("✅ mapValeToFacturaVale - Vale resultante:", {
    id: valeResultado.id,
    tipo_id: typeof valeResultado.id,
    tiene_id: !!valeResultado.id,
    fecha: valeResultado.fecha,
    items_count: valeResultado.items.length,
  });

  return valeResultado;
};

const getValeClienteName = (vale: ValeSalida) =>
  vale.solicitud_material?.cliente?.nombre ||
  vale.solicitud_material?.cliente_venta?.nombre ||
  vale.solicitud_venta?.cliente?.nombre ||
  vale.solicitud_venta?.cliente_venta?.nombre ||
  vale.solicitud?.cliente?.nombre ||
  vale.solicitud?.cliente_venta?.nombre ||
  "Sin cliente";

const getValeItemCode = (item: ValeSalidaMaterialItemDetalle) =>
  item.codigo || item.material_codigo || item.material?.codigo || "-";

const getValeItemDescription = (item: ValeSalidaMaterialItemDetalle) =>
  item.descripcion ||
  item.material_descripcion ||
  item.material?.descripcion ||
  item.material?.nombre ||
  "Sin descripcion";

const buildClienteLookupParams = (
  selectedValue: string,
  clientes: Cliente[],
): { cliente_id?: string; cliente_numero?: string } => {
  const raw = (selectedValue || "").toString().trim();
  if (!raw) return {};

  const selectedCliente = clientes.find(
    (cliente) => cliente.id === raw || cliente.numero === raw,
  );

  if (selectedCliente) {
    const params: { cliente_id?: string; cliente_numero?: string } = {};
    if (selectedCliente.id) params.cliente_id = selectedCliente.id;
    if (selectedCliente.numero) params.cliente_numero = selectedCliente.numero;
    return params;
  }

  // Fallback para valores pre-cargados que no estén aún en el listado local.
  if (/^[a-f\d]{24}$/i.test(raw)) {
    return { cliente_id: raw };
  }
  return { cliente_numero: raw };
};

export function FacturaFormDialog({
  open,
  onOpenChange,
  factura,
  prefillClienteId = null,
  prefillVales,
  onSave,
  onGetNumeroSugerido,
  materials,
}: FacturaFormDialogProps) {
  const { token } = useAuth();
  const hasPrefilledVales = !factura && (prefillVales?.length || 0) > 0;
  const [formData, setFormData] = useState<
    Omit<Factura, "id" | "fecha_creacion" | "total">
  >({
    numero_factura: "",
    tipo: "instaladora",
    subtipo: "cliente",
    cliente_id: null,
    trabajador_ci: null,
    nombre_responsable: null,
    vales: [],
    pagada: false,
    terminada: false,
  });
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [loadingTrabajadores, setLoadingTrabajadores] = useState(false);
  const [loadingNumero, setLoadingNumero] = useState(false);
  const [valesDisponibles, setValesDisponibles] = useState<ValeSalida[]>([]);
  const [loadingVales, setLoadingVales] = useState(false);
  const [valesError, setValesError] = useState<string | null>(null);
  const [selectedValeIds, setSelectedValeIds] = useState<string[]>([]);
  const [valePreview, setValePreview] = useState<ValeSalida | null>(null);
  const [saving, setSaving] = useState(false);

  const loadClientes = useCallback(async () => {
    setLoadingClientes(true);
    try {
      const data = await ClienteService.getClientes();
      // El servicio devuelve { clients: Cliente[], total, skip, limit }
      setClientes(data.clients || []);
    } catch (error) {
      console.error("Error cargando clientes:", error);
    } finally {
      setLoadingClientes(false);
    }
  }, []);

  const loadNumeroSugerido = useCallback(async () => {
    setLoadingNumero(true);
    try {
      const result = await onGetNumeroSugerido();
      setFormData((prev) => ({
        ...prev,
        numero_factura: result.numero_sugerido,
      }));
    } catch (error) {
      console.error("Error obteniendo número sugerido:", error);
    } finally {
      setLoadingNumero(false);
    }
  }, [onGetNumeroSugerido]);

  const loadTrabajadores = useCallback(async () => {
    setLoadingTrabajadores(true);
    try {
      const data = await TrabajadorService.getAllTrabajadores();
      setTrabajadores(data.filter((trabajador) => trabajador.activo !== false));
    } catch (error) {
      console.error("Error cargando trabajadores:", error);
      setTrabajadores([]);
    } finally {
      setLoadingTrabajadores(false);
    }
  }, []);

  // Cargar datos base al abrir
  useEffect(() => {
    if (open && token) {
      loadClientes();
      loadTrabajadores();
      if (!factura) {
        // Modo crear: obtener número sugerido
        loadNumeroSugerido();
      }
    }
  }, [
    open,
    token,
    factura,
    loadClientes,
    loadTrabajadores,
    loadNumeroSugerido,
  ]);

  // Cargar datos de factura existente
  useEffect(() => {
    if (factura && open) {
      setFormData({
        numero_factura: factura.numero_factura,
        tipo: "instaladora",
        subtipo: factura.subtipo || "cliente",
        cliente_id:
          factura.subtipo === "cliente" ? factura.cliente_id || null : null,
        trabajador_ci:
          factura.subtipo === "brigada" ? factura.trabajador_ci || null : null,
        nombre_responsable:
          factura.subtipo === "brigada"
            ? factura.nombre_responsable || factura.responsable_nombre || null
            : null,
        nombre_cliente: factura.nombre_cliente,
        vales: factura.vales,
        pagada: factura.pagada,
        terminada: factura.terminada,
      });
      setSelectedValeIds([]);
      setValesDisponibles([]);
    } else if (!factura && open) {
      let cancelled = false;
      const loadPrefill = async () => {
        const valesPrefill = prefillVales || [];
        const valesAjustados = await Promise.all(
          valesPrefill.map((vale) => ajustarValeConDevoluciones(vale)),
        );
        if (cancelled) return;

        const mappedPrefillVales = valesAjustados.map((vale) =>
          mapValeToFacturaVale(vale, materials, "instaladora"),
        );

        // Reset form para nueva factura
        setFormData({
          numero_factura: "",
          tipo: "instaladora",
          subtipo: "cliente",
          cliente_id: prefillClienteId || null,
          trabajador_ci: null,
          nombre_responsable: null,
          vales: mappedPrefillVales,
          pagada: false,
          terminada: false,
        });
        setSelectedValeIds(valesAjustados.map((vale) => vale.id));
        setValesDisponibles(valesAjustados);
      };

      void loadPrefill();
      return () => {
        cancelled = true;
      };
    }
  }, [factura, open, prefillClienteId, prefillVales, materials]);

  useEffect(() => {
    if (!open || !!factura) return;
    if (hasPrefilledVales) return;

    const mustLoadVales =
      formData.subtipo === "cliente" && Boolean(formData.cliente_id);

    if (!mustLoadVales) {
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
        const clienteLookup = buildClienteLookupParams(
          formData.cliente_id as string,
          clientes,
        );

        if (!clienteLookup.cliente_id && !clienteLookup.cliente_numero) {
          setValesDisponibles([]);
          return;
        }

        const allVales = await facturaService.obtenerValesDisponibles({
          solicitud_tipo: "material",
          ...clienteLookup,
          skip: 0,
          limit: 200,
        });
        const valesAjustados = await Promise.all(
          allVales.map((vale) => ajustarValeConDevoluciones(vale)),
        );
        if (cancelled) return;

        // Debug: verificar vales cargados
        console.log(
          "📥 Vales cargados del backend:",
          valesAjustados.map((v) => ({
            id: v.id,
            tipo_id: typeof v.id,
            codigo: v.codigo,
            tiene_id: !!v.id,
          })),
        );

        setValesDisponibles(valesAjustados);
      } catch (error) {
        if (cancelled) return;
        setValesDisponibles([]);
        setValesError(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los vales del cliente",
        );
      } finally {
        if (!cancelled) {
          setLoadingVales(false);
        }
      }
    };

    loadVales();
    return () => {
      cancelled = true;
    };
  }, [
    open,
    factura,
    formData.subtipo,
    formData.cliente_id,
    clientes,
    hasPrefilledVales,
  ]);

  useEffect(() => {
    if (!open || !!factura) return;
    if (hasPrefilledVales) return;

    const selectedVales = valesDisponibles.filter((vale) =>
      selectedValeIds.includes(vale.id),
    );
    const mappedVales = selectedVales.map((vale) =>
      mapValeToFacturaVale(vale, materials, formData.tipo),
    );

    // Debug: verificar que los vales mapeados tienen el ID
    console.log(
      "🔄 Vales mapeados:",
      mappedVales.map((v) => ({
        id: v.id,
        fecha: v.fecha,
        items_count: v.items.length,
      })),
    );

    setFormData((prev) => ({ ...prev, vales: mappedVales }));
  }, [
    open,
    factura,
    valesDisponibles,
    selectedValeIds,
    materials,
    formData.tipo,
    hasPrefilledVales,
  ]);

  const handleSubTipoChange = (subtipo: FacturaSubTipo) => {
    const isClienteSubtipo = subtipo === "cliente";
    setFormData({
      ...formData,
      subtipo,
      cliente_id: isClienteSubtipo ? formData.cliente_id : null,
      trabajador_ci: isClienteSubtipo ? null : formData.trabajador_ci || null,
      nombre_responsable: isClienteSubtipo
        ? null
        : formData.nombre_responsable || null,
      vales: isClienteSubtipo ? formData.vales : [],
    });
    if (!isClienteSubtipo) {
      setSelectedValeIds([]);
      setValesDisponibles([]);
      setValesError(null);
    }
  };

  const handleClienteChange = (clienteId: string) => {
    const clienteSeleccionado = clientes.find(
      (cliente) => cliente.id === clienteId || cliente.numero === clienteId,
    );
    const clienteNumero = clienteSeleccionado?.numero || clienteId;
    setFormData({
      ...formData,
      // En facturas siempre persistimos el número de cliente, no el ObjectId.
      cliente_id: clienteNumero,
      nombre_cliente:
        clienteSeleccionado?.nombre || formData.nombre_cliente || undefined,
      vales: [],
    });
    setSelectedValeIds([]);
    setValesDisponibles([]);
    setValesError(null);
  };

  useEffect(() => {
    if (!open) return;
    if (formData.subtipo !== "cliente") return;
    if (!formData.cliente_id) return;
    if (clientes.length === 0) return;

    const clienteSeleccionado = clientes.find(
      (cliente) =>
        cliente.id === formData.cliente_id ||
        cliente.numero === formData.cliente_id,
    );
    if (!clienteSeleccionado?.numero) return;
    if (formData.cliente_id === clienteSeleccionado.numero) return;

    setFormData((prev) => ({
      ...prev,
      cliente_id: clienteSeleccionado.numero,
      nombre_cliente:
        clienteSeleccionado.nombre || prev.nombre_cliente || undefined,
    }));
  }, [open, clientes, formData.subtipo, formData.cliente_id]);

  const handleTrabajadorChange = (trabajadorCi: string) => {
    setFormData((prev) => ({
      ...prev,
      trabajador_ci: trabajadorCi || null,
      nombre_responsable: trabajadorCi ? null : prev.nombre_responsable,
    }));
  };

  const handleResponsableNombreChange = (responsableNombre: string) => {
    setFormData((prev) => ({
      ...prev,
      nombre_responsable: responsableNombre,
    }));
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
    () =>
      !factura &&
      !hasPrefilledVales &&
      formData.subtipo === "cliente" &&
      Boolean(formData.cliente_id),
    [factura, formData.subtipo, formData.cliente_id, hasPrefilledVales],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const trabajadorSeleccionado = trabajadores.find(
        (trabajador) => trabajador.CI === formData.trabajador_ci,
      );
      const clienteSeleccionado = clientes.find(
        (cliente) =>
          cliente.id === formData.cliente_id ||
          cliente.numero === formData.cliente_id,
      );
      const responsableNombre = formData.nombre_responsable?.trim() || null;
      const payload: Omit<Factura, "id" | "fecha_creacion" | "total"> = {
        ...formData,
        numero_factura: formData.numero_factura.trim(),
        tipo: "instaladora",
        subtipo: formData.subtipo || "cliente",
        cliente_id:
          formData.subtipo === "cliente"
            ? clienteSeleccionado?.numero || formData.cliente_id || null
            : null,
        trabajador_ci:
          formData.subtipo === "brigada"
            ? formData.trabajador_ci || null
            : null,
        nombre_responsable:
          formData.subtipo === "brigada"
            ? responsableNombre ||
              trabajadorSeleccionado?.nombre ||
              formData.nombre_cliente ||
              null
            : null,
        nombre_cliente:
          formData.subtipo === "cliente"
            ? clienteSeleccionado?.nombre ||
              formData.nombre_cliente ||
              undefined
            : responsableNombre || trabajadorSeleccionado?.nombre || undefined,
      };

      // Debug: verificar que los vales tienen el ID
      console.log(
        "📤 Datos de factura a enviar:",
        JSON.stringify(payload, null, 2),
      );
      console.log(
        "📤 Vales con IDs:",
        payload.vales.map((v) => ({
          id: v.id,
          fecha: v.fecha,
          items_count: v.items.length,
        })),
      );

      await onSave(payload);
      onOpenChange(false);
    } catch (error) {
      console.error("Error guardando factura:", error);
      alert(error instanceof Error ? error.message : "Error guardando factura");
    } finally {
      setSaving(false);
    }
  };

  const isFormValid = () => {
    if (!formData.numero_factura.trim()) return false;
    if (!formData.subtipo) return false;
    if (formData.subtipo === "cliente" && !formData.cliente_id) {
      return false;
    }
    if (
      formData.subtipo === "brigada" &&
      !formData.trabajador_ci &&
      !formData.nombre_responsable?.trim()
    ) {
      return false;
    }
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {factura ? "Editar Factura" : "Nueva Factura"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información Básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Número de Factura */}
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
              <Label>Subtipo</Label>
              <Select
                value={formData.subtipo || ""}
                onValueChange={(v) => handleSubTipoChange(v as FacturaSubTipo)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cliente">Cliente</SelectItem>
                  <SelectItem value="brigada">Brigada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            {formData.subtipo === "cliente" && (
              <ClienteSearchSelector
                label="Buscar cliente"
                clients={clientes}
                value={formData.cliente_id || ""}
                onChange={handleClienteChange}
                loading={loadingClientes}
              />
            )}

            {formData.subtipo === "brigada" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TrabajadorSearchSelector
                  label="Buscar trabajador"
                  trabajadores={trabajadores}
                  value={formData.trabajador_ci || ""}
                  onChange={handleTrabajadorChange}
                  loading={loadingTrabajadores}
                />
                <div className="space-y-2">
                  <Label>
                    Nombre de responsable
                    {!formData.trabajador_ci ? " *" : ""}
                  </Label>
                  <Input
                    value={formData.nombre_responsable || ""}
                    onChange={(event) =>
                      handleResponsableNombreChange(event.target.value)
                    }
                    placeholder={
                      formData.trabajador_ci
                        ? "Se usara el trabajador seleccionado"
                        : "Escribe el nombre del responsable"
                    }
                    disabled={Boolean(formData.trabajador_ci)}
                  />
                  <p className="text-xs text-gray-600">
                    {formData.trabajador_ci
                      ? "Para escribir un responsable manual, limpia el trabajador seleccionado."
                      : "Si no seleccionas un trabajador, este campo es obligatorio."}
                  </p>
                </div>
              </div>
            )}
          </div>

          {valesSeleccionables && (
            <div className="space-y-3 border border-orange-200 rounded-lg p-4 bg-orange-50/40">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold text-gray-900">
                    Vales de salida vinculados al cliente
                  </Label>
                  <p className="text-xs text-gray-600 mt-1">
                    Selecciona los vales que formaran parte de esta factura.
                  </p>
                </div>
                {loadingVales && (
                  <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
                )}
              </div>

              {valesError ? (
                <p className="text-sm text-red-600">{valesError}</p>
              ) : null}

              {!loadingVales &&
                !valesError &&
                valesDisponibles.length === 0 && (
                  <p className="text-sm text-gray-600">
                    No se encontraron vales de salida para este cliente.
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
                          isChecked ? "border-orange-400" : "border-gray-200"
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
                              <span>
                                Fecha: {formatDate(vale.fecha_creacion)}
                              </span>
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

          {/* Estados */}
          <div className="flex gap-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="pagada"
                checked={formData.pagada}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, pagada: checked as boolean })
                }
              />
              <Label htmlFor="pagada" className="cursor-pointer">
                Pagada
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="terminada"
                checked={formData.terminada}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, terminada: checked as boolean })
                }
              />
              <Label htmlFor="terminada" className="cursor-pointer">
                Terminada
              </Label>
            </div>
          </div>

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
              className="bg-orange-600 hover:bg-orange-700"
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

      <Dialog
        open={Boolean(valePreview)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setValePreview(null);
          }
        }}
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
                          {getValeItemCode(material)} -{" "}
                          {getValeItemDescription(material)}
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
