import { useCallback, useEffect, useState } from "react";
import { EquiposFelicityService } from "@/lib/api-services";
import type {
  ComandoFelicity,
  CuentaFelicity,
  DispositivoFelicity,
  EquipoOficinaConfig,
  EstadoOficina,
  EstadoRapido,
  OperacionCatalogoItem,
  OperacionFelicity,
  ParametroConfigurable,
  PrevisualizacionData,
  UnidadMedida,
} from "@/lib/types/feats/equipos-felicity/equipos-felicity-types";

function extraerError(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  return fallback;
}

// --------------------------------------------------------------- cuenta

export function useCuentaFelicity() {
  const [cuenta, setCuenta] = useState<CuentaFelicity | null>(null);
  const [vinculada, setVinculada] = useState<boolean | null>(null); // null = aún no se sabe
  const [loading, setLoading] = useState(true);
  const [vinculando, setVinculando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await EquiposFelicityService.obtenerCuenta();
      setVinculada(Boolean(res.vinculada));
      setCuenta(res.data ?? null);
    } catch (err) {
      setError(extraerError(err, "No se pudo consultar el estado de la cuenta"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const vincular = useCallback(
    async (payload: {
      fsolar_user: string;
      password: string;
      region?: string;
      password_comandos?: string | null;
    }) => {
      setVinculando(true);
      setError(null);
      try {
        const res = await EquiposFelicityService.vincularCuenta(payload);
        if (res.success) {
          setVinculada(true);
          setCuenta(res.data ?? null);
          return true;
        }
        setError(res.message || "No se pudo vincular la cuenta");
        return false;
      } catch (err) {
        setError(extraerError(err, "No se pudo vincular la cuenta"));
        return false;
      } finally {
        setVinculando(false);
      }
    },
    [],
  );

  const desvincular = useCallback(async () => {
    setError(null);
    try {
      const res = await EquiposFelicityService.desvincularCuenta();
      setVinculada(false);
      setCuenta(null);
      return res.success;
    } catch (err) {
      setError(extraerError(err, "No se pudo desvincular la cuenta"));
      return false;
    }
  }, []);

  return { cuenta, vinculada, loading, vinculando, error, cargar, vincular, desvincular };
}

// ---------------------------------------------------------- listado equipos

export function useDispositivosFelicity() {
  const [dispositivos, setDispositivos] = useState<DispositivoFelicity[]>([]);
  const [estados, setEstados] = useState<Record<string, EstadoRapido>>({});
  const [loading, setLoading] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async (refrescar = false) => {
    refrescar ? setRefrescando(true) : setLoading(true);
    setError(null);
    try {
      const res = await EquiposFelicityService.listarDispositivos({ refrescar });
      setDispositivos(res.data || []);
    } catch (err) {
      setError(extraerError(err, "No se pudieron cargar los equipos"));
    } finally {
      setLoading(false);
      setRefrescando(false);
    }
  }, []);

  const cargarEstados = useCallback(async (unidad: UnidadMedida = "kw") => {
    try {
      const res = await EquiposFelicityService.estadoDeTodos(unidad);
      const mapa: Record<string, EstadoRapido> = {};
      for (const e of res.data || []) {
        mapa[e.dispositivo_sn] = e;
      }
      setEstados(mapa);
    } catch {
      // El estado en vivo es un extra sobre el inventario; si falla no bloquea el listado.
    }
  }, []);

  return {
    dispositivos,
    estados,
    loading,
    refrescando,
    error,
    cargar,
    cargarEstados,
  };
}

// -------------------------------------------------------- detalle de equipo

export function useDispositivoDetalle(sn: string) {
  const [estadoRapido, setEstadoRapido] = useState<EstadoRapido | null>(null);
  const [dispositivo, setDispositivo] = useState<DispositivoFelicity | null>(null);
  const [parametros, setParametros] = useState<ParametroConfigurable[]>([]);
  const [auditoria, setAuditoria] = useState<ComandoFelicity[]>([]);

  const [loadingEstado, setLoadingEstado] = useState(true);
  const [loadingAvanzado, setLoadingAvanzado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarEstadoRapido = useCallback(
    async (unidad: UnidadMedida = "kw") => {
      setLoadingEstado(true);
      setError(null);
      try {
        const res = await EquiposFelicityService.estadoRapido(sn, unidad);
        if (res.success) {
          setEstadoRapido(res.data ?? null);
        } else {
          setError(res.message || "No se pudo obtener el estado del equipo");
        }
      } catch (err) {
        setError(extraerError(err, "No se pudo obtener el estado del equipo"));
      } finally {
        setLoadingEstado(false);
      }
    },
    [sn],
  );

  const cargarAvanzado = useCallback(async () => {
    setLoadingAvanzado(true);
    setError(null);
    try {
      const [dispRes, paramRes, auditRes] = await Promise.all([
        EquiposFelicityService.obtenerDispositivo(sn),
        EquiposFelicityService.listarParametros(sn),
        EquiposFelicityService.listarAuditoria({ sn, limite: 50 }),
      ]);
      setDispositivo(dispRes.data ?? null);
      setParametros(paramRes.data || []);
      setAuditoria(auditRes.data || []);
    } catch (err) {
      setError(extraerError(err, "No se pudo cargar la información avanzada"));
    } finally {
      setLoadingAvanzado(false);
    }
  }, [sn]);

  useEffect(() => {
    cargarEstadoRapido("kw");
  }, [cargarEstadoRapido]);

  return {
    estadoRapido,
    dispositivo,
    parametros,
    auditoria,
    loadingEstado,
    loadingAvanzado,
    error,
    cargarEstadoRapido,
    cargarAvanzado,
  };
}

// --------------------------------------------------------------- operaciones

export function useOperacionesCatalogo() {
  const [catalogo, setCatalogo] = useState<OperacionCatalogoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await EquiposFelicityService.catalogoOperaciones();
      setCatalogo(res.data || []);
    } catch (err) {
      setError(extraerError(err, "No se pudo cargar el catálogo de operaciones"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { catalogo, loading, error, cargar };
}

export function useOperacionSobreDispositivo(sn: string) {
  const [previsualizando, setPrevisualizando] = useState(false);
  const [ejecutando, setEjecutando] = useState(false);

  const previsualizar = useCallback(
    async (
      operacion: OperacionFelicity,
      parametros: Record<string, unknown> = {},
    ): Promise<{ ok: boolean; data?: PrevisualizacionData; error?: string }> => {
      setPrevisualizando(true);
      try {
        const res = await EquiposFelicityService.previsualizarOperacion(sn, operacion, parametros);
        if (res.success) return { ok: true, data: res.data ?? undefined };
        return { ok: false, error: res.message };
      } catch (err) {
        return { ok: false, error: extraerError(err, "No se pudo previsualizar la operación") };
      } finally {
        setPrevisualizando(false);
      }
    },
    [sn],
  );

  const ejecutar = useCallback(
    async (payload: {
      operacion: OperacionFelicity;
      parametros?: Record<string, unknown>;
      motivo?: string;
      confirmacion?: string;
      simular?: boolean;
    }): Promise<{ ok: boolean; data?: ComandoFelicity; message?: string; error?: string }> => {
      setEjecutando(true);
      try {
        const res = await EquiposFelicityService.ejecutarOperacion(sn, payload);
        if (res.success) return { ok: true, data: res.data, message: res.message };
        return { ok: false, error: res.message };
      } catch (err) {
        return { ok: false, error: extraerError(err, "No se pudo ejecutar la operación") };
      } finally {
        setEjecutando(false);
      }
    },
    [sn],
  );

  return { previsualizando, ejecutando, previsualizar, ejecutar };
}

// --------------------------------------------------------- equipo de oficina

const REFRESCO_OFICINA_MS = 60_000;

/** Estado eléctrico del equipo de oficina, para el indicador de la barra lateral. */
export function useEstadoEquipoOficina() {
  const [estado, setEstado] = useState<EstadoOficina | null>(null);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const res = await EquiposFelicityService.estadoEquipoOficina();
      setEstado(res.data ?? null);
    } catch {
      // Indicador best-effort: un fallo de red no debe mostrarle un error a todo el sistema.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, REFRESCO_OFICINA_MS);
    return () => clearInterval(id);
  }, [cargar]);

  return { estado, loading };
}

/** Lectura y edición de la configuración del equipo de oficina (solo superAdmin la edita). */
export function useConfiguracionEquipoOficina() {
  const [config, setConfig] = useState<EquipoOficinaConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await EquiposFelicityService.obtenerEquipoOficina();
      setConfig(res.data ?? null);
    } catch (err) {
      setError(extraerError(err, "No se pudo consultar el equipo de oficina configurado"));
    } finally {
      setLoading(false);
    }
  }, []);

  const guardar = useCallback(async (sn: string) => {
    setGuardando(true);
    setError(null);
    try {
      const res = await EquiposFelicityService.configurarEquipoOficina(sn);
      if (res.success) {
        setConfig(res.data ?? null);
        return true;
      }
      setError(res.message || "No se pudo configurar el equipo de oficina");
      return false;
    } catch (err) {
      setError(extraerError(err, "No se pudo configurar el equipo de oficina"));
      return false;
    } finally {
      setGuardando(false);
    }
  }, []);

  return { config, loading, guardando, error, cargar, guardar };
}
