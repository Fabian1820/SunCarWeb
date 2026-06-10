# Registro de Análisis de Cambios — SunCarWeb

---

## 📅 10 de Junio, 2026

### Resumen de cambios (últimas 24h)

**8 commits** de Fabian1820 y yany1509 — módulo completo de Consignaciones (crear, vincular pagos, registrar devoluciones, anular), refactor del toggle para no crear PagoVenta, filtro de origen en solicitudes de entrada al almacén, y refactor mayor del módulo RRHH con nueva subpágina por CI.

---

### Área 1: Módulo Consignaciones — implementación completa (5 commits — Fabian1820)

- **`feat(consignaciones): módulo en UI + toggle en registrar pago`** (13:51) — Módulo `/consignaciones` completo: tabla, filtros por estado, refresh. Dialog de detalle con cards de saldo (total/pagado/devuelto/pendiente) y tabs Materiales | Pagos | Devoluciones. Crear consignación (selector solicitud + moneda + notas). Vincular pago (lista PagoVenta de la solicitud o pega ObjectId). Registrar devolución (crea `SolicitudEntradaAlmacen` con `origen=consignacion`). Anular con motivo. Toggle "Marcar como consignación" en `registrar-pago-venta-dialog`. Entry en módulos-catálogo (grupo Comercial Ventas).

- **`fix(compra-form-dialog): update label from "Referencia del buque" to "Referencia del contenedor"`** (14:06) — Fix menor de etiqueta de campo.

- **`refactor(consignaciones): quitar botón "Nueva Consignación" del módulo`** (14:20) — Las consignaciones solo se crean desde el módulo de Pagos marcando el toggle. El botón anterior pedía un ObjectId de solicitud que ningún operador maneja.

- **`fix(consignaciones): toggle no crea pago — solo crea consignación`** (18:06) — Cambio de flujo crítico: el flujo anterior creaba un `PagoVenta` (con el monto pre-llenado del pendiente) Y una `Consignacion`. El nuevo flujo NO crea `PagoVenta`; solo llama a `ConsignacionService.crear({solicitud_venta_id, moneda})`. El botón submit cambia a "Crear Consignación" en morado. Cobros posteriores se registran como pagos normales y la auto-vinculación los asocia al saldo de la consignación.

- **`ui(consignaciones): mover toggle al inicio del dialog de pago`** (18:17) — El toggle "Marcar como consignación" pasa a estar arriba, antes del formulario. Cuando se activa, oculta los campos de cobro (monto, método, billetes, plazos, generar factura).

---

### Área 2: Solicitudes de entrada — filtro y badge de origen (1 commit — Fabian1820, 14:47)

- **`feat(solicitudes-entrada-almacen): filtro y badge de origen (compra | consignación)`** — Tipo `SolicitudEntradaAlmacen` incluye ahora `origen` y `consignacion_id`. Service los mapea con default "compra" para docs legacy. Hook expone `origenFilter`. Página agrega Select "Origen" junto a los filtros existentes. Tabla: columna "Origen" con badge azul (Compra) / morado (Consignación), muestra ref a consignación cuando `origen=consignacion`.

---

### Área 3: RRHH — refactor y subpágina por CI (1 commit — Fabian1820 + yany1509, 19:15)

- **`feat(rrhh): refactor de página de empleados y detalle por CI`** — Página `/recursos-humanos` refactorizada de 1410 a 579 líneas. Nueva subpágina `/recursos-humanos/[ci]` para ver el detalle de un trabajador. Renombrado módulo en el catálogo: "Recursos Humanos" → "Empleados".

---

### Puede dar bateo

1. **`ConsignacionService.crear` sin pago inicial — saldo de consignación**: El nuevo flujo no crea `PagoVenta` antes de llamar al servicio. Si el backend requiere un `pago_inicial_id` para calcular el `saldo_total`, la consignación se creará con saldo 0. Confirmar que el backend puede inicializar la consignación solo con `solicitud_venta_id`.

2. **Auto-vinculación de pagos a consignaciones sin confirmar**: El commit asume que los cobros posteriores "se asocian automáticamente al saldo de la consignación". Confirmar que el backend implementa esta lógica al registrar un `PagoVenta` contra una solicitud en estado consignación.

3. **`origen=consignacion` + `consignacion_id` en `SolicitudEntradaAlmacen`**: El módulo crea una solicitud de entrada con estos campos al registrar una devolución. Confirmar que el backend acepta `consignacion_id` en el payload y vincula la devolución correctamente al saldo de la consignación.

4. **Renombrado "Recursos Humanos" → "Empleados" — permisos en BD sin migración**: Si la BD tiene registros de permisos con el nombre "Recursos Humanos", esos usuarios perderán acceso al módulo inmediatamente tras el deploy. Confirmar si el catálogo usa un ID o slug estable independiente del nombre visible, o si hay migración de BD.

5. **Subpágina `/recursos-humanos/[ci]` — protección de ruta no confirmada**: La nueva ruta dinámica debe estar protegida por el mismo `RouteGuard` que el módulo padre. Si no, cualquier usuario autenticado sin permiso de "Empleados" podría acceder al detalle de trabajadores por URL directa.

6. **Refactor de 1410 → 579 líneas en un commit**: Reducción de >60% en un solo cambio. Riesgo de funcionalidad perdida silenciosamente (filtros, exportaciones, acciones de tabla). Confirmar que las características del módulo RRHH siguen completas.

---

#### Seguimientos vigentes

- **`apiRequest success:false` — monitorear regresiones post-deploy**: El fix global puede descubrir errores que estaban silenciados. Cualquier operación que antes mostraba éxito sin verificar puede ahora romper con toast de error.
- **`showContableFields` en MaterialForm**: Confirmar valor por defecto del prop y que otros usos de `MaterialForm` no perdieron campos contables silenciosamente.
- **`costo` y `material_id` en tipo `Material`**: Confirmar que los endpoints del catálogo devuelven estos campos; de lo contrario la columna Costo mostrará NaN o vacío.
- **Wallet historial por miembro — filtros params**: Confirmar que el backend acepta tipo, fechas y búsqueda en el endpoint de historial por miembro.
- **Excel Fichas de Costo sin cota de registros**: La exportación ignora la paginación y exporta todos los filtrados; con catálogos grandes puede saturar memoria del navegador.
- **CI `87120119233` hardcodeado para control de permisos**: El CI de un trabajador específico está hardcodeado como excepción de acceso en la lógica de negocio. Si esa persona cambia, requiere un nuevo deploy. Debería moverse a un campo de permiso en BD.
- **Campos `cambio_real_*` requieren backend actualizado**: `cambio_real_monto`, `cambio_real_moneda` y `cambio_real_tasa` son nuevos en el payload de `PagoVenta`. Si el backend no los acepta, los POSTs con cambio real fallarán con 422 o perderán datos silenciosamente.
- **Endpoint lazy load `GET /obras-terminadas/oferta/{id}/facturas-cliente`**: Si no existe, al hacer clic en la pestaña el usuario verá error de carga.
- **PDF unificado con `limit=total` sin cota máxima**: La llamada extra para el PDF unificado puede generar timeout o saturar memoria del navegador si hay miles de registros filtrados.
- **Badge de estado calculado en frontend con flotantes**: `precio_final − total_pagado` puede dar `0.0000001` por redondeo, mostrando "pendiente" en una factura realmente pagada. El backend debería devolver un campo de estado ya calculado.
- **Módulo Vales/Facturas Instaladora comentado sin aviso explícito**: Verificar que el cambio fue coordinado con los usuarios que dependían de ese flujo.
- **Sistema de notificaciones — endpoints bulk por tipo**: Confirmar que marcar/eliminar todas acepta filtro por tipo de notificación en el backend.
- **`GET /inventario/stock-historico`**: Confirmar que existe y acepta params de almacén, material y fecha.
- **AdminPass 123456 hardcodeado**: Al crear cualquier trabajador se asigna automáticamente `123456` como contraseña. Sin mecanismo de forzar cambio en el primer login — brecha de seguridad operativa.
- **Auto-sync catálogo → BD al abrir /permisos**: Si el catálogo tiene un módulo mal definido, se crearán registros incorrectos en BD sin rollback automático.
- **Logs de debug en producción**: Los logs de `fetchTrabajosDeAveria` pueden seguir activos, exponiendo datos de clientes en la consola del navegador.
- **Eliminación lógica `cantidad = 0` en asignaciones**: Todo el código que lista asignaciones debe filtrar `cantidad > 0`, o los registros eliminados aparecerán como activos.
- **Creación inline sin persistencia inmediata**: Categorías/unidades creadas desde "Crear material rápido" se pierden si el usuario cierra el diálogo antes de guardar.
- **Subida de archivos sin rollback**: Si la subida de foto/ficha técnica tiene éxito pero la creación del material falla, el archivo queda huérfano en storage.
- **Backend debe aceptar nuevos campos**: `motivo` y `nota` en asignaciones; `foto` y `ficha_tecnica_url` en materiales; `oferta_venta_id`, `descuento_free`, `motivo_descuento_free`, `precio` en solicitudes desde oferta.
- **`childKeys` en catálogo de módulos**: Si se agrega un módulo hijo sin declarar `childKeys`, el card padre quedará invisible aunque el usuario tenga el permiso.
- **`useEffect` con dependencias `[open, initialData?.id]`**: Si `initialData` cambia el contenido pero mantiene el mismo `id`, el formulario no se reinicializa.
- **Agregados solicitudes-ventas**: Confirmar que los endpoints devuelven campos de agregados globales y por ítem (`total_sin_descuento`, `total_con_aumento`, `aumento_monto`).
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
- **Campos de dimensionamiento en calculadora sin persistencia confirmada**: Los campos `horas_uso` y `tipo_carga` en modo avanzado deben persistirse; si solo existen en estado React local, se perderán al recargar.
- **Badges de disponibilidad por pool — snapshot estático**: En alta concurrencia, los badges pueden mostrar stock disponible que ya fue reservado por otros usuarios.
- **Endpoint cumpleaños de la semana**: Confirmar que el backend tiene el endpoint y devuelve nombre, CI y fecha en el formato esperado.
- **Endpoint contador de instalaciones solares**: Confirmar que existe y devuelve el dato en el formato esperado.
- **Widget de paneles — estado único vs respuesta del backend**: Si el endpoint devuelve estructura de períodos, el parsing puede fallar o mostrar `undefined`.
- **`window.history.pushState` + Next.js App Router desync**: Puede desincronizarse en full page reloads o con `next/link`.
- **Export Excel merge vertical — heterogeneidad de materiales**: Con número heterogéneo de materiales por registro, la alineación de celdas fusionadas puede desincronizarse.
- **Rebrand paleta — componentes con clases hardcoded**: Componentes con clases `orange-*` directas pueden mostrar colores incorrectos. El tema Ventas puede no aplicarse a modals/popovers fuera del nodo `data-area`.
- **`POST /solicitudes-transferencia/{id}/resolver` — endpoint pendiente de confirmación**: Confirmar que existe en el backend y solo acepta solicitudes en estado `procesando`.
- **`precio → costo` rename en Asignacion — fallback solo en service**: Confirmar que ningún componente accede a `asignacion.precio` directamente; si lo hace, recibirá `undefined` silenciosamente.
- **Endpoints de ajuste de costo y transferencia de asignaciones**: Confirmar que el backend implementa endpoints específicos para `AjustarCosto` y `TransferirAsignacion` con los payloads esperados.
- **`PlanDepreciacionView` — campos calculados en endpoint**: Confirmar que el backend devuelve `valor_depreciado` y `valor_residual` en el endpoint de plan de depreciación.
- **Variables de entorno cron en producción — `CRON_CI` y `CRON_ADMIN_PASS`**: Confirmar que están configuradas en Railway/Vercel; si no, el cron automático falla silenciosamente.
- **Sub-permiso `fichas-costo/solo-precios` — sync a BD**: Confirmar que el sub-permiso se sincroniza correctamente a la BD desde el catálogo del frontend.
- **Tipo `reserva_pendiente` en notificaciones**: Confirmar que el backend genera notificaciones con ese tipo exacto; si no, la pestaña "Reservas" siempre aparecerá vacía.
- **`ConsignacionService.crear` sin pago inicial — saldo de consignación (nuevo)**: Confirmar que el backend calcula `saldo_total` directamente desde `solicitud_venta_id` sin requerir `pago_inicial_id`.
- **Auto-vinculación de pagos a consignaciones (nuevo)**: Confirmar que el backend asocia automáticamente los `PagoVenta` posteriores al saldo de la consignación cuando la solicitud está en estado consignación.
- **`origen=consignacion` + `consignacion_id` en `SolicitudEntradaAlmacen` (nuevo)**: Confirmar que el backend acepta y procesa `consignacion_id` en el payload y vincula la devolución al saldo de la consignación.
- **Renombrado "Recursos Humanos" → "Empleados" — permisos en BD (nuevo)**: Si hay registros de permisos con el nombre anterior, los usuarios perderán acceso inmediatamente. Confirmar migración de BD o que el catálogo usa ID estable.
- **Subpágina `/recursos-humanos/[ci]` sin RouteGuard confirmado (nuevo)**: Confirmar que la ruta dinámica hereda la protección del módulo padre.

---

## 📅 9 de Junio, 2026

### Resumen de cambios (últimas 24h)

**~20 commits** de Fabian1820 y yany1509 — día de alta actividad: sistema completo de asignaciones con depreciación, ajuste de costo y transferencia; sub-permiso en Fichas de Costo; nueva pestaña de Reservas en notificaciones; cron de actualización de precios (con revert y re-implementación); y múltiples fixes en el módulo de ofertas y exports.

---

### Área 1: Asignaciones — depreciación, costo, ajuste, transferencia y plan (2 commits — Fabian1820)

- **`feat(asignaciones): mostrar depreciación, costo, fecha y descripción`** (15:52) — `precio` renombrado a `costo` en tipos `Asignacion` / `AsignacionInstalacion`; agrega `descripcion`, `fecha_asignacion` y campos derivados (`depreciacion_mensual`, `valor_depreciado`, `valor_residual`). Service normaliza con fallback `costo ?? precio` para registros legacy. `AsignacionRecursosDialog`: input "Descripción (opcional)". `TrabajadorDetalleModal` e `InstalacionAsignacionesTab`: fecha, costo unit/total, depreciación y residual por línea + resumen contable por bloque. Elimina `asignacion-dialog.tsx` obsoleto.

- **`feat(asignaciones): ajuste de costo, transferencia, historial y plan de depreciación`** (23:07) — Nuevos tipos: `AjustarCostoData`, `TransferirData`, `TipoEntidad`, `PlanDepreciacionFila/Totales/Filtros`. Historial extendido con `costo_anterior/nuevo`, contraparte y nombres. `AjustarCostoDialog`: ajusta costo unitario sin tocar el catálogo, motivo obligatorio, queda en historial. `TransferirAsignacionDialog`: selector tipo + búsqueda de entidad destino, preserva el reloj de depreciación. Botones nuevos en modals (💲 ajustar costo, ⇄ transferir), historial expandible con timeline. `PlanDepreciacionView`: nueva pestaña con 5 KPIs ejecutivos, filtros (entidad/item/fechas/estados), búsqueda local, tabla con totales al pie y export a Excel.

---

### Área 2: Fichas de Costo — márgenes y sub-permiso (2 commits — Fabian1820)

- **`Fichas de Costo: margen s/ venta en tabla, dos márgenes en detalle, pools`** (16:13) — Margen calculado sobre precio de venta en tabla/export. Dos márgenes en detalle (s/ venta y s/ instaladora). Dialog de stock: almacenes clicables con `PoolsDistributionDialog` + traspaso entre pools (`POST /inventario/movimientos tipo=traspaso_sector`).
- **`Fichas de Costo: sub-permiso "solo ver precios"`** (19:11) — Agrega `fichas-costo/solo-precios` al catálogo de módulos. Si el usuario tiene ÚNICAMENTE ese sub-permiso (sin el padre `fichas-costo` ni superAdmin), la tabla se reduce a 6 columnas (oculta costo, margen, acciones y filtros sensibles).

---

### Área 3: Notificaciones — nueva pestaña Reservas (1 commit — yany1509, 17:31)

- **`feat(notificaciones): nueva pestaña Reservas + mejor jerarquía visual`** — 4ta pestaña "Reservas" para tipo `reserva_pendiente`. Rediseño del ítem: icono circular por tipo, nombre del cliente como elemento principal, badge de días escalado (ámbar/naranja/rojo). Panel ampliado a `w-96`.

---

### Área 4: Cron de precios — iteración rápida (varios commits — yany1509)

Primer intento (15:53) con botón + ruta API. Cron automático lun-sáb 8am vía `instrumentation.ts` con `CRON_BACKEND_TOKEN` (16:04). Fix de auth: reemplaza token estático por login dinámico con `CRON_CI + CRON_ADMIN_PASS` (16:14). Revert del primer intento (16:20). Re-implementación limpia del botón manual (16:28). Fix de mensajes y validación estricta de `total_evaluadas` (16:58).

---

### Área 5: Ofertas — precio instaladora y stock real (3 commits — yany1509)

- Eliminados descuentos automáticos del 15%/20% en inversores/baterías/ampliación.
- Usa `precio_instaladora` si existe y > 0, sino `precio`.
- `stock_disponible` en tarjetas descuenta `cantidad_reservada`.
- Endpoint completo `lite:false` para incluir `precio_instaladora` en todos los campos del material.

---

### Área 6: Export Excel — precios por material (1 commit — Fabian1820, 14:58)

- Stock de almacén y vales de salida: agrega columnas precio de venta, precio instaladora y costo (datos actuales del catálogo por código de material).

---

### Puede dar bateo

1. **`precio → costo` rename — fallback solo en el service**: El service usa `costo ?? precio`, pero si algún componente accede a `asignacion.precio` directamente, recibirá `undefined` silenciosamente. Con ~20 commits en el día, es probable que algún componente no se actualizó.

2. **`AjustarCostoDialog` — endpoint sin contrato confirmado**: Confirmar que el backend tiene un endpoint específico para ajuste de costo de asignación (distinto del PUT general) y que `motivo` es obligatorio en el backend.

3. **`TransferirAsignacionDialog` — "preserva el reloj de depreciación"**: Confirmar que el backend, al procesar la transferencia, no resetea `fecha_asignacion` y que acepta `tipo_entidad_destino` + `entidad_destino_id` como campos.

4. **`PlanDepreciacionView` — campos calculados sin contrato de API**: Los KPIs dependen de `valor_depreciado` y `valor_residual`. Confirmar que el backend devuelve estos campos en el endpoint de plan de depreciación; si no, los KPIs mostrarán 0 o `NaN`.

5. **Cron con múltiples iteraciones en el mismo día — código residual**: Confirmar que `instrumentation.ts` no tiene código del cron antiguo (con `CRON_BACKEND_TOKEN`) conviviendo con el nuevo (con `CRON_CI + CRON_ADMIN_PASS`).

6. **Variables de entorno del cron en producción**: La implementación final requiere `CRON_CI` y `CRON_ADMIN_PASS`. Si no están en Railway/Vercel, el cron fallará silenciosamente sin error en UI.

7. **Sub-permiso `fichas-costo/solo-precios` — sincronización a BD**: Si el sync automático al abrir `/permisos` no está activo, el sub-permiso no existirá en BD y la vista restringida nunca se activará.

8. **Pestaña "Reservas" — tipo `reserva_pendiente` sin confirmar**: Si el backend no genera notificaciones con ese tipo exacto, la pestaña siempre aparecerá vacía sin indicar el motivo.

9. **`stock_disponible = stock - reservas` calculado client-side**: Si el backend no devuelve `cantidad_reservada` en el endpoint completo (`lite:false`), el cálculo dará `NaN` o mostrará stock incorrecto.

---

#### Seguimientos vigentes

- **`apiRequest success:false` — monitorear regresiones post-deploy**: El fix global puede descubrir errores que estaban silenciados. Cualquier operación que antes mostraba éxito sin verificar puede ahora romper con toast de error.
- **`showContableFields` en MaterialForm**: Confirmar valor por defecto del prop y que otros usos de `MaterialForm` no perdieron campos contables silenciosamente.
- **`costo` y `material_id` en tipo `Material`**: Confirmar que los endpoints del catálogo devuelven estos campos; de lo contrario la columna Costo mostrará NaN o vacío.
- **Wallet historial por miembro — filtros params**: Confirmar que el backend acepta tipo, fechas y búsqueda en el endpoint de historial por miembro.
- **Excel Fichas de Costo sin cota de registros**: La exportación ignora la paginación y exporta todos los filtrados; con catálogos grandes puede saturar memoria del navegador.
- **CI `87120119233` hardcodeado para control de permisos**: El CI de un trabajador específico está hardcodeado como excepción de acceso en la lógica de negocio. Si esa persona cambia, requiere un nuevo deploy. Debería moverse a un campo de permiso en BD.
- **Campos `cambio_real_*` requieren backend actualizado**: `cambio_real_monto`, `cambio_real_moneda` y `cambio_real_tasa` son nuevos en el payload de `PagoVenta`. Si el backend no los acepta, los POSTs con cambio real fallarán con 422 o perderán datos silenciosamente.
- **Endpoint lazy load `GET /obras-terminadas/oferta/{id}/facturas-cliente`**: Si no existe, al hacer clic en la pestaña el usuario verá error de carga.
- **PDF unificado con `limit=total` sin cota máxima**: La llamada extra para el PDF unificado puede generar timeout o saturar memoria del navegador si hay miles de registros filtrados.
- **Badge de estado calculado en frontend con flotantes**: `precio_final − total_pagado` puede dar `0.0000001` por redondeo, mostrando "pendiente" en una factura realmente pagada. El backend debería devolver un campo de estado ya calculado.
- **Módulo Vales/Facturas Instaladora comentado sin aviso explícito**: Verificar que el cambio fue coordinado con los usuarios que dependían de ese flujo.
- **Sistema de notificaciones — endpoints bulk por tipo**: Confirmar que marcar/eliminar todas acepta filtro por tipo de notificación en el backend.
- **`GET /inventario/stock-historico`**: Confirmar que existe y acepta params de almacén, material y fecha.
- **AdminPass 123456 hardcodeado**: Al crear cualquier trabajador se asigna automáticamente `123456` como contraseña. Sin mecanismo de forzar cambio en el primer login — brecha de seguridad operativa.
- **Auto-sync catálogo → BD al abrir /permisos**: Si el catálogo tiene un módulo mal definido, se crearán registros incorrectos en BD sin rollback automático.
- **Logs de debug en producción**: Los logs de `fetchTrabajosDeAveria` pueden seguir activos, exponiendo datos de clientes en la consola del navegador.
- **Eliminación lógica `cantidad = 0` en asignaciones**: Todo el código que lista asignaciones debe filtrar `cantidad > 0`, o los registros eliminados aparecerán como activos.
- **Creación inline sin persistencia inmediata**: Categorías/unidades creadas desde "Crear material rápido" se pierden si el usuario cierra el diálogo antes de guardar.
- **Subida de archivos sin rollback**: Si la subida de foto/ficha técnica tiene éxito pero la creación del material falla, el archivo queda huérfano en storage.
- **Backend debe aceptar nuevos campos**: `motivo` y `nota` en asignaciones; `foto` y `ficha_tecnica_url` en materiales; `oferta_venta_id`, `descuento_free`, `motivo_descuento_free`, `precio` en solicitudes desde oferta.
- **`childKeys` en catálogo de módulos**: Si se agrega un módulo hijo sin declarar `childKeys`, el card padre quedará invisible aunque el usuario tenga el permiso.
- **`useEffect` con dependencias `[open, initialData?.id]`**: Si `initialData` cambia el contenido pero mantiene el mismo `id`, el formulario no se reinicializa.
- **Agregados solicitudes-ventas**: Confirmar que los endpoints devuelven campos de agregados globales y por ítem (`total_sin_descuento`, `total_con_aumento`, `aumento_monto`).
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
- **Campos de dimensionamiento en calculadora sin persistencia confirmada**: Los campos `horas_uso` y `tipo_carga` en modo avanzado deben persistirse; si solo existen en estado React local, se perderán al recargar.
- **Badges de disponibilidad por pool — snapshot estático**: En alta concurrencia, los badges pueden mostrar stock disponible que ya fue reservado por otros usuarios.
- **Endpoint cumpleaños de la semana**: Confirmar que el backend tiene el endpoint y devuelve nombre, CI y fecha en el formato esperado.
- **Endpoint contador de instalaciones solares**: Confirmar que existe y devuelve el dato en el formato esperado.
- **Widget de paneles — estado único vs respuesta del backend**: Si el endpoint devuelve estructura de períodos, el parsing puede fallar o mostrar `undefined`.
- **`window.history.pushState` + Next.js App Router desync**: Puede desincronizarse en full page reloads o con `next/link`.
- **Export Excel merge vertical — heterogeneidad de materiales**: Con número heterogéneo de materiales por registro, la alineación de celdas fusionadas puede desincronizarse.
- **Rebrand paleta — componentes con clases hardcoded**: Componentes con clases `orange-*` directas pueden mostrar colores incorrectos. El tema Ventas puede no aplicarse a modals/popovers fuera del nodo `data-area`.
- **`POST /solicitudes-transferencia/{id}/resolver` — endpoint pendiente de confirmación**: Confirmar que existe en el backend y solo acepta solicitudes en estado `procesando`.
- **`precio → costo` rename en Asignacion — fallback solo en service (nuevo)**: Confirmar que ningún componente accede a `asignacion.precio` directamente.
- **Endpoints de ajuste de costo y transferencia de asignaciones (nuevo)**: Confirmar que el backend implementa endpoints específicos para `AjustarCosto` y `TransferirAsignacion`.
- **`PlanDepreciacionView` — campos calculados en endpoint (nuevo)**: Confirmar que el backend devuelve `valor_depreciado` y `valor_residual` en el endpoint de plan de depreciación.
- **Variables de entorno cron en producción — `CRON_CI` y `CRON_ADMIN_PASS` (nuevo)**: Confirmar que están configuradas en Railway/Vercel; si no, el cron automático falla silenciosamente.
- **Sub-permiso `fichas-costo/solo-precios` — sync a BD (nuevo)**: Confirmar que el sub-permiso se sincroniza correctamente a la BD desde el catálogo del frontend.
- **Tipo `reserva_pendiente` en notificaciones (nuevo)**: Confirmar que el backend genera notificaciones con ese tipo exacto; si no, la pestaña "Reservas" siempre aparecerá vacía.

---

## 📅 7 de Junio, 2026

### Resumen de cambios (últimas 24h)

Sin commits de desarrollo nuevos desde el análisis del 6/06.

---

### Consideraciones del día

- Sin actividad de desarrollo nueva hoy. Los seguimientos del 6/06 siguen vigentes sin cambios.

---

#### Seguimientos vigentes

- **`apiRequest success:false` — monitorear regresiones post-deploy**: El fix global puede descubrir errores que estaban silenciados. Cualquier operación que antes mostraba éxito sin verificar puede ahora romper con toast de error.
- **`showContableFields` en MaterialForm**: Confirmar valor por defecto del prop y que otros usos de `MaterialForm` no perdieron campos contables silenciosamente.
- **`costo` y `material_id` en tipo `Material`**: Confirmar que los endpoints del catálogo devuelven estos campos; de lo contrario la columna Costo mostrará NaN o vacío.
- **Wallet historial por miembro — filtros params**: Confirmar que el backend acepta tipo, fechas y búsqueda en el endpoint de historial por miembro.
- **Excel Fichas de Costo sin cota de registros**: La exportación ignora la paginación y exporta todos los filtrados; con catálogos grandes puede saturar memoria del navegador.
- **CI `87120119233` hardcodeado para control de permisos**: El CI de un trabajador específico está hardcodeado como excepción de acceso en la lógica de negocio. Si esa persona cambia, requiere un nuevo deploy. Debería moverse a un campo de permiso en BD.
- **Campos `cambio_real_*` requieren backend actualizado**: `cambio_real_monto`, `cambio_real_moneda` y `cambio_real_tasa` son nuevos en el payload de `PagoVenta`. Si el backend no los acepta, los POSTs con cambio real fallarán con 422 o perderán datos silenciosamente.
- **Endpoint lazy load `GET /obras-terminadas/oferta/{id}/facturas-cliente`**: Si no existe, al hacer clic en la pestaña el usuario verá error de carga.
- **PDF unificado con `limit=total` sin cota máxima**: La llamada extra para el PDF unificado puede generar timeout o saturar memoria del navegador si hay miles de registros filtrados.
- **Badge de estado calculado en frontend con flotantes**: `precio_final − total_pagado` puede dar `0.0000001` por redondeo, mostrando "pendiente" en una factura realmente pagada. El backend debería devolver un campo de estado ya calculado.
- **Módulo Vales/Facturas Instaladora comentado sin aviso explícito**: Verificar que el cambio fue coordinado con los usuarios que dependían de ese flujo.
- **Sistema de notificaciones — endpoints bulk por tipo**: Confirmar que marcar/eliminar todas acepta filtro por tipo de notificación en el backend.
- **`GET /inventario/stock-historico`**: Confirmar que existe y acepta params de almacén, material y fecha.
- **AdminPass 123456 hardcodeado**: Al crear cualquier trabajador se asigna automáticamente `123456` como contraseña. Sin mecanismo de forzar cambio en el primer login — brecha de seguridad operativa.
- **Auto-sync catálogo → BD al abrir /permisos**: Si el catálogo tiene un módulo mal definido, se crearán registros incorrectos en BD sin rollback automático.
- **Logs de debug en producción**: Los logs de `fetchTrabajosDeAveria` pueden seguir activos, exponiendo datos de clientes en la consola del navegador.
- **Eliminación lógica `cantidad = 0` en asignaciones**: Todo el código que lista asignaciones debe filtrar `cantidad > 0`, o los registros eliminados aparecerán como activos.
- **Creación inline sin persistencia inmediata**: Categorías/unidades creadas desde "Crear material rápido" se pierden si el usuario cierra el diálogo antes de guardar.
- **Subida de archivos sin rollback**: Si la subida de foto/ficha técnica tiene éxito pero la creación del material falla, el archivo queda huérfano en storage.
- **Backend debe aceptar nuevos campos**: `motivo` y `nota` en asignaciones; `foto` y `ficha_tecnica_url` en materiales; `oferta_venta_id`, `descuento_free`, `motivo_descuento_free`, `precio` en solicitudes desde oferta.
- **`childKeys` en catálogo de módulos**: Si se agrega un módulo hijo sin declarar `childKeys`, el card padre quedará invisible aunque el usuario tenga el permiso.
- **`useEffect` con dependencias `[open, initialData?.id]`**: Si `initialData` cambia el contenido pero mantiene el mismo `id`, el formulario no se reinicializa.
- **Agregados solicitudes-ventas**: Confirmar que los endpoints devuelven campos de agregados globales y por ítem (`total_sin_descuento`, `total_con_aumento`, `aumento_monto`).
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
- **Campos de dimensionamiento en calculadora sin persistencia confirmada**: Los campos `horas_uso` y `tipo_carga` en modo avanzado deben persistirse; si solo existen en estado React local, se perderán al recargar.
- **Badges de disponibilidad por pool — snapshot estático**: En alta concurrencia, los badges pueden mostrar stock disponible que ya fue reservado por otros usuarios.
- **Endpoint cumpleaños de la semana**: Confirmar que el backend tiene el endpoint y devuelve nombre, CI y fecha en el formato esperado.
- **Endpoint contador de instalaciones solares**: Confirmar que existe y devuelve el dato en el formato esperado.
- **Widget de paneles — estado único vs respuesta del backend**: Si el endpoint devuelve estructura de períodos, el parsing puede fallar o mostrar `undefined`.
- **`window.history.pushState` + Next.js App Router desync**: Puede desincronizarse en full page reloads o con `next/link`.
- **Export Excel merge vertical — heterogeneidad de materiales**: Con número heterogéneo de materiales por registro, la alineación de celdas fusionadas puede desincronizarse.
- **Rebrand paleta — componentes con clases hardcoded**: Componentes con clases `orange-*` directas pueden mostrar colores incorrectos. El tema Ventas puede no aplicarse a modals/popovers fuera del nodo `data-area`.
- **`POST /solicitudes-transferencia/{id}/resolver` — endpoint pendiente de confirmación**: Confirmar que existe en el backend y solo acepta solicitudes en estado `procesando`.

---

## 📅 6 de Junio, 2026

### Resumen de cambios (últimas 24h)

Sin commits de desarrollo nuevos desde el análisis de las 23:29 del 5/06.

---

### Consideraciones del día

- Sin actividad de desarrollo nueva hoy. Los seguimientos del 5/06 siguen vigentes sin cambios.

---

#### Seguimientos vigentes

- **`apiRequest success:false` — monitorear regresiones post-deploy**: El fix global puede descubrir errores que estaban silenciados. Cualquier operación que antes mostraba éxito sin verificar puede ahora romper con toast de error.
- **`showContableFields` en MaterialForm**: Confirmar valor por defecto del prop y que otros usos de `MaterialForm` no perdieron campos contables silenciosamente.
- **`costo` y `material_id` en tipo `Material`**: Confirmar que los endpoints del catálogo devuelven estos campos; de lo contrario la columna Costo mostrará NaN o vacío.
- **Wallet historial por miembro — filtros params**: Confirmar que el backend acepta tipo, fechas y búsqueda en el endpoint de historial por miembro.
- **Excel Fichas de Costo sin cota de registros**: La exportación ignora la paginación y exporta todos los filtrados; con catálogos grandes puede saturar memoria del navegador.
- **CI `87120119233` hardcodeado para control de permisos**: El CI de un trabajador específico está hardcodeado como excepción de acceso en la lógica de negocio. Si esa persona cambia, requiere un nuevo deploy. Debería moverse a un campo de permiso en BD.
- **Campos `cambio_real_*` requieren backend actualizado**: `cambio_real_monto`, `cambio_real_moneda` y `cambio_real_tasa` son nuevos en el payload de `PagoVenta`. Si el backend no los acepta, los POSTs con cambio real fallarán con 422 o perderán datos silenciosamente.
- **Endpoint lazy load `GET /obras-terminadas/oferta/{id}/facturas-cliente`**: Si no existe, al hacer clic en la pestaña el usuario verá error de carga.
- **PDF unificado con `limit=total` sin cota máxima**: La llamada extra para el PDF unificado puede generar timeout o saturar memoria del navegador si hay miles de registros filtrados.
- **Badge de estado calculado en frontend con flotantes**: `precio_final − total_pagado` puede dar `0.0000001` por redondeo, mostrando "pendiente" en una factura realmente pagada. El backend debería devolver un campo de estado ya calculado.
- **Módulo Vales/Facturas Instaladora comentado sin aviso explícito**: Verificar que el cambio fue coordinado con los usuarios que dependían de ese flujo.
- **Sistema de notificaciones — endpoints bulk por tipo**: Confirmar que marcar/eliminar todas acepta filtro por tipo de notificación en el backend.
- **`GET /inventario/stock-historico`**: Confirmar que existe y acepta params de almacén, material y fecha.
- **AdminPass 123456 hardcodeado**: Al crear cualquier trabajador se asigna automáticamente `123456` como contraseña. Sin mecanismo de forzar cambio en el primer login — brecha de seguridad operativa.
- **Auto-sync catálogo → BD al abrir /permisos**: Si el catálogo tiene un módulo mal definido, se crearán registros incorrectos en BD sin rollback automático.
- **Logs de debug en producción**: Los logs de `fetchTrabajosDeAveria` pueden seguir activos, exponiendo datos de clientes en la consola del navegador.
- **Eliminación lógica `cantidad = 0` en asignaciones**: Todo el código que lista asignaciones debe filtrar `cantidad > 0`, o los registros eliminados aparecerán como activos.
- **Creación inline sin persistencia inmediata**: Categorías/unidades creadas desde "Crear material rápido" se pierden si el usuario cierra el diálogo antes de guardar.
- **Subida de archivos sin rollback**: Si la subida de foto/ficha técnica tiene éxito pero la creación del material falla, el archivo queda huérfano en storage.
- **Backend debe aceptar nuevos campos**: `motivo` y `nota` en asignaciones; `foto` y `ficha_tecnica_url` en materiales; `oferta_venta_id`, `descuento_free`, `motivo_descuento_free`, `precio` en solicitudes desde oferta.
- **`childKeys` en catálogo de módulos**: Si se agrega un módulo hijo sin declarar `childKeys`, el card padre quedará invisible aunque el usuario tenga el permiso.
- **`useEffect` con dependencias `[open, initialData?.id]`**: Si `initialData` cambia el contenido pero mantiene el mismo `id`, el formulario no se reinicializa.
- **Agregados solicitudes-ventas**: Confirmar que los endpoints devuelven campos de agregados globales y por ítem (`total_sin_descuento`, `total_con_aumento`, `aumento_monto`).
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
- **Campos de dimensionamiento en calculadora sin persistencia confirmada**: Los campos `horas_uso` y `tipo_carga` en modo avanzado deben persistirse; si solo existen en estado React local, se perderán al recargar.
- **Badges de disponibilidad por pool — snapshot estático**: En alta concurrencia, los badges pueden mostrar stock disponible que ya fue reservado por otros usuarios.
- **Endpoint cumpleaños de la semana**: Confirmar que el backend tiene el endpoint y devuelve nombre, CI y fecha en el formato esperado.
- **Endpoint contador de instalaciones solares**: Confirmar que existe y devuelve el dato en el formato esperado.
- **Widget de paneles — estado único vs respuesta del backend**: Si el endpoint devuelve estructura de períodos, el parsing puede fallar o mostrar `undefined`.
- **`window.history.pushState` + Next.js App Router desync**: Puede desincronizarse en full page reloads o con `next/link`.
- **Export Excel merge vertical — heterogeneidad de materiales**: Con número heterogéneo de materiales por registro, la alineación de celdas fusionadas puede desincronizarse.
- **Rebrand paleta — componentes con clases hardcoded**: Componentes con clases `orange-*` directas pueden mostrar colores incorrectos. El tema Ventas puede no aplicarse a modals/popovers fuera del nodo `data-area`.
- **`POST /solicitudes-transferencia/{id}/resolver` — endpoint pendiente de confirmación**: Confirmar que existe en el backend y solo acepta solicitudes en estado `procesando`.

---

## 📅 5 de Junio, 2026

### Resumen de cambios (últimas 24h)

**8 commits** de Fabian1820, Ruben0304 y yany1509 — corrección crítica del manejo global de errores HTTP, Fichas de Costo reconstruidas dos veces en la misma tarde, nueva vista de billetera por miembro con exportación, y fixes de logos, vales de salida y límites de PDF.

---

### Área 1: Fix crítico de `apiRequest` — errores HTTP silenciados (1 commit — yany1509, 13:39)

- **`fix(api): normalizar success:false en errores HTTP para detectar 400 en extractApiError`** — Cuando el backend devolvía 400 con `{detail:"..."}` (FastAPI), `apiRequest` retornaba el objeto sin `success:false`. `extractApiError` no lo detectaba como error y `mapSolicitud` procesaba datos corruptos. Resultado: aprobar una solicitud de entrada mostraba toast de éxito aunque el backend rechazara la operación, y al recargar volvía a aparecer como pendiente.

---

### Área 2: Vales de Salida — toast para materiales inválidos (1 commit — yany1509, 13:46)

- **`fix(vales-salida): mostrar toast cuando no hay materiales válidos al crear vale`** — Cuando todos los materiales tienen cantidad 0 o `material_id` vacío, la función retornaba silenciosamente. Ahora muestra un toast de error descriptivo. También avisa si solo algunos materiales son omitidos por datos inválidos.

---

### Área 3: Wallet — vista por miembro y exportación paginada (2 commits — Ruben0304, 15:41→15:46)

- Al seleccionar una billetera del equipo, el historial se convierte en la vista de ese integrante con filtros independientes (tipo, fechas, búsqueda), paginación completa y botones para exportar a Excel filtrado o completo. Implementa loop de paginación en la exportación Excel del historial del miembro para respetar el límite de 500 registros por petición.

---

### Área 4: Logos y corrección de límite PDF (1 commit — yany1509, 16:47)

- Reemplaza `/logo.png` por `/brand/suncar-v1-iso.png` en múltiples vistas. Corrige error "Limit should be <= 500" en PDF unificado de obras-terminadas paginando en lotes de 500.

---

### Área 5: Fichas de Costo — rehabilitación y refinamiento (3 commits — Fabian1820, 18:31→20:46)

- Rehabilita módulo Fichas de Costo como vista contable del material. Reconstruye sobre `useMaterials`: filtros completos, paginación client-side (20/pág), exportación Excel. Agrega CRUD con `MaterialForm` + sección contable gateada (`showContableFields`). Agrega `costo` y `material_id` a `Material`. Elimina `use-fichas-costo` y `editar-precios-dialog`.

---

### Puede dar bateo

1. **`editar-precios-dialog` eliminado — imports residuales**: Si algún componente fuera de Fichas de Costo importa el componente eliminado, compilará con error de módulo no encontrado.

2. **`showContableFields` en MaterialForm — valor por defecto desconocido**: Si el prop tiene default `false`, cualquier uso de `MaterialForm` en otros módulos habrá perdido la sección contable silenciosamente.

3. **`success:false` global en `apiRequest` — posibles regresiones**: Flujos que antes "funcionaban" a pesar de 400s del backend pueden empezar a mostrar toasts de error inesperados. Monitorear tras deploy.

4. **Wallet — filtros por miembro sin contrato de API confirmado**: Confirmar que el backend acepta parámetros de tipo, fechas y búsqueda en el endpoint de historial del miembro.

5. **Excel en lotes de 500 — ¿loop completo o solo primer lote?**: Confirmar que la paginación itera por todos los lotes. Con >500 registros, el Excel puede estar truncado.

6. **PDF unificado paginado en 500 — múltiples peticiones HTTP**: Con miles de registros, el nuevo loop generará muchas peticiones sucesivas. Sin cota máxima, puede bloquear la UI por tiempo indefinido.

7. **2 refactors de Fichas de Costo en <3h — estado intermedio en Git**: Confirmar que el deploy en producción usa el estado del último commit (20:46) y no el estado intermedio (18:31).

---

#### Seguimientos vigentes

- **`apiRequest success:false` — monitorear regresiones post-deploy (nuevo)**: El fix global puede descubrir errores que estaban silenciados. Cualquier operación que antes mostraba éxito sin verificar puede ahora romper con toast de error.
- **`showContableFields` en MaterialForm (nuevo)**: Confirmar valor por defecto del prop y que otros usos de `MaterialForm` no perdieron campos contables silenciosamente.
- **`costo` y `material_id` en tipo `Material` (nuevo)**: Confirmar que los endpoints del catálogo devuelven estos campos; de lo contrario la columna Costo mostrará NaN o vacío.
- **Wallet historial por miembro — filtros params (nuevo)**: Confirmar que el backend acepta tipo, fechas y búsqueda en el endpoint de historial por miembro.
- **Excel Fichas de Costo sin cota de registros (nuevo)**: La exportación ignora la paginación y exporta todos los filtrados; con catálogos grandes puede saturar memoria del navegador.
- **CI `87120119233` hardcodeado para control de permisos**: El CI de un trabajador específico está hardcodeado como excepción de acceso en la lógica de negocio. Si esa persona cambia, requiere un nuevo deploy. Debería moverse a un campo de permiso en BD.
- **Campos `cambio_real_*` requieren backend actualizado**: `cambio_real_monto`, `cambio_real_moneda` y `cambio_real_tasa` son nuevos en el payload de `PagoVenta`. Si el backend no los acepta, los POSTs con cambio real fallarán con 422 o perderán datos silenciosamente.
- **Endpoint lazy load `GET /obras-terminadas/oferta/{id}/facturas-cliente`**: Si no existe, al hacer clic en la pestaña el usuario verá error de carga.
- **PDF unificado con `limit=total` sin cota máxima**: La llamada extra para el PDF unificado puede generar timeout o saturar memoria del navegador si hay miles de registros filtrados.
- **Badge de estado calculado en frontend con flotantes**: `precio_final − total_pagado` puede dar `0.0000001` por redondeo, mostrando "pendiente" en una factura realmente pagada. El backend debería devolver un campo de estado ya calculado.
- **Módulo Vales/Facturas Instaladora comentado sin aviso explícito**: Verificar que el cambio fue coordinado con los usuarios que dependían de ese flujo.
- **Sistema de notificaciones — endpoints bulk por tipo**: Confirmar que marcar/eliminar todas acepta filtro por tipo de notificación en el backend.
- **`GET /inventario/stock-historico`**: Confirmar que existe y acepta params de almacén, material y fecha.
- **AdminPass 123456 hardcodeado**: Al crear cualquier trabajador se asigna automáticamente `123456` como contraseña. Sin mecanismo de forzar cambio en el primer login — brecha de seguridad operativa.
- **Auto-sync catálogo → BD al abrir /permisos**: Si el catálogo tiene un módulo mal definido, se crearán registros incorrectos en BD sin rollback automático.
- **Logs de debug en producción**: Los logs de `fetchTrabajosDeAveria` pueden seguir activos, exponiendo datos de clientes en la consola del navegador.
- **Eliminación lógica `cantidad = 0` en asignaciones**: Todo el código que lista asignaciones debe filtrar `cantidad > 0`, o los registros eliminados aparecerán como activos.
- **Creación inline sin persistencia inmediata**: Categorías/unidades creadas desde "Crear material rápido" se pierden si el usuario cierra el diálogo antes de guardar.
- **Subida de archivos sin rollback**: Si la subida de foto/ficha técnica tiene éxito pero la creación del material falla, el archivo queda huérfano en storage.
- **Backend debe aceptar nuevos campos**: `motivo` y `nota` en asignaciones; `foto` y `ficha_tecnica_url` en materiales; `oferta_venta_id`, `descuento_free`, `motivo_descuento_free`, `precio` en solicitudes desde oferta.
- **`childKeys` en catálogo de módulos**: Si se agrega un módulo hijo sin declarar `childKeys`, el card padre quedará invisible aunque el usuario tenga el permiso.
- **`useEffect` con dependencias `[open, initialData?.id]`**: Si `initialData` cambia el contenido pero mantiene el mismo `id`, el formulario del contenedor no se reinicializa.
- **Agregados solicitudes-ventas**: Confirmar que los endpoints devuelven campos de agregados globales y por ítem (`total_sin_descuento`, `total_con_aumento`, `aumento_monto`).
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
- **Campos de dimensionamiento en calculadora sin persistencia confirmada**: Los campos `horas_uso` y `tipo_carga` en modo avanzado deben persistirse; si solo existen en estado React local, se perderán al recargar.
- **Badges de disponibilidad por pool — snapshot estático**: En alta concurrencia, los badges pueden mostrar stock disponible que ya fue reservado por otros usuarios.
- **Endpoint cumpleaños de la semana**: Confirmar que el backend tiene el endpoint y devuelve nombre, CI y fecha en el formato esperado.
- **Endpoint contador de instalaciones solares**: Confirmar que existe y devuelve el dato en el formato esperado.
- **Widget de paneles — estado único vs respuesta del backend**: Si el endpoint devuelve estructura de períodos, el parsing puede fallar o mostrar `undefined`.
- **`window.history.pushState` + Next.js App Router desync**: Puede desincronizarse en full page reloads o con `next/link`.
- **Export Excel merge vertical — heterogeneidad de materiales**: Con número heterogéneo de materiales por registro, la alineación de celdas fusionadas puede desincronizarse.
- **Rebrand paleta — componentes con clases hardcoded**: Componentes con clases `orange-*` directas pueden mostrar colores incorrectos. El tema Ventas puede no aplicarse a modals/popovers fuera del nodo `data-area`.
- **`POST /solicitudes-transferencia/{id}/resolver` — endpoint pendiente de confirmación**: Confirmar que existe en el backend y solo acepta solicitudes en estado `procesando`.

---

## 📅 4 de Junio, 2026

### Resumen de cambios (últimas 24h)

**~24 commits** de Ruben0304, Fabian1820 y yany1509 — día de actividad muy alta con rediseño completo de marca, dashboard, navegación, PWA, refactor de exportación Excel y mejoras en transferencias y wallet.

---

### Área 1: Rebrand Suncar 2026 (2 commits — yany1509, 14:11-14:28)

- Nueva paleta verde: Emerald Circuit, Volt Green, Solar Radiance, Midnight Voltage, Clean Current. Centralizada en `globals.css` y `tailwind.config.ts`. Barrido global de paleta naranja → emerald. Nuevos logos en login, dashboard y header. Tema Ventas (`[data-area=ventas]`) con navy+amarillo. Rebrand de exportaciones de oferta con banner Emerald y paleta Ventas.

---

### Área 2: Dashboard rediseñado (9 commits — Ruben0304, 14:58-16:36)

- Avatar de trabajador y mejoras en dashboard, menú y tablas. Widget de bienvenida: contador de instalaciones solares y carrusel de cumpleaños de la semana. Eliminadas cards de módulos disponibles y favoritos. Widget de clima horario para La Habana (Open-Meteo, sin clave): timeline 6:00–20:00 con temperatura, % lluvia y mm acumulados. Timeout de 6s y manejo de AbortError en StrictMode. Widget de paneles simplificado a estado único.

---

### Área 3: Navegación — botón atrás por área (2 commits — Ruben0304)

- `activeKey` deriva de `?area=` en la URL. `window.history.pushState` y `popstate` nativo (fix para bug de `useSearchParams` de Next.js).

---

### Área 4: PWA e iconos (2 commits)

- Iconos regenerados con logo suncar-v2-iso (72→512px). Icono verde en modo oscuro para favicon y apple-touch-icon.

---

### Área 5: Exportación Excel refactorizada (2 commits — Fabian1820, 15:46 y 17:14)

- Primera versión (15:46): columnas dinámicas de materiales. Segunda versión (17:14): reemplazada por apilado vertical con merge de celdas.

---

### Área 6: Transferencias — botón Resolver (1 commit — Fabian1820, 14:08)

- Botón "Resolver (destrabar)" para solicitudes en estado `procesando`. Llama a `POST /solicitudes-transferencia/{id}/resolver`.

---

### Puede dar bateo

1. **Widget de clima — 3 patches en cascada (16:34→16:35→16:36)**: En producción sin StrictMode, el `AbortController` en el cleanup puede comportarse diferente.

2. **`window.history.pushState` + Next.js App Router desync**: El `popstate` listener puede no dispararse en el primer render SSR.

3. **Export Excel — 2 refactors en 1.5h**: El nuevo formato con merge vertical puede ser incompatible con Excel 2010/2013. Con número heterogéneo de materiales, las celdas fusionadas pueden desalinearse.

4. **Rebrand masivo en un commit**: Componentes con clases `orange-*` o `amber-*` directas mostrarán colores incorrectos. El tema Ventas puede no aplicarse a modals/toasts renderizados en el `body` fuera del nodo `data-area`.

5. **Widget de paneles — estado único sin contrato de API confirmado**: Si el endpoint devuelve estructura de períodos, el componente fallará silenciosamente.

6. **`POST /solicitudes-transferencia/{id}/resolver` — endpoint pendiente**: Confirmar que está implementado en el backend.

---

#### Seguimientos vigentes

- **CI `87120119233` hardcodeado para control de permisos**: El CI está hardcodeado como excepción de acceso. Si esa persona cambia, requiere un nuevo deploy. Debería moverse a un campo de permiso en BD.
- **Campos `cambio_real_*` requieren backend actualizado**: `cambio_real_monto`, `cambio_real_moneda` y `cambio_real_tasa` en `/pagos-ventas/` — confirmar que el backend los acepta.
- **Endpoint lazy load `GET /obras-terminadas/oferta/{id}/facturas-cliente`**: Si no existe, al hacer clic en la pestaña el usuario verá error de carga.
- **PDF unificado con `limit=total` sin cota máxima**: Puede generar timeout o saturar memoria del navegador con miles de registros filtrados.
- **Badge de estado calculado en frontend con flotantes**: `precio_final − total_pagado` puede dar `0.0000001` por redondeo, mostrando "pendiente" en una factura realmente pagada.
- **Módulo Vales/Facturas Instaladora comentado sin aviso explícito**: Verificar que el cambio fue coordinado con los usuarios que dependían de ese flujo.
- **Sistema de notificaciones — endpoints bulk por tipo**: Confirmar que marcar/eliminar todas acepta filtro por tipo en el backend.
- **`GET /inventario/stock-historico`**: Confirmar que existe y acepta params de almacén, material y fecha.
- **AdminPass 123456 hardcodeado**: Brecha de seguridad operativa. Sin mecanismo de forzar cambio en el primer login.
- **Auto-sync catálogo → BD al abrir /permisos**: Si el catálogo tiene un módulo mal definido, se crearán registros incorrectos en BD sin rollback automático.
- **Logs de debug en producción**: Los logs de `fetchTrabajosDeAveria` pueden seguir activos, exponiendo datos de clientes en la consola del navegador.
- **Eliminación lógica `cantidad = 0` en asignaciones**: Todo el código que lista asignaciones debe filtrar `cantidad > 0`.
- **Creación inline sin persistencia inmediata**: Categorías/unidades creadas desde "Crear material rápido" se pierden si el usuario cierra el diálogo antes de guardar.
- **Subida de archivos sin rollback**: Si la subida de foto/ficha técnica tiene éxito pero la creación del material falla, el archivo queda huérfano en storage.
- **Backend debe aceptar nuevos campos**: `motivo` y `nota` en asignaciones; `foto` y `ficha_tecnica_url` en materiales; `oferta_venta_id`, `descuento_free`, `motivo_descuento_free`, `precio` en solicitudes desde oferta.
- **`childKeys` en catálogo de módulos**: Si se agrega un módulo hijo sin declarar `childKeys`, el card padre quedará invisible aunque el usuario tenga el permiso.
- **`useEffect` con dependencias `[open, initialData?.id]`**: Si `initialData` cambia el contenido pero mantiene el mismo `id`, el formulario del contenedor no se reinicializa.
- **Agregados solicitudes-ventas**: Confirmar que los endpoints devuelven campos de agregados globales y por ítem (`total_sin_descuento`, `total_con_aumento`, `aumento_monto`).
- **`updateSolicitudTransferencia` — validación de estado en backend**: El backend debe rechazar ediciones de solicitudes que ya no estén en estado `pendiente`.
- **Búsqueda por `numero_serie`**: Confirmar que el endpoint indexa este campo en el backend.
- **`stock_disponible_actual` — consistencia entre endpoints**: Confirmar que todos los endpoints de inventario devuelven este campo de forma consistente.
- **Excel export de facturas sin cota de registros**: `export-facturas-excel-service.ts` no tiene límite de registros.
- **`'zelle'` como método de pago — soporte en backend**: Confirmar que el backend acepta `'zelle'` en filtros y en registro de pagos.
- **Sort client-side de solicitudes pendientes en ValesSalida**: Con paginación server-side el orden global no está garantizado.
- **Parsing UTC→local en otras tablas con filtros de fecha**: Verificar que otros componentes usen el mismo parser local.
- **Tasas MLC/CUP sin persistencia entre sesiones (nuevo)**: `tasaMlcUsd` y `tasaCupUsd` se reinician en default=1 por sesión. Confirmar que el backend devuelve las tasas al leer la compra.
- **`PonderarCostoResponse` campos nuevos (nuevo)**: Confirmar que POST `/ponderar-costo` incluye `sin_costo_ficha`, `no_aplicables` y `costos_catalogo_propagados`.
- **`GET /api/kardex-costo/costo-actual` (nuevo)**: Confirmar que existe y acepta params `material_id + almacen_id`.
- **`materiales` en respuesta de facturas de solicitudes-ventas (nuevo)**: Confirmar que el endpoint devuelve el campo `materiales` por factura.
- **Filtros de vales de salida — `fecha_desde`, `fecha_hasta`, creador (nuevo)**: Confirmar soporte en el backend.
- **`almacenes-suncar/admin` — gating solo en frontend (nuevo)**: Confirmar que el backend valida el permiso en el endpoint de creación de movimientos.
- **Estados de transferencia no mapeados en `ESTADO_CONFIG` (nuevo)**: Confirmar con el backend la lista completa de estados posibles para solicitudes de transferencia.
- **Campos de dimensionamiento en calculadora sin persistencia confirmada (nuevo)**: Los nuevos campos `horas_uso` y `tipo_carga` en modo avanzado deben persistirse.
- **Badges de disponibilidad por pool — snapshot estático (nuevo)**: En alta concurrencia, los badges pueden mostrar stock disponible que ya fue reservado.
- **Endpoint cumpleaños de la semana (nuevo)**: Confirmar que el backend tiene el endpoint y devuelve nombre, CI y fecha en el formato esperado.
- **Endpoint contador de instalaciones solares (nuevo)**: Confirmar que existe y devuelve el dato en el formato esperado.
- **Widget de paneles — estado único vs respuesta del backend (nuevo)**: Si el endpoint devuelve estructura de períodos, el parsing puede fallar o mostrar `undefined`.
- **`window.history.pushState` + Next.js App Router desync (nuevo)**: Puede desincronizarse en full page reloads o con `next/link`.
- **Export Excel merge vertical — heterogeneidad de materiales (nuevo)**: Con número heterogéneo de materiales por registro, la alineación de celdas fusionadas puede desincronizarse.
- **Rebrand paleta — componentes con clases hardcoded (nuevo)**: Componentes con clases `orange-*` directas pueden mostrar colores incorrectos. El tema Ventas puede no aplicarse a modals/popovers fuera del nodo `data-area`.
- **`POST /solicitudes-transferencia/{id}/resolver` — endpoint pendiente de confirmación (nuevo)**: Confirmar que existe en el backend y solo acepta solicitudes en estado `procesando`.

---

> ⚠️ **Nota de mantenimiento**: Las entradas del **26, 27, 28, 29, 30 de Mayo, 31 de Mayo, 1 de Junio y 2 de Junio** fueron eliminadas al superar los 7 días de antigüedad (política de retención semanal).
