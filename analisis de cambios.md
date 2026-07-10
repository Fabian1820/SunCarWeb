# Registro de Análisis de Cambios — SunCarWeb

---

## 📅 10 de Julio, 2026

### Resumen de cambios (últimas 24h)

**11 commits reales** de Fabian1820 (7) y yany1509 (4) — jornada muy densa con 5 áreas: (1) ciclo completo en **Facturas Solar Carros** incluyendo todos los materiales de la oferta, selector de oferta múltiple y validación de stock/catálogo por cada material; (2) **nueva vista Facturas** en Obras Terminadas con export sin materiales; (3) fix de paginación de stock en Fichas de Costo (límite backend 500); (4) renombrado de copy "kardex" → "historial de costos"; (5) costos en Instalaciones con columna Entregado en Excel y nombre del creador en reservas.

---

### Área 1: Facturas Solar Carros — ciclo completo de materiales (5 commits — yany1509, 9 Jul)

- **`feat(facturas-solar-carros): incluir todos los materiales de la oferta al facturar instaladora`** (16:40) — Antes solo se guardaban inversor/batería/panel. Ahora se cargan y guardan todos, pero la tabla editable y el descuento de inventario siguen usando solo los principales. Los no principales se guardan con `categoria_principal="otro"` y precio/cantidad original sin re-escalar.

- **`fix(facturas-solar-carros): usar una sola oferta confirmada (la más reciente) al facturar instaladora`** (16:55) — Antes se mezclaban materiales de todas las ofertas confirmadas. Ahora se elige una sola (prioridad: confirmada con componentes > confirmada > cualquiera), desempate por `fecha_creacion` más reciente. Agrega respaldo por `oferta_confeccion` del cliente si el lookup por número falla.

- **`feat(facturas-solar-carros): selector de oferta cuando el cliente tiene varias confirmadas`** (17:10) — Diálogo de selección cuando hay más de una oferta confirmada, ordenadas de más reciente a más antigua. Ofertas sin confirmar nunca se muestran.

- **`feat(facturas-solar-carros): mostrar y validar todos los materiales de la oferta en instaladora`** (17:43) — La tabla "Concepto" muestra todos los materiales de la oferta, cada uno vinculado al catálogo de contabilidad con validación de existencia en stock. Bloquea el guardado si falta vínculo o stock. Precio objetivo escalado proporcionalmente entre todos los materiales.

- **`feat(obras-terminadas): ordenar por fecha de instalación, exportar sin materiales y vista de Facturas`** (18:42) — Nuevo botón "Exportar Excel sin materiales". Nueva vista "Facturas" (selector Obras/Facturas en el header) con listado de facturas de obras terminadas, filtros de fecha de facturación, estado y comercial; ver detalle, PDF por fila, PDF unificado y Excel.

---

### Área 2: Fichas de Costo — fix paginación stock (1 commit — Fabian1820, 9 Jul)

- **`fix(fichas-costo): paginar la carga de stock (el endpoint valida limit<=500)`** (19:40) — El módulo pedía `limit=2000` al backend que respondía 422. Ahora pagina de a 500 hasta traer todos (561 materiales = 2 páginas). Cargar solo la primera página habría ocultado el botón "Costo" a 61 materiales sin ningún aviso.

---

### Área 3: Copy — "kardex" → "historial de costos" (1 commit — Fabian1820, 9 Jul)

- **`copy(costos): "kardex" → "historial de costos" en todo el texto visible`** (20:31) — Cambio solo en copy visible: diálogo Establecer costo, hints del formulario, Fichas de Costo, pestaña del detalle, módulo en nav/header/dashboard, ficha de costo de compra y solicitudes de entrada. Las claves internas `kardex-costo` (permisos/rutas) no se modificaron para no romper accesos.

---

### Área 4: Movimientos — origen en export Excel (1 commit — Fabian1820, 9 Jul)

- **`feat(movimientos): columna "Origen del movimiento" en el export a Excel`** (20:37) — Deriva la etiqueta de `origen_captura`, `estado` y `origen` de la solicitud referenciada, campos ya presentes en la respuesta del backend que el export descartaba. Solo afecta al Excel; tabla en pantalla sin cambios.

---

### Área 5: Costos en Instalaciones + Reservas (2 commits — Fabian1820, 10 Jul)

- **`feat(costos+export): costos en instalaciones y columna Entregado en Excel`** (15:27) — Hook compartido `hooks/use-costos-oferta.ts` (useCostosOferta + formatCostoItem/formatCostoTotal) para no triplicar lógica en los 3 archivos donde el diálogo de entregas está duplicado. Instalaciones en Proceso y Nuevas muestran totales costo entregado/pendiente vía `/entregas-materiales/oferta/{id}/costos`, gateados por el subpermiso aditivo `costos-materiales-cliente`. Nueva columna "Entregado" en Excel (Si / No / Parcial con cantidad) calculada de `item.entregas[]` ya presente en la respuesta sin llamadas extra. Instalaciones Nuevas estrena botón export; helpers comunes en `export-instalaciones-shared.ts`.

- **`feat(reservas): mostrar nombre del creador en detalle de reserva`** (17:46) — Agrega sección "Creado por" al diálogo de detalle usando `creado_por_nombre` resuelto por el backend, con CI como respaldo. Corrige el campo mal nombrado `creado_por` → `creado_por_ci`.

---

### Puede dar bateo

1. **Facturas Solar Carros — precio escalado nulo o incorrecto si algún material no tiene precio en el catálogo de contabilidad**: El precio objetivo se distribuye proporcionalmente entre todos los materiales. Si un material (estructura, cableado, etc.) tiene `precio = null` o `0`, el cálculo proporcional puede producir precios erróneos o la factura puede guardarse con precios cero sin alerta visible.

2. **Facturas Solar Carros — ventana de facturas incorrectas entre commits 16:40 y 16:55**: El primer commit incluyó todos los materiales mezclando múltiples ofertas; el fix (usar solo una) llegó 15 minutos después. Si el auto-deploy estaba activo, hay facturas generadas en esa ventana que mezclan materiales de más de una oferta del cliente.

3. **Selector de oferta — empate en `fecha_creacion` genera orden inestable**: Dos ofertas con exactamente la misma fecha de creación (p.ej. import masivo o migración) pueden mostrarse en orden distinto entre sesiones o recargas sin criterio de desempate estable.

4. **Bloqueo por stock en Facturas Solar Carros — stock leído al abrir, no en tiempo real**: Si otro usuario genera un vale de salida o una factura entre la apertura del diálogo y el guardado, el backend rechazará con 422 por stock insuficiente, pero el usuario no recibió aviso temprano en pantalla.

5. **Vista "Facturas" en Obras Terminadas — endpoint sin confirmar en backend**: La nueva vista asume un endpoint específico para facturas de obras con filtros. Si el backend aún no lo implementó, la vista cargará vacía o con 404 sin ningún indicador de error.

6. **Fix de paginación — snapshot inconsistente entre página 1 y página 2 de stock**: Con movimientos de inventario concurrentes entre las dos llamadas paginadas, la lista consolidada mezcla stocks de dos instantes distintos, pudiendo mostrar disponibilidad incorrecta para materiales en la segunda página.

7. **Clave interna `kardex-costo` sin renombrar — "historial de costos" no encontrable en panel de permisos**: Un SuperAdmin que busque "historial de costos" para asignar permisos no encontrará el módulo porque la clave técnica sigue siendo `kardex-costo`. Puede pensar que el módulo no existe o asignarlo incorrectamente.

8. **Columna "Origen del movimiento" — campos ausentes en movimientos históricos**: Movimientos creados antes de que el backend implementara `origen_captura`, `estado` y `origen` mostrarán la columna vacía sin nota explicativa de datos históricos incompletos.

9. **`costos-materiales-cliente` en Instalaciones — ningún usuario lo tiene hasta asignación manual de SuperAdmin**: El subpermiso aditivo no se hereda de `instalaciones` ni de ningún módulo padre. Sin comunicación activa de que es necesario asignarlo, los costos serán invisibles para todos hasta configuración explícita.

10. **`creado_por` → `creado_por_ci` — reservas históricas en BD con campo original muestran creador vacío**: Reservas anteriores a este commit pueden tener el campo como `creado_por` (sin `_ci`). El detalle mostrará la sección "Creado por" vacía aunque la reserva tenga creador registrado en la BD.

11. **Diálogo de entregas sigue duplicado en 3 archivos — regresiones silenciosas posibles**: El hook extrae la lógica de costos, pero el componente de diálogo en sí permanece duplicado. Diferencias sutiles entre las 3 instancias no capturadas en el hook pueden producir comportamientos distintos según la vista sin ningún error visible.

---

## 📅 8 de Julio, 2026

### Resumen de cambios (últimas 24h)

**8 commits reales** de Fabian1820 y yany1509 — jornada densa con 6 áreas: (1) dos nuevos campos RRHH para MIPYME/TCP; (2) ciclo completo en Fichas de Costo con bloqueo inteligente por compra pendiente y ocultación del botón cuando stock = 0; (3) refactor masivo de exports eliminando lookups al catálogo (-160 líneas); (4) propagación del filtro "Factura cliente" al backend en Obras Terminadas; (5) selector "qué falta" en estado equipo instalado; (6) dashboard de costos de materiales entregados/pendientes en carrito de cliente.

---

### Área 1: RRHH — campos pertenece_mipyme y pertenece_tcp (1 commit — yany1509)

- **`feat(rrhh): agregar campos pertenece_mipyme y pertenece_tcp al trabajador`** (15:45) — Nuevos checkboxes al crear empleado, toggles al editar (pestaña Laboral) y badges en la tabla/detalle. Consume el nuevo endpoint del backend.

---

### Área 2: Fichas de Costo — bloqueo inteligente y restricción por stock (2 commits — Fabian1820)

- **`feat(fichas-costo): atajo a la ficha de compra pendiente + bloquear ajuste`** (14:23) — Cuando el material tiene una entrada pendiente de costeo, el diálogo `EstablecerCostoDialog` deshabilita el botón Guardar y muestra en su lugar un enlace "Ir a costear la compra" que navega directamente a `/compras/{id}/ficha-costo`. Así el usuario no puede hacer un ajuste all-or-nothing que el backend rechazaría de todos modos.

- **`feat(fichas-costo): botón Costo solo con existencias + motivo + quita referencia`** (16:51) — El botón "Costo" solo aparece para materiales con `stock > 0`. El stock se carga una vez al abrir la ficha. El diálogo ahora pide un motivo/causa opcional registrado en el kardex junto con usuario y fecha. El form genérico de Editar material ya NO escribe el costo de referencia al catálogo.

---

### Área 3: Exports — refactor global, nombre del material desde el backend (2 commits — Fabian1820)

- **`refactor(exports): leer nombre del material desde el backend y quitar lookups al catálogo`** (15:59) — El backend ahora expone el nombre del material en las lecturas de facturas de venta, vale, solicitudes y pagos, por lo que los exports ya no necesitan llamar `getAllMaterials()`. Se elimina ese workaround en facturas emitidas (Excel), PDF consolidado, pagos realizados y nombre del vale. Se mantiene fallback a `descripcion` por seguridad. −160 líneas netas.

- **`refactor(obras-terminadas): leer nombre del material del backend en el export`** (17:07) — Extensión del refactor anterior a Obras Terminadas: el export lee `m.nombre` directamente, con fallback a `descripcion`. Se agrega el campo `nombre` al tipo `MaterialOferta`.

---

### Área 4: Obras Terminadas — filtro de factura cliente propagado al backend (1 commit — Fabian1820)

- **`feat(obras-terminadas): propagar filtro de factura cliente al backend`** (17:05) — El toggle "Factura cliente" se envía como parámetro `estado_factura` en la query al backend en lugar de filtrar solo en el cliente. Corrige que antes el filtro solo afectaba la página visible, sin impacto en paginación ni en los exports.

---

### Área 5: Clientes — selector 'qué falta' en estado equipo instalado (1 commit — Fabian1820)

- **`feat(clientes): selector 'qué falta' (aterramiento/otro) en estado equipo instalado`** (17:21) — Nuevo componente `FaltaInstalacionSelect` con tres opciones: "Aterramiento con pica", "Aterramiento con grapa", u "Otro" con texto libre. Capturado al marcar "Equipo instalado con éxito" en `FechaInstalacionDialog` y editable en `edit-client-dialog`. El campo `falta_instalacion` deja de ocultarse en estado instalado.

---

### Área 6: Clientes — dashboard de costos de materiales entregados/pendientes (1 commit — Fabian1820)

- **`feat(costos): mostrar costo de materiales entregados/pendientes en dashboard de cliente`** (17:25) — En el diálogo del carrito se muestran, gateados por el subpermiso ADITIVO `costos-materiales-cliente` (verificado con `hasExactPermission`), el costo por material y los totales entregado/pendiente. Fetch best-effort a `/entregas-materiales/cliente/{n}/costos`; si falla (p.ej. 403) devuelve `null` sin romper el dashboard. Merge por `id de oferta + material_codigo`. Muestra nota de "total parcial" cuando hay materiales sin costo en catálogo.

---

### Puede dar bateo

1. **`pertenece_mipyme`/`pertenece_tcp` — endpoint del backend sin confirmar en código visible**: Si el backend no implementó la aceptación de esos campos en `PUT /{ci}/rrhh`, los checkboxes enviarán datos que serán ignorados silenciosamente o causarán 422, sin feedback al usuario.

2. **Botón "Costo" oculto para `stock > 0` — borde con stock nulo o negativo**: Si el campo de stock devuelve `null`, `undefined` o un valor negativo, la condición `stock > 0` ocultará el botón incluso cuando el material sí debería costearse, sin ningún aviso.

3. **Carga de stock al abrir la ficha — latencia por cada material**: El botón "Costo" requiere cargar el stock de cada material antes de decidir si mostrarlo. En fichas con muchos materiales esto puede generar múltiples llamadas en paralelo y un retraso visible.

4. **"Quita referencia" del costo — cambio de comportamiento sin mensaje de migración**: Usuarios con el hábito de actualizar el costo desde el form "Editar material" encontrarán que el campo ahora es read-only, sin ninguna indicación en pantalla que los dirija al nuevo flujo.

5. **Refactor exports (-160 líneas) — fallback a `descripcion` no cubre backends staging sin campo `nombre`**: Si en algún entorno el backend todavía no expone `nombre` en todas las respuestas, los exports mostrarán la descripción en lugar del nombre sin ningún error visible.

6. **Filtro `estado_factura` propagado al backend — contrato de API sin confirmación**: Si el backend no implementó ese parámetro de filtro, lo ignorará silenciosamente; los usuarios creerán que el filtro funciona pero verán resultados sin filtrar.

7. **`falta_instalacion` texto libre — comparaciones exactas en backend pueden no matchear valores históricos**: Si el backend hace comparaciones exactas con ese campo, los registros históricos con texto distinto quedarán fuera sin aviso.

8. **`hasExactPermission('costos-materiales-cliente')` — subpermiso aditivo, ningún usuario lo tiene hasta asignación manual**: Tener el módulo `clientes` NO concede este subpermiso. Todos los usuarios con acceso a Clientes necesitan que un SuperAdmin se los asigne explícitamente.

9. **Fetch best-effort `/entregas-materiales/cliente/{n}/costos` — 500 silenciado como null**: Si el endpoint devuelve 500, el dashboard lo trata igual que "sin datos", mostrando el panel de costos vacío sin indicador de error real de backend.

10. **Merge por `id de oferta + material_codigo` — posible solapamiento con mismo código en dos ofertas**: Si un cliente tiene materiales con el mismo código en dos ofertas distintas, el merge puede solapar cantidades o costos entre ambas.

---

## 📅 7 de Julio, 2026

### Resumen de cambios (últimas 24h)

**5 commits reales** de Fabian1820 — dos áreas principales: (1) nuevo flujo de "Establecer Costo" inteligente en Fichas de Costo con detección automática del estado del material; (2) ciclo de fixes en exports para mostrar el nombre real del material en lugar de la descripción; más (3) totales globales y nueva columna Descuento en Obras Terminadas.

---

### Área 1: Fichas de Costo — acción "Establecer Costo" inteligente (2 commits — Fabian1820)

- **`feat(fichas-costo): acción "Costo" inteligente (referencia / saldo inicial / ajuste)`** (19:22) — El costo del material sale del form genérico "Editar" (ahora read-only para ese campo) y pasa a una nueva acción dedicada `EstablecerCostoDialog` que detecta el estado real del material automáticamente: sin stock ni kardex → costo de referencia; con stock sin kardex → saldo inicial; con kardex → ajuste de costo. Nuevos métodos `KardexCostoService.saldoInicial` y `ajusteCosto`.

- **`feat(fichas-costo): el diálogo de costo avisa y maneja pendiente_costeo`** (19:43) — `KardexCostoService.mapKardex` mapea `pendiente_costeo`, `regularizada_por` y `tipo`. `EstablecerCostoDialog` detecta costeo pendiente y muestra aviso rojo. Si el ajuste devuelve `con_pendiente=true`, avisa que primero debe ponderarse/sincronizarse la compra antes de ajustar.

---

### Área 2: Exports — nombre real del material (2 commits — Fabian1820)

- **`fix(exports): mostrar nombre del material en vez de la descripción`** (19:37) — Afecta vales, facturas, obras terminadas, solicitudes de venta y pagos. El nombre se enriquece desde el catálogo buscando por código, con fallback a `descripcion` y luego al código.

- **`fix(exports): resolver nombre del material desde el catálogo en facturas emitidas`** (21:01) — Complemento al fix anterior para el Excel de facturas emitidas y PDF consolidado. Los ítems embebidos en facturas solo traen `descripcion` (sin `nombre`), por lo que el primer fix no era suficiente. Solución: lookup por `codigo`/`material_id` desde el catálogo.

---

### Área 3: Obras Terminadas — totales globales y columna Descuento (1 commit — Fabian1820)

- **`feat(obras-terminadas): totales globales, columna Descuento y limpieza`** (21:23) — Barra de totales globales (cobrado / pendiente / facturado + descuentos) independiente de la paginación. Nueva columna "Descuento" con tooltip de desglose. Se elimina la columna "Total Mat." de la tabla y del export Excel.

---

### Puede dar bateo

1. **`EstablecerCostoDialog` — lógica de detección de estado frágil**: La elección entre referencia/saldo inicial/ajuste depende de consultar el estado del material al abrir el diálogo. Si el backend devuelve campos nulos o hay race condition, el diálogo puede elegir el endpoint incorrecto.

2. **`con_pendiente=true` — usuario bloqueado sin flujo alternativo en pantalla**: Cuando el backend responde `con_pendiente`, el diálogo muestra solo un aviso de texto. El usuario queda bloqueado sin enlace directo al flujo de costeo de compra pendiente.

3. **`costoReadonly` en `MaterialForm` — costo inaccesible por flujos legacy**: Flujos de importación o scripts de seed que usaban el form para actualizar el costo quedan silenciosamente rotos.

4. **Dos fixes separados para el mismo problema en 24 minutos — paths de datos no cubiertos**: El primer fix (19:37) no cubrió facturas emitidas; se necesitó un segundo commit (21:01). Puede quedar algún otro export mostrando `descripcion` en lugar del nombre real.

5. **`getAllMaterials()` sin caché compartido — múltiples llamadas al catálogo por export**: Ambos fixes llaman a `getAllMaterials()` de forma independiente. Sin caché compartido, cada export dispara una llamada completa al catálogo.

6. **Totales globales en Obras Terminadas — dependencia de campo de backend sin confirmar**: Si el endpoint no devuelve los totales agregados, las tarjetas mostrarán cero o `undefined` sin aviso.

7. **Eliminación de columna "Total Mat." del Excel — puede romper importaciones externas**: Usuarios con automatizaciones que consumían el Excel esperando esa columna verán que desaparece sin aviso ni versionado del formato.

8. **Ciclo feat→fix en exports (19:37 → 21:01) — ventana de exports incorrectos en producción**: Si hubo auto-deploy entre ambos commits, los exports de facturas emitidas generados en esa ventana tienen `descripcion` en lugar del nombre real.

---

## 📅 6 de Julio, 2026

### Resumen de cambios (últimas 24h)

**5 commits reales** de yany1509 — dos áreas: (1) diálogo de selección de fecha al cambiar estado a "equipo instalado con éxito" y fix del bug de Radix que impedía mostrarlo al editar cliente; (2) totales por moneda en la billetera: feat, rediseño visual de 3 tarjetas y fix del cálculo (volumen total, no neto).

---

### Área 1: Instalaciones — diálogo de fecha de instalación (2 commits — yany1509)

- **`feat(instalaciones): preguntar fecha al cambiar estado a equipo instalado con éxito`** (15:58) — Al cambiar el estado a "equipo instalado con éxito" se abre `FechaInstalacionDialog` para elegir entre el último día del mes anterior o la fecha actual como `fecha_equipo_instalado`.

- **`fix(clientes): mostrar dialog de fecha al cambiar a equipo instalado desde editar cliente`** (17:55) — El `FechaInstalacionDialog` era destruido por Radix UI porque su overlay disparaba `onPointerDownOutside` del diálogo principal. Fix: `preventDefault` en `onPointerDownOutside` e `onInteractOutside` del diálogo principal cuando `fechaInstalacionOpen` está activo.

---

### Área 2: Billetera — totales por moneda en historial (3 commits — yany1509)

- **`feat(billetera): totales por moneda en historial de transacciones`** (16:08) — Muestra ingresos, gastos y neto por moneda sobre TODAS las páginas del historial filtrado. El backend devuelve los totales vía agregación MongoDB junto con los ítems paginados en un solo request.

- **`style(billetera): rediseñar totales como 3 tarjetas Total Ingresos / Total Gastos / Total`** (16:12) — UI de totales reemplazada por 3 tarjetas diferenciadas.

- **`fix(billetera): Total = ingresos + gastos (volumen total, no neto)`** (16:27) — La vista global mostraba valores negativos porque calculaba `ingreso_total - gasto_total`. Fix: suma ambos para mostrar volumen total.

---

### Puede dar bateo

1. **`FechaInstalacionDialog` — `fechaInstalacionOpen` atascado bloquea el diálogo principal**: Si el componente interno rompe, el estado `fechaInstalacionOpen` permanece `true` y el `preventDefault` activo vuelve el diálogo principal imposible de cerrar, forzando recarga de página.

2. **Dos rutas hacia el mismo cambio de estado — posible divergencia**: El diálogo se activa desde Instalaciones en Proceso y desde Editar Cliente. Si ambas rutas llaman endpoints distintos, una puede guardar `fecha_equipo_instalado` y la otra no.

3. **"Último día del mes anterior" sin validación de coherencia temporal**: La opción puede resultar en una fecha de instalación anterior a la fecha de contrato o primera visita, sin ninguna validación.

4. **Totales de billetera — sin fallback si el backend no devuelve los campos de agregación**: Si el API responde sin los campos de totales, las 3 tarjetas mostrarán cero o `undefined` sin aviso.

5. **"Total" cambió de neto a volumen sin nota explicativa en UI**: Usuarios que antes interpretaban "Total" como saldo neto verán un número diferente sin explicación del cambio de semántica.

6. **Ciclo feat→fix en 19 minutos — ventana con totales negativos en producción**: Los tres commits de billetera se completaron entre 16:08 y 16:27. Si hubo deploy automático entre ellos, usuarios que abrieron el historial en esa ventana vieron totales negativos.

---

## 📅 5 de Julio, 2026

### Resumen de cambios (últimas 24h)

**2 commits reales** de Fabian1820 — llegaron a las 23:22 del 4/Jul: (1) fix para mostrar el nombre real del material en el export de Instalaciones en Proceso; (2) sistema de permisos granulares por tarjeta dentro del módulo Instalaciones.

---

### Área 1: Instalaciones en Proceso — nombre de material en export (1 commit — Fabian1820, 23:22)

- **`fix(instalaciones): mostrar nombre del material (no descripción) en export en proceso`** — El export enriquece cada item desde el catálogo buscando por código de material, con fallback a `descripcion` y luego al código.

---

### Área 2: Permisos granulares por tarjeta de Instalaciones (1 commit — Fabian1820, 23:22)

- **`feat(permisos): permiso granular por tarjeta de Instalaciones + trabajos:* anidados`** — Cada una de las 7 tarjetas del módulo Instalaciones pasa a ser un sub-permiso asignable independiente con separador `/`. Los sub-permisos `trabajos:*` se muestran anidados visualmente pero conservan su clave original con `:`. `RouteGuard` acepta `string | string[]` y pasa con cualquiera de los permisos.

---

### Puede dar bateo

1. **Herencia `instalaciones` → 7 sub-permisos solo en runtime**: Los 22 usuarios con `instalaciones` completo en BD heredan los sub-permisos por lógica de prefijo `/` en runtime, no por registros explícitos en BD. Si esa lógica cambia, pierden acceso sin migración de BD.

2. **Dos separadores de sub-permiso en el mismo sistema (`/` vs `:`)**: Los sub-permisos de instalaciones usan barra mientras que los de trabajos usan dos puntos. Dos convenciones distintas aumentan la probabilidad de errores al definir nuevos permisos.

3. **`RouteGuard` con `string[]` — semántica OR sin confirmación formal**: El guard pasa si el usuario tiene CUALQUIERA de los permisos. Si en alguna ruta la intención era requerir TODOS (AND), el gating es demasiado permisivo.

4. **Landing `/instalaciones` vacía sin mensaje para usuario sin sub-permisos**: Si un usuario no tiene ningún `instalaciones/*` asignado, la landing mostrará la lista de tarjetas vacía sin ningún aviso.

5. **Sub-permisos nuevos no asignados automáticamente**: Los 7 `instalaciones/*` se crean en el catálogo pero no se auto-asignan. Un SuperAdmin que crea un usuario nuevo debe asignarlos manualmente uno a uno.

6. **Export Instalaciones en Proceso — `getAllMaterials()` sin caché explícito**: El fix llama a `getAllMaterials()` en cada apertura del dialog de export. Sin caché, cada exportación dispara una llamada completa al catálogo.

---

## 📅 4 de Julio, 2026

### Resumen de cambios (últimas 24h)

**1 commit real** de Fabian1820 — export Excel del módulo **Instalaciones en Proceso** y fix del filtro de fecha en Obras Terminadas.

---

### Área 1: Instalaciones en Proceso + Obras Terminadas (1 commit — Fabian1820, 21:57)

- **`feat(instalaciones): export Excel de instalaciones en proceso + fix filtro fecha obras terminadas`** — Nuevo botón "Exportar Excel" en Instalaciones en Proceso con materiales por cliente vía `/ofertas/confeccion/cliente/{numero}`. Fix en Obras Terminadas: el botón "Rango" del filtro de fecha empieza vacío para no aplicar un filtro silencioso.

---

### Puede dar bateo

1. **Export Instalaciones — N+1 llamadas a `/ofertas/confeccion/cliente/{numero}`**: Para cada cliente en la lista se dispara una petición HTTP separada. Con muchos clientes puede generar decenas de llamadas en paralelo.

2. **Materiales del export representan la oferta actual, no el momento de instalación**: Si la oferta fue modificada después de iniciar la instalación, el Excel mostrará los materiales actuales.

3. **Filtro "Rango" vacío en Obras Terminadas — export sin cota de fecha**: Sin ningún filtro de fecha, una exportación trae el historial completo sin advertencia.

4. **`fecha_equipo_instalado` solo existe desde mayo 2026**: Obras anteriores a mayo 2026 no aparecen en ningún filtro por fecha de forma silenciosa.

5. **Instalación concurrente con cambio de estado**: Si durante la generación del Excel un cliente pasa de "en proceso" a "terminado", los materiales traídos pueden corresponder a un estado ya no válido.

---

## 📅 3 de Julio, 2026

### Resumen de cambios (últimas 24h)

**5 commits reales** de Fabian1820 — jornada centrada en el sistema de exportaciones Excel: (1) Mi Tarjeta promovida a producción; (2) fix en vales de salida para mostrar nombre real del material; (3) ciclo completo feat→fix→refactor en exportaciones de Obras Terminadas y Pagos Realizados.

---

### Área 1: Mi Tarjeta — promovida a producción (1 commit — Fabian1820, 14:40)

- **`chore(mi-tarjeta): quitar badge de fase de prueba`** — El módulo pasa a uso normal. Se retira el banner de aviso y la etiqueta 'Prueba' del menú Mi Perfil.

---

### Área 2: Vales de Salida — nombre de material en export Excel (1 commit — Fabian1820, 15:09)

- **`fix(vales-salida): mostrar nombre del material en export Excel`** — La columna "Material" del export enriquece contra el catálogo para mostrar el nombre real, con respaldo a `material_descripcion` o código.

---

### Área 3: Exportaciones Obras Terminadas y Pagos Realizados — ciclo feat→fix→refactor (3 commits — Fabian1820, 20:17→21:33)

1. **`feat(exportaciones): exportar Excel con materiales aparte`** (20:17) — Workbook de dos hojas: listado principal + hoja de materiales.
2. **`fix(exportaciones): corregir hoja de materiales vacía`** (20:47) — Obras Terminadas lee materiales desde el backend; Pagos Realizados agrega catálogo de respaldo.
3. **`refactor(exportaciones): usar formato de una sola hoja con materiales apilados`** (21:33) — Reemplaza las dos hojas por el patrón de vales de salida. Elimina `lib/export-multi-sheet-service.ts`.

---

### Puede dar bateo

1. **`stackedColumnKeys` en `exportToExcel` — verificar implementación en `lib/export-service.ts`**: Si no está implementado, el export lanzará error silencioso o vacío en runtime.

2. **`lib/export-multi-sheet-service.ts` eliminado — confirmar sin imports residuales**: Si quedó algún import referenciando ese archivo, habrá crash al compilar.

3. **Obras Terminadas export — embedding de materiales en backend no confirmado**: El fix asume que `/obras-terminadas/datos` ya embebe los materiales. Si no, la columna quedará vacía.

4. **Catálogo de respaldo en Pagos Realizados — fallo silencioso**: Si `getAllMaterials()` falla, los materiales con campos opcionales incompletos mostrarán vacíos sin aviso.

5. **Mi Tarjeta sin badge — backend aún sin confirmar**: Quitar el aviso de fase de prueba sin confirmar el backend expone errores 404/500 a usuarios normales.

6. **Vales de salida — `getAllMaterials()` sin caché explícito**: Cada apertura del dialog de export puede disparar una llamada completa al catálogo.

---

#### Seguimientos vigentes

- **Facturas Solar Carros — precio escalado nulo si algún material tiene precio nulo en catálogo de contabilidad (Jul 10)**.
- **Facturas Solar Carros — bloqueo stock al abrir el diálogo, no tiempo real; riesgo de sobreventa en alta concurrencia (Jul 10)**.
- **Vista "Facturas" en Obras Terminadas — endpoint de backend sin confirmar (Jul 10)**.
- **Fix paginación stock — snapshot inconsistente entre página 1 y 2 por concurrencia (Jul 10)**.
- **Clave interna `kardex-costo` sin renombrar — no encontrable como "historial de costos" en panel de permisos (Jul 10)**.
- **Columna "Origen del movimiento" — campos ausentes en movimientos históricos, datos incompletos silenciosos (Jul 10)**.
- **`costos-materiales-cliente` en instalaciones — ningún usuario lo tiene hasta asignación manual de SuperAdmin (Jul 10)**.
- **`creado_por` → `creado_por_ci` — reservas históricas con campo incorrecto muestran creador vacío (Jul 10)**.
- **`pertenece_mipyme`/`pertenece_tcp` — confirmar aceptación en `PUT /{ci}/rrhh` (Jul 8)**.
- **Botón "Costo" — condición `stock > 0` oculta acción para stock null/negativo sin aviso (Jul 8)**.
- **Carga de stock en ficha para mostrar botón "Costo" — múltiples llamadas al backend por material (Jul 8)**.
- **Refactor exports (-160 líneas) — fallback a descripción no cubre backends staging sin campo `nombre` (Jul 8)**.
- **`estado_factura` en query obras terminadas — confirmar soporte en backend (Jul 8)**.
- **`falta_instalacion` texto libre — comparaciones exactas en backend pueden no matchear históricos (Jul 8)**.
- **`hasExactPermission('costos-materiales-cliente')` — ningún usuario lo tiene hasta asignación manual de SuperAdmin (Jul 8)**.
- **Fetch `/entregas-materiales/cliente/{n}/costos` — error 500 silenciado como null, dashboard incompleto sin indicador (Jul 8)**.
- **Merge por `id de oferta + material_codigo` — solapamiento posible con mismo código en dos ofertas del mismo cliente (Jul 8)**.
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

> ⚠️ **Nota de mantenimiento**: Las entradas del **19, 20 y 21 de Junio** y del **23 de Junio** fueron eliminadas al superar los 7 días de antigüedad (política de retención semanal). La entrada del **26 de Junio** fue eliminada el 4 de Julio al superar los 7 días. La entrada del **28 de Junio** fue eliminada el 6 de Julio al superar los 7 días. La entrada del **29 de Junio** fue eliminada el 7 de Julio al superar los 7 días. La entrada del **30 de Junio** fue eliminada el 8 de Julio al superar los 7 días. Las entradas del **1 y 2 de Julio** fueron eliminadas el 10 de Julio al superar los 7 días. Anteriores eliminadas: 16, 17 y 18 de Junio, 5, 6, 7, 9, 11, 12 y 15 de Junio, y días de Mayo.
