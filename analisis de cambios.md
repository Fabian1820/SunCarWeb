# Registro de Análisis de Cambios — SunCarWeb

---

## 📅 8 de Septiembre, 2026

### Resumen de cambios (últimas 24h)

**14 commits reales** — yany1509 (14, varios co-authored con Claude Opus 5). Día muy activo: firmas digitales en visitas con PDF descargable, agrupación de vales de salida por cliente+responsable, fix crítico del nombre automático de oferta (capacidad total vs por unidad), checkboxes de materiales para el nombre, selector de fotos de portada desde S3, módulo de actualizaciones con permiso propio, sub-permiso de solicitudes de materiales en app móvil, y varios fixes de permisos, pagos y visitas.

---

### Área 1: feat(visitas) — firmas digitales e informe PDF descargable (09:50)

- **`feat(visitas): firmas digitales e informe PDF descargable`** — Nuevo `PadFirma`: lienzo de firma con ratón/dedo que entrega la firma como PNG (data URI). Se agrega al completar la visita para el instalador y para el cliente, y se envía tanto al crear como al actualizar. Botón "Descargar informe" en visitas realizadas (vista móvil y escritorio): hace `GET /visitas/{id}/informe` para bajar el PDF con todo lo rellenado al completar la visita y las firmas al final. 3 archivos modificados, 204 líneas.

---

### Área 2: feat(salidas) — agrupar vales del mismo cliente y responsable (09:32)

- **`feat(salidas): agrupar vales del mismo cliente y responsable en una sola salida`** — Un cliente con varios vales el mismo día aparecía repetido: una tarjeta y un botón por vale. Ahora los vales con el mismo cliente y el mismo responsable de recogida se muestran juntos: una tarjeta, tabla de materiales de todos los vales (con columna de vale cuando hay más de uno) y un solo botón que confirma la salida de todos con los mismos brigadistas. La selección de brigadistas se guarda por grupo. Vales sin cliente identificable siguen yendo cada uno por su cuenta.

---

### Área 3: fix(ofertas) — nombre automático mostraba capacidad total como si fuera por unidad (08:32)

- **`fix(ofertas): el nombre automático mostraba la capacidad total como si fuera por unidad`** — Bug introducido en el commit de checkboxes (3a3446d): `sumarSeccion` devolvía `potenciaTotal` (suma de cantidad_i × potencia_i de todos los marcados) y el nombre lo imprimía en el formato "cantidad × potencia" — que siempre asumió que el número era por unidad. Ahora `sumarSeccion` devuelve la potencia unitaria y la cantidad total por separado.

---

### Área 4: feat(ofertas) — checkboxes para combinar materiales en el nombre automático

- **`feat(ofertas): checkboxes para combinar materiales en el nombre automático`** — Permite marcar qué materiales de cada categoría se incluyen en el nombre corto de la oferta. El fix del Área 3 corrige el bug que este commit introdujo en `sumarSeccion`.

---

### Área 5: feat(ofertas) — foto de portada desde catálogo S3 (14:56)

- **`feat(ofertas): elegir la foto de portada de nuestro S3 en vez de solo subir una nueva`** — Nuevo botón "Elegir del catálogo" junto a "Subir foto" en Confección de Ofertas. Abre diálogo con grilla de fotos ya guardadas en S3/MinIO, alimentado desde `GET /ofertas/confeccion/genericas/aprobadas`. Sin subida de archivo nuevo.

---

### Área 6: feat(actualizaciones) — módulo con permiso propio + historial 180 días (15:31)

- **`feat(actualizaciones): módulo con permiso propio para ver el historial completo`** — "Actualizaciones del sistema" pasa de panel en Inicio a módulo con página propia: historial de los últimos 180 días agrupado por día, gateado por permisos. Solo accesible para superAdmin de momento.

---

### Área 7: feat(permisos) — app móvil de operaciones + sub-permiso solicitudes de materiales (16:31)

- **`feat(permisos): módulo de la app móvil de operaciones + fix GPS en estudio energético`** — Nuevo módulo en catálogo de permisos para la app móvil de operaciones. Fix del GPS en el estudio energético (problema con la captura de coordenadas).
- **`feat(permisos): sub-permiso app/solicitudes-materiales`** — Nuevo módulo en app: pedir materiales al almacén. Declarado como sub-permiso de la App Móvil. Solo 1 línea en `lib/modulos-catalogo.ts`.

---

### Área 8: fixes de pagos, permisos, visitas y ventas (varios horarios)

- **`fix(pagos): comprobante de pago decía "Solar Carros" en vez de SunCar`** — Fix de branding en el PDF del comprobante.
- **`fix(permisos): el botón Volver de Gestión de Permisos subía a la App Móvil`** — Fix de navegación: el botón Volver ahora va al módulo correcto.
- **`fix(visitas): descargar el informe con el token de sesión`** — El endpoint de descarga del informe PDF no incluía el token de autenticación. Corregido.
- **`feat(ventas): renombra las etiquetas del resumen de pendientes de pago`** — "Total" → "Total de cuentas por cobrar", "Pagado" → "Cobrado". Solo cambio de etiquetas UI.
- **`feat(terminos): UI de variantes también para las 6 secciones fijas`** — Las 6 secciones fijas de términos y condiciones ahora tienen la misma UI de variantes que las personalizadas.

---

### Puede dar bateo

1. **feat(visitas) firma PNG — formato esperado en backend**: `PadFirma` entrega la firma como data URI (`data:image/png;base64,...`). Confirmar que el backend acepta esta representación o si espera bytes raw / multipart.

2. **feat(visitas) actualizar visita sin volver a firmar — campo firma vacío pisa la firma anterior**: Si el instalador reabre el diálogo para editar algo sin dibujar nuevamente, ¿se envía `firma_instalador: null` y destruye la firma ya guardada?

3. **fix(visitas) token en descarga — confirmar que se pasa en header y no en query param**: Algunos endpoints de PDFs requieren el token en query param por limitaciones del browser con `GET`. Confirmar que el backend del informe acepta el token en header.

4. **feat(salidas) agrupación — vales con responsable null**: Si el responsable es null en algunos vales, la comparación de igualdad puede agrupar vales de clientes distintos o separar vales del mismo responsable según la implementación.

5. **fix(ofertas) nombre automático — ofertas ya guardadas con nombre incorrecto**: Las ofertas creadas entre el commit 3a3446d y este fix tienen el nombre calculado incorrectamente en BD. No hay migración mencionada; los nombres históricos quedan mal.

6. **feat(ofertas) S3 photo picker — CORS en producción**: El diálogo carga imágenes de S3/MinIO directamente en el browser. Si el bucket no tiene CORS habilitado para el dominio de admin, las imágenes no cargarán.

7. **feat(actualizaciones) historial 180 días — confirmar paginación en backend**: 180 días puede ser un volumen grande. Confirmar que el backend pagina y que el frontend no pide todo de una sola vez.

8. **feat(permisos) sub-permiso app/solicitudes-materiales — confirmar registro en backend**: Solo se añade 1 línea en `lib/modulos-catalogo.ts`. Si el backend no registra este módulo, la asignación desde Gestión de Permisos fallará silenciosamente.

9. **fix(visitas) token — confirmar que otros endpoints de descarga de PDFs (comprobantes, informes de estudio) también llevan el token**: El fix corrige uno; revisar si el mismo problema afecta a otros endpoints de descarga.

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

- **`fix(visitas): evita reutilizar/pisar una visita antigua ya completada al completar una nueva visita`** — `seleccionarVisitaPendiente` ya no cae en "agarrar cualquiera" (`visitas[0]`) como último recurso; solo reutiliza una visita si está genuinamente abierta. `buscarVisitaExistenteId` ya no lanza error si no encuentra una reutilizable: sigue probando otros endpoints y, si ninguno tiene una abierta, deja que se cree una visita nueva. Se agrega un guard síncrono (`useRef`) en `handleMarcarSinInfo` y `handleSubmit` para evitar doble envío por doble clic rápido.

---

### Área 4: feat(visitas) — formulario estructurado del estudio energético (reemplaza Excel) (15:46)

- **`feat(visitas): reemplaza la subida de Excel del estudio energético por un formulario estructurado`** — Nuevo componente `EstudioEnergeticoForm` con 8 secciones (punto de suministro, consumo/acometida, vivienda, instalación de paneles, equipamiento estimado, protecciones, cableado, inventario de cargas) más 4 fotos etiquetadas (fachada, metrocontador, PGD, área de instalación). Todos los campos opcionales, con visibilidad condicional y cálculo en vivo de % de desbalance y carga total. En `completar-visita-dialog.tsx`: se quita el dropzone de Excel/PDF/Word y su validación obligatoria; se envía `estudio_energetico` en el JSON al crear/actualizar; las 4 fotos se suben etiquetadas después de crear la visita.

---

### Área 5: fix(visitas) — captura automática de ubicación GPS en el estudio energético (15:59)

- **`fix(visitas): captura automática de ubicación GPS en el estudio energético`** — Al abrir el formulario, se pide la ubicación una sola vez vía `navigator.geolocation` (silencioso si falla o no hay permiso). Se muestra indicador de estado (obteniendo / capturada con coordenadas / error / sin soporte). El campo `ubicacion_gps` ya estaba definido pero nunca conectado a la captura real.

---

### Área 6: feat(inicio) — panel de actualizaciones del sistema + notificar a trabajadores (17:07)

- **`feat(inicio): panel de actualizaciones del sistema + notificar a trabajadores`** — Nueva sección en Inicio, debajo del contador de instalaciones. `SystemUpdatesPanel`: lista agrupada Hoy/Ayer con badge de categoría; si no hay nada y el usuario no es superAdmin, no ocupa espacio. `PublicarActualizacionDialog`: título + categoría + mensaje, solo visible para superAdmin. `NotificarTrabajadoresDialog` + `TrabajadoresMultiSelector`: botón "Notificar" junto a cada actualización que abre un buscador multi-select de trabajadores y envía la misma actualización por la campana. Nuevo tipo de notificación `aviso_sistema` con pestaña "Avisos" e icono (Megaphone/índigo).

---

### Área 7: fix(notificaciones) — las pestañas de categorías no cabían (17:32)

- **`fix(notificaciones): las pestañas de categorías no cabían y no se podían ver`** — Cada pestaña tenía `flex-1`; con 6 categorías (se agregó "Avisos") no entraban legibles y no había `overflow-x`. Ahora cada pestaña tiene ancho natural (`shrink-0`, `whitespace-nowrap`) y la fila desliza horizontalmente si no caben todas. Con 6 pestañas el contenido mide 550px contra 382px visibles y el scroll llega al final.

---

### Área 8: feat(terminos,dashboard) — secciones personalizadas con variantes + tinte de icono (18:41)

- **`feat(terminos,dashboard): secciones personalizadas con variantes + tinte de icono`** — Términos y condiciones (BTB/BTC): además de las 7 secciones fijas, ahora se pueden agregar secciones propias con título + texto, con 2+ variantes de texto por sección y toggle para apagarla sin borrarla. Al exportar, si la sección tiene más de una variante aparece un selector para elegir cuál imprimir. `export-selection-dialog.tsx` pasó de recibir el HTML ya armado a recibir el documento completo. Dashboard: el fondo del contenedor de icono ahora se tiñe según el color del icono (mapa de clases Tailwind literales).

---

### Área 9: feat(peticiones) — responder desde la burbuja, sin ir al módulo (18:54)

- **`feat(peticiones): responder desde la burbuja, sin ir al módulo`** — Para superAdmin, cada petición tiene un botón "Responder" (o "Cambiar respuesta" si ya tiene una) que expande inline el mismo formulario del módulo (Select de resolución + comentario + Guardar) sin salir de la burbuja. Se agrega el checkbox "Ya está implementada" para las marcadas como posibles. El formulario es inline (no modal) porque el panel flotante es angosto (w-96).

---

### Área 10: feat(terminos) — orden elegible al agregar sección + activar/desactivar las fijas (20:00)

- **`feat(terminos): orden elegible al agregar sección + activar/desactivar las fijas`** — `terminos-service.ts`: `agregarSeccionPersonalizada` acepta `insertarDespues` ("" = al principio, sin pasar = al final, o clave de otra sección para quedar justo después); nuevas `alternarSeccionFija` y `reordenarSecciones`; `SECCIONES_FIJAS_KEYS/LABELS` y `etiquetaDeClaveSeccion`. Diálogo: cada una de las 6 secciones fijas reordenables tiene su Switch Activa/Apagada; al agregar una sección, un Select "Ubicación" con todas las secciones actuales en orden real. `terminos-condiciones-export.ts`: arma secciones (fijas + personalizadas) siguiendo `orden_secciones` y respetando `secciones_fijas_desactivadas`.

---

### Área 11: fix(facturas) — valida existencia al facturar y agrupa líneas por material (20:28)

- **`fix(facturas): valida existencia al facturar y agrupa líneas por material`** — Fix crítico: siete facturas de Solar Carro se emitieron sin descontar nada del inventario. La pantalla solo bloqueaba materiales con existencia exactamente 0; el backend rechazaba la rebaja con un 400 pero ese rechazo se perdía porque `apiRequest` devuelve el error como valor en vez de lanzarlo. `ContabilidadService` comprueba el resultado de `crearTicket` y `registrarEntrada` y lanza `StockInsuficienteError` con el detalle de cada faltante. Los chequeos de vínculo van antes que el de existencia. Si el backend rechaza (otro usuario consumió el stock), la factura NO se guarda. Las líneas se agrupan por material con nombre del catálogo (sumando cantidades); el precio unitario se pondera por cantidad para que el importe de la línea no cambie.

---

### Puede dar bateo

1. **fix(facturas) `StockInsuficienteError` — si el componente captura genéricamente todos los errores**: La solución lanza `StockInsuficienteError` desde `ContabilidadService` sin cambiar el contrato de `apiRequest`. Si el componente de facturación usa `catch(e) => {}` genérico, el aviso de faltante no llega al usuario.

2. **fix(facturas) precio ponderado — decimales no aceptados en BD**: Al ponderar el precio unitario por cantidad entre varias secciones, el resultado puede tener decimales. Confirmar que el backend acepta precios con decimales en líneas de factura.

3. **fix(facturas) agrupación — materiales no vinculados al catálogo**: Si un material de la oferta no tiene vinculación al catálogo, su nombre en la línea agrupada puede quedar vacío. Confirmar fallback.

4. **feat(visitas) JSON + fotos en dos peticiones — fallo parcial**: El formulario envía `estudio_energetico` en el JSON y las 4 fotos en una segunda petición POST. Si la primera tiene éxito pero falla la de fotos, la visita queda con datos pero sin fotos, sin aviso al usuario.

5. **fix(visitas) GPS silencioso — campo opcional en backend**: La captura falla silenciosamente si el usuario deniega permisos. Confirmar si `ubicacion_gps` es opcional en el backend o si su ausencia puede causar 422.

6. **fix(visitas) guard `useRef` — limpiado al desmontar**: Si el usuario cierra el diálogo mientras se está enviando, el ref se resetea pero el estado puede quedar en `isSubmitting=true`. Verificar que el efecto de limpieza es correcto en el siguiente montaje del diálogo.

7. **feat(inicio) `SystemUpdatesPanel` — confirmar endpoint real**: El commit menciona verificación con "datos mock". Confirmar que el panel consume el endpoint real de actualizaciones en producción y no datos hardcoded.

8. **feat(inicio) `NotificarTrabajadoresDialog` — endpoint de notificación sin confirmar**: El multi-selector envía notificaciones a cada trabajador marcado. Si el endpoint no existe en producción, el envío fallará silenciosamente o con 404.

9. **feat(notificaciones) tipo `aviso_sistema` — solo en frontend**: Si el backend no envía notificaciones con `tipo: "aviso_sistema"`, la pestaña "Avisos" quedará siempre vacía. Confirmar soporte en backend.

10. **feat(terminos) `insertarDespues`/`alternarSeccionFija`/`reordenarSecciones` — confirmar en backend de producción**: Tres endpoints/parámetros nuevos. Si no están deployados, las secciones personalizadas se crearán sin orden configurable y los switches de secciones fijas no persistirán.

11. **feat(terminos) `export-selection-dialog` ahora recibe documento completo — callers con HTML pre-armado**: El prop cambió de HTML ya armado a documento completo. Si hay callers que todavía pasen el HTML pre-armado, el export producirá contenido inesperado sin error de compilación.

12. **feat(peticiones) respuesta inline — sin confirmación al cerrar**: La respuesta inline no tiene confirmación de guardado antes de cerrar el panel. Si el superAdmin escribe una respuesta y cierra el panel sin pulsar "Guardar", la respuesta se pierde sin aviso.

13. **refactor(clientes) filtro de tiempo eliminado — usuarios que lo usaban para auditorías**: `getDiasDesdeCreacionCliente` y `TIEMPO_BUCKETS` se eliminan. No hay filtro de tiempo alternativo. Si algún equipo usaba este filtro para identificar clientes recientes, debe buscar otra forma.

---

## 📅 2 de Septiembre, 2026

### Resumen de cambios (últimas 24h)

**3 commits reales** — Fabian1820 (co-authored Claude Opus 5). Sesión enfocada en exportaciones: limpieza de código muerto de exportación que quedaba duplicado y divergente, nombre de comprobantes de pago más descriptivo, y nombre legible del PDF de ofertas con corrección de moneda al exportar en EUR.

---

### Área 1: refactor(ofertas) — eliminar exportación muerta y duplicada (20:23)

- **`refactor(ofertas): eliminar la exportación muerta y la duplicada`** — Dos copias de la lógica de exportación que no consumía nadie:

  1. **`confeccion-ofertas-view`** construía `exportOptionsCompleto`, `exportOptionsSinPrecios`, `exportOptionsClienteConPrecios` y `baseFilenameExport` (1.464 líneas) que nadie consumía. Estaba enteramente en USD (divergente). Con ella se van los helpers que solo la alimentaban (`formatNumberForExport`, `seccionLabelMap`, `obtenerLabelEstadoOferta`, `nombreCompletoExportable`, `nombreCompletoBackend`, `limpiarNombreSinPaneles`) y el estado `terminosCondiciones` con su efecto (que pedía `/terminos-condiciones/activo` en cada montaje sin que nadie leyera el resultado).

  2. **`export-selection-dialog`** tenía `generarOpcionesExportacionSimple` como respaldo por si no llegaban las opciones. También había divergido (siempre en USD, sin fotos) y ningún llamador la alcanzaba: los tres pasan `exportOptions` siempre.

  El prop `exportOptions` pasa a ser **obligatorio** y tipado como `ReturnType`. Cambio futuro en el servicio de exportación saltará aquí en vez de producir una tercera copia.

  ⚠️ **Nota:** La eliminación del estado `nombreCompletoBackend` (que capturaba `response.data.nombre_completo` del backend y lo usaba para exportaciones) implica que el frontend ya no sobreescribe el nombre generado localmente con el del backend. Esto debería **resolver el bug de la batería** documentado en CLAUDE.md, donde el backend regeneraba el nombre con conversión incorrecta (16kWh → 0.01kWh). El nombre ahora viene exclusivamente del frontend, que ya calculaba correctamente.

---

### Área 2: feat(pagos) — nombre de comprobantes con cliente y oferta (20:22)

- **`feat(pagos): nombre de los comprobantes con el cliente y la oferta`** — Los comprobantes se descargaban como `Comprobante_Pago__.pdf`. Ahora llevan nombre del cliente y número de oferta: `"Comprobante de Pago - Juan Pérez - 2026-09-02 (OF-1234).pdf"`. La fecha distingue dos comprobantes de la misma oferta. El comprobante de devolución de cobro usa el mismo formato. Ambos comparten un helper para no volver a divergir.

---

### Área 3: feat(ofertas) — nombre legible del PDF y arreglo de moneda al exportar (20:22)

- **`feat(ofertas): nombre legible del PDF y arreglo de moneda al exportar`** — Dos grupos de cambios:

  1. **Nombre del PDF**: Pasaba el nombre corto interno. Ahora se compone de los componentes principales resueltos contra el catálogo: `"Sistema fotovoltaico de 16kW de inversor, 10kWh de respaldo en baterías y 12 paneles"`.

  2. **Arreglos de moneda al exportar**:
     - **Exportación "Sin precios"** no recibía `símboloMoneda`, así que rotulaba con "$" aunque la moneda acordada fuera CUP o EUR.
     - **Redondeo en EUR**: el backend redondea en USD; en EUR se divide y puede producir decimales. Ahora el step de redondeo se deduce del precio final en USD y se vuelve a aplicar sobre el importe convertido.

---

### Puede dar bateo

1. **refactor(ofertas) prop `exportOptions` obligatorio — TypeScript falla en build si algún llamador no lo pasa**: Si hay rutas que se cargan dinámicamente (lazy import) y no pasan el prop, el error solo aparece en runtime.

2. **refactor(ofertas) eliminación de `nombreCompletoBackend` — exportaciones que dependían del nombre del backend podrían cambiar en apariencia**: El nombre ahora viene 100% del frontend. Documentos generados a partir de hoy pueden tener nombre diferente al de documentos anteriores de la misma oferta.

3. **refactor(ofertas) eliminación de efecto `/terminos-condiciones/activo` — confirmar que ningún otro componente dependía de ese estado**.

4. **feat(pagos) nombre con caracteres especiales — comportamiento en descarga**: El nombre del cliente puede contener ñ, tildes, comas o apóstrofes. Confirmar que el helper sanitiza el nombre antes de usarlo como nombre de archivo.

5. **feat(pagos) número de oferta disponible siempre — confirmar que el campo está presente en todos los contextos donde se genera el comprobante**: Oferta en borrador sin número asignado puede producir `"Comprobante de Pago - Juan Pérez - 2026-09-02 (OF-).pdf"`.

6. **feat(ofertas) nombre del PDF generado desde catálogo — comportamiento cuando algún material no se resuelve**: Si un material de la oferta ya no existe en el catálogo, puede producir un nombre incompleto como `"Sistema fotovoltaico de kW de inversor"`. Confirmar fallback.

7. **feat(ofertas) `símboloMoneda` en "Sin precios" — confirmar firma actualizada en todos los sitios que llaman la función**.

8. **feat(ofertas) redondeo derivado del precio final en USD — consistencia con redondeo manual**: Si el comercial usó redondeo manual, el step deducido puede ser 0, produciendo precios en EUR sin redondear. Verificar si es el comportamiento esperado.

---

## Seguimientos vigentes

- **refactor(ofertas) prop `exportOptions` obligatorio — confirmar que los tres sitios que lo usan (confección, clientes, leads) siempre lo pasan; lazy imports no detectados por TS pueden fallar en runtime (Sep 2)**.
- **feat(pagos) nombre de comprobante — confirmar que el helper sanitiza caracteres especiales (ñ, tildes, apóstrofes) antes de usarlos como nombre de archivo de descarga (Sep 2)**.
- **feat(pagos) número de oferta en el nombre — confirmar disponibilidad del campo en todos los contextos donde se genera el comprobante; borrador sin número asignado produce nombre malformado (Sep 2)**.
- **feat(ofertas) nombre del PDF desde catálogo — confirmar fallback cuando un material de la oferta ya no existe en el catálogo al momento de exportar (Sep 2)**.
- **feat(ofertas) `símboloMoneda` en "Sin precios" — confirmar que la firma actualizada se propagó a todos los callers; un caller que pase `undefined` explícitamente producirá símbolo vacío (Sep 2)**.
- **feat(ofertas) redondeo en EUR con precio manual — verificar edge case cuando el step de redondeo derivado es 0 (Sep 2)**.
- **feat(clientes) selector de modelo — confirmar parámetros `modelo_codigo`/`cantidad_exacta`/`inversorKwMin/Max`/etc. deployados en backend (Sep 1)**.
- **feat(ofertas) esquema de pago — PATCH al exportar es permanente: confirmar si se emite al cambiar el selector o solo al pulsar "Exportar" (Sep 1)**.
- **fix(busqueda) `normalizeSearchText` en 61 módulos — confirmar que ningún módulo hacía coincidencia exacta que se rompa con la normalización (Sep 1)**.
- **fix(solicitudes) dropdown sin límite — confirmar rendimiento con 100+ resultados en dispositivos móviles (Sep 1)**.
- **chore — avisos de declaraciones sin usar en `confeccion-ofertas-view`: confirmar cuáles son features en pausa y cuáles código muerto antes de eliminar (Sep 1 / Sep 2)**.
- **feat(visitas) JSON + fotos en dos peticiones — confirmar que fallo parcial (JSON ok, fotos fallan) es manejado con aviso al usuario (Sep 7)**.
- **feat(visitas) GPS — confirmar si `ubicacion_gps` es opcional en backend; si es requerido, la captura silenciosa puede causar 422 (Sep 7)**.
- **feat(inicio) `SystemUpdatesPanel` — confirmar que consume endpoint real y no datos mock hardcoded en producción (Sep 7)**.
- **feat(inicio) `NotificarTrabajadoresDialog` — confirmar endpoint de notificación por trabajador en backend de producción (Sep 7)**.
- **feat(notificaciones) tipo `aviso_sistema` — confirmar soporte del tipo en backend para que la pestaña "Avisos" reciba notificaciones reales (Sep 7)**.
- **feat(terminos) `insertarDespues`/`alternarSeccionFija`/`reordenarSecciones` — confirmar en backend de producción (Sep 7)**.
- **feat(terminos) `export-selection-dialog` prop cambiado a documento completo — confirmar que no hay callers que todavía pasen HTML pre-armado (Sep 7)**.
- **fix(facturas) `StockInsuficienteError` — confirmar que el componente de facturación no captura genéricamente todos los errores y sí muestra el aviso de faltante (Sep 7)**.
- **fix(facturas) precio ponderado — confirmar que backend acepta precios con decimales en líneas de factura (Sep 7)**.
- **feat(visitas) firma PNG — confirmar que backend acepta data URI y no bytes raw / multipart; el campo `firma_instalador` en PATCH puede pisar firma anterior si se envía null al editar sin volver a firmar (Sep 8)**.
- **fix(visitas) token en descarga de informe — confirmar que el token se pasa correctamente en header; revisar si otros endpoints de descarga PDF (comprobantes, estudio energético) tienen el mismo problema (Sep 8)**.
- **feat(salidas) agrupación por cliente+responsable — confirmar comportamiento cuando responsable es null en algún vale del mismo cliente (Sep 8)**.
- **fix(ofertas) nombre automático con bug de capacidad total — ofertas guardadas en BD entre 3a3446d y este fix tienen nombres incorrectos; confirmar si se requiere migración (Sep 8)**.
- **feat(ofertas) S3 photo picker — confirmar CORS habilitado en bucket S3/MinIO para el dominio de admin en producción (Sep 8)**.
- **feat(actualizaciones) historial 180 días — confirmar paginación en backend; el módulo solo tiene permiso para superAdmin de momento (Sep 8)**.
- **feat(permisos) sub-permiso app/solicitudes-materiales — confirmar que el backend registra este módulo para que la asignación desde Gestión de Permisos funcione (Sep 8)**.
- **fix(clientes-anulados) — confirmar que los 11 selectores cubiertos son exhaustivos; verificar módulos de instalaciones y órdenes de trabajo no listados en el commit (Ago 29)**.
- **fix(clientes-anulados) — 5 sitios excluidos: confirmar que todos tienen manejo de error visible del backend al intentar crear trabajo sobre un cliente anulado (Ago 29)**.
- **feat(ventas) toggle "Vista Web" PATCH de campo único — confirmar `exclude_unset` en backend para no sobrescribir null en campos no enviados (Ago 29)**.
- **fix(reservas-ventas) aviso general — confirmar que todos los errores del backend llegan al aviso general y no quedan silenciados (Ago 29)**.
- **feat(clientes) tipo "visita" — confirmar deploy de backend con "visita" en Literal del endpoint POST /clientes/{numero}/fotos (Ago 28)**.
- **fix(ofertas-confeccion) bloqueo optimista — confirmar UX cuando el comercial recibe 409 (Ago 28)**.
- **fix(ofertas-confeccion) moneda — ofertas existentes con tasa 0 sin migración automática — requieren edición manual (Ago 28)**.
- **feat(navegacion) "Volver" deducido de MODULOS_CATALOGO — confirmar cobertura completa (Ago 28)**.
- **feat(materiales): facturas históricas con `descripcion` embebida — verificar vista de facturas anteriores al 27 de Agosto (Ago 27)**.
- **feat(ofertas): conversión EUR/CUP ahora sobre "Total a pagar" — confirmar que backend también calcula sobre el total con descuento (Ago 27)**.
- **67 clientes invisibles ~26 días — verificar si se crearon duplicados en el período 31 Jul – 26 Ago (Ago 26)**.
- **Delete definitivo de clientes — confirmar que la restricción "con historial" está en backend y no solo en frontend (Ago 26)**.
- **Backfill de `envio-contenedores/ficha-precios` — confirmar ejecución del script para los 10 usuarios existentes en producción (Ago 25)**.
- **Lote de fotos — diálogo de reintento se pierde si el usuario cierra el diálogo antes de ver el resumen de archivos fallidos (Ago 25)**.
- **`/solicitudes-envio` sin RouteGuard confirmado — accesible por URL directa (Ago 20)**.
- **Permisos de "Preguntas Frecuentes" y "Datos a Averiguar" para comerciales — confirmar asignaciones explícitas en BD (Ago 15)**.
- **`fix(permisos)` — `confirmar_vacio: true` requiere soporte en backend de producción (Ago 14)**.
- **`feat(actualizaciones-felicity)` — página pública sin autenticación SunCar; confirmar seguridad de credenciales (Ago 14)**.
- **`feat(peticiones)` — endpoint de backend sin confirmar; módulo fallará si no está deployado (Ago 14)**.
- **Módulos WhatsApp solo visibles para superAdmin en dashboard pero rutas sin RouteGuard — accesibles con URL directa (Ago 14)**.
- **FuenteSelector — confirmar persistencia de `fuente_referencia` en POST/PATCH leads y clientes en backend (Ago 10)**.
- **Leads "Nuevo"/"Pendiente de pago" — revisar BD por leads persistidos en ventana de ~6 min (Ago 10)**.
- **"Pendiente de instalación" en 21 leads — modal de edición muestra campo vacío sin aviso (Ago 10)**.
- **"Sin respuesta" eliminado de 11 sitios — confirmar migración 100% en BD (Ago 10)**.
- **Anular lead cancela ofertas de confección en cascada — sin flujo de reversa confirmado (Ago 7)**.
- **Filtros leads migrados a backend — confirmar soporte en producción (Ago 7)**.
- **Sub-permiso `informe-direccion/cobros-pendientes` no aditivo — datos financieros visibles a todos los usuarios con `informe-direccion` sin asignación explícita (Ago 6)**.
- **Botón "Eliminar" leads sin gatear con permisos — visible para todos (Ago 5)**.
- **Módulo distribucion-comerciales sin permisos asignados — invisible para todos hasta configuración (Ago 4)**.
- **Endpoint de KPIs comparativos sin confirmar en backend — informe-direccion fallará en runtime (Ago 3)**.
- **330/609 materiales con costo 0 — costeos y facturas pueden ser incorrectos (Ago 3)**.
- **`PATCH /pagos/{id}/cancelar` — endpoint nuevo sin confirmar, cancelaciones fallarán con 404 (Jul 17)**.
- **`/ajustar-saldo` endpoint sin confirmar en backend (Jul 15)**.
- **Fichas de Costo — "Ajuste general" irreversible destruye diferencias por almacén sin confirmación robusta (Jul 13)**.
- **AdminPass 123456 hardcodeado**.
- **Race condition en el cálculo de disponible de reservas**.
- **BMS como categoría reservable — docs sin `.pools` bloquean el 100% de reservas BMS**.

---

> ⚠️ **Nota de mantenimiento**: Las entradas del **19, 20 y 21 de Junio** y del **23 de Junio** fueron eliminadas al superar los 7 días de antigüedad (política de retención semanal). La entrada del **26 de Junio** fue eliminada el 4 de Julio al superar los 7 días. La entrada del **28 de Junio** fue eliminada el 6 de Julio al superar los 7 días. La entrada del **29 de Junio** fue eliminada el 7 de Julio al superar los 7 días. La entrada del **30 de Junio** fue eliminada el 8 de Julio al superar los 7 días. Las entradas del **1 y 2 de Julio** fueron eliminadas el 10 de Julio al superar los 7 días. La entrada del **3 de Julio** fue eliminada el 11 de Julio al superar los 7 días. Las entradas del **4 y 5 de Julio** fueron eliminadas el 13 de Julio al superar los 7 días. La entrada del **6 de Julio** fue eliminada el 14 de Julio al superar los 7 días. La entrada del **7 de Julio** fue eliminada el 15 de Julio al superar los 7 días. La entrada del **8 de Julio** fue eliminada el 17 de Julio al superar los 7 días. La entrada del **10 de Julio** fue eliminada el 18 de Julio al superar los 7 días. La entrada del **11 de Julio** fue eliminada el 19 de Julio al superar los 7 días. La entrada del **13 de Julio** fue eliminada el 21 de Julio al superar los 7 días. La entrada del **14 de Julio** fue eliminada el 22 de Julio al superar los 7 días. La entrada del **15 de Julio** fue eliminada el 23 de Julio al superar los 7 días. La entrada del **17 de Julio** fue eliminada el 25 de Julio al superar los 7 días. La entrada del **18 de Julio** fue eliminada el 26 de Julio al superar los 7 días. La entrada del **19 de Julio** fue eliminada el 27 de Julio al superar los 7 días. La entrada del **20 de Julio** fue eliminada el 28 de Julio al superar los 7 días. La entrada del **21 de Julio** fue eliminada el 30 de Julio al superar los 7 días. La entrada del **22 de Julio** fue eliminada el 30 de Julio al superar los 7 días. La entrada del **23 de Julio** fue eliminada el 31 de Julio al superar los 7 días. La entrada del **24 de Julio** fue eliminada el 1 de Agosto al superar los 7 días. La entrada del **25 de Julio** fue eliminada el 2 de Agosto al superar los 7 días. La entrada del **26 de Julio** fue eliminada el 3 de Agosto al superar los 7 días. La entrada del **27 de Julio** fue eliminada el 4 de Agosto al superar los 7 días. La entrada del **28 de Julio** fue eliminada el 5 de Agosto al superar los 7 días. La entrada del **30 de Julio** fue eliminada el 7 de Agosto al superar los 7 días. La entrada del **31 de Julio** fue eliminada el 8 de Agosto al superar los 7 días. Las entradas del **1, 2 y 3 de Agosto** fueron eliminadas el 10 de Agosto al superar los 7 días. La entrada del **4 de Agosto** fue eliminada el 12 de Agosto al superar los 7 días. La entrada del **5 de Agosto** fue eliminada el 13 de Agosto al superar los 7 días. La entrada del **6 de Agosto** fue eliminada el 14 de Agosto al superar los 7 días. La entrada del **7 de Agosto** fue eliminada el 15 de Agosto al superar los 7 días. La entrada del **8 de Agosto** fue eliminada el 17 de Agosto al superar los 7 días. La entrada del **10 de Agosto** fue eliminada el 18 de Agosto al superar los 7 días. La entrada del **11 de Agosto** fue eliminada el 19 de Agosto al superar los 7 días. La entrada del **12 de Agosto** fue eliminada el 20 de Agosto al superar los 7 días. La entrada del **13 de Agosto** fue eliminada el 21 de Agosto al superar los 7 días. La entrada del **14 de Agosto** fue eliminada el 22 de Agosto al superar los 7 días. La entrada del **15 de Agosto** fue eliminada el 25 de Agosto al superar los 7 días. La entrada del **17 de Agosto** fue eliminada el 25 de Agosto al superar los 7 días. La entrada del **18 de Agosto** fue eliminada el 26 de Agosto al superar los 7 días. La entrada del **19 de Agosto** fue eliminada el 27 de Agosto al superar los 7 días. La entrada del **20 de Agosto** fue eliminada el 28 de Agosto al superar los 7 días. La entrada del **21 de Agosto** fue eliminada el 29 de Agosto al superar los 7 días. La entrada del **22 de Agosto** fue eliminada el 30 de Agosto al superar los 7 días. La entrada del **23 de Agosto** fue eliminada el 31 de Agosto al superar los 7 días. La entrada del **24 de Agosto** fue eliminada el 1 de Septiembre al superar los 7 días. La entrada del **25 de Agosto** fue eliminada el 2 de Septiembre al superar los 7 días. Las entradas del **26, 27, 28, 29 y 30 de Agosto** fueron eliminadas el 7 de Septiembre al superar los 7 días. Las entradas del **31 de Agosto** y **1 de Septiembre** fueron eliminadas el 8 de Septiembre al superar los 7 días. Anteriores eliminadas: 16, 17 y 18 de Junio, 5, 6, 7, 9, 11, 12 y 15 de Junio, y días de Mayo.
