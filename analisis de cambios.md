# Registro de Análisis de Cambios — SunCarWeb

---

## 📅 2 de Junio, 2026

### Resumen de cambios (últimas 24h)

**23 commits** de Fabian1820 — día de actividad muy alta concentrada en la ficha de costos de compras, traspaso entre pools de inventario, y mejoras en vales de salida y facturas.

---

### Área 1: Ficha de costos de compras (11 commits — 03:24 a 11:03)

- **`fix(ficha)`: no marcar % recargo como override por el solo hecho de tener valor guardado** — Al volver a abrir una ficha, el frontend marcaba `porciento_recargo_override=true` para toda fila con recargo persistido > 0, bloqueando la recalculación al agregar costos nuevos. Corregido: override = true solo si el recargo guardado difiere del sugerido calculado con los costos del momento del guardado.
- **`chore(ficha)`: quitar logs de diagnóstico y refetch redundante** — Limpieza del código de diagnóstico agregado durante el debug.
- **`feat(ficha)`: tasas de cambio configurables para MLC y CUP** — Nuevos inputs de tasa por moneda (EUR, MLC, CUP). Todos los costos se convierten a USD y entran al cálculo de `totalCostosUsd` → `porcientoEnvioSugerido` → costos de cada fila.
- **`feat(compras)`: persistir tasas MLC y CUP a USD** — `tasa_conversion_mlc_usd` y `tasa_conversion_cup_usd` ahora se envían en PATCH de compra. El backend ya los acepta según el comentario del commit.
- **`fix(ficha)`: precargar precios finales del catálogo aunque la compra los traiga en 0** — Backend devuelve `precio_venta_final = 0` en compras nuevas (no null). Corregido: `tienePvFinalGuardado` ahora es `> 0`, y `precio_venta_override` se setea en true solo si había un final guardado real.
- **`feat(ficha)`: agregar columna Costo en sección Actuales (catálogo)** — Nueva sub-columna "Costo" que muestra `f.costo_actual` (del bulk-datos) en la sección de precios actuales del catálogo.
- **`feat(ficha)`: Ponderar costo guarda ficha antes de pegarle al endpoint** — Extraída función `guardarFichaInterno()`. `handlePonderarCosto` guarda la ficha primero; si falla, aborta antes de llamar a `/ponderar-costo`.
- **`fix(ficha)`: final guardado real queda fijo aunque cambien costos/sugeridos** — `precio_venta_override = true` siempre que haya un final guardado > 0, evitando que `calcularFila` sobrescriba precios previamente validados por el operador.
- **`feat(ficha)`: adaptar al nuevo contrato de aplicar-precios y ponderar-costo** — `PonderarCostoResponse` extendido con `sin_costo_ficha`, `no_aplicables` y `costos_catalogo_propagados`. `handlePonderarCosto` actualiza `costo_actual` de cada fila in-place con el mapa devuelto.
- **`fix(aplicar-precios)`: quitar columna Costo del dialog de confirmación** — El backend ya no propaga costo al catálogo vía aplicar-precios. La columna Costo se elimina del confirm dialog para no inducir confusión.
- **`fix(aplicar-precios)`: no enviar costo ni otros campos que no propagan al catálogo** — `AplicarPreciosMaterialPayload` simplificado a solo 3 campos: `precio_venta_final`, `precio_instaladora_final`, `porciento_rebajable_venta`.

---

### Área 2: Inventario — Pools y Traspaso (5 commits — 07:33 a 09:02)

- **`feat(inventario)`: clic en stock abre pools + traspaso entre pools** — `PoolsDistributionDialog` acepta `material_id`, `almacen_id` y `onTraspasoCompleto`. Muestra botón "Transferir entre pools" que envía `POST /api/inventario/movimientos` con `tipo=traspaso_sector`. Validaciones cliente: cantidad > 0, cantidad <= disponible, pool_origen != pool_destino.
- **`fix(stock)`: celda "En stock" siempre clicable cuando hay material_id** — Antes requería que `item.pools` existiera y tuviera cantidad > 0. Ahora el botón aparece siempre que haya `material_id`. `PoolsDistributionDialog` recibe `cantidadTotal` para mostrar el total real cuando no hay pools desglosados.
- **`revert(inventario)`: quitar clic de pools en materiales-stock-table** — El clic de pools se revirtió de la vista matricial de materiales × almacenes. Queda solo en la vista detallada del almacén (`stock-table`). Revertido 35 minutos después del feat.
- **`fix(inventario)`: incluir pool / pool_origen / pool_destino en el payload de createMovimiento** — Bug crítico: `pool_origen` y `pool_destino` no se enviaban en el POST de traspaso_sector. El backend aplicaba `$inc` sin ellos → el stock no cambiaba. Corregido.
- **`feat(stock)`: mostrar costo por almacén en el dialog de pools** — Nuevo fetch a `GET /api/kardex-costo/costo-actual` con `material_id + almacen_id`. Muestra el costo ponderado específico de ese almacén junto al dashboard de pools.

---

### Área 3: Solicitudes de entrada (2 commits — 05:24 a 06:13)

- **`fix(solicitudes-entrada)`: ocultar costo unitario en el dialog de detalle** — El almacenero no debe ver costos al aprobar solicitudes de entrada. Quitada la columna "Costo" de la tabla de materiales y el chip de total del header.
- **`fix(solicitudes-entrada)`: proteger dialogs contra cierre durante submit** — `handleClose` del detail dialog y `onOpenChange` del create dialog ignoran intentos de cerrar mientras `busy=true`, evitando overlays huérfanos y state corrupto.

---

### Área 4: Solicitud de venta, vales y facturas (5 commits — 11:50 a 19:05)

- **`fix(solicitud-venta)`: no perder reserva_id al crear cuando applyReserva fue ejecutado** — Bug silencioso: `handleSubmit` usaba `linkedReservaId` (state) que podía resetearse a null por el `useEffect` de reset/init. Fix: derivar `reserva_id` final priorizando `reservaAplicada?.id` con fallback a `linkedReservaId`.
- **`feat(vales-salida)`: add Excel export functionality and filters for request creator** — Exportación a Excel de vales de salida. Nuevo filtro por nombre del creador de la solicitud.
- **`feat(vales-salida)`: add date filters and request creators to ValesSalidaPage** — Filtros `fecha_desde` y `fecha_hasta` para vales por fecha de creación. Dropdown de creador con nombres únicos desde el backend.
- **`feat(solicitudes-ventas)`: enhance factura processing with materiales and export details** — Nuevas funciones para extraer y formatear materiales por factura. Excel export actualizado para incluir conteo y detalle de materiales.
- **`Merge branch 'main' into dev`** — Merge de sincronización.

---

### Puede dar bateo

1. **Bug crítico de `reserva_id` activo hasta hoy**: El fix de `reserva_id` resolvió un bug silencioso donde solicitudes llegaban al backend sin el campo aunque el operador hubiera seleccionado una reserva. Solicitudes creadas antes de este commit pueden tener `reserva_id = null` cuando debería tener valor — verificar consistencia histórica en BD.

2. **Traspaso entre pools: validaciones solo client-side**: Las validaciones de traspaso (cantidad > 0, cantidad <= disponible, origen ≠ destino) son client-side. El backend aplica `$inc` atómico sin pre-chequeo de saldo. Dos usuarios haciendo traspasos simultáneos del mismo pool origen pueden llevar el saldo a negativo.

3. **Revert inmediato del clic de pools en materiales-stock-table**: El feature se implementó y revirtió en 35 minutos. La vista matricial (materiales × almacenes) volvió a tooltip con span. Puede haber código residual o importaciones no limpiadas en `materiales-stock-table.tsx`.

4. **Tasas MLC/CUP sin persistencia entre sesiones**: `tasaMlcUsd` y `tasaCupUsd` se reinician en cada sesión (default = 1). Aunque el backend acepta `tasa_conversion_mlc_usd`/`tasa_conversion_cup_usd` en PATCH, si el operador cierra y reabre la ficha sin que esos campos vengan en la respuesta de GET, recalculará con tasa 1 — costos incorrectos hasta corrección manual.

5. **`PonderarCostoResponse` campos nuevos sin confirmación de contrato**: Los campos `sin_costo_ficha`, `no_aplicables` y `costos_catalogo_propagados` son nuevos en la respuesta de `/ponderar-costo`. Si el backend no los incluye aún, el toast consolidado y la actualización in-place de costos del catálogo fallarán silenciosamente (propiedades undefined en lugar de arrays/objetos vacíos).

6. **`AplicarPreciosMaterialPayload` simplificado puede romper si backend los requería**: Se quitaron `costo`, `precio_unitario_cif`, `porciento_recargo` del payload. El commit afirma que el backend los ignoraba — si en algún caso los validaba como requeridos, el endpoint responderá 422. Confirmar con el equipo de backend.

7. **`GET /api/kardex-costo/costo-actual` sin fallback de error explícito**: Si el endpoint no existe o retorna 500, el dialog muestra "Sin kardex en este almacén todavía" — el mismo mensaje que para un almacén real sin kardex. El usuario no puede distinguir entre "no hay datos" y "hay un error de API".

8. **Filtros de vales de salida — soporte backend pendiente**: Los nuevos params `fecha_desde`, `fecha_hasta` y nombre del creador deben ser soportados por el endpoint de vales. Si el backend los ignora, los filtros no tendrán efecto; si los rechaza, retornará 422 al activarlos.

9. **`materiales` en facturas — campo nuevo en respuesta**: El procesamiento actualizado de facturas en solicitudes-ventas espera el campo `materiales` por factura. Si el endpoint no lo devuelve, la columna de materiales en el Excel exportado quedará vacía sin error visible.

---

#### Seguimientos vigentes

- **CI `87120119233` hardcodeado para control de permisos**: El CI de un trabajador específico está hardcodeado como excepción de acceso en la lógica de negocio. Si esa persona cambia, requiere un nuevo deploy. Debería moverse a un campo de permiso en BD.
- **Campos `cambio_real_*` requieren backend actualizado**: `cambio_real_monto`, `cambio_real_moneda` y `cambio_real_tasa` son nuevos en el payload de `PagoVenta`. Si el backend no los acepta, los POSTs con cambio real fallarán con 422 o perderán datos silenciosamente.
- **Endpoint lazy load `GET /obras-terminadas/oferta/{id}/facturas-cliente`**: Si no existe, al hacer clic en la pestaña el usuario verá error de carga.
- **PDF unificado con `limit=total` sin cota máxima**: La llamada extra para el PDF unificado puede generar timeout o saturar memoria del navegador si hay miles de registros filtrados.
- **Badge de estado calculado en frontend con flotantes**: `precio_final − total_pagado` puede dar `0.0000001` por redondeo, mostrando "pendiente" en una factura realmente pagada. El backend debería devolver un campo de estado ya calculado.
- **Módulo Vales/Facturas Instaladora comentado sin aviso explícito**: Usuarios que dependían de ese flujo quedan sin acceso. Verificar que el cambio fue coordinado.
- **Sistema de notificaciones — endpoints bulk por tipo**: Confirmar que marcar/eliminar todas acepta filtro por tipo de notificación en el backend.
- **`GET /inventario/stock-historico`**: Confirmar que existe y acepta params de almacén, material y fecha.
- **AdminPass 123456 hardcodeado**: Al crear cualquier trabajador se asigna automáticamente `123456` como contraseña. Sin mecanismo de forzar cambio en el primer login — brecha de seguridad operativa.
- **Auto-sync catálogo → BD al abrir /permisos**: Si el catálogo tiene un módulo mal definido, se crearán registros incorrectos en BD sin posibilidad de rollback automático.
- **Logs de debug en producción**: Los logs de `fetchTrabajosDeAveria` pueden seguir activos, exponiendo datos de clientes en la consola del navegador.
- **Eliminación lógica `cantidad = 0` en asignaciones**: Todo el código que lista asignaciones debe filtrar `cantidad > 0`, o los registros eliminados aparecerán como activos.
- **Creación inline sin persistencia inmediata**: Categorías/unidades creadas desde el atajo "Crear material rápido" se pierden si el usuario cierra el diálogo antes de guardar.
- **Subida de archivos sin rollback**: Si la subida de foto/ficha técnica tiene éxito pero la creación del material falla, el archivo queda huérfano en storage.
- **Backend debe aceptar nuevos campos**: `motivo` y `nota` en PATCH de asignaciones; `foto` y `ficha_tecnica_url` en materiales; `oferta_venta_id`, `descuento_free`, `motivo_descuento_free` y `precio` en solicitudes desde oferta.
- **`childKeys` en catálogo de módulos**: Si se agrega un módulo hijo sin declarar `childKeys`, el card padre quedará invisible aunque el usuario tenga el permiso.
- **`useEffect` con dependencias `[open, initialData?.id]`**: Si `initialData` cambia el contenido pero mantiene el mismo `id`, el formulario del contenedor no se reinicializa.
- **Agregados solicitudes-ventas**: Confirmar que los endpoints devuelven campos de agregados globales y por ítem (`total_sin_descuento`, `total_con_aumento`, `aumento_monto`) o los totales serán incorrectos en vistas paginadas.
- **`updateSolicitudTransferencia` — validación de estado en backend**: El backend debe rechazar ediciones de solicitudes que ya no estén en estado `pendiente`.
- **Búsqueda por `numero_serie`**: Confirmar que el endpoint indexa este campo en el backend.
- **`stock_disponible_actual` — consistencia entre endpoints**: Confirmar que todos los endpoints de inventario devuelven este campo de forma consistente.
- **Excel export de facturas sin cota de registros**: `export-facturas-excel-service.ts` no tiene límite de registros; con grandes volúmenes puede generar timeout o saturar memoria del navegador.
- **`'zelle'` como método de pago — soporte en backend**: Confirmar que el backend acepta `'zelle'` en filtros y en registro de pagos; de lo contrario los filtros no devolverán resultados y los POSTs de pagos zelle fallarán con 422.
- **Sort client-side de solicitudes pendientes en ValesSalida**: El `useMemo` ordena solo los datos cargados; con paginación server-side el orden global no está garantizado.
- **Parsing UTC→local en otras tablas con filtros de fecha**: La corrección en `VentasPorComercialTable` y `ValesSalida` puede estar pendiente en otros componentes con filtros de mes/año.
- **Tasas MLC/CUP sin persistencia entre sesiones (nuevo)**: `tasaMlcUsd` y `tasaCupUsd` se reinician en default=1 por sesión. Confirmar que el backend devuelve `tasa_conversion_mlc_usd`/`tasa_conversion_cup_usd` al leer la compra para poder precargarlas.
- **`PonderarCostoResponse` campos nuevos (nuevo)**: La respuesta de POST `/ponderar-costo` debe incluir `sin_costo_ficha`, `no_aplicables` y `costos_catalogo_propagados`; de lo contrario la actualización in-place y los toasts de ponderar fallarán silenciosamente.
- **`GET /api/kardex-costo/costo-actual` (nuevo)**: Nuevo endpoint consumido en `PoolsDistributionDialog`. Confirmar que existe y acepta params `material_id + almacen_id`.
- **`materiales` en respuesta de facturas de solicitudes-ventas (nuevo)**: El nuevo procesamiento espera el campo `materiales` por factura. Confirmar que el endpoint lo devuelve.
- **Filtros de vales de salida — `fecha_desde`, `fecha_hasta`, creador (nuevo)**: Confirmar soporte en el backend; de lo contrario los filtros no tendrán efecto o retornarán 422.

---

## 📅 1 de Junio, 2026

### Resumen de cambios (últimas 24h)

**5 commits** de Fabian1820 — exportación Excel de facturas con filtro por método de pago, corrección del filtro en modo server-side, mejora de manejo de fechas en `VentasPorComercialTable` y componentes `ValesSalida`, y ordenamiento de solicitudes pendientes por `fecha_creacion`.

---

#### 1. `feat: add Excel export functionality for invoices and include payment method filter` (7eb49bc)

- Nuevo servicio `export-facturas-excel-service.ts` (+113 líneas): genera y descarga un Excel con las facturas filtradas incluyendo detalles del método de pago.
- Filtro por método de pago agregado a la búsqueda de facturas en `FacturasVentasTable` y `solicitudes-ventas/page.tsx`.
- Tipo `MetodoPago` extendido para incluir `'zelle'` como valor válido.
- Archivos: `app/solicitudes-ventas/page.tsx` (+91/-4), `facturas-ventas-table.tsx` (+59/-2), `registrar-pago-venta-dialog.tsx` (+4/-3), `todos-pagos-ventas-table.tsx` (+2), nuevo servicio Excel (+113), `pago-cliente-venta-types.ts` (+9/-3). Total: 292 cambios.

#### 2. `fix: refine client-side payment method filtering logic in FacturasVentasTable` (b953272)

- Fix 18 min después del commit anterior: el filtro de método de pago se aplicaba client-side incluso en modo server-side, produciendo doble filtrado incorrecto.
- Corregido para que el filtro client-side solo se active cuando no está en modo server-side.

#### 3. `feat: improve date handling in VentasPorComercialTable for accurate filtering` (81f5b25)

- Nueva función de parsing de fechas locales para evitar el error de interpretación UTC que afectaba los filtros de mes/año.
- Actualizada lógica de comparación y formateo en `resultados-comercial-table.tsx` (+35/-20).

#### 4. `feat: improve date handling for solicitudes in ValesSalida components` (d84ed76)

- `fecha_creacion` como fallback cuando `fecha_recogida` es null en solicitudes de tipo venta.
- Refactorizados 3 componentes: `ValesSalidaPage`, `CreateValeSalidaDialog` y `ValeSalidaDetailDialog` (+24/-14).

#### 5. `feat: sort solicitudes pendientes by creation date in ValesSalidaPage` (38c0b00)

- `useMemo` para ordenar las solicitudes pendientes por `fecha_creacion` descendente, mostrando las más recientes primero (+9/-1).

---

### Puede dar bateo

1. **Fix 18 min después del feat**: El filtro de método de pago se rompió en el primer commit y se corrigió de inmediato. Sugiere que el modo server-side no fue testeado antes del push. Caso borde pendiente: al cambiar entre modos con un filtro activo, el filtro podría quedarse aplicado o limpiarse inesperadamente.

2. **Excel export sin cota de registros**: `export-facturas-excel-service.ts` no tiene límite visible de registros. Con miles de facturas filtradas, puede generar timeout del servidor, saturar memoria del navegador o producir un Excel demasiado grande para abrirse correctamente.

3. **`'zelle'` — soporte en backend**: El tipo `MetodoPago` fue extendido en el frontend. Si el backend no acepta `'zelle'` como valor válido en el filtro ni en el registro de pagos, el filtro no devolverá resultados y los POSTs de pagos zelle fallarán con 422.

4. **Sort client-side solo sobre datos cargados**: El `useMemo` de `ValesSalidaPage` ordena únicamente los registros ya en memoria. Si la lista usa paginación server-side, registros de otras páginas podrían tener fechas más recientes sin que el ordenamiento los refleje.

5. **Bug de parsing UTC extendido a otros componentes**: La corrección del bug UTC se aplicó en `VentasPorComercialTable` y `ValesSalida` el mismo día. Es probable que otras tablas con filtros de mes/año usen el mismo patrón erróneo `new Date(fechaString)` que produce errores de ±1 día cerca de medianoche UTC.

---

#### Seguimientos vigentes

- **CI `87120119233` hardcodeado para control de permisos**: El CI de un trabajador específico está hardcodeado como excepción de acceso en la lógica de negocio. Si esa persona cambia, requiere un nuevo deploy. Debería moverse a un campo de permiso en BD.
- **Campos `cambio_real_*` requieren backend actualizado**: `cambio_real_monto`, `cambio_real_moneda` y `cambio_real_tasa` son nuevos en el payload de `PagoVenta`. Si el backend no los acepta, los POSTs con cambio real fallarán con 422 o perderán datos silenciosamente.
- **Endpoint lazy load `GET /obras-terminadas/oferta/{id}/facturas-cliente`**: Si no existe, al hacer clic en la pestaña el usuario verá error de carga.
- **PDF unificado con `limit=total` sin cota máxima**: La llamada extra para el PDF unificado puede generar timeout o saturar memoria del navegador si hay miles de registros filtrados.
- **Badge de estado calculado en frontend con flotantes**: `precio_final − total_pagado` puede dar `0.0000001` por redondeo, mostrando "pendiente" en una factura realmente pagada. El backend debería devolver un campo de estado ya calculado.
- **Módulo Vales/Facturas Instaladora comentado sin aviso explícito**: Usuarios que dependían de ese flujo quedan sin acceso. Verificar que el cambio fue coordinado.
- **Sistema de notificaciones — endpoints bulk por tipo**: Confirmar que marcar/eliminar todas acepta filtro por tipo de notificación en el backend.
- **`GET /inventario/stock-historico`**: Confirmar que existe y acepta params de almacén, material y fecha.
- **AdminPass 123456 hardcodeado**: Al crear cualquier trabajador se asigna automáticamente `123456` como contraseña. Sin mecanismo de forzar cambio en el primer login — brecha de seguridad operativa.
- **Auto-sync catálogo → BD al abrir /permisos**: Si el catálogo tiene un módulo mal definido, se crearán registros incorrectos en BD sin posibilidad de rollback automático.
- **Logs de debug en producción**: Los logs de `fetchTrabajosDeAveria` pueden seguir activos, exponiendo datos de clientes en la consola del navegador.
- **Eliminación lógica `cantidad = 0` en asignaciones**: Todo el código que lista asignaciones debe filtrar `cantidad > 0`, o los registros eliminados aparecerán como activos.
- **Creación inline sin persistencia inmediata**: Categorías/unidades creadas desde el atajo "Crear material rápido" se pierden si el usuario cierra el diálogo antes de guardar.
- **Subida de archivos sin rollback**: Si la subida de foto/ficha técnica tiene éxito pero la creación del material falla, el archivo queda huérfano en storage.
- **Backend debe aceptar nuevos campos**: `motivo` y `nota` en PATCH de asignaciones; `foto` y `ficha_tecnica_url` en materiales; `oferta_venta_id`, `descuento_free`, `motivo_descuento_free` y `precio` en solicitudes desde oferta.
- **`childKeys` en catálogo de módulos**: Si se agrega un módulo hijo sin declarar `childKeys`, el card padre quedará invisible aunque el usuario tenga el permiso.
- **`useEffect` con dependencias `[open, initialData?.id]`**: Si `initialData` cambia el contenido pero mantiene el mismo `id`, el formulario del contenedor no se reinicializa.
- **Agregados solicitudes-ventas**: Confirmar que los endpoints devuelven campos de agregados globales y por ítem (`total_sin_descuento`, `total_con_aumento`, `aumento_monto`) o los totales serán incorrectos en vistas paginadas.
- **`updateSolicitudTransferencia` — validación de estado en backend**: El backend debe rechazar ediciones de solicitudes que ya no estén en estado `pendiente`.
- **Búsqueda por `numero_serie`**: Confirmar que el endpoint de búsqueda de materiales indexa este campo en el backend.
- **`stock_disponible_actual` — consistencia entre endpoints**: Confirmar que todos los endpoints de inventario devuelven este campo para evitar discrepancias entre vistas del mismo almacén.
- **Excel export de facturas sin cota de registros (nuevo)**: `export-facturas-excel-service.ts` no tiene límite de registros; con grandes volúmenes puede generar timeout o saturar memoria del navegador.
- **`'zelle'` como método de pago — soporte en backend (nuevo)**: El tipo `MetodoPago` fue extendido. Confirmar que el backend acepta `'zelle'` en filtros y en registro de pagos; de lo contrario los filtros no devolverán resultados y los POSTs de pagos zelle fallarán con 422.
- **Sort client-side de solicitudes pendientes en ValesSalida (nuevo)**: El `useMemo` ordena solo los datos cargados; con paginación server-side el orden global no está garantizado.
- **Parsing UTC→local en otras tablas con filtros de fecha (nuevo)**: La corrección en `VentasPorComercialTable` y `ValesSalida` el mismo día sugiere que el bug de `new Date(fechaString)` interpretado como UTC puede estar presente en otros componentes con filtros de mes/año.

---

## 📅 31 de Mayo, 2026

### Resumen de cambios (últimas 24h)

Sin commits de desarrollo nuevos. Solo el commit automático "Analisis diario Claude" del 30/05.

---

### Consideraciones del día

- Sin actividad de desarrollo nueva hoy ni en SunCarWeb ni en LlegoBackend. Los seguimientos del 30/05 siguen vigentes sin cambios.

---

#### Seguimientos vigentes

- **CI `87120119233` hardcodeado para control de permisos**: El CI de un trabajador específico está hardcodeado como excepción de acceso en la lógica de negocio. Si esa persona cambia, requiere un nuevo deploy. Debería moverse a un campo de permiso en BD.
- **Campos `cambio_real_*` requieren backend actualizado**: `cambio_real_monto`, `cambio_real_moneda` y `cambio_real_tasa` son nuevos en el payload de `PagoVenta`. Si el backend no los acepta, los POSTs con cambio real fallarán con 422 o perderán datos silenciosamente.
- **Endpoint lazy load `GET /obras-terminadas/oferta/{id}/facturas-cliente`**: Si no existe, al hacer clic en la pestaña el usuario verá error de carga.
- **PDF unificado con `limit=total` sin cota máxima**: La llamada extra para el PDF unificado puede generar timeout o saturar memoria del navegador si hay miles de registros filtrados.
- **Badge de estado calculado en frontend con flotantes**: `precio_final − total_pagado` puede dar `0.0000001` por redondeo, mostrando "pendiente" en una factura realmente pagada. El backend debería devolver un campo de estado ya calculado.
- **Módulo Vales/Facturas Instaladora comentado sin aviso explícito**: Usuarios que dependían de ese flujo quedan sin acceso. Verificar que el cambio fue coordinado.
- **Sistema de notificaciones — endpoints bulk por tipo**: Confirmar que marcar/eliminar todas acepta filtro por tipo de notificación en el backend.
- **`GET /inventario/stock-historico`**: Confirmar que existe y acepta params de almacén, material y fecha.
- **AdminPass 123456 hardcodeado**: Al crear cualquier trabajador se asigna automáticamente `123456` como contraseña. Sin mecanismo de forzar cambio en el primer login — brecha de seguridad operativa.
- **Auto-sync catálogo → BD al abrir /permisos**: Si el catálogo tiene un módulo mal definido, se crearán registros incorrectos en BD sin posibilidad de rollback automático.
- **Logs de debug en producción**: Los logs de `fetchTrabajosDeAveria` pueden seguir activos, exponiendo datos de clientes en la consola del navegador.
- **Eliminación lógica `cantidad = 0` en asignaciones**: Todo el código que lista asignaciones debe filtrar `cantidad > 0`, o los registros eliminados aparecerán como activos.
- **Creación inline sin persistencia inmediata**: Categorías/unidades creadas desde el atajo "Crear material rápido" se pierden si el usuario cierra el diálogo antes de guardar.
- **Subida de archivos sin rollback**: Si la subida de foto/ficha técnica tiene éxito pero la creación del material falla, el archivo queda huérfano en storage.
- **Backend debe aceptar nuevos campos**: `motivo` y `nota` en PATCH de asignaciones; `foto` y `ficha_tecnica_url` en materiales; `oferta_venta_id`, `descuento_free`, `motivo_descuento_free` y `precio` en solicitudes desde oferta.
- **`childKeys` en catálogo de módulos**: Si se agrega un módulo hijo sin declarar `childKeys`, el card padre quedará invisible aunque el usuario tenga el permiso.
- **`useEffect` con dependencias `[open, initialData?.id]`**: Si `initialData` cambia el contenido pero mantiene el mismo `id`, el formulario del contenedor no se reinicializa.
- **Agregados solicitudes-ventas**: Confirmar que los endpoints de solicitudes, pagos y facturas devuelven campos de agregados globales y campos por ítem (`total_sin_descuento`, `total_con_aumento`, `aumento_monto`) o los totales serán incorrectos en vistas paginadas.
- **`updateSolicitudTransferencia` — validación de estado en backend**: El backend debe rechazar ediciones de solicitudes que ya no estén en estado `pendiente`.
- **Búsqueda por `numero_serie`**: Confirmar que el endpoint de búsqueda de materiales indexa este campo en el backend.
- **`stock_disponible_actual` — consistencia entre endpoints**: Confirmar que todos los endpoints de inventario devuelven este campo para evitar discrepancias entre vistas del mismo almacén.

---

## 📅 30 de Mayo, 2026

### Resumen de cambios (últimas 24h)

Sin commits de desarrollo nuevos. Solo el commit automático "Analisis diario Claude" del 29/05.

---

### Consideraciones del día

- Sin actividad de desarrollo nueva hoy ni en SunCarWeb ni en LlegoBackend. Los seguimientos del 29/05 siguen vigentes sin cambios.

---

#### Seguimientos vigentes

- **CI `87120119233` hardcodeado para control de permisos**: El CI de un trabajador específico está hardcodeado como excepción de acceso en la lógica de negocio. Si esa persona cambia, requiere un nuevo deploy. Debería moverse a un campo de permiso en BD.
- **Campos `cambio_real_*` requieren backend actualizado**: `cambio_real_monto`, `cambio_real_moneda` y `cambio_real_tasa` son nuevos en el payload de `PagoVenta`. Si el backend no los acepta, los POSTs con cambio real fallarán con 422 o perderán datos silenciosamente.
- **Endpoint lazy load `GET /obras-terminadas/oferta/{id}/facturas-cliente`**: Si no existe, al hacer clic en la pestaña el usuario verá error de carga.
- **PDF unificado con `limit=total` sin cota máxima**: La llamada extra para el PDF unificado puede generar timeout o saturar memoria del navegador si hay miles de registros filtrados.
- **Badge de estado calculado en frontend con flotantes**: `precio_final − total_pagado` puede dar `0.0000001` por redondeo, mostrando "pendiente" en una factura realmente pagada. El backend debería devolver un campo de estado ya calculado.
- **Módulo Vales/Facturas Instaladora comentado sin aviso explícito**: Usuarios que dependían de ese flujo quedan sin acceso. Verificar que el cambio fue coordinado.
- **Sistema de notificaciones — endpoints bulk por tipo**: Confirmar que marcar/eliminar todas acepta filtro por tipo de notificación en el backend.
- **`GET /inventario/stock-historico`**: Confirmar que existe y acepta params de almacén, material y fecha.
- **AdminPass 123456 hardcodeado**: Al crear cualquier trabajador se asigna automáticamente `123456` como contraseña. Sin mecanismo de forzar cambio en el primer login — brecha de seguridad operativa.
- **Auto-sync catálogo → BD al abrir /permisos**: Si el catálogo tiene un módulo mal definido, se crearán registros incorrectos en BD sin posibilidad de rollback automático.
- **Logs de debug en producción**: Los logs de `fetchTrabajosDeAveria` pueden seguir activos, exponiendo datos de clientes en la consola del navegador.
- **Eliminación lógica `cantidad = 0` en asignaciones**: Todo el código que lista asignaciones debe filtrar `cantidad > 0`, o los registros eliminados aparecerán como activos.
- **Creación inline sin persistencia inmediata**: Categorías/unidades creadas desde el atajo "Crear material rápido" se pierden si el usuario cierra el diálogo antes de guardar.
- **Subida de archivos sin rollback**: Si la subida de foto/ficha técnica tiene éxito pero la creación del material falla, el archivo queda huérfano en storage.
- **Backend debe aceptar nuevos campos**: `motivo` y `nota` en PATCH de asignaciones; `foto` y `ficha_tecnica_url` en materiales; `oferta_venta_id`, `descuento_free`, `motivo_descuento_free` y `precio` en solicitudes desde oferta.
- **`childKeys` en catálogo de módulos**: Si se agrega un módulo hijo sin declarar `childKeys`, el card padre quedará invisible aunque el usuario tenga el permiso.
- **`useEffect` con dependencias `[open, initialData?.id]`**: Si `initialData` cambia el contenido pero mantiene el mismo `id`, el formulario del contenedor no se reinicializa.
- **Agregados solicitudes-ventas**: Confirmar que los endpoints de solicitudes, pagos y facturas devuelven campos de agregados globales y campos por ítem (`total_sin_descuento`, `total_con_aumento`, `aumento_monto`) o los totales serán incorrectos en vistas paginadas.
- **`updateSolicitudTransferencia` — validación de estado en backend**: El backend debe rechazar ediciones de solicitudes que ya no estén en estado `pendiente`.
- **Búsqueda por `numero_serie`**: Confirmar que el endpoint de búsqueda de materiales indexa este campo en el backend.
- **`stock_disponible_actual` — consistencia entre endpoints**: Confirmar que todos los endpoints de inventario devuelven este campo para evitar discrepancias entre vistas del mismo almacén.

---

## 📅 29 de Mayo, 2026

### Resumen de cambios (últimas 24h)

**6 commits** de Fabian1820 — actividad moderada en 4 áreas.

---

### Área 1: Eliminación de pantalla de bienvenida (1 commit)

- **`chore`** (13:51): Eliminada la pantalla de bienvenida personalizada y el widget de cuenta regresiva implementados el 26/05. La pantalla existió 3 días en el codebase.

---

### Área 2: Edición de Solicitudes de Transferencia (1 commit)

- **`feat: add edit functionality for transfer requests`** (18:37): `SolicitudTransferenciaDialog` ahora acepta un prop opcional `solicitud` que activa el modo edición. En modo edición los campos `origen`, `destino`, `motivo` y `referencia` se pre-rellenan con la solicitud existente. `SolicitudesTransferenciaTable` incorpora un botón "Editar" para solicitudes en estado `pendiente`. Nuevo método `updateSolicitudTransferencia` en `InventarioService`. Nuevo tipo `SolicitudTransferenciaUpdateData`.

---

### Área 3: Stock Fetching en SolicitudTransferenciaDialog (2 commits)

- **`feat`** (18:49): `fetchStockMaterial` recibe parámetro opcional `materialCodigo` para mejorar la resolución del `material_id`; el mapeo de items usa el ID resuelto con fallback al valor del backend; `material_codigo` se pasa correctamente en ambos flujos (creación y edición).
- **`refactor`** (19:09): Se elimina el parámetro `materialCodigo` añadido 20 minutos antes. La lógica de resolución de `material_id` se consolida directamente en la función. Todas las llamadas actualizadas para reflejar la nueva firma.

  > Dos commits sobre la misma función en 20 minutos: el enfoque con parámetro adicional fue descartado rápidamente en favor de una solución más directa.

---

### Área 4: Búsqueda por número de serie y normalización de historial (2 commits)

- **`feat: enhance material search and stock fetching in inventory components`** (19:56): Soporte para buscar por `numero_serie` en `SalidaLoteForm` y `CreateValeSalidaDialog`. Mejoras adicionales en stock fetching de `SolicitudTransferenciaDialog`. Nuevo método en `InventarioService` para obtener solicitudes de transferencia por ID. Nuevos campos en tipos: `numero_serie` y `stock_disponible_actual`.
- **`feat: normalize search input for historial in AlmacenDetallePage`** (20:21): Input de búsqueda del historial normalizado (trim de bordes + colapso de espacios internos). Placeholder actualizado para incluir "referencia" como campo de búsqueda.

---

### Puede dar bateo

1. **Edición de solicitudes sin validación de estado en backend**: El botón de edición se muestra para solicitudes `pendiente`, pero el control está en el frontend. Si `updateSolicitudTransferencia` en el backend no valida el estado antes de permitir la modificación, una solicitud ya aprobada o en tránsito podría ser alterada.

2. **`fetchStockMaterial` rediseñada dos veces en 20 minutos**: El feat de 18:49 añadió `materialCodigo` y el refactor de 19:09 lo eliminó. Este patrón indica que la lógica de resolución de `material_id` (catálogo vs backend) es frágil. Si los IDs/códigos del catálogo no coinciden exactamente con los del backend, el stock puede mostrarse como 0 o incorrecto silenciosamente.

3. **Búsqueda por `numero_serie` sin confirmación de backend**: Si el endpoint de búsqueda de materiales no tiene índice en `numero_serie`, las consultas serán lentas o vacías. Confirmar que el backend soporta este campo como filtro antes de usar en producción.

4. **`stock_disponible_actual` — nuevo campo en tipos**: Este campo implica que el backend puede estar devolviendo el stock ya calculado (incluyendo reservas). Si no todos los endpoints de inventario devuelven este campo, habrá discrepancias entre vistas del mismo almacén.

5. **Pantalla de bienvenida eliminada: verificar limpieza completa**: Implementada y eliminada en 3 días. Verificar que todos los componentes asociados fueron eliminados (hooks de sincronización, custom events, CSS específico) para evitar código muerto o efectos secundarios.

6. **Normalización de búsqueda puede romper referencias con espacios múltiples**: El colapso de espacios internos en el historial puede hacer que referencias formateadas con doble espacio no encuentren resultados si el backend almacena los valores sin normalizar. La normalización debería aplicarse también al momento de guardar, o el backend debería normalizar antes de comparar.

---

#### Seguimientos vigentes

- **CI `87120119233` hardcodeado para control de permisos**: El CI de un trabajador específico está hardcodeado como excepción de acceso en la lógica de negocio. Si esa persona cambia, requiere un nuevo deploy. Debería moverse a un campo de permiso en BD.
- **Campos `cambio_real_*` requieren backend actualizado**: `cambio_real_monto`, `cambio_real_moneda` y `cambio_real_tasa` son nuevos en el payload de `PagoVenta`. Si el backend no los acepta, los POSTs con cambio real fallarán con 422 o perderán datos silenciosamente.
- **Endpoint lazy load `GET /obras-terminadas/oferta/{id}/facturas-cliente`**: Si no existe, al hacer clic en la pestaña el usuario verá error de carga.
- **PDF unificado con `limit=total` sin cota máxima**: La llamada extra para el PDF unificado puede generar timeout o saturar memoria del navegador si hay miles de registros filtrados.
- **Badge de estado calculado en frontend con flotantes**: `precio_final − total_pagado` puede dar `0.0000001` por redondeo, mostrando "pendiente" en una factura realmente pagada. El backend debería devolver un campo de estado ya calculado.
- **Módulo Vales/Facturas Instaladora comentado sin aviso explícito**: Usuarios que dependían de ese flujo quedan sin acceso. Verificar que el cambio fue coordinado.
- **Sistema de notificaciones — endpoints bulk por tipo**: Confirmar que marcar/eliminar todas acepta filtro por tipo de notificación en el backend.
- **`GET /inventario/stock-historico`**: Confirmar que existe y acepta params de almacén, material y fecha.
- **AdminPass 123456 hardcodeado**: Al crear cualquier trabajador se asigna automáticamente `123456` como contraseña. Sin mecanismo de forzar cambio en el primer login — brecha de seguridad operativa.
- **Auto-sync catálogo → BD al abrir /permisos**: Si el catálogo tiene un módulo mal definido, se crearán registros incorrectos en BD sin posibilidad de rollback automático.
- **Logs de debug en producción**: Los logs de `fetchTrabajosDeAveria` pueden seguir activos, exponiendo datos de clientes en la consola del navegador.
- **Eliminación lógica `cantidad = 0` en asignaciones**: Todo el código que lista asignaciones debe filtrar `cantidad > 0`, o los registros eliminados aparecerán como activos.
- **Creación inline sin persistencia inmediata**: Categorías/unidades creadas desde el atajo "Crear material rápido" se pierden si el usuario cierra el diálogo antes de guardar.
- **Subida de archivos sin rollback**: Si la subida de foto/ficha técnica tiene éxito pero la creación del material falla, el archivo queda huérfano en storage.
- **Backend debe aceptar nuevos campos**: `motivo` y `nota` en PATCH de asignaciones; `foto` y `ficha_tecnica_url` en materiales; `oferta_venta_id`, `descuento_free`, `motivo_descuento_free` y `precio` en solicitudes desde oferta.
- **`childKeys` en catálogo de módulos**: Si se agrega un módulo hijo sin declarar `childKeys`, el card padre quedará invisible aunque el usuario tenga el permiso.
- **`useEffect` con dependencias `[open, initialData?.id]`**: Si `initialData` cambia el contenido pero mantiene el mismo `id`, el formulario del contenedor no se reinicializa.
- **Agregados solicitudes-ventas**: Confirmar que los endpoints de solicitudes, pagos y facturas devuelven campos de agregados globales y campos por ítem (`total_sin_descuento`, `total_con_aumento`, `aumento_monto`) o los totales serán incorrectos en vistas paginadas.
- **`updateSolicitudTransferencia` — validación de estado en backend**: El backend debe rechazar ediciones de solicitudes que ya no estén en estado `pendiente`.
- **Búsqueda por `numero_serie`**: Confirmar que el endpoint de búsqueda de materiales indexa este campo en el backend.
- **`stock_disponible_actual` — consistencia entre endpoints**: Confirmar que todos los endpoints de inventario devuelven este campo para evitar discrepancias entre vistas del mismo almacén.

---

## 📅 28 de Mayo, 2026

### Resumen de cambios (últimas 24h)

Sin commits de desarrollo nuevos. Solo el commit automático "Analisis diario Claude" del 27/05.

---

#### Seguimientos vigentes

- **CI `87120119233` hardcodeado para control de permisos**: El CI de un trabajador específico está hardcodeado como excepción de acceso en la lógica de negocio. Si esa persona cambia, requiere un nuevo deploy. Debería moverse a un campo de permiso en BD.
- **Campos `cambio_real_*` requieren backend actualizado**: `cambio_real_monto`, `cambio_real_moneda` y `cambio_real_tasa` son nuevos en el payload de `PagoVenta`. Si el backend no los acepta, los POSTs con cambio real fallarán con 422 o perderán datos silenciosamente.
- **Endpoint lazy load `GET /obras-terminadas/oferta/{id}/facturas-cliente`**: Si no existe, al hacer clic en la pestaña el usuario verá error de carga.
- **PDF unificado con `limit=total` sin cota máxima**: La llamada extra para el PDF unificado puede generar timeout o saturar memoria del navegador si hay miles de registros filtrados.
- **Badge de estado calculado en frontend con flotantes**: `precio_final − total_pagado` puede dar `0.0000001` por redondeo, mostrando "pendiente" en una factura realmente pagada. El backend debería devolver un campo de estado ya calculado.
- **Módulo Vales/Facturas Instaladora comentado sin aviso explícito**: Usuarios que dependían de ese flujo quedan sin acceso. Verificar que el cambio fue coordinado.
- **Sistema de notificaciones — endpoints bulk por tipo**: Confirmar que marcar/eliminar todas acepta filtro por tipo de notificación en el backend.
- **`GET /inventario/stock-historico`**: Confirmar que existe y acepta params de almacén, material y fecha.
- **AdminPass 123456 hardcodeado**: Al crear cualquier trabajador se asigna automáticamente `123456` como contraseña. Sin mecanismo de forzar cambio en el primer login — brecha de seguridad operativa.
- **Auto-sync catálogo → BD al abrir /permisos**: Si el catálogo tiene un módulo mal definido, se crearán registros incorrectos en BD sin posibilidad de rollback automático.
- **Logs de debug en producción**: Los logs de `fetchTrabajosDeAveria` pueden seguir activos, exponiendo datos de clientes en la consola del navegador.
- **Eliminación lógica `cantidad = 0` en asignaciones**: Todo el código que lista asignaciones debe filtrar `cantidad > 0`, o los registros eliminados aparecerán como activos.
- **Creación inline sin persistencia inmediata**: Categorías/unidades creadas desde el atajo "Crear material rápido" se pierden si el usuario cierra el diálogo antes de guardar.
- **Subida de archivos sin rollback**: Si la subida de foto/ficha técnica tiene éxito pero la creación del material falla, el archivo queda huérfano en storage.
- **Backend debe aceptar nuevos campos**: `motivo` y `nota` en PATCH de asignaciones; `foto` y `ficha_tecnica_url` en materiales; `oferta_venta_id`, `descuento_free`, `motivo_descuento_free` y `precio` en solicitudes desde oferta.
- **`childKeys` en catálogo de módulos**: Si se agrega un módulo hijo sin declarar `childKeys`, el card padre quedará invisible aunque el usuario tenga el permiso.
- **`useEffect` con dependencias `[open, initialData?.id]`**: Si `initialData` cambia el contenido pero mantiene el mismo `id`, el formulario del contenedor no se reinicializa.
- **Agregados solicitudes-ventas**: Confirmar que los endpoints de solicitudes, pagos y facturas devuelven campos de agregados globales y campos por ítem (`total_sin_descuento`, `total_con_aumento`, `aumento_monto`) o los totales serán incorrectos en vistas paginadas.

---

## 📅 27 de Mayo, 2026

### Resumen de cambios (últimas 24h)

**4 commits** — autor: Fabian1820 — actividad centrada en solicitudes de ventas.

---

### Área 1: Agregados del set filtrado completo — `feat(solicitudes-ventas)` (19:27)

- **Nuevos tipos**: `SolicitudVentaSummaryAgregados`, `PagoVentaAgregados`, `FacturaVentaAgregados`.
- **Servicios actualizados**: `getSolicitudesSummary`, `getTodosPagos` y `getFacturas` ahora propagan campos de agregados desde el backend.
- **Hook `usePagosClientesVentas`**: expone `agregadosPendientes`, `agregadosPagos`, `agregadosFacturas`.
- **Tablas**: usan los agregados devueltos por el backend para mostrar totales globales del set filtrado; fallback al cálculo local si no llegan.
- **Nuevos campos por ítem en facturas**: `total_sin_descuento`, `total_con_aumento`, `aumento_monto`. La columna "Aumento" solo se muestra cuando al menos una factura la tiene.
- **Pendientes**: línea Total / Pagado / Pendiente en USD ahora proviene de los agregados del backend.

---

### Área 2: Sticky header en tabla — intentado y revertido

- **19:52** — `feat(solicitudes-ventas)`: encabezado de tabla fijo al hacer scroll. Aplicó `position: sticky` al `<thead>` de las 4 tablas. Cambió `overflow-auto` por `overflow-x-auto` en el wrapper interno.
- **20:18** — `fix(solicitudes-ventas)`: sticky en los `<th>`, no en `<tr>`/`<thead>` — aplicó el sticky a cada `<th>` vía `[&_th]:sticky`.
- **20:23** — Ambos commits revertidos. **El encabezado sticky no está en el codebase actualmente.**

---

### Puede dar bateo

1. **Campos de agregados pueden no existir en el backend**: Los totales globales (`total_cobrado`, `total_pendiente`, `total_facturado`, `total_descuentos`) dependen de que el backend los devuelva en los endpoints de solicitudes, pagos y facturas. Hay fallback a cálculo local, pero ese cálculo solo opera sobre la página cargada — en vistas paginadas los totales serán incorrectos si el backend no envía los agregados.

2. **Nuevos campos por ítem en facturas sin confirmación de backend**: `total_sin_descuento`, `total_con_aumento`, `aumento_monto` son nuevos en la respuesta esperada. Si el backend no los incluye, la columna "Aumento" nunca aparecerá y los cálculos de descuento/aumento serán incorrectos silenciosamente.

3. **Sticky header pendiente de resolución**: El encabezado fijo fue intentado dos veces y revertido el mismo día. El problema raíz (ancestro con `overflow: auto` bloqueando el sticky) probablemente sigue presente. El próximo intento debería verificar toda la cadena de ancestros antes de aplicar el sticky.

4. **Reversa a las 20:23 en producción**: Los commits feat+fix fueron revertidos juntos. Si el branch de producción ya había jalado el feat antes del revert, puede haber una ventana corta en que el sticky quedó roto en producción (encabezado superpuesto sobre la primera fila).

---

#### Seguimientos vigentes

- **CI `87120119233` hardcodeado para control de permisos**: El CI de un trabajador específico está hardcodeado como excepción de acceso en la lógica de negocio. Si esa persona cambia, requiere un nuevo deploy. Debería moverse a un campo de permiso en BD.
- **Campos `cambio_real_*` requieren backend actualizado**: `cambio_real_monto`, `cambio_real_moneda` y `cambio_real_tasa` son nuevos en el payload de `PagoVenta`. Si el backend no los acepta, los POSTs con cambio real fallarán con 422 o perderán datos silenciosamente.
- **Endpoint lazy load `GET /obras-terminadas/oferta/{id}/facturas-cliente`**: Si no existe, al hacer clic en la pestaña el usuario verá error de carga.
- **PDF unificado con `limit=total` sin cota máxima**: La llamada extra para el PDF unificado puede generar timeout o saturar memoria del navegador si hay miles de registros filtrados.
- **Badge de estado calculado en frontend con flotantes**: `precio_final − total_pagado` puede dar `0.0000001` por redondeo, mostrando "pendiente" en una factura realmente pagada. El backend debería devolver un campo de estado ya calculado.
- **Módulo Vales/Facturas Instaladora comentado sin aviso explícito**: Usuarios que dependían de ese flujo quedan sin acceso. Verificar que el cambio fue coordinado.
- **Sistema de notificaciones — endpoints bulk por tipo**: Confirmar que marcar/eliminar todas acepta filtro por tipo de notificación en el backend.
- **`GET /inventario/stock-historico`**: Confirmar que existe y acepta params de almacén, material y fecha.
- **AdminPass 123456 hardcodeado**: Al crear cualquier trabajador se asigna automáticamente `123456` como contraseña. Sin mecanismo de forzar cambio en el primer login — brecha de seguridad operativa.
- **Auto-sync catálogo → BD al abrir /permisos**: Si el catálogo tiene un módulo mal definido, se crearán registros incorrectos en BD sin posibilidad de rollback automático.
- **Logs de debug en producción**: Los logs de `fetchTrabajosDeAveria` pueden seguir activos, exponiendo datos de clientes en la consola del navegador.
- **Eliminación lógica `cantidad = 0` en asignaciones**: Todo el código que lista asignaciones debe filtrar `cantidad > 0`, o los registros eliminados aparecerán como activos.
- **Creación inline sin persistencia inmediata**: Categorías/unidades creadas desde el atajo "Crear material rápido" se pierden si el usuario cierra el diálogo antes de guardar.
- **Subida de archivos sin rollback**: Si la subida de foto/ficha técnica tiene éxito pero la creación del material falla, el archivo queda huérfano en storage.
- **Backend debe aceptar nuevos campos**: `motivo` y `nota` en PATCH de asignaciones; `foto` y `ficha_tecnica_url` en materiales; `oferta_venta_id`, `descuento_free`, `motivo_descuento_free` y `precio` en solicitudes desde oferta.
- **`childKeys` en catálogo de módulos**: Si se agrega un módulo hijo sin declarar `childKeys`, el card padre quedará invisible aunque el usuario tenga el permiso.
- **`useEffect` con dependencias `[open, initialData?.id]`**: Si `initialData` cambia el contenido pero mantiene el mismo `id`, el formulario del contenedor no se reinicializa.
- **Agregados solicitudes-ventas (nuevo)**: Confirmar que los endpoints de solicitudes, pagos y facturas devuelven campos de agregados globales y campos por ítem (`total_sin_descuento`, `total_con_aumento`, `aumento_monto`) o los totales serán incorrectos en vistas paginadas.

---

## 📅 26 de Mayo, 2026

### Resumen de cambios (últimas 24h)

**21 commits** — autores: yany1509 y Fabian1820 — actividad muy alta en 3 áreas.

---

### Área 1: Sistema de Notificaciones (11 commits — yany1509)

- **`feat(notificaciones)`: campana de notificaciones** — Nuevo servicio `NotificacionService` con métodos para obtener, marcar como leída y eliminar notificaciones vía API. Componente `NotificationBell` con panel desplegable, badge rojo con conteo de no leídas, polling cada 30s.
- **Fix posición inicial**: Primero añadida como `fixed top-right` en el layout raíz, luego movida al header del dashboard en estilo `variant=outline` (mismo que botones de "Tasa de cambio" e "Información").
- **Fix React Rules of Hooks**: `if (!user) return null` estaba antes de los `useEffect`, violando las reglas de hooks. Movido al final.
- **`feat(notificaciones)`: botón "Ver cliente"** — Nuevo campo `link_cliente` en la interfaz `Notificacion`. Al hacer click: marca como leída, cierra el panel y navega a `/clientes?buscar={numero_cliente}`. `ClientsTable` acepta prop `initialSearchTerm`; `ClientesPage` lee el param `buscar` de la URL.
- **Global en todas las vistas**: Movido al layout global con posición `fixed bottom-right`, círculo naranja/gris. Sonido via Web Audio API al recibir nuevas notificaciones. Toast automático 10s con barra de progreso y botón "Ver cliente".
- **Reintegrado en header del dashboard**: Reversa del global-layout — la campana vuelve al header del dashboard.
- **`feat`: campo `dias_alerta`** — Campo opcional para notificaciones de tipo `demora_instalacion`.
- **Fix contador + agrupación por fecha**: `getConteo` retorna `null` en error (antes devolvía 0, reseteando el badge). Agrupación: Hoy / Ayer / Esta semana / Anteriores. Dentro de cada grupo: `demora_instalacion` ordenada por `dias_alerta` desc, resto por fecha desc. `prevNoLeidasRef` se sincroniza al abrir el panel.
- **`feat`: marcar/eliminar todas** — `marcarTodasLeidas` usa endpoint global (marca TODAS en BD, no solo las cargadas en el panel). Nuevo botón "Eliminar todas" con confirmación. Acciones en barra al tope del panel.
- **Fix mismatch backend/frontend**: El backend responde `{ success, data: [...], total }` pero el servicio intentaba leerlo como array directo → `Array.isArray` era `false` → panel vacío, aunque el badge sí mostraba 99+.
- **`feat`: pestañas Nuevos / Atrasados / Instaladas** — Barra de tabs con conteo de no leídas por pestaña. Tab por defecto: "Atrasados" (más urgente). Cada tab filtra por tipo: `lead_convertido`, `demora_instalacion`, `instalacion_exitosa`. Agrupación por fecha y ordenamiento preservados dentro de cada pestaña. Marcar/eliminar todas ahora actúa solo en la pestaña activa (filtra por tipo en el backend).

---

### Área 2: Stock Histórico (4 commits — yany1509)

- **`feat`: botón "Stock a fecha" en vales de salida** — Nuevo servicio `getStockHistorico()` llamando a `GET /inventario/stock-historico`. `StockHistoricoModal`: dialog con selector de fecha, búsqueda de material, tabla de resultados y exportación a Excel.
- **Refactor combobox de material**: Reemplaza input de texto libre por `Popover + Command` (mismo patrón que `MaterialCombobox`). Carga materiales del almacén lazily al abrir el desplegable. La X del trigger limpia la selección sin cerrar el modal.
- **`feat`: botón "Stock a fecha" en pestaña Stock del almacén** — Mismo `StockHistoricoModal` reutilizado, filtrado por el almacén actual, colocado junto a "Exportar Excel".
- **Fix Popover dentro de Dialog (Radix UI)**: `disablePortal` en `PopoverContent` para evitar que el `PopoverContent` se renderice en el `body` (fuera del árbol DOM del Dialog), lo que hacía que el focus trap bloqueara el desplegable.

---

### Área 3: Pantalla de Bienvenida Personalizada (4 commits — Fabian1820)

- **`feat`: pantalla de bienvenida con cuenta regresiva** — Widget de countdown personalizado. Animación de fondo oculta en la fase inicial para preservar la intriga.
- **Fix scroll y sincronización de estado**: Layout `min-h-full` para permitir scroll cuando el contenido excede el viewport. Sincronización de instancias del hook con custom event para que el botón final actúe globalmente sobre todas las instancias montadas.
- **`feat`: scroll automático y aparición suave del bloque final** — Al terminar la carta, scroll automático con aparición suave del bloque final.
- **`chore`: ajuste final y merge a main** — Configuración final de la pantalla y merge de `dev` a `main`.

---

### Puede dar bateo

1. **Sistema de notificaciones con 11 commits y múltiples reversas en 1.5 horas**: La campana pasó de `fixed top-right` → header dashboard → layout global → vuelta al header. Estas reversas indican que la arquitectura de dónde vive el componente no estaba definida. Puede haber código muerto en el layout raíz si el componente no fue eliminado de todos los puntos de montaje.

2. **Doble instancia de NotificationBell**: Si el componente quedó montado en el layout global Y en el header del dashboard, habrá dos instancias polleando el backend cada 30s en paralelo → doble carga de red y posibles estados inconsistentes (dos badges con conteos diferentes). Verificar que solo existe una instancia activa.

3. **Backend de notificaciones requiere múltiples endpoints confirmados**: `GET /mis-notificaciones` respondiendo `{ success, data: [...], total }` (ya confirmado que existe por el fix de mismatch). Endpoint de marcar/eliminar todas **filtrado por tipo** para que las acciones de pestaña actúen solo en esa categoría. Campo `dias_alerta` en la respuesta para tipo `demora_instalacion`. Campo `link_cliente` con número de cliente navegable. Si alguno de estos no está implementado, las pestañas o el botón "Ver cliente" fallarán silenciosamente o con error.

4. **Sonido Web Audio API sin interacción previa del usuario**: Los navegadores modernos bloquean audio automático hasta que el usuario haya interactuado con la página (autoplay policy). Si llega una notificación antes de que el usuario haga clic en algo, el sonido no se reproducirá y no habrá feedback de error visible.

5. **Toast 10s sin marcar como leída automáticamente**: El toast muestra la notificación nueva pero si el usuario no interactúa antes de que se cierre, la notificación permanece como no leída. El contador puede mantenerse en 99+ aunque el usuario haya "visto" el aviso.

6. **`GET /inventario/stock-historico` sin confirmación de existencia**: El endpoint es nuevo en el contrato. Si no existe en el backend, el modal "Stock a fecha" mostrará error al abrirse. No hay fallback visible en la UI.

7. **Stock histórico: carga de materiales sin caché**: Cada vez que el usuario abre el desplegable de material dentro del modal, se dispara una llamada al backend. Sin caché, en almacenes con muchos materiales el desplegable puede ser lento o generar demasiadas llamadas si el usuario abre y cierra el desplegable repetidamente.

8. **Pantalla de bienvenida: sincronización por custom event frágil**: El fix de "sincronizar instancias del hook con custom event" implica que el mismo hook está montado en más de un lugar. Si el custom event no llega a todas las instancias (timing de hydration, SSR, o race condition), el estado del botón final puede quedar inconsistente entre instancias.

9. **Merge con conflicto en `analisis de cambios.md`**: El commit `a29b8bd` registra un conflicto en este mismo archivo durante el merge de `dev` a `main`. Verificar que la resolución fue correcta y no se perdió contenido del análisis anterior.

---

#### Seguimientos vigentes

- **CI `87120119233` hardcodeado para control de permisos**: El CI de un trabajador específico está hardcodeado como excepción de acceso en la lógica de negocio. Si esa persona cambia, requiere un nuevo deploy. Debería moverse a un campo de permiso en BD.
- **Campos `cambio_real_*` requieren backend actualizado**: `cambio_real_monto`, `cambio_real_moneda` y `cambio_real_tasa` son nuevos en el payload de `PagoVenta`. Si el backend no los acepta, los POSTs con cambio real fallarán con 422 o perderán datos silenciosamente.
- **Endpoint lazy load `GET /obras-terminadas/oferta/{id}/facturas-cliente`**: Si no existe, al hacer clic en la pestaña el usuario verá error de carga.
- **PDF unificado con `limit=total` sin cota máxima**: La llamada extra para el PDF unificado puede generar timeout o saturar memoria del navegador si hay miles de registros filtrados.
- **Badge de estado calculado en frontend con flotantes**: `precio_final − total_pagado` puede dar `0.0000001` por redondeo, mostrando "pendiente" en una factura realmente pagada. El backend debería devolver un campo de estado ya calculado.
- **Módulo Vales/Facturas Instaladora comentado sin aviso explícito**: Usuarios que dependían de ese flujo quedan sin acceso. Verificar que el cambio fue coordinado.
- **Sistema de notificaciones — endpoints bulk por tipo (nuevo)**: Confirmar que marcar/eliminar todas acepta filtro por tipo de notificación en el backend.
- **`GET /inventario/stock-historico` (nuevo)**: Confirmar que existe y acepta params de almacén, material y fecha.
- **AdminPass 123456 hardcodeado**: Al crear cualquier trabajador se asigna automáticamente `123456` como contraseña. Sin mecanismo de forzar cambio en el primer login — brecha de seguridad operativa.
- **Auto-sync catálogo → BD al abrir /permisos**: Si el catálogo tiene un módulo mal definido, se crearán registros incorrectos en BD sin posibilidad de rollback automático.
- **Logs de debug en producción**: Los logs de `fetchTrabajosDeAveria` pueden seguir activos, exponiendo datos de clientes en la consola del navegador.
- **Eliminación lógica `cantidad = 0` en asignaciones**: Todo el código que lista asignaciones debe filtrar `cantidad > 0`, o los registros eliminados aparecerán como activos.
- **Creación inline sin persistencia inmediata**: Categorías/unidades creadas desde el atajo "Crear material rápido" se pierden si el usuario cierra el diálogo antes de guardar.
- **Subida de archivos sin rollback**: Si la subida de foto/ficha técnica tiene éxito pero la creación del material falla, el archivo queda huérfano en storage.
- **Backend debe aceptar nuevos campos**: `motivo` y `nota` en PATCH de asignaciones; `foto` y `ficha_tecnica_url` en materiales; `oferta_venta_id`, `descuento_free`, `motivo_descuento_free` y `precio` en solicitudes desde oferta.
- **`childKeys` en catálogo de módulos**: Si se agrega un módulo hijo sin declarar `childKeys`, el card padre quedará invisible aunque el usuario tenga el permiso.
- **`useEffect` con dependencias `[open, initialData?.id]`**: Si `initialData` cambia el contenido pero mantiene el mismo `id`, el formulario del contenedor no se reinicializa.

---

---

> ⚠️ **Nota de mantenimiento**: La entrada del **25 de Mayo** fue eliminada al superar los 7 días de antigüedad (política de retención semanal).
