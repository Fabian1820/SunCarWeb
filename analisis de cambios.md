# Registro de Análisis de Cambios — SunCarWeb

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

5. **fix(ofertas-confeccion) margen_asignado = 0 restaurado — confirmar que ofertas viejas sin reparto siguen usando el algoritmo automático**: El commit dice que "ofertas viejas sin reparto (todos los ítems a 0) siguen calculándose con el algoritmo automático". Verificar que la detección de "oferta sin reparto previo" no clasifica incorrectamente como tal a una oferta donde el comercial decidió dar 0% a todos los ítems intencionalmente.

6. **feat(clientes) tipo "visita" — dependencia de backend sin confirmar en producción**: El commit lo indica explícitamente. Si el backend no tiene "visita" en el Literal del endpoint `POST /clientes/{numero}/fotos`, cualquier intento de subir una foto de visita dará 422.

7. **feat(navegacion) "Volver" — módulos no registrados en MODULOS_CATALOGO siguen volviendo a "/"**: Si algún módulo o subpágina futura no se registra en el catálogo, el botón atrás vuelve al inicio sin aviso. Confirmar cobertura completa, especialmente para pantallas de detalle dinámico (`/clientes/[id]`, etc.).

8. **fix(solicitudes-materiales) — filtro de anulados solo cubre este diálogo**: El selector de cliente en otros flujos (crear oferta, factura, etc.) puede seguir mostrando clientes anulados. El concern del 26 de Agosto sigue vigente para los demás selectors.

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

- **`feat(materiales): muestra el nombre de catalogo en vez de la descripcion`** — El operador reportó que el breaker de 80A 3P aparecía como "PROTECCION" y el de 2P como "BREAKER", sin poder distinguirlos salvo por la foto. Causa: `descripcion` es texto libre y 27 materiales la comparten con otro artículo; además uno tiene como descripción el nombre de su categoría. El `nombre` sí los distingue.

  1. **Orden unificado en todas las pantallas**: `material_nombre` → `material.nombre` → `material_descripcion`. El backend ya publica `material_nombre` resuelto del catálogo.
  2. **`material_nombre` añadido a StockItem**: hasta ahora StockItem solo exponía la descripción embebida.
  3. **Pantallas afectadas**: inventario (stock, editar stock, salida por lote), solicitudes de materiales, vales y devolución de vale, facturas, pagos de ventas, solicitudes de ventas, consignaciones, centro de control y trabajos diarios.
  4. **Efecto en facturas**: la línea de factura armada desde el vale pasa a guardar el nombre de catálogo en lugar de la descripción (antes escribía "PROTECCION").

---

### Área 2: feat(ofertas) — descuento y total a pagar en tabla y PDF (21:51)

- **`feat(ofertas): muestra el descuento y el total a pagar en tabla y PDF`** — `asumido_por_empresa` y `compensacion` no estaban dentro de `precio_final`; solo bajaban `monto_pendiente`, así que ni la tabla ni las exportaciones los reflejaban. Una oferta de 16.870 con 6.000 asumidos se exportaba como 16.870.

  1. **"Monto asumido por empresa" renombrado a "Descuento"** en el formulario. Admite monto fijo o % sobre el precio final y exige justificación. El "Descuento (%)" anterior queda en solo lectura y solo aparece en las ofertas que ya lo tienen guardado.
  2. **Tabla con nuevas columnas "Descuento" y "Total a pagar"**.
  3. **Exportaciones**: bajo cada precio final, el desglose del descuento y la compensación con su justificación y el total a pagar. La conversión a EUR/CUP pasa a calcularse sobre el total a pagar.
  4. **Unificación del generador de opciones de exportación**: estaba triplicado en `ofertas-confeccionadas-view`, `clients-table` y `leads-table`. Las copias de clientes y leads calculaban el subtotal sin `margen_materiales`, por lo que la nota "(Redondeado desde X $)" imprimía un importe ~18% menor que el real: acertaban en 5 de 46 ofertas frente a 46 de 46 de la versión de ofertas, que es la conservada.

---

### Área 3: fix(ofertas) — descuento debajo del precio final en el PDF (22:13)

- **`fix(ofertas): coloca el descuento bajo el precio final en el PDF`** — El renderizador agrupaba las filas por `tipo` e ignoraba el orden del array, así que el descuento se pintaba ANTES del precio final (junto al descuento porcentual antiguo) y la fila del neto nunca se dibujaba porque el bloque final solo usa `totales[0]`.

  1. **Nuevos tipos de fila `DescuentoNeto` y `TotalAPagar`**: pintados dentro del bloque resaltado, debajo del precio final.
  2. **Añadidos a `tipoNoMaterial`**: para que la tabla de materiales no los duplique como sección.
  3. **Importe formateado consistentemente** con el resto del bloque.
  4. Resultado en PDF:
     ```
     Precio Final                                    16870,00 $
     Descuento — Recogida del equipamiento Huawei   - 6000,00 $
     Total a pagar                                   10870,00 $
     ```

---

### Puede dar bateo

1. **Facturas históricas con `descripcion` embebida — nombre incorrecto en vista**: Las líneas de factura creadas antes del deploy guardan la descripción libre, no el nombre de catálogo. Si la vista prioriza `material_nombre` del catálogo y no tiene fallback a la descripción embebida histórica, esas facturas mostrarán el campo vacío o el nombre incorrecto.

2. **27 materiales con descripciones compartidas — confirmación de mapeo correcto en producción**: El fix asume que `material_nombre` del catálogo distingue correctamente los artículos con descripciones idénticas. Confirmar con el catálogo real en producción que ningún `material_nombre` está también duplicado o vacío.

3. **StockItem con `material_nombre` nuevo — consumidores sin actualizar**: Si algún componente consume `StockItem` y accedía directamente a `descripcion` sin pasar por la prioridad de campos, el nombre seguirá siendo el antiguo hasta que se recargue con el nuevo campo. Confirmar que todos los consumidores de `StockItem` fueron actualizados.

4. **Conversión EUR/CUP ahora sobre "Total a pagar" — posible desincronía con backend**: Si el backend calculaba la conversión sobre `precio_final` y el frontend la calcula ahora sobre `total_a_pagar`, puede haber diferencia entre el monto en EUR/CUP mostrado en la UI y el que el backend devuelve en exportaciones serverside.

5. **"Descuento (%)" antiguo en solo lectura — confirmar que no se pierde en borradores**: El % de descuento anterior es visible solo en ofertas "que ya lo tienen guardado". Si un borrador con este campo no guardado se edita y se guarda de nuevo, el valor puede perderse sin aviso.

6. **~18% de subimporte erróneo en exportaciones históricas**: Las exportaciones de clientes/leads generadas antes del deploy muestran importes ~18% menores que el real. Los documentos impresos o guardados tienen datos incorrectos; no hay forma de regenerarlos automáticamente.

7. **`tipoNoMaterial` como mecanismo de exclusión frágil**: Si en el futuro se añade otro tipo especial sin recordar actualizar `tipoNoMaterial`, se duplicará silenciosamente en el PDF.

8. **Signo del descuento en el PDF — doble negativo en edge case**: El PDF prefija "- " al monto del descuento. Si el campo de descuento puede llegar negativo desde el backend, el PDF mostrará "- -6000,00 $". Confirmar que el campo siempre llega como valor positivo.

9. **Nuevas columnas en tabla — impacto en exportaciones Excel por posición de columna**: Cualquier importación externa que lea el Excel de ofertas por índice de columna quedará desalineada.

---

## 📅 26 de Agosto, 2026

### Resumen de cambios (últimas 24h)

**2 commits reales** — Fabian1820 (co-authored Claude Opus 5). Fix crítico de paginación de clientes: 67 clientes invisibles desde el 31 de julio ahora son visibles, con buscador multicampo y flujo de anular/reactivar. También nueva opción de redondeo manual de precio final en ofertas.

---

### Área 1: fix(clientes-ventas) — paginación completa, buscador multicampo y anular/reactivar (18:35)

- **`fix(clientes-ventas): carga completa, buscador y anulacion`** — El módulo cargaba una sola página de 500 clientes y filtraba en memoria. Al superar los 500 documentos el 2026-07-31, los 67 clientes más antiguos (orden fecha_creacion DESC) quedaron invisibles para la UI: 66 de ellos con historial (85 ofertas, 199 solicitudes, 84 facturas). No salían en la tabla, el buscador ni en los selectores de oferta, y los comerciales los recreaban como nuevos.

  1. **Paginación completa en `getAllClientes()`**: pagina hasta agotar el `total` que la API ya devolvía pero que el servicio descartaba. El contador "Mostrando X de Y clientes" en la cabecera ahora delata cualquier truncamiento futuro.
  2. **`normalizeText` colapsa espacios repetidos**: corrige casos como "Antonio Rivero  Garcia" que antes no coincidían en búsquedas locales.
  3. **Selectores de cliente con búsqueda multicampo en backend**: nombre, número, CI, teléfono y ubicación, sin distinguir tildes. Límite subido de 20 a 50 resultados.
  4. **CI duplicada**: el diálogo deja de tragarse el error; marca el campo CI en rojo y muestra el mensaje del backend junto al formulario.
  5. **Anular/Reactivar en lugar de Eliminar**: badge de estado, fila atenuada para anulados, enlace para mostrarlos. El borrado definitivo solo aparece sobre un cliente ya anulado; el backend lo rechaza si tiene historial.

---

### Área 2: feat(ofertas) — check de redondeo manual de precio final (16:20)

- **`feat(ofertas): check para ajustar el redondeo del precio final a mano`** — El precio final siempre se redondeaba al múltiplo de 10 hacia arriba sin posibilidad de dejarlo en el valor real de la oferta.

  1. **Nuevo check "Ajustar redondeo manual"** en el resumen de precios: al activarlo carga el precio del redondeo automático y habilita el campo para que el comercial lo baje.
  2. **Atajos**: sin redondeo, múltiplo de 5, múltiplo de 10.
  3. **Rango acotado** a [precio real, redondeo automático]: fuera de rango se marca en rojo y bloquea el guardado.
  4. **Check deshabilitado** automáticamente cuando el total ya es múltiplo de 10.
  5. **Estado conservado** en borrador, edición y al duplicar.
  6. Sin activarlo, el comportamiento es exactamente igual al anterior.

---

### Puede dar bateo

1. **67 clientes invisibles ~26 días — posibles duplicados en BD**: Los clientes que no aparecían en tabla, buscador ni selectores desde el 31 de julio pueden haber sido recreados por comerciales que no los encontraban. Ahora son visibles con paginación completa pero puede haber duplicados activos con historial dividido. Verificar manualmente por CI o teléfono.

2. **Clientes anulados — confirmar exclusión en selectores de oferta/solicitud/factura**: La fila atenuada y el badge "Anulado" son visuales. El fix del 28 de Agosto cubre solicitudes de materiales; confirmar los demás flujos de creación.

3. **Delete definitivo — confirmar que la restricción "con historial" está en backend, no solo en frontend**: El botón "Eliminar" solo se muestra sobre clientes ya anulados y sin historial. Si esta lógica solo vive en frontend, un DELETE directo a la API puede eliminar un cliente con historial.

4. **Paginación completa puede ser lenta en colecciones grandes**: Si la colección sigue creciendo, cargar todos los clientes al entrar al módulo incrementará el tiempo de carga linealmente. No hay lazy loading ni paginación virtual en la tabla.

5. **Precio manual sin trazabilidad**: El comercial puede bajar el precio final sin que quede registro de quién lo ajustó ni por qué. Si el sistema tiene audit log de cambios de oferta, confirmar que el precio manual se registra con usuario y motivo.

6. **Estado del check al duplicar con catálogo cambiado**: Al duplicar una oferta con precio manual, el precio heredado puede quedar fuera del rango [precio real, redondeo automático] si los precios del catálogo cambiaron desde que se creó la original. Confirmar que el rango se recalcula al duplicar, no se hereda del borrador original.

7. **Atajo "sin redondeo" puede producir precios con decimales**: Si el precio real del cálculo tiene decimales (ej. $1234.56), el atajo "sin redondeo" lo ofrece tal cual. Verificar que el backend acepta precios con decimales en ofertas o si espera enteros.

---

## 📅 25 de Agosto, 2026

### Resumen de cambios (últimas 24h)

**3 commits reales** — Fabian1820 (co-authored Claude Opus 5). Dos features y una limpieza: separación del sub-permiso de precios en la ficha de costo de compras, subida de lote de fotos/videos en clientes y leads, y eliminación de una ruta vacía de tiendas que generaba errores TypeScript silenciosos.

---

### Área 1: feat(compras) — sub-permiso `envio-contenedores/ficha-precios` separado (16:39)

- **`feat(compras): separa el permiso de precios de la ficha de costo`** — Se introduce el sub-permiso ADITIVO `envio-contenedores/ficha-precios` para controlar quién puede ver y aplicar precios de venta en la ficha de costo de una compra:

  1. **Sin el sub-permiso** (solo el padre `envio-contenedores`): la ficha muestra únicamente CIF, % recargo, costo, stock y el botón "Actualizar costos". Se ocultan márgenes, columnas de precios (catálogo, sugeridos y finales) y el botón "Aplicar precios".
  2. **Con el sub-permiso**: la ficha completa, igual que antes del cambio.
  3. **Guardados en modo solo-costos**: los campos de precio y los márgenes globales se omiten del PATCH, aprovechando `exclude_unset` en el backend (`PATCH /compras/{id}` y `/ficha`), para que el usuario de costos no pise el borrador del económico al pulsar "Actualizar costos".
  4. **Backfill**: `scripts/backfill_permiso_ficha_precios.py` en SunCarBackend para los 10 usuarios que ya ejercían el permiso completo — necesita ejecutarse en producción.
  5. **Fix visual adicional**: la fila de totales tenía 13 celdas para 14 columnas; la tabla salía corrida una columna a partir del grupo "Actuales". Corregido.

---

### Área 2: feat(clientes,leads) — subida de lote de fotos/videos (16:47)

- **`feat(clientes,leads): permite subir varias fotos/videos a la vez`** — El diálogo de "agregar foto" aceptaba un solo archivo por vez. Ahora:

  1. **Input múltiple con acumulación**: la selección se acumula entre tandas (el usuario puede agregar más antes de subir). Lista los archivos elegidos con su tamaño y permite quitar cualquiera antes de subir.
  2. **Progreso archivo por archivo**: se muestra el avance durante la subida.
  3. **Subida secuencial** (uno a uno), ya que el backend acepta un archivo por petición (`POST /clientes/{numero}/fotos` y `POST /leads/{id}/fotos`).
  4. **Resiliencia a fallos parciales**: si un archivo falla, los demás continúan. Los archivos fallidos permanecen en el diálogo para reintentarlos sin duplicar los ya guardados. La lista se refresca una sola vez al final.
  5. **Lógica común extraída** a `lib/utils/upload-fotos-lote.ts`, compartida entre ambos módulos.

---

### Área 3: chore(tiendas) — elimina ruta vacía /tiendas/[tiendaId]/ventas (16:58)

- **`chore(tiendas): elimina la ruta vacía /tiendas/[tiendaId]/ventas`** — El archivo entró vacío (0 bytes) en el commit `0e8ff594` junto con los módulos de POS y caja, y nunca llegó a tener contenido. Next lo registraba igual como ruta y, al no exportar nada, rompía el typecheck con 3 errores TS2306 (ignorados por `next.config.mjs` en el build). Ningún archivo enlazaba a esa ruta: la ficha de tienda solo apunta a `/caja`.

---

### Puede dar bateo

1. **Backfill de `envio-contenedores/ficha-precios` sin confirmar ejecución**: El script `backfill_permiso_ficha_precios.py` está en SunCarBackend pero no hay confirmación de que se ejecutó en producción. Hasta que se ejecute, los 10 usuarios que ya tenían acceso completo verán solo la ficha de costos — perderán visibilidad de precios y el botón "Aplicar precios" sin aviso previo.

2. **Ventana de degradación entre deploy de frontend y ejecución del backfill**: Si el frontend se desplegó antes de ejecutar el script, hubo (o hay) una ventana donde usuarios con acceso previo no pueden usar la funcionalidad de precios. Confirmar el orden de operaciones real en producción.

3. **`exclude_unset` en PATCH `/compras/{id}` y `/ficha` — confirmar en backend de producción**: El commit asume que el backend tiene `exclude_unset=True` en los endpoints de compra. Si la versión deployada no lo tiene, pulsar "Actualizar costos" en modo solo-costos silenciosamente borrará los precios del económico con `null` o valores vacíos.

4. **Lote de fotos: archivos fallidos se pierden si el usuario cierra el diálogo**: Si el usuario cierra el diálogo de subida antes de ver el resumen de errores, los archivos fallidos se descartan sin confirmación. No hay persistencia del estado de reintento entre aperturas del diálogo.

5. **Subida secuencial lenta en lotes grandes**: Con 10+ archivos, la subida de uno en uno puede tardar considerablemente. Si el usuario navega fuera de la página durante la subida, las peticiones en curso pueden quedar huérfanas.

6. **`lib/utils/upload-fotos-lote.ts` compartida — un bug afecta ambos módulos simultáneamente**: Cualquier regresión en la lógica compartida rompe la subida tanto en leads como en clientes a la vez. Confirmar que hay cobertura de pruebas o que el cambio fue verificado en ambos módulos.

7. **Ruta /tiendas/[tiendaId]/ventas eliminada — bookmarks y links externos darán 404**: Aunque nadie enlazaba desde el código, pueden existir bookmarks de usuarios o links en WhatsApp/correo. Confirmar que el 404 muestra una página de error manejada y no una pantalla en blanco de Next.

8. **3 errores TS2306 ignorados durante la vida de la ruta vacía — confirmar que no quedan otras rutas vacías**: El archivo entró en producción en `0e8ff594` y pasó desapercibido. Verificar si hay otros archivos de ruta vacíos en el directorio `app/` que puedan generar el mismo patrón.

---

## 📅 24 de Agosto, 2026

### Resumen de cambios (últimas 24h)

**7 commits reales** — Fabian1820 (co-authored Claude Opus 5). Sesión masiva de saneamiento: errores TypeScript en main: **237 → 0** en dos etapas (47 intermedios). Se eliminan archivos huérfanos del catálogo viejo de ofertas, se alinean todos los tipos con el backend real, y se corrigen tres bugs de comportamiento críticos en brigadas y facturación.

---

### Área 1: fix(types) — alineación de tipos con backend (237 → 0 errores) (14:17–14:31)

- **`fix(types): alinea los tipos con lo que devuelve el backend (190 → 0 errores)`** — Campaña exhaustiva verificada endpoint por endpoint contra `openapi.json` del backend desplegado. Bugs reales encontrados en el proceso:
  1. **PDF de oferta mostraba provincia en blanco**: `Lead` no tiene `nombre_completo`, `email` ni `provincia`; el campo correcto es `provincia_montaje`.
  2. **TypeError al hacer clic en mapa**: `MapPicker.onSelect` era obligatorio; el diálogo "Ubicación del cliente" no lo pasaba.
  3. **Compras: filtro de estado roto**: Se comparaba con `"recibida_parcial"` (alias legacy) cuando el backend normaliza a `"recibido_parcial"` — el filtro nunca coincidía.
  4. **Transferencias**: Faltaba el estado `"procesando"` en el union de tipos.
  5. **Marcas**: Alta rápida no mandaba `tipos_material` (obligatorio) → 422.
  6. **Nóminas**: Mensaje de error interpolaba `mes`/`anio`, campos que el request no tiene → se mostraba `"undefined/undefined"`.
  7. **`OfertaInstalacion` duplicada**: Dos definiciones incompatibles en servicios y types; ahora el servicio reexporta la canónica.
  8. **Barrels rotos**: `material-types` e `inventario-types` habían perdido sus reexports.
  9. **Stripe `route.ts`**: Duplicaba la constante de versión en lugar de importarla. Pin mantenido en `2024-12-18.acacia` como decisión de negocio.
  10. **Fallbacks imposibles removidos**: Fotos en planificación, `fecha_creacion` en solicitud del vale, `codigo_cliente`/`numero_cliente`/`referencia_cliente` en clientes — verificados contra backend como campos que no existen en el response model.

- **`chore: elimina cuatro archivos huérfanos`** — Sin imports entrantes detectados en análisis estático:
  - `category-management.tsx` y `category-form.tsx` (llamaban a `MaterialService.createCategoryWithPhoto/updateCategoryWithPhoto`, métodos que no existen).
  - `venta-form.tsx` (daría 422 al backend por falta de `almacen_id` por item).
  - `local-storage-ordenes.ts` (placeholder previo al backend de órdenes de trabajo; sus tipos ya no existían).

---

### Área 2: fix(brigadas) — tres bugs de comportamiento en CRUD y reportes (14:16–14:28)

- **`fix(brigadas): editar/eliminar brigada y trabajadores llamaban a métodos inexistentes`** — `BrigadaService` no definía `updateBrigada`, `deleteBrigada`, `addTrabajador` ni `removeTrabajador`; cualquier consumidor del hook reventaba con TypeError. Los DELETE pasaban el `ObjectId` de la brigada, pero el backend busca por `lider_ci`. El backend devolvía `success:false` con HTTP 200 y la UI mostraba "Éxito" sin haber borrado nada.

- **`fix(brigadas): el informe de materiales usados apuntaba a rutas inexistentes`** — Rutas correctas: `/reportes/materiales-usados/brigada` y `.../todas-brigadas` (las anteriores daban 404). El endpoint pide `lider_ci`, no el `ObjectId`. La respuesta es `{success, message, materiales}`, no `data.data`. Las columnas de la tabla también se corrigen: **UM** en lugar de Categoría (que no existe en el response).

---

### Área 3: fix(pagos-ventas) — emitir factura daba 422 (14:16–14:28)

- **`fix(pagos-ventas): emitir factura desde pagos-clientes-ventas omitía los campos obligatorios`** — `POST /facturas-ventas` exige `numero`, `fecha`, `cliente_venta_id` y `solicitudes`. La llamada anterior solo mandaba campos legacy (`numero_factura`, `emitida_por`, `fecha_emision`) → 422. El endpoint del catch usaba el mismo esquema, por lo que el reintento tampoco salvaba. Verificado en producción: las 576 facturas existentes llevan los 4 campos obligatorios. Fix: `cliente_venta_id` sale de `selectedSolicitud` (766/766 solicitudes lo tienen).

---

### Área 4: chore(ofertas) — retira catálogo viejo de producción (16:11–16:21)

- **`chore(ofertas): retira el catalogo viejo de produccion y arregla las coordenadas`** — Porta a main lo que dev hizo el 20 de agosto. La cadena del catálogo viejo estaba muerta en main (ningún archivo fuera de ella la referenciaba). Se eliminan los 4 eslabones: `ofertas-embebidas-fields.tsx`, `ofertas-asignacion-fields.tsx`, `hooks/use-ofertas.ts`, y `OfertaService` de `api-services.ts`/`feats/ofertas/oferta-service.ts`. Aportaban 45 de los 47 errores TypeScript restantes.
  - **Fix adicional**: `cliente-detalles-dialog` — el estrechamiento de `hasLocation` no alcanzaba a `parseFloat` (recibía `string | undefined`). Se extrae a helper `toCoord` que comprueba en el punto de uso.
  - **CLAUDE.md desactualizado (señalado en el commit)**: La sección que describe `OfertasAsignacionFields` como componente en uso quedó obsoleta.

---

### Puede dar bateo

1. **Catálogo viejo eliminado — imports dinámicos no detectados**: El análisis de dependencias fue estático. Si hay `React.lazy()` o `dynamic(() => import(...))` apuntando a los archivos eliminados en algún path no analizado, la app rompe en runtime.

2. **Fallbacks removidos — datos inesperados del backend**: Se retiraron fallbacks verificados como "imposibles" contra el openapi. Si el backend en producción tiene una versión ligeramente distinta y devuelve alguno de esos campos, el renderizado puede romper o perder datos silenciosamente.

3. **Fix emitir factura — `selectedSolicitud` puede ser null**: El fix asume que `selectedSolicitud` siempre tiene `cliente_venta_id` (verificado contra 766/766 solicitudes en producción). Si el estado de la UI permite abrir el diálogo de factura sin solicitud seleccionada, el payload tendrá `cliente_venta_id: undefined` y seguirá dando 422.

4. **Fix brigadas DELETE por lider_ci — múltiples brigadas con mismo lider**: Raro pero posible si la BD tiene inconsistencias históricas. Si hay dos brigadas con el mismo `lider_ci`, el DELETE puede afectar la primera que encuentre el backend, no la seleccionada en UI.

5. **Stripe pin `2024-12-18.acacia` mantenido explícitamente**: Si Stripe depreca este pin o tiene vulnerabilidades en esta versión de API, el endpoint de pagos podría fallar o quedar expuesto sin una alerta clara. Es una deuda técnica activa por decisión de negocio.

6. **CLAUDE.md desactualizado (señalado en el commit, no corregido)**: La sección del CLAUDE.md describe `OfertasAsignacionFields` como componente en uso activo. Cualquier sesión de Claude Code que la lea puede tomar decisiones erróneas.

---

## 📅 23 de Agosto, 2026

### Resumen de cambios (últimas 24h)

Sin commits nuevos de código. El único commit del período es "Analisis diario Claude" (generado automáticamente). No hay cambios en producción en SunCarWeb.

---

### Puede dar bateo

Sin cambios nuevos — sin riesgos nuevos.

---

## 📅 22 de Agosto, 2026

### Resumen de cambios (últimas 24h)

Sin commits nuevos de código. El único commit del período es "Analisis diario Claude" (generado automáticamente). No hay cambios en producción en SunCarWeb.

---

### Puede dar bateo

Sin cambios nuevos — sin riesgos nuevos.

---

## 📅 21 de Agosto, 2026

### Resumen de cambios (últimas 24h)

**1 commit** — Fabian1820. Nueva funcionalidad en el módulo de visitas: opción de marcar una visita como realizada sin registrar toda la información, con flujo para completarla después. También corrige la creación de visitas para clientes (antes fallaba con "No se encontró una visita para este registro").

---

### Área 1: feat(visitas) — marcar visita como realizada sin info + fix creación para clientes (Fabian1820, 14:26)

- **`feat(visitas): permite marcar una visita como realizada sin registrar la info`** — Co-authored con Claude Opus 5. Cambios principales:

  1. **Nuevo paso previo en "Completar"**: antes de abrir el formulario completo, se elige entre "marcar sin información" (solo fecha + comentario opcional) o "rellenar datos completos".
  2. **Visitas `marcada_sin_info` diferenciadas en la pestaña de realizadas**: fila ámbar en cursiva, badge "Sin info" y botón "Rellenar info" que reabre el formulario completo sobre la misma visita.
  3. **Creación de visita extraída a helpers compartidos**: antes el helper solo creaba visitas para leads; ahora también para clientes. Elimina el error "No se encontró una visita para este registro" al completar desde el módulo de clientes.
  4. **Requiere backend con resultado `marcada_sin_info` ya deployado**.

---

### Puede dar bateo

1. **Dependencia dura de `marcada_sin_info` en backend — sin confirmar en producción**: Si el backend no tiene ese resultado, cualquier intento de marcar sin info fallará (422 o 500).

2. **Transición `marcada_sin_info` → completa — confirmar soporte de backend**: Confirmar que el backend acepta actualizar una visita con estado `marcada_sin_info` a estado completo (PATCH sin restricciones de estado previo).

3. **Fix de creación para clientes — confirmar que no rompe leads**: Si la lógica de detección de tipo (lead vs cliente) falla en algún edge case, la creación de visita puede intentar un endpoint incorrecto.

4. **Comentario opcional sin validación de longitud**: Un comentario muy largo puede llegar al backend sin restricción.

5. **Visitas `marcada_sin_info` en exportaciones y reportes**: Las visitas con este estado nuevo pueden aparecer en reportes o exportaciones con campos vacíos o errores de serialización.

---

#### Seguimientos vigentes

- **feat(clientes) tipo "visita" — confirmar deploy de backend con "visita" en Literal del endpoint POST /clientes/{numero}/fotos antes de usar en producción (Ago 28)**.
- **fix(ofertas-confeccion) bloqueo optimista — confirmar UX cuando el comercial recibe 409: ¿puede ver los cambios del otro y fusionarlos o solo ve un error opaco? (Ago 28)**.
- **fix(ofertas-confeccion) borradores con caducidad 2h — verificar si es suficiente para sesiones largas de confección (Ago 28)**.
- **fix(ofertas-confeccion) moneda — ofertas existentes con tasa 0 sin migración automática — requieren edición manual por el comercial para exportar en moneda correcta (Ago 28)**.
- **feat(navegacion) "Volver" deducido de MODULOS_CATALOGO — confirmar cobertura completa: módulos no registrados siguen volviendo a "/" (Ago 28)**.
- **fix(solicitudes-materiales) anulados — el filtro solo cubre el diálogo de solicitudes; confirmar que selectores de oferta, factura y otros flujos también excluyen clientes anulados (Ago 28)**.
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
- **CLAUDE.md desactualizado — sección de `OfertasAsignacionFields` describe componente ya eliminado como en uso activo; puede confundir sesiones futuras de Claude Code (Ago 24)**.
- **Stripe pin `2024-12-18.acacia` mantenido explícitamente por decisión de negocio — revisión pendiente si Stripe depreca el pin (Ago 24)**.
- **Visitas `marcada_sin_info` — confirmar deploy de backend con resultado `marcada_sin_info` antes de usar en producción (Ago 21)**.
- **"Rellenar info" en visitas sin info — confirmar que backend acepta PATCH sin restricción de estado previo (Ago 21)**.
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
- **`lib/export-multi-sheet-service.ts` eliminado — confirmar sin imports residuales (Jul 3)**.
- **`compensacion`/`asumido_por_empresa` en OfertaConPagos — confirmar campos en backend (Jun 29)**.
- **Módulo Asistencia — endpoints de backend sin confirmar (Jun 26)**.
- **`hasExactPermission` — usuarios con almacenes-suncar sin subpermiso admin explícito perderán acceso (Jun 26)**.
- **Reservas expiradas reactivadas — conflicto con materiales reasignados entre expiración y nueva fecha (Jun 23)**.
- **Lista blanca de CIs de pagos hardcodeada en frontend (Jun 23)**.
- **Race condition en el cálculo de disponible de reservas**.
- **`pool=indistinto` para split automático — backend debe implementarlo**.
- **BMS como categoría reservable — docs sin `.pools` bloquean el 100% de reservas BMS**.
- **AdminPass 123456 hardcodeado**.
- **Badge de estado calculado en frontend con flotantes**.

---

> ⚠️ **Nota de mantenimiento**: Las entradas del **19, 20 y 21 de Junio** y del **23 de Junio** fueron eliminadas al superar los 7 días de antigüedad (política de retención semanal). La entrada del **26 de Junio** fue eliminada el 4 de Julio al superar los 7 días. La entrada del **28 de Junio** fue eliminada el 6 de Julio al superar los 7 días. La entrada del **29 de Junio** fue eliminada el 7 de Julio al superar los 7 días. La entrada del **30 de Junio** fue eliminada el 8 de Julio al superar los 7 días. Las entradas del **1 y 2 de Julio** fueron eliminadas el 10 de Julio al superar los 7 días. La entrada del **3 de Julio** fue eliminada el 11 de Julio al superar los 7 días. Las entradas del **4 y 5 de Julio** fueron eliminadas el 13 de Julio al superar los 7 días. La entrada del **6 de Julio** fue eliminada el 14 de Julio al superar los 7 días. La entrada del **7 de Julio** fue eliminada el 15 de Julio al superar los 7 días. La entrada del **8 de Julio** fue eliminada el 17 de Julio al superar los 7 días. La entrada del **10 de Julio** fue eliminada el 18 de Julio al superar los 7 días. La entrada del **11 de Julio** fue eliminada el 19 de Julio al superar los 7 días. La entrada del **13 de Julio** fue eliminada el 21 de Julio al superar los 7 días. La entrada del **14 de Julio** fue eliminada el 22 de Julio al superar los 7 días. La entrada del **15 de Julio** fue eliminada el 23 de Julio al superar los 7 días. La entrada del **17 de Julio** fue eliminada el 25 de Julio al superar los 7 días. La entrada del **18 de Julio** fue eliminada el 26 de Julio al superar los 7 días. La entrada del **19 de Julio** fue eliminada el 27 de Julio al superar los 7 días. La entrada del **20 de Julio** fue eliminada el 28 de Julio al superar los 7 días. La entrada del **21 de Julio** fue eliminada el 30 de Julio al superar los 7 días. La entrada del **22 de Julio** fue eliminada el 30 de Julio al superar los 7 días. La entrada del **23 de Julio** fue eliminada el 31 de Julio al superar los 7 días. La entrada del **24 de Julio** fue eliminada el 1 de Agosto al superar los 7 días. La entrada del **25 de Julio** fue eliminada el 2 de Agosto al superar los 7 días. La entrada del **26 de Julio** fue eliminada el 3 de Agosto al superar los 7 días. La entrada del **27 de Julio** fue eliminada el 4 de Agosto al superar los 7 días. La entrada del **28 de Julio** fue eliminada el 5 de Agosto al superar los 7 días. La entrada del **30 de Julio** fue eliminada el 7 de Agosto al superar los 7 días. La entrada del **31 de Julio** fue eliminada el 8 de Agosto al superar los 7 días. Las entradas del **1, 2 y 3 de Agosto** fueron eliminadas el 10 de Agosto al superar los 7 días. La entrada del **4 de Agosto** fue eliminada el 12 de Agosto al superar los 7 días. La entrada del **5 de Agosto** fue eliminada el 13 de Agosto al superar los 7 días. La entrada del **6 de Agosto** fue eliminada el 14 de Agosto al superar los 7 días. La entrada del **7 de Agosto** fue eliminada el 15 de Agosto al superar los 7 días. La entrada del **8 de Agosto** fue eliminada el 17 de Agosto al superar los 7 días. La entrada del **10 de Agosto** fue eliminada el 18 de Agosto al superar los 7 días. La entrada del **11 de Agosto** fue eliminada el 19 de Agosto al superar los 7 días. La entrada del **12 de Agosto** fue eliminada el 20 de Agosto al superar los 7 días. La entrada del **13 de Agosto** fue eliminada el 21 de Agosto al superar los 7 días. La entrada del **14 de Agosto** fue eliminada el 22 de Agosto al superar los 7 días. La entrada del **15 de Agosto** fue eliminada el 23 de Agosto al superar los 7 días. La entrada del **17 de Agosto** fue eliminada el 25 de Agosto al superar los 7 días. La entrada del **18 de Agosto** fue eliminada el 26 de Agosto al superar los 7 días. La entrada del **19 de Agosto** fue eliminada el 27 de Agosto al superar los 7 días. La entrada del **20 de Agosto** fue eliminada el 28 de Agosto al superar los 7 días. Anteriores eliminadas: 16, 17 y 18 de Junio, 5, 6, 7, 9, 11, 12 y 15 de Junio, y días de Mayo.
