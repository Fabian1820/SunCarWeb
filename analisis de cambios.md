# Registro de Análisis de Cambios — SunCarWeb

---

## 📅 6 de Septiembre, 2026

### Resumen de cambios (últimas 24h)

Sin commits nuevos de código. No hay cambios en producción en SunCarWeb.

---

### Puede dar bateo

Sin cambios nuevos — sin riesgos nuevos.

---

## 📅 5 de Septiembre, 2026

### Resumen de cambios (últimas 24h)

Sin commits nuevos de código. No hay cambios en producción en SunCarWeb.

---

### Puede dar bateo

Sin cambios nuevos — sin riesgos nuevos.

---

## 📅 4 de Septiembre, 2026

### Resumen de cambios (últimas 24h)

**16 commits reales** — Fabian1820 (co-authored Claude Opus 5). Sesión muy activa: nuevo módulo de agenda de citas, dos nuevas secciones en confección de ofertas (Transformadores/Medidores y Acciones a Realizar), tipo_negocio BTB/BTC independiente para clientes y leads, pestañas BTB/BTC en términos de ofertas, sistema de permisos para cancelar cobros, separación de permisos de los dos informes de dirección, seis códigos nuevos de averías, edición de términos desde la UI, y varios fixes de dashboard, layout y cálculo de depreciación.

---

### Área 1: feat(ofertas-gestion): editar términos y condiciones desde la UI (09:22)

- Nuevo flujo que permite a los administradores editar los términos y condiciones de la oferta directamente desde la interfaz de gestión, sin acceso al backend. Los cambios se persisten en la BD a través del endpoint correspondiente.

---

### Área 2: fix(peticiones): contenido tapado por el header fijo (09:46)

- El contenido del módulo de peticiones quedaba oculto bajo el header fijo. Fix de layout/CSS con ajuste de padding o scroll offset.

---

### Área 3: fix(ofertas): lista de secciones desaparecía en pantallas bajas (11:11)

- El panel de selección de secciones al exportar una oferta quedaba cortado en monitores con poca altura. Fix de overflow/scroll para que la lista sea desplazable en esas resoluciones.

---

### Área 4: feat(clientes,leads): tipo_negocio (BTB/BTC) propio (13:24)

- Clientes y leads ahora tienen su propio campo `tipo_negocio` (BTB/BTC) independiente del comercial asignado. Antes el tipo de negocio se heredaba del comercial, lo que impedía clasificar correctamente cuando el comercial cambiaba o cuando el cliente tenía un tipo distinto. El campo se puede editar individualmente en el formulario de cada registro.

---

### Área 5: fix(asignaciones): depreciación mensual del lote, no la unitaria (14:22)

- Bug en el cálculo de depreciación: se usaba el valor unitario del lote en lugar del valor mensual total del lote. El fix corrige la fórmula de cálculo.

---

### Área 6: fix(dashboard): Informe de Dirección duplicado y colándose en otras áreas (14:32)

- El módulo "Informe de Dirección" aparecía dos veces en el dashboard y se mostraba en áreas que no le correspondían. Fix de la lógica de asignación de área y deduplicación de módulos.

---

### Área 7: feat(informe-direccion): permisos separados para los dos informes y filtro de cobros (14:32)

- Los dos sub-informes de dirección (el informe general y el de cobros pendientes) pasan a tener permisos de acceso independientes. Los cobros se filtran ahora según el usuario que tiene el permiso, en lugar de mostrar todos. Resuelve el concern de visibilidad de datos financieros a usuarios sin asignación explícita (seguimiento del 6 de Agosto).

---

### Área 8: feat(pagos): permiso aditivo para cancelar cobros (14:47)

- Nuevo sub-permiso `cancelar-cobros` que puede asignarse de forma aditiva a trabajadores para habilitar la cancelación de cobros, independientemente de si tienen rol admin. Antes esta acción estaba restringida por una lista de CIs hardcodeada en el frontend.

---

### Área 9: fix(pagos): tasa del EUR etiquetada como "USD por 1 EUR" (14:49)

- El campo de tasa de cambio para EUR ahora se etiqueta correctamente como "USD por 1 EUR", dejando claro el sentido de la conversión y evitando que el comercial ingrese el valor invertido.

---

### Área 10: feat(ofertas,terminos): pestañas BTB/BTC en términos + selector persistido por oferta (14:46)

- Los términos y condiciones de la oferta se organizan en dos pestañas según el tipo de negocio (BTB/BTC). La pestaña activa se persiste por oferta, así que al reabrir la oferta se recuerda qué conjunto de términos se seleccionó.

---

### Área 11: feat(ofertas): secciones Transformadores y Medidores y Acciones a Realizar (14:52)

- Dos nuevas secciones opcionales en la confección de ofertas: **Transformadores y Medidores** (para incluir equipos de medición adicionales) y **Acciones a Realizar** (descripción de los trabajos que el equipo ejecutará). Ambas se incluyen en las exportaciones de PDF.

---

### Área 12: feat(citas): módulo de agenda de citas, solo superAdmin (15:50)

- Nuevo módulo de agenda de citas. En esta versión inicial solo es visible y accesible para el superAdmin. Presumiblemente usará un endpoint de backend para persistir y consultar citas.

---

### Área 13+14: refactor(dashboard): nombres cortos y descripciones en dos líneas en Comercial Instaladora (16:32 y 16:40)

- Ajuste de etiquetas (nombres más cortos) y nuevo orden visual de los módulos del área Comercial Instaladora en el dashboard. Las descripciones se adaptan a dos líneas para mejorar legibilidad en tarjetas de tamaño uniforme.

---

### Área 15: feat(averias): seis códigos nuevos y causa Comunicación (16:57)

- Se añaden seis nuevos códigos de avería al catálogo y una nueva categoría de causa: **Comunicación**. Los operarios podrán registrar averías de tipo comunicación sin recurrir a opciones genéricas.

---

### Área 16: refactor(pagos): editar cobros por permiso, no por lista de CI (17:12)

- **Resuelve el seguimiento de "Lista blanca de CIs de pagos hardcodeada en frontend" (Jun 23)**. La lógica de control de edición de cobros pasa de una lista blanca de CIs hardcodeada en el frontend a verificar el sub-permiso `cancelar-cobros` del sistema de permisos dinámico. Más seguro, más mantenible y consistente con el resto del sistema de permisos.

---

### Puede dar bateo

1. **feat(citas) solo superAdmin — endpoints de backend sin confirmar**: El módulo es nuevo y solo accesible para superAdmin. Confirmar que el backend tiene los endpoints de citas funcionando antes de abrir el módulo a otros roles.

2. **feat(clientes,leads) tipo_negocio propio — registros históricos sin el campo**: Los clientes y leads existentes no tienen `tipo_negocio` propio asignado. Confirmar cómo se inicializa este campo en documentos históricos (¿null, herencia del comercial, valor por defecto?). Un null puede romper filtros que esperen BTB/BTC.

3. **feat(ofertas,terminos) pestaña persistida por oferta — confirmar si se guarda en backend o solo en estado local**: Si la selección de pestaña activa (BTB/BTC) solo vive en estado local de React, se perderá al recargar o al pasar a otra oferta y volver.

4. **feat(pagos) permiso aditivo `cancelar-cobros` — confirmar creación en BD y asignación a los trabajadores que lo necesitan**: Si el módulo de permisos no tiene creado el permiso `cancelar-cobros`, `hasPermission()` lo tratará como no autorizado y los trabajadores que antes podían cancelar (por lista blanca) perderán el acceso sin aviso.

5. **refactor(pagos) lista blanca → permisos dinámicos — confirmar migración de acceso para los CIs que estaban en la lista**: Sin la asignación manual del nuevo permiso a esos trabajadores, perderán la capacidad de cancelar cobros.

6. **feat(informe-direccion) permisos separados — confirmar que usuarios con el permiso antiguo único no pierden acceso al informe principal**: Si el permiso antiguo se renombró sin migración, los usuarios con el nombre viejo pierden acceso inmediatamente.

7. **feat(ofertas) secciones Transformadores/Medidores y Acciones — confirmar soporte en backend**: Si el backend no reconoce los nuevos campos, los datos de esas secciones se perderán al guardar sin error visible (ignorados por el endpoint).

8. **fix(asignaciones) depreciación corregida — impacto en asignaciones históricas**: El cálculo incorrecto puede haber acumulado diferencias en registros ya guardados. Verificar si se necesita un recálculo o ajuste de datos históricos.

---

## 📅 3 de Septiembre, 2026

### Resumen de cambios (últimas 24h)

**1 commit real** — Fabian1820 (co-authored Claude Opus 5). Sesión de un solo cambio: acortar el nombre generado para el PDF y el Excel exportados de ofertas.

---

### Área 1: feat(ofertas): acortar el nombre del PDF y el Excel exportados (13:13)

- El nombre de archivo del PDF y del Excel de ofertas exportados se acorta para ser más manejable en el sistema de archivos y en los listados de descargas. El contenido de los documentos no cambia.

---

### Puede dar bateo

1. **Nombre de archivo acortado — posible ruptura de flujos que parseaban el nombre largo**: Si hay integraciones externas, scripts de importación o convenciones de archivo que dependen del formato anterior del nombre, el cambio de formato los rompe silenciosamente.

2. **Consistencia con el nombre generado en Sep 2**: El 2 de Sep se cambió el nombre del PDF al formato "Sistema fotovoltaico de Xkw...". Confirmar que ambos cambios (Sep 2 y Sep 3) son coherentes entre sí y que el nombre final es el esperado.

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

## Seguimientos vigentes

- **feat(citas) nuevo módulo — confirmar endpoints de backend en producción antes de abrir a roles no-superAdmin (Sep 4)**.
- **feat(clientes,leads) tipo_negocio propio — confirmar inicialización de registros históricos: un null puede romper filtros BTB/BTC (Sep 4)**.
- **feat(ofertas,terminos) pestaña BTB/BTC persistida — confirmar si se guarda en backend o solo en estado local de React; en local se pierde al recargar (Sep 4)**.
- **feat(pagos) permiso aditivo `cancelar-cobros` — confirmar que el permiso está creado en BD y asignado a los trabajadores que antes estaban en la lista blanca; sin esto pierden acceso (Sep 4)**.
- **feat(informe-direccion) permisos separados — confirmar que usuarios con el permiso antiguo de `informe-direccion` no pierden acceso al informe principal por cambio de nombre de permiso sin migración (Sep 4)**.
- **feat(ofertas) secciones Transformadores/Medidores y Acciones — confirmar soporte de los campos nuevos en el endpoint de creación/edición de oferta en backend (Sep 4)**.
- **fix(asignaciones) depreciación del lote — verificar si hay asignaciones históricas con el valor incorrecto que necesiten recálculo (Sep 4)**.
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
- ~~**Lista blanca de CIs de pagos hardcodeada en frontend (Jun 23)**~~ — ✅ **Resuelto el 4 de Sep** por `refactor(pagos): editar cobros por permiso, no por lista de CI`.
- **Race condition en el cálculo de disponible de reservas**.
- **`pool=indistinto` para split automático — backend debe implementarlo**.
- **BMS como categoría reservable — docs sin `.pools` bloquean el 100% de reservas BMS**.
- **AdminPass 123456 hardcodeado**.

---

> ⚠️ **Nota de mantenimiento**: Las entradas del **19, 20 y 21 de Junio** y del **23 de Junio** fueron eliminadas al superar los 7 días de antigüedad (política de retención semanal). La entrada del **26 de Junio** fue eliminada el 4 de Julio al superar los 7 días. La entrada del **28 de Junio** fue eliminada el 6 de Julio al superar los 7 días. La entrada del **29 de Junio** fue eliminada el 7 de Julio al superar los 7 días. La entrada del **30 de Junio** fue eliminada el 8 de Julio al superar los 7 días. Las entradas del **1 y 2 de Julio** fueron eliminadas el 10 de Julio al superar los 7 días. La entrada del **3 de Julio** fue eliminada el 11 de Julio al superar los 7 días. Las entradas del **4 y 5 de Julio** fueron eliminadas el 13 de Julio al superar los 7 días. La entrada del **6 de Julio** fue eliminada el 14 de Julio al superar los 7 días. La entrada del **7 de Julio** fue eliminada el 15 de Julio al superar los 7 días. La entrada del **8 de Julio** fue eliminada el 17 de Julio al superar los 7 días. La entrada del **10 de Julio** fue eliminada el 18 de Julio al superar los 7 días. La entrada del **11 de Julio** fue eliminada el 19 de Julio al superar los 7 días. La entrada del **13 de Julio** fue eliminada el 21 de Julio al superar los 7 días. La entrada del **14 de Julio** fue eliminada el 22 de Julio al superar los 7 días. La entrada del **15 de Julio** fue eliminada el 23 de Julio al superar los 7 días. La entrada del **17 de Julio** fue eliminada el 25 de Julio al superar los 7 días. La entrada del **18 de Julio** fue eliminada el 26 de Julio al superar los 7 días. La entrada del **19 de Julio** fue eliminada el 27 de Julio al superar los 7 días. La entrada del **20 de Julio** fue eliminada el 28 de Julio al superar los 7 días. La entrada del **21 de Julio** fue eliminada el 30 de Julio al superar los 7 días. La entrada del **22 de Julio** fue eliminada el 30 de Julio al superar los 7 días. La entrada del **23 de Julio** fue eliminada el 31 de Julio al superar los 7 días. La entrada del **24 de Julio** fue eliminada el 1 de Agosto al superar los 7 días. La entrada del **25 de Julio** fue eliminada el 2 de Agosto al superar los 7 días. La entrada del **26 de Julio** fue eliminada el 3 de Agosto al superar los 7 días. La entrada del **27 de Julio** fue eliminada el 4 de Agosto al superar los 7 días. La entrada del **28 de Julio** fue eliminada el 5 de Agosto al superar los 7 días. La entrada del **30 de Julio** fue eliminada el 7 de Agosto al superar los 7 días. La entrada del **31 de Julio** fue eliminada el 8 de Agosto al superar los 7 días. Las entradas del **1, 2 y 3 de Agosto** fueron eliminadas el 10 de Agosto al superar los 7 días. La entrada del **4 de Agosto** fue eliminada el 12 de Agosto al superar los 7 días. La entrada del **5 de Agosto** fue eliminada el 13 de Agosto al superar los 7 días. La entrada del **6 de Agosto** fue eliminada el 14 de Agosto al superar los 7 días. La entrada del **7 de Agosto** fue eliminada el 15 de Agosto al superar los 7 días. La entrada del **8 de Agosto** fue eliminada el 17 de Agosto al superar los 7 días. La entrada del **10 de Agosto** fue eliminada el 18 de Agosto al superar los 7 días. La entrada del **11 de Agosto** fue eliminada el 19 de Agosto al superar los 7 días. La entrada del **12 de Agosto** fue eliminada el 20 de Agosto al superar los 7 días. La entrada del **13 de Agosto** fue eliminada el 21 de Agosto al superar los 7 días. La entrada del **14 de Agosto** fue eliminada el 22 de Agosto al superar los 7 días. La entrada del **15 de Agosto** fue eliminada el 25 de Agosto al superar los 7 días. La entrada del **17 de Agosto** fue eliminada el 25 de Agosto al superar los 7 días. La entrada del **18 de Agosto** fue eliminada el 26 de Agosto al superar los 7 días. La entrada del **19 de Agosto** fue eliminada el 27 de Agosto al superar los 7 días. La entrada del **20 de Agosto** fue eliminada el 28 de Agosto al superar los 7 días. La entrada del **21 de Agosto** fue eliminada el 29 de Agosto al superar los 7 días. La entrada del **22 de Agosto** fue eliminada el 30 de Agosto al superar los 7 días. La entrada del **23 de Agosto** fue eliminada el 31 de Agosto al superar los 7 días. La entrada del **24 de Agosto** fue eliminada el 1 de Septiembre al superar los 7 días. La entrada del **25 de Agosto** fue eliminada el 2 de Septiembre al superar los 7 días. Las entradas del **26, 27, 28 y 29 de Agosto** fueron eliminadas el 6 de Septiembre al superar los 7 días. Anteriores eliminadas: 16, 17 y 18 de Junio, 5, 6, 7, 9, 11, 12 y 15 de Junio, y días de Mayo.
