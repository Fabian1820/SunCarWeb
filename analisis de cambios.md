# Registro de Análisis de Cambios — SunCarWeb

---

## 📅 21 de Septiembre, 2026

### Resumen de cambios (últimas 24h)

**22 commits** — yany1509 (mayoría). Día extremadamente activo: **barra lateral global de navegación** (1 commit, +1225 líneas, el más transversal), **nuevo módulo Nómina** completamente construido iterativamente (6 commits), **nueva área Solineras** desde cero (2 commits), **mejoras a RRHH export** (2 commits), **nuevo módulo Evidencias de trabajos** (1), **refactor de Servicios-cliente** (2 commits), mejoras a Planificación (2), y fixes en cobros, vales-salida y pagos-clientes (3).

---

### Área 1: feat(navegacion) — Barra lateral global con hover-menus (15:31)

- **Nuevo componente `barra-lateral.tsx`** (+669 líneas) añadido a `components/shared/organism/`. Se instala en todos los módulos: dentro de un módulo va recogida (solo iconos), se abre al pasar el ratón sobre ella, por encima del contenido, y se recoge al entrar a un módulo.
- Al pasar por un área se despliega la lista de módulos; al pasar por un módulo con secciones (Facturación, Compras, Envíos, Costos) se despliegan sus secciones. En móvil: botón flotante que abre acordeón.
- **Lógica de módulos y permisos extraída de `app/page.tsx` a `hooks/use-modulos-navegacion.ts`** (+495 líneas) para que inicio y barra lateral muestren exactamente lo mismo. `app/page.tsx` pierde ~486 líneas y queda limpio.

---

### Área 2: feat/fix(nomina) × 6 — Módulo de Nómina mensual en RRHH

- **Pantalla de nómina mensual** con dos vistas: **Salario Oficial** (tableta base, sin horas ni total a cobrar) y **Salario Complementario** (varios repartos por etiqueta, monto y % por trabajador).
- **Al entrar**, se abre automáticamente el mes abierto más antiguo y se avisa si hay meses anteriores sin cerrar.
- **Filtros** por sede, departamento y cargo; buscador por nombre; **exportar a Excel/PDF**.
- Fix: el panel tolera que el backend no mande el campo `sedes` todavía. Fix: se quitan las tarjetas de horas y total a cobrar de la vista oficial.

---

### Área 3: feat/fix(solineras) × 2 — Nueva área Solineras completa (11:51–12:xx)

- **Área completa**: panel en vivo (rejilla de puestos con cliente, vehículo, minutos e importe; alertas de tiempo, falla; nueva carga con ticket PDF; terminar, cobrar, retirar), reservas, clientes y vehículos, tarifas, turnos con arqueo, pagos con bandeja de comprobantes y configuración.
- Permisos: `solineras` + aditivos `solineras/red`, `solineras/comprobantes`, `solineras/anular`.
- Fix: el turno de caja es opcional en el panel (campo no obligatorio).
- **Requiere backend con `/api/solineras`** (commit propio en el backend).

---

### Área 4: feat(rrhh) × 2 — Export unificado y foto carnet (14:xx–15:xx)

- **Un solo botón "Exportar"** con modal que elige formato (Excel/PDF), alcance y qué datos incluir. Reemplaza múltiples botones de export separados.
- **Foto carnet** del empleado guardada en el servidor (no en base64 inline). Los exports incluyen la foto.

---

### Área 5: feat(servicios-cliente) × 2 — Servicios en menú de acciones + diálogo integrado

- La acción **Servicios** sale del detalle del cliente y pasa al menú de tres puntos de la fila (menú Acciones).
- **Diálogo de servicios** integrado en la ficha del cliente: muestra cobros y facturas de servicios.

---

### Área 6: feat — Módulo Evidencias de trabajos

- Nuevo módulo para **definir las fotos requeridas por tipo de trabajo**: qué imágenes hay que adjuntar según la categoría del servicio. Gestión de catálogo de evidencias.

---

### Área 7: feat(planificacion) × 2 — Oferta en tarjetas + mover a otra brigada

- La **oferta aparece en las tarjetas** de trabajo de planificación.
- **Mover un trabajo a otra brigada** desde la planificación. Los guardados automáticos ya no se cuentan como edición manual (no disparan el aviso de "sin guardar").

---

### Área 8: fixes menores (cobros, vales-salida, pagos-clientes)

- **fix(cobros)**: listar bancos destino sin exigir que el usuario sea admin de billetera (amplía quién puede ver el selector de banco).
- **feat(vales-salida)**: las devoluciones del vale aparecen en la lista y en el detalle.
- **fix(pagos-clientes)**: elimina la bandeja de alertas (con su alarma sonora) y el botón "Facturas Emitidas".

---

### Puede dar bateo

1. **feat(navegacion) barra lateral global — módulos que usen layout personalizado**: El componente `barra-lateral.tsx` se añadió a todos los módulos, pero si algún módulo tenía su propio menú lateral o header de navegación hardcodeado, ahora puede haber doble barra o conflicto de z-index. Verificar módulos con layouts propios (solineras, planificación, auditoria).

2. **feat(navegacion) `hooks/use-modulos-navegacion.ts` — permisos duplicados en dos lugares**: La lógica de qué módulos son visibles ahora vive en el hook, pero si `app/page.tsx` todavía tiene algún filtro residual de permisos, el dashboard y la barra lateral pueden mostrar cosas distintas. Confirmar que el refactor eliminó toda la lógica duplicada.

3. **feat(solineras) — requiere backend `/api/solineras` en producción**: Sin ese endpoint deployado, toda el área falla al cargar. Los usuarios con permiso `solineras` verán errores en cada pestaña.

4. **feat(solineras) permisos nuevos (`solineras/red`, `solineras/comprobantes`, `solineras/anular`) — confirmar en `MODULOS_CATALOGO`**: Sin entrada en el catálogo, los subpermisos no son asignables desde Gestión de Permisos.

5. **feat(nomina) — confirmar endpoints de nómina en backend de producción**: La pantalla necesita al menos los endpoints de meses de nómina y salarios. El fix "tolera backend sin sedes" indica que parte del backend no estaba lista hoy; confirmar que todo esté deployado antes de habilitar el módulo para usuarios.

6. **feat(nomina) filtros por sede — confirmar que `sedes` es enviado ahora por el backend**: El fix dice que el panel "tolera" la ausencia, pero los filtros de sede quedarán vacíos si el backend no lo envía todavía.

7. **feat(rrhh) foto carnet en servidor — confirmar endpoint de upload**: Si el endpoint de subida de foto no existe en producción, guardar un empleado con foto nueva falla silenciosamente o con error 404/405.

8. **feat(servicios-cliente) servicios movidos al menú Acciones — confirmar que no queda ningún enlace directo al diálogo antiguo**: Si algún otro componente (detalle de cliente, historial) abría el diálogo de servicios con la ruta o prop anterior, quedará roto.

9. **feat — Evidencias de trabajos — confirmar endpoint y permiso en `MODULOS_CATALOGO`**: Módulo nuevo: si el endpoint de evidencias no existe o el permiso no está en el catálogo, el módulo no carga y no es asignable.

10. **fix(cobros) bancos sin requerir admin — confirmar que es intencional**: Antes solo los admins de billetera podían ver el selector de banco destino. Si el cambio abre ese selector a cualquier usuario con acceso a cobros, podría exponer información de bancos internos a roles no deseados. Confirmar que el equipo lo aprobó.

11. **fix(pagos-clientes) alarma eliminada — confirmar que no hay lógica de negocio acoplada**: La bandeja de alertas con alarma sonora se eliminó. Si había lógica de polling o WebSocket acoplada a esa bandeja, el cleanup puede haber dejado listeners sin cancelar (memory leak).

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

## 📅 14 de Septiembre, 2026

### Resumen de cambios (últimas 24h)

**23 commits reales** — yany1509 (15), Fabian1820 (3) y Ruben0304 (5). Día extremadamente activo. Áreas principales: módulo de planificación reescrito por completo con 15 commits encadenados en 6 horas (tablero de brigadas + mapa de Cuba por zonas + flujo por pasos + calendario + solo clientes), adjuntar vale firmado desde PC/QR/móvil con compresión de imagen, fix de validación en formulario de ofertas, fix de checklist de conversión de leads comprobando equipo, botón para ver saldos en billeteras, optimización crítica que evita descarga de 45 MB de confección de ofertas en pantallas que no la usan, alta libre de materiales contables sin depender del catálogo, y exportar brigadas e instaladores.

---

### Área 1: feat/fix(planificacion) × 15 — rework completo del módulo de planificación (12:25–18:10, yany1509)

Quince commits encadenados en menos de 6 horas reescribieron el módulo de planificación de cero a una versión final: tablero por brigadas, mapa de Cuba por zonas (GeoJSON generado), flujo de 3 pasos sin carga innecesaria, calendario con puntos verdes en días planificados, pantalla de entrada con lista de planificaciones, y solo clientes (leads eliminados del flujo al final).

---

### Área 2: feat(vales-salida) — adjuntar el vale firmado desde PC o móvil (15:56, Fabian1820)

- Adjuntar vale firmado desde PC con diálogo propio, o desde móvil por QR (enlace de 15 min a página pública `/subir-vale/[token]`). Reescalado a 2000px JPEG antes de enviar. Borrado definitivo con aviso en diálogo.

---

### Área 3–7: fix(ofertas), fix(leads), feat(wallet), perf(ofertas), feat(contabilidad)

- Fix de justificación mínima 10 chars y null explícito para compensación/descuento.
- Fix de checklist de conversión de leads con deducción de equipo.
- Botón para ver saldos por moneda en wallet (solo admins).
- Optimización: evita descargar 45 MB de confección de ofertas sin usarlos.
- Alta libre de materiales contables sin depender del catálogo.

---

### Puede dar bateo

1. **planificacion - 15 commits en 6h — planes guardados con leads referencian registros sin número de cliente**.
2. **planificacion - calendario con puntos verdes — requiere endpoint para listar días planificados**.
3. **vales-salida - QR expira en 15 min — no hay botón de regeneración visible**.
4. **vales-salida - /subir-vale/[token] página pública — confirmar entropía del token y rate limiting**.
5. **fix(ofertas) null explícito — confirmar que backend acepta `null` explícito con `Optional[...]`**.
6. **perf(ofertas) hook sin reload implícito — confirmar que ningún componente dependía del reload post-mutación**.

---

> ⚠️ **Nota de mantenimiento**: Las entradas del **11 y 10 de Septiembre** fueron eliminadas el 21 de Septiembre al superar los 7 días de antigüedad (política de retención semanal). Anteriores eliminadas progresivamente.
