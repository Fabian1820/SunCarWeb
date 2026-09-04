import { useCallback, useEffect, useState } from "react";

import { CitasService } from "@/lib/services/feats/citas/citas-service";
import type {
  Cita,
  CitaCreateData,
  CitaEspontaneaData,
  CitaUpdateData,
  CitasFiltros,
  Disponibilidad,
  EstadoCita,
} from "@/lib/types/feats/citas/citas-types";

/** Devuelve la fecha de hoy como "YYYY-MM-DD" en hora local, no UTC. */
export function hoyISO(): string {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}

/** Suma días a una fecha "YYYY-MM-DD" sin pasar por zona horaria. */
export function sumarDias(fecha: string, dias: number): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const d = new Date(anio, mes - 1, dia + dias);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dd}`;
}

/**
 * Agenda de un día: slots por comercial. Es la vista principal del módulo.
 */
export function useAgendaDia(fechaInicial: string = hoyISO()) {
  const [fecha, setFecha] = useState(fechaInicial);
  const [agenda, setAgenda] = useState<Disponibilidad | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAgenda(await CitasService.disponibilidad(fecha));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar la agenda");
      setAgenda(null);
    } finally {
      setLoading(false);
    }
  }, [fecha]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { fecha, setFecha, agenda, loading, error, recargar: cargar };
}

/**
 * Listado de citas con filtros. Las mutaciones devuelven boolean y refrescan;
 * no hay update optimista para que un choque de slot rechazado por el backend
 * no deje la tabla mostrando algo que no se guardó.
 */
export function useCitas(filtrosIniciales: CitasFiltros = {}) {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [total, setTotal] = useState(0);
  const [filtros, setFiltros] = useState<CitasFiltros>(filtrosIniciales);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { citas: data, total: t } = await CitasService.listar(filtros);
      setCitas(data);
      setTotal(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar las citas");
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const ejecutar = useCallback(
    async (accion: () => Promise<unknown>): Promise<boolean> => {
      setError(null);
      try {
        await accion();
        await cargar();
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo completar la acción");
        return false;
      }
    },
    [cargar],
  );

  return {
    citas,
    total,
    filtros,
    setFiltros,
    loading,
    error,
    clearError: () => setError(null),
    recargar: cargar,
    crear: (data: CitaCreateData) => ejecutar(() => CitasService.crear(data)),
    crearEspontanea: (data: CitaEspontaneaData) =>
      ejecutar(() => CitasService.crearEspontanea(data)),
    actualizar: (id: string, data: CitaUpdateData) =>
      ejecutar(() => CitasService.actualizar(id, data)),
    cambiarEstado: (id: string, estado: EstadoCita, motivo?: string | null) =>
      ejecutar(() => CitasService.cambiarEstado(id, estado, motivo)),
    posponer: (id: string, fecha: string, hora: string, motivo?: string | null) =>
      ejecutar(() => CitasService.posponer(id, fecha, hora, motivo)),
    reasignar: (id: string, comercialCi: string, motivo?: string | null) =>
      ejecutar(() => CitasService.reasignar(id, comercialCi, motivo)),
    eliminar: (id: string) => ejecutar(() => CitasService.eliminar(id)),
  };
}
