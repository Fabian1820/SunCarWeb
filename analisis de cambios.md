# Registro de Análisis de Cambios — SunCarWeb

---

## 📅 5 de Septiembre, 2026

### Resumen de cambios (últimas 24h)

**17 commits reales** (1 del Sep 3, 16 del Sep 4) — Fabian1820. Sesión extremadamente productiva: nuevo módulo de agenda de citas, refactor de permisos de cobros eliminando la lista de CIs hardcodeada, separación de permisos del Informe de Dirección, tipo de negocio BTB/BTC propio para clientes/leads, nuevas secciones en ofertas (Transformadores, Medidores, Acciones a Realizar), pestañas BTB/BTC en términos de oferta, editar términos desde la UI, seis nuevos códigos de avería, fix crítico de depreciación en asignaciones, y varios refactors de dashboard.

---

### Área 1: refactor(pagos) — editar cobros por permiso, no por lista de CI (Sep 4)

- **`refactor(pagos): editar cobros por permiso, no por lista de CI`** — Elimina la lista de CIs hardcodeada en frontend que controlaba quién podía editar cobros (riesgo documentado desde Jun 23). Pasa a verificar un permiso del sistema igual que el resto de los módulos. Cualquier usuario con el permiso correspondiente puede ahora editar cobros, independientemente de su CI.

---

### Área 2: feat(pagos) — permiso aditivo para cancelar cobros (Sep 4)

- **`feat(pagos): permiso aditivo para cancelar cobros`** — Cancelar cobros ahora es un subpermiso aditivo separado del permiso base de pagos. Antes la cancelación podía estar disponible a todos los usuarios del módulo; ahora solo quienes tengan el subpermiso explícitamente asignado pueden cancelar.

---

### Área 3: fix(pagos) — tasa EUR solicitada como "USD por 1 EUR" (Sep 4)

- **`fix(pagos): pedir la tasa del EUR como "USD por 1 EUR"`** — Corrección en la forma en que se solicita/muestra la tasa de conversión EUR. Antes el campo podía inducir al operador a introducir el valor invertido ("cuántos EUR vale 1 USD" en lugar de "cuántos USD vale 1 EUR"), produciendo importes en EUR incorrectos.

---

### Área 4: feat(ofertas) — secciones Transformadores, Medidores y Acciones a Realizar (Sep 4)

- **`feat(ofertas): secciones Transformadores y Medidores y Acciones a Realizar`** — Tres nuevas secciones opcionales en la confección de ofertas, además de las ya existentes (inversor, baterías, paneles). Permiten incluir en la oferta equipos de transformación, medidores y una sección de acciones a realizar (ej. instalación, mano de obra, documentación).

---

### Área 5: feat(ofertas, terminos) — pestañas BTB/BTC en términos + selector persistido (Sep 4)

- **`feat(ofertas,terminos): pestañas BTB/BTC en términos + selector persistido por oferta`** — Los términos y condiciones se dividen en dos variantes (BTB y BTC) seleccionables en la confección. El selector se persiste por oferta individualmente, no como configuración global. Impacta la exportación del PDF: el bloque de términos incluido depende de la pestaña seleccionada al guardar.

---

### Área 6: feat(informe-direccion) — separar permisos de los dos informes (Sep 4)

- **`feat(informe-direccion): separa los permisos de los dos informes y filtra los cobros`** — El módulo "Informe de Dirección" tenía un único permiso que daba acceso a ambos informes internos. Ahora cada informe tiene su permiso propio. Además, se filtra la vista de cobros según el permiso activo, evitando que se filtren en frontend datos a los que no se tiene acceso.

---

### Área 7: fix(dashboard) — Informe de Dirección duplicado (Sep 4)

- **`fix(dashboard): Informe de Dirección salía duplicado y se colaba en otras áreas`** — Bug visual donde la tarjeta del módulo aparecía dos veces y en áreas incorrectas del dashboard. Fix puro de UI.

---

### Área 8: refactor(dashboard) — Comercial Instaladora, nombres y orden (Sep 4)

- **`refactor(dashboard): nombres cortos y nuevo orden en Comercial Instaladora`** y **`refactor(dashboard): descripciones de Comercial Instaladora a dos líneas`** — Refactor estético del área "Comercial Instaladora" del dashboard: nombres más cortos para las tarjetas de módulo y descripciones reformateadas a dos líneas para mejorar la lectura en pantallas pequeñas.

---

### Área 9: feat(clientes, leads) — tipo_negocio BTB/BTC propio (Sep 4)

- **`feat(clientes,leads): tipo_negocio (BTB/BTC) propio, ya no el del comercial`** — Clientes y leads tienen ahora su propio campo `tipo_negocio` (BTB/BTC) desacoplado del tipo de negocio del comercial asignado. Al crear/editar, el comercial elige explícitamente el tipo. Los registros históricos sin este campo usarán el valor que el backend defina como default.

---

### Área 10: fix(asignaciones) — depreciación mensual del lote, no unitaria (Sep 4)

- **`fix(asignaciones): sumar la depreciación mensual del lote, no la unitaria`** — Bug de cálculo: la depreciación acumulada sumaba el valor unitario de cada unidad del lote en lugar del valor total del lote. Para un lote de 5 unidades con depreciación de $10/mes, antes sumaba $10 en vez de $50. Afecta al cálculo del valor contable de los activos en asignaciones.

---

### Área 11: feat(citas) — módulo de agenda de citas (Sep 4)

- **`feat(citas): módulo de agenda de citas (solo superAdmin de momento)`** — Nuevo módulo de gestión de citas/agenda. Por ahora solo visible para superAdmin en el dashboard. Incluye endpoints de backend propios. La restricción de superAdmin está aplicada a nivel de UI/dashboard; confirmar que hay RouteGuard en la ruta del frontend.

---

### Área 12: feat(averias) — seis códigos nuevos y causa Comunicación (Sep 4)

- **`feat(averias): seis códigos nuevos y la causa Comunicación`** — Se añaden seis nuevos códigos de avería al catálogo y una nueva causa "Comunicación". El frontend los ofrece en el selector; si el backend no los ha añadido a su lista de valores válidos, intentar guardar una avería con estos códigos resultará en error de validación.

---

### Área 13: fix(peticiones) — contenido tapado por header fijo (Sep 4)

- **`fix(peticiones): contenido tapado por el header fijo`** — Fix de layout: el contenido del módulo de peticiones quedaba parcialmente oculto bajo el header fijo. Ajuste de padding/margin sin impacto funcional.

---

### Área 14: feat(ofertas-gestion) — editar términos y condiciones desde UI (Sep 4)

- **`feat(ofertas-gestion): editar términos y condiciones desde la UI`** — Permite editar los términos y condiciones directamente desde la interfaz de gestión de ofertas. Los términos editados son globales: afectan a todas las ofertas que los usen al momento de exportar (no están embebidos por oferta individual).

---

### Área 15: feat(ofertas) — nombre corto del PDF y Excel (Sep 3)

- **`feat(ofertas): acortar el nombre del PDF y el Excel exportados`** — Reduce la longitud del nombre de archivo generado al exportar una oferta como PDF o Excel. Mejora de UX en la descarga; sin impacto funcional.

---

### Puede dar bateo

1. **refactor(pagos) lista CI → permiso — confirmar migración de permisos antes de deploy**: El cambio elimina la lista blanca de CIs. Sin asignar el nuevo permiso a todos los usuarios que antes estaban en la lista, perderán acceso a editar cobros sin aviso (el botón quedará desactivado o recibirán 403).

2. **feat(pagos) subpermiso cancelar cobros — confirmar nombre exacto del permiso en backend y asignación a usuarios existentes**: Si el permiso no está creado en BD, la funcionalidad de cancelar cobros quedará inaccesible para todos.

3. **feat(citas) módulo nuevo solo superAdmin — confirmar RouteGuard y endpoints en backend de producción**: Sin RouteGuard en la ruta del frontend, cualquier usuario autenticado puede acceder por URL directa aunque no aparezca en su dashboard.

4. **feat(ofertas) secciones nuevas (Transformadores, Medidores, Acciones a Realizar) — confirmar soporte en backend**: Si el backend no reconoce los nuevos tipos de sección, una oferta guardada con ellas puede aparentar guardarse pero perder los datos de esas secciones silenciosamente.

5. **feat(ofertas,terminos) pestañas BTB/BTC — ofertas históricas sin `tipo_terminos`**: Al reabrir o exportar una oferta creada antes de este cambio, el frontend no sabrá qué pestaña de términos usar. Confirmar el fallback (BTB por defecto, o la pestaña existente antes del split).

6. **feat(informe-direccion) dos permisos separados — confirmar backfill en BD**: Los usuarios que tenían el permiso unificado necesitan recibir ambos permisos nuevos. Sin backfill, perderán acceso a uno o ambos informes al hacer deploy.

7. **feat(clientes,leads) tipo_negocio propio — registros históricos sin el campo**: Leads y clientes creados antes de este commit no tienen `tipo_negocio` propio en BD. Confirmar valor por defecto del backend y que el frontend no muestra erróneamente el tipo del comercial.

8. **fix(asignaciones) depreciación — valores históricos ya persistidos siguen siendo incorrectos**: El fix corrige el cálculo prospectivo pero no recalcula asignaciones pasadas. Evaluar si se necesita un script de corrección sobre los registros existentes.

9. **feat(averias) nuevos códigos — confirmar en backend antes de usar en producción**: Si el backend valida los códigos contra un enum/lista de valores permitidos y no se ha actualizado, crear una avería con los nuevos códigos devolverá error de validación.

10. **feat(ofertas-gestion) editar términos — confirmar gate de permisos y ausencia de locking concurrente**: Sin un permiso explícito de edición, cualquier usuario de ofertas-gestion puede modificar los términos globales. Sin locking optimista, dos ediciones simultáneas producirán pérdida de datos.

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

  1. **Nombre del PDF**: Pasaba el nombre corto interno (`I-2x8kW+B-1x10kWh+P-12x590W_20260902.pdf`). Ahora se compone de los componentes principales resueltos contra el catálogo, sumando cantidades e indicando paneles por unidades: `"Sistema fotovoltaico de 16kW de inversor, 10kWh de respaldo en baterías y 12 paneles"`. Solo cambia el nombre del archivo; el contenido del PDF y la pantalla no cambian.

  2. **Arreglos de moneda al exportar**:
     - **Exportación "Sin precios"** no recibía `símboloMoneda`, así que rotulaba con "$" aunque la moneda acordada fuera CUP o EUR.
     - **Redondeo en EUR**: el backend redondea en USD (`ceil(total / 10) * 10`); en EUR se divide y 8.500$ → 7.870,37€ (con decimales). Ahora el step de redondeo se deduce del precio final en USD y se vuelve a aplicar sobre el importe convertido. Si el comercial dejó céntimos, eligió no redondear y el convertido tampoco se toca. Con descuento o compensación, solo el bruto se redondea; los descuentos se convierten exactos.

---

### Puede dar bateo

1. **refactor(ofertas) prop `exportOptions` obligatorio — TypeScript falla en build si algún llamador no lo pasa**: El tipado como obligatorio es la garantía, pero si hay rutas que se cargan dinámicamente (lazy import) y no pasan el prop, el error solo aparece en runtime. Confirmar que los tres sitios conocidos (clientes, leads, confección) pasan el prop siempre.

2. **refactor(ofertas) eliminación de `nombreCompletoBackend` — exportaciones que dependían del nombre del backend podrían cambiar en apariencia**: El nombre ahora viene 100% del frontend. Si el nombre frontend y el backend divergían antes, algunos documentos generados a partir de hoy tendrán un nombre diferente al de documentos anteriores de la misma oferta.

3. **refactor(ofertas) eliminación de efecto `/terminos-condiciones/activo` — confirmar que ningún otro componente dependía de ese estado**: El estado `terminosCondiciones` se elimina junto con el efecto. Si algún subcomponente lo recibía como prop (no documentado en el commit), fallará en runtime sin error de compilación.

4. **feat(pagos) nombre con caracteres especiales — comportamiento en descarga**: El nombre del cliente puede contener ñ, tildes, comas o apóstrofes. Algunos navegadores o sistemas de archivos sanitizan el nombre de descarga de forma diferente. Confirmar que el helper sanitiza el nombre antes de usarlo como nombre de archivo.

5. **feat(pagos) número de oferta disponible siempre — confirmar que el campo está presente en todos los contextos donde se genera el comprobante**: Si el comprobante se puede generar desde un contexto donde el número de oferta aún no se ha asignado (oferta en borrador), el nombre resultante podría ser `"Comprobante de Pago - Juan Pérez - 2026-09-02 (OF-).pdf"`.

6. **feat(ofertas) nombre del PDF generado desde catálogo — comportamiento cuando algún material no se resuelve**: Si un material de la oferta ya no existe en el catálogo al momento de exportar (fue eliminado del catálogo), el componente podría quedar vacío o producir un nombre incompleto como `"Sistema fotovoltaico de kW de inversor"`. Confirmar fallback.

7. **feat(ofertas) `símboloMoneda` en "Sin precios" — confirmar firma actualizada en todos los sitios que llaman la función**: El fix añade `símboloMoneda` como parámetro. Si algún llamador no lo pasaba (asumiendo valor por defecto), ahora recibirá el símbolo correcto, pero confirmar que no hay llamador que pase `undefined` explícitamente.

8. **feat(ofertas) redondeo derivado del precio final en USD — consistencia con redondeo manual**: Si el comercial usó el check de "ajustar redondeo manual" (feature del 26 de Agosto), el precio final en USD ya no es un múltiplo de 10. El step de redondeo deducido será 0 (o irregular), lo que puede producir precios convertidos sin redondear. Verificar que este edge case es el comportamiento esperado.

---

## 📅 1 de Septiembre, 2026

### Resumen de cambios (últimas 24h)

**9 commits reales** — Fabian1820 (co-authored Claude Opus 5). Sesión muy activa: saneamiento de código (imports muertos, código muerto, race conditions), corrección de búsquedas sin tildes en toda la app, paginación de compras, esquema de pago configurable por oferta, dos fixes de stock en solicitudes, y dos features de filtrado de clientes por equipo instalado (rangos + modelo exacto).

---

### Área 1: fix(solicitudes) — buscador de materiales truncado y disponible ciego a los pools (16:01)

- **`fix(solicitudes): buscador de materiales truncado y disponible ciego a los pools`** — Dos defectos en el flujo de solicitudes de materiales:

  1. **Buscador con `limit: 15` ordenado por `material_id`**: el orden por defecto del endpoint es `material_id` asc (ObjectId monotono), así que el corte descartaba siempre los materiales añadidos más recientemente. Buscando "cable" en el Almacén de Insumos coincidían 104 materiales y solo salían 15; los cuatro cables solares nuevos ocupaban las posiciones 101–104 y no aparecían. Se quita el tope y se ordena por nombre.

  2. **"Stock disponible" calculado sobre `item.cantidad` (suma de los tres pools)**: el backend solo deja consumir el pool del sector + indistinto. La cifra de cabecera contradecía los badges Instaladora/Ambos y habría dado un falso "sí hay" en cuanto hubiera existencia apartada al otro sector. Se alinea con los pools consumibles. Fallback a `cantidad` si el item viene sin pools.

---

### Área 2: chore(vales-solicitudes) — elimina código muerto verificado (16:24)

- **`chore: elimina codigo muerto verificado en los flujos de vales y solicitudes`** — Lo más relevante: una cadena entera en el exportador de vales (`getMaterialExistencia` + `loadStockByCode`) hacía un `getStock` del almacén completo en cada exportación de PDF y tiraba el resultado. Con el `limit` quitado en e3b2aa23, esa llamada pasó de 200 a 567 filas. Se eliminan también `handleNumeroSerieChange`, `parseMaterialesCount`, `cantidadMateriales` y varios imports/tipos sin usar.

---

### Área 3: fix(busqueda) — buscadores sin tildes y arregla el de vales de salida (17:19)

- **`fix(busqueda): buscadores sin tildes y arregla el de vales de salida`** — Dos grupos de fixes:

  1. **Vales de salida — UX rota en búsqueda**: `if (loading && vales.length === 0)` devolvía el PageLoader de pantalla completa; una búsqueda intermedia que daba 0 resultados desmontaba el buscador, se perdía el foco y el scroll saltaba arriba. El loader de página ahora solo aparece en la carga inicial. Además, dos condiciones de carrera en el mismo hook (respuesta vieja pisando la nueva, `loadMore` concatenando páginas de búsqueda ya sustituida) se resuelven con contador de petición.

  2. **Normalización de tildes en 61 módulos**: los filtros en cliente comparaban con `.toLowerCase().includes()`, que ignora mayúsculas pero no tildes. Se añade `normalizeSearchText` a `lib/utils/string-utils.ts` y se aplica en los 61 módulos que filtran en cliente. No se reutiliza `containsString` existente para no cambiar el comportamiento de coincidencia de espacios y puntuación.

---

### Área 4: chore(typescript) — quita imports, tipos y parámetros sin usar en todo el repo (17:40)

- **`chore: quita imports, tipos y parametros sin usar en todo el repo`** — Barrido de avisos de `tsc --noUnusedLocals --noUnusedParameters` fuera de los flujos ya limpiados. Solo se toca lo inequívoco: imports y especificadores sin usar (borrados), tipos e interfaces locales sin usar (borrados), parámetros sin usar (prefijados con `_`, nunca borrados). 45 archivos, 110 ediciones. Quedan 121 avisos pendientes sobre declaraciones con cuerpo (funciones, constantes, estado de React) que requieren decisión humana.

---

### Área 5: feat(compras) — paginación en el listado y lista completa en los selectores (18:12)

- **`feat(compras): paginacion en el listado y lista completa en los selectores`** — El hook pedía las compras sin parámetros, recibía solo las 50 más recientes por defecto y filtraba en cliente. Con 129 compras vivas, 79 eran invisibles. Pasa a paginación de servidor (páginas de 20, búsqueda con debounce, filtros de estado/tipo/pago al backend, cualquier cambio de filtro vuelve a la primera página) siguiendo el modelo de `useLeads` + `SmartPagination`. Los selectores de solicitudes de entrada usan ahora `getAllCompras()`, que recorre las páginas.

---

### Área 6: feat(ofertas) — elegir el esquema de pago al confeccionar y al exportar (18:24)

- **`feat(ofertas): elegir el esquema de pago de la oferta al confeccionar y al exportar`** — Los porcentajes de "Formas de pago" salían fijos del texto de `terminos_condiciones`. Ahora la oferta lleva su propio reparto. Selector con tres esquemas fijos (50/30/20, 40/40/20, 50/40/10), un personalizado que valida que sume 100, y "por defecto" para heredar el texto de la BD. Disponible en la confección (y por tanto en edición y duplicado) y en el diálogo de exportación, donde hace PATCH sobre la oferta. El render está en `buildTerminosCondicionesHtml`, que ya recibe la oferta desde los tres caminos de exportación. Si la oferta tiene pagos acordados, esa sección sigue mandando.

---

### Área 7: feat(clientes) — filtro por capacidad del equipo instalado (19:59)

- **`feat(clientes): filtro por capacidad del equipo instalado`** — Añade tres rangos al panel de filtros de Clientes: inversor en kW, baterías en kWh y número de paneles, resueltos en el backend con los nuevos parámetros `inversorKwMin/Max`, `bateriaKwhMin/Max` y `panelesMin/Max`. Para un valor exacto se pone el mismo número en ambas casillas. Cada fila muestra el equipo acumulado del cliente (suma de todas sus ofertas confirmadas). Los límites llevan debounce propio; se guardan como texto para no confundir "sin límite" con el 0. Un cliente cuyo equipo no se puede resolver no aparece en el filtro.

---

### Área 8: fix(ofertas) — no imprimir hitos de pago en 0 % (20:50)

- **`fix(ofertas): no imprimir los hitos de pago que van en 0 %`** — Al usar un reparto de dos tramos (ej. 50/0/50), el PDF mostraba "0 % a la entrega de los suministros". La viñeta de un hito en 0 ya no se genera. La palabra "restante" en el último tramo solo aparece si antes se enumeró algún otro hito; sin nada delante, "restante" no tiene referente. Si el reparto llegara todo a 0 se devuelve el texto de la BD sin modificar.

---

### Área 9: feat(clientes) — selector de modelo de equipo y rangos en "Más filtros" (21:09)

- **`feat(clientes): selector de modelo de equipo y rangos en "Mas filtros"`** — El comercial pidió elegir el material concreto de inversor, batería y panel con la cantidad exacta, como en confección de ofertas. Ese selector pasa a ser el filtro principal de equipo. Los rangos de capacidad se recogen en un plegable "Más filtros" (siguen siendo necesarios: un mismo kW se reparte entre varios modelos). Cada opción del selector lleva delante la potencia y detrás cuántos clientes la tienen. La casilla de cantidad se habilita solo con un modelo elegido (sola no filtra nada) y comparte el debounce con los rangos.

---

### Puede dar bateo

1. **feat(clientes) selector de modelo — parámetros nuevos en backend**: El selector envía `modelo_codigo` y opcionalmente `cantidad_exacta` al endpoint de clientes. Confirmar que el backend tiene estos parámetros deployados; si no, el selector devuelve silenciosamente todos los clientes sin filtrar.

2. **feat(clientes) filtros de rango — texto vacío vs "0" como límite**: Los límites se guardan como texto para distinguir "sin límite" (`""`) de 0 kW. Confirmar que el frontend serializa y el backend deserializa estos casos de forma consistente; un `""` que llega como `0` en el backend aplicaría un filtro de `>= 0 kW` que excluiría clientes sin equipo resuelto.

3. **feat(ofertas) esquema de pago — PATCH permanente desde el diálogo de exportación**: El diálogo de exportación hace PATCH sobre la oferta al confirmar. El comercial puede entrar al diálogo, cambiar el esquema "para esta exportación" y salir sin exportar, habiendo modificado el dato persistido sin saberlo. Confirmar si el PATCH se emite al cambiar el selector o solo al pulsar "Exportar".

4. **fix(ofertas) hito 0% — "restante" con un solo hito no-cero**: Si el único hito no-cero es el de puesta en marcha (ej. 0/0/100), el texto generado sería "100% restante con la puesta en marcha" sin que haya habido pagos anteriores. Confirmar que el texto tiene sentido comercialmente en ese edge case.

5. **feat(compras) `getAllCompras()` para selectores — sin cota de páginas**: La función pagina todas las compras sin límite. Si la colección crece mucho, esta precarga puede volverse lenta para los diálogos de solicitudes de entrada. Considerar una cota de seguridad.

6. **fix(busqueda) `normalizeSearchText` en 61 módulos — superficie de cambio amplia**: Confirmar que ninguno de los 61 módulos hacía coincidencia exacta que se rompa con la normalización, especialmente en filtros donde el texto del criterio tiene significado técnico (códigos, referencias alfanuméricas con tilde).

7. **fix(solicitudes) dropdown sin límite — rendimiento con 100+ resultados**: El buscador del diálogo ahora puede devolver 100+ items (104 cables documentados). Si el dropdown no está virtualizado, renderizar todos puede ser lento en dispositivos móviles.

8. **chore imports — 121 avisos de declaraciones sin usar pendientes en `confeccion-ofertas-view`**: Los 32 avisos en ese archivo incluyen cálculos de margen por material, constantes de descuento y helpers de exportación que pueden ser features a medio cablear. Confirmar cuáles son código muerto real y cuáles son funcionalidad en pausa antes de eliminar. (Nota: el refactor del 2 de Sep eliminó parte de estos helpers; el recuento puede haber bajado.)

---

## 📅 31 de Agosto, 2026

### Resumen de cambios (últimas 24h)

Sin commits nuevos de código. El único commit del período es "Analisis diario Claude" (generado automáticamente). No hay cambios en producción en SunCarWeb.

---

### Puede dar bateo

Sin cambios nuevos — sin riesgos nuevos.

---

## 📅 30 de Agosto, 2026

### Resumen de cambios (últimas 24h)

Sin commits nuevos de código. El único commit del período es "Analisis diario Claude" (generado automáticamente). No hay cambios en producción en SunCarWeb.

---

### Puede dar bateo

Sin cambios nuevos — sin riesgos nuevos.

---

## 📅 29 de Agosto, 2026

### Resumen de cambios (últimas 24h)

**3 commits reales** — Fabian1820 (co-authored Claude Opus 5). Sesión nocturna con foco en clientes anulados y el flujo de venta de materiales no vendibles: se extiende el filtro de anulados a 11 selectores, se introduce el check de "no vendibles" en los diálogos de venta/reserva/vale, y se corrige el manejo de errores del backend en reservas para que el motivo real sea visible.

---

### Área 1: fix(clientes-anulados) — filtra anulados en 11 selectores de cliente (23:21)

- **`fix(clientes-anulados): filtra anulados en los selectores de cliente`** — Once dropdowns cargaban la lista completa y ofrecían clientes anulados para crear trabajo nuevo. Sitios cubiertos: ofertas personalizadas y de confección, facturas, generar factura de obra, pago y POS de inventario, crear avería, averías y actualizaciones de trabajos diarios, órdenes de trabajo y fuente de lead.

  Quedan sin filtrar intencionalmente: lista-planificaciones, facturas-section, ofertas-confeccionadas y los trabajos-diarios de "todos" y "registro", donde el backend ya rechaza la creación con un motivo claro y esconder al anulado rompería la vista de sus registros.

---

### Área 2: feat(ventas) — check para vender material no vendible sin publicarlo en la web (23:29)

- **`feat(ventas): check para vender material no vendible sin publicarlo en la web`** — El comercial tenía que encender `habilitar_venta_web` para que un material de catálogo le saliera en el buscador (lo que además lo publicaba en la tienda pública) y acordarse de apagarlo después. Con varios materiales a la vez era pesado y fácil de olvidar.

  1. **Nuevo check "Incluir materiales no vendibles"** en los diálogos de solicitud de venta, crear/editar reserva y vale de salida. Cambia el buscador al catálogo completo (server-side, mismo endpoint que solicitud de materiales), marca los resultados no vendibles y abre un campo obligatorio de motivo y quién autorizó.
  2. **El motivo sigue exigido aunque se apague el check** después de haber agregado un no vendible, para que el backend no rechace la operación con un error inexplicado.
  3. **Fix adicional — toggle "Vista Web"**: mandaba el material completo en cada clic, reenviando precio, nombre, foto y especificaciones con lo que tuviera cargado esa pestaña, revirtiendo ediciones hechas en paralelo desde otra sesión. Ahora manda solo el campo que cambia, igual que guardar especificaciones y precios por cantidad.
  4. **El merge optimista de `use-materials` pasa a tolerar payloads parciales**.

---

### Área 3: fix(reservas-ventas) — el rechazo del backend deja de parecer falta de stock (23:34)

- **`fix(reservas-ventas): el rechazo del backend deja de parecer falta de stock`** — El `catch` del diálogo colgaba cualquier error del backend del campo de materiales, asumiendo que siempre era stock insuficiente por race condition. Con la validación de cliente anulado ese supuesto se rompió: el mensaje "el cliente está anulado" aparecía bajo la lista de materiales.

  Ahora va a un aviso general sobre los botones, con el mismo formato que el de solicitudes de materiales. `validate()` reemplaza el objeto de errores al empezar cada submit, así que el aviso se limpia solo entre intentos.

---

### Puede dar bateo

1. **fix(clientes-anulados) — cobertura de los 11 selectores sin confirmar exhaustividad**: El commit lista explícitamente los sitios cubiertos y los excluidos. Confirmar que no quedan otros selectores de cliente en módulos no mencionados (ej. instalaciones internas, flujos de histórico) que sigan ofreciendo anulados.

2. **fix(clientes-anulados) — 5 sitios excluidos delegan en el rechazo del backend**: Confirmar que todos tienen manejo de error visible (no `alert()`) para que el usuario vea el motivo del rechazo al intentar crear trabajo sobre un anulado.

3. **feat(ventas) motivo exigido aunque se desactive el check**: Un comercial puede activar el check, agregar un material no vendible, desactivarlo y aún necesitar rellenar el motivo. Verificar que el mensaje de error en ese caso es claro y señala correctamente el campo.

4. **feat(ventas) catálogo completo server-side**: El endpoint del catálogo completo es el mismo que usa solicitud de materiales. Confirmar que devuelve resultados correctamente para los 3 diálogos nuevos (solicitud de venta, reserva y vale de salida) y que `habilitar_venta_web` no afecta a lo que ese endpoint devuelve.

5. **feat(ventas) toggle "Vista Web" PATCH de campo único**: El fix cambia el contrato de datos enviados. Confirmar que el backend PATCH acepta payloads de un solo campo (con `exclude_unset`) y no sobrescribe con `null` los demás campos cuando no se envían.

6. **feat(ventas) merge optimista tolerante a payloads parciales en `use-materials`**: Si el merge asume que todos los campos existen, un material sin algún campo opcional puede mostrar valores desactualizados sin error visible. Confirmar cobertura de edge cases.

7. **fix(reservas-ventas) aviso general**: Confirmar que todos los errores del backend (no solo "stock insuficiente" y "cliente anulado") llegan al aviso general y no quedan silenciados por el catch.

---

## Seguimientos vigentes

- **refactor(pagos) lista CI → permiso — confirmar que todos los CIs de la lista blanca tienen el nuevo permiso asignado antes de deploy; sin migración, usuarios pierden acceso a editar cobros (Sep 5)**.- **feat(pagos) subpermiso cancelar cobros — confirmar nombre del permiso en backend y asignación a usuarios existentes (Sep 5)**.
- **feat(citas) módulo nuevo — confirmar RouteGuard en ruta frontend y todos los endpoints de `/citas/` deployados en backend de producción (Sep 5)**.
- **feat(ofertas) secciones Transformadores/Medidores/Acciones — confirmar soporte en backend; datos de secciones nuevas pueden perderse silenciosamente si el backend no las reconoce (Sep 5)**.
- **feat(ofertas,terminos) pestañas BTB/BTC — ofertas históricas sin `tipo_terminos` en BD; confirmar fallback y comportamiento al exportar PDF (Sep 5)**.
- **feat(informe-direccion) dos permisos separados — confirmar backfill de ambos permisos para usuarios con el permiso unificado anterior (Sep 5)**.
- **feat(clientes,leads) tipo_negocio propio — confirmar valor por defecto del backend para registros históricos sin el campo (Sep 5)**.
- **fix(asignaciones) depreciación del lote — valores históricos ya persistidos en BD siguen siendo incorrectos; evaluar script de corrección (Sep 5)**.
- **feat(averias) nuevos códigos y causa Comunicación — confirmar que backend tiene los nuevos valores en su lista válida antes de usar en producción (Sep 5)**.
- **feat(ofertas-gestion) editar términos — confirmar gate de permisos (cualquier usuario de ofertas-gestion puede editar términos globales) y ausencia de locking concurrente (Sep 5)**.
- **refactor(ofertas) prop `exportOptions` obligatorio — confirmar que los tres sitios que lo usan (confección, clientes, leads) siempre lo pasan; lazy imports no detectados por TS pueden fallar en runtime (Sep 2)**.
- **feat(pagos) nombre de comprobante — confirmar que el helper sanitiza caracteres especiales (ñ, tildes, apóstrofes) antes de usarlos como nombre de archivo de descarga (Sep 2)**.
- **feat(pagos) número de oferta en el nombre — confirmar disponibilidad del campo en todos los contextos donde se genera el comprobante; borrador sin número asignado produce nombre malformado (Sep 2)**.
- **feat(ofertas) nombre del PDF desde catálogo — confirmar fallback cuando un material de la oferta ya no existe en el catálogo al momento de exportar (Sep 2)**.
- **feat(ofertas) `símboloMoneda` en "Sin precios" — confirmar que la firma actualizada se propagó a todos los callers; un caller que pase `undefined` explícitamente producirá símbolo vacío (Sep 2)**.
- **feat(ofertas) redondeo en EUR con precio manual — verificar que el step de redondeo derivado del precio en USD es 0 cuando el comercial usó redondeo manual, y que el resultado en EUR sin redondear es el comportamiento esperado (Sep 2)**.
- **feat(clientes) selector de modelo — confirmar parámetros `modelo_codigo`/`cantidad_exacta`/`inversorKwMin/Max`/etc. deployados en backend (Sep 1)**.
- **feat(ofertas) esquema de pago — PATCH al exportar es permanente: confirmar si se emite al cambiar el selector o solo al pulsar "Exportar" (Sep 1)**.
- **fix(busqueda) `normalizeSearchText` en 61 módulos — confirmar que ningún módulo hacía coincidencia exacta que se rompa con la normalización (Sep 1)**.
- **fix(solicitudes) dropdown sin límite — confirmar rendimiento con 100+ resultados en dispositivos móviles (Sep 1)**.
- **chore — avisos de declaraciones sin usar en `confeccion-ofertas-view`: confirmar cuáles son features en pausa y cuáles código muerto antes de eliminar; el refactor del 2 de Sep eliminó algunos helpers, revisar el recuento actualizado (Sep 1 / Sep 2)**.
- **fix(clientes-anulados) — confirmar que los 11 selectores cubiertos son exhaustivos; verificar módulos de instalaciones, órdenes de trabajo internas y otros flujos no listados en el commit (Ago 29)**.
- **fix(clientes-anulados) — 5 sitios excluidos: confirmar que todos tienen manejo de error visible del backend al intentar crear trabajo sobre un cliente anulado (Ago 29)**.
- **feat(ventas) check no vendibles — motivo exigido aunque el check se desactive tras agregar material: confirmar que el mensaje de error es claro en ese flujo (Ago 29)**.
- **feat(ventas) toggle "Vista Web" PATCH de campo único — confirmar `exclude_unset` en backend para no sobrescribir null en campos no enviados (Ago 29)**.
- **fix(reservas-ventas) aviso general — confirmar que todos los errores del backend (no solo stock y anulado) llegan al aviso general y no quedan silenciados (Ago 29)**.
- **feat(clientes) tipo "visita" — confirmar deploy de backend con "visita" en Literal del endpoint POST /clientes/{numero}/fotos antes de usar en producción (Ago 28)**.
- **fix(ofertas-confeccion) bloqueo optimista — confirmar UX cuando el comercial recibe 409: ¿puede ver los cambios del otro y fusionarlos o solo ve un error opaco? (Ago 28)**.
- **fix(ofertas-confeccion) borradores con caducidad 2h — verificar si es suficiente para sesiones largas de confección (Ago 28)**.
- **fix(ofertas-confeccion) moneda — ofertas existentes con tasa 0 sin migración automática — requieren edición manual por el comercial para exportar en moneda correcta (Ago 28)**.
- **feat(navegacion) "Volver" deducido de MODULOS_CATALOGO — confirmar cobertura completa: módulos no registrados siguen volviendo a "/" (Ago 28)**.
- **feat(materiales): facturas históricas con `descripcion` embebida — verificar vista de facturas anteriores al 27 de Agosto para detectar campos vacíos o nombres incorrectos (Ago 27)**.
- **feat(materiales): StockItem con `material_nombre` nuevo — confirmar que todos los consumidores de StockItem manejan el nuevo campo y no tienen referencias al campo viejo (Ago 27)**.
- **feat(ofertas): conversión EUR/CUP ahora sobre "Total a pagar" — confirmar que backend también calcula la conversión sobre el total con descuento y no sobre `precio_final` (Ago 27)**.
- **feat(ofertas): descuento % antiguo en solo lectura — confirmar que no se pierde en borradores o duplicaciones sin guardar (Ago 27)**.
- **fix(ofertas) PDF: `tipoNoMaterial` como mecanismo de exclusión frágil — nuevos tipos especiales deben agregarse explícitamente o se duplicarán como secciones de materiales (Ago 27)**.
- **67 clientes invisibles ~26 días — verificar si se crearon duplicados de los 67 clientes en el período 31 Jul – 26 Ago; buscar por CI o teléfono (Ago 26)**.
- **Delete definitivo de clientes — confirmar que la restricción "con historial" está en backend y no solo en frontend (Ago 26)**.
- **Precio manual en ofertas — confirmar que el rango se recalcula al duplicar y que el backend acepta precios con decimales si el atajo "sin redondeo" los produce (Ago 26)**.
- **Backfill de `envio-contenedores/ficha-precios` — confirmar ejecución del script para los 10 usuarios existentes en producción (Ago 25)**.
- **PATCH /compras y /ficha — confirmar `exclude_unset` en backend de producción para que modo solo-costos no pise datos del económico (Ago 25)**.
- **Lote de fotos — diálogo de reintento se pierde si el usuario cierra el diálogo antes de ver el resumen de archivos fallidos (Ago 25)**.
- **`/solicitudes-envio` sin RouteGuard confirmado — accesible por URL directa (Ago 20)**.
- **Alertas de stock silenciables — confirmar persistencia en backend vs localStorage (Ago 20)**.
- **Permisos de "Preguntas Frecuentes" y "Datos a Averiguar" para comerciales — confirmar asignaciones explícitas en BD (Ago 15)**.
- **"Preguntas Frecuentes" y "Datos a Averiguar" modificables sin audit trail — cambios afectan al wizard en tiempo real (Ago 15)**.
- **`fix(permisos)` — `confirmar_vacio: true` requiere soporte en backend de producción (Ago 14)**.
- **`fix(permisos)` — revisar otros servicios en `api-services.ts` con `.catch(() => [])` sobre errores `success:false` (Ago 14)**.
- **`feat(actualizaciones-felicity)` — página pública sin autenticación SunCar; confirmar seguridad de credenciales de Felicity y validación en backend (Ago 14)**.
- **`feat(preguntas-frecuentes)` sin RouteGuard — accesible a cualquier usuario autenticado; ahora también sin RouteGuard para "Datos a Averiguar" (Ago 14)**.
- **`feat(numeros-prueba)` — endpoints de backend sin confirmar en producción (Ago 14)**.
- **`perf(chatwoot)` SSO paralelo — confirmar manejo de error cuando una rama paralela falla (Ago 14)**.
- **`feat(peticiones)` — endpoint de backend sin confirmar; módulo fallará si no está deployado (Ago 14)**.
- **`feat(chatwoot)` SSO — Platform API puede haber cambiado desde el código original del 6 de Julio (Ago 14)**.
- **Cherry-pick batch — confirmar que no hay otros arrastra de dependencias como el del directorio telefónico (Ago 14)**.
- **Módulos WhatsApp solo visibles para superAdmin en dashboard pero rutas sin RouteGuard — accesibles con URL directa (Ago 14)**.
- **FuenteSelector — confirmar persistencia de `fuente_referencia` en POST/PATCH leads y clientes en backend (Ago 10)**.
- **GestionarFuentesDialog — confirmar que reasignación de fuentes es atómica en backend (Ago 10)**.
- **Leads "Nuevo"/"Pendiente de pago" — revisar BD por leads persistidos en ventana de ~6 min (Ago 10)**.
- **"Pendiente de instalación" en 21 leads — modal de edición muestra campo vacío sin aviso (Ago 10)**.
- **"Sin respuesta" eliminado de 11 sitios — confirmar migración 100% en BD (Ago 10)**.
- **Clientes anular/activar — confirmar endpoint `updateClienteStatus` en backend (Ago 10)**.
- **EstadoInstalacionMultipleDialog — confirmar endpoint de actualización masiva en backend (Ago 10)**.
- **GET /pagos/cobradores + parámetro `recibido_por` — confirmar ambos en backend (Ago 10)**.
- **Anular lead cancela ofertas de confección en cascada — sin flujo de reversa confirmado (Ago 7)**.
- **Reactivar con `LEAD_DUPLICADO_TELEFONO` — usuario bloqueado sin navegación al duplicado ni opción de fusión (Ago 7)**.
- **Filtros leads migrados a backend — confirmar soporte en producción (Ago 7)**.
- **Paginación paralela de a 5 en exportación — puede saturar backend en listas grandes (Ago 7)**.
- **Sub-permiso `informe-direccion/cobros-pendientes` no aditivo — datos financieros visibles a todos los usuarios con `informe-direccion` sin asignación explícita (Ago 6)**.
- **`sanitizarTelefono()` modifica el input silenciosamente (Ago 5)**.
- **Botón "Eliminar" leads sin gatear con permisos — visible para todos (Ago 5)**.
- **Backfill de sub-permisos leads — confirmar ejecución para los 26 trabajadores en producción (Ago 5)**.
- **`telefono_adicional_nombre` — confirmar soporte en endpoints POST/PATCH /leads/{id} (Ago 5)**.
- **Módulo distribucion-comerciales sin permisos asignados — invisible para todos hasta configuración (Ago 4)**.
- **Filtro equipo_comercial en Leads/Clientes — confirmar que el campo llega desde el backend (Ago 4)**.
- **Endpoint de KPIs comparativos sin confirmar en backend — informe-direccion fallará en runtime (Ago 3)**.
- **Excel facturas-emitidas — nueva columna "Código" rompe importaciones que leen por posición de columna (Ago 3)**.
- **330/609 materiales con costo 0 — costeos y facturas pueden ser incorrectos (Ago 3)**.
- **`renderFactura` con `incluirMateriales: false` — edge cases sin cobertura (Jul 24)**.
- **PDF masivo obras-terminadas sin cota máxima — puede bloquear navegador (Jul 24)**.
- **Cálculo "pendiente" en Detalle de Cobros solo en frontend — desincronía con totales del backend (Jul 23)**.
- **`cancelado` falsy/undefined en pagos históricos — filtro !p.cancelado no los excluye del cálculo (Jul 23)**.
- **`PATCH /pagos/{id}/cancelar` — endpoint nuevo sin confirmar, cancelaciones fallarán con 404 (Jul 17)**.
- **Devolución de pagos de venta — nuevo endpoint sin confirmar en backend (Jul 17)**.
- **`estado_factura_detalle` campo nuevo — badge "Pendiente de selección" ausente en respuestas históricas (Jul 17)**.
- **`/ajustar-saldo` endpoint sin confirmar en backend (Jul 15)**.
- **Monto libre en ajuste de saldo sin aprobación secundaria — riesgo de cancelar deuda grande por error (Jul 15)**.
- **Fichas de Costo — "Ajuste general" irreversible destruye diferencias por almacén sin confirmación robusta (Jul 13)**.
- **`es_trabajador_suncar` — clientes históricos sin el campo, datos incompletos en filtros (Jul 13)**.
- **Facturas Solar Carros — precio escalado nulo si algún material tiene precio nulo (Jul 10)**.
- **Vista "Facturas" en Obras Terminadas — endpoint de backend sin confirmar (Jul 10)**.
- **`costos-materiales-cliente` en instalaciones — ningún usuario lo tiene hasta asignación manual de SuperAdmin (Jul 10)**.
- **`creado_por` → `creado_por_ci` — reservas históricas con campo incorrecto muestran creador vacío (Jul 10)**.
- **Herencia `instalaciones` → 7 sub-permisos solo en runtime, no persistida en BD (Jul 5)**.
- **`compensacion`/`asumido_por_empresa` en OfertaConPagos — confirmar campos en backend (Jun 29)**.
- **Módulo Asistencia — endpoints de backend sin confirmar (Jun 26)**.
- **`hasExactPermission` — usuarios con almacenes-suncar sin subpermiso admin explícito perderán acceso (Jun 26)**.
- **Reservas expiradas reactivadas — conflicto con materiales reasignados entre expiración y nueva fecha (Jun 23)**.
- **Race condition en el cálculo de disponible de reservas**.
- **`pool=indistinto` para split automático — backend debe implementarlo**.
- **BMS como categoría reservable — docs sin `.pools` bloquean el 100% de reservas BMS**.
- **AdminPass 123456 hardcodeado**.

---

> ⚠️ **Nota de mantenimiento**: Las entradas del **19, 20 y 21 de Junio** y del **23 de Junio** fueron eliminadas al superar los 7 días de antigüedad (política de retención semanal). La entrada del **26 de Junio** fue eliminada el 4 de Julio al superar los 7 días. La entrada del **28 de Junio** fue eliminada el 6 de Julio al superar los 7 días. La entrada del **29 de Junio** fue eliminada el 7 de Julio al superar los 7 días. La entrada del **30 de Junio** fue eliminada el 8 de Julio al superar los 7 días. Las entradas del **1 y 2 de Julio** fueron eliminadas el 10 de Julio al superar los 7 días. La entrada del **3 de Julio** fue eliminada el 11 de Julio al superar los 7 días. Las entradas del **4 y 5 de Julio** fueron eliminadas el 13 de Julio al superar los 7 días. La entrada del **6 de Julio** fue eliminada el 14 de Julio al superar los 7 días. La entrada del **7 de Julio** fue eliminada el 15 de Julio al superar los 7 días. La entrada del **8 de Julio** fue eliminada el 17 de Julio al superar los 7 días. La entrada del **10 de Julio** fue eliminada el 18 de Julio al superar los 7 días. La entrada del **11 de Julio** fue eliminada el 19 de Julio al superar los 7 días. La entrada del **13 de Julio** fue eliminada el 21 de Julio al superar los 7 días. La entrada del **14 de Julio** fue eliminada el 22 de Julio al superar los 7 días. La entrada del **15 de Julio** fue eliminada el 23 de Julio al superar los 7 días. La entrada del **17 de Julio** fue eliminada el 25 de Julio al superar los 7 días. La entrada del **18 de Julio** fue eliminada el 26 de Julio al superar los 7 días. La entrada del **19 de Julio** fue eliminada el 27 de Julio al superar los 7 días. La entrada del **20 de Julio** fue eliminada el 28 de Julio al superar los 7 días. La entrada del **21 de Julio** fue eliminada el 30 de Julio al superar los 7 días. La entrada del **22 de Julio** fue eliminada el 30 de Julio al superar los 7 días. La entrada del **23 de Julio** fue eliminada el 31 de Julio al superar los 7 días. La entrada del **24 de Julio** fue eliminada el 1 de Agosto al superar los 7 días. La entrada del **25 de Julio** fue eliminada el 2 de Agosto al superar los 7 días. La entrada del **26 de Julio** fue eliminada el 3 de Agosto al superar los 7 días. La entrada del **27 de Julio** fue eliminada el 4 de Agosto al superar los 7 días. La entrada del **28 de Julio** fue eliminada el 5 de Agosto al superar los 7 días. La entrada del **30 de Julio** fue eliminada el 7 de Agosto al superar los 7 días. La entrada del **31 de Julio** fue eliminada el 8 de Agosto al superar los 7 días. Las entradas del **1, 2 y 3 de Agosto** fueron eliminadas el 10 de Agosto al superar los 7 días. La entrada del **4 de Agosto** fue eliminada el 12 de Agosto al superar los 7 días. La entrada del **5 de Agosto** fue eliminada el 13 de Agosto al superar los 7 días. La entrada del **6 de Agosto** fue eliminada el 14 de Agosto al superar los 7 días. La entrada del **7 de Agosto** fue eliminada el 15 de Agosto al superar los 7 días. La entrada del **8 de Agosto** fue eliminada el 17 de Agosto al superar los 7 días. La entrada del **10 de Agosto** fue eliminada el 18 de Agosto al superar los 7 días. La entrada del **11 de Agosto** fue eliminada el 19 de Agosto al superar los 7 días. La entrada del **12 de Agosto** fue eliminada el 20 de Agosto al superar los 7 días. La entrada del **13 de Agosto** fue eliminada el 21 de Agosto al superar los 7 días. La entrada del **14 de Agosto** fue eliminada el 22 de Agosto al superar los 7 días. La entrada del **15 de Agosto** fue eliminada el 25 de Agosto al superar los 7 días. La entrada del **17 de Agosto** fue eliminada el 25 de Agosto al superar los 7 días. La entrada del **18 de Agosto** fue eliminada el 26 de Agosto al superar los 7 días. La entrada del **19 de Agosto** fue eliminada el 27 de Agosto al superar los 7 días. La entrada del **20 de Agosto** fue eliminada el 28 de Agosto al superar los 7 días. La entrada del **21 de Agosto** fue eliminada el 29 de Agosto al superar los 7 días. La entrada del **22 de Agosto** fue eliminada el 30 de Agosto al superar los 7 días. La entrada del **23 de Agosto** fue eliminada el 31 de Agosto al superar los 7 días. La entrada del **24 de Agosto** fue eliminada el 1 de Septiembre al superar los 7 días. La entrada del **25 de Agosto** fue eliminada el 2 de Septiembre al superar los 7 días. Las entradas del **26, 27 y 28 de Agosto** fueron eliminadas el 5 de Septiembre al superar los 7 días. Anteriores eliminadas: 16, 17 y 18 de Junio, 5, 6, 7, 9, 11, 12 y 15 de Junio, y días de Mayo.
