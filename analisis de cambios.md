# Registro de Análisis de Cambios — SunCarWeb

---

## 📅 7 de Mayo, 2026

### Resumen de cambios (últimas 24h)

**Áreas: Buscador de materiales en solicitudes, fix material_id, renombre de tabs en facturas, averías**

| Commit | Autor | Descripción |
|--------|-------|-------------|
| `70972b0` | Ruben0304 | fix: buscador de materiales extra en solicitudes no mostraba resultados |
| `35a8145` | yany1509 | "solicitudes" — sin descripción |
| `308a5f1` | yany1509 | "solcitudes corregido" — vago |
| `fb7b0d8` | Ruben0304 | refactor(facturas): renombrar tabs en cobros clientes |
| `3fd5b73` | Ruben0304 | fix(solicitudes-materiales): usar `material_id` real al agregar manual |
| `38559d3` | yany1509 | "averias" — sin descripción |
| `7b12223` | yany1509 | Merge branch 'main' |
| `d0d1a5f` | yany1509 | "averias" — sin descripción (11 min después del anterior) |
| `3b9f8b2` | yany1509 | "jj" — sin descripción |

**Contexto:** Día con dos hilos paralelos: Ruben resolvió bugs concretos y bien documentados en el flujo de solicitudes de materiales; yany1509 trabajó en "solicitudes" y "averías" con una cadena de commits vagos que incluye un merge entre dos commits de la misma área.

### Análisis de riesgos y consideraciones

#### 🔴 Riesgos altos

1. **Patrón doble "averias" con merge en medio (yany1509)**
   - Commits `38559d3` ("averias", 21:05) → `7b12223` (Merge, 21:05) → `d0d1a5f` ("averias", 21:16) → `3b9f8b2` ("jj", 21:21).
   - Cuatro commits en 16 minutos sobre la misma área con un merge intercalado. Patrón típico de debug en producción o resolución manual de conflictos sin verificación.
   - El commit `3b9f8b2` ("jj") es el más reciente y el más opaco: no hay forma de saber qué corrige o si introduce regresiones.
   - **Acción urgente:** Revisar el diff de `3b9f8b2` y `d0d1a5f` manualmente. Probar el módulo de averías end-to-end.

2. **5 commits con mensajes sin valor descriptivo** ("solicitudes", "solcitudes corregido", "averias" ×2, "jj")
   - El historial de auditoría de los cambios de yany1509 en este día es prácticamente inutilizable sin leer cada diff.
   - **Acción recomendada:** Establecer convención mínima de mensajes de commit. Un hook de pre-commit que rechace mensajes de menos de 10 caracteres o sin espacio sería suficiente.

#### 🟡 Riesgos medios

3. **Cambio de prioridad en `normalizeSearchMaterial`: `material_id` sobre `id`**
   - El fix de `3fd5b73` hace que `normalizeSearchMaterial` priorice `material_id` (ObjectId real) en lugar de `id` (código de catálogo). Esto afecta también a `vales-salida`, `salida-lote-form` y `completar-visita-dialog`.
   - Si alguno de estos consumidores usa el valor devuelto como código de búsqueda textual (no como ObjectId para el backend), el comportamiento habrá cambiado silenciosamente.
   - **Acción recomendada:** Verificar los 4 componentes afectados: que el valor normalizado se usa correctamente según el tipo de campo esperado por el backend.

4. **Fix del buscador afecta a la función `normalizeSearchMaterial` compartida**
   - El fix de `70972b0` agrega `modelo`/`descripcion_uso`/`unidad` como fallback. Si otros endpoints que NO son `/productos/materiales` usan la misma función de normalización pero devuelven campos con nombres diferentes, podrían quedar en un estado inconsistente.
   - **Consideración:** Confirmar que los 4+ componentes que usan `normalizeSearchMaterial` todos consumen el mismo endpoint o estructura de datos.

5. **Renombre de tabs en cobros clientes**
   - Cambio cosmético de bajo riesgo. Sin embargo, si el nombre de la tab se usa como clave para persistencia de estado (localStorage, query params, etc.), usuarios con estado anterior guardado podrán ver la tab incorrecta seleccionada al volver.
   - **Consideración:** Verificar que no hay keys de estado vinculadas al nombre antiguo de las tabs.

#### 🟢 Mejoras positivas

6. **Fix buscador de materiales** — `normalizeSearchMaterial` ahora mapea correctamente los campos del endpoint `/productos/materiales` (`modelo`, `descripcion_uso`, `unidad`). Antes todos los resultados retornaban `null`, inutilizando el buscador.

7. **Fix `material_id` en solicitudes manuales** — elimina los errores 400 "material_id debe ser un ObjectId válido" que ocurrían al agregar materiales manualmente. Defensa adicional con validación de formato ObjectId.

---

## 📅 5 de Mayo, 2026

### Resumen de cambios (últimas 24h)

**Áreas: Integración Stripe en solicitudes-ventas, corrección fórmula comisión Stripe, campo costo_nuevo en ficha de envío-contenedores, facturas/pagos clientes**

| Commit | Autor | Descripción |
|--------|-------|-------------|
| `cb579f7` | Ruben/Claude | feat(solicitudes-ventas): agregar generación de links de pago Stripe + panel de pagos |
| `5d077ba` | Ruben/Claude | fix(solicitudes-ventas): corregir endpoint `/api/stripe/listar-pagos` |
| `5290742` | Ruben/Claude | feat(solicitudes-ventas): mover botón generar link al modal de detalle |
| `ac5aa75` | Ruben/Claude | fix(stripe): reemplazar comisión fija 5% por fórmula real 3.25% + $0.30 en 5 archivos |
| `fc3fb2d` | Ruben/Claude | feat(envio-contenedores): campo `costo_nuevo` editable en ficha de costo |
| `57ec947` | yany1509 | "facturas de ventas y pagos" — cambios sin descripción |
| `babf805` | yany1509 | "ajustes en solicitudes ventas" |
| `512bc86` | yany1509 | "Merge: Combine payment management tabs with Stripe modal integration" |
| `ff6dab0` | yany1509 | "terminada" |
| `312a84d` / `3931374` / `64de30f` | yany1509 | "ajustes" x3 |
| `b34ac82` / `575030f` | yany1509 | "listo" / "listoooo" |
| `289d36b` | yany1509/Claude | Agregar botón Cobros Stripe en pestaña pendientes-pago |
| `5b21cba` | yany1509/Claude | Cobros Stripe en pendientes: botón header + botón por fila + modal filtrado |
| `9255eb4` | yany1509/Claude | Mover botón Ver Stripe al interior del modal de pago |
| `9c718f9` | yany1509/Claude | Fix carga pagos Stripe: agregar `solicitudId` a deps de `useCallback` |
| `1777296` | yany1509/Claude | Mostrar todos los pagos Stripe sin filtrar por solicitud |
| `0c0489e` | yany1509/Claude | Fix: quitar filtro `solicitud_venta_id` que ocultaba todos los pagos |
| `f808c2d` | yany1509/Claude | Usar `StripePagosModal` igual que facturación/pagos clientes |
| `033c271` | yany1509 | Ignorar directorio `.claude` del repo (.gitignore) |

### Análisis de riesgos y consideraciones

#### 🔴 Riesgos altos

1. **Fórmula de comisión Stripe cambiada en 5 archivos simultáneamente**
   - De `precio * 1.05` (5% fijo) a `(neto + 0.30) / (1 - 0.0325)` (3.25% + $0.30).
   - Archivos afectados: `generar-link` (route), `ofertas`, `ofertas-personalizadas`, `confeccion`, `solicitudes-ventas`.
   - Si alguno de los 5 quedó sin actualizar o con la lógica antigua, habrá inconsistencia de precios cobrados entre módulos.
   - **Acción urgente:** Verificar en cada uno de los 5 archivos que se aplica exactamente la misma fórmula. Hacer prueba end-to-end con montos conocidos.

2. **Ciclo de 4 fixes consecutivos en el modal Stripe de solicitudes-ventas en menos de 10 minutos**
   - `9c718f9` → `1777296` → `0c0489e` → `f808c2d` (20:46–20:56). Patrón de debug en producción.
   - El filtro por `solicitud_venta_id` fue añadido y luego eliminado. La lógica de alcance del modal no quedó clara en los mensajes.
   - **Acción recomendada:** Confirmar el comportamiento esperado: ¿el modal de una solicitud específica debe mostrar solo sus pagos o todos?

3. **7 commits con mensajes vagos de yany1509** ("terminada", "ajustes" ×3, "listo", "listoooo", "ajustes en solicitudes ventas")
   - **Acción recomendada:** Revisar los diffs de estos commits manualmente antes de considerar estable la rama.

#### 🟡 Riesgos medios

4. **`StripePagosModal` sin filtrado por `solicitud_venta_id`**
   - Se quitó el filtro que "ocultaba todos los pagos". Ahora el modal muestra todos los pagos Stripe del sistema.
   - Verificar que cuando se abre desde una fila específica, `solicitudId` se recibe y aplica correctamente.

5. **Campo `costo_nuevo` propagado automáticamente a precios de catálogo**
   - `costo_nuevo = CIF × (1 + (%Envío + Δ) / 100)`. Si se aplica sobre datos ya procesados (double-apply), todos los precios del catálogo afectado quedarán mal.
   - **Acción recomendada:** Verificar que "Guardar" aplica la fórmula una sola vez.

#### 🟢 Mejoras positivas

6. Integración completa de Stripe en solicitudes-ventas.
7. Fórmula de comisión más precisa (3.25% + $0.30).
8. `.claude` agregado al `.gitignore`.

---

## 📅 4 de Mayo, 2026

### Resumen de cambios (últimas 24h)

**Áreas: Centro de Control (mapa períodos), nuevo módulo Asignaciones a Empleados, clientes/leads/facturas, solicitudes de materiales y ventas, almacenes**

| Commit | Autor | Descripción |
|--------|-------|-------------|
| `19addb6` | Ruben/Claude | feat: módulo completo Asignaciones a Empleados (CRUD medios básicos y herramientas) |
| `cfdb27c` | Ruben/Claude | feat: tipos y métodos de servicio para periodo/municipio en centro-control |
| `706b081` | Ruben/Claude | fix: mapa de períodos en Centro Control — 4 modos, click handlers y reactividad geoKey |
| `a583f6a` | yany1509 | "ajustes en cliente" — clientes, leads, facturas, nuevo util oferta-confeccion-items (410 cambios en 9 archivos) |
| `0a1dab7` | Fabian1820 | "stock ok" — rework de diálogos solicitudes-materiales y solicitudes-ventas (296 cambios) |
| `99e02ec` | Fabian1820 | "export stock all ok" — exportación de stock en almacén |
| `e70ffa4` | Fabian1820 | "vhj" — ajustes en página de almacén |
| `38a1969` | Fabian1820 | "mbj" — ajuste en create-solicitud-material-dialog |

### Análisis de riesgos y consideraciones

#### 🔴 Riesgos altos

1. **Commit `a583f6a` (yany1509) — scope real muy amplio para "ajustes en cliente"**
   - Toca 9 archivos: `clients-table.tsx` (196 cambios), `facturas-section.tsx` (54 cambios), y **nuevo archivo** `lib/utils/oferta-confeccion-items.ts` (47 líneas).
   - Total: 259 adiciones / 151 eliminaciones. Cambio masivo con mensaje que no describe el alcance real.
   - **Acción urgente:** Probar end-to-end: listado y detalle de clientes, creación/edición de leads, sección de facturas, y asignación de oferta genérica.

2. **Commit `0a1dab7` (Fabian1820) — "stock ok" reescribe dos diálogos críticos**
   - `create-solicitud-material-dialog.tsx`: 84 adiciones / 64 eliminaciones.
   - `upsert-solicitud-venta-dialog.tsx`: 79 adiciones / 69 eliminaciones.
   - **Acción recomendada:** Probar la creación de solicitudes de materiales y de ventas end-to-end.

#### 🟡 Riesgos medios

3. **Nuevo módulo Asignaciones a Empleados** — verificar que los endpoints de catálogos están disponibles en producción.
4. **Fix `periodoRange` usa `.start/.end`** — buscar si `periodoRange[0]` o `periodoRange[1]` aún existen en algún archivo.
5. **Secuencia de commits iterativos en almacén page** — verificar funcionalidad de exportación de stock.
6. **Nuevo `lib/utils/oferta-confeccion-items.ts`** — confirmar que no duplica utilidades existentes.

#### 🟢 Mejoras positivas

7. Centro de Control: cobertura completa de los 4 modos del mapa de períodos.
8. Click handlers en todos los modos de período.
9. Módulo Asignaciones a Empleados con comboboxes buscables.

---

## 📅 3 de Mayo, 2026

### Resumen de cambios (últimas 24h)

Sin commits de desarrollo nuevos. Solo el commit automático de "Analisis diario Claude".

#### Consideraciones pendientes

- El commit `c4f92e5` de yany1509 (ayer) sobre `confeccion-ofertas-view` debe revisarse manualmente para confirmar que no reintroduce la lógica de valores stale corregida el mismo día.
- El módulo de clientes (refactor masivo en `14ecc37`, 2308 líneas cambiadas) requiere prueba end-to-end en staging: creación, edición y validaciones.
- `PersonalMessageOverlay` montado en `layout.tsx` (todas las páginas) debe verificarse con manejo de errores adecuado antes de producción.

---

## 📅 2 de Mayo, 2026

### Resumen de cambios (últimas 24h)

**Áreas: Módulo de ofertas de confección (edición), módulo de clientes, contabilidad**

| Commit | Autor | Descripción |
|--------|-------|-------------|
| `9e42fee` | Ruben/Claude | fix: garantizar remount completo del diálogo de edición de ofertas (3 capas) |
| `21754ed` | Ruben/Claude | fix: margen_comercial muestra valor stale al reabrir diálogo de edición |
| `d0694e9` | Ruben/Claude | fix: usar `margenPorMaterialCalculado` (useMemo) en save de ofertas confección |
| `8e600be` | Ruben/Claude | fix: ajuste menor en módulo de contabilidad — nuevo `PersonalMessageOverlay` |
| `14ecc37` | yany1509 | "ajustes en solicitudes y trabajos diarios" — **en realidad: refactor masivo del módulo de clientes** |
| `c4f92e5` | yany1509 | "ofertas" — ajustes en `confeccion-ofertas-view` y `ofertas-confeccionadas-view` |

### Análisis de riesgos y consideraciones

#### 🔴 Riesgos altos

1. **Commit `14ecc37` de yany1509: mensaje engañoso + cambio masivo**
   - El mensaje dice _"ajustes en solicitudes y trabajos diarios"_ pero los archivos modificados son exclusivamente del módulo de clientes.
   - **Magnitud real:** 832 adiciones, 1476 eliminaciones (2308 líneas totales).
   - **Acción urgente:** Probar en staging la creación y edición de clientes end-to-end.

2. **Commit `c4f92e5` de yany1509 — colisión con los fixes de Claude**
   - Modifica los mismos archivos recién corregidos (`confeccion-ofertas-view.tsx`, `ofertas-confeccionadas-view.tsx`). Puede haber reintroducido el bug de stale values.
   - **Acción recomendada:** Confirmar que no revierte `estadoInicial = null` ni el uso de `margenPorMaterialCalculado`.

#### 🟡 Riesgos medios

3. **Triple capa de protección contra valores stale** — `editarDialogKey` fuerza remount completo: puede causar parpadeo en conexiones lentas.
4. **`PersonalMessageOverlay` en `app/layout.tsx`** — un error de render puede romper el layout completo.

#### 🟢 Mejoras positivas

5. **Resolución definitiva del bug de stale state en edición de ofertas.**
6. **Refactor del módulo de clientes: reducción neta de ~644 líneas.**

---

## 📅 1 de Mayo, 2026

### Resumen de cambios (últimas 24h)

Sin commits de desarrollo nuevos desde el análisis de ayer. Solo el commit automático de "Analisis diario Claude".

#### Consideraciones del día

- El cambio de tipo de retorno de `getStock` (April 30) merece prueba en todos sus consumidores hoy en staging.
- Los nuevos endpoints del Centro de Control deben estar verificados en producción antes de cualquier release.

---

## 📅 30 de Abril, 2026

### Resumen de cambios (últimas 24h)

**Áreas: Centro de Control, almacenes, manejo global de errores 422, ofertas/facturas**

| Commit | Autor | Descripción |
|--------|-------|-------------|
| `b26f898` | Ruben0304 | perf: Centro de Control — datos on-demand, mapas de conteos del backend |
| `10d42a1` | Ruben0304 | fix: evitar llamada `/visitas/` en carga inicial del Centro de Control |
| `997482` | yany1509 | Se añadió `estado` al tipo `ofertaData`; prefijo «hasta» en cableado AC/DC |
| `f45193b` | Ruben0304 | feat: conectar Centro de Control con nuevos endpoints del backend |
| `f494f54` | Fabian1820 | *(sin descripción: "hgvhj")* |
| `e186a05` | yany1509 | agregada opción de ver factura solar carros |
| `e72375a` | Fabian1820 | *(sin descripción: "vhjvhjvhjv")* |
| `809c661` | Ruben0304 | Add loading lottie to filtered lists |
| `d262ec3` | Ruben0304 | perf: carga on-demand por tab, paginación server-side e imágenes lazy en almacenes |
| `ee1582a` | Ruben0304 | feat: manejo global de errores 422 en `apiRequest` |
| `a7ef689` | Ruben0304 | feat: overlay global para errores de validación 422 |

### Análisis de riesgos y consideraciones

#### 🔴 Riesgos altos

1. **Cambio del tipo de retorno de `getStock`** — si algún caller se pasó por alto, fallará intentando `.map()` sobre un objeto.
2. **Dos commits de Fabian1820 sin descripción** (`hgvhj`, `vhjvhjvhjv`) — revisar manualmente.

#### 🟡 Riesgos medios

3. Centro de Control conectado a nuevos endpoints — verificar que todos están en producción.
4. Heatmap con nombres de municipio — deben coincidir exactamente con el GeoJSON.
5. `ESTADO_OFERTA_LABELS` sin fallback — estados no mapeados aparecerán como `undefined`.
6. Overlay de errores 422 asume formato FastAPI.

#### 🟢 Mejoras positivas

7. Paginación server-side + imágenes lazy en stock.
8. Eliminación de llamada de 428KB a `/visitas/` en Centro de Control.
9. Overlay global de errores 422 no intrusivo.
10. Ver factura solar carros.

---
