import { useCallback, useEffect, useRef, useState } from "react";
import { AuditoriaService } from "@/lib/services/feats/auditoria/auditoria-service";
import type {
  AuditoriaEstado,
  AuditoriaEvento,
  AuditoriaFacetas,
  AuditoriaFiltros,
} from "@/lib/types/feats/auditoria/auditoria-types";
import { FILTROS_INICIALES } from "@/lib/types/feats/auditoria/auditoria-types";

const DEBOUNCE_BUSQUEDA = 400;

export function useAuditoria(habilitado: boolean) {
  const [eventos, setEventos] = useState<AuditoriaEvento[]>([]);
  const [total, setTotal] = useState(0);
  const [filtros, setFiltrosState] = useState<AuditoriaFiltros>(FILTROS_INICIALES);
  const [facetas, setFacetas] = useState<AuditoriaFacetas>({
    recursos: [],
    acciones: [],
    usuarios: [],
  });
  const [estado, setEstado] = useState<AuditoriaEstado | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtrosRef = useRef(filtros);
  filtrosRef.current = filtros;

  const cargar = useCallback(async () => {
    if (!habilitado) return;
    setLoading(true);
    setError(null);
    try {
      const pagina = await AuditoriaService.listar(filtrosRef.current);
      setEventos(pagina.eventos);
      setTotal(pagina.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar la bitácora");
      setEventos([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [habilitado]);

  /**
   * Cambiar cualquier filtro devuelve a la primera página: quedarse en la 7
   * después de acotar la búsqueda es la forma más fácil de creer que no hay
   * resultados. Cambiar de página, en cambio, respeta el resto de filtros.
   */
  const setFiltros = useCallback((parcial: Partial<AuditoriaFiltros>) => {
    setFiltrosState((previo) => ({
      ...previo,
      ...parcial,
      pagina: parcial.pagina ?? 1,
    }));
  }, []);

  const limpiarFiltros = useCallback(() => setFiltrosState(FILTROS_INICIALES), []);

  /**
   * Deja la tabla con toda la historia de una entidad y nada más.
   *
   * Sustituye los filtros en vez de añadirse a ellos: si se llega aquí desde un
   * evento filtrado por método PUT, mantener ese filtro escondería justo el
   * alta y la baja, que es la mitad de la historia. Se conserva el tamaño de
   * página, que es preferencia de quien mira, no un filtro.
   */
  const verSoloEntidad = useCallback((entidadId: string) => {
    setFiltrosState((previo) => ({
      ...FILTROS_INICIALES,
      porPagina: previo.porPagina,
      entidadId,
    }));
  }, []);

  const irAPagina = useCallback((pagina: number) => {
    setFiltrosState((previo) => ({ ...previo, pagina }));
  }, []);

  // La búsqueda por texto se retrasa para no lanzar una consulta por tecla.
  useEffect(() => {
    if (!habilitado) return;
    const retraso = filtros.texto ? DEBOUNCE_BUSQUEDA : 0;
    const id = setTimeout(cargar, retraso);
    return () => clearTimeout(id);
  }, [habilitado, filtros, cargar]);

  useEffect(() => {
    if (!habilitado) return;
    AuditoriaService.facetas().then(setFacetas);
    AuditoriaService.estado().then(setEstado);
  }, [habilitado]);

  const totalPaginas = Math.max(1, Math.ceil(total / filtros.porPagina));

  return {
    eventos,
    total,
    totalPaginas,
    filtros,
    facetas,
    estado,
    loading,
    error,
    setFiltros,
    limpiarFiltros,
    verSoloEntidad,
    irAPagina,
    recargar: cargar,
  };
}
