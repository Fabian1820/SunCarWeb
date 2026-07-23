# Registro de Análisis de Cambios — SunCarWeb

---

## 📅 23 de Julio, 2026

### Resumen de cambios (últimas 24h)

**2 commits reales** de yany1509 — ambos en el módulo de Pagos: corrección del cálculo de totales excluyendo pagos cancelados, y marcación visual de esos pagos en el Detalle de Cobros. Son follow-ups directos al botón "Cancelar pago" introducido el 17 de Julio.

---

### Área 1: Pagos — totales excluyen pagos cancelados (1 commit — yany1509, 17:23)

- **`fix(pagos): no cuenta pagos cancelados al calcular total pagado/pendiente`** — El cálculo local de "pendiente" y de "pagado hasta este pago" en el Detalle de Cobros sumaba todos los pagos de la oferta sin revisar el campo `cancelado`. Un pago duplicado cancelado seguía restándose del pendiente aunque el backend ya no lo contara como dinero recibido.

---

### Área 2: Pagos — marcación visual de cancelados en Detalle de Cobros (1 commit — yany1509, 17:55)

- **`fix(pagos): marca visualmente los pagos cancelados en el detalle de cobros`** — La tarjeta de cada pago dentro de "Detalle de Cobros" no distinguía un pago cancelado de uno activo — se veían idénticos aunque el total ya no lo contara. Ahora se le pone la insignia "Cancelado", el monto se tacha, la tarjeta se atenúa, y el contador del encabezado cuenta todos los pagos mostrados (no solo los activos) para que cuadre con lo que se ve en pantalla.

---

### Puede dar bateo

1. **Cálculo de "pendiente" solo en frontend — desincronía con totales del backend**: El fix filtra pagos cancelados en lógica local. Si el backend devuelve algún campo de saldo calculado (`saldo_pendiente`, `total_pagado`), esos siguen viniendo del servidor y pueden no alinearse con el fix del frontend.

2. **`cancelado` falsy/undefined para pagos históricos — filtro no los excluye**: El filtro `!p.cancelado` pasa cuando el campo es `undefined`. Pagos creados antes de que existiera el campo `cancelado` no se excluirán del cálculo si el backend no los rellena con `false` explícitamente.

3. **Contador de encabezado ahora muestra todos los pagos (activos + cancelados)**: El contador pasó de contar solo activos a contar todos los visibles. Un usuario que asociaba el número con "pagos válidos" verá un número inflado que incluye cancelados, lo cual puede generar confusión.

4. **Par de fixes en menos de 35 minutos — posible build intermedio en producción**: Si Railway auto-deploy está activo, el commit de las 17:23 hizo deploy antes del de las 17:55. En esa ventana, los totales estaban corregidos pero las tarjetas aún no mostraban el badge "Cancelado" ni el tachado.

---

## 📅 22 de Julio, 2026

### Resumen de cambios (últimas 24h)

**1 commit real** de yany1509 — fix en el módulo de facturas de solar/carros: el buscador de "cambiar material" ahora usa la categoría real del catálogo en lugar de un heurístico de texto con 3 buckets.

---

### Área 1: Facturas solar/carros — buscador de cambio de material usa categoría real (1 commit — yany1509, 19:41)

- **`fix(facturas-solar-carros): el buscador de cambiar material respeta la categoria real`** — El selector "Cambiar por..." de cada material de la factura adivinaba la categoría con substrings del texto crudo del ítem (3 buckets: inversor/batería/panel). Cualquier material fuera de esos 3 (tornillería, tierra, cableado) caía en "panel" por defecto, mostrando materiales de la categoría equivocada. Ahora usa la categoría real del material vinculado del catálogo (el mismo campo que usan Existencias/Contabilidad). Se mantiene el bucket anterior como fallback para filas sin match en el catálogo. Verificado con datos reales de dev: TIERRA (sin materiales en contabilidad) muestra vacío correctamente; BATERÍAS (13 con `codigo_contabilidad`) arma bien sus opciones.

---

### Puede dar bateo

1. **Fallback al heurístico anterior para filas sin match — comportamiento inconsistente sin indicador visual**: Cuando un material de la factura no tiene match en el catálogo, el selector vuelve silenciosamente al bucket de texto (inversor/batería/panel). El usuario no sabe si las opciones que ve son correctas o son el fallback incorrecto.

2. **Catálogo local puede estar stale — categoría incorrecta si la sesión no se recargó**: La categoría real se toma del catálogo cargado en la sesión actual. Si el catálogo no se recargó y un material cambió de categoría en el backend, el selector mostrará la categoría anterior.

3. **Mismo heurístico de texto puede existir en otros módulos — verificar cobertura**: La lógica de categorización por substring (inversor/batería/panel) era específica de este componente según el commit. Verificar si el mismo patrón se repite en confección de ofertas, solicitudes de materiales u otros módulos con selectores de material.

4. **Categoría sin materiales en contabilidad muestra lista vacía sin mensaje**: Un usuario que intente cambiar un ítem de tierra o tornillería ve el selector "Cambiar por..." vacío sin ninguna explicación. Puede parecer un bug o error de carga.

---

## 📅 21 de Julio, 2026

### Resumen de cambios (últimas 24h)

**7 commits reales** de Fabian1820 — todos dedicados a optimización de rendimiento de fotos/imágenes de materiales: ciclo completo de diagnóstico → fix → lazy load → gate por health check del backend, cubriendo PDF export y 15+ ubicaciones de la UI.

---

### Área 1: PDF export — caché + prefetch paralelo + downscale de fotos (1 commit — Fabian1820, 13:51)

- **`perf(exportar-oferta): acelera la descarga del PDF con caché + prefetch paralelo + downscale de fotos`** — Las fotos se servían desde MinIO sin thumbnail (hasta 5 MB c/u) y se descargaban en serie dentro del loop de filas, re-descargando por cada variante. Solución: `imageCache` a nivel de módulo + dedup de requests en vuelo (`inflightImages`), prefetch en paralelo con `Promise.all`, downscale en canvas a 300px + JPEG 0.82 (pasa de ~2-5 MB a ~20-40 KB por foto). El logo (PNG con transparencia) se preserva sin downscale.

---

### Área 2: Instrumentación temporal (2 commits — Fabian1820, 14:57 y 15:15)

- **`chore(exportar-oferta)`** — Dos commits de instrumentación con `performance.now()` para medir fases del PDF export y contar llamadas a `doc.getTextWidth`/`doc.splitTextToSize`. **Temporales, eliminados en commit posterior.** Diagnóstico confirmó: imágenes no eran el cuello (111 KB totales), sino 3 URLs de S3 con 502/CORS que hacían re-fetch de ~15s cada vez que el loop de materiales las encontraba sin caché negativo.

---

### Área 3: Caché negativo para URLs rotas (2 commits — Fabian1820, 15:24 y 15:42)

- **`fix(exportar-oferta): cachea imágenes fallidas + timeout de fetch`** — `failedImages: Set<string>` como caché negativo: una URL que falla no se reintenta en el mismo pageview. AbortController con 6s de timeout para no esperar los 15s de MinIO en URLs rotas.
- **`fix(exportar-oferta): quita timeout de 6s que estaba abortando fetches legítimos`** — Regresión inmediata: las conexiones Cuba/MinIO toman ~15s legítimamente, el AbortController abortaba fetches válidos y los metía en `failedImages` → 0 fotos en el PDF. Se elimina el AbortController y se mantiene el `failedImages` Set. Se añade guard para `AbortError`: si se aborta por cierre del diálogo, no se cachea en negativo.

---

### Área 4: Gate `foto_disponible` por health check del backend (1 commit — Fabian1820, 18:09)

- **`feat(fotos-material): salta fotos marcadas como rotas por health check server-side`** — El backend persiste `foto_disponible` por material (via `POST /api/admin/verificar-fotos-materiales`). Semántica fail-open: `null`/`undefined` pasa; solo `foto_disponible === false` salta la descarga. Afecta: `material-types.ts` (nuevos campos opcionales `foto_disponible`, `foto_verificada_at`, `foto_size`), `clients-table.tsx`, `leads-table.tsx`, `confeccion-ofertas-view.tsx` y `gestionar-ofertas-venta-dialog.tsx`.

---

### Área 5: Lazy load en diálogo de detalles de oferta (1 commit — Fabian1820, 19:12)

- **`perf(ver-oferta): lazy load + gate por foto_disponible en el diálogo de detalles`** — El diálogo de detalles de oferta (clientes-table, leads-table, planificación diaria, pendientes de visita del instalador) disparaba todos los fetches en paralelo al abrirse. Ahora: `<LazyImage>` (IntersectionObserver + rootMargin 120px) para foto de portada; gate `material.foto_disponible !== false` + `<LazyImage>` para materiales.

---

### Área 6: `<MaterialImage>` — gate + lazy load en 15 ubicaciones de la UI (1 commit — Fabian1820, 19:28)

- **`perf(fotos-material): lazy load + gate foto_disponible en 15 sitios de la UI`** — Nuevo componente `<MaterialImage>` unificado (gate `foto_disponible === false` + `<LazyImage>`). Cubre: grid POS, tabla stock principal, movimientos, salida lote, solicitudes de transferencia (2 sitios), solicitudes-transferencia-table (2 sitios), catálogo web, stock mínimo, vales de salida (2 sitios), solicitudes de materiales (2 sitios), solicitudes de ventas, asignaciones materiales (2 sitios), confección de ofertas, ofertas confeccionadas (3 secciones). Añade `foto_disponible?: boolean | null` a `MaterialStockItem`.

---

### Puede dar bateo

1. **Instrumentación temporal — verificar que no quedó en bundle de producción**: Los commits de `chore` añadieron logs de performance y se eliminaron en el fix posterior. Verificar que ningún `console.log` ni las interfaces `ImagePerfEntry`/`ExportPerfMetrics` quedaron en el bundle final.

2. **Ciclo add/remove AbortController en 18 minutos — build intermedio en producción**: El AbortController (6s) fue añadido en 15:24 y eliminado en 15:42. Si Railway auto-deploy es activo, un build con el AbortController llegó a producción. Usuarios en esa ventana habrán tenido 0 fotos en sus PDFs exportados.

3. **`foto_disponible` gate requiere que el health check del backend haya corrido**: Si `POST /api/admin/verificar-fotos-materiales` no se ejecutó o el backend no devuelve el campo, todos los materiales tendrán `foto_disponible: undefined`. El gate fail-open no filtrará nada y el beneficio de rendimiento se pierde, aunque el código sea correcto.

4. **`failedImages` Set sin evición — fotos reparadas en S3 no se recargan sin reload**: Si una URL rota en S3 se repara, el Set de negativos la sigue evitando durante el resto del pageview. El usuario necesita recargar la página para ver fotos recién reparadas.

5. **Canvas downscale + JPEG para materiales con transparencia**: Las fotos procesadas con JPEG 0.82 en canvas pierden el canal alpha. Si algún material usa PNG con fondo transparente, aparecerá con fondo negro/blanco en el PDF. El logo está excluido explícitamente, pero los materiales no.

6. **5 ubicaciones sin migrar a `<MaterialImage>` siguen con raw `<img>`**: `inventario/stockajes-minimos-section` (dropdown), `solicitud-material-detail-dialog`, `vale-salida-detail-dialog`, `compras/compra-form-dialog` y `fichas-costo/calc-porcentaje-dialog` no fueron migrados. Siguen disparando requests a MinIO para fotos conocidas rotas.

7. **`imageCache` a nivel de módulo sin límite de tamaño**: En Next.js App Router, el módulo puede persistir entre navegaciones SPA sin recarga completa. El cache acumula indefinidamente. Para sesiones largas con muchos materiales distintos, el uso de memoria puede crecer sin control.

8. **`IntersectionObserver` en SSR/prerender**: `<LazyImage>` usa `IntersectionObserver`, disponible solo en el cliente. Dependiendo de la implementación, puede tirar errores en prerender estático o SSR si no hay guard `typeof window !== 'undefined'`.

9. **`foto_disponible?: boolean | null` en tipos — cobertura incompleta posible**: El campo se añade en `material-types.ts` a `BackendMaterial`, `MaterialItem`, `Material` y `MaterialStockItem`. Si algún tipo intermedio de conversión no fue actualizado, TypeScript puede inferir el campo como `undefined` en rutas no actualizadas y el gate `!== false` pasará silenciosamente aunque el backend devuelva `false`.

---

## 📅 20 de Julio, 2026

### Resumen de cambios (últimas 24h)

**4 commits reales** de yany1509 — todos en el módulo de ventas/pagos/devoluciones: (1) fix para que superAdmin pueda editar y cancelar cobros; (2) reflejo de devoluciones en tabla de Pagos Realizados con badge y corrección de bug de conversión USD; (3) badge de devolución por pago individual en Facturas Emitidas; (4) filtro "Devoluciones" en ambas pestañas de /solicitudes-ventas.

---

### Área 1: Pagos — superAdmin puede editar y cancelar cobros (1 commit — yany1509, 12:11)

- **`fix(pagos): superAdmin puede editar y cancelar cobros`** — `puedeEditarCobro` solo miraba una whitelist de 2 CIs hardcodeados, dejando fuera a cualquier superAdmin. Ahora también devuelve `true` para `user.is_superAdmin`, consistente con el resto de la app.

---

### Área 2: Ventas — reflejar devoluciones en Pagos Realizados (1 commit — yany1509, 15:57)

- **`fix(ventas): reflejar devoluciones en la tabla de Pagos Realizados`** — Ninguna devolución se veía en la interfaz aunque el backend la procesara bien: "Pend:" mostraba un snapshot congelado desde la creación del pago. Ahora cada fila muestra badge "Devuelto: $X (total/parcial)" y el botón "Devolución" se reemplaza por "Ya devuelto" cuando el pago ya se devolvió al 100%. El diálogo de registrar devolución descuenta lo ya devuelto del máximo permitido. Corrección de bug: "Pend:" convertía por `tasa_cambio` un valor que ya venía en USD.

---

### Área 3: Ventas — devolución por pago individual en Facturas Emitidas (1 commit — yany1509, 16:53)

- **`feat(ventas): mostrar devolucion por pago en Facturas Emitidas`** — Cada pago dentro de una factura ahora muestra badge "Devuelto: $X" cuando ese pago puntual tiene una devolución registrada — tanto en la tabla de Facturas Emitidas como en el diálogo de detalle. Antes solo se veía el total devuelto de toda la factura, sin saber a cuál pago pertenecía.

---

### Área 4: Ventas — filtro "Devoluciones" en Pagos y Facturas (1 commit — yany1509, 17:57)

- **`feat(ventas): filtro "Devoluciones" en Pagos realizados y Facturas emitidas`** — Nuevo selector (Todos / Con devolución / Sin devolución) en ambas pestañas de /solicitudes-ventas, mismo patrón visual que los demás filtros de la barra.

---

### Puede dar bateo

1. **Badge "Devuelto: $X" depende de campo `monto_devuelto` a nivel de pago individual en la respuesta del backend**: Si el backend solo devuelve el total devuelto a nivel de factura (no por pago individual), el badge nunca aparece silenciosamente y los usuarios no sabrán que existe una devolución en ese pago.

2. **"Ya devuelto" — condición de 100% calculada con flotantes en frontend**: Si la comparación `monto_devuelto >= monto_pago` usa flotantes sin redondeo, casos borde (e.g., $99.999 devuelto vs $100.00 original) pueden dejar el botón mostrando "Devolución" en un pago ya completamente devuelto.

3. **Filtro "Con devolución / Sin devolución" — riesgo de filtrado solo en cliente**: Si el filtro no se envía como parámetro al backend y opera solo sobre la página visible, la paginación y los exports no reflejarán resultados correctos en datasets que superen una página.

4. **Bug de conversión USD en "Pend:" — el mismo patrón puede existir en otros módulos**: La corrección aplica a la tabla de Pagos Realizados de Ventas. Si el mismo error de doble conversión por `tasa_cambio` existe en Pagos Clientes, Vales u otros módulos con montos pendientes, esos siguen mostrando valores incorrectos.

5. **`puedeEditarCobro` fix solo en frontend — endpoint sin validación de autorización en backend**: El fix expande el acceso a superAdmins en la UI, pero si el endpoint de edición/cancelación de cobros no valida el rol en el servidor, cualquier usuario autenticado podría llamarlo directamente ignorando el gating del frontend.

6. **Diálogo de devolución descuenta lo ya devuelto calculado en frontend — desincronía posible**: El máximo permitido para una nueva devolución se calcula restando `monto_devuelto` del total. Si el backend no devuelve `monto_devuelto` actualizado tras cada operación, el diálogo puede permitir exceder el monto total devuelto posible sin error visible.

---

## 📅 19 de Julio, 2026

### Resumen de cambios (últimas 24h)

Sin commits nuevos de código. El único commit en las últimas 24h es "Analisis diario Claude" (generado automáticamente). No hay cambios en producción.

---

### Puede dar bateo

Sin cambios nuevos — sin riesgos nuevos.

---

## 📅 18 de Julio, 2026

### Resumen de cambios (últimas 24h)

Sin commits nuevos de código. Los cambios reales del 17 de Julio (4 commits de yany1509 en pagos, devoluciones y vales) fueron capturados y documentados en la entrada de ayer. El único commit nuevo es "Analisis diario Claude" (generado automáticamente).

---

### Puede dar bateo

Sin cambios nuevos — sin riesgos nuevos.

---

## 📅 17 de Julio, 2026

### Resumen de cambios (últimas 24h)

**4 commits reales** de yany1509 — todos enfocados en flujos de pagos y devoluciones: (1) badge "Pendiente de selección" para ofertas ambiguas en Obras Terminadas; (2) botón de cancelar pago en Pagos Clientes; (3) botón de devolución de pagos de venta y badge "Anulada" en facturas; (4) motivo obligatorio en devoluciones de vale.

---

### Área 1: Obras Terminadas — badge "Pendiente de selección" para ofertas ambiguas (1 commit — yany1509, 20:30)

- **`fix(obras-terminadas): badge de pendiente de seleccion para ofertas ambiguas`** — Refleja el nuevo campo `estado_factura_detalle` del backend: badge ámbar "Pendiente de selección" (distinto del gris "Sin factura") para ofertas con 2+ ofertas confirmadas sin facturar que ya están esperando que el área económica elija cuál facturar. Incluye el filtro correspondiente en la barra de la tabla.

---

### Área 2: Pagos Clientes — botón de cancelar pago (1 commit — yany1509, 20:31)

- **`feat(pagos): boton de cancelar pago`** — Nuevo `CancelarPagoDialog` (motivo obligatorio) y botón en la tabla de Pagos Clientes que llama a `PATCH /pagos/{id}/cancelar`. La fila del pago cancelado queda tachada y en gris, con badge "Cancelado" y tooltip del motivo; se oculta el botón "Registrar devolución" si el pago ya está cancelado.

---

### Área 3: Ventas — devolución de pagos y badge "Anulada" en facturas (1 commit — yany1509, 20:31)

- **`feat(ventas): boton de devolucion de pagos y badge de factura anulada`** — Nuevo `RegistrarDevolucionPagoVentaDialog` y botón "Devolución" en la tabla de Pagos Realizados de Solicitudes Ventas, que llama al nuevo endpoint de devoluciones de pagos de venta. Si la devolución termina anulando la factura vinculada (todos sus pagos devueltos), la tabla y el detalle de Facturas Emitidas muestran badge roja "Anulada" con el motivo y el monto devuelto acumulado.

---

### Área 4: Vales — motivo obligatorio en devoluciones (1 commit — yany1509, 20:44)

- **`fix(vales): motivo obligatorio en devoluciones de vale`** — El campo "Comentario" era opcional (placeholder "Opcional") y se enviaba como `undefined` si quedaba vacío. Ahora es "Motivo de la devolución *", bloquea el envío (botón deshabilitado + toast) si está vacío, consistente con el backend.

---

### Puede dar bateo

1. **`PATCH /pagos/{id}/cancelar` — endpoint nuevo sin confirmar en backend**: Si no está implementado, todos los intentos de cancelación fallarán con 404 sin mensaje claro al usuario.

2. **Cancelar pago — estado solo visual si el backend no lo valida**: Si el backend no bloquea operaciones sobre pagos cancelados (vincularlos a facturas, contarlos en saldos), el estado "Cancelado" sería decorativo y los datos financieros quedarían inconsistentes.

3. **Endpoint devolución de pagos de venta — sin confirmar en backend**: El nuevo `RegistrarDevolucionPagoVentaDialog` depende de un endpoint no documentado en el commit. Si no existe, el botón falla con 404 o 405.

4. **Badge "Anulada" — lógica de anulación calculada en backend, posible desincronía**: La condición "todos los pagos devueltos = factura anulada" la determina el backend. Si otro pago llega entre la devolución y la recarga, la UI puede mostrar "Anulada" para una factura que el backend aún considera activa.

5. **`estado_factura_detalle` campo nuevo — ausente en respuestas históricas**: El badge "Pendiente de selección" depende de este campo. Si el backend no lo devuelve en facturas antiguas o si el deploy aún no llegó a producción, el badge nunca aparece y el filtro siempre devuelve 0 resultados.

6. **Filtro "Pendiente de selección" — posible filtrado solo en cliente**: Si el filtro opera solo sobre la página visible y no se envía como parámetro al backend, la paginación y los exports no reflejarán correctamente los resultados.

7. **Fix motivo obligatorio en vales — devoluciones en vuelo antes del deploy**: Si un usuario abrió el diálogo de devolución de vale justo antes del deploy, al recargar encontrará el campo obligatorio en un flujo que ya inició sin motivo.

---

#### Seguimientos vigentes

- **Cálculo "pendiente" en Detalle de Cobros solo en frontend — desincronía con totales del backend si devuelve saldo_pendiente calculado (Jul 23)**.
- **`cancelado` falsy/undefined en pagos históricos — filtro !p.cancelado no los excluye del cálculo (Jul 23)**.
- **Contador de encabezado ahora incluye cancelados — usuarios esperando "pagos válidos" verán número inflado (Jul 23)**.
- **Par de fixes de pagos en < 35 min — posible build intermedio con totales corregidos pero sin badge visual (Jul 23)**.
- **Selector "Cambiar por..." en facturas-solar-carros — fallback heurístico en filas sin match en catálogo, comportamiento inconsistente sin indicador visual (Jul 22)**.
- **Catálogo local stale — categoría real puede ser incorrecta si la sesión no se recargó después de actualizar el backend (Jul 22)**.
- **Heurístico de categorización por substring puede existir en otros módulos — verificar cobertura (Jul 22)**.
- **Categoría sin materiales en contabilidad muestra lista vacía sin mensaje explicativo al usuario (Jul 22)**.
- **Instrumentación temporal de perf — verificar que no quedó en bundle de producción (Jul 21)**.
- **Ciclo add/remove AbortController en 18 min — build intermedio puede haber llegado a prod con 0 fotos en PDF (Jul 21)**.
- **`foto_disponible` gate sin health check ejecutado — fail-open pierde beneficio de rendimiento (Jul 21)**.
- **`failedImages` Set sin evición — fotos reparadas en S3 no se recargan sin reload de página (Jul 21)**.
- **Canvas downscale JPEG — materiales con transparencia perderán canal alpha en PDF (Jul 21)**.
- **5 ubicaciones sin migrar a `<MaterialImage>` — siguen con raw `<img>` y sin gate (Jul 21)**.
- **`imageCache` a nivel de módulo sin límite — acumula en navegación SPA larga (Jul 21)**.
- **`IntersectionObserver` en SSR/prerender — posible error `window is not defined` (Jul 21)**.
- **`foto_disponible` en tipos — gate puede pasarse silenciosamente en rutas no actualizadas (Jul 21)**.
- **Badge "Devuelto: $X" por pago — campo `monto_devuelto` ausente en respuesta silencia el indicador (Jul 20)**.
- **"Ya devuelto" — condición 100% calculada con flotantes, edge case puede dejar botón "Devolución" incorrecto (Jul 20)**.
- **Filtro "Devoluciones" — riesgo de filtrado solo en cliente; paginación y exports incorrectos en datasets grandes (Jul 20)**.
- **Fix conversión USD "Pend:" — bug análogo de doble conversión puede existir en otros módulos (Jul 20)**.
- **`puedeEditarCobro` fix solo en frontend — endpoint sin validación de autorización en backend sigue expuesto (Jul 20)**.
- **Diálogo devolución descuenta lo ya devuelto en frontend — desincronía si backend no devuelve `monto_devuelto` actualizado (Jul 20)**.
- **`PATCH /pagos/{id}/cancelar` — endpoint nuevo sin confirmar, cancelaciones fallarán con 404 (Jul 17)**.
- **Cancelar pago — estado solo visual si backend no valida; datos financieros inconsistentes (Jul 17)**.
- **Devolución de pagos de venta — nuevo endpoint sin confirmar en backend (Jul 17)**.
- **Badge "Anulada" en facturas — desincronía si backend no actualiza estado en tiempo real (Jul 17)**.
- **`estado_factura_detalle` campo nuevo — badge "Pendiente de selección" ausente en respuestas históricas (Jul 17)**.
- **Filtro "Pendiente de selección" — posible filtrado solo en cliente sin soporte en backend (Jul 17)**.
- **Fix motivo obligatorio en vales — devoluciones en vuelo antes del deploy pueden fallar (Jul 17)**.
- **`/ajustar-saldo` endpoint sin confirmar en backend — botón fallará si no está implementado (Jul 15)**.
- **Validación de monto solo en cliente — race condition de sobrepago en ajuste de saldo (Jul 15)**.
- **Monto libre en ajuste de saldo sin aprobación secundaria — riesgo de cancelar deuda grande por error (Jul 15)**.
- **Badge "Ajuste de contabilidad" — pantalla sin mapeo del caso 'ajuste' mostrará texto crudo (Jul 15)**.
- **Sin mecanismo de reversa en UI para ajuste de saldo aplicado por error (Jul 15)**.
- **Fichas de Costo — "Ajuste general" irreversible destruye diferencias por almacén sin confirmación robusta (Jul 13)**.
- **Fichas de Costo — endpoint de ajuste por almacén específico (✎) sin confirmar en backend (Jul 13)**.
- **Fichas de Costo — desglose por almacén stale al abrir el diálogo con movimientos concurrentes (Jul 13)**.
- **`es_trabajador_suncar` — clientes históricos sin el campo, datos incompletos en filtros y conteos (Jul 13)**.
- **Pestañas Facturas clientes/trabajadores — filtro `es_trabajador_suncar` en backend sin confirmar (Jul 13)**.
- **Cache de pestañas Facturas — facturas nuevas no visibles sin recarga manual (Jul 13)**.
- **`es_trabajador_suncar` en edición — confirmar persistencia en `PUT /clientes/{id}` (Jul 13)**.
- **Facturas Solar Carros — precio escalado nulo si algún material tiene precio nulo en catálogo de contabilidad (Jul 10)**.
- **Facturas Solar Carros — bloqueo stock al abrir el diálogo, no tiempo real; riesgo de sobreventa en alta concurrencia (Jul 10)**.
- **Vista "Facturas" en Obras Terminadas — endpoint de backend sin confirmar (Jul 10)**.
- **Fix paginación stock — snapshot inconsistente entre página 1 y 2 por concurrencia (Jul 10)**.
- **Clave interna `kardex-costo` sin renombrar — no encontrable como "historial de costos" en panel de permisos (Jul 10)**.
- **Columna "Origen del movimiento" — campos ausentes en movimientos históricos, datos incompletos silenciosos (Jul 10)**.
- **`costos-materiales-cliente` en instalaciones — ningún usuario lo tiene hasta asignación manual de SuperAdmin (Jul 10)**.
- **`creado_por` → `creado_por_ci` — reservas históricas con campo incorrecto muestran creador vacío (Jul 10)**.
- **Herencia `instalaciones` → 7 sub-permisos solo en runtime, no persistida en BD — migración necesaria si la lógica de prefijo cambia (Jul 5)**.
- **Dos separadores de sub-permiso (`/` e `:`) — inconsistencia en el catálogo de permisos (Jul 5)**.
- **`RouteGuard` con `string[]` — confirmar semántica OR vs AND en cada ruta (Jul 5)**.
- **Landing `/instalaciones` vacía sin mensaje para usuario sin sub-permisos asignados (Jul 5)**.
- **Export Instalaciones en Proceso — `getAllMaterials()` sin caché en lookup de nombre de material (Jul 5)**.
- **`stackedColumnKeys` en `exportToExcel` — verificar implementación en `lib/export-service.ts` (Jul 3)**.
- **`lib/export-multi-sheet-service.ts` eliminado — confirmar sin imports residuales (Jul 3)**.
- **Obras Terminadas export — embedding de materiales en `/obras-terminadas/datos` sin confirmar en backend (Jul 3)**.
- **Mi Tarjeta fuera de fase de prueba — confirmar backend `/api/tarjetas/mi-tarjeta` listo para producción (Jul 3)**.
- **Vales de salida — `getAllMaterials()` puede generar llamadas sin caché al abrir export (Jul 3)**.
- **`estado`/`motivo_error` en movimientos históricos — confirmar fallback para docs sin campo (Jun 30)**.
- **Excel movimientos con nueva columna Estado — confirmar flujos de importación existentes (Jun 30)**.
- **`compensacion`/`asumido_por_empresa` en OfertaConPagos — confirmar campos en backend (Jun 29)**.
- **`getBaseACobrar` sin manejo de null — cobros históricos pueden mostrar NaN (Jun 29)**.
- **Base a cobrar negativa posible si compensación + asumido supera precio_final (Jun 29)**.
- **Módulo Asistencia — endpoints de backend sin confirmar (Jun 26)**.
- **`graph.html`/`graph.json` en main — artefactos pesados sin uso en producción (Jun 26)**.
- **Export Excel movimientos sin cota máxima — puede bloquear navegador (Jun 26)**.
- **`referencia_label` en movimientos históricos — campo puede no existir en docs antiguos (Jun 26)**.
- **Detalle de movimiento — endpoints no confirmados para todos los tipos de referencia (Jun 26)**.
- **`hasExactPermission` — usuarios con almacenes-suncar sin subpermiso admin explícito perderán acceso (Jun 26)**.
- **`assertOk` en asignaciones — errores antes silenciosos ahora pueden causar crashes (Jun 26)**.
- **`searchMaterialesConCosto` — 403 para usuarios sin permiso admin en dialog de asignación (Jun 26)**.
- **DOCX Orden de Trabajo — generación en cliente puede fallar silenciosamente (Jun 26)**.
- **Factura instaladora sin materiales — backend puede rechazar submit vacío (Jun 26)**.
- **Reservas expiradas reactivadas — conflicto con materiales reasignados entre expiración y nueva fecha (Jun 23)**.
- **Filtro potencia mín/máx sin validación `min > max` — resultados vacíos sin mensaje (Jun 23)**.
- **Filtros potencia en paneles — unidad ambigua kW vs W en la UI (Jun 23)**.
- **Filtros combinados tipo+potencia — confirmar soporte simultáneo en backend (Jun 23)**.
- **Lista blanca de CIs de pagos hardcodeada en frontend — superAdmins ahora incluidos, pero 2 CIs específicos aún hardcodeados (Jun 23)**.
- **Gating editar cobros solo en frontend — endpoint sin validación de autorización en backend (Jun 23)**.
- **`historial_cambios` en tipo Pago — confirmar campo en respuesta del backend (Jun 23)**.
- **Devolución en vales facturados — transición de estado en backend (Jun 19)**.
- **Ajuste contable/nota de crédito por devolución en vale facturado (Jun 19)**.
- **Devolución parcial en vales con líneas mixtas (Jun 19)**.
- **`pool=indistinto` para split automático — backend debe implementarlo**.
- **Race condition en el cálculo de disponible de reservas**.
- **`sinDesgloseSector` solo detectado en frontend**.
- **Mapa `material_id→codigo` — race en carga del catálogo de oferta**.
- **Auto-vincular reserva en `create-solicitud-material` — reserva incorrecta si hay múltiples**.
- **BMS como categoría reservable — docs sin `.pools` bloquean el 100% de reservas BMS**.
- **`/reservas-ventas` — visibilidad de tabs por sub-permiso**.
- **Renombrado UI "indistinto" → "Común" — confirmar en todos los puntos de display**.
- **Redeploy de Railway — confirmar auto-deploy activo tras commits `chore`**.
- **`GET /resumen-factura` — endpoint y estructura `$facet` sin confirmar**.
- **`$facet` aggregation — límite de 100MB de memoria de MongoDB**.
- **Debounce en búsqueda de facturas-ventas — estado al limpiar**.
- **`apiRequest success:false` — monitorear regresiones post-deploy**.
- **`showContableFields` en MaterialForm**.
- **`costo` y `material_id` en tipo `Material`**.
- **Wallet historial por miembro — filtros params**.
- **Excel Fichas de Costo sin cota de registros**.
- **CI `87120119233` hardcodeado para control de permisos**.
- **Campos `cambio_real_*` requieren backend actualizado**.
- **Endpoint lazy load `GET /obras-terminadas/oferta/{id}/facturas-cliente`**.
- **PDF unificado con `limit=total` sin cota máxima**.
- **Badge de estado calculado en frontend con flotantes**.
- **Módulo Vales/Facturas Instaladora comentado sin aviso explícito**.
- **Sistema de notificaciones — endpoints bulk por tipo**.
- **`GET /inventario/stock-historico`**.
- **AdminPass 123456 hardcodeado**.
- **Auto-sync catálogo → BD al abrir /permisos**.
- **Logs de debug en producción**.
- **Eliminación lógica `cantidad = 0` en asignaciones**.
- **Creación inline sin persistencia inmediata**.
- **Subida de archivos sin rollback**.
- **Backend debe aceptar nuevos campos: `motivo`, `nota`, `foto`, `ficha_tecnica_url`, `oferta_venta_id`, `descuento_free`**.
- **`childKeys` en catálogo de módulos**.
- **`useEffect` con dependencias `[open, initialData?.id]`**.
- **Agregados solicitudes-ventas**.
- **`updateSolicitudTransferencia` — validación de estado en backend**.
- **Búsqueda por `numero_serie`**.
- **`stock_disponible_actual` — consistencia entre endpoints**.
- **Excel export de facturas sin cota de registros**.
- **`'zelle'` como método de pago — soporte en backend**.
- **Sort client-side de solicitudes pendientes en ValesSalida**.
- **Parsing UTC→local en otras tablas con filtros de fecha**.
- **Tasas MLC/CUP sin persistencia entre sesiones**.
- **`PonderarCostoResponse` campos nuevos**.
- **`GET /api/kardex-costo/costo-actual`**.
- **`materiales` en respuesta de facturas de solicitudes-ventas**.
- **Filtros de vales de salida — `fecha_desde`, `fecha_hasta`, creador**.
- **`almacenes-suncar/admin` — gating solo en frontend**.
- **Estados de transferencia no mapeados en `ESTADO_CONFIG`**.
- **Campos de dimensionamiento en calculadora sin persistencia confirmada**.
- **Badges de disponibilidad por pool — snapshot estático**.
- **Endpoint cumpleaños de la semana**.
- **Endpoint contador de instalaciones solares**.
- **Widget de paneles — estado único vs respuesta del backend**.
- **`window.history.pushState` + Next.js App Router desync**.
- **Export Excel merge vertical — heterogeneidad de materiales**.
- **Rebrand paleta — componentes con clases hardcoded**.
- **`POST /solicitudes-transferencia/{id}/resolver` — endpoint pendiente**.
- **Módulo "Empleados" — permisos en BD no migrados**.
- **Sub-permiso implícito — usuarios con padre sin hijo en BD**.
- **`PATCH /facturas-solar-carros/{id}` — confirmar endpoint**.
- **`VincularPagoDialog` — endpoint de PagoVenta por solicitud**.
- **Consignaciones denormalizadas — campos del backend**.
- **Auto-vinculación de pagos a consignación**.
- **`POST /consignaciones/{id}/facturas` — endpoint sin confirmar**.
- **`cargo` en RRHH — confirmar aceptación en `PUT /{ci}/rrhh`**.
- **Campos `tipo`, `pendiente_costeo`, `regularizada_por` en KardexCosto**.
- **Badge "Facturado" con flotantes**.
- **Botón "Actualizar costos" — lógica de decisión interna**.

---

> ⚠️ **Nota de mantenimiento**: Las entradas del **19, 20 y 21 de Junio** y del **23 de Junio** fueron eliminadas al superar los 7 días de antigüedad (política de retención semanal). La entrada del **26 de Junio** fue eliminada el 4 de Julio al superar los 7 días. La entrada del **28 de Junio** fue eliminada el 6 de Julio al superar los 7 días. La entrada del **29 de Junio** fue eliminada el 7 de Julio al superar los 7 días. La entrada del **30 de Junio** fue eliminada el 8 de Julio al superar los 7 días. Las entradas del **1 y 2 de Julio** fueron eliminadas el 10 de Julio al superar los 7 días. La entrada del **3 de Julio** fue eliminada el 11 de Julio al superar los 7 días. Las entradas del **4 y 5 de Julio** fueron eliminadas el 13 de Julio al superar los 7 días. La entrada del **6 de Julio** fue eliminada el 14 de Julio al superar los 7 días. La entrada del **7 de Julio** fue eliminada el 15 de Julio al superar los 7 días. La entrada del **8 de Julio** fue eliminada el 17 de Julio al superar los 7 días. La entrada del **10 de Julio** fue eliminada el 18 de Julio al superar los 7 días. La entrada del **11 de Julio** fue eliminada el 19 de Julio al superar los 7 días. La entrada del **13 de Julio** fue eliminada el 21 de Julio al superar los 7 días. La entrada del **14 de Julio** fue eliminada el 22 de Julio al superar los 7 días. La entrada del **15 de Julio** fue eliminada el 23 de Julio al superar los 7 días. Anteriores eliminadas: 16, 17 y 18 de Junio, 5, 6, 7, 9, 11, 12 y 15 de Junio, y días de Mayo.
