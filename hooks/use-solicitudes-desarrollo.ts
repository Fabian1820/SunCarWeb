import { useCallback, useEffect, useRef, useState } from "react";
import { SolicitudDesarrolloService } from "@/lib/services/feats/solicitudes-desarrollo/solicitud-desarrollo-service";
import type {
  CategoriaSolicitud,
  ResolucionSolicitud,
  SolicitudDesarrollo,
  SolicitudDesarrolloFiltros,
} from "@/lib/types/feats/solicitudes-desarrollo/solicitud-desarrollo-types";

const POLLING_INTERVAL = 30_000;
const DEBOUNCE_BUSQUEDA = 400;

const FILTROS_INICIALES: SolicitudDesarrolloFiltros = {};

export function useSolicitudesDesarrollo(habilitado: boolean) {
  const [solicitudes, setSolicitudes] = useState<SolicitudDesarrollo[]>([]);
  const [conteo, setConteo] = useState(0);
  const [loading, setLoading] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [filtros, setFiltrosState] = useState<SolicitudDesarrolloFiltros>(FILTROS_INICIALES);
  const cargadasRef = useRef(false);
  // Ref para que crearSolicitud/resolver/marcarTerminada siempre recarguen
  // con los filtros vigentes sin tener que declararlos como dependencia.
  const filtrosRef = useRef(filtros);
  filtrosRef.current = filtros;

  const cargarConteo = useCallback(async () => {
    if (!habilitado) return;
    const c = await SolicitudDesarrolloService.getConteo();
    setConteo(c);
  }, [habilitado]);

  const cargarSolicitudes = useCallback(async () => {
    if (!habilitado) return;
    setLoading(true);
    try {
      const lista = await SolicitudDesarrolloService.listar(filtrosRef.current);
      setSolicitudes(lista);
      cargadasRef.current = true;
    } finally {
      setLoading(false);
    }
  }, [habilitado]);

  const setFiltros = useCallback((parcial: Partial<SolicitudDesarrolloFiltros>) => {
    setFiltrosState((prev) => ({ ...prev, ...parcial }));
  }, []);

  // Recarga desde el backend cada vez que cambian los filtros (categoría,
  // implementada, rango de fechas, búsqueda). La búsqueda de texto se
  // debounce para no disparar una petición por cada tecla.
  useEffect(() => {
    if (!habilitado) return;
    const delay = filtros.q ? DEBOUNCE_BUSQUEDA : 0;
    const id = setTimeout(() => {
      cargarSolicitudes();
    }, delay);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habilitado, filtros, cargarSolicitudes]);

  useEffect(() => {
    if (!habilitado) return;
    cargarConteo();
    const id = setInterval(cargarConteo, POLLING_INTERVAL);
    return () => clearInterval(id);
  }, [habilitado, cargarConteo]);

  const crearSolicitud = useCallback(
    async (categoria: CategoriaSolicitud, mensaje: string, pantalla?: string) => {
      setEnviando(true);
      try {
        const ok = await SolicitudDesarrolloService.crear(categoria, mensaje, pantalla);
        if (ok) {
          await cargarSolicitudes();
          await cargarConteo();
        }
        return ok;
      } finally {
        setEnviando(false);
      }
    },
    [cargarSolicitudes, cargarConteo],
  );

  const resolver = useCallback(
    async (id: string, estado: ResolucionSolicitud, comentario: string) => {
      const ok = await SolicitudDesarrolloService.resolver(id, estado, comentario);
      if (ok) {
        await cargarSolicitudes();
        await cargarConteo();
      }
      return ok;
    },
    [cargarSolicitudes, cargarConteo],
  );

  const marcarTerminada = useCallback(
    async (id: string, terminada: boolean) => {
      const ok = await SolicitudDesarrolloService.marcarTerminada(id, terminada);
      if (ok) await cargarSolicitudes();
      return ok;
    },
    [cargarSolicitudes],
  );

  const marcarVistas = useCallback(async () => {
    await SolicitudDesarrolloService.marcarVistas();
    setConteo(0);
  }, []);

  return {
    solicitudes,
    conteo,
    loading,
    enviando,
    filtros,
    setFiltros,
    cargadasAlMenosUnaVez: cargadasRef.current,
    cargarSolicitudes,
    crearSolicitud,
    resolver,
    marcarTerminada,
    marcarVistas,
  };
}
