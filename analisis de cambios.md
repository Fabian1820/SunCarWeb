# Registro de Análisis de Cambios — SunCarWeb

---

## 📅 22 de Septiembre, 2026

### Resumen de cambios (últimas 24h)

**10 commits reales** — yany1509 / Fabian1820 (todos co-authored Claude Sonnet 5). Día activo con fixes críticos de autenticación y UX, dos nuevas funcionalidades y varios fixes de UI. Áreas: **auth con intercepción universal de 401** (1), **leads con provincia/municipio obligatorios y aviso de error de conversión** (1), **ventas con cálculo correcto de totales** (1), **PDF de trabajos diarios** (1), **historial con conteo de equipos por provincia** (1), **rediseño de inicio de planificación** (1), **fix de body bloqueado en wallet** (1), **fix de etiqueta en planificación** (1), **fix visual de dashboard** (1), **unificación de diseño de instaladores** (1).

---

### Área 1: fix(auth) — Interceptor de 401 generalizado (15:21)

- **`fix(auth): forzar login ante cualquier 401, no solo mensajes de token expirado/inválido`** — El interceptor en `lib/api-config.ts` solo reaccionaba cuando el cuerpo del 401 contenía "token" + "expirado"/"inválido". Las sesiones revocadas por CI (`POST /api/auth/cerrar-sesiones`) devuelven 401 con mensaje "Sesión cerrada...", que no matcheaba; el panel seguía funcionando aunque el backend rechazara todas las peticiones.

  Ahora cualquier respuesta 401 fuerza la limpieza de localStorage y recarga al login. El login en sí nunca pasa por este interceptor, por lo que el flujo de autenticación no se ve afectado.

---

### Área 2: fix(leads) — Provincia y municipio obligatorios, aviso de error de conversión (15:01)

- **`fix(leads): exigir provincia y municipio, y mostrar cuándo falló la conversión automática`** — Un lead sin municipio bloqueaba en silencio la conversión automática a cliente al pagar. El formulario dejaba guardar leads sin ese dato, y el vacío llegaba tarde al pipeline cuando ya había un pago pendiente.

  `create-lead-dialog.tsx` y `edit-lead-dialog.tsx` ahora validan `provincia_montaje` y `municipio` como campos requeridos. La tabla y detalle de leads muestran un aviso ámbar cuando el backend registró que la conversión automática no prosperó (`ultimo_error_conversion_automatica`).

---

### Área 3: fix(ventas) — Total facturado sumaba mal los aumentos (15:21)

- **`fix(ventas): "Total facturado" de Facturas emitidas no sumaba los aumentos`** — El cálculo del total en la vista de Facturas emitidas no incluía los aumentos en el acumulado. Corregido.

---

### Área 4: feat(trabajos-diarios) — Descargar PDF de un trabajo y de todo el día (13:14)

- **`feat(trabajos-diarios): descargar el informe PDF de un trabajo y el de todo el dia`** — Nuevo servicio `trabajos-diarios-service.ts` que llama al backend para generar PDFs. Botón de descarga en `trabajos-diarios-todos-view.tsx` (PDF del día completo) y en `inicio-planificacion.tsx` (PDF de un trabajo individual).

---

### Área 5: feat(historial) — Tabla de provincias con conteo de equipos (12:07)

- **`feat(historial): la tabla de provincias suma cuántos clientes tienen inversor, batería y paneles`** — La vista de historial por provincias ahora suma el total de clientes con cada tipo de equipo (inversor, batería, paneles) por provincia, visible en columnas adicionales de la tabla.

---

### Área 6: feat(planificacion) — Rediseño de vista de inicio (11:50)

- **`feat(planificacion): rediseña la vista de inicio con el lenguaje de Brigadas`** — La pantalla de entrada del módulo de Planificación adopta el mismo lenguaje visual y de componentes que el módulo de Brigadas: tarjetas, acciones y navegación alineadas.

---

### Área 7: fix(wallet) — Body desbloqueado al crear banco (12:12)

- **`fix(wallet): evita que el body quede bloqueado al crear un banco desde el dropdown`** — Abrir el modal de creación de banco desde el dropdown dejaba el scroll global del body bloqueado. Corregido.

---

### Área 8–10: Fixes de UI menores (11:50–13:14)

- `fix(planificacion)`: etiqueta "instalación en proceso" pasa de contorno a relleno.
- `fix(dashboard)`: unifica el tono de color por pestaña de módulos.
- `fix(instaladores)`: diseño de "Gestionar Instaladores" unificado con el de Brigadas.

---

### Puede dar bateo

1. **fix(auth) 401 universal — riesgo de logout ante 401 de permisos**: Ahora CUALQUIER 401 fuerza logout. Si algún endpoint devuelve 401 por falta de permiso de módulo (no por token inválido/revocado), el usuario recibirá un logout inesperado durante el uso normal. Confirmar que ningún endpoint del backend devuelve 401 por autorización de recurso y no de sesión (esos deberían ser 403).

2. **fix(leads) provincia/municipio obligatorios — leads existentes sin esos campos**: Al editar un lead que fue creado sin municipio, el formulario ahora bloqueará el guardado hasta que se llene ese campo. Leads en pipeline activo sin esos datos necesitarán actualización manual antes de poder editarse.

3. **feat(trabajos-diarios) PDF — confirmar endpoints en backend de producción**: El servicio `trabajos-diarios-service.ts` llama al backend para generar los PDFs. Si el endpoint de generación de PDF no está deployado, el botón devolverá error al pulsar.

4. **feat(historial) tabla de provincias — confirmar campos de equipos en respuesta del backend**: Las columnas de conteo por equipo (inversor, batería, paneles) dependen de que el endpoint devuelva esos campos. Si el backend no los incluye, aparecerán vacíos o en 0 sin aviso.

5. **feat(planificacion) rediseño de inicio — usuarios habituados a la interfaz anterior**: Cambio visual significativo de la pantalla de entrada. Si hay usuarios que usan la planificación a diario, puede generar confusión temporal.

---

## 📅 17 de Septiembre, 2026

### Resumen de cambios (últimas 24h)

**12 commits reales** — yany1509 (todos). Día muy activo concentrado en mejoras visuales y nuevas funcionalidades: **rediseño iterativo del módulo Contabilidad** en Informe de Dirección (3 commits), **módulo Historial/Clientes por UEB** (2 commits), **Operaciones con acceso directo a tarjetas** (1), **Leads con conversión sin pago** (1), **Clientes internos con precio 0** (1), **Comercial seleccionable en editar cliente** (1), **adjuntos con cualquier tipo de archivo** (2 commits), y **edición de datos salariales en Nómina** (1).

---

### Área 1: feat/fix(informe-direccion) × 3 — Rediseño iterativo de Contabilidad (19:16–19:48)

- **Tablero oscuro tipo marcador**: reemplaza las 3 tarjetas sueltas de resumen. Ingresos/Gastos/Saldo son segmentos clicables; Ingresos activo por defecto. Pastel de distribución por categoría a la izquierda + detalle a la derecha. El detalle se adapta solo: una categoría de una sola persona va directamente a movimientos sin agrupar; una con un solo tipo de ingreso agrupa por persona sin ofrecer "Por tipo".

- **Paleta de marca y gráfico de tendencia**: tarjetas con paleta SunCar 2026 (Clean Current, Solar Radiance, Midnight Voltage), chips de icono, pastel rediseñado con leyenda lateral y separación blanca entre porciones. Nuevo gráfico de líneas con tendencia de los últimos 6 meses al lado del pastel en Ingresos y sobre la tabla en Gastos.

- **Barra de filtros compacta**: una sola fila, sin etiquetas sueltas, "Rango" en lugar de "Rango personalizado", botón Actualizar como icono. Blindaje de respuesta inesperada del backend: si llega un 400 en forma de objeto de error, muestra toast en lugar de vista en blanco.

---

### Área 2: feat/fix(historial/clientes) × 2 — Vista por UEB (20:06–20:14)

- **Módulo renombrado a "Clientes"**: La pestaña "Por equipos" es ahora la vista por defecto. Entrada jerárquica: UEB (Instaladora Habana / UEB Las Tunas / UEB Santa Clara) → inversores de esa UEB → lista de clientes → historial del cliente. La pestaña "Por clientes" permanece igual.

- **Inversores en tabla**: Foto, nombre, marca, potencia, clientes y unidades por fila (antes era vista de tarjetas).

---

### Área 3: feat(operaciones) — Acceso directo a tarjetas de Instalaciones (20:29)

- **Visitas, Instalaciones en Proceso, Instalaciones Nuevas, Trabajos Diarios y Averías** pasan a ser tarjetas independientes en Operaciones en lugar de vivir agrupadas dentro de la tarjeta "Instalaciones" (que ahora se oculta). Planificación Diaria de Trabajos y Órdenes de Trabajo también ocultas. Mismas claves de permiso `instalaciones/<id>` de siempre.

---

### Área 4: feat(leads) — Convertir a cliente sin pago con justificación (20:06)

- Nuevo check **"Pago registrado"** en el diálogo de conversión. Para quien tenga el subpermiso aditivo `leads/convertir-sin-pago`, aparece un campo de justificación obligatorio que permite convertir igual sin que haya pago registrado. Complementa la conversión automática por pago del backend.

---

### Área 5: feat(clientes) — Comercial seleccionable (20:06)

- El campo Comercial en editar de Clientes pasa de texto libre a un `select` que combina trabajadores con cargo Comercial Instaladora y los valores ya usados en Leads (`useComercialesList`). Mismo patrón que editar de Leads.

---

### Área 6: feat(clientes-ventas) — Precio 0 para clientes internos (19:38)

- Switch **"Cliente interno (precio siempre en 0)"** en el formulario de cliente de ventas. El preview de oferta/solicitud muestra `$0.00` con badge "Cliente interno - precio 0" en lugar del precio de catálogo, para que coincida con lo que el backend guardará.

---

### Área 7: feat/fix(clientes) × 2 — Adjuntar cualquier tipo de archivo (16:10–16:14)

- El input de adjuntos ya **no restringe el tipo de archivo** (`accept` quitado) para alinearse con lo que el backend acepta ahora. Fix previo: renombrado del ítem del menú de "Agregar fotos" a "Adjuntar archivo foto o video".

---

### Área 8: feat(contabilidad) — Pastel 3D con etiquetas (20:24)

- El pastel plano de Recharts es reemplazado por **SVG a mano con perspectiva 3D**: elipse con pared extruida, piso visual del 3.5% por porción para que ninguna sede desaparezca, etiquetas sobre el gráfico con líneas guía izquierda/derecha sin solapamientos. En pantallas estrechas el pastel se encoge y los nombres pasan a leyenda.

---

### Área 9: feat(recursos-humanos) — Editar datos salariales en Nómina (15:17)

- Permite **editar salario, alimentación, estímulos y días trabajables** directamente en la vista de Nómina.

---

### Puede dar bateo

1. **feat(operaciones) tarjetas directas — permisos en backend**: Las tarjetas de Instalaciones ahora se acceden directamente. Si el backend valida permisos específicos por `instalaciones/<id>` y algún usuario no tenía el permiso por la tarjeta agrupadora, puede ver el acceso directo pero recibir 403 al entrar.

2. **feat(leads) `leads/convertir-sin-pago` — confirmar entrada en `MODULOS_CATALOGO`**: Si el subpermiso no está registrado en el catálogo, no será asignable desde Gestión de Permisos y nadie podrá usar la funcionalidad de conversión sin pago aunque el código esté deployado.

3. **feat(clientes-ventas) precio 0 para clientes internos — confirmar que el backend guarda `precio: 0` correctamente**: Si el backend no diferencia clientes internos (o si aplica el precio del catálogo ignorando el flag), el preview mostrará $0 pero la oferta se guardará con precio real; divergencia visible y confusa para el usuario.

4. **feat/fix(informe-direccion) Contabilidad rediseño — blindaje de respuesta 400**: El fix maneja que `apiRequest` convierta un 400 de FastAPI en objeto de error. Confirmar que otros módulos que usan el mismo endpoint no queden afectados si el formato de respuesta cambia en el backend.

5. **feat(recursos-humanos) edición en Nómina — confirmar endpoint PATCH/PUT en backend**: Si el backend no tiene el endpoint correspondiente para actualizar salario, alimentación, estímulos y días trabajables, la edición fallará silenciosamente o con error 404/405.

6. **feat(contabilidad) pastel 3D en SVG — comportamiento en pantallas grandes y muchas categorías**: El cálculo de posición de etiquetas con líneas guía izquierda/derecha puede solaparse si hay muchas categorías con porciones muy pequeñas (por debajo del umbral del piso visual del 3.5%).

---

## 📅 16 de Septiembre, 2026

### Resumen de cambios (últimas 24h)

**26 commits reales** — yany1509 (5), Ruben0304 (3+4), Fabian1820 (2+1+2+2+1), Claude (1+1). Día extremadamente activo. Once áreas de trabajo: **Módulo de Contabilidad** en informe de dirección (5 commits iterativos), **Bancos y comisiones** en wallet (3), **Saldo pendiente, adjuntos y export** en clientes (4), **Rediseño completo de brigadas** (5), **Disponibilidad por provincias** en materiales y contactos (2+1), **Historial de precios y acciones** en contabilidad (2), **Presupuesto mensual** en logística (2), **Módulo real de Atención al Cliente** reemplazando scaffold mock (1), **Pestaña Transferencias** en inventario (1), y **Fix de redondeo** en ofertas (1).

---

### Área 1: feat/fix(informe-direccion) × 5 — Módulo de Contabilidad (yany1509, 18:15–20:20)

- **Nueva pestaña Contabilidad** en el informe de dirección con ingresos, gastos y saldo por moneda. Auto-filtro al entrar (hereda filtros activos del informe principal). Drill-down: tocar una fila abre el detalle de movimientos de esa moneda. Por movimiento: controles de include/exclude individual y de mover a otra categoría. Categorías dinámicas desde backend (no hardcodeadas). Textos más grandes para facilitar lectura en reuniones.

- **4 commits de fix encadenados**: correcciones de layout, cálculo de saldo, filtrado y refresco hasta dejar la pestaña estable. Estado final: pestaña funcional y sin regresiones en el resto del informe.

---

### Área 2: feat/fix(wallet) × 3 — Bancos, comisiones, eliminación (Ruben0304, 14:10–19:11)

- **Menú de Bancos** visible solo para administradores de billetera (admin only). Nuevo tipo de transacción **Comisión** para registrar comisiones bancarias. Recibos opcionales en todos los formularios de transacción (antes algunos eran obligatorios). **Soft-delete de banco**: desaparece del menú activo pero no destruye el historial de transacciones asociadas. Bloque de totales eliminado de la vista principal de bancos. Toggle de totales filtrados oculto, visible solo para superAdmin.

---

### Área 3: feat(clientes) × 4 — Saldo pendiente, acciones, adjuntos, export (Ruben0304 + yany1509, 18:13–21:34)

- **Servicio lazy `pendientes-pago-service`**: carga saldo pendiente de pago por cliente con caché de 60 segundos. Incluye todas las ofertas y estados relevantes sin bloquear la carga inicial de la tabla.

- **Tabla de acciones simplificada**: tres acciones visibles en fila (Ver / Ofertas / Acciones) y cuatro movidas a menú hover (Marcar listo para pagar / Avería / En servicio / Entregas).

- **Adjuntar archivos**: campo de texto `concepto` en lugar de enum `categoria` (más flexible para descripciones libres).

- **Export ampliado**: columnas Comercial y Saldo pendiente añadidas al Excel/PDF de exportación de clientes.

---

### Área 4: redesign/fix/style(brigadas) × 5 — Rediseño completo (yany1509, 15:10–19:56)

- **Botón editar reactivado** (estaba deshabilitado). **Agregar instalador existente**: selector de trabajadores ya registrados en RRHH, evita duplicados en `trabajadores`. **Fusión de editar con vista de detalle**: una sola pantalla en lugar de dos flujos separados.

- **Rediseño visual completo**: chips de miembros visibles sin expandir, filtros siempre visibles (no colapsados), sin split mobile/desktop, layout de columna única. **PDF de "Calcular materiales usados" eliminado completamente** (funcionalidad no utilizada).

---

### Área 5: feat/fix(materiales) × 2 — Disponibilidad por provincias (Fabian1820, 16:27–20:24)

- **Popover de disponibilidad por provincia**: 16 switches con precio individual por provincia (vacío hereda el precio base). Carga lazy al abrir el popover. Contador de resumen por lotes.

- **Fix crítico**: doble prefijo `/api/api/` corregido a la ruta correcta. Helper `exigirExito()` añadido para convertir 404 silenciosos en excepciones visibles. Opción "Ninguna" eliminada del selector de disponibilidad provincial.

---

### Área 6: feat(contactos) — Disponibilidad por provincia (Fabian1820, 20:24)

- Las **16 provincias + Nacional** en el mismo diálogo de disponibilidad. `Nacional` (`provincia_codigo: null`) actúa como fallback cuando no hay precio provincial definido. Cambio de provincia cierra el modo de edición activo.

---

### Área 7: feat(contabilidad) × 2 — Acciones y traza de precio (Fabian1820, 14:56–20:40)

- **Ajustar Cantidad** con campo `motivo` obligatorio. **Historial de precios**: valor anterior y fecha en tooltip al pasar el cursor sobre el precio actual. Catálogo como atajo de creación.

- **Columna de acciones por fila**: Editar / Ajustar / Dar de baja. Motivo requerido al cambiar precio. Cantidad no editable en modo edición (solo vía Ajustar Cantidad para mantener trazabilidad).

---

### Área 8: feat/fix(logistica) × 2 — Presupuesto mensual (Fabian1820, 16:05–17:25)

- **Módulo completo de presupuesto**: bloques e ítems con revisión por ítem. Switch de layout a horizontal cuando hay 6+ bloques. **PDF horizontal con marcas de agua**. Dos permisos nuevos: `logistica/presupuesto` (ver/editar) y `logistica/presupuesto/aprobar` (aprobar). Función `hasExactPermission` para el permiso de aprobación (no basta con tener `logistica`).

- **Fix**: solapamiento con la topbar corregido. Selector de materiales en presupuesto corregido.

---

### Área 9: feat(atencion-cliente) — Módulo real completo (Fabian1820, 16:21)

- **Reemplaza todo el scaffold mock**: elimina `lib/mock-data/` y `lib/mock-services/` del módulo de atención al cliente. Nuevo módulo real con tres secciones: Mi jornada, Planificación y Supervisión. Dos permisos nuevos: `atencion-cliente` y `atencion-cliente/planificar`. Lead gana tres campos nuevos: `comercial_ci`, `registrado_por_ci` y `fecha_registro`.

---

### Área 10: feat(inventario) — Pestaña Transferencias (Claude, 17:37)

- **Nueva pestaña Transferencias** en inventario (solo lectura): muestra solicitudes de transferencia, no movimientos físicos. Incluye estados pendiente, denegado y aprobado. Filtros por estado y fecha. Detalle expandible por solicitud. Export Excel + PDF. Nota informativa de UM para unidades mixtas.

---

### Área 11: fix(ofertas) — Redondeo de descuentos (Claude, 14:55)

- **`ajustarDescuentosAlRedondeo`**: espeja la lógica del backend `_redondear_total_a_pagar`. Recorta el total al múltiplo de 10 inferior más cercano. Muestra el monto recortado en la UI antes de que el usuario confirme la exportación.

---

### Puede dar bateo

1. **feat(informe-direccion) Contabilidad — confirmar endpoints en backend de producción**: La pestaña llama a endpoints propios de ingresos/gastos/saldo por moneda. Si no están deployados, la pestaña falla al cargar con error visible.

2. **feat(informe-direccion) sub-permiso `contabilidad-config` — confirmar entrada en `MODULOS_CATALOGO`**: Si no está en el catálogo, no será asignable desde Gestión de Permisos; solo superAdmin podrá acceder a la configuración de contabilidad.

3. **feat(wallet) tipo `Comision` — confirmar soporte en backend**: Si el tipo `Comision` no está en el enum de tipos de transacción del backend, el POST devolverá 422 sin mensaje claro.

4. **feat(wallet) soft-delete de banco — confirmar que el endpoint `DELETE /bancos/{id}` implementa soft-delete y no hard-delete**: Si el backend hace hard-delete, el historial de transacciones de ese banco quedará huérfano o causará errores de FK.

5. **feat(clientes) `pendientes-pago-service` — confirmar existencia del endpoint y comportamiento de error**: Un 404 o 500 del endpoint de saldo pendiente no debe romper la tabla de clientes. La caché de 60s puede enmascarar errores intermitentes.

6. **feat(clientes) campo `concepto` — confirmar que backend acepta texto libre en el endpoint de adjuntos**: Si el endpoint todavía espera un enum `categoria`, el payload con `concepto` texto libre causará 422.

7. **feat(clientes) menú hover — accesibilidad en pantallas táctiles**: Los cuatro botones movidos al menú hover no son accesibles en touch (sin cursor). Confirmar que hay alternativa táctil o que los casos de uso de estos botones son exclusivamente de escritorio.

8. **redesign(brigadas) PDF de materiales eliminado — confirmar ausencia de referencias externas**: Si hay links desde otros módulos (operaciones, logística, reportes) al PDF eliminado, generarán 404 o errores de módulo en runtime.

9. **fix(materiales) `exigirExito()` — confirmar que ningún caller esperaba el 404 silencioso anteriormente**: Si algún flujo dependía de que el 404 fuera silencioso para continuar (p.ej., "si no existe, crear"), `exigirExito()` lo convierte en excepción visible y rompe ese flujo.

10. **feat(logistica) `hasExactPermission` — confirmar implementación en auth-context**: Si la función no está declarada en el contexto de autenticación, el módulo de presupuesto fallará con "is not a function" en runtime al intentar verificar el permiso de aprobación.

11. **feat(logistica) `layout_tabla` — confirmar fallback si backend no envía el campo**: Si el backend no devuelve `layout_tabla` en presupuestos creados antes de este commit, el switch de layout puede quedar en estado indefinido.

12. **feat(atencion-cliente) módulo real — confirmar ausencia de imports residuales a archivos mock eliminados**: Si cualquier componente fuera del módulo importaba de `lib/mock-data/` o `lib/mock-services/`, el build fallará con "module not found" en producción.

13. **feat(atencion-cliente) campos nuevos en Lead — confirmar que backend devuelve `comercial_ci`, `registrado_por_ci` y `fecha_registro`**: Si el backend no los devuelve, los campos aparecerán `undefined` en formularios y detalles. Si alguno es requerido en POST, leads existentes sin esos campos pueden fallar al editarse.

14. **feat(atencion-cliente) dos permisos nuevos — confirmar `atencion-cliente` y `atencion-cliente/planificar` en `MODULOS_CATALOGO`**: Sin entrada en el catálogo, el RouteGuard no los reconoce y la ruta queda bloqueada para todos salvo superAdmin.

15. **fix(ofertas) redondeo múltiplo de 10 — confirmar que la lógica del backend es estrictamente "al múltiplo de 10 inferior"**: Si el backend usa redondeo bancario, al más cercano o cualquier otra variante, el total mostrado en UI diferirá del cobrado.

16. **feat(inventario) pestaña Transferencias — confirmar endpoint de solicitudes de transferencia en backend de producción**: Si el endpoint no existe, la pestaña falla al cargar.

---

## 📅 15 de Septiembre, 2026

### Resumen de cambios (últimas 24h)

**25 commits reales** — yany1509 (todos). Día extremadamente activo. Dos módulos completamente nuevos: **Historial** (por clientes y por equipos, con 5 commits iterativos) y **Entregas y Devoluciones** (con 5 commits + fix de build). Además: módulo de **Organigramas** en RRHH, refactor completo de roles de trabajadores/instaladores (`es_jefe_brigada` reemplaza `tiene_contraseña`), fix de fechas UTC en vales de salida, reportes comerciales de materiales, sugerencia de cargos en RRHH, y múltiples fixes de UI en brigadas.

---

### Área 1: feat(historial) × 5 — módulo Historial por clientes y por equipos (15:49–20:17)

- **`feat(historial): módulo Historial por clientes y por equipos`** (15:49) — Módulo nuevo en Operaciones con permiso `historial`. Por clientes: búsqueda y, al elegir uno, todo lo ocurrido en orden cronológico (registro, ofertas creadas y confirmadas, pagos, visitas, materiales salidos y devoluciones, trabajos diarios y averías), con filtros por tipo y orden antiguo/reciente. Por equipos: inversores, baterías y paneles de ofertas confirmadas con potencia, clientes, unidades y ofertas; al tocar uno, quién lo tiene y cuántos, y de cada cliente el mismo historial. Ruta `app/historial`.

- **`feat(historial): rediseño con colores por tipo y cosas conectadas`** (16:28) — Línea de tiempo por días con colores por tipo (ofertas verde, visitas índigo, materiales violeta, devoluciones ámbar, trabajos azul, averías rojo). Los eventos conectados (vale ↔ trabajo que lo usó, avería ↔ trabajo que la solucionó) se pueden tocar para saltar entre ellos.

- **`feat(historial): Ver historial en Clientes con todo lo comercial`** (20:00) — Botón "Ver historial" en la tabla de clientes que abre el historial en vista comercial: lead de origen, ofertas creadas/editadas/cambios de estado/confirmadas/canceladas, pagos con sus ediciones, cancelaciones y devoluciones, citas, cambios del cliente y todo lo de operaciones, enlazado.

- **`feat(historial): filtros de clientes y flechas entre lo conectado`** (20:08) — Lista de clientes con filtros por estado, provincia, municipio y fecha de creación. Las conexiones entre eventos se dibujan como flechas en un carril a la derecha, del color del destino.

- **`feat(historial): marcar los tipos que se quieren ver`** (20:17) — En vez de tachar lo que no se quiere ver, se marca lo que se quiere ver; sin nada marcado (Todo) se ve todo.

---

### Área 2: feat(entregas) × 5 + fix(build) — módulo Entregas y Devoluciones nuevo (15:14–20:32)

- **`feat(entregas): módulo Entregas y devoluciones`** (15:14) — Por día: los vales que salieron del almacén con cliente, almacén, quién recogió y quién entregó. Pestaña Devoluciones separada. Permiso `entregas-devoluciones`.

- **4 commits iterativos**: diseño de pestañas Entregas/Devoluciones con colores distintos, tabla con filas alternas, traslado de Gestión de almacenes a Operaciones, y tarjeta en Reportes de Comercial.

- **`fix(build): subir export-list-pdf y pdfExporter`** (20:30) — Archivos omitidos en un commit previo causaban "module not found" en el build.

---

### Área 3: feat/fix(trabajadores) × 4 + feat(brigadas) — gestión de roles de instaladores (13:43–18:18)

- Refactor de `tiene_contraseña` a `es_jefe_brigada` como fuente de verdad del rol de jefe. Selector de trabajador existente al agregar instalador. Fix de "Dar de baja" que desactivaba al trabajador entero en vez de solo quitar el rol. Fix de focus-trap en `SearchableSelect` dentro de modal.

---

### Área 4–11: feat(organigramas), fix(brigadas), feat(clientes), fix(vales-salida), feat(reportes-comercial), feat(visitas), feat(recursos-humanos), feat(planificacion)

- Módulo **Organigramas** en RRHH con editor en árbol, PDF y autoguardado.
- Fix de exclusión de candidatos ya en otra brigada.
- Vales de salida por cliente y equipos en servicio en menú de tres puntos.
- Fix de fechas UTC en vales de salida (parseFechaUtc).
- Materiales en ofertas por precio con filtros y Excel en Reportes de Comercial.
- Estudio energético con varias baterías, días y horario.
- Sugerencia de cargos existentes al escribir en RRHH.
- Acceso directo a Actualizaciones en Planificación.

---

### Puede dar bateo

1. **feat(historial) módulo nuevo — confirmar endpoints de historial en backend de producción**.
2. **feat(entregas) módulo nuevo — confirmar `GET /operaciones/vales-salida/summary` en backend**.
3. **feat(brigadas) `es_jefe_brigada` — confirmar campo deployado en SunCarBackend de producción**.
4. **feat(organigramas) módulo nuevo — confirmar permiso `organigramas` en MODULOS_CATALOGO**.
5. **fix(build) export-list-pdf/pdfExporter — confirmar deploy post-fix sin module not found**.
6. **fix(vales-salida) `parseFechaUtc` — confirmar que `fecha_recogida` no pasa por la función**.
7. **feat(visitas) estudio energético extendido — confirmar que los campos nuevos son opcionales en backend**.

---

> ⚠️ **Nota de mantenimiento**: La entrada del **14 de Septiembre** fue eliminada el 22 de Septiembre al superar los 7 días de antigüedad (política de retención semanal). La entrada del **11 de Septiembre** fue eliminada el 22 de Septiembre. La entrada del **10 de Septiembre** fue eliminada el 22 de Septiembre. La entrada del **9 de Septiembre** fue eliminada el 17 de Septiembre. La entrada del **7 de Septiembre** fue eliminada el 15 de Septiembre. La entrada del **2 de Septiembre** fue eliminada el 10 de Septiembre. Anteriores eliminadas progresivamente desde Mayo.
