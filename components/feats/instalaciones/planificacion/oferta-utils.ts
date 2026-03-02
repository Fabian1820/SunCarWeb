import type { OfertaTrabajo, OfertaTrabajoItem } from "./types";

export const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const ofertaTieneEntregas = (oferta: OfertaTrabajo) =>
  Array.isArray(oferta.items) &&
  oferta.items.some((item) =>
    Array.isArray(item.entregas)
      ? item.entregas.some((entrega) => toNumber(entrega.cantidad) > 0)
      : false,
  );

export const ofertaTieneEntregasOFlags = (oferta: OfertaTrabajo) => {
  const anyOferta = oferta as unknown as Record<string, unknown>;
  if (
    anyOferta.tiene_materiales_entregados === true ||
    anyOferta.tiene_entregas === true
  ) {
    return true;
  }
  if (
    toNumber(anyOferta.materiales_entregados) > 0 ||
    toNumber(anyOferta.total_entregado) > 0
  ) {
    return true;
  }
  if (ofertaTieneEntregas(oferta)) return true;

  const items = Array.isArray(oferta.items) ? oferta.items : [];
  return items.some((item) => {
    const cantidad = toNumber(item.cantidad);
    const pendienteRaw = item.cantidad_pendiente_por_entregar;
    if (
      pendienteRaw !== undefined &&
      cantidad > 0 &&
      toNumber(pendienteRaw) < cantidad
    ) {
      return true;
    }
    const anyItem = item as unknown as Record<string, unknown>;
    if (
      toNumber(anyItem.cantidad_entregada) > 0 ||
      toNumber(anyItem.total_entregado) > 0
    ) {
      return true;
    }
    return false;
  });
};

export const ofertaTieneEnServicio = (oferta: OfertaTrabajo) => {
  const anyOferta = oferta as unknown as Record<string, unknown>;
  if (
    anyOferta.tiene_materiales_en_servicio === true ||
    anyOferta.tiene_equipos_en_servicio === true ||
    anyOferta.en_servicio === true
  ) {
    return true;
  }
  if (
    toNumber(anyOferta.materiales_en_servicio) > 0 ||
    toNumber(anyOferta.total_en_servicio) > 0 ||
    toNumber(anyOferta.unidades_en_servicio) > 0
  ) {
    return true;
  }

  const items = Array.isArray(oferta.items) ? oferta.items : [];
  return items.some(
    (item) =>
      item.en_servicio === true || toNumber(item.cantidad_en_servicio) > 0,
  );
};
