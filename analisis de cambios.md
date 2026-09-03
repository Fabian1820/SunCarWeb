# Registro de Análisis de Cambios — SunCarWeb

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

## 📅 28 de Agosto, 2026

### Resumen de cambios (últimas 24h)

**9 commits reales** — Fabian1820 (co-authored Claude Opus 5). Sesión muy activa: fixes críticos de inventario y kardex (límites de paginación que truncaban datos silenciosamente), refactors de código muerto, corrección profunda de bugs en la confección de ofertas (margen, duplicados, borradores, bloqueo optimista), y cuatro features: tipo "visita" en fotos de clientes, navegación "Volver" contextual, unificación de tarjetas de almacenes/tiendas, y fix crítico del flujo de exportación en moneda de la oferta.

---

### Área 1: fix(inventario) — stock del almacén truncado silenciosamente (14:11)

- **`fix(inventario): no truncar el stock del almacen al validar disponibilidad`** — Los diálogos que arman el mapa de stock completo de un almacén pedían `getStock({ almacen_id, limit: 500 })`. El Almacén de Insumos tiene 566 materiales; los 66 más recientes (por `material_id` asc) quedaban fuera del corte. El frontend devuelve 0 cuando no encuentra la clave, así que 52 materiales con existencia real se mostraban como "Stock: 0 | Falta: N", bloqueando reservas y vales de salida.

  1. **`limit` quitado donde el mapa debe cubrir el almacén entero**: el endpoint devuelve todo si se omite. También se quitó el limit en las reservas activas que descuentan de ese stock.
  2. **`limit` conservado** en listas paginadas de la vista de almacén y en selectores de UI.
  3. **El backend nunca se equivocó**: `get_stock_item` es una consulta directa al documento, no afectada por el truncamiento del frontend.

---

### Área 2: refactor(fichas-costo) — elimina método muerto (15:17)

- **`refactor(fichas-costo): elimina FichaCostoService.editPreciosCosto sin uso`** — El método no lo llamaba nadie (la edición rápida de precios va por `updateMaterial` en `app/fichas-costo/page.tsx`). Se elimina también `EditarPreciosCostoPayload`, que solo existía para este método.

---

### Área 3: fix(kardex-costo) — historial cortado en 200 filas + código muerto (15:16)

- **`fix(kardex-costo): el historial se cortaba en 200 filas, y borra 2 métodos muertos`** — El historial del kardex se pedía con `limit: 200` fijo desde los 3 sitios que lo consultan, sin paginar. El endpoint ordena DESCENDENTE, así que los movimientos MÁS ANTIGUOS (los importantes en auditoría) eran los truncados.

  1. **`getHistorial` pagina hasta traer el historial completo** cuando no se le pasa `limit`, con PAGE=500 (tope del endpoint) y guard de 20 páginas (máx 10 000 filas). Un `limit` explícito sigue haciendo una sola petición.
  2. **Eliminados 3 artefactos muertos**: `KardexCostoService.crearEntrada`, `KardexCostoService.getHistorialPorCompra`, y `KardexEntradaCreateData`.
  3. Con los volúmenes actuales (968 filas totales, 46 en el material más movido) sigue siendo 1 sola petición.

---

### Área 4: fix(ofertas-confeccion) — margen y duplicados que cambiaban solos (20:53)

- **`fix(ofertas-confeccion): margen y duplicados que cambiaban solos`** — Dos incidencias intermitentes reportadas por comercial, más varios bugs detectados al investigarlas:

  1. **`margen_asignado = 0` no se restauraba como asignado** (el guard era `> 0`). Al reabrir, el reparto automático le devolvía margen y aparecía un desbalance sin que nadie lo provocara. Un 0 es decisión del comercial, no "sin dato". Las ofertas viejas donde todos los ítems son 0 (sin reparto previo) siguen usando el algoritmo automático.
  2. **Borrador de duplicado tomaba la copia antigua**: el borrador del localStorage ganaba a la oferta del servidor si tenía menos de 24h. Ahora solo se retoma si es de la misma oferta origen, tiene menos de 2h y la original no fue modificada desde que se guardó. La decisión se toma antes de sembrar el estado para no mezclar valores.
  3. **`redondeo_manual` no viajaba en `normalizeOfertaConfeccion`**: reabrir o duplicar revertía el precio ajustado a mano al redondeo automático, y el siguiente guardado lo persistía.
  4. **Borrador de oferta nueva con clave global sin caducidad**: el borrador abandonado de un cliente reaparecía en la oferta de otro. Ahora la clave va por contacto y caduca como el resto.
  5. **Porcentajes editados a mano no se guardaban en borrador** ni se limpiaban al quitar un material.
  6. **Bloqueo optimista**: se envía `fecha_actualizacion_esperada` y el backend responde 409 si otro comercial guardó entretanto, en vez de pisar el trabajo en silencio.

---

### Área 5: feat(clientes) — tipo "visita" al adjuntar fotos (21:04)

- **`feat(clientes): agrega el tipo "visita" al adjuntar fotos`** — El diálogo de evidencias solo ofrecía Instalación y Avería; no había donde dejar la constancia de una visita previa. Se agrega la opción al select, al filtro por tipo del visor y a las etiquetas de las tarjetas. Los sitios que repetían la unión de tipos ahora la derivan de `ClienteFoto["tipo"]` para evitar desincronizaciones futuras.

  - ⚠️ **Requiere el backend con "visita" en el Literal del endpoint `POST /clientes/{numero}/fotos`**.

---

### Área 6: feat(navegacion) — "Volver" sube un nivel en vez de saltar al inicio (21:20)

- **`feat(navegacion): volver sube un nivel en vez de saltar al inicio`** — El botón atrás era un enlace fijo a "/"; desde cualquier módulo o submodulo sacaba al usuario al inicio. Ahora el destino se deduce de `MODULOS_CATALOGO`:
  - Módulo con tarjeta propia → su área de la barra lateral (`/?area=...`)
  - Submódulo sin tarjeta → el hub/módulo padre del que cuelga
  - Hijos de Compras/Envíos/Costos, Facturación e Instalaciones vuelven a su hub.

  Además: tarjeta de módulo única compartida por dashboard y hubs (antes tres diseños distintos); módulos con submodules etiquetados "Varias secciones"; fondo unificado al degradado SunCar en páginas que iban por libre; Reportes Comercial Ventas abre el contenido directo (se elimina el paso intermedio del hub con una sola tarjeta).

---

### Área 7: fix(solicitudes-materiales) — no permite elegir clientes anulados (21:37)

- **`fix(solicitudes-materiales): no permite elegir clientes anulados`** — El selector de cliente del diálogo no filtraba por activo, así que ofrecía clientes anulados y se podían crear solicitudes contra ellos. Ahora pide solo activos. Además el error de guardado pasa de un `alert()` a un aviso dentro del diálogo que conserva el formulario y explica el motivo.

---

### Área 8: feat(almacenes,tiendas,reportes-ventas) — unifica tarjetas y pagina el reporte (22:06)

- **`feat(almacenes,tiendas,reportes-ventas): unifica sus tarjetas y pagina el reporte`** — Almacenes y tiendas usaban la tarjeta vieja en sus listados y pantallas internas. Ahora usan `ModuleCard` como el resto. La tarjeta gana `clampDescription` (la dirección del usuario puede ser larga), con las tarjetas de una fila parejas y la etiqueta "Varias secciones" anclada abajo.

  Reportes Comercial Ventas cargaba lento (600+ facturas de golpe). Se pagina en cliente de 20 en 20 con `SmartPagination`. Los filtros, estadísticas, totales y el export a Excel siguen sobre el conjunto completo; solo se recorta lo que se dibuja. Al cambiar un filtro vuelve a la página 1.

---

### Área 9: fix(ofertas-confeccion) — precio exportado en la moneda de la oferta (22:34)

- **`fix(ofertas-confeccion): el precio exportado va en la moneda de la oferta`** — Fix crítico de exportaciones. Dos problemas independientes:

  1. **Exportaciones de cliente forzadas en USD**: "Precio final" escribía `oferta.precio_final` (USD) y el importe en moneda acordada solo aparecía como línea suelta al final del PDF. Ahora las dos exportaciones de cliente (sin precios y con precios) llevan los importes en la moneda con la que se guardó la oferta. La cuarta exportación "Cliente con precios + cambio" desaparece por redundante. La completa se queda en USD (es la interna). Se quita también la fila de tasa de cambio en las de cliente (al cliente se le da su importe, no cómo se calculó) y la nota "(Redondeado desde X $)" dentro de un documento ya convertido.

  2. **Tasa 0 no validada — bugs confirmados en código**: el frontend mandaba `parseFloat(tasaCambio) || 0` sin validar y el backend solo comprobaba `is None`. Consecuencias: CUP + tasa 0 → oferta guardada con tasa 0, toda conversión condicionada a `tasa > 0`, editor y exportaciones seguían en USD sin aviso. EUR + tasa 0 → ZeroDivisionError al calcular el monto convertido (500 opaco al guardar). **Ahora validado en ambas capas**: toast específico antes de guardar, y `ValueError` en el backend que cierra la división por cero.

  Además, la conversión se aplicaba a la fila "Datos" (número de cuenta): al limpiar los no-dígitos la convertía en una cifra. Ahora los tipos no monetarios quedan fuera de la conversión.

---

### Puede dar bateo

1. **fix(inventario) — carga del mapa de stock más pesada con el tiempo**: Quitar el `limit` para obtener el stock completo es correcto hoy (566 materiales), pero si la colección crece mucho la petición sin límite puede ralentizar la apertura de diálogos de reserva y vales. No hay paginación interna para esos diálogos.

2. **fix(kardex-costo) — guard de 20 páginas (máx 10 000 filas) — historial silenciosamente incompleto en materiales muy movidos**: Si algún material llega a más de 10 000 movimientos, el historial se trunca sin aviso al usuario. Actualmente el máximo es 46, pero es una deuda a documentar.

3. **fix(ofertas-confeccion) bloqueo optimista 409 — UX de conflicto sin flujo de resolución**: Cuando dos comerciales editan la misma oferta, el segundo recibe un 409. Si no hay UI para mostrar los cambios del otro comercial ni una opción de fusión, el usuario ve un error sin poder recuperar sus cambios fácilmente. Confirmar qué ve el usuario ante el 409.

4. **fix(ofertas-confeccion) borradores con caducidad 2h — puede ser corta en sesiones largas**: Un comercial que trabaje en una oferta compleja con pausas puede ver su borrador invalidado. Confirmar si 2h es suficiente para los flujos reales de trabajo.

5. **fix(ofertas-confeccion) margen_asignado = 0 restaurado — confirmar que ofertas viejas sin reparto siguen usando el algoritmo automático**: Verificar que la detección de "oferta sin reparto previo" no clasifica incorrectamente como tal a una oferta donde el comercial decidió dar 0% a todos los ítems intencionalmente.

6. **feat(clientes) tipo "visita" — dependencia de backend sin confirmar en producción**: Si el backend no tiene "visita" en el Literal del endpoint `POST /clientes/{numero}/fotos`, cualquier intento de subir una foto de visita dará 422.

7. **feat(navegacion) "Volver" — módulos no registrados en MODULOS_CATALOGO siguen volviendo a "/"**: Si algún módulo o subpágina futura no se registra en el catálogo, el botón atrás vuelve al inicio sin aviso. Confirmar cobertura completa, especialmente para pantallas de detalle dinámico (`/clientes/[id]`, etc.).

8. **fix(solicitudes-materiales) — filtro de anulados solo cubre este diálogo**: El selector de cliente en otros flujos puede seguir mostrando clientes anulados. El concern sigue vigente para los demás selectores (ver fix(clientes-anulados) del 29 de Agosto).

9. **feat(almacenes,tiendas) paginación de 20 en 20 — confirmar que stats y totales son sobre el conjunto completo**: El commit lo afirma, pero si alguna estadística o total se calcula accidentalmente sobre `data.slice(0,20)` en lugar del array completo, dará valores incorrectos sin error visible.

10. **fix(ofertas-confeccion) moneda — ofertas existentes con tasa 0 sin migración automática**: Las ofertas guardadas con tasa 0 antes del deploy siguen teniendo tasa 0. El diálogo de exportación avisa de esto, pero la corrección requiere que el comercial edite cada oferta manualmente y agregue la tasa. No hay migración ni script de backfill.

11. **fix(ofertas-confeccion) moneda — cuarta exportación eliminada — usuarios que la usaban pierden funcionalidad**: "Cliente con precios + cambio" se elimina por redundante. Si había usuarios que la preferían explícitamente, deben adaptarse a las nuevas exportaciones de cliente en moneda acordada.

12. **fix(ofertas-confeccion) moneda — datos no monetarios excluidos de la conversión — confirmar cobertura completa**: El fix menciona la fila "Datos" (número de cuenta). Verificar que no hay otras filas de tipo texto que pudieran estar pasando por la conversión en edge cases.

---

## 📅 27 de Agosto, 2026

### Resumen de cambios (últimas 24h)

**3 commits reales** — Fabian1820 (co-authored Claude Opus 5). Sesión centrada en el módulo de ofertas y materiales: se unifica el nombre de catálogo en todas las pantallas de materiales, y se agrega el flujo completo de descuento / total a pagar en tabla y PDF (feature + fix de orden de renderizado).

---

### Área 1: feat(materiales) — nombre de catálogo en lugar de descripción libre (18:42)

- **`feat(materiales): muestra el nombre de catalogo en vez de la descripcion`** — El operador reportó que el breaker de 80A 3P aparecía como "PROTECCION" y el de 2P como "BREAKER", sin poder distinguirlos salvo por la foto. Causa: `descripcion` es texto libre y 27 materiales la comparten con otro artículo.

  1. **Orden unificado en todas las pantallas**: `material_nombre` → `material.nombre` → `material_descripcion`. El backend ya publica `material_nombre` resuelto del catálogo.
  2. **`material_nombre` añadido a StockItem**: hasta ahora StockItem solo exponía la descripción embebida.
  3. **Pantallas afectadas**: inventario (stock, editar stock, salida por lote), solicitudes de materiales, vales y devolución de vale, facturas, pagos de ventas, solicitudes de ventas, consignaciones, centro de control y trabajos diarios.
  4. **Efecto en facturas**: la línea de factura armada desde el vale pasa a guardar el nombre de catálogo en lugar de la descripción (antes escribía "PROTECCION").

---

### Área 2: feat(ofertas) — descuento y total a pagar en tabla y PDF (21:51)

- **`feat(ofertas): muestra el descuento y el total a pagar en tabla y PDF`** — `asumido_por_empresa` y `compensacion` no estaban dentro de `precio_final`; solo bajaban `monto_pendiente`, así que ni la tabla ni las exportaciones los reflejaban.

  1. **"Monto asumido por empresa" renombrado a "Descuento"** en el formulario. Admite monto fijo o % sobre el precio final y exige justificación.
  2. **Tabla con nuevas columnas "Descuento" y "Total a pagar"**.
  3. **Exportaciones**: bajo cada precio final, el desglose del descuento y la compensación con su justificación y el total a pagar. La conversión a EUR/CUP pasa a calcularse sobre el total a pagar.
  4. **Unificación del generador de opciones de exportación**: estaba triplicado en tres vistas. Las copias de clientes y leads calculaban el subtotal sin `margen_materiales`, imprimiendo un importe ~18% menor que el real.

---

### Área 3: fix(ofertas) — descuento debajo del precio final en el PDF (22:13)

- **`fix(ofertas): coloca el descuento bajo el precio final en el PDF`** — El renderizador agrupaba las filas por `tipo` e ignoraba el orden del array, así que el descuento se pintaba ANTES del precio final.

  1. **Nuevos tipos de fila `DescuentoNeto` y `TotalAPagar`**: pintados dentro del bloque resaltado, debajo del precio final.
  2. **Añadidos a `tipoNoMaterial`**: para que la tabla de materiales no los duplique como sección.
  3. Resultado en PDF: `Precio Final` → `Descuento — [justificación]` → `Total a pagar`.

---

### Puede dar bateo

1. **Facturas históricas con `descripcion` embebida — nombre incorrecto en vista**: Las líneas de factura creadas antes del deploy guardan la descripción libre. Si la vista prioriza `material_nombre` del catálogo y no tiene fallback, esas facturas mostrarán el campo vacío o el nombre incorrecto.

2. **27 materiales con descripciones compartidas — confirmación de mapeo correcto en producción**: Confirmar que ningún `material_nombre` del catálogo está también duplicado o vacío.

3. **StockItem con `material_nombre` nuevo — consumidores sin actualizar**: Confirmar que todos los consumidores de `StockItem` fueron actualizados y no acceden directamente a `descripcion`.

4. **Conversión EUR/CUP ahora sobre "Total a pagar" — posible desincronía con backend**: Si el backend calculaba la conversión sobre `precio_final` y el frontend la calcula ahora sobre `total_a_pagar`, puede haber diferencia entre montos.

5. **"Descuento (%)" antiguo en solo lectura — confirmar que no se pierde en borradores**: El % de descuento anterior es visible solo en ofertas "que ya lo tienen guardado". Si un borrador no guardado se edita y se guarda de nuevo, el valor puede perderse sin aviso.

6. **~18% de subimporte erróneo en exportaciones históricas**: Los documentos impresos o guardados antes del deploy tienen datos incorrectos; no hay forma de regenerarlos automáticamente.

7. **`tipoNoMaterial` como mecanismo de exclusión frágil**: Si en el futuro se añade otro tipo especial sin recordar actualizar `tipoNoMaterial`, se duplicará silenciosamente en el PDF.

8. **Signo del descuento en el PDF — doble negativo en edge case**: El PDF prefija "- " al monto del descuento. Si el campo puede llegar negativo desde el backend, el PDF mostrará "- -6000,00 $". Confirmar que el campo siempre llega como valor positivo.

9. **Nuevas columnas en tabla — impacto en exportaciones Excel por posición de columna**: Cualquier importación externa que lea el Excel de ofertas por índice de columna quedará desalineada.

---

## 📅 26 de Agosto, 2026

### Resumen de cambios (últimas 24h)

**2 commits reales** — Fabian1820 (co-authored Claude Opus 5). Fix crítico de paginación de clientes: 67 clientes invisibles desde el 31 de julio ahora son visibles, con buscador multicampo y flujo de anular/reactivar. También nueva opción de redondeo manual de precio final en ofertas.

---

### Área 1: fix(clientes-ventas) — paginación completa, buscador multicampo y anular/reactivar (18:35)

- **`fix(clientes-ventas): carga completa, buscador y anulacion`** — El módulo cargaba una sola página de 500 clientes y filtraba en memoria. Al superar los 500 documentos el 2026-07-31, los 67 clientes más antiguos quedaron invisibles para la UI: 66 de ellos con historial (85 ofertas, 199 solicitudes, 84 facturas).

  1. **Paginación completa en `getAllClientes()`**: pagina hasta agotar el `total` que la API ya devolvía pero que el servicio descartaba.
  2. **`normalizeText` colapsa espacios repetidos**: corrige casos como "Antonio Rivero  Garcia" que antes no coincidían en búsquedas locales.
  3. **Selectores de cliente con búsqueda multicampo en backend**: nombre, número, CI, teléfono y ubicación, sin distinguir tildes. Límite subido de 20 a 50 resultados.
  4. **CI duplicada**: el diálogo deja de tragarse el error; marca el campo CI en rojo y muestra el mensaje del backend.
  5. **Anular/Reactivar en lugar de Eliminar**: badge de estado, fila atenuada para anulados, enlace para mostrarlos. El borrado definitivo solo aparece sobre un cliente ya anulado; el backend lo rechaza si tiene historial.

---

### Área 2: feat(ofertas) — check de redondeo manual de precio final (16:20)

- **`feat(ofertas): check para ajustar el redondeo del precio final a mano`** — El precio final siempre se redondeaba al múltiplo de 10 hacia arriba sin posibilidad de dejarlo en el valor real.

  1. **Nuevo check "Ajustar redondeo manual"**: al activarlo carga el precio del redondeo automático y habilita el campo para bajarlo.
  2. **Atajos**: sin redondeo, múltiplo de 5, múltiplo de 10.
  3. **Rango acotado** a [precio real, redondeo automático]: fuera de rango se marca en rojo y bloquea el guardado.
  4. **Check deshabilitado** automáticamente cuando el total ya es múltiplo de 10.
  5. **Estado conservado** en borrador, edición y al duplicar.

---

### Puede dar bateo

1. **67 clientes invisibles ~26 días — posibles duplicados en BD**: Los clientes no encontrables desde el 31 de julio pueden haber sido recreados por comerciales. Verificar manualmente por CI o teléfono.

2. **Clientes anulados — confirmar exclusión en selectores de oferta/solicitud/factura**: El fix del 29 de Agosto cubre 11 selectores adicionales; confirmar que ya no quedan más.

3. **Delete definitivo — confirmar que la restricción "con historial" está en backend, no solo en frontend**: Si esta lógica solo vive en frontend, un DELETE directo a la API puede eliminar un cliente con historial.

4. **Paginación completa puede ser lenta en colecciones grandes**: Si la colección sigue creciendo, cargar todos los clientes al entrar al módulo incrementará el tiempo de carga linealmente.

5. **Precio manual sin trazabilidad**: El comercial puede bajar el precio final sin que quede registro de quién lo ajustó ni por qué.

6. **Estado del check al duplicar con catálogo cambiado**: Al duplicar una oferta con precio manual, el precio heredado puede quedar fuera del rango si los precios del catálogo cambiaron. Confirmar que el rango se recalcula al duplicar.

7. **Atajo "sin redondeo" puede producir precios con decimales**: Si el precio real tiene decimales (ej. $1234.56), verificar que el backend acepta precios con decimales en ofertas.

---

## Seguimientos vigentes

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
- **Lista blanca de CIs de pagos hardcodeada en frontend (Jun 23)**.
- **Race condition en el cálculo de disponible de reservas**.
- **`pool=indistinto` para split automático — backend debe implementarlo**.
- **BMS como categoría reservable — docs sin `.pools` bloquean el 100% de reservas BMS**.
- **AdminPass 123456 hardcodeado**.

---

> ⚠️ **Nota de mantenimiento**: Las entradas del **19, 20 y 21 de Junio** y del **23 de Junio** fueron eliminadas al superar los 7 días de antigüedad (política de retención semanal). La entrada del **26 de Junio** fue eliminada el 4 de Julio al superar los 7 días. La entrada del **28 de Junio** fue eliminada el 6 de Julio al superar los 7 días. La entrada del **29 de Junio** fue eliminada el 7 de Julio al superar los 7 días. La entrada del **30 de Junio** fue eliminada el 8 de Julio al superar los 7 días. Las entradas del **1 y 2 de Julio** fueron eliminadas el 10 de Julio al superar los 7 días. La entrada del **3 de Julio** fue eliminada el 11 de Julio al superar los 7 días. Las entradas del **4 y 5 de Julio** fueron eliminadas el 13 de Julio al superar los 7 días. La entrada del **6 de Julio** fue eliminada el 14 de Julio al superar los 7 días. La entrada del **7 de Julio** fue eliminada el 15 de Julio al superar los 7 días. La entrada del **8 de Julio** fue eliminada el 17 de Julio al superar los 7 días. La entrada del **10 de Julio** fue eliminada el 18 de Julio al superar los 7 días. La entrada del **11 de Julio** fue eliminada el 19 de Julio al superar los 7 días. La entrada del **13 de Julio** fue eliminada el 21 de Julio al superar los 7 días. La entrada del **14 de Julio** fue eliminada el 22 de Julio al superar los 7 días. La entrada del **15 de Julio** fue eliminada el 23 de Julio al superar los 7 días. La entrada del **17 de Julio** fue eliminada el 25 de Julio al superar los 7 días. La entrada del **18 de Julio** fue eliminada el 26 de Julio al superar los 7 días. La entrada del **19 de Julio** fue eliminada el 27 de Julio al superar los 7 días. La entrada del **20 de Julio** fue eliminada el 28 de Julio al superar los 7 días. La entrada del **21 de Julio** fue eliminada el 30 de Julio al superar los 7 días. La entrada del **22 de Julio** fue eliminada el 30 de Julio al superar los 7 días. La entrada del **23 de Julio** fue eliminada el 31 de Julio al superar los 7 días. La entrada del **24 de Julio** fue eliminada el 1 de Agosto al superar los 7 días. La entrada del **25 de Julio** fue eliminada el 2 de Agosto al superar los 7 días. La entrada del **26 de Julio** fue eliminada el 3 de Agosto al superar los 7 días. La entrada del **27 de Julio** fue eliminada el 4 de Agosto al superar los 7 días. La entrada del **28 de Julio** fue eliminada el 5 de Agosto al superar los 7 días. La entrada del **30 de Julio** fue eliminada el 7 de Agosto al superar los 7 días. La entrada del **31 de Julio** fue eliminada el 8 de Agosto al superar los 7 días. Las entradas del **1, 2 y 3 de Agosto** fueron eliminadas el 10 de Agosto al superar los 7 días. La entrada del **4 de Agosto** fue eliminada el 12 de Agosto al superar los 7 días. La entrada del **5 de Agosto** fue eliminada el 13 de Agosto al superar los 7 días. La entrada del **6 de Agosto** fue eliminada el 14 de Agosto al superar los 7 días. La entrada del **7 de Agosto** fue eliminada el 15 de Agosto al superar los 7 días. La entrada del **8 de Agosto** fue eliminada el 17 de Agosto al superar los 7 días. La entrada del **10 de Agosto** fue eliminada el 18 de Agosto al superar los 7 días. La entrada del **11 de Agosto** fue eliminada el 19 de Agosto al superar los 7 días. La entrada del **12 de Agosto** fue eliminada el 20 de Agosto al superar los 7 días. La entrada del **13 de Agosto** fue eliminada el 21 de Agosto al superar los 7 días. La entrada del **14 de Agosto** fue eliminada el 22 de Agosto al superar los 7 días. La entrada del **15 de Agosto** fue eliminada el 25 de Agosto al superar los 7 días. La entrada del **17 de Agosto** fue eliminada el 25 de Agosto al superar los 7 días. La entrada del **18 de Agosto** fue eliminada el 26 de Agosto al superar los 7 días. La entrada del **19 de Agosto** fue eliminada el 27 de Agosto al superar los 7 días. La entrada del **20 de Agosto** fue eliminada el 28 de Agosto al superar los 7 días. La entrada del **21 de Agosto** fue eliminada el 29 de Agosto al superar los 7 días. La entrada del **22 de Agosto** fue eliminada el 30 de Agosto al superar los 7 días. La entrada del **23 de Agosto** fue eliminada el 31 de Agosto al superar los 7 días. La entrada del **24 de Agosto** fue eliminada el 1 de Septiembre al superar los 7 días. La entrada del **25 de Agosto** fue eliminada el 2 de Septiembre al superar los 7 días. Anteriores eliminadas: 16, 17 y 18 de Junio, 5, 6, 7, 9, 11, 12 y 15 de Junio, y días de Mayo.
