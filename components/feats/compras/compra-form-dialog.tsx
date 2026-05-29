"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import { Textarea } from "@/components/shared/molecule/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import {
  AnchorIcon,
  Building2,
  CalendarDays,
  ClipboardList,
  Container,
  Loader2,
  MapPin,
  Package,
  Pencil,
  Plane,
  Plus,
  Search,
  Ship,
  Store,
  Truck,
  X,
} from "lucide-react";
import type { Material } from "@/lib/material-types";
import type {
  Compra,
  CompraCreateData,
  DatosMaritimo,
  EstadoCompra,
  TipoCompra,
  TipoContenedor,
} from "@/lib/types/feats/compras/compra-types";
import {
  COMPRA_ESTADO_LABELS,
  TIPO_CONTENEDOR_LABELS,
  TIPOS_CONTENEDOR,
} from "@/lib/types/feats/compras/compra-types";
import {
  QuickMaterialCreateDialog,
  type QuickMaterialData,
} from "./quick-material-create-dialog";

interface MaterialSeleccionado {
  material_id: string;
  material_codigo: string;
  material_nombre: string;
  cantidad: number;
  foto?: string;
  um?: string;
}

export interface CompraFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CompraCreateData) => Promise<void>;
  materials: Material[];
  isLoading?: boolean;
  initialData?: Compra;
  categories?: string[];
  onCreateMaterial?: (data: QuickMaterialData) => Promise<Material>;
}

const getTodayISO = () => new Date().toISOString().slice(0, 10);
const getDefaultArrival = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
};

const calcDiasNavegacion = (fechaEnvio: string, fechaLlegada: string): number | null => {
  if (!fechaEnvio || !fechaLlegada) return null;
  const diff = new Date(fechaLlegada).getTime() - new Date(fechaEnvio).getTime();
  if (isNaN(diff) || diff < 0) return null;
  return Math.round(diff / 86_400_000);
};

const TIPO_OPTIONS: {
  value: TipoCompra;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  activeClass: string;
  iconBg: string;
}[] = [
  {
    value: "maritimo",
    label: "Marítimo",
    sublabel: "Transporte en barco",
    icon: <Ship className="h-6 w-6" />,
    activeClass: "border-cyan-400 bg-cyan-50 ring-2 ring-cyan-200",
    iconBg: "bg-cyan-100 text-cyan-600",
  },
  {
    value: "aereo",
    label: "Aéreo",
    sublabel: "Transporte en avión",
    icon: <Plane className="h-6 w-6" />,
    activeClass: "border-sky-400 bg-sky-50 ring-2 ring-sky-200",
    iconBg: "bg-sky-100 text-sky-600",
  },
  {
    value: "local",
    label: "Local",
    sublabel: "Compra dentro del país",
    icon: <Store className="h-6 w-6" />,
    activeClass: "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200",
    iconBg: "bg-emerald-100 text-emerald-600",
  },
  {
    value: "otro",
    label: "Otro",
    sublabel: "Terrestre u otro medio",
    icon: <Truck className="h-6 w-6" />,
    activeClass: "border-gray-400 bg-gray-100 ring-2 ring-gray-200",
    iconBg: "bg-gray-100 text-gray-500",
  },
];

// Solo se ofrecen los estados que el operador puede asignar manualmente al
// crear una compra. recibido / recibido_parcial son automáticos (los marca el
// backend al aprobar solicitudes); cancelado va por POST /cancelar.
const ESTADO_OPTIONS_CREATE: { value: EstadoCompra; label: string }[] = [
  { value: "solicitado", label: "Solicitado" },
  { value: "enviado",    label: "Enviado / en camino" },
  { value: "arribado",   label: "Arribado" },
];

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
      {icon}
      {label}
    </p>
  );
}

export function CompraFormDialog({
  open,
  onOpenChange,
  onSubmit,
  materials,
  isLoading = false,
  initialData,
  categories = [],
  onCreateMaterial,
}: CompraFormDialogProps) {
  const isEditMode = Boolean(initialData);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);

  const unidadesDelCatalogo = (() => {
    const set = new Set<string>();
    materials.forEach((m) => {
      if (m.um) set.add(m.um);
    });
    return Array.from(set);
  })();

  // General
  const [nombre,       setNombre]       = useState("");
  const [descripcion,  setDescripcion]  = useState("");
  const [estado,       setEstado]       = useState<EstadoCompra>("solicitado");
  const [tipo,         setTipo]         = useState<TipoCompra | "">("");

  // Datos marítimos (anidados, solo si tipo === "maritimo")
  const [bl,               setBl]              = useState("");
  const [referenciaBuque,  setReferenciaBuque] = useState("");
  const [sello,            setSello]           = useState("");
  const [buque,            setBuque]           = useState("");
  const [tipoContenedor,   setTipoContenedor]  = useState<TipoContenedor | "">("");
  const [puertoOrigen,     setPuertoOrigen]    = useState("");
  const [paisOrigen,       setPaisOrigen]      = useState("");
  const [puertoDestino,    setPuertoDestino]   = useState("Mariel");
  const [transitaria,      setTransitaria]     = useState("");

  // Partes
  const [proveedor,   setProveedor]   = useState("");
  const [cliente,     setCliente]     = useState("");

  // Fechas y pago
  const [fechaEnvio,   setFechaEnvio]   = useState(getTodayISO());
  const [fechaLlegada, setFechaLlegada] = useState(getDefaultArrival());
  const [pagado,       setPagado]       = useState(false);

  // Materiales
  const [matList,        setMatList]        = useState<MaterialSeleccionado[]>([]);
  const [materialSearch, setMaterialSearch] = useState("");
  const [materialResults, setMaterialResults] = useState<Material[]>([]);
  const [showMaterialDropdown, setShowMaterialDropdown] = useState(false);

  const [error,      setError]      = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const diasNavegacion = calcDiasNavegacion(fechaEnvio, fechaLlegada);
  const esMaritimo = tipo === "maritimo";
  // Materiales y cantidades quedan congelados si la compra está recibida
  // (total/parcial) o cancelada — solo se pueden editar los datos informativos.
  const materialesBloqueados =
    isEditMode &&
    (initialData?.estado === "recibido" ||
     initialData?.estado === "recibido_parcial" ||
     initialData?.estado === "cancelado");

  useEffect(() => {
    if (!open) return;
    if (initialData) {
      setNombre(initialData.nombre);
      setDescripcion(initialData.descripcion ?? "");
      setEstado(initialData.estado);
      setTipo(initialData.tipo ?? "");
      const dm = initialData.datos_maritimo ?? {};
      setBl(dm.bl ?? "");
      setReferenciaBuque(dm.referencia_buque ?? "");
      setSello(dm.sello ?? "");
      setBuque(dm.buque ?? "");
      setTipoContenedor(dm.tipo_contenedor ?? "");
      setPuertoOrigen(dm.puerto_origen ?? "");
      setPaisOrigen(dm.pais_origen ?? "");
      setPuertoDestino(dm.puerto_destino ?? "Mariel");
      setTransitaria(dm.transitaria ?? "");
      setProveedor(initialData.proveedor ?? "");
      setCliente(initialData.cliente ?? "");
      setFechaEnvio(initialData.fecha_envio?.slice(0, 10) ?? getTodayISO());
      setFechaLlegada(initialData.fecha_llegada_aproximada?.slice(0, 10) ?? getDefaultArrival());
      setPagado(initialData.pagado);
      setMatList(
        initialData.materiales.map((m) => {
          const catalog = materials.find((x) => x.id === m.material_id);
          return {
            material_id: m.material_id,
            material_codigo: m.material_codigo,
            material_nombre: m.material_nombre,
            cantidad: m.cantidad,
            foto: catalog?.foto,
            um: catalog?.um,
          };
        }),
      );
    } else {
      setNombre(""); setDescripcion(""); setEstado("solicitado"); setTipo("");
      setBl(""); setReferenciaBuque(""); setSello("");
      setBuque(""); setTipoContenedor(""); setPuertoOrigen(""); setPaisOrigen("");
      setPuertoDestino("Mariel"); setTransitaria("");
      setProveedor(""); setCliente("");
      setFechaEnvio(getTodayISO()); setFechaLlegada(getDefaultArrival()); setPagado(false);
      setMatList([]);
    }
    setMaterialSearch(""); setMaterialResults([]); setShowMaterialDropdown(false);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialData?.id]);

  useEffect(() => {
    const term = materialSearch.trim().toLowerCase();
    if (!term) {
      setMaterialResults([]);
      setShowMaterialDropdown(false);
      return;
    }

    const handler = setTimeout(() => {
      const taken = new Set(matList.map((m) => m.material_id));
      const filtered = materials
        .filter((m) => !taken.has(m.id))
        .filter((m) => {
          const codigo = m.codigo?.toString().toLowerCase() ?? "";
          const nombre = (m.nombre ?? "").toLowerCase();
          const descripcion = (m.descripcion ?? "").toLowerCase();
          return (
            codigo.includes(term) ||
            nombre.includes(term) ||
            descripcion.includes(term)
          );
        })
        .slice(0, 15);
      setMaterialResults(filtered);
      setShowMaterialDropdown(filtered.length > 0);
    }, 300);

    return () => clearTimeout(handler);
  }, [materialSearch, matList, materials]);

  const handleAddMaterial = (mat: Material) => {
    setError(null);
    if (matList.some((x) => x.material_id === mat.id)) return;
    setMatList((prev) => [
      ...prev,
      {
        material_id: mat.id,
        material_codigo: mat.codigo,
        material_nombre: mat.nombre || mat.descripcion,
        cantidad: 1,
        foto: mat.foto,
        um: mat.um,
      },
    ]);
    setMaterialSearch("");
    setMaterialResults([]);
    setShowMaterialDropdown(false);
  };

  const removeMat = (id: string) => setMatList((p) => p.filter((x) => x.material_id !== id));

  const updateCant = (id: string, val: string) => {
    const n = Number(val);
    if (!Number.isFinite(n) || n <= 0) return;
    setMatList((p) => p.map((x) => x.material_id === id ? { ...x, cantidad: n } : x));
  };

  const buildDatosMaritimo = (): DatosMaritimo | null => {
    if (!esMaritimo) return null;
    return {
      bl: bl.trim() || undefined,
      referencia_buque: referenciaBuque.trim() || undefined,
      sello: sello.trim() || undefined,
      buque: buque.trim() || undefined,
      tipo_contenedor: (tipoContenedor as TipoContenedor) || undefined,
      puerto_origen: puertoOrigen.trim() || undefined,
      pais_origen: paisOrigen.trim() || undefined,
      puerto_destino: puertoDestino.trim() || undefined,
      transitaria: transitaria.trim() || undefined,
    };
  };

  const handleSubmit = async () => {
    setError(null);
    if (!nombre.trim()) { setError("El nombre es obligatorio."); return; }
    if (!tipo) { setError("Selecciona el tipo de compra."); return; }
    if (!fechaEnvio || !fechaLlegada) { setError("Indica ambas fechas."); return; }
    if (new Date(fechaLlegada) < new Date(fechaEnvio)) { setError("La llegada no puede ser anterior al envío."); return; }
    if (!materialesBloqueados && matList.length === 0) { setError("Agrega al menos un material."); return; }
    setSubmitting(true);
    try {
      // Cuando los materiales están bloqueados (compra ya recibida) no los
      // mandamos en el payload para no provocar validaciones de "modificación
      // de materiales en estado X" en el backend.
      const payload: CompraCreateData = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        tipo: tipo as TipoCompra,
        proveedor: proveedor.trim() || undefined,
        cliente: cliente.trim() || undefined,
        fecha_envio: fechaEnvio,
        fecha_llegada_aproximada: fechaLlegada,
        estado,
        pagado,
        datos_maritimo: buildDatosMaritimo(),
        materiales: materialesBloqueados
          ? (initialData?.materiales.map((m) => ({
              material_id: m.material_id,
              material_codigo: m.material_codigo,
              material_nombre: m.material_nombre,
              cantidad: m.cantidad,
              precio_unitario_cif: m.precio_unitario_cif,
              porciento_recargo: m.porciento_recargo,
              costo: m.costo,
              porciento_rebajable_venta: m.porciento_rebajable_venta,
            })) ?? [])
          : matList.map((m) => ({
              material_id: m.material_id,
              material_codigo: m.material_codigo,
              material_nombre: m.material_nombre,
              cantidad: m.cantidad,
              precio_unitario_cif: 0,
              porciento_recargo: 0,
              costo: 0,
              porciento_rebajable_venta: 0,
            })),
      };
      await onSubmit(payload);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la compra.");
    } finally {
      setSubmitting(false);
    }
  };

  const busy = isLoading || submitting;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-gray-100 bg-gray-50 rounded-t-lg shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-100 shrink-0">
              {isEditMode
                ? <Pencil className="h-4 w-4 text-cyan-700" />
                : <Ship className="h-4 w-4 text-cyan-700" />
              }
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-gray-900">
                {isEditMode ? "Editar compra" : "Nueva compra"}
              </DialogTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                {isEditMode
                  ? "Modifica los datos de la compra seleccionada."
                  : "Registra una nueva compra en el sistema."}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-7">

          {/* ── Información general ── */}
          <section>
            <SectionHeader icon={<ClipboardList className="h-3.5 w-3.5" />} label="Información general" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <Label htmlFor="fc-nombre" className="text-sm font-medium text-gray-700">
                  Nombre de la compra <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="fc-nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Contenedor Solar Mayo 2026"
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">Estado</Label>
                {isEditMode ? (
                  <div className="h-9 rounded-md border border-gray-200 bg-gray-50 px-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      {COMPRA_ESTADO_LABELS[estado]}
                    </span>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wide">
                      automático
                    </span>
                  </div>
                ) : (
                  <Select value={estado} onValueChange={(v) => setEstado(v as EstadoCompra)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADO_OPTIONS_CREATE.map((e) => (
                        <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {isEditMode && (
                  <p className="text-[10px] text-gray-400 leading-tight">
                    El estado cambia automáticamente al aprobar solicitudes de entrada o al cancelar la compra.
                  </p>
                )}
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <Label htmlFor="fc-desc" className="text-sm font-medium text-gray-700">
                  Observaciones
                </Label>
                <Textarea
                  id="fc-desc"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Observaciones adicionales..."
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>
          </section>

          {/* ── Tipo de compra ── */}
          <section>
            <SectionHeader icon={<Ship className="h-3.5 w-3.5" />} label={<>Tipo de compra <span className="text-red-500">*</span></>} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {TIPO_OPTIONS.map((t) => {
                const isSelected = tipo === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTipo(isSelected ? "" : t.value)}
                    className={`relative flex flex-col items-center gap-2.5 rounded-xl border-2 px-4 py-4 text-center transition-all duration-150 hover:shadow-sm focus:outline-none ${
                      isSelected
                        ? t.activeClass
                        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <span className={`absolute top-2.5 right-2.5 h-2 w-2 rounded-full transition-all ${
                      isSelected ? "bg-current opacity-100" : "opacity-0"
                    } ${
                      t.value === "maritimo" ? "text-cyan-500" :
                      t.value === "aereo"    ? "text-sky-500"  :
                      t.value === "local"    ? "text-emerald-500" : "text-gray-400"
                    }`} />
                    <span className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
                      isSelected ? t.iconBg : "bg-gray-100 text-gray-400"
                    }`}>
                      {t.icon}
                    </span>
                    <div>
                      <p className={`text-sm font-semibold leading-tight ${
                        isSelected ? "text-gray-900" : "text-gray-600"
                      }`}>
                        {t.label}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{t.sublabel}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Datos marítimos (sección condicional) ── */}
          {esMaritimo && (
            <>
              <section>
                <SectionHeader icon={<ClipboardList className="h-3.5 w-3.5" />} label="Identificación documental" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="fc-bl" className="text-sm font-medium text-gray-700">
                      BL (Bill of Lading)
                    </Label>
                    <Input
                      id="fc-bl"
                      value={bl}
                      onChange={(e) => setBl(e.target.value)}
                      placeholder="Ej: MAEU123456789"
                      className="h-9 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="fc-ref-buque" className="text-sm font-medium text-gray-700">
                      Referencia del buque
                    </Label>
                    <Input
                      id="fc-ref-buque"
                      value={referenciaBuque}
                      onChange={(e) => setReferenciaBuque(e.target.value)}
                      placeholder="Referencia / viaje"
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="fc-sello" className="text-sm font-medium text-gray-700">
                      Sello
                    </Label>
                    <Input
                      id="fc-sello"
                      value={sello}
                      onChange={(e) => setSello(e.target.value)}
                      placeholder="Número de sello"
                      className="h-9 font-mono"
                    />
                  </div>
                </div>
              </section>

              <section>
                <SectionHeader icon={<Ship className="h-3.5 w-3.5" />} label="Transporte marítimo" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                      <Container className="h-3.5 w-3.5 text-gray-400" />
                      Tipo de contenedor
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {TIPOS_CONTENEDOR.map((tc) => {
                        const isSelected = tipoContenedor === tc;
                        return (
                          <button
                            key={tc}
                            type="button"
                            onClick={() => setTipoContenedor(isSelected ? "" : tc)}
                            className={`rounded-lg border-2 py-2.5 text-center text-sm font-semibold transition-all focus:outline-none ${
                              isSelected
                                ? "border-cyan-400 bg-cyan-50 text-cyan-700 ring-2 ring-cyan-100"
                                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            {tc}
                            <span className={`block text-xs font-normal mt-0.5 ${isSelected ? "text-cyan-500" : "text-gray-400"}`}>
                              {tc === "20DV" ? "20 pies" : tc === "40DV" ? "40 pies" : "40' HC"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="fc-buque" className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                      <AnchorIcon className="h-3.5 w-3.5 text-gray-400" />
                      Buque
                    </Label>
                    <Input
                      id="fc-buque"
                      value={buque}
                      onChange={(e) => setBuque(e.target.value)}
                      placeholder="Nombre del buque"
                      className="h-9"
                    />
                  </div>
                </div>
              </section>

              <section>
                <SectionHeader icon={<MapPin className="h-3.5 w-3.5" />} label="Ruta" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="fc-pais-origen" className="text-sm font-medium text-gray-700">
                      País de origen
                    </Label>
                    <Input
                      id="fc-pais-origen"
                      value={paisOrigen}
                      onChange={(e) => setPaisOrigen(e.target.value)}
                      placeholder="Ej: China"
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="fc-puerto-origen" className="text-sm font-medium text-gray-700">
                      Puerto de origen
                    </Label>
                    <Input
                      id="fc-puerto-origen"
                      value={puertoOrigen}
                      onChange={(e) => setPuertoOrigen(e.target.value)}
                      placeholder="Ej: Shanghai"
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="fc-puerto-destino" className="text-sm font-medium text-gray-700">
                      Puerto de destino
                    </Label>
                    <Input
                      id="fc-puerto-destino"
                      value={puertoDestino}
                      onChange={(e) => setPuertoDestino(e.target.value)}
                      placeholder="Mariel"
                      className="h-9"
                    />
                  </div>
                </div>
              </section>
            </>
          )}

          {/* ── Partes involucradas ── */}
          <section>
            <SectionHeader icon={<Building2 className="h-3.5 w-3.5" />} label="Partes involucradas" />
            <div className={`grid grid-cols-1 ${esMaritimo ? "md:grid-cols-3" : "md:grid-cols-2"} gap-4`}>
              <div className="space-y-1.5">
                <Label htmlFor="fc-proveedor" className="text-sm font-medium text-gray-700">
                  Proveedor
                </Label>
                <Input
                  id="fc-proveedor"
                  value={proveedor}
                  onChange={(e) => setProveedor(e.target.value)}
                  placeholder="Empresa proveedora"
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fc-cliente" className="text-sm font-medium text-gray-700">
                  Cliente
                </Label>
                <Input
                  id="fc-cliente"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder="Empresa cliente"
                  className="h-9"
                />
              </div>

              {esMaritimo && (
                <div className="space-y-1.5">
                  <Label htmlFor="fc-transitaria" className="text-sm font-medium text-gray-700">
                    Transitaria
                  </Label>
                  <Input
                    id="fc-transitaria"
                    value={transitaria}
                    onChange={(e) => setTransitaria(e.target.value)}
                    placeholder="Agencia transitaria"
                    className="h-9"
                  />
                </div>
              )}
            </div>
          </section>

          {/* ── Fechas y pago ── */}
          <section>
            <SectionHeader icon={<CalendarDays className="h-3.5 w-3.5" />} label="Fechas y pago" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="fc-fecha-envio" className="text-sm font-medium text-gray-700">
                  Fecha de envío <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="fc-fecha-envio"
                  type="date"
                  value={fechaEnvio}
                  onChange={(e) => setFechaEnvio(e.target.value)}
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fc-fecha-llegada" className="text-sm font-medium text-gray-700">
                  Llegada aproximada <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="fc-fecha-llegada"
                  type="date"
                  value={fechaLlegada}
                  onChange={(e) => setFechaLlegada(e.target.value)}
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">Días de tránsito</Label>
                <div className="h-9 rounded-md border border-gray-200 bg-gray-50 flex items-center px-3 gap-2">
                  <Ship className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
                  {diasNavegacion !== null ? (
                    <span className="text-sm font-semibold text-cyan-700">
                      {diasNavegacion} día{diasNavegacion !== 1 ? "s" : ""}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">Estado de pago</Label>
                <button
                  type="button"
                  onClick={() => setPagado((v) => !v)}
                  className={`w-full h-9 rounded-md border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    pagado
                      ? "bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                      : "bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${pagado ? "bg-emerald-500" : "bg-amber-400"}`} />
                  {pagado ? "Pagado" : "Pendiente de pago"}
                </button>
              </div>
            </div>
          </section>

          {/* ── Materiales ── */}
          <section>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Package className="h-3.5 w-3.5" />
              Materiales de la compra
              {!materialesBloqueados && (
                <span className="text-red-400 font-normal normal-case">(mínimo 1)</span>
              )}
            </p>

            {materialesBloqueados && (
              <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 flex items-start gap-2">
                <span className="shrink-0">🔒</span>
                <span>
                  La compra ya está {initialData?.estado === "recibida_parcial" ? "recibida parcialmente" : "recibida"}: los materiales y cantidades quedan
                  congelados. Podés seguir editando datos informativos, fechas, partes involucradas y adjuntos.
                </span>
              </div>
            )}

            {matList.length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden mb-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Material</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">UM</th>
                      <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Uds.</th>
                      {!materialesBloqueados && <th className="w-10" />}
                    </tr>
                  </thead>
                  <tbody>
                    {matList.map((item) => (
                      <tr key={item.material_id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            {item.foto ? (
                              <img
                                src={item.foto}
                                alt={item.material_nombre}
                                className="h-8 w-8 rounded object-cover border border-gray-200 flex-shrink-0"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="h-8 w-8 rounded border border-gray-200 bg-gray-100 flex items-center justify-center flex-shrink-0">
                                <Package className="h-4 w-4 text-gray-400" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium leading-tight text-gray-900 truncate">
                                {item.material_nombre}
                              </p>
                              <p className="font-mono text-xs text-gray-400">{item.material_codigo}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-gray-500">{item.um || "—"}</td>
                        <td className="py-2 px-3">
                          {materialesBloqueados ? (
                            <span className="block text-center text-sm font-medium text-gray-700">{item.cantidad}</span>
                          ) : (
                            <Input
                              type="number"
                              min="1"
                              value={item.cantidad}
                              onChange={(e) => updateCant(item.material_id, e.target.value)}
                              className="h-7 text-center w-full text-sm"
                            />
                          )}
                        </td>
                        {!materialesBloqueados && (
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeMat(item.material_id)}
                              className="text-gray-300 hover:text-red-500 transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t border-gray-200">
                      <td colSpan={2} className="py-2 px-3 text-xs text-gray-400">
                        {matList.length} referencia{matList.length !== 1 ? "s" : ""}
                      </td>
                      <td className="py-2 px-3 text-center text-xs font-semibold text-gray-600">
                        {matList.reduce((s, m) => s + m.cantidad, 0)} uds. total
                      </td>
                      {!materialesBloqueados && <td />}
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {!materialesBloqueados && (
            <div className="flex gap-2 items-stretch">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar material por código o nombre..."
                  value={materialSearch}
                  onChange={(e) => setMaterialSearch(e.target.value)}
                  onFocus={() => {
                    if (materialResults.length > 0) setShowMaterialDropdown(true);
                  }}
                  className="pl-10"
                />
              {showMaterialDropdown && materialResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-y-auto">
                  {materialResults.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-cyan-50 text-sm flex items-center gap-2 border-b border-gray-50 last:border-b-0"
                      onClick={() => handleAddMaterial(m)}
                    >
                      {m.foto ? (
                        <img
                          src={m.foto}
                          alt={m.nombre || m.descripcion}
                          className="h-9 w-9 rounded object-cover border border-gray-200 flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="h-9 w-9 rounded bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                          <Package className="h-4 w-4 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-gray-900">
                          {m.nombre || m.descripcion}
                        </p>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-mono text-gray-400">{m.codigo}</span>
                          {m.um && (
                            <span className="text-gray-500">UM: {m.um}</span>
                          )}
                        </div>
                      </div>
                      <Plus className="h-4 w-4 text-cyan-600 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
              </div>
              {onCreateMaterial && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setQuickCreateOpen(true)}
                  className="shrink-0 gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  title="Crear un material rápidamente"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Crear material</span>
                </Button>
              )}
            </div>
            )}

            {!materialesBloqueados && matList.length === 0 && !materialSearch && (
              <div className="border border-dashed border-gray-200 rounded-lg py-6 text-center mt-3">
                <Package className="h-7 w-7 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Aún no hay materiales agregados</p>
              </div>
            )}
          </section>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-red-50 border border-red-200">
              <span className="text-red-500 shrink-0">⚠</span>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-lg flex justify-end gap-2 shrink-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy} className="px-5">
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={busy}
            className="px-5 bg-cyan-600 hover:bg-cyan-700 text-white gap-2"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditMode ? "Guardar cambios" : "Registrar compra"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {onCreateMaterial && (
      <QuickMaterialCreateDialog
        open={quickCreateOpen}
        onOpenChange={setQuickCreateOpen}
        categories={categories}
        units={unidadesDelCatalogo}
        onSubmit={onCreateMaterial}
        onCreated={(material) => {
          handleAddMaterial(material);
        }}
      />
    )}
    </>
  );
}
