# Registro de Análisis de Cambios — SunCarWeb

---

## 📅 14 de Junio, 2026

### Resumen de cambios (últimas 24h)

Sin commits nuevos en SunCarWeb. Los seguimientos del 12/06 siguen vigentes.

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
- **`fix(solicitudes): propagar error estructurado pendiente_costeo sin re-envolver`** (17:15) — El hook re-lanzaba solo el `message` string, perdiendo `isPendienteCosteo` y `materialesBloqueados`. Ahora detecta errores estructurados y los re-lanza sin modificar.

---

### Área 3: Ficha de Costo — botón unificado (2 commits — Fabian1820)

- **`feat(ficha-costo): botón "Actualizar costos" unificado`** (16:16) — Un solo botón principal inteligente que pondera o ajusta según el estado real de cada material. Llama al endpoint `sincronizar-costos`.
- **`fix(ficha-costo): eliminar botones individuales Ponderar y Ajustar`** (17:34).

---

### Área 4: Kardex — rediseño de UX (1 commit — Fabian1820, 14:47)

- **`feat(kardex): mejoras de UX — tipos de fila, grupos de columnas, tendencia`** — Badge de tipo en cada fila. Filas `pendiente_costeo` en ámbar. Doble cabecera con grupos. Indicador de tendencia en card de costo actual.

---

### Área 5: Compras y Kardex de Ajuste (2 commits — Fabian1820)

- **`feat(ficha-costo): botón "Ajustar costo"`** (14:44) — Crea entradas kardex de tipo `ajuste_costo`. `CompraService.ajustarCosto()` apunta a `POST /ajustar-costo`.
- **`fix(compras): no enviar materiales en PATCH cuando la compra está recibida`** (16:00) — El form enviaba los materiales originales causando 422 del backend.

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

1. **`POST /consignaciones/{id}/facturas` — endpoint sin confirmar**: Si no existe, la operación fallará con 404 sin aviso descriptivo al usuario.
2. **Badge "Facturado" con flotantes**: `monto_facturado >= monto_total` calculado en frontend puede mostrar "Pendiente" por imprecisión de punto flotante.
3. **`cargo` en RRHH — 3 commits en 40 min**: Confirmar que `PUT /{ci}/rrhh` acepta `cargo`.
4. **`fix(api-config)` — consumidores con `error.message` directamente**: Pueden romperse si el error viene como objeto `detail`.
5. **Panel `pendiente_costeo` con `useMaterials` sin provider**: Las fotos no cargarán si el hook no está inicializado en el scope del dialog.
6. **Campos `tipo`, `pendiente_costeo`, `regularizada_por` en KardexCosto**: Si el backend no los devuelve, los badges y resaltados no aparecen.
7. **Botón "Actualizar costos" — lógica de decisión interna**: Puede aplicar operación incorrecta sin aviso.
8. **`fix(compras): no enviar materiales`**: Si `materialesBloqueados` tiene un bug y es `false` incorrecto, el PATCH seguirá causando 422.
9. **`POST /ajustar-costo` — endpoint sin confirmar**.

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
- **Módulo "Empleados" — permisos en BD no migrados**.
- **Sub-permiso implícito — usuarios con padre sin hijo en BD**.
- **`PATCH /facturas-solar-carros/{id}` — confirmar endpoint**.
- **`VincularPagoDialog` — endpoint de PagoVenta por solicitud**.
- **Consignaciones denormalizadas — campos del backend**.
- **Auto-vinculación de pagos a consignación**.
- **`POST /consignaciones/{id}/facturas` — endpoint sin confirmar (nuevo)**.
- **`cargo` en RRHH — confirmar aceptación en `PUT /{ci}/rrhh` (nuevo)**.
- **Campos `tipo`, `pendiente_costeo`, `regularizada_por` en KardexCosto (nuevo)**.
- **Badge "Facturado" con flotantes (nuevo)**.
- **Botón "Actualizar costos" — lógica de decisión interna (nuevo)**.

---

## 📅 11 de Junio, 2026

### Resumen de cambios (últimas 24h)

**11 commits** de Fabian1820 y yany1509 — módulo de Consignaciones completado y refinado (creación, vinculación de pagos, devoluciones, UI legible sin ObjectIds), refactor mayor de RRHH con subpágina de detalle por CI y rename a "Empleados", edición de facturas solar-carros con carga perezosa por pestaña, y fix crítico de sub-permisos implícitos.

---

### Área 1: Consignaciones — módulo completo (6 commits — Fabian1820)

- **`feat(consignaciones): módulo en UI + toggle en registrar pago`** (Jun 10, 13:51) — Módulo `/consignaciones` con tabla, filtros, dialog de detalle. Toggle "Marcar como consignación" en registrar-pago-venta-dialog.
- **`fix(compra-form-dialog): "Referencia del buque" → "Referencia del contenedor"`** (Jun 10, 14:06).
- **`refactor(consignaciones): quitar botón "Nueva Consignación" del módulo`** (Jun 10, 14:20).
- **`feat(solicitudes-entrada-almacen): filtro y badge de origen`** (Jun 10, 14:47) — Badge azul (Compra) / morado (Consignación) en tabla.
- **`fix(consignaciones): toggle no crea pago — solo crea consignación`** (Jun 10, 18:06) — Cambio de flujo crítico: el toggle solo llama a `ConsignacionService.crear()` sin crear pago.
- **`fix(consignaciones): UX — sin ObjectIds, step entero, listar pagos reales`** (Jun 11, 14:42) — `VincularPagoDialog`: lista los `PagoVenta` existentes de la solicitud en lugar de input manual de ObjectId.

---

### Área 2: RRHH — refactor y subpágina de detalle (2 commits — yany1509)

- **`feat(rrhh): refactor de página de empleados y detalle por CI`** (Jun 10, 19:15) — `/recursos-humanos` refactorizada de 1410 a 579 líneas. Nueva subpágina `/recursos-humanos/[ci]`. **Módulo renombrado**: "Recursos Humanos" → "Empleados".
- **`fix(rrhh): evitar creación duplicada de empleado por doble-clic`** (Jun 11, 17:55).

---

### Área 3: Facturas solar-carros — edición + carga perezosa (1 commit — yany1509, Jun 11 17:09)

- **`feat(facturas-solar-carros): botón editar + carga perezosa por pestaña`** — `PATCH /facturas-solar-carros/{id}`. `pageSize` de facturas sube de 200 a 500.

---

### Área 4: Fix crítico de permisos — sub-permiso implícito (1 commit — yany1509, Jun 11 19:33)

- **`fix(permisos): sub-permiso implícito cuando padre tiene acceso completo`** — El key del sub-permiso nunca se guardaba en BD. `hasPermission("x/y")` devolvía `false` si solo existía `"x"` en `modulosPermitidos`.

---

### Puede dar bateo

1. **Módulo "Empleados" — permisos en BD no migrados**: Los trabajadores que tenían asignado "Recursos Humanos" en BD no verán "Empleados" hasta actualizar sus permisos.
2. **Sub-permiso implícito fix — usuarios con padre sin hijo en BD**: Usuarios que solo tenían `x` asignado antes del fix ahora perderán acceso a las funciones de `x/y`.
3. **`fix(consignaciones): toggle no crea pago` — auto-vinculación no confirmada**: El nuevo flujo depende de que el backend auto-asocie los pagos normales posteriores al saldo.
4. **`VincularPagoDialog` lista pagos reales — endpoint no confirmado**.
5. **Consignaciones denormalizadas — campos del backend**: La UI espera `solicitud_codigo`, `cliente_nombre`, `almacen_nombre` y `pagos[]`.
6. **`PATCH /facturas-solar-carros/{id}` — confirmar endpoint**.
7. **Fix doble-clic RRHH — sin retry tras error de red**: La guarda interna bloquea envíos; si la primera petición falla, el usuario necesita recargar.
8. **Carga perezosa por pestaña — datos no actualizados al volver**.
9. **Refactor RRHH de 1410 a 579 líneas — posible pérdida de funcionalidad**.

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

**~20 commits** de Fabian1820 y yany1509 — sistema completo de asignaciones con depreciación, ajuste de costo y transferencia; sub-permiso en Fichas de Costo; nueva pestaña de Reservas en notificaciones; cron de actualización de precios; y múltiples fixes en ofertas y exports.

---

### Área 1: Asignaciones — depreciación, costo, ajuste, transferencia (2 commits — Fabian1820)

- **`feat(asignaciones): mostrar depreciación, costo, fecha y descripción`** (15:52) — `precio` renombrado a `costo`. Agrega `descripcion`, `fecha_asignacion` y campos derivados (`depreciacion_mensual`, `valor_depreciado`, `valor_residual`).
- **`feat(asignaciones): ajuste de costo, transferencia, historial y plan`** (23:07) — `AjustarCostoDialog`, `TransferirAsignacionDialog`, `PlanDepreciacionView` con 5 KPIs ejecutivos.

---

### Área 2: Fichas de Costo — márgenes y sub-permiso (2 commits — Fabian1820)

- **Margen s/ venta en tabla, dos márgenes en detalle, pools** (16:13).
- **Sub-permiso `fichas-costo/solo-precios`** (19:11) — Si el usuario tiene únicamente ese sub-permiso, la tabla se reduce a 6 columnas.

---

### Área 3: Notificaciones — nueva pestaña Reservas (1 commit — yany1509, 17:31)

- 4ta pestaña "Reservas" para tipo `reserva_pendiente`. Badge de días escalado (ámbar/naranja/rojo).

---

### Área 4: Cron de precios — iteración rápida (varios commits — yany1509)

Primer intento → revert → re-implementación limpia del botón manual. Cron lun-sáb 8am vía `instrumentation.ts` con `CRON_CI + CRON_ADMIN_PASS`.

---

### Área 5: Ofertas — precio instaladora y stock real (3 commits — yany1509)

- Eliminados descuentos automáticos del 15%/20%. Usa `precio_instaladora` si existe. `stock_disponible` descuenta `cantidad_reservada`.

---

### Puede dar bateo

1. **`precio → costo` rename — fallback solo en el service**: Componentes que acceden a `asignacion.precio` directamente recibirán `undefined`.
2. **Endpoints de ajuste de costo y transferencia de asignaciones**: Confirmar que existen y aceptan la estructura enviada.
3. **`PlanDepreciacionView` — campos calculados**: Confirmar que el backend devuelve `valor_depreciado` y `valor_residual`.
4. **Variables de entorno del cron en producción**: `CRON_CI` y `CRON_ADMIN_PASS` deben estar en Railway/Vercel.
5. **Sub-permiso `fichas-costo/solo-precios` — sync a BD**.
6. **Tipo `reserva_pendiente` en notificaciones**: Si el backend no genera notificaciones con ese tipo, la pestaña siempre aparecerá vacía.
7. **`stock_disponible = stock - reservas` calculado client-side**: Si el backend no devuelve `cantidad_reservada`, el cálculo dará `NaN`.

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

## 📅 7 de Junio, 2026

### Resumen de cambios (últimas 24h)

Sin commits de desarrollo nuevos desde el análisis del 6/06.

---

### Consideraciones del día

Sin actividad de desarrollo nueva hoy. Los seguimientos del 6/06 siguen vigentes sin cambios.

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

---

> ⚠️ **Nota de mantenimiento**: Las entradas del **5 y 6 de Junio, 2026** fueron eliminadas al superar los 7 días de antigüedad (política de retención semanal).
