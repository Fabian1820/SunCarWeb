# Registro de Análisis de Cambios — SunCarWeb

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
- **Búsqueda por `numero_serie`**: Confirmar que el endpoint indexa este campo en el backend.
- **`stock_disponible_actual` — consistencia entre endpoints**: Confirmar que todos los endpoints de inventario devuelven este campo de forma consistente.
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

## 📅 25 de Mayo, 2026

### Resumen de cambios (últimas 24h)

**22 commits** de yany1509 — día de actividad muy alta con cambios en 4 áreas críticas.

---

### Área 1: Reservas de Ofertas (7 commits)

- **Edición de reservas inline**: botón "Editar Reserva" con tabla editable de cantidades, llama a `PUT /reservas/{id}`.
- **Fix `cancelarReserva`**: ahora llama realmente al backend (`DELETE /reservas/{id}`); antes era un no-op.
- **Permisos de reducción**: solo superadmin y el trabajador con CI `87120119233` pueden bajar o quitar materiales de una reserva existente. El resto solo puede añadir o aumentar.
- **Stock real disponible**: `stockDisponiblePorCodigo` ahora descuenta las reservas activas (`cantidad − cantidad_reservada`). Max del input = `min(cantidadOferta, stockLibre)`.
- **Fix sincronización en edición**: al entrar en modo edición, los materiales que ya no están en la reserva se resetean a 0 (antes quedaban con el valor antiguo).
- **Fix UI al cancelar**: al recibir reservas vacías del backend, limpia `materialesReservados`, `fechaExpiracion`, `tipoReserva` y cierra el panel.
- **Fix unificación de secciones**: oculta el checkbox "Hacer reserva antes de guardar" cuando ya existen reservas activas; panel azul siempre visible si hay reservas.
- **Fix nombres automáticos de ofertas**: corrige floating point en baterías (`5.119999…kWh → 5.12kWh`) y potencia mal guardada en W en lugar de kW (`605000W → 605W`). Parchadas 19 ofertas en MongoDB.

---

### Área 2: Facturas Cliente — Obras Terminadas (9 commits)

- **Nueva pestaña "Facturas Cliente"** en el panel expandible de obras terminadas.
- **Nuevo tipo `FacturaClienteObra`** con materiales, pagos, `precio_final`, `total_pagado` y `numero_factura`.
- **Nuevo endpoint (backend requerido)**: `GET /obras-terminadas/oferta/{id}/facturas-cliente` — lazy load al hacer clic en la pestaña.
- **Número de factura `FI-YYYY-NNNNNN`** visible en bold en la cabecera del panel.
- **Badge de facturación por fila** con 3 estados: Sin factura (gris) / `FI-YYYY-N · Pendiente` (naranja) / `FI-YYYY-N · Pagada` (verde). Estado calculado como `precio_final − total_pagado`.
- **Filtro de 4 botones**: Todos / ✓ Pagada / Con pendiente / Sin factura.
- **PDF factura cliente**: sin precios unitarios (solo Descripción y Cant.); totales primero, pagos detallados después.
- **PDF unificado**: ahora hace una llamada extra con `limit=total` para exportar TODOS los resultados filtrados, no solo la página actual.
- **Fix panel de filtros**: siempre visible aunque no haya resultados; mensaje de "sin resultados" incluye botón de limpiar filtros.

---

### Área 3: Pagos Ventas — Cambio Real (4 commits)

- **Separación cambio original / cambio real**: cambio original = calculado desde desglose de billetes (read-only, informativo); cambio real = sección nueva con monto + moneda + tasa.
- **Nuevos campos en `PagoVenta`**: `cambio_real_monto`, `cambio_real_moneda`, `cambio_real_tasa`.
- **Convención de tasa fijada**: siempre "no-USD por 1 USD" (igual que la tasa principal del pago). Cálculo: `× tasa` si cambio=USD, `÷ tasa` si pago=USD.
- **Autocompletado**: cuando el cambio es en USD y el pago en otra moneda, la tasa del cambio real se autocompleta con la tasa principal.
- **PDF**: muestra "Cambio dado" + "Tasa del cambio" como `1 USD = X {moneda}`.

---

### Área 4: Limpieza y Estilo (3 commits)

- **Módulo Vales y Facturas de Instaladora comentado** en Facturación (intencional, verificar comunicación con usuarios afectados).
- **Encabezados PDF sin fondo azul** en facturas de ventas y facturas cliente de obras terminadas — mejor para imprimir y ahorrar tóner.
- **Fix panel de filtros** visible cuando no hay resultados en obras terminadas.

---

### Puede dar bateo

1. **CI `87120119233` hardcodeado para control de permisos**: El CI de un trabajador específico está hardcodeado como excepción de acceso en la lógica de negocio. Si esa persona cambia o necesita rotarse, requiere un nuevo deploy. Frágil y difícil de mantener; debería moverse a un campo de permiso en BD.

2. **Campos `cambio_real_*` requieren backend actualizado**: `cambio_real_monto`, `cambio_real_moneda` y `cambio_real_tasa` son nuevos en el payload de `PagoVenta`. Si el backend aún no los acepta, los POSTs de pagos con cambio real fallarán con 422 o ignorarán los campos silenciosamente, perdiendo datos.

3. **Endpoint lazy load debe existir en backend**: `GET /obras-terminadas/oferta/{id}/facturas-cliente` es nuevo. Si no existe, al hacer clic en la pestaña el usuario verá un error de carga. El fallback `isThisMonth` mitiga parcialmente pero puede mostrar datos incorrectos o vacíos para clientes instalados recientemente.

4. **PDF unificado con `limit=total` sin cota máxima**: La llamada extra que trae todos los resultados para el PDF no tiene límite máximo. Si hay miles de registros filtrados, la petición puede ser muy lenta o provocar un timeout. Sin paginación ni límite defensivo, también puede saturar memoria del navegador al generar el PDF.

5. **Badge de estado calculado en frontend con flotantes**: El estado "pagada" vs "pendiente" se calcula como `precio_final − total_pagado` en el cliente. Si hay diferencias de redondeo de flotantes (e.g., `0.0000001` de diferencia), el badge mostrará "pendiente" en una factura realmente pagada. Idealmente el backend debería devolver un campo de estado ya calculado.

6. **Lógica de tasas de cambio: 4 commits en 2 horas**: La complejidad de la convención (dirección, inversión, autocompletado) generó 4 commits consecutivos sobre el mismo código. Verificar que la convención `× tasa / ÷ tasa` sea consistente con lo que guarda y devuelve el backend; si el backend re-invierte, los montos en PDF quedarán incorrectos.

7. **Módulo Vales/Facturas Instaladora comentado sin aviso**: Al comentar el módulo, usuarios que dependían de ese acceso quedan sin flujo de trabajo. Verificar que el cambio fue coordinado y comunicado.

8. **22 commits en un día sobre 4 áreas críticas**: El volumen es muy alto. En el área de reservas hubo 7 commits entre las 13:16 y las 14:44 (88 minutos). Con ese ritmo, hay riesgo de regresiones no detectadas en áreas interdependientes (stock, pagos, permisos).

9. **Race condition stock en frontend persiste**: Aunque ahora se descuentan reservas activas, el cálculo sigue siendo en cliente y con datos del momento en que se abrió el diálogo. Dos usuarios abriendo simultáneamente el mismo diálogo pueden ver el mismo stock libre y reservar la misma unidad. Sin validación de stock en el backend al hacer el POST de la reserva, esto puede generar sobrecomisiones.

---

#### Seguimientos vigentes

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

> ⚠️ **Nota de mantenimiento**: La entrada del **24 de Mayo** fue eliminada al superar los 7 días de antigüedad (política de retención semanal).
