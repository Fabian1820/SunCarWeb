# Registro de Análisis de Cambios — SunCarWeb

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

- **`feat(fichas-costo): botón Costo solo con existencias + motivo + quita referencia`** (16:51) — El botón "Costo" solo aparece para materiales con `stock > 0` (los materiales sin stock reciben su costo por el flujo de compras, no por ajuste manual). El stock se carga una vez al abrir la ficha. El diálogo ahora pide un motivo/causa opcional que se registra en el kardex junto con usuario y fecha. El form genérico de Editar material ya NO escribe el costo de referencia al catálogo.

---

### Área 3: Exports — refactor global, nombre del material desde el backend (2 commits — Fabian1820)

- **`refactor(exports): leer nombre del material desde el backend y quitar lookups al catálogo`** (15:59) — El backend ahora expone el nombre del material en las lecturas de facturas de venta, vale, solicitudes y pagos, por lo que los exports ya no necesitan llamar `getAllMaterials()` para resolverlo. Se elimina ese workaround en facturas emitidas (Excel), PDF consolidado, pagos realizados y nombre del vale. El fetch de precios del vale se conserva porque es legítimo. Se mantiene fallback a `descripcion` por seguridad. −160 líneas netas.

- **`refactor(obras-terminadas): leer nombre del material del backend en el export`** (17:07) — Extensión del refactor anterior a Obras Terminadas: el export lee `m.nombre` directamente desde el backend, con fallback a `descripcion`. Se agrega el campo `nombre` al tipo `MaterialOferta`.

---

### Área 4: Obras Terminadas — filtro de factura cliente propagado al backend (1 commit — Fabian1820)

- **`feat(obras-terminadas): propagar filtro de factura cliente al backend`** (17:05) — El toggle "Factura cliente" se envía como parámetro `estado_factura` en la query al backend en lugar de filtrar solo en el cliente. Corrige que antes el filtro solo afectaba la página visible, sin impacto en la paginación ni en los exports PDF y Excel.

---

### Área 5: Clientes — selector 'qué falta' en estado equipo instalado (1 commit — Fabian1820)

- **`feat(clientes): selector 'qué falta' (aterramiento/otro) en estado equipo instalado`** (17:21) — Nuevo componente `FaltaInstalacionSelect` con tres opciones: "Aterramiento con pica" (incluye pica y grapa), "Aterramiento con grapa", u "Otro" con texto libre. Se captura opcionalmente al marcar "Equipo instalado con éxito" en `FechaInstalacionDialog` (prop `showFalta`) y es editable después en `edit-client-dialog`. El campo `falta_instalacion` deja de ocultarse en estado instalado (tanto en detalles como en tabla). Comparaciones de estado normalizadas con `compareStrings`.

---

### Área 6: Clientes — dashboard de costos de materiales entregados/pendientes (1 commit — Fabian1820)

- **`feat(costos): mostrar costo de materiales entregados/pendientes en dashboard de cliente`** (17:25) — En el diálogo del carrito (`clients-table`) se muestran, gateados por el subpermiso ADITIVO `costos-materiales-cliente` (verificado con `hasExactPermission`, NO heredado de `clientes`), el costo por material y los totales entregado/pendiente en costo. Fetch best-effort a `/entregas-materiales/cliente/{n}/costos` en paralelo con los demás datos; si falla (p.ej. 403) devuelve `null` sin romper el dashboard. El merge se hace por `id de oferta + material_codigo`. Muestra nota de "total parcial" cuando hay materiales sin costo en catálogo.

---

### Puede dar bateo

1. **`pertenece_mipyme`/`pertenece_tcp` — endpoint del backend sin confirmar en código visible**: El commit dice "consume el nuevo endpoint del backend" pero si el backend no implementó la aceptación de esos campos en `PUT /{ci}/rrhh`, los checkboxes enviarán datos que serán ignorados silenciosamente o causarán 422, sin ningún feedback al usuario.

2. **Botón "Costo" oculto para `stock > 0` — borde con stock nulo o negativo**: Si el campo de stock devuelve `null`, `undefined` o un valor negativo (posible en entornos con movimientos incorrectos registrados), la condición `stock > 0` ocultará el botón incluso cuando el material sí debería costearse, sin ningún aviso.

3. **Carga de stock al abrir la ficha — latencia por cada material**: El botón "Costo" requiere cargar el stock de cada material antes de decidir si mostrarlo. En fichas con muchos materiales esto puede generar múltiples llamadas al backend en paralelo y un retraso visible antes de que las opciones aparezcan.

4. **"Quita referencia" del costo — cambio de comportamiento sin mensaje de migración**: Usuarios con el hábito de actualizar el costo desde el form "Editar material" encontrarán que el campo ahora es read-only, sin ninguna indicación en pantalla que los dirija al nuevo flujo "Costo".

5. **Refactor exports (-160 líneas) — fallback a `descripcion` cubre backend anterior, no versiones staging más antiguas**: Si en algún entorno el backend todavía no expone `nombre` en todas las respuestas (facturas, vales, solicitudes, pagos), los exports mostrarán la descripción en lugar del nombre sin ningún error visible, haciendo que el refactor parezca correcto en producción pero incompleto en staging.

6. **Filtro `estado_factura` propagado al backend — contrato de API sin confirmación**: El frontend ahora envía `estado_factura` en la query de Obras Terminadas. Si el backend no implementó ese parámetro de filtro, lo ignorará silenciosamente; los usuarios creerán que el filtro funciona pero verán resultados sin filtrar, incluyendo los totales globales y los exports.

7. **`falta_instalacion` texto libre — comparaciones exactas en backend pueden no matchear valores históricos**: La cadena `falta_instalacion` ahora puede contener "Aterramiento con pica", "Aterramiento con grapa" o texto libre arbitrario. Si el backend hace comparaciones exactas con ese campo para filtros o reportes, los registros históricos con texto distinto quedarán fuera sin aviso.

8. **`hasExactPermission('costos-materiales-cliente')` — subpermiso aditivo, ningún usuario lo tiene hasta asignación manual**: Tener el módulo `clientes` NO concede este subpermiso. Todos los usuarios con acceso a Clientes necesitan que un SuperAdmin se los asigne explícitamente. Sin comunicación activa, la funcionalidad de costos será invisible para todos hasta que se configure.

9. **Fetch best-effort `/entregas-materiales/cliente/{n}/costos` — 500 silenciado como null**: Si el endpoint devuelve 500 (error de servidor, no 403), el dashboard lo trata igual que "sin datos", mostrando el panel de costos vacío sin ningún indicador de que hubo un error de backend real.

10. **Merge por `id de oferta + material_codigo` — posible solapamiento con mismo código en dos ofertas**: Si un cliente tiene materiales con el mismo código en dos ofertas distintas, el merge puede solapar cantidades o costos entre ambas, mostrando totales incorrectos sin advertencia.

---

## 📅 7 de Julio, 2026

### Resumen de cambios (últimas 24h)

**5 commits reales** de Fabian1820 — dos áreas principales: (1) nuevo flujo de "Establecer Costo" inteligente en Fichas de Costo con detección automática del estado del material; (2) ciclo de fixes en exports para mostrar el nombre real del material en lugar de la descripción, afectando múltiples módulos; más (3) totales globales y nueva columna Descuento en Obras Terminadas.

---

### Área 1: Fichas de Costo — acción "Establecer Costo" inteligente (2 commits — Fabian1820)

- **`feat(fichas-costo): acción "Costo" inteligente (referencia / saldo inicial / ajuste)`** (19:22) — El costo del material sale del form genérico "Editar" (ahora read-only para ese campo) y pasa a una nueva acción dedicada `EstablecerCostoDialog` que detecta el estado real del material y elige la operación correcta automáticamente:
  - Sin stock ni kardex → costo de referencia en el catálogo (`PUT /productos/{id}`)
  - Con stock, sin kardex → saldo inicial (`POST /kardex-costo/saldo-inicial`)
  - Con kardex → ajuste de costo (`POST /kardex-costo/ajuste-costo`)
  Nuevos métodos `KardexCostoService.saldoInicial` y `ajusteCosto`. Prop `costoReadonly` añadida a `MaterialForm`.

- **`feat(fichas-costo): el diálogo de costo avisa y maneja pendiente_costeo`** (19:43) — `KardexCostoService.mapKardex` ahora mapea los campos `pendiente_costeo`, `regularizada_por` y `tipo`. `EstablecerCostoDialog` detecta cuando la entrada tiene costeo pendiente (modo kardex) y muestra aviso rojo. Si el ajuste devuelve `con_pendiente=true` (nada se ajustó porque hay costeo pendiente), avisa al usuario que primero debe ponderar/sincronizar la compra antes de poder ajustar.

---

### Área 2: Exports — nombre real del material (2 commits — Fabian1820)

- **`fix(exports): mostrar nombre del material en vez de la descripción`** (19:37) — Afecta exports de vales, facturas, obras terminadas, solicitudes de venta y pagos. El nombre se enriquece desde el catálogo buscando por código de material, con fallback a `descripcion` y luego al código si el nombre no está disponible. Las columnas "Descripción" pasan a llamarse "Material" en el vale individual y la factura individual.

- **`fix(exports): resolver nombre del material desde el catálogo en facturas emitidas`** (21:01) — Complemento al fix anterior para el Excel de facturas emitidas y el PDF consolidado. Los ítems embebidos en facturas solo traen `descripcion` (sin `nombre`), por lo que el primer fix no era suficiente. Solución: lookup por `codigo`/`material_id` desde el catálogo. La agregación de la página ahora preserva el `codigo` para que el lookup funcione correctamente.

---

### Área 3: Obras Terminadas — totales globales y columna Descuento (1 commit — Fabian1820)

- **`feat(obras-terminadas): totales globales, columna Descuento y limpieza`** (21:23) — Barra de totales globales (cobrado / pendiente / facturado + descuentos) independiente de la paginación, calculada sobre todo el conjunto filtrado. Nueva columna "Descuento" que consolida descuento comercial + asumido + compensación en una sola celda con tooltip de desglose. Se elimina la columna "Total Mat." de la tabla y del export Excel.

---

### Puede dar bateo

1. **`EstablecerCostoDialog` — lógica de detección de estado frágil**: La elección entre referencia/saldo inicial/ajuste depende de consultar el estado del material (stock y kardex) al abrir el diálogo. Si el backend devuelve campos ausentes o nulos, o hay una race condition entre la consulta y la acción del usuario, el diálogo puede elegir el endpoint incorrecto — ej. usar saldo inicial cuando ya existe kardex, generando duplicación o inconsistencia en el registro de costos.

2. **`con_pendiente=true` — usuario bloqueado sin flujo alternativo en pantalla**: Cuando el backend responde `con_pendiente`, el diálogo muestra solo un aviso de texto. Si el usuario no sabe cómo "ponderar/sincronizar" la compra pendiente (proceso en otro módulo), queda bloqueado sin ninguna acción disponible en la misma pantalla ni enlace directo al flujo correcto.

3. **`costoReadonly` en `MaterialForm` — costo inaccesible por flujos legacy**: Los materiales editados por el form genérico ahora tienen el campo costo deshabilitado permanentemente. Si existe algún flujo de importación, script de seed o pantalla secundaria que usaba el form para actualizar el costo, ese camino queda silenciosamente roto sin ninguna advertencia.

4. **Dos fixes separados para el mismo problema en 24 minutos — paths de datos no cubiertos**: El primer fix (19:37) cubrió vales/facturas/obras/solicitudes/pagos. El segundo fix (21:01) tuvo que corregir el mismo problema en facturas emitidas con lógica adicional. Que se necesitara un segundo commit sugiere que el primer fix no contempló todos los paths de datos embebidos; puede quedar algún otro export mostrando `descripcion` en lugar del nombre real.

5. **`getAllMaterials()` sin caché compartido — múltiples llamadas al catálogo por export**: Ambos fixes llaman a `getAllMaterials()` de forma independiente dentro de sus propios flujos. Sin un caché compartido a nivel de sesión o módulo, cada acción de export dispara una llamada completa al catálogo de materiales, multiplicando la latencia en exports que afectan varias tablas simultáneamente.

6. **Totales globales en Obras Terminadas — dependencia de campo de backend sin confirmar**: La barra de totales es independiente de la paginación, lo que implica que el backend devuelve totales agregados separados de los ítems de página. Si el endpoint aún no incluye estos campos o los devuelve bajo un parámetro de query específico, las tarjetas mostrarán cero o `undefined` sin ningún aviso visible al usuario.

7. **Eliminación de columna "Total Mat." del Excel — puede romper importaciones externas**: Usuarios con automatizaciones o macros que consumían el Excel de Obras Terminadas esperando la columna "Total Mat." verán que desaparece sin previo aviso ni versionado del formato.

8. **Ciclo feat→fix en exports (19:37 → 21:01) — ventana de exports incorrectos en producción**: Si hubo auto-deploy entre ambos commits, los usuarios que exportaron facturas emitidas entre las 19:37 y las 21:01 obtuvieron archivos con `descripcion` en lugar del nombre real del material.

---

## 📅 6 de Julio, 2026

### Resumen de cambios (últimas 24h)

**5 commits reales** de yany1509 — dos áreas: (1) diálogo de selección de fecha al cambiar estado a "equipo instalado con éxito" y fix del bug de Radix que impedía mostrarlo al editar cliente; (2) totales por moneda en la billetera: feat, rediseño visual de 3 tarjetas y fix del cálculo (volumen total, no neto).

---

### Área 1: Instalaciones — diálogo de fecha de instalación (2 commits — yany1509)

- **`feat(instalaciones): preguntar fecha al cambiar estado a equipo instalado con éxito`** (15:58) — Al cambiar el estado de un cliente a "equipo instalado con éxito" desde Instalaciones en Proceso o desde el formulario de edición de cliente, se abre `FechaInstalacionDialog` para elegir entre el último día del mes anterior o la fecha actual como `fecha_equipo_instalado`, antes de confirmar el cambio de estado.

- **`fix(clientes): mostrar dialog de fecha al cambiar a equipo instalado desde editar cliente`** (17:55) — El `FechaInstalacionDialog` era destruido por Radix UI porque al abrirse su overlay disparaba `onPointerDownOutside` del diálogo principal, desmontando el componente y borrando el estado. Fix: `preventDefault` en `onPointerDownOutside` e `onInteractOutside` del diálogo principal cuando `fechaInstalacionOpen` está activo.

---

### Área 2: Billetera — totales por moneda en historial (3 commits — yany1509)

- **`feat(billetera): totales por moneda en historial de transacciones`** (16:08) — Muestra ingresos, gastos y neto por moneda sobre TODAS las páginas del historial filtrado, en vista global y por miembro. El backend devuelve los totales vía agregación MongoDB junto con los ítems paginados en un solo request.

- **`style(billetera): rediseñar totales como 3 tarjetas Total Ingresos / Total Gastos / Total`** (16:12) — UI de totales reemplazada por 3 tarjetas diferenciadas.

- **`fix(billetera): Total = ingresos + gastos (volumen total, no neto)`** (16:27) — La vista global mostraba valores negativos porque calculaba `ingreso_total - gasto_total`. Fix: suma ambos para mostrar volumen total, mismo que la vista de miembro.

---

### Puede dar bateo

1. **`FechaInstalacionDialog` — `fechaInstalacionOpen` atascado bloquea el diálogo principal**: Si el componente interno rompe (error no capturado, llamada al backend colgada), el estado `fechaInstalacionOpen` permanece `true` y el `preventDefault` activo vuelve el diálogo principal imposible de cerrar con click fuera o Escape, forzando recarga de página.

2. **Dos rutas hacia el mismo cambio de estado — posible divergencia**: El diálogo se activa desde Instalaciones en Proceso y desde Editar Cliente. Si ambas rutas llaman endpoints distintos o manejan el resultado diferente, una puede guardar `fecha_equipo_instalado` y la otra no, sin feedback visible al usuario.

3. **"Último día del mes anterior" sin validación de coherencia temporal**: La opción puede resultar en una fecha de instalación anterior a la fecha de contrato o primera visita, sin ninguna validación ni alerta al usuario.

4. **Totales de billetera — sin fallback si el backend no devuelve los campos de agregación**: Si el API responde sin los campos de totales (deploy parcial, versión anterior), las 3 tarjetas mostrarán cero o `undefined` sin ningún aviso al usuario.

5. **"Total" cambió de neto a volumen sin nota explicativa en UI**: Usuarios que antes interpretaban "Total" como saldo neto verán un número más alto y diferente sin ninguna explicación del cambio de semántica en pantalla.

6. **Ciclo feat→fix en 19 minutos — ventana con totales negativos en producción**: Los tres commits de billetera se completaron entre 16:08 y 16:27. Si hubo deploy automático entre ellos, usuarios que abrieron el historial en esa ventana vieron totales negativos antes del fix.

---

## 📅 5 de Julio, 2026

### Resumen de cambios (últimas 24h)

**2 commits reales** de Fabian1820 — llegaron a las 23:22 del 4/Jul, después de que se escribió el análisis de ayer: (1) fix para mostrar el nombre real del material (no la descripción) en el export de Instalaciones en Proceso; (2) sistema de permisos granulares por tarjeta dentro del módulo Instalaciones, con los `trabajos:*` anidados visualmente.

---

### Área 1: Instalaciones en Proceso — nombre de material en export (1 commit — Fabian1820, 23:22)

- **`fix(instalaciones): mostrar nombre del material (no descripción) en export en proceso`** — El export de Instalaciones en Proceso mostraba el campo `descripcion` del item de oferta en lugar del nombre real del material. El fix enriquece cada item desde el catálogo (`MaterialService.getAllMaterials`) buscando por código de material, con fallback a `descripcion` y luego al código si el nombre no está disponible. Mismo patrón que el fix de vales de salida del 3 de Julio.

---

### Área 2: Permisos granulares por tarjeta de Instalaciones (1 commit — Fabian1820, 23:22)

- **`feat(permisos): permiso granular por tarjeta de Instalaciones + trabajos:* anidados`** — Cada una de las 7 tarjetas del módulo Instalaciones pasa a ser un sub-permiso asignable independiente con separador `/`: `instalaciones/pendientes-visita`, `instalaciones/en-proceso`, `instalaciones/nuevas`, `instalaciones/trabajos-diarios`, `instalaciones/averias`, `instalaciones/planificacion-diaria-trabajos`, `instalaciones/ordenes-trabajo`. Los sub-permisos `trabajos:*` se muestran anidados visualmente bajo la tarjeta "Trabajos Diarios" en el panel de permisos pero conservan su clave original con `:` y siguen siendo independientes. `getNombresCatalogo` ahora recorre los anidados. `RouteGuard` acepta `string | string[]` y pasa con cualquiera de los permisos. Compatibilidad verificada: 22 usuarios con `instalaciones` completo en BD heredan las 7 tarjetas por herencia de prefijo `/`; 17 usuarios con `trabajos:*` conservan acceso sin cambios.

---

### Puede dar bateo

1. **Herencia `instalaciones` → 7 sub-permisos solo en runtime**: Los 22 usuarios con `instalaciones` completo en BD heredan los sub-permisos por lógica de prefijo `/` en runtime, no por registros explícitos en BD. Si esa lógica cambia o falla en edge cases, pierden acceso a las 7 tarjetas sin ninguna migración de BD que los proteja.

2. **Dos separadores de sub-permiso en el mismo sistema (`/` vs `:`)**: Los sub-permisos de instalaciones usan barra (`instalaciones/en-proceso`) mientras que los de trabajos usan dos puntos (`trabajos:montaje`). Dos convenciones distintas en el catálogo aumentan la probabilidad de errores al definir nuevos permisos.

3. **`RouteGuard` con `string[]` — semántica OR sin confirmación formal**: El guard pasa si el usuario tiene CUALQUIERA de los permisos del array. Si en alguna ruta la intención era requerir TODOS (AND), el gating es demasiado permisivo.

4. **Landing `/instalaciones` vacía sin mensaje para usuario sin sub-permisos**: Si un usuario no tiene ningún `instalaciones/*` asignado, la landing mostrará la lista de tarjetas vacía sin ningún aviso.

5. **Sub-permisos nuevos no asignados automáticamente desde el panel**: Los 7 `instalaciones/*` se crean en el catálogo pero no se auto-asignan. Un SuperAdmin que crea un usuario nuevo debe asignarlos manualmente uno a uno.

6. **Export Instalaciones en Proceso — `getAllMaterials()` sin caché explícito**: El fix llama a `getAllMaterials()` en cada apertura del dialog de export. Sin caché, cada exportación dispara una llamada completa al catálogo.

---

## 📅 4 de Julio, 2026

### Resumen de cambios (últimas 24h)

**1 commit real** de Fabian1820 — export Excel del módulo **Instalaciones en Proceso** y fix del filtro de fecha en Obras Terminadas.

---

### Área 1: Instalaciones en Proceso + Obras Terminadas (1 commit — Fabian1820, 21:57)

- **`feat(instalaciones): export Excel de instalaciones en proceso + fix filtro fecha obras terminadas`** — Nuevo botón "Exportar Excel" en Instalaciones en Proceso: genera una fila por cliente con código, material y cantidad apilados en el mismo estilo que los demás exports. Los materiales se traen de la oferta confirmada vía `/ofertas/confeccion/cliente/{numero}`. Respeta los filtros aplicados en pantalla. Fix en Obras Terminadas: el botón "Rango" del filtro de fecha ya no pre-rellena el mes actual; empieza vacío para no aplicar un filtro silencioso.

---

### Puede dar bateo

1. **Export Instalaciones — N+1 llamadas a `/ofertas/confeccion/cliente/{numero}`**: Para cada cliente en la lista se dispara una petición HTTP separada al backend. Con muchos clientes en proceso puede generar decenas de llamadas en paralelo, provocando timeouts o throttling.

2. **Materiales del export representan la oferta actual, no el momento de instalación**: Si la oferta fue modificada después de iniciar la instalación, el Excel mostrará los materiales actuales, no los que efectivamente se están instalando.

3. **Filtro "Rango" vacío en Obras Terminadas — export sin cota de fecha**: Sin ningún filtro de fecha, una exportación trae el historial completo sin advertencia al usuario.

4. **`fecha_equipo_instalado` solo existe desde mayo 2026**: Obras anteriores a mayo 2026 no aparecen en ningún filtro por fecha aunque existan en el sistema, de forma silenciosa.

5. **Instalación concurrente con cambio de estado**: Si durante la generación del Excel un cliente pasa de "en proceso" a "terminado", los materiales traídos pueden corresponder a un estado de oferta ya no válido.

---

## 📅 3 de Julio, 2026

### Resumen de cambios (últimas 24h)

**5 commits reales** de Fabian1820 — jornada centrada en el sistema de exportaciones Excel: (1) Mi Tarjeta promovida a producción (quita badge de prueba); (2) fix en vales de salida para mostrar nombre real del material; (3) ciclo completo feat→fix→refactor en exportaciones de Obras Terminadas y Pagos Realizados: primero dos hojas separadas, luego fix de hoja vacía, finalmente consolidación en una sola hoja con materiales apilados.

---

### Área 1: Mi Tarjeta — promovida a producción (1 commit — Fabian1820, 14:40)

- **`chore(mi-tarjeta): quitar badge de fase de prueba`** — El módulo pasa a uso normal. Se retira el banner de aviso del editor y la etiqueta 'Prueba' del menú Mi Perfil.

---

### Área 2: Vales de Salida — nombre de material en export Excel (1 commit — Fabian1820, 15:09)

- **`fix(vales-salida): mostrar nombre del material en export Excel`** — La columna "Material" del export enriquece contra el catálogo para mostrar el nombre del material, con respaldo a `material_descripcion` o código.

---

### Área 3: Exportaciones Obras Terminadas y Pagos Realizados — ciclo feat→fix→refactor (3 commits — Fabian1820, 20:17→21:33)

1. **`feat(exportaciones): exportar Excel con materiales aparte`** (20:17) — Workbook de dos hojas: listado principal + hoja de materiales.
2. **`fix(exportaciones): corregir hoja de materiales vacía`** (20:47) — Obras Terminadas lee materiales desde el backend; Pagos Realizados agrega catálogo de respaldo por material_id.
3. **`refactor(exportaciones): usar formato de una sola hoja con materiales apilados`** (21:33) — Reemplaza las dos hojas por el patrón de vales de salida. Elimina `lib/export-multi-sheet-service.ts`.

---

### Puede dar bateo

1. **`stackedColumnKeys` en `exportToExcel` — verificar implementación en `lib/export-service.ts`**: Si no está implementado, el export lanzará error silencioso o vacío en runtime.

2. **`lib/export-multi-sheet-service.ts` eliminado — confirmar sin imports residuales**: Si quedó algún import referenciando ese archivo, habrá crash al compilar.

3. **Obras Terminadas export — embedding de materiales en backend no confirmado**: El fix asume que `/obras-terminadas/datos` ya embebe los materiales. Si no, la columna quedará vacía.

4. **Catálogo de respaldo en Pagos Realizados — fallo silencioso**: Si `getAllMaterials()` falla al cargar, los materiales con campos opcionales incompletos mostrarán vacíos sin aviso.

5. **Mi Tarjeta sin badge — backend aún sin confirmar**: Quitar el aviso de fase de prueba sin confirmar el backend expone errores 404/500 a usuarios normales.

6. **Vales de salida — `getAllMaterials()` sin caché explícito**: Cada apertura del dialog de export puede disparar una llamada completa al catálogo.

---

## 📅 2 de Julio, 2026

### Resumen de cambios (últimas 24h)

**2 commits reales** de Fabian1820 — (1) nueva pantalla de **Tarjeta de Presentación** del trabajador con QR y enlace público editable; (2) mejora al **filtro de comerciales** en Leads para incluir comerciales de ventas de apoyo combinando dos fuentes de datos.

---

### Área 1: Mi Tarjeta — editor de tarjeta de presentación del trabajador (1 commit — Fabian1820, 20:13)

- **`feat(mi-tarjeta): editor de tarjeta de presentación del trabajador`** — Pantalla `/mi-tarjeta` para que el trabajador edite su tarjeta (título, bio, contacto, redes, foto) contra `/api/tarjetas/mi-tarjeta`, con QR y enlace público. Acceso desde el menú "Mi Perfil". Marcado como fase de prueba.

---

### Área 2: Leads — comerciales de ventas de apoyo en filtro (1 commit — Fabian1820, 21:31)

- **`feat(leads): incluir comerciales de ventas de apoyo en filtro`** — El filtro de comercial une el roster de instaladora con los comerciales distintos ya usados en leads, para que los comerciales de ventas de apoyo aparezcan de forma fiable tras su primer lead. Cache subida a v2.

---

### Puede dar bateo

1. **Endpoint `/api/tarjetas/mi-tarjeta` sin confirmar en backend**: Si no implementó el endpoint, la pantalla fallará con 404 al cargar o guardar.

2. **Tarjeta pública accesible sin autenticación — exposición de datos del trabajador**: Si el enlace público no requiere auth, contacto personal, redes y bio quedan expuestos públicamente sin confirmación de que es el diseño intencional.

3. **Fase de prueba sin gating de permiso**: El módulo es accesible desde el menú "Mi Perfil" para cualquier usuario autenticado sin feature flag ni permiso específico.

4. **Deduplicación de comerciales entre ambas fuentes del filtro**: Si un comercial aparece en ambos endpoints, puede aparecer duplicado en el filtro si no hay deduplicación explícita.

5. **Comerciales dados de baja persisten en el filtro**: `/leads/comerciales` devuelve cualquier nombre que alguna vez fue comercial, incluyendo inactivos o desvinculados.

6. **Fallo parcial silencioso si uno de los dos endpoints cae**: El filtro puede mostrar solo la fuente que funcionó o quedar vacío sin mensaje explicativo.

7. **Cache v2 sin estrategia de rollback en cliente**: Subir la versión invalida la lista v1. Revertir requiere bajar el número en código y un nuevo deploy.

---

## 📅 1 de Julio, 2026

### Resumen de cambios (últimas 24h)

Sin commits nuevos de código. Los 2 commits de Fabian1820 sobre el módulo Movimientos (18:31 y 18:44 del 30 de Junio) ya fueron registrados en la entrada anterior. El único commit propio de este período es "Analisis diario Claude" (generado automáticamente).

---

### Puede dar bateo

Sin cambios nuevos — sin riesgos nuevos.

---

#### Seguimientos vigentes

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

> ⚠️ **Nota de mantenimiento**: Las entradas del **19, 20 y 21 de Junio** y del **23 de Junio** fueron eliminadas al superar los 7 días de antigüedad (política de retención semanal). La entrada del **26 de Junio** fue eliminada el 4 de Julio al superar los 7 días. La entrada del **28 de Junio** fue eliminada el 6 de Julio al superar los 7 días. La entrada del **29 de Junio** fue eliminada el 7 de Julio al superar los 7 días. La entrada del **30 de Junio** fue eliminada el 8 de Julio al superar los 7 días. Anteriores eliminadas: 16, 17 y 18 de Junio, 5, 6, 7, 9, 11, 12 y 15 de Junio, y días de Mayo.
