# Registro de Análisis de Cambios — SunCarWeb

---

## 📅 4 de Junio, 2026

### Resumen de cambios (últimas 24h)

**~24 commits** de Ruben0304, Fabian1820 y yany1509 — día de actividad muy alta con rediseño completo de marca, dashboard, navegación, PWA, refactor de exportación Excel y mejoras en transferencias y wallet.

---

### Área 1: Rebrand Suncar 2026 (2 commits — yany1509, 14:11-14:28)

- **`feat: rediseño de marca Suncar 2026`** — Nueva paleta verde: Emerald Circuit, Volt Green, Solar Radiance, Midnight Voltage, Clean Current. Centralizada en `globals.css` y `tailwind.config.ts`. Barrido global de paleta naranja → emerald. Nuevos logos en login, dashboard y header. Tema Ventas (`[data-area=ventas]`) con navy+amarillo. Fix accent suave y texto negro en inputs de fecha.
- **`feat(rebrand)`: exportaciones de ofertas con nuevo logo y colores** — Banner Emerald en exportaciones de oferta confección. Paleta Ventas (navy+amarillo) en exportaciones de oferta venta. Logo V2 en todos los exportadores de ofertas incluyendo leads y clientes.

---

### Área 2: Dashboard rediseñado (9 commits — Ruben0304, 14:58-16:36)

- **`feat: avatar de trabajador y mejoras en dashboard, menú y tablas`** (14:58) — Foto de perfil del trabajador en tablas y menú de usuario.
- **`feat(dashboard): bienvenida con cumpleaños de la semana y total de instalaciones`** (15:23) — Reemplaza métricas de ejemplo: contador de instalaciones solares y carrusel de cumpleaños de la semana.
- **`feat(dashboard): quitar cards de módulos disponibles y favoritos del inicio`** (16:13) — Eliminadas las cards de módulos y favoritos de la pantalla principal.
- **`feat(dashboard): widget de clima horario para La Habana (Open-Meteo)`** (16:16) — Timeline 6:00–20:00 con temperatura, % lluvia y mm acumulados. API Open-Meteo gratuita, sin clave. Banner de alerta si se esperan tormentas o lluvia ≥50%.
- **`feat(dashboard): rediseñar widget de clima con mensajes personales y estado de paneles`** (16:26) — Tarjetas de generación por período (Ahora/Mañana/Tarde). Mensajes del clima personalizados.
- **`feat(dashboard): simplificar widget de paneles a estado único actual`** (16:28) — Widget reducido a mostrar el estado de generación actual (un único valor).
- **`fix(dashboard): agregar timeout de 6s al fetch del widget de clima`** (16:34) — Previene loading infinito si Open-Meteo no responde.
- **`fix(dashboard): loguear error del widget de clima en consola`** (16:35) — Errores del clima se loguean en lugar de perderse silenciosamente.
- **`fix(dashboard): ignorar AbortError del cleanup para evitar widget oculto en StrictMode`** (16:36) — React StrictMode monta/desmonta dos veces en desarrollo; el AbortError del cleanup se silencia.

---

### Área 3: Navegación — botón atrás por área (2 commits — Ruben0304, 16:05-16:08)

- **`feat(nav): área activa en URL para que el botón atrás vuelva al área`** (16:05) — `activeKey` deriva de `?area=` en la URL. `goTo()` hace `router.push` para registrar en el historial.
- **`fix(nav): usar popstate + pushState nativo para el botón atrás del área`** (16:08) — `useSearchParams` de Next.js no propaga el cambio al volver con el botón atrás. Fix: `window.history.pushState` y `popstate` nativo.

---

### Área 4: PWA e iconos (2 commits — 16:10 y 20:19)

- **`feat(pwa): regenerar iconos PWA con logo suncar-v2-iso`** — Todos los tamaños (72→512px) actualizados.
- **`feat(pwa): usar icono verde en modo oscuro para favicon y apple-touch-icon`** — En modo oscuro se muestra el icono verde.

---

### Área 5: Optimización de UI y logos (1 commit — Ruben0304, 16:02)

- **`feat(ui): quitar títulos repetitivos, centrar cards y optimizar logos`** — Elimina bloques duplicados. Centra ModuleCard. Logo sidebar sin fondo, transparente. Optimiza logos de /public/brand de 4500px (~250KB) a tamaños web (5-32KB). Actualiza favicon.ico.

---

### Área 6: Exportación Excel refactorizada (2 commits — Fabian1820, 15:46 y 17:14)

- **`feat: refactor exportación de facturas y solicitudes para incluir columnas dinámicas de materiales`** (15:46) — Materiales como pares `Material N / Cantidad N`.
- **`refactor(export): mejorar la lógica de exportación a Excel para facturas, solicitudes y vales de salida`** (17:14) — Reemplaza el formato columnar por apilado vertical: `Material` y `Cantidad` apilados en filas con merge de celdas para las demás columnas.

---

### Área 7: Transferencias — botón Resolver (1 commit — Fabian1820, 14:08)

- **`feat(transferencias): boton 'Resolver' para solicitudes colgadas en procesando`** — Botón "Resolver (destrabar)" cuando estado es `procesando`. Llama a `POST /solicitudes-transferencia/{id}/resolver`. `InventarioService.resolverSolicitudTransferencia(id)`.

---

### Área 8: Wallet UI (1 commit — Fabian1820, 20:20)

- **`fix(wallet): ajustar diseño de la cuadrícula de saldos disponibles`** — Mejora la visualización del grid de saldos en dispositivos pequeños.

---

### Puede dar bateo

1. **Widget de clima — 3 patches en cascada (16:34→16:35→16:36)**: Los fixes se acumularon en 2 minutos, sugiriendo prueba en desarrollo con StrictMode de React. En producción sin StrictMode, el `AbortController` en el cleanup puede comportarse diferente. Si el usuario navega fuera antes del timeout de 6s, el fetch puede no cancelarse correctamente.

2. **`window.history.pushState` + Next.js App Router desync**: El router de Next.js y la API nativa de historial pueden desincronizarse en full page reloads o con `next/link`. El `popstate` listener puede no dispararse en el primer render SSR, mostrando el área por defecto aunque la URL tenga `?area=`.

3. **Export Excel — 2 refactors en 1.5h (columnas dinámicas → merge vertical)**: El cambio rápido sugiere que el formato columnar no era el esperado. El nuevo formato con merge vertical puede ser incompatible con Excel 2010/2013. Con número heterogéneo de materiales por registro, las celdas fusionadas de otras columnas pueden desalinearse.

4. **Rebrand masivo en un commit**: Cambio amplio en `globals.css` y `tailwind.config.ts`. Componentes con clases `orange-*` o `amber-*` directas mostrarán colores incorrectos. El tema Ventas (`[data-area=ventas]`) puede no aplicarse a modals/toasts/popovers renderizados en el `body` fuera del nodo `data-area`.

5. **Widget de paneles — estado único sin contrato de API confirmado**: Pasó de estructura de períodos (Ahora/Mañana/Tarde) a un único valor. Si el endpoint del backend devuelve el formato de períodos, el componente fallará silenciosamente o mostrará `undefined`.

6. **`POST /solicitudes-transferencia/{id}/resolver` — endpoint pendiente de confirmación**: El botón "Resolver" asume que el endpoint existe. Confirmar que está implementado y solo acepta solicitudes en estado `procesando`; de lo contrario retornará 404 o 422.

7. **Logos optimizados desde 4500px**: Si el resize no preservó el canal alpha, logos con transparencia pueden mostrar fondo blanco o negro. Verificar en el dashboard con tema oscuro.

8. **2 formatos de export en el mismo día**: El primer commit (15:46 — columnas dinámicas) fue refactorizado 1.5h después (17:14 — merge vertical). Si el primero llegó a producción, operadores pueden haber generado archivos con el formato anterior. Confirmar el formato esperado y comunicar el cambio.

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
- **`useEffect` con dependencias `[open, initialData?.id]`**: Si `initialData` cambia el contenido pero mantiene el mismo `id`, el formulario no se reinicializa.
- **Agregados solicitudes-ventas**: Confirmar que los endpoints devuelven campos de agregados globales y por ítem (`total_sin_descuento`, `total_con_aumento`, `aumento_monto`).
- **`updateSolicitudTransferencia` — validación de estado en backend**: El backend debe rechazar ediciones de solicitudes que ya no estén en estado `pendiente`.
- **Búsqueda por `numero_serie`**: Confirmar que el endpoint indexa este campo en el backend.
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
- **`almacenes-suncar/admin` — gating solo en frontend (nuevo)**: Confirmar que el backend valida el permiso en el endpoint de creación de movimientos; de lo contrario el control puede ser bypasseado con llamadas directas a la API.
- **Estados de transferencia no mapeados en `ESTADO_CONFIG` (nuevo)**: Confirmar con el backend la lista completa de estados posibles para solicitudes de transferencia y mapearlos explícitamente.
- **Campos de dimensionamiento en calculadora sin persistencia confirmada (nuevo)**: Los campos `horas_uso` y `tipo_carga` en modo avanzado deben persistirse; si solo existen en estado React local, se perderán al recargar.
- **Badges de disponibilidad por pool — snapshot estático (nuevo)**: En alta concurrencia, los badges pueden mostrar stock disponible que ya fue reservado por otros usuarios.
- **Endpoint cumpleaños de la semana (nuevo)**: El widget de bienvenida muestra cumpleaños de trabajadores. Confirmar que el backend tiene el endpoint y devuelve nombre, CI y fecha en el formato esperado.
- **Endpoint contador de instalaciones solares (nuevo)**: Confirmar que existe y devuelve el dato en el formato esperado; si no existe, el contador mostrará 0 o error silencioso.
- **Widget de paneles — estado único vs respuesta del backend (nuevo)**: El widget se simplificó a un único estado actual. Si el endpoint devuelve estructura de períodos, el parsing puede fallar o mostrar `undefined`.
- **`window.history.pushState` + Next.js App Router desync (nuevo)**: Puede desincronizarse en full page reloads o con `next/link`. El `popstate` listener puede no dispararse en el primer render SSR.
- **Export Excel merge vertical — heterogeneidad de materiales (nuevo)**: Con número heterogéneo de materiales por registro, la alineación de celdas fusionadas puede desincronizarse. Verificar con datos reales.
- **Rebrand paleta — componentes con clases hardcoded (nuevo)**: Componentes con clases `orange-*` directas pueden mostrar colores incorrectos. El tema Ventas puede no aplicarse a modals/popovers fuera del nodo `data-area`.
- **`POST /solicitudes-transferencia/{id}/resolver` — endpoint pendiente de confirmación (nuevo)**: Confirmar que existe en el backend y solo acepta solicitudes en estado `procesando`.

---

## 📅 2 de Junio, 2026

### Resumen de cambios (últimas 24h)

**23 commits** de Fabian1820 — día de actividad muy alta concentrada en la ficha de costos de compras, traspaso entre pools de inventario, y mejoras en vales de salida y facturas.

---

### Área 1: Ficha de costos de compras (11 commits — 03:24 a 11:03)

- **`fix(ficha)`: no marcar % recargo como override por el solo hecho de tener valor guardado** — Al volver a abrir una ficha, el frontend marcaba `porciento_recargo_override=true` para toda fila con recargo persistido > 0, bloqueando la recalculación al agregar costos nuevos. Corregido: override = true solo si el recargo guardado difiere del sugerido calculado con los costos del momento del guardado.
- **`chore(ficha)`: quitar logs de diagnóstico y refetch redundante** — Limpieza del código de diagnóstico agregado durante el debug.
- **`feat(ficha)`: tasas de cambio configurables para MLC y CUP** — Nuevos inputs de tasa por moneda (EUR, MLC, CUP). Todos los costos se convierten a USD y entran al cálculo de `totalCostosUsd` → `porcientoEnvioSugerido` → costos de cada fila.
- **`feat(compras)`: persistir tasas MLC y CUP a USD** — `tasa_conversion_mlc_usd` y `tasa_conversion_cup_usd` ahora se envían en PATCH de compra.
- **`fix(ficha)`: precargar precios finales del catálogo aunque la compra los traiga en 0** — Backend devuelve `precio_venta_final = 0` en compras nuevas (no null). Corregido: `tienePvFinalGuardado` ahora es `> 0`.
- **`feat(ficha)`: agregar columna Costo en sección Actuales (catálogo)** — Nueva sub-columna "Costo" que muestra `f.costo_actual` en la sección de precios actuales del catálogo.
- **`feat(ficha)`: Ponderar costo guarda ficha antes de pegarle al endpoint** — Extraída función `guardarFichaInterno()`. `handlePonderarCosto` guarda la ficha primero; si falla, aborta antes de llamar a `/ponderar-costo`.
- **`fix(ficha)`: final guardado real queda fijo aunque cambien costos/sugeridos** — `precio_venta_override = true` siempre que haya un final guardado > 0.
- **`feat(ficha)`: adaptar al nuevo contrato de aplicar-precios y ponderar-costo** — `PonderarCostoResponse` extendido con `sin_costo_ficha`, `no_aplicables` y `costos_catalogo_propagados`. `handlePonderarCosto` actualiza `costo_actual` de cada fila in-place.
- **`fix(aplicar-precios)`: quitar columna Costo del dialog de confirmación** — El backend ya no propaga costo al catálogo vía aplicar-precios.
- **`fix(aplicar-precios)`: no enviar costo ni otros campos que no propagan al catálogo** — `AplicarPreciosMaterialPayload` simplificado a solo 3 campos.

---

### Área 2: Inventario — Pools y Traspaso (5 commits — 07:33 a 09:02)

- **`feat(inventario)`: clic en stock abre pools + traspaso entre pools** — `PoolsDistributionDialog` acepta `material_id`, `almacen_id` y `onTraspasoCompleto`. Muestra botón "Transferir entre pools" que envía `POST /api/inventario/movimientos` con `tipo=traspaso_sector`. Validaciones cliente: cantidad > 0, cantidad <= disponible, pool_origen != pool_destino.
- **`fix(stock)`: celda "En stock" siempre clicable cuando hay material_id** — El botón aparece siempre que haya `material_id`.
- **`revert(inventario)`: quitar clic de pools en materiales-stock-table** — El clic de pools se revirtió de la vista matricial. Queda solo en la vista detallada del almacén.
- **`fix(inventario)`: incluir pool / pool_origen / pool_destino en el payload de createMovimiento** — Bug crítico: `pool_origen` y `pool_destino` no se enviaban en el POST de traspaso_sector. El backend aplicaba `$inc` sin ellos → el stock no cambiaba.
- **`feat(stock)`: mostrar costo por almacén en el dialog de pools** — Nuevo fetch a `GET /api/kardex-costo/costo-actual` con `material_id + almacen_id`.

---

### Área 3: Solicitudes de entrada (2 commits — 05:24 a 06:13)

- **`fix(solicitudes-entrada)`: ocultar costo unitario en el dialog de detalle** — El almacenero no debe ver costos al aprobar solicitudes de entrada.
- **`fix(solicitudes-entrada)`: proteger dialogs contra cierre durante submit** — `handleClose` ignora intentos de cerrar mientras `busy=true`.

---

### Área 4: Solicitud de venta, vales y facturas (5 commits — 11:50 a 19:05)

- **`fix(solicitud-venta)`: no perder reserva_id al crear cuando applyReserva fue ejecutado** — Bug silencioso: `handleSubmit` usaba `linkedReservaId` (state) que podía resetearse a null. Fix: derivar `reserva_id` final priorizando `reservaAplicada?.id`.
- **`feat(vales-salida)`: add Excel export functionality and filters for request creator** — Exportación a Excel de vales de salida. Nuevo filtro por nombre del creador.
- **`feat(vales-salida)`: add date filters and request creators to ValesSalidaPage** — Filtros `fecha_desde` y `fecha_hasta`. Dropdown de creador con nombres únicos.
- **`feat(solicitudes-ventas)`: enhance factura processing with materiales and export details** — Nuevas funciones para extraer y formatear materiales por factura. Excel export actualizado.
- **`Merge branch 'main' into dev`** — Merge de sincronización.

---

### Puede dar bateo

1. **Bug crítico de `reserva_id` activo hasta hoy**: Solicitudes creadas antes de este commit pueden tener `reserva_id = null` cuando debería tener valor — verificar consistencia histórica en BD.

2. **Traspaso entre pools: validaciones solo client-side**: Las validaciones son client-side. El backend aplica `$inc` atómico sin pre-chequeo de saldo. Dos usuarios haciendo traspasos simultáneos del mismo pool origen pueden llevar el saldo a negativo.

3. **Revert inmediato del clic de pools en materiales-stock-table**: Implementado y revertido en 35 minutos. Puede haber código residual o importaciones no limpiadas en `materiales-stock-table.tsx`.

4. **Tasas MLC/CUP sin persistencia entre sesiones**: `tasaMlcUsd` y `tasaCupUsd` se reinician en cada sesión (default = 1). Si el operador cierra y reabre la ficha sin que esos campos vengan en la respuesta de GET, recalculará con tasa 1.

5. **`PonderarCostoResponse` campos nuevos sin confirmación de contrato**: Si el backend no incluye `sin_costo_ficha`, `no_aplicables` y `costos_catalogo_propagados`, el toast consolidado y la actualización in-place fallarán silenciosamente.

6. **`AplicarPreciosMaterialPayload` simplificado puede romper si backend los requería**: Se quitaron `costo`, `precio_unitario_cif`, `porciento_recargo` del payload. Confirmar con el equipo de backend que no los validaba como requeridos.

7. **`GET /api/kardex-costo/costo-actual` sin fallback de error explícito**: Si el endpoint no existe o retorna 500, el dialog muestra "Sin kardex en este almacén todavía" — el mismo mensaje que para un almacén real sin kardex.

8. **Filtros de vales de salida — soporte backend pendiente**: Los nuevos params `fecha_desde`, `fecha_hasta` y nombre del creador deben ser soportados por el endpoint de vales.

9. **`materiales` en facturas — campo nuevo en respuesta**: El procesamiento actualizado espera el campo `materiales` por factura. Si el endpoint no lo devuelve, la columna de materiales en el Excel exportado quedará vacía.

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

#### 1. `feat: add Excel export functionality for invoices and include payment method filter`

- Nuevo servicio `export-facturas-excel-service.ts`: genera y descarga un Excel con las facturas filtradas incluyendo detalles del método de pago.
- Filtro por método de pago agregado a la búsqueda de facturas en `FacturasVentasTable` y `solicitudes-ventas/page.tsx`.
- Tipo `MetodoPago` extendido para incluir `'zelle'` como valor válido.

#### 2. `fix: refine client-side payment method filtering logic in FacturasVentasTable`

- Fix 18 min después del commit anterior: el filtro de método de pago se aplicaba client-side incluso en modo server-side, produciendo doble filtrado incorrecto.

#### 3. `feat: improve date handling in VentasPorComercialTable for accurate filtering`

- Nueva función de parsing de fechas locales para evitar el error de interpretación UTC.

#### 4. `feat: improve date handling for solicitudes in ValesSalida components`

- `fecha_creacion` como fallback cuando `fecha_recogida` es null en solicitudes de tipo venta.

#### 5. `feat: sort solicitudes pendientes by creation date in ValesSalidaPage`

- `useMemo` para ordenar las solicitudes pendientes por `fecha_creacion` descendente.

---

### Puede dar bateo

1. **Fix 18 min después del feat**: El filtro de método de pago se rompió en el primer commit y se corrigió de inmediato. El modo server-side no fue testeado antes del push.

2. **Excel export sin cota de registros**: Con miles de facturas filtradas, puede generar timeout del servidor, saturar memoria del navegador o producir un Excel demasiado grande.

3. **`'zelle'` — soporte en backend**: El tipo `MetodoPago` fue extendido en el frontend. Si el backend no acepta `'zelle'` como valor válido en el filtro ni en el registro de pagos, el filtro no devolverá resultados y los POSTs de pagos zelle fallarán con 422.

4. **Sort client-side solo sobre datos cargados**: El `useMemo` ordena únicamente los registros ya en memoria. Con paginación server-side, registros de otras páginas pueden tener fechas más recientes sin que el ordenamiento los refleje.

5. **Bug de parsing UTC extendido a otros componentes**: La corrección se aplicó en `VentasPorComercialTable` y `ValesSalida`. Es probable que otras tablas con filtros de mes/año usen el mismo patrón errado.

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

- **`feat: add edit functionality for transfer requests`** (18:37): `SolicitudTransferenciaDialog` ahora acepta un prop opcional `solicitud` que activa el modo edición. `SolicitudesTransferenciaTable` incorpora un botón "Editar" para solicitudes en estado `pendiente`. Nuevo método `updateSolicitudTransferencia` en `InventarioService`.

---

### Área 3: Stock Fetching en SolicitudTransferenciaDialog (2 commits)

- **`feat`** (18:49): `fetchStockMaterial` recibe parámetro opcional `materialCodigo`; el mapeo de items usa el ID resuelto con fallback al valor del backend.
- **`refactor`** (19:09): Se elimina el parámetro `materialCodigo` añadido 20 minutos antes. La lógica se consolida directamente en la función.

---

### Área 4: Búsqueda por número de serie y normalización de historial (2 commits)

- **`feat: enhance material search and stock fetching in inventory components`** (19:56): Soporte para buscar por `numero_serie` en `SalidaLoteForm` y `CreateValeSalidaDialog`. Nuevos campos en tipos: `numero_serie` y `stock_disponible_actual`.
- **`feat: normalize search input for historial in AlmacenDetallePage`** (20:21): Input de búsqueda del historial normalizado (trim + colapso de espacios internos).

---

### Puede dar bateo

1. **Edición de solicitudes sin validación de estado en backend**: El botón de edición se muestra para solicitudes `pendiente`, pero el control está en el frontend. Si el backend no valida el estado, una solicitud ya aprobada o en tránsito podría ser alterada.

2. **`fetchStockMaterial` rediseñada dos veces en 20 minutos**: La lógica de resolución de `material_id` es frágil. Si los IDs/códigos del catálogo no coinciden exactamente con los del backend, el stock puede mostrarse como 0 o incorrecto silenciosamente.

3. **Búsqueda por `numero_serie` sin confirmación de backend**: Si el endpoint no tiene índice en `numero_serie`, las consultas serán lentas o vacías.

4. **`stock_disponible_actual` — nuevo campo en tipos**: Si no todos los endpoints de inventario devuelven este campo, habrá discrepancias entre vistas del mismo almacén.

5. **Normalización de búsqueda puede romper referencias con espacios múltiples**: El colapso de espacios internos puede hacer que referencias con doble espacio no encuentren resultados si el backend almacena los valores sin normalizar.

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

> ⚠️ **Nota de mantenimiento**: Las entradas del **26 y 27 de Mayo** fueron eliminadas al superar los 7 días de antigüedad (política de retención semanal).
