"use client";

import { Card, CardContent } from "@/components/shared/molecule/card";
import { Badge } from "@/components/shared/atom/badge";
import { Button } from "@/components/shared/atom/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/shared/molecule/dialog";
import { Input } from "@/components/shared/atom/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import { Loader } from "@/components/shared/atom/loader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/molecule/table";
import { EditarOfertaDialog } from "./editar-oferta-dialog";
import { ExportSelectionDialog } from "./export-selection-dialog";
import {
  useOfertasConfeccion,
  normalizeOfertaConfeccion,
  type OfertaConfeccion,
} from "@/hooks/use-ofertas-confeccion";
import {
  useOfertasListado,
  useOpcionesComponentes,
  type OfertaListadoItem,
} from "@/hooks/use-ofertas-listado";
import { apiRequest } from "@/lib/api-config";
import { useMaterials } from "@/hooks/use-materials";
import { useMarcas } from "@/hooks/use-marcas";
import {
  buildTerminosCondicionesHtml,
  type TerminosCondicionesPayload,
} from "@/lib/utils/terminos-condiciones-export";
import { ClienteService } from "@/lib/services/feats/customer/cliente-service";
import { LeadService } from "@/lib/services/feats/leads/lead-service";
import { InventarioService } from "@/lib/services/feats/inventario/inventario-service";
import type { Cliente } from "@/lib/types/feats/customer/cliente-types";
import type { Almacen } from "@/lib/inventario-types";
import {
  Building2,
  FileText,
  Package,
  Search,
  Download,
  Edit,
  Trash2,
  Copy,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const CODIGO_BATERIA_ESPECIAL_NOMBRE = "FLS48100SCG01";

export function OfertasConfeccionadasView() {
  const router = useRouter();

  // Listado paginado con filtros en backend
  const {
    ofertas,
    total,
    totalPaginas,
    pagina,
    loading,
    setFiltros,
    irAPagina,
    refetch,
  } = useOfertasListado();
  const opcionesComponentes = useOpcionesComponentes();


  const { materials } = useMaterials();
  const { marcas } = useMarcas();

  // Estados de filtros individuales (se sincronizan al backend con debounce)
  const [searchQuery, setSearchQuery] = useState("");
  const [searchPrecioFinal, setSearchPrecioFinal] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [tipoFiltro, setTipoFiltro] = useState("todas");
  const [almacenFiltro, setAlmacenFiltro] = useState("todos");
  const [inversorFiltro, setInversorFiltro] = useState("todos");
  const [cantidadInversorFiltro, setCantidadInversorFiltro] = useState("");
  const [bateriaFiltro, setBateriaFiltro] = useState("todos");
  const [cantidadBateriaFiltro, setCantidadBateriaFiltro] = useState("");
  const [panelFiltro, setPanelFiltro] = useState("todos");
  const [cantidadPanelFiltro, setCantidadPanelFiltro] = useState("");

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);

  // Estado para carga de oferta completa en diálogos (export/edit/detail)
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [detalleAbierto, setDetalleAbierto] = useState(false);
  const [ofertaSeleccionada, setOfertaSeleccionada] =
    useState<OfertaConfeccion | null>(null);
  const [mostrarDialogoExportar, setMostrarDialogoExportar] = useState(false);
  const [ofertaParaExportar, setOfertaParaExportar] =
    useState<OfertaConfeccion | null>(null);
  const [mostrarDialogoEditar, setMostrarDialogoEditar] = useState(false);
  const [ofertaParaEditar, setOfertaParaEditar] =
    useState<OfertaConfeccion | null>(null);
  const [mostrarDialogoEliminar, setMostrarDialogoEliminar] = useState(false);
  const [ofertaParaEliminar, setOfertaParaEliminar] =
    useState<OfertaListadoItem | null>(null);
  const [eliminandoOferta, setEliminandoOferta] = useState(false);
  const [terminosCondicionesPayload, setTerminosCondicionesPayload] =
    useState<TerminosCondicionesPayload | null>(null);

  const getEstadoBadge = (estado: string) => {
    const badges = {
      en_revision: {
        label: "En Revisión",
        className: "bg-yellow-100 text-yellow-800",
      },
      aprobada_para_enviar: {
        label: "Aprobada",
        className: "bg-blue-100 text-blue-800",
      },
      enviada_a_cliente: {
        label: "Enviada",
        className: "bg-purple-100 text-purple-800",
      },
      confirmada_por_cliente: {
        label: "Confirmada",
        className: "bg-green-100 text-green-800",
      },
      reservada: {
        label: "Reservada",
        className: "bg-orange-100 text-orange-800",
      },
      rechazada: { label: "Rechazada", className: "bg-red-100 text-red-800" },
      cancelada: {
        label: "Cancelada",
        className: "bg-slate-200 text-slate-700",
      },
      agotada: {
        label: "Agotada",
        className: "bg-gray-100 text-gray-800",
      },
    };
    return badges[estado as keyof typeof badges] || badges.en_revision;
  };

  const formatCurrency = (value: number) => {
    return `$${new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)}`;
  };

  const formatCurrencyWithSymbol = (value: number, symbol: string) => {
    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
    return symbol === "CUP" ? `${formatted} CUP` : `${symbol}${formatted}`;
  };

  const formatDateTime = (value?: string) => {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("es-ES", {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  const formatDateOnly = (value?: string) => {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("es-ES", {
      dateStyle: "short",
    });
  };

  const almacenesDisponibles = useMemo(() => {
    return almacenes.map((almacen) => ({
      id: almacen.id,
      nombre: almacen.nombre || almacen.id,
    }));
  }, [almacenes]);

  // Cargar clientes, leads y almacenes
  useEffect(() => {
    const loadClientes = async () => {
      try {
        const data = await ClienteService.getClientes();
        // El servicio devuelve { clients: Cliente[], total, skip, limit }
        setClientes(data.clients || []);
      } catch (error) {
        setClientes([]);
      }
    };
    const loadLeads = async () => {
      try {
        const { leads } = await LeadService.getLeads();
        setLeads(Array.isArray(leads) ? leads : []);
      } catch (error) {
        setLeads([]);
      }
    };
    const loadAlmacenes = async () => {
      try {
        const data = await InventarioService.getAlmacenes();
        setAlmacenes(Array.isArray(data) ? data : []);
      } catch (error) {
        setAlmacenes([]);
      }
    };
    loadClientes();
    loadLeads();
    loadAlmacenes();
  }, []);

  // Sincronizar cambios de filtros con el backend (debounce en el hook)
  useEffect(() => {
    setFiltros({
      busqueda: searchQuery,
      precioMax: searchPrecioFinal,
      estado: estadoFiltro === "todos" ? "" : estadoFiltro,
      tipo: tipoFiltro === "todas" ? "" : tipoFiltro,
      almacenId: almacenFiltro === "todos" ? "" : almacenFiltro,
      inversorCodigo: inversorFiltro === "todos" ? "" : inversorFiltro,
      cantidadInversores: cantidadInversorFiltro,
      bateriaCodigo: bateriaFiltro === "todos" ? "" : bateriaFiltro,
      cantidadBaterias: cantidadBateriaFiltro,
      panelCodigo: panelFiltro === "todos" ? "" : panelFiltro,
      cantidadPaneles: cantidadPanelFiltro,
    });
  }, [
    searchQuery,
    searchPrecioFinal,
    estadoFiltro,
    tipoFiltro,
    almacenFiltro,
    inversorFiltro,
    cantidadInversorFiltro,
    bateriaFiltro,
    cantidadBateriaFiltro,
    panelFiltro,
    cantidadPanelFiltro,
    setFiltros,
  ]);

  // Cargar términos y condiciones
  useEffect(() => {
    const cargarTerminos = async () => {
      try {
        const result = await apiRequest<{
          success: boolean;
          data?: TerminosCondicionesPayload;
        }>("/terminos-condiciones/activo", {
          method: "GET",
        });

        if (result.success && result.data) {
          console.log("✅ Términos y condiciones cargados");
          setTerminosCondicionesPayload(result.data);
        } else {
          console.warn("⚠️ No se encontraron términos y condiciones activos");
          setTerminosCondicionesPayload(null);
        }
      } catch (error) {
        console.error("❌ Error cargando términos y condiciones:", error);
        setTerminosCondicionesPayload(null);
      }
    };
    cargarTerminos();
  }, []);

  // Recargar ofertas solo cuando la página se vuelve visible después de estar oculta por más de 5 minutos
  useEffect(() => {
    let lastHiddenTime: number | null = null;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        lastHiddenTime = Date.now();
      } else if (document.visibilityState === "visible" && lastHiddenTime) {
        const timeDiff = Date.now() - lastHiddenTime;
        // Solo refrescar si estuvo oculta por más de 5 minutos (300000 ms)
        if (timeDiff > 300000) {
          refetch();
        }
        lastHiddenTime = null;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refetch]);

  // Mapas de búsqueda
  const clienteNombrePorOferta = useMemo(() => {
    const map = new Map<string, string>();
    clientes.forEach((cliente) => {
      if (cliente.id && cliente.nombre) {
        map.set(cliente.id, cliente.nombre);
      }
      if (cliente.numero && cliente.nombre) {
        map.set(cliente.numero, cliente.nombre);
      }
    });
    return map;
  }, [clientes]);

  const leadPorId = useMemo(() => {
    const map = new Map<string, any>();
    leads.forEach((lead) => {
      if (lead.id) {
        map.set(lead.id, lead);
      }
    });
    return map;
  }, [leads]);

  // Opciones de materiales para filtros: vienen del backend (useOpcionesComponentes)
  const opcionesMaterialesPrincipales = useMemo(() => ({
    inversores: opcionesComponentes.inversores.map((o) => ({
      codigo: o.codigo,
      label: o.descripcion ? `${o.codigo} - ${o.descripcion}` : o.codigo,
    })),
    baterias: opcionesComponentes.baterias.map((o) => ({
      codigo: o.codigo,
      label: o.descripcion ? `${o.codigo} - ${o.descripcion}` : o.codigo,
    })),
    paneles: opcionesComponentes.paneles.map((o) => ({
      codigo: o.codigo,
      label: o.descripcion ? `${o.codigo} - ${o.descripcion}` : o.codigo,
    })),
  }), [opcionesComponentes]);

  const clientePorOferta = useMemo(() => {
    const map = new Map<string, Cliente>();
    clientes.forEach((cliente) => {
      if (cliente.id) map.set(cliente.id, cliente);
      if (cliente.numero) map.set(cliente.numero, cliente);
    });
    return map;
  }, [clientes]);

  const almacenNombrePorId = useMemo(() => {
    const map = new Map<string, string>();
    almacenes.forEach((almacen) => {
      if (almacen.id && almacen.nombre) {
        map.set(almacen.id, almacen.nombre);
      }
    });
    return map;
  }, [almacenes]);

  const materialesMap = useMemo(() => {
    const map = new Map<
      string,
      { foto?: string; nombre?: string; descripcion?: string }
    >();
    materials.forEach((material) => {
      const codigo = material.codigo?.toString();
      if (!codigo) return;
      map.set(codigo, {
        foto: material.foto,
        nombre: material.nombre,
        descripcion: material.descripcion,
      });
    });
    return map;
  }, [materials]);

  const calcularTotalesDetalle = (oferta: OfertaConfeccion) => {
    const base =
      (oferta.subtotal_con_margen || 0) +
      (oferta.costo_transportacion || 0) +
      (oferta.total_elementos_personalizados || 0) +
      (oferta.total_costos_extras || 0);
    const porcentaje = oferta.porcentaje_contribucion || 0;
    const contribucion = oferta.aplica_contribucion
      ? base * (porcentaje / 100)
      : 0;
    const totalSinRedondeo = base + contribucion;
    const redondeo = (oferta.precio_final || 0) - totalSinRedondeo;
    return { base, contribucion, totalSinRedondeo, redondeo };
  };

  const calcularConversion = (oferta: OfertaConfeccion) => {
    const moneda = oferta.moneda_pago || "USD";
    const tasa = oferta.tasa_cambio || 0;
    if (moneda === "USD" || tasa <= 0) return null;
    const base = oferta.precio_final || 0;
    const convertido = moneda === "EUR" ? base / tasa : base * tasa;
    return { moneda, tasa, convertido };
  };

  const totalesDetalle = useMemo(() => {
    if (!ofertaSeleccionada) return null;
    return calcularTotalesDetalle(ofertaSeleccionada);
  }, [ofertaSeleccionada]);

  const conversionDetalle = useMemo(() => {
    if (!ofertaSeleccionada) return null;
    return calcularConversion(ofertaSeleccionada);
  }, [ofertaSeleccionada]);

  const materialesEntregadosDetalle = useMemo(() => {
    if (!ofertaSeleccionada) return [];
    return (ofertaSeleccionada.items || []).map((item, index) => {
      const entregas = Array.isArray(item.entregas)
        ? item.entregas.map((entrega) => ({
            cantidad: Number(entrega?.cantidad || 0),
            fecha: entrega?.fecha || "",
          }))
        : [];
      const totalEntregado = entregas.reduce(
        (sum, entrega) => sum + (Number(entrega.cantidad) || 0),
        0,
      );
      const pendienteCalculado = Math.max(
        0,
        (Number(item.cantidad) || 0) - totalEntregado,
      );
      const pendiente =
        Number.isFinite(Number(item.cantidad_pendiente_por_entregar)) &&
        item.cantidad_pendiente_por_entregar !== undefined
          ? Number(item.cantidad_pendiente_por_entregar)
          : pendienteCalculado;

      return {
        id: `${item.material_codigo || "sin-codigo"}-${index}`,
        descripcion: item.descripcion || "Material sin descripción",
        material_codigo: item.material_codigo || "--",
        cantidadTotal: Number(item.cantidad) || 0,
        totalEntregado,
        cantidadPendiente: pendiente,
        entregas,
      };
    });
  }, [ofertaSeleccionada]);

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

  // Mapa de secciones
  const seccionLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    const secciones = [
      { id: "INVERSORES", label: "Inversores" },
      { id: "BATERIAS", label: "Baterías" },
      { id: "PANELES", label: "Paneles" },
      { id: "MPPT", label: "MPPT" },
      { id: "ESTRUCTURAS", label: "Estructuras" },
      { id: "CABLEADO_DC", label: "Cableado DC" },
      { id: "CABLEADO_AC", label: "Cableado AC" },
      { id: "CANALIZACION", label: "Canalización" },
      { id: "TIERRA", label: "Tierra" },
      {
        id: "PROTECCIONES_ELECTRICAS",
        label: "Protecciones Eléctricas y Gabinetes",
      },
      { id: "MATERIAL_VARIO", label: "Material vario" },
    ];
    secciones.forEach((s) => map.set(s.id, s.label));
    return map;
  }, []);

  // Generar opciones de exportación para una oferta
  const generarOpcionesExportacion = (oferta: OfertaConfeccion) => {
    const terminosCondicionesExport = buildTerminosCondicionesHtml(
      terminosCondicionesPayload,
      { oferta },
    );

    const cliente =
      clientePorOferta.get(oferta.cliente_id || "") ||
      clientePorOferta.get(oferta.cliente_numero || "");
    const lead = oferta.lead_id ? leadPorId.get(oferta.lead_id) : null;

    // Orden de secciones (mismo orden que en confección de ofertas)
    const ordenSeccionesBase = [
      "INVERSORES",
      "BATERIAS",
      "PANELES",
      "MPPT",
      "ESTRUCTURAS",
      "CABLEADO_DC",
      "CABLEADO_AC",
      "CANALIZACION",
      "TIERRA",
      "PROTECCIONES_ELECTRICAS",
      "MATERIAL_VARIO",
    ];

    // Agregar secciones personalizadas al final si existen
    const seccionesPersonalizadasOferta = oferta.secciones_personalizadas || [];
    const ordenSecciones = [
      ...ordenSeccionesBase,
      ...seccionesPersonalizadasOferta.map((s: any) => s.id),
    ];

    // Función para ordenar items por sección
    const ordenarItemsPorSeccion = (items: any[]) => {
      return [...items].sort((a, b) => {
        const indexA = ordenSecciones.indexOf(a.seccion);
        const indexB = ordenSecciones.indexOf(b.seccion);

        // Si la sección no está en el orden predefinido, ponerla al final
        const posA = indexA === -1 ? 999 : indexA;
        const posB = indexB === -1 ? 999 : indexB;

        return posA - posB;
      });
    };

    // Ordenar items de la oferta
    const itemsOrdenados = ordenarItemsPorSeccion(oferta.items || []);

    // Crear mapa de fotos
    const fotosMap = new Map<string, string>();
    itemsOrdenados.forEach((item) => {
      const material = materials.find(
        (m) => m.codigo.toString() === item.material_codigo,
      );
      if (material?.foto) {
        fotosMap.set(item.material_codigo?.toString(), material.foto);
      }
    });

    // Generar nombre base del archivo usando el mismo formato que en confección
    let baseFilename = oferta.nombre
      .replace(/[<>:"/\\|?*]/g, "") // Eliminar caracteres no válidos en nombres de archivo
      .replace(/\s+/g, "_") // Reemplazar espacios con guiones bajos
      .replace(/,\s*/g, "+") // Reemplazar comas con + para el formato I-1x10kW+B-1x10kWh+P-14x590W
      .replace(/_+/g, "_") // Reemplazar múltiples guiones bajos con uno solo
      .trim();

    // Si es personalizada, agregar nombre del cliente/lead
    if (oferta.tipo === "personalizada") {
      let nombreContacto = "";

      if (cliente?.nombre) {
        nombreContacto = cliente.nombre;
      } else if (lead?.nombre_completo || lead?.nombre) {
        nombreContacto = lead.nombre_completo || lead.nombre;
      } else if (oferta.nombre_lead_sin_agregar) {
        nombreContacto = oferta.nombre_lead_sin_agregar;
      }

      if (nombreContacto) {
        const nombreLimpio = nombreContacto
          .replace(/[<>:"/\\|?*]/g, "")
          .replace(/\s+/g, "_")
          .replace(/_+/g, "_")
          .trim();
        baseFilename = `${baseFilename}-${nombreLimpio}`;
      }
    }

    // Calcular margen por material (simplificado - en la oferta guardada ya viene calculado)
    const margenPorMaterial = new Map<string, number>();
    itemsOrdenados.forEach((item) => {
      // El margen ya está incluido en el precio final de cada item
      margenPorMaterial.set(item.material_codigo?.toString(), 0);
    });

    const tasaCambioNumero = oferta.tasa_cambio || 0;
    const montoConvertido =
      tasaCambioNumero > 0 && oferta.moneda_pago !== "USD"
        ? oferta.moneda_pago === "EUR"
          ? (oferta.precio_final || 0) / tasaCambioNumero
          : (oferta.precio_final || 0) * tasaCambioNumero
        : 0;
    const tieneMonedaCambio =
      oferta.moneda_pago !== "USD" && tasaCambioNumero > 0;
    const codigoMonedaCambio = tieneMonedaCambio ? oferta.moneda_pago : "USD";
    const simboloMonedaCambio =
      oferta.moneda_pago === "EUR"
        ? "€"
        : oferta.moneda_pago === "CUP"
          ? "CUP"
          : "$";
    const convertirMontoMonedaPago = (monto: number) => {
      if (!tieneMonedaCambio) return monto;
      return oferta.moneda_pago === "EUR"
        ? monto / tasaCambioNumero
        : monto * tasaCambioNumero;
    };
    const convertirTextoTotalMonedaPago = (valor: unknown) => {
      if (
        !tieneMonedaCambio ||
        valor === null ||
        valor === undefined ||
        valor === ""
      ) {
        return valor;
      }

      if (typeof valor === "number") {
        return convertirMontoMonedaPago(valor).toFixed(2);
      }

      const valorStr = valor.toString().trim();
      const esNegativo = valorStr.startsWith("-");
      const normalizado = valorStr.replace(",", ".").replace(/[^0-9.-]/g, "");
      const numero = Number.parseFloat(normalizado);

      if (!Number.isFinite(numero)) return valor;

      const montoBase = esNegativo ? -Math.abs(numero) : numero;
      const convertido = convertirMontoMonedaPago(montoBase);
      const textoMonto = Math.abs(convertido).toFixed(2);
      return convertido < 0 ? `- ${textoMonto}` : textoMonto;
    };

    // Debug: ver campos de descuento de la oferta
    console.log("🔍 DEBUG - Oferta completa:", oferta);
    console.log("🔍 DEBUG - Descuento:", {
      descuento_porcentaje: oferta.descuento_porcentaje,
      monto_descuento: oferta.monto_descuento,
      subtotal_con_descuento: oferta.subtotal_con_descuento,
    });

    // Extraer componentes principales del nombre_completo de la oferta
    const componentesPrincipales: any = {};
    const nombreCompleto = oferta.nombre_completo || oferta.nombre || "";

    console.log("📝 Extrayendo componentes de:", nombreCompleto);

    // Extraer batería (buscar patrón como "16.0kWh Batería" o "1x 16.0kWh")
    const bateriaMatch =
      nombreCompleto.match(
        /(\d+)x?\s*(\d+(?:\.\d+)?)\s*kwh\s+(?:de\s+)?bater[ií]a/i,
      ) ||
      nombreCompleto.match(/(\d+(?:\.\d+)?)\s*kwh\s+(?:de\s+)?bater[ií]a/i);

    if (bateriaMatch) {
      let cantidad = 1;
      let capacidad = 0;

      if (bateriaMatch[2]) {
        // Formato: "1x 16.0kWh"
        cantidad = parseInt(bateriaMatch[1]);
        capacidad = parseFloat(bateriaMatch[2]);
      } else {
        // Formato: "16.0kWh"
        capacidad = parseFloat(bateriaMatch[1]);
      }

      componentesPrincipales.bateria = {
        cantidad: cantidad,
        capacidad: capacidad,
      };

      console.log("🔋 Batería extraída:", componentesPrincipales.bateria);
    }

    // Extraer inversor (buscar patrón como "10kW" o "10.0kW")
    const inversorMatch = nombreCompleto.match(
      /(\d+(?:\.\d+)?)\s*kw\s+(?:de\s+)?inversor/i,
    );
    if (inversorMatch) {
      const potencia = parseFloat(inversorMatch[1]);

      // Buscar marca en el nombre
      const marcaMatch = nombreCompleto.match(
        /(?:inversor|fabricante)\s+(\w+)/i,
      );
      const marca = marcaMatch ? marcaMatch[1] : undefined;

      componentesPrincipales.inversor = {
        cantidad: 1,
        potencia: potencia,
        marca: marca,
      };
    }

    // Extraer paneles (buscar patrón como "20x 590W" o "590W Panel")
    const panelMatch =
      nombreCompleto.match(
        /(\d+)x?\s*(\d+(?:\.\d+)?)\s*w\s+(?:de\s+)?panel/i,
      ) || nombreCompleto.match(/(\d+(?:\.\d+)?)\s*w\s+(?:de\s+)?panel/i);

    if (panelMatch) {
      let cantidad = 1;
      let potencia = 0;

      if (panelMatch[2]) {
        // Formato: "20x 590W"
        cantidad = parseInt(panelMatch[1]);
        potencia = parseFloat(panelMatch[2]);
      } else {
        // Formato: "590W"
        potencia = parseFloat(panelMatch[1]);
      }

      componentesPrincipales.panel = {
        cantidad: cantidad,
        potencia: potencia,
      };
    }

    const componentesGuardados = oferta.componentes_principales || {};
    const normalizarCodigo = (value: unknown) =>
      (value ?? "").toString().trim();
    const seleccionarItemsComponente = (
      seccion: string,
      codigoSeleccionado?: string,
    ) => {
      const itemsSeccion = itemsOrdenados.filter(
        (item) => item.seccion === seccion,
      );
      if (itemsSeccion.length === 0) return [];

      const codigoSeleccionadoNorm = normalizarCodigo(codigoSeleccionado);
      if (codigoSeleccionadoNorm) {
        const itemsSeleccionados = itemsSeccion.filter(
          (item) =>
            normalizarCodigo(item.material_codigo) === codigoSeleccionadoNorm,
        );
        if (itemsSeleccionados.length > 0) return itemsSeleccionados;
        console.warn(
          `⚠️ Código seleccionado ${codigoSeleccionadoNorm} no encontrado en ${seccion}. Se usa fallback.`,
        );
      }

      const codigoFallback = normalizarCodigo(itemsSeccion[0]?.material_codigo);
      return itemsSeccion.filter(
        (item) => normalizarCodigo(item.material_codigo) === codigoFallback,
      );
    };

    // Buscar inversor (sección INVERSORES): priorizar código seleccionado guardado
    const itemsInversores = seleccionarItemsComponente(
      "INVERSORES",
      componentesGuardados.inversor_seleccionado,
    );
    if (itemsInversores.length > 0) {
      const codigoInversor = normalizarCodigo(
        itemsInversores[0]?.material_codigo,
      );
      const cantidadInversor = itemsInversores.reduce(
        (sum, item) => sum + (Number(item.cantidad) || 0),
        0,
      );
      const material = materials.find(
        (m) => m.codigo.toString() === codigoInversor,
      );

      // Usar el campo potenciaKW del material directamente
      const potencia = material?.potenciaKW || 0;

      // Buscar marca del inversor
      const marcaId = material?.marca_id;
      const marca = marcaId ? marcasMap.get(marcaId) : undefined;

      componentesPrincipales.inversor = {
        codigo: codigoInversor,
        cantidad: cantidadInversor,
        potencia: potencia,
        marca: marca,
      };
    }

    // Buscar batería (sección BATERIAS): priorizar código seleccionado guardado
    const itemsBaterias = seleccionarItemsComponente(
      "BATERIAS",
      componentesGuardados.bateria_seleccionada,
    );
    if (itemsBaterias.length > 0) {
      const codigoBateria = normalizarCodigo(itemsBaterias[0]?.material_codigo);
      const cantidadBateriaSeleccionada = itemsBaterias.reduce(
        (sum, item) => sum + (Number(item.cantidad) || 0),
        0,
      );
      const materialSeleccionado = materials.find(
        (m) => m.codigo.toString() === codigoBateria,
      );
      const itemsBateriaEspecial = itemsOrdenados.filter(
        (item) =>
          item.seccion === "BATERIAS" &&
          normalizarCodigo(item.material_codigo) ===
            normalizarCodigo(CODIGO_BATERIA_ESPECIAL_NOMBRE) &&
          normalizarCodigo(item.material_codigo) !== codigoBateria,
      );
      const cantidadBateriaEspecial = itemsBateriaEspecial.reduce(
        (sum, item) => sum + (Number(item.cantidad) || 0),
        0,
      );
      const materialEspecial = materials.find(
        (m) => m.codigo.toString() === CODIGO_BATERIA_ESPECIAL_NOMBRE,
      );

      // Usar el campo potenciaKW del material directamente (para baterías es la capacidad en kWh)
      const capacidadSeleccionada = materialSeleccionado?.potenciaKW || 0;
      const capacidadEspecial =
        cantidadBateriaEspecial > 0 ? materialEspecial?.potenciaKW || 0 : 0;
      const cantidadBateria =
        cantidadBateriaSeleccionada + cantidadBateriaEspecial;
      const capacidadTotal =
        cantidadBateriaSeleccionada * capacidadSeleccionada +
        cantidadBateriaEspecial * capacidadEspecial;
      const capacidad =
        cantidadBateria > 0 ? capacidadTotal / cantidadBateria : 0;

      console.log("🔋 DEBUG Batería:", {
        material_codigo: codigoBateria,
        material_nombre: materialSeleccionado?.nombre,
        potenciaKW: materialSeleccionado?.potenciaKW,
        cantidad_sel: cantidadBateriaSeleccionada,
        capacidad_sel: capacidadSeleccionada,
        cantidad_fls: cantidadBateriaEspecial,
        capacidad_fls: capacidadEspecial,
        cantidad_total: cantidadBateria,
        capacidad_promedio: capacidad,
        capacidad_total: capacidadTotal,
        cantidad: cantidadBateria,
      });

      componentesPrincipales.bateria = {
        codigo: codigoBateria,
        cantidad: cantidadBateria,
        capacidad: capacidad,
      };
    }

    // Buscar paneles (sección PANELES): priorizar código seleccionado guardado
    const itemsPaneles = seleccionarItemsComponente(
      "PANELES",
      componentesGuardados.panel_seleccionado,
    );
    if (itemsPaneles.length > 0) {
      const codigoPanel = normalizarCodigo(itemsPaneles[0]?.material_codigo);
      const cantidadPanel = itemsPaneles.reduce(
        (sum, item) => sum + (Number(item.cantidad) || 0),
        0,
      );
      const material = materials.find(
        (m) => m.codigo.toString() === codigoPanel,
      );

      // Para paneles, potenciaKW está en kW, pero necesitamos en W para el cálculo
      const potenciaKW = material?.potenciaKW || 0;
      const potencia = potenciaKW * 1000;

      componentesPrincipales.panel = {
        codigo: codigoPanel,
        cantidad: cantidadPanel,
        potencia: potencia,
      };
    }

    // EXPORTACIÓN COMPLETA
    const rowsCompleto: any[] = [];
    itemsOrdenados.forEach((item) => {
      // Buscar el label de la sección (puede ser estándar o personalizada)
      let seccionLabel = seccionLabelMap.get(item.seccion) ?? item.seccion;

      // Si no está en el mapa estándar, buscar en secciones personalizadas
      if (
        seccionLabel === item.seccion &&
        seccionesPersonalizadasOferta.length > 0
      ) {
        const seccionPersonalizada = seccionesPersonalizadasOferta.find(
          (s: any) => s.id === item.seccion,
        );
        if (seccionPersonalizada) {
          seccionLabel = seccionPersonalizada.label;
        }
      }

      // Buscar el nombre del material
      const material = materialesMap.get(item.material_codigo?.toString());
      const nombreMaterial = material?.nombre || item.descripcion;

      // Obtener margen asignado desde el item (viene de la BD)
      const margenAsignado = (item as any).margen_asignado || 0;
      const costoItem = item.precio * item.cantidad;

      // Calcular porcentaje desde el margen asignado
      const porcentajeMargen =
        costoItem > 0 && margenAsignado > 0
          ? (margenAsignado / costoItem) * 100
          : 0;

      const esCableado =
        item.seccion === "CABLEADO_AC" || item.seccion === "CABLEADO_DC";
      rowsCompleto.push({
        material_codigo: item.material_codigo,
        seccion: seccionLabel,
        tipo: "Material",
        descripcion: nombreMaterial,
        cantidad: esCableado ? `hasta ${item.cantidad}` : item.cantidad,
        precio_unitario: item.precio.toFixed(2),
        porcentaje_margen: `${porcentajeMargen.toFixed(2)}%`,
        margen: margenAsignado.toFixed(2),
        total: (costoItem + margenAsignado).toFixed(2),
      });
    });

    // Calcular total de materiales (suma de todos los items)
    const totalMateriales = itemsOrdenados.reduce((sum, item) => {
      const margenAsignado = (item as any).margen_asignado || 0;
      const costoItem = item.precio * item.cantidad;
      return sum + costoItem + margenAsignado;
    }, 0);

    // Agregar secciones personalizadas de tipo costo
    if (seccionesPersonalizadasOferta.length > 0) {
      seccionesPersonalizadasOferta.forEach((seccion: any) => {
        if (
          seccion.tipo === "extra" &&
          seccion.tipo_extra === "costo" &&
          seccion.costos_extras
        ) {
          seccion.costos_extras.forEach((costo: any) => {
            rowsCompleto.push({
              material_codigo: "",
              seccion: seccion.label,
              tipo: "Costo extra",
              descripcion: costo.descripcion,
              cantidad: costo.cantidad,
              precio_unitario: costo.precio_unitario.toFixed(2),
              porcentaje_margen: "",
              margen: "",
              total: (costo.cantidad * costo.precio_unitario).toFixed(2),
            });
          });
        }
      });
    }

    // Agregar fila de total de materiales
    rowsCompleto.push({
      material_codigo: "",
      seccion: "Totales",
      tipo: "Subtotal",
      descripcion: "Total de materiales",
      cantidad: "",
      precio_unitario: "",
      porcentaje_margen: "",
      margen: "",
      total: totalMateriales.toFixed(2),
    });

    // Agregar servicio de instalación si existe
    console.log("🔍 DEBUG - Margen instalación:", {
      margen_instalacion: oferta.margen_instalacion,
      tiene_margen: oferta.margen_instalacion && oferta.margen_instalacion > 0,
      oferta_completa: oferta,
    });

    if (oferta.margen_instalacion && oferta.margen_instalacion > 0) {
      console.log("✅ Agregando servicio de instalación a rowsCompleto");
      rowsCompleto.push({
        material_codigo: "",
        seccion: "Servicios",
        tipo: "Servicio",
        descripcion: "Costo de instalación y puesta en marcha",
        cantidad: 1,
        precio_unitario: oferta.margen_instalacion.toFixed(2),
        porcentaje_margen: "",
        margen: "",
        total: oferta.margen_instalacion.toFixed(2),
      });
    }

    if (oferta.costo_transportacion && oferta.costo_transportacion > 0) {
      rowsCompleto.push({
        material_codigo: "",
        seccion: "Logística",
        tipo: "Transportación",
        descripcion: "Costo de transportación",
        cantidad: 1,
        precio_unitario: oferta.costo_transportacion.toFixed(2),
        porcentaje_margen: "",
        margen: "",
        total: oferta.costo_transportacion.toFixed(2),
      });
    }

    // Agregar descuento si existe
    const descuentoPorcentaje =
      parseFloat(oferta.descuento_porcentaje as any) || 0;
    const montoDescuento = parseFloat(oferta.monto_descuento as any) || 0;

    console.log("🔍 DEBUG Descuento:", {
      descuento_porcentaje_original: oferta.descuento_porcentaje,
      descuento_porcentaje_parseado: descuentoPorcentaje,
      monto_descuento_original: oferta.monto_descuento,
      monto_descuento_parseado: montoDescuento,
      tiene_descuento: descuentoPorcentaje > 0,
    });

    // Agregar contribución si aplica (ANTES del descuento)
    if (oferta.aplica_contribucion && oferta.porcentaje_contribucion) {
      const totalesCalc = calcularTotalesDetalle(oferta);
      rowsCompleto.push({
        material_codigo: "",
        seccion: "Contribución",
        tipo: "Contribucion",
        descripcion: `Contribución (${oferta.porcentaje_contribucion}%)`,
        cantidad: 1,
        precio_unitario: "",
        porcentaje_margen: "",
        margen: "",
        total: totalesCalc.contribucion.toFixed(2),
      });
    }

    if (descuentoPorcentaje > 0) {
      console.log("✅ Agregando descuento al PDF:", montoDescuento);
      rowsCompleto.push({
        material_codigo: "",
        seccion: "Descuento",
        tipo: "Descuento",
        descripcion: `Descuento aplicado (${descuentoPorcentaje}%)`,
        cantidad: 1,
        precio_unitario: "",
        porcentaje_margen: "",
        margen: "",
        total: `- ${montoDescuento.toFixed(2)}`,
      });
    }

    rowsCompleto.push({
      material_codigo: "",
      seccion: "Totales",
      tipo: "TOTAL",
      descripcion: "Precio final",
      cantidad: "",
      precio_unitario: "",
      porcentaje_margen: "",
      margen: "",
      total: (oferta.precio_final || 0).toFixed(2),
    });

    // Datos de pago
    if (
      oferta.pago_transferencia ||
      oferta.aplica_contribucion ||
      (oferta.moneda_pago !== "USD" && tasaCambioNumero > 0)
    ) {
      if (oferta.pago_transferencia) {
        rowsCompleto.push({
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

        if (oferta.datos_cuenta) {
          rowsCompleto.push({
            material_codigo: "",
            seccion: "PAGO",
            tipo: "Datos",
            descripcion: "Datos de la cuenta",
            cantidad: "",
            precio_unitario: "",
            porcentaje_margen: "",
            margen: "",
            total: oferta.datos_cuenta,
          });
        }
      }

      // Contribución ya se agregó arriba, antes del descuento

      rowsCompleto.push({
        material_codigo: "",
        seccion: "PAGO",
        tipo: "TOTAL",
        descripcion: "Precio Final",
        cantidad: "",
        precio_unitario: "",
        porcentaje_margen: "",
        margen: "",
        total: (oferta.precio_final || 0).toFixed(2),
      });

      const totalesCalc = calcularTotalesDetalle(oferta);
      if (Math.abs(totalesCalc.redondeo) > 0.01) {
        rowsCompleto.push({
          material_codigo: "",
          seccion: "PAGO",
          tipo: "Nota",
          descripcion: `(Redondeado desde ${totalesCalc.totalSinRedondeo.toFixed(2)} $)`,
          cantidad: "",
          precio_unitario: "",
          porcentaje_margen: "",
          margen: "",
          total: "",
        });
      }

      if (oferta.moneda_pago !== "USD" && tasaCambioNumero > 0) {
        const simboloMoneda = oferta.moneda_pago === "EUR" ? "€" : "CUP";
        const nombreMoneda =
          oferta.moneda_pago === "EUR" ? "Euros (EUR)" : "Pesos Cubanos (CUP)";

        rowsCompleto.push({
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
          oferta.moneda_pago === "EUR"
            ? `1 EUR = ${tasaCambioNumero} USD`
            : `1 USD = ${tasaCambioNumero} CUP`;

        rowsCompleto.push({
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

        rowsCompleto.push({
          material_codigo: "",
          seccion: "PAGO",
          tipo: "Conversión",
          descripcion: `Precio en ${oferta.moneda_pago}`,
          cantidad: "",
          precio_unitario: "",
          porcentaje_margen: "",
          margen: "",
          total: `${montoConvertido.toFixed(2)} ${simboloMoneda}`,
        });
      }
    }

    const exportOptionsCompleto = {
      title: "Oferta - Exportación completa",
      subtitle:
        oferta.nombre_completo &&
        oferta.nombre_completo !== "0.00" &&
        isNaN(Number(oferta.nombre_completo))
          ? oferta.nombre_completo
          : oferta.nombre,
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
      data: rowsCompleto,
      logoUrl: "/logo Suncar.png",
      clienteData:
        oferta.tipo === "personalizada" && cliente
          ? {
              numero: cliente.numero || cliente.id,
              nombre: cliente.nombre,
              carnet_identidad: cliente.carnet_identidad,
              telefono: cliente.telefono,
              provincia_montaje: cliente.provincia_montaje,
              direccion: cliente.direccion,
              atencion_de: cliente.nombre,
            }
          : undefined,
      leadData:
        oferta.tipo === "personalizada" && lead
          ? {
              id: lead.id,
              nombre: lead.nombre_completo || lead.nombre,
              telefono: lead.telefono,
              email: lead.email,
              provincia: lead.provincia,
              direccion: lead.direccion,
              atencion_de: lead.nombre_completo || lead.nombre,
            }
          : undefined,
      leadSinAgregarData:
        oferta.tipo === "personalizada" && oferta.nombre_lead_sin_agregar
          ? {
              nombre: oferta.nombre_lead_sin_agregar,
              atencion_de: oferta.nombre_lead_sin_agregar,
            }
          : undefined,
      ofertaData: {
        numero_oferta: oferta.numero_oferta || oferta.id,
        nombre_oferta: oferta.nombre_completo || oferta.nombre,
        tipo_oferta: oferta.tipo === "generica" ? "Genérica" : "Personalizada",
        estado: getEstadoBadge(oferta.estado).label,
      },
      incluirFotos: true,
      fotosMap,
      componentesPrincipales,
      terminosCondiciones: (() => {
        console.log(
          "📄 Pasando términos a exportOptionsCompleto:",
          terminosCondicionesExport
            ? "SÍ (" + terminosCondicionesExport.length + " caracteres)"
            : "NO",
        );
        return terminosCondicionesExport || undefined;
      })(),
      seccionesPersonalizadas: seccionesPersonalizadasOferta.filter(
        (s: any) =>
          s.tipo === "extra" &&
          (s.tipo_extra === "escritura" || s.tipo_extra === "costo"),
      ),
    };

    // EXPORTACIÓN SIN PRECIOS
    const rowsSinPrecios: any[] = [];
    itemsOrdenados.forEach((item) => {
      // Buscar el label de la sección (puede ser estándar o personalizada)
      let seccionLabel = seccionLabelMap.get(item.seccion) ?? item.seccion;

      // Si no está en el mapa estándar, buscar en secciones personalizadas
      if (
        seccionLabel === item.seccion &&
        seccionesPersonalizadasOferta.length > 0
      ) {
        const seccionPersonalizada = seccionesPersonalizadasOferta.find(
          (s: any) => s.id === item.seccion,
        );
        if (seccionPersonalizada) {
          seccionLabel = seccionPersonalizada.label;
        }
      }

      // Buscar el nombre del material
      const material = materialesMap.get(item.material_codigo?.toString());
      const nombreMaterial = material?.nombre || item.descripcion;

      const esCableado =
        item.seccion === "CABLEADO_AC" || item.seccion === "CABLEADO_DC";
      rowsSinPrecios.push({
        material_codigo: item.material_codigo,
        seccion: seccionLabel,
        tipo: "Material",
        descripcion: nombreMaterial,
        cantidad: esCableado ? `hasta ${item.cantidad}` : item.cantidad,
      });
    });

    // Agregar secciones personalizadas de tipo costo (sin precios)
    if (seccionesPersonalizadasOferta.length > 0) {
      seccionesPersonalizadasOferta.forEach((seccion: any) => {
        if (
          seccion.tipo === "extra" &&
          seccion.tipo_extra === "costo" &&
          seccion.costos_extras
        ) {
          seccion.costos_extras.forEach((costo: any) => {
            rowsSinPrecios.push({
              material_codigo: "",
              seccion: seccion.label,
              tipo: "Costo extra",
              descripcion: costo.descripcion,
              cantidad: costo.cantidad,
            });
          });
        }
      });
    }

    // Agregar fila de total de materiales (sin precio en exportación sin precios)
    rowsSinPrecios.push({
      material_codigo: "",
      seccion: "Totales",
      tipo: "Subtotal",
      descripcion: "Total de materiales",
      cantidad: "",
    });

    // Agregar servicio de instalación si existe
    console.log(
      "🔍 DEBUG SIN PRECIOS - Margen instalación:",
      oferta.margen_instalacion,
    );

    if (oferta.margen_instalacion && oferta.margen_instalacion > 0) {
      console.log("✅ Agregando servicio de instalación a rowsSinPrecios");
      rowsSinPrecios.push({
        material_codigo: "",
        seccion: "Servicios",
        tipo: "Servicio",
        descripcion: "Costo de instalación y puesta en marcha",
        cantidad: 1,
      });
    }

    // Agregar transportación con su valor
    if (oferta.costo_transportacion && oferta.costo_transportacion > 0) {
      rowsSinPrecios.push({
        material_codigo: "",
        seccion: "Logística",
        tipo: "Transportación",
        descripcion: "Costo de transportación",
        cantidad: 1,
        total: oferta.costo_transportacion.toFixed(2),
      });
    }

    // Agregar contribución con su valor
    if (oferta.aplica_contribucion && oferta.porcentaje_contribucion) {
      const totalesCalc = calcularTotalesDetalle(oferta);
      rowsSinPrecios.push({
        material_codigo: "",
        seccion: "Contribución",
        tipo: "Contribucion",
        descripcion: `Contribución (${oferta.porcentaje_contribucion}%)`,
        cantidad: 1,
        total: totalesCalc.contribucion.toFixed(2),
      });
    }

    // Agregar descuento con su valor
    if (oferta.descuento_porcentaje && oferta.descuento_porcentaje > 0) {
      const montoDescuento = oferta.monto_descuento || 0;
      rowsSinPrecios.push({
        material_codigo: "",
        seccion: "Descuento",
        tipo: "Descuento",
        descripcion: `Descuento aplicado (${oferta.descuento_porcentaje}%)`,
        cantidad: 1,
        total: `- ${montoDescuento.toFixed(2)}`,
      });
    }

    rowsSinPrecios.push({
      material_codigo: "",
      seccion: "Totales",
      tipo: "TOTAL",
      descripcion: "Precio Total",
      cantidad: "",
      total: (oferta.precio_final || 0).toFixed(2),
    });

    // Datos de pago para sin precios
    if (
      oferta.pago_transferencia ||
      oferta.aplica_contribucion ||
      (oferta.moneda_pago !== "USD" && tasaCambioNumero > 0)
    ) {
      if (oferta.pago_transferencia) {
        rowsSinPrecios.push({
          material_codigo: "",
          seccion: "PAGO",
          tipo: "Info",
          descripcion: "✓ Pago por transferencia",
          cantidad: "",
        });

        if (oferta.datos_cuenta) {
          rowsSinPrecios.push({
            material_codigo: "",
            seccion: "PAGO",
            tipo: "Datos",
            descripcion: "Datos de la cuenta",
            cantidad: "",
            total: oferta.datos_cuenta,
          });
        }
      }

      if (oferta.aplica_contribucion && oferta.porcentaje_contribucion) {
        rowsSinPrecios.push({
          material_codigo: "",
          seccion: "PAGO",
          tipo: "Info",
          descripcion: `✓ Aplicar ${oferta.porcentaje_contribucion}% de Contribución`,
          cantidad: "",
        });
      }

      rowsSinPrecios.push({
        material_codigo: "",
        seccion: "PAGO",
        tipo: "TOTAL",
        descripcion: "Precio Final",
        cantidad: "",
        total: (oferta.precio_final || 0).toFixed(2),
      });

      const totalesCalc = calcularTotalesDetalle(oferta);
      if (Math.abs(totalesCalc.redondeo) > 0.01) {
        rowsSinPrecios.push({
          material_codigo: "",
          seccion: "PAGO",
          tipo: "Nota",
          descripcion: `(Redondeado desde ${totalesCalc.totalSinRedondeo.toFixed(2)} $)`,
          cantidad: "",
        });
      }

      if (oferta.moneda_pago !== "USD" && tasaCambioNumero > 0) {
        const simboloMoneda = oferta.moneda_pago === "EUR" ? "€" : "CUP";
        const nombreMoneda =
          oferta.moneda_pago === "EUR" ? "Euros (EUR)" : "Pesos Cubanos (CUP)";

        rowsSinPrecios.push({
          material_codigo: "",
          seccion: "PAGO",
          tipo: "Info",
          descripcion: "Moneda de pago",
          cantidad: "",
          total: nombreMoneda,
        });

        const tasaTexto =
          oferta.moneda_pago === "EUR"
            ? `Tasa de cambio: 1 EUR = ${tasaCambioNumero} USD`
            : `Tasa de cambio: 1 USD = ${tasaCambioNumero} CUP`;

        rowsSinPrecios.push({
          material_codigo: "",
          seccion: "PAGO",
          tipo: "Tasa",
          descripcion: tasaTexto,
          cantidad: "",
        });

        rowsSinPrecios.push({
          material_codigo: "",
          seccion: "PAGO",
          tipo: "Conversión",
          descripcion: `Precio en ${oferta.moneda_pago}`,
          cantidad: "",
          total: `${montoConvertido.toFixed(2)} ${simboloMoneda}`,
        });
      }
    }

    const exportOptionsSinPrecios = {
      title: "Oferta - Cliente sin precios",
      subtitle:
        oferta.nombre_completo &&
        oferta.nombre_completo !== "0.00" &&
        isNaN(Number(oferta.nombre_completo))
          ? oferta.nombre_completo
          : oferta.nombre,
      columns: [
        { header: "Material", key: "descripcion", width: 60 },
        { header: "Cant", key: "cantidad", width: 10 },
      ],
      data: rowsSinPrecios,
      logoUrl: "/logo Suncar.png",
      clienteData:
        oferta.tipo === "personalizada" && cliente
          ? {
              numero: cliente.numero || cliente.id,
              nombre: cliente.nombre,
              carnet_identidad: cliente.carnet_identidad,
              telefono: cliente.telefono,
              provincia_montaje: cliente.provincia_montaje,
              direccion: cliente.direccion,
              atencion_de: cliente.nombre,
            }
          : undefined,
      leadData:
        oferta.tipo === "personalizada" && lead
          ? {
              id: lead.id,
              nombre: lead.nombre_completo || lead.nombre,
              telefono: lead.telefono,
              email: lead.email,
              provincia: lead.provincia,
              direccion: lead.direccion,
              atencion_de: lead.nombre_completo || lead.nombre,
            }
          : undefined,
      leadSinAgregarData:
        oferta.tipo === "personalizada" && oferta.nombre_lead_sin_agregar
          ? {
              nombre: oferta.nombre_lead_sin_agregar,
              atencion_de: oferta.nombre_lead_sin_agregar,
            }
          : undefined,
      ofertaData: {
        numero_oferta: oferta.numero_oferta || oferta.id,
        nombre_oferta: oferta.nombre_completo || oferta.nombre,
        tipo_oferta: oferta.tipo === "generica" ? "Genérica" : "Personalizada",
        estado: getEstadoBadge(oferta.estado).label,
      },
      incluirFotos: true,
      fotosMap,
      sinPrecios: true,
      componentesPrincipales,
      terminosCondiciones: terminosCondicionesExport || undefined,
      seccionesPersonalizadas: seccionesPersonalizadasOferta.filter(
        (s: any) =>
          s.tipo === "extra" &&
          (s.tipo_extra === "escritura" || s.tipo_extra === "costo"),
      ),
    };

    // EXPORTACIÓN CLIENTE CON PRECIOS
    const rowsClienteConPrecios: any[] = [];
    itemsOrdenados.forEach((item) => {
      // Buscar el label de la sección (puede ser estándar o personalizada)
      let seccionLabel = seccionLabelMap.get(item.seccion) ?? item.seccion;

      // Si no está en el mapa estándar, buscar en secciones personalizadas
      if (
        seccionLabel === item.seccion &&
        seccionesPersonalizadasOferta.length > 0
      ) {
        const seccionPersonalizada = seccionesPersonalizadasOferta.find(
          (s: any) => s.id === item.seccion,
        );
        if (seccionPersonalizada) {
          seccionLabel = seccionPersonalizada.label;
        }
      }

      // Calcular el total con margen incluido
      const margenAsignado = (item as any).margen_asignado || 0;
      const costoItem = item.precio * item.cantidad;
      const totalConMargen = costoItem + margenAsignado;

      // Buscar el nombre del material
      const material = materialesMap.get(item.material_codigo?.toString());
      const nombreMaterial = material?.nombre || item.descripcion;

      const esCableado =
        item.seccion === "CABLEADO_AC" || item.seccion === "CABLEADO_DC";
      rowsClienteConPrecios.push({
        material_codigo: item.material_codigo,
        seccion: seccionLabel,
        tipo: "Material",
        descripcion: nombreMaterial,
        cantidad: esCableado ? `hasta ${item.cantidad}` : item.cantidad,
        total: totalConMargen.toFixed(2),
      });
    });

    // Calcular total de materiales para cliente con precios
    const totalMaterialesCliente = itemsOrdenados.reduce((sum, item) => {
      const margenAsignado = (item as any).margen_asignado || 0;
      const costoItem = item.precio * item.cantidad;
      return sum + costoItem + margenAsignado;
    }, 0);

    // Calcular total de costos extras para cliente con precios
    let totalCostosExtrasCliente = 0;
    if (seccionesPersonalizadasOferta.length > 0) {
      seccionesPersonalizadasOferta.forEach((seccion: any) => {
        if (
          seccion.tipo === "extra" &&
          seccion.tipo_extra === "costo" &&
          seccion.costos_extras
        ) {
          seccion.costos_extras.forEach((costo: any) => {
            totalCostosExtrasCliente += costo.cantidad * costo.precio_unitario;
          });
        }
      });
    }

    // Agregar secciones personalizadas de tipo costo
    if (seccionesPersonalizadasOferta.length > 0) {
      seccionesPersonalizadasOferta.forEach((seccion: any) => {
        if (
          seccion.tipo === "extra" &&
          seccion.tipo_extra === "costo" &&
          seccion.costos_extras
        ) {
          seccion.costos_extras.forEach((costo: any) => {
            rowsClienteConPrecios.push({
              material_codigo: "",
              seccion: seccion.label,
              tipo: "Costo extra",
              descripcion: costo.descripcion,
              cantidad: costo.cantidad,
              total: (costo.cantidad * costo.precio_unitario).toFixed(2),
            });
          });
        }
      });
    }

    // Agregar fila de total de materiales
    rowsClienteConPrecios.push({
      material_codigo: "",
      seccion: "Totales",
      tipo: "Subtotal",
      descripcion: "Total de materiales",
      cantidad: "",
      total: totalMaterialesCliente.toFixed(2),
    });

    // Agregar total de costos extras si hay
    if (totalCostosExtrasCliente > 0) {
      rowsClienteConPrecios.push({
        material_codigo: "",
        seccion: "Totales",
        tipo: "Subtotal",
        descripcion: "Total costos extras",
        cantidad: "",
        total: totalCostosExtrasCliente.toFixed(2),
      });
    }

    // Agregar servicio de instalación si existe
    console.log(
      "🔍 DEBUG CLIENTE PRECIOS - Margen instalación:",
      oferta.margen_instalacion,
    );

    if (oferta.margen_instalacion && oferta.margen_instalacion > 0) {
      console.log(
        "✅ Agregando servicio de instalación a rowsClienteConPrecios",
      );
      rowsClienteConPrecios.push({
        material_codigo: "",
        seccion: "Servicios",
        tipo: "Servicio",
        descripcion: "Costo de instalación y puesta en marcha",
        cantidad: 1,
        total: oferta.margen_instalacion.toFixed(2),
      });
    }

    if (oferta.costo_transportacion && oferta.costo_transportacion > 0) {
      rowsClienteConPrecios.push({
        material_codigo: "",
        seccion: "Logística",
        tipo: "Transportación",
        descripcion: "Costo de transportación",
        cantidad: 1,
        total: oferta.costo_transportacion.toFixed(2),
      });
    }

    // Agregar contribución si aplica
    if (oferta.aplica_contribucion && oferta.porcentaje_contribucion) {
      const totalesCalc = calcularTotalesDetalle(oferta);
      rowsClienteConPrecios.push({
        material_codigo: "",
        seccion: "Contribución",
        tipo: "Contribucion",
        descripcion: `Contribución (${oferta.porcentaje_contribucion}%)`,
        cantidad: 1,
        total: totalesCalc.contribucion.toFixed(2),
      });
    }

    // Agregar descuento si aplica
    if (oferta.descuento_porcentaje && oferta.descuento_porcentaje > 0) {
      const montoDescuento = oferta.monto_descuento || 0;
      rowsClienteConPrecios.push({
        material_codigo: "",
        seccion: "Descuento",
        tipo: "Descuento",
        descripcion: `Descuento aplicado (${oferta.descuento_porcentaje}%)`,
        cantidad: 1,
        total: `- ${montoDescuento.toFixed(2)}`,
      });
    }

    rowsClienteConPrecios.push({
      material_codigo: "",
      seccion: "Totales",
      tipo: "TOTAL",
      descripcion: "PRECIO TOTAL",
      cantidad: "",
      total: (oferta.precio_final || 0).toFixed(2),
    });

    // Datos de pago para cliente con precios
    if (
      oferta.pago_transferencia ||
      oferta.aplica_contribucion ||
      (oferta.moneda_pago !== "USD" && tasaCambioNumero > 0)
    ) {
      if (oferta.pago_transferencia) {
        rowsClienteConPrecios.push({
          descripcion: "✓ Pago por transferencia",
          cantidad: "",
          seccion: "PAGO",
          tipo: "Info",
        });

        if (oferta.datos_cuenta) {
          rowsClienteConPrecios.push({
            descripcion: "Datos de la cuenta",
            cantidad: "",
            total: oferta.datos_cuenta,
            seccion: "PAGO",
            tipo: "Datos",
          });
        }
      }

      if (oferta.aplica_contribucion && oferta.porcentaje_contribucion) {
        const totalesCalc = calcularTotalesDetalle(oferta);

        rowsClienteConPrecios.push({
          descripcion: `✓ Aplicar ${oferta.porcentaje_contribucion}% de Contribución`,
          cantidad: "",
          seccion: "PAGO",
          tipo: "Info",
        });

        rowsClienteConPrecios.push({
          descripcion: "Contribución",
          cantidad: "",
          total: totalesCalc.contribucion.toFixed(2),
          seccion: "PAGO",
          tipo: "Monto",
        });
      }

      rowsClienteConPrecios.push({
        descripcion: "Precio Final",
        cantidad: "",
        total: (oferta.precio_final || 0).toFixed(2),
        seccion: "PAGO",
        tipo: "TOTAL",
      });

      const totalesCalc = calcularTotalesDetalle(oferta);
      if (Math.abs(totalesCalc.redondeo) > 0.01) {
        rowsClienteConPrecios.push({
          descripcion: `(Redondeado desde ${totalesCalc.totalSinRedondeo.toFixed(2)} $)`,
          cantidad: "",
          seccion: "PAGO",
          tipo: "Nota",
        });
      }

      if (oferta.moneda_pago !== "USD" && tasaCambioNumero > 0) {
        const simboloMoneda = oferta.moneda_pago === "EUR" ? "€" : "CUP";
        const nombreMoneda =
          oferta.moneda_pago === "EUR" ? "Euros (EUR)" : "Pesos Cubanos (CUP)";

        rowsClienteConPrecios.push({
          descripcion: "Moneda de pago",
          cantidad: "",
          total: nombreMoneda,
          seccion: "PAGO",
          tipo: "Info",
        });

        const tasaTexto =
          oferta.moneda_pago === "EUR"
            ? `Tasa de cambio: 1 EUR = ${tasaCambioNumero} USD`
            : `Tasa de cambio: 1 USD = ${tasaCambioNumero} CUP`;

        rowsClienteConPrecios.push({
          descripcion: tasaTexto,
          cantidad: "",
          seccion: "PAGO",
          tipo: "Tasa",
        });

        rowsClienteConPrecios.push({
          descripcion: `Precio en ${oferta.moneda_pago}`,
          cantidad: "",
          total: `${montoConvertido.toFixed(2)} ${simboloMoneda}`,
          seccion: "PAGO",
          tipo: "Conversión",
        });
      }
    }

    const exportOptionsClienteConPrecios = {
      title: "Oferta - Cliente con precios",
      subtitle:
        oferta.nombre_completo &&
        oferta.nombre_completo !== "0.00" &&
        isNaN(Number(oferta.nombre_completo))
          ? oferta.nombre_completo
          : oferta.nombre,
      columns: [
        { header: "Material", key: "descripcion", width: 50 },
        { header: "Cant", key: "cantidad", width: 10 },
        { header: "Total ($)", key: "total", width: 15 },
      ],
      data: rowsClienteConPrecios,
      logoUrl: "/logo Suncar.png",
      clienteData:
        oferta.tipo === "personalizada" && cliente
          ? {
              numero: cliente.numero || cliente.id,
              nombre: cliente.nombre,
              carnet_identidad: cliente.carnet_identidad,
              telefono: cliente.telefono,
              provincia_montaje: cliente.provincia_montaje,
              direccion: cliente.direccion,
              atencion_de: cliente.nombre,
            }
          : undefined,
      leadData:
        oferta.tipo === "personalizada" && lead
          ? {
              id: lead.id,
              nombre: lead.nombre_completo || lead.nombre,
              telefono: lead.telefono,
              email: lead.email,
              provincia: lead.provincia,
              direccion: lead.direccion,
              atencion_de: lead.nombre_completo || lead.nombre,
            }
          : undefined,
      leadSinAgregarData:
        oferta.tipo === "personalizada" && oferta.nombre_lead_sin_agregar
          ? {
              nombre: oferta.nombre_lead_sin_agregar,
              atencion_de: oferta.nombre_lead_sin_agregar,
            }
          : undefined,
      ofertaData: {
        numero_oferta: oferta.numero_oferta || oferta.id,
        nombre_oferta: oferta.nombre_completo || oferta.nombre,
        tipo_oferta: oferta.tipo === "generica" ? "Genérica" : "Personalizada",
        estado: getEstadoBadge(oferta.estado).label,
      },
      incluirFotos: true,
      fotosMap,
      conPreciosCliente: true,
      componentesPrincipales,
      terminosCondiciones: terminosCondicionesExport || undefined,
      seccionesPersonalizadas: seccionesPersonalizadasOferta.filter(
        (s: any) =>
          s.tipo === "extra" &&
          (s.tipo_extra === "escritura" || s.tipo_extra === "costo"),
      ),
    };

    const rowsClienteConPreciosTasaCambio = rowsClienteConPrecios.map((row) => {
      if (!tieneMonedaCambio || row.total === undefined || row.total === "") {
        return row;
      }

      if (
        row.tipo === "Datos" ||
        row.tipo === "Info" ||
        row.tipo === "Tasa" ||
        row.tipo === "Conversión"
      ) {
        return row;
      }

      return {
        ...row,
        total: convertirTextoTotalMonedaPago(row.total),
      };
    });

    const exportOptionsClienteConPreciosTasaCambio = {
      title: "Oferta - Cliente con precios y tasa de cambio",
      subtitle:
        oferta.nombre_completo &&
        oferta.nombre_completo !== "0.00" &&
        isNaN(Number(oferta.nombre_completo))
          ? oferta.nombre_completo
          : oferta.nombre,
      columns: [
        { header: "Material", key: "descripcion", width: 50 },
        { header: "Cant", key: "cantidad", width: 10 },
        { header: `Total (${codigoMonedaCambio})`, key: "total", width: 15 },
      ],
      data: rowsClienteConPreciosTasaCambio,
      logoUrl: "/logo Suncar.png",
      clienteData:
        oferta.tipo === "personalizada" && cliente
          ? {
              numero: cliente.numero || cliente.id,
              nombre: cliente.nombre,
              carnet_identidad: cliente.carnet_identidad,
              telefono: cliente.telefono,
              provincia_montaje: cliente.provincia_montaje,
              direccion: cliente.direccion,
              atencion_de: cliente.nombre,
            }
          : undefined,
      leadData:
        oferta.tipo === "personalizada" && lead
          ? {
              id: lead.id,
              nombre: lead.nombre_completo || lead.nombre,
              telefono: lead.telefono,
              email: lead.email,
              provincia: lead.provincia,
              direccion: lead.direccion,
              atencion_de: lead.nombre_completo || lead.nombre,
            }
          : undefined,
      leadSinAgregarData:
        oferta.tipo === "personalizada" && oferta.nombre_lead_sin_agregar
          ? {
              nombre: oferta.nombre_lead_sin_agregar,
              atencion_de: oferta.nombre_lead_sin_agregar,
            }
          : undefined,
      ofertaData: {
        numero_oferta: oferta.numero_oferta || oferta.id,
        nombre_oferta: oferta.nombre_completo || oferta.nombre,
        tipo_oferta: oferta.tipo === "generica" ? "Genérica" : "Personalizada",
        estado: getEstadoBadge(oferta.estado).label,
      },
      incluirFotos: true,
      fotosMap,
      conPreciosCliente: true,
      simboloMoneda: tieneMonedaCambio ? simboloMonedaCambio : "$",
      codigoMoneda: codigoMonedaCambio,
      componentesPrincipales,
      terminosCondiciones: terminosCondicionesExport || undefined,
      seccionesPersonalizadas: seccionesPersonalizadasOferta.filter(
        (s: any) =>
          s.tipo === "extra" &&
          (s.tipo_extra === "escritura" || s.tipo_extra === "costo"),
      ),
    };

    return {
      exportOptionsCompleto,
      exportOptionsSinPrecios,
      exportOptionsClienteConPrecios,
      exportOptionsClienteConPreciosTasaCambio,
      baseFilename,
    };
  };

  // Carga oferta completa (con items) para diálogos de detalle/export/edit
  const fetchOfertaCompleta = useCallback(
    async (id: string): Promise<OfertaConfeccion | null> => {
      try {
        setLoadingDetalle(true);
        const response = await apiRequest<any>(`/ofertas/confeccion/${id}`, {
          method: "GET",
        });
        const raw = response?.data ?? response;
        if (!raw) return null;
        return normalizeOfertaConfeccion(raw);
      } catch (err) {
        console.error("Error cargando oferta completa:", err);
        return null;
      } finally {
        setLoadingDetalle(false);
      }
    },
    [],
  );

  const abrirDialogoExportar = async (oferta: OfertaListadoItem) => {
    const completa = await fetchOfertaCompleta(oferta.id);
    if (completa) {
      setOfertaParaExportar(completa);
      setMostrarDialogoExportar(true);
    }
  };

  const abrirEditar = async (oferta: OfertaListadoItem) => {
    const completa = await fetchOfertaCompleta(oferta.id);
    if (completa) {
      setOfertaParaEditar(completa);
      setMostrarDialogoEditar(true);
    }
  };

  const irADuplicar = (oferta: OfertaListadoItem) => {
    router.push(`/ofertas-gestion/duplicar?id=${oferta.id}`);
  };

  const abrirDialogoEliminar = (oferta: OfertaListadoItem) => {
    setOfertaParaEliminar(oferta);
    setMostrarDialogoEliminar(true);
  };

  const abrirDetalle = async (oferta: OfertaListadoItem) => {
    const completa = await fetchOfertaCompleta(oferta.id);
    if (completa) {
      setOfertaSeleccionada(completa);
      setDetalleAbierto(true);
    }
  };

  const confirmarEliminar = async () => {
    if (!ofertaParaEliminar) return;
    setEliminandoOferta(true);
    try {
      await apiRequest(`/ofertas/confeccion/${ofertaParaEliminar.id}`, {
        method: "DELETE",
      });
      setMostrarDialogoEliminar(false);
      setOfertaParaEliminar(null);
      refetch();
    } catch (error) {
      console.error("Error eliminando oferta:", error);
    } finally {
      setEliminandoOferta(false);
    }
  };

  const cancelarEliminar = () => {
    setMostrarDialogoEliminar(false);
    setOfertaParaEliminar(null);
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-md border-l-4 border-l-orange-600 bg-white">
        <CardContent className="py-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nombre o cliente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="w-full lg:w-56">
                <Input
                  inputMode="decimal"
                  placeholder="Precio final máximo"
                  value={searchPrecioFinal}
                  onChange={(e) => setSearchPrecioFinal(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span className="font-semibold text-slate-900">{total}</span>
                <span>{total === 1 ? "oferta" : "ofertas"}</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSearchPrecioFinal("");
                  setEstadoFiltro("todos");
                  setTipoFiltro("todas");
                  setAlmacenFiltro("todos");
                  setInversorFiltro("todos");
                  setCantidadInversorFiltro("");
                  setBateriaFiltro("todos");
                  setCantidadBateriaFiltro("");
                  setPanelFiltro("todos");
                  setCantidadPanelFiltro("");
                }}
              >
                Limpiar filtros
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  <SelectItem value="en_revision">En revisión</SelectItem>
                  <SelectItem value="aprobada_para_enviar">Aprobada</SelectItem>
                  <SelectItem value="enviada_a_cliente">Enviada</SelectItem>
                  <SelectItem value="confirmada_por_cliente">
                    Confirmada
                  </SelectItem>
                  <SelectItem value="reservada">Reservada</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>

              <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tipo de oferta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todos los tipos</SelectItem>
                  <SelectItem value="generica">Genéricas</SelectItem>
                  <SelectItem value="personalizada">Personalizadas</SelectItem>
                </SelectContent>
              </Select>

              <Select value={almacenFiltro} onValueChange={setAlmacenFiltro}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Almacén" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los almacenes</SelectItem>
                  {almacenesDisponibles.map((almacen) => (
                    <SelectItem key={almacen.id ?? ""} value={almacen.id ?? ""}>
                      {almacen.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-2">
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Inversor
                </p>
                <Select
                  value={inversorFiltro}
                  onValueChange={setInversorFiltro}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todos los inversores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los inversores</SelectItem>
                    {opcionesMaterialesPrincipales.inversores.map((item) => (
                      <SelectItem key={item.codigo} value={item.codigo}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  placeholder="Cantidad exacta"
                  value={cantidadInversorFiltro}
                  onChange={(e) => setCantidadInversorFiltro(e.target.value)}
                />
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-2">
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Batería
                </p>
                <Select value={bateriaFiltro} onValueChange={setBateriaFiltro}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todas las baterías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas las baterías</SelectItem>
                    {opcionesMaterialesPrincipales.baterias.map((item) => (
                      <SelectItem key={item.codigo} value={item.codigo}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  placeholder="Cantidad exacta"
                  value={cantidadBateriaFiltro}
                  onChange={(e) => setCantidadBateriaFiltro(e.target.value)}
                />
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-2">
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Paneles
                </p>
                <Select value={panelFiltro} onValueChange={setPanelFiltro}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todos los paneles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los paneles</SelectItem>
                    {opcionesMaterialesPrincipales.paneles.map((item) => (
                      <SelectItem key={item.codigo} value={item.codigo}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  placeholder="Cantidad exacta"
                  value={cantidadPanelFiltro}
                  onChange={(e) => setCantidadPanelFiltro(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overlay de carga para fetch de oferta completa */}
      {loadingDetalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-lg p-4 shadow-lg flex items-center gap-3">
            <Loader className="h-5 w-5 animate-spin text-orange-500" />
            <span className="text-sm text-slate-700">Cargando oferta...</span>
          </div>
        </div>
      )}

      <div className="relative min-h-[12rem]">
        {loading && ofertas.length > 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/80 backdrop-blur-sm">
            <Loader label="Aplicando filtros..." />
          </div>
        )}

        {loading && ofertas.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <Loader label="Cargando ofertas..." />
          </div>
        ) : ofertas.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No se encontraron ofertas</p>
          </div>
        ) : (
          <Card className="border border-slate-200 shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre automático</TableHead>
                    <TableHead>Lead / Cliente</TableHead>
                    <TableHead className="w-[120px]">Fecha creación</TableHead>
                    <TableHead className="w-[140px] text-right">
                      Precio final
                    </TableHead>
                    <TableHead className="w-[140px]">Estado</TableHead>
                    <TableHead className="w-[280px] text-center">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ofertas.map((oferta) => {
                    const estadoBadge = getEstadoBadge(oferta.estado);
                    const contactoNombre =
                      oferta.tipo === "personalizada"
                        ? oferta.nombre_lead_sin_agregar ||
                          oferta.lead_nombre ||
                          oferta.cliente_nombre ||
                          clienteNombrePorOferta.get(oferta.cliente_id || "") ||
                          clienteNombrePorOferta.get(
                            oferta.cliente_numero || "",
                          ) ||
                          "Contacto no asignado"
                        : "Genérica";

                    return (
                      <TableRow key={oferta.id}>
                        <TableCell>
                          <p className="font-semibold text-slate-900 line-clamp-2">
                            {oferta.nombre || "--"}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-slate-700">
                            {contactoNombre}
                          </p>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {formatDateOnly(oferta.fecha_creacion)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-emerald-700">
                          {formatCurrency(Number(oferta.precio_final || 0))}
                        </TableCell>
                        <TableCell>
                          <Badge className={estadoBadge.className}>
                            {estadoBadge.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => abrirDialogoExportar(oferta)}
                              title="Exportar oferta"
                              disabled={loadingDetalle}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => irADuplicar(oferta)}
                              title="Duplicar oferta"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => abrirEditar(oferta)}
                              title="Editar oferta"
                              disabled={loadingDetalle}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => abrirDialogoEliminar(oferta)}
                              title="Eliminar oferta"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => abrirDetalle(oferta)}
                              title="Ver detalle"
                              disabled={loadingDetalle}
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-slate-500">
            Página {pagina} de {totalPaginas} &middot;{" "}
            {total} {total === 1 ? "oferta" : "ofertas"} en total
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => irAPagina(1)}
              disabled={pagina === 1 || loading}
            >
              «
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => irAPagina(pagina - 1)}
              disabled={pagina === 1 || loading}
            >
              ‹ Anterior
            </Button>
            <span className="text-sm text-slate-700 px-2">
              {pagina} / {totalPaginas}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => irAPagina(pagina + 1)}
              disabled={pagina === totalPaginas || loading}
            >
              Siguiente ›
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => irAPagina(totalPaginas)}
              disabled={pagina === totalPaginas || loading}
            >
              »
            </Button>
          </div>
        </div>
      )}

      <Dialog open={detalleAbierto} onOpenChange={setDetalleAbierto}>
        <DialogContent className="max-w-6xl h-[90vh] overflow-hidden flex flex-col">
          {ofertaSeleccionada ? (
            <>
              <DialogHeader className="shrink-0">
                <DialogTitle className="flex flex-wrap items-center gap-2">
                  <span className="text-lg font-semibold">
                    {ofertaSeleccionada.nombre}
                  </span>
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-1 lg:grid-cols-[360px,1fr] gap-6 flex-1 min-h-0 overflow-hidden">
                <div className="h-full min-h-0 overflow-hidden">
                  <div className="space-y-4 pr-1 lg:pr-2 overflow-y-auto max-h-full">
                    <Card className="overflow-hidden border-slate-200">
                      <CardContent className="p-0">
                        <div className="relative h-52 bg-gradient-to-br from-slate-50 via-orange-50 to-yellow-100 overflow-hidden">
                          {ofertaSeleccionada.foto_portada ? (
                            <img
                              src={ofertaSeleccionada.foto_portada}
                              alt={ofertaSeleccionada.nombre}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="h-20 w-20 rounded-2xl bg-white/80 border border-orange-100 flex items-center justify-center shadow-sm">
                                <Building2 className="h-10 w-10 text-orange-400" />
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-slate-200">
                      <CardContent className="p-4 space-y-3">
                        <div className="text-sm text-slate-500">
                          Información de la oferta
                        </div>
                        <div className="space-y-2 text-sm text-slate-700">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Tipo</span>
                            <span className="font-semibold text-slate-900">
                              {ofertaSeleccionada.tipo === "personalizada"
                                ? "Personalizada"
                                : "Genérica"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Estado</span>
                            <span className="font-semibold text-slate-900">
                              {getEstadoBadge(ofertaSeleccionada.estado).label}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Almacén</span>
                            <span className="font-semibold text-slate-900">
                              {ofertaSeleccionada.almacen_nombre ||
                                almacenNombrePorId.get(
                                  ofertaSeleccionada.almacen_id || "",
                                ) ||
                                "--"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Número</span>
                            <span className="font-semibold text-slate-900">
                              {ofertaSeleccionada.numero_oferta ||
                                ofertaSeleccionada.id}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {ofertaSeleccionada.tipo === "personalizada" && (
                      <Card className="border-slate-200">
                        <CardContent className="p-4 space-y-3">
                          <div className="text-sm text-slate-500">
                            Información del contacto
                          </div>
                          {(() => {
                            // Prioridad: lead sin agregar > lead > cliente
                            if (ofertaSeleccionada.nombre_lead_sin_agregar) {
                              return (
                                <div className="space-y-3">
                                  <div className="space-y-2 text-sm text-slate-700">
                                    <div className="flex items-center justify-between">
                                      <span className="text-slate-500">
                                        Tipo
                                      </span>
                                      <span className="font-semibold text-slate-900">
                                        Lead (sin agregar)
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-slate-500">
                                        Nombre
                                      </span>
                                      <span className="font-semibold text-slate-900">
                                        {
                                          ofertaSeleccionada.nombre_lead_sin_agregar
                                        }
                                      </span>
                                    </div>
                                  </div>

                                  {/* Alerta de Lead Sin Agregar */}
                                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                    <div className="flex items-start gap-2">
                                      <span className="text-amber-600 text-lg">
                                        ⚠️
                                      </span>
                                      <div className="flex-1 text-xs text-amber-800">
                                        <p className="font-semibold mb-1">
                                          Lead pendiente de agregar
                                        </p>
                                        <p className="text-amber-700">
                                          Este contacto aún no está registrado
                                          en el sistema. Considera agregarlo
                                          como lead o cliente para un mejor
                                          seguimiento.
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            if (
                              ofertaSeleccionada.lead_id ||
                              ofertaSeleccionada.lead_nombre
                            ) {
                              const lead = leadPorId.get(
                                ofertaSeleccionada.lead_id || "",
                              );
                              return (
                                <div className="space-y-2 text-sm text-slate-700">
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-500">Tipo</span>
                                    <span className="font-semibold text-slate-900">
                                      Lead
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-500">
                                      Nombre
                                    </span>
                                    <span className="font-semibold text-slate-900">
                                      {lead?.nombre_completo ||
                                        lead?.nombre ||
                                        ofertaSeleccionada.lead_nombre ||
                                        "--"}
                                    </span>
                                  </div>
                                  {(lead?.telefono ||
                                    ofertaSeleccionada.lead_id) && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-slate-500">
                                        {lead?.telefono ? "Teléfono" : "ID"}
                                      </span>
                                      <span className="font-semibold text-slate-900">
                                        {lead?.telefono ||
                                          ofertaSeleccionada.lead_id}
                                      </span>
                                    </div>
                                  )}
                                  {lead?.email && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-slate-500">
                                        Email
                                      </span>
                                      <span className="font-semibold text-slate-900">
                                        {lead.email}
                                      </span>
                                    </div>
                                  )}
                                  {lead?.provincia && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-slate-500">
                                        Provincia
                                      </span>
                                      <span className="font-semibold text-slate-900">
                                        {lead.provincia}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            }

                            const cliente =
                              clientePorOferta.get(
                                ofertaSeleccionada.cliente_id || "",
                              ) ||
                              clientePorOferta.get(
                                ofertaSeleccionada.cliente_numero || "",
                              );
                            if (!cliente) {
                              return (
                                <div className="text-sm text-slate-500">
                                  Contacto no asignado
                                </div>
                              );
                            }
                            return (
                              <div className="space-y-2 text-sm text-slate-700">
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500">Tipo</span>
                                  <span className="font-semibold text-slate-900">
                                    Cliente
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500">Nombre</span>
                                  <span className="font-semibold text-slate-900">
                                    {cliente.nombre || "--"}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500">CI</span>
                                  <span className="font-semibold text-slate-900">
                                    {cliente.carnet_identidad || "--"}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500">
                                    Teléfono
                                  </span>
                                  <span className="font-semibold text-slate-900">
                                    {cliente.telefono || "--"}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500">
                                    Dirección
                                  </span>
                                  <span className="font-semibold text-slate-900">
                                    {cliente.direccion || "--"}
                                  </span>
                                </div>
                              </div>
                            );
                          })()}
                        </CardContent>
                      </Card>
                    )}

                    <Card className="border-slate-200">
                      <CardContent className="p-4 space-y-3">
                        <div className="text-sm text-slate-500">Totales</div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Total materiales</span>
                            <span className="font-semibold text-slate-900">
                              {formatCurrency(
                                ofertaSeleccionada.total_materiales || 0,
                              )}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Margen comercial</span>
                            <span className="font-semibold text-slate-900">
                              {ofertaSeleccionada.margen_comercial ?? 0}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Subtotal con margen</span>
                            <span className="font-semibold text-slate-900">
                              {formatCurrency(
                                ofertaSeleccionada.subtotal_con_margen || 0,
                              )}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Transporte</span>
                            <span className="font-semibold text-slate-900">
                              {formatCurrency(
                                ofertaSeleccionada.costo_transportacion || 0,
                              )}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Costos extras</span>
                            <span className="font-semibold text-slate-900">
                              {formatCurrency(
                                ofertaSeleccionada.total_costos_extras || 0,
                              )}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Elementos personalizados</span>
                            <span className="font-semibold text-slate-900">
                              {formatCurrency(
                                ofertaSeleccionada.total_elementos_personalizados ||
                                  0,
                              )}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Contribucion</span>
                            <span className="font-semibold text-slate-900">
                              {formatCurrency(
                                totalesDetalle?.contribucion || 0,
                              )}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Total sin redondeo</span>
                            <span className="font-semibold text-slate-900">
                              {formatCurrency(
                                totalesDetalle?.totalSinRedondeo || 0,
                              )}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Redondeo</span>
                            <span className="font-semibold text-slate-900">
                              {formatCurrency(totalesDetalle?.redondeo || 0)}
                            </span>
                          </div>
                          <div className="pt-2 border-t border-slate-200 space-y-2 text-sm text-slate-600">
                            <div className="text-sm text-slate-500">Pago</div>
                            <div className="flex items-center justify-between">
                              <span>Pago por transferencia</span>
                              <span className="font-semibold text-slate-900">
                                {ofertaSeleccionada.pago_transferencia
                                  ? "Si"
                                  : "No"}
                              </span>
                            </div>
                            {ofertaSeleccionada.pago_transferencia &&
                              ofertaSeleccionada.datos_cuenta && (
                                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
                                  {ofertaSeleccionada.datos_cuenta}
                                </div>
                              )}
                            <div className="flex items-center justify-between">
                              <span>Aplica contribucion</span>
                              <span className="font-semibold text-slate-900">
                                {ofertaSeleccionada.aplica_contribucion
                                  ? "Si"
                                  : "No"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Formas de pago acordadas</span>
                              <span className="font-semibold text-slate-900">
                                {ofertaSeleccionada.formas_pago_acordadas
                                  ? "Si"
                                  : "No"}
                              </span>
                            </div>
                            {ofertaSeleccionada.formas_pago_acordadas && (
                              <div className="space-y-2 rounded-md border border-slate-200 bg-white px-3 py-2">
                                <div className="flex items-center justify-between text-xs text-slate-600">
                                  <span>Cantidad de pagos</span>
                                  <span className="font-semibold text-slate-900">
                                    {ofertaSeleccionada.cantidad_pagos_acordados ??
                                      ofertaSeleccionada.pagos_acordados
                                        ?.length ??
                                      0}
                                  </span>
                                </div>
                                {(ofertaSeleccionada.pagos_acordados || []).map(
                                  (pago, index) => (
                                    <div
                                      key={`${pago.fecha_estimada}-${index}`}
                                      className="rounded border border-slate-200 bg-slate-50 px-2 py-2 text-xs text-slate-700 space-y-1"
                                    >
                                      <div className="font-semibold text-slate-800">
                                        Pago #{index + 1}
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span>Monto</span>
                                        <span className="font-medium text-slate-900">
                                          {formatCurrency(pago.monto_usd || 0)}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span>% del monto</span>
                                        <span className="font-medium text-slate-900">
                                          {Number.isFinite(
                                            Number(pago.porcentaje_monto),
                                          )
                                            ? `${Number(pago.porcentaje_monto).toFixed(2)}%`
                                            : "--"}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span>Método</span>
                                        <span className="font-medium text-slate-900 capitalize">
                                          {pago.metodo_pago}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span>Fecha estimada</span>
                                        <span className="font-medium text-slate-900">
                                          {formatDateTime(pago.fecha_estimada)}
                                        </span>
                                      </div>
                                      {typeof pago.justificacion === "string" &&
                                        pago.justificacion.trim() && (
                                          <div className="space-y-1">
                                            <span className="text-slate-600">
                                              Justificación
                                            </span>
                                            <p className="text-slate-900 whitespace-pre-wrap break-words">
                                              {pago.justificacion}
                                            </p>
                                          </div>
                                        )}
                                    </div>
                                  ),
                                )}
                              </div>
                            )}
                            {ofertaSeleccionada.aplica_contribucion && (
                              <div className="flex items-center justify-between">
                                <span>% Contribucion</span>
                                <span className="font-semibold text-slate-900">
                                  {ofertaSeleccionada.porcentaje_contribucion ||
                                    0}
                                  %
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="pt-2 border-t border-slate-200 space-y-2 text-sm text-slate-600">
                            <div className="flex items-center justify-between">
                              <span>Moneda de pago</span>
                              <span className="font-semibold text-slate-900">
                                {ofertaSeleccionada.moneda_pago || "USD"}
                              </span>
                            </div>
                            {ofertaSeleccionada.moneda_pago &&
                              ofertaSeleccionada.moneda_pago !== "USD" && (
                                <div className="flex items-center justify-between">
                                  <span>
                                    {ofertaSeleccionada.moneda_pago === "EUR"
                                      ? "1 EUR ="
                                      : "1 USD ="}
                                  </span>
                                  <span className="font-semibold text-slate-900">
                                    {formatCurrencyWithSymbol(
                                      ofertaSeleccionada.tasa_cambio || 0,
                                      ofertaSeleccionada.moneda_pago === "EUR"
                                        ? "$"
                                        : "CUP",
                                    )}
                                  </span>
                                </div>
                              )}
                          </div>
                          <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-slate-800">
                            <span className="font-semibold">Precio final</span>
                            <span className="text-lg font-bold text-orange-600">
                              {formatCurrency(
                                ofertaSeleccionada.precio_final || 0,
                              )}
                            </span>
                          </div>
                          {conversionDetalle && (
                            <div className="flex items-center justify-between text-slate-800">
                              <span className="font-semibold">
                                Precio final en {conversionDetalle.moneda}
                              </span>
                              <span className="text-lg font-bold text-orange-600">
                                {formatCurrencyWithSymbol(
                                  conversionDetalle.convertido,
                                  conversionDetalle.moneda === "EUR"
                                    ? "EUR "
                                    : "CUP",
                                )}
                              </span>
                            </div>
                          )}
                          {((ofertaSeleccionada as any).compensacion ||
                            (ofertaSeleccionada as any)
                              .asumido_por_empresa) && (
                            <div className="pt-2 border-t border-slate-200 space-y-2">
                              {(ofertaSeleccionada as any).compensacion && (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-orange-700 font-medium">
                                      Compensación
                                    </span>
                                    <span className="font-semibold text-orange-700">
                                      -{" "}
                                      {formatCurrency(
                                        (ofertaSeleccionada as any).compensacion
                                          .monto_usd || 0,
                                      )}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-600 italic">
                                    {
                                      (ofertaSeleccionada as any).compensacion
                                        .justificacion
                                    }
                                  </p>
                                </div>
                              )}
                              {(ofertaSeleccionada as any)
                                .asumido_por_empresa && (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-blue-700 font-medium">
                                      Asumido por Empresa
                                    </span>
                                    <span className="font-semibold text-blue-700">
                                      -{" "}
                                      {formatCurrency(
                                        (ofertaSeleccionada as any)
                                          .asumido_por_empresa.monto_usd || 0,
                                      )}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-600 italic">
                                    {
                                      (ofertaSeleccionada as any)
                                        .asumido_por_empresa.justificacion
                                    }
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                          {ofertaSeleccionada.notas && (
                            <div className="pt-2 border-t border-slate-200 text-xs text-slate-500">
                              <span className="font-semibold text-slate-600">
                                Notas:
                              </span>{" "}
                              {ofertaSeleccionada.notas}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div className="space-y-4 overflow-y-auto pr-1 lg:pr-3">
                  <Card className="border-slate-200">
                    <CardContent className="p-4 space-y-4">
                      <div className="text-sm text-slate-500">
                        Materiales de la oferta
                      </div>

                      {(ofertaSeleccionada.items || []).length === 0 ? (
                        <div className="text-sm text-slate-500">
                          No hay materiales registrados.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {Object.entries(
                            (ofertaSeleccionada.items || []).reduce<
                              Record<
                                string,
                                NonNullable<typeof ofertaSeleccionada.items>
                              >
                            >((acc, item) => {
                              const key = item.seccion || "Sin sección";
                              if (!acc[key]) acc[key] = [];
                              acc[key].push(item);
                              return acc;
                            }, {}),
                          ).map(([seccion, items]) => (
                            <div key={seccion} className="space-y-2">
                              <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                {seccion === "CUSTOM_1769455569676"
                                  ? "Material vario"
                                  : seccion}
                              </div>
                              <div className="divide-y divide-slate-100 rounded-lg border border-slate-100 bg-white">
                                {items.map((item, idx) => {
                                  const material = materialesMap.get(
                                    item.material_codigo?.toString(),
                                  );
                                  return (
                                    <div
                                      key={`${item.material_codigo}-${idx}`}
                                      className="flex items-center gap-3 p-3"
                                    >
                                      <div className="h-12 w-12 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                                        {material?.foto ? (
                                          <img
                                            src={material.foto}
                                            alt={item.descripcion}
                                            className="w-full h-full object-contain"
                                          />
                                        ) : (
                                          <Package className="h-6 w-6 text-slate-300" />
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-900 line-clamp-1">
                                          {item.descripcion}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                          {item.categoria} · Código{" "}
                                          {item.material_codigo}
                                        </p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-sm font-semibold text-slate-900">
                                          {item.cantidad} u
                                        </p>
                                        <p className="text-xs text-slate-500">
                                          {formatCurrency(item.precio)}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200">
                    <CardContent className="p-4 space-y-4">
                      <div className="text-sm text-slate-500">
                        Materiales entregados
                      </div>

                      {materialesEntregadosDetalle.length === 0 ? (
                        <div className="text-sm text-slate-500">
                          No hay materiales registrados.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {materialesEntregadosDetalle.map((item) => (
                            <div
                              key={item.id}
                              className="rounded-lg border border-slate-200 bg-white p-3 space-y-2"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-900 line-clamp-1">
                                    {item.descripcion}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    Código {item.material_codigo}
                                  </p>
                                </div>
                                <div className="text-right text-xs text-slate-600 space-y-0.5">
                                  <p>
                                    Total:{" "}
                                    <span className="font-semibold text-slate-900">
                                      {item.cantidadTotal} u
                                    </span>
                                  </p>
                                  <p>
                                    Entregado:{" "}
                                    <span className="font-semibold text-slate-900">
                                      {item.totalEntregado} u
                                    </span>
                                  </p>
                                  <p>
                                    Pendiente:{" "}
                                    <span className="font-semibold text-slate-900">
                                      {item.cantidadPendiente} u
                                    </span>
                                  </p>
                                </div>
                              </div>

                              {item.entregas.length > 0 ? (
                                <div className="rounded-md border border-slate-100 bg-slate-50 px-2 py-2 space-y-1">
                                  {item.entregas.map(
                                    (entrega, entregaIndex) => (
                                      <div
                                        key={`${item.id}-entrega-${entregaIndex}`}
                                        className="flex items-center justify-between text-xs text-slate-600"
                                      >
                                        <span>
                                          {formatDateOnly(entrega.fecha)}
                                        </span>
                                        <span className="font-medium text-slate-900">
                                          {entrega.cantidad} u
                                        </span>
                                      </div>
                                    ),
                                  )}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-500">
                                  Sin entregas registradas.
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {(ofertaSeleccionada.elementos_personalizados || []).length >
                    0 && (
                    <Card className="border-slate-200">
                      <CardContent className="p-4 space-y-3">
                        <div className="text-sm text-slate-500">
                          Elementos personalizados
                        </div>
                        <div className="divide-y divide-slate-100 rounded-lg border border-slate-100 bg-white">
                          {(
                            ofertaSeleccionada.elementos_personalizados || []
                          ).map((elem, idx) => {
                            const material = materialesMap.get(
                              elem.material_codigo?.toString(),
                            );
                            return (
                              <div
                                key={`${elem.material_codigo}-${idx}`}
                                className="flex items-center gap-3 p-3"
                              >
                                <div className="h-12 w-12 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                                  {material?.foto ? (
                                    <img
                                      src={material.foto}
                                      alt={elem.descripcion}
                                      className="w-full h-full object-contain"
                                    />
                                  ) : (
                                    <Package className="h-6 w-6 text-slate-300" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-slate-900 line-clamp-1">
                                    {elem.descripcion}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {elem.categoria}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-semibold text-slate-900">
                                    {elem.cantidad} u
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {formatCurrency(elem.precio)}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {(ofertaSeleccionada.secciones_personalizadas || []).length >
                    0 && (
                    <Card className="border-slate-200">
                      <CardContent className="p-4 space-y-4">
                        <div className="text-sm text-slate-500">
                          Secciones personalizadas
                        </div>
                        <div className="space-y-4">
                          {(
                            ofertaSeleccionada.secciones_personalizadas || []
                          ).map((seccion) => (
                            <div key={seccion.id} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                  {seccion.label}
                                </p>
                                <Badge className="bg-slate-100 text-slate-700">
                                  {seccion.tipo}
                                </Badge>
                              </div>

                              {seccion.tipo === "extra" &&
                                seccion.tipo_extra === "escritura" &&
                                seccion.contenido_escritura && (
                                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                    <div className="flex items-start gap-3 mb-3">
                                      <div className="h-10 w-10 rounded-lg border border-slate-200 bg-white flex items-center justify-center flex-shrink-0">
                                        <FileText className="h-5 w-5 text-slate-400" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-900">
                                          Contenido de texto
                                        </p>
                                        <p className="text-xs text-slate-500">
                                          Sección personalizada
                                        </p>
                                      </div>
                                    </div>
                                    <div className="bg-white rounded-lg border border-slate-200 p-3">
                                      <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">
                                        {seccion.contenido_escritura}
                                      </p>
                                    </div>
                                  </div>
                                )}

                              {seccion.tipo === "extra" &&
                                seccion.tipo_extra === "costo" &&
                                (seccion.costos_extras || []).length > 0 && (
                                  <div className="divide-y divide-slate-100 rounded-lg border border-slate-100 bg-white">
                                    {(seccion.costos_extras || []).map(
                                      (costo) => (
                                        <div
                                          key={costo.id}
                                          className="flex items-center gap-3 p-3"
                                        >
                                          <div className="h-12 w-12 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center">
                                            <Package className="h-6 w-6 text-slate-300" />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-900 line-clamp-1">
                                              {costo.descripcion}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                              Costo extra
                                            </p>
                                          </div>
                                          <div className="text-right">
                                            <p className="text-sm font-semibold text-slate-900">
                                              {costo.cantidad} u
                                            </p>
                                            <p className="text-xs text-slate-500">
                                              {formatCurrency(
                                                costo.precio_unitario,
                                              )}
                                            </p>
                                          </div>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                )}

                              {seccion.tipo === "materiales" &&
                                seccion.categorias_materiales &&
                                seccion.categorias_materiales.length > 0 && (
                                  <div className="divide-y divide-slate-100 rounded-lg border border-slate-100 bg-white">
                                    {seccion.categorias_materiales.map(
                                      (categoria, idx) => {
                                        const material = materials.find(
                                          (item) =>
                                            item.categoria === categoria,
                                        );
                                        return (
                                          <div
                                            key={`${seccion.id}-${categoria}-${idx}`}
                                            className="flex items-center gap-3 p-3"
                                          >
                                            <div className="h-12 w-12 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                                              {material?.foto ? (
                                                <img
                                                  src={material.foto}
                                                  alt={categoria}
                                                  className="w-full h-full object-contain"
                                                />
                                              ) : (
                                                <Package className="h-6 w-6 text-slate-300" />
                                              )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <p className="text-sm font-semibold text-slate-900 line-clamp-1">
                                                {categoria}
                                              </p>
                                              <p className="text-xs text-slate-500">
                                                Categoría personalizada
                                              </p>
                                            </div>
                                          </div>
                                        );
                                      },
                                    )}
                                  </div>
                                )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Diálogo para exportar oferta */}
      {ofertaParaExportar && (
        <ExportSelectionDialog
          open={mostrarDialogoExportar}
          onOpenChange={setMostrarDialogoExportar}
          oferta={ofertaParaExportar}
          exportOptions={generarOpcionesExportacion(ofertaParaExportar)}
        />
      )}

      {/* Diálogo de Edición */}
      <EditarOfertaDialog
        open={mostrarDialogoEditar}
        onOpenChange={setMostrarDialogoEditar}
        oferta={ofertaParaEditar}
        onSuccess={() => {
          setMostrarDialogoEditar(false);
          setOfertaParaEditar(null);
          // Recargar ofertas después de editar
          refetch();
        }}
      />

      {/* Diálogo de Confirmación de Eliminación */}
      <Dialog
        open={mostrarDialogoEliminar}
        onOpenChange={setMostrarDialogoEliminar}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              ¿Eliminar oferta?
            </DialogTitle>
            <DialogDescription asChild>
              <div className="pt-4 space-y-3">
                <p className="text-slate-700">
                  Estás a punto de eliminar la oferta:
                </p>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="font-semibold text-slate-900">
                    {ofertaParaEliminar?.nombre}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    {ofertaParaEliminar?.numero_oferta ||
                      ofertaParaEliminar?.id}
                  </p>
                </div>
                <p className="text-slate-600 text-sm">
                  Esta acción no se puede deshacer. La oferta será eliminada y
                  se limpiará la referencia en el cliente o lead asociado.
                </p>
                {ofertaParaEliminar?.estado === "reservada" && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">
                      <span className="font-semibold">⚠️ Advertencia:</span>{" "}
                      Esta oferta tiene estado "Reservada". Verifica que no
                      tenga materiales reservados antes de eliminar.
                    </p>
                  </div>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={cancelarEliminar}
              disabled={eliminandoOferta}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmarEliminar}
              disabled={eliminandoOferta}
              className="bg-red-600 hover:bg-red-700"
            >
              {eliminandoOferta ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar oferta
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
