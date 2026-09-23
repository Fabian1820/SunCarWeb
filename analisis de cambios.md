# Registro de Análisis de Cambios — SunCarWeb

---

## 📅 23 de Septiembre, 2026

### Resumen de cambios (últimas 24h)

**~22 commits reales** — Fabian1820 (10), yany1509 (9), Ruben0304 (3). Día extremadamente activo. Siete áreas principales: **nuevo módulo Facturación / Por facturar** con permisos aditivos, **traspaso e intercambio de equipos entre clientes**, **números de serie en vales**, **desconfirmar día en planificación**, fixes críticos de facturas/auth/leads/ventas, descarga de PDF en trabajos diarios y mejoras visuales.

---

### Área 1: feat/fix(facturas-solar-carros) × 5 — Ciclo de vida completo de facturas (Fabian1820, 14:51–22:08)

- **`feat(facturacion): módulo Por facturar`** (19:04) — La factura ya no se genera sola al instalar; se acepta en Facturación → Por facturar. Pestañas Nuevos e Histórico. Cada cliente muestra todas sus ofertas confirmadas con estado (facturada/pendiente/no se factura) y acciones Facturar / No facturar / Deshacer. Pestaña **Oferta vs almacén** con comparativa material por material. Tres permisos aditivos con `hasExactPermission`: `facturas/por-facturar`, `facturas/facturar`, `facturas/comparativa`. Obras Terminadas: "Generar factura a cliente" exige el permiso de facturar. La campana lleva notificaciones a Por facturar.

- **`feat: la factura guarda su ticket y el diálogo avisa que se borra`** (15:59) — `ContabilidadService.crearTicket` leía `response.ticket` (que el backend no manda; responde `ticket_id` y `numero_ticket`), por lo que siempre devolvía `undefined` y ninguna factura guardaba su ticket. Corregido. Al eliminar, el diálogo dice qué ticket se borra con ella.

- **`feat: botón Eliminar factura con opción de devolver existencias`** (14:51) — Tres salidas al eliminar: Cancelar, Solo eliminar (no toca inventario) y Eliminar y devolver cantidades (suma de vuelta a Existencias Contabilidad).

- **`fix: una factura rechazada ya no deja la rebaja hecha`** (22:08) — El 23-sep la página proponía el número 0000126 ya existente; el backend rebajó el ticket y rechazó con 400. Como `apiRequest` no lanza ante 400, la página decía "Factura creada" y las 15 líneas salían dos veces. Fixes: la lista de facturas se carga al abrir (no solo al entrar en Facturas); se verifica que el número no exista antes de rebajar; se comprueba la respuesta del POST y si falla se anula el ticket; ante corte de red se busca la factura antes de devolver.

- **`fix: botón Agregar otro material no se sale con descripciones largas`** (18:38) — `whitespace-nowrap` heredado por el span de `SearchableSelect` con `truncateSelected={false}` empujaba el botón fuera de pantalla.

---

### Área 2: feat/fix(clientes) × 2 — Traspaso e intercambio de equipos (Fabian1820, 14:44–15:57)

- **`feat(clientes): traspaso e intercambio de equipos entre clientes`** (14:44) — Botón «Traspaso / intercambio» en el diálogo de equipos: selector del otro cliente, columnas de cuántas unidades pasan a cada lado (un sentido = traspaso, los dos = intercambio), series opcionales, vista previa de capacidad de ambos y aviso si alguno se queda sin inversor/baterías/paneles. Historial con código TR, otro cliente, quién lo hizo y quién lo autorizó; permite revertir. Tras guardar se refrescan las filas de los dos clientes.

- **`fix(clientes): el traspaso va con el acceso completo a Clientes`** (15:57) — Se quita el sub-permiso aditivo `clientes/traspaso-equipos`; el botón lo ve quien tiene el módulo Clientes entero (verificado con `hasExactPermission`).

---

### Área 3: feat(vales) — Números de serie por unidad (Fabian1820, 16:27)

- **`feat(vales): números de serie por unidad al crear, ver y devolver un vale`** — Crear vale: series como lista (texto libre, pueden llevar comas); no rompe con cantidades decimales; quita series sobrantes al bajar la cantidad; avisa series incompletas; no deja repetir series en el vale. Detalle: etiqueta por serie, las devueltas tachadas. Devolución: si el vale trae series se marcan las que vuelven o se escanea; avisa si es de otro material o ya devuelta. **Requiere backend 6881e06.**

---

### Área 4: feat(planificacion) — Botón desconfirmar día (Fabian1820, 22:20)

- **`feat(planificacion): botón para desconfirmar un día ya confirmado`** — Nuevo sub-permiso aditivo `planificacion/desconfirmar` (ni el módulo ni `planificacion/confirmar` lo conceden). Los días confirmados muestran el botón a quien lo tenga y a superadmins, con diálogo de confirmación (las brigadas dejan de ver el día en la app).

---

### Área 5: fix(auth) + fix(leads) + fix(ventas) — Tres fixes de datos críticos (yany1509, 19:01–19:21)

- **`fix(auth): forzar login ante cualquier 401`** (19:21) — El interceptor solo reaccionaba a 401 cuyo mensaje contuviera "token" + "expirado"/"inválido". El 401 de sesión revocada por CI traía otro texto y no matcheaba, así que el panel no mandaba al login. Se amplía a cualquier 401.

- **`fix(leads): exigir provincia y municipio, y mostrar cuándo falló la conversión automática`** (19:01) — Un lead sin municipio bloqueaba en silencio la conversión automática a cliente al pagar (el backend la exige para el código). El formulario ahora exige `provincia_montaje` y `municipio`. La tabla y el detalle muestran aviso ámbar cuando el backend registró `ultimo_error_conversion_automatica`.

- **`fix(ventas): "Total facturado" no sumaba los aumentos`** (19:20) — Mostraba `usd.sinDescuento` en vez de `usd.facturado` (ya calculado con descuentos y aumentos). En producción el encabezado baja de ~3.03M a ~2.95M.

---

### Área 6: feat(historial) + feat(trabajos-diarios) + feat(historial-provincias) — Mejoras de datos (yany1509, 15:29–17:13)

- **`feat(historial): filtros de fecha de creación e instalación (este mes, un mes o rango)`** (15:29) — Añadidos en Por clientes y en cada nivel de Por equipos (provincias, equipos de una provincia y clientes de un equipo).

- **`feat(trabajos-diarios): descargar el informe PDF de un trabajo y el de todo el día`** (17:13).

- **`feat(historial): la tabla de provincias suma cuántos clientes tienen inversor, batería y paneles`** (16:07).

---

### Área 7: fixes de UI/UX (yany1509 + Ruben0304, 14:44–22:20)

- **`fix(dashboard): unificar el tono de color por pestaña`** — Cada pestaña usa un solo hue con variaciones de intensidad por módulo.
- **`fix(planificacion): etiqueta "instalación en proceso" rellena`** — Pasó de contorno esmeralda a relleno violeta para diferenciarse de "instalación nueva".
- **`fix(wallet): evita que el body quede bloqueado al crear un banco desde el dropdown`** — Race condition Radix conocido (DropdownMenuItem + Dialog en mismo tick) dejaba `pointer-events: none` permanente. Solucionado con `onSelect + preventDefault + setTimeout`.
- **`fix(instaladores): unifica el diseño de Gestionar Instaladores con Brigadas`** — Layout de tarjetas unificado, filtro Tipo con Select del sistema, confirmaciones con `ConfirmDeleteDialog`.
- **`feat(planificacion): rediseña la vista de inicio con el lenguaje de Brigadas`** — Ancho completo, tarjetas con encabezado, desglose de trabajos por tipo, cumplimiento de días pasados y avatares.

---

### Puede dar bateo

1. **feat(facturacion) módulo Por facturar — confirmar endpoints en backend de producción**: Los endpoints de Por facturar, facturar oferta y comparativa son nuevos. Si no están deployados, las pestañas fallan al cargar.

2. **feat(facturacion) `hasExactPermission` — confirmar implementación en auth-context**: Tres permisos usan esta función para la comprobación. Si no está declarada en el contexto de autenticación, el módulo fallará con "is not a function" en runtime.

3. **feat(facturacion) permisos aditivos — confirmar `facturas/por-facturar`, `facturas/facturar`, `facturas/comparativa` en MODULOS_CATALOGO**: Sin entrada en el catálogo no son asignables desde Gestión de Permisos.

4. **feat(clientes) traspaso de equipos — confirmar endpoint en SunCarBackend**: El backend debe tener el endpoint de traspaso (probablemente `POST /clientes/{id}/traspaso-equipos`) y el de revertir. Si no están deployados, el botón creará errores 404.

5. **feat(vales) números de serie — requiere backend 6881e06**: Si ese commit no está deployado en producción, crear un vale con series devolverá 422 o ignorará las series silenciosamente.

6. **feat(planificacion) `planificacion/desconfirmar` — confirmar en MODULOS_CATALOGO**: Sin entrada, nadie podrá recibir el sub-permiso y el botón solo lo verán superadmins.

7. **fix(auth) cualquier 401 fuerza login — loop si el endpoint de login devuelve 401**: Si `/api/auth/login-admin` devolviera 401 en algún edge case (credenciales malformadas), el interceptor lo detectaría como sesión expirada y entraría en loop de redirección. Confirmar que el interceptor no aplica en la ruta de login.

8. **fix(leads) municipio obligatorio — leads existentes sin municipio**: Al editar un lead antiguo sin municipio, el formulario bloqueará el guardado exigiendo el campo. Si hay muchos leads en este estado, puede ser disruptivo operacionalmente.

9. **fix(ventas) caída de ~3.03M a ~2.95M en Total facturado**: El cambio es correcto, pero puede alarmar a usuarios sin contexto. Comunicar que es un fix de cálculo, no una pérdida real.

10. **fix(facturas) ticket_id de facturas históricas — diálogo de eliminar mostrará "sin ticket"**: Todas las facturas creadas antes de este fix no tienen `ticket_id` guardado (siempre era `undefined`). El diálogo de eliminar dirá que no tiene ticket enlazado, aunque sí rebajó Existencias en su momento. Confirmar que el comportamiento de "Solo eliminar" es el correcto para estos casos.

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

> ⚠️ **Nota de mantenimiento**: Las entradas del **10, 11, 14 y 15 de Septiembre** fueron eliminadas el 23 de Septiembre al superar los 7 días de antigüedad (política de retención semanal). La entrada del **9 de Septiembre** fue eliminada el 17 de Septiembre. La entrada del **7 de Septiembre** fue eliminada el 15 de Septiembre al superar los 7 días. La entrada del **2 de Septiembre** fue eliminada el 10 de Septiembre al superar los 7 días. Anteriores eliminadas: 15 de Agosto y previas.
