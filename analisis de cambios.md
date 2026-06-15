# Registro de Análisis de Cambios — SunCarWeb

---

## 📅 15 de Junio, 2026

### Resumen de cambios (últimas 24h)

**1 commit** de Ruben0304 — reemplazo crítico de la carga masiva en la pestaña "Clientes Ventas" de Facturas: sustituye 2000 solicitudes + clientes con N+1 queries por un nuevo hook `usePaginatedVentasFactura` que consume `GET /resumen-factura` (agregación MongoDB con `$facet` en una sola query). La pestaña ahora carga instantáneamente con paginación y búsqueda debounced.

---

### Área 1: Facturas-Ventas — paginación con endpoint agregado (1 commit — Ruben0304, Jun 15 14:21)

- **`feat(facturas-ventas): reemplazar carga masiva por endpoint paginado con búsqueda`** — Sustituye la carga de 2000 solicitudes+clientes con N+1 queries por el nuevo hook `usePaginatedVentasFactura` que consume `GET /resumen-factura` (agregación MongoDB en una sola query con `$facet`). La pestaña Clientes Ventas ahora carga instantáneamente con paginación y búsqueda debounced.

---

### Puede dar bateo

1. **`GET /resumen-factura` — endpoint y estructura `$facet` sin confirmar**: El hook asume que este endpoint existe en el backend y devuelve la estructura esperada del `$facet` de MongoDB (`data` + `total`). Si el endpoint no existe o devuelve otra estructura, la pestaña fallará en carga.

2. **`$facet` aggregation — límite de 100MB de memoria de MongoDB**: Con grandes volúmenes de facturas, la aggregation con `$facet` puede exceder el límite de memoria de 100MB de MongoDB antes de paginar. Confirmar que existen índices adecuados en los campos del pipeline o que el endpoint usa `allowDiskUse: true`.

3. **Debounce — estado al limpiar búsqueda**: Confirmar que limpiar el campo de búsqueda cancela las peticiones pendientes del debounce y resetea correctamente a la primera página sin peticiones duplicadas.

4. **Preservación de filtros al paginar**: Confirmar que al cambiar de página los filtros activos (búsqueda, estado, fecha) se mantienen y se envían correctamente en cada petición paginada.

5. **Estado de error vacío vs. error real**: Si `GET /resumen-factura` devuelve un error 4xx/5xx, confirmar que el hook muestra un estado de error descriptivo en lugar de simplemente una lista vacía.

---

#### Seguimientos vigentes

- **`apiRequest success:false` — monitorear regresiones post-deploy**: El fix global puede descubrir errores silenciados. Cualquier operación que antes mostraba éxito sin verificar puede ahora romper con toast de error.
- **`showContableFields` en MaterialForm**: Confirmar valor por defecto del prop y que otros usos de `MaterialForm` no perdieron campos contables silenciosamente.
- **`costo` y `material_id` en tipo `Material`**: Confirmar que los endpoints del catálogo devuelven estos campos; de lo contrario la columna Costo mostrará NaN o vacío.
- **Wallet historial por miembro — filtros params**: Confirmar que el backend acepta tipo, fechas y búsqueda en el endpoint de historial por miembro.
- **Excel Fichas de Costo sin cota de registros**: La exportación ignora la paginación y exporta todos los filtrados; con catálogos grandes puede saturar memoria del navegador.
- **CI `87120119233` hardcodeado para control de permisos**: El CI de un trabajador específico está hardcodeado como excepción de acceso. Si esa persona cambia, requiere un nuevo deploy.
- **Campos `cambio_real_*` requieren backend actualizado**: `cambio_real_monto`, `cambio_real_moneda` y `cambio_real_tasa` en el payload de `PagoVenta`. Si el backend no los acepta, los POSTs con cambio real fallarán con 422.
- **Endpoint lazy load `GET /obras-terminadas/oferta/{id}/facturas-cliente`**: Si no existe, al hacer clic en la pestaña el usuario verá error de carga.
- **PDF unificado con `limit=total` sin cota máxima**: Puede generar timeout o saturar memoria del navegador con miles de registros.
- **Badge de estado calculado en frontend con flotantes**: `precio_final − total_pagado` puede dar `0.0000001` por redondeo, mostrando "pendiente" en una factura realmente pagada.
- **Módulo Vales/Facturas Instaladora comentado sin aviso explícito**: Verificar que el cambio fue coordinado con los usuarios que dependían de ese flujo.
- **Sistema de notificaciones — endpoints bulk por tipo**: Confirmar que marcar/eliminar todas acepta filtro por tipo de notificación en el backend.
- **`GET /inventario/stock-historico`**: Confirmar que existe y acepta params de almacén, material y fecha.
- **AdminPass 123456 hardcodeado**: Al crear cualquier trabajador se asigna automáticamente `123456` como contraseña. Brecha de seguridad operativa.
- **Auto-sync catálogo → BD al abrir /permisos**: Si el catálogo tiene un módulo mal definido, se crearán registros incorrectos en BD sin rollback automático.
- **Logs de debug en producción**: Los logs de `fetchTrabajosDeAveria` pueden seguir activos, exponiendo datos de clientes en la consola del navegador.
- **Eliminación lógica `cantidad = 0` en asignaciones**: Todo el código que lista asignaciones debe filtrar `cantidad > 0`.
- **Creación inline sin persistencia inmediata**: Categorías/unidades creadas desde "Crear material rápido" se pierden si el usuario cierra el diálogo antes de guardar.
- **Subida de archivos sin rollback**: Si la subida de foto/ficha técnica tiene éxito pero la creación del material falla, el archivo queda huérfano en storage.
- **Backend debe aceptar nuevos campos**: `motivo` y `nota` en asignaciones; `foto` y `ficha_tecnica_url` en materiales; `oferta_venta_id`, `descuento_free`, `motivo_descuento_free`, `precio` en solicitudes desde oferta.
- **`childKeys` en catálogo de módulos**: Si se agrega un módulo hijo sin declarar `childKeys`, el card padre quedará invisible aunque el usuario tenga el permiso.
- **`useEffect` con dependencias `[open, initialData?.id]`**: Si `initialData` cambia el contenido pero mantiene el mismo `id`, el formulario no se reinicializa.
- **Agregados solicitudes-ventas**: Confirmar que los endpoints devuelven campos de agregados globales y por ítem.
- **`updateSolicitudTransferencia` — validación de estado en backend**: El backend debe rechazar ediciones de solicitudes que ya no estén en estado `pendiente`.
- **Búsqueda por `numero_serie`**: Confirmar que el endpoint de búsqueda de materiales indexa este campo en el backend.
- **`stock_disponible_actual` — consistencia entre endpoints**: Confirmar que todos los endpoints de inventario devuelven este campo de forma consistente.
- **Excel export de facturas sin cota de registros**: `export-facturas-excel-service.ts` no tiene límite de registros.
- **`'zelle'` como método de pago — soporte en backend**: Confirmar que el backend acepta `'zelle'` en filtros y en registro de pagos.
- **Sort client-side de solicitudes pendientes en ValesSalida**: Con paginación server-side el orden global no está garantizado.
- **Parsing UTC→local en otras tablas con filtros de fecha**: Verificar que otros componentes usen el mismo parser local.
- **Tasas MLC/CUP sin persistencia entre sesiones**: `tasaMlcUsd` y `tasaCupUsd` se reinician en default=1. Confirmar que el backend devuelve las tasas al leer la compra.
- **`PonderarCostoResponse` campos nuevos**: Confirmar que POST `/ponderar-costo` incluye `sin_costo_ficha`, `no_aplicables` y `costos_catalogo_propagados`.
- **`GET /api/kardex-costo/costo-actual`**: Confirmar que existe y acepta params `material_id + almacen_id`.
- **`materiales` en respuesta de facturas de solicitudes-ventas**: Confirmar que el endpoint devuelve el campo `materiales` por factura.
- **Filtros de vales de salida — `fecha_desde`, `fecha_hasta`, creador**: Confirmar soporte en el backend.
- **`almacenes-suncar/admin` — gating solo en frontend**: Confirmar que el backend valida el permiso en el endpoint de creación de movimientos.
- **Estados de transferencia no mapeados en `ESTADO_CONFIG`**: Confirmar con el backend la lista completa de estados posibles y mapearlos explícitamente.
- **Campos de dimensionamiento en calculadora sin persistencia confirmada**: Los campos `horas_uso` y `tipo_carga` deben persistirse; si solo existen en estado React local, se perderán al recargar.
- **Badges de disponibilidad por pool — snapshot estático**: En alta concurrencia, los badges pueden mostrar stock disponible que ya fue reservado.
- **Endpoint cumpleaños de la semana**: Confirmar que el backend tiene el endpoint y devuelve nombre, CI y fecha en el formato esperado.
- **Endpoint contador de instalaciones solares**: Confirmar que existe y devuelve el dato en el formato esperado.
- **Widget de paneles — estado único vs respuesta del backend**: Si el endpoint devuelve estructura de períodos, el parsing puede fallar o mostrar `undefined`.
- **`window.history.pushState` + Next.js App Router desync**: Puede desincronizarse en full page reloads o con `next/link`.
- **Export Excel merge vertical — heterogeneidad de materiales**: Con número heterogéneo de materiales por registro, la alineación de celdas fusionadas puede desincronizarse.
- **Rebrand paleta — componentes con clases hardcoded**: Componentes con clases `orange-*` directas pueden mostrar colores incorrectos.
- **`POST /solicitudes-transferencia/{id}/resolver` — endpoint pendiente de confirmación**: Confirmar que existe en el backend y solo acepta solicitudes en estado `procesando`.
- **Módulo "Empleados" — permisos en BD no migrados**: El módulo fue renombrado de "Recursos Humanos". Los trabajadores con permiso antiguo no verán el nuevo módulo.
- **Sub-permiso implícito — usuarios con padre sin hijo en BD**: El fix exige `x/y` explícito. Revisar qué usuarios necesitan re-asignación de sub-permisos.
- **`PATCH /facturas-solar-carros/{id}` — confirmar endpoint**: El botón Editar asume que existe y acepta los campos editados.
- **`VincularPagoDialog` — endpoint de PagoVenta por solicitud**: Confirmar que el backend devuelve `monto`, `metodo`, `fecha`, `recibido_por` en el listado de pagos por solicitud.
- **Consignaciones denormalizadas — campos del backend**: Confirmar que el endpoint devuelve `solicitud_codigo`, `cliente_nombre`, `almacen_nombre` y `pagos[]`.
- **Auto-vinculación de pagos a consignación**: Confirmar que el backend auto-asocia pagos normales posteriores al saldo de la consignación sin intervención manual.
- **`POST /consignaciones/{id}/facturas` — endpoint sin confirmar**: El botón "Emitir factura" asume que este endpoint existe. Si no, la operación fallará con 404.
- **`cargo` en RRHH — confirmar aceptación en `PUT /{ci}/rrhh`**: Después de 3 commits de iteración, confirmar que el backend acepta `cargo` en ese endpoint.
- **Campos `tipo`, `pendiente_costeo`, `regularizada_por` en KardexCosto**: Si el backend no devuelve estos campos, las filas del kardex no mostrarán badges ni resaltados.
- **Badge "Facturado" con flotantes**: `monto_facturado >= monto_total` puede mostrar "Pendiente" en factura ya cobrada por redondeo flotante.
- **Botón "Actualizar costos" — lógica de decisión interna**: Decide internamente si pondera o ajusta. Un error puede aplicar la operación incorrecta sin aviso al usuario.
- **`GET /resumen-factura` — endpoint y estructura `$facet` sin confirmar (nuevo)**: El hook `usePaginatedVentasFactura` asume que este endpoint existe y devuelve la estructura esperada.
- **`$facet` aggregation — límite de 100MB de memoria (nuevo)**: Con grandes volúmenes de facturas puede exceder el límite de memoria de MongoDB antes de paginar. Confirmar índices o `allowDiskUse`.
- **Debounce en búsqueda de facturas-ventas — estado al limpiar (nuevo)**: Confirmar que limpiar el campo cancela peticiones pendientes y resetea a la primera página sin duplicados.

---

## 📅 12 de Junio, 2026

### Resumen de cambios (últimas 24h)

**15 commits** de Fabian1820 y yany1509 — día de alta actividad: flujo completo de Consignaciones (registrar pago, emitir factura, badge en tabla), mejoras mayores de UX en Kardex de Costos, botón "Actualizar costos" unificado en Ficha de Costo, panel de error elegante para materiales sin costear, y 4 fixes en el módulo RRHH (ruta de `cargo` iterada 3 veces).

---

### Área 1: Consignaciones — flujo completo de pago y factura (1 commit — Fabian1820, 16:26)

- **`feat(consignaciones): flujo completo — registrar pago, emitir factura, badge en tabla`** — Botón "Registrar pago" abre `RegistrarPagoVentaDialog` apuntando a la solicitud de la consignación. Botón "Emitir factura" (en tab Pagos, por cada pago) abre `EmitirFacturaConsignacionDialog` y llama a `POST /consignaciones/{id}/facturas`. El botón se convierte en badge "Facturado" cuando `monto_facturado >= monto_total`. Resumen "Facturado / Pendiente de facturar" al pie de tab Pagos. Badge morado "Consignación" en tabla de solicitudes. Nuevos campos en tipo `Consignacion`: `monto_facturado`, `facturas_ids`. Nuevo componente: `EmitirFacturaConsignacionDialog`.

---

### Área 2: Solicitudes — panel de error elegante para pendiente_costeo (3 commits — Fabian1820)

- **`feat(solicitudes): panel de error elegante para materiales pendientes de costeo`** (16:28) — Cuando la aprobación falla por materiales sin costear, se muestra un panel ámbar con foto del material, código, nombre, compra en la que no está costeado y enlace directo "Ir a ficha".
- **`fix(api-config): preservar detail objeto en respuestas 400`** (16:51) — El handler de 400 descartaba el `detail` cuando era un objeto. Ahora se incluye `detail` en el retorno cuando es un objeto.
- **`fix(solicitudes): propagar error estructurado pendiente_costeo sin re-envolver`** (17:15) — El hook re-lanzaba el error como `new Error(message)`, perdiendo `isPendienteCosteo` y `materialesBloqueados`.

---

### Área 3: Ficha de Costo — botón unificado (2 commits — Fabian1820)

- **`feat(ficha-costo): botón "Actualizar costos" unificado`** (16:16) — Un solo botón inteligente que pondera o ajusta según el estado real de cada material. Llama al endpoint `sincronizar-costos`.
- **`fix(ficha-costo): eliminar botones individuales Ponderar y Ajustar`** (17:34).

---

### Área 4: Kardex — rediseño de UX (1 commit — Fabian1820, 14:47)

- **`feat(kardex): mejoras de UX — tipos de fila, grupos de columnas, tendencia`** — Badge de tipo en cada fila (Entrada / Ponderación / Ajuste / Sin costo). Filas `pendiente_costeo` resaltadas en ámbar. Doble cabecera con grupos. Indicador de tendencia (↑↓ %). Badge de compra clickeable.

---

### Área 5: Compras y Kardex de Ajuste (3 commits — Fabian1820)

- **`feat(ficha-costo): botón "Ajustar costo"`** (14:44) — Nuevo handler `handleAjustarCosto`. Crea entradas kardex de tipo `ajuste_costo`. `CompraService.ajustarCosto()` apunta a `POST /ajustar-costo`.
- **`fix(compras): no enviar materiales en PATCH cuando la compra está recibida`** (16:00) — Omite `materiales` cuando `materialesBloqueados=true`.
- **`fix(compras): ordenar por fecha_llegada_aproximada, fallback a fecha_envio`** (15:44).

---

### Área 6: RRHH — fixes de ruta de cargo (3 commits — yany1509)

- **`fix(rrhh): campo editable clickeable en toda el área`** (18:29).
- **`fix(rrhh): enrutar cargo y activo al endpoint correcto`** (18:42) — `cargo` → `PUT /trabajadores/{ci}`.
- **`fix(rrhh): revertir cargo al endpoint /rrhh correcto`** (19:10) — `cargo` va a `PUT /{ci}/rrhh`.

---

### Área 7: Export PDF (1 commit — yany1509, 18:52)

- **`fix(export): centrar logo verticalmente en encabezado PDF`**.

---

### Puede dar bateo

1. **`POST /consignaciones/{id}/facturas` — endpoint sin confirmar**: Si no existe, la operación fallará con 404 sin aviso descriptivo.
2. **Badge "Facturado" con flotantes**: `monto_facturado >= monto_total` calculado en frontend puede mostrar "Pendiente" por redondeo.
3. **`cargo` en RRHH — 3 commits en 40 min**: Confirmar con el backend que `PUT /{ci}/rrhh` acepta `cargo`.
4. **`fix(api-config): preservar detail objeto`**: Componentes que hacían `error.message` directamente pueden romperse si el error viene como objeto.
5. **Panel de error `pendiente_costeo` — `useMaterials` en contexto**: Si el hook no está inicializado en el scope del dialog, las fotos no cargarán.
6. **Campos `tipo`, `pendiente_costeo`, `regularizada_por` en KardexCosto**: Si el backend no devuelve estos campos, los badges no aparecerán.
7. **Botón "Actualizar costos" — lógica de decisión interna opaca**: Puede aplicar la operación incorrecta sin aviso al usuario.
8. **`fix(compras): no enviar materiales en PATCH`**: Si `materialesBloqueados` tiene un bug y es `false` cuando debería ser `true`, el PATCH seguirá enviando materiales y recibirá 422.
9. **`POST /ajustar-costo` — endpoint sin confirmar**: Confirmar que existe y acepta `AjustarCostoRequest`.

---

#### Seguimientos vigentes

- **`apiRequest success:false` — monitorear regresiones post-deploy**: El fix global puede descubrir errores silenciados.
- **`showContableFields` en MaterialForm**: Confirmar valor por defecto del prop.
- **`costo` y `material_id` en tipo `Material`**: Confirmar que los endpoints del catálogo devuelven estos campos.
- **Wallet historial por miembro — filtros params**: Confirmar que el backend acepta tipo, fechas y búsqueda.
- **Excel Fichas de Costo sin cota de registros**: Puede saturar memoria del navegador con catálogos grandes.
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
- **Backend debe aceptar nuevos campos**.
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
- **`POST /solicitudes-transferencia/{id}/resolver` — endpoint pendiente de confirmación**.
- **Módulo "Empleados" — permisos en BD no migrados (nuevo)**.
- **Sub-permiso implícito — usuarios con padre sin hijo en BD (nuevo)**.
- **`PATCH /facturas-solar-carros/{id}` — confirmar endpoint (nuevo)**.
- **`VincularPagoDialog` — endpoint de PagoVenta por solicitud (nuevo)**.
- **Consignaciones denormalizadas — campos del backend (nuevo)**.
- **Auto-vinculación de pagos a consignación (nuevo)**.
- **`POST /consignaciones/{id}/facturas` — endpoint sin confirmar (nuevo)**.
- **`cargo` en RRHH — confirmar aceptación en `PUT /{ci}/rrhh` (nuevo)**.
- **Campos `tipo`, `pendiente_costeo`, `regularizada_por` en KardexCosto (nuevo)**.
- **Badge "Facturado" con flotantes (nuevo)**.
- **Botón "Actualizar costos" — lógica de decisión interna (nuevo)**.

---

## 📅 11 de Junio, 2026

### Resumen de cambios (últimas 24h)

**11 commits** de Fabian1820 y yany1509 — módulo de Consignaciones completado y refinado (creación, vinculación de pagos, devoluciones, UI legible sin ObjectIds), refactor mayor de RRHH con subpágina de detalle por CI y rename a "Empleados", edición de facturas solar-carros con carga perezosa por pestaña, y fix crítico de sub-permisos implícitos en el sistema de permisos.

---

### Área 1: Consignaciones — módulo completo y refinamiento de flujo (6 commits — Fabian1820)

- **`feat(consignaciones): módulo en UI + toggle en registrar pago`** (Jun 10, 13:51) — Módulo `/consignaciones` con tabla, filtros, dialog de detalle. Toggle "Marcar como consignación" en registrar-pago-venta-dialog.
- **`fix(compra-form-dialog): "Referencia del buque" → "Referencia del contenedor"`** (Jun 10, 14:06).
- **`refactor(consignaciones): quitar botón "Nueva Consignación" del módulo`** (Jun 10, 14:20) — Las consignaciones solo se crean desde Pagos con el toggle.
- **`feat(solicitudes-entrada-almacen): filtro y badge de origen (compra | consignación)`** (Jun 10, 14:47).
- **`fix(consignaciones): toggle no crea pago — solo crea consignación`** (Jun 10, 18:06) — **Cambio de flujo crítico**: el nuevo flujo solo llama a `ConsignacionService.crear({solicitud_venta_id, moneda})` sin crear pago.
- **`fix(consignaciones): UX — sin ObjectIds, step entero, listar pagos reales`** (Jun 11, 14:42) — `VincularPagoDialog` lista los `PagoVenta` existentes. Tipo `Consignacion` trae `solicitud_codigo`, `cliente_nombre`, `almacen_nombre` y `pagos[]` denormalizados.

---

### Área 2: RRHH — refactor y subpágina de detalle (2 commits — yany1509)

- **`feat(rrhh): refactor de página de empleados y detalle por CI`** (Jun 10, 19:15) — `/recursos-humanos` refactorizada de 1410 a 579 líneas. Nueva subpágina `/recursos-humanos/[ci]`. **Módulo renombrado**: "Recursos Humanos" → "Empleados".
- **`fix(rrhh): evitar creación duplicada de empleado por doble-clic`** (Jun 11, 17:55).

---

### Área 3: Facturas solar-carros — edición + carga perezosa (1 commit — yany1509, Jun 11 17:09)

- **`feat(facturas-solar-carros): botón editar + carga perezosa por pestaña`** — Botón "Editar" con dialog que hace `PATCH /facturas-solar-carros/{id}`. Carga perezosa por pestaña. `pageSize` de facturas sube de 200 a 500.

---

### Área 4: Fix crítico de permisos — sub-permiso implícito (1 commit — yany1509, Jun 11 19:33)

- **`fix(permisos): sub-permiso implícito cuando padre tiene acceso completo`** — `hasPermission("x/y")` devolvía `false` si solo existía `"x"` en `modulosPermitidos`, ocultando botones como "Registrar entrada" en almacenes.

---

### Puede dar bateo

1. **Módulo "Empleados" — permisos en BD no migrados**: Los trabajadores que tenían "Recursos Humanos" en BD no verán "Empleados" hasta que sus permisos sean actualizados.
2. **Sub-permiso implícito fix — usuarios con padre sin hijo en BD**: Usuarios que solo tenían `x` asignado ahora perderán acceso a funciones de `x/y`.
3. **`fix(consignaciones): toggle no crea pago` — auto-vinculación no confirmada**: Depende de que el backend auto-asocie pagos posteriores al saldo de la consignación.
4. **`VincularPagoDialog` lista pagos reales — endpoint no confirmado**: Confirmar que el backend devuelve `monto`, `metodo`, `fecha`, `recibido_por`.
5. **Consignaciones denormalizadas — campos del backend**: Si no devuelve `solicitud_codigo`, `cliente_nombre`, `almacen_nombre` y `pagos[]`, la UI mostrará vacíos.
6. **`PATCH /facturas-solar-carros/{id}` — confirmar endpoint**: El botón Editar asume que existe.
7. **Fix doble-clic RRHH — sin mecanismo de retry**: Si la primera petición falla, el guard queda activo y el usuario necesita recargar.
8. **Carga perezosa por pestaña — datos no actualizados al volver**: Los datos se cargan una sola vez; pueden estar desactualizados si el usuario modifica datos en otro módulo.
9. **Refactor RRHH de 1410 a 579 líneas**: Una reducción tan grande puede haber eliminado casos edge.

---

#### Seguimientos vigentes

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
- **Backend debe aceptar nuevos campos**.
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
- **`POST /solicitudes-transferencia/{id}/resolver` — endpoint pendiente de confirmación**.
- **Módulo "Empleados" — permisos en BD no migrados (nuevo)**.
- **Sub-permiso implícito — usuarios con padre sin hijo en BD (nuevo)**.
- **`PATCH /facturas-solar-carros/{id}` — confirmar endpoint (nuevo)**.
- **`VincularPagoDialog` — endpoint de PagoVenta por solicitud (nuevo)**.
- **Consignaciones denormalizadas — campos del backend (nuevo)**.
- **Auto-vinculación de pagos a consignación (nuevo)**.
- **Módulo "Consignaciones" en catálogo — sync a BD (nuevo)**.

---

## 📅 9 de Junio, 2026

### Resumen de cambios (últimas 24h)

**~20 commits** de Fabian1820 y yany1509 — día de alta actividad: sistema completo de asignaciones con depreciación, ajuste de costo y transferencia; sub-permiso en Fichas de Costo; nueva pestaña de Reservas en notificaciones; cron de actualización de precios; y múltiples fixes en el módulo de ofertas y exports.

---

### Área 1: Asignaciones — depreciación, costo, ajuste, transferencia y plan (2 commits — Fabian1820)

- **`feat(asignaciones): mostrar depreciación, costo, fecha y descripción`** (15:52) — `precio` renombrado a `costo`; agrega `descripcion`, `fecha_asignacion` y campos derivados (`depreciacion_mensual`, `valor_depreciado`, `valor_residual`).
- **`feat(asignaciones): ajuste de costo, transferencia, historial y plan de depreciación`** (23:07) — `AjustarCostoDialog`, `TransferirAsignacionDialog`, `PlanDepreciacionView` con 5 KPIs, filtros, tabla con totales y export a Excel.

---

### Área 2: Fichas de Costo — márgenes y sub-permiso (2 commits — Fabian1820)

- **`Fichas de Costo: margen s/ venta en tabla, dos márgenes en detalle, pools`** (16:13).
- **`Fichas de Costo: sub-permiso "solo ver precios"`** (19:11) — Agrega `fichas-costo/solo-precios` al catálogo.

---

### Área 3: Notificaciones — nueva pestaña Reservas (1 commit — yany1509, 17:31)

- **`feat(notificaciones): nueva pestaña Reservas + mejor jerarquía visual`** — 4ta pestaña "Reservas" para tipo `reserva_pendiente`.

---

### Área 4: Cron de precios — iteración rápida (varios commits — yany1509)

Cron automático lun-sáb 8am vía `instrumentation.ts` con `CRON_CI + CRON_ADMIN_PASS`. Revert del primer intento y re-implementación limpia del botón manual.

---

### Área 5: Ofertas — precio instaladora y stock real (3 commits — yany1509)

- Eliminados descuentos automáticos del 15%/20%. Usa `precio_instaladora` si existe y > 0. `stock_disponible` descuenta `cantidad_reservada`.

---

### Área 6: Export Excel — precios por material (1 commit — Fabian1820, 14:58)

- Stock de almacén y vales de salida: agrega columnas precio de venta, precio instaladora y costo.

---

### Puede dar bateo

1. **`precio → costo` rename — fallback solo en el service**: Si algún componente accede a `asignacion.precio` directamente, recibirá `undefined` silenciosamente.
2. **`AjustarCostoDialog` — endpoint sin contrato confirmado**: Confirmar que el backend tiene endpoint específico para ajuste de costo de asignación.
3. **`TransferirAsignacionDialog` — preserva el reloj de depreciación**: Confirmar que el backend no resetea `fecha_asignacion`.
4. **`PlanDepreciacionView` — campos calculados sin contrato de API**: Confirmar que el backend devuelve `valor_depreciado` y `valor_residual`.
5. **Variables de entorno del cron en producción**: `CRON_CI` y `CRON_ADMIN_PASS` deben estar en Railway/Vercel.
6. **Sub-permiso `fichas-costo/solo-precios` — sincronización a BD**: Si el sync automático no está activo, el sub-permiso no existirá en BD.
7. **Pestaña "Reservas" — tipo `reserva_pendiente` sin confirmar**: Si el backend no genera notificaciones con ese tipo exacto, la pestaña siempre aparecerá vacía.
8. **`stock_disponible = stock - reservas` calculado client-side**: Si el backend no devuelve `cantidad_reservada`, el cálculo dará `NaN`.

---

#### Seguimientos vigentes

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
- **Backend debe aceptar nuevos campos**.
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
- **`POST /solicitudes-transferencia/{id}/resolver` — endpoint pendiente de confirmación**.
- **`precio → costo` rename en Asignacion — fallback solo en service (nuevo)**.
- **Endpoints de ajuste de costo y transferencia de asignaciones (nuevo)**.
- **`PlanDepreciacionView` — campos calculados en endpoint (nuevo)**.
- **Variables de entorno cron en producción — `CRON_CI` y `CRON_ADMIN_PASS` (nuevo)**.
- **Sub-permiso `fichas-costo/solo-precios` — sync a BD (nuevo)**.
- **Tipo `reserva_pendiente` en notificaciones (nuevo)**.

---

> ⚠️ **Nota de mantenimiento**: Las entradas del **5, 6 y 7 de Junio** fueron eliminadas al superar los 7 días de antigüedad (política de retención semanal). Anteriores eliminadas: 26, 27, 28, 29, 30 de Mayo, 31 de Mayo, 1, 2 y 4 de Junio.
