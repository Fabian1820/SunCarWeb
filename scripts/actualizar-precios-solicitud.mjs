#!/usr/bin/env node
/**
 * Script interactivo para actualizar precios de materiales en una solicitud de venta.
 *
 * Uso:
 *   node scripts/actualizar-precios-solicitud.mjs
 *
 * Variables de entorno opcionales:
 *   BACKEND_URL   — URL base del backend (por defecto https://api.suncarsrl.com)
 *   AUTH_TOKEN    — Bearer token (si no se pone, el script lo pide al inicio)
 */

import readline from "readline";

const BASE = (process.env.BACKEND_URL ?? "https://api.suncarsrl.com").replace(/\/$/, "");
const ENDPOINT = `${BASE}/api/operaciones/solicitudes-ventas`;

// ── Helpers de consola ─────────────────────────────────────────────────────────
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

const sep  = () => console.log("─".repeat(56));
const sep2 = () => console.log("═".repeat(56));

// ── Auth ───────────────────────────────────────────────────────────────────────
async function getToken() {
  if (process.env.AUTH_TOKEN) return process.env.AUTH_TOKEN.trim();
  const t = await ask("🔑 Bearer token (Enter para intentar sin token): ");
  return t.trim();
}

// ── API ────────────────────────────────────────────────────────────────────────
async function apiFetch(path, token, opts = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${ENDPOINT}${path}`, { headers, ...opts });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.detail ?? json?.message ?? res.statusText;
    throw new Error(`HTTP ${res.status}: ${msg}`);
  }
  return json;
}

async function buscarSolicitudes(q, token) {
  const raw = await apiFetch(`/?q=${encodeURIComponent(q)}&limit=50`, token);
  const payload = raw?.data ?? raw;
  if (Array.isArray(payload)) return payload;
  return payload?.solicitudes ?? payload?.data ?? [];
}

async function getSolicitud(id, token) {
  const raw = await apiFetch(`/${encodeURIComponent(id)}`, token);
  return raw?.data ?? raw;
}

async function patchSolicitud(id, materiales, token) {
  const raw = await apiFetch(`/${encodeURIComponent(id)}`, token, {
    method: "PATCH",
    body: JSON.stringify({ materiales }),
  });
  return raw?.data ?? raw;
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  sep2();
  console.log("  ACTUALIZAR PRECIOS DE SOLICITUD DE VENTA");
  sep2();
  console.log();

  const token = await getToken();

  // 1. Buscar por nombre de cliente
  const clienteQuery = (await ask("🔍 Nombre del cliente: ")).trim();
  if (!clienteQuery) { console.log("Cancelado."); rl.close(); return; }

  let solicitudes;
  try {
    solicitudes = await buscarSolicitudes(clienteQuery, token);
  } catch (e) {
    console.error(`\n❌ Error al buscar: ${e.message}`);
    rl.close(); return;
  }

  if (!solicitudes.length) {
    console.log(`\n⚠️  No se encontraron solicitudes para "${clienteQuery}".`);
    rl.close(); return;
  }

  // 2. Filtrar/mostrar solicitudes encontradas
  console.log(`\nSolicitudes encontradas (${solicitudes.length}):\n`);
  solicitudes.forEach((s, i) => {
    const codigo  = s.codigo ?? s.id?.slice(-8).toUpperCase() ?? "—";
    const fecha   = s.fecha_creacion?.slice(0, 10) ?? "—";
    const cliente = s.cliente_venta?.nombre ?? s.cliente_venta_nombre ?? "—";
    const estado  = s.estado ?? "—";
    console.log(`  [${i + 1}] ${codigo}  |  ${fecha}  |  ${cliente}  |  ${estado}`);
  });

  // 3. Elegir por código o número de lista
  console.log();
  const sel = (await ask("📋 Código de solicitud (o número de lista): ")).trim();
  if (!sel) { console.log("Cancelado."); rl.close(); return; }

  let solicitud;
  const byNum = Number(sel);
  if (!isNaN(byNum) && byNum >= 1 && byNum <= solicitudes.length) {
    solicitud = solicitudes[byNum - 1];
  } else {
    solicitud = solicitudes.find(
      (s) => (s.codigo ?? "").toLowerCase() === sel.toLowerCase(),
    );
  }

  if (!solicitud) {
    console.log(`\n❌ No se encontró la solicitud "${sel}".`);
    rl.close(); return;
  }

  // 4. Cargar detalles completos para asegurar que tenemos los materiales
  try {
    const detalle = await getSolicitud(solicitud.id, token);
    if (detalle) solicitud = detalle;
  } catch { /* usar lo que ya tenemos */ }

  const mats = Array.isArray(solicitud.materiales) ? solicitud.materiales : [];

  if (!mats.length) {
    console.log("\n⚠️  Esta solicitud no tiene materiales registrados.");
    rl.close(); return;
  }

  // 5. Mostrar materiales con precios actuales
  sep();
  const codigo  = solicitud.codigo ?? solicitud.id?.slice(-8).toUpperCase();
  const cliente = solicitud.cliente_venta?.nombre ?? solicitud.cliente_venta_nombre ?? "—";
  console.log(`Solicitud: ${codigo}   Cliente: ${cliente}`);
  sep();
  console.log();
  console.log("  #   Material                              Cant   Precio actual");
  console.log("  " + "─".repeat(54));

  mats.forEach((m, i) => {
    const nombre  = (m.material_descripcion ?? m.descripcion ?? m.nombre ?? m.material_id ?? "Material").slice(0, 36).padEnd(36);
    const cant    = String(m.cantidad ?? 1).padStart(4);
    const precio  = m.precio != null ? `$${Number(m.precio).toFixed(2)}` : "—";
    console.log(`  [${i + 1}] ${nombre}  ${cant}   ${precio}`);
  });

  console.log();

  // 6. Pedir nuevo precio para cada material
  const materialesActualizados = [];
  let algoCambio = false;

  console.log("Ingresa el nuevo precio para cada material.");
  console.log("(Enter para dejar el precio actual sin cambios)\n");

  for (let i = 0; i < mats.length; i++) {
    const m       = mats[i];
    const nombre  = (m.material_descripcion ?? m.descripcion ?? m.nombre ?? m.material_id ?? "Material").slice(0, 40);
    const actual  = m.precio != null ? Number(m.precio).toFixed(2) : null;
    const hint    = actual ? ` [actual: $${actual}]` : "";

    const entrada = (await ask(`  Precio para "${nombre}"${hint}: $`)).trim();

    let precioFinal = m.precio;
    if (entrada !== "") {
      const parsed = parseFloat(entrada);
      if (isNaN(parsed) || parsed < 0) {
        console.log("  ⚠️  Valor inválido, se mantiene el precio actual.");
      } else {
        precioFinal = parsed;
        if (parsed !== m.precio) algoCambio = true;
      }
    }

    materialesActualizados.push({
      material_id: m.material_id ?? m.id,
      cantidad:    m.cantidad ?? 1,
      precio:      precioFinal,
      ...(m.descuento_porcentaje ? { descuento_porcentaje: m.descuento_porcentaje } : {}),
    });
  }

  if (!algoCambio) {
    console.log("\nℹ️  No se realizaron cambios en los precios.");
    rl.close(); return;
  }

  // 7. Confirmar y aplicar
  console.log();
  sep();
  console.log("Resumen de cambios:");
  mats.forEach((m, i) => {
    const nuevo   = materialesActualizados[i].precio;
    const actual  = m.precio;
    const nombre  = (m.material_descripcion ?? m.descripcion ?? m.nombre ?? "Material").slice(0, 36);
    if (nuevo !== actual) {
      const aStr = actual != null ? `$${Number(actual).toFixed(2)}` : "sin precio";
      console.log(`  · ${nombre}: ${aStr} → $${Number(nuevo).toFixed(2)}`);
    }
  });
  sep();

  const confirm = (await ask("\n¿Aplicar cambios? (s/n): ")).trim().toLowerCase();
  if (confirm !== "s" && confirm !== "si" && confirm !== "sí") {
    console.log("Cancelado.");
    rl.close(); return;
  }

  try {
    await patchSolicitud(solicitud.id, materialesActualizados, token);
    console.log("\n✅ Precios actualizados correctamente.");
  } catch (e) {
    console.error(`\n❌ Error al actualizar: ${e.message}`);
  }

  rl.close();
}

main().catch((e) => {
  console.error("Error inesperado:", e.message);
  rl.close();
  process.exit(1);
});
