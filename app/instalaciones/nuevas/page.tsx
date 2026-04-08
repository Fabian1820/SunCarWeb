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

const SPANISH_MONTHS: Record<string, number> = {
  enero: 0,
  febrero: 1,
  marzo: 2,
  abril: 3,
  mayo: 4,
  junio: 5,
  julio: 6,
  agosto: 7,
  septiembre: 8,
  setiembre: 8,
  octubre: 9,
  noviembre: 10,
  diciembre: 11,
};

const parseFlexibleDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [day, month, year] = raw.split("/").map(Number);
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const spanishMatch = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .match(/^(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})$/);

  if (spanishMatch) {
    const day = Number(spanishMatch[1]);
    const monthName = spanishMatch[2];
    const year = Number(spanishMatch[3]);
    const monthIndex = SPANISH_MONTHS[monthName];
    if (monthIndex !== undefined) {
      const parsed = new Date(year, monthIndex, day);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

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
    provincia: "todos",
    municipio: "todos",
    potenciaInversor: "todos",
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
          provincia: lead.provincia ?? lead.provincia_montaje ?? null,
          municipio: lead.municipio ?? null,
          potencia_inversor_principal_kw:
            typeof lead.potencia_inversor_principal_kw === "number"
              ? lead.potencia_inversor_principal_kw
              : null,
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
          provincia: cliente.provincia ?? cliente.provincia_montaje ?? null,
          municipio: cliente.municipio ?? null,
          potencia_inversor_principal_kw:
            typeof cliente.potencia_inversor_principal_kw === "number"
              ? cliente.potencia_inversor_principal_kw
              : null,
          fecha_primer_pago_oferta:
            cliente.fecha_primer_pago_oferta || null,
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

      const parseTimestamp = (value?: string | null) => {
        const parsed = parseFlexibleDate(value);
        if (!parsed) return Number.POSITIVE_INFINITY;
        return parsed.getTime();
      };

      const clientesConPago = clientesUnificados
        .filter((cliente) => Boolean(cliente.fecha_primer_pago_oferta))
        .sort(
          (a, b) =>
            parseTimestamp(a.fecha_primer_pago_oferta) -
            parseTimestamp(b.fecha_primer_pago_oferta),
        );

      const clientesSinPago = clientesUnificados.filter(
        (cliente) => !cliente.fecha_primer_pago_oferta,
      );

      const leadsOrdenados = leadsUnificados.sort(
        (a, b) => parseTimestamp(a.fecha_contacto) - parseTimestamp(b.fecha_contacto),
      );

      // Orden requerido:
      // 1) clientes con pago (asc fecha_primer_pago_oferta)
      // 2) clientes sin pago
      // 3) leads (asc fecha_contacto)
      const todasInstalaciones = [
        ...clientesConPago,
        ...clientesSinPago,
        ...leadsOrdenados,
      ];

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
  const parseDateValue = (value?: string) => parseFlexibleDate(value);

  const parsePositiveNumber = (value: unknown): number | null => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
  };

  const parsePowerFromTextKw = (value: unknown): number | null => {
    const text = String(value || "").trim();
    if (!text) return null;
    const match = text.match(/(\d+(?:[.,]\d+)?)\s*k\s*w/i);
    if (!match?.[1]) return null;
    return parsePositiveNumber(match[1].replace(",", "."));
  };

  const getCantidadTotalInversores = (instalacion: InstalacionNueva): number => {
    const ofertas = Array.isArray(instalacion.ofertas) ? instalacion.ofertas : [];
    return ofertas.reduce((sum, oferta) => {
      const cantidad = Number((oferta as Record<string, unknown>).inversor_cantidad);
      if (!Number.isFinite(cantidad) || cantidad <= 0) return sum;
      return sum + cantidad;
    }, 0);
  };

  const getPotenciaUnitarioInversorKw = (
    instalacion: InstalacionNueva,
  ): number | null => {
    const potenciaPrincipal = parsePositiveNumber(
      instalacion.potencia_inversor_principal_kw,
    );
    if (potenciaPrincipal) return potenciaPrincipal;

    const ofertas = Array.isArray(instalacion.ofertas) ? instalacion.ofertas : [];
    for (const oferta of ofertas) {
      const raw = oferta as Record<string, unknown>;
      const potenciaDirecta =
        parsePositiveNumber(raw.inversor_potencia_kw) ??
        parsePositiveNumber(raw.potencia_inversor_kw) ??
        parsePositiveNumber(raw.potencia_inversor);
      if (potenciaDirecta) return potenciaDirecta;

      const potenciaDesdeNombre = parsePowerFromTextKw(raw.inversor_nombre);
      if (potenciaDesdeNombre) return potenciaDesdeNombre;
    }

    return null;
  };

  const getPotenciaTotalInversorKw = (
    instalacion: InstalacionNueva,
  ): number | null => {
    const cantidadTotal = getCantidadTotalInversores(instalacion);
    if (cantidadTotal <= 0) return null;
    const potenciaUnitario = getPotenciaUnitarioInversorKw(instalacion);
    if (!potenciaUnitario) return null;
    return potenciaUnitario * cantidadTotal;
  };

  // Función para construir texto de búsqueda
  const buildSearchText = (instalacion: InstalacionNueva) => {
    const parts: string[] = [];
    parts.push(instalacion.nombre);
    parts.push(instalacion.telefono);
    parts.push(instalacion.direccion);
    parts.push(instalacion.provincia || "");
    parts.push(instalacion.municipio || "");
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
    const fechaHasta = parseDateValue(appliedFilters.fechaHasta);

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

      // Filtro por fecha de pago (fecha tope): solo registros con pago <= fecha seleccionada
      if (fechaHasta) {
        const fecha = parseDateValue(
          instalacion.fecha_primer_pago_oferta || "",
        );
        if (!fecha) return false;
        if (fechaHasta && fecha > fechaHasta) return false;
      }

      if (appliedFilters.provincia !== "todos") {
        const provinciaInstalacion = String(instalacion.provincia || "")
          .trim()
          .toLowerCase();
        if (provinciaInstalacion !== appliedFilters.provincia.toLowerCase()) {
          return false;
        }
      }

      if (appliedFilters.municipio !== "todos") {
        const municipioInstalacion = String(instalacion.municipio || "")
          .trim()
          .toLowerCase();
        if (municipioInstalacion !== appliedFilters.municipio.toLowerCase()) {
          return false;
        }
      }

      if (appliedFilters.potenciaInversor !== "todos") {
        const potenciaTotalInversor = getPotenciaTotalInversorKw(instalacion);
        if (potenciaTotalInversor === null) {
          return false;
        }
        if (
          appliedFilters.potenciaInversor === "lte_10" &&
          potenciaTotalInversor > 10
        ) {
          return false;
        }
        if (
          appliedFilters.potenciaInversor === "gt_10" &&
          potenciaTotalInversor <= 10
        ) {
          return false;
        }
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

      <main className="content-with-fixed-header w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">
        <InstalacionesNuevasTable
          instalaciones={filteredInstalaciones}
          instalacionesSource={instalaciones}
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
