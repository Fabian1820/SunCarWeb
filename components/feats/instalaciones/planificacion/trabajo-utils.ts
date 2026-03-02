import type { TrabajoPlanificable } from "@/lib/types/feats/instalaciones/planificacion-trabajos-types";
import type { ResumenEquiposEnServicioCliente } from "@/lib/services/feats/instalaciones/instalaciones-service";
import {
  extractContactoEntregaKeysFromEntity,
  extractOfertaIdsFromEntity,
  normalizeContactoLookup,
} from "@/lib/utils/oferta-id";

export const BRIGADA_PREFIX = "brigada:";
export const TECNICO_PREFIX = "tecnico:";

export const isPrefixedAsignacion = (value: string) =>
  value.startsWith(BRIGADA_PREFIX) || value.startsWith(TECNICO_PREFIX);

export const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Extrae las claves de contacto específicas para TrabajoPlanificable
 */
const extractContactoKeysFromTrabajo = (trabajo: TrabajoPlanificable): string[] => {
  const keys = new Set<string>();
  
  if (trabajo.contactoTipo === "cliente") {
    // Agregar por número de cliente
    if (trabajo.contactoNumero) {
      const normalized = normalizeContactoLookup(trabajo.contactoNumero);
      if (normalized) {
        keys.add(`cliente_numero:${normalized}`);
        keys.add(`cliente_id:${normalized}`);
      }
    }
    // Agregar por ID de cliente
    if (trabajo.contactoId) {
      const normalized = normalizeContactoLookup(trabajo.contactoId);
      if (normalized) {
        keys.add(`cliente_id:${normalized}`);
      }
    }
  } else if (trabajo.contactoTipo === "lead") {
    // Agregar por ID de lead
    if (trabajo.contactoId) {
      const normalized = normalizeContactoLookup(trabajo.contactoId);
      if (normalized) {
        keys.add(`lead:${normalized}`);
      }
    }
  }
  
  return Array.from(keys);
};

/**
 * Verifica si un trabajo tiene materiales entregados según el índice de ofertas
 * Usa la misma lógica que el módulo de instalaciones en proceso
 */
export const trabajoTieneEntregas = (
  trabajo: TrabajoPlanificable,
  ofertasConEntregasIds: Set<string>,
  contactoKeysConEntregas: Set<string>
): boolean => {
  // Primero verificar por IDs de oferta
  const ofertaIds = extractOfertaIdsFromEntity(trabajo);
  const matchByOfertaId = ofertaIds.some((id) =>
    ofertasConEntregasIds.has(id)
  );
  
  if (matchByOfertaId) {
    console.log("✅ Trabajo con entregas (por oferta ID):", trabajo.nombre, ofertaIds);
    return true;
  }

  // Luego verificar por claves de contacto usando la función genérica
  const contactoKeysGeneric = extractContactoEntregaKeysFromEntity(trabajo);
  const matchByContactoGeneric = contactoKeysGeneric.some((key) =>
    contactoKeysConEntregas.has(key)
  );
  
  if (matchByContactoGeneric) {
    console.log("✅ Trabajo con entregas (por contacto genérico):", trabajo.nombre, contactoKeysGeneric);
    return true;
  }

  // Verificar con las claves específicas de TrabajoPlanificable
  const contactoKeysEspecificas = extractContactoKeysFromTrabajo(trabajo);
  const matchByContactoEspecifico = contactoKeysEspecificas.some((key) =>
    contactoKeysConEntregas.has(key)
  );
  
  if (matchByContactoEspecifico) {
    console.log("✅ Trabajo con entregas (por contacto específico):", trabajo.nombre, contactoKeysEspecificas);
    return true;
  }

  console.log("❌ Trabajo SIN entregas:", trabajo.nombre, {
    ofertaIds,
    contactoKeysGeneric,
    contactoKeysEspecificas,
    ofertasDisponibles: ofertasConEntregasIds.size,
    contactosDisponibles: contactoKeysConEntregas.size,
    muestraContactos: Array.from(contactoKeysConEntregas).slice(0, 10),
  });
  
  return false;
};

/**
 * Verifica si un trabajo tiene equipos en servicio según el resumen
 */
export const trabajoTieneEnServicio = (
  trabajo: TrabajoPlanificable,
  resumenServicioPorContacto: Record<string, ResumenEquiposEnServicioCliente>
): boolean => {
  if (trabajo.contactoTipo !== "cliente" || !trabajo.contactoNumero) {
    return false;
  }

  const resumen = resumenServicioPorContacto[trabajo.contactoNumero];
  if (!resumen) return false;

  return (
    resumen.tiene_alguno_en_servicio === true ||
    resumen.inversores_en_servicio > 0 ||
    resumen.paneles_en_servicio > 0 ||
    resumen.baterias_en_servicio > 0
  );
};
