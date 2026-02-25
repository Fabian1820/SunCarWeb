"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Package,
  Search,
  Lock,
  CheckCircle,
  Plus,
  X,
  Upload,
  Image as ImageIcon,
  Save,
  User,
} from "lucide-react";
import { Badge } from "@/components/shared/atom/badge";
import { Input } from "@/components/shared/atom/input";
import { Label } from "@/components/shared/atom/label";
import { Button } from "@/components/shared/atom/button";
import { Card, CardContent } from "@/components/shared/molecule/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/shared/molecule/dialog";
import { Textarea } from "@/components/shared/molecule/textarea";
import { ExportButtons } from "@/components/shared/molecule/export-buttons";
import { useMaterials } from "@/hooks/use-materials";
import { useInventario } from "@/hooks/use-inventario";
import { useMarcas } from "@/hooks/use-marcas";
import { useToast } from "@/hooks/use-toast";
import { ClienteSearchSelector } from "@/components/feats/cliente/cliente-search-selector";
import { LeadSearchSelector } from "@/components/feats/leads/lead-search-selector";
import { ClienteService } from "@/lib/services/feats/customer/cliente-service";
import { LeadService } from "@/lib/services/feats/leads/lead-service";
import type { Material } from "@/lib/material-types";
import type { Cliente } from "@/lib/types/feats/customer/cliente-types";

interface OfertaItem {
  id: string;
  materialCodigo: string;
  descripcion: string;
  precio: number;
  precioOriginal: number; // Precio original del material
  precioEditado: boolean; // Indica si el precio fue editado manualmente
  cantidad: number;
  categoria: string;
  seccion: string;
}

interface ElementoPersonalizado {
  id: string;
  materialCodigo: string;
  descripcion: string;
  precio: number;
  cantidad: number;
  categoria: string;
}

interface SeccionPersonalizada {
  id: string;
  label: string;
  tipo: "materiales" | "extra";
  tipoExtra?: "escritura" | "costo";
  categoriasMateriales?: string[];
  contenidoEscritura?: string;
  costosExtras?: CostoExtra[];
}

const SECCION_AMPLIACION_ID = "AMPLIACION_SISTEMA";

interface CostoExtra {
  id: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
}

interface ServicioOferta {
  id: string;
  descripcion: string;
  cantidad: number;
  costo: number;
  porcentaje_margen_origen: number;
}

type MetodoPagoAcordado = "efectivo" | "transferencia" | "stripe";

interface PagoAcordadoForm {
  id: string;
  monto_usd: number;
  metodo_pago: MetodoPagoAcordado;
  fecha_estimada: string;
}

interface ConfeccionOfertasViewProps {
  modoEdicion?: boolean;
  ofertaParaEditar?: any;
  ofertaParaDuplicar?: any;
  onGuardarExito?: () => void;
  onCerrar?: () => void;
  clienteIdInicial?: string;
  leadIdInicial?: string;
  tipoContactoInicial?: "cliente" | "lead" | "lead_sin_agregar";
  ofertaGenericaInicial?: boolean;
}

export function ConfeccionOfertasView({
  modoEdicion = false,
  ofertaParaEditar = null,
  ofertaParaDuplicar = null,
  onGuardarExito,
  onCerrar,
  clienteIdInicial,
  leadIdInicial,
  tipoContactoInicial,
  ofertaGenericaInicial,
}: ConfeccionOfertasViewProps = {}) {
  const { materials, loading } = useMaterials();
  const {
    almacenes,
    stock,
    refetchStock,
    loading: loadingAlmacenes,
  } = useInventario();
  const { marcas, loading: loadingMarcas } = useMarcas();
  const { toast } = useToast();

  // Clave única para localStorage basada en el modo
  const localStorageKey = useMemo(() => {
    if (modoEdicion && ofertaParaEditar?.id) {
      return `oferta-edicion-${ofertaParaEditar.id}`;
    } else if (ofertaParaDuplicar?.id) {
      return `oferta-duplicar-${ofertaParaDuplicar.id}`;
    } else {
      return "oferta-nueva";
    }
  }, [modoEdicion, ofertaParaEditar?.id, ofertaParaDuplicar?.id]);

  // Limpiar localStorage al entrar en modo edición para evitar datos desactualizados
  useEffect(() => {
    if (modoEdicion && ofertaParaEditar?.id) {
      console.log("🧹 Limpiando localStorage para modo edición");
      localStorage.removeItem(localStorageKey);
    }
  }, [modoEdicion, ofertaParaEditar?.id, localStorageKey]);

  // Función para cargar estado desde localStorage
  const cargarEstadoGuardado = () => {
    try {
      const estadoGuardado = localStorage.getItem(localStorageKey);
      if (estadoGuardado) {
        return JSON.parse(estadoGuardado);
      }
    } catch (error) {
      console.error("Error cargando estado guardado:", error);
    }
    return null;
  };

  const estadoInicial = cargarEstadoGuardado();

  const [items, setItems] = useState<OfertaItem[]>(estadoInicial?.items || []);
  const [ofertaGenerica, setOfertaGenerica] = useState(
    ofertaGenericaInicial !== undefined
      ? ofertaGenericaInicial
      : (estadoInicial?.ofertaGenerica ?? true),
  );
  const [tipoContacto, setTipoContacto] = useState<
    "cliente" | "lead" | "lead_sin_agregar"
  >(tipoContactoInicial || estadoInicial?.tipoContacto || "cliente");
  const [clienteId, setClienteId] = useState(
    clienteIdInicial || estadoInicial?.clienteId || "",
  );
  const [leadId, setLeadId] = useState(
    leadIdInicial || estadoInicial?.leadId || "",
  );
  const [nombreLeadSinAgregar, setNombreLeadSinAgregar] = useState(
    estadoInicial?.nombreLeadSinAgregar || "",
  );
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [clientesLoading, setClientesLoading] = useState(false);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(
    estadoInicial?.activeStepIndex || 0,
  );
  const [margenComercial, setMargenComercial] = useState(
    estadoInicial?.margenComercial || 0,
  );
  const [porcentajeMargenMateriales, setPorcentajeMargenMateriales] = useState(
    estadoInicial?.porcentajeMargenMateriales || 50,
  );
  const [porcentajeMargenInstalacion, setPorcentajeMargenInstalacion] =
    useState(estadoInicial?.porcentajeMargenInstalacion || 50);
  const [costoTransportacion, setCostoTransportacion] = useState(
    estadoInicial?.costoTransportacion || 0,
  );
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(
    estadoInicial?.descuentoPorcentaje || 0,
  );
  
  // Estados para compensación y asumido por empresa
  const [tieneCompensacion, setTieneCompensacion] = useState(estadoInicial?.tieneCompensacion || false);
  const [montoCompensacion, setMontoCompensacion] = useState(estadoInicial?.montoCompensacion || 0);
  const [justificacionCompensacion, setJustificacionCompensacion] = useState(estadoInicial?.justificacionCompensacion || "");
  const [modoCompensacion, setModoCompensacion] = useState<"monto" | "porcentaje">(estadoInicial?.modoCompensacion || "monto");
  const [porcentajeCompensacion, setPorcentajeCompensacion] = useState(estadoInicial?.porcentajeCompensacion || 0);
  
  const [tieneAsumidoPorEmpresa, setTieneAsumidoPorEmpresa] = useState(estadoInicial?.tieneAsumidoPorEmpresa || false);
  const [montoAsumidoPorEmpresa, setMontoAsumidoPorEmpresa] = useState(estadoInicial?.montoAsumidoPorEmpresa || 0);
  const [justificacionAsumidoPorEmpresa, setJustificacionAsumidoPorEmpresa] = useState(estadoInicial?.justificacionAsumidoPorEmpresa || "");
  const [modoAsumidoPorEmpresa, setModoAsumidoPorEmpresa] = useState<"monto" | "porcentaje">(estadoInicial?.modoAsumidoPorEmpresa || "monto");
  const [porcentajeAsumidoPorEmpresa, setPorcentajeAsumidoPorEmpresa] = useState(estadoInicial?.porcentajeAsumidoPorEmpresa || 0);
  
  const [elementosPersonalizados, setElementosPersonalizados] = useState<
    ElementoPersonalizado[]
  >(estadoInicial?.elementosPersonalizados || []);
  const [mostrarElementosPersonalizados, setMostrarElementosPersonalizados] =
    useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [almacenId, setAlmacenId] = useState<string>(
    estadoInicial?.almacenId || "",
  );
  const [reservandoMateriales, setReservandoMateriales] = useState(false);
  const [materialesReservados, setMaterialesReservados] = useState(false);
  const [inversorSeleccionado, setInversorSeleccionado] = useState<string>(
    estadoInicial?.inversorSeleccionado || "",
  );
  const [bateriaSeleccionada, setBateriaSeleccionada] = useState<string>(
    estadoInicial?.bateriaSeleccionada || "",
  );
  const [panelSeleccionado, setPanelSeleccionado] = useState<string>(
    estadoInicial?.panelSeleccionado || "",
  );
  const [estadoOferta, setEstadoOferta] = useState<string>(
    estadoInicial?.estadoOferta || "en_revision",
  );
  const [seccionesPersonalizadas, setSeccionesPersonalizadas] = useState<
    SeccionPersonalizada[]
  >(
    estadoInicial?.seccionesPersonalizadas || [
      {
        id: SECCION_AMPLIACION_ID,
        label: "Ampliación de Sistema",
        tipo: "materiales",
        categoriasMateriales: ["*"],
      },
    ],
  );
  const [mostrarDialogoSeccion, setMostrarDialogoSeccion] = useState(false);
  const [tipoSeccionNueva, setTipoSeccionNueva] = useState<
    "materiales" | "extra" | null
  >(null);
  const [tipoExtraSeccion, setTipoExtraSeccion] = useState<
    "escritura" | "costo" | null
  >(null);
  const [nombreSeccionNueva, setNombreSeccionNueva] = useState("");
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState<
    string[]
  >([]);
  const [contenidoEscritura, setContenidoEscritura] = useState("");
  const [mostrarDialogoReserva, setMostrarDialogoReserva] = useState(false);
  const [tipoReserva, setTipoReserva] = useState<
    "temporal" | "definitiva" | null
  >(null);
  const [diasReserva, setDiasReserva] = useState(7);
  const [fechaExpiracionReserva, setFechaExpiracionReserva] =
    useState<Date | null>(null);
  const [fotoPortada, setFotoPortada] = useState<string>(
    estadoInicial?.fotoPortada || "",
  );
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [creandoOferta, setCreandoOferta] = useState(false);
  const [ofertaCreada, setOfertaCreada] = useState(false);
  const [ofertaId, setOfertaId] = useState<string>(
    estadoInicial?.ofertaId || "",
  );
  const [monedaPago, setMonedaPago] = useState<"USD" | "EUR" | "CUP">(
    estadoInicial?.monedaPago || "USD",
  );
  const [tasaCambio, setTasaCambio] = useState<string>(
    estadoInicial?.tasaCambio || "",
  );
  const [pagoTransferencia, setPagoTransferencia] = useState(
    estadoInicial?.pagoTransferencia || false,
  );
  const [datosCuenta, setDatosCuenta] = useState(
    estadoInicial?.datosCuenta || "",
  );
  const [formasPagoAcordadas, setFormasPagoAcordadas] = useState(() => {
    const pagosGuardados = Array.isArray(estadoInicial?.pagosAcordados)
      ? estadoInicial.pagosAcordados
      : [];
    return Boolean(
      estadoInicial?.formasPagoAcordadas || pagosGuardados.length > 0,
    );
  });
  const [cantidadPagosAcordados, setCantidadPagosAcordados] = useState<number>(
    () => {
      const cantidadGuardada = Number(estadoInicial?.cantidadPagosAcordados);
      if (Number.isFinite(cantidadGuardada) && cantidadGuardada >= 0) {
        return Math.floor(cantidadGuardada);
      }
      return Array.isArray(estadoInicial?.pagosAcordados)
        ? estadoInicial.pagosAcordados.length
        : 0;
    },
  );
  const [pagosAcordados, setPagosAcordados] = useState<PagoAcordadoForm[]>(
    () => {
      const pagosGuardados = Array.isArray(estadoInicial?.pagosAcordados)
        ? estadoInicial.pagosAcordados
        : [];
      return pagosGuardados.map((pago: any, index: number) => ({
        id:
          typeof pago?.id === "string" && pago.id.trim()
            ? pago.id
            : `pago-local-${index}-${Date.now()}`,
        monto_usd: Number(pago?.monto_usd) || 0,
        metodo_pago:
          pago?.metodo_pago === "transferencia" ||
          pago?.metodo_pago === "stripe"
            ? pago.metodo_pago
            : "efectivo",
        fecha_estimada:
          typeof pago?.fecha_estimada === "string" ? pago.fecha_estimada : "",
      }));
    },
  );
  const [aplicaContribucion, setAplicaContribucion] = useState(
    estadoInicial?.aplicaContribucion || false,
  );
  const [porcentajeContribucion, setPorcentajeContribucion] = useState<number>(
    estadoInicial?.porcentajeContribucion || 0,
  );
  const [margenComercialTotal, setMargenComercialTotal] = useState(0);
  const [margenParaMateriales, setMargenParaMateriales] = useState(0);
  const [margenParaInstalacion, setMargenParaInstalacion] = useState(0);
  const [margenPorMaterial, setMargenPorMaterial] = useState<
    Map<string, number>
  >(new Map());
  const [porcentajeMargenPorItem, setPorcentajeMargenPorItem] = useState<
    Map<string, number>
  >(new Map());
  const [porcentajeAsignadoPorItem, setPorcentajeAsignadoPorItem] = useState<
    Record<string, number>
  >({});
  const [nombreCompletoBackend, setNombreCompletoBackend] =
    useState<string>("");
  const [terminosCondiciones, setTerminosCondiciones] = useState<string | null>(
    null,
  );

  const normalizeText = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();

  const generarPagoAcordadoId = () =>
    `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const toDateTimeLocalValue = (value: string | undefined) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (num: number) => num.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const steps = [
    {
      id: "INVERSORES",
      label: "Inversores",
      match: (categoria: string) => categoria.includes("INVERSOR"),
      esPersonalizada: false,
    },
    {
      id: "BATERIAS",
      label: "Baterías",
      match: (categoria: string) => categoria.includes("BATERIA"),
      esPersonalizada: false,
    },
    {
      id: "PANELES",
      label: "Paneles",
      match: (categoria: string) => categoria.includes("PANEL"),
      esPersonalizada: false,
    },
    {
      id: "MPPT",
      label: "MPPT",
      match: (categoria: string) => categoria.includes("MPPT"),
      esPersonalizada: false,
    },
    {
      id: "ESTRUCTURAS",
      label: "Estructuras",
      match: (categoria: string) => categoria.includes("ESTRUCTURA"),
      esPersonalizada: false,
    },
    {
      id: "CABLEADO_DC",
      label: "Cableado DC",
      match: (categoria: string) => categoria.includes("CABLE"),
      esPersonalizada: false,
    },
    {
      id: "CABLEADO_AC",
      label: "Cableado AC",
      match: (categoria: string) => categoria.includes("CABLE"),
      esPersonalizada: false,
    },
    {
      id: "CANALIZACION",
      label: "Canalización",
      match: (categoria: string) => categoria.includes("PVC"),
      esPersonalizada: false,
    },
    {
      id: "TIERRA",
      label: "Tierra",
      match: (categoria: string) => categoria.includes("TIERRA"),
      esPersonalizada: false,
    },
    {
      id: "PROTECCIONES_ELECTRICAS",
      label: "Protecciones Eléctricas y Gabinetes",
      match: (categoria: string) =>
        categoria.includes("PROTECCION") || categoria.includes("GABINETE"),
      esPersonalizada: false,
    },
    {
      id: "MATERIAL_VARIO",
      label: "Material vario",
      match: (categoria: string) =>
        categoria.includes("VARIO") || categoria.includes("PEQUENO"),
      esPersonalizada: false,
    },
    // Agregar secciones personalizadas
    ...seccionesPersonalizadas.map((seccion) => ({
      id: seccion.id,
      label: seccion.label,
      match: (categoria: string) => {
        if (seccion.tipo === "materiales" && seccion.categoriasMateriales) {
          if (seccion.categoriasMateriales.includes("*")) return true;
          return seccion.categoriasMateriales.some((cat) =>
            normalizeText(categoria).includes(normalizeText(cat)),
          );
        }
        return false;
      },
      esPersonalizada: true,
      seccionData: seccion,
    })),
  ];

  const activeStep = steps[activeStepIndex] ?? steps[0];

  const seccionLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    steps.forEach((step) => map.set(step.id, step.label));
    return map;
  }, [steps]);

  // Seleccionar automáticamente el primer almacén si solo hay uno
  useEffect(() => {
    if (almacenes.length === 1 && !almacenId) {
      setAlmacenId(almacenes[0]?.id ?? "");
    }
  }, [almacenes, almacenId]);

  // Cargar datos de la oferta en modo edición
  // Cargar datos de la oferta en modo edición o duplicación
  useEffect(() => {
    const ofertaACopiar = modoEdicion ? ofertaParaEditar : ofertaParaDuplicar;

    console.log("🔍 DEBUG - useEffect oferta:", {
      modoEdicion,
      tiene_ofertaParaEditar: !!ofertaParaEditar,
      tiene_ofertaParaDuplicar: !!ofertaParaDuplicar,
      ofertaACopiar_id: ofertaACopiar?.id,
      descuento_en_oferta: ofertaACopiar?.descuento_porcentaje,
      compensacion_completa: ofertaACopiar?.compensacion,
      asumido_completo: ofertaACopiar?.asumido_por_empresa,
      monto_pendiente_backend: ofertaACopiar?.monto_pendiente,
      leadIdInicial,
      clienteIdInicial,
      tipoContactoInicial,
    });

    if (ofertaACopiar) {
      // En modo edición, SIEMPRE cargar los datos de la oferta del backend
      // NO usar localStorage porque puede tener datos desactualizados
      if (modoEdicion) {
        console.log(
          "🔄 Modo edición: Cargando datos frescos de la oferta (ignorando localStorage)",
        );
      } else {
        // En modo duplicación, verificar si hay un estado guardado más reciente
        const estadoGuardado = cargarEstadoGuardado();
        if (estadoGuardado && estadoGuardado.timestamp) {
          const tiempoGuardado = new Date(estadoGuardado.timestamp).getTime();
          const tiempoActual = new Date().getTime();
          const diferencia = tiempoActual - tiempoGuardado;

          // Si el estado guardado es de hace menos de 24 horas, usarlo en lugar de la oferta
          if (diferencia < 24 * 60 * 60 * 1000) {
            console.log("📦 Usando estado guardado en localStorage");
            return; // Ya se cargó en el estado inicial
          }
        }
      }

      console.log(
        modoEdicion
          ? "🔄 Cargando oferta para editar:"
          : "📋 Cargando oferta para duplicar:",
        ofertaACopiar,
      );

      // Cargar datos básicos
      // PRIORIZAR ofertaGenericaInicial cuando se duplica (similar a tipoContactoInicial)
      if (!modoEdicion && ofertaGenericaInicial !== undefined) {
        // En modo duplicación, usar el prop inicial para determinar el tipo
        setOfertaGenerica(ofertaGenericaInicial);
        console.log("✅ Usando ofertaGenericaInicial:", ofertaGenericaInicial);
      } else {
        // En modo edición o sin prop inicial, usar el tipo de la oferta original
        setOfertaGenerica(ofertaACopiar.tipo === "generica");
      }

      // Determinar el tipo de contacto
      // PRIORIZAR los props iniciales sobre los datos de la oferta cuando se duplica
      if (!modoEdicion && tipoContactoInicial) {
        // En modo duplicación, usar los props iniciales
        setTipoContacto(tipoContactoInicial);
        if (tipoContactoInicial === "lead" && leadIdInicial) {
          setLeadId(leadIdInicial);
          setClienteId("");
          setNombreLeadSinAgregar("");
          console.log("✅ Usando leadIdInicial:", leadIdInicial);
        } else if (tipoContactoInicial === "cliente" && clienteIdInicial) {
          setClienteId(clienteIdInicial);
          setLeadId("");
          setNombreLeadSinAgregar("");
          console.log("✅ Usando clienteIdInicial:", clienteIdInicial);
        }
      } else if (ofertaACopiar.nombre_lead_sin_agregar) {
        setTipoContacto("lead_sin_agregar");
        setNombreLeadSinAgregar(ofertaACopiar.nombre_lead_sin_agregar);
        setClienteId("");
        setLeadId("");
      } else if (ofertaACopiar.lead_id) {
        setTipoContacto("lead");
        setLeadId(ofertaACopiar.lead_id);
        setClienteId("");
        setNombreLeadSinAgregar("");
      } else if (ofertaACopiar.cliente_numero || ofertaACopiar.cliente_id) {
        setTipoContacto("cliente");
        setClienteId(
          ofertaACopiar.cliente_numero || ofertaACopiar.cliente_id || "",
        );
        setLeadId("");
        setNombreLeadSinAgregar("");
      }

      setAlmacenId(ofertaACopiar.almacen_id || "");
      setEstadoOferta(
        modoEdicion ? ofertaACopiar.estado || "en_revision" : "en_revision",
      );
      setFotoPortada(ofertaACopiar.foto_portada || "");

      // Cargar items
      if (ofertaACopiar.items && Array.isArray(ofertaACopiar.items)) {
        console.log("🔍 Cargando items de oferta:", {
          items_count: ofertaACopiar.items.length,
          primer_item_completo: ofertaACopiar.items[0],
          tiene_margen_asignado: ofertaACopiar.items[0]?.margen_asignado,
        });

        const itemsCargados = ofertaACopiar.items.map((item: any) => ({
          id: `${item.seccion}-${item.material_codigo}`,
          materialCodigo: item.material_codigo,
          descripcion: item.descripcion,
          precio: item.precio,
          precioOriginal: item.precio_original || item.precio,
          precioEditado: item.precio_editado || false,
          cantidad: item.cantidad,
          categoria: item.categoria || "Sin categoria",
          seccion: item.seccion,
        }));
        setItems(itemsCargados);

        // Cargar márgenes asignados de cada item
        const margenMap = new Map<string, number>();
        const porcentajeMap = new Map<string, number>();
        const porcentajeAsignadoMap: Record<string, number> = {};

        ofertaACopiar.items.forEach((item: any) => {
          const itemId = `${item.seccion}-${item.material_codigo}`;

          console.log(`  Procesando item ${itemId}:`, {
            margen_asignado: item.margen_asignado,
            tipo: typeof item.margen_asignado,
            precio: item.precio,
            cantidad: item.cantidad,
          });

          if (typeof item.margen_asignado === "number") {
            margenMap.set(itemId, item.margen_asignado);

            // Calcular porcentaje desde el margen asignado
            const costoItem = item.precio * item.cantidad;
            if (costoItem > 0 && item.margen_asignado > 0) {
              const porcentaje = (item.margen_asignado / costoItem) * 100;
              porcentajeMap.set(itemId, porcentaje);

              // ✅ IMPORTANTE: Cargar también en porcentajeAsignadoPorItem
              // para que se consideren como "editados manualmente" al recargar
              porcentajeAsignadoMap[itemId] = porcentaje;

              console.log(
                `    ✅ Margen guardado: ${item.margen_asignado}, Porcentaje: ${porcentaje}%`,
              );
            }
          } else {
            console.log(`    ⚠️ No tiene margen_asignado o no es número`);
          }
        });

        console.log("📥 Márgenes cargados desde oferta:", {
          margenMap_size: margenMap.size,
          margenMap_entries: Array.from(margenMap.entries()),
          porcentajeMap_size: porcentajeMap.size,
          porcentajeAsignadoMap_size: Object.keys(porcentajeAsignadoMap).length,
        });

        setMargenPorMaterial(margenMap);
        setPorcentajeMargenPorItem(porcentajeMap);
        setPorcentajeAsignadoPorItem(porcentajeAsignadoMap);
      }

      // Cargar elementos personalizados
      if (
        ofertaACopiar.elementos_personalizados &&
        Array.isArray(ofertaACopiar.elementos_personalizados)
      ) {
        const elementosCargados = ofertaACopiar.elementos_personalizados.map(
          (elem: any, index: number) => ({
            id: `custom-${elem.material_codigo}-${index}`,
            materialCodigo: elem.material_codigo,
            descripcion: elem.descripcion,
            precio: elem.precio,
            cantidad: elem.cantidad,
            categoria: elem.categoria || "Sin categoria",
          }),
        );
        setElementosPersonalizados(elementosCargados);
      }

      // Cargar secciones personalizadas
      if (
        ofertaACopiar.secciones_personalizadas &&
        Array.isArray(ofertaACopiar.secciones_personalizadas)
      ) {
        const seccionesCargadas = ofertaACopiar.secciones_personalizadas.map(
          (seccion: any) => ({
            id: seccion.id,
            label: seccion.label,
            tipo: seccion.tipo,
            tipoExtra: seccion.tipo_extra,
            categoriasMateriales: seccion.categorias_materiales,
            contenidoEscritura: seccion.contenido_escritura,
            costosExtras: seccion.costos_extras?.map((costo: any) => ({
              id: costo.id,
              descripcion: costo.descripcion,
              cantidad: costo.cantidad,
              precioUnitario: costo.precio_unitario,
            })),
          }),
        );
        setSeccionesPersonalizadas(seccionesCargadas);
      }

      // Cargar componentes principales
      if (ofertaACopiar.componentes_principales) {
        setInversorSeleccionado(
          ofertaACopiar.componentes_principales.inversor_seleccionado || "",
        );
        setBateriaSeleccionada(
          ofertaACopiar.componentes_principales.bateria_seleccionada || "",
        );
        setPanelSeleccionado(
          ofertaACopiar.componentes_principales.panel_seleccionado || "",
        );
      }

      // Cargar márgenes y costos
      setMargenComercial(ofertaACopiar.margen_comercial || 0);
      setCostoTransportacion(ofertaACopiar.costo_transportacion || 0);
      setDescuentoPorcentaje(ofertaACopiar.descuento_porcentaje || 0);

      console.log("🔍 DEBUG - Cargando descuento al editar:", {
        descuento_porcentaje: ofertaACopiar.descuento_porcentaje,
        monto_descuento: ofertaACopiar.monto_descuento,
        tiene_campo: "descuento_porcentaje" in ofertaACopiar,
      });

      // Cargar compensación y asumido por empresa
      console.log("🔍 DEBUG - Datos de compensación y asumido:", {
        compensacion: ofertaACopiar.compensacion,
        asumido_por_empresa: ofertaACopiar.asumido_por_empresa,
        tiene_compensacion: !!ofertaACopiar.compensacion,
        tiene_asumido: !!ofertaACopiar.asumido_por_empresa
      });
      
      if (ofertaACopiar.compensacion) {
        console.log("✅ Cargando compensación:", ofertaACopiar.compensacion);
        setTieneCompensacion(true);
        setMontoCompensacion(ofertaACopiar.compensacion.monto_usd || 0);
        setJustificacionCompensacion(ofertaACopiar.compensacion.justificacion || "");
      }
      if (ofertaACopiar.asumido_por_empresa) {
        console.log("✅ Cargando asumido por empresa:", ofertaACopiar.asumido_por_empresa);
        setTieneAsumidoPorEmpresa(true);
        setMontoAsumidoPorEmpresa(ofertaACopiar.asumido_por_empresa.monto_usd || 0);
        setJustificacionAsumidoPorEmpresa(ofertaACopiar.asumido_por_empresa.justificacion || "");
      }

      // Cargar datos de pago
      setMonedaPago(ofertaACopiar.moneda_pago || "USD");
      setTasaCambio(ofertaACopiar.tasa_cambio?.toString() || "");
      setPagoTransferencia(ofertaACopiar.pago_transferencia || false);
      setDatosCuenta(ofertaACopiar.datos_cuenta || "");
      const formasPagoAcordadasOferta = Boolean(
        ofertaACopiar.formas_pago_acordadas,
      );
      const pagosAcordadosOferta = Array.isArray(ofertaACopiar.pagos_acordados)
        ? ofertaACopiar.pagos_acordados.map((pago: any, index: number) => ({
            id: `pago-${index}-${Date.now()}`,
            monto_usd: Number(pago?.monto_usd) || 0,
            metodo_pago:
              pago?.metodo_pago === "transferencia" ||
              pago?.metodo_pago === "stripe"
                ? pago.metodo_pago
                : "efectivo",
            fecha_estimada: toDateTimeLocalValue(pago?.fecha_estimada),
          }))
        : [];
      const cantidadPagosOfertaRaw = Number(
        ofertaACopiar.cantidad_pagos_acordados,
      );
      const cantidadPagosOferta = Number.isFinite(cantidadPagosOfertaRaw)
        ? cantidadPagosOfertaRaw
        : pagosAcordadosOferta.length;

      setFormasPagoAcordadas(formasPagoAcordadasOferta);
      setPagosAcordados(formasPagoAcordadasOferta ? pagosAcordadosOferta : []);
      setCantidadPagosAcordados(
        formasPagoAcordadasOferta
          ? Math.max(0, cantidadPagosOferta || pagosAcordadosOferta.length)
          : 0,
      );
      setAplicaContribucion(ofertaACopiar.aplica_contribucion || false);
      setPorcentajeContribucion(ofertaACopiar.porcentaje_contribucion || 0);

      // Cargar nombre completo del backend SOLO en modo edición
      // En modo duplicación, regenerar el nombre para reflejar los cambios
      if (modoEdicion && ofertaACopiar.nombre_completo) {
        setNombreCompletoBackend(ofertaACopiar.nombre_completo);
      }

      // En modo edición, guardar el ID para la actualización
      // En modo duplicación, NO guardar el ID para crear una nueva oferta
      if (modoEdicion) {
        setOfertaId(ofertaACopiar.numero_oferta || ofertaACopiar.id);
      }

      toast({
        title: modoEdicion ? "Oferta cargada" : "Oferta lista para duplicar",
        description: modoEdicion
          ? "Los datos de la oferta se han cargado correctamente"
          : "Modifica los datos y guarda para crear la nueva oferta",
      });
    }
  }, [
    modoEdicion,
    ofertaParaEditar,
    ofertaParaDuplicar,
    leadIdInicial,
    clienteIdInicial,
    tipoContactoInicial,
    toast,
  ]);

  // Cargar stock cuando se selecciona un almacén
  useEffect(() => {
    if (almacenId) {
      refetchStock(almacenId);
    }
  }, [almacenId, refetchStock]);

  // Cargar términos y condiciones
  useEffect(() => {
    const cargarTerminos = async () => {
      try {
        const { apiRequest } = await import("@/lib/api-config");
        const result = await apiRequest<{
          success: boolean;
          data?: {
            id: string;
            texto: string;
            activo: boolean;
          };
        }>("/terminos-condiciones/activo", {
          method: "GET",
        });

        if (result.success && result.data) {
          setTerminosCondiciones(result.data.texto);
        }
      } catch (error) {
        console.error("Error cargando términos y condiciones:", error);
      }
    };
    cargarTerminos();
  }, []);

  // Guardar estado en localStorage cada vez que cambia
  useEffect(() => {
    // No guardar si la oferta ya fue creada o si estamos cargando datos iniciales
    if (ofertaCreada) return;

    // Esperar un poco antes de guardar para evitar guardar estados intermedios
    const timeoutId = setTimeout(() => {
      try {
        const estadoParaGuardar = {
          items,
          ofertaGenerica,
          tipoContacto,
          clienteId,
          leadId,
          nombreLeadSinAgregar,
          activeStepIndex,
          margenComercial,
          porcentajeMargenMateriales,
          porcentajeMargenInstalacion,
          costoTransportacion,
          descuentoPorcentaje,
          elementosPersonalizados,
          almacenId,
          inversorSeleccionado,
          bateriaSeleccionada,
          panelSeleccionado,
          estadoOferta,
          seccionesPersonalizadas,
          fotoPortada,
          ofertaId,
          monedaPago,
          tasaCambio,
          pagoTransferencia,
          datosCuenta,
          formasPagoAcordadas,
          cantidadPagosAcordados,
          pagosAcordados,
          aplicaContribucion,
          porcentajeContribucion,
          tieneCompensacion,
          montoCompensacion,
          justificacionCompensacion,
          modoCompensacion,
          porcentajeCompensacion,
          tieneAsumidoPorEmpresa,
          montoAsumidoPorEmpresa,
          justificacionAsumidoPorEmpresa,
          modoAsumidoPorEmpresa,
          porcentajeAsumidoPorEmpresa,
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem(
          localStorageKey,
          JSON.stringify(estadoParaGuardar),
        );
      } catch (error) {
        console.error("Error guardando estado:", error);
      }
    }, 500); // Debounce de 500ms

    return () => clearTimeout(timeoutId);
  }, [
    items,
    ofertaGenerica,
    tipoContacto,
    clienteId,
    leadId,
    nombreLeadSinAgregar,
    activeStepIndex,
    margenComercial,
    porcentajeMargenMateriales,
    porcentajeMargenInstalacion,
    costoTransportacion,
    descuentoPorcentaje,
    elementosPersonalizados,
    almacenId,
    inversorSeleccionado,
    bateriaSeleccionada,
    panelSeleccionado,
    estadoOferta,
    seccionesPersonalizadas,
    fotoPortada,
    ofertaId,
    monedaPago,
    tasaCambio,
    pagoTransferencia,
    datosCuenta,
    tieneCompensacion,
    montoCompensacion,
    justificacionCompensacion,
    tieneAsumidoPorEmpresa,
    montoAsumidoPorEmpresa,
    justificacionAsumidoPorEmpresa,
    formasPagoAcordadas,
    cantidadPagosAcordados,
    pagosAcordados,
    aplicaContribucion,
    porcentajeContribucion,
    ofertaCreada,
    localStorageKey,
  ]);

  // Limpiar localStorage cuando se guarda exitosamente la oferta
  useEffect(() => {
    if (ofertaCreada) {
      try {
        localStorage.removeItem(localStorageKey);
      } catch (error) {
        console.error("Error limpiando localStorage:", error);
      }
    }
  }, [ofertaCreada, localStorageKey]);

  // Obtener materiales con stock en el almacén seleccionado
  const materialesConStock = useMemo(() => {
    if (!almacenId) return materials; // Si no hay almacén seleccionado, mostrar todos

    // Filtrar stock del almacén seleccionado
    const stockAlmacen = stock.filter(
      (s) => s.almacen_id === almacenId && s.cantidad > 0,
    );

    // Mapear a materiales con información de stock
    return stockAlmacen
      .map((stockItem) => {
        const material = materials.find(
          (m) => m.codigo.toString() === stockItem.material_codigo,
        );
        if (!material) return null;
        return {
          ...material,
          stock_disponible: stockItem.cantidad,
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);
  }, [almacenId, stock, materials]);

  const materialesFiltrados = useMemo(() => {
    if (!activeStep) return materialesConStock;

    let filtered = materialesConStock.filter((material) => {
      const categoria = normalizeText(material.categoria ?? "");
      return activeStep.match(categoria);
    });

    // Aplicar búsqueda si hay query
    if (searchQuery.trim()) {
      const query = normalizeText(searchQuery.trim());
      filtered = filtered.filter((material) => {
        const descripcion = normalizeText(material.descripcion);
        const codigo = normalizeText(material.codigo?.toString() ?? "");
        const categoria = normalizeText(material.categoria ?? "");
        return (
          descripcion.includes(query) ||
          codigo.includes(query) ||
          categoria.includes(query)
        );
      });
    }

    return filtered;
  }, [materialesConStock, activeStep, searchQuery]);

  const cantidadesPorMaterial = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((item) => {
      map.set(`${item.seccion}:${item.materialCodigo}`, item.cantidad);
    });
    // Agregar elementos personalizados
    elementosPersonalizados.forEach((elem) => {
      map.set(`PERSONALIZADO:${elem.materialCodigo}`, elem.cantidad);
    });
    return map;
  }, [items, elementosPersonalizados]);

  const itemsPorSeccion = useMemo(() => {
    const map = new Map<string, OfertaItem[]>();
    items.forEach((item) => {
      if (!map.has(item.seccion)) map.set(item.seccion, []);
      map.get(item.seccion)?.push(item);
    });
    return map;
  }, [items]);

  // Calcular márgenes SIN redistribución automática
  const margenPorMaterialCalculado = useMemo(() => {
    const map = new Map<string, number>();

    items.forEach((item) => {
      const costoItem = item.precio * item.cantidad;

      // Si hay porcentaje asignado manualmente, usarlo
      if (typeof porcentajeAsignadoPorItem[item.id] === "number") {
        const margenManual =
          costoItem * (porcentajeAsignadoPorItem[item.id] / 100);
        map.set(item.id, margenManual);
        console.log(
          `  ✏️ Item ${item.id} - Margen MANUAL: ${porcentajeAsignadoPorItem[item.id]}% = ${margenManual}`,
        );
      } else {
        // Usar el margen calculado automáticamente
        const porcentaje = porcentajeMargenPorItem.get(item.id) ?? 0;
        const margenAuto = costoItem * (porcentaje / 100);
        map.set(item.id, margenAuto);
        console.log(
          `  🤖 Item ${item.id} - Margen AUTO: ${porcentaje}% = ${margenAuto}`,
        );
      }
    });

    console.log("📊 margenPorMaterialCalculado recalculado:", {
      total_items: items.length,
      items_con_margen_manual: Object.keys(porcentajeAsignadoPorItem).length,
      total_margen: Array.from(map.values()).reduce((a, b) => a + b, 0),
    });

    return map;
  }, [items, porcentajeAsignadoPorItem, porcentajeMargenPorItem]);

  // Calcular desbalance de margen
  const desbalanceMargen = useMemo(() => {
    const totalAsignado = Array.from(
      margenPorMaterialCalculado.values(),
    ).reduce((a, b) => a + b, 0);
    const desbalance = margenParaMateriales - totalAsignado;

    console.log("🔍 DEBUG - Desbalance calculado:", {
      margenParaMateriales,
      totalAsignado,
      desbalance,
      margenPorMaterialCalculado_size: margenPorMaterialCalculado.size,
      porcentajeAsignadoPorItem_keys: Object.keys(porcentajeAsignadoPorItem),
    });

    return desbalance;
  }, [
    margenPorMaterialCalculado,
    margenParaMateriales,
    porcentajeAsignadoPorItem,
  ]);

  const subtotalPorSeccion = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((item) => {
      const margenItem = margenPorMaterialCalculado.get(item.id) ?? 0;
      map.set(
        item.seccion,
        (map.get(item.seccion) ?? 0) + item.precio * item.cantidad + margenItem,
      );
    });
    return map;
  }, [items, margenPorMaterialCalculado]);

  const totalMateriales = useMemo(() => {
    return items.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  }, [items]);

  const totalElementosPersonalizados = useMemo(() => {
    return elementosPersonalizados.reduce(
      (sum, elem) => sum + elem.precio * elem.cantidad,
      0,
    );
  }, [elementosPersonalizados]);

  const totalCostosExtras = useMemo(() => {
    return seccionesPersonalizadas.reduce((sum, seccion) => {
      if (
        seccion.tipo === "extra" &&
        seccion.tipoExtra === "costo" &&
        seccion.costosExtras
      ) {
        return (
          sum +
          seccion.costosExtras.reduce(
            (costoSum, costo) =>
              costoSum + costo.cantidad * costo.precioUnitario,
            0,
          )
        );
      }
      return sum;
    }, 0);
  }, [seccionesPersonalizadas]);

  useEffect(() => {
    const resetMargins = () => {
      setMargenComercialTotal(0);
      setMargenParaMateriales(0);
      setMargenParaInstalacion(0);
      setMargenPorMaterial(new Map());
      setPorcentajeMargenPorItem(new Map());
    };

    const calcularMargenesLocal = () => {
      if (
        margenComercial <= 0 ||
        margenComercial >= 100 ||
        items.length === 0
      ) {
        resetMargins();
        return;
      }

      console.log("🔧 Calculando márgenes localmente con algoritmo exacto...");

      // Funciones auxiliares
      const normalizarCategoria = (categoria: string): string => {
        if (!categoria) return "default";

        const cat = categoria
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim();

        const mapeo: Record<string, string> = {
          inversor: "inversores",
          inversores: "inversores",
          bateria: "baterias",
          baterias: "baterias",
          panel: "paneles",
          paneles: "paneles",
          estructura: "estructuras",
          estructuras: "estructuras",
          "cableado ac": "cableado ac",
          "cableado dc": "cableado dc",
          canalizacion: "canalizacion",
          tierra: "tierra",
          "protecciones electricas": "protecciones electricas",
          "material vario": "material vario",
          mppt: "mppt",
        };

        return mapeo[cat] || "default";
      };

      const FACTORES_CATEGORIA: Record<string, number> = {
        inversores: 3.0,
        baterias: 3.0,
        paneles: 2.0,
        estructuras: 1.5,
        mppt: 1.5,
        "cableado ac": 1.0,
        "cableado dc": 1.0,
        canalizacion: 1.0,
        tierra: 1.0,
        "protecciones electricas": 1.2,
        "material vario": 1.0,
        default: 1.0,
      };

      const TOPES_CATEGORIA: Record<string, number> = {
        inversores: 100,
        baterias: 100,
        paneles: 15,
        estructuras: 40,
        "cableado ac": 5,
        "cableado dc": 5,
        canalizacion: 5,
        tierra: 5,
        "material vario": 5,
        default: 20,
      };

      const CATEGORIAS_PRIORITARIAS = [
        "inversores",
        "baterias",
        "paneles",
        "estructuras",
      ];

      const obtenerFactorCategoria = (categoria: string): number => {
        const categoriaNorm = normalizarCategoria(categoria);
        return (
          FACTORES_CATEGORIA[categoriaNorm] || FACTORES_CATEGORIA["default"]
        );
      };

      const obtenerTopeCategoria = (categoriaNorm: string): number => {
        return TOPES_CATEGORIA[categoriaNorm] || TOPES_CATEGORIA["default"];
      };

      // Paso 1: Normalizar categorías y contar
      const categoriasNormalizadas = items.map((item) =>
        normalizarCategoria(item.categoria),
      );
      const conteoCategorias: Record<string, number> = {};
      categoriasNormalizadas.forEach((cat) => {
        conteoCategorias[cat] = (conteoCategorias[cat] || 0) + 1;
      });

      console.log("📊 Conteo por categoría:", conteoCategorias);

      // Paso 2: Calcular costo total y scores
      let totalMateriales = 0;
      const costosItems: number[] = [];
      const scores: number[] = [];

      items.forEach((item, index) => {
        const precio = parseFloat(item.precio.toString());
        const cantidad = parseFloat(item.cantidad.toString());
        const costo = precio * cantidad;
        totalMateriales += costo;
        costosItems.push(costo);

        let factor = obtenerFactorCategoria(item.categoria);
        const categoriaNorm = categoriasNormalizadas[index];

        // Ajustar factor para inversores y baterías
        if (categoriaNorm === "baterias" || categoriaNorm === "inversores") {
          const divisor = conteoCategorias[categoriaNorm] || 1;
          if (divisor > 0) {
            factor = factor / divisor;
          }
        }

        const score = costo * factor;
        scores.push(score);
      });

      // Paso 3: Calcular margen total y margen para materiales
      const margenComercialDec = margenComercial / 100;
      const precioVentaTotal =
        totalMateriales === 0 ? 0 : totalMateriales / (1 - margenComercialDec);
      const margenTotal = precioVentaTotal - totalMateriales;
      const margenMateriales = margenTotal * (porcentajeMargenMateriales / 100);
      const margenInstalacion =
        margenTotal * (porcentajeMargenInstalacion / 100);

      console.log("💰 Márgenes calculados:", {
        totalMateriales,
        margenTotal,
        margenMateriales,
        margenInstalacion,
      });

      // Paso 4: Distribuir margen según scores
      const scoreTotal = scores.reduce((sum, s) => sum + s, 0);
      let margenesAsignados: number[];

      if (scoreTotal === 0) {
        margenesAsignados = items.map(() => 0);
      } else {
        margenesAsignados = scores.map(
          (score) => (score / scoreTotal) * margenMateriales,
        );
      }

      // Paso 5: Aplicar topes por categoría
      const capsPorItem = items.map((item, index) => {
        const cantidad = parseFloat(item.cantidad.toString());
        const categoriaNorm = categoriasNormalizadas[index];
        return obtenerTopeCategoria(categoriaNorm) * cantidad;
      });

      // Identificar items que pueden recibir excesos
      const receptoresExceso = new Set<number>();
      items.forEach((item, index) => {
        const categoriaNorm = categoriasNormalizadas[index];
        if (CATEGORIAS_PRIORITARIAS.includes(categoriaNorm)) {
          receptoresExceso.add(index);
        }
      });

      // Paso 6: Redistribuir excesos iterativamente
      let libres = new Set(items.map((_, i) => i));

      while (true) {
        let excesoTotal = 0;
        const nuevosMargenesTemp = [...margenesAsignados];

        // Detectar items que exceden su tope
        for (const i of Array.from(libres)) {
          const cap = capsPorItem[i];
          if (nuevosMargenesTemp[i] > cap) {
            excesoTotal += nuevosMargenesTemp[i] - cap;
            nuevosMargenesTemp[i] = cap;
            libres.delete(i);
          }
        }

        margenesAsignados = nuevosMargenesTemp;

        // Si no hay exceso o no hay receptores, terminar
        if (excesoTotal === 0 || receptoresExceso.size === 0) {
          break;
        }

        // Calcular score total de receptores
        let scoreLibreTotal = 0;
        for (const i of receptoresExceso) {
          scoreLibreTotal += scores[i];
        }

        if (scoreLibreTotal === 0) {
          break;
        }

        // Redistribuir exceso entre receptores prioritarios
        for (const i of receptoresExceso) {
          const incremento = (scores[i] / scoreLibreTotal) * excesoTotal;
          margenesAsignados[i] = margenesAsignados[i] + incremento;
        }
      }

      // Paso 7: Redondear a 2 decimales
      let margenesRedondeados = margenesAsignados.map(
        (m) => Math.round(m * 100) / 100,
      );

      // Paso 8: Ajuste fino para mantener suma exacta
      const margenMaterialesRedondeado =
        Math.round(margenMateriales * 100) / 100;
      let sumaActual = margenesRedondeados.reduce((sum, m) => sum + m, 0);
      sumaActual = Math.round(sumaActual * 100) / 100;
      let diff =
        Math.round((margenMaterialesRedondeado - sumaActual) * 100) / 100;

      if (diff !== 0 && margenesRedondeados.length > 0) {
        const step = 0.01;

        // Determinar candidatos para ajuste
        let candidatos: number[];
        if (diff > 0) {
          candidatos = Array.from(receptoresExceso);
        } else {
          candidatos = margenesRedondeados
            .map((m, i) => ({ margen: m, index: i }))
            .filter(({ margen }) => margen - step >= 0)
            .map(({ index }) => index);
        }

        if (candidatos.length === 0) {
          candidatos = items.map((_, i) => i);
        }

        // Ordenar candidatos por score (mayor a menor)
        candidatos.sort((a, b) => scores[b] - scores[a]);

        // Ajustar incrementalmente
        const pasos = Math.abs(Math.round(diff / step));
        const sign = diff > 0 ? 1 : -1;
        let idx = 0;

        for (let p = 0; p < pasos && candidatos.length > 0; p++) {
          const i = candidatos[idx % candidatos.length];
          const nuevo = margenesRedondeados[i] + step * sign;
          const cap = capsPorItem[i];

          // Validar que no viole restricciones
          if (sign > 0 && !receptoresExceso.has(i) && nuevo > cap) {
            idx++;
            if (idx >= candidatos.length * 10) break;
            p--; // Reintentar este paso
            continue;
          }
          if (sign < 0 && nuevo < 0) {
            idx++;
            if (idx >= candidatos.length * 10) break;
            p--; // Reintentar este paso
            continue;
          }

          margenesRedondeados[i] = Math.round(nuevo * 100) / 100;
          idx++;
        }
      }

      // Paso 9: Crear mapas de resultados
      const margenMap = new Map<string, number>();
      const porcentajeMap = new Map<string, number>();

      items.forEach((item, index) => {
        const costo = costosItems[index];
        const margen = margenesRedondeados[index];
        const porcentajeMargenItem = costo > 0 ? (margen / costo) * 100 : 0;

        margenMap.set(item.id, margen);
        porcentajeMap.set(
          item.id,
          Math.round(porcentajeMargenItem * 10000) / 10000,
        );
      });

      console.log("✅ Márgenes finales:", {
        margenMap_entries: Array.from(margenMap.entries()),
        suma_margenes: Array.from(margenMap.values()).reduce(
          (a, b) => a + b,
          0,
        ),
        margen_materiales_objetivo: margenMaterialesRedondeado,
      });

      // Actualizar estados
      setMargenComercialTotal(Math.round(margenTotal * 100) / 100);
      setMargenParaMateriales(margenMaterialesRedondeado);
      setMargenParaInstalacion(Math.round(margenInstalacion * 100) / 100);
      setMargenPorMaterial(margenMap);
      setPorcentajeMargenPorItem(porcentajeMap);
      // NO actualizar porcentajeAsignadoPorItem aquí - solo debe tener valores editados manualmente
    };

    calcularMargenesLocal();
  }, [margenComercial, porcentajeMargenMateriales, items]);

  const servicios = useMemo<ServicioOferta[]>(() => {
    if (margenParaInstalacion <= 0) return [];
    return [
      {
        id: "SERVICIO_INSTALACION",
        descripcion: "Servicio de instalación y montaje",
        cantidad: 1,
        costo: margenParaInstalacion,
        porcentaje_margen_origen: porcentajeMargenInstalacion,
      },
    ];
  }, [margenParaInstalacion, porcentajeMargenInstalacion]);

  const totalMargenAsignadoMateriales = useMemo(() => {
    let total = 0;
    margenPorMaterialCalculado.forEach((value) => {
      total += value;
    });
    return total;
  }, [margenPorMaterialCalculado]);

  const porcentajeSugeridoPorMaterial = useMemo(() => {
    const map = new Map<string, number>();
    if (margenParaMateriales <= 0 || totalMateriales <= 0) return map;

    items.forEach((item) => {
      const costoItem = item.precio * item.cantidad;
      if (costoItem <= 0) {
        map.set(item.id, 0);
        return;
      }
      const porcentajeActual =
        typeof porcentajeAsignadoPorItem[item.id] === "number"
          ? porcentajeAsignadoPorItem[item.id]
          : (porcentajeMargenPorItem.get(item.id) ?? 0);
      const margenActual = costoItem * (porcentajeActual / 100);
      const margenRestante =
        margenParaMateriales - (totalMargenAsignadoMateriales - margenActual);
      const sugeridoRaw =
        margenRestante <= 0 ? 0 : (margenRestante / costoItem) * 100;
      const sugerido = Math.min(100, Math.max(0, sugeridoRaw));
      map.set(item.id, sugerido);
    });

    return map;
  }, [
    items,
    margenParaMateriales,
    totalMateriales,
    totalMargenAsignadoMateriales,
    porcentajeAsignadoPorItem,
    porcentajeMargenPorItem,
  ]);

  const faltantePorMaterial = useMemo(() => {
    const map = new Map<string, number>();
    if (margenParaMateriales <= 0 || totalMateriales <= 0) return map;

    items.forEach((item) => {
      const costoItem = item.precio * item.cantidad;
      if (costoItem <= 0) {
        map.set(item.id, 0);
        return;
      }
      const porcentajeActual =
        typeof porcentajeAsignadoPorItem[item.id] === "number"
          ? porcentajeAsignadoPorItem[item.id]
          : (porcentajeMargenPorItem.get(item.id) ?? 0);
      const margenActual = costoItem * (porcentajeActual / 100);
      const margenRestante =
        margenParaMateriales - (totalMargenAsignadoMateriales - margenActual);
      const sugerido = porcentajeSugeridoPorMaterial.get(item.id) || 0;
      const margenConSugerido = costoItem * (sugerido / 100);
      map.set(item.id, margenRestante - margenConSugerido);
    });

    return map;
  }, [
    items,
    margenParaMateriales,
    totalMateriales,
    totalMargenAsignadoMateriales,
    porcentajeAsignadoPorItem,
    porcentajeMargenPorItem,
    porcentajeSugeridoPorMaterial,
  ]);

  const subtotalConMargen = useMemo(() => {
    // El subtotal con margen incluye TODO el margen comercial (materiales + instalación)
    return totalMateriales + margenComercialTotal;
  }, [totalMateriales, margenComercialTotal]);

  const montoDescuento = useMemo(() => {
    if (descuentoPorcentaje <= 0) return 0;
    return subtotalConMargen * (descuentoPorcentaje / 100);
  }, [subtotalConMargen, descuentoPorcentaje]);

  const subtotalConDescuento = useMemo(() => {
    return subtotalConMargen - montoDescuento;
  }, [subtotalConMargen, montoDescuento]);

  const totalSinRedondeo = useMemo(() => {
    // Base: subtotal con descuento aplicado + costos adicionales
    const base =
      subtotalConDescuento +
      costoTransportacion +
      totalElementosPersonalizados +
      totalCostosExtras;
    const contribucion = aplicaContribucion
      ? base * (porcentajeContribucion / 100)
      : 0;
    return base + contribucion;
  }, [
    subtotalConDescuento,
    costoTransportacion,
    totalElementosPersonalizados,
    totalCostosExtras,
    aplicaContribucion,
    porcentajeContribucion,
  ]);

  const precioFinal = useMemo(() => {
    // Redondear al múltiplo de 10 más cercano hacia arriba
    return Math.ceil(totalSinRedondeo / 10) * 10;
  }, [totalSinRedondeo]);

  // Sincronizar compensación: cuando cambia el porcentaje, actualizar el monto
  useEffect(() => {
    if (modoCompensacion === "porcentaje" && precioFinal > 0) {
      const nuevoMonto = (precioFinal * porcentajeCompensacion) / 100;
      setMontoCompensacion(Math.round(nuevoMonto * 100) / 100);
    }
  }, [modoCompensacion, porcentajeCompensacion, precioFinal]);

  // Sincronizar asumido por empresa: cuando cambia el porcentaje, actualizar el monto
  useEffect(() => {
    if (modoAsumidoPorEmpresa === "porcentaje" && precioFinal > 0) {
      const nuevoMonto = (precioFinal * porcentajeAsumidoPorEmpresa) / 100;
      setMontoAsumidoPorEmpresa(Math.round(nuevoMonto * 100) / 100);
    }
  }, [modoAsumidoPorEmpresa, porcentajeAsumidoPorEmpresa, precioFinal]);

  // Calcular monto pendiente restando compensación y asumido por empresa
  const montoPendiente = useMemo(() => {
    let pendiente = precioFinal;
    
    if (tieneCompensacion && montoCompensacion > 0) {
      pendiente -= montoCompensacion;
    }
    
    if (tieneAsumidoPorEmpresa && montoAsumidoPorEmpresa > 0) {
      pendiente -= montoAsumidoPorEmpresa;
    }
    
    // Asegurar que no sea negativo
    return Math.max(0, pendiente);
  }, [precioFinal, tieneCompensacion, montoCompensacion, tieneAsumidoPorEmpresa, montoAsumidoPorEmpresa]);

  // Crear mapa de marcas por ID
  const marcasMap = useMemo(() => {
    const map = new Map<string, string>();
    marcas.forEach((marca) => {
      if (marca.id && marca.nombre) {
        map.set(marca.id, marca.nombre);
      }
    });
    return map;
  }, [marcas]);

  // Generar nombre automático de la oferta (formato compacto para UI)
  const nombreAutomatico = useMemo(() => {
    const componentes: string[] = [];

    // Obtener potencia del material
    const obtenerPotencia = (materialCodigo: string): number | null => {
      const material = materials.find(
        (m) => m.codigo.toString() === materialCodigo,
      );
      if (!material) {
        console.warn(
          `⚠️ [nombreAutomatico] Material no encontrado: ${materialCodigo}`,
        );
      } else if (!material.potenciaKW) {
        console.warn(
          `⚠️ [nombreAutomatico] Material sin potenciaKW: ${materialCodigo} - ${material.nombre}`,
        );
      }
      return material?.potenciaKW || null;
    };

    // Función para formatear potencia con coma decimal
    const formatearPotencia = (potencia: number): string => {
      return potencia.toString().replace(".", ",");
    };

    // 1. INVERSORES - Usar el seleccionado
    if (inversorSeleccionado) {
      const inversoresDelTipo = items.filter(
        (item) =>
          item.seccion === "INVERSORES" &&
          item.materialCodigo === inversorSeleccionado,
      );
      if (inversoresDelTipo.length > 0) {
        const cantidad = inversoresDelTipo.reduce(
          (sum, inv) => sum + inv.cantidad,
          0,
        );
        const potencia = obtenerPotencia(inversorSeleccionado);

        if (potencia) {
          componentes.push(`I-${cantidad}x${formatearPotencia(potencia)}kW`);
        } else {
          componentes.push(`I-${cantidad}x`);
        }
      }
    }

    // 2. BATERÍAS - Usar la seleccionada
    if (bateriaSeleccionada) {
      const bateriasDelTipo = items.filter(
        (item) =>
          item.seccion === "BATERIAS" &&
          item.materialCodigo === bateriaSeleccionada,
      );
      if (bateriasDelTipo.length > 0) {
        const cantidad = bateriasDelTipo.reduce(
          (sum, bat) => sum + bat.cantidad,
          0,
        );
        const potencia = obtenerPotencia(bateriaSeleccionada);

        console.log(
          `🔋 [nombreAutomatico] Baterías: código=${bateriaSeleccionada}, cantidad=${cantidad}, potencia=${potencia}`,
        );

        if (potencia) {
          componentes.push(`B-${cantidad}x${formatearPotencia(potencia)}kWh`);
        } else {
          componentes.push(`B-${cantidad}x`);
        }
      }
    }

    // 3. PANELES - Usar el seleccionado
    if (panelSeleccionado) {
      const panelesDelTipo = items.filter(
        (item) =>
          item.seccion === "PANELES" &&
          item.materialCodigo === panelSeleccionado,
      );
      if (panelesDelTipo.length > 0) {
        const cantidad = panelesDelTipo.reduce(
          (sum, pan) => sum + pan.cantidad,
          0,
        );
        const potencia = obtenerPotencia(panelSeleccionado);

        if (potencia) {
          // Para paneles, siempre convertir kW a W
          const potenciaW = potencia * 1000;
          componentes.push(`P-${cantidad}x${formatearPotencia(potenciaW)}W`);
        } else {
          componentes.push(`P-${cantidad}x`);
        }
      }
    }

    // Construir el nombre final
    if (componentes.length === 0) {
      return "Oferta sin componentes principales";
    } else {
      return componentes.join(", ");
    }
  }, [
    items,
    inversorSeleccionado,
    bateriaSeleccionada,
    panelSeleccionado,
    materials,
  ]);

  // Generar nombre completo para exportaciones (formato largo con marcas)
  const nombreCompletoParaExportar = useMemo(() => {
    console.log("🔧 Generando nombreCompletoParaExportar...");
    console.log("  - marcasMap size:", marcasMap.size);
    console.log("  - inversorSeleccionado:", inversorSeleccionado);
    console.log("  - bateriaSeleccionada:", bateriaSeleccionada);
    console.log("  - panelSeleccionado:", panelSeleccionado);

    const componentes: string[] = [];

    // Obtener marca del material usando marca_id
    const obtenerMarca = (materialCodigo: string): string => {
      const material = materials.find(
        (m) => m.codigo.toString() === materialCodigo,
      );
      console.log(
        `    - Material ${materialCodigo}:`,
        material ? `marca_id=${material.marca_id}` : "no encontrado",
      );
      if (!material || !material.marca_id) return "";
      const marca = marcasMap.get(material.marca_id) || "";
      console.log(`      -> Marca: ${marca}`);
      return marca;
    };

    // Obtener potencia del material
    const obtenerPotencia = (materialCodigo: string): number | null => {
      const material = materials.find(
        (m) => m.codigo.toString() === materialCodigo,
      );
      if (!material) {
        console.warn(
          `⚠️ [nombreCompleto] Material no encontrado: ${materialCodigo}`,
        );
      } else if (!material.potenciaKW) {
        console.warn(
          `⚠️ [nombreCompleto] Material sin potenciaKW: ${materialCodigo} - ${material.nombre}`,
        );
      }
      return material?.potenciaKW || null;
    };

    // 1. INVERSORES - Usar el seleccionado
    if (inversorSeleccionado) {
      const inversoresDelTipo = items.filter(
        (item) =>
          item.seccion === "INVERSORES" &&
          item.materialCodigo === inversorSeleccionado,
      );
      if (inversoresDelTipo.length > 0) {
        const cantidad = inversoresDelTipo.reduce(
          (sum, inv) => sum + inv.cantidad,
          0,
        );
        const potencia = obtenerPotencia(inversorSeleccionado);
        const marca = obtenerMarca(inversorSeleccionado);

        if (potencia && marca) {
          componentes.push(`${cantidad}x ${potencia}kW Inversor ${marca}`);
        } else if (potencia) {
          componentes.push(`${cantidad}x ${potencia}kW Inversor`);
        } else if (marca) {
          componentes.push(`${cantidad}x Inversor ${marca}`);
        } else {
          componentes.push(`${cantidad}x Inversor`);
        }
      }
    }

    // 2. BATERÍAS - Usar la seleccionada
    if (bateriaSeleccionada) {
      const bateriasDelTipo = items.filter(
        (item) =>
          item.seccion === "BATERIAS" &&
          item.materialCodigo === bateriaSeleccionada,
      );
      if (bateriasDelTipo.length > 0) {
        const cantidad = bateriasDelTipo.reduce(
          (sum, bat) => sum + bat.cantidad,
          0,
        );
        const potencia = obtenerPotencia(bateriaSeleccionada);
        const marca = obtenerMarca(bateriaSeleccionada);

        console.log(
          `🔋 [nombreCompleto] Baterías: código=${bateriaSeleccionada}, cantidad=${cantidad}, potencia=${potencia}, marca=${marca}`,
        );

        if (potencia && marca) {
          componentes.push(`${cantidad}x ${potencia}kWh Batería ${marca}`);
        } else if (potencia) {
          componentes.push(`${cantidad}x ${potencia}kWh Batería`);
        } else if (marca) {
          componentes.push(`${cantidad}x Batería ${marca}`);
        } else {
          componentes.push(`${cantidad}x Batería`);
        }
      }
    }

    // 3. PANELES - Usar el seleccionado
    if (panelSeleccionado) {
      const panelesDelTipo = items.filter(
        (item) =>
          item.seccion === "PANELES" &&
          item.materialCodigo === panelSeleccionado,
      );
      if (panelesDelTipo.length > 0) {
        const cantidad = panelesDelTipo.reduce(
          (sum, pan) => sum + pan.cantidad,
          0,
        );
        const potencia = obtenerPotencia(panelSeleccionado);
        const marca = obtenerMarca(panelSeleccionado);

        if (potencia && marca) {
          // Para paneles, siempre convertir kW a W
          const potenciaW = potencia * 1000;
          componentes.push(`${cantidad}x ${potenciaW}W Paneles ${marca}`);
        } else if (potencia) {
          const potenciaW = potencia * 1000;
          componentes.push(`${cantidad}x ${potenciaW}W Paneles`);
        } else if (marca) {
          componentes.push(`${cantidad}x Paneles ${marca}`);
        } else {
          componentes.push(`${cantidad}x Paneles`);
        }
      }
    }

    // Construir el nombre final
    if (componentes.length === 0) {
      return "Oferta sin componentes principales";
    } else if (componentes.length === 1) {
      return `Oferta de ${componentes[0]}`;
    } else if (componentes.length === 2) {
      return `Oferta de ${componentes[0]} y ${componentes[1]}`;
    } else {
      const ultimoComponente = componentes.pop();
      return `Oferta de ${componentes.join(", ")} y ${ultimoComponente}`;
    }
  }, [
    items,
    inversorSeleccionado,
    bateriaSeleccionada,
    panelSeleccionado,
    materials,
    marcasMap,
  ]);

  const formatCurrency = (value: number) => {
    return `${new Intl.NumberFormat("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)} $`;
  };

  const formatCurrencyWithSymbol = (value: number, symbol: string) => {
    return `${new Intl.NumberFormat("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)} ${symbol}`;
  };

  // Función helper para formatear números con coma decimal (para exportación)
  const formatNumberForExport = (
    value: number,
    decimals: number = 2,
  ): string => {
    return value.toFixed(decimals).replace(".", ",");
  };

  const tasaCambioNumero = Number.parseFloat(tasaCambio) || 0;
  const mostrarCambio = monedaPago !== "USD" && tasaCambioNumero > 0;
  const montoConvertido = mostrarCambio
    ? monedaPago === "EUR"
      ? precioFinal / tasaCambioNumero
      : precioFinal * tasaCambioNumero
    : 0;

  const sumaPagosAcordadosActual = useMemo(() => {
    const suma = pagosAcordados.reduce(
      (sum, pago) => sum + (Number(pago.monto_usd) || 0),
      0,
    );
    return Math.round(suma * 100) / 100;
  }, [pagosAcordados]);

  const restantePagosAcordados = useMemo(
    () => Math.round((precioFinal - sumaPagosAcordadosActual) * 100) / 100,
    [precioFinal, sumaPagosAcordadosActual],
  );

  const sumaPagosSuperaPrecioFinal = useMemo(
    () =>
      Math.round(sumaPagosAcordadosActual * 100) >
      Math.round((Number(precioFinal) || 0) * 100),
    [sumaPagosAcordadosActual, precioFinal],
  );

  const totalSinMargen = useMemo(() => {
    return (
      totalMateriales +
      costoTransportacion +
      totalElementosPersonalizados +
      totalCostosExtras
    );
  }, [
    totalMateriales,
    costoTransportacion,
    totalElementosPersonalizados,
    totalCostosExtras,
  ]);

  const totalAntesDeDescuento = useMemo(() => {
    return (
      subtotalConMargen +
      costoTransportacion +
      totalElementosPersonalizados +
      totalCostosExtras
    );
  }, [
    subtotalConMargen,
    costoTransportacion,
    totalElementosPersonalizados,
    totalCostosExtras,
  ]);

  const selectedCliente = useMemo(() => {
    if (!clienteId) return null;
    return (
      clientes.find(
        (cliente) => cliente.id === clienteId || cliente.numero === clienteId,
      ) || null
    );
  }, [clientes, clienteId]);

  const selectedLead = useMemo(() => {
    if (!leadId) return null;
    return leads.find((lead) => lead.id === leadId) || null;
  }, [leads, leadId]);

  const baseFilenameExport = useMemo(() => {
    // Generar nombre base del archivo según el tipo de oferta
    let nombreBase = "";

    if (ofertaGenerica) {
      // Para ofertas genéricas: usar el nombre corto (nombreAutomatico)
      nombreBase = nombreAutomatico || "oferta_generica";
    } else {
      // Para ofertas personalizadas: usar nombre corto + nombre del contacto
      const nombreOferta = nombreAutomatico || "oferta";

      // Obtener el nombre del contacto según el tipo
      let nombreContacto = "";
      if (tipoContacto === "cliente" && selectedCliente) {
        nombreContacto = selectedCliente.nombre || selectedCliente.numero || "";
      } else if (tipoContacto === "lead" && selectedLead) {
        nombreContacto = selectedLead.nombre || "";
      } else if (tipoContacto === "lead_sin_agregar" && nombreLeadSinAgregar) {
        nombreContacto = nombreLeadSinAgregar;
      }

      // Combinar nombre de oferta con nombre de contacto
      if (nombreContacto) {
        nombreBase = `${nombreOferta}-${nombreContacto}`;
      } else {
        nombreBase = nombreOferta;
      }
    }

    // Limpiar el nombre para que sea válido como nombre de archivo
    // Reemplazar caracteres no válidos y espacios múltiples
    nombreBase = nombreBase
      .replace(/[<>:"/\\|?*]/g, "") // Eliminar caracteres no válidos en nombres de archivo
      .replace(/\s+/g, "_") // Reemplazar espacios con guiones bajos
      .replace(/,\s*/g, "+") // Reemplazar comas con + para el formato I-1x10kW+B-1x10kWh+P-14x590W
      .replace(/_+/g, "_") // Reemplazar múltiples guiones bajos con uno solo
      .trim();

    return nombreBase || "oferta_confeccion";
  }, [
    ofertaGenerica,
    nombreAutomatico,
    tipoContacto,
    selectedCliente,
    selectedLead,
    nombreLeadSinAgregar,
  ]);

  const exportOptionsCompleto = useMemo(() => {
    // Debug: verificar qué nombre se está usando
    console.log("🔍 Debug exportación:");
    console.log("  - nombreCompletoBackend:", nombreCompletoBackend);
    console.log("  - nombreCompletoParaExportar:", nombreCompletoParaExportar);
    console.log(
      "  - Se usará:",
      nombreCompletoBackend || nombreCompletoParaExportar,
    );

    // Nota: El filtrado de items ahora se maneja en ExportSelectionDialog
    const itemsFiltrados = items;

    const rows: any[] = [];

    // Crear mapa de fotos de materiales
    const fotosMap = new Map<string, string>();
    itemsFiltrados.forEach((item) => {
      const material = materials.find(
        (m) => m.codigo.toString() === item.materialCodigo,
      );
      if (material?.foto) {
        fotosMap.set(item.materialCodigo, material.foto);
      }
    });

    itemsFiltrados.forEach((item) => {
      const seccion = seccionLabelMap.get(item.seccion) ?? item.seccion;
      const costoItem = item.precio * item.cantidad;

      // Obtener el margen asignado calculado (considera editados manualmente)
      const margenAsignado = margenPorMaterialCalculado.get(item.id) || 0;

      // Calcular el porcentaje desde el margen asignado
      const porcentajeCalculado =
        costoItem > 0 && margenAsignado > 0
          ? (margenAsignado / costoItem) * 100
          : 0;

      // Debug
      console.log("📊 Item para exportación:", {
        id: item.id,
        descripcion: item.descripcion,
        costoItem,
        margenAsignado,
        porcentajeCalculado,
        margenPorMaterialCalculado_tiene: margenPorMaterialCalculado.has(
          item.id,
        ),
        margenPorMaterialCalculado_valor: margenPorMaterialCalculado.get(
          item.id,
        ),
      });

      // Buscar el nombre del material
      const material = materials.find(
        (m) => m.codigo.toString() === item.materialCodigo,
      );
      const nombreMaterial = material?.nombre || item.descripcion;

      rows.push({
        material_codigo: item.materialCodigo,
        seccion,
        tipo: "Material",
        descripcion: nombreMaterial,
        cantidad: item.cantidad,
        precio_unitario: item.precio,
        porcentaje_margen: formatNumberForExport(porcentajeCalculado),
        margen: formatNumberForExport(margenAsignado),
        total: formatNumberForExport(costoItem + margenAsignado),
      });
    });

    elementosPersonalizados.forEach((elem) => {
      rows.push({
        material_codigo: elem.materialCodigo,
        seccion: "Personalizados",
        tipo: "Elemento",
        descripcion: elem.descripcion,
        cantidad: elem.cantidad,
        precio_unitario: formatNumberForExport(elem.precio),
        porcentaje_margen: "",
        margen: "",
        total: formatNumberForExport(elem.precio * elem.cantidad),
      });
    });

    seccionesPersonalizadas.forEach((seccion) => {
      if (
        seccion.tipo === "extra" &&
        seccion.tipoExtra === "costo" &&
        seccion.costosExtras
      ) {
        seccion.costosExtras.forEach((costo) => {
          rows.push({
            material_codigo: "",
            seccion: seccion.label,
            tipo: "Costo extra",
            descripcion: costo.descripcion,
            cantidad: costo.cantidad,
            precio_unitario: formatNumberForExport(costo.precioUnitario),
            porcentaje_margen: "",
            margen: "",
            total: formatNumberForExport(costo.cantidad * costo.precioUnitario),
          });
        });
      }
    });

    // Agregar servicios
    if (margenParaInstalacion > 0) {
      rows.push({
        material_codigo: "",
        seccion: "Servicios",
        tipo: "Servicio",
        descripcion: "Servicio de instalación y montaje",
        cantidad: 1,
        precio_unitario: formatNumberForExport(margenParaInstalacion),
        porcentaje_margen: formatNumberForExport(porcentajeMargenInstalacion),
        margen: "",
        total: formatNumberForExport(margenParaInstalacion),
      });
    }

    // Agregar descuento si existe
    if (descuentoPorcentaje > 0) {
      rows.push({
        material_codigo: "",
        seccion: "Descuento",
        tipo: "Descuento",
        descripcion: `Descuento aplicado (${descuentoPorcentaje}%)`,
        cantidad: 1,
        precio_unitario: "",
        porcentaje_margen: "",
        margen: "",
        total: `- ${formatNumberForExport(montoDescuento)}`,
      });
    }

    if (costoTransportacion > 0) {
      rows.push({
        material_codigo: "",
        seccion: "Logística",
        tipo: "Transportación",
        descripcion: "Costo de transportación",
        cantidad: 1,
        precio_unitario: formatNumberForExport(costoTransportacion),
        porcentaje_margen: "",
        margen: "",
        total: formatNumberForExport(costoTransportacion),
      });
    }

    rows.push({
      material_codigo: "",
      seccion: "Totales",
      tipo: "TOTAL",
      descripcion: "Precio final",
      cantidad: "",
      precio_unitario: "",
      porcentaje_margen: "",
      margen: "",
      total: formatNumberForExport(precioFinal),
    });

    // SECCIÓN DE PAGO
    // Agregar línea vacía para separar
    rows.push({
      material_codigo: "",
      seccion: "",
      tipo: "",
      descripcion: "",
      cantidad: "",
      precio_unitario: "",
      porcentaje_margen: "",
      margen: "",
      total: "",
    });

    // Pago por transferencia
    if (pagoTransferencia) {
      rows.push({
        material_codigo: "",
        seccion: "PAGO",
        tipo: "Info",
        descripcion: "✓ Pago por transferencia",
        cantidad: "",
        precio_unitario: "",
        porcentaje_margen: "",
        margen: "",
        total: "",
      });

      if (datosCuenta) {
        rows.push({
          material_codigo: "",
          seccion: "PAGO",
          tipo: "Datos",
          descripcion: "Datos de la cuenta",
          cantidad: "",
          precio_unitario: "",
          porcentaje_margen: "",
          margen: "",
          total: datosCuenta,
        });
      }
    }

    // Contribución
    if (aplicaContribucion && porcentajeContribucion > 0) {
      const montoContribucion =
        (subtotalConMargen +
          costoTransportacion +
          totalElementosPersonalizados +
          totalCostosExtras) *
        (porcentajeContribucion / 100);
      rows.push({
        material_codigo: "",
        seccion: "PAGO",
        tipo: "Info",
        descripcion: `✓ Aplicar ${porcentajeContribucion}% de Contribución`,
        cantidad: "",
        precio_unitario: "",
        porcentaje_margen: "",
        margen: "",
        total: "",
      });
      rows.push({
        material_codigo: "",
        seccion: "PAGO",
        tipo: "Monto",
        descripcion: "Contribución",
        cantidad: "",
        precio_unitario: "",
        porcentaje_margen: "",
        margen: "",
        total: formatNumberForExport(montoContribucion),
      });
    }

    // Precio Final
    rows.push({
      material_codigo: "",
      seccion: "PAGO",
      tipo: "TOTAL",
      descripcion: "Precio Final",
      cantidad: "",
      precio_unitario: "",
      porcentaje_margen: "",
      margen: "",
      total: formatNumberForExport(precioFinal),
    });

    // Nota de redondeo si aplica
    if (precioFinal !== totalSinRedondeo) {
      rows.push({
        material_codigo: "",
        seccion: "PAGO",
        tipo: "Nota",
        descripcion: `(Redondeado desde ${formatNumberForExport(totalSinRedondeo)} $)`,
        cantidad: "",
        precio_unitario: "",
        porcentaje_margen: "",
        margen: "",
        total: "",
      });
    }

    // Conversión de moneda
    if (monedaPago !== "USD" && tasaCambioNumero > 0) {
      const simboloMoneda = monedaPago === "EUR" ? "€" : "CUP";
      const nombreMoneda =
        monedaPago === "EUR" ? "Euros (EUR)" : "Pesos Cubanos (CUP)";

      rows.push({
        material_codigo: "",
        seccion: "PAGO",
        tipo: "Info",
        descripcion: "Moneda de pago",
        cantidad: "",
        precio_unitario: "",
        porcentaje_margen: "",
        margen: "",
        total: nombreMoneda,
      });

      const tasaTexto =
        monedaPago === "EUR"
          ? `1 EUR = ${tasaCambioNumero} USD`
          : `1 USD = ${tasaCambioNumero} CUP`;

      rows.push({
        material_codigo: "",
        seccion: "PAGO",
        tipo: "Tasa",
        descripcion: tasaTexto,
        cantidad: "",
        precio_unitario: "",
        porcentaje_margen: "",
        margen: "",
        total: "",
      });

      rows.push({
        material_codigo: "",
        seccion: "PAGO",
        tipo: "Conversión",
        descripcion: `Precio en ${monedaPago}`,
        cantidad: "",
        precio_unitario: "",
        porcentaje_margen: "",
        margen: "",
        total: `${formatNumberForExport(montoConvertido)} ${simboloMoneda}`,
      });
    }

    return {
      title: "Oferta - Exportación completa",
      subtitle: nombreCompletoBackend || nombreCompletoParaExportar,
      columns: [
        { header: "Sección", key: "seccion", width: 18 },
        { header: "Tipo", key: "tipo", width: 12 },
        { header: "Descripción", key: "descripcion", width: 45 },
        { header: "Cant", key: "cantidad", width: 8 },
        { header: "P.Unit ($)", key: "precio_unitario", width: 12 },
        { header: "% Margen", key: "porcentaje_margen", width: 8 },
        { header: "Margen ($)", key: "margen", width: 14 },
        { header: "Total ($)", key: "total", width: 14 },
      ],
      data: rows,
      logoUrl: "/logo Suncar.png",
      clienteData:
        !ofertaGenerica && selectedCliente
          ? {
              numero: selectedCliente.numero || selectedCliente.id,
              nombre: selectedCliente.nombre,
              carnet_identidad: selectedCliente.carnet_identidad,
              telefono: selectedCliente.telefono,
              provincia_montaje: selectedCliente.provincia_montaje,
              direccion: selectedCliente.direccion,
              atencion_de: selectedCliente.nombre, // A la atención de para clientes
            }
          : undefined,
      leadData:
        !ofertaGenerica && tipoContacto === "lead" && selectedLead
          ? {
              id: selectedLead.id,
              nombre: selectedLead.nombre_completo || selectedLead.nombre,
              telefono: selectedLead.telefono,
              email: selectedLead.email,
              provincia: selectedLead.provincia,
              direccion: selectedLead.direccion,
              atencion_de: selectedLead.nombre_completo || selectedLead.nombre, // A la atención de para leads
            }
          : undefined,
      leadSinAgregarData:
        !ofertaGenerica &&
        tipoContacto === "lead_sin_agregar" &&
        nombreLeadSinAgregar
          ? {
              nombre: nombreLeadSinAgregar,
              atencion_de: nombreLeadSinAgregar, // A la atención de para leads sin agregar
            }
          : undefined,
      ofertaData: {
        numero_oferta: ofertaId,
        nombre_oferta: nombreAutomatico, // Nombre corto para UI
        tipo_oferta: ofertaGenerica ? "Genérica" : "Personalizada",
      },
      incluirFotos: true,
      fotosMap,
      componentesPrincipales: (() => {
        const componentes: any = {};

        console.log(
          "🔍 [exportOptionsCompleto] Construyendo componentes principales:",
          {
            inversorSeleccionado,
            bateriaSeleccionada,
            panelSeleccionado,
            totalItems: items.length,
          },
        );

        // ✅ Usar el inversor SELECCIONADO para el nombre (no el primero de la lista)
        if (inversorSeleccionado) {
          console.log(
            "🔍 [exportOptionsCompleto] Buscando inversores con código:",
            inversorSeleccionado,
          );
          console.log(
            "🔍 [exportOptionsCompleto] Items de INVERSORES:",
            items
              .filter((i) => i.seccion === "INVERSORES")
              .map((i) => ({
                codigo: i.materialCodigo,
                tipo: typeof i.materialCodigo,
                cantidad: i.cantidad,
              })),
          );

          const inversoresDelTipo = items.filter(
            (item) =>
              item.seccion === "INVERSORES" &&
              item.materialCodigo.toString() ===
                inversorSeleccionado.toString(),
          );

          console.log(
            "🔍 [exportOptionsCompleto] Inversores encontrados:",
            inversoresDelTipo.length,
          );

          if (inversoresDelTipo.length > 0) {
            const cantidad = inversoresDelTipo.reduce(
              (sum, inv) => sum + inv.cantidad,
              0,
            );
            const material = materials.find(
              (m) => m.codigo.toString() === inversorSeleccionado.toString(),
            );
            const potenciaMatch =
              material?.nombre?.match(/(\d+(?:\.\d+)?)\s*kw/i) ||
              material?.descripcion?.match(/(\d+(?:\.\d+)?)\s*kw/i);
            const potencia = potenciaMatch ? parseFloat(potenciaMatch[1]) : 0;
            const marcaId = material?.marca_id;
            const marca = marcaId
              ? marcas.find((m) => m.id === marcaId)?.nombre
              : undefined;

            console.log("✅ [exportOptionsCompleto] Inversor para PDF:", {
              codigo: inversorSeleccionado,
              cantidad,
              potencia,
              totalKW: cantidad * potencia,
              marca,
            });

            componentes.inversor = {
              codigo: inversorSeleccionado,
              cantidad: cantidad,
              potencia: potencia,
              marca: marca,
            };
          } else {
            console.warn(
              "⚠️ [exportOptionsCompleto] No se encontraron inversores del tipo seleccionado",
            );
          }
        }

        // ✅ Usar la batería SELECCIONADA para el nombre (no la primera de la lista)
        if (bateriaSeleccionada) {
          const bateriasDelTipo = items.filter(
            (item) =>
              item.seccion === "BATERIAS" &&
              item.materialCodigo.toString() === bateriaSeleccionada.toString(),
          );

          if (bateriasDelTipo.length > 0) {
            const cantidad = bateriasDelTipo.reduce(
              (sum, bat) => sum + bat.cantidad,
              0,
            );
            const material = materials.find(
              (m) => m.codigo.toString() === bateriaSeleccionada.toString(),
            );
            const capacidadMatch =
              material?.nombre?.match(/(\d+(?:\.\d+)?)\s*kwh/i) ||
              material?.descripcion?.match(/(\d+(?:\.\d+)?)\s*kwh/i);
            const capacidad = capacidadMatch
              ? parseFloat(capacidadMatch[1])
              : 0;

            console.log("✅ [exportOptionsCompleto] Batería para PDF:", {
              codigo: bateriaSeleccionada,
              cantidad,
              capacidad,
              totalKWH: cantidad * capacidad,
            });

            componentes.bateria = {
              codigo: bateriaSeleccionada,
              cantidad: cantidad,
              capacidad: capacidad,
            };
          }
        }

        // ✅ Usar el panel SELECCIONADO para el nombre (no el primero de la lista)
        if (panelSeleccionado) {
          const panelesDelTipo = items.filter(
            (item) =>
              item.seccion === "PANELES" &&
              item.materialCodigo.toString() === panelSeleccionado.toString(),
          );

          if (panelesDelTipo.length > 0) {
            const cantidad = panelesDelTipo.reduce(
              (sum, pan) => sum + pan.cantidad,
              0,
            );
            const material = materials.find(
              (m) => m.codigo.toString() === panelSeleccionado.toString(),
            );
            const potenciaMatch =
              material?.nombre?.match(/(\d+(?:\.\d+)?)\s*w(?!h)/i) ||
              material?.descripcion?.match(/(\d+(?:\.\d+)?)\s*w(?!h)/i);
            const potencia = potenciaMatch ? parseFloat(potenciaMatch[1]) : 0;

            console.log("✅ [exportOptionsCompleto] Panel para PDF:", {
              codigo: panelSeleccionado,
              cantidad,
              potencia,
              totalKW: (cantidad * potencia) / 1000,
            });

            componentes.panel = {
              codigo: panelSeleccionado,
              cantidad: cantidad,
              potencia: potencia,
            };
          }
        }

        console.log(
          "✅ [exportOptionsCompleto] Componentes finales:",
          componentes,
        );
        return componentes;
      })(),
      terminosCondiciones: terminosCondiciones || undefined,
      seccionesPersonalizadas: seccionesPersonalizadas.filter(
        (s: any) =>
          s.tipo === "extra" &&
          (s.tipoExtra === "escritura" || s.tipoExtra === "costo"),
      ),
    };
  }, [
    items,
    elementosPersonalizados,
    seccionesPersonalizadas,
    seccionLabelMap,
    porcentajeMargenPorItem,
    porcentajeAsignadoPorItem,
    margenPorMaterialCalculado,
    margenParaInstalacion,
    porcentajeMargenInstalacion,
    costoTransportacion,
    precioFinal,
    nombreCompletoBackend,
    nombreCompletoParaExportar,
    nombreAutomatico,
    materials,
    marcas,
    ofertaGenerica,
    selectedCliente,
    selectedLead,
    tipoContacto,
    nombreLeadSinAgregar,
    ofertaId,
    monedaPago,
    tasaCambioNumero,
    montoConvertido,
    pagoTransferencia,
    datosCuenta,
    aplicaContribucion,
    porcentajeContribucion,
    subtotalConMargen,
    totalElementosPersonalizados,
    totalCostosExtras,
    descuentoPorcentaje,
    montoDescuento,
    terminosCondiciones,
    inversorSeleccionado,
    bateriaSeleccionada,
    panelSeleccionado,
  ]);

  const exportOptionsSinPrecios = useMemo(() => {
    // Nota: El filtrado de items ahora se maneja en ExportSelectionDialog
    const itemsFiltrados = items;

    const rows: any[] = [];

    // Crear mapa de fotos de materiales
    const fotosMap = new Map<string, string>();
    itemsFiltrados.forEach((item) => {
      const material = materials.find(
        (m) => m.codigo.toString() === item.materialCodigo,
      );
      if (material?.foto) {
        fotosMap.set(item.materialCodigo, material.foto);
      }
    });

    itemsFiltrados.forEach((item) => {
      const seccion = seccionLabelMap.get(item.seccion) ?? item.seccion;

      // Buscar el nombre del material
      const material = materials.find(
        (m) => m.codigo.toString() === item.materialCodigo,
      );
      const nombreMaterial = material?.nombre || item.descripcion;

      rows.push({
        material_codigo: item.materialCodigo,
        seccion,
        tipo: "Material",
        descripcion: nombreMaterial,
        cantidad: item.cantidad,
      });
    });

    // Servicio de transportación si aplica
    if (costoTransportacion > 0) {
      rows.push({
        material_codigo: "",
        seccion: "Logística",
        tipo: "Transportación",
        descripcion: "Costo de transportación",
        cantidad: 1,
      });
    }

    // Descuento si aplica
    if (descuentoPorcentaje > 0) {
      rows.push({
        material_codigo: "",
        seccion: "Descuento",
        tipo: "Descuento",
        descripcion: `Descuento aplicado (${descuentoPorcentaje}%)`,
        cantidad: 1,
      });
    }

    // Total final
    rows.push({
      material_codigo: "",
      seccion: "Totales",
      tipo: "TOTAL",
      descripcion: "Precio Total",
      cantidad: "",
      total: formatNumberForExport(precioFinal),
    });

    // SECCIÓN DE PAGO
    // Agregar línea vacía para separar
    rows.push({
      material_codigo: "",
      seccion: "",
      tipo: "",
      descripcion: "",
      cantidad: "",
    });

    // Pago por transferencia
    if (pagoTransferencia) {
      rows.push({
        material_codigo: "",
        seccion: "PAGO",
        tipo: "Info",
        descripcion: "✓ Pago por transferencia",
        cantidad: "",
      });

      if (datosCuenta) {
        rows.push({
          material_codigo: "",
          seccion: "PAGO",
          tipo: "Datos",
          descripcion: "Datos de la cuenta",
          cantidad: "",
          total: datosCuenta,
        });
      }
    }

    // Contribución
    if (aplicaContribucion && porcentajeContribucion > 0) {
      rows.push({
        material_codigo: "",
        seccion: "PAGO",
        tipo: "Info",
        descripcion: `✓ Aplicar ${porcentajeContribucion}% de Contribución`,
        cantidad: "",
      });
    }

    // Precio Final (repetido en sección PAGO si hay datos de pago)
    if (
      pagoTransferencia ||
      aplicaContribucion ||
      (monedaPago !== "USD" && tasaCambioNumero > 0)
    ) {
      rows.push({
        material_codigo: "",
        seccion: "PAGO",
        tipo: "TOTAL",
        descripcion: "Precio Final",
        cantidad: "",
        total: formatNumberForExport(precioFinal),
      });

      // Nota de redondeo si aplica
      if (precioFinal !== totalSinRedondeo) {
        rows.push({
          material_codigo: "",
          seccion: "PAGO",
          tipo: "Nota",
          descripcion: `(Redondeado desde ${formatNumberForExport(totalSinRedondeo)} $)`,
          cantidad: "",
        });
      }
    }

    // Conversión de moneda
    if (monedaPago !== "USD" && tasaCambioNumero > 0) {
      const simboloMoneda = monedaPago === "EUR" ? "€" : "CUP";
      const nombreMoneda =
        monedaPago === "EUR" ? "Euros (EUR)" : "Pesos Cubanos (CUP)";

      rows.push({
        material_codigo: "",
        seccion: "PAGO",
        tipo: "Info",
        descripcion: "Moneda de pago",
        cantidad: "",
        total: nombreMoneda,
      });

      const tasaTexto =
        monedaPago === "EUR"
          ? `1 EUR = ${tasaCambioNumero} USD`
          : `1 USD = ${tasaCambioNumero} CUP`;

      rows.push({
        material_codigo: "",
        seccion: "PAGO",
        tipo: "Tasa",
        descripcion: tasaTexto,
        cantidad: "",
      });

      rows.push({
        material_codigo: "",
        seccion: "PAGO",
        tipo: "Conversión",
        descripcion: `Precio en ${monedaPago}`,
        cantidad: "",
        total: `${formatNumberForExport(montoConvertido)} ${simboloMoneda}`,
      });
    }

    return {
      title: "Oferta - Cliente sin precios",
      subtitle: nombreCompletoBackend || nombreCompletoParaExportar,
      columns: [
        { header: "Material", key: "descripcion", width: 60 },
        { header: "Cant", key: "cantidad", width: 10 },
      ],
      data: rows,
      logoUrl: "/logo Suncar.png",
      clienteData:
        !ofertaGenerica && selectedCliente
          ? {
              numero: selectedCliente.numero || selectedCliente.id,
              nombre: selectedCliente.nombre,
              carnet_identidad: selectedCliente.carnet_identidad,
              telefono: selectedCliente.telefono,
              provincia_montaje: selectedCliente.provincia_montaje,
              direccion: selectedCliente.direccion,
              atencion_de: selectedCliente.nombre, // A la atención de para clientes
            }
          : undefined,
      leadData:
        !ofertaGenerica && tipoContacto === "lead" && selectedLead
          ? {
              id: selectedLead.id,
              nombre: selectedLead.nombre_completo || selectedLead.nombre,
              telefono: selectedLead.telefono,
              email: selectedLead.email,
              provincia: selectedLead.provincia,
              direccion: selectedLead.direccion,
              atencion_de: selectedLead.nombre_completo || selectedLead.nombre, // A la atención de para leads
            }
          : undefined,
      leadSinAgregarData:
        !ofertaGenerica &&
        tipoContacto === "lead_sin_agregar" &&
        nombreLeadSinAgregar
          ? {
              nombre: nombreLeadSinAgregar,
              atencion_de: nombreLeadSinAgregar, // A la atención de para leads sin agregar
            }
          : undefined,
      ofertaData: {
        numero_oferta: ofertaId,
        nombre_oferta: nombreAutomatico, // Nombre corto para UI
        tipo_oferta: ofertaGenerica ? "Genérica" : "Personalizada",
      },
      incluirFotos: true,
      fotosMap,
      sinPrecios: true, // Indicar que es exportación sin precios
      componentesPrincipales: (() => {
        const componentes: any = {};

        // ✅ Usar el inversor SELECCIONADO para el nombre (no el primero de la lista)
        if (inversorSeleccionado) {
          const inversoresDelTipo = items.filter(
            (item) =>
              item.seccion === "INVERSORES" &&
              item.materialCodigo.toString() ===
                inversorSeleccionado.toString(),
          );
          if (inversoresDelTipo.length > 0) {
            const cantidad = inversoresDelTipo.reduce(
              (sum, inv) => sum + inv.cantidad,
              0,
            );
            const material = materials.find(
              (m) => m.codigo.toString() === inversorSeleccionado.toString(),
            );
            const potenciaMatch =
              material?.nombre?.match(/(\d+(?:\.\d+)?)\s*kw/i) ||
              material?.descripcion?.match(/(\d+(?:\.\d+)?)\s*kw/i);
            const potencia = potenciaMatch ? parseFloat(potenciaMatch[1]) : 0;
            const marcaId = material?.marca_id;
            const marca = marcaId
              ? marcas.find((m) => m.id === marcaId)?.nombre
              : undefined;

            componentes.inversor = {
              codigo: inversorSeleccionado,
              cantidad: cantidad,
              potencia: potencia,
              marca: marca,
            };
          }
        }

        // ✅ Usar la batería SELECCIONADA para el nombre (no la primera de la lista)
        if (bateriaSeleccionada) {
          const bateriasDelTipo = items.filter(
            (item) =>
              item.seccion === "BATERIAS" &&
              item.materialCodigo.toString() === bateriaSeleccionada.toString(),
          );
          if (bateriasDelTipo.length > 0) {
            const cantidad = bateriasDelTipo.reduce(
              (sum, bat) => sum + bat.cantidad,
              0,
            );
            const material = materials.find(
              (m) => m.codigo.toString() === bateriaSeleccionada.toString(),
            );
            const capacidadMatch =
              material?.nombre?.match(/(\d+(?:\.\d+)?)\s*kwh/i) ||
              material?.descripcion?.match(/(\d+(?:\.\d+)?)\s*kwh/i);
            const capacidad = capacidadMatch
              ? parseFloat(capacidadMatch[1])
              : 0;

            componentes.bateria = {
              codigo: bateriaSeleccionada,
              cantidad: cantidad,
              capacidad: capacidad,
            };
          }
        }

        // ✅ Usar el panel SELECCIONADO para el nombre (no el primero de la lista)
        if (panelSeleccionado) {
          const panelesDelTipo = items.filter(
            (item) =>
              item.seccion === "PANELES" &&
              item.materialCodigo.toString() === panelSeleccionado.toString(),
          );
          if (panelesDelTipo.length > 0) {
            const cantidad = panelesDelTipo.reduce(
              (sum, pan) => sum + pan.cantidad,
              0,
            );
            const material = materials.find(
              (m) => m.codigo.toString() === panelSeleccionado.toString(),
            );
            const potenciaMatch =
              material?.nombre?.match(/(\d+(?:\.\d+)?)\s*w(?!h)/i) ||
              material?.descripcion?.match(/(\d+(?:\.\d+)?)\s*w(?!h)/i);
            const potencia = potenciaMatch ? parseFloat(potenciaMatch[1]) : 0;

            componentes.panel = {
              codigo: panelSeleccionado,
              cantidad: cantidad,
              potencia: potencia,
            };
          }
        }

        return componentes;
      })(),
      terminosCondiciones: terminosCondiciones || undefined,
      seccionesPersonalizadas: seccionesPersonalizadas.filter(
        (s: any) =>
          s.tipo === "extra" &&
          (s.tipoExtra === "escritura" || s.tipoExtra === "costo"),
      ),
    };
  }, [
    items,
    seccionLabelMap,
    precioFinal,
    nombreCompletoBackend,
    nombreCompletoParaExportar,
    nombreAutomatico,
    materials,
    marcas,
    ofertaGenerica,
    selectedCliente,
    selectedLead,
    tipoContacto,
    nombreLeadSinAgregar,
    ofertaId,
    pagoTransferencia,
    datosCuenta,
    aplicaContribucion,
    porcentajeContribucion,
    costoTransportacion,
    totalSinRedondeo,
    monedaPago,
    tasaCambioNumero,
    montoConvertido,
    descuentoPorcentaje,
    terminosCondiciones,
    seccionesPersonalizadas,
    inversorSeleccionado,
    bateriaSeleccionada,
    panelSeleccionado,
  ]);

  const exportOptionsClienteConPrecios = useMemo(() => {
    // Nota: El filtrado de items ahora se maneja en ExportSelectionDialog
    const itemsFiltrados = items;

    const rows: any[] = [];

    // Crear mapa de fotos de materiales
    const fotosMap = new Map<string, string>();
    itemsFiltrados.forEach((item) => {
      const material = materials.find(
        (m) => m.codigo.toString() === item.materialCodigo,
      );
      if (material?.foto) {
        fotosMap.set(item.materialCodigo, material.foto);
      }
    });

    // Agregar materiales con TODA la estructura (igual que exportación completa)
    itemsFiltrados.forEach((item) => {
      const seccion = seccionLabelMap.get(item.seccion) ?? item.seccion;
      const margenItem = margenPorMaterialCalculado.get(item.id) || 0;
      const totalConMargen = item.precio * item.cantidad + margenItem;

      // Buscar el nombre del material
      const material = materials.find(
        (m) => m.codigo.toString() === item.materialCodigo,
      );
      const nombreMaterial = material?.nombre || item.descripcion;

      rows.push({
        material_codigo: item.materialCodigo,
        seccion,
        tipo: "Material",
        descripcion: nombreMaterial,
        cantidad: item.cantidad,
        total: formatNumberForExport(totalConMargen),
      });
    });

    // Elementos personalizados si existen
    elementosPersonalizados.forEach((elem) => {
      rows.push({
        material_codigo: elem.materialCodigo,
        seccion: "Personalizados",
        tipo: "Elemento",
        descripcion: elem.descripcion,
        cantidad: elem.cantidad,
        total: formatNumberForExport(elem.precio * elem.cantidad),
      });
    });

    // Costos extras de secciones personalizadas
    seccionesPersonalizadas.forEach((seccion) => {
      if (
        seccion.tipo === "extra" &&
        seccion.tipoExtra === "costo" &&
        seccion.costosExtras
      ) {
        seccion.costosExtras.forEach((costo) => {
          rows.push({
            material_codigo: "",
            seccion: seccion.label,
            tipo: "Costo extra",
            descripcion: costo.descripcion,
            cantidad: costo.cantidad,
            total: formatNumberForExport(costo.cantidad * costo.precioUnitario),
          });
        });
      }
    });

    // Servicio de instalación si aplica
    if (margenParaInstalacion > 0) {
      rows.push({
        material_codigo: "",
        seccion: "Servicios",
        tipo: "Servicio",
        descripcion: "Servicio de instalación y montaje",
        cantidad: 1,
        total: formatNumberForExport(margenParaInstalacion),
      });
    }

    // Descuento si aplica
    if (descuentoPorcentaje > 0) {
      rows.push({
        material_codigo: "",
        seccion: "Descuento",
        tipo: "Descuento",
        descripcion: `Descuento aplicado (${descuentoPorcentaje}%)`,
        cantidad: 1,
        total: `- ${formatNumberForExport(montoDescuento)}`,
      });
    }

    // Servicio de transportación si aplica
    if (costoTransportacion > 0) {
      rows.push({
        material_codigo: "",
        seccion: "Logística",
        tipo: "Transportación",
        descripcion: "Costo de transportación",
        cantidad: 1,
        total: formatNumberForExport(costoTransportacion),
      });
    }

    // Total final
    rows.push({
      descripcion: "PRECIO TOTAL",
      cantidad: "",
      total: formatNumberForExport(precioFinal),
      tipo: "TOTAL",
    });

    // SECCIÓN DE PAGO - Agregar como filas especiales con seccion: "PAGO"
    const tieneDatosPago =
      pagoTransferencia ||
      aplicaContribucion ||
      (monedaPago !== "USD" && tasaCambioNumero > 0);

    if (tieneDatosPago) {
      // Pago por transferencia
      if (pagoTransferencia) {
        rows.push({
          descripcion: "✓ Pago por transferencia",
          cantidad: "",
          // NO incluir total para que no muestre nada
          seccion: "PAGO",
          tipo: "Info",
        });

        if (datosCuenta) {
          rows.push({
            descripcion: "Datos de la cuenta",
            cantidad: "",
            total: datosCuenta,
            seccion: "PAGO",
            tipo: "Datos",
          });
        }
      }

      // Contribución
      if (aplicaContribucion && porcentajeContribucion > 0) {
        const montoContribucion =
          (subtotalConMargen +
            costoTransportacion +
            totalElementosPersonalizados +
            totalCostosExtras) *
          (porcentajeContribucion / 100);

        rows.push({
          descripcion: `✓ Aplicar ${porcentajeContribucion}% de Contribución`,
          cantidad: "",
          // NO incluir total
          seccion: "PAGO",
          tipo: "Info",
        });

        rows.push({
          descripcion: "Contribución",
          cantidad: "",
          total: formatNumberForExport(montoContribucion),
          seccion: "PAGO",
          tipo: "Monto",
        });
      }

      // Precio Final
      rows.push({
        descripcion: "Precio Final",
        cantidad: "",
        total: formatNumberForExport(precioFinal),
        seccion: "PAGO",
        tipo: "TOTAL",
      });

      // Nota de redondeo si aplica
      if (precioFinal !== totalSinRedondeo) {
        rows.push({
          descripcion: `(Redondeado desde ${formatNumberForExport(totalSinRedondeo)} $)`,
          cantidad: "",
          // NO incluir total
          seccion: "PAGO",
          tipo: "Nota",
        });
      }

      // Conversión de moneda
      if (monedaPago !== "USD" && tasaCambioNumero > 0) {
        const simboloMoneda = monedaPago === "EUR" ? "€" : "CUP";
        const nombreMoneda =
          monedaPago === "EUR" ? "Euros (EUR)" : "Pesos Cubanos (CUP)";

        rows.push({
          descripcion: `Moneda de pago: ${nombreMoneda}`,
          cantidad: "",
          // NO incluir total
          seccion: "PAGO",
          tipo: "Info",
        });

        const tasaTexto =
          monedaPago === "EUR"
            ? `Tasa de cambio: 1 EUR = ${tasaCambioNumero} USD`
            : `Tasa de cambio: 1 USD = ${tasaCambioNumero} CUP`;

        rows.push({
          descripcion: tasaTexto,
          cantidad: "",
          // NO incluir total
          seccion: "PAGO",
          tipo: "Tasa",
        });

        rows.push({
          descripcion: `Precio en ${monedaPago}`,
          cantidad: "",
          total: `${formatNumberForExport(montoConvertido)} ${simboloMoneda}`,
          seccion: "PAGO",
          tipo: "Conversión",
        });
      }
    }

    return {
      title: "Oferta - Cliente con precios",
      subtitle: nombreCompletoBackend || nombreCompletoParaExportar,
      columns: [
        { header: "Material", key: "descripcion", width: 50 },
        { header: "Cant", key: "cantidad", width: 10 },
        { header: "Total ($)", key: "total", width: 15 },
      ],
      data: rows,
      logoUrl: "/logo Suncar.png",
      clienteData:
        !ofertaGenerica && selectedCliente
          ? {
              numero: selectedCliente.numero || selectedCliente.id,
              nombre: selectedCliente.nombre,
              carnet_identidad: selectedCliente.carnet_identidad,
              telefono: selectedCliente.telefono,
              provincia_montaje: selectedCliente.provincia_montaje,
              direccion: selectedCliente.direccion,
              atencion_de: selectedCliente.nombre, // A la atención de para clientes
            }
          : undefined,
      leadData:
        !ofertaGenerica && tipoContacto === "lead" && selectedLead
          ? {
              id: selectedLead.id,
              nombre: selectedLead.nombre_completo || selectedLead.nombre,
              telefono: selectedLead.telefono,
              email: selectedLead.email,
              provincia: selectedLead.provincia,
              direccion: selectedLead.direccion,
              atencion_de: selectedLead.nombre_completo || selectedLead.nombre, // A la atención de para leads
            }
          : undefined,
      leadSinAgregarData:
        !ofertaGenerica &&
        tipoContacto === "lead_sin_agregar" &&
        nombreLeadSinAgregar
          ? {
              nombre: nombreLeadSinAgregar,
              atencion_de: nombreLeadSinAgregar, // A la atención de para leads sin agregar
            }
          : undefined,
      ofertaData: {
        numero_oferta: ofertaId,
        nombre_oferta: nombreAutomatico, // Nombre corto para UI
        tipo_oferta: ofertaGenerica ? "Genérica" : "Personalizada",
      },
      incluirFotos: true,
      fotosMap,
      conPreciosCliente: true, // Indicar que es exportación con precios para cliente
      componentesPrincipales: (() => {
        const componentes: any = {};

        // ✅ Usar el inversor SELECCIONADO para el nombre (no el primero de la lista)
        if (inversorSeleccionado) {
          const inversoresDelTipo = items.filter(
            (item) =>
              item.seccion === "INVERSORES" &&
              item.materialCodigo.toString() ===
                inversorSeleccionado.toString(),
          );
          if (inversoresDelTipo.length > 0) {
            const cantidad = inversoresDelTipo.reduce(
              (sum, inv) => sum + inv.cantidad,
              0,
            );
            const material = materials.find(
              (m) => m.codigo.toString() === inversorSeleccionado.toString(),
            );
            const potenciaMatch =
              material?.nombre?.match(/(\d+(?:\.\d+)?)\s*kw/i) ||
              material?.descripcion?.match(/(\d+(?:\.\d+)?)\s*kw/i);
            const potencia = potenciaMatch ? parseFloat(potenciaMatch[1]) : 0;
            const marcaId = material?.marca_id;
            const marca = marcaId
              ? marcas.find((m) => m.id === marcaId)?.nombre
              : undefined;

            componentes.inversor = {
              codigo: inversorSeleccionado,
              cantidad: cantidad,
              potencia: potencia,
              marca: marca,
            };
          }
        }

        // ✅ Usar la batería SELECCIONADA para el nombre (no la primera de la lista)
        if (bateriaSeleccionada) {
          const bateriasDelTipo = items.filter(
            (item) =>
              item.seccion === "BATERIAS" &&
              item.materialCodigo.toString() === bateriaSeleccionada.toString(),
          );
          if (bateriasDelTipo.length > 0) {
            const cantidad = bateriasDelTipo.reduce(
              (sum, bat) => sum + bat.cantidad,
              0,
            );
            const material = materials.find(
              (m) => m.codigo.toString() === bateriaSeleccionada.toString(),
            );
            const capacidadMatch =
              material?.nombre?.match(/(\d+(?:\.\d+)?)\s*kwh/i) ||
              material?.descripcion?.match(/(\d+(?:\.\d+)?)\s*kwh/i);
            const capacidad = capacidadMatch
              ? parseFloat(capacidadMatch[1])
              : 0;

            componentes.bateria = {
              codigo: bateriaSeleccionada,
              cantidad: cantidad,
              capacidad: capacidad,
            };
          }
        }

        // ✅ Usar el panel SELECCIONADO para el nombre (no el primero de la lista)
        if (panelSeleccionado) {
          const panelesDelTipo = items.filter(
            (item) =>
              item.seccion === "PANELES" &&
              item.materialCodigo.toString() === panelSeleccionado.toString(),
          );
          if (panelesDelTipo.length > 0) {
            const cantidad = panelesDelTipo.reduce(
              (sum, pan) => sum + pan.cantidad,
              0,
            );
            const material = materials.find(
              (m) => m.codigo.toString() === panelSeleccionado.toString(),
            );
            const potenciaMatch =
              material?.nombre?.match(/(\d+(?:\.\d+)?)\s*w(?!h)/i) ||
              material?.descripcion?.match(/(\d+(?:\.\d+)?)\s*w(?!h)/i);
            const potencia = potenciaMatch ? parseFloat(potenciaMatch[1]) : 0;

            componentes.panel = {
              codigo: panelSeleccionado,
              cantidad: cantidad,
              potencia: potencia,
            };
          }
        }

        return componentes;
      })(),
      terminosCondiciones: terminosCondiciones || undefined,
      seccionesPersonalizadas: seccionesPersonalizadas.filter(
        (s: any) =>
          s.tipo === "extra" &&
          (s.tipoExtra === "escritura" || s.tipoExtra === "costo"),
      ),
    };
  }, [
    items,
    elementosPersonalizados,
    seccionesPersonalizadas,
    margenPorMaterialCalculado,
    margenParaInstalacion,
    costoTransportacion,
    precioFinal,
    totalSinRedondeo,
    nombreCompletoBackend,
    nombreCompletoParaExportar,
    nombreAutomatico,
    materials,
    marcas,
    ofertaGenerica,
    selectedCliente,
    selectedLead,
    tipoContacto,
    nombreLeadSinAgregar,
    ofertaId,
    pagoTransferencia,
    datosCuenta,
    aplicaContribucion,
    porcentajeContribucion,
    subtotalConMargen,
    totalElementosPersonalizados,
    totalCostosExtras,
    monedaPago,
    tasaCambioNumero,
    montoConvertido,
    descuentoPorcentaje,
    montoDescuento,
    seccionLabelMap,
    terminosCondiciones,
    inversorSeleccionado,
    bateriaSeleccionada,
    panelSeleccionado,
  ]);

  const agregarMaterial = (material: Material) => {
    if (ofertaCreada && !modoEdicion) {
      toast({
        title: "Oferta ya creada",
        description:
          "No puedes modificar una oferta ya creada. Crea una nueva oferta.",
        variant: "destructive",
      });
      return;
    }

    const codigo = material.codigo?.toString();
    if (!codigo) return;
    if (!activeStep) return;

    // Nota: Ya no validamos stock disponible en el frontend
    // El backend maneja la lógica de reserva de materiales

    const itemId = `${activeStep.id}-${codigo}`;

    // Calcular precio con descuento del 15% para inversores y baterías
    // Redondear a 2 decimales
    const precioBase =
      activeStep.id === "INVERSORES" || activeStep.id === "BATERIAS"
        ? Number(((material.precio || 0) * 0.85).toFixed(2))
        : material.precio || 0;

    setItems((prev) => {
      const existing = prev.find((item) => item.id === itemId);
      if (existing) {
        return prev.map((item) =>
          item.id === itemId ? { ...item, cantidad: item.cantidad + 1 } : item,
        );
      }
      return [
        ...prev,
        {
          id: itemId,
          materialCodigo: codigo,
          descripcion: material.descripcion,
          precio: precioBase,
          precioOriginal: precioBase,
          precioEditado: false,
          cantidad: 1,
          categoria: material.categoria || "Sin categoria",
          seccion: activeStep.id,
        },
      ];
    });
  };

  const agregarMaterialPersonalizado = (material: Material) => {
    if (ofertaCreada && !modoEdicion) {
      toast({
        title: "Oferta ya creada",
        description:
          "No puedes modificar una oferta ya creada. Crea una nueva oferta.",
        variant: "destructive",
      });
      return;
    }

    const codigo = material.codigo?.toString();
    if (!codigo) return;

    const itemId = `custom-${codigo}-${Date.now()}`;

    setElementosPersonalizados((prev) => {
      const existing = prev.find((elem) => elem.materialCodigo === codigo);
      if (existing) {
        return prev.map((elem) =>
          elem.materialCodigo === codigo
            ? { ...elem, cantidad: elem.cantidad + 1 }
            : elem,
        );
      }
      return [
        ...prev,
        {
          id: itemId,
          materialCodigo: codigo,
          descripcion: material.descripcion,
          precio: material.precio || 0,
          cantidad: 1,
          categoria: material.categoria || "Sin categoria",
        },
      ];
    });
  };

  const actualizarCantidad = (id: string, cantidad: number) => {
    // Nota: Ya no validamos stock disponible en el frontend
    // El backend maneja la lógica de reserva de materiales

    setItems((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, cantidad } : item))
        .filter((item) => item.cantidad > 0),
    );
  };

  const actualizarPrecio = (id: string, nuevoPrecio: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              precio: nuevoPrecio,
              precioEditado: nuevoPrecio !== item.precioOriginal,
            }
          : item,
      ),
    );
  };

  const restaurarPrecioOriginal = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              precio: item.precioOriginal,
              precioEditado: false,
            }
          : item,
      ),
    );
  };

  const agregarElementoPersonalizado = () => {
    setMostrarElementosPersonalizados(true);
  };

  const actualizarCantidadElementoPersonalizado = (
    id: string,
    cantidad: number,
  ) => {
    if (cantidad <= 0) {
      eliminarElementoPersonalizado(id);
    } else {
      setElementosPersonalizados((prev) =>
        prev.map((elem) => (elem.id === id ? { ...elem, cantidad } : elem)),
      );
    }
  };

  const actualizarElementoPersonalizado = (
    id: string,
    field: keyof ElementoPersonalizado,
    value: string | number,
  ) => {
    setElementosPersonalizados((prev) =>
      prev.map((elem) => (elem.id === id ? { ...elem, [field]: value } : elem)),
    );
  };

  const eliminarElementoPersonalizado = (id: string) => {
    setElementosPersonalizados((prev) => prev.filter((elem) => elem.id !== id));
  };

  const abrirDialogoSeccion = () => {
    setMostrarDialogoSeccion(true);
    setTipoSeccionNueva(null);
    setTipoExtraSeccion(null);
    setNombreSeccionNueva("");
    setCategoriasSeleccionadas([]);
    setContenidoEscritura("");
  };

  const cerrarDialogoSeccion = () => {
    setMostrarDialogoSeccion(false);
    setTipoSeccionNueva(null);
    setTipoExtraSeccion(null);
    setNombreSeccionNueva("");
    setCategoriasSeleccionadas([]);
    setContenidoEscritura("");
  };

  const agregarSeccionPersonalizada = () => {
    if (!nombreSeccionNueva.trim()) {
      toast({
        title: "Nombre requerido",
        description: "Debes ingresar un nombre para la sección",
        variant: "destructive",
      });
      return;
    }

    if (!tipoSeccionNueva) {
      toast({
        title: "Tipo requerido",
        description: "Debes seleccionar un tipo de sección",
        variant: "destructive",
      });
      return;
    }

    if (
      tipoSeccionNueva === "materiales" &&
      categoriasSeleccionadas.length === 0
    ) {
      toast({
        title: "Categorías requeridas",
        description: "Debes seleccionar al menos una categoría de materiales",
        variant: "destructive",
      });
      return;
    }

    if (tipoSeccionNueva === "extra" && !tipoExtraSeccion) {
      toast({
        title: "Tipo extra requerido",
        description: "Debes seleccionar si es escritura o costo",
        variant: "destructive",
      });
      return;
    }

    const nuevaSeccion: SeccionPersonalizada = {
      id: `CUSTOM_${Date.now()}`,
      label: nombreSeccionNueva,
      tipo: tipoSeccionNueva,
      tipoExtra: tipoSeccionNueva === "extra" ? tipoExtraSeccion! : undefined,
      categoriasMateriales:
        tipoSeccionNueva === "materiales" ? categoriasSeleccionadas : undefined,
      contenidoEscritura:
        tipoSeccionNueva === "extra" && tipoExtraSeccion === "escritura"
          ? contenidoEscritura
          : undefined,
      costosExtras:
        tipoSeccionNueva === "extra" && tipoExtraSeccion === "costo"
          ? []
          : undefined,
    };

    setSeccionesPersonalizadas((prev) => [...prev, nuevaSeccion]);
    cerrarDialogoSeccion();

    toast({
      title: "Sección agregada",
      description: `La sección "${nombreSeccionNueva}" ha sido agregada exitosamente`,
    });
  };

  const eliminarSeccionPersonalizada = (seccionId: string) => {
    if (seccionId === SECCION_AMPLIACION_ID) {
      toast({
        title: "Sección protegida",
        description: "La sección de Ampliación de Sistema no se puede eliminar",
        variant: "destructive",
      });
      return;
    }
    setSeccionesPersonalizadas((prev) =>
      prev.filter((s) => s.id !== seccionId),
    );
    // Eliminar items de esta sección
    setItems((prev) => prev.filter((item) => item.seccion !== seccionId));

    toast({
      title: "Sección eliminada",
      description: "La sección personalizada ha sido eliminada",
    });
  };

  const actualizarContenidoEscritura = (
    seccionId: string,
    contenido: string,
  ) => {
    setSeccionesPersonalizadas((prev) =>
      prev.map((s) =>
        s.id === seccionId ? { ...s, contenidoEscritura: contenido } : s,
      ),
    );
  };

  const agregarCostoExtra = (seccionId: string) => {
    setSeccionesPersonalizadas((prev) =>
      prev.map((s) => {
        if (s.id === seccionId && s.costosExtras) {
          return {
            ...s,
            costosExtras: [
              ...s.costosExtras,
              {
                id: `COSTO_${Date.now()}`,
                descripcion: "",
                cantidad: 1,
                precioUnitario: 0,
              },
            ],
          };
        }
        return s;
      }),
    );
  };

  const actualizarCostoExtra = (
    seccionId: string,
    costoId: string,
    field: keyof CostoExtra,
    value: string | number,
  ) => {
    setSeccionesPersonalizadas((prev) =>
      prev.map((s) => {
        if (s.id === seccionId && s.costosExtras) {
          return {
            ...s,
            costosExtras: s.costosExtras.map((c) =>
              c.id === costoId ? { ...c, [field]: value } : c,
            ),
          };
        }
        return s;
      }),
    );
  };

  const eliminarCostoExtra = (seccionId: string, costoId: string) => {
    setSeccionesPersonalizadas((prev) =>
      prev.map((s) => {
        if (s.id === seccionId && s.costosExtras) {
          return {
            ...s,
            costosExtras: s.costosExtras.filter((c) => c.id !== costoId),
          };
        }
        return s;
      }),
    );
  };

  // Obtener categorías únicas de materiales
  const categoriasDisponibles = useMemo(() => {
    const categorias = new Set<string>();
    materials.forEach((m) => {
      if (m.categoria) {
        categorias.add(m.categoria);
      }
    });
    return Array.from(categorias).sort();
  }, [materials]);

  // Seleccionar automáticamente el primer material cuando solo hay uno de cada tipo
  useEffect(() => {
    const inversores = items.filter((item) => item.seccion === "INVERSORES");
    const inversoresUnicos = Array.from(
      new Set(inversores.map((i) => i.materialCodigo)),
    );
    if (inversoresUnicos.length === 1 && !inversorSeleccionado) {
      setInversorSeleccionado(inversoresUnicos[0]);
    } else if (inversoresUnicos.length === 0) {
      setInversorSeleccionado("");
    } else if (!inversoresUnicos.includes(inversorSeleccionado)) {
      setInversorSeleccionado(inversoresUnicos[0] || "");
    }
  }, [items, inversorSeleccionado]);

  useEffect(() => {
    const baterias = items.filter((item) => item.seccion === "BATERIAS");
    const bateriasUnicas = Array.from(
      new Set(baterias.map((b) => b.materialCodigo)),
    );
    if (bateriasUnicas.length === 1 && !bateriaSeleccionada) {
      setBateriaSeleccionada(bateriasUnicas[0]);
    } else if (bateriasUnicas.length === 0) {
      setBateriaSeleccionada("");
    } else if (!bateriasUnicas.includes(bateriaSeleccionada)) {
      setBateriaSeleccionada(bateriasUnicas[0] || "");
    }
  }, [items, bateriaSeleccionada]);

  useEffect(() => {
    const paneles = items.filter((item) => item.seccion === "PANELES");
    const panelesUnicos = Array.from(
      new Set(paneles.map((p) => p.materialCodigo)),
    );
    if (panelesUnicos.length === 1 && !panelSeleccionado) {
      setPanelSeleccionado(panelesUnicos[0]);
    } else if (panelesUnicos.length === 0) {
      setPanelSeleccionado("");
    } else if (!panelesUnicos.includes(panelSeleccionado)) {
      setPanelSeleccionado(panelesUnicos[0] || "");
    }
  }, [items, panelSeleccionado]);

  useEffect(() => {
    const loadClientes = async () => {
      setClientesLoading(true);
      try {
        const data = await ClienteService.getClientes();
        // El servicio devuelve { clients: Cliente[], total, skip, limit }
        setClientes(data.clients || []);
      } catch (error) {
        setClientes([]);
      } finally {
        setClientesLoading(false);
      }
    };

    const loadLeads = async () => {
      setLeadsLoading(true);
      try {
        const data = await LeadService.getLeads();
        setLeads(Array.isArray(data) ? data : []);
      } catch (error) {
        setLeads([]);
      } finally {
        setLeadsLoading(false);
      }
    };

    loadClientes();
    loadLeads();
  }, []);

  // Determinar si hay múltiples tipos de materiales en cada categoría
  const tieneMultiplesInversores = useMemo(() => {
    const inversores = items.filter((item) => item.seccion === "INVERSORES");
    const inversoresUnicos = Array.from(
      new Set(inversores.map((i) => i.materialCodigo)),
    );
    return inversoresUnicos.length > 1;
  }, [items]);

  const tieneMultiplesBaterias = useMemo(() => {
    const baterias = items.filter((item) => item.seccion === "BATERIAS");
    const bateriasUnicas = Array.from(
      new Set(baterias.map((b) => b.materialCodigo)),
    );
    return bateriasUnicas.length > 1;
  }, [items]);

  const tieneMultiplesPaneles = useMemo(() => {
    const paneles = items.filter((item) => item.seccion === "PANELES");
    const panelesUnicos = Array.from(
      new Set(paneles.map((p) => p.materialCodigo)),
    );
    return panelesUnicos.length > 1;
  }, [items]);

  const mostrarSelectoresMateriales = useMemo(() => {
    return (
      tieneMultiplesInversores ||
      tieneMultiplesBaterias ||
      tieneMultiplesPaneles
    );
  }, [tieneMultiplesInversores, tieneMultiplesBaterias, tieneMultiplesPaneles]);

  // Estados disponibles según el tipo de oferta
  const estadosDisponibles = useMemo(() => {
    if (ofertaGenerica) {
      return [
        { value: "en_revision", label: "En Revisión" },
        { value: "aprobada_para_enviar", label: "Aprobada para Enviar" },
      ];
    } else {
      return [
        { value: "en_revision", label: "En Revisión" },
        { value: "aprobada_para_enviar", label: "Aprobada para Enviar" },
        { value: "enviada_a_cliente", label: "Enviada a Cliente" },
        { value: "confirmada_por_cliente", label: "Confirmada por Cliente" },
        { value: "reservada", label: "Reservada" },
      ];
    }
  }, [ofertaGenerica]);

  // Resetear estado si cambia el tipo de oferta y el estado actual no es válido
  useEffect(() => {
    const estadosValidos = estadosDisponibles.map((e) => e.value);
    if (!estadosValidos.includes(estadoOferta)) {
      setEstadoOferta("en_revision");
    }
  }, [ofertaGenerica, estadosDisponibles, estadoOferta]);

  const handleReservarMateriales = async () => {
    if (!ofertaCreada) {
      toast({
        title: "Oferta no creada",
        description: "Debes crear la oferta antes de reservar materiales",
        variant: "destructive",
      });
      return;
    }

    if (!almacenId) {
      toast({
        title: "Almacén requerido",
        description:
          "Debes seleccionar un almacén antes de reservar materiales",
        variant: "destructive",
      });
      return;
    }

    if (items.length === 0) {
      toast({
        title: "Sin materiales",
        description: "Agrega materiales a la oferta antes de reservar",
        variant: "destructive",
      });
      return;
    }

    // Abrir diálogo para seleccionar tipo de reserva
    setMostrarDialogoReserva(true);
  };

  const confirmarReserva = async () => {
    if (!tipoReserva) {
      toast({
        title: "Tipo de reserva requerido",
        description: "Debes seleccionar si la reserva es temporal o definitiva",
        variant: "destructive",
      });
      return;
    }

    if (tipoReserva === "temporal" && diasReserva <= 0) {
      toast({
        title: "Días inválidos",
        description:
          "Debes especificar al menos 1 día para la reserva temporal",
        variant: "destructive",
      });
      return;
    }

    setReservandoMateriales(true);
    setMostrarDialogoReserva(false);

    try {
      // Calcular fecha de expiración si es temporal
      let fechaExpiracion: Date | null = null;
      if (tipoReserva === "temporal") {
        fechaExpiracion = new Date();
        fechaExpiracion.setDate(fechaExpiracion.getDate() + diasReserva);
      }

      // TODO: Implementar llamada al backend cuando esté disponible
      // const response = await fetch('/api/ofertas/confeccion/', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     tipo_oferta: ofertaGenerica ? 'generica' : 'personalizada',
      //     cliente_id: ofertaGenerica ? null : clienteId,
      //     almacen_id: almacenId,
      //     items: items,
      //     elementos_personalizados: elementosPersonalizados,
      //     margen_comercial: margenComercial,
      //     costo_transportacion: costoTransportacion,
      //     total_materiales: totalMateriales,
      //     subtotal_con_margen: subtotalConMargen,
      //     total_elementos_personalizados: totalElementosPersonalizados,
      //     precio_final: precioFinal,
      //     tipo_reserva: tipoReserva,
      //     dias_reserva: tipoReserva === 'temporal' ? diasReserva : null,
      //     fecha_expiracion_reserva: fechaExpiracion?.toISOString()
      //   })
      // })
      // const oferta = await response.json()

      // Luego reservar los materiales
      // await fetch(`/api/ofertas/confeccion/${oferta.id}/reservar-materiales`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     notas: 'Reserva desde confección de ofertas',
      //     tipo_reserva: tipoReserva,
      //     fecha_expiracion: fechaExpiracion?.toISOString()
      //   })
      // })

      // Simulación temporal hasta que el backend esté listo
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setMaterialesReservados(true);
      setFechaExpiracionReserva(fechaExpiracion);

      toast({
        title: "Materiales reservados",
        description:
          tipoReserva === "temporal"
            ? `Se han reservado ${items.length} materiales por ${diasReserva} días`
            : `Se han reservado ${items.length} materiales de forma definitiva`,
      });

      // Refrescar el stock
      await refetchStock(almacenId);
    } catch (error: any) {
      console.error("Error al reservar materiales:", error);
      toast({
        title: "Error al reservar",
        description: error.message || "No se pudieron reservar los materiales",
        variant: "destructive",
      });
    } finally {
      setReservandoMateriales(false);
    }
  };

  const cancelarReserva = async () => {
    if (!materialesReservados) return;

    try {
      // TODO: Implementar llamada al backend
      // await fetch(`/api/ofertas/confeccion/${ofertaId}/liberar-materiales`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' }
      // })

      // Simulación temporal
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setMaterialesReservados(false);
      setFechaExpiracionReserva(null);
      setTipoReserva(null);

      toast({
        title: "Reserva cancelada",
        description:
          "Los materiales han sido liberados y están disponibles nuevamente",
      });

      // Refrescar el stock
      if (almacenId) {
        await refetchStock(almacenId);
      }
    } catch (error: any) {
      console.error("Error al cancelar reserva:", error);
      toast({
        title: "Error al cancelar",
        description: error.message || "No se pudo cancelar la reserva",
        variant: "destructive",
      });
    }
  };

  const cerrarDialogoReserva = () => {
    setMostrarDialogoReserva(false);
    setTipoReserva(null);
    setDiasReserva(7);
  };

  const handleSubirFotoPortada = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Archivo inválido",
        description: "Solo se permiten archivos de imagen",
        variant: "destructive",
      });
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Archivo muy grande",
        description: "La imagen no debe superar los 5MB",
        variant: "destructive",
      });
      return;
    }

    setSubiendoFoto(true);

    try {
      // Preparar FormData
      const formData = new FormData();
      formData.append("foto", file);
      formData.append("tipo", "oferta_portada");

      console.log("📤 Subiendo foto de portada...");

      // Llamada al backend
      const { apiRequest } = await import("@/lib/api-config");

      const response = await apiRequest<{
        success: boolean;
        url: string;
        filename: string;
        size: number;
        content_type: string;
      }>("/ofertas/confeccion/upload-foto-portada", {
        method: "POST",
        body: formData,
      });

      console.log("✅ Foto subida:", response);

      if (response.success && response.url) {
        setFotoPortada(response.url);
        toast({
          title: "Foto subida",
          description: "La foto de portada se ha cargado exitosamente",
        });
      } else {
        throw new Error("No se recibió la URL de la foto");
      }
    } catch (error: any) {
      console.error("❌ Error al subir foto:", error);

      let errorMessage = "No se pudo subir la imagen";

      if (error.message) {
        if (
          error.message.includes("Archivo inválido") ||
          error.message.includes("muy grande")
        ) {
          errorMessage = error.message;
        } else if (error.message.includes("Tipo de archivo no soportado")) {
          errorMessage = "Formato de imagen no soportado. Usa JPG, PNG o WebP";
        } else if (error.message.includes("Not authenticated")) {
          errorMessage = "Sesión expirada. Por favor, inicia sesión nuevamente";
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        title: "Error al subir foto",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSubiendoFoto(false);
    }
  };

  const eliminarFotoPortada = () => {
    setFotoPortada("");
    toast({
      title: "Foto eliminada",
      description: "La foto de portada ha sido eliminada",
    });
  };

  const ajustarCantidadPagosAcordados = (cantidad: number) => {
    const cantidadNormalizada = Math.max(0, Math.floor(cantidad));
    setCantidadPagosAcordados(cantidadNormalizada);
    setPagosAcordados((prev) => {
      if (cantidadNormalizada === 0) return [];
      if (prev.length === cantidadNormalizada) return prev;
      if (prev.length > cantidadNormalizada) {
        return prev.slice(0, cantidadNormalizada);
      }

      const faltantes = Array.from(
        { length: cantidadNormalizada - prev.length },
        () => ({
          id: generarPagoAcordadoId(),
          monto_usd: 0,
          metodo_pago: "efectivo" as MetodoPagoAcordado,
          fecha_estimada: "",
        }),
      );
      return [...prev, ...faltantes];
    });
  };

  const actualizarPagoAcordado = (
    pagoId: string,
    field: keyof Omit<PagoAcordadoForm, "id">,
    value: number | string,
  ) => {
    setPagosAcordados((prev) =>
      prev.map((pago) => {
        if (pago.id !== pagoId) return pago;

        if (field === "monto_usd") {
          const montoNumero = Math.max(0, Number(value) || 0);
          const montoAjustado = Math.min(montoNumero, precioFinal || 0);
          const montoRedondeado = Math.round(montoAjustado * 100) / 100;
          return {
            ...pago,
            monto_usd: montoRedondeado,
          };
        }

        return {
          ...pago,
          [field]: value,
        };
      }),
    );
  };

  const eliminarPagoAcordado = (pagoId: string) => {
    setPagosAcordados((prev) => {
      const filtrados = prev.filter((pago) => pago.id !== pagoId);
      setCantidadPagosAcordados(filtrados.length);
      return filtrados;
    });
  };

  const handleCrearOferta = async () => {
    // Validaciones
    if (!almacenId) {
      toast({
        title: "Almacén requerido",
        description: "Debes seleccionar un almacén antes de crear la oferta",
        variant: "destructive",
      });
      return;
    }

    if (items.length === 0) {
      toast({
        title: "Sin materiales",
        description: "Agrega al menos un material a la oferta",
        variant: "destructive",
      });
      return;
    }

    if (!ofertaGenerica && tipoContacto === "cliente" && !clienteId) {
      toast({
        title: "Cliente requerido",
        description: "Debes seleccionar un cliente para ofertas personalizadas",
        variant: "destructive",
      });
      return;
    }

    if (!ofertaGenerica && tipoContacto === "lead" && !leadId) {
      toast({
        title: "Lead requerido",
        description: "Debes seleccionar un lead para ofertas personalizadas",
        variant: "destructive",
      });
      return;
    }

    if (
      !ofertaGenerica &&
      tipoContacto === "lead_sin_agregar" &&
      !nombreLeadSinAgregar.trim()
    ) {
      toast({
        title: "Nombre requerido",
        description: "Debes ingresar el nombre del lead",
        variant: "destructive",
      });
      return;
    }

    // ✅ VALIDACIÓN CRÍTICA: Si es oferta personalizada, debe tener al menos 1 contacto válido
    if (!ofertaGenerica) {
      let tieneContactoValido = false;

      if (tipoContacto === "cliente") {
        const numeroCliente = selectedCliente?.numero || clienteId;
        tieneContactoValido = !!(
          numeroCliente && numeroCliente.toString().trim()
        );
      } else if (tipoContacto === "lead") {
        tieneContactoValido = !!(leadId && leadId.trim());
      } else if (tipoContacto === "lead_sin_agregar") {
        tieneContactoValido = !!(
          nombreLeadSinAgregar && nombreLeadSinAgregar.trim()
        );
      }

      if (!tieneContactoValido) {
        toast({
          title: "Contacto requerido",
          description:
            "Una oferta personalizada debe tener un contacto válido (Cliente, Lead o Lead sin agregar)",
          variant: "destructive",
        });
        return;
      }
    }

    const cantidadPagosAcordadosNormalizada = Math.max(
      0,
      Math.floor(Number(cantidadPagosAcordados) || 0),
    );
    const pagosAcordadosPayload = formasPagoAcordadas
      ? pagosAcordados.map((pago) => {
          const fechaEstimadaDate = new Date(pago.fecha_estimada);
          const fechaEstimadaIso = Number.isNaN(fechaEstimadaDate.getTime())
            ? ""
            : fechaEstimadaDate.toISOString().replace(/\.\d{3}Z$/, "Z");

          return {
            monto_usd: Number(pago.monto_usd) || 0,
            metodo_pago:
              pago.metodo_pago === "transferencia" ||
              pago.metodo_pago === "stripe"
                ? pago.metodo_pago
                : "efectivo",
            fecha_estimada: fechaEstimadaIso,
          };
        })
      : [];

    if (formasPagoAcordadas) {
      const precioFinalEnCentavos = Math.round(
        (Number(precioFinal) || 0) * 100,
      );

      if (cantidadPagosAcordadosNormalizada <= 0) {
        toast({
          title: "Pagos acordados inválidos",
          description:
            "Debes indicar al menos un pago cuando formas de pago acordadas está activo.",
          variant: "destructive",
        });
        return;
      }

      if (cantidadPagosAcordadosNormalizada !== pagosAcordadosPayload.length) {
        toast({
          title: "Cantidad de pagos inconsistente",
          description:
            "La cantidad de pagos acordados debe coincidir con el detalle de pagos.",
          variant: "destructive",
        });
        return;
      }

      const pagoInvalidoIndex = pagosAcordadosPayload.findIndex(
        (pago) => pago.monto_usd < 0 || !pago.fecha_estimada,
      );

      if (pagoInvalidoIndex !== -1) {
        toast({
          title: "Pago acordado incompleto",
          description: `Revisa el pago #${pagoInvalidoIndex + 1}: monto >= 0 y fecha estimada obligatoria.`,
          variant: "destructive",
        });
        return;
      }

      const pagoSuperiorAlTotalIndex = pagosAcordadosPayload.findIndex(
        (pago) =>
          Math.round((pago.monto_usd || 0) * 100) > precioFinalEnCentavos,
      );
      if (pagoSuperiorAlTotalIndex !== -1) {
        toast({
          title: "Monto de pago inválido",
          description: `El pago #${pagoSuperiorAlTotalIndex + 1} no puede ser mayor al precio final (${formatCurrency(precioFinal)}).`,
          variant: "destructive",
        });
        return;
      }

      const sumaPagosAcordados = pagosAcordadosPayload.reduce(
        (acum, pago) => acum + (pago.monto_usd || 0),
        0,
      );
      const sumaPagosAcordadosEnCentavos = Math.round(sumaPagosAcordados * 100);
      if (sumaPagosAcordadosEnCentavos > precioFinalEnCentavos) {
        toast({
          title: "Suma de pagos inválida",
          description: `La suma de pagos acordados (${formatCurrency(sumaPagosAcordados)}) no puede superar el precio final (${formatCurrency(precioFinal)}).`,
          variant: "destructive",
        });
        return;
      }
    }

    setCreandoOferta(true);

    try {
      // En creación y edición construimos el payload completo para mantener
      // compatibilidad con el contrato de PUT/PATCH del backend.
      const ofertaData: any = {
        tipo_oferta: ofertaGenerica ? "generica" : "personalizada",
        almacen_id: almacenId,
      };

      // ✅ CRÍTICO: Solo agregar el campo de contacto que tiene valor NO VACÍO
      // NO enviar cliente_numero, lead_id, nombre_lead_sin_agregar si están vacíos ("", null, espacios)
      // El backend se encargará automáticamente de limpiar el contacto anterior
      if (!ofertaGenerica) {
        if (tipoContacto === "cliente") {
          const numeroCliente = selectedCliente?.numero || clienteId;
          // Solo agregar si tiene valor y no es string vacío
          if (numeroCliente && numeroCliente.toString().trim()) {
            ofertaData.cliente_numero = numeroCliente.toString().trim();
          }
        } else if (tipoContacto === "lead") {
          // Solo agregar si tiene valor y no es string vacío
          if (leadId && leadId.trim()) {
            ofertaData.lead_id = leadId.trim();
          }
        } else if (tipoContacto === "lead_sin_agregar") {
          const nombreLead = nombreLeadSinAgregar.trim();
          // Solo agregar si tiene valor
          if (nombreLead) {
            ofertaData.nombre_lead_sin_agregar = nombreLead;
          }
        }
      }

      // Datos generales de la oferta (creación y edición)
      {
        // Agregar foto de portada si existe
        if (fotoPortada) {
          ofertaData.foto_portada = fotoPortada;
          // Compatibilidad con endpoint antiguo que espera foto_portada_url
          ofertaData.foto_portada_url = fotoPortada;
        }

        // Agregar estado
        ofertaData.estado = estadoOferta;

        // Agregar items
        // Agregar items
        console.log("🔍 DEBUG - Construyendo items para guardar:", {
          total_items: items.length,
          porcentajeAsignadoPorItem_keys: Object.keys(
            porcentajeAsignadoPorItem,
          ),
          porcentajeAsignadoPorItem_values: porcentajeAsignadoPorItem,
          porcentajeMargenPorItem_size: porcentajeMargenPorItem.size,
        });

        ofertaData.items = items.map((item) => {
          const costoItem = item.precio * item.cantidad;

          // Usar el porcentaje editado manualmente si existe, sino usar el calculado automáticamente
          const tieneManual =
            typeof porcentajeAsignadoPorItem[item.id] === "number";
          const porcentajeManual = porcentajeAsignadoPorItem[item.id];
          const porcentajeAuto = porcentajeMargenPorItem.get(item.id) ?? 0;
          const porcentajeItem = tieneManual
            ? porcentajeManual
            : porcentajeAuto;

          const margenAsignado = costoItem * (porcentajeItem / 100);

          console.log(`  📦 Item ${item.id} (${item.materialCodigo}):`, {
            descripcion: item.descripcion.substring(0, 30),
            costo: costoItem,
            tiene_manual: tieneManual,
            porcentaje_manual: porcentajeManual,
            porcentaje_auto: porcentajeAuto,
            porcentaje_usado: porcentajeItem,
            margen_asignado: margenAsignado,
          });

          return {
            material_codigo: item.materialCodigo,
            descripcion: item.descripcion,
            precio: item.precio,
            precio_original: item.precioOriginal,
            precio_editado: item.precioEditado,
            cantidad: item.cantidad,
            categoria: item.categoria,
            seccion: item.seccion,
            margen_asignado: margenAsignado,
          };
        });

        console.log(
          "📋 Items construidos:",
          ofertaData.items.map((i) => ({
            codigo: i.material_codigo,
            margen: i.margen_asignado,
          })),
        );

        // Agregar servicios si existen
        if (servicios.length > 0) {
          ofertaData.servicios = servicios;
        }

        // Agregar secciones personalizadas si existen
        if (seccionesPersonalizadas.length > 0) {
          ofertaData.secciones_personalizadas = seccionesPersonalizadas.map(
            (seccion) => ({
              id: seccion.id,
              label: seccion.label,
              tipo: seccion.tipo,
              tipo_extra: seccion.tipoExtra,
              categorias_materiales: seccion.categoriasMateriales,
              contenido_escritura: seccion.contenidoEscritura,
              costos_extras: seccion.costosExtras?.map((costo) => ({
                id: costo.id,
                descripcion: costo.descripcion,
                cantidad: costo.cantidad,
                precio_unitario: costo.precioUnitario,
              })),
            }),
          );
        }

        // Agregar elementos personalizados si existen
        if (elementosPersonalizados.length > 0) {
          ofertaData.elementos_personalizados = elementosPersonalizados.map(
            (elem) => ({
              material_codigo: elem.materialCodigo,
              descripcion: elem.descripcion,
              precio: elem.precio,
              cantidad: elem.cantidad,
              categoria: elem.categoria,
            }),
          );
        }

        // Agregar componentes principales
        ofertaData.componentes_principales = {
          inversor_seleccionado: inversorSeleccionado || undefined,
          bateria_seleccionada: bateriaSeleccionada || undefined,
          panel_seleccionado: panelSeleccionado || undefined,
        };

        // Agregar nombres de la oferta
        ofertaData.nombre_oferta = nombreAutomatico; // Nombre corto para mostrar en UI
        ofertaData.nombre_completo = nombreCompletoParaExportar; // Nombre completo para exportaciones

        // Agregar datos de margen y precios
        ofertaData.margen_comercial = margenComercial;
        ofertaData.porcentaje_margen_materiales = porcentajeMargenMateriales;
        ofertaData.porcentaje_margen_instalacion = porcentajeMargenInstalacion;
        ofertaData.margen_total = margenComercialTotal;
        ofertaData.margen_materiales = margenParaMateriales;
        ofertaData.margen_instalacion = margenParaInstalacion;
        ofertaData.descuento_porcentaje = descuentoPorcentaje;
        ofertaData.monto_descuento = montoDescuento;
        ofertaData.costo_transportacion = costoTransportacion;
        ofertaData.total_materiales = totalMateriales;
        ofertaData.subtotal_con_margen = subtotalConMargen;
        ofertaData.subtotal_con_descuento = subtotalConDescuento;
        ofertaData.total_elementos_personalizados =
          totalElementosPersonalizados;
        ofertaData.total_costos_extras = totalCostosExtras;
        ofertaData.precio_final = precioFinal;

        console.log("💰 DEBUG - Datos de descuento que se envían:", {
          descuento_porcentaje: descuentoPorcentaje,
          monto_descuento: montoDescuento,
          subtotal_con_descuento: subtotalConDescuento,
        });

        // Agregar compensación si está marcada
        if (tieneCompensacion && montoCompensacion > 0 && justificacionCompensacion.trim()) {
          ofertaData.compensacion = {
            monto_usd: montoCompensacion,
            justificacion: justificacionCompensacion.trim()
          };
        }

        // Agregar asumido por empresa si está marcado
        if (tieneAsumidoPorEmpresa && montoAsumidoPorEmpresa > 0 && justificacionAsumidoPorEmpresa.trim()) {
          ofertaData.asumido_por_empresa = {
            monto_usd: montoAsumidoPorEmpresa,
            justificacion: justificacionAsumidoPorEmpresa.trim()
          };
        }

        // Agregar datos de pago
        ofertaData.moneda_pago = monedaPago;
        ofertaData.tasa_cambio =
          monedaPago !== "USD" ? Number.parseFloat(tasaCambio) || 0 : 0;
        ofertaData.pago_transferencia = pagoTransferencia;
        ofertaData.datos_cuenta = pagoTransferencia ? datosCuenta : "";
        ofertaData.formas_pago_acordadas = formasPagoAcordadas;
        ofertaData.cantidad_pagos_acordados = formasPagoAcordadas
          ? cantidadPagosAcordadosNormalizada
          : 0;
        ofertaData.pagos_acordados = formasPagoAcordadas
          ? pagosAcordadosPayload
          : [];
        ofertaData.aplica_contribucion = aplicaContribucion;
        ofertaData.porcentaje_contribucion = aplicaContribucion
          ? porcentajeContribucion
          : 0;
      }

      console.log(
        modoEdicion
          ? "📤 Actualizando oferta (payload completo):"
          : "📤 Enviando oferta al backend:",
        ofertaData,
      );
      console.log("🔍 Datos de contacto que se envían:", {
        modo: modoEdicion ? "EDICION" : "CREACION",
        tipo_oferta: ofertaData.tipo_oferta,
        cliente_numero: ofertaData.cliente_numero,
        lead_id: ofertaData.lead_id,
        nombre_lead_sin_agregar: ofertaData.nombre_lead_sin_agregar,
        campos_presentes: Object.keys(ofertaData).filter(
          (k) => k.includes("cliente") || k.includes("lead"),
        ),
        total_campos_enviados: Object.keys(ofertaData).length,
      });

      // ✅ VERIFICACIÓN FINAL: Asegurar que NO se envíen campos de contacto vacíos
      const camposContactoVacios = [];
      if (
        "cliente_numero" in ofertaData &&
        (!ofertaData.cliente_numero ||
          !ofertaData.cliente_numero.toString().trim())
      ) {
        camposContactoVacios.push("cliente_numero");
        delete ofertaData.cliente_numero;
      }
      if (
        "lead_id" in ofertaData &&
        (!ofertaData.lead_id || !ofertaData.lead_id.trim())
      ) {
        camposContactoVacios.push("lead_id");
        delete ofertaData.lead_id;
      }
      if (
        "nombre_lead_sin_agregar" in ofertaData &&
        (!ofertaData.nombre_lead_sin_agregar ||
          !ofertaData.nombre_lead_sin_agregar.trim())
      ) {
        camposContactoVacios.push("nombre_lead_sin_agregar");
        delete ofertaData.nombre_lead_sin_agregar;
      }

      if (camposContactoVacios.length > 0) {
        console.warn(
          "⚠️ Se eliminaron campos de contacto vacíos antes de enviar:",
          camposContactoVacios,
        );
      }

      console.log(
        "✅ Payload final (verificado sin campos vacíos):",
        JSON.stringify(ofertaData, null, 2),
      );

      // Llamada al backend usando apiRequest
      const { apiRequest } = await import("@/lib/api-config");

      // En modo edición, usar PATCH primero (más compatible con actualizaciones parciales)
      // y usar PUT como fallback.
      const ofertaIdentificador =
        modoEdicion && ofertaParaEditar
          ? ofertaParaEditar.id || ofertaParaEditar.numero_oferta
          : null;

      const endpoint = ofertaIdentificador
        ? `/ofertas/confeccion/${ofertaIdentificador}`
        : "/ofertas/confeccion/";

      const method = modoEdicion ? "PATCH" : "POST";

      console.log("🔍 Endpoint y método:", {
        modoEdicion,
        ofertaIdentificador,
        endpoint,
        method,
        ofertaParaEditar_id: ofertaParaEditar?.id,
        ofertaParaEditar_numero: ofertaParaEditar?.numero_oferta,
      });

      type OfertaMutationResponse = {
        success?: boolean;
        message?: string;
        detail?:
          | string
          | Array<{
              loc?: Array<string | number>;
              msg?: string;
              type?: string;
            }>
          | Record<string, unknown>;
        error?:
          | string
          | {
              code?: string;
              title?: string;
              message?: string;
            };
        data?: {
          id?: string;
          numero_oferta?: string;
          nombre_automatico?: string;
          [key: string]: any;
        };
        id?: string;
        numero_oferta?: string;
        nombre_automatico?: string;
        nombre_completo?: string;
        [key: string]: any;
      };

      let response: OfertaMutationResponse;
      try {
        response = await apiRequest<OfertaMutationResponse>(endpoint, {
          method,
          body: JSON.stringify(ofertaData),
        });
      } catch (patchError) {
        if (!modoEdicion) throw patchError;
        console.warn(
          "⚠️ PATCH lanzó error. Reintentando actualización con PUT...",
          patchError,
        );
        response = await apiRequest<OfertaMutationResponse>(endpoint, {
          method: "PUT",
          body: JSON.stringify(ofertaData),
        });
      }

      if (modoEdicion && response.success === false) {
        console.warn(
          "⚠️ PATCH no fue aceptado. Reintentando actualización con PUT...",
          response,
        );
        response = await apiRequest<OfertaMutationResponse>(endpoint, {
          method: "PUT",
          body: JSON.stringify(ofertaData),
        });
      }

      console.log("✅ Respuesta del backend:", response);

      const formatBackendDetail = (
        detail: OfertaMutationResponse["detail"],
      ): string | undefined => {
        if (!detail) return undefined;
        if (typeof detail === "string") return detail;
        if (Array.isArray(detail)) {
          const mensajes = detail
            .map((item) => {
              const loc = Array.isArray(item.loc)
                ? item.loc.join(".")
                : undefined;
              const msg = item.msg || "";
              return [loc, msg].filter(Boolean).join(": ");
            })
            .filter(Boolean);
          if (mensajes.length > 0) {
            return mensajes.join(" | ");
          }
          return JSON.stringify(detail);
        }
        return JSON.stringify(detail);
      };

      const responseData = response.data
        ? response.data
        : response.id || response.numero_oferta
          ? response
          : null;

      const requestOk =
        response.success === true ||
        (response.success === undefined && Boolean(responseData));

      if (requestOk && responseData) {
        const ofertaIdCreada =
          responseData.numero_oferta || responseData.id || "";
        if (!modoEdicion && !ofertaIdCreada) {
          throw new Error(
            "El backend no devolvió el identificador de la oferta creada.",
          );
        }
        const identificadorConfirmacion =
          responseData.id || ofertaIdentificador || responseData.numero_oferta;

        if (identificadorConfirmacion) {
          const confirmacionRaw = await apiRequest<any>(
            `/ofertas/confeccion/${identificadorConfirmacion}`,
            { method: "GET" },
          );
          const confirmacion =
            (confirmacionRaw && typeof confirmacionRaw === "object"
              ? confirmacionRaw.data
              : null) || confirmacionRaw;

          const confirmacionTieneOferta = Boolean(
            confirmacion &&
            (confirmacion.id ||
              confirmacion.numero_oferta ||
              confirmacion.data?.id ||
              confirmacion.data?.numero_oferta),
          );

          if (!confirmacionTieneOferta) {
            throw new Error(
              "El backend respondió éxito, pero los cambios no quedaron persistidos en la oferta.",
            );
          }

          if (!ofertaGenerica) {
            if (tipoContacto === "cliente") {
              const clienteEsperado = (
                selectedCliente?.numero ||
                clienteId ||
                ""
              )
                .toString()
                .trim();
              const clientePersistido = (
                confirmacion?.cliente_numero ||
                confirmacion?.cliente?.numero ||
                ""
              )
                .toString()
                .trim();
              if (clienteEsperado && clientePersistido !== clienteEsperado) {
                throw new Error(
                  "La oferta se creó, pero no quedó asociada al cliente esperado.",
                );
              }
            } else if (tipoContacto === "lead") {
              const leadEsperado = (leadId || "").toString().trim();
              const leadPersistido = (
                confirmacion?.lead_id ||
                confirmacion?.lead?.id ||
                ""
              )
                .toString()
                .trim();
              if (leadEsperado && leadPersistido !== leadEsperado) {
                throw new Error(
                  "La oferta se creó, pero no quedó asociada al lead esperado.",
                );
              }
            } else if (tipoContacto === "lead_sin_agregar") {
              const nombreLeadEsperado = (nombreLeadSinAgregar || "").trim();
              const nombreLeadPersistido = (
                confirmacion?.nombre_lead_sin_agregar || ""
              ).trim();
              if (
                nombreLeadEsperado &&
                nombreLeadPersistido !== nombreLeadEsperado
              ) {
                throw new Error(
                  "La oferta se creó, pero no quedó asociada al lead sin agregar esperado.",
                );
              }
            }
          }

          if (modoEdicion) {
            const descuentoPersistido = Number(
              confirmacion?.descuento_porcentaje ?? 0,
            );
            const descuentoEsperado = Number(descuentoPorcentaje || 0);

            const pagosPersistidos = Array.isArray(
              confirmacion?.pagos_acordados,
            )
              ? confirmacion.pagos_acordados
              : [];
            const cantidadPagosEsperada = formasPagoAcordadas
              ? cantidadPagosAcordadosNormalizada
              : 0;

            const descuentoPersistidoOk =
              Math.round(descuentoPersistido * 100) ===
              Math.round(descuentoEsperado * 100);
            const pagosPersistidosOk = formasPagoAcordadas
              ? pagosPersistidos.length === cantidadPagosEsperada
              : pagosPersistidos.length === 0;

            if (!descuentoPersistidoOk || !pagosPersistidosOk) {
              throw new Error(
                "El backend respondió éxito, pero los cambios no quedaron persistidos en la oferta.",
              );
            }
          }
        }

        setOfertaId(ofertaIdCreada);
        setOfertaCreada(true);

        // Guardar el nombre completo del backend para usar en exportaciones
        if (responseData.nombre_completo) {
          setNombreCompletoBackend(responseData.nombre_completo);
        }

        toast({
          title: modoEdicion
            ? "Oferta actualizada exitosamente"
            : "Oferta creada exitosamente",
          description: `${responseData.numero_oferta || "Oferta"}: ${responseData.nombre_automatico || "Guardada correctamente"}`,
        });

        // Llamar callback de éxito si existe (tanto en edición como en creación/duplicación)
        if (onGuardarExito) {
          onGuardarExito();
        }

        // Si no estamos en modo edición y hay callback de cerrar, llamarlo después de crear
        if (!modoEdicion && onCerrar) {
          // Dar un pequeño delay para que el usuario vea el toast
          setTimeout(() => {
            onCerrar();
          }, 1500);
        }
      } else {
        const backendErrorMessage =
          response.message ||
          formatBackendDetail(response.detail) ||
          (typeof response.error === "string"
            ? response.error
            : response.error?.message) ||
          (response.error && typeof response.error === "object"
            ? JSON.stringify(response.error)
            : undefined);

        throw new Error(
          backendErrorMessage ||
            (modoEdicion
              ? "Error al actualizar la oferta"
              : "Error al crear la oferta"),
        );
      }
    } catch (error: any) {
      console.error(
        modoEdicion
          ? "❌ Error al actualizar oferta:"
          : "❌ Error al crear oferta:",
        error,
      );
      console.error("📋 Detalles del error:", {
        message: error.message,
        response: error.response,
        stack: error.stack,
        error_completo: error,
      });

      let errorMessage = modoEdicion
        ? "No se pudo actualizar la oferta"
        : "No se pudo crear la oferta";

      // Parsear mensajes de error comunes del backend
      if (error.message) {
        if (error.message.includes("Stock insuficiente")) {
          errorMessage = error.message;
        } else if (error.message.includes("solo puede tener uno")) {
          errorMessage = "Error de contactos: " + error.message;
        } else if (
          error.message.includes("Cliente") &&
          error.message.includes("no encontrado")
        ) {
          errorMessage = "El cliente seleccionado no existe";
        } else if (
          error.message.includes("Lead") &&
          error.message.includes("no encontrado")
        ) {
          errorMessage = "El lead seleccionado no existe";
        } else if (
          error.message.includes("Almacén") &&
          error.message.includes("no encontrado")
        ) {
          errorMessage = "El almacén seleccionado no existe";
        } else if (error.message.includes("Not authenticated")) {
          errorMessage = "Sesión expirada. Por favor, inicia sesión nuevamente";
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        title: modoEdicion
          ? "Error al actualizar oferta"
          : "Error al crear oferta",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setCreandoOferta(false);
    }
  };

  const resetearOferta = () => {
    setItems([]);
    setElementosPersonalizados([]);
    setSeccionesPersonalizadas([]);
    setMargenComercial(0);
    setPorcentajeMargenMateriales(50);
    setPorcentajeMargenInstalacion(50);
    setDescuentoPorcentaje(0);
    setCostoTransportacion(0);
    setFotoPortada("");
    setClienteId("");
    setEstadoOferta("en_revision");
    setMaterialesReservados(false);
    setOfertaCreada(false);
    setOfertaId("");
    setInversorSeleccionado("");
    setBateriaSeleccionada("");
    setPanelSeleccionado("");
    setMonedaPago("USD");
    setTasaCambio("");
    setPagoTransferencia(false);
    setDatosCuenta("");
    setFormasPagoAcordadas(false);
    setCantidadPagosAcordados(0);
    setPagosAcordados([]);
    setAplicaContribucion(false);
    setPorcentajeContribucion(0);
    setMargenComercialTotal(0);
    setMargenParaMateriales(0);
    setMargenParaInstalacion(0);
    setMargenPorMaterial(new Map());
    setPorcentajeMargenPorItem(new Map());
    setPorcentajeAsignadoPorItem({});

    setSeccionesPersonalizadas([
      {
        id: SECCION_AMPLIACION_ID,
        label: "Ampliación de Sistema",
        tipo: "materiales",
        categoriasMateriales: ["*"],
      },
    ]);

    toast({
      title: "Oferta reseteada",
      description: "Puedes crear una nueva oferta",
    });
  };

  if (loading || loadingAlmacenes || loadingMarcas) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-sm text-slate-500">
        Cargando materiales...
      </div>
    );
  }

  return (
    <div className="flex w-full h-screen flex-col bg-slate-100 overflow-hidden">
      <div className="w-full h-full flex flex-col overflow-hidden">
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Lateral izquierdo: configuracion de oferta */}
          <div className="flex w-full lg:w-[880px] flex-col border-b lg:border-b-0 lg:border-r bg-white flex-shrink-0 h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              <div className="sticky top-0 z-10 px-4 py-2 border-b bg-white">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-900">
                        Presupuesto de Oferta
                      </h3>
                      {ofertaCreada && (
                        <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 text-xs">
                          Creada
                        </Badge>
                      )}
                    </div>
                    {items.length > 0 && (
                      <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                        {nombreAutomatico}
                      </p>
                    )}
                    {ofertaCreada && ofertaId && (
                      <p className="text-xs text-emerald-700 mt-1">
                        ID: {ofertaId}
                      </p>
                    )}
                  </div>
                  <Badge className="bg-slate-900 text-white hover:bg-slate-900/90 text-xs flex-shrink-0">
                    {items.length} item(s)
                  </Badge>
                </div>
              </div>

              <div className="px-4 py-3 space-y-3">
                {/* Foto de Portada - Compacta */}
                <div className="rounded-md border border-slate-200 bg-white p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <ImageIcon className="h-4 w-4 text-slate-500 flex-shrink-0" />
                      <p className="text-sm font-semibold text-slate-900">
                        Foto de Portada
                      </p>
                    </div>

                    {fotoPortada ? (
                      <div className="flex items-center gap-2">
                        <div className="relative w-20 h-12 rounded overflow-hidden border border-slate-200 bg-slate-50 flex-shrink-0 group">
                          <img
                            src={fotoPortada}
                            alt="Portada"
                            className="w-full h-full object-cover"
                          />
                          <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                            <Upload className="h-4 w-4 text-white" />
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleSubirFotoPortada}
                              className="hidden"
                              disabled={subiendoFoto}
                            />
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={eliminarFotoPortada}
                          className="text-red-600 hover:text-red-700 p-1"
                          title="Eliminar foto"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center gap-2 px-3 py-1.5 rounded-md border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors flex-shrink-0">
                        {subiendoFoto ? (
                          <>
                            <div className="animate-spin h-4 w-4 border-2 border-slate-300 border-t-slate-600 rounded-full" />
                            <span className="text-xs text-slate-600">
                              Subiendo...
                            </span>
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 text-slate-500" />
                            <span className="text-xs font-medium text-slate-700">
                              Subir foto
                            </span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleSubirFotoPortada}
                          className="hidden"
                          disabled={subiendoFoto}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Selectores para el nombre automático - Solo si hay múltiples materiales */}
                {items.length > 0 && mostrarSelectoresMateriales && (
                  <div className="rounded-md border border-blue-200 bg-blue-50 p-3 space-y-2">
                    <p className="text-xs font-semibold text-blue-900 mb-2">
                      Selecciona los materiales para el nombre de la oferta:
                    </p>

                    {/* Selector de Inversor - Solo si hay múltiples */}
                    {tieneMultiplesInversores && (
                      <div className="space-y-1">
                        <label className="text-xs text-blue-700">
                          Inversor:
                        </label>
                        <Select
                          value={inversorSeleccionado}
                          onValueChange={setInversorSeleccionado}
                        >
                          <SelectTrigger className="h-8 text-xs bg-white">
                            <SelectValue placeholder="Seleccionar inversor" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from(
                              new Set(
                                items
                                  .filter((i) => i.seccion === "INVERSORES")
                                  .map((i) => i.materialCodigo),
                              ),
                            ).map((codigo) => {
                              const item = items.find(
                                (i) => i.materialCodigo === codigo,
                              );
                              const cantidad = items
                                .filter((i) => i.materialCodigo === codigo)
                                .reduce((sum, i) => sum + i.cantidad, 0);
                              const material = materials.find(
                                (m) => m.codigo.toString() === codigo,
                              );
                              return (
                                <SelectItem key={codigo} value={codigo}>
                                  {material?.nombre || item?.descripcion} (
                                  {cantidad}x)
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Selector de Batería - Solo si hay múltiples */}
                    {tieneMultiplesBaterias && (
                      <div className="space-y-1">
                        <label className="text-xs text-blue-700">
                          Batería:
                        </label>
                        <Select
                          value={bateriaSeleccionada}
                          onValueChange={setBateriaSeleccionada}
                        >
                          <SelectTrigger className="h-8 text-xs bg-white">
                            <SelectValue placeholder="Seleccionar batería" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from(
                              new Set(
                                items
                                  .filter((i) => i.seccion === "BATERIAS")
                                  .map((i) => i.materialCodigo),
                              ),
                            ).map((codigo) => {
                              const item = items.find(
                                (i) => i.materialCodigo === codigo,
                              );
                              const cantidad = items
                                .filter((i) => i.materialCodigo === codigo)
                                .reduce((sum, i) => sum + i.cantidad, 0);
                              const material = materials.find(
                                (m) => m.codigo.toString() === codigo,
                              );
                              return (
                                <SelectItem key={codigo} value={codigo}>
                                  {material?.nombre || item?.descripcion} (
                                  {cantidad}x)
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Selector de Panel - Solo si hay múltiples */}
                    {tieneMultiplesPaneles && (
                      <div className="space-y-1">
                        <label className="text-xs text-blue-700">
                          Paneles:
                        </label>
                        <Select
                          value={panelSeleccionado}
                          onValueChange={setPanelSeleccionado}
                        >
                          <SelectTrigger className="h-8 text-xs bg-white">
                            <SelectValue placeholder="Seleccionar panel" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from(
                              new Set(
                                items
                                  .filter((i) => i.seccion === "PANELES")
                                  .map((i) => i.materialCodigo),
                              ),
                            ).map((codigo) => {
                              const item = items.find(
                                (i) => i.materialCodigo === codigo,
                              );
                              const cantidad = items
                                .filter((i) => i.materialCodigo === codigo)
                                .reduce((sum, i) => sum + i.cantidad, 0);
                              const material = materials.find(
                                (m) => m.codigo.toString() === codigo,
                              );
                              return (
                                <SelectItem key={codigo} value={codigo}>
                                  {material?.nombre || item?.descripcion} (
                                  {cantidad}x)
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Tipo de oferta
                  </span>
                  <div className="flex items-center rounded-md border border-slate-200 bg-slate-50 p-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (ofertaCreada && !modoEdicion) return;
                        setOfertaGenerica(true);
                        setClienteId("");
                      }}
                      disabled={ofertaCreada && !modoEdicion}
                      className={`px-3 py-1 text-sm font-semibold rounded ${
                        ofertaGenerica
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 hover:text-slate-900"
                      } ${ofertaCreada && !modoEdicion ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      Generica
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (ofertaCreada && !modoEdicion) return;
                        setOfertaGenerica(false);
                      }}
                      disabled={ofertaCreada && !modoEdicion}
                      className={`px-3 py-1 text-sm font-semibold rounded ${
                        !ofertaGenerica
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 hover:text-slate-900"
                      } ${ofertaCreada && !modoEdicion ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      Personalizada
                    </button>
                  </div>
                </div>

                {/* Selector de Estado */}
                <div className="rounded-md border border-slate-200 bg-white p-3">
                  <label className="text-sm font-semibold text-slate-900 mb-2 block">
                    Estado de la Oferta
                  </label>
                  <Select value={estadoOferta} onValueChange={setEstadoOferta}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {estadosDisponibles.map((estado) => (
                        <SelectItem key={estado.value} value={estado.value}>
                          {estado.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!ofertaGenerica && estadoOferta === "reservada" && (
                    <p className="text-xs text-amber-600 mt-2">
                      ⚠️ Al marcar como "Reservada", los materiales se
                      descontarán del stock
                    </p>
                  )}
                </div>

                {!ofertaGenerica && (
                  <div className="space-y-3 rounded-md border border-slate-200 bg-white p-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-500" />
                      <p className="text-sm font-semibold text-slate-900">
                        Contacto
                      </p>
                    </div>

                    {/* Selector de tipo de contacto - Compacto */}
                    <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-md">
                      <button
                        type="button"
                        onClick={() => {
                          setTipoContacto("cliente");
                          setLeadId("");
                          setNombreLeadSinAgregar("");
                        }}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded transition-all ${
                          tipoContacto === "cliente"
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <User className="h-3.5 w-3.5" />
                        Cliente
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTipoContacto("lead");
                          setClienteId("");
                          setNombreLeadSinAgregar("");
                        }}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded transition-all ${
                          tipoContacto === "lead"
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <Search className="h-3.5 w-3.5" />
                        Lead
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTipoContacto("lead_sin_agregar");
                          setClienteId("");
                          setLeadId("");
                        }}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded transition-all ${
                          tipoContacto === "lead_sin_agregar"
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Nuevo
                      </button>
                    </div>

                    {/* Selector de Cliente */}
                    {tipoContacto === "cliente" && (
                      <>
                        <ClienteSearchSelector
                          label="Buscar cliente"
                          clients={clientes}
                          value={clienteId}
                          onChange={setClienteId}
                          loading={clientesLoading}
                        />

                        {selectedCliente && (
                          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3">
                            <div className="flex items-center justify-between gap-2 pb-2 border-b border-emerald-200">
                              <p className="text-sm font-semibold text-emerald-900">
                                Datos del cliente
                              </p>
                              {(selectedCliente.numero ||
                                selectedCliente.id) && (
                                <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 text-xs">
                                  #
                                  {selectedCliente.numero || selectedCliente.id}
                                </Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 pt-2 text-sm text-emerald-900">
                              <p>
                                <span className="font-semibold">Nombre:</span>{" "}
                                {selectedCliente.nombre || "--"}
                              </p>
                              <p>
                                <span className="font-semibold">CI:</span>{" "}
                                {selectedCliente.carnet_identidad || "--"}
                              </p>
                              <p>
                                <span className="font-semibold">Teléfono:</span>{" "}
                                {selectedCliente.telefono || "--"}
                              </p>
                              <p>
                                <span className="font-semibold">
                                  Provincia:
                                </span>{" "}
                                {selectedCliente.provincia_montaje || "--"}
                              </p>
                              <p className="sm:col-span-2">
                                <span className="font-semibold">
                                  Dirección:
                                </span>{" "}
                                {selectedCliente.direccion || "--"}
                              </p>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Selector de Lead */}
                    {tipoContacto === "lead" && (
                      <>
                        <LeadSearchSelector
                          label="Buscar lead"
                          leads={leads}
                          value={leadId}
                          onChange={setLeadId}
                          loading={leadsLoading}
                        />

                        {selectedLead && (
                          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-3">
                            <div className="flex items-center justify-between gap-2 pb-2 border-b border-blue-200">
                              <p className="text-sm font-semibold text-blue-900">
                                Datos del lead
                              </p>
                              {selectedLead.id && (
                                <Badge className="bg-blue-600 text-white hover:bg-blue-600 text-xs">
                                  #{selectedLead.id}
                                </Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 pt-2 text-sm text-blue-900">
                              <p>
                                <span className="font-semibold">Nombre:</span>{" "}
                                {selectedLead.nombre_completo ||
                                  selectedLead.nombre ||
                                  "--"}
                              </p>
                              <p>
                                <span className="font-semibold">Teléfono:</span>{" "}
                                {selectedLead.telefono || "--"}
                              </p>
                              <p>
                                <span className="font-semibold">Email:</span>{" "}
                                {selectedLead.email || "--"}
                              </p>
                              <p>
                                <span className="font-semibold">
                                  Provincia:
                                </span>{" "}
                                {selectedLead.provincia || "--"}
                              </p>
                              {selectedLead.direccion && (
                                <p className="sm:col-span-2">
                                  <span className="font-semibold">
                                    Dirección:
                                  </span>{" "}
                                  {selectedLead.direccion}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Campo para Lead sin agregar */}
                    {tipoContacto === "lead_sin_agregar" && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">
                          Nombre del contacto
                        </Label>
                        <Input
                          placeholder="Ej: Juan Pérez"
                          value={nombreLeadSinAgregar}
                          onChange={(e) =>
                            setNombreLeadSinAgregar(e.target.value)
                          }
                          className="h-10"
                        />
                        <p className="text-xs text-slate-500">
                          💡 Este contacto no se agregará a la base de datos de
                          leads
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="rounded-md border border-slate-200 bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-base font-semibold text-slate-900">
                      Presupuesto de materiales
                    </p>
                    <div className="text-sm text-slate-500">
                      {activeStep?.label ?? "Categoria"} ·{" "}
                      {itemsPorSeccion.get(activeStep?.id ?? "")?.length ?? 0}{" "}
                      item(s)
                    </div>
                  </div>

                  <div className="mt-3 space-y-3">
                    {steps.map((step, index) => {
                      const itemsDeSeccion = itemsPorSeccion.get(step.id) ?? [];
                      const esActual = index === activeStepIndex;
                      const subtotal = subtotalPorSeccion.get(step.id) ?? 0;
                      const expandir = esActual || itemsDeSeccion.length > 0;

                      const tieneItems = itemsDeSeccion.length > 0;
                      const seccionClass = esActual
                        ? "border-l-4 border-slate-900/50 bg-slate-100/70"
                        : tieneItems
                          ? "border-l-4 border-emerald-300 bg-emerald-50/40"
                          : "border-l-4 border-slate-200 bg-white";

                      const esPersonalizada =
                        "esPersonalizada" in step && step.esPersonalizada;
                      const seccionData =
                        "seccionData" in step
                          ? (step.seccionData as SeccionPersonalizada)
                          : null;
                      const puedeEliminar =
                        esPersonalizada && step.id !== SECCION_AMPLIACION_ID;

                      return (
                        <div
                          key={step.id}
                          className={`rounded-md border border-slate-200 px-3 py-2 ${seccionClass} ${esPersonalizada ? "border-purple-300" : ""}`}
                        >
                          <div className="flex w-full items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => setActiveStepIndex(index)}
                              className="flex-1 flex items-center gap-2 text-left min-w-0"
                            >
                              <span className="text-xs font-semibold text-slate-400">
                                {String(index + 1).padStart(2, "0")}
                              </span>
                              <span
                                className={`text-sm font-semibold ${
                                  esActual ? "text-slate-900" : "text-slate-700"
                                }`}
                              >
                                {step.label}
                              </span>
                              {esPersonalizada && (
                                <Badge
                                  variant="outline"
                                  className="text-xs border-purple-300 text-purple-700 bg-purple-50"
                                >
                                  {seccionData?.tipo === "materiales"
                                    ? "Materiales"
                                    : seccionData?.tipoExtra === "escritura"
                                      ? "Texto"
                                      : "Costos"}
                                </Badge>
                              )}
                              {tieneItems && (
                                <span className="text-xs text-slate-500">
                                  {itemsDeSeccion.length} item(s)
                                </span>
                              )}
                            </button>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {subtotal > 0 ? (
                                <span className="text-sm font-semibold text-slate-900">
                                  {formatCurrency(subtotal)}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">
                                  {esActual
                                    ? "Selecciona materiales"
                                    : "Sin materiales"}
                                </span>
                              )}
                              {puedeEliminar && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    eliminarSeccionPersonalizada(step.id);
                                  }}
                                  className="text-red-600 hover:text-red-700 p-1"
                                  title="Eliminar sección"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          {expandir && (
                            <div className="mt-2 space-y-2">
                              {/* Sección de escritura */}
                              {seccionData?.tipo === "extra" &&
                                seccionData.tipoExtra === "escritura" && (
                                  <div className="space-y-2">
                                    <Label className="text-sm text-slate-700">
                                      Contenido:
                                    </Label>
                                    <Textarea
                                      value={
                                        seccionData.contenidoEscritura || ""
                                      }
                                      onChange={(e) =>
                                        actualizarContenidoEscritura(
                                          step.id,
                                          e.target.value,
                                        )
                                      }
                                      placeholder="Escribe aquí el contenido de esta sección..."
                                      className="min-h-[100px] text-sm"
                                    />
                                  </div>
                                )}

                              {/* Sección de costos extras */}
                              {seccionData?.tipo === "extra" &&
                                seccionData.tipoExtra === "costo" && (
                                  <div className="space-y-3">
                                    {seccionData.costosExtras &&
                                    seccionData.costosExtras.length > 0 ? (
                                      <>
                                        <div className="grid grid-cols-[minmax(0,1fr)_80px_90px_110px_40px] text-sm text-slate-500 gap-2">
                                          <span>Descripción</span>
                                          <span className="text-center">
                                            Cant
                                          </span>
                                          <span className="text-right">
                                            P. Unit
                                          </span>
                                          <span className="text-right">
                                            Total
                                          </span>
                                          <span></span>
                                        </div>
                                        {seccionData.costosExtras.map(
                                          (costo) => (
                                            <div
                                              key={costo.id}
                                              className="grid grid-cols-[minmax(0,1fr)_80px_90px_110px_40px] items-center gap-2"
                                            >
                                              <Input
                                                type="text"
                                                value={costo.descripcion}
                                                onChange={(e) =>
                                                  actualizarCostoExtra(
                                                    step.id,
                                                    costo.id,
                                                    "descripcion",
                                                    e.target.value,
                                                  )
                                                }
                                                placeholder="Descripción del costo"
                                                className="h-8 text-sm"
                                              />
                                              <Input
                                                type="number"
                                                min="0"
                                                value={costo.cantidad}
                                                onChange={(e) =>
                                                  actualizarCostoExtra(
                                                    step.id,
                                                    costo.id,
                                                    "cantidad",
                                                    Number(e.target.value) || 0,
                                                  )
                                                }
                                                className="h-8 text-center text-sm"
                                              />
                                              <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={costo.precioUnitario}
                                                onChange={(e) =>
                                                  actualizarCostoExtra(
                                                    step.id,
                                                    costo.id,
                                                    "precioUnitario",
                                                    Number(e.target.value) || 0,
                                                  )
                                                }
                                                className="h-8 text-right text-sm"
                                              />
                                              <span className="text-sm font-semibold text-slate-900 text-right">
                                                {formatCurrency(
                                                  costo.cantidad *
                                                    costo.precioUnitario,
                                                )}
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  eliminarCostoExtra(
                                                    step.id,
                                                    costo.id,
                                                  )
                                                }
                                                className="text-red-600 hover:text-red-700 text-sm"
                                              >
                                                ✕
                                              </button>
                                            </div>
                                          ),
                                        )}
                                        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                              agregarCostoExtra(step.id)
                                            }
                                            className="h-8 text-xs"
                                          >
                                            <Plus className="h-3 w-3 mr-1" />
                                            Agregar costo
                                          </Button>
                                          <span className="text-sm font-semibold text-slate-900">
                                            Subtotal:{" "}
                                            {formatCurrency(
                                              seccionData.costosExtras.reduce(
                                                (sum, c) =>
                                                  sum +
                                                  c.cantidad * c.precioUnitario,
                                                0,
                                              ),
                                            )}
                                          </span>
                                        </div>
                                      </>
                                    ) : (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          agregarCostoExtra(step.id)
                                        }
                                        className="w-full h-8 text-xs"
                                      >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Agregar primer costo
                                      </Button>
                                    )}
                                  </div>
                                )}

                              {/* Sección de materiales (normal o personalizada) */}
                              {(!seccionData ||
                                seccionData.tipo === "materiales") && (
                                <>
                                  {itemsDeSeccion.length > 0 ? (
                                    <>
                                      <div className="grid grid-cols-[minmax(0,1fr)_90px_80px_100px_120px_120px_40px] text-sm text-slate-500 gap-2">
                                        <span>Material</span>
                                        <span className="text-right">
                                          P. Unit
                                        </span>
                                        <span className="text-center">
                                          Cant
                                        </span>
                                        <span className="text-right">
                                          Costo
                                        </span>
                                        <span className="text-right">
                                          Margen (%)
                                        </span>
                                        <span className="text-right">
                                          P. Final
                                        </span>
                                        <span></span>
                                      </div>
                                      {itemsDeSeccion.map((item, itemIndex) => {
                                        const costoItem =
                                          item.precio * item.cantidad;
                                        const porcentajeItem =
                                          typeof porcentajeAsignadoPorItem[
                                            item.id
                                          ] === "number"
                                            ? porcentajeAsignadoPorItem[item.id]
                                            : (porcentajeMargenPorItem.get(
                                                item.id,
                                              ) ?? 0);
                                        const margenItem =
                                          costoItem * (porcentajeItem / 100);
                                        const precioFinalItem =
                                          costoItem + margenItem;

                                        // Calcular sugerencia de ajuste para este item
                                        const calcularSugerencia = () => {
                                          // Solo sugerir si este item NO ha sido editado manualmente
                                          if (
                                            typeof porcentajeAsignadoPorItem[
                                              item.id
                                            ] === "number"
                                          ) {
                                            return {
                                              tipo: "editado",
                                              margenActual: margenItem,
                                            };
                                          }

                                          // Si no hay desbalance significativo, no mostrar sugerencia
                                          if (Math.abs(desbalanceMargen) < 0.01)
                                            return null;

                                          // PASO 1: Calcular el margen total actualmente asignado
                                          const totalMargenActual =
                                            items.reduce((sum, i) => {
                                              const costo =
                                                i.precio * i.cantidad;
                                              const porcentaje =
                                                typeof porcentajeAsignadoPorItem[
                                                  i.id
                                                ] === "number"
                                                  ? porcentajeAsignadoPorItem[
                                                      i.id
                                                    ]
                                                  : (porcentajeMargenPorItem.get(
                                                      i.id,
                                                    ) ?? 0);
                                              return (
                                                sum + costo * (porcentaje / 100)
                                              );
                                            }, 0);

                                          // PASO 2: Calcular la diferencia que necesitamos compensar
                                          const diferenciaTotal =
                                            margenParaMateriales -
                                            totalMargenActual;

                                          // PASO 3: Identificar items no editados
                                          const itemsNoEditados = items.filter(
                                            (i) =>
                                              typeof porcentajeAsignadoPorItem[
                                                i.id
                                              ] !== "number",
                                          );
                                          if (itemsNoEditados.length === 0)
                                            return null;

                                          // PASO 4: Calcular costos totales de items no editados
                                          const costosNoEditados =
                                            itemsNoEditados.reduce(
                                              (sum, i) =>
                                                sum + i.precio * i.cantidad,
                                              0,
                                            );
                                          if (costosNoEditados === 0)
                                            return null;

                                          // PASO 5: Calcular proporción de este item respecto al total no editado
                                          const proporcionItem =
                                            costoItem / costosNoEditados;

                                          // PASO 6: Calcular el ajuste proporcional para este item
                                          const ajusteMargen =
                                            diferenciaTotal * proporcionItem;

                                          // PASO 7: Margen sugerido = margen actual + ajuste
                                          const margenActual = margenItem;
                                          const margenSugerido =
                                            margenActual + ajusteMargen;
                                          const porcentajeSugerido =
                                            costoItem > 0
                                              ? (margenSugerido / costoItem) *
                                                100
                                              : 0;

                                          const diferencia =
                                            margenSugerido - margenActual;

                                          // Mostrar sugerencia incluso si la diferencia es pequeña
                                          return {
                                            tipo: "sugerencia",
                                            margenSugerido,
                                            porcentajeSugerido,
                                            diferencia,
                                          };
                                        };

                                        const sugerencia = calcularSugerencia();

                                        return (
                                          <div
                                            key={item.id}
                                            className="grid grid-cols-[minmax(0,1fr)_90px_80px_100px_120px_120px_40px] items-center gap-2"
                                          >
                                            <div className="min-w-0">
                                              <p className="text-sm font-semibold text-slate-900 truncate">
                                                {materials.find(
                                                  (m) =>
                                                    m.codigo.toString() ===
                                                    item.materialCodigo,
                                                )?.nombre || item.descripcion}
                                              </p>
                                              <p className="text-sm text-slate-500 truncate">
                                                {item.categoria}
                                              </p>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                              <div className="relative">
                                                <Input
                                                  type="number"
                                                  min="0"
                                                  step="0.01"
                                                  value={item.precio.toString()}
                                                  onChange={(e) =>
                                                    actualizarPrecio(
                                                      item.id,
                                                      Number(e.target.value) ||
                                                        0,
                                                    )
                                                  }
                                                  className={`h-8 text-right text-sm pr-6 ${
                                                    item.precioEditado
                                                      ? "border-amber-400 bg-amber-50"
                                                      : ""
                                                  }`}
                                                />
                                                {item.precioEditado && (
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      restaurarPrecioOriginal(
                                                        item.id,
                                                      )
                                                    }
                                                    className="absolute right-1 top-1/2 -translate-y-1/2 text-amber-600 hover:text-amber-700"
                                                    title="Restaurar precio original"
                                                  >
                                                    ↺
                                                  </button>
                                                )}
                                              </div>
                                              {item.precioEditado && (
                                                <span className="text-[10px] text-amber-600">
                                                  Original:{" "}
                                                  {formatCurrency(
                                                    item.precioOriginal,
                                                  )}
                                                </span>
                                              )}
                                            </div>
                                            <Input
                                              type="number"
                                              min="0"
                                              value={item.cantidad.toString()}
                                              onChange={(e) =>
                                                actualizarCantidad(
                                                  item.id,
                                                  Number(e.target.value) || 0,
                                                )
                                              }
                                              className="h-8 text-center text-sm"
                                            />
                                            <div className="text-right">
                                              <span className="text-sm font-semibold text-slate-900">
                                                {formatCurrency(costoItem)}
                                              </span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                              <div className="flex items-center gap-1">
                                                <Input
                                                  type="number"
                                                  min="0"
                                                  max="100"
                                                  step="0.1"
                                                  value={
                                                    typeof porcentajeAsignadoPorItem[
                                                      item.id
                                                    ] === "number"
                                                      ? porcentajeAsignadoPorItem[
                                                          item.id
                                                        ].toString()
                                                      : (
                                                          porcentajeMargenPorItem.get(
                                                            item.id,
                                                          ) ?? 0
                                                        ).toString()
                                                  }
                                                  onChange={(e) => {
                                                    const value =
                                                      e.target.value;

                                                    console.log(
                                                      `🔧 Cambio en margen de ${item.id}:`,
                                                      {
                                                        valor_input: value,
                                                        valor_anterior:
                                                          porcentajeAsignadoPorItem[
                                                            item.id
                                                          ],
                                                      },
                                                    );

                                                    if (
                                                      value === "" ||
                                                      value === null ||
                                                      value === undefined
                                                    ) {
                                                      // Si está vacío, eliminar la edición manual
                                                      setPorcentajeAsignadoPorItem(
                                                        (prev) => {
                                                          const next = {
                                                            ...prev,
                                                          };
                                                          delete next[item.id];
                                                          return next;
                                                        },
                                                      );
                                                      return;
                                                    }

                                                    const parsed =
                                                      parseFloat(value);
                                                    if (!isNaN(parsed)) {
                                                      const valorFinal =
                                                        Math.min(
                                                          100,
                                                          Math.max(0, parsed),
                                                        );
                                                      setPorcentajeAsignadoPorItem(
                                                        (prev) => {
                                                          const next = {
                                                            ...prev,
                                                            [item.id]:
                                                              valorFinal,
                                                          };
                                                          console.log(
                                                            `  ✅ Nuevo estado:`,
                                                            next,
                                                          );
                                                          return next;
                                                        },
                                                      );
                                                    }
                                                  }}
                                                  onBlur={(e) => {
                                                    // Al perder el foco, asegurar que el valor sea válido
                                                    const value =
                                                      e.target.value;
                                                    if (value && value !== "") {
                                                      const parsed =
                                                        parseFloat(value);
                                                      if (!isNaN(parsed)) {
                                                        const valorFinal =
                                                          Math.min(
                                                            100,
                                                            Math.max(0, parsed),
                                                          );
                                                        setPorcentajeAsignadoPorItem(
                                                          (prev) => ({
                                                            ...prev,
                                                            [item.id]:
                                                              valorFinal,
                                                          }),
                                                        );
                                                      }
                                                    }
                                                  }}
                                                  className="h-8 text-right text-sm"
                                                  title="Editar porcentaje de margen"
                                                />
                                                <span className="text-xs text-slate-500">
                                                  %
                                                </span>
                                              </div>
                                              <span className="text-[10px] text-slate-600 text-right font-medium">
                                                = {formatCurrency(margenItem)}
                                              </span>
                                              {sugerencia?.tipo ===
                                                "editado" && (
                                                <span className="text-[10px] text-green-600 text-right font-medium">
                                                  ✓ Editado manualmente
                                                </span>
                                              )}
                                              {sugerencia?.tipo ===
                                                "sugerencia" && (
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setPorcentajeAsignadoPorItem(
                                                      (prev) => ({
                                                        ...prev,
                                                        [item.id]: Number(
                                                          sugerencia.porcentajeSugerido.toFixed(
                                                            2,
                                                          ),
                                                        ),
                                                      }),
                                                    );
                                                  }}
                                                  className={`text-[10px] hover:underline text-right font-medium ${
                                                    Math.abs(
                                                      sugerencia.diferencia,
                                                    ) > 0.01
                                                      ? "text-blue-600 hover:text-blue-700"
                                                      : "text-slate-500 hover:text-slate-600"
                                                  }`}
                                                  title={`Aplicar sugerencia: ${sugerencia.porcentajeSugerido.toFixed(2)}%`}
                                                >
                                                  💡{" "}
                                                  {sugerencia.diferencia > 0
                                                    ? "+"
                                                    : ""}
                                                  {formatCurrency(
                                                    sugerencia.diferencia,
                                                  )}
                                                  {Math.abs(
                                                    sugerencia.diferencia,
                                                  ) < 0.01 && " (ajuste fino)"}
                                                </button>
                                              )}
                                            </div>
                                            <div className="text-right">
                                              <span className="text-sm font-bold text-emerald-700">
                                                {formatCurrency(
                                                  precioFinalItem,
                                                )}
                                              </span>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                actualizarCantidad(item.id, 0)
                                              }
                                              className="text-red-600 hover:text-red-700 text-sm"
                                            >
                                              ✕
                                            </button>
                                          </div>
                                        );
                                      })}
                                      <div className="flex items-center justify-end text-sm font-semibold text-slate-900">
                                        Subtotal: {formatCurrency(subtotal)}
                                      </div>
                                    </>
                                  ) : (
                                    <p className="text-sm text-slate-400">
                                      Selecciona materiales en la columna
                                      derecha.
                                    </p>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Botón para agregar sección */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={abrirDialogoSeccion}
                      className="w-full border-dashed border-2 border-purple-300 text-purple-700 hover:bg-purple-50 hover:text-purple-800"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Sección Personalizada
                    </Button>

                    {servicios.length > 0 && (
                      <div className="rounded-md border border-emerald-200 bg-emerald-50/40 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-emerald-900">
                            Servicios
                          </span>
                          <span className="text-sm font-semibold text-emerald-900">
                            {formatCurrency(margenParaInstalacion)}
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_70px_110px] items-center gap-2 text-sm">
                          <span className="text-slate-700 truncate">
                            Servicio de instalación y montaje
                          </span>
                          <span className="text-center text-slate-600">1</span>
                          <span className="text-right font-medium text-slate-800">
                            {formatCurrency(margenParaInstalacion)}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-emerald-700">
                          Calculado desde el % de margen comercial asignado a
                          instalación.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Total de Materiales */}
                  <div className="rounded-md border-2 border-slate-900 bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-slate-900">
                        Total Materiales
                      </span>
                      <span className="text-lg font-bold text-slate-900">
                        {formatCurrency(totalMateriales)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Margen Comercial */}
                <div className="rounded-md border border-slate-200 bg-white p-3 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-semibold text-slate-900">
                      Margen Comercial (%)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="99"
                      step="0.1"
                      value={margenComercial}
                      onChange={(e) =>
                        setMargenComercial(Number(e.target.value) || 0)
                      }
                      className="h-9 w-24 text-right"
                      placeholder="0"
                    />
                  </div>

                  {margenComercial > 0 && (
                    <>
                      <div className="pt-2 border-t border-slate-200 space-y-3">
                        <p className="text-xs font-semibold text-slate-700">
                          Distribución del margen comercial:
                        </p>

                        {/* Distribución Materiales */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <label className="text-xs text-slate-600">
                              Para Materiales (%)
                            </label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={porcentajeMargenMateriales}
                                onChange={(e) => {
                                  const valor = Number(e.target.value) || 0;
                                  const ajustado = Math.min(
                                    100,
                                    Math.max(0, valor),
                                  );
                                  setPorcentajeMargenMateriales(ajustado);
                                  setPorcentajeMargenInstalacion(
                                    100 - ajustado,
                                  );
                                }}
                                className="h-8 w-20 text-right text-xs"
                              />
                              <span className="text-xs text-slate-500 w-16">
                                {formatCurrency(margenParaMateriales)}
                              </span>
                            </div>
                          </div>

                          {/* Barra de progreso para materiales */}
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 transition-all"
                              style={{
                                width: `${porcentajeMargenMateriales}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Distribución Instalación */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <label className="text-xs text-slate-600">
                              Para Instalación (%)
                            </label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={porcentajeMargenInstalacion}
                                onChange={(e) => {
                                  const valor = Number(e.target.value) || 0;
                                  const ajustado = Math.min(
                                    100,
                                    Math.max(0, valor),
                                  );
                                  setPorcentajeMargenInstalacion(ajustado);
                                  setPorcentajeMargenMateriales(100 - ajustado);
                                }}
                                className="h-8 w-20 text-right text-xs"
                              />
                              <span className="text-xs text-slate-500 w-16">
                                {formatCurrency(margenParaInstalacion)}
                              </span>
                            </div>
                          </div>

                          {/* Barra de progreso para instalación */}
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 transition-all"
                              style={{
                                width: `${porcentajeMargenInstalacion}%`,
                              }}
                            />
                          </div>
                        </div>

                        {porcentajeMargenMateriales +
                          porcentajeMargenInstalacion !==
                          100 && (
                          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                            ⚠️ La suma debe ser 100% (actual:{" "}
                            {porcentajeMargenMateriales +
                              porcentajeMargenInstalacion}
                            %)
                          </p>
                        )}

                        {/* Alerta de desbalance de margen */}
                        {Math.abs(desbalanceMargen) > 0.01 && (
                          <div
                            className={`text-xs rounded px-3 py-2 space-y-2 ${
                              desbalanceMargen > 0
                                ? "text-amber-700 bg-amber-50 border border-amber-300"
                                : "text-red-700 bg-red-50 border border-red-300"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">
                                {desbalanceMargen > 0
                                  ? "⚠️ Falta asignar margen"
                                  : "⛔ Margen excedido"}
                              </span>
                              <span className="font-bold">
                                {desbalanceMargen > 0 ? "+" : ""}
                                {formatCurrency(desbalanceMargen)}
                              </span>
                            </div>
                            <p className="text-[11px]">
                              {desbalanceMargen > 0
                                ? `Tienes ${formatCurrency(desbalanceMargen)} de margen sin asignar. Haz clic en las sugerencias 💡 de los materiales para distribuirlo automáticamente.`
                                : `Has excedido el margen en ${formatCurrency(Math.abs(desbalanceMargen))}. Haz clic en las sugerencias 💡 de los materiales para ajustarlo.`}
                            </p>
                            {(() => {
                              const itemsNoEditados = items.filter(
                                (i) =>
                                  typeof porcentajeAsignadoPorItem[i.id] !==
                                  "number",
                              );
                              if (itemsNoEditados.length === 0) return null;

                              return (
                                <div className="flex items-center justify-between gap-2 pt-1">
                                  <p className="text-[10px] opacity-75">
                                    📊 {itemsNoEditados.length} material
                                    {itemsNoEditados.length !== 1
                                      ? "es"
                                      : ""}{" "}
                                    sin editar
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      // Aplicar todas las sugerencias automáticamente
                                      const totalMargenActual = items.reduce(
                                        (sum, i) => {
                                          const costo = i.precio * i.cantidad;
                                          const porcentaje =
                                            typeof porcentajeAsignadoPorItem[
                                              i.id
                                            ] === "number"
                                              ? porcentajeAsignadoPorItem[i.id]
                                              : (porcentajeMargenPorItem.get(
                                                  i.id,
                                                ) ?? 0);
                                          return (
                                            sum + costo * (porcentaje / 100)
                                          );
                                        },
                                        0,
                                      );

                                      const diferenciaTotal =
                                        margenParaMateriales -
                                        totalMargenActual;
                                      const costosNoEditados =
                                        itemsNoEditados.reduce(
                                          (sum, i) =>
                                            sum + i.precio * i.cantidad,
                                          0,
                                        );

                                      if (costosNoEditados > 0) {
                                        const nuevosPorcentajes: Record<
                                          string,
                                          number
                                        > = {};

                                        itemsNoEditados.forEach((item) => {
                                          const costoItem =
                                            item.precio * item.cantidad;
                                          const proporcionItem =
                                            costoItem / costosNoEditados;
                                          const ajusteMargen =
                                            diferenciaTotal * proporcionItem;

                                          const porcentajeActual =
                                            porcentajeMargenPorItem.get(
                                              item.id,
                                            ) ?? 0;
                                          const margenActual =
                                            costoItem *
                                            (porcentajeActual / 100);
                                          const margenSugerido =
                                            margenActual + ajusteMargen;
                                          const porcentajeSugerido =
                                            costoItem > 0
                                              ? (margenSugerido / costoItem) *
                                                100
                                              : 0;

                                          nuevosPorcentajes[item.id] = Number(
                                            porcentajeSugerido.toFixed(2),
                                          );
                                        });

                                        setPorcentajeAsignadoPorItem(
                                          (prev) => ({
                                            ...prev,
                                            ...nuevosPorcentajes,
                                          }),
                                        );

                                        toast({
                                          title: "Sugerencias aplicadas",
                                          description: `Se ajustaron ${itemsNoEditados.length} materiales automáticamente`,
                                        });
                                      }
                                    }}
                                    className="text-[10px] px-2 py-1 rounded bg-white hover:bg-slate-50 border border-current font-medium transition-colors"
                                  >
                                    ⚡ Aplicar todas las sugerencias
                                  </button>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-200 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-600">
                            Total materiales base
                          </span>
                          <span className="font-medium text-slate-900">
                            {formatCurrency(totalMateriales)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-600">
                            Margen total ({margenComercial}%)
                          </span>
                          <span className="font-medium text-slate-900">
                            {formatCurrency(margenComercialTotal)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm font-semibold pt-1 border-t border-slate-200">
                          <span className="text-slate-900">
                            Subtotal con margen
                          </span>
                          <span className="text-slate-900">
                            {formatCurrency(subtotalConMargen)}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Descuento */}
                <div className="rounded-md border border-purple-200 bg-purple-50 p-3 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-semibold text-purple-900">
                      Descuento (%)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={descuentoPorcentaje}
                      onChange={(e) =>
                        setDescuentoPorcentaje(Number(e.target.value) || 0)
                      }
                      className="h-9 w-24 text-right bg-white"
                      placeholder="0"
                    />
                  </div>

                  {descuentoPorcentaje > 0 && (
                    <div className="pt-2 border-t border-purple-200 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-purple-700">
                          Subtotal antes de descuento
                        </span>
                        <span className="font-medium text-purple-900">
                          {formatCurrency(subtotalConMargen)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-purple-700">
                          Descuento ({descuentoPorcentaje}%)
                        </span>
                        <span className="font-medium text-red-600">
                          - {formatCurrency(montoDescuento)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm font-semibold pt-1 border-t border-purple-200">
                        <span className="text-purple-900">
                          Subtotal con descuento
                        </span>
                        <span className="text-purple-900">
                          {formatCurrency(subtotalConDescuento)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Costo de Transportación */}
                <div className="rounded-md border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-semibold text-slate-900">
                      Costo de Transportación (opcional)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={costoTransportacion}
                      onChange={(e) =>
                        setCostoTransportacion(Number(e.target.value) || 0)
                      }
                      className="h-9 w-32 text-right"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Compensación */}
                <div className="rounded-md border border-orange-200 bg-orange-50 p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="tieneCompensacion"
                      checked={tieneCompensacion}
                      onChange={(e) => setTieneCompensacion(e.target.checked)}
                      className="h-4 w-4 rounded border-orange-300"
                    />
                    <label htmlFor="tieneCompensacion" className="text-sm font-semibold text-orange-900 cursor-pointer">
                      Tiene Compensación
                    </label>
                  </div>
                  
                  {tieneCompensacion && (
                    <div className="space-y-2 pl-6">
                      {/* Toggle entre Monto y Porcentaje */}
                      <div className="flex items-center gap-2 mb-2">
                        <button
                          type="button"
                          onClick={() => setModoCompensacion("monto")}
                          className={`px-3 py-1 text-xs rounded ${
                            modoCompensacion === "monto"
                              ? "bg-orange-600 text-white"
                              : "bg-white text-orange-700 border border-orange-300"
                          }`}
                        >
                          Monto Fijo
                        </button>
                        <button
                          type="button"
                          onClick={() => setModoCompensacion("porcentaje")}
                          className={`px-3 py-1 text-xs rounded ${
                            modoCompensacion === "porcentaje"
                              ? "bg-orange-600 text-white"
                              : "bg-white text-orange-700 border border-orange-300"
                          }`}
                        >
                          % del Precio
                        </button>
                      </div>
                      
                      {modoCompensacion === "monto" ? (
                        <div className="flex items-center justify-between gap-3">
                          <label className="text-sm text-orange-700">Monto (USD)</label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={montoCompensacion}
                            onChange={(e) => setMontoCompensacion(Number(e.target.value) || 0)}
                            className="h-9 w-32 text-right bg-white"
                            placeholder="0.00"
                          />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <label className="text-sm text-orange-700">Porcentaje (%)</label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={porcentajeCompensacion}
                              onChange={(e) => setPorcentajeCompensacion(Number(e.target.value) || 0)}
                              className="h-9 w-32 text-right bg-white"
                              placeholder="0"
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs text-orange-600">
                            <span>Monto calculado:</span>
                            <span className="font-semibold">${formatCurrency(montoCompensacion)}</span>
                          </div>
                        </div>
                      )}
                      
                      <div>
                        <label className="text-sm text-orange-700 block mb-1">Justificación</label>
                        <textarea
                          value={justificacionCompensacion}
                          onChange={(e) => setJustificacionCompensacion(e.target.value)}
                          className="w-full h-20 px-3 py-2 text-sm border border-orange-200 rounded-md bg-white resize-none"
                          placeholder="Ej: Compensación por retraso de 2 semanas en la instalación"
                          minLength={10}
                          maxLength={500}
                        />
                        <p className="text-xs text-orange-600 mt-1">
                          {justificacionCompensacion.length}/500 caracteres (mínimo 10)
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Asumido por Empresa */}
                <div className="rounded-md border border-blue-200 bg-blue-50 p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="tieneAsumidoPorEmpresa"
                      checked={tieneAsumidoPorEmpresa}
                      onChange={(e) => setTieneAsumidoPorEmpresa(e.target.checked)}
                      className="h-4 w-4 rounded border-blue-300"
                    />
                    <label htmlFor="tieneAsumidoPorEmpresa" className="text-sm font-semibold text-blue-900 cursor-pointer">
                      Tiene Monto Asumido por Empresa
                    </label>
                  </div>
                  
                  {tieneAsumidoPorEmpresa && (
                    <div className="space-y-2 pl-6">
                      {/* Toggle entre Monto y Porcentaje */}
                      <div className="flex items-center gap-2 mb-2">
                        <button
                          type="button"
                          onClick={() => setModoAsumidoPorEmpresa("monto")}
                          className={`px-3 py-1 text-xs rounded ${
                            modoAsumidoPorEmpresa === "monto"
                              ? "bg-blue-600 text-white"
                              : "bg-white text-blue-700 border border-blue-300"
                          }`}
                        >
                          Monto Fijo
                        </button>
                        <button
                          type="button"
                          onClick={() => setModoAsumidoPorEmpresa("porcentaje")}
                          className={`px-3 py-1 text-xs rounded ${
                            modoAsumidoPorEmpresa === "porcentaje"
                              ? "bg-blue-600 text-white"
                              : "bg-white text-blue-700 border border-blue-300"
                          }`}
                        >
                          % del Precio
                        </button>
                      </div>
                      
                      {modoAsumidoPorEmpresa === "monto" ? (
                        <div className="flex items-center justify-between gap-3">
                          <label className="text-sm text-blue-700">Monto (USD)</label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={montoAsumidoPorEmpresa}
                            onChange={(e) => setMontoAsumidoPorEmpresa(Number(e.target.value) || 0)}
                            className="h-9 w-32 text-right bg-white"
                            placeholder="0.00"
                          />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <label className="text-sm text-blue-700">Porcentaje (%)</label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={porcentajeAsumidoPorEmpresa}
                              onChange={(e) => setPorcentajeAsumidoPorEmpresa(Number(e.target.value) || 0)}
                              className="h-9 w-32 text-right bg-white"
                              placeholder="0"
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs text-blue-600">
                            <span>Monto calculado:</span>
                            <span className="font-semibold">${formatCurrency(montoAsumidoPorEmpresa)}</span>
                          </div>
                        </div>
                      )}
                      
                      <div>
                        <label className="text-sm text-blue-700 block mb-1">Justificación</label>
                        <textarea
                          value={justificacionAsumidoPorEmpresa}
                          onChange={(e) => setJustificacionAsumidoPorEmpresa(e.target.value)}
                          className="w-full h-20 px-3 py-2 text-sm border border-blue-200 rounded-md bg-white resize-none"
                          placeholder="Ej: Descuento VIP aprobado por gerencia"
                          minLength={10}
                          maxLength={500}
                        />
                        <p className="text-xs text-blue-600 mt-1">
                          {justificacionAsumidoPorEmpresa.length}/500 caracteres (mínimo 10)
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Elementos Personalizados */}
                <div className="rounded-md border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <p className="text-sm font-semibold text-slate-900">
                      Elementos Personalizados (opcional)
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setMostrarElementosPersonalizados(
                          !mostrarElementosPersonalizados,
                        )
                      }
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {mostrarElementosPersonalizados ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>

                  {mostrarElementosPersonalizados && (
                    <div className="space-y-3">
                      {elementosPersonalizados.length > 0 ? (
                        <>
                          <div className="grid grid-cols-[minmax(0,1fr)_90px_80px_110px_40px] text-sm text-slate-500 gap-2">
                            <span>Material</span>
                            <span className="text-right">P. Unit</span>
                            <span className="text-center">Cant</span>
                            <span className="text-right">Total</span>
                            <span></span>
                          </div>
                          {elementosPersonalizados.map((elem) => (
                            <div
                              key={elem.id}
                              className="grid grid-cols-[minmax(0,1fr)_90px_80px_110px_40px] items-center gap-2"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate">
                                  {materials.find(
                                    (m) =>
                                      m.codigo.toString() ===
                                      elem.materialCodigo,
                                  )?.nombre || elem.descripcion}
                                </p>
                                <p className="text-sm text-slate-500 truncate">
                                  {elem.categoria}
                                </p>
                              </div>
                              <span className="text-sm text-slate-700 text-right">
                                {formatCurrency(elem.precio)}
                              </span>
                              <Input
                                type="number"
                                min="0"
                                value={elem.cantidad}
                                onChange={(e) =>
                                  actualizarCantidadElementoPersonalizado(
                                    elem.id,
                                    Number(e.target.value) || 0,
                                  )
                                }
                                className="h-8 text-center text-sm"
                              />
                              <span className="text-sm font-semibold text-slate-900 text-right">
                                {formatCurrency(elem.precio * elem.cantidad)}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  eliminarElementoPersonalizado(elem.id)
                                }
                                className="text-red-600 hover:text-red-700 text-sm"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                          <div className="flex items-center justify-end text-sm font-semibold text-slate-900 pt-2 border-t border-slate-200">
                            Subtotal:{" "}
                            {formatCurrency(totalElementosPersonalizados)}
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-slate-500 text-center py-3">
                          Selecciona materiales en la columna derecha para
                          agregar elementos personalizados
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Precio Final */}
                <div className="rounded-md border border-slate-300 bg-slate-50 px-4 py-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-slate-700">
                      <span>Materiales base</span>
                      <span className="font-medium">
                        {formatCurrency(totalMateriales)}
                      </span>
                    </div>
                    {margenParaMateriales > 0 && (
                      <div className="flex items-center justify-between text-sm text-slate-700">
                        <span>
                          Margen sobre materiales ({porcentajeMargenMateriales}
                          %)
                        </span>
                        <span className="font-medium">
                          {formatCurrency(margenParaMateriales)}
                        </span>
                      </div>
                    )}
                    {margenParaInstalacion > 0 && (
                      <div className="flex items-center justify-between text-sm text-slate-700">
                        <span>
                          Servicio de instalación y montaje (
                          {porcentajeMargenInstalacion}%)
                        </span>
                        <span className="font-medium">
                          {formatCurrency(margenParaInstalacion)}
                        </span>
                      </div>
                    )}
                    {descuentoPorcentaje > 0 && (
                      <div className="flex items-center justify-between text-sm text-purple-700 bg-purple-100 rounded px-2 py-1">
                        <span>Descuento ({descuentoPorcentaje}%)</span>
                        <span className="font-medium">
                          - {formatCurrency(montoDescuento)}
                        </span>
                      </div>
                    )}
                    {costoTransportacion > 0 && (
                      <div className="flex items-center justify-between text-sm text-slate-700">
                        <span>Transportación</span>
                        <span className="font-medium">
                          {formatCurrency(costoTransportacion)}
                        </span>
                      </div>
                    )}
                    {totalElementosPersonalizados > 0 && (
                      <div className="flex items-center justify-between text-sm text-slate-700">
                        <span>Elementos Personalizados</span>
                        <span className="font-medium">
                          {formatCurrency(totalElementosPersonalizados)}
                        </span>
                      </div>
                    )}
                    {totalCostosExtras > 0 && (
                      <div className="flex items-center justify-between text-sm text-slate-700">
                        <span>Costos Extras</span>
                        <span className="font-medium">
                          {formatCurrency(totalCostosExtras)}
                        </span>
                      </div>
                    )}
                    <div className="pt-2 border-t-2 border-slate-300 space-y-2">
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={pagoTransferencia}
                            onChange={(e) => {
                              setPagoTransferencia(e.target.checked);
                              if (!e.target.checked) setDatosCuenta("");
                            }}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          Pago por transferencia
                        </label>
                        {pagoTransferencia && (
                          <div className="space-y-1">
                            <span className="text-xs text-slate-500">
                              Datos de la cuenta
                            </span>
                            <Textarea
                              value={datosCuenta}
                              onChange={(e) => setDatosCuenta(e.target.value)}
                              placeholder="Banco, titular, número de cuenta, etc."
                              className="min-h-[90px]"
                            />
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={formasPagoAcordadas}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setFormasPagoAcordadas(checked);
                              if (!checked) {
                                setCantidadPagosAcordados(0);
                                setPagosAcordados([]);
                                return;
                              }
                              if (cantidadPagosAcordados <= 0) {
                                ajustarCantidadPagosAcordados(1);
                              }
                            }}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          Formas de pago acordadas
                        </label>

                        {formasPagoAcordadas && (
                          <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                            <div className="flex items-end justify-between gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs text-slate-600">
                                  Cantidad de pagos acordados
                                </Label>
                                <p className="text-[11px] text-slate-500">
                                  Debe coincidir con el detalle de pagos.
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2"
                                  onClick={() =>
                                    ajustarCantidadPagosAcordados(
                                      Math.max(1, cantidadPagosAcordados - 1),
                                    )
                                  }
                                  disabled={cantidadPagosAcordados <= 1}
                                >
                                  -
                                </Button>
                                <Input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={cantidadPagosAcordados}
                                  onChange={(e) =>
                                    ajustarCantidadPagosAcordados(
                                      Number(e.target.value) || 0,
                                    )
                                  }
                                  className="h-8 w-24 text-right bg-white"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2"
                                  onClick={() =>
                                    ajustarCantidadPagosAcordados(
                                      cantidadPagosAcordados + 1,
                                    )
                                  }
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>

                            {pagosAcordados.map((pago, index) => (
                              <div
                                key={pago.id}
                                className="rounded-md border border-slate-200 bg-white p-3 space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-slate-700">
                                    Pago #{index + 1}
                                  </span>
                                  {pagosAcordados.length > 1 && (
                                    <button
                                      type="button"
                                      className="text-xs text-red-600 hover:text-red-700"
                                      onClick={() =>
                                        eliminarPagoAcordado(pago.id)
                                      }
                                    >
                                      Eliminar
                                    </button>
                                  )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                  <div className="space-y-1">
                                    <Label className="text-[11px] text-slate-600">
                                      Monto (USD)
                                    </Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      max={precioFinal}
                                      step="0.01"
                                      value={pago.monto_usd}
                                      onChange={(e) =>
                                        actualizarPagoAcordado(
                                          pago.id,
                                          "monto_usd",
                                          Number(e.target.value) || 0,
                                        )
                                      }
                                      className="h-8 bg-white"
                                      placeholder="0.00"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-[11px] text-slate-600">
                                      Método de pago
                                    </Label>
                                    <Select
                                      value={pago.metodo_pago}
                                      onValueChange={(value) =>
                                        actualizarPagoAcordado(
                                          pago.id,
                                          "metodo_pago",
                                          value as MetodoPagoAcordado,
                                        )
                                      }
                                    >
                                      <SelectTrigger className="h-8 bg-white">
                                        <SelectValue placeholder="Seleccionar" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="efectivo">
                                          Efectivo
                                        </SelectItem>
                                        <SelectItem value="transferencia">
                                          Transferencia
                                        </SelectItem>
                                        <SelectItem value="stripe">
                                          Stripe
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-[11px] text-slate-600">
                                      Fecha estimada
                                    </Label>
                                    <Input
                                      type="datetime-local"
                                      value={pago.fecha_estimada}
                                      onChange={(e) =>
                                        actualizarPagoAcordado(
                                          pago.id,
                                          "fecha_estimada",
                                          e.target.value,
                                        )
                                      }
                                      className="h-8 bg-white"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs">
                              <span className="text-slate-600">
                                Máximo por pago y suma total:{" "}
                                {formatCurrency(precioFinal)}
                              </span>
                              <div className="flex flex-col items-end gap-0.5">
                                <span
                                  className={`font-semibold ${
                                    sumaPagosSuperaPrecioFinal
                                      ? "text-red-600"
                                      : "text-slate-900"
                                  }`}
                                >
                                  Suma actual:{" "}
                                  {formatCurrency(sumaPagosAcordadosActual)}
                                </span>
                                {restantePagosAcordados >= 0 ? (
                                  <span className="text-slate-700">
                                    Restante por acordar:{" "}
                                    {formatCurrency(restantePagosAcordados)}
                                  </span>
                                ) : (
                                  <span className="text-red-600">
                                    Excedido por:{" "}
                                    {formatCurrency(
                                      Math.abs(restantePagosAcordados),
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-sm text-slate-700">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={aplicaContribucion}
                            onChange={(e) => {
                              setAplicaContribucion(e.target.checked);
                              if (!e.target.checked)
                                setPorcentajeContribucion(0);
                            }}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          Aplicar % de Contribución
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={porcentajeContribucion}
                          onChange={(e) =>
                            setPorcentajeContribucion(
                              Number(e.target.value) || 0,
                            )
                          }
                          className="h-8 w-[110px] text-right bg-white"
                          placeholder="0.00"
                          disabled={!aplicaContribucion}
                        />
                      </div>
                      {aplicaContribucion && porcentajeContribucion > 0 && (
                        <div className="flex items-center justify-between text-sm text-slate-700">
                          <span>Contribución</span>
                          <span className="font-medium">
                            {formatCurrency(
                              (subtotalConDescuento +
                                costoTransportacion +
                                totalElementosPersonalizados +
                                totalCostosExtras) *
                                (porcentajeContribucion / 100),
                            )}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-base font-bold text-emerald-900">
                          Precio Final
                        </span>
                        <span className="text-xl font-bold text-emerald-900">
                          {formatCurrency(precioFinal)}
                        </span>
                      </div>
                      {precioFinal !== totalSinRedondeo && (
                        <p className="text-xs text-slate-600 text-right mt-1">
                          (Redondeado desde {formatCurrency(totalSinRedondeo)})
                        </p>
                      )}
                      
                      {/* Mostrar compensación y asumido si existen */}
                      {(tieneCompensacion || tieneAsumidoPorEmpresa) && (
                        <div className="pt-2 mt-2 border-t border-slate-200 space-y-1">
                          {tieneCompensacion && montoCompensacion > 0 && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-orange-700">Compensación</span>
                              <span className="font-medium text-orange-700">
                                - {formatCurrency(montoCompensacion)}
                              </span>
                            </div>
                          )}
                          {tieneAsumidoPorEmpresa && montoAsumidoPorEmpresa > 0 && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-blue-700">Asumido por Empresa</span>
                              <span className="font-medium text-blue-700">
                                - {formatCurrency(montoAsumidoPorEmpresa)}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-2 border-t border-orange-200 bg-orange-50 px-3 py-2 rounded-md">
                            <span className="text-base font-bold text-orange-900">
                              Monto Pendiente
                            </span>
                            <span className="text-xl font-bold text-orange-900">
                              {formatCurrency(montoPendiente)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-sm text-slate-700">
                        <span>Moneda de pago</span>
                        <Select
                          value={monedaPago}
                          onValueChange={(value) => {
                            setMonedaPago(value as "USD" | "EUR" | "CUP");
                            if (value === "USD") setTasaCambio("");
                          }}
                        >
                          <SelectTrigger className="h-8 w-[140px] bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">Dólares (USD)</SelectItem>
                            <SelectItem value="EUR">Euros (EUR)</SelectItem>
                            <SelectItem value="CUP">CUP</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {monedaPago !== "USD" && (
                        <div className="flex items-center justify-between text-sm text-slate-700">
                          <span>
                            {monedaPago === "EUR" ? "1 EUR =" : "1 USD ="}
                          </span>
                          <div className="flex items-center gap-2">
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={tasaCambio}
                              onChange={(e) => {
                                const next = e.target.value.replace(",", ".");
                                if (/^\d*([.]?\d{0,4})?$/.test(next)) {
                                  setTasaCambio(next);
                                }
                              }}
                              placeholder="0.0000"
                              className="h-8 w-[140px] bg-white text-right"
                            />
                            <span className="text-xs font-semibold text-slate-600">
                              {monedaPago === "EUR" ? "USD" : "CUP"}
                            </span>
                          </div>
                        </div>
                      )}

                      {mostrarCambio && (
                        <div className="flex items-center justify-between text-sm text-slate-700">
                          <span>Precio en {monedaPago}</span>
                          <span className="font-semibold text-slate-900">
                            {formatCurrencyWithSymbol(
                              montoConvertido,
                              monedaPago === "EUR" ? "€" : "CUP",
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Botón de Crear/Guardar Oferta */}
                {!ofertaCreada || modoEdicion ? (
                  <Button
                    onClick={handleCrearOferta}
                    disabled={
                      creandoOferta ||
                      items.length === 0 ||
                      !almacenId ||
                      (!ofertaGenerica &&
                        tipoContacto === "cliente" &&
                        !clienteId) ||
                      (!ofertaGenerica && tipoContacto === "lead" && !leadId) ||
                      (!ofertaGenerica &&
                        tipoContacto === "lead_sin_agregar" &&
                        !nombreLeadSinAgregar.trim())
                    }
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-base font-semibold"
                  >
                    {creandoOferta ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        {modoEdicion
                          ? "Guardando Oferta..."
                          : "Creando Oferta..."}
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5 mr-2" />
                        {modoEdicion ? "Guardar Oferta" : "Crear Oferta"}
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-md border-2 border-emerald-600 bg-emerald-50 px-4 py-3">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-emerald-900 mb-1">
                            Oferta Creada Exitosamente
                          </h4>
                          <p className="text-xs text-emerald-700 mb-2">
                            ID: {ofertaId}
                          </p>
                          <p className="text-xs text-emerald-700">
                            {nombreAutomatico}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={resetearOferta}
                        variant="outline"
                        className="flex-1"
                      >
                        Nueva Oferta
                      </Button>
                      {!materialesReservados && almacenId && (
                        <Button
                          onClick={handleReservarMateriales}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Lock className="h-4 w-4 mr-2" />
                          Reservar Materiales
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Botón de Reservar Materiales - Solo si la oferta ya está creada */}
                {ofertaCreada &&
                  items.length > 0 &&
                  almacenId &&
                  !materialesReservados && (
                    <div className="rounded-md border border-slate-300 bg-slate-50 px-4 py-3">
                      <p className="text-xs text-slate-600 text-center">
                        💡 Puedes reservar los materiales usando el botón de
                        arriba
                      </p>
                    </div>
                  )}

                {/* Sección de Reserva - Solo visible después de crear la oferta */}
                {ofertaCreada && items.length > 0 && almacenId && (
                  <div className="rounded-md border-2 border-blue-600 bg-blue-50 px-4 py-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Lock className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-blue-900 mb-1">
                            Reservar Materiales del Almacén
                          </h4>
                          {materialesReservados ? (
                            <div className="space-y-2">
                              <p className="text-xs text-blue-700">
                                Los materiales de esta oferta están reservados
                                en el almacén
                              </p>
                              {fechaExpiracionReserva && (
                                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                                  ⏰ Reserva temporal hasta:{" "}
                                  {fechaExpiracionReserva.toLocaleDateString(
                                    "es-ES",
                                    {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )}
                                </p>
                              )}
                              {!fechaExpiracionReserva && (
                                <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1">
                                  ✓ Reserva definitiva
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-blue-700">
                              Reserva los materiales para asegurar su
                              disponibilidad. Puedes elegir una reserva temporal
                              o definitiva.
                            </p>
                          )}
                        </div>
                      </div>

                      {materialesReservados ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
                            <CheckCircle className="h-4 w-4" />
                            <span className="font-medium">
                              {items.length} material
                              {items.length !== 1 ? "es" : ""} reservado
                              {items.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                          {fechaExpiracionReserva && (
                            <Button
                              onClick={cancelarReserva}
                              variant="outline"
                              className="w-full border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Cancelar Reserva
                            </Button>
                          )}
                        </div>
                      ) : (
                        <Button
                          onClick={handleReservarMateriales}
                          disabled={reservandoMateriales}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {reservandoMateriales ? (
                            <>
                              <span className="animate-spin mr-2">⏳</span>
                              Reservando...
                            </>
                          ) : (
                            <>
                              <Lock className="h-4 w-4 mr-2" />
                              Reservar {items.length} Material
                              {items.length !== 1 ? "es" : ""}
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Panel derecho: grid de materiales */}
          <div className="w-full flex-1 flex flex-col bg-white h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              {/* Buscador y selector de almacén */}
              <div className="sticky top-0 z-10 px-6 py-4 border-b bg-white space-y-3">
                {/* Selector de almacén */}
                <div className="flex items-center gap-3">
                  <label className="text-sm font-semibold text-slate-700 whitespace-nowrap">
                    Almacén:
                  </label>
                  <Select value={almacenId} onValueChange={setAlmacenId}>
                    <SelectTrigger
                      className={`w-full max-w-[300px] h-9 ${!almacenId ? "border-orange-300 bg-orange-50" : ""}`}
                    >
                      <SelectValue placeholder="Seleccionar almacén" />
                    </SelectTrigger>
                    <SelectContent>
                      {almacenes.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500">
                          No hay almacenes disponibles
                        </div>
                      ) : (
                        almacenes.map((almacen) => (
                          <SelectItem key={almacen.id} value={almacen.id ?? ""}>
                            {almacen.nombre}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {almacenId && (
                    <Badge variant="outline" className="text-xs">
                      {materialesConStock.length} materiales con stock
                    </Badge>
                  )}
                </div>

                {/* Buscador */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Buscar materiales por descripción, código o categoría..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {mostrarElementosPersonalizados && (
                  <p className="text-xs text-blue-600 font-medium">
                    Modo: Elementos Personalizados - Haz clic en un material
                    para agregarlo
                  </p>
                )}
                {ofertaCreada && (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
                    <p className="text-xs text-emerald-700 font-medium">
                      ✓ Oferta creada - Para modificar, crea una nueva oferta
                    </p>
                  </div>
                )}
                {!almacenId && (
                  <p className="text-xs text-orange-600 font-medium">
                    ⚠️ Selecciona un almacén para ver los materiales disponibles
                  </p>
                )}
              </div>

              <div className="flex-1 px-6 py-4">
                {materialesFiltrados.length === 0 ? (
                  <div className="flex items-center justify-center min-h-full text-gray-400">
                    <div className="text-center">
                      <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-base font-medium text-gray-600 mb-1">
                        {searchQuery
                          ? "No se encontraron materiales"
                          : "No hay materiales disponibles"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {searchQuery
                          ? `No hay resultados para "${searchQuery}"`
                          : activeStep &&
                              "seccionData" in activeStep &&
                              activeStep.seccionData?.tipo === "extra"
                            ? `Esta es una sección de ${activeStep.seccionData.tipoExtra === "escritura" ? "texto" : "costos extras"}`
                            : `No hay materiales en ${activeStep?.label ?? "esta categoria"}`}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="px-4 sm:px-6 py-5 min-h-full">
                    <div className="grid grid-cols-2 2xl:grid-cols-4 gap-3 sm:gap-4">
                      {materialesFiltrados.map((material) => {
                        const key = mostrarElementosPersonalizados
                          ? `PERSONALIZADO:${material.codigo?.toString() ?? ""}`
                          : `${activeStep?.id ?? ""}:${material.codigo?.toString() ?? ""}`;
                        const selectedCount =
                          cantidadesPorMaterial.get(key) ?? 0;
                        return (
                          <Card
                            key={`${material.codigo}-${material.categoria}`}
                            className={`cursor-pointer hover:shadow-lg transition-shadow border border-slate-200 bg-white overflow-hidden ${
                              ofertaCreada
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                            }`}
                            onClick={() => {
                              if (ofertaCreada && !modoEdicion) return;
                              mostrarElementosPersonalizados
                                ? agregarMaterialPersonalizado(material)
                                : agregarMaterial(material);
                            }}
                          >
                            <CardContent className="p-3 flex flex-col h-full">
                              <div className="relative aspect-[4/3] bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden border border-slate-200">
                                {material.foto ? (
                                  <>
                                    <img
                                      src={material.foto}
                                      alt={material.descripcion}
                                      className="w-full h-full object-contain p-2"
                                      onError={(e) => {
                                        const target =
                                          e.target as HTMLImageElement;
                                        target.style.display = "none";
                                        const fallback =
                                          target.nextElementSibling as HTMLElement;
                                        if (fallback)
                                          fallback.classList.remove("hidden");
                                      }}
                                    />
                                    <div className="hidden w-full h-full items-center justify-center">
                                      <Package className="h-12 w-12 text-slate-300" />
                                    </div>
                                  </>
                                ) : (
                                  <Package className="h-12 w-12 text-slate-300" />
                                )}
                                {selectedCount ? (
                                  <span className="absolute top-2 right-2 rounded-full bg-orange-600 text-white text-xs font-bold px-2.5 py-1 shadow-lg border-2 border-white z-10">
                                    {selectedCount}
                                  </span>
                                ) : null}
                              </div>

                              {/* Badge de stock disponible - Movido fuera de la imagen */}
                              {almacenId &&
                                "stock_disponible" in material &&
                                typeof (material as any).stock_disponible ===
                                  "number" && (
                                  <div className="mb-2">
                                    <span
                                      className={`inline-block rounded-md text-white text-xs font-semibold px-2 py-1 shadow-sm ${
                                        (material as any).stock_disponible > 10
                                          ? "bg-emerald-600"
                                          : (material as any).stock_disponible >
                                              0
                                            ? "bg-amber-600"
                                            : "bg-red-600"
                                      }`}
                                    >
                                      Stock:{" "}
                                      {(material as any).stock_disponible}
                                    </span>
                                  </div>
                                )}

                              <div className="flex-1 flex flex-col min-h-0">
                                <h3
                                  className="font-medium text-sm line-clamp-2 text-slate-900 break-words mb-2"
                                  title={
                                    material.nombre || material.descripcion
                                  }
                                >
                                  {material.nombre || material.descripcion}
                                </h3>

                                <div className="mt-auto space-y-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-base font-semibold text-orange-600">
                                      $
                                      {material.precio
                                        ? material.precio.toFixed(2)
                                        : "0.00"}
                                    </p>
                                    {selectedCount > 0 && (
                                      <Badge className="bg-slate-900 text-white text-xs whitespace-nowrap flex-shrink-0">
                                        En oferta: {selectedCount}
                                      </Badge>
                                    )}
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className="text-xs border border-blue-200 text-blue-700 bg-blue-50 w-fit max-w-full truncate"
                                    title={material.categoria}
                                  >
                                    {material.categoria}
                                  </Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Diálogo para agregar sección personalizada */}
      <Dialog
        open={mostrarDialogoSeccion}
        onOpenChange={setMostrarDialogoSeccion}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agregar Sección Personalizada</DialogTitle>
            <DialogDescription>
              Crea una nueva sección para materiales específicos, notas
              adicionales o costos extras en tu oferta.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Nombre de la sección */}
            <div className="space-y-2">
              <Label htmlFor="nombre-seccion">Nombre de la sección *</Label>
              <Input
                id="nombre-seccion"
                value={nombreSeccionNueva}
                onChange={(e) => setNombreSeccionNueva(e.target.value)}
                placeholder="Ej: Instalación, Mano de obra, Notas adicionales..."
              />
            </div>

            {/* Tipo de sección */}
            <div className="space-y-2">
              <Label>Tipo de sección *</Label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setTipoSeccionNueva("materiales");
                    setTipoExtraSeccion(null);
                  }}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                    tipoSeccionNueva === "materiales"
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <Package className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                  <p className="font-semibold text-sm">Materiales</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Selecciona categorías de materiales para mostrar
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTipoSeccionNueva("extra");
                    setTipoExtraSeccion(null);
                  }}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                    tipoSeccionNueva === "extra"
                      ? "border-purple-500 bg-purple-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <Plus className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                  <p className="font-semibold text-sm">Extra</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Agrega texto o costos adicionales
                  </p>
                </button>
              </div>
            </div>

            {/* Configuración para materiales */}
            {tipoSeccionNueva === "materiales" && (
              <div className="space-y-2">
                <Label>Categorías de materiales a mostrar *</Label>
                <div className="border rounded-lg p-3 max-h-[300px] overflow-y-auto space-y-2">
                  {categoriasDisponibles.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">
                      No hay categorías disponibles
                    </p>
                  ) : (
                    categoriasDisponibles.map((categoria) => (
                      <label
                        key={categoria}
                        className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={categoriasSeleccionadas.includes(categoria)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCategoriasSeleccionadas((prev) => [
                                ...prev,
                                categoria,
                              ]);
                            } else {
                              setCategoriasSeleccionadas((prev) =>
                                prev.filter((c) => c !== categoria),
                              );
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{categoria}</span>
                      </label>
                    ))
                  )}
                </div>
                {categoriasSeleccionadas.length > 0 && (
                  <p className="text-xs text-slate-600">
                    {categoriasSeleccionadas.length} categoría(s)
                    seleccionada(s)
                  </p>
                )}
              </div>
            )}

            {/* Configuración para extras */}
            {tipoSeccionNueva === "extra" && (
              <div className="space-y-3">
                <Label>Tipo de contenido extra *</Label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setTipoExtraSeccion("escritura")}
                    className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                      tipoExtraSeccion === "escritura"
                        ? "border-green-500 bg-green-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <p className="font-semibold text-sm">Solo Escritura</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Campo de texto libre para notas o descripciones
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoExtraSeccion("costo")}
                    className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                      tipoExtraSeccion === "costo"
                        ? "border-orange-500 bg-orange-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <p className="font-semibold text-sm">Costo Extra</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Agrega costos con descripción, cantidad y precio
                    </p>
                  </button>
                </div>

                {tipoExtraSeccion === "escritura" && (
                  <div className="space-y-2">
                    <Label htmlFor="contenido-escritura">
                      Contenido inicial (opcional)
                    </Label>
                    <Textarea
                      id="contenido-escritura"
                      value={contenidoEscritura}
                      onChange={(e) => setContenidoEscritura(e.target.value)}
                      placeholder="Puedes agregar contenido inicial o dejarlo vacío para llenarlo después..."
                      className="min-h-[100px]"
                    />
                  </div>
                )}

                {tipoExtraSeccion === "costo" && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm text-slate-600">
                      Los costos se agregarán después de crear la sección.
                      Podrás añadir múltiples costos con descripción, cantidad y
                      precio unitario.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={cerrarDialogoSeccion}>
              Cancelar
            </Button>
            <Button onClick={agregarSeccionPersonalizada}>
              Agregar Sección
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para seleccionar tipo de reserva */}
      <Dialog
        open={mostrarDialogoReserva}
        onOpenChange={setMostrarDialogoReserva}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Tipo de Reserva de Materiales</DialogTitle>
            <DialogDescription>
              Selecciona si deseas reservar los materiales de forma temporal o
              definitiva.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-3">
              {/* Opción Temporal */}
              <button
                type="button"
                onClick={() => setTipoReserva("temporal")}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  tipoReserva === "temporal"
                    ? "border-amber-500 bg-amber-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                      tipoReserva === "temporal"
                        ? "border-amber-500"
                        : "border-slate-300"
                    }`}
                  >
                    {tipoReserva === "temporal" && (
                      <div className="h-3 w-3 rounded-full bg-amber-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-slate-900 mb-1">
                      Reserva Temporal
                    </p>
                    <p className="text-xs text-slate-600 mb-2">
                      Los materiales se reservan por un período específico. Al
                      vencer el plazo, la reserva se cancela automáticamente y
                      los materiales vuelven a estar disponibles.
                    </p>
                    {tipoReserva === "temporal" && (
                      <div className="mt-3 space-y-2">
                        <Label htmlFor="dias-reserva" className="text-xs">
                          Días de reserva:
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="dias-reserva"
                            type="number"
                            min="1"
                            max="365"
                            value={diasReserva}
                            onChange={(e) =>
                              setDiasReserva(Number(e.target.value) || 1)
                            }
                            className="h-9 w-24"
                          />
                          <span className="text-sm text-slate-600">
                            días (
                            {diasReserva === 1
                              ? "1 día"
                              : `${diasReserva} días`}
                            )
                          </span>
                        </div>
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                          ⏰ Expira el:{" "}
                          {new Date(
                            Date.now() + diasReserva * 24 * 60 * 60 * 1000,
                          ).toLocaleDateString("es-ES", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </button>

              {/* Opción Definitiva */}
              <button
                type="button"
                onClick={() => setTipoReserva("definitiva")}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  tipoReserva === "definitiva"
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                      tipoReserva === "definitiva"
                        ? "border-emerald-500"
                        : "border-slate-300"
                    }`}
                  >
                    {tipoReserva === "definitiva" && (
                      <div className="h-3 w-3 rounded-full bg-emerald-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-slate-900 mb-1">
                      Reserva Definitiva
                    </p>
                    <p className="text-xs text-slate-600">
                      Los materiales se reservan de forma permanente hasta que
                      se complete la oferta o se cancele manualmente. No hay
                      fecha de expiración automática.
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {/* Resumen de materiales */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-700 mb-2">
                Materiales a reservar:
              </p>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Total de materiales:</span>
                  <span className="font-semibold text-slate-900">
                    {items.length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Almacén:</span>
                  <span className="font-semibold text-slate-900">
                    {almacenes.find((a) => a.id === almacenId)?.nombre || "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={cerrarDialogoReserva}>
              Cancelar
            </Button>
            <Button
              onClick={confirmarReserva}
              disabled={!tipoReserva}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Lock className="h-4 w-4 mr-2" />
              Confirmar Reserva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
