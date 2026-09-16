# Registro de Análisis de Cambios — SunCarWeb

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

15. **fix(ofertas) redondeo múltiplo de 10 — confirmar que la lógica del backend es estrictamente "al múltiplo de 10 inferior"**: Si el backend usa redondeo bancario, al más cercano o cualquier otra variante, el total mostrado en UI diferirá del cobrado. Verificar con un total no múltiplo de 10 concreto.

16. **feat(inventario) pestaña Transferencias — confirmar endpoint de solicitudes de transferencia en backend de producción**: Si el endpoint no existe, la pestaña falla al cargar. Confirmar también que el modelo de datos devuelto incluye todos los campos usados en la UI (estado, fecha, ítems, unidad de medida).

---

## 📅 15 de Septiembre, 2026

### Resumen de cambios (últimas 24h)

**25 commits reales** — yany1509 (todos). Día extremadamente activo. Dos módulos completamente nuevos: **Historial** (por clientes y por equipos, con 5 commits iterativos) y **Entregas y Devoluciones** (con 5 commits + fix de build). Además: módulo de **Organigramas** en RRHH, refactor completo de roles de trabajadores/instaladores (`es_jefe_brigada` reemplaza `tiene_contraseña`), fix de fechas UTC en vales de salida, reportes comerciales de materiales, sugerencia de cargos en RRHH, y múltiples fixes de UI en brigadas.

---

### Área 1: feat(historial) × 5 — módulo Historial por clientes y por equipos (15:49–20:17)

- **`feat(historial): módulo Historial por clientes y por equipos`** (15:49) — Módulo nuevo en Operaciones con permiso `historial`. Por clientes: búsqueda y, al elegir uno, todo lo ocurrido en orden cronológico (registro, ofertas creadas y confirmadas, pagos, visitas, materiales salidos y devoluciones, trabajos diarios y averías), con filtros por tipo y orden antiguo/reciente. Por equipos: inversores, baterías y paneles de ofertas confirmadas con potencia, clientes, unidades y ofertas; al tocar uno, quién lo tiene y cuántos, y de cada cliente el mismo historial. Ruta `app/historial`.

- **`feat(historial): rediseño con colores por tipo y cosas conectadas`** (16:28) — Línea de tiempo por días con colores por tipo (ofertas verde, visitas índigo, materiales violeta, devoluciones ámbar, trabajos azul, averías rojo). Los eventos conectados (vale ↔ trabajo que lo usó, avería ↔ trabajo que la solucionó) se pueden tocar para saltar entre ellos. Cabecera del cliente con iniciales y filtros con su color.

- **`feat(historial): Ver historial en Clientes con todo lo comercial`** (20:00) — Botón "Ver historial" en la tabla de clientes que abre el historial en vista comercial: lead de origen, ofertas creadas/editadas (con qué cambió)/cambios de estado/confirmadas/canceladas, pagos con sus ediciones, cancelaciones y devoluciones, citas, cambios del cliente y todo lo de operaciones, enlazado. Colores nuevos: comercial en fucsia/rosa, pagos en cian.

- **`feat(historial): filtros de clientes y flechas entre lo conectado`** (20:08) — Lista de clientes con filtros por estado, provincia, municipio y fecha de creación (desde/hasta), con el número de filtros activos. Las conexiones entre eventos (avería → solución, avería → trabajo, vale → trabajo, vale → devolución, oferta creada → confirmada, pago → devolución) se dibujan como flechas en un carril a la derecha, del color del destino.

- **`feat(historial): marcar los tipos que se quieren ver`** (20:17) — En vez de tachar lo que no se quiere ver, se marca lo que se quiere ver; sin nada marcado (Todo) se ve todo. El estado del cliente tiene su color.

---

### Área 2: feat(entregas) × 5 + fix(build) — módulo Entregas y Devoluciones nuevo (15:14–20:32)

- **`feat(entregas): módulo Entregas y devoluciones`** (15:14) — Por día: los vales que salieron del almacén con cliente, almacén, quién recogió y quién entregó; al abrir cada uno, sus materiales con lo devuelto y cada devolución. Aparte, las devoluciones del día de vales de otros días. Buscador, filtro por almacén y ver anulados. Permiso `entregas-devoluciones` (Gestión de almacenes) y `app/entregas`.

- **`feat(entregas): pestañas Entregas y Devoluciones bien distintas`** (16:15) — Entregas en verde: cada vale muestra si tiene devolución (sin devolución, devolvieron X de Y, se devolvió todo o anulado). Devoluciones en ámbar con fondo cálido: lo que volvió al almacén ese día, de vales de hoy y de otros días, con los materiales a la vista. La pestaña vive en la URL (`?ver=devoluciones`).

- **`feat(entregas): materiales más separados y fáciles de distinguir`** (16:16) — Tabla con número de fila, filas alternas, código bajo el nombre y cantidades en pastilla; en devoluciones cada material en su propia franja ámbar.

- **`feat(entregas): Entregas y devoluciones en Operaciones`** (20:25) — Pasa del grupo Gestión de almacenes al de Operaciones, junto a Planificación e Historial. El permiso sigue siendo `entregas-devoluciones`.

- **`feat(reportes): Entregas y devoluciones también en Reportes de Comercial`** (20:32) — Tarjeta en Reportes de Comercial que lleva al mismo módulo; la página acepta el permiso `entregas-devoluciones` o `reportes-comercial`.

- **`fix(build): subir export-list-pdf y pdfExporter que usa brigadas`** (20:30) — El commit 153d7892 importó `@/lib/export-list-pdf` y la prop `pdfExporter` de `ExportButtons` sin subir los archivos, causando "module not found" en el build. Se suben ese archivo, el cambio de export-buttons y su uso en trabajadores.

---

### Área 3: feat/fix(trabajadores) × 4 + feat(brigadas) — gestión de roles de instaladores (13:43–18:18)

- **`fix(trabajadores): filtrar jefe de brigada por brigadas_completas, no por tiene_contraseña`** (13:43) — `tiene_contraseña` solo refleja si el trabajador tiene adminPass configurado, que no se limpia al borrar o reasignar su brigada. Dejaba instaladores marcados como "Jefe de brigada" en el listado aunque ya no lideraran ninguna brigada real. Ahora el filtro y los badges usan la pertenencia real a `brigadas_completas` (ya disponible vía `brigadasTrabajadores`).

- **`feat(trabajadores): permitir seleccionar trabajador existente al agregar instalador`** (14:11) — "Agregar Instalador" solo dejaba escribir CI/nombre a mano, lo que podía crear duplicados en `trabajadores` si la persona ya existía en RRHH. Ahora el formulario ofrece "Trabajador existente" (lista de quienes aún no son brigadistas) o "Persona nueva". Para un existente solo se actualiza `is_brigadista` y se asigna la brigada, sin POST de creación.

- **`fix(trabajadores): quitar rol de instalador sin desactivar al trabajador`** (14:26) — "Dar de baja" desactivaba al trabajador entero (`activo=false`), bloqueando su login. Ahora el botón ("Quitar rol de instalador") solo pone `is_brigadista=false` vía PUT `/rrhh`, dejando `activo` intacto. El selector de "Trabajador existente" pasa a `SearchableSelect`. Se quitan Sede y Departamento del formulario de Agregar Instalador.

- **`fix(trabajadores): el buscador de trabajador existente no funcionaba dentro del modal`** (14:38) — `SearchableSelect` portalea su popover a `document.body` por defecto, chocando con el focus-trap de Radix Dialog. Fix: `disablePortal`, igual que ya se aplica en otros diálogos del proyecto.

- **`feat(brigadas): es_jefe_brigada explícito reemplaza tiene_contraseña como rol de jefe`** (18:18) — Sigue el cambio equivalente en SunCarBackend: `es_jefe_brigada + brigada_id` pasan a ser la fuente de verdad del rol. Se quita el campo de contraseña al convertir en jefe. Se borra `JefeBrigadaForm.tsx` (código muerto). El botón "Convertir en jefe" cambia a "Quitar como jefe de brigada" cuando ya lo es (PUT `.../rrhh` con `es_jefe_brigada=false`). La edición de brigada precarga jefe e integrantes actuales (antes arrancaba vacío) y acepta cualquier instalador como jefe.

---

### Área 4: fix(brigadas) — no candidato si ya está en otra brigada (20:16)

- **`fix(brigadas): no ofrecer como candidato a quien ya está en otra brigada`** — Los selectores de jefe/integrantes solo filtraban por `is_brigadista`. Ahora se excluyen los CI que ya aparecen como líder o integrante de alguna brigada. Al editar, los miembros actuales de la propia brigada siguen siendo válidos. Fix adicional: el diálogo "Editar Brigada" no pasaba `existingWorkers` a `BrigadeForm` — los selects arrancaban vacíos.

---

### Área 5: feat(organigramas) — módulo nuevo en RRHH (14:13)

- **`feat(organigramas): editor de organigramas por área con vista previa y PDF`** — Módulo "Organigramas" en Recursos Humanos (permiso `organigramas`). Listado con miniaturas; editor en árbol con cargo principal, cargos de apoyo a izquierda o derecha, áreas, subáreas y unidades (Tiendas 1·2·3). Enter crea el siguiente cargo, tocar una caja de la vista previa lleva a su campo, autoguardado y deshacer. Un único motor de diagramado alimenta la vista SVG y el PDF (16:9 como los de RRHH, o Carta para imprimir).

---

### Área 6: feat(clientes) × 2 — vales y acciones adicionales (15:30, 20:04)

- **`feat(clientes): ver los vales de salida de cada cliente`** (15:30) — Botón en acciones de la tabla que abre los vales del cliente del más reciente al más antiguo, con filtro por fechas. Cada vale dice a quién se entregó, la recogida, quién lo emitió y la solicitud; se despliega para ver materiales y "Ver vale" abre el detalle completo. Usa `GET /operaciones/vales-salida/summary?cliente_id=` (backend 6c2f85a).

- **`feat(clientes): equipos en servicio y entregas dentro de más acciones`** (20:04) — Los botones de equipos en servicio y de equipo entregado pasan de la fila al menú de los tres puntos con su etiqueta. Conservan el color según el estado del cliente y el indicador de carga.

---

### Área 7: fix(vales-salida) — fechas en hora de Cuba (20:04)

- **`fix(vales-salida): mostrar las fechas de los vales en hora de Cuba`** — El backend guarda instantes en UTC pero los manda sin la `Z` (`2026-06-18T16:40:45.960000`); `new Date()` los tomaba como hora local y todo salía 4-5 horas adelantado. `parseFechaUtc` (`lib/utils/fecha-utc.ts`) los lee como UTC. Se usa en el detalle del vale, la tabla, los adjuntos, las devoluciones, el Excel del listado, el PDF del vale y los vales del cliente. `fecha_recogida` no se toca: es un día, no un instante.

---

### Área 8: feat(reportes-comercial) — materiales en ofertas por precio (14:17)

- **`feat(reportes-comercial): materiales en ofertas por precio, con cliente, estado y Excel`** — Nueva tarjeta "Materiales en Ofertas" en Reportes de Comercial. Se eligen uno o varios materiales y se ve en qué ofertas están, agrupado por precio unitario, con el cliente o lead y su estado. Filtros por estado de la oferta, por estado del cliente ("Falta instalar" = pendiente + en proceso) y por texto. Excel descargable con dos hojas: Resumen (por precio y por estado) y Ofertas por precio (detalle con subtotales).

---

### Área 9: feat(visitas) — estudio energético extendido (13:44)

- **`feat(visitas): estudio energético con varias baterías, días y horario, escalera y andamio`** — El formulario del estudio energético extiende su capacidad: varias baterías distintas, días de uso y horario de consumo, y campos para escalera y andamio en la instalación.

---

### Área 10: feat(recursos-humanos) — sugerir cargos al escribir (15:33)

- **`feat(recursos-humanos): sugerir los cargos existentes al escribir el cargo`** — El campo Cargo en el alta de RRHH y en la ficha del trabajador ahora sugiere los cargos en uso con cuántas personas tiene cada uno, y avisa si lo escrito ya existe con otra forma, si se parece a uno existente o si es un cargo nuevo. El alta ya no propone "Técnico" por defecto (creaba ese cargo sin querer si no se cambiaba).

---

### Área 11: feat(planificacion) — acceso directo a Actualizaciones (14:56)

- **`feat(planificacion): acceso Actualizaciones en el día`** — Abre "Añadir un trabajo" con el tipo actualización preseleccionado: ningún estado del cliente sugiere automáticamente quién necesita actualización, así que se planifican a mano.

---

### Puede dar bateo

1. **feat(historial) módulo nuevo — confirmar endpoints de historial en backend de producción**: El módulo llama a endpoints propios (historial por cliente, por equipo, equipos con clientes). Si no están deployados, el módulo completo falla.

2. **feat(historial) flechas entre eventos — eventos sin ID de enlace no muestran flecha**: Si documentos históricos anteriores no tienen los campos de referencia cruzada, esas flechas no se dibujan. Confirmar comportamiento sin datos de enlace (¿silencioso o mensaje?).

3. **feat(historial) colores fucsia/cian para comercial y pagos — confirmar en tailwind.config.ts**: Si los valores se declararon como tokens de Tailwind (no como clases JIT arbitrarias), confirmar que están en `tailwind.config.ts` para que el build los incluya.

4. **feat(entregas) módulo nuevo — confirmar `GET /operaciones/vales-salida/summary` en backend de producción**: El commit de `feat(clientes)` cita el commit de backend `6c2f85a`. Confirmar que ese commit está deployado.

5. **feat(entregas) permiso `entregas-devoluciones` reubicado de Gestión de almacenes a Operaciones**: Si usuarios ya tenían el permiso asignado, el string del permiso es el mismo y la asignación persiste, pero la card aparece en otro grupo en Gestión de Permisos. Confirmar que no hay referencias hardcodeadas al grupo anterior.

6. **feat(brigadas) `es_jefe_brigada` — confirmar campo deployado en SunCarBackend de producción**: GET `/trabajadores` debe devolver `es_jefe_brigada` y PUT `/rrhh` debe aceptarlo. Si el backend no está actualizado, el botón toggle de jefe no funcionará.

7. **fix(brigadas) exclusión de candidatos — confirmar que `brigadas_completas` se carga antes de los diálogos**: La exclusión filtra contra `brigadas_completas`. Si el listado de brigadas no se ha cargado al abrir el selector, los candidatos aparecen sin filtrar.

8. **feat(organigramas) módulo nuevo — confirmar permiso `organigramas` en MODULOS_CATALOGO**: Si no está añadido al catálogo, el RouteGuard no lo reconocerá y el permiso no se puede asignar desde Gestión de Permisos.

9. **feat(recursos-humanos) sugerencia de cargos — confirmar si usa endpoint nuevo o filtra localmente**: Si llama a un endpoint nuevo (GET `/trabajadores/cargos` o similar), confirmar que existe en backend. Si filtra sobre la lista ya cargada de trabajadores, sin problema.

10. **fix(vales-salida) `parseFechaUtc` — confirmar que `fecha_recogida` no pasa por la función**: El commit dice explícitamente que `fecha_recogida` (un día) no se toca. Confirmar que no hay ninguna vista que aplique `parseFechaUtc` a ese campo.

11. **fix(build) export-list-pdf/pdfExporter — confirmar deploy post-fix sin module not found**: Verificar que `lib/export-list-pdf.ts` y el prop `pdfExporter` de `ExportButtons` están correctamente exportados e importados en todos los puntos de uso.

12. **feat(brigadas) `JefeBrigadaForm.tsx` eliminado — confirmar ausencia de imports residuales**: Si hay imports desde otros archivos, causarán error de compilación.

13. **feat(visitas) estudio energético extendido — confirmar que los campos nuevos son opcionales en backend**: Varias baterías, días/horario, escalera y andamio son campos nuevos. Si el backend tiene validación estricta, formularios parciales pueden fallar con 422.

14. **feat(planificacion) tipo actualización — confirmar que el tipo es válido en el endpoint de creación de trabajos**: Si `actualización` no es un tipo reconocido, el formulario preseleccionado causará 422 o silencio al enviar.

---

## 📅 14 de Septiembre, 2026

### Resumen de cambios (últimas 24h)

**23 commits reales** — yany1509 (15), Fabian1820 (3) y Ruben0304 (5). Día extremadamente activo. Áreas principales: módulo de planificación reescrito por completo con 15 commits encadenados en 6 horas (tablero de brigadas + mapa de Cuba por zonas + flujo por pasos + calendario + solo clientes), adjuntar vale firmado desde PC/QR/móvil con compresión de imagen, fix de validación en formulario de ofertas, fix de checklist de conversión de leads comprobando equipo, botón para ver saldos en billeteras, optimización crítica que evita descarga de 45 MB de confección de ofertas en pantallas que no la usan, alta libre de materiales contables sin depender del catálogo, y exportar brigadas e instaladores.

---

### Área 1: feat/fix(planificacion) × 15 — rework completo del módulo de planificación (12:25–18:10, yany1509)

Quince commits encadenados en menos de 6 horas reescribieron el módulo de planificación de cero a una versión final:

- **`feat(operaciones): exportar brigadas e instaladores`** (12:25) — Botones Excel y PDF en Gestionar Brigadas (jefe, CI, teléfono, integrantes apilados) y en Gestionar Instaladores (rol, teléfono, brigada). Exportan la lista tal como se ve, con búsqueda y filtros aplicados.

- **`feat(planificacion): el plan como tablero de brigadas`** (12:37) — Cada brigada es una tarjeta con sus trabajos; se añade desde ella sin elegir brigada aparte. Un solo buscador: vacío sugiere por estado, al escribir busca a cualquiera. Tocar añade o quita al momento, guardado automático, flechas de día. La brigada se identifica por el carné del líder para que el brigadista vea sus trabajos.

- **`feat(planificacion): filtro por provincia y municipio, e integrantes de cada brigada`** (12:49)

- **`feat(planificacion): planificar por zonas con el mapa de Cuba`** (13:17) — Vista "Por zonas" junto a "Por brigadas". Mapa de provincias y municipios con pendientes por zona, lista de la zona para marcar, bandeja con lo marcado aunque se cambie de zona o de tipo. Al final se elige quién va y se añade todo al plan del día. El mapa sale de `cuba-municipios.geojson` generado por `scripts/generar-mapa-planificacion.py` (proyectado, simplificado por tramos compartidos, con la provincia de cada municipio).

- **`fix(planificacion): filtros de provincia y municipio en vez de la etiqueta 'Sin municipio'`** (13:35) — La etiqueta de arriba parecía el nombre del municipio tocado. Ahora hay dos desplegables que hacen lo mismo que tocar el mapa. "Sin municipio" es una opción más del desplegable de municipio.

- **`feat(planificacion): permiso propio, mapa a pantalla completa, oferta, visita y espera`** (14:18) — La página pide el permiso `planificacion` (RouteGuard; solo superAdmin por ahora). Botón de pantalla completa con Esc para salir. Al elegir un municipio el mapa se acerca a él. Cada pendiente muestra cuánto lleva esperando, su oferta confirmada (abre el detalle) y su visita (abre el informe con fotos). Lista de más a menos espera.

- **`feat(planificacion): filtro por tiempo de espera`** (14:28) — Más de 1, 3, 6 meses o 1 año. Afecta al mapa, cantidades por tipo y lista. Sin fecha de espera no entra con el filtro puesto.

- **`fix(planificacion): filtros siempre en dos columnas`** (15:10)

- **`feat(planificacion): por pasos, sin cargar nada que no se haya pedido`** (15:42) — Flujo de 3 pasos: (1) qué día → (2) qué planificar (tipo) → (3) pendientes de ese tipo con lista, mapa a un botón, y filtros. Los candidatos se cargan solo al llegar al paso 3. Cada paso va en la URL; Atrás vuelve al anterior, recargar no saca del paso.

- **`feat(planificacion): calendario para elegir el día y añadir un trabajo a mano`** (15:56) — El día se elige en un calendario; los días con trabajos llevan un punto verde. Atajos para hoy y mañana. Botón "Añadir un trabajo" con cliente (o lead; corregido después), qué hacer (se propone según estado), quién va y comentario. Avisa si ya está en el plan.

- **`feat(planificacion): + arriba a la derecha y los trabajos del día a la vista`** (16:16) — El día muestra tipo, cliente, dirección, quién va y nota de los trabajos ya asignados. Lo último añadido aparece arriba y resaltado un momento. "+" redondo arriba a la derecha para añadir. Listas de pendientes debajo.

- **`fix(planificacion): fecha corta con lápiz, Plan con Lista|Brigadas y sin 'Guardado'`** (16:26) — Arriba solo `Mañana, 15 sep` con un lápiz que abre el calendario en el mismo sitio, y el + a la derecha. "Trabajos de este día" pasa a "Plan" con su cantidad y un selector Lista | Brigadas que agrupa en el sitio. El estado del guardado solo se enseña si falla.

- **`feat(planificacion): sin visitas, instalaciones con visita primero y nota sugerida`** (17:55) — El tipo "Visita" desaparece del flujo de añadir un trabajo (las visitas se crean desde otro módulo). Las instalaciones sugieren que debe haber visita previa y proponen una nota.

- **`feat(planificacion): al entrar, las planificaciones hechas con ver y editar`** (17:58) — Pantalla de entrada: lista de próximas y anteriores con un ojo (ver el plan por brigada sin tocarlo) y un lápiz (abrirlo para cambiarlo). "Nueva" arriba para un día nuevo, con calendario donde los días ya planificados están marcados.

- **`feat(planificacion): solo clientes, sin leads`** (18:10) — Se retira el filtro de clientes/leads y la búsqueda de leads al añadir un trabajo. Un lead no tiene número de cliente y su trabajo diario salía sin cliente ni materiales.

---

### Área 2: feat(vales-salida) — adjuntar el vale firmado desde PC o móvil (15:56, Fabian1820)

- **`feat(vales-salida): adjuntar el vale firmado, desde la PC o desde el movil`** — En la columna Acciones, un clip indica el estado: gris si falta el firmado, verde con número si lo tiene (el contador viene en el mismo summary, sin petición extra). El botón abre un diálogo propio (subir, ver, descargar, borrar) separado de "Ver detalles" que queda de solo lectura. Para el móvil dos caminos: (1) PWA con el mismo diálogo y `capture="environment"` para abrir la cámara; (2) QR que genera un enlace de 15 minutos a `/subir-vale/[token]`, página pública sin sesión SunCar. Las fotos se reescalan en el navegador antes de enviar (2000px JPEG). Borrado definitivo sin historial, el diálogo lo avisa.

---

### Área 3: fix(ofertas) — validar justificación y borrar compensación/descuento al desmarcar (15:39, Ruben0304)

- **`fix(ofertas): valida justificacion y borra compensacion/descuento al desmarcar`** — Dos bugs: (1) Al desmarcar "Tiene Compensación"/"Tiene Descuento" en modo edición, el campo se omitía del payload en vez de mandarse como `null`, por lo que el valor viejo quedaba intacto en el backend. Ahora se manda `null` explícito. (2) La justificación solo se validaba como "no vacía", pero el backend exige mínimo 10 caracteres. Una justificación corta rechazaba toda la oferta con un 422 genérico. Ahora se valida el mínimo de 10 caracteres y que el monto sea mayor que 0 antes de enviar, con toast específico.

---

### Área 4: fix(leads) — el checklist de conversión comprueba también el equipo de la oferta (14:57, Fabian1820)

- **`fix(leads): el checklist de conversión comprueba también el equipo de la oferta`** — El panel verde solo miraba provincia, dirección y que existiera una oferta confirmada. Ahora añade una fila que resuelve el equipo con el mismo criterio que el backend: inversor > batería > panel, desde `componentes_principales` o deducido de los items por sección. La fila **no bloquea** el botón (las ofertas de solo materiales necesitan justamente la salida de "equipo propio"); la fila avisa que el código saldrá con prefijo P. Las tres condiciones que sí bloquean siguen siendo las mismas de antes.

---

### Área 5: feat(wallet) — ver quién tiene saldo y cuánto en cada moneda (14:54, Ruben0304)

- **`feat(wallet): boton para ver quien tiene saldo y cuanto en cada moneda`** — Diálogo ampliado con las billeteras que tienen más de 0 en alguna moneda. Totales por moneda (filtran al tocarlos) y buscador por nombre o CI. Solo visible para administradores de billetera; el backend lo vuelve a comprobar.

---

### Área 6: perf(ofertas) — no descargar el listado completo de confección sin usarlo (14:52, Ruben0304)

- **`perf(ofertas): no descargar el listado completo de confección sin usarlo`** — La tabla de clientes y el módulo de órdenes de trabajo cargaban `GET /ofertas/confeccion/` (~45 MB, ~5 MB con gzip) al abrirse, y la tabla de leads al abrir el diálogo de asignar. Ninguna de las tres pantallas lee esa lista. El hook ya no recarga la lista tras eliminar o asignar salvo que alguien la haya cargado antes (`autoLoad` o `refetch`).

---

### Área 7: feat(contabilidad) — alta libre de materiales sin depender del catálogo (14:35, Fabian1820)

- **`feat(contabilidad): alta libre de materiales, sin depender del catálogo`** — "Agregar Material" permite escribir código y nombre de contabilidad directamente, exista o no en el catálogo. El vínculo con el catálogo es un desplegable opcional: cuando lo hay, Facturas Solar Carro reconoce la línea sola; cuando no, se elige a mano. Facturas Solar Carro resuelve por el vínculo, y si falta, por código o nombre. Materiales pierde las tres columnas de contabilidad del export. Los diálogos "Seleccionar material" y "Editar datos de contabilidad" quedan sin uso y se retiran.

---

### Puede dar bateo

1. **planificacion - 15 commits en 6h** — Desarrollo extremadamente iterativo. La versión final elimina leads del flujo de añadir trabajo. Si hay planes guardados en backend que referencian leads (sin `numero_cliente`), esas entradas pueden aparecer sin cliente en las vistas de histórico.

2. **planificacion - calendario con puntos verdes** — Los días con trabajos llevan un punto verde. Requiere endpoint para listar los días ya planificados. Si no está deployado en backend o falla silenciosamente, el calendario carga sin indicadores sin aviso al usuario.

3. **planificacion - permiso `planificacion`** — Solo superAdmin por ahora, via RouteGuard. Confirmar que el permiso existe en `MODULOS_CATALOGO` en producción para poder asignarse a otros roles en el futuro.

4. **planificacion - tipo visita eliminado del flujo** — Si había visitas en planes existentes, su tipo ya no aparece en la UI al editarlos. Confirmar qué ocurre con el tipo "visita" en planes históricos al abrirlos para edición.

5. **vales-salida - QR expira en 15 min** — Si el técnico tarda más de 15 min en completar la subida desde el móvil, el enlace expira. No hay botón "regenerar QR" visible después de generarlo. Confirmar si hay mecanismo de renovación o si se asume que 15 min es suficiente.

6. **vales-salida - /subir-vale/[token] página pública** — La autenticación es solo el token de URL. Confirmar que el token tiene alta entropía y que el backend tiene rate limiting en la validación para prevenir fuerza bruta.

7. **vales-salida - reescalado JPEG en Canvas** — En navegadores muy antiguos o con memoria limitada, `canvas.toBlob()` puede fallar. Confirmar que hay feedback al usuario si la compresión no puede completarse (no silencioso).

8. **vales-salida - borrado definitivo** — Sin soft-delete ni confirmación con texto escrito. Confirmar que el diálogo de aviso es suficiente freno y que el endpoint DELETE en backend es efectivamente definitivo.

9. **fix(ofertas) null explícito para compensacion/descuento** — Confirmar que el backend de `PATCH /ofertas/` acepta `null` explícito para estos campos sin rechazarlos con 422 (requiere que sean `Optional[...]` y que `exclude_unset=True` no descarte el null interpretándolo como "no enviado").

10. **fix(leads) deducción de equipo desde items** — La deducción por secciones puede fallar en ofertas creadas antes de que se estandarizara la estructura de items. Confirmar que el checklist no bloquea conversiones legítimas por deducción incorrecta en ofertas antiguas.

11. **feat(wallet) ver saldos** — El comentario dice "el backend lo vuelve a comprobar". Verificar que el endpoint tiene la validación de permiso en backend (no solo en frontend) ya que el diálogo lista las billeteras de todos los usuarios.

12. **perf(ofertas) hook sin reload implícito** — El hook ya no recarga tras eliminar o asignar salvo que se haya llamado a `autoLoad` o `refetch` antes. Confirmar que ningún componente dependía del reload silencioso post-mutación para actualizarse (especialmente la tabla de gestión de confección de ofertas).

13. **feat(contabilidad) código contable colisionante** — Si se registra un material con un código que ya existe en el catálogo vinculado, confirmar comportamiento: ¿el vínculo lo resuelve automáticamente? ¿Error de unicidad? ¿Duplicados permitidos?

14. **feat(contabilidad) diálogos retirados** — Confirmar que no quedan imports ni referencias a "Seleccionar material" y "Editar datos de contabilidad" en otros módulos (causarían errores de compilación o 404 en producción).

---

## 📅 11 de Septiembre, 2026

### Resumen de cambios (últimas 24h)

**17 commits reales** — Ruben0304 (4) y yany1509 (13). Día extremadamente activo. Áreas: módulo de auditoría completo (bitácora + filtros + pestaña de rendimiento), módulo de planificación diaria completo (pantalla nueva + múltiples fix encadenados + optimización de caché), wallet (comprobante imprimible + campo persona + PDF carta), nuevo módulo de alertas de wallet, permisos de planificación en app móvil, fix de margen en vales de salida, fix de guardado de ofertas con múltiples materiales del mismo tipo, y filtros/exportación en peticiones.

---

### Área 1: feat(auditoria) × 3 — bitácora completa del sistema para superAdmin (20:55 / 21:12 / 21:33)

- **`feat(auditoria): pantalla de la bitácora del sistema, solo superAdmin`** (20:55) — Nueva pantalla en `/auditoria` (Ruben0304). Lee el log global del backend (`GET /api/auditoria/`): quién hizo qué, cuándo, desde dónde y con qué datos. Tabla con filas fallidas resaltadas, filtros por usuario/módulo/acción/rango de fechas/texto libre, detalle por evento con el cuerpo enviado. No usa `RouteGuard`: la página comprueba `is_superAdmin` directamente. No entra en `MODULOS_CATALOGO`. La tarjeta se añade a mano en `superAdminModules` de `app/page.tsx`. Paginación y filtrado son del servidor (la colección crece sin techo). Fechas en ISO con zona para no desfasar el rango en UTC.

- **`feat(auditoria): completa los filtros del backend y el tamaño de página`** (21:12) — Añade los 4 filtros que faltaban de los 13 que acepta el endpoint: tipo de evento (peticiones vs inicios de sesión), método HTTP, entidad (activable desde el detalle de un evento, con botón que abre la historia completa de esa factura/contacto y etiqueta para quitarlo), y tamaño de página configurable (25–200 en vez de 50 fijo). El filtro de entidad **sustituye** todos los demás al activarse (para no ocultar el alta y la baja de la historia). Línea "mostrando X a Y de Z" junto a la paginación.

- **`feat(auditoria): pestaña de rendimiento y columna de tiempo`** (21:33) — Columna de tiempo en la tabla principal con color según duración (verde/ámbar/rojo). Filtro de duración mínima y orden "más lentas primero". Nueva pestaña **Rendimiento** con resumen por módulo o por endpoint: peticiones totales, media, peor caso, cuántas pasaron el umbral y dónde se atasca. Pulsar una fila lleva a la pestaña de actividad filtrada por ese módulo, ordenada por duración y sin nada por debajo del umbral.

---

### Área 2: feat/fix/perf(planificacion) × 7 — módulo de planificación diaria (19:01–20:24)

- **`feat(planificacion): pantalla para planificar el día`** (19:01, yany1509) — Módulo nuevo en Operaciones. Fecha por defecto mañana. Plan agrupado por brigada/trabajador. Diálogo para añadir con 5 tipos (visita, instalación, avería, actualización, otro). Al elegir tipo se cargan candidatos por estado del cliente, con buscador y checkboxes. Asignación en lote. Lo ya en el plan sale atenuado/bloqueado. Al elegir instalación desaparecen los trabajadores sueltos de la lista de asignables.

- **`fix(planificacion): la cabecera tapaba el contenido, y el estado deja de mandar`** (19:13, yany1509) — Fix de clase `content-with-fixed-header` faltante (el selector de fecha salía cortado). El estado del cliente ahora **sugiere** candidatos pero no los fuerza: se puede planificar a cualquier cliente/lead en cualquier estado. Búsqueda libre muestra el estado real de cada uno. "Actualización" entra directo en modo búsqueda.

- **`feat(planificacion): dos paneles a lo ancho, fuera el diálogo`** (19:21, yany1509) — Rediseño a dos columnas: candidatos a la izquierda (tipos + filtros + barra de asignar pegada abajo), plan a la derecha (fijo al hacer scroll). Botón "Marcar todos". Fecha y botón guardar suben a la cabecera. Guardar desactivado sin cambios. Aviso antes de cerrar la pestaña si hay cambios.

- **`fix(planificacion): tres formas de perder el trabajo hecho`** (19:50, yany1509) — (1) Cambiar de día con cambios sin guardar pregunta: guardar y cambiar / cambiar perdiéndolos / quedarse. (2) `beforeunload` con `returnValue` para Safari. Borrador guardado en `localStorage` según se edita; se ofrece al volver sin aplicarlo automáticamente. (3) "Marcar todos" ahora opera solo sobre lo visible, muestra su contador, y avisa cuando hay marcados que el filtro oculta.

- **`fix(planificacion): quien primero, y el botón donde se decide`** (20:18, yany1509) — Reordena el panel: brigada primero, tipo y candidatos después. Barra de acción pegada encima de la lista (solo visible cuando hay marcados), con contador, "marcar los N" y nota. Si hay marcados pero falta elegir brigada, lo indica.

- **`feat(planificacion): mostrar qué está roto en las averías`** (20:04, yany1509) — Muestra el componente dañado en las tarjetas de averías del plan.

- **`perf(planificacion): no repetir la consulta al volver a un tipo`** (20:24, yany1509) — Los listados de candidatos por tipo se cachean en memoria durante la sesión de planificación. Ir y volver entre visitas e instalaciones ya no repite la misma consulta.

---

### Área 3: feat(wallet) × 2 — comprobante imprimible y campo persona en gasto (18:39 / 19:42)

- **`feat(wallet): botón para exportar e imprimir comprobante de gastos/transferencias`** (18:39, yany1509) — `WalletService.descargarComprobante(id)`: llama a `GET /wallet/transacciones/{id}/comprobante` como blob. Botón "Imprimir comprobante" en el detalle de cada transacción (gasto o transferencia): descarga el PDF y dispara el diálogo de impresión vía iframe oculto.

- **`feat(wallet): campo persona al registrar un gasto, y PDF en tamaño carta`** (19:42, yany1509) — Campo "Persona que recibe" en el formulario de gasto (opcional): busca trabajador por nombre o CI, o texto libre para alguien fuera de la plantilla. Al elegir de la lista se manda `persona_ci` y el servidor resuelve el nombre real; texto libre va tal cual. El detalle muestra a quién se entregó. El iframe de impresión pasa a tamaño carta (216×279 mm).

---

### Área 4: feat(wallet-alertas) — módulo de configuración de alertas por movimientos grandes (19:41)

- **`feat(wallet-alertas): módulo para configurar los avisos de movimientos grandes`** (19:41, Ruben0304) — Nueva página en `/wallet-alertas`. Umbrales por tipo de movimiento (gasto, ingreso, transferencia) y por moneda (una regla de moneda concreta manda sobre "todas las monedas"). Configura a qué números y por qué vía. Las credenciales de Twilio no se editan aquí: son secretos en variables de entorno del servidor. La tarjeta de estado muestra si están puestas y lista qué falta para que las alertas lleguen. Visible para superAdmin y administradores de billetera.

---

### Área 5: feat(permisos) — módulo de planificación de la app móvil (19:35)

- **`feat(permisos): el módulo de planificación de la app móvil`** (19:35, yany1509) — Nuevo sub-permiso en el catálogo bajo App Móvil de Operaciones para el módulo de planificación diaria (la app de operaciones en campo). Asignable desde Gestión de Permisos.

---

### Área 6: fix(vales-salida) — margen superior del PDF (20:10)

- **`fix(vales-salida): iguala el margen superior al del comprobante`** (20:10, yany1509) — 18 mm para el logo y 21 mm para el contenido, igualando los márgenes que ya funcionan correctamente en el comprobante de billetera. El commit anterior (19:01, fix de PDF cortado) usaba 16/19 mm; este ajuste fino sube ambos 2 mm más.

---

### Área 7: fix(ofertas) — bloquear guardado sin marcar materiales del nombre en categorías con 2+ (18:50)

- **`fix(ofertas): exigir marcar materiales del nombre cuando hay 2+ en una categoría`** (18:50, yany1509) — Si una categoría principal (Inversores/Baterías/Paneles) tiene 2 o más materiales reales distintos y la comercial no marca cuáles cuentan para el nombre, el guardado se bloquea. Sin esa selección el backend no sabía cuál destacar y la categoría desaparecía del nombre. Los accesorios (capacidad ≤ 0,3 kW) no cuentan para el mínimo de 2. Capacidad desconocida no se asume accesorio.

---

### Área 8: feat(peticiones) — filtros y exportación (13:10)

- **`feat(peticiones): filtros y exportación de peticiones a desarrollo`** (13:10, Ruben0304) — Filtros de categoría, implementada, rango de fechas y búsqueda resueltos en backend (nuevos query params en `/api/solicitudes-desarrollo/`). Hook `use-solicitudes-desarrollo` gestiona estado de filtros con debounce en búsqueda de texto. Botones de exportación Excel/PDF con el mismo patrón de Leads/RH.

---

### Puede dar bateo

1. **feat(auditoria) pantalla nueva — confirmar endpoint `GET /api/auditoria/` en backend de producción**: Si no está deployado, la pantalla completa falla con 404 sin mensaje claro.

2. **feat(auditoria) pestaña rendimiento — confirmar endpoint `GET /api/auditoria/rendimiento` por separado**: Si solo existe el endpoint principal, la pestaña de rendimiento falla al cargar.

3. **feat(auditoria) filtro de entidad sustituye otros filtros — estado de filtros previos se pierde**: Si el usuario llega desde un drill-down con filtros activos (p.ej. filtrado por PUT), el botón de entidad los borra todos. No hay forma de recuperar el estado anterior sin volver a filtrar manualmente.

4. **feat(planificacion) módulo completamente nuevo — confirmar todos los endpoints CRUD en backend de producción**: El módulo depende de endpoints propios (`POST/GET/PATCH /planificacion/` u equivalentes). Si no están deployados, el módulo falla al guardar o al cargar el plan del día.

5. **fix(planificacion) draft en localStorage — colisión entre usuarios distintos en el mismo dispositivo**: El borrador se guarda por URL/página, no por usuario. En un dispositivo compartido (tablet de brigada), el borrador de un usuario puede ofrecerse al siguiente. Valorar incluir el `ci` del usuario en la clave de localStorage.

6. **feat(planificacion) caché en memoria — datos obsoletos si el plan cambia en otro dispositivo**: Si un segundo usuario edita el plan en paralelo, el primero ve candidatos y asignaciones desactualizados hasta recargar la página. Relevante en equipos que planifican a la vez.

7. **feat(wallet) campo persona — confirmar que `persona_ci` es opcional en backend**: Si el campo es requerido y el usuario escribe un nombre libre (sin CI), el POST puede fallar con 422 sin mensaje claro.

8. **feat(wallet) iframe tamaño carta — si el PDF del backend es A4 habrá recorte**: El iframe especifica 216×279 mm (carta) pero si el backend genera el PDF en A4 (210×297 mm), el contenido inferior puede cortarse al imprimir.

9. **feat(wallet-alertas) módulo nuevo — confirmar que `/wallet-alertas` está en `MODULOS_CATALOGO`**: Si la ruta no tiene entrada en el catálogo, no se podrá asignar el permiso desde la pantalla de Gestión de Permisos más allá de superAdmin y "wallet admins" hardcodeados.

10. **feat(wallet-alertas) Twilio — tarjeta de estado muestra "configurado" por presencia de variable, no por validez**: Si la variable de entorno existe pero tiene un valor incorrecto, la tarjeta dirá "configurado" pero las alertas no llegarán. El botón de prueba es la única forma de verificar la validez real.

11. **fix(ofertas) umbral accesorio ≤ 0,3 kW — `potenciaKW: null` no se asume accesorio**: Si un material tiene `potenciaKW` nulo (capacidad desconocida), el código lo trata como material real (no accesorio). En categorías con 2+ materiales donde alguno tiene capacidad nula, el guardado se bloqueará aunque el usuario haya marcado los que quiere. Confirmar que todos los materiales relevantes tienen `potenciaKW` definido en el catálogo.

12. **feat(peticiones) filtros server-side — confirmar nuevos query params en `/api/solicitudes-desarrollo/`**: Si el backend no los acepta, todas las peticiones devuelven resultados sin filtrar o responden 422. El filtro de estado (implementada) queda en cliente según el commit, pero los demás son server-side.

---

## 📅 10 de Septiembre, 2026

### Resumen de cambios (últimas 24h)

**1 commit real** — Ruben0304 (co-authored Claude Sonnet 5). Fix de infraestructura: evita que Safari/iPadOS sirva respuestas cacheadas de GET cuando los datos ya cambiaron por un POST previo.

---

### Área 1: fix(api-config) — no-store en todos los GET para evitar caché de Safari/iPadOS (12:37)

- **`fix(api-config): evita cache de fetch GET en Safari/iPadOS`** — Los GET vía `apiRequest()` no llevaban `cache: 'no-store'`, por lo que Safari/iPadOS podía servir respuestas cacheadas tras un POST que mutaba los mismos datos (ejemplo documentado: registrar un gasto en wallet no aparecía en el historial al pulsar Actualizar hasta salir y volver a entrar). Se agrega `cache: 'no-store'` y la cabecera `Cache-Control: no-cache` en el helper central, afectando todos los servicios que usan `apiRequest()`.

---

### Puede dar bateo

1. **`cache: 'no-store'` global — impacto en rendimiento con endpoints de catálogo**: El fix es correcto para datos mutables (wallet, historial, inventario) pero también desactiva la caché para endpoints de catálogo que raramente cambian (materiales, categorías, módulos de permisos). Esto aumenta el número de peticiones al backend en cada navegación. Monitorear si los endpoints más lentos o con más tráfico empiezan a saturar.

2. **`Cache-Control: no-cache` como cabecera de petición — comportamiento en proxies/CDN**: `Cache-Control: no-cache` en cabecera de la *petición* le dice al proxy/CDN que valide con el origen antes de servir. Si hay un CDN o proxy reverso delante del backend, el comportamiento depende de su configuración; algunos lo ignoran. El fix resuelve el caché del *navegador*, pero si el problema reaparece solo en redes corporativas con proxy, puede ser un caché de red, no de navegador.

3. **Cobertura solo en `apiRequest()` — peticiones fuera del helper no cubiertas**: Si algún componente usa `fetch()` directamente (antes del refactor de mayo que consolidó todo en `apiRequest()`), esas peticiones siguen sin `no-store`. Revisar los 4 archivos listados en CLAUDE.md como "Fixed Files" para confirmar que la migración está completa.

---

## 📅 9 de Septiembre, 2026

### Resumen de cambios (últimas 24h)

**20 commits** — yany1509 (todos). Día extremadamente activo: tres correcciones encadenadas en el nombre automático de ofertas (checkboxes, fix capacidad total vs por unidad, fix de remarcado al reabrir), variantes para secciones fijas de términos, módulo app móvil con sub-permiso de solicitudes de materiales, agrupación de vales de salida por cliente, firmas digitales en visitas + informe PDF con fix inmediato de autenticación, renombre de pestaña y etiquetas de cuentas por cobrar, fix del comprobante de pago con nombre incorrecto, catálogo S3 para foto de portada de oferta, nuevo módulo de historial de actualizaciones, fix de navegación en permisos, y dos ajustes del formulario de estudio energético (dependencia de paneles + campo duplicado).

---

### Área 1: feat(ofertas) + fix(ofertas) × 2 — checkboxes para combinar materiales en el nombre automático y correcciones (12:03 / 12:32 / 19:52)

- **`feat(ofertas): checkboxes para combinar materiales en el nombre automático`** (12:03) — Reemplaza los 3 `Select` de material único por listas de checkboxes para inversores/baterías/paneles. El nombre suma capacidad total de todos los marcados. Refs "vistos" por categoría para no re-marcar lo que el usuario desmarcó. Guarda el combo completo en `*_incluidos_en_nombre` (nuevos campos del backend) y sigue mandando el primero como `*_seleccionado` para no romper reportes de capacidad instalada.

- **`fix(ofertas): el nombre automático mostraba la capacidad total como si fuera por unidad`** (12:32) — Bug introducido en el commit anterior: `sumarSeccion` devolvía `potenciaTotal` pero el formato `"cantidad x potencia"` siempre asumió que el número era POR UNIDAD. Con 5 baterías de 12 kWh daba "B-5x60kWh" en vez de "B-5x12kWh". Fix: dividir la capacidad total entre la cantidad antes de imprimirla.

- **`fix(ofertas): checkboxes de materiales marcaban de más al reabrir una oferta`** (19:52) — El `useRef` de "vistos" se sembraba con los materiales de `items` en el primer render, pero al editar/duplicar `items` llega vacío (los datos se cargan en un efecto posterior). El ref siempre quedaba vacío y todos los materiales de una misma categoría se marcaban al abrir. Fix: sembrar el ref en el mismo efecto que restaura `componentes_principales`. Además: compresión de foto de portada (máx 900px, WebP 0.8) y endpoint ligero `/genericas/fotos-portada` en el selector.

---

### Área 2: feat(terminos) — UI de variantes también para las 6 secciones fijas (12:15)

- **`feat(terminos): UI de variantes también para las 6 secciones fijas`** — Consume el backend de variantes por sección fija (`garantia`, `formas_pago`, `reserva_equipos`, `validez_presupuesto`, `servicio_atencion_cliente`, `sobre_nosotros`). Bajo cada `Textarea` de las 6 secciones fijas, bloque para agregar/editar/eliminar variantes (mismo patrón que las personalizadas). Al editar/eliminar la variante vigente (índice 0), el backend sincroniza el campo escalar y se refleja en el `Textarea`. El selector de variante a imprimir en `export-selection-dialog.tsx` ahora también lista las secciones fijas con 2+ variantes.

---

### Área 3: feat(permisos) + fix(permisos) — módulo app móvil, sub-permiso de solicitudes y fix de navegación (12:07 / 16:29 / 20:31)

- **`feat(permisos): módulo de la app móvil de operaciones + fix GPS en estudio energético`** (12:07) — Nuevo grupo 'App Móvil de Operaciones' en el catálogo de módulos con sub-permisos: `averias`, `confirmar-salidas`, `trabajos-diarios` (con 4 pestañas) y `visitas`. El campo de GPS en el estudio energético pasa de captura automática al abrir a un interruptor explícito "¿Estás en la ubicación del cliente/lead ahora mismo?".

- **`fix(permisos): el botón Volver de Gestión de Permisos subía a la App Móvil`** (16:29) — El módulo 'App Móvil de Operaciones' tiene `href: /permisos` (sin pantalla propia en la web) y se apropiaba de esa ruta en el mapa ruta→módulo, haciendo que el botón Volver de Gestión de Permisos dijera "Volver a App Móvil". Fix: nuevo flag `soloPermiso`; la navegación omite módulos con este flag al construir los mapas de ruta.

- **`feat(permisos): sub-permiso app/solicitudes-materiales`** (20:31) — Nuevo sub-permiso bajo App Móvil de Operaciones para el módulo de solicitudes de materiales al almacén. Asignable desde Gestión de Permisos igual que el resto.

---

### Área 4: feat(salidas) — agrupar vales del mismo cliente y responsable en una sola salida (13:32)

- **`feat(salidas): agrupar vales del mismo cliente y responsable en una sola salida`** — Los vales con el mismo cliente y el mismo responsable de recogida se agrupan: una tarjeta, tabla de materiales combinada (columna de vale cuando hay más de uno) y un solo botón que confirma la salida de todos con los mismos brigadistas. La selección de brigadistas se guarda por grupo. Vales sin cliente identificable van cada uno por su cuenta.

---

### Área 5: feat(visitas) + fix(visitas) — firmas digitales, informe PDF y fix de autenticación (13:50 / 14:21)

- **`feat(visitas): firmas digitales e informe PDF descargable`** (13:50) — Nuevo `PadFirma`: lienzo para firmar con ratón o dedo que entrega la firma como PNG (data URI). Se agrega al completar la visita para instalador y cliente; se envía al crear y al actualizar. Botón "Descargar informe" en visitas realizadas que llama a `GET /visitas/{id}/informe`.

- **`fix(visitas): descargar el informe con el token de sesión`** (14:21) — Fix inmediato: `window.open` no mandaba la cabecera `Authorization`, respondiendo 401. Ahora se usa `fetch` con el token y el PDF se entrega como blob.

---

### Área 6: feat(ventas) + fix(pagos) — renombre de cuentas por cobrar y fix de nombre en comprobante (13:14 / 18:43 / 20:05)

- **`feat(ventas): renombra la pestaña "Pendientes de pago" a "Cuentas por cobrar"`** (13:14) — Actualiza etiqueta de pestaña y título de tarjeta.

- **`fix(pagos): comprobante de pago decía "Solar Carros" en vez de SunCar`** (18:43) — Corrige el nombre de empresa en 3 lugares del PDF de comprobante de pago y su variante de devolución.

- **`feat(ventas): renombra las etiquetas del resumen de pendientes de pago`** (20:05) — "Total" → "Total de cuentas por cobrar", "Pagado" → "Cobrado".

---

### Área 7: fix(fotos) + revert + feat(clientes) — tipo Visita en fotos y modal rediseñado (13:23 / 13:27 / 13:40)

- **`fix(fotos): quita "Visita" del diálogo de agregar fotos del cliente`** (13:23) — Nuevo tipo `ClienteFotoTipoSubible` que excluye "visita" de lo que se puede subir. `ClienteFoto` la conserva para leer registros antiguos. La galería tampoco la ofrecía como filtro.

- **`revert(fotos): la galería del cliente vuelve a filtrar por "Visita"`** (13:27) — Revert parcial 4 minutos después: el filtro de galería se restaura porque sí hay registros antiguos con ese tipo. Estado final neto: no se puede SUBIR con tipo "Visita" pero sí se puede FILTRAR en galería.

- **`feat(clientes): trae de dev el modal de detalles rediseñado`** (13:40) — Modal por secciones (Identificación, Contacto, Ubicación, Seguimiento, Instalación, Oferta, Costos y pago, Evidencias, Comentarios). Props sin cambios (`fotosCliente`, `loadingFotosCliente`, `onEdit`, `onDownloadComprobante`). `leads-table.tsx` no se trae intencionalmente (va por detrás en distinción BTB/BTC).

---

### Área 8: feat(ofertas) — elegir foto de portada del catálogo S3 (18:56)

- **`feat(ofertas): elegir la foto de portada de nuestro S3 en vez de solo subir una nueva`** — Nuevo botón "Elegir del catálogo" junto a "Subir foto" en la portada de Confección de Ofertas. Abre `seleccionar-foto-portada-dialog.tsx` con una grilla de fotos ya en S3 (inicialmente usa `/genericas/aprobadas`; el fix posterior lo migra al endpoint ligero `/genericas/fotos-portada`).

---

### Área 9: feat(actualizaciones) — módulo con permiso propio para el historial (19:31)

- **`feat(actualizaciones): módulo con permiso propio para ver el historial completo`** — Nueva página `/actualizaciones-sistema` con historial de 180 días agrupado por día, protegida por `RouteGuard` con `requiredModule="actualizaciones-sistema"`. Nueva entrada en el catálogo de módulos sin `superAdminOnly` (la lectura del historial puede darse a cualquiera con el permiso). Publicar/Notificar/Eliminar siguen restringidos a superAdmin en backend. El panel de Inicio (hoy/ayer, abierto a todos) queda igual.

---

### Área 10: fix(estudio) × 2 — secciones independientes de paneles y campo duplicado eliminado (17:11 / 17:47)

- **`fix(estudio): equipamiento, protecciones y cableado ya no dependen de los paneles`** (17:11) — Inversores, baterías, protecciones y cableado estaban dentro del bloque condicional "va a instalar paneles solares". Solo queda dentro "Ubicación e instalación". El mismo cambio se aplica en la app móvil.

- **`fix(estudio): quitar observaciones, ya está la descripción de la evidencia`** (17:47) — El estudio pedía observaciones y el formulario de visita pedía descripción de la evidencia; dos cajas para lo mismo. Queda solo la de la visita. El campo sigue en el tipo para las visitas viejas. El mismo cambio se aplica en la app móvil.

---

### Puede dar bateo

1. **feat(ofertas) `*_incluidos_en_nombre` — confirmar campos deployados en backend; si no, combo de checkboxes no persiste entre sesiones (Sep 9)**.

2. **feat(terminos) variantes secciones fijas — confirmar tres endpoints nuevos en backend de producción (Sep 9)**.

3. **fix(permisos) `soloPermiso` — confirmar que todos los iteradores del catálogo de módulos (no solo mapas de navegación) filtran o manejan este flag (Sep 9)**.

4. **feat(salidas) agrupación de vales — confirmar que el matching de cliente + responsable usa comparación normalizada (Sep 9)**.

5. **feat(visitas) firmas digitales — fallo parcial (JSON ok, imágenes fallan) deja visita sin firmas sin aviso al usuario (Sep 9)**.

6. **feat(ofertas) foto de portada S3 — confirmar existencia del endpoint `/genericas/fotos-portada` en backend de producción (Sep 9)**.

7. **feat(actualizaciones) módulo sin `superAdminOnly` — confirmar que el historial no contiene información sensible para personal operativo (Sep 9)**.

8. **feat(clientes) modal de dev — confirmar funcionamiento correcto en contexto de leads-table.tsx no actualizado (Sep 9)**.

9. **fix(fotos) revert parcial — confirmar ausencia de TypeScript errors residuales; estado final: no subible pero sí filtrable (Sep 9)**.

10. **fix(estudio) campos sin condición de paneles — confirmar que backend acepta estos campos siempre sin 422 (Sep 9)**.

11. **fix(estudio) `observaciones` eliminado — confirmar que ninguna vista de detalle o informe lo lee directamente y lo muestra en blanco (Sep 9)**.

---

## Seguimientos vigentes

- **feat(informe-direccion) Contabilidad endpoints — confirmar en backend de producción (Sep 16)**.
- **feat(informe-direccion) sub-permiso `contabilidad-config` en MODULOS_CATALOGO (Sep 16)**.
- **feat(wallet) tipo `Comision` — confirmar soporte en backend (Sep 16)**.
- **feat(wallet) soft-delete de banco — confirmar que el endpoint no hace hard-delete (Sep 16)**.
- **feat(clientes) `pendientes-pago-service` endpoint — confirmar existencia y manejo de error (Sep 16)**.
- **feat(clientes) campo `concepto` en adjuntos — confirmar que backend acepta texto libre (Sep 16)**.
- **feat(clientes) hover menu — confirmar alternativa táctil para acciones en móvil (Sep 16)**.
- **redesign(brigadas) PDF de materiales eliminado — confirmar ausencia de referencias externas (Sep 16)**.
- **fix(materiales) `exigirExito()` — confirmar que ningún caller esperaba el 404 silencioso (Sep 16)**.
- **feat(logistica) `hasExactPermission` — confirmar implementación en auth-context (Sep 16)**.
- **feat(logistica) `layout_tabla` — confirmar fallback si backend no envía el campo en presupuestos viejos (Sep 16)**.
- **feat(atencion-cliente) módulo real — confirmar ausencia de imports residuales a archivos mock eliminados (Sep 16)**.
- **feat(atencion-cliente) campos nuevos en Lead (`comercial_ci`, `registrado_por_ci`, `fecha_registro`) — confirmar que backend los devuelve (Sep 16)**.
- **feat(atencion-cliente) dos permisos nuevos — confirmar `atencion-cliente` y `atencion-cliente/planificar` en MODULOS_CATALOGO (Sep 16)**.
- **fix(ofertas) redondeo múltiplo de 10 — confirmar que la lógica del backend es "al inferior" y no bancario (Sep 16)**.
- **feat(inventario) pestaña Transferencias — confirmar endpoint en backend de producción con modelo de datos correcto (Sep 16)**.
- **feat(historial) módulo nuevo — confirmar endpoints de historial en backend de producción (Sep 15)**.
- **feat(historial) flechas entre eventos — confirmar comportamiento sin datos de enlace en documentos históricos (Sep 15)**.
- **feat(historial) colores fucsia/cian — confirmar tokens en tailwind.config.ts o uso de clases JIT (Sep 15)**.
- **feat(entregas) módulo nuevo — confirmar `GET /operaciones/vales-salida/summary` deployado en backend (Sep 15)**.
- **feat(entregas) permiso reubicado a Operaciones — confirmar ausencia de referencias hardcodeadas al grupo anterior (Sep 15)**.
- **feat(brigadas) `es_jefe_brigada` — confirmar campo deployado en SunCarBackend: GET devuelve campo, PUT lo acepta (Sep 15)**.
- **fix(brigadas) exclusión candidatos — confirmar que `brigadas_completas` se carga antes de abrir los selectores (Sep 15)**.
- **feat(organigramas) módulo nuevo — confirmar permiso `organigramas` en MODULOS_CATALOGO (Sep 15)**.
- **feat(recursos-humanos) sugerencia cargos — confirmar si usa endpoint nuevo o filtra localmente (Sep 15)**.
- **fix(vales-salida) parseFechaUtc — confirmar que `fecha_recogida` (solo día) no pasa por la función (Sep 15)**.
- **fix(build) export-list-pdf/pdfExporter — confirmar deploy post-fix sin module not found (Sep 15)**.
- **feat(visitas) estudio energético extendido — confirmar que campos nuevos son opcionales en backend (Sep 15)**.
- **feat(planificacion) tipo actualización — confirmar que el tipo es válido en el endpoint de creación de trabajos (Sep 15)**.
- **planificacion - calendario con puntos verdes — confirmar endpoint de días planificados en backend de producción (Sep 14)**.
- **planificacion - permiso `planificacion` — confirmar que existe en `MODULOS_CATALOGO` para asignación futura a otros roles (Sep 14)**.
- **planificacion - leads en planes históricos — confirmar qué ocurre al abrir para edición planes con entradas que referencian leads (Sep 14)**.
- **vales-salida - QR 15 min — confirmar mecanismo de renovación o aceptar que 15 min es el límite sin regeneración posible (Sep 14)**.
- **vales-salida - /subir-vale/[token] — confirmar entropía del token y rate limiting en backend para prevenir fuerza bruta (Sep 14)**.
- **fix(ofertas) null explícito compensacion/descuento — confirmar que backend acepta null sin rechazar con 422 (exclude_unset + nullable) (Sep 14)**.
- **perf(ofertas) sin reload implícito — confirmar que pantallas de gestión de confección siguen actualizándose tras mutaciones (Sep 14)**.
- **feat(contabilidad) código colisionante — confirmar comportamiento de unicidad en backend al registrar código ya existente en catálogo (Sep 14)**.
- **feat(auditoria) pantalla nueva — confirmar endpoint `GET /api/auditoria/` en backend de producción (Sep 11)**.
- **feat(auditoria) pestaña rendimiento — confirmar endpoint `GET /api/auditoria/rendimiento` por separado (Sep 11)**.
- **feat(planificacion) módulo nuevo — confirmar todos los endpoints CRUD de planificación en backend de producción (Sep 11)**.
- **feat(planificacion) draft en localStorage — colisión entre sesiones de usuarios distintos en el mismo dispositivo compartido (Sep 11)**.
- **feat(wallet) campo persona — confirmar que `persona_ci` es opcional en backend; texto libre sin CI puede causar 422 (Sep 11)**.
- **feat(wallet-alertas) módulo nuevo — confirmar que `/wallet-alertas` está en `MODULOS_CATALOGO` para ser asignable desde permisos (Sep 11)**.
- **fix(ofertas) umbral accesorio ≤ 0,3 kW — materiales con `potenciaKW: null` cuentan para el mínimo y pueden bloquear el guardado inesperadamente (Sep 11)**.
- **feat(peticiones) filtros server-side — confirmar que `/api/solicitudes-desarrollo/` acepta los nuevos query params (Sep 11)**.
- **fix(api-config) `cache: 'no-store'` global — monitorear saturación en endpoints de catálogo de baja mutabilidad (Sep 10)**.
- **feat(ofertas) `*_incluidos_en_nombre` — confirmar campos deployados en backend; si no, combo de checkboxes no persiste entre sesiones (Sep 9)**.
- **feat(terminos) variantes secciones fijas — confirmar tres endpoints nuevos en backend de producción (Sep 9)**.
- **fix(permisos) `soloPermiso` — confirmar que todos los iteradores del catálogo de módulos (no solo mapas de navegación) filtran o manejan este flag (Sep 9)**.
- **feat(salidas) agrupación de vales — confirmar que el matching de cliente + responsable usa comparación normalizada (Sep 9)**.
- **feat(visitas) firmas digitales — fallo parcial (JSON ok, imágenes fallan) deja visita sin firmas sin aviso al usuario (Sep 9)**.
- **feat(ofertas) foto de portada S3 — confirmar existencia del endpoint `/genericas/fotos-portada` en backend de producción (Sep 9)**.
- **feat(actualizaciones) módulo sin `superAdminOnly` — confirmar que el historial no contiene información sensible para personal operativo (Sep 9)**.
- **feat(clientes) modal de dev — confirmar funcionamiento correcto en contexto de leads-table.tsx no actualizado (Sep 9)**.
- **fix(fotos) revert parcial — confirmar ausencia de TypeScript errors residuales; estado final: no subible pero sí filtrable (Sep 9)**.
- **fix(estudio) campos sin condición de paneles — confirmar que backend acepta estos campos siempre sin 422 (Sep 9)**.
- **fix(estudio) `observaciones` eliminado — confirmar que ninguna vista de detalle o informe lo lee directamente y lo muestra en blanco (Sep 9)**.
- **feat(visitas) JSON + fotos en dos peticiones — confirmar que fallo parcial (JSON ok, fotos fallan) es manejado con aviso al usuario (Sep 7)**.
- **feat(visitas) GPS — confirmar si `ubicacion_gps` es opcional en backend; si es requerido, la captura silenciosa puede causar 422 (Sep 7)**.
- **feat(inicio) `SystemUpdatesPanel` — confirmar que consume endpoint real y no datos mock hardcodeados en producción (Sep 7)**.
- **feat(inicio) `NotificarTrabajadoresDialog` — confirmar endpoint de notificación por trabajador en backend de producción (Sep 7)**.
- **feat(notificaciones) tipo `aviso_sistema` — confirmar soporte del tipo en backend para que la pestaña "Avisos" reciba notificaciones reales (Sep 7)**.
- **feat(terminos) `insertarDespues`/`alternarSeccionFija`/`reordenarSecciones` — confirmar en backend de producción (Sep 7)**.
- **feat(terminos) `export-selection-dialog` prop cambiado a documento completo — confirmar que no hay callers que todavía pasen HTML pre-armado (Sep 7)**.
- **fix(facturas) `StockInsuficienteError` — confirmar que el componente de facturación no captura genéricamente todos los errores y sí muestra el aviso de faltante (Sep 7)**.
- **fix(facturas) precio ponderado — confirmar que backend acepta precios con decimales en líneas de factura (Sep 7)**.
- **feat(clientes) selector de modelo — confirmar parámetros `modelo_codigo`/`cantidad_exacta`/`inversorKwMin/Max`/etc. deployados en backend (Sep 1)**.
- **feat(ofertas) esquema de pago — PATCH al exportar es permanente: confirmar si se emite al cambiar el selector o solo al pulsar "Exportar" (Sep 1)**.
- **fix(busqueda) `normalizeSearchText` en 61 módulos — confirmar que ningún módulo hacía coincidencia exacta que se rompa con la normalización (Sep 1)**.
- **fix(solicitudes) dropdown sin límite — confirmar rendimiento con 100+ resultados en dispositivos móviles (Sep 1)**.
- **fix(clientes-anulados) — confirmar que los 11 selectores cubiertos son exhaustivos; verificar módulos de instalaciones y órdenes de trabajo no listados en el commit (Ago 29)**.
- **feat(ventas) toggle "Vista Web" PATCH de campo único — confirmar `exclude_unset` en backend para no sobrescribir null en campos no enviados (Ago 29)**.
- **feat(clientes) tipo "visita" — confirmar deploy de backend con "visita" en Literal del endpoint POST /clientes/{numero}/fotos (Ago 28)**.
- **fix(ofertas-confeccion) bloqueo optimista — confirmar UX cuando el comercial recibe 409 (Ago 28)**.
- **fix(ofertas-confeccion) moneda — ofertas existentes con tasa 0 sin migración automática — requieren edición manual (Ago 28)**.
- **feat(materiales): facturas históricas con `descripcion` embebida — verificar vista de facturas anteriores al 27 de Agosto (Ago 27)**.
- **67 clientes invisibles ~26 días — verificar si se crearon duplicados en el período 31 Jul – 26 Ago (Ago 26)**.
- **Delete definitivo de clientes — confirmar que la restricción "con historial" está en backend y no solo en frontend (Ago 26)**.
- **Backfill de `envio-contenedores/ficha-precios` — confirmar ejecución del script para los 10 usuarios existentes en producción (Ago 25)**.
- **`/solicitudes-envio` sin RouteGuard confirmado — accesible por URL directa (Ago 20)**.
- **`fix(permisos)` — `confirmar_vacio: true` requiere soporte en backend de producción (Ago 14)**.
- **`feat(actualizaciones-felicity)` — página pública sin autenticación SunCar; confirmar seguridad de credenciales (Ago 14)**.
- **`feat(peticiones)` — endpoint de backend sin confirmar; módulo fallará si no está deployado (Ago 14)**.
- **Módulos WhatsApp solo visibles para superAdmin en dashboard pero rutas sin RouteGuard — accesibles con URL directa (Ago 14)**.
- **FuenteSelector — confirmar persistencia de `fuente_referencia` en POST/PATCH leads y clientes en backend (Ago 10)**.
- **"Sin respuesta" eliminado de 11 sitios — confirmar migración 100% en BD (Ago 10)**.
- **Anular lead cancela ofertas de confección en cascada — sin flujo de reversa confirmado (Ago 7)**.
- **Sub-permiso `informe-direccion/cobros-pendientes` no aditivo — datos financieros visibles a todos los usuarios con `informe-direccion` sin asignación explícita (Ago 6)**.
- **Endpoint de KPIs comparativos sin confirmar en backend — informe-direccion fallará en runtime (Ago 3)**.
- **330/609 materiales con costo 0 — costeos y facturas pueden ser incorrectos (Ago 3)**.
- **`PATCH /pagos/{id}/cancelar` — endpoint nuevo sin confirmar, cancelaciones fallarán con 404 (Jul 17)**.
- **`/ajustar-saldo` endpoint sin confirmar en backend (Jul 15)**.
- **Fichas de Costo — "Ajuste general" irreversible destruye diferencias por almacén sin confirmación robusta (Jul 13)**.
- **AdminPass 123456 hardcodeado**.
- **Race condition en el cálculo de disponible de reservas**.
- **BMS como categoría reservable — docs sin `.pools` bloquean el 100% de reservas BMS**.

---

> ⚠️ **Nota de mantenimiento**: La entrada del **7 de Septiembre** fue eliminada el 15 de Septiembre al superar los 7 días de antigüedad (política de retención semanal). La entrada del **2 de Septiembre** fue eliminada el 10 de Septiembre al superar los 7 días de antigüedad (política de retención semanal). Las entradas del **31 de Agosto** y **1 de Septiembre** fueron eliminadas el 9 de Septiembre al superar los 7 días de antigüedad (política de retención semanal). Las entradas del **19, 20 y 21 de Junio** y del **23 de Junio** fueron eliminadas al superar los 7 días de antigüedad (política de retención semanal). La entrada del **26 de Junio** fue eliminada el 4 de Julio al superar los 7 días. La entrada del **28 de Junio** fue eliminada el 6 de Julio al superar los 7 días. La entrada del **29 de Junio** fue eliminada el 7 de Julio al superar los 7 días. La entrada del **30 de Junio** fue eliminada el 8 de Julio al superar los 7 días. Las entradas del **1 y 2 de Julio** fueron eliminadas el 10 de Julio al superar los 7 días. La entrada del **3 de Julio** fue eliminada el 11 de Julio al superar los 7 días. Las entradas del **4 y 5 de Julio** fueron eliminadas el 13 de Julio al superar los 7 días. La entrada del **6 de Julio** fue eliminada el 14 de Julio al superar los 7 días. La entrada del **7 de Julio** fue eliminada el 15 de Julio al superar los 7 días. La entrada del **8 de Julio** fue eliminada el 17 de Julio al superar los 7 días. La entrada del **10 de Julio** fue eliminada el 18 de Julio al superar los 7 días. La entrada del **11 de Julio** fue eliminada el 19 de Julio al superar los 7 días. La entrada del **13 de Julio** fue eliminada el 21 de Julio al superar los 7 días. La entrada del **14 de Julio** fue eliminada el 22 de Julio al superar los 7 días. La entrada del **15 de Julio** fue eliminada el 23 de Julio al superar los 7 días. La entrada del **17 de Julio** fue eliminada el 25 de Julio al superar los 7 días. La entrada del **18 de Julio** fue eliminada el 26 de Julio al superar los 7 días. La entrada del **19 de Julio** fue eliminada el 27 de Julio al superar los 7 días. La entrada del **20 de Julio** fue eliminada el 28 de Julio al superar los 7 días. La entrada del **21 de Julio** fue eliminada el 30 de Julio al superar los 7 días. La entrada del **22 de Julio** fue eliminada el 30 de Julio al superar los 7 días. La entrada del **23 de Julio** fue eliminada el 31 de Julio al superar los 7 días. La entrada del **24 de Julio** fue eliminada el 1 de Agosto al superar los 7 días. La entrada del **25 de Julio** fue eliminada el 2 de Agosto al superar los 7 días. La entrada del **26 de Julio** fue eliminada el 3 de Agosto al superar los 7 días. La entrada del **27 de Julio** fue eliminada el 4 de Agosto al superar los 7 días. La entrada del **28 de Julio** fue eliminada el 5 de Agosto al superar los 7 días. La entrada del **30 de Julio** fue eliminada el 7 de Agosto al superar los 7 días. La entrada del **31 de Julio** fue eliminada el 8 de Agosto al superar los 7 días. Las entradas del **1, 2 y 3 de Agosto** fueron eliminadas el 10 de Agosto al superar los 7 días. La entrada del **4 de Agosto** fue eliminada el 12 de Agosto al superar los 7 días. La entrada del **5 de Agosto** fue eliminada el 13 de Agosto al superar los 7 días. La entrada del **6 de Agosto** fue eliminada el 14 de Agosto al superar los 7 días. La entrada del **7 de Agosto** fue eliminada el 15 de Agosto al superar los 7 días. La entrada del **8 de Agosto** fue eliminada el 17 de Agosto al superar los 7 días. La entrada del **10 de Agosto** fue eliminada el 18 de Agosto al superar los 7 días. La entrada del **11 de Agosto** fue eliminada el 19 de Agosto al superar los 7 días. La entrada del **12 de Agosto** fue eliminada el 20 de Agosto al superar los 7 días. La entrada del **13 de Agosto** fue eliminada el 21 de Agosto al superar los 7 días. La entrada del **14 de Agosto** fue eliminada el 22 de Agosto al superar los 7 días. La entrada del **15 de Agosto** fue eliminada el 25 de Agosto al superar los 7 días. La entrada del **17 de Agosto** fue eliminada el 25 de Agosto al superar los 7 días. La entrada del **18 de Agosto** fue eliminada el 26 de Agosto al superar los 7 días. La entrada del **19 de Agosto** fue eliminada el 27 de Agosto al superar los 7 días. La entrada del **20 de Agosto** fue eliminada el 28 de Agosto al superar los 7 días. La entrada del **21 de Agosto** fue eliminada el 29 de Agosto al superar los 7 días. La entrada del **22 de Agosto** fue eliminada el 30 de Agosto al superar los 7 días. La entrada del **23 de Agosto** fue eliminada el 31 de Agosto al superar los 7 días. La entrada del **24 de Agosto** fue eliminada el 1 de Septiembre al superar los 7 días. La entrada del **25 de Agosto** fue eliminada el 2 de Septiembre al superar los 7 días. Las entradas del **26, 27, 28, 29 y 30 de Agosto** fueron eliminadas el 7 de Septiembre al superar los 7 días. Anteriores eliminadas: 16, 17 y 18 de Junio, 5, 6, 7, 9, 11, 12 y 15 de Junio, y días de Mayo.
