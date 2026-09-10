# Registro de Análisis de Cambios — SunCarWeb

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

1. **feat(ofertas) `*_incluidos_en_nombre` — campos nuevos en backend**: Si no están deployados en producción, la selección de checkboxes no persiste entre sesiones (sin error visible, simplemente no se guarda el combo).

2. **fix(ofertas) división por cantidad — edge case cantidad = 0**: Si por alguna razón `cantidad` es 0 en la fórmula, se produce `NaN` o `Infinity` en el nombre. Verificar que hay guard antes de dividir.

3. **fix(ofertas) checkboxes al reabrir — ofertas sin datos de selección previos**: Las ofertas creadas antes de los checkboxes arrancan sin nada marcado, sin adivinar. Confirmar que el usuario entiende que debe volver a marcar el combo para el nombre.

4. **feat(terminos) variantes secciones fijas — tres endpoints nuevos**: `agregarVarianteSeccionFija`, `editarVarianteSeccionFija`, `eliminarVarianteSeccionFija`. Si no están deployados, los toggles y variantes no persisten pero sin error de compilación (fallo silencioso en runtime).

5. **fix(permisos) flag `soloPermiso` — cobertura de iteradores**: El flag resuelve la navegación. Confirmar que todos los demás lugares que iteran el catálogo de módulos (búsquedas, asignaciones en pantalla de permisos, exportaciones de catálogo) también filtran o manejan este flag correctamente.

6. **feat(permisos) `app/solicitudes-materiales` — la app móvil debe checkear el permiso independientemente**: Este sub-permiso se declara en el web panel pero la verificación real ocurre en la app móvil. Confirmar que la app consulta y respeta este permiso antes de mostrar el módulo de solicitudes.

7. **feat(salidas) agrupación por cliente + responsable — matching de strings**: Si "responsable de recogida" es un string libre y hay variaciones de capitalización o espacios, dos entradas diferentes pueden no agruparse cuando deberían, o agruparse cuando no deberían. Confirmar que la comparación es normalizada.

8. **feat(visitas) firmas digitales — dos peticiones, fallo parcial**: Primero se crea/actualiza la visita (JSON) y luego se suben las firmas (imágenes). Si la segunda petición falla, la visita queda sin firmas sin aviso al usuario. No hay rollback.

9. **feat(ofertas) foto de portada de S3 — endpoint ligero `/genericas/fotos-portada`**: El fix posterior (19:52) migra al endpoint ligero. Confirmar que este endpoint existe en el backend de producción; si no existe, el selector fallará con 404 o cargará los datos del endpoint pesado sin filtrar.

10. **feat(actualizaciones) módulo sin `superAdminOnly` — confirmar intención**: Sin este flag, una vez que se asigne el permiso a un trabajador, verá el historial de 180 días. Confirmar que esto es deliberado y que el historial no contiene información sensible que no deba ver personal operativo.

11. **feat(clientes) modal de dev — compatibilidad con leads-table.tsx no actualizado**: El modal rediseñado se usa en clientes, facturas y facturas consolidadas. `leads-table.tsx` no se actualizó (va por detrás en distinción BTB/BTC). Si el modal usa datos que leads-table no provee aún, puede fallar solo en el contexto de leads.

12. **fix(fotos) estado neto — "Visita" no subible pero sí filtrable**: La secuencia fix (13:23) → revert (13:27) en 4 minutos indica ajuste sobre la marcha. Confirmar que no quedaron TypeScript errors residuales de la primera versión que sí quitaba el filtro de la galería.

13. **fix(estudio) campos sin condición de paneles — confirmar con backend**: Inversores, baterías, protecciones y cableado ahora se envían siempre. Si el backend los ignoraba o les aplicaba validaciones condicionadas a `paneles = true`, el estudio puede quedar incompleto o causar 422.

14. **fix(estudio) campo `observaciones` eliminado — confirmar vistas de detalle**: El campo sigue en el tipo para registros antiguos pero ya no se puede escribir. Verificar que no hay vistas de detalle o informes que lo lean directamente y lo muestren en blanco para visitas nuevas, confundiendo al usuario.

---

## 📅 7 de Septiembre, 2026

### Resumen de cambios (últimas 24h)

**11 commits reales** — yany1509 (10) y Fabian1820 (1, co-authored Claude Opus 5). Sesión muy activa con dos autores. Áreas: fix crítico de facturación (validación de stock + agrupación de líneas), refactors de UI en clientes, nuevo formulario estructurado de estudio energético para visitas (reemplaza subida de Excel), captura GPS automática, panel de actualizaciones del sistema en inicio, fix de pestañas de notificaciones, secciones personalizadas con variantes en términos y condiciones, responder peticiones desde la burbuja flotante, y fix de orden de secciones en términos.

---

### Área 1: refactor(clientes) — quita el filtro de tiempo y pliega el de equipo instalado (12:11)

- **`refactor(clientes): quita el filtro de tiempo y pliega el de equipo instalado`** — El bloque de filtros ocupaba casi media pantalla. Se elimina el filtro "Cualquier tiempo" (días desde la creación) junto con `TIEMPO_BUCKETS/TIEMPO_LABELS`, `TIEMPO_RANGES`, `getDiasDesdeCreacionCliente` y el campo del tipo. "Equipo instalado" pasa a ser un Collapsible que arranca plegado. Plegado sigue visible si hay filtro puesto: la cabecera muestra la etiqueta "activo" y el botón de limpiar.

---

### Área 2: refactor(clientes) — quita el encabezado de la tabla, mueve exportar al header (12:18)

- **`refactor(clientes): quita el encabezado de la tabla, mueve exportar al header`** — La Card de la tabla tenía su propio CardHeader ("Clientes" + "Mostrando N clientes") con los botones de exportar. Se quita: la Card empieza directo con la tabla. Los botones de exportar se mueven al ModuleHeader, junto a "Gestionar fuentes" (mismo lugar de leads). Se elimina el prop `exportButtons` de `ClientsTable`.

---

### Área 3: fix(visitas) — evita reutilizar/pisar una visita antigua ya completada (14:06)

- **`fix(visitas): evita reutilizar/pisar una visita antigua ya completada al completar una nueva visita`** — `seleccionarVisitaPendiente` ya no cae en "agarrar cualquiera" (`visitas[0]`) como último recurso; solo reutiliza una visita si está genuinamente abierta. `buscarVisitaExistenteId` ya no lanza error si no encuentra una reutilizable. Guard síncrono (`useRef`) en `handleMarcarSinInfo` y `handleSubmit` para evitar doble envío por doble clic rápido.

---

### Área 4: feat(visitas) — formulario estructurado del estudio energético (reemplaza Excel) (15:46)

- **`feat(visitas): reemplaza la subida de Excel del estudio energético por un formulario estructurado`** — Nuevo componente `EstudioEnergeticoForm` con 8 secciones (punto de suministro, consumo/acometida, vivienda, instalación de paneles, equipamiento estimado, protecciones, cableado, inventario de cargas) más 4 fotos etiquetadas. Todos los campos opcionales, con visibilidad condicional y cálculo en vivo de % de desbalance y carga total.

---

### Área 5: fix(visitas) — captura automática de ubicación GPS en el estudio energético (15:59)

- **`fix(visitas): captura automática de ubicación GPS en el estudio energético`** — Al abrir el formulario, se pide la ubicación una sola vez vía `navigator.geolocation` (silencioso si falla). Se muestra indicador de estado. El campo `ubicacion_gps` ya estaba definido pero nunca conectado a la captura real.

---

### Área 6: feat(inicio) — panel de actualizaciones del sistema + notificar a trabajadores (17:07)

- **`feat(inicio): panel de actualizaciones del sistema + notificar a trabajadores`** — Nueva sección en Inicio. `SystemUpdatesPanel`: lista agrupada Hoy/Ayer con badge de categoría. `PublicarActualizacionDialog`: solo visible para superAdmin. `NotificarTrabajadoresDialog` + `TrabajadoresMultiSelector`: envía la actualización por la campana de cada trabajador seleccionado. Nuevo tipo de notificación `aviso_sistema` con pestaña "Avisos".

---

### Área 7: fix(notificaciones) — las pestañas de categorías no cabían (17:32)

- **`fix(notificaciones): las pestañas de categorías no cabían y no se podían ver`** — Cada pestaña tenía `flex-1`; con 6 categorías no entraban legibles. Ahora cada pestaña tiene ancho natural (`shrink-0`, `whitespace-nowrap`) y la fila desliza horizontalmente.

---

### Área 8: feat(terminos,dashboard) — secciones personalizadas con variantes + tinte de icono (18:41)

- **`feat(terminos,dashboard): secciones personalizadas con variantes + tinte de icono`** — Términos y condiciones: secciones propias con título + texto, 2+ variantes de texto por sección y toggle para apagarla sin borrarla. Al exportar, selector de variante si hay más de una. `export-selection-dialog.tsx` pasa de recibir HTML ya armado a recibir el documento completo. Dashboard: fondo del contenedor de icono se tiñe según el color del icono.

---

### Área 9: feat(peticiones) — responder desde la burbuja, sin ir al módulo (18:54)

- **`feat(peticiones): responder desde la burbuja, sin ir al módulo`** — Para superAdmin, cada petición tiene botón "Responder" (o "Cambiar respuesta") que expande inline el mismo formulario del módulo. Checkbox "Ya está implementada" para las marcadas como posibles. Formulario inline (no modal) porque el panel flotante es angosto (w-96).

---

### Área 10: feat(terminos) — orden elegible al agregar sección + activar/desactivar las fijas (20:00)

- **`feat(terminos): orden elegible al agregar sección + activar/desactivar las fijas`** — `terminos-service.ts`: `agregarSeccionPersonalizada` acepta `insertarDespues`; nuevas `alternarSeccionFija` y `reordenarSecciones`. Diálogo: Switch Activa/Apagada por sección fija; Select "Ubicación" al agregar sección. `terminos-condiciones-export.ts`: arma secciones siguiendo `orden_secciones` y respetando `secciones_fijas_desactivadas`.

---

### Área 11: fix(facturas) — valida existencia al facturar y agrupa líneas por material (20:28)

- **`fix(facturas): valida existencia al facturar y agrupa líneas por material`** — Fix crítico: siete facturas se emitieron sin descontar inventario. La pantalla solo bloqueaba existencia exactamente 0; el backend rechazaba con 400 pero el error se perdía (apiRequest devuelve el error como valor). `ContabilidadService` ahora comprueba el resultado y lanza `StockInsuficienteError`. Si el backend rechaza, la factura NO se guarda. Líneas agrupadas por material; precio unitario ponderado por cantidad.

---

### Puede dar bateo

1. **fix(facturas) `StockInsuficienteError` — si el componente captura genéricamente todos los errores**: El aviso de faltante no llega al usuario.

2. **fix(facturas) precio ponderado — decimales en BD**: Confirmar que el backend acepta precios con decimales en líneas de factura.

3. **fix(facturas) agrupación — materiales no vinculados al catálogo**: Nombre puede quedar vacío. Confirmar fallback.

4. **feat(visitas) JSON + fotos en dos peticiones — fallo parcial**: Visita queda con datos pero sin fotos sin aviso al usuario.

5. **fix(visitas) GPS silencioso — campo opcional en backend**: Confirmar si `ubicacion_gps` es opcional o su ausencia puede causar 422.

6. **feat(inicio) `SystemUpdatesPanel` — confirmar endpoint real en producción**: Verificar que no consume datos mock hardcoded.

7. **feat(inicio) `NotificarTrabajadoresDialog` — endpoint de notificación sin confirmar**: Si el endpoint no existe en producción, el envío fallará silenciosamente o con 404.

8. **feat(notificaciones) tipo `aviso_sistema` — solo en frontend**: Si el backend no envía notificaciones con este tipo, la pestaña "Avisos" quedará siempre vacía.

9. **feat(terminos) `insertarDespues`/`alternarSeccionFija`/`reordenarSecciones` — confirmar en backend de producción**: Si no están deployados, las secciones personalizadas se crearán sin orden configurable y los switches no persistirán.

10. **feat(terminos) `export-selection-dialog` ahora recibe documento completo — callers con HTML pre-armado**: Si hay callers que todavía pasen HTML pre-armado, el export producirá contenido inesperado sin error de compilación.

11. **feat(peticiones) respuesta inline — sin confirmación al cerrar**: Si el superAdmin escribe una respuesta y cierra el panel sin pulsar "Guardar", la respuesta se pierde sin aviso.

12. **refactor(clientes) filtro de tiempo eliminado**: `getDiasDesdeCreacionCliente` y `TIEMPO_BUCKETS` se eliminan. No hay filtro de tiempo alternativo.

---

## Seguimientos vigentes

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
- **feat(inicio) `SystemUpdatesPanel` — confirmar que consume endpoint real y no datos mock hardcoded en producción (Sep 7)**.
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

> ⚠️ **Nota de mantenimiento**: La entrada del **2 de Septiembre** fue eliminada el 10 de Septiembre al superar los 7 días de antigüedad (política de retención semanal). Las entradas del **31 de Agosto** y **1 de Septiembre** fueron eliminadas el 9 de Septiembre al superar los 7 días de antigüedad (política de retención semanal). Las entradas del **19, 20 y 21 de Junio** y del **23 de Junio** fueron eliminadas al superar los 7 días de antigüedad (política de retención semanal). La entrada del **26 de Junio** fue eliminada el 4 de Julio al superar los 7 días. La entrada del **28 de Junio** fue eliminada el 6 de Julio al superar los 7 días. La entrada del **29 de Junio** fue eliminada el 7 de Julio al superar los 7 días. La entrada del **30 de Junio** fue eliminada el 8 de Julio al superar los 7 días. Las entradas del **1 y 2 de Julio** fueron eliminadas el 10 de Julio al superar los 7 días. La entrada del **3 de Julio** fue eliminada el 11 de Julio al superar los 7 días. Las entradas del **4 y 5 de Julio** fueron eliminadas el 13 de Julio al superar los 7 días. La entrada del **6 de Julio** fue eliminada el 14 de Julio al superar los 7 días. La entrada del **7 de Julio** fue eliminada el 15 de Julio al superar los 7 días. La entrada del **8 de Julio** fue eliminada el 17 de Julio al superar los 7 días. La entrada del **10 de Julio** fue eliminada el 18 de Julio al superar los 7 días. La entrada del **11 de Julio** fue eliminada el 19 de Julio al superar los 7 días. La entrada del **13 de Julio** fue eliminada el 21 de Julio al superar los 7 días. La entrada del **14 de Julio** fue eliminada el 22 de Julio al superar los 7 días. La entrada del **15 de Julio** fue eliminada el 23 de Julio al superar los 7 días. La entrada del **17 de Julio** fue eliminada el 25 de Julio al superar los 7 días. La entrada del **18 de Julio** fue eliminada el 26 de Julio al superar los 7 días. La entrada del **19 de Julio** fue eliminada el 27 de Julio al superar los 7 días. La entrada del **20 de Julio** fue eliminada el 28 de Julio al superar los 7 días. La entrada del **21 de Julio** fue eliminada el 30 de Julio al superar los 7 días. La entrada del **22 de Julio** fue eliminada el 30 de Julio al superar los 7 días. La entrada del **23 de Julio** fue eliminada el 31 de Julio al superar los 7 días. La entrada del **24 de Julio** fue eliminada el 1 de Agosto al superar los 7 días. La entrada del **25 de Julio** fue eliminada el 2 de Agosto al superar los 7 días. La entrada del **26 de Julio** fue eliminada el 3 de Agosto al superar los 7 días. La entrada del **27 de Julio** fue eliminada el 4 de Agosto al superar los 7 días. La entrada del **28 de Julio** fue eliminada el 5 de Agosto al superar los 7 días. La entrada del **30 de Julio** fue eliminada el 7 de Agosto al superar los 7 días. La entrada del **31 de Julio** fue eliminada el 8 de Agosto al superar los 7 días. Las entradas del **1, 2 y 3 de Agosto** fueron eliminadas el 10 de Agosto al superar los 7 días. La entrada del **4 de Agosto** fue eliminada el 12 de Agosto al superar los 7 días. La entrada del **5 de Agosto** fue eliminada el 13 de Agosto al superar los 7 días. La entrada del **6 de Agosto** fue eliminada el 14 de Agosto al superar los 7 días. La entrada del **7 de Agosto** fue eliminada el 15 de Agosto al superar los 7 días. La entrada del **8 de Agosto** fue eliminada el 17 de Agosto al superar los 7 días. La entrada del **10 de Agosto** fue eliminada el 18 de Agosto al superar los 7 días. La entrada del **11 de Agosto** fue eliminada el 19 de Agosto al superar los 7 días. La entrada del **12 de Agosto** fue eliminada el 20 de Agosto al superar los 7 días. La entrada del **13 de Agosto** fue eliminada el 21 de Agosto al superar los 7 días. La entrada del **14 de Agosto** fue eliminada el 22 de Agosto al superar los 7 días. La entrada del **15 de Agosto** fue eliminada el 25 de Agosto al superar los 7 días. La entrada del **17 de Agosto** fue eliminada el 25 de Agosto al superar los 7 días. La entrada del **18 de Agosto** fue eliminada el 26 de Agosto al superar los 7 días. La entrada del **19 de Agosto** fue eliminada el 27 de Agosto al superar los 7 días. La entrada del **20 de Agosto** fue eliminada el 28 de Agosto al superar los 7 días. La entrada del **21 de Agosto** fue eliminada el 29 de Agosto al superar los 7 días. La entrada del **22 de Agosto** fue eliminada el 30 de Agosto al superar los 7 días. La entrada del **23 de Agosto** fue eliminada el 31 de Agosto al superar los 7 días. La entrada del **24 de Agosto** fue eliminada el 1 de Septiembre al superar los 7 días. La entrada del **25 de Agosto** fue eliminada el 2 de Septiembre al superar los 7 días. Las entradas del **26, 27, 28, 29 y 30 de Agosto** fueron eliminadas el 7 de Septiembre al superar los 7 días. Anteriores eliminadas: 16, 17 y 18 de Junio, 5, 6, 7, 9, 11, 12 y 15 de Junio, y días de Mayo.
