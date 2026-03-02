import { useCallback, useEffect, useRef, useState } from "react";
import { InstalacionesService } from "@/lib/services/feats/instalaciones/instalaciones-service";
import type { ResumenEquiposEnServicioCliente } from "@/lib/services/feats/instalaciones/instalaciones-service";
import type { TrabajoPlanificable } from "@/lib/types/feats/instalaciones/planificacion-trabajos-types";

export function usePlanificacionData() {
  const [ofertasConEntregasIds, setOfertasConEntregasIds] = useState<Set<string>>(new Set());
  const [contactoKeysConEntregas, setContactoKeysConEntregas] = useState<Set<string>>(new Set());
  const [resumenServicioPorContacto, setResumenServicioPorContacto] = useState<
    Record<string, ResumenEquiposEnServicioCliente>
  >({});
  const resumenRequestIdRef = useRef(0);
  const resumenServicioCacheRef = useRef<Record<string, ResumenEquiposEnServicioCliente>>({});

  // Cargar índice de ofertas con materiales entregados
  useEffect(() => {
    const cargarIndiceEntregas = async () => {
      try {
        const entregasIndex = await InstalacionesService.getOfertasConMaterialesEntregadosIndex();
        console.log("📦 Índice de entregas cargado:", {
          ofertaIds: entregasIndex.ofertaIds.size,
          contactoKeys: entregasIndex.contactoKeysConEntregas.size,
          ofertaIdsArray: Array.from(entregasIndex.ofertaIds).slice(0, 5),
          contactoKeysArray: Array.from(entregasIndex.contactoKeysConEntregas).slice(0, 5),
        });
        setOfertasConEntregasIds(new Set(entregasIndex.ofertaIds));
        setContactoKeysConEntregas(new Set(entregasIndex.contactoKeysConEntregas));
      } catch (error) {
        console.error("Error cargando índice de entregas:", error);
        setOfertasConEntregasIds(new Set());
        setContactoKeysConEntregas(new Set());
      }
    };
    void cargarIndiceEntregas();
  }, []);

  // Cargar resumen de servicio en segundo plano
  const cargarResumenServicioEnSegundoPlano = useCallback(
    async (trabajosRelevantes: TrabajoPlanificable[]) => {
      const requestId = ++resumenRequestIdRef.current;
      const cache = resumenServicioCacheRef.current;

      // Obtener números de cliente únicos
      const numerosClientes = Array.from(
        new Set(
          trabajosRelevantes
            .filter((t) => t.contactoTipo === "cliente" && t.contactoNumero)
            .map((t) => t.contactoNumero!)
        )
      );

      if (numerosClientes.length === 0) return;

      // Cargar desde cache primero
      const resumenInicial: Record<string, ResumenEquiposEnServicioCliente> = {};
      numerosClientes.forEach((numero) => {
        if (cache[numero]) resumenInicial[numero] = cache[numero];
      });
      setResumenServicioPorContacto(resumenInicial);

      // Cargar los pendientes
      const pendientes = numerosClientes.filter((numero) => !cache[numero]);
      if (pendientes.length === 0) return;

      const batchSize = 12;
      for (let i = 0; i < pendientes.length; i += batchSize) {
        const batch = pendientes.slice(i, i + batchSize);
        const resumenEntries = await Promise.all(
          batch.map(async (numero) => {
            const resumen = await InstalacionesService.getResumenEnServicioPorCliente(numero);
            return [numero, resumen] as const;
          })
        );

        if (requestId !== resumenRequestIdRef.current) return;

        resumenEntries.forEach(([numero, resumen]) => {
          cache[numero] = resumen;
        });

        const vistaActual: Record<string, ResumenEquiposEnServicioCliente> = {};
        numerosClientes.forEach((numero) => {
          if (cache[numero]) vistaActual[numero] = cache[numero];
        });
        setResumenServicioPorContacto(vistaActual);
      }
    },
    []
  );

  return {
    ofertasConEntregasIds,
    contactoKeysConEntregas,
    resumenServicioPorContacto,
    cargarResumenServicioEnSegundoPlano,
  };
}
