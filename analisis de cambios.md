# Registro de Análisis de Cambios — SunCarWeb

---

## 📅 18 de Septiembre, 2026

### Resumen de cambios (últimas 24h)

**31 commits reales** — yany1509 (todos). Día extremadamente activo concentrado en tres ejes: **overhaul masivo de la ficha de equipos de clientes** (7 commits encadenados en 5h), **nuevo flujo de transferencias bancarias** (3 commits), y **rediseño de planificación** (3 commits). Además: mejoras en wallet, historial por provincia, nueva pestaña Comprometidos en reportes comerciales, nueva pestaña Desempeño en informe de dirección, fixes en almacén, contabilidad, conectividad y dashboard.

---

### Área 1: feat/fix(clientes) × 7 — Overhaul de ficha de equipos del cliente (10:34–15:59)

- **`feat(clientes): columna Equipos con ficha e historial; ofertas junto al estado`** (10:34) — Nueva columna Equipos en la tabla de clientes. Al tocarla abre una ficha lateral con los equipos asignados y su historial de movimientos. Las ofertas del cliente se muestran junto al estado en la misma fila.

- **`feat(clientes): acciones sobre los equipos del cliente, foto y textos para el operador`** (11:45) — La ficha de equipos gana menú de acciones por ítem (reportar avería, marcar en servicio, etc.), foto del equipo y textos orientativos para el operador.

- **`feat(clientes): los clientes sin instalar abren lo contratado; la ficha nace al instalar`** (13:45) — Clientes sin instalación muestran lo que tienen contratado (sin ficha de equipos aún). La ficha de equipos se crea en el momento en que se registra la instalación.

- **`fix(clientes): el tooltip de los vales se salía de la ficha de equipos`** (13:26) — Fix de overflow del tooltip al pasar el cursor sobre los vales dentro de la ficha.

- **`feat(clientes): por qué falta lo entregado, vales al pasar el ratón, nombre de catálogo e historial agrupado`** (12:16) — Explicación visual de por qué un ítem está pendiente de entrega. Los vales aparecen en tooltip al pasar el ratón. El nombre viene del catálogo de materiales. El historial se agrupa por tipo de evento.

- **`feat(clientes): lo instalado y lo pendiente por oferta, "Marcar como instalada" y ficha siempre editable`** (15:05) — La ficha desglosa instalado vs. pendiente por oferta. Botón "Marcar como instalada" para cambiar estado. La ficha permanece editable en cualquier estado del cliente.

- **`fix(clientes): ficha de equipos más clara tras la prueba de punta a punta`** (15:59) — Pulido visual y correcciones de UX encontradas en prueba de punta a punta del flujo completo.

---

### Área 2: feat/fix(transferencias-bancarias) × 3 — Nuevo módulo de transferencias (14:38–16:12)

- **`feat(transferencias-bancarias): acción de transferencia bancaria en Leads/Clientes y alerta en Wallet`** (14:38) — Acción directa de transferencia bancaria desde la ficha de leads/clientes. Alerta visible en Wallet cuando hay una transferencia pendiente de confirmar.

- **`fix(transferencias-bancarias): sin permiso granular propio, hereda del módulo Leads/Clientes`** (14:58) — Corrección: el módulo de transferencias no tiene permiso propio en el catálogo; usa el permiso del módulo padre (Leads/Clientes) para no bloquear a usuarios que ya tenían acceso.

- **`feat(transferencias-bancarias): mover de Leads/Clientes a Facturación → Pagos Clientes`** (16:12) — El acceso a transferencias bancarias se reubica bajo Facturación > Pagos Clientes en la navegación, separándolo del flujo de leads.

---

### Área 3: feat/fix(planificacion) × 3 — Rediseño de tabla y PDF (10:47–12:15)

- **`feat(planificacion): tabla rediseñada, confirmar, descargar/imprimir y hecho por`** (10:47) — La tabla de planificación es rediseñada: nueva columna "Hecho por", botón de confirmación por fila, botones de descarga e impresión del plan.

- **`fix(planificacion): imprimir salía en blanco`** (11:06) — Fix del bug en que la función de impresión generaba una página en blanco.

- **`feat(planificacion): elegir oferta confirmada del cliente, teléfono y oferta en el PDF`** (12:15) — Al planificar se puede seleccionar la oferta confirmada del cliente. El PDF generado incluye el teléfono del cliente y la oferta seleccionada.

---

### Área 4: feat/fix(wallet) × 3 — Bancos como destino e ingresos enlazados (10:26–16:10)

- **`fix(wallet): evita duplicar gastos multi-moneda al reintentar tras un fallo`** (10:26) — Fix de race condition: si el POST de un gasto multi-moneda fallaba y el usuario reintentaba, se podían duplicar las entradas. Ahora se detecta y previene la duplicación.

- **`feat(wallet): enlaza los ingresos automáticos de oferta a su cliente`** (10:53) — Los ingresos generados automáticamente al confirmar una oferta muestran un enlace al cliente correspondiente, trazabilidad directa desde Wallet.

- **`feat(wallet): los bancos aparecen como destino de transferencia`** (16:10) — Al registrar una transferencia, el selector de destino incluye los bancos configurados (antes solo mostraba billeteras).

---

### Área 5: feat(historial) × 2 — Agrupación por provincia y categorías de equipo (09:27–09:41)

- **`feat(historial): agrupar por provincia y las 3 categorias de equipo`** (09:27) — La vista por equipos del historial agrupa los resultados por provincia y por las tres categorías principales (inversores, baterías, paneles).

- **`feat(historial): tabla de provincias, orden por fecha y quita "N cosas registradas"`** (09:41) — Nueva tabla de resumen por provincias. Orden por fecha en el listado. Se elimina el contador "N cosas registradas" que ocupaba espacio sin aportar valor.

---

### Área 6: feat(reportes-comercial) × 2 — Nueva pestaña Comprometidos (16:07–17:04)

- **`feat(reportes-comercial): pestaña Comprometidos en Materiales en Ofertas`** (16:07) — Nueva pestaña "Comprometidos" en el módulo de reportes comerciales de materiales: muestra qué materiales están comprometidos en ofertas activas sin haber salido del almacén.

- **`feat(reportes-comercial): Comprometidos se explica solo`** (17:04) — Mejora de UX: la pestaña Comprometidos incluye texto explicativo contextual para que el operador entienda qué está viendo sin consultar documentación.

---

### Área 7: feat(informe-direccion) × 2 — Pestaña Desempeño y manual de uso (11:20–15:21)

- **`feat(informe-direccion): pestaña Desempeño de la empresa`** (11:20) — Nueva pestaña "Desempeño" en el informe de dirección: métricas de rendimiento de la empresa (KPIs operativos, comparativas temporales).

- **`feat(informe-direccion): botón de manual de uso en Contabilidad y Desempeño`** (15:21) — Botón de acceso al manual de uso dentro de las pestañas Contabilidad y Desempeño, para guiar a directivos en la interpretación de los datos.

---

### Área 8: fix/style/revert(contabilidad) × 4 — Ajustes visuales y limpieza (09:22–10:40)

- **`feat(contabilidad): total general de ingresos en USD`** (09:22) — Se añade un total general consolidado en USD.

- **`revert(contabilidad): quitar el total general en USD`** (09:43) — Se revierte el commit anterior: el total general en USD se elimina (probablemente confuso o incorrecto).

- **`fix(contabilidad): gráficos del mismo alto y líneas del pastel ordenadas`** (10:25) — Los gráficos de contabilidad ahora tienen la misma altura entre sí. Las líneas guía del pastel se ordenan para evitar solapamientos.

- **`style(contabilidad): gastos en rojo pastel y etiquetas del pastel con más aire`** (10:40) — Los gastos se colorean en rojo pastel para diferenciarse de los ingresos. Las etiquetas del gráfico de pastel tienen más separación vertical.

---

### Área 9: fix(almacen) × 1 — Corrección de avisos y solicitudes de entrada (12:27)

- **`fix(almacen): avisos de éxito falsos, categorías, alertas ignoradas y solicitudes de entrada`** — Cuatro fixes en uno: (1) los avisos de "operación exitosa" se mostraban aunque la API fallara, (2) las categorías del almacén no cargaban correctamente, (3) las alertas de stock bajo eran ignoradas, (4) las solicitudes de entrada no se procesaban.

---

### Área 10: fix(conectividad) × 1 — Separar carteles de estado (12:16)

- **`fix(conectividad): separa el cartel de mantenimiento del de conexión lenta/sin internet`** — El cartel de mantenimiento programado y el de problemas de conectividad eran el mismo componente y se superponían. Ahora son independientes y con lógica de visualización separada.

---

### Área 11: feat(dashboard) × 1 — Limpieza de widgets (10:05)

- **`feat(dashboard): quita contador de instalaciones y widget de clima de inicio`** — Se eliminan dos widgets del dashboard de inicio: el contador de instalaciones pendientes y el widget del clima. Simplifica la pantalla de inicio.

---

### Área 12: fix(solicitudes-ventas) × 1 — Deep-link de Wallet (17:09)

- **`fix(solicitudes-ventas): el deep-link de Wallet rompía la página con error #300`** — El deep-link hacia Wallet desde solicitudes de ventas causaba un error de navegación (#300) que dejaba la página en blanco. Corregido.

---

### Área 13: fix(clientes-ventas) × 1 — Técnico Comercial en selector (11:50)

- **`fix(clientes-ventas): incluir Técnico Comercial en selector de comercial`** — El selector de comercial al crear/editar clientes de ventas no incluía el cargo "Técnico Comercial". Añadido para que aparezca junto a los cargos Comercial estándar.

---

### Puede dar bateo

1. **feat(clientes) ficha de equipos — confirmar que el endpoint de equipos por cliente existe en backend de producción**: La ficha carga los equipos por cliente vía un endpoint específico. Si no está deployado o el esquema cambió, la ficha abre vacía o con error 404/500.

2. **feat(clientes) "Marcar como instalada" — confirmar endpoint PATCH en backend**: Si el endpoint de cambio de estado de instalación no existe o no acepta el nuevo campo, el botón fallará silenciosamente o con error 405.

3. **feat(transferencias-bancarias) reubicación a Facturación — confirmar permiso de acceso**: El módulo ahora vive bajo Facturación > Pagos Clientes. Usuarios que tenían el acceso por herencia de Leads/Clientes pueden perderlo si Facturación tiene un permiso separado no asignado.

4. **feat(transferencias-bancarias) alerta en Wallet — confirmar endpoint de transferencias pendientes**: La alerta en Wallet llama a un endpoint para saber si hay transferencias pendientes. Sin ese endpoint, la alerta puede fallar o mostrar estado incorrecto permanentemente.

5. **fix(wallet) duplicados multi-moneda — confirmar que el mecanismo de deduplicación es idempotente**: Si el backend no tiene un identificador de idempotencia, una re-entrada del usuario puede crear duplicados a nivel de base de datos aunque el frontend los prevenga.

6. **feat(wallet) bancos como destino — confirmar que el selector de bancos usa el mismo endpoint que el módulo Bancos**: Si el selector llama a un endpoint diferente o no filtra bancos soft-deleted, puede mostrar bancos inactivos como destino válido.

7. **feat(reportes-comercial) pestaña Comprometidos — confirmar endpoint de materiales comprometidos en backend**: Nueva pestaña que requiere un endpoint propio. Si no está deployado, la pestaña carga vacía o con error.

8. **feat(informe-direccion) pestaña Desempeño — confirmar endpoints de KPIs operativos en backend**: Nueva pestaña con métricas propias. Sin los endpoints correspondientes, la pestaña falla al cargar.

9. **fix(almacen) avisos de éxito falsos — revisar si el fix cubre todos los flujos de mutación del almacén**: El fix corregía avisos de éxito en operaciones que fallaban. Confirmar que no se omitió alguna mutación (devoluciones, ajustes de cantidad) que todavía muestre éxito falso.

10. **revert(contabilidad) total USD — confirmar que el revert no dejó estado inconsistente en el componente**: Si el feat y el revert tocaron ramas de estado local, puede haber variables inicializadas para el total USD que ya no se limpian correctamente.

11. **fix(solicitudes-ventas) deep-link #300 — confirmar que otros deep-links al módulo Wallet no tienen el mismo problema**: El fix fue específico para ese deep-link. Si hay otros puntos de entrada a Wallet desde módulos distintos, pueden tener el mismo bug latente.

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

## 📅 11 de Septiembre, 2026

### Resumen de cambios (últimas 24h)

**17 commits reales** — Ruben0304 (4) y yany1509 (13). Día extremadamente activo. Áreas: módulo de auditoría completo (bitácora + filtros + pestaña de rendimiento), módulo de planificación diaria completo (pantalla nueva + múltiples fix encadenados + optimización de caché), wallet (comprobante imprimible + campo persona + PDF carta), nuevo módulo de alertas de wallet, permisos de planificación en app móvil, fix de margen en vales de salida, fix de guardado de ofertas con múltiples materiales del mismo tipo, y filtros/exportación en peticiones.

---

### Área 1: feat(auditoria) × 3 — bitácora completa del sistema para superAdmin (20:55–21:33)

- Nueva pantalla `/auditoria`: log global del backend con filtros de 13 parámetros, pestaña de rendimiento por módulo/endpoint, columna de duración con colores, filtro de entidad que sustituye otros filtros al activarse.

---

### Área 2: feat/fix/perf(planificacion) × 7 — módulo de planificación diaria (19:01–20:24)

- Módulo nuevo en Operaciones con 5 tipos de trabajo. Dos paneles a lo ancho. Borrador en localStorage. Caché en memoria de candidatos por tipo. Fix de cabecera que tapaba contenido.

---

### Área 3–8: feat(wallet) ×2, feat(wallet-alertas), feat(permisos), fix(vales-salida), fix(ofertas), feat(peticiones)

- Comprobante imprimible + campo persona en gastos. Módulo de alertas por movimientos grandes (Twilio). Sub-permiso de planificación en app móvil. Fix de margen PDF. Fix de bloqueo de guardado con 2+ materiales sin marcar. Filtros y export en peticiones a desarrollo.

---

### Puede dar bateo

1. **feat(auditoria) — confirmar endpoints `/api/auditoria/` y `/api/auditoria/rendimiento` en backend**.
2. **feat(planificacion) módulo nuevo — confirmar todos los endpoints CRUD en backend**.
3. **fix(planificacion) draft en localStorage — colisión entre usuarios distintos en dispositivo compartido**.
4. **feat(wallet-alertas) — confirmar `/wallet-alertas` en `MODULOS_CATALOGO`**.
5. **fix(ofertas) umbral accesorio ≤ 0,3 kW — `potenciaKW: null` no se asume accesorio; bloquea guardado si no está definido**.

---

> ⚠️ **Nota de mantenimiento**: La entrada del **10 de Septiembre** fue eliminada el 18 de Septiembre al superar los 7 días de antigüedad (política de retención semanal). La entrada del **9 de Septiembre** fue eliminada el 17 de Septiembre. La entrada del **7 de Septiembre** fue eliminada el 15 de Septiembre. La entrada del **2 de Septiembre** fue eliminada el 10 de Septiembre. Anteriores eliminadas: 15 de Agosto y previas.
