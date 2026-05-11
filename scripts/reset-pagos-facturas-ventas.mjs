/**
 * reset-pagos-facturas-ventas.mjs
 *
 * Borra todos los pagos y facturas de ventas y llama a /reabrir
 * en las solicitudes asociadas para revertir su estado de pago.
 *
 * Uso:
 *   node scripts/reset-pagos-facturas-ventas.mjs           # modo real
 *   node scripts/reset-pagos-facturas-ventas.mjs --dry-run # solo muestra, no toca nada
 *
 * El script pide CI y contraseña de admin para autenticarse.
 * Puedes sobreescribir la URL del backend con la variable de entorno:
 *   BACKEND_URL=https://api.suncarsrl.com node scripts/reset-pagos-facturas-ventas.mjs
 */

import { createInterface } from "readline";

// ── Configuración ─────────────────────────────────────────────────────────────
const BACKEND  = (process.env.BACKEND_URL || "https://api.suncarsrl.com").replace(/\/+$/, "");
const API      = `${BACKEND}/api`;
const DRY_RUN  = process.argv.includes("--dry-run");

// ── Helpers de consola ────────────────────────────────────────────────────────
const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((r) => rl.question(q, r));

const log  = (msg) => console.log(`  ${msg}`);
const ok   = (msg) => console.log(`  ✅ ${msg}`);
const warn = (msg) => console.log(`  ⚠️  ${msg}`);
const err  = (msg) => console.error(`  ❌ ${msg}`);
const sep  = ()    => console.log("─".repeat(60));

// ── HTTP helper ───────────────────────────────────────────────────────────────
async function req(method, path, token, body) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // DELETE 204 / 200 sin body
  if (res.status === 204 || res.headers.get("content-length") === "0") return null;

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// ── Login ─────────────────────────────────────────────────────────────────────
async function login(ci, pass) {
  const data = await req("POST", "/auth/login-admin", null, { ci, adminPass: pass });
  if (!data?.token) throw new Error(data?.message || "Login fallido");
  return data.token;
}

// ── Listar facturas (prueba varios endpoints) ─────────────────────────────────
async function listarFacturas(token) {
  const endpoints = [
    "/operaciones/facturas-ventas/consolidado",
    "/operaciones/facturas-ventas/",
    "/facturas-ventas/consolidado",
    "/facturas-ventas/",
    "/facturas-clientes-ventas/consolidado",
    "/facturas-clientes-ventas/",
  ];

  for (const ep of endpoints) {
    try {
      const res = await req("GET", ep, token);
      const arr =
        Array.isArray(res)             ? res
        : Array.isArray(res?.data)     ? res.data
        : Array.isArray(res?.facturas) ? res.facturas
        : Array.isArray(res?.data?.facturas) ? res.data.facturas
        : null;
      if (arr !== null) {
        log(`Facturas encontradas en ${ep}: ${arr.length}`);
        return arr;
      }
    } catch {
      // intentar siguiente
    }
  }
  return [];
}

// ── Listar pagos ──────────────────────────────────────────────────────────────
async function listarPagos(token) {
  const endpoints = [
    "/pagos-ventas/consolidado",
    "/pagos-ventas/",
  ];

  for (const ep of endpoints) {
    try {
      const res = await req("GET", ep, token);
      const arr =
        Array.isArray(res)            ? res
        : Array.isArray(res?.data)    ? res.data
        : Array.isArray(res?.pagos)   ? res.pagos
        : Array.isArray(res?.data?.pagos) ? res.data.pagos
        : null;
      if (arr !== null) {
        log(`Pagos encontrados en ${ep}: ${arr.length}`);
        return arr;
      }
    } catch {
      // intentar siguiente
    }
  }
  return [];
}

// ── Borrar factura (con fallback) ─────────────────────────────────────────────
async function borrarFactura(token, id) {
  const endpoints = [
    `/facturas-ventas/${encodeURIComponent(id)}`,
    `/facturas-clientes-ventas/${encodeURIComponent(id)}`,
    `/operaciones/facturas-ventas/${encodeURIComponent(id)}`,
  ];

  for (const ep of endpoints) {
    try {
      await req("DELETE", ep, token);
      return true;
    } catch {
      // intentar siguiente
    }
  }
  return false;
}

// ── Borrar pago ───────────────────────────────────────────────────────────────
async function borrarPago(token, id) {
  const endpoints = [
    `/pagos-ventas/${encodeURIComponent(id)}`,
    `/operaciones/pagos-ventas/${encodeURIComponent(id)}`,
  ];

  for (const ep of endpoints) {
    try {
      await req("DELETE", ep, token);
      return true;
    } catch {
      // intentar siguiente
    }
  }
  return false;
}

// ── Reabrir solicitud ─────────────────────────────────────────────────────────
async function reabrirSolicitud(token, id) {
  try {
    await req("PATCH", `/operaciones/solicitudes-ventas/${encodeURIComponent(id)}/reabrir`, token);
    return true;
  } catch {
    return false;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(DRY_RUN
    ? "\n🔍  DRY-RUN: Pagos y Facturas de Ventas (sin cambios reales)"
    : "\n🗑️  Reset: Pagos y Facturas de Ventas"
  );
  sep();
  log(`Backend: ${API}`);
  if (DRY_RUN) log("Modo: DRY-RUN — solo lectura, no se eliminará ni modificará nada");
  sep();

  // Credenciales
  const ci   = await ask("CI del admin: ");
  const pass = await ask("Contraseña:   ");
  console.log();

  // Login
  let token;
  try {
    token = await login(ci.trim(), pass.trim());
    ok("Autenticado correctamente");
  } catch (e) {
    err(`Error de autenticación: ${e.message}`);
    rl.close();
    process.exit(1);
  }

  sep();

  // 1) Cargar facturas y pagos
  log("Cargando facturas...");
  const facturas = await listarFacturas(token);

  log("Cargando pagos...");
  const pagos = await listarPagos(token);

  sep();
  log(`Total facturas: ${facturas.length}`);
  log(`Total pagos:    ${pagos.length}`);
  sep();

  if (facturas.length === 0 && pagos.length === 0) {
    ok("No hay nada que borrar.");
    rl.close();
    return;
  }

  // Mostrar resumen
  if (facturas.length > 0) {
    console.log("\n  Facturas a borrar:");
    facturas.forEach((f) => {
      const id = f.id || f.factura_id || "sin-id";
      log(`  • ${f.numero_factura || id}  (id: ${id})`);
    });
  }
  if (pagos.length > 0) {
    console.log("\n  Pagos a borrar:");
    pagos.forEach((p) => {
      const id = p.id || p.pago_id || "sin-id";
      log(`  • id:${id}  monto:${p.monto ?? "?"}  solicitud:${p.solicitud_venta_id || p.solicitud_codigo || "?"}`);
    });
  }

  // 2) Recopilar IDs de solicitudes afectadas
  const solicitudIdsAfectadas = new Set();

  facturas.forEach((f) => {
    if (f.solicitud_venta_id) solicitudIdsAfectadas.add(f.solicitud_venta_id);
    if (Array.isArray(f.solicitudes)) {
      f.solicitudes.forEach((s) => {
        if (s.solicitud_venta_id) solicitudIdsAfectadas.add(s.solicitud_venta_id);
      });
    }
    if (Array.isArray(f.solicitudes_vinculadas)) {
      f.solicitudes_vinculadas.forEach((s) => {
        if (s.id) solicitudIdsAfectadas.add(s.id);
        if (s.solicitud_venta_id) solicitudIdsAfectadas.add(s.solicitud_venta_id);
      });
    }
  });

  pagos.forEach((p) => {
    if (p.solicitud_venta_id) solicitudIdsAfectadas.add(p.solicitud_venta_id);
  });

  // ── Modo dry-run: volcar datos completos y parar ──────────────────────────
  if (DRY_RUN) {
    console.log("\n════════════════════════════════════════════════════════════");
    console.log("  DATOS COMPLETOS (tal como devuelve el backend)");
    console.log("════════════════════════════════════════════════════════════");

    console.log(`\n  ── FACTURAS (${facturas.length}) ──────────────────────────────────`);
    if (facturas.length === 0) {
      log("(ninguna)");
    } else {
      facturas.forEach((f, i) => {
        console.log(`\n  [${i + 1}] ${f.numero_factura || f.id || "sin número"}`);
        console.log(JSON.stringify(f, null, 4).split("\n").map(l => "      " + l).join("\n"));
      });
    }

    console.log(`\n  ── PAGOS (${pagos.length}) ──────────────────────────────────────`);
    if (pagos.length === 0) {
      log("(ninguno)");
    } else {
      pagos.forEach((p, i) => {
        console.log(`\n  [${i + 1}] id:${p.id || p.pago_id || "?"}  monto:${p.monto ?? "?"}  método:${p.metodo_pago || "?"}`);
        console.log(JSON.stringify(p, null, 4).split("\n").map(l => "      " + l).join("\n"));
      });
    }

    console.log(`\n  ── SOLICITUDES QUE SERÍAN REABIERTAS (${solicitudIdsAfectadas.size}) ──`);
    if (solicitudIdsAfectadas.size === 0) {
      log("(ninguna)");
    } else {
      for (const id of solicitudIdsAfectadas) log(`  • ${id}`);
    }

    console.log("\n════════════════════════════════════════════════════════════");
    console.log("  RESUMEN DRY-RUN");
    console.log("════════════════════════════════════════════════════════════");
    log(`Facturas a eliminar:     ${facturas.length}`);
    log(`Pagos a eliminar:        ${pagos.length}`);
    log(`Solicitudes a reabrir:   ${solicitudIdsAfectadas.size}`);
    sep();
    ok("Dry-run completado. No se realizó ningún cambio.");
    console.log("  Para ejecutar los cambios reales omite el flag --dry-run.");
    console.log();
    rl.close();
    return;
  }

  // ── Modo real: mostrar resumen y pedir confirmación ──────────────────────
  console.log("\n  Facturas a borrar:");
  facturas.forEach((f) => {
    const id = f.id || f.factura_id || "sin-id";
    log(`  • ${f.numero_factura || id}  (id: ${id})`);
  });
  console.log("\n  Pagos a borrar:");
  pagos.forEach((p) => {
    const id = p.id || p.pago_id || "sin-id";
    log(`  • id:${id}  monto:${p.monto ?? "?"}  solicitud:${p.solicitud_venta_id || p.solicitud_codigo || "?"}`);
  });
  console.log("\n  Solicitudes que serán reabiertas:");
  for (const id of solicitudIdsAfectadas) log(`  • ${id}`);
  sep();

  const confirm = await ask("¿Confirmas que deseas borrar TODO? Escribe 'SI' para continuar: ");
  if (confirm.trim().toUpperCase() !== "SI") {
    warn("Operación cancelada.");
    rl.close();
    return;
  }

  sep();

  // 3) Borrar facturas
  if (facturas.length > 0) {
    console.log("\n  Borrando facturas...");
    let okCount = 0, failCount = 0;
    for (const f of facturas) {
      const id = f.id || f.factura_id;
      if (!id) { warn(`Factura sin ID, omitida: ${JSON.stringify(f).slice(0, 80)}`); failCount++; continue; }

      const exito = await borrarFactura(token, id);
      if (exito) { ok(`Factura ${f.numero_factura || id} borrada`); okCount++; }
      else       { err(`No se pudo borrar factura ${f.numero_factura || id}`); failCount++; }
    }
    log(`Facturas: ${okCount} borradas, ${failCount} fallidas`);
  }

  // 4) Borrar pagos
  if (pagos.length > 0) {
    console.log("\n  Borrando pagos...");
    let okCount = 0, failCount = 0;
    for (const p of pagos) {
      const id = p.id || p.pago_id;
      if (!id) { warn(`Pago sin ID, omitido`); failCount++; continue; }

      const exito = await borrarPago(token, id);
      if (exito) { ok(`Pago ${id} borrado`); okCount++; }
      else       { err(`No se pudo borrar pago ${id} — puede que el backend no tenga DELETE para pagos`); failCount++; }
    }
    log(`Pagos: ${okCount} borrados, ${failCount} fallidos`);
  }

  // 5) Reabrir solicitudes afectadas
  if (solicitudIdsAfectadas.size > 0) {
    console.log("\n  Reabriendo solicitudes...");
    let okCount = 0, failCount = 0;
    for (const solicitudId of solicitudIdsAfectadas) {
      const exito = await reabrirSolicitud(token, solicitudId);
      if (exito) { ok(`Solicitud ${solicitudId} reabierta`); okCount++; }
      else       { err(`No se pudo reabrir solicitud ${solicitudId}`); failCount++; }
    }
    log(`Solicitudes: ${okCount} reabiertas, ${failCount} fallidas`);
  }

  sep();
  ok("Proceso completado.");
  console.log();

  rl.close();
}

main().catch((e) => {
  err(`Error inesperado: ${e.message}`);
  process.exit(1);
});
