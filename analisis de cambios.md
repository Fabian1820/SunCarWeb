# Registro de Análisis de Cambios — SunCarWeb

---

## 📅 5 de Julio, 2026

### Resumen de cambios (últimas 24h)

**2 commits reales** de Fabian1820 — llegaron a las 23:22 del 4/Jul, después de que se escribió el análisis de ayer: (1) fix para mostrar el nombre real del material (no la descripción) en el export de Instalaciones en Proceso; (2) sistema de permisos granulares por tarjeta dentro del módulo Instalaciones, con los `trabajos:*` anidados visualmente.

---

### Área 1: Instalaciones en Proceso — nombre de material en export (1 commit — Fabian1820, 23:22)

- **`fix(instalaciones): mostrar nombre del material (no descripción) en export en proceso`** — El export de Instalaciones en Proceso mostraba el campo `descripcion` del item de oferta en lugar del nombre real del material. El fix enriquece cada item desde el catálogo (`MaterialService.getAllMaterials`) buscando por código de material, con fallback a `descripcion` y luego al código si el nombre no está disponible. Mismo patrón que el fix de vales de salida del 3 de Julio.

---

### Área 2: Permisos granulares por tarjeta de Instalaciones (1 commit — Fabian1820, 23:22)

- **`feat(permisos): permiso granular por tarjeta de Instalaciones + trabajos:* anidados`** — Cada una de las 7 tarjetas del módulo Instalaciones pasa a ser un sub-permiso asignable independiente con separador `/`: `instalaciones/pendientes-visita`, `instalaciones/en-proceso`, `instalaciones/nuevas`, `instalaciones/trabajos-diarios`, `instalaciones/averias`, `instalaciones/planificacion-diaria-trabajos`, `instalaciones/ordenes-trabajo`. Los sub-permisos `trabajos:*` se muestran anidados visualmente bajo la tarjeta "Trabajos Diarios" en el panel de permisos pero conservan su clave original con `:` y siguen siendo independientes (el padre no los concede en runtime). `getNombresCatalogo` ahora recorre los anidados para mantenerlos sincronizados. `RouteGuard` acepta `string | string[]` y pasa con cualquiera de los permisos. La landing `/instalaciones` muestra solo las tarjetas que el usuario tiene permitidas. Compatibilidad verificada: 22 usuarios con `instalaciones` completo en BD heredan las 7 tarjetas por herencia de prefijo `/`; 17 usuarios con `trabajos:*` conservan acceso sin cambios.

---

### Puede dar bateo

1. **Herencia `instalaciones` → 7 sub-permisos solo en runtime**: Los 22 usuarios con `instalaciones` completo en BD heredan los sub-permisos por lógica de prefijo `/` en runtime, no por registros explícitos en BD. Si esa lógica cambia o falla en edge cases, pierden acceso a las 7 tarjetas sin ninguna migración de BD que los proteja.

2. **Dos separadores de sub-permiso en el mismo sistema (`/` vs `:`)**: Los sub-permisos de instalaciones usan barra (`instalaciones/en-proceso`) mientras que los de trabajos usan dos puntos (`trabajos:montaje`). Dos convenciones distintas en el catálogo aumentan la probabilidad de errores al definir nuevos permisos, buscar en BD o extender el sistema.

3. **`RouteGuard` con `string[]` — semántica OR sin confirmación formal**: El guard pasa si el usuario tiene CUALQUIERA de los permisos del array. Si en alguna ruta la intención era requerir TODOS (AND), el gating es demasiado permisivo. Confirmar que OR es la semántica intencional en cada uso del array.

4. **Landing `/instalaciones` vacía sin mensaje para usuario sin sub-permisos**: Si un usuario no tiene ningún `instalaciones/*` asignado, la landing mostrará la lista de tarjetas vacía sin ningún aviso. Usuarios con rol `instalaciones` padre que aún no tienen sub-permisos asignados verán pantalla en blanco sin saber por qué.

5. **Sub-permisos nuevos no asignados automáticamente desde el panel (SuperAdmin)**: Los 7 `instalaciones/*` se crean en el catálogo pero no se auto-asignan al abrir el panel de permisos de un usuario. Un SuperAdmin que crea un usuario nuevo debe asignarlos manualmente uno a uno, sin agrupación que sugiera "dar acceso completo a Instalaciones".

6. **Export Instalaciones en Proceso — `getAllMaterials()` sin caché explícito**: El fix llama a `getAllMaterials()` en cada apertura del dialog de export para enriquecer los nombres de material. Sin caché, esto genera una llamada completa al catálogo por cada exportación. Si la llamada falla (timeout, 403), el export cae silenciosamente a `descripcion` o código sin ningún aviso al usuario.

---

## 📅 4 de Julio, 2026

### Resumen de cambios (últimas 24h)

**1 commit real** de Fabian1820 — export Excel del módulo **Instalaciones en Proceso** y fix del filtro de fecha en Obras Terminadas.

---

### Área 1: Instalaciones en Proceso + Obras Terminadas (1 commit — Fabian1820, 21:57)

- **`feat(instalaciones): export Excel de instalaciones en proceso + fix filtro fecha obras terminadas`** — Nuevo botón "Exportar Excel" en Instalaciones en Proceso: genera una fila por cliente con código, material y cantidad apilados en el mismo estilo que los demás exports. Los materiales se traen de la oferta confirmada vía `/ofertas/confeccion/cliente/{numero}` (los campos embebidos en el cliente no incluyen los items de la oferta). Respeta los filtros aplicados en pantalla. Fix en Obras Terminadas: el botón "Rango" del filtro de fecha ya no pre-rellena el mes actual; empieza vacío para no aplicar un filtro silencioso que causaba que los exports siempre filtraran por junio.

---

### Puede dar bateo

1. **Export Instalaciones — N+1 llamadas a `/ofertas/confeccion/cliente/{numero}`**: Para cada cliente en la lista se dispara una petición HTTP separada al backend. Con muchos clientes en proceso, esto puede generar decenas de llamadas en paralelo, provocando timeouts, throttling o bloqueo del navegador durante la generación del Excel.

2. **Materiales del export representan la oferta actual, no el momento de instalación**: Si la oferta fue modificada después de iniciar la instalación (cambio de paneles, inversores, cantidades), el Excel mostrará los materiales actuales de la oferta, no los que efectivamente se están instalando. Posible discrepancia contable o de seguimiento.

3. **Filtro "Rango" vacío en Obras Terminadas — export sin cota de fecha**: Al quitar el pre-relleno del mes actual, una exportación sin ningún filtro de fecha trae el historial completo de obras terminadas. Sin paginación forzada en el export, esto puede bloquear el navegador o generar un archivo masivo sin advertencia al usuario.

4. **`fecha_equipo_instalado` solo existe desde mayo 2026**: El filtro de fecha en Obras Terminadas depende de este campo. Obras anteriores a mayo 2026 no aparecen en ningún filtro por fecha aunque existan en el sistema, y el comportamiento es silencioso (sin aviso al usuario de que hay registros ocultos).

5. **Instalación concurrente con cambio de estado**: Si durante la generación del Excel un cliente pasa de "en proceso" a "terminado" (o viceversa), los materiales traídos pueden corresponder a un estado de oferta ya no válido para ese cliente.

---

## 📅 3 de Julio, 2026

### Resumen de cambios (últimas 24h)

**5 commits reales** de Fabian1820 — jornada centrada en el sistema de exportaciones Excel: (1) Mi Tarjeta promovida a producción (quita badge de prueba); (2) fix en vales de salida para mostrar nombre real del material; (3) ciclo completo feat→fix→refactor en exportaciones de Obras Terminadas y Pagos Realizados: primero dos hojas separadas, luego fix de hoja vacía, finalmente consolidación en una sola hoja con materiales apilados.

---

### Área 1: Mi Tarjeta — promovida a producción (1 commit — Fabian1820, 14:40)

- **`chore(mi-tarjeta): quitar badge de fase de prueba`** — El módulo pasa a uso normal. Se retira el banner de aviso del editor y la etiqueta 'Prueba' del menú Mi Perfil. El endpoint `/api/tarjetas/mi-tarjeta` sigue sin confirmación explícita en backend (ver seguimiento Jul 2).

---

### Área 2: Vales de Salida — nombre de material en export Excel (1 commit — Fabian1820, 15:09)

- **`fix(vales-salida): mostrar nombre del material en export Excel`** — La columna "Material" del export enriquece contra el catálogo (`MaterialService.getAllMaterials`) para mostrar el nombre del material, con respaldo a `material_descripcion` o código si el nombre no está disponible.

---

### Área 3: Exportaciones Obras Terminadas y Pagos Realizados — ciclo feat→fix→refactor (3 commits — Fabian1820, 20:17→21:33)

Tres commits en 76 minutos representan una iteración completa de diseño:

1. **`feat(exportaciones): exportar Excel con materiales aparte en Obras Terminadas y Pagos Realizados`** (20:17) — Botón "Exportar Excel" en ambas vistas. Workbook de dos hojas: listado principal + hoja de materiales (código, nombre, cantidad). En Pagos Realizados la hoja de materiales deduplica por solicitud. Lógica extraída a `lib/export-multi-sheet-service.ts`.

2. **`fix(exportaciones): corregir hoja de materiales vacía`** (20:47) — Obras Terminadas: el backend embebe materiales directamente en `/obras-terminadas/datos`; el export los lee desde ahí en vez de hacer N+1 llamadas a `/oferta/detalle`. Pagos Realizados: agrega catálogo `material_id→{codigo, nombre}` de respaldo para materiales con campos opcionales incompletos.

3. **`refactor(exportaciones): usar formato de una sola hoja con materiales apilados`** (21:33) — Reemplaza las dos hojas por el patrón de vales de salida: una fila por obra/pago con código, material y cantidad apilados en la misma fila vía `stackedColumnKeys` de `exportToExcel`. Elimina `lib/export-multi-sheet-service.ts`.

---

### Puede dar bateo

1. **`stackedColumnKeys` en `exportToExcel` sin confirmar**: El refactor usa esta funcionalidad. Si `lib/export-service.ts` no la implementa, el export lanzará error silencioso o vacío en runtime para todos los usuarios.

2. **`lib/export-multi-sheet-service.ts` eliminado en la misma sesión**: Si algún import de otro componente referencia este archivo (o TypeScript lo tiene en caché), habrá crash al compilar o en runtime. El archivo existió menos de una hora; confirmar que no quedaron referencias.

3. **Obras Terminadas — embedding de materiales en backend no confirmado**: El fix asume que `/obras-terminadas/datos` ya embebe los materiales. Si el backend todavía no implementó ese embedding, la columna de materiales quedará vacía en el export sin ningún mensaje de error.

4. **Catálogo de respaldo en Pagos Realizados — fallo silencioso**: Si `MaterialService.getAllMaterials()` falla al cargar, los materiales con campos opcionales incompletos mostrarán código/nombre vacíos sin aviso al usuario.

5. **Diseño final inconsistente con el anuncio inicial**: La feature se documentó como "materiales en hoja separada" y el estado final es "materiales apilados en una columna". El comportamiento exportado cambia radicalmente dentro del mismo día; usuarios que exportaron por la mañana verán un formato distinto por la tarde.

6. **Mi Tarjeta sin badge — backend aún sin confirmar**: Quitar el aviso de fase de prueba sin confirmar que el backend de tarjetas está listo expone errores 404/500 a usuarios normales sin ningún indicador visual de que el feature puede no funcionar.

7. **Vales de salida — `getAllMaterials()` sin caché explícito**: Cada apertura del dialog de export puede disparar una llamada completa al catálogo de materiales. En entornos con muchos materiales, esto genera latencia innecesaria.

---

## 📅 2 de Julio, 2026

### Resumen de cambios (últimas 24h)

**2 commits reales** de Fabian1820 — (1) nueva pantalla de **Tarjeta de Presentación** del trabajador con QR y enlace público editable; (2) mejora al **filtro de comerciales** en Leads para incluir comerciales de ventas de apoyo combinando dos fuentes de datos.

---

### Área 1: Mi Tarjeta — editor de tarjeta de presentación del trabajador (1 commit — Fabian1820, 20:13)

- **`feat(mi-tarjeta): editor de tarjeta de presentación del trabajador`** — Pantalla `/mi-tarjeta` (autenticada) para que el trabajador edite su tarjeta (título, bio, contacto, redes, foto) contra `/api/tarjetas/mi-tarjeta`, con QR y enlace público. Acceso desde el menú "Mi Perfil". Marcado como fase de prueba.

---

### Área 2: Leads — comerciales de ventas de apoyo en filtro (1 commit — Fabian1820, 21:31)

- **`feat(leads): incluir comerciales de ventas de apoyo en filtro`** — El filtro de comercial en la página de leads ahora une el roster de instaladora (`/trabajadores/comerciales`) con los comerciales distintos ya usados en leads (`/leads/comerciales`), para que los comerciales de ventas que están de apoyo aparezcan de forma fiable tras su primer lead, sin listar a todos. Cache subida a v2 para invalidar la lista v1 (solo-instaladora).

---

### Puede dar bateo

1. **Endpoint `/api/tarjetas/mi-tarjeta` sin confirmar en backend**: Si el backend no implementó el endpoint, la pantalla `/mi-tarjeta` fallará con 404 al cargar o al guardar. Toda la funcionalidad de edición queda inutilizable.

2. **Tarjeta pública accesible sin autenticación — exposición de datos del trabajador**: Si el enlace público de la tarjeta no requiere auth, contacto personal, redes sociales y bio quedan expuestos públicamente. Confirmar que el diseño intencional es público antes de desplegar en producción.

3. **Tarjeta no editada con enlace público activo**: Si un trabajador nunca editó su tarjeta pero el QR/enlace ya existe, el backend puede devolver una respuesta vacía, 404 o datos por defecto incorrectos, confundiendo a quien reciba el QR antes de que el trabajador lo configure.

4. **Fase de prueba sin gating de permiso**: El módulo está marcado como "fase de prueba" pero es accesible desde el menú "Mi Perfil" para cualquier usuario autenticado. Sin un feature flag o permiso específico, todos los usuarios podrán usarlo de inmediato.

5. **Deduplicación de comerciales entre ambas fuentes del filtro**: Si un comercial de ventas aparece tanto en `/trabajadores/comerciales` como en `/leads/comerciales` (por ya tener leads propios), puede aparecer duplicado en el filtro si no hay deduplicación explícita por nombre o CI.

6. **Comerciales dados de baja persisten en el filtro**: El endpoint `/leads/comerciales` devuelve cualquier nombre que alguna vez fue comercial en un lead. Comerciales inactivos o desvinculados seguirán apareciendo en el filtro sin indicación de que ya no están activos.

7. **Fallo parcial silencioso si uno de los dos endpoints cae**: Si `/leads/comerciales` o `/trabajadores/comerciales` devuelve error, el filtro puede mostrar solo la fuente que funcionó o quedar vacío sin mensaje explicativo al usuario.

8. **Cache v2 sin estrategia de rollback en cliente**: Subir la versión del cache invalida la lista v1. Si el nuevo comportamiento combinado tiene un bug, revertir requiere bajar el número de versión en código y un nuevo deploy, sin mecanismo de rollback en caliente.

---

## 📅 1 de Julio, 2026

### Resumen de cambios (últimas 24h)

Sin commits nuevos de código. Los 2 commits de Fabian1820 sobre el módulo Movimientos (18:31 y 18:44 del 30 de Junio) ya fueron registrados en la entrada anterior. El único commit propio de este período es "Analisis diario Claude" (generado automáticamente).

---

### Puede dar bateo

Sin cambios nuevos — sin riesgos nuevos.

---

## 📅 30 de Junio, 2026

### Resumen de cambios (últimas 24h)

**2 commits** de Fabian1820 — módulo **Movimientos de Inventario**: se agrega la columna Estado con badge de color en tabla, diálogo de detalle y exportación Excel; y se corrige `normalizeMovimiento` para propagar correctamente `estado` y `motivo_error` al componente desde el backend (antes se omitían aunque el backend los enviara).

---

### Área 1: Movimientos — estado en tabla, detalle y Excel (2 commits — Fabian1820, 18:31 y 18:44)

- **`feat(movimientos): mostrar estado del movimiento en tabla, detalle y Excel`** (18:31) — Nueva columna Estado con badge de color en la tabla de movimientos. El diálogo de detalle incluye `estado` y `motivo_error`. La exportación a Excel incorpora ambos campos como columnas adicionales. Archivos: `app/almacenes/[almacenId]/page.tsx`, `components/feats/inventario/movimientos-table.tsx`, `lib/types/feats/inventario/inventario-types.ts`.

- **`fix(movimientos): incluir estado y motivo_error en normalizeMovimiento`** (18:44) — La función `normalizeMovimiento` en `lib/services/feats/inventario/inventario-service.ts` construía el objeto manualmente omitiendo estos campos, por lo que nunca llegaban al componente aunque el backend los enviara. Sin este fix el feat anterior producía la columna siempre vacía.

---

### Puede dar bateo

1. **`estado` sin valor en movimientos históricos**: Registros anteriores a la implementación del campo pueden devolver `estado` como `null`/`undefined`. Si el badge no tiene fallback visual, aparecerá una celda rota o en blanco en la tabla para todos esos movimientos.

2. **`motivo_error` mostrado en estados no-error**: El diálogo muestra el campo siempre. Para movimientos exitosos donde el backend devuelve `null` o `""`, puede aparecer una sección "Motivo de Error" vacía que confunde al usuario.

3. **Excel con nueva columna — desplazamiento en importaciones fijas**: Si algún flujo externo consume el Excel de movimientos esperando columnas en posiciones fijas, la nueva columna Estado (y motivo_error) desplazará las existentes y romperá esas importaciones.

4. **Orden de deploy feat → fix**: El commit feat (18:31) precede al fix (18:44). Si el deploy se aplicó parcialmente entre ambos pushes, los usuarios habrían visto la columna Estado siempre vacía durante ese intervalo.

---

## 📅 29 de Junio, 2026

### Resumen de cambios (últimas 24h)

**1 commit real** de yany1509 — fix en el módulo de **Cobros**: el pendiente y el comprobante de pago ahora descuentan correctamente la compensación y el monto asumido por la empresa antes de calcular lo que queda por cobrar.

---

### Área 1: Cobros — descontar compensación y monto asumido del pendiente (1 commit — yany1509, 19:02)

- **`fix(cobros): descontar compensación y monto asumido del pendiente y comprobante`** — `OfertaConPagos` ahora incluye los campos `compensacion` y `asumido_por_empresa`. Nuevo helper `getBaseACobrar = precio_final - compensación - asumido`. Las tablas de cobros calculan el pendiente sobre la base neta. El comprobante muestra tres líneas adicionales: Compensación / Asumido por Empresa / Monto a Cobrar para que los montos cuadren visualmente.

---

### Puede dar bateo

1. **`compensacion`/`asumido_por_empresa` sin confirmar en backend**: El frontend ahora espera estos campos en la respuesta de `OfertaConPagos`. Si el backend no los incluye aún (o los devuelve como `null`/`undefined`), `getBaseACobrar` calculará `NaN`, rompiendo el display del pendiente en todas las filas de cobros.

2. **Cobros históricos sin los campos nuevos**: Registros creados antes de este deploy no tendrán `compensacion` ni `asumido_por_empresa` en la respuesta. Si el helper no maneja `null` con un fallback a `0`, todos los cobros históricos mostrarán montos incorrectos o `NaN`.

3. **Base a cobrar negativa sin validación**: Si `compensación + asumido_por_empresa > precio_final` (por error de entrada o sin validación en backend), `getBaseACobrar` devuelve un valor negativo. El pendiente aparecería negativo sin ningún aviso al usuario.

4. **Líneas del comprobante con valor cero visibles**: El comprobante siempre muestra las tres líneas nuevas. Para cobros sin compensación ni monto asumido, aparecerán líneas "Compensación: 0" y "Asumido por Empresa: 0", que pueden confundir al cliente si no hay lógica para ocultarlas cuando son cero.

5. **Posible doble descuento si compensación ya se aplicaba en precio_final**: Si el backend ya restaba la compensación al calcular `precio_final`, ahora el frontend la volvería a restar. Confirmar con el equipo de backend que `precio_final` es el bruto antes de descuentos.

---

## 📅 28 de Junio, 2026

### Resumen de cambios (últimas 24h)

Sin commits nuevos de código. No hay cambios en producción.

---

### Puede dar bateo

Sin cambios nuevos — sin riesgos nuevos.

---

#### Seguimientos vigentes

- **Herencia `instalaciones` → 7 sub-permisos solo en runtime, no persistida en BD — migración necesaria si la lógica de prefijo cambia (Jul 5)**.
- **Dos separadores de sub-permiso (`/` e `:`) — inconsistencia en el catálogo de permisos (Jul 5)**.
- **`RouteGuard` con `string[]` — confirmar semántica OR vs AND en cada ruta (Jul 5)**.
- **Landing `/instalaciones` vacía sin mensaje para usuario sin sub-permisos asignados (Jul 5)**.
- **Export Instalaciones en Proceso — `getAllMaterials()` sin caché en lookup de nombre de material (Jul 5)**.
- **Export Instalaciones en Proceso — N+1 llamadas a `/ofertas/confeccion/cliente/{numero}` (Jul 4)**.
- **Materiales del export de Instalaciones representan la oferta actual, no el momento de instalación (Jul 4)**.
- **Filtro "Rango" vacío en Obras Terminadas — export completo sin cota de fecha (Jul 4)**.
- **`fecha_equipo_instalado` — campo solo existe desde mayo 2026, obras previas invisibles en filtros de fecha (Jul 4)**.
- **`stackedColumnKeys` en `exportToExcel` — verificar implementación en `lib/export-service.ts` (Jul 3)**.
- **`lib/export-multi-sheet-service.ts` eliminado — confirmar sin imports residuales (Jul 3)**.
- **Obras Terminadas export — embedding de materiales en `/obras-terminadas/datos` sin confirmar en backend (Jul 3)**.
- **Mi Tarjeta fuera de fase de prueba — confirmar backend `/api/tarjetas/mi-tarjeta` listo para producción (Jul 3)**.
- **Vales de salida — `getAllMaterials()` puede generar llamadas sin caché al abrir export (Jul 3)**.
- **Endpoint `/api/tarjetas/mi-tarjeta` — confirmar implementación en backend (Jul 2)**.
- **Tarjeta pública sin auth — confirmar política de visibilidad intencional (Jul 2)**.
- **Deduplicación de comerciales entre `/trabajadores/comerciales` y `/leads/comerciales` (Jul 2)**.
- **Comerciales dados de baja persisten en filtro de leads (Jul 2)**.
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

> ⚠️ **Nota de mantenimiento**: Las entradas del **19, 20 y 21 de Junio** y del **23 de Junio** fueron eliminadas al superar los 7 días de antigüedad (política de retención semanal). La entrada del **26 de Junio** fue eliminada el 4 de Julio al superar los 7 días. Anteriores eliminadas: 16, 17 y 18 de Junio, 5, 6, 7, 9, 11, 12 y 15 de Junio, y días de Mayo.
