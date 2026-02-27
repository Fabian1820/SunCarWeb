"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { ClienteService } from "@/lib/api-services";
import { InstalacionesService } from "@/lib/services/feats/instalaciones/instalaciones-service";
import type { ResumenEquiposEnServicioCliente } from "@/lib/services/feats/instalaciones/instalaciones-service";
import { PageLoader } from "@/components/shared/atom/page-loader";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/shared/molecule/toaster";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { InstalacionesEnProcesoTable } from "@/components/feats/instalaciones/instalaciones-en-proceso-table";
import type { Cliente } from "@/lib/api-types";
import {
  extractContactoEntregaKeysFromEntity,
  extractOfertaIdsFromEntity,
} from "@/lib/utils/oferta-id";

type ServicioComponente = "inversores" | "paneles" | "baterias";

const getServicioCategoria = (
  item: Record<string, unknown>,
): ServicioComponente | null => {
  const descripcion = String(item?.descripcion || "").toLowerCase();
  const codigo = String(item?.material_codigo || "").toLowerCase();
  const seccion = String(item?.seccion || "").toLowerCase();

  if (
    seccion.includes("inversor") ||
    descripcion.includes("inversor") ||
    codigo.includes("inv")
  ) {
    return "inversores";
  }
  if (
    seccion.includes("panel") ||
    descripcion.includes("panel") ||
    codigo.includes("pan")
  ) {
    return "paneles";
  }
  if (
    seccion.includes("bateria") ||
    seccion.includes("batería") ||
    descripcion.includes("bateria") ||
    descripcion.includes("batería") ||
    codigo.includes("bat")
  ) {
    return "baterias";
  }

  return null;
};

const getClientExtraField = (client: Cliente, field: string): unknown => {
  const raw = client as unknown as Record<string, unknown>;
  return raw[field];
};

export default function InstalacionesEnProcesoPage() {
  const [clients, setClients] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const { toast } = useToast();

  // Estado para capturar los filtros aplicados
  const [appliedFilters, setAppliedFilters] = useState({
    searchTerm: "",
    fechaDesde: "",
    fechaHasta: "",
    materialesEntregados: "todos" as "todos" | "con_entregas" | "sin_entregas",
    equiposEnServicio: "todos" as "todos" | "con_servicio" | "sin_servicio",
    tipoEquipoServicio: "todos" as
      | "todos"
      | "inversores"
      | "paneles"
      | "baterias",
  });
  const [ofertasConEntregasIds, setOfertasConEntregasIds] = useState<
    Set<string>
  >(new Set());
  const [resumenServicioPorCliente, setResumenServicioPorCliente] = useState<
    Record<string, ResumenEquiposEnServicioCliente>
  >({});
  const resumenRequestIdRef = useRef(0);

  const cargarResumenServicioEnSegundoPlano = useCallback(
    async (numerosClientes: string[]) => {
      const requestId = ++resumenRequestIdRef.current;
      const resumenMap: Record<string, ResumenEquiposEnServicioCliente> = {};
      const batchSize = 12;

      for (let i = 0; i < numerosClientes.length; i += batchSize) {
        const batch = numerosClientes.slice(i, i + batchSize);
        const resumenEntries = await Promise.all(
          batch.map(async (numero) => {
            const resumen =
              await InstalacionesService.getResumenEnServicioPorCliente(numero);
            return [numero, resumen] as const;
          }),
        );

        if (requestId !== resumenRequestIdRef.current) {
          return;
        }

        resumenEntries.forEach(([numero, resumen]) => {
          resumenMap[numero] = resumen;
        });
      }

      if (requestId !== resumenRequestIdRef.current) {
        return;
      }

      setResumenServicioPorCliente(resumenMap);
    },
    [],
  );

  // Cargar clientes con estado "Instalación en Proceso"
  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const [clientsResponse, entregasIndex] = await Promise.all([
        ClienteService.getClientes({}),
        InstalacionesService.getOfertasConMaterialesEntregadosIndex(),
      ]);

      setOfertasConEntregasIds(new Set(entregasIndex.ofertaIds));
      const hasEntregasByIndex = (entity: unknown) => {
        const matchByOfertaId = extractOfertaIdsFromEntity(entity).some((id) =>
          entregasIndex.ofertaIds.has(id),
        );
        if (matchByOfertaId) return true;

        return extractContactoEntregaKeysFromEntity(entity).some((key) =>
          entregasIndex.contactoKeysConEntregas.has(key),
        );
      };

      // Filtrar solo los que tienen estado "Instalación en Proceso"
      const clientesEnProceso = clientsResponse.clients
        .filter((client) => client.estado === "Instalación en Proceso")
        .map((client) => ({
          ...client,
          tiene_materiales_entregados:
            getClientExtraField(client, "tiene_materiales_entregados") ===
              true || hasEntregasByIndex(client),
        }));

      const numerosUnicos = Array.from(
        new Set(
          clientesEnProceso
            .map((client) => String(client.numero || "").trim())
            .filter(Boolean),
        ),
      );
      setClients(clientesEnProceso);
      setResumenServicioPorCliente({});
      void cargarResumenServicioEnSegundoPlano(numerosUnicos);
    } catch (error: unknown) {
      console.error("Error cargando clientes:", error);
      setClients([]);
      setOfertasConEntregasIds(new Set());
      setResumenServicioPorCliente({});
      toast({
        title: "Error",
        description: "No se pudieron cargar las instalaciones",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, cargarResumenServicioEnSegundoPlano]);

  // Cargar datos iniciales
  const loadInitialData = async () => {
    setInitialLoading(true);
    try {
      await fetchClients();
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

  const parsePositiveInt = (value: unknown) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.trunc(parsed));
  };

  // Función para construir texto de búsqueda
  const buildSearchText = (client: Cliente) => {
    const parts: string[] = [];
    const visited = new WeakSet<object>();

    const addValue = (value: unknown) => {
      if (value === null || value === undefined) return;
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        parts.push(String(value));
        return;
      }
      if (value instanceof Date) {
        parts.push(value.toISOString());
        return;
      }
      if (Array.isArray(value)) {
        value.forEach(addValue);
        return;
      }
      if (typeof value === "object") {
        if (visited.has(value)) return;
        visited.add(value);
        Object.values(value as Record<string, unknown>).forEach(addValue);
      }
    };

    addValue(client);
    return parts.join(" ").toLowerCase();
  };

  const clientHasMaterialesEntregados = (client: Cliente) => {
    const ofertasRaw = (client as { ofertas?: unknown }).ofertas;
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

  const getServicioResumenCliente = useCallback(
    (client: Cliente) => {
      const key = String(client.numero || client.id || "").trim();
      const fromEndpoint = key ? resumenServicioPorCliente[key] : undefined;
      if (fromEndpoint) {
        return {
          inversores: parsePositiveInt(fromEndpoint.inversores_en_servicio),
          paneles: parsePositiveInt(fromEndpoint.paneles_en_servicio),
          baterias: parsePositiveInt(fromEndpoint.baterias_en_servicio),
          tiene:
            fromEndpoint.tiene_alguno_en_servicio === true ||
            parsePositiveInt(fromEndpoint.inversores_en_servicio) > 0 ||
            parsePositiveInt(fromEndpoint.paneles_en_servicio) > 0 ||
            parsePositiveInt(fromEndpoint.baterias_en_servicio) > 0,
        };
      }

      const resumen = {
        inversores: parsePositiveInt(
          getClientExtraField(client, "inversores_en_servicio"),
        ),
        paneles: parsePositiveInt(
          getClientExtraField(client, "paneles_en_servicio"),
        ),
        baterias: parsePositiveInt(
          getClientExtraField(client, "baterias_en_servicio"),
        ),
      };

      const ofertasRaw = (client as { ofertas?: unknown }).ofertas;
      if (Array.isArray(ofertasRaw)) {
        for (const ofertaRaw of ofertasRaw) {
          if (!ofertaRaw || typeof ofertaRaw !== "object") continue;
          const oferta = ofertaRaw as Record<string, unknown>;
          const itemsRaw = Array.isArray(oferta.items)
            ? oferta.items
            : Array.isArray(oferta.materiales)
              ? oferta.materiales
              : [];

          for (const itemRaw of itemsRaw) {
            if (!itemRaw || typeof itemRaw !== "object") continue;
            const item = itemRaw as Record<string, unknown>;
            const categoria = getServicioCategoria(item);
            if (!categoria) continue;

            const cantidadEnServicio = parsePositiveInt(
              item.cantidad_en_servicio,
            );
            const cantidadItem = parsePositiveInt(item.cantidad);
            const incremento =
              cantidadEnServicio > 0
                ? cantidadEnServicio
                : item.en_servicio === true
                  ? Math.max(1, cantidadItem)
                  : 0;

            if (incremento <= 0) continue;
            resumen[categoria] += incremento;
          }
        }
      }

      return {
        ...resumen,
        tiene:
          getClientExtraField(client, "tiene_equipos_en_servicio") === true ||
          getClientExtraField(client, "tiene_materiales_en_servicio") ===
            true ||
          resumen.inversores > 0 ||
          resumen.paneles > 0 ||
          resumen.baterias > 0,
      };
    },
    [resumenServicioPorCliente],
  );

  // Clientes filtrados
  const filteredClients = useMemo(() => {
    const search = appliedFilters.searchTerm.trim().toLowerCase();
    const fechaDesde = parseDateValue(appliedFilters.fechaDesde);
    const fechaHasta = parseDateValue(appliedFilters.fechaHasta);

    if (fechaDesde) fechaDesde.setHours(0, 0, 0, 0);
    if (fechaHasta) fechaHasta.setHours(23, 59, 59, 999);

    const filtered = clients.filter((client) => {
      if (search) {
        const text = buildSearchText(client);
        if (!text.includes(search)) {
          return false;
        }
      }

      if (fechaDesde || fechaHasta) {
        const fecha = parseDateValue(client.fecha_contacto);
        if (!fecha) return false;
        if (fechaDesde && fecha < fechaDesde) return false;
        if (fechaHasta && fecha > fechaHasta) return false;
      }

      if (appliedFilters.materialesEntregados !== "todos") {
        const ofertaIds = extractOfertaIdsFromEntity(client);
        const hasEntregasByBackend =
          getClientExtraField(client, "tiene_materiales_entregados") === true ||
          Number(getClientExtraField(client, "materiales_entregados")) > 0 ||
          ofertaIds.some((id) => ofertasConEntregasIds.has(id));
        const shouldUseFallbackHeuristic =
          ofertasConEntregasIds.size === 0 || ofertaIds.length === 0;
        const hasEntregas = shouldUseFallbackHeuristic
          ? hasEntregasByBackend || clientHasMaterialesEntregados(client)
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

      if (appliedFilters.equiposEnServicio !== "todos") {
        const resumenServicio = getServicioResumenCliente(client);
        const cantidadSeleccionada =
          appliedFilters.tipoEquipoServicio === "inversores"
            ? resumenServicio.inversores
            : appliedFilters.tipoEquipoServicio === "paneles"
              ? resumenServicio.paneles
              : appliedFilters.tipoEquipoServicio === "baterias"
                ? resumenServicio.baterias
                : resumenServicio.inversores +
                  resumenServicio.paneles +
                  resumenServicio.baterias;
        const hasServicioSeleccionado =
          appliedFilters.tipoEquipoServicio === "todos"
            ? resumenServicio.tiene || cantidadSeleccionada > 0
            : cantidadSeleccionada > 0;

        if (
          appliedFilters.equiposEnServicio === "con_servicio" &&
          !hasServicioSeleccionado
        ) {
          return false;
        }
        if (
          appliedFilters.equiposEnServicio === "sin_servicio" &&
          hasServicioSeleccionado
        ) {
          return false;
        }
      }

      return true;
    });

    // Ordenar por los últimos 3 dígitos del código de cliente (descendente)
    return filtered.sort((a, b) => {
      const getLastThreeDigits = (numero: string) => {
        const digits = numero.match(/\d+/g)?.join("") || "0";
        return parseInt(digits.slice(-3)) || 0;
      };

      const aNum = getLastThreeDigits(a.numero);
      const bNum = getLastThreeDigits(b.numero);

      return bNum - aNum;
    });
  }, [
    clients,
    appliedFilters,
    ofertasConEntregasIds,
    getServicioResumenCliente,
  ]);

  // Mostrar loader mientras se cargan los datos iniciales
  if (initialLoading) {
    return (
      <PageLoader
        moduleName="Instalaciones en Proceso"
        text="Cargando instalaciones..."
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <ModuleHeader
        title="Instalaciones en Proceso"
        subtitle="Clientes con instalación en proceso"
        badge={{ text: "En Proceso", className: "bg-blue-100 text-blue-800" }}
        backHref="/instalaciones"
        backLabel="Volver a Instalaciones"
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">
        <InstalacionesEnProcesoTable
          clients={filteredClients}
          loading={loading}
          onFiltersChange={setAppliedFilters}
          onRefresh={fetchClients}
          ofertasConEntregasIds={ofertasConEntregasIds}
          resumenServicioPorCliente={resumenServicioPorCliente}
        />
      </main>
      <Toaster />
    </div>
  );
}
