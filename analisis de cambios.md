# Registro de Análisis de Cambios — SunCarWeb

---

## 📅 6 de Mayo, 2026

### Resumen de cambios (últimas 24h)

**Áreas: Rendimiento (leads/materiales/trabajadores), módulo Envío Contenedores, módulo Recursos (ex-Asignaciones), análisis de stock en almacenes, fixes varios**

| Commit | Autor | Descripción |
|--------|-------|-------------|
| `1d4d779` | Fabián1820 | *(sin descripción: "hjghjgj")* |
| `7e7661a` | Ruben/Claude | fix(duplicar-oferta): cargar oferta completa con items al duplicar |
| `dfac8b4` | Ruben/Claude | feat(envio-contenedores): nuevos campos (BL, buque, sello, tipo, rutas, partes), adjuntos S3 |
| `0a743ac` | Fabián1820 | "materiales nuevos campos de precios ok" (47 adiciones) |
| `2dded82` | Ruben/Claude | refactor(envio-contenedores): mover adjuntos de ficha-costo a página principal |
| `93ff56a` | Fabián1820 | "fix solicitudes de ventas" (sin descripción detallada) |
| `9abf385` | Fabián1820 | *(sin descripción: "mnbjk")* |
| `2e8c41f` | Fabián1820 | *(sin descripción: "bhjvjvh")* |
| `ee9543a` | Ruben/Claude | perf(leads): endpoint `/leads/comerciales` en lugar de descarga 10-25 MB |
| `84c5afa` | Ruben/Claude | perf(leads): dropdown comercial desde `/trabajadores/comerciales` |
| `933c7f6` | Ruben/Claude | perf(materiales): búsqueda backend on-demand en 3 diálogos |
| `42f0bf6` | Ruben/Claude | perf(trabajadores): eliminar `getAllTrabajadores()` de diálogos, búsqueda backend |
| `b256499` | Fabián1820/Claude | feat(asignaciones): renombrar a Recursos, mover a RR.HH, tab instalaciones, CRUD asignaciones-instalaciones |
| `6496910` | Ruben/Claude | feat(almacenes): modal análisis de stock mínimo con semáforo crítico/alerta/ok |
| `4caf94e` | Ruben/Claude | fix(almacenes): validar respuesta de backend (500) en modal de análisis de stock |
| `fa40341` | Fabián1820/Claude | fix(traspasos): obtener stock real por material desde API (almacen_id vacío daba 0) |
| `1725db0` | yany1509 | "ventas" (sin descripción) |
| `29287c2` | Fabián1820/Claude | fix(asignaciones): corregir carga de trabajadores, instalaciones y materiales |

### Análisis de riesgos y consideraciones

#### 🔴 Riesgos altos

1. **Backend 500 en endpoint de análisis de stock (almacenes)**
   - `feat` a las 17:58, `fix` a las 18:07 (9 min después). El fix valida que el backend devuelve error 500 y muestra mensaje descriptivo en lugar de crashear.
   - **El backend sigue fallando con 500.** El fix solo protege el frontend. El endpoint de historial de movimientos para calcular stock mínimo en LlegoBackend no está funcionando o no existe.
   - **Acción urgente:** Verificar en LlegoBackend si el endpoint existe y corregir el error del servidor.

2. **Módulo Recursos: fix extenso 3.5 horas después del feat**
   - `b256499` (17:40) lanza el módulo; `29287c2` (21:09) lo repara con cambios significativos:
     - `_id → id` en tipo `Instalacion` e `InstalacionConAsignaciones`
     - Normalización de respuestas `/asignaciones-trabajadores/` con fallback CI/ci
     - Cambio de servicio para almacenes/tiendas/sedes (InventarioService, SedeService)
     - Endpoint catálogo materiales cambiado a `/productos/admin/materiales?categoria=`
     - `extractArray` robusto para `{ data: [] }` vs array directo
   - Indica que el módulo se testó en staging con múltiples fallos de integración.
   - **Acción recomendada:** Verificar el flujo completo del módulo Recursos: asignación por trabajador y por instalación, selección de almacén/tienda/sede, carga de catálogo de materiales y medios básicos.

3. **fix(traspasos): normalización rota de `almacen_id` en stock paginado**
   - La lista paginada (max 40 items) devuelve `almacen_id` vacío tras normalización, causando que el filtro nunca coincida y muestre stock 0 para todos los materiales.
   - **El mismo patrón de normalización puede estar roto en otros módulos** que consumen stock paginado.
   - **Acción recomendada:** Buscar en el codebase otros lugares que filtren por `almacen_id` sobre datos paginados y verificar que reciben el valor correcto.

4. **4 commits sin descripción** ("hjghjgj", "mnbjk", "bhjvjvh" de Fabián1820 + "ventas" de yany1509) — cambios no auditables.

#### 🟡 Riesgos medios

5. **Adjuntos S3 en envío-contenedores: nuevos endpoints en backend**
   - `uploadArchivos`, `getArchivos`, `deleteArchivo` son métodos nuevos en el servicio.
   - Si los endpoints `/envio-contenedores/{id}/archivos` no están deployados en LlegoBackend, el panel de documentos fallará con 404 o 500.
   - **Acción recomendada:** Confirmar que los endpoints S3 están desplegados antes de probar en producción.

6. **Nuevos campos en envío-contenedores no guardados si el backend no los acepta**
   - BL, buque, referencia, sello, tipo contenedor (20DV/40DV/40HC), puertos, país, proveedor, cliente, transitaria son campos nuevos en el formulario.
   - Si el modelo del backend no incluye estos campos, se descartarán silenciosamente al guardar.
   - **Acción recomendada:** Verificar el schema del modelo `EnvioContenedor` en LlegoBackend.

7. **Refactor adjuntos: documentos movidos de ficha-costo a página principal**
   - El componente `EnvioDocumentosPanel` fue eliminado de la ficha de costo y reemplazado por un botón "Docs" en la tabla de la página principal.
   - Si hay datos de adjuntos existentes en producción, hay que confirmar que se siguen mostrando correctamente desde la nueva ubicación.

8. **"materiales nuevos campos de precios ok" (0a743ac, +47/-11)**
   - 47 adiciones sin descripción. Posiblemente añade campos de precios al formulario/tabla de materiales.
   - Si los campos son requeridos y no tienen defaults, puede romper el guardado de materiales existentes que no tengan esos valores.

9. **Búsqueda per-row en `completar-visita` con estado individual por fila**
   - Estado `matRowSearch/Results/Open/Loading` por fila puede generar muchas requests concurrentes en visitas con múltiples ítems.
   - Verificar que el debounce es suficiente para evitar saturar el endpoint de búsqueda.

#### 🟢 Mejoras positivas

10. **Eliminación de cargas masivas de datos**
    - `/leads/comerciales` reemplaza descarga de 10-25 MB de todos los leads para obtener ~20 comerciales.
    - `getAllMaterials()` reemplazado por búsqueda on-demand en 3 diálogos clave.
    - `getAllTrabajadores()` eliminado de 2 diálogos.

11. **fix(duplicar-oferta): bug bloqueante resuelto**
    - La oferta se buscaba en la lista general (sin items), dejando el formulario vacío y el botón de guardar bloqueado. Ahora carga el detalle completo con items.

12. **Análisis de stock mínimo con semáforo visual**
    - Modal configurable por lead time y nivel de servicio (90/95/98/99%) con estado crítico/alerta/ok por producto.

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
   - La fórmula inversa puede generar errores de redondeo de centavos acumulados en transacciones altas.
   - **Acción urgente:** Verificar en cada uno de los 5 archivos que se aplica exactamente la misma fórmula. Hacer prueba end-to-end con montos conocidos y comparar lo que llega neto vs. lo esperado.

2. **Ciclo de 4 fixes consecutivos en el modal Stripe de solicitudes-ventas en menos de 10 minutos**
   - `9c718f9` → `1777296` → `0c0489e` → `f808c2d` (20:46–20:56). Patrón de debug en producción.
   - El filtro por `solicitud_venta_id` fue añadido y luego eliminado. La lógica de alcance del modal (¿filtra por solicitud o muestra todos?) no quedó clara en los mensajes.
   - **Acción recomendada:** Confirmar el comportamiento esperado: ¿el modal de una solicitud específica debe mostrar solo sus pagos o todos? Si es por solicitud, el filtrado debe implementarse correctamente en el backend, no en el frontend.

3. **7 commits con mensajes vagos de yany1509** ("terminada", "ajustes" ×3, "listo", "listoooo", "ajustes en solicitudes ventas")
   - Cambios sin auditoría posible. Se desconoce el alcance real de las modificaciones.
   - **Acción recomendada:** Revisar los diffs de estos commits manualmente antes de considerar estable la rama.

#### 🟡 Riesgos medios

4. **`StripePagosModal` sin filtrado por `solicitud_venta_id`**
   - Se quitó el filtro que "ocultaba todos los pagos". Ahora el modal muestra todos los pagos Stripe del sistema.
   - En la pestaña de pendientes-pago, hay un "botón por fila" que supuestamente abre el modal filtrado por solicitud (`solicitudId` como prop). Si ese filtrado no está activo en la versión final, el usuario verá pagos de otras solicitudes mezclados.
   - **Consideración:** Verificar que `StripePagosModal` recibe y aplica correctamente `solicitudId` cuando se abre desde una fila específica.

5. **Campo `costo_nuevo` propagado automáticamente a precios de catálogo**
   - `costo_nuevo = CIF × (1 + (%Envío + Δ) / 100)`. Precios venta e instaladora se derivan de él.
   - Si `Δ` se persiste con un valor incorrecto o se aplica sobre datos ya procesados (double-apply), todos los precios del catálogo afectado quedarán mal.
   - **Acción recomendada:** Verificar que "Guardar" en la ficha de costo aplica la fórmula una sola vez y que no hay efecto acumulativo al abrir y guardar repetidamente.

6. **Merge commit `ab23452` entre commits de funcionalidad activa**
   - Merge de `main` realizado mientras se estaban subiendo cambios en cadena. Puede haber mezclado versiones inconsistentes del modal.
   - **Consideración:** Revisar que el estado final de los archivos de solicitudes-ventas coincide con la última versión esperada.

#### 🟢 Mejoras positivas

7. **Integración completa de Stripe en solicitudes-ventas**
   - Generación de links de pago con precio manual, panel de pagos, y consistencia con el flujo de cobros clientes.

8. **Fórmula de comisión más precisa (3.25% + $0.30)**
   - La fórmula inversa garantiza que el monto neto recibido sea exactamente el precio base configurado, eliminando el error de la estimación fija del 5%.

9. **Botón "Ver Stripe" dentro del modal de pago**
   - Mejor UX: el acceso a los cobros Stripe está contextualizado dentro del flujo de pago.

10. **`.claude` agregado al `.gitignore`**
    - Evita que archivos internos de sesión de Claude Code se suban accidentalmente al repo.

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
