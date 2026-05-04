# Registro de Análisis de Cambios — SunCarWeb

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
   - Toca 9 archivos: `clients-table.tsx` (196 cambios), `facturas-section.tsx` (54 cambios), `asignar-oferta-generica-dialog.tsx` (24 cambios), `clientes/page.tsx`, `leads/page.tsx`, `leads-table.tsx`, `cliente-types.ts`, `lead-types.ts`, y **nuevo archivo** `lib/utils/oferta-confeccion-items.ts` (47 líneas).
   - Total: 259 adiciones / 151 eliminaciones. Cambio masivo con mensaje que no describe el alcance real.
   - **Acción urgente:** Probar end-to-end: listado y detalle de clientes, creación/edición de leads, sección de facturas, y asignación de oferta genérica. Revisar el nuevo utilitario `oferta-confeccion-items.ts` para confirmar que no duplica lógica ni rompe contratos de tipos existentes.

2. **Commit `0a1dab7` (Fabian1820) — "stock ok" reescribe dos diálogos críticos**
   - `create-solicitud-material-dialog.tsx`: 84 adiciones / 64 eliminaciones.
   - `upsert-solicitud-venta-dialog.tsx`: 79 adiciones / 69 eliminaciones.
   - Ambos son flujos clave del negocio. Sin descripción del cambio, el riesgo no es auditable sin leer el diff completo.
   - **Acción recomendada:** Probar la creación de solicitudes de materiales y de ventas end-to-end, incluyendo selección de stock, cantidades y submit.

#### 🟡 Riesgos medios

3. **Nuevo módulo Asignaciones a Empleados**
   - Módulo CRUD completo nuevo con comboboxes buscables, modales con tabs, y catálogos de medios básicos y herramientas.
   - Riesgos habituales de módulos nuevos: estados vacíos en comboboxes, validaciones de campos requeridos, endpoints del backend que deben existir en producción.
   - **Acción recomendada:** Verificar que los endpoints de catálogos (medios básicos, herramientas) y asignaciones están disponibles y desplegados en el backend antes de mostrar el módulo a usuarios.

4. **Fix `periodoRange` usa `.start/.end` en lugar de índices de array**
   - Corrección necesaria, pero implica que antes se accedía con índices (`[0]`, `[1]`). Si algún consumidor de `periodoRange` fuera del componente central no fue actualizado, fallará silenciosamente devolviendo `undefined` como fecha.
   - **Consideración:** Buscar en el codebase si `periodoRange[0]` o `periodoRange[1]` aún existen en algún archivo.

5. **Secuencia de commits iterativos en almacén page (Fabian1820)**
   - `e70ffa4` ("vhj", 22 cambios) y `99e02ec` ("export stock all ok", 20 cambios) modificaron `app/almacenes/[almacenId]/page.tsx` en commits seguidos. El patrón sugiere desarrollo sin pruebas intermedias.
   - **Acción recomendada:** Verificar la funcionalidad de exportación de stock y la página de almacén completa en staging.

6. **Nuevo `lib/utils/oferta-confeccion-items.ts` creado por yany1509**
   - Utilitario de 47 líneas relacionado con ítems de oferta confección, introducido sin mensaje descriptivo.
   - **Consideración:** Confirmar que no duplica utilidades existentes y que sus tipos son compatibles con los del módulo de confección.

#### 🟢 Mejoras positivas

7. **Centro de Control: cobertura completa de los 4 modos del mapa de períodos**
   - `maxByMode` ahora incluye `trabajos_diarios`, `clientes_trabajados`, `instalaciones_terminadas` y `averias_solucionadas_periodo`. La densidad de colores escala correctamente por modo.

8. **Click handlers en todos los modos de período**
   - Cada municipio en el mapa llama a `getPeriodoMunicipioDetalle` con las fechas correctas de `periodoRange`. Mejora la interactividad del dashboard.

9. **Módulo Asignaciones a Empleados con comboboxes buscables y modales con tabs**
   - Funcionalidad nueva completa, bien estructurada para gestión de activos asignados por trabajador.

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

3. **Triple capa de protección contra valores stale**
   - `editarDialogKey` fuerza remount completo: puede causar parpadeo en conexiones lentas.
   - `cache: 'no-store'` agrega un round-trip de red en cada apertura del diálogo de edición.

4. **`PersonalMessageOverlay` en `app/layout.tsx` (todas las páginas)**
   - Un error de render puede romper el layout completo. Verificar manejo de errores.

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

1. **Cambio del tipo de retorno de `getStock` de array plano a `{data, total, skip, limit}`**
   - Si algún caller se pasó por alto, fallará intentando `.map()` sobre un objeto.
   - **Acción recomendada:** Probar cada módulo que consume `getStock` explícitamente.

2. **Dos commits de Fabian1820 sin descripción (`hgvhj`, `vhjvhjvhjv`)**
   - **Acción urgente:** Revisar manualmente esos diffs. Considerar hook de pre-commit.

#### 🟡 Riesgos medios

3. **Centro de Control conectado a nuevos endpoints** — verificar que todos están desplegados en producción.
4. **Heatmap con nombres de municipio del backend** — deben coincidir exactamente con el GeoJSON.
5. **`ESTADO_OFERTA_LABELS` sin fallback** — estados no mapeados aparecerán como `undefined`.
6. **Overlay de errores 422 asume formato FastAPI** — formatos custom pueden fallar.
7. **Tabs on-demand en almacenes** — confirmar que el lottie loader aparece correctamente.

#### 🟢 Mejoras positivas

8. Paginación server-side + imágenes lazy en stock.
9. Eliminación de llamada de 428KB a `/visitas/` en Centro de Control.
10. Overlay global de errores 422 no intrusivo.
11. Ver factura solar carros.

---

## 📅 29 de Abril, 2026

### Resumen de cambios (últimas 24h)

**Áreas: Rendimiento, módulo de confección, loader/UI, solicitudes, facturación**

| Commit | Autor | Descripción |
|--------|-------|-------------|
| `eb7acfe` | Ruben0304 | perf: equipos de clientes on-demand — elimina espera de 20s |
| `0b80186` | Ruben0304 | perf: Centro de Control — 1 request en lugar de 15+ (caché 45s) |
| `8510f48` | Fabian1820 | fix: usa `total_pagado`/`precio_pagado` por ítem para descuentos en ventas |
| `cfafdf4` | Ruben0304 | fix: importa `DotLottieReact` dinámicamente con `ssr:false` en Loader y PageLoader |
| `35bb8c8` | Ruben0304 | feat: paginación y filtros backend en módulo de ofertas de confección |
| `f42bac1` | Ruben0304 | ajustes en loader, page-loader y ofertas confeccionadas; animación solar |
| `3e45a68` | yany1509 | ajustes en solicitudes |
| `d168ce0` | yany1509 | ajustes en solicitudes |
| `707b287` | yany1509 | ajustes |
| `e199098` | Fabian1820 | conduce y garantía |
| `2a42154` | Fabian1820 | facturación ventas |
| *(8 commits)* | Fabian1820 | *(mensajes sin descripción: "mnvhjvjh", "gyjgjghj", "hgbjh", "gfuyguy", "hvjhv", "bkjbjk", "fefew", "fdvfdvb")* |

### Análisis de riesgos y consideraciones

#### 🔴 Riesgos altos

1. **8 commits con mensajes completamente sin descripción** (Fabian1820) — imposibles de auditar. Establecer hook de pre-commit.
2. **Carga on-demand de `equiposParaCard` vía `/equipos-batch`** — verificar que el endpoint existe en producción.
3. **`ofertasItemsCompleto` carga lazy** — verificar timeout y estado de error visible.

#### 🟡 Riesgos medios

4. **Caché de 45s en Centro de Control** — evaluar si es aceptable para el negocio.
5. **Fix `total_pagado`/`precio_pagado`** — verificar registros históricos de ventas.
6. **`DotLottieReact` con `ssr:false`** — flash sin animación en conexiones lentas.

#### 🟢 Mejoras positivas

7. Paginación backend en módulo de confección.
8. Centro de Control: 1 request en lugar de 15+.
9. Eliminación de espera de 20s en equipos de clientes.

---
