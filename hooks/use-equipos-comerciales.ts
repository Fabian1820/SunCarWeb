import { useState, useEffect, useCallback } from "react";
import { EquipoComercialService } from "@/lib/services/feats/distribucion-comerciales/equipo-comercial-service";
import type {
  EquipoComercial,
  JefesGenerales,
} from "@/lib/types/feats/distribucion-comerciales/distribucion-types";

interface UseEquiposComercialesReturn {
  equipos: EquipoComercial[];
  loading: boolean;
  error: string | null;
  mostrarInactivos: boolean;
  setMostrarInactivos: (valor: boolean) => void;
  loadEquipos: () => Promise<void>;
  createEquipo: (
    nombre: string,
    integrantes: string[],
    jefeCi?: string | null,
  ) => Promise<boolean>;
  updateEquipo: (
    id: string,
    nombre: string,
    integrantes: string[],
    jefeCi?: string | null,
  ) => Promise<boolean>;
  desactivarEquipo: (id: string) => Promise<boolean>;
  activarEquipo: (id: string) => Promise<boolean>;
  clearError: () => void;
  jefesGenerales: JefesGenerales;
  loadingJefesGenerales: boolean;
  setJefeGeneral: (
    rol: "comercial_general" | "instaladora",
    ci: string | null,
  ) => Promise<boolean>;
}

const JEFES_GENERALES_VACIO: JefesGenerales = {
  jefe_comercial_general: null,
  jefe_instaladora: null,
};

export function useEquiposComerciales(): UseEquiposComercialesReturn {
  const [equipos, setEquipos] = useState<EquipoComercial[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [jefesGenerales, setJefesGenerales] = useState<JefesGenerales>(
    JEFES_GENERALES_VACIO,
  );
  const [loadingJefesGenerales, setLoadingJefesGenerales] = useState(false);

  const loadEquipos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await EquipoComercialService.getEquipos(mostrarInactivos);
      setEquipos(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar los equipos",
      );
    } finally {
      setLoading(false);
    }
  }, [mostrarInactivos]);

  const loadJefesGenerales = useCallback(async () => {
    setLoadingJefesGenerales(true);
    try {
      const data = await EquipoComercialService.getJefesGenerales();
      setJefesGenerales(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar los jefes",
      );
    } finally {
      setLoadingJefesGenerales(false);
    }
  }, []);

  const createEquipo = useCallback(
    async (
      nombre: string,
      integrantes: string[],
      jefeCi?: string | null,
    ): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await EquipoComercialService.createEquipo(nombre, integrantes, jefeCi);
        await loadEquipos();
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al crear el equipo",
        );
        return false;
      } finally {
        setLoading(false);
      }
    },
    [loadEquipos],
  );

  const updateEquipo = useCallback(
    async (
      id: string,
      nombre: string,
      integrantes: string[],
      jefeCi?: string | null,
    ): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await EquipoComercialService.updateEquipo(
          id,
          nombre,
          integrantes,
          jefeCi,
        );
        await loadEquipos();
        return true;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Error al actualizar el equipo",
        );
        return false;
      } finally {
        setLoading(false);
      }
    },
    [loadEquipos],
  );

  const desactivarEquipo = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await EquipoComercialService.desactivarEquipo(id);
        await loadEquipos();
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al desactivar el equipo",
        );
        return false;
      } finally {
        setLoading(false);
      }
    },
    [loadEquipos],
  );

  const activarEquipo = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await EquipoComercialService.activarEquipo(id);
        await loadEquipos();
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al activar el equipo",
        );
        return false;
      } finally {
        setLoading(false);
      }
    },
    [loadEquipos],
  );

  const setJefeGeneral = useCallback(
    async (
      rol: "comercial_general" | "instaladora",
      ci: string | null,
    ): Promise<boolean> => {
      setLoadingJefesGenerales(true);
      setError(null);
      try {
        const data = await EquipoComercialService.setJefeGeneral(rol, ci);
        setJefesGenerales(data);
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al actualizar el jefe",
        );
        return false;
      } finally {
        setLoadingJefesGenerales(false);
      }
    },
    [],
  );

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    loadEquipos();
  }, [loadEquipos]);

  useEffect(() => {
    loadJefesGenerales();
  }, [loadJefesGenerales]);

  return {
    equipos,
    loading,
    error,
    mostrarInactivos,
    setMostrarInactivos,
    loadEquipos,
    createEquipo,
    updateEquipo,
    desactivarEquipo,
    activarEquipo,
    clearError,
    jefesGenerales,
    loadingJefesGenerales,
    setJefeGeneral,
  };
}
