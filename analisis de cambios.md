# Registro de Análisis de Cambios — SunCarWeb

---

## 📅 26 de Junio, 2026

### Resumen de cambios (últimas 24h)

**12 commits reales** de Fabian1820, yany1509 y Ruben0304 — día de alta actividad en tres frentes paralelos: (1) módulo completo de **Asistencia** de personal; (2) mejoras al módulo de **Inventario** (referencias legibles + export Excel de movimientos); (3) fixes en **Transferencias** (UI de faltantes al aprobar); (4) rollback de diseño en **Reservas** (restaurar flujo Ventas, eliminar dialog unificado); (5) subpermiso aditivo en **Almacenes**; (6) cuatro commits en **Facturas Solar-Carros** (contabilidad + DOCX + buscador + fix sin oferta); (7) grafo de conocimiento Graphify del código fuente.

---

### Área 1: Módulo Asistencia — control de llegada del personal (1 commit — Ruben0304, 14:08)

- **`feat(asistencia): módulo completo de control de llegada del personal`** — Página `/asistencia` con tabs "Ahora mismo" y "Reporte del día". Panel en tiempo real con grid de trabajadores presentes. Tabla de reporte diario con entrada, salida, horas y estado. Diálogo para marcar entrada/salida manualmente desde el admin. Hook `use-asistencia` con carga automática. Módulo registrado en catálogo (grupo recursos-humanos).

---

### Área 2: Graphify — grafo del código fuente (1 commit — Ruben0304, 14:29)

- **`feat(graphify): knowledge graph del código fuente de SunCarAdmin`** — 4,548 nodos · 14,486 edges · 223 comunidades. God nodes: Button (268), useToast (224), apiRequest (222). Artefactos subidos: `graph.html`, `graph.json`, `GRAPH_REPORT.md`.

---

### Área 3: Transferencias — feedback de error con lista de faltantes (2 commits — Fabian1820)

- **`feat(transferencias): mostrar feedback de error al aprobar con lista de faltantes`** (Jun 25, 19:02) — Service lanza si `success===false`; aprobar adjunta `detail.faltantes`. La tabla muestra toast destructivo y lista cada material en falta con foto, código, nombre y cantidades.
- **`fix(transferencias): limpiar estado de faltantes entre diálogos y ocultar botón aprobar tras fallo`** (Jun 26, 16:34) — Tras fallo de aprobación, el diálogo deja solo el botón Cerrar. Limpieza de faltantes/comentario al abrir cualquier diálogo y al cancelar.

---

### Área 4: Permisos — subpermiso almacenes-suncar/admin aditivo (1 commit — Fabian1820, Jun 25 18:21)

- **`feat(permisos): subpermiso almacenes-suncar/admin aditivo (no heredado del padre)`** — Nuevo flag `SubPermiso.aditivo`. Tener el módulo padre `almacenes-suncar` ya no concede los botones de entrada/salida manual. Nuevo `hasExactPermission` en auth-context (membresía exacta, sin herencia padre→hijo).

---

### Área 5: Asignaciones — alerta costo cero + errores sin falsos positivos (1 commit — Fabian1820, Jun 25 18:19)

- **`fix(asignaciones): alerta precisa de costo cero + manejo de errores sin falsos positivos`** — `searchMaterialesConCosto` (endpoint admin) para detectar materiales sin costo. Helper `assertOk` en todos los mutadores de `asignacion-service` para que errores 400/401/404/500 dejen de mostrarse como éxitos.

---

### Área 6: Reservas — restaurar flujo de Ventas (1 commit — Fabian1820, Jun 25 21:00)

- **`fix(reservas): restaurar flujo de Ventas (carga de oferta, sin filtro de categorías)`** — El diálogo unificado creado hace ~8 días rompía Ventas: filtraba por categorías reservables (pero `categoria=null` en endpoint `materiales-web`), y eliminó el panel "Cargar desde oferta de venta". Decisión: Reservas crea SOLO reservas de Ventas. Vista Instaladora (`?vista=instaladora`) es solo lectura. Diálogo unificado eliminado.

---

### Área 7: Facturas Solar-Carros (4 commits — yany1509, Jun 25)

- **`feat(facturas-solar-carros): agregar código/precio contabilidad en vista y botón Orden de Trabajo DOCX`** (15:38) — Campos `codigo_contabilidad` y `precio_contabilidad` en tipo API y vista. Genera y descarga Orden de Trabajo en DOCX fiel al template oficial (12 columnas, cabecera, firma, fecha).
- **`fix(facturas-solar-carros): corregir nombre de campo precio_contabilidad_cup`** (15:58) — El backend devuelve `precio_contabilidad_cup`, no `precio_contabilidad`. El campo incorrecto causaba que el precio siempre mostrara "-".
- **`feat(facturas-solar-carros): buscador por cliente y filtros de fecha en Facturas Creadas`** (16:03).
- **`fix(facturas-solar-carros): permitir crear factura de instaladora sin oferta previa`** (16:07) — Elimina el bloqueo que impedía abrir el preview cuando el cliente no tiene materiales/componentes.

---

### Área 8: Inventario — referencia legible + export Excel de movimientos (1 commit — Fabian1820, Jun 26 18:05)

- **`feat(inventario): referencia legible, detalle y export Excel de movimientos`** — Historial de movimientos: columna Referencia y detalle usan `referencia_label` en vez del ObjectId. Modal muestra datos del documento origen. Botón "Exportar Excel" exporta todos los movimientos filtrados omitiendo paginación (lotes de 200). Export de vales de salida: código del material en columna propia.

---

### Puede dar bateo

1. **Módulo Asistencia — endpoints de backend sin confirmar**: El hook `use-asistencia` llama a endpoints del backend. Si aún no están implementados o los nombres de rutas difieren, el módulo fallará con 404/500 al cargar. Especialmente el marcado manual entrada/salida desde admin.

2. **`graph.html` y `graph.json` en main — artefactos pesados**: Con 4,548 nodos y 14,486 edges, estos archivos probablemente ocupen varios MB. Engordan el repo sin aportar a producción. Considerar moverlos a una rama separada o `.gitignore`.

3. **Export Excel de movimientos sin cota máxima**: "Lotes de 200" describe cómo se paginan las peticiones al backend, no un límite total. Un almacén con miles de movimientos puede generar una descarga que bloquee el navegador o agote la memoria del cliente.

4. **`referencia_label` en movimientos históricos**: Movimientos creados antes de que el backend añadiera este campo mostrarán `undefined` o vacío en la columna Referencia. Confirmar que el backend migró o rellena el campo para docs históricos.

5. **Detalle de movimiento — llamada adicional por tipo de documento**: El modal de detalle llama al documento origen (vale, solicitud, transferencia). Si no existen endpoints para todos los tipos de referencia, algunos modales lanzarán errores sin mensaje explicativo al usuario.

6. **`hasExactPermission` — usuarios con almacenes-suncar sin subpermiso admin explícito en BD**: Usuarios que actualmente tienen `almacenes-suncar` en BD sin el subpermiso `admin` explícito perderán acceso a los botones de entrada/salida manual tras este deploy. Requiere migración o re-asignación de permisos.

7. **`assertOk` en asignaciones — errores antes silenciosos ahora lanzan**: Componentes que usaban el service de asignaciones sin bloque try/catch (porque `apiRequest` no relanzaba) pueden ahora mostrar crashes o pantallas en blanco. Confirmar que todos los consumidores del service manejan errores.

8. **`searchMaterialesConCosto` — endpoint admin, 403 para no-admins**: El dialog de asignación usa este endpoint. Si un usuario sin permiso admin accede, recibirá 403 y el picker de materiales quedará vacío sin mensaje explicativo de por qué no hay resultados.

9. **Decisión Reservas — Instaladora solo lectura sin alternativa**: Si el flujo de negocio requiere en el futuro que la instaladora cree reservas directamente (no desde una oferta de Ventas), no hay diálogo disponible; habría que reconstruirlo desde cero.

10. **DOCX Orden de Trabajo — generación en cliente**: La generación de DOCX ocurre en el navegador. En facturas con muchos materiales o navegadores con memoria limitada, la generación puede fallar silenciosamente (sin mensaje de error al usuario).

11. **`precio_contabilidad_cup` — facturas históricas**: El fix corrige el campo para nuevas cargas. Facturas creadas antes que tengan el campo con nombre incorrecto en BD seguirán mostrando "-" a menos que el backend haga una migración.

12. **Factura instaladora sin materiales — validación en backend**: El fix elimina el bloqueo en frontend para abrir el preview sin materiales. Si el backend valida que la factura no puede estar vacía al momento del submit, el error se aplaza pero no se elimina.

---

#### Seguimientos vigentes

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

### Área 1: Reservas — filtros de equipo y edición de expiradas (1 commit — Fabian1820)

- **`feat(reservas): filtros por tipo de equipo y potencia + editar expiradas`** — Select de tipo de equipo; inputs de potencia mín/máx en kW; botón "Limpiar". Botón de editar visible también para reservas en estado "expirada".

---

### Área 2: Pagos — botón editar con lista blanca y trazabilidad (1 commit — yany1509)

- **`feat(pagos): restaurar botón editar cobro con trazabilidad`** — Lista blanca de CIs en `lib/constants/pagos-permisos.ts`. Nuevo componente `PagoTrazabilidad`. Tipo `Pago` ampliado con `editado_por`, `editado_por_nombre` e `historial_cambios`.

---

### Puede dar bateo

1. **Reactivación de reservas expiradas — conflicto con materiales reasignados**.
2. **Inputs de potencia mín/máx sin validación `min > max`**.
3. **Filtro de potencia para paneles — unidad ambigua (kW vs W)**.
4. **Filtros combinados tipo+potencia — soporte en backend sin confirmar**.
5. **Botón "Limpiar" solo limpia filtros de equipo**.
6. **Lista blanca de CIs hardcodeada en frontend — deploy para cambios**.
7. **Gating por CI solo en frontend — sin validación en backend**.
8. **`historial_cambios` en tipo `Pago` sin confirmar soporte en backend**.
9. **Botón editar en contextos adicionales no cubiertos por el gateo**.

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

**1 commit** de Fabian1820 — fix puntual en el módulo de devoluciones: se permite ahora iniciar una devolución sobre vales que ya están en estado "facturado".

---

### Área 1: Devoluciones — permitir devolución en vales facturados (1 commit — Fabian1820, 19:57)

- **`fix(devoluciones): permitir devolución en vales ya facturados`** — Elimina o relaja la validación en frontend que impedía iniciar el flujo de devolución cuando el vale tenía estado `facturado`.

---

### Puede dar bateo

1. **Backend debe aceptar la transición `facturado → con_devolucion`**.
2. **Impacto contable de la devolución sobre factura emitida — nota de crédito**.
3. **Devolución parcial en vales mixtos (algunos ítems facturados, otros no)**.
4. **Badge de estado en la tabla tras devolución — confirmar actualización sin recarga manual**.

---

> ⚠️ **Nota de mantenimiento**: Las entradas del **16, 17 y 18 de Junio** fueron eliminadas al superar los 7 días de antigüedad (política de retención semanal). Anteriores eliminadas: 5, 6, 7, 9, 11, 12 y 15 de Junio, y días de Mayo.
