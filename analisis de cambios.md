# Registro de Análisis de Cambios — SunCarWeb

---

## 📅 20 de Septiembre, 2026

### Resumen de cambios (últimas 24h)

**2 commits reales** — Fabian1820 (1) y Ruben0304 (1). Día moderado con dos áreas: **bandeja única de solicitudes de envío** para comprador local e internacional fusionadas en un solo componente, y **fix del wallet** para que admins puedan gestionar transferencias pendientes desde la vista de un banco.

---

### Área 1: feat(solicitudes-envio) — Bandeja única para comprador local e internacional (17:05, Fabian1820)

- **`feat(solicitudes-envio): bandeja única para comprador local y compradora internacional`** — 986 adiciones / 613 eliminaciones en 15 archivos. Las pestañas local e internacional, que antes eran componentes independientes (`tab-solicitudes-local.tsx` 207 líneas, `tab-solicitudes-internacional.tsx` 252 líneas), pasan a ser la misma `BandejaSolicitudes` en dos modos. El modo controla el orden por defecto, los textos y los estados disponibles; los botones de acción los decide el sub-permiso.

  - **Cola internacional**: pide `orden=cola` al backend (urgencia + antigüedad) en lugar del orden por defecto.
  - **`MaterialPicker`** (nuevo, 128 líneas): componente para armar la solicitud con selección de materiales.
  - **`useAlmacenesLookup`** (nuevo, 52 líneas): hook para resolver nombres de almacén por ID.
  - **`tab-materiales-alertas.tsx`**: reorganizado alrededor de la bandeja (148 cambios).
  - **`useAlertasStock`**: refactorizado con 206 cambios para alinearse con la nueva estructura.
  - **`modulos-catalogo.ts`**: declara los tres sub-permisos que la página ya comprobaba — `materiales`, `solicitudes-local` y `solicitudes-internacional` — para que sean asignables desde Gestión de Permisos.

---

### Área 2: fix(wallet) — Admin puede gestionar transferencias pendientes desde vista de banco (16:03, Ruben0304)

- **`fix(wallet): un admin puede aceptar/rechazar transferencias pendientes desde la vista de un banco`** — 191 adiciones / 169 eliminaciones en `app/wallet/page.tsx`. La tarjeta de transferencias pendientes solo existía en "Mi billetera" y comparaba contra el CI del propio usuario, por lo que las transferencias hacia un banco no aparecían dentro de la vista del banco ni tenían botón de aceptar.

  Se extrae la lógica a `renderPendingTransfers(ownerCi, pendientes)` y se reutiliza en la vista de banco usando el CI del banco como perspectiva. El backend ya permitía a cualquier admin gestionar estas transferencias; ahora el frontend lo expone.

---

### Puede dar bateo

1. **feat(solicitudes-envio) tres sub-permisos nuevos en `modulos-catalogo` — confirmar migración de usuarios existentes**: `solicitudes-local` y `solicitudes-internacional` se declaran ahora formalmente. Usuarios que tenían acceso implícito a estas pestañas (p.ej., por tener el módulo padre) podrían perder acceso si el sistema de permisos require el sub-permiso exacto y no hay migración automática.

2. **feat(solicitudes-envio) `orden=cola` para internacional — confirmar soporte en backend**: Si el parámetro no está implementado o es ignorado, la cola internacional no se ordenará por urgencia/antigüedad. Sin error visible — el comportamiento incorrecto pasaría desapercibido.

3. **feat(solicitudes-envio) `useAlmacenesLookup` — confirmar formato del endpoint de almacenes**: Si el endpoint devuelve 404 o un formato inesperado, los nombres de almacén aparecerán como IDs sin resolver en toda la bandeja.

4. **feat(solicitudes-envio) `MaterialPicker` — confirmar validación de stock en backend**: Si el frontend no valida stock mínimo y el backend tampoco (o lo hace distinto), se pueden crear solicitudes con cantidades imposibles que luego fallan silenciosamente en el procesamiento.

5. **fix(wallet) `renderPendingTransfers(ownerCi)` — confirmar que el endpoint filtra por `owner_ci`**: Si `GET /transferencias/pendientes` devuelve todas las transferencias sin filtrar por destinatario, la vista de un banco mostraría transferencias dirigidas a otros bancos, con botones de aceptar activos para operaciones ajenas.

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

1. **feat(informe-direccion) Contabilidad — confirmar endpoints en backend de producción**.
2. **feat(informe-direccion) sub-permiso `contabilidad-config` — confirmar entrada en `MODULOS_CATALOGO`**.
3. **feat(wallet) tipo `Comision` — confirmar soporte en backend**.
4. **feat(wallet) soft-delete de banco — confirmar que el endpoint `DELETE /bancos/{id}` implementa soft-delete y no hard-delete**.
5. **feat(clientes) `pendientes-pago-service` — confirmar existencia del endpoint y comportamiento de error**.
6. **feat(clientes) campo `concepto` — confirmar que backend acepta texto libre en el endpoint de adjuntos**.
7. **feat(clientes) menú hover — accesibilidad en pantallas táctiles**.
8. **redesign(brigadas) PDF de materiales eliminado — confirmar ausencia de referencias externas**.
9. **fix(materiales) `exigirExito()` — confirmar que ningún caller esperaba el 404 silencioso**.
10. **feat(logistica) `hasExactPermission` — confirmar implementación en auth-context**.
11. **feat(logistica) `layout_tabla` — confirmar fallback si backend no envía el campo**.
12. **feat(atencion-cliente) módulo real — confirmar ausencia de imports residuales a archivos mock eliminados**.
13. **feat(atencion-cliente) campos nuevos en Lead — confirmar que backend devuelve `comercial_ci`, `registrado_por_ci` y `fecha_registro`**.
14. **feat(atencion-cliente) dos permisos nuevos — confirmar `atencion-cliente` y `atencion-cliente/planificar` en `MODULOS_CATALOGO`**.
15. **fix(ofertas) redondeo múltiplo de 10 — confirmar que la lógica del backend es estrictamente "al múltiplo de 10 inferior"**.
16. **feat(inventario) pestaña Transferencias — confirmar endpoint de solicitudes de transferencia en backend de producción**.

---

## 📅 15 de Septiembre, 2026

### Resumen de cambios (últimas 24h)

**25 commits reales** — yany1509 (todos). Día extremadamente activo. Dos módulos completamente nuevos: **Historial** (por clientes y por equipos, con 5 commits iterativos) y **Entregas y Devoluciones** (con 5 commits + fix de build). Además: módulo de **Organigramas** en RRHH, refactor completo de roles de trabajadores/instaladores (`es_jefe_brigada` reemplaza `tiene_contraseña`), fix de fechas UTC en vales de salida, reportes comerciales de materiales, sugerencia de cargos en RRHH, y múltiples fixes de UI en brigadas.

---

### Área 1: feat(historial) × 5 — módulo Historial por clientes y por equipos (15:49–20:17)

- Módulo nuevo en Operaciones con permiso `historial`. Por clientes y por equipos. Línea de tiempo por días con colores por tipo. Los eventos conectados (vale ↔ trabajo, avería ↔ trabajo que la solucionó) se pueden tocar para saltar entre ellos. Botón "Ver historial" en tabla de clientes. Filtros de clientes por estado, provincia, municipio y fecha de creación. Flechas visuales entre eventos conectados.

---

### Área 2: feat(entregas) × 5 + fix(build) — módulo Entregas y Devoluciones nuevo (15:14–20:32)

- Por día: vales que salieron del almacén con cliente, almacén, quién recogió y quién entregó. Pestaña Devoluciones separada. Permiso `entregas-devoluciones`. `fix(build)`: archivos omitidos causaban "module not found" en el build.

---

### Área 3: feat/fix(trabajadores) × 4 + feat(brigadas) — gestión de roles de instaladores (13:43–18:18)

- Refactor de `tiene_contraseña` a `es_jefe_brigada`. Selector de trabajador existente al agregar instalador. Fix de "Dar de baja" que desactivaba al trabajador entero. Fix de focus-trap en `SearchableSelect`.

---

### Área 4–11: feat(organigramas), fix(brigadas), feat(clientes), fix(vales-salida), feat(reportes-comercial), feat(visitas), feat(recursos-humanos), feat(planificacion)

- Módulo Organigramas en RRHH. Vales de salida por cliente. Fix de fechas UTC. Materiales en ofertas por precio. Estudio energético con varias baterías. Sugerencia de cargos en RRHH. Acceso directo a Actualizaciones en Planificación.

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

**23 commits reales** — yany1509 (15), Fabian1820 (3) y Ruben0304 (5). Áreas principales: módulo de planificación reescrito, adjuntar vale firmado desde PC/QR/móvil, fix de validación en formulario de ofertas, fix de checklist de conversión de leads, botón para ver saldos en billeteras, optimización crítica de 45 MB en confección de ofertas, alta libre de materiales contables, y exportar brigadas e instaladores.

---

### Puede dar bateo

1. **planificacion — 15 commits en 6h — planes guardados con leads referencian registros sin número de cliente**.
2. **planificacion — calendario con puntos verdes — requiere endpoint para listar días planificados**.
3. **vales-salida — QR expira en 15 min — no hay botón de regeneración visible**.
4. **vales-salida — `/subir-vale/[token]` página pública — confirmar entropía del token y rate limiting**.
5. **fix(ofertas) null explícito — confirmar que backend acepta `null` explícito con `Optional[...]`**.
6. **perf(ofertas) hook sin reload implícito — confirmar que ningún componente dependía del reload post-mutación**.

---

> ⚠️ **Nota de mantenimiento**: Las entradas del **11 de Septiembre** y **10 de Septiembre** fueron eliminadas el 20 de Septiembre al superar los 7 días de antigüedad (política de retención semanal). La entrada del **9 de Septiembre** fue eliminada el 17 de Septiembre. La entrada del **7 de Septiembre** fue eliminada el 15 de Septiembre. La entrada del **2 de Septiembre** fue eliminada el 10 de Septiembre. Anteriores eliminadas progresivamente desde Mayo.
