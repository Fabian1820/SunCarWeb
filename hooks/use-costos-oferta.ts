"use client";

import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/api-config";

/**
 * Costos de materiales entregados/pendientes de UNA oferta.
 *
 * Gateado por el subpermiso ADITIVO `costos-materiales-cliente`: tener el módulo
 * padre (Clientes / Instalaciones) NO lo concede, hay que asignarlo explícito.
 * El backend valida el mismo permiso y responde 403, así que sin permiso ningún
 * costo viaja por la red.
 *
 * El costo es el WAC actual del catálogo, no el costo histórico de la salida.
 * `sin_costo=true` → el material no tiene costo cargado; su aporte al total es 0
 * y el total queda marcado como parcial vía `hay_materiales_sin_costo`.
 */

export const MODULO_COSTOS_MATERIALES = "costos-materiales-cliente";

export type CostoItemOferta = {
  material_codigo?: string | null;
  costo_unitario: number;
  costo_entregado: number;
  costo_pendiente: number;
  sin_costo: boolean;
};

export type CostosOfertaData = {
  oferta_id: string;
  numero_oferta?: string | null;
  items: CostoItemOferta[];
  adicionales_costo_entregado: number;
  total_costo_entregado: number;
  total_costo_pendiente: number;
  hay_materiales_sin_costo: boolean;
};

const normCodigo = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

/**
 * @param ofertaId id persistido de la oferta (o null para no cargar nada).
 *                 Acepta ObjectId o número/código de oferta.
 */
export function useCostosOferta(ofertaId?: string | null) {
  const { hasExactPermission } = useAuth();
  const verCostos = hasExactPermission(MODULO_COSTOS_MATERIALES);
  const [costos, setCostos] = useState<CostosOfertaData | null>(null);

  useEffect(() => {
    if (!verCostos || !ofertaId) {
      setCostos(null);
      return;
    }

    let cancelado = false;

    void (async () => {
      try {
        const response = await apiRequest<{ data?: CostosOfertaData }>(
          `/entregas-materiales/oferta/${encodeURIComponent(ofertaId)}/costos`,
          { method: "GET" },
        );
        const data = (response as { data?: CostosOfertaData } | null)?.data;
        if (!cancelado) {
          setCostos(data && typeof data === "object" ? data : null);
        }
      } catch (error) {
        // Best-effort: si falla (p. ej. 403) el diálogo sigue funcionando sin costos.
        console.warn("No se pudieron cargar los costos de la oferta:", error);
        if (!cancelado) setCostos(null);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [verCostos, ofertaId]);

  const costoPorCodigo = useMemo(() => {
    const map = new Map<string, CostoItemOferta>();
    for (const item of costos?.items || []) {
      const cod = normCodigo(item.material_codigo);
      if (cod) map.set(cod, item);
    }
    return map;
  }, [costos]);

  return { verCostos, costos, costoPorCodigo };
}

/** Formatea un costo como `$1.234,56`, o `sin costo` si el material no lo tiene. */
export function formatCostoItem(costo?: CostoItemOferta, campo?: "costo_entregado" | "costo_pendiente") {
  if (!costo || costo.sin_costo) return "sin costo";
  const value = campo ? costo[campo] : costo.costo_unitario;
  return `$${new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0))}`;
}

/** Formatea un monto total como `$1.234,56`. */
export function formatCostoTotal(value?: number) {
  return `$${new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0))}`;
}
