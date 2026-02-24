"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { InstalacionesService } from "@/lib/services/feats/instalaciones/instalaciones-service";
import type { InstalacionNueva } from "@/lib/types/feats/instalaciones/instalaciones-types";
import { PageLoader } from "@/components/shared/atom/page-loader";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/shared/molecule/toaster";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { InstalacionesNuevasTable } from "@/components/feats/instalaciones/instalaciones-nuevas-table";
import {
  extractContactoEntregaKeysFromEntity,
  extractOfertaIdsFromEntity,
} from "@/lib/utils/oferta-id";

export default function InstalacionesNuevasPage() {
  const [instalaciones, setInstalaciones] = useState<InstalacionNueva[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const { toast } = useToast();

  // Estado para capturar los filtros aplicados
  const [appliedFilters, setAppliedFilters] = useState({
    searchTerm: "",
    tipo: "todos" as "todos" | "leads" | "clientes",
    fechaDesde: "",
    fechaHasta: "",
    materialesEntregados: "todos" as "todos" | "con_entregas" | "sin_entregas",
  });
  const [ofertasConEntregasIds, setOfertasConEntregasIds] = useState<
    Set<string>
  >(new Set());
  const [ofertasConPendientesIds, setOfertasConPendientesIds] = useState<
    Set<string>
  >(new Set());

  // Cargar leads y clientes pendientes de instalación desde el endpoint unificado
  const fetchInstalaciones = useCallback(async () => {
    setLoading(true);
    try {
      console.log("🔄 Intentando cargar pendientes de instalación...");

      // Obtener pendientes de instalación y el índice de ofertas con entregas
      const [data, entregasIndex] = await Promise.all([
        InstalacionesService.getPendientesInstalacion(),
        InstalacionesService.getOfertasConMaterialesEntregadosIndex(),
      ]);

      console.log("✅ Datos recibidos del backend:", data);
      setOfertasConEntregasIds(new Set(entregasIndex.ofertaIds));
      setOfertasConPendientesIds(
        new Set(entregasIndex.idsConMaterialesPendientes),
      );

      const hasEntregasByIndex = (entity: unknown) => {
        const matchByOfertaId = extractOfertaIdsFromEntity(entity).some((id) =>
          entregasIndex.ofertaIds.has(id),
        );
        if (matchByOfertaId) return true;

        return extractContactoEntregaKeysFromEntity(entity).some((key) =>
          entregasIndex.contactoKeysConEntregas.has(key),
        );
      };

      // Convertir leads a formato unificado
      const leadsUnificados: InstalacionNueva[] = (data.leads || []).map(
        (lead) => ({
          tipo: "lead" as const,
          id: lead.id,
          nombre: lead.nombre,
          telefono: lead.telefono,
          direccion: lead.direccion || "No especificada",
          ofertas: lead.ofertas || [],
          estado: lead.estado,
          fecha_contacto: lead.fecha_contacto,
          tiene_materiales_entregados:
            (lead as any)?.tiene_materiales_entregados === true ||
            hasEntregasByIndex(lead),
          original: lead,
        }),
      );

      // Convertir clientes a formato unificado
      const clientesUnificados: InstalacionNueva[] = (data.clientes || []).map(
        (cliente) => ({
          tipo: "cliente" as const,
          id: cliente.id,
          numero: cliente.numero,
          nombre: cliente.nombre,
          telefono: cliente.telefono || "No especificado",
          direccion: cliente.direccion,
          ofertas: cliente.ofertas || [],
          estado: cliente.estado || "Pendiente de Instalación",
          fecha_contacto: cliente.fecha_contacto || undefined,
          falta_instalacion: cliente.falta_instalacion || undefined,
          tiene_materiales_entregados:
            (cliente as any)?.tiene_materiales_entregados === true ||
            hasEntregasByIndex(cliente),
          original: cliente,
        }),
      );

      // Combinar y ordenar por fecha (más recientes primero)
      const todasInstalaciones = [
        ...leadsUnificados,
        ...clientesUnificados,
      ].sort((a, b) => {
        const fechaA = a.fecha_contacto
          ? new Date(a.fecha_contacto).getTime()
          : 0;
        const fechaB = b.fecha_contacto
          ? new Date(b.fecha_contacto).getTime()
          : 0;
        return fechaB - fechaA;
      });

      console.log(
        `✅ Total instalaciones procesadas: ${todasInstalaciones.length}`,
      );
      setInstalaciones(todasInstalaciones);

      if (todasInstalaciones.length > 0) {
        toast({
          title: "Datos cargados",
          description: `${data.total_leads || 0} leads y ${data.total_clientes || 0} clientes pendientes`,
        });
      }
    } catch (error: unknown) {
      console.error(
        "❌ Error cargando instalaciones desde endpoint unificado:",
        error,
      );
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      console.error("❌ Mensaje de error:", errorMessage);

      // Si el endpoint no existe (404), mostrar mensaje específico
      if (errorMessage.includes("404")) {
        toast({
          title: "Endpoint no disponible",
          description:
            "El endpoint /api/pendientes-instalacion/ no está implementado en el backend. Por favor, implementa el endpoint según la documentación.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error al cargar datos",
          description: `Error: ${errorMessage}`,
          variant: "destructive",
        });
      }

      setInstalaciones([]);
      setOfertasConEntregasIds(new Set());
      setOfertasConPendientesIds(new Set());
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Cargar datos iniciales
  const loadInitialData = async () => {
    setInitialLoading(true);
    try {
      await fetchInstalaciones();
    } catch (error: unknown) {
      console.error("Error cargando datos iniciales:", error);
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line
  }, []);

  // Función para parsear fechas
  const parseDateValue = (value?: string) => {
    if (!value) return null;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      const [day, month, year] = value.split("/").map(Number);
      const parsed = new Date(year, month - 1, day);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  // Función para construir texto de búsqueda
  const buildSearchText = (instalacion: InstalacionNueva) => {
    const parts: string[] = [];
    parts.push(instalacion.nombre);
    parts.push(instalacion.telefono);
    parts.push(instalacion.direccion);
    parts.push(instalacion.estado);
    if (instalacion.numero) parts.push(instalacion.numero);
    return parts.join(" ").toLowerCase();
  };

  const instalacionHasMaterialesEntregados = (
    instalacion: InstalacionNueva,
  ) => {
    const ofertasRaw = (instalacion as { ofertas?: unknown }).ofertas;
    if (!Array.isArray(ofertasRaw)) return false;

    for (const ofertaRaw of ofertasRaw) {
      if (!ofertaRaw || typeof ofertaRaw !== "object") continue;
      const oferta = ofertaRaw as Record<string, unknown>;

      if (
        oferta.tiene_materiales_entregados === true ||
        oferta.tiene_entregas === true
      ) {
        return true;
      }
      if (
        Number(oferta.materiales_entregados) > 0 ||
        Number(oferta.total_entregado) > 0
      ) {
        return true;
      }

      const itemsRaw = Array.isArray(oferta.items)
        ? oferta.items
        : Array.isArray(oferta.materiales)
          ? oferta.materiales
          : [];

      for (const itemRaw of itemsRaw) {
        if (!itemRaw || typeof itemRaw !== "object") continue;
        const item = itemRaw as Record<string, unknown>;
        const entregasRaw = Array.isArray(item.entregas) ? item.entregas : [];
        const hasEntregaPositiva = entregasRaw.some((entregaRaw) => {
          if (!entregaRaw || typeof entregaRaw !== "object") return false;
          const entrega = entregaRaw as Record<string, unknown>;
          return Number(entrega.cantidad) > 0;
        });
        if (hasEntregaPositiva) return true;

        const cantidad = Number(item.cantidad);
        const pendiente = Number(item.cantidad_pendiente_por_entregar);
        if (
          Number.isFinite(cantidad) &&
          Number.isFinite(pendiente) &&
          cantidad > 0 &&
          pendiente < cantidad
        ) {
          return true;
        }

        if (
          Number(item.cantidad_entregada) > 0 ||
          Number(item.total_entregado) > 0
        ) {
          return true;
        }
      }
    }

    return false;
  };

  // Instalaciones filtradas
  const filteredInstalaciones = useMemo(() => {
    const search = appliedFilters.searchTerm.trim().toLowerCase();
    const fechaDesde = parseDateValue(appliedFilters.fechaDesde);
    const fechaHasta = parseDateValue(appliedFilters.fechaHasta);

    if (fechaDesde) fechaDesde.setHours(0, 0, 0, 0);
    if (fechaHasta) fechaHasta.setHours(23, 59, 59, 999);

    return instalaciones.filter((instalacion) => {
      // Filtro por tipo
      if (appliedFilters.tipo !== "todos") {
        if (appliedFilters.tipo === "leads" && instalacion.tipo !== "lead")
          return false;
        if (
          appliedFilters.tipo === "clientes" &&
          instalacion.tipo !== "cliente"
        )
          return false;
      }

      // Filtro por búsqueda
      if (search) {
        const text = buildSearchText(instalacion);
        if (!text.includes(search)) {
          return false;
        }
      }

      // Filtro por fecha
      if (fechaDesde || fechaHasta) {
        const fecha = parseDateValue(instalacion.fecha_contacto);
        if (!fecha) return false;
        if (fechaDesde && fecha < fechaDesde) return false;
        if (fechaHasta && fecha > fechaHasta) return false;
      }

      if (appliedFilters.materialesEntregados !== "todos") {
        const ofertaIds = extractOfertaIdsFromEntity(instalacion);
        const hasEntregasByBackend =
          (instalacion as any)?.tiene_materiales_entregados === true ||
          Number((instalacion as any)?.materiales_entregados) > 0 ||
          ofertaIds.some((id) => ofertasConEntregasIds.has(id));
        const shouldUseFallbackHeuristic =
          ofertasConEntregasIds.size === 0 || ofertaIds.length === 0;
        const hasEntregas = shouldUseFallbackHeuristic
          ? hasEntregasByBackend ||
            instalacionHasMaterialesEntregados(instalacion)
          : hasEntregasByBackend;

        if (
          appliedFilters.materialesEntregados === "con_entregas" &&
          !hasEntregas
        ) {
          return false;
        }
        if (
          appliedFilters.materialesEntregados === "sin_entregas" &&
          hasEntregas
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    instalaciones,
    appliedFilters,
    ofertasConEntregasIds,
    ofertasConPendientesIds,
  ]);

  // Mostrar loader mientras se cargan los datos iniciales
  if (initialLoading) {
    return (
      <PageLoader
        moduleName="Instalaciones Nuevas"
        text="Cargando instalaciones..."
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <ModuleHeader
        title="Instalaciones Nuevas"
        subtitle="Leads y clientes pendientes de instalación"
        badge={{ text: "Nuevas", className: "bg-green-100 text-green-800" }}
        backHref="/instalaciones"
        backLabel="Volver a Instalaciones"
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">
        <InstalacionesNuevasTable
          instalaciones={filteredInstalaciones}
          loading={loading}
          onFiltersChange={setAppliedFilters}
          onRefresh={fetchInstalaciones}
          ofertasConEntregasIds={ofertasConEntregasIds}
        />
      </main>
      <Toaster />
    </div>
  );
}
