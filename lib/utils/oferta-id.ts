const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

export const normalizeOfertaId = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "bigint"
  ) {
    const normalized = String(value).trim();
    return normalized ? normalized : null;
  }

  if (typeof value === "object") {
    const record = asRecord(value);
    if (record) {
      const candidates = [
        record.$oid,
        record.oid,
        record.id,
        record._id,
        record.value,
      ];

      for (const candidate of candidates) {
        const normalized = normalizeOfertaId(candidate);
        if (normalized) return normalized;
      }
    }

    const toStringFn = (value as { toString?: () => string }).toString;
    if (typeof toStringFn === "function") {
      const fromToString = toStringFn.call(value).trim();
      if (fromToString && fromToString !== "[object Object]") {
        return fromToString;
      }
    }
  }

  return null;
};

const OFERTA_ID_KEYS = [
  "id",
  "_id",
  "oferta_id",
  "numero_oferta",
  "oferta_confeccion_id",
  "id_oferta_confeccion",
  "ofertaConfeccionId",
  "mongo_id",
  "mongodb_id",
] as const;

export const extractOfertaId = (oferta: unknown): string | null => {
  const record = asRecord(oferta);
  if (!record) return null;

  for (const key of OFERTA_ID_KEYS) {
    const normalized = normalizeOfertaId(record[key]);
    if (normalized) return normalized;
  }

  const ofertaInterna = asRecord(record.oferta);
  if (ofertaInterna) {
    for (const key of OFERTA_ID_KEYS) {
      const normalized = normalizeOfertaId(ofertaInterna[key]);
      if (normalized) return normalized;
    }
  }

  return null;
};

export const extractOfertaIdsFromEntity = (entity: unknown): string[] => {
  const record = asRecord(entity);
  if (!record) return [];

  const ids = new Set<string>();

  const rootId = extractOfertaId(record);
  if (rootId) ids.add(rootId);

  const ofertasRaw = record.ofertas;
  if (Array.isArray(ofertasRaw)) {
    ofertasRaw.forEach((oferta) => {
      const id = extractOfertaId(oferta);
      if (id) ids.add(id);
    });
  }

  const original = asRecord(record.original);
  if (original) {
    const originalRootId = extractOfertaId(original);
    if (originalRootId) ids.add(originalRootId);

    const ofertasOriginal = original.ofertas;
    if (Array.isArray(ofertasOriginal)) {
      ofertasOriginal.forEach((oferta) => {
        const id = extractOfertaId(oferta);
        if (id) ids.add(id);
      });
    }
  }

  return Array.from(ids);
};

export const normalizeContactoLookup = (value: unknown): string | null => {
  const normalized = normalizeOfertaId(value);
  if (!normalized) return null;

  const compact = normalized.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return compact || normalized.toUpperCase();
};

const CONTACTO_TIPO_LEAD = ["lead", "leads"];
const CONTACTO_TIPO_CLIENTE = ["cliente", "clientes", "client"];

const isTipo = (value: unknown, candidates: string[]) => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return candidates.some((candidate) => normalized.includes(candidate));
};

export const extractContactoEntregaKeysFromResumen = (
  ofertaResumen: unknown,
): string[] => {
  const record = asRecord(ofertaResumen);
  if (!record) return [];

  const keys = new Set<string>();
  const push = (key: string, value: unknown) => {
    const normalized = normalizeContactoLookup(value);
    if (normalized) keys.add(`${key}:${normalized}`);
  };

  const lead = asRecord(record.lead);
  const cliente = asRecord(record.cliente);

  push("lead", record.lead_id);
  push("lead", record.id_lead);
  push("lead", record.leadId);
  push("lead", lead?.id);
  push("lead", lead?._id);

  push("cliente_id", record.cliente_id);
  push("cliente_id", record.id_cliente);
  push("cliente_id", record.clienteId);
  push("cliente_id", cliente?.id);
  push("cliente_id", cliente?._id);

  push("cliente_numero", record.cliente_numero);
  push("cliente_numero", record.numero_cliente);
  push("cliente_numero", record.cliente_codigo);
  push("cliente_numero", record.codigo_cliente);
  push("cliente_numero", cliente?.numero);

  const tipoContacto =
    record.tipo_contacto ?? record.contacto_tipo ?? record.tipo_contact;
  const contactoId =
    record.contacto_id ?? record.id_contacto ?? record.contactoId;
  if (isTipo(tipoContacto, CONTACTO_TIPO_LEAD)) {
    push("lead", contactoId);
  }
  if (isTipo(tipoContacto, CONTACTO_TIPO_CLIENTE)) {
    push("cliente_id", contactoId);
  }

  return Array.from(keys);
};

export const extractContactoEntregaKeysFromEntity = (
  entity: unknown,
): string[] => {
  const record = asRecord(entity);
  if (!record) return [];

  const keys = new Set<string>();
  const push = (key: string, value: unknown) => {
    const normalized = normalizeContactoLookup(value);
    if (normalized) keys.add(`${key}:${normalized}`);
  };

  const tipo = String(record.tipo ?? "")
    .trim()
    .toLowerCase();
  push("lead", record.id);
  push("cliente_id", record.id);
  if (tipo === "lead") push("lead", record.id);
  if (tipo === "cliente") {
    push("cliente_id", record.id);
    push("cliente_numero", record.numero);
  }

  push("lead", record.lead_id);
  push("cliente_id", record.cliente_id);
  push("cliente_numero", record.cliente_numero);
  push("cliente_numero", record.numero);

  const original = asRecord(record.original);
  if (original) {
    push("lead", original.id);
    push("lead", original.lead_id);
    push("cliente_id", original.id);
    push("cliente_id", original.cliente_id);
    push("cliente_numero", original.numero);
    push("cliente_numero", original.cliente_numero);
  }

  return Array.from(keys);
};
