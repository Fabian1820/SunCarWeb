# Registro de Análisis de Cambios — SunCarWeb

---

## 📅 5 de Agosto, 2026

### Resumen de cambios (últimas 24h)

**3 commits reales** — todos de yany1509. Día activo centrado en el módulo de **Leads**: filtro de fecha con presets + nuevos sub-permisos aditivos, nuevo campo `telefono_adicional_nombre`, y validación estricta de formato de teléfono en los 4 formularios de Leads y Clientes.

---

### Área 1: Leads — filtro de fecha por presets + sub-permisos aditivos (1 commit — yany1509, 13:30)

- **`feat(leads): filtro de fecha por presets + permisos aditivos ocultan botones`** — Reemplaza los dos `<input type="date">` siempre visibles por un Select con presets (Todas las fechas / Hoy / Esta semana / Este mes / Definir rango). Los 3 primeros calculan `fechaDesde`/`fechaHasta` automáticamente en cliente. "Definir rango" muestra los inputs manuales. Declara los sub-permisos de `leads` en el catálogo: `leads/equipo`, `leads/todos`, `leads/crear`, `leads/editar`, `leads/anular`, `leads/convertir`, `leads/fotos`, `leads/exportar` (todos aditivos). Gatea con `hasExactPermission`: "Nuevo Lead" (crear), "Convertir a cliente", "Agregar foto", "Editar" (fila + atajo del diálogo de convertir) y botones de exportar. El botón "Eliminar" (hard delete) no se gatea porque no corresponde 1:1 con `leads/anular`. Backfill previo al commit: los 26 trabajadores con acceso a `leads` recibieron los 5 permisos operativos nuevos vía `scripts/backfill_permisos_leads_aditivos.py`.

---

### Área 2: Leads — nuevo campo telefono_adicional_nombre (1 commit — yany1509, 14:05)

- **`feat(leads): agrega telefono_adicional_nombre (a quien pertenece el numero)`** — Cherry-pick desde dev. Nuevo campo `telefono_adicional_nombre` en `Lead`/`LeadCreateData`/`LeadUpdateData`. Input condicional "¿De quién es ese teléfono?" que aparece solo si hay `telefono_adicional`; se limpia del payload si `telefono_adicional` queda vacío. Se muestra "(nombre)" junto al teléfono adicional en la tabla y en el detalle "Ver Lead". Motivación: patrones detectados en datos de producción donde el nombre se mezclaba como texto libre dentro del campo de número ("58548362 Rosana Marmesa Argüelles", "Fijo: 49418601").

---

### Área 3: Leads y Clientes — validación estricta de formato de teléfono (1 commit — yany1509, 14:49)

- **`feat(leads,clientes): valida formato estricto de telefono en los 4 formularios`** — Nuevo `lib/utils/telefono.ts` compartido: `sanitizarTelefono()` filtra en tiempo real (solo dígitos + "+" inicial opcional) mientras el usuario escribe; `esTelefonoValido()` valida el formato final (`^\+?\d{6,15}$`, mismo patrón que el backend). Aplicado en `create-lead-dialog` / `edit-lead-dialog` / `create-client-dialog` / `edit-client-dialog` para `telefono` y `telefono_adicional`. Antes: el teléfono principal en leads no filtraba nada; `telefono_adicional` en leads permitía espacios/guiones/paréntesis; clientes no filtraba nada. Ahora `validateForm` agrega error de formato además del ya existente de "obligatorio". Placeholders actualizados a "+5351234567". Verificado: tsc --noEmit mismo conteo de errores preexistentes (382), cero errores nuevos.

---

### Puede dar bateo

1. **Botón "Eliminar" (hard delete) sin gatear con permisos — visible para todos los usuarios con acceso a leads**: El commit documenta explícitamente que no se gateó porque "no corresponde 1:1 con `leads/anular`". Esto deja la acción más destructiva del módulo sin control de permisos, accesible para cualquier trabajador que tenga acceso a `leads`, independientemente de su rol.

2. **Backfill de sub-permisos leads — confirmar ejecución exitosa para los 26 trabajadores**: El backfill se ejecutó en producción antes del commit. Si falló silenciosamente para algún trabajador (error de red, CI/documento no encontrado), ese trabajador verá los botones desaparecidos sin haber perdido permisos explícitamente, bloqueando su flujo de trabajo sin mensaje claro.

3. **Filtros de fecha por preset calculados en cliente — desfase timezone**: Los presets "Hoy", "Esta semana" y "Este mes" calculan `fechaDesde`/`fechaHasta` en el navegador del usuario. Si el timezone del cliente difiere del timezone del backend (el backend usa UTC; los usuarios están en Cuba, UTC-5), los filtros pueden incluir o excluir registros del día borde incorrectamente.

4. **`telefono_adicional_nombre` — confirmar soporte en backend (`POST/PATCH /leads/{id}`)**: El campo se agrega al tipo y se envía en el payload. Si el backend no acepta ni persiste `telefono_adicional_nombre`, el campo se enviará, no dará error 422 (depende de la validación del backend), pero se perderá silenciosamente sin confirmación al usuario.

5. **`telefono_adicional_nombre` al limpiar `telefono_adicional` — semántica de campo ausente en PATCH**: El commit limpia el nombre del payload si `telefono_adicional` queda vacío. Si el backend trata la ausencia del campo en un PATCH como "no cambiar" (en vez de "borrar"), un usuario que borre el teléfono adicional dejará el nombre anterior guardado en BD aunque el frontend muestre el campo vacío.

6. **Validación de teléfono `^\+?\d{6,15}$` — confirmar que el patrón es idéntico al del backend**: El commit asume paridad con el patrón del backend. Si el backend usa una expresión diferente o más restrictiva, números que pasan la validación del frontend pueden ser rechazados con error 422 genérico, sin mensaje de usuario apropiado.

7. **`sanitizarTelefono()` modifica el input silenciosamente**: Si un usuario pega un número con formato común (+53 5 123 4567 o 535-123-4567), la función elimina los espacios y guiones sin aviso visual. Puede resultar confuso o percibirse como un bug al ver el campo modificado.

---

## 📅 4 de Agosto, 2026

### Resumen de cambios (últimas 24h)

**1 commit real** — yany1509. Cherry-pick desde dev: nuevo módulo **Distribución de Comerciales** (página, diálogo, hooks y servicio) más filtro/columna de equipo comercial en las tablas de Leads y Clientes, apoyado en el endpoint `comercial-multivalor` descrito como ya en producción.

---

### Área 1: Distribución de Comerciales — nuevo módulo + filtro en Leads y Clientes (1 commit — yany1509, 12:17)

- **`feat(distribucion-comerciales): agrega modulo y filtro de equipo BTB/BTC en Leads y Clientes`** — Cherry-pick aislado desde dev. Incluye: página de Distribución de Comerciales, diálogo de asignación, hooks dedicados y servicio. Además agrega un filtro y columna de "equipo comercial" (BTB/BTC) en las tablas de Leads y Clientes, consumiendo el endpoint de `comercial-multivalor` que ya estaba deployado en producción.

---

### Puede dar bateo

1. **Módulo distribucion-comerciales sin permisos asignados — ningún usuario lo verá hasta que SuperAdmin lo configure**: El nuevo módulo no está en la lista de permisos de ningún trabajador. Necesita ser creado en el panel de módulos y asignado manualmente; hasta entonces es invisible para todos salvo SuperAdmin.

2. **Cherry-pick desde dev — posible arrastre de dependencias no presentes en main**: Igual que con informe-direccion (Ago 3), un cherry-pick "aislado" puede traer imports de tipos, constantes o componentes que solo existen en la rama dev. Con TypeScript errors ignorados en `next.config.mjs`, el módulo puede fallar en runtime sin error de build.

3. **Endpoint `comercial-multivalor` "ya en producción" sin verificar respuesta actual**: El commit asume que el endpoint está listo. Si la forma de la respuesta cambió desde que se escribió el código en dev, o si el campo `equipo_comercial` tiene un nombre distinto en el JSON del backend, la columna aparecerá vacía o causará un error de renderizado silencioso.

4. **Filtro equipo_comercial en Leads y Clientes — dos tablas afectadas por un único commit**: Cualquier bug en la lógica del filtro (p.ej., comparación incorrecta de valores BTB vs BTC) afecta simultáneamente ambas vistas. No hay aislamiento entre módulos.

5. **Diálogo de asignación sin confirmar endpoint de escritura**: El módulo incluye un diálogo para asignar equipo comercial. Si el endpoint `PATCH` correspondiente no existe o espera un formato diferente, las asignaciones fallarán silenciosamente o con error 404/422.

---

## 📅 3 de Agosto, 2026

### Resumen de cambios (últimas 24h)

**6 commits reales** — 4 de yany1509 y 2 de Fabian1820. Día activo centrado en el módulo **informe-direccion**: nuevo módulo comparativo cherry-pickeado desde dev, fix de PDF, sistema de sub-permisos por sección, y actualización del catálogo de módulos. Además dos fixes de UX/export: explicación del botón "Asignar" deshabilitado en asignaciones, y separación del código de material en su propia columna en el Excel de facturas emitidas.

---

### Área 1: Informe dirección — nuevo módulo comparativo a producción (1 commit — yany1509, 17:14)

- **`feat(informe-direccion): agrega módulo de informe comparativo a producción`** — Cherry-pick aislado desde la rama dev: página + MonthPicker + servicios que consumen el nuevo endpoint de KPIs comparativos. El commit describe el cherry-pick como "sin dependencias de otras features en curso en dev".

---

### Área 2: Informe dirección — fix texto espaciado en PDF + selector de secciones (1 commit — yany1509, 17:39)

- **`fix(informe-direccion): corrige texto espaciado en PDF + selector de secciones`** — El carácter "→" no está en WinAnsiEncoding (fuentes estándar de jsPDF), lo que rompía el cálculo de ancho de autoTable y espaciaba cada letra en esas filas. Se reemplaza por "->". De paso, se agrega un checklist para elegir qué secciones incluir en el PDF exportado.

---

### Área 3: Facturas emitidas — código de material en columna propia (1 commit — Fabian1820, 17:52)

- **`fix(facturas-emitidas): código del material en columna propia, sin corchetes`** — El Excel apilaba el código al final del nombre entre corchetes ("INVERSOR FELICITY ON GRID 8KW [10001]"), dejando el dato inutilizable para filtrar o cruzar. Ahora el nombre va solo en "Material" y el código en su propia columna "Código" al lado. Material/Código/Cantidad quedan fuera del merge vertical porque varían por fila física; el resto de columnas se sigue fusionando por factura.

---

### Área 4: Asignaciones — explicar por qué el botón "Asignar" está deshabilitado (1 commit — Fabian1820, 17:52)

- **`fix(asignaciones): explica por qué el botón "Asignar" está deshabilitado`** — El botón se apagaba en silencio; los motivos más frecuentes eran invisibles: escribir en el buscador sin hacer clic en una fila (input con texto pero sin material seleccionado) o material con costo 0 (330 de 609 del catálogo) sin marcar "Permitir costo cero". Ahora se muestra el motivo concreto bajo el botón, tanto en creación como en edición. Además la búsqueda de materiales deja de disfrazar un fallo de red/permisos como "Sin resultados".

---

### Área 5: Informe dirección — sub-permisos por sección (1 commit — yany1509, 19:51)

- **`feat(informe-direccion): sub-permisos por sección del informe`** — Permite dar acceso completo al módulo (todas las secciones) o solo a secciones específicas vía sub-permisos `informe-direccion/<seccion>`, igual que el patrón ya usado en `solicitudes-envio/clientes`. La página solo muestra y deja seleccionar las secciones que el trabajador tiene asignadas.

---

### Área 6: Informe dirección — sub-permisos al catálogo de módulos (1 commit — yany1509, 19:55)

- **`feat(informe-direccion): agrega sub-permisos al catálogo de módulos`** — Completa el commit anterior (2a441e70): el catálogo de módulos se había quedado sin commitear. Sin este commit, el panel de permisos no mostraba los nuevos sub-permisos aunque el RouteGuard ya los chequeaba.

---

### Puede dar bateo

1. **Cherry-pick de informe-direccion desde dev — posible arrastre de dependencias incompletas**: Un cherry-pick "aislado" puede traer imports de tipos, constantes o componentes que solo existen en dev. Si la build de producción no falla en tiempo de compilación (TypeScript errors ignorados en next.config.mjs), el módulo puede romperse en runtime silenciosamente.

2. **Endpoint de KPIs comparativos sin confirmar en backend de producción**: El módulo consume un "nuevo endpoint de KPIs comparativos". Si ese endpoint no está deployado en el backend de producción (`api.suncarsrl.com`), el módulo cargará con error de red inmediatamente al abrir, visible para todos los usuarios con permiso.

3. **Sub-permisos informe-direccion — usuarios con permiso padre sin sub-permisos quedarán sin acceso a secciones**: El patrón de sub-permisos implica que usuarios que ya tenían acceso completo a `informe-direccion` necesitan que se les asignen los sub-permisos de cada sección. Sin migración de datos en backend, verán el módulo en el menú pero ninguna sección dentro.

4. **Ventana de 4 minutos entre commits 5 y 6 (19:51 y 19:55) — build intermedio con RouteGuard sin catálogo**: Si Railway auto-deploy está activo, el commit de sub-permisos en RouteGuard (19:51) hizo deploy antes que el de catálogo (19:55). Durante esos ~4 minutos el RouteGuard chequeaba sub-permisos que el panel de permisos no mostraba, impidiendo asignarlos a nuevos usuarios en ese intervalo.

5. **Selector de secciones en PDF — omisión de secciones del medio puede romper paginación o índice**: El checklist para elegir secciones no documenta qué pasa con la numeración de páginas, el índice o las referencias cruzadas si se omiten secciones intermedias del informe.

6. **`fix(facturas-emitidas)` — Excel con nueva columna "Código" rompe importaciones por posición**: Si hay scripts, macros o flujos que procesan el Excel exportado leyendo por índice de columna (col A, B, C), la inserción de la columna "Código" desplaza todo el layout y rompe esas importaciones silenciosamente.

7. **Merge vertical de columnas por factura — confirmar que los índices de merge no son posicionales**: Si la lógica de merge en `export-service.ts` hardcodea índices de columna en lugar de nombres, el reordenamiento puede aplicar merge a columnas incorrectas en el nuevo layout.

8. **330/609 materiales con costo 0 — UX mejorado pero problema de datos de fondo**: El fix explica el bloqueo correctamente, pero más de la mitad del catálogo sin costo puede causar facturas y costeos incorrectos en otros módulos que no tengan la misma guardia de "costo cero".

---

## 📅 2 de Agosto, 2026

### Resumen de cambios (últimas 24h)

Sin commits nuevos de código. El único commit en las últimas 24h es "Analisis diario Claude" (generado automáticamente). No hay cambios en producción.

---

### Puede dar bateo

Sin cambios nuevos — sin riesgos nuevos.

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

#### Seguimientos vigentes

- **Botón "Eliminar" leads (hard delete) sin gatear con permisos — visible para todos los usuarios con acceso a leads (Ago 5)**.
- **Backfill de sub-permisos leads — confirmar ejecución exitosa para los 26 trabajadores en producción (Ago 5)**.
- **Filtros de fecha por preset calculados en cliente — desfase timezone con backend puede afectar filtros de día borde (Ago 5)**.
- **`telefono_adicional_nombre` — confirmar soporte en endpoints `POST/PATCH /leads/{id}` del backend (Ago 5)**.
- **`telefono_adicional_nombre` al limpiar `telefono_adicional` — confirmar si backend trata ausencia como "no cambiar" o "borrar" (Ago 5)**.
- **Validación de teléfono `^\+?\d{6,15}$` — confirmar paridad exacta con el patrón del backend (Ago 5)**.
- **Módulo distribucion-comerciales sin permisos asignados — invisible para todos hasta configuración en panel (Ago 4)**.
- **Cherry-pick distribucion-comerciales desde dev — posible arrastre de dependencias que rompen en runtime (Ago 4)**.
- **Filtro equipo_comercial en Leads/Clientes — confirmar que el campo llega desde el backend en ambas listas (Ago 4)**.
- **Diálogo de asignación distribucion-comerciales — endpoint PATCH sin confirmar en backend (Ago 4)**.
- **Endpoint de KPIs comparativos sin confirmar en backend de producción — informe-direccion fallará en runtime si no está deployado (Ago 3)**.
- **Sub-permisos informe-direccion — usuarios con permiso padre necesitan sub-permisos asignados o quedarán sin acceso a secciones (Ago 3)**.
- **Cherry-pick informe-direccion desde dev — posible arrastre de dependencias que rompen en runtime aunque no en build (Ago 3)**.
- **Excel facturas-emitidas — nueva columna "Código" rompe importaciones que leen por posición de columna (Ago 3)**.
- **330/609 materiales con costo 0 — costeos y facturas en otros módulos pueden ser incorrectos (Ago 3)**.
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

> ⚠️ **Nota de mantenimiento**: Las entradas del **19, 20 y 21 de Junio** y del **23 de Junio** fueron eliminadas al superar los 7 días de antigüedad (política de retención semanal). La entrada del **26 de Junio** fue eliminada el 4 de Julio al superar los 7 días. La entrada del **28 de Junio** fue eliminada el 6 de Julio al superar los 7 días. La entrada del **29 de Junio** fue eliminada el 7 de Julio al superar los 7 días. La entrada del **30 de Junio** fue eliminada el 8 de Julio al superar los 7 días. Las entradas del **1 y 2 de Julio** fueron eliminadas el 10 de Julio al superar los 7 días. La entrada del **3 de Julio** fue eliminada el 11 de Julio al superar los 7 días. Las entradas del **4 y 5 de Julio** fueron eliminadas el 13 de Julio al superar los 7 días. La entrada del **6 de Julio** fue eliminada el 14 de Julio al superar los 7 días. La entrada del **7 de Julio** fue eliminada el 15 de Julio al superar los 7 días. La entrada del **8 de Julio** fue eliminada el 17 de Julio al superar los 7 días. La entrada del **10 de Julio** fue eliminada el 18 de Julio al superar los 7 días. La entrada del **11 de Julio** fue eliminada el 19 de Julio al superar los 7 días. La entrada del **13 de Julio** fue eliminada el 21 de Julio al superar los 7 días. La entrada del **14 de Julio** fue eliminada el 22 de Julio al superar los 7 días. La entrada del **15 de Julio** fue eliminada el 23 de Julio al superar los 7 días. La entrada del **17 de Julio** fue eliminada el 25 de Julio al superar los 7 días. La entrada del **18 de Julio** fue eliminada el 26 de Julio al superar los 7 días. La entrada del **19 de Julio** fue eliminada el 27 de Julio al superar los 7 días. La entrada del **20 de Julio** fue eliminada el 28 de Julio al superar los 7 días. La entrada del **21 de Julio** fue eliminada el 30 de Julio al superar los 7 días. La entrada del **22 de Julio** fue eliminada el 30 de Julio al superar los 7 días. La entrada del **23 de Julio** fue eliminada el 31 de Julio al superar los 7 días. La entrada del **24 de Julio** fue eliminada el 1 de Agosto al superar los 7 días. La entrada del **25 de Julio** fue eliminada el 2 de Agosto al superar los 7 días. La entrada del **26 de Julio** fue eliminada el 3 de Agosto al superar los 7 días. La entrada del **27 de Julio** fue eliminada el 4 de Agosto al superar los 7 días. La entrada del **28 de Julio** fue eliminada el 5 de Agosto al superar los 7 días. Anteriores eliminadas: 16, 17 y 18 de Junio, 5, 6, 7, 9, 11, 12 y 15 de Junio, y días de Mayo.
