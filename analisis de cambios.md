# Registro de Análisis de Cambios — SunCarWeb

---

## 📅 25 de Junio, 2026

### Resumen de cambios (últimas 24h)

**9 commits** de Fabian1820 y yany1509 (incluyendo 1 merge) — jornada intensa con cuatro módulos activos: **Facturas Solar-Carros** (yany1509) amplía la vista con campos contables, buscador y genera un DOCX de Orden de Trabajo; **Asignaciones** (Fabian1820) mejora la detección de costo cero y propaga errores correctamente; **Permisos** introduce el concepto de sub-permiso aditivo en almacenes; **Transferencias** muestra la lista de materiales faltantes al aprobar; y **Reservas Ventas** revierte al dialog original de Ventas eliminando el unificado que rompía el flujo.

---

### Área 1: Facturas Solar-Carros — campos contables, buscador y DOCX (4 commits — yany1509, 11:38–12:07)

- **`feat(facturas-solar-carros): agregar código/precio contabilidad en vista y botón Orden de Trabajo DOCX`** (11:38) — `app/facturas/facturas-solar-carros/page.tsx` (+225). Añade `codigo_contabilidad` y `precio_contabilidad` al tipo API y a la tabla de detalle de factura. Genera y descarga Orden de Trabajo en formato DOCX fiel al template oficial (12 columnas, cabecera, firma, fecha).
- **`fix(facturas-solar-carros): corregir nombre de campo precio_contabilidad_cup`** (11:58) — El backend devuelve `precio_contabilidad_cup`, no `precio_contabilidad`. Causaba que el precio siempre mostrara "-" en la vista de factura.
- **`feat(facturas-solar-carros): buscador por cliente y filtros de fecha en Facturas Creadas`** (12:03) — +61 líneas. Añade input de búsqueda por cliente y filtros de rango de fecha sobre la lista de facturas creadas.
- **`fix(facturas-solar-carros): permitir crear factura de instaladora sin oferta previa`** (12:07) — Elimina el bloqueo que impedía abrir el preview cuando el cliente no tiene materiales/componentes. El usuario puede agregarlos manualmente.

---

### Área 2: Asignaciones — alerta costo cero + errores sin falsos positivos (1 commit — Fabian1820, 14:19)

- **`fix(asignaciones): alerta precisa de costo cero + manejo de errores sin falsos positivos`** — `material-service`: mapea `costo` en `normalizeSearchMaterial` y añade `searchMaterialesConCosto` (endpoint admin, único que expone costo). Dialog de asignación: usa la búsqueda con costo para detectar correctamente materiales sin costo; banner con guía (toggle costo cero + ficha de costos). `asignacion-service`: helper `assertOk` en todos los mutadores para que los errores 400/401/404/500 (que `apiRequest` no relanza) dejen de mostrarse como éxitos falsos.

---

### Área 3: Permisos — sub-permiso almacenes aditivo (1 commit — Fabian1820, 14:21)

- **`feat(permisos): subpermiso almacenes-suncar/admin aditivo (no heredado del padre)`** — `modulos-catalogo.ts`: flag `SubPermiso.aditivo` + `aditivo:true` en `almacenes-suncar/admin`. `auth-context.tsx`: nuevo `hasExactPermission` (membresía exacta, sin herencia padre→hijo). `almacenes/[almacenId]/page.tsx`: botones de entrada/salida manual gateados con `hasExactPermission`. `trabajador-permisos-dialog`: sub aditivo se marca/desmarca independiente del padre.

---

### Área 4: Transferencias — feedback de error con lista de faltantes (1 commit — Fabian1820, 15:02)

- **`feat(transferencias): mostrar feedback de error al aprobar con lista de faltantes`** — `inventario-service.ts`: los métodos lanzan si `success===false` y propagan el mensaje del backend; aprobar adjunta `detail.faltantes`. `solicitudes-transferencia-table.tsx`: muestra toast destructivo y, dentro del diálogo, lista cada material faltante con foto, código, nombre y cantidades (disponible/solicitado). Tipos `InventarioTypes` ampliados con `faltantes`.

---

### Área 5: Reservas Ventas — restaurar flujo original (1 commit — Fabian1820, 17:00)

- **`fix(reservas): restaurar flujo de Ventas (carga de oferta, sin filtro de categorías)`** — El dialog unificado rompía el flujo de Ventas en dos formas: (1) filtraba por categorías reservables pero el endpoint `materiales-web` devuelve `categoria=null` → picker siempre vacío; (2) eliminó el panel "Cargar desde oferta de venta". Decisión: el módulo de reservas crea SOLO reservas de Ventas. El botón vuelve al dialog original de Ventas (carga de oferta, sin filtro de categorías) con las mejoras inyectadas (pool=indistinto, stock por sector, warning). La vista Instaladora (`?vista=instaladora`) es solo lectura. **Se elimina `create-reserva-dialog` (912 líneas).**

---

### Puede dar bateo

1. **DOCX Orden de Trabajo — librería sin confirmar en `package.json`**: El commit no menciona la librería usada para generar DOCX (docx.js, officegen, etc.). Si se importa dinámicamente o no está instalada, la descarga fallará silenciosamente en producción.

2. **`precio_contabilidad_cup` — mismo campo puede estar mal nombrado en otros endpoints del módulo**: El fix corrige el campo en la vista de detalle, pero si otros endpoints del mismo módulo usan el nombre incorrecto `precio_contabilidad`, las otras vistas seguirán mostrando "-".

3. **Factura de instaladora sin oferta previa — sin validación de materiales vacíos en backend**: Se elimina la guardia frontend. Si el backend tampoco valida, se puede crear una factura con lista de materiales vacía, lo que puede romper la generación de PDF o el registro contable.

4. **`assertOk` en asignacion-service — callers no actualizados ignoran excepciones**: Los callers ahora deben atrapar excepciones donde antes recibían `{success: false}`. Si algún componente no actualizado llama a estos métodos, los errores serán uncaught promise rejections sin feedback al usuario.

5. **`searchMaterialesConCosto` usa endpoint admin — usuarios no-admin verán 403**: El dialog de asignación usa esta búsqueda para detectar materiales sin costo. Si un almacenero sin privilegios admin abre el dialog, el fetch fallará con 403 y el campo de costo quedará en error o vacío.

6. **Sub-permiso `almacenes-suncar/admin` aditivo — usuarios existentes en BD con solo el padre quedan bloqueados**: Usuarios que tenían `almacenes-suncar` y usaban los botones de entrada/salida manual perderán acceso tras el deploy. Requiere migración de datos en BD para añadir el sub-permiso explícitamente.

7. **`hasExactPermission` — sub-permisos aditivos en otros módulos requieren migración explícita**: El nuevo método se añade solo para almacenes. Otros módulos que usen sub-permisos no marcados como `aditivo` seguirán aplicando herencia padre→hijo sin saberlo.

8. **`detail.faltantes` en error de transferencias — campo sin confirmar en todos los casos de backend**: El service espera `detail.faltantes` en el 400. Si el backend no incluye este campo en todos los escenarios de conflicto de stock, la lista de faltantes aparecerá vacía aunque haya materiales insuficientes.

9. **`create-reserva-dialog` eliminado (912 líneas) — confirmar que ningún módulo lo importaba**: El commit lo describe como huérfano, pero si algún módulo secundario lo importaba por path, recibirá un error de módulo no encontrado en runtime.

10. **Vista Instaladora con `?vista=instaladora` — URL manipulable para ocultar botones de Ventas**: Cualquier usuario puede añadir este parámetro para ver la vista de solo lectura. No es un problema de seguridad si el backend valida, pero puede confundir a usuarios de Ventas que accedan a la URL incorrecta.

---

#### Seguimientos vigentes

- **DOCX Orden de Trabajo — librería sin confirmar en `package.json` (Jun 25)**.
- **`precio_contabilidad_cup` — campo puede estar mal nombrado en otros endpoints del módulo (Jun 25)**.
- **Factura instaladora sin oferta — sin validación de materiales vacíos en backend (Jun 25)**.
- **`assertOk` en asignacion-service — callers no actualizados ignoran excepciones (Jun 25)**.
- **`searchMaterialesConCosto` endpoint admin — usuarios no-admin verán 403 en dialog asignación (Jun 25)**.
- **Sub-permiso `almacenes-suncar/admin` aditivo — usuarios existentes con solo el padre quedan bloqueados (Jun 25)**.
- **`hasExactPermission` — sub-permisos aditivos en otros módulos requieren migración explícita (Jun 25)**.
- **`detail.faltantes` en error de transferencias — campo sin confirmar en todos los casos (Jun 25)**.
- **`create-reserva-dialog` eliminado — confirmar que ningún módulo lo importaba (Jun 25)**.
- **Vista Instaladora `?vista=instaladora` — URL manipulable (Jun 25)**.
- **Reservas expiradas reactivadas — conflicto con materiales reasignados entre expiración y nueva fecha (Jun 23)**.
- **Filtro potencia mín/máx sin validación `min > max` — resultados vacíos sin mensaje (Jun 23)**.
- **Filtros potencia en paneles — unidad ambigua kW vs W en la UI (Jun 23)**.
- **Filtros combinados tipo+potencia — confirmar soporte simultáneo en backend (Jun 23)**.
- **Lista blanca de CIs de pagos hardcodeada en frontend — deploy requerido para cambios (Jun 23)**.
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

## 📅 23 de Junio, 2026

### Resumen de cambios (últimas 24h)

**2 commits** de Fabian1820 y yany1509 — módulo de **Reservas** (Fabian1820): filtros por tipo de equipo y potencia + edición de reservas expiradas; y módulo de **Pagos** (yany1509): restauración del botón de editar cobros con lista blanca por CI y trazabilidad de edición.

---

### Área 1: Reservas — filtros de equipo y edición de expiradas (1 commit — Fabian1820, Jun 22 16:18)

- **`feat(reservas): filtros por tipo de equipo y potencia + editar expiradas`** — UI del listado de reservas expone: select de tipo de equipo (baterías / inversores / paneles); inputs de potencia mín./máx. en kW (deshabilitados sin tipo seleccionado o con tipo=panel); botón "Limpiar" cuando hay algún filtro de equipo activo. El botón de editar aparece también para reservas en estado "expirada", ya que postergar la fecha las reactiva en el backend.

---

### Área 2: Pagos — botón editar con lista blanca y trazabilidad (1 commit — yany1509, Jun 23 15:59)

- **`feat(pagos): restaurar botón editar cobro con trazabilidad`** — Restaura el botón de editar en Facturación › Pagos de clientes, visible solo para usuarios autorizados (Yanaisi y Mauricio). Lista blanca de CIs en `lib/constants/pagos-permisos.ts`. Nuevo componente `PagoTrazabilidad` que muestra quién editó y cuándo. Botón gateado por CI en tabla plana y tabla por ofertas. Tipo `Pago` ampliado con `editado_por`, `editado_por_nombre` e `historial_cambios`.

---

### Puede dar bateo

1. **Reactivación de reservas expiradas — conflicto con materiales reasignados**: Entre la expiración original y la nueva fecha propuesta, el material pudo haber sido asignado a otra reserva activa. El backend debe verificar disponibilidad real al momento de reactivar; si no lo hace, dos reservas activas competirán por el mismo stock.

2. **Filtro de potencia deshabilitado para paneles — unidad ambigua**: Los paneles se miden en W, no kW. La UI muestra el input como "kW" pero lo deshabilita para paneles sin explicar el motivo. Un usuario puede entender que los paneles no son filtrables por potencia.

3. **Inputs de potencia mín/máx sin validación `min > max`**: Si el usuario ingresa un mínimo mayor que el máximo, el backend puede recibir un rango inválido y devolver resultados vacíos sin mensaje de error explicativo.

4. **Filtros combinados tipo+potencia — soporte en backend sin confirmar**: Si el backend procesa los filtros por separado en vez de en una query combinada, la intersección de resultados puede ser incorrecta.

5. **Botón "Limpiar" solo limpia filtros de equipo**: Si hay otros filtros activos (fecha, almacén), el botón solo restablece los de equipo, lo que puede confundir al usuario.

6. **Lista blanca de CIs hardcodeada en frontend**: Los CIs de Yanaisi y Mauricio están en `lib/constants/pagos-permisos.ts`. Agregar o revocar acceso requiere un deploy; no hay gestión dinámica de permisos.

7. **Gating por CI solo en frontend — sin validación en backend**: Cualquier llamada directa al endpoint de edición de cobros omite la lista blanca. Si el backend no valida el permiso, cualquier usuario autenticado puede editar.

8. **`historial_cambios` en tipo `Pago` sin confirmar soporte en backend**: Si el backend no devuelve este campo, `PagoTrazabilidad` mostrará datos vacíos o fallará con un error de tipo en runtime.

9. **Botón editar en tabla plana y tabla por ofertas — riesgo de tercer contexto sin gatear**: Si existe alguna otra vista de cobros no cubierta, usuarios no autorizados verían el botón.

---

## 📅 21 de Junio, 2026

### Resumen de cambios (últimas 24h)

Sin commits nuevos de código. El único commit en el rango de las últimas 24h es "Analisis diario Claude" del 20/06 (generado automáticamente). No hay cambios en producción.

---

### Puede dar bateo

Sin cambios nuevos — sin riesgos nuevos.

---

## 📅 20 de Junio, 2026

### Resumen de cambios (últimas 24h)

Sin commits nuevos de código. El único commit en el rango de las últimas 24h es "Analisis diario Claude" del 19/06 (generado automáticamente). No hay cambios en producción.

---

### Puede dar bateo

Sin cambios nuevos — sin riesgos nuevos.

---

## 📅 19 de Junio, 2026

### Resumen de cambios (últimas 24h)

**1 commit** de Fabian1820 — fix puntual en el módulo de devoluciones: se permite ahora iniciar una devolución sobre vales que ya están en estado "facturado". Hasta hoy, ese estado bloqueaba el flujo de devolución aunque la operación comercial fuera legítima.

---

### Área 1: Devoluciones — permitir devolución en vales facturados (1 commit — Fabian1820, 19:57)

- **`fix(devoluciones): permitir devolución en vales ya facturados`** — Elimina o relaja la validación en frontend que impedía iniciar el flujo de devolución cuando el vale tenía estado `facturado`.

---

### Puede dar bateo

1. **Backend debe aceptar la transición `facturado → con_devolucion`**: Si el backend tiene una guarda de estado que rechaza modificaciones sobre vales facturados, el fix en frontend no es suficiente — el POST/PATCH recibirá un 400/422.
2. **Impacto contable de la devolución sobre factura emitida**: La devolución debería generar una nota de crédito o ajustar el total. Confirmar que el backend lo maneja automáticamente.
3. **Devolución parcial en vales mixtos (algunos ítems facturados, otros no)**.
4. **Badge de estado en la tabla tras devolución — confirmar actualización sin recarga manual**.

---

## 📅 18 de Junio, 2026

### Resumen de cambios (últimas 24h)

**3 commits reales** de Fabian1820 — día enfocado íntegramente en el módulo de **Reservas** de materiales: nuevo dialog unificado `create-reserva-dialog` (+876 líneas), fixes de coherencia en mapas de stock y banners stale, y manejo visible de materiales sin desglose por sector.

---

### Área 1: Módulo Reservas — dialog unificado Ventas+Instaladora (1 commit — Fabian1820, 14:44)

- **`feat(reservas): módulo unificado ventas+instaladora y stock por sector`** (+1226/-116, 23 archivos) — Nuevo componente `create-reserva-dialog` (876 líneas) con tabs por sector. Cálculo de disponible: `max(0, pool_sector - reservado_sector) + max(0, indistinto - reservado_indistinto)`. Siempre envía `pool=indistinto` para activar split automático en el backend. BMS añadida como categoría reservable. Renombrado global: "indistinto" → "Común", "pool" → "sector".

---

### Área 2: Fixes de coherencia y UX (2 commits — Fabian1820, 14:54 y 15:02)

- **`fix(reservas): bugs de coherencia tras code review`** — Mapa `material_id→codigo` también se llena desde catálogo; banner "reservas del cliente" ya no queda stale al cambiar almacén.
- **`fix(reservas): warning visible cuando falta desglose por sector`** — Material sin `.pools` se marca como `sinDesgloseSector`, fila en ámbar, submit bloqueado.

---

### Puede dar bateo

1. **`pool=indistinto` para split automático — backend debe implementarlo**.
2. **Race condition en el cálculo de disponible**.
3. **`sinDesgloseSector` solo detectado en frontend**.
4. **Mapa `material_id→codigo` — race en carga del catálogo**.
5. **Auto-vincular reserva — puede elegir reserva incorrecta si hay múltiples del mismo material**.
6. **BMS como categoría reservable — docs sin `.pools` bloquean el 100% de reservas BMS**.
7. **Módulo `/reservas-ventas` bajo dos entradas — sub-permiso por tab no protegido**.
8. **Renombrado UI "indistinto" → "Común" — confirmar en todos los puntos de display**.
9. **Error inline de race condition — visibilidad en scroll**.
10. **Redeploy de Railway — confirmar auto-deploy activo**.

---

> ⚠️ **Nota de mantenimiento**: Las entradas del **16 y 17 de Junio** fueron eliminadas al superar los 7 días de antigüedad (política de retención semanal). Anteriores eliminadas: 5, 6, 7, 9, 11, 12 y 15 de Junio, 26, 27, 28, 29, 30 de Mayo, 31 de Mayo, 1, 2 y 4 de Junio.
