# Registro de Análisis de Cambios — SunCarWeb

---

## 📅 19 de Junio, 2026

### Resumen de cambios (últimas 24h)

**1 commit** de Fabian1820 — fix puntual en el módulo de devoluciones: se permite ahora iniciar una devolución sobre vales que ya están en estado "facturado". Hasta hoy, ese estado bloqueaba el flujo de devolución aunque la operación comercial fuera legítima.

---

### Área 1: Devoluciones — permitir devolución en vales facturados (1 commit — Fabian1820, 19:57)

- **`fix(devoluciones): permitir devolución en vales ya facturados`** — Elimina o relaja la validación en frontend que impedía iniciar el flujo de devolución cuando el vale tenía estado `facturado`. El flujo de devolución ahora es accesible desde vales en ese estado.

---

### Puede dar bateo

1. **Backend debe aceptar la transición `facturado → con_devolucion`**: Si el backend tiene una guarda de estado que rechaza modificaciones sobre vales facturados, el fix en frontend no es suficiente — el POST/PATCH de devolución recibirá un 400/422. Confirmar que el endpoint de devoluciones acepta vales en estado `facturado`.

2. **Impacto contable de la devolución sobre factura emitida**: Cuando el vale ya tiene una factura emitida, la devolución debería generar una nota de crédito o ajustar el total de la factura. Confirmar que el backend maneja este ajuste automáticamente y que la UI refleja el estado actualizado de la factura tras la devolución.

3. **Devolución parcial en vales mixtos (algunos ítems facturados, otros no)**: Si el vale tiene líneas facturadas y líneas sin facturar, confirmar que la devolución parcial aplica correctamente solo a las líneas del alcance y no invalida la factura completa.

4. **Badge de estado en la tabla tras devolución**: Confirmar que el estado del vale se actualiza en la tabla sin necesidad de recarga manual, y que el badge refleja el nuevo estado (ej. `con_devolucion` o `facturado_con_devolucion`) correctamente.

---

#### Seguimientos vigentes

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

## 📅 18 de Junio, 2026

### Resumen de cambios (últimas 24h)

**3 commits reales** de Fabian1820 — día enfocado íntegramente en el módulo de **Reservas** de materiales: nuevo dialog unificado `create-reserva-dialog` (+876 líneas), fixes de coherencia en mapas de stock y banners stale, y manejo visible de materiales sin desglose por sector. Dos commits vacíos de verificación de Railway. Total: ~1300 líneas añadidas en 4 archivos principales.

---

### Área 1: Módulo Reservas — dialog unificado Ventas+Instaladora (1 commit — Fabian1820, 14:44)

- **`feat(reservas): módulo unificado ventas+instaladora y stock por sector`** (+1226/-116, 23 archivos) — Nuevo componente `create-reserva-dialog` (876 líneas) con tabs por sector (Todas/Ventas/Instaladora). Cálculo de disponible: `max(0, pool_sector - reservado_sector) + max(0, indistinto - reservado_indistinto)`. Siempre envía `pool=indistinto` para activar split automático en el backend. `/reservas-ventas` ahora tiene tabs y se registra en el catálogo bajo "Comercial-Instaladora" y "Comercial-Ventas". BMS añadida como categoría reservable para instaladora. Badges sector/Común en solicitudes-materiales y solicitudes-ventas leen el mapa de reservas activas desde la colección `reservas`. `confeccion-ofertas-view`: `stock_disponible` y "Libre" descuentan reservas activas de otras ofertas en el almacén. `upsert-solicitud-venta-dialog`: aviso no bloqueante de reservas activas del cliente con botón "Vincular". `create-solicitud-material-dialog`: auto-vincula reserva cuando viene de oferta con materiales reservados. Renombrado global en UI: "indistinto" → "Común", "pool" → "sector".

---

### Área 2: Fixes de coherencia y UX (2 commits — Fabian1820, 14:54 y 15:02)

- **`fix(reservas): bugs de coherencia tras code review`** — Mapa `material_id→codigo` también se llena desde catálogo; banner "reservas del cliente" ya no queda stale al cambiar almacén; cast de pool reemplazado por validación explícita contra `"ventas"|"instaladora"` con fallback a `"indistinto"`.
- **`fix(reservas): warning visible cuando falta desglose por sector`** — Material sin `.pools` en almacén se marca como `sinDesgloseSector`, fila en ámbar, submit bloqueado. `handleSubmit` captura error de race condition y lo muestra inline en `errors.materiales`.

---

### Puede dar bateo

1. **`pool=indistinto` para split automático — backend debe implementarlo**: Si el backend no tiene el split automático, todas las reservas caen en "indistinto" sin descontar de "ventas" ni "instaladora".
2. **Race condition en el cálculo de disponible**: Dos usuarios reservando en paralelo pueden superar el stock real; el backend debe validar en la escritura.
3. **`sinDesgloseSector` solo detectado en frontend**.
4. **Mapa `material_id→codigo` — race en carga del catálogo**.
5. **Auto-vincular reserva — puede elegir reserva incorrecta si hay múltiples del mismo material**.
6. **BMS como categoría reservable — docs sin `.pools` bloquean el 100% de reservas BMS**.
7. **Módulo `/reservas-ventas` bajo dos entradas — sub-permiso por tab no protegido**.
8. **Renombrado UI "indistinto" → "Común" — confirmar en todos los puntos de display**.
9. **Error inline de race condition — visibilidad en scroll**.
10. **Redeploy de Railway — confirmar auto-deploy activo**.

---

## 📅 17 de Junio, 2026

### Resumen de cambios (últimas 24h)

Sin commits nuevos en las últimas 24h. Los seguimientos del 16/06 siguen vigentes.

---

### Puede dar bateo

Sin cambios nuevos — sin riesgos nuevos.

---

## 📅 16 de Junio, 2026

### Resumen de cambios (últimas 24h)

Sin commits nuevos en las últimas 24h. Los seguimientos del 15/06 siguen vigentes.

---

### Puede dar bateo

Sin cambios nuevos — sin riesgos nuevos.

---

## 📅 15 de Junio, 2026

### Resumen de cambios (últimas 24h)

**1 commit** de Ruben0304 — reemplazo crítico de la carga masiva en la pestaña "Clientes Ventas" de Facturas: sustituye 2000 solicitudes + clientes con N+1 queries por un nuevo hook `usePaginatedVentasFactura` que consume `GET /resumen-factura` (agregación MongoDB con `$facet` en una sola query). La pestaña ahora carga instantáneamente con paginación y búsqueda debounced.

---

### Área 1: Facturas-Ventas — paginación con endpoint agregado (1 commit — Ruben0304, Jun 15 14:21)

- **`feat(facturas-ventas): reemplazar carga masiva por endpoint paginado con búsqueda`** — Sustituye la carga de 2000 solicitudes+clientes con N+1 queries por el nuevo hook `usePaginatedVentasFactura` que consume `GET /resumen-factura` (agregación MongoDB en una sola query con `$facet`). La pestaña Clientes Ventas ahora carga instantáneamente con paginación y búsqueda debounced.

---

### Puede dar bateo

1. **`GET /resumen-factura` — endpoint y estructura `$facet` sin confirmar**.
2. **`$facet` aggregation — límite de 100MB de memoria de MongoDB**.
3. **Debounce — estado al limpiar búsqueda**.
4. **Preservación de filtros al paginar**.
5. **Estado de error vacío vs. error real**.

---

## 📅 12 de Junio, 2026

### Resumen de cambios (últimas 24h)

**15 commits** de Fabian1820 y yany1509 — flujo completo de Consignaciones (registrar pago, emitir factura, badge en tabla), mejoras mayores de UX en Kardex de Costos, botón "Actualizar costos" unificado en Ficha de Costo, panel de error elegante para materiales sin costear, y 4 fixes en el módulo RRHH (ruta de `cargo` iterada 3 veces).

---

### Área 1: Consignaciones — flujo completo de pago y factura (1 commit — Fabian1820, 16:26)

- **`feat(consignaciones): flujo completo — registrar pago, emitir factura, badge en tabla`** — Botón "Registrar pago" abre `RegistrarPagoVentaDialog`. Botón "Emitir factura" abre `EmitirFacturaConsignacionDialog` y llama a `POST /consignaciones/{id}/facturas`. El botón se convierte en badge "Facturado" cuando `monto_facturado >= monto_total`. Badge morado "Consignación" en tabla de solicitudes. Campos nuevos: `monto_facturado`, `facturas_ids`.

---

### Área 2: Solicitudes — panel de error elegante para pendiente_costeo (3 commits — Fabian1820)

- **`feat(solicitudes): panel de error elegante para materiales pendientes de costeo`** — Panel ámbar con foto del material, código, nombre y enlace "Ir a ficha".
- **`fix(api-config): preservar detail objeto en respuestas 400`** — `detail` ahora se incluye cuando es un objeto.
- **`fix(solicitudes): propagar error estructurado pendiente_costeo sin re-envolver`** — El hook ya no pierde `isPendienteCosteo` y `materialesBloqueados`.

---

### Área 3: Ficha de Costo — botón unificado (2 commits — Fabian1820)

- **`feat(ficha-costo): botón "Actualizar costos" unificado`** — Un solo botón inteligente que pondera o ajusta según el estado real. Llama a `sincronizar-costos`.
- **`fix(ficha-costo): eliminar botones individuales Ponderar y Ajustar`**.

---

### Área 4: Kardex + Compras + RRHH + PDF (6 commits)

- **`feat(kardex): mejoras de UX`** — Badge de tipo en cada fila, filas `pendiente_costeo` en ámbar, doble cabecera con grupos, indicador de tendencia.
- **`feat(ficha-costo): botón "Ajustar costo"`** — Handler `handleAjustarCosto`, endpoint `POST /ajustar-costo`.
- **`fix(compras): no enviar materiales en PATCH cuando la compra está recibida`**.
- **`fix(compras): ordenar por fecha_llegada_aproximada, fallback a fecha_envio`**.
- **`fix(rrhh): enrutar cargo al endpoint correcto`** — 3 commits iterados; `cargo` va a `PUT /{ci}/rrhh`.
- **`fix(export): centrar logo verticalmente en encabezado PDF`**.

---

### Puede dar bateo

1. **`POST /consignaciones/{id}/facturas` — endpoint sin confirmar**.
2. **Badge "Facturado" con flotantes — redondeo puede mostrar "Pendiente" erróneo**.
3. **`cargo` en RRHH — 3 commits en 40 min confirmar estado final**.
4. **`fix(api-config): preservar detail objeto` — componentes que hacían `error.message` directamente pueden romperse**.
5. **Panel de error `pendiente_costeo` — `useMaterials` en contexto del dialog**.
6. **Campos `tipo`, `pendiente_costeo`, `regularizada_por` en KardexCosto — si backend no los devuelve, badges no aparecen**.
7. **Botón "Actualizar costos" — lógica de decisión interna opaca**.
8. **`fix(compras): no enviar materiales` — si `materialesBloqueados` tiene bug, el PATCH enviará materiales y recibirá 422**.
9. **`POST /ajustar-costo` — endpoint sin confirmar**.

---

> ⚠️ **Nota de mantenimiento**: Las entradas del **5, 6, 7, 9 y 11 de Junio** fueron eliminadas al superar los 7 días de antigüedad (política de retención semanal). Anteriores eliminadas: 26, 27, 28, 29, 30 de Mayo, 31 de Mayo, 1, 2 y 4 de Junio.
