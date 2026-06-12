# Registro de Análisis de Cambios — SunCarWeb

---

## 📅 12 de Junio, 2026

### Resumen de cambios (últimas 24h)

**15 commits** de Fabian1820 y yany1509 — día de alta actividad: flujo completo de Consignaciones (registrar pago, emitir factura, badge en tabla), mejoras mayores de UX en Kardex de Costos, botón "Actualizar costos" unificado en Ficha de Costo, panel de error elegante para materiales sin costear, y 4 fixes en el módulo RRHH (ruta de `cargo` iterada 3 veces).

---

### Área 1: Consignaciones — flujo completo de pago y factura (1 commit — Fabian1820, 16:26)

- **`feat(consignaciones): flujo completo — registrar pago, emitir factura, badge en tabla`** — Botón "Registrar pago" abre `RegistrarPagoVentaDialog` apuntando a la solicitud de la consignación. Botón "Emitir factura" (en tab Pagos, por cada pago) abre `EmitirFacturaConsignacionDialog` y llama a `POST /consignaciones/{id}/facturas`. El botón se convierte en badge "Facturado" cuando `monto_facturado >= monto_total`. Resumen "Facturado / Pendiente de facturar" al pie de tab Pagos. Badge morado "Consignación" en tabla de solicitudes. Nuevos campos en tipo `Consignacion`: `monto_facturado`, `facturas_ids`. Nuevo componente: `EmitirFacturaConsignacionDialog`.

---

### Área 2: Solicitudes — panel de error elegante para pendiente_costeo (3 commits — Fabian1820)

- **`feat(solicitudes): panel de error elegante para materiales pendientes de costeo`** (16:28) — Cuando la aprobación falla por materiales sin costear, se muestra un panel ámbar con foto del material (del catálogo local), código, nombre, compra en la que no está costeado y enlace directo "Ir a ficha" que abre la ficha de costo en nueva pestaña. Nuevos tipos: `PendienteCosteoMaterial`. Hook `aprobarSolicitud` detecta `detail.tipo==="pendiente_costeo"` y lanza error enriquecido con `isPendienteCosteo + materialesBloqueados`.
- **`fix(api-config): preservar detail objeto en respuestas 400`** (16:51) — El handler de 400 descartaba el `detail` cuando era un objeto (no string), devolviendo solo el mensaje genérico. Ahora se incluye `detail` en el retorno cuando es un objeto, permitiendo que los servicios detecten errores estructurados como `pendiente_costeo`.
- **`fix(solicitudes): propagar error estructurado pendiente_costeo sin re-envolver`** (17:15) — El hook atrapaba el error, extraía solo el `message` string y lo re-lanzaba como `new Error(message)`, perdiendo `isPendienteCosteo` y `materialesBloqueados`. Ahora detecta errores estructurados y los re-lanza sin modificar.

---

### Área 3: Ficha de Costo — botón unificado y eliminar botones individuales (2 commits — Fabian1820)

- **`feat(ficha-costo): botón "Actualizar costos" unificado — reemplaza dos botones`** (16:16) — Un solo botón principal inteligente que internamente pondera o ajusta según el estado real de cada material. Llama al endpoint `sincronizar-costos`. Reporta detalle (ponderados · ajustados · sin cambio · sin CIF). Nuevos tipos `SincronizarCostosRequest/Response`.
- **`fix(ficha-costo): eliminar botones individuales Ponderar y Ajustar`** (17:34) — Solo queda el botón "Actualizar costos" que maneja todos los casos.

---

### Área 4: Kardex — rediseño de UX (1 commit — Fabian1820, 14:47)

- **`feat(kardex): mejoras de UX — tipos de fila, grupos de columnas, tendencia`** — Badge de tipo en cada fila (Entrada / Ponderación / Ajuste / Sin costo). Filas de `pendiente_costeo` resaltadas en ámbar. Filas de `ajuste_costo` en naranja. Doble cabecera con grupos: Stock antes | Operación | Resultado. Indicador de tendencia (↑↓ %) en card de costo actual. Advertencia en card cuando hay entradas pendientes de ponderación. Badge de compra clickeable que navega a la ficha de costo. Leyenda visible de tipos de movimiento. Tipos `KardexCosto` actualizados: `tipo`, `pendiente_costeo`, `regularizada_por`.

---

### Área 5: Compras y Kardex de Ajuste (2 commits — Fabian1820)

- **`feat(ficha-costo): botón "Ajustar costo" para re-ponderar compras`** (14:44) — Nuevo estado `ajustando` y handler `handleAjustarCosto`. Guarda la ficha antes de ajustar, crea entradas kardex de tipo `ajuste_costo` y actualiza el costo del catálogo. Tipos `AjustarCostoRequest/Response`. `CompraService.ajustarCosto()` apunta a `POST /ajustar-costo`.
- **`fix(compras): no enviar materiales en PATCH cuando la compra está recibida`** (16:00) — El form enviaba los materiales originales en el payload aunque estuvieran bloqueados, causando 422 del backend. Ahora se omite el campo `materiales` cuando `materialesBloqueados=true`.
- **`fix(compras): ordenar por fecha_llegada_aproximada, fallback a fecha_envio`** (15:44).

---

### Área 6: RRHH — fixes de ruta de cargo (3 commits — yany1509)

- **`fix(rrhh): campo editable clickeable en toda el área, no solo en el lápiz`** (18:29) — El botón de editar tenía `opacity-0` y solo aparecía en hover. Ahora el texto completo es clickeable.
- **`fix(rrhh): enrutar cargo y activo al endpoint correcto`** (18:42) — `cargo` → `PUT /trabajadores/{ci}`, `activo` → `actualizarEstadoTrabajador`.
- **`fix(rrhh): revertir cargo al endpoint /rrhh correcto`** (19:10) — El fix anterior enviaba `cargo` a `PUT /trabajadores/{ci}` que no lo acepta. `cargo` va a `PUT /{ci}/rrhh` junto con los demás campos RRHH.

---

### Área 7: Export PDF (1 commit — yany1509, 18:52)

- **`fix(export): centrar logo verticalmente en encabezado PDF`**.

---

### Puede dar bateo

1. **`POST /consignaciones/{id}/facturas` — endpoint sin confirmar**: El botón "Emitir factura" asume que este endpoint existe. Si no, la operación fallará con 404 sin aviso descriptivo al usuario.

2. **Badge "Facturado" con flotantes**: `monto_facturado >= monto_total` calculado en frontend. Con valores flotantes (`0.9999999 >= 1.0`), puede mostrar "Pendiente" en una factura ya cobrada.

3. **`cargo` en RRHH — 3 commits en 40 min (18:29→19:10)**: El endpoint correcto cambió dos veces. El commit final (19:10) lo envía a `PUT /{ci}/rrhh`. Confirmar con el backend que ese endpoint acepta `cargo`; si no, el campo no se persiste silenciosamente.

4. **`fix(api-config): preservar detail objeto`**: Ahora los consumidores de `apiRequest` pueden recibir un objeto `detail` en lugar de solo `message` string. Componentes que hacían `error.message` directamente pueden romperse si el error viene como objeto.

5. **Panel de error `pendiente_costeo` — `useMaterials` en contexto**: El panel usa `useMaterials` para mostrar fotos. Si el hook no está inicializado en el scope del dialog (sin provider), las fotos no cargarán.

6. **Campos `tipo`, `pendiente_costeo`, `regularizada_por` en KardexCosto**: Si el backend no devuelve estos campos en `/kardex-costo`, las filas no mostrarán badges ni resaltados ámbar/naranja, degradando la UX silenciosamente.

7. **Botón "Actualizar costos" — lógica de decisión interna opaca**: Decide internamente si pondera o ajusta. Un error en la lógica puede aplicar la operación incorrecta (ajustar cuando debería ponderar o viceversa) sin aviso al usuario.

8. **`fix(compras): no enviar materiales en PATCH`**: Si `materialesBloqueados` tiene un bug y es `false` cuando debería ser `true`, el PATCH seguirá enviando materiales y recibirá 422 del backend.

9. **`POST /ajustar-costo` — endpoint sin confirmar**: El botón "Ajustar costo" llama a este endpoint. Confirmar que existe y acepta la estructura de `AjustarCostoRequest`.

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
- **Rebrand paleta — componentes con clases hardcoded**: Componentes con clases `orange-*` directas pueden mostrar colores incorrectos. El tema Ventas puede no aplicarse a modals/popovers fuera del nodo `data-area`.
- **`POST /solicitudes-transferencia/{id}/resolver` — endpoint pendiente de confirmación**: Confirmar que existe en el backend y solo acepta solicitudes en estado `procesando`.
- **Módulo "Empleados" — permisos en BD no migrados**: El módulo fue renombrado de "Recursos Humanos". Los trabajadores con permiso antiguo no verán el nuevo módulo. Requiere re-asignación o migración en BD.
- **Sub-permiso implícito — usuarios con padre sin hijo en BD**: El fix exige `x/y` explícito. Revisar qué usuarios necesitan re-asignación de sub-permisos.
- **`PATCH /facturas-solar-carros/{id}` — confirmar endpoint**: El botón Editar asume que existe y acepta los campos editados (no, fecha, cliente, concepto, moneda, monto).
- **`VincularPagoDialog` — endpoint de PagoVenta por solicitud**: Confirmar que el backend devuelve `monto`, `metodo`, `fecha`, `recibido_por` en el listado de pagos por solicitud.
- **Consignaciones denormalizadas — campos del backend**: Confirmar que el endpoint de consignaciones devuelve `solicitud_codigo`, `cliente_nombre`, `almacen_nombre` y `pagos[]`.
- **Auto-vinculación de pagos a consignación**: Confirmar que el backend auto-asocia pagos normales posteriores al saldo de la consignación sin intervención manual.
- **`POST /consignaciones/{id}/facturas` — endpoint sin confirmar (nuevo)**: El botón "Emitir factura" asume que este endpoint existe. Si no, la operación fallará con 404.
- **`cargo` en RRHH — confirmar aceptación en `PUT /{ci}/rrhh` (nuevo)**: Después de 3 commits de iteración, confirmar que el backend acepta `cargo` en ese endpoint.
- **Campos `tipo`, `pendiente_costeo`, `regularizada_por` en KardexCosto (nuevo)**: Si el backend no devuelve estos campos, las filas del kardex no mostrarán badges ni resaltados.
- **Badge "Facturado" con flotantes (nuevo)**: `monto_facturado >= monto_total` puede mostrar "Pendiente" en factura ya cobrada por redondeo flotante.
- **Botón "Actualizar costos" — lógica de decisión interna (nuevo)**: Decide internamente si pondera o ajusta. Un error puede aplicar la operación incorrecta sin aviso al usuario.

---

## 📅 11 de Junio, 2026

### Resumen de cambios (últimas 24h)

**11 commits** de Fabian1820 y yany1509 — módulo de Consignaciones completado y refinado (creación, vinculación de pagos, devoluciones, UI legible sin ObjectIds), refactor mayor de RRHH con subpágina de detalle por CI y rename a "Empleados", edición de facturas solar-carros con carga perezosa por pestaña, y fix crítico de sub-permisos implícitos en el sistema de permisos.

---

### Área 1: Consignaciones — módulo completo y refinamiento de flujo (6 commits — Fabian1820)

- **`feat(consignaciones): módulo en UI + toggle en registrar pago`** (Jun 10, 13:51) — Módulo `/consignaciones` con tabla, filtros, dialog de detalle (cards de saldo, tabs Materiales/Pagos/Devoluciones). Toggle "Marcar como consignación" en registrar-pago-venta-dialog que crea `Consignacion` con el pago como inicial. Tipos `OrigenSolicitudEntrada` y campos opcionales en `SolicitudEntradaAlmacenCreateData`.
- **`fix(compra-form-dialog): "Referencia del buque" → "Referencia del contenedor"`** (Jun 10, 14:06) — Fix de label.
- **`refactor(consignaciones): quitar botón "Nueva Consignación" del módulo`** (Jun 10, 14:20) — Las consignaciones solo se crean desde Pagos con el toggle.
- **`feat(solicitudes-entrada-almacen): filtro y badge de origen (compra | consignación)`** (Jun 10, 14:47) — Tipo `SolicitudEntradaAlmacen` incluye `origen` y `consignacion_id`. Filtro "Origen" en la página. Badge azul (Compra) / morado (Consignación) en tabla.
- **`fix(consignaciones): toggle no crea pago — solo crea consignación`** (Jun 10, 18:06) — **Cambio de flujo crítico**: el flujo anterior creaba un `PagoVenta` Y una `Consignacion`, dejando la solicitud aparentemente pagada al 100%. Nuevo flujo: el toggle solo llama a `ConsignacionService.crear({solicitud_venta_id, moneda})` sin crear pago.
- **`fix(consignaciones): UX — sin ObjectIds, step entero, listar pagos reales`** (Jun 11, 14:42) — `VincularPagoDialog`: eliminado input manual de ObjectId; ahora lista los `PagoVenta` existentes de la solicitud. `RegistrarDevolucionDialog`: step=1, texto en lenguaje humano. Tipo `Consignacion` trae `solicitud_codigo`, `cliente_nombre`, `almacen_nombre` y `pagos[]` denormalizados del backend.

---

### Área 2: RRHH — refactor y subpágina de detalle (2 commits — yany1509)

- **`feat(rrhh): refactor de página de empleados y detalle por CI`** (Jun 10, 19:15) — `/recursos-humanos` refactorizada de 1410 a 579 líneas. Nueva subpágina `/recursos-humanos/[ci]` para detalle de trabajador. **Módulo renombrado**: "Recursos Humanos" → "Empleados" en el catálogo de módulos.
- **`fix(rrhh): evitar creación duplicada de empleado por doble-clic`** (Jun 11, 17:55) — El formulario no recíba `isSubmitting` del padre y el botón permanecía habilitado durante el POST. Se agrega guarda interna que bloquea envíos concurrentes.

---

### Área 3: Facturas solar-carros — edición + carga perezosa (1 commit — yany1509, Jun 11 17:09)

- **`feat(facturas-solar-carros): botón editar + carga perezosa por pestaña`** — Botón "Editar" en facturas con dialog que hace `PATCH /facturas-solar-carros/{id}`. Carga perezosa por pestaña (instaladora/ventas/facturas). Spinners independientes por pestaña. `pageSize` de facturas sube de 200 a 500.

---

### Área 4: Fix crítico de permisos — sub-permiso implícito (1 commit — yany1509, Jun 11 19:33)

- **`fix(permisos): sub-permiso implícito cuando padre tiene acceso completo`** — El checkbox de sub-permisos aparecía chequeado+disabled en la UI cuando el módulo padre tenía acceso completo, pero el key del sub-permiso nunca se guardaba en BD. `hasPermission("x/y")` devolvía `false` si solo existía `"x"` en `modulosPermitidos`, ocultando botones como "Registrar entrada" en almacenes.

---

### Puede dar bateo

1. **Módulo "Empleados" — permisos en BD no migrados**: El módulo fue renombrado de "Recursos Humanos" a "Empleados" en el catálogo del frontend. Los trabajadores que tenían asignado el módulo "Recursos Humanos" en BD no verán el nuevo módulo "Empleados" hasta que sus permisos sean actualizados. Requiere re-asignación masiva o migración en BD.

2. **Sub-permiso implícito fix — usuarios con padre sin hijo en BD**: El fix exige que `x/y` esté explícitamente en `modulosPermitidos`. Usuarios que solo tenían `x` asignado antes del fix (y dependían del comportamiento implícito) ahora perderán acceso a las funciones de `x/y`.

3. **`fix(consignaciones): toggle no crea pago` — auto-vinculación no confirmada**: El nuevo flujo depende de que el backend auto-asocie los pagos normales posteriores al saldo de la consignación. Si la auto-vinculación no está implementada o falla, los pagos quedarán desvinculados.

4. **`VincularPagoDialog` lista pagos reales — endpoint no confirmado**: Confirmar que el backend devuelve los campos `monto`, `metodo`, `fecha`, `recibido_por` en el endpoint consultado.

5. **Consignaciones denormalizadas — campos del backend**: La tabla y el detalle esperan `solicitud_codigo`, `cliente_nombre`, `almacen_nombre` y `pagos[]` en la respuesta. Si el backend no los devuelve, la UI mostrará vacíos o fallback a fragmentos de ID.

6. **`PATCH /facturas-solar-carros/{id}` — confirmar endpoint**: El botón Editar asume que este endpoint existe y acepta los campos editados.

7. **Fix doble-clic RRHH — sin mecanismo de retry tras error de red**: La guarda interna bloquea envíos concurrentes. Si la primera petición falla por error de red, el guard queda activo y el usuario necesita recargar la página para reintentar.

8. **Carga perezosa por pestaña — datos no actualizados al volver**: Los datos se cargan una sola vez al visitar la pestaña. Si el usuario modifica datos en otro módulo y vuelve, los datos pueden estar desactualizados.

9. **Refactor RRHH de 1410 a 579 líneas — posible pérdida de funcionalidad**: Una reducción tan grande puede haber eliminado casos edge. Verificar flujos completos (crear, editar, desactivar, permisos).

---

#### Seguimientos vigentes

- **`apiRequest success:false` — monitorear regresiones post-deploy**: El fix global puede descubrir errores que estaban silenciados.
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
- **Rebrand paleta — componentes con clases hardcoded**: Componentes con clases `orange-*` directas pueden mostrar colores incorrectos. El tema Ventas puede no aplicarse a modals/popovers fuera del nodo `data-area`.
- **`POST /solicitudes-transferencia/{id}/resolver` — endpoint pendiente de confirmación**: Confirmar que existe en el backend y solo acepta solicitudes en estado `procesando`.
- **Módulo "Empleados" — permisos en BD no migrados (nuevo)**: El módulo fue renombrado de "Recursos Humanos". Los trabajadores con permiso antiguo no verán el nuevo módulo. Requiere re-asignación o migración en BD.
- **Sub-permiso implícito — usuarios con padre sin hijo en BD (nuevo)**: El fix exige `x/y` explícito. Revisar qué usuarios necesitan re-asignación de sub-permisos.
- **`PATCH /facturas-solar-carros/{id}` — confirmar endpoint (nuevo)**: El botón Editar asume que existe y acepta los campos editados (no, fecha, cliente, concepto, moneda, monto).
- **`VincularPagoDialog` — endpoint de PagoVenta por solicitud (nuevo)**: Confirmar que el backend devuelve `monto`, `metodo`, `fecha`, `recibido_por` en el listado de pagos por solicitud.
- **Consignaciones denormalizadas — campos del backend (nuevo)**: Confirmar que el endpoint de consignaciones devuelve `solicitud_codigo`, `cliente_nombre`, `almacen_nombre` y `pagos[]`.
- **Auto-vinculación de pagos a consignación (nuevo)**: Confirmar que el backend auto-asocia pagos normales posteriores al saldo de la consignación sin intervención manual.
- **Módulo "Consignaciones" en catálogo — sync a BD (nuevo)**: Confirmar que el auto-sync al abrir /permisos registra el nuevo módulo en BD.

---

## 📅 9 de Junio, 2026

### Resumen de cambios (últimas 24h)

**~20 commits** de Fabian1820 y yany1509 — día de alta actividad: sistema completo de asignaciones con depreciación, ajuste de costo y transferencia; sub-permiso en Fichas de Costo; nueva pestaña de Reservas en notificaciones; cron de actualización de precios (con revert y re-implementación); y múltiples fixes en el módulo de ofertas y exports.

---

### Área 1: Asignaciones — depreciación, costo, ajuste, transferencia y plan (2 commits — Fabian1820)

- **`feat(asignaciones): mostrar depreciación, costo, fecha y descripción`** (15:52) — `precio` renombrado a `costo` en tipos `Asignacion` / `AsignacionInstalacion`; agrega `descripcion`, `fecha_asignacion` y campos derivados (`depreciacion_mensual`, `valor_depreciado`, `valor_residual`). Service normaliza con fallback `costo ?? precio` para registros legacy.
- **`feat(asignaciones): ajuste de costo, transferencia, historial y plan de depreciación`** (23:07) — Nuevos tipos: `AjustarCostoData`, `TransferirData`, `TipoEntidad`, `PlanDepreciacionFila/Totales/Filtros`. `AjustarCostoDialog`: ajusta costo unitario sin tocar el catálogo, motivo obligatorio. `TransferirAsignacionDialog`: selector tipo + búsqueda de entidad destino. `PlanDepreciacionView`: nueva pestaña con 5 KPIs ejecutivos, filtros, tabla con totales y export a Excel.

---

### Área 2: Fichas de Costo — márgenes y sub-permiso (2 commits — Fabian1820)

- **`Fichas de Costo: margen s/ venta en tabla, dos márgenes en detalle, pools`** (16:13) — Margen calculado sobre precio de venta. Dialog de stock con `PoolsDistributionDialog` + traspaso entre pools.
- **`Fichas de Costo: sub-permiso "solo ver precios"`** (19:11) — Agrega `fichas-costo/solo-precios` al catálogo. Si el usuario tiene ÚnicAMENTE ese sub-permiso, la tabla se reduce a 6 columnas (oculta costo, margen, acciones y filtros sensibles).

---

### Área 3: Notificaciones — nueva pestaña Reservas (1 commit — yany1509, 17:31)

- **`feat(notificaciones): nueva pestaña Reservas + mejor jerarquía visual`** — 4ta pestaña "Reservas" para tipo `reserva_pendiente`. Rediseño del ítem: icono circular por tipo, nombre del cliente como elemento principal, badge de días escalado (ámbar/naranja/rojo).

---

### Área 4: Cron de precios — iteración rápida (varios commits — yany1509)

Primer intento con botón + ruta API. Cron automático lun-sáb 8am vía `instrumentation.ts` con `CRON_BACKEND_TOKEN`. Fix de auth reemplaza token estático por login dinámico con `CRON_CI + CRON_ADMIN_PASS`. Revert del primer intento. Re-implementación limpia del botón manual.

---

### Área 5: Ofertas — precio instaladora y stock real (3 commits — yany1509)

- Eliminados descuentos automáticos del 15%/20%. Usa `precio_instaladora` si existe y > 0. `stock_disponible` descuenta `cantidad_reservada`. Endpoint completo `lite:false` para incluir `precio_instaladora`.

---

### Área 6: Export Excel — precios por material (1 commit — Fabian1820, 14:58)

- Stock de almacén y vales de salida: agrega columnas precio de venta, precio instaladora y costo.

---

### Puede dar bateo

1. **`precio → costo` rename — fallback solo en el service**: Si algún componente accede a `asignacion.precio` directamente, recibirá `undefined` silenciosamente.
2. **`AjustarCostoDialog` — endpoint sin contrato confirmado**: Confirmar que el backend tiene endpoint específico para ajuste de costo de asignación y que `motivo` es obligatorio.
3. **`TransferirAsignacionDialog` — "preserva el reloj de depreciación"**: Confirmar que el backend no resetea `fecha_asignacion` y acepta `tipo_entidad_destino + entidad_destino_id`.
4. **`PlanDepreciacionView` — campos calculados sin contrato de API**: Confirmar que el backend devuelve `valor_depreciado` y `valor_residual`; si no, los KPIs mostrarán 0 o `NaN`.
5. **Cron con múltiples iteraciones en el mismo día — código residual**: Confirmar que `instrumentation.ts` no tiene código del cron antiguo conviviendo con el nuevo.
6. **Variables de entorno del cron en producción**: `CRON_CI` y `CRON_ADMIN_PASS` deben estar en Railway/Vercel; si no, el cron falla silenciosamente.
7. **Sub-permiso `fichas-costo/solo-precios` — sincronización a BD**: Si el sync automático no está activo, el sub-permiso no existirá en BD.
8. **Pestaña "Reservas" — tipo `reserva_pendiente` sin confirmar**: Si el backend no genera notificaciones con ese tipo exacto, la pestaña siempre aparecerá vacía.
9. **`stock_disponible = stock - reservas` calculado client-side**: Si el backend no devuelve `cantidad_reservada` en el endpoint completo (`lite:false`), el cálculo dará `NaN`.

---

#### Seguimientos vigentes

- **`apiRequest success:false` — monitorear regresiones post-deploy**: El fix global puede descubrir errores que estaban silenciados.
- **`showContableFields` en MaterialForm**: Confirmar valor por defecto del prop.
- **`costo` y `material_id` en tipo `Material`**: Confirmar que los endpoints del catálogo devuelven estos campos.
- **Wallet historial por miembro — filtros params**: Confirmar que el backend acepta tipo, fechas y búsqueda.
- **Excel Fichas de Costo sin cota de registros**: Puede saturar memoria del navegador con catálogos grandes.
- **CI `87120119233` hardcodeado para control de permisos**: Debería moverse a un campo de permiso en BD.
- **Campos `cambio_real_*` requieren backend actualizado**: Si el backend no los acepta, los POSTs fallarán con 422.
- **Endpoint lazy load `GET /obras-terminadas/oferta/{id}/facturas-cliente`**: Si no existe, el usuario verá error de carga.
- **PDF unificado con `limit=total` sin cota máxima**: Puede generar timeout con miles de registros.
- **Badge de estado calculado en frontend con flotantes**: Redondeo puede mostrar "pendiente" en factura realmente pagada.
- **Módulo Vales/Facturas Instaladora comentado sin aviso explícito**.
- **Sistema de notificaciones — endpoints bulk por tipo**.
- **`GET /inventario/stock-historico`**.
- **AdminPass 123456 hardcodeado**: Brecha de seguridad operativa.
- **Auto-sync catálogo → BD al abrir /permisos**.
- **Logs de debug en producción**.
- **Eliminación lógica `cantidad = 0` en asignaciones**.
- **Creación inline sin persistencia inmediata**.
- **Subida de archivos sin rollback**.
- **Backend debe aceptar nuevos campos**: `motivo`, `nota`, `foto`, `ficha_tecnica_url`, `oferta_venta_id`, etc.
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

## 📅 6 de Junio, 2026

### Resumen de cambios (últimas 24h)

Sin commits de desarrollo nuevos desde el análisis de las 23:29 del 5/06.

---

### Consideraciones del día

Sin actividad de desarrollo nueva hoy. Los seguimientos del 5/06 siguen vigentes sin cambios.

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

## 📅 5 de Junio, 2026

### Resumen de cambios (últimas 24h)

**8 commits** de Fabian1820, Ruben0304 y yany1509 — corrección crítica del manejo global de errores HTTP, Fichas de Costo reconstruidas dos veces en la misma tarde, nueva vista de billetera por miembro con exportación, y fixes de logos, vales de salida y límites de PDF.

---

### Área 1: Fix crítico de `apiRequest` (1 commit — yany1509, 13:39)

- **`fix(api): normalizar success:false en errores HTTP`** — Cuando el backend devolvía 400 con `{detail:"..."}`, `apiRequest` retornaba el objeto sin `success:false`. `extractApiError` no lo detectaba y `mapSolicitud` procesaba datos corruptos. Resultado: aprobar una solicitud mostraba toast de éxito aunque el backend la rechazara.

---

### Área 2: Vales de Salida — toast para materiales inválidos (1 commit — yany1509, 13:46)

- Cuando todos los materiales tienen cantidad 0 o `material_id` vacío, ahora muestra toast de error descriptivo.

---

### Área 3: Wallet — vista por miembro y exportación paginada (2 commits — Ruben0304)

- Vista de historial por miembro con filtros independientes (tipo, fechas, búsqueda), paginación completa y exportación Excel.
- Fix: paginación en lotes de 500 para respetar límite del backend.

---

### Área 4: Logos y corrección de límite PDF (1 commit — yany1509, 16:47)

- Reemplaza `/logo.png` por `/brand/suncar-v1-iso.png`. Corrige error "Limit should be <= 500" en PDF unificado.

---

### Área 5: Fichas de Costo (3 commits — Fabian1820, 18:31→20:46)

- Rehabilitación (18:31): corrige la carga rota, vista contable con pestañas.
- Refinamiento (20:46): reconstruye sobre `useMaterials`, filtros completos, exportación Excel, CRUD con `MaterialForm`, sección contable gateada. Elimina `use-fichas-costo` y `editar-precios-dialog`.

---

### Puede dar bateo

1. **`editar-precios-dialog` eliminado — imports residuales**: Si algún componente fuera de Fichas de Costo lo importa, compilará con error.
2. **`showContableFields` en MaterialForm — valor por defecto desconocido**: Default `false` haría perder la sección contable en otros módulos silenciosamente.
3. **`success:false` global — posibles regresiones**: Flujos que antes "funcionaban" con 400s del backend pueden empezar a mostrar toasts de error inesperados.
4. **Wallet — filtros por miembro sin contrato de API confirmado**.
5. **Excel en lotes de 500 — ¿loop completo o solo primer lote?**
6. **PDF unificado paginado — múltiples peticiones HTTP sin cota máxima**.
7. **2 refactors de Fichas de Costo en <3h**: Confirmar que producción usa el último commit (20:46).

---

#### Seguimientos vigentes

- **`apiRequest success:false` — monitorear regresiones post-deploy (nuevo)**.
- **`showContableFields` en MaterialForm (nuevo)**.
- **`costo` y `material_id` en tipo `Material` (nuevo)**.
- **Wallet historial por miembro — filtros params (nuevo)**.
- **Excel Fichas de Costo sin cota de registros (nuevo)**.
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

> ⚠️ **Nota de mantenimiento**: Las entradas del **26, 27, 28, 29, 30 de Mayo, 31 de Mayo, 1, 2 y 4 de Junio** fueron eliminadas al superar los 7 días de antigüedad (política de retención semanal).
