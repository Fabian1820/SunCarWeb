# Registro de Análisis de Cambios — SunCarWeb

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

2. **Clientes anulados — confirmar exclusión en selectores de oferta/solicitud/factura**: La fila atenuada y el badge "Anulado" son visuales. Si el selector de clientes en los flujos de creación de oferta, solicitud y factura no filtra por estado, un comercial puede crear documentos sobre un cliente anulado.

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

5. **Subida secuencial lenta en lotes grandes**: Con 10+ archivos, la subida de uno en uno puede tardar considerablemente. Si el usuario navega fuera de la página durante la subida, las peticiones en curso pueden quedar huérfanas (depende de si el componente se desmonta o no).

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

1. **Catálogo viejo eliminado — imports dinámicos no detectados**: El análisis de dependencias fue estático. Si hay `React.lazy()` o `dynamic(() => import(...))` apuntando a los archivos eliminados en algún path no analizado, la app rompe en runtime con "module not found" la primera vez que se activa esa ruta. Confirmar que no hay lazy-loading residual en el router.

2. **Fallbacks removidos — datos inesperados del backend**: Se retiraron fallbacks verificados como "imposibles" contra el openapi. Si el backend en producción tiene una versión ligeramente distinta y devuelve alguno de esos campos (fotos en planificación, `fecha_creacion` en vale, `codigo_cliente` en clientes), el renderizado puede romper o perder datos silenciosamente sin error visible.

3. **Fix emitir factura — `selectedSolicitud` puede ser null**: El fix asume que `selectedSolicitud` siempre tiene `cliente_venta_id` (verificado contra 766/766 solicitudes en producción). Si el estado de la UI permite abrir el diálogo de factura sin solicitud seleccionada, el payload tendrá `cliente_venta_id: undefined` y seguirá dando 422 con un error diferente.

4. **Fix brigadas DELETE por lider_ci — múltiples brigadas con mismo lider**: Raro pero posible si la BD tiene inconsistencias históricas. Si hay dos brigadas con el mismo `lider_ci`, el DELETE puede afectar la primera que encuentre el backend, no la seleccionada en UI.

5. **`OfertaInstalacion` canónica reexportada desde el servicio**: Cualquier import directo desde el archivo de types que no pase por el barrel puede tener el path roto. Un import roto en runtime que TypeScript no detectó (los 190 errores eran en archivos ya eliminados) podría aparecer en producción la primera vez que se active esa funcionalidad.

6. **Stripe pin `2024-12-18.acacia` mantenido explícitamente**: Si Stripe depreca este pin o tiene vulnerabilidades en esta versión de API, el endpoint de pagos podría fallar o quedar expuesto sin una alerta clara. Es una deuda técnica activa por decisión de negocio.

7. **CLAUDE.md desactualizado (señalado en el commit, no corregido)**: La sección del CLAUDE.md describe `OfertasAsignacionFields` como componente en uso activo. Cualquier sesión de Claude Code que la lea puede tomar decisiones erróneas (buscar o referenciar archivos que ya no existen). Conviene actualizar o eliminar esa sección.

8. **Barrels restaurados — posibles imports duplicados**: Si algún archivo importaba directamente desde la fuente (no el barrel) durante el período con barrels rotos, ahora puede tener el tipo importado dos veces con nombres distintos, causando incompatibilidades de tipos en runtime aunque TypeScript no lo detecte.

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

  4. **Requiere backend con resultado `marcada_sin_info` ya deployado** (indicado explícitamente en el mensaje del commit).

---

### Puede dar bateo

1. **Dependencia dura de `marcada_sin_info` en backend — sin confirmar en producción**: El commit message lo dice explícitamente: "Requiere el backend con el resultado 'marcada_sin_info' ya desplegado." Si el backend no tiene ese resultado, cualquier intento de marcar sin info fallará (422 o 500). Verificar deploy de SuncarBackend antes de usar esta feature en producción.

2. **Transición `marcada_sin_info` → completa con "Rellenar info" — confirmar soporte de backend**: El botón "Rellenar info" reabre el formulario completo sobre la misma visita. Confirmar que el backend acepta actualizar una visita con estado `marcada_sin_info` a estado completo (PATCH sin restricciones de estado previo).

3. **Fix de creación para clientes — confirmar que no rompe leads**: Los helpers compartidos ahora manejan ambos tipos. Si la lógica de detección de tipo (lead vs cliente) falla en algún edge case, la creación de visita puede intentar un endpoint incorrecto y fallar para ambos tipos de registro.

4. **Estado visual sin refresh automático tras "Rellenar info"**: Si el usuario completa la info desde el botón "Rellenar info", confirmar que la fila ámbar/cursiva/badge "Sin info" desaparece inmediatamente en el UI sin necesidad de recargar la página.

5. **Comentario opcional sin validación de longitud**: Si el campo de comentario no tiene límite en el formulario frontend, un comentario muy largo puede llegar al backend sin restricción y potencialmente desbordarlo.

6. **Visitas `marcada_sin_info` en exportaciones y reportes**: Las visitas con este estado nuevo pueden aparecer en reportes o exportaciones con campos vacíos. Confirmar que los campos opcionales muestran "N/A" o equivalente en lugar de celdas vacías o errores de serialización.

---

## 📅 20 de Agosto, 2026

### Resumen de cambios (últimas 24h)

**2 commits** — Fabian1820. Módulo de Solicitudes de Envío: código original del 31 de julio mergeado hoy a main, y luego promovido como entrada propia en el dashboard dentro del grupo "Gestión de Almacenes".

---

### Área 1: feat(inventario) — módulo /solicitudes-envio + alertas de stock (co-authored Claude Sonnet 5, committed 2026-08-20)

- **`feat(inventario): módulo de Solicitudes de Envío + alertas de stock`** — Código original del 31 de julio, integrado hoy en main. Agrega:
  - Página `/solicitudes-envio` con 3 tabs: solicitudes locales, solicitudes internacionales, y materiales con alerta de stock (silenciables).
  - Componentes, hooks y servicio de API dedicados.
  - Tarjeta de acceso en Almacenes SunCar detrás del permiso `solicitudes-envio`.

---

### Área 2: feat(solicitudes-envio) — promueve el módulo al dashboard (Fabian1820, 19:59)

- **`feat(solicitudes-envio): promueve el módulo al dashboard, junto a Materiales`** — El módulo estaba oculto dentro de Almacenes SunCar (acceso solo por tarjeta interior, sin registro en módulos-catálogo, imposible de asignar como permiso normal). Ahora:
  - Entrada propia en el grupo "Gestión de Almacenes", al lado de "Gestionar Materiales".
  - Tarjeta de acceso eliminada de Almacenes SunCar (sin rutas duplicadas).
  - Permiso `solicitudes-envio` sin cambios — asignaciones existentes preservadas.

---

### Puede dar bateo

1. **Código de ~3 semanas sin deploy en main — endpoints de backend sin confirmar en producción**: El módulo fue escrito el 31 de julio. Si el backend de solicitudes-envio no fue deployado en ese momento (o fue deployado y revertido), los 3 tabs pueden fallar con 404 o 500 en producción. Verificar que los endpoints de solicitudes locales, internacionales y alertas de stock están activos.

2. **Alertas de stock "silenciables" — confirmar persistencia del estado silenciado**: Si el silenciado se guarda solo en estado local o `localStorage`, se pierde al recargar y el usuario vuelve a ver todas las alertas. Verificar si hay persistencia en backend o si el comportamiento esperado es explícitamente "se resetea al recargar".

3. **Módulo sin registro en módulos-catálogo hasta hoy — permisos posiblemente no asignados**: El permiso `solicitudes-envio` existía pero el módulo no aparecía en el catálogo de permisos. Nadie pudo haberlo asignado a través de la UI. Verificar que los usuarios que deben acceder tienen el permiso asignado explícitamente en BD.

4. **Ventana entre commits 1 y 2**: Si Railway auto-deploy estaba activo, hubo un período donde la tarjeta aparecía tanto en Almacenes SunCar como en el dashboard a la vez (dos caminos al mismo sitio). Usuarios que entraron en esa ventana pueden tener caché inconsistente.

5. **`/solicitudes-envio` sin RouteGuard confirmado**: Si la ruta no tiene `RouteGuard`, cualquier usuario autenticado puede acceder directamente por URL sin tener el permiso `solicitudes-envio`. Confirmar que existe el guard o que es intencional.

6. **3 tabs con potencialmente 3 endpoints distintos — error handling por tab**: Si un endpoint falla (ej. backend no tiene solicitudes internacionales deployadas), el tab puede quedar en loading o error sin afectar los demás. Confirmar que el fallo de un tab no rompe la página completa.

7. **Tarjeta eliminada de Almacenes SunCar — usuarios con flujo de trabajo establecido**: Usuarios que accedían a Solicitudes de Envío desde dentro de Almacenes SunCar deben adaptarse a la nueva ubicación en el dashboard. Sin redirect ni aviso desde la ubicación anterior.

---

## 📅 19 de Agosto, 2026

### Resumen de cambios (últimas 24h)

**2 commits** — Fabian1820. Fix de acceso del superAdmin al módulo SunCar WhatsApp (error silencioso en SSO) y limpieza de archivos cacheados versionados por error.

---

### Área 1: fix(suncar-whatsapp) — superAdmin entra al módulo y error deja de ser mudo (Fabian1820, 15:18)

- **`fix(suncar-whatsapp): el superAdmin entra al módulo y el error deja de ser mudo`** — El SSO de Chatwoot exigía el permiso explícito `suncar-whatsapp` en el backend y respondía 403. La tarjeta era visible en el dashboard, la pestaña se abría en blanco y se cerraba sola sin mostrar nada porque el motivo solo iba a `console.error`.
  - **Fix de identidad**: se extrae del endpoint `/auth/validate` (token JWT firmado) en lugar de fiarse del `ci` en el cuerpo de la petición — eliminando un vector de suplantación.
  - **Fix de roles**: el superAdmin entra como administrador en Chatwoot, igual que ya hacía `hasExactPermission`.
  - **Fix de visibilidad de errores**: los errores que antes se tragaban silenciosamente ahora se muestran en pantalla con el motivo real.

---

### Área 2: gitignore — dejar de versionar graphify-out/ e IntelliJ (Fabian1820, 22:10)

- **`Dejar de versionar la caché de graphify y la configuración de IntelliJ`** — `graphify-out/` (435 ficheros, ~12.8 MB de caché AST generada por la herramienta de análisis) eliminado del tracking. La configuración de IntelliJ también ignorada. Estos paths ahora en `.gitignore`.

---

### Puede dar bateo

1. **Fix SSO — `/auth/validate` como fuente de identidad**: Confirmar que el endpoint `/auth/validate` no tiene rate limiting que pueda causar fallos en el SSO bajo carga. Si este endpoint está caído o responde lento, el SSO completo falla aunque Chatwoot esté disponible.

2. **SuperAdmin entra como "administrador" en Chatwoot — confirmar que el rol es correcto para todos los superAdmins**: "Administrador" en Chatwoot puede dar acceso a configuración sensible de inboxes y datos de agentes. Verificar que esto es el acceso deseado para todos los usuarios con `is_superAdmin: true`.

3. **`graphify-out/` en .gitignore pero no eliminado del historial git**: Los 435 ficheros siguen en commits anteriores, incrementando el tamaño de clone (~12.8 MB extra). Si hay información sensible en el caché AST, requiere `git filter-branch` o BFG Repo Cleaner para limpiar el historial.

4. **Archivos IntelliJ (`.idea/`) — confirmar que ya estaban sin credenciales locales**: Si algún archivo de IntelliJ versionado anteriormente contenía rutas absolutas, tokens o configuraciones locales, siguen en el historial.

---

#### Seguimientos vigentes

- **67 clientes invisibles ~26 días — verificar si se crearon duplicados de los 67 clientes en el período 31 Jul – 26 Ago; buscar por CI o teléfono (Ago 26)**.
- **Clientes anulados — confirmar que los selectores de oferta/solicitud/factura excluyen clientes anulados (Ago 26)**.
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

> ⚠️ **Nota de mantenimiento**: Las entradas del **19, 20 y 21 de Junio** y del **23 de Junio** fueron eliminadas al superar los 7 días de antigüedad (política de retención semanal). La entrada del **26 de Junio** fue eliminada el 4 de Julio al superar los 7 días. La entrada del **28 de Junio** fue eliminada el 6 de Julio al superar los 7 días. La entrada del **29 de Junio** fue eliminada el 7 de Julio al superar los 7 días. La entrada del **30 de Junio** fue eliminada el 8 de Julio al superar los 7 días. Las entradas del **1 y 2 de Julio** fueron eliminadas el 10 de Julio al superar los 7 días. La entrada del **3 de Julio** fue eliminada el 11 de Julio al superar los 7 días. Las entradas del **4 y 5 de Julio** fueron eliminadas el 13 de Julio al superar los 7 días. La entrada del **6 de Julio** fue eliminada el 14 de Julio al superar los 7 días. La entrada del **7 de Julio** fue eliminada el 15 de Julio al superar los 7 días. La entrada del **8 de Julio** fue eliminada el 17 de Julio al superar los 7 días. La entrada del **10 de Julio** fue eliminada el 18 de Julio al superar los 7 días. La entrada del **11 de Julio** fue eliminada el 19 de Julio al superar los 7 días. La entrada del **13 de Julio** fue eliminada el 21 de Julio al superar los 7 días. La entrada del **14 de Julio** fue eliminada el 22 de Julio al superar los 7 días. La entrada del **15 de Julio** fue eliminada el 23 de Julio al superar los 7 días. La entrada del **17 de Julio** fue eliminada el 25 de Julio al superar los 7 días. La entrada del **18 de Julio** fue eliminada el 26 de Julio al superar los 7 días. La entrada del **19 de Julio** fue eliminada el 27 de Julio al superar los 7 días. La entrada del **20 de Julio** fue eliminada el 28 de Julio al superar los 7 días. La entrada del **21 de Julio** fue eliminada el 30 de Julio al superar los 7 días. La entrada del **22 de Julio** fue eliminada el 30 de Julio al superar los 7 días. La entrada del **23 de Julio** fue eliminada el 31 de Julio al superar los 7 días. La entrada del **24 de Julio** fue eliminada el 1 de Agosto al superar los 7 días. La entrada del **25 de Julio** fue eliminada el 2 de Agosto al superar los 7 días. La entrada del **26 de Julio** fue eliminada el 3 de Agosto al superar los 7 días. La entrada del **27 de Julio** fue eliminada el 4 de Agosto al superar los 7 días. La entrada del **28 de Julio** fue eliminada el 5 de Agosto al superar los 7 días. La entrada del **30 de Julio** fue eliminada el 7 de Agosto al superar los 7 días. La entrada del **31 de Julio** fue eliminada el 8 de Agosto al superar los 7 días. Las entradas del **1, 2 y 3 de Agosto** fueron eliminadas el 10 de Agosto al superar los 7 días. La entrada del **4 de Agosto** fue eliminada el 12 de Agosto al superar los 7 días. La entrada del **5 de Agosto** fue eliminada el 13 de Agosto al superar los 7 días. La entrada del **6 de Agosto** fue eliminada el 14 de Agosto al superar los 7 días. La entrada del **7 de Agosto** fue eliminada el 15 de Agosto al superar los 7 días. La entrada del **8 de Agosto** fue eliminada el 17 de Agosto al superar los 7 días. La entrada del **10 de Agosto** fue eliminada el 18 de Agosto al superar los 7 días. La entrada del **11 de Agosto** fue eliminada el 19 de Agosto al superar los 7 días. La entrada del **12 de Agosto** fue eliminada el 20 de Agosto al superar los 7 días. La entrada del **13 de Agosto** fue eliminada el 21 de Agosto al superar los 7 días. La entrada del **14 de Agosto** fue eliminada el 22 de Agosto al superar los 7 días. La entrada del **15 de Agosto** fue eliminada el 23 de Agosto al superar los 7 días. La entrada del **17 de Agosto** fue eliminada el 25 de Agosto al superar los 7 días. La entrada del **18 de Agosto** fue eliminada el 26 de Agosto al superar los 7 días. Anteriores eliminadas: 16, 17 y 18 de Junio, 5, 6, 7, 9, 11, 12 y 15 de Junio, y días de Mayo.
