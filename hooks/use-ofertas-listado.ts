import { useState, useEffect, useCallback, useRef } from "react";
import { apiRequest } from "@/lib/api-config";

export interface OfertaListadoItem {
  id: string;
  numero_oferta?: string;
  nombre: string;
  nombre_completo?: string;
  nombre_oferta?: string;
  tipo: "generica" | "personalizada";
  estado: string;
  almacen_id?: string;
  almacen_nombre?: string;
  cliente_id?: string;
  cliente_numero?: string;
  cliente_nombre?: string;
  lead_id?: string;
  lead_nombre?: string;
  nombre_lead_sin_agregar?: string;
  foto_portada?: string;
  precio_final: number;
  monto_pendiente?: number;
  moneda_pago?: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface OpcionComponente {
  codigo: string;
  descripcion: string;
  seccion?: string;
}

export interface ListadoFiltros {
  busqueda: string;
  precioMax: string;
  estado: string;
  tipo: string;
  almacenId: string;
  inversorCodigo: string;
  cantidadInversores: string;
  bateriaCodigo: string;
  cantidadBaterias: string;
  panelCodigo: string;
  cantidadPaneles: string;
}

export const FILTROS_VACIOS: ListadoFiltros = {
  busqueda: "",
  precioMax: "",
  estado: "",
  tipo: "",
  almacenId: "",
  inversorCodigo: "",
  cantidadInversores: "",
  bateriaCodigo: "",
  cantidadBaterias: "",
  panelCodigo: "",
  cantidadPaneles: "",
};

function buildQueryString(filtros: ListadoFiltros, page: number): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", "30");

  if (filtros.busqueda.trim()) params.set("busqueda", filtros.busqueda.trim());

  if (filtros.precioMax.trim()) {
    const val = Number(
      filtros.precioMax.replace(/\$/g, "").replace(",", ".").trim(),
    );
    if (Number.isFinite(val) && val > 0) params.set("precio_max", String(val));
  }

  if (filtros.estado) params.set("estado", filtros.estado);
  if (filtros.tipo) params.set("tipo_oferta", filtros.tipo);
  if (filtros.almacenId) params.set("almacen_id", filtros.almacenId);

  if (filtros.inversorCodigo) {
    params.set("inversor_codigo", filtros.inversorCodigo);
    const n = parseInt(filtros.cantidadInversores);
    if (!isNaN(n) && n > 0) params.set("cantidad_inversores", String(n));
  }

  if (filtros.bateriaCodigo) {
    params.set("bateria_codigo", filtros.bateriaCodigo);
    const n = parseInt(filtros.cantidadBaterias);
    if (!isNaN(n) && n > 0) params.set("cantidad_baterias", String(n));
  }

  if (filtros.panelCodigo) {
    params.set("panel_codigo", filtros.panelCodigo);
    const n = parseInt(filtros.cantidadPaneles);
    if (!isNaN(n) && n > 0) params.set("cantidad_paneles", String(n));
  }

  return params.toString();
}

function normalizeItem(r: any): OfertaListadoItem {
  return {
    id: r.id ?? r._id ?? "",
    numero_oferta: r.numero_oferta,
    nombre: r.nombre_automatico ?? r.nombre_oferta ?? r.nombre ?? "Sin nombre",
    nombre_completo: r.nombre_completo,
    nombre_oferta: r.nombre_oferta,
    tipo: r.tipo_oferta === "personalizada" ? "personalizada" : "generica",
    estado: r.estado ?? "en_revision",
    almacen_id: r.almacen_id,
    almacen_nombre: r.almacen_nombre,
    cliente_id: r.cliente_id,
    cliente_numero: r.cliente_numero,
    cliente_nombre: r.cliente_nombre,
    lead_id: r.lead_id,
    lead_nombre: r.lead_nombre,
    nombre_lead_sin_agregar: r.nombre_lead_sin_agregar,
    foto_portada: r.foto_portada,
    precio_final: Number(r.precio_final ?? 0),
    monto_pendiente:
      r.monto_pendiente != null ? Number(r.monto_pendiente) : undefined,
    moneda_pago: r.moneda_pago ?? "USD",
    fecha_creacion: r.fecha_creacion ?? "",
    fecha_actualizacion: r.fecha_actualizacion ?? "",
  };
}

export function useOfertasListado() {
  const [ofertas, setOfertas] = useState<OfertaListadoItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [pagina, setPagina] = useState(1);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs para siempre tener valores actuales sin recrear fetchListado
  const filtrosRef = useRef<ListadoFiltros>(FILTROS_VACIOS);
  const paginaRef = useRef(1);

  const fetchListado = useCallback(
    async (filtros: ListadoFiltros, page: number) => {
      setLoading(true);
      try {
        const qs = buildQueryString(filtros, page);
        const response = await apiRequest<any>(
          `/ofertas/confeccion/listado?${qs}`,
          { method: "GET" },
        );
        const raw: any[] = Array.isArray(response?.data) ? response.data : [];
        setOfertas(raw.map(normalizeItem));
        setTotal(response?.total ?? 0);
        setTotalPaginas(response?.total_pages ?? 1);
        setPagina(page);
        paginaRef.current = page;
      } catch (err) {
        console.error("Error fetching listado ofertas:", err);
        setOfertas([]);
        setTotal(0);
        setTotalPaginas(1);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Carga inicial
  useEffect(() => {
    fetchListado(FILTROS_VACIOS, 1);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchListado]);

  const setFiltros = useCallback(
    (nuevos: ListadoFiltros) => {
      filtrosRef.current = nuevos;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        fetchListado(nuevos, 1);
      }, 500);
    },
    [fetchListado],
  );

  const irAPagina = useCallback(
    (p: number) => {
      fetchListado(filtrosRef.current, p);
    },
    [fetchListado],
  );

  const refetch = useCallback(() => {
    fetchListado(filtrosRef.current, paginaRef.current);
  }, [fetchListado]);

  return {
    ofertas,
    total,
    totalPaginas,
    pagina,
    loading,
    setFiltros,
    irAPagina,
    refetch,
  };
}

export function useOpcionesComponentes() {
  const [opciones, setOpciones] = useState<{
    inversores: OpcionComponente[];
    baterias: OpcionComponente[];
    paneles: OpcionComponente[];
  }>({ inversores: [], baterias: [], paneles: [] });

  useEffect(() => {
    apiRequest<any>("/ofertas/confeccion/opciones-componentes", {
      method: "GET",
    })
      .then((r) => {
        if (r?.data) setOpciones(r.data);
      })
      .catch(console.error);
  }, []);

  return opciones;
}
