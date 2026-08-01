# Registro de Análisis de Cambios — SunCarWeb

---

## 📅 1 de Agosto, 2026

### Resumen de cambios (últimas 24h)

Sin commits nuevos de código. El único commit en las últimas 24h es "Analisis diario Claude" (generado automáticamente). No hay cambios en producción.

---

### Puede dar bateo

Sin cambios nuevos — sin riesgos nuevos.

---

## 📅 31 de Julio, 2026

### Resumen de cambios (últimas 24h)

Sin commits nuevos de código. El único commit en las últimas 24h es "Analisis diario Claude" (generado automáticamente). No hay cambios en producción.

---

### Puede dar bateo

Sin cambios nuevos — sin riesgos nuevos.

---

## 📅 30 de Julio, 2026

### Resumen de cambios (últimas 24h)

Sin commits nuevos de código. El único commit en las últimas 24h es "Analisis diario Claude" (generado automáticamente). No hay cambios en producción.

---

### Puede dar bateo

Sin cambios nuevos — sin riesgos nuevos.

---

## 📅 28 de Julio, 2026

### Resumen de cambios (últimas 24h)

Sin commits nuevos de código. El único commit en las últimas 24h es "Analisis diario Claude" (generado automáticamente). No hay cambios en producción.

---

### Puede dar bateo

Sin cambios nuevos — sin riesgos nuevos.

---

## 📅 27 de Julio, 2026

### Resumen de cambios (últimas 24h)

Sin commits nuevos de código. El único commit en las últimas 24h es "Analisis diario Claude" (generado automáticamente). No hay cambios en producción.

---

### Puede dar bateo

Sin cambios nuevos — sin riesgos nuevos.

---

## 📅 26 de Julio, 2026

### Resumen de cambios (últimas 24h)

Sin commits nuevos de código. El único commit en las últimas 24h es "Analisis diario Claude" (generado automáticamente). No hay cambios en producción.

---

### Puede dar bateo

Sin cambios nuevos — sin riesgos nuevos.

---

## 📅 25 de Julio, 2026

### Resumen de cambios (últimas 24h)

Sin commits nuevos de código. El único commit en las últimas 24h es "Analisis diario Claude" (generado automáticamente). No hay cambios en producción.

---

### Puede dar bateo

Sin cambios nuevos — sin riesgos nuevos.

---

#### Seguimientos vigentes

- **`renderFactura` con `incluirMateriales: false` — edge cases sin cobertura, totales en PDF pueden ser incorrectos (Jul 24)**.
- **PDF masivo obras-terminadas sin cota máxima — puede bloquear navegador en listas largas (Jul 24)**.
- **Dos commits obras-terminadas en 34 min — build intermedio posible en prod con botón masivo ausente (Jul 24)**.
- **`incluirComercial: false` — fila omitida puede desplazar layout del PDF (Jul 24)**.
- **Sin tests de regresión sobre flujo PDF original "Exportar PDF" tras refactor de `renderFactura` (Jul 24)**.
- **Cálculo "pendiente" en Detalle de Cobros solo en frontend — desincronía con totales del backend si devuelve saldo_pendiente calculado (Jul 23)**.
- **`cancelado` falsy/undefined en pagos históricos — filtro !p.cancelado no los excluye del cálculo (Jul 23)**.
- **Contador de encabezado ahora incluye cancelados — usuarios esperando "pagos válidos" verán número inflado (Jul 23)**.
- **Par de fixes de pagos en < 35 min — posible build intermedio con totales corregidos pero sin badge visual (Jul 23)**.
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

> ⚠️ **Nota de mantenimiento**: Las entradas del **19, 20 y 21 de Junio** y del **23 de Junio** fueron eliminadas al superar los 7 días de antigüedad (política de retención semanal). La entrada del **26 de Junio** fue eliminada el 4 de Julio al superar los 7 días. La entrada del **28 de Junio** fue eliminada el 6 de Julio al superar los 7 días. La entrada del **29 de Junio** fue eliminada el 7 de Julio al superar los 7 días. La entrada del **30 de Junio** fue eliminada el 8 de Julio al superar los 7 días. Las entradas del **1 y 2 de Julio** fueron eliminadas el 10 de Julio al superar los 7 días. La entrada del **3 de Julio** fue eliminada el 11 de Julio al superar los 7 días. Las entradas del **4 y 5 de Julio** fueron eliminadas el 13 de Julio al superar los 7 días. La entrada del **6 de Julio** fue eliminada el 14 de Julio al superar los 7 días. La entrada del **7 de Julio** fue eliminada el 15 de Julio al superar los 7 días. La entrada del **8 de Julio** fue eliminada el 17 de Julio al superar los 7 días. La entrada del **10 de Julio** fue eliminada el 18 de Julio al superar los 7 días. La entrada del **11 de Julio** fue eliminada el 19 de Julio al superar los 7 días. La entrada del **13 de Julio** fue eliminada el 21 de Julio al superar los 7 días. La entrada del **14 de Julio** fue eliminada el 22 de Julio al superar los 7 días. La entrada del **15 de Julio** fue eliminada el 23 de Julio al superar los 7 días. La entrada del **17 de Julio** fue eliminada el 25 de Julio al superar los 7 días. La entrada del **18 de Julio** fue eliminada el 26 de Julio al superar los 7 días. La entrada del **19 de Julio** fue eliminada el 27 de Julio al superar los 7 días. La entrada del **20 de Julio** fue eliminada el 28 de Julio al superar los 7 días. La entrada del **21 de Julio** fue eliminada el 30 de Julio al superar los 7 días. La entrada del **22 de Julio** fue eliminada el 30 de Julio al superar los 7 días. La entrada del **23 de Julio** fue eliminada el 31 de Julio al superar los 7 días. La entrada del **24 de Julio** fue eliminada el 1 de Agosto al superar los 7 días. Anteriores eliminadas: 16, 17 y 18 de Junio, 5, 6, 7, 9, 11, 12 y 15 de Junio, y días de Mayo.
