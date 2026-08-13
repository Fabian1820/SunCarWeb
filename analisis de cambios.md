# Registro de Análisis de Cambios — SunCarWeb

---

## 📅 13 de Agosto, 2026

### Resumen de cambios (últimas 24h)

Sin commits nuevos de código. El único commit en las últimas 24h es "Analisis diario Claude" (generado automáticamente). Los cambios del 12 de Agosto (billetes 5000 y 2000 CUP en los 3 diálogos de pagos) ya están cubiertos en la entrada de ayer. No hay cambios en producción.

---

### Puede dar bateo

Sin cambios nuevos — sin riesgos nuevos.

---

## 📅 12 de Agosto, 2026

### Resumen de cambios (últimas 24h)

**2 commits** — ambos de yany1509. Cambio puntual en el módulo de Pagos: se agregan los billetes de 5000 y 2000 CUP al desglose de denominaciones en los tres diálogos de registro/edición de pagos.

---

### Área 1: Pagos — billetes de 5000 y 2000 CUP en Registrar Pago (1 commit — yany1509, 17:45)

- **`feat(pagos): agrega billetes de 5000 y 2000 CUP al desglose en Registrar Pago`** (17:45) — Se añaden las denominaciones de 5000 y 2000 CUP al array de billetes en `components/feats/pagos/registrar-pago-dialog.tsx`. Cambio mínimo: 1 adición, 1 eliminación.

---

### Área 2: Pagos — billetes de 5000 y 2000 CUP en Editar Pago y Registrar Devolución (1 commit — yany1509, 17:52)

- **`feat(pagos): agrega billetes de 5000 y 2000 CUP al desglose en Editar Pago y Registrar Devolucion`** (17:52) — La misma adición de denominaciones aplicada a `components/feats/pagos/editar-pago-dialog.tsx` y `components/feats/pagos/registrar-devolucion-pago-dialog.tsx`. 1 adición y 1 eliminación por archivo.

---

### Puede dar bateo

1. **Denominaciones de billetes CUP hardcodeadas en 3 diálogos separados — posible 4° diálogo sin actualizar**: Los 2 commits en 7 minutos (17:45 y 17:52) cubren Registrar Pago, Editar Pago y Registrar Devolución. Si existe algún otro diálogo o componente de consulta/histórico que también muestre el desglose de billetes, no recibirá las nuevas denominaciones y mostrará una lista inconsistente con los registros guardados.

2. **Lista de denominaciones no centralizada — riesgo de desincronía futura**: El hecho de que se necesitaron 2 commits separados para actualizar 3 archivos indica que el array de denominaciones está duplicado en cada diálogo. Cualquier denominación nueva en el futuro requerirá el mismo proceso manual, con riesgo de omitir algún archivo.

3. **Orden del array no confirmado**: El cambio mínimo (1 add / 1 delete) no aclara si los billetes de 5000 y 2000 se insertaron en la posición correcta (generalmente descendente por valor: 5000, 2000, 1000, 500...). Si el orden es incorrecto, el desglose visual puede resultar confuso para el usuario.

4. **Ventana de ~7 minutos con Railway auto-deploy (17:45-17:52)**: Si Railway hace auto-deploy de cada commit, hubo un intervalo donde Registrar Pago ya mostraba 5000 y 2000 CUP pero Editar Pago y Registrar Devolución aún no. Cualquier operación iniciada en ese intervalo puede haber generado comprobantes con los campos de billetes en estado intermedio.

---

## 📅 11 de Agosto, 2026

### Resumen de cambios (últimas 24h)

**2 commits** — ambos de yany1509. Cambio puntual de dato: actualización de la dirección física de la empresa en todos los servicios de generación de documentos PDF. Se reemplaza la dirección antigua "Calle 24 #109 e/ 1ra y 3ra" por "Calle 2 e/3ra y 5ta, Miramar, Playa, La Habana" en comprobantes de pago, devolución, facturas y obras terminadas.

---

### Área 1: Pagos — Actualización de dirección en comprobantes de pago y devolución (1 commit — yany1509, 15:30)

- **`fix(pagos): actualiza direccion de la empresa en comprobantes de pago/devolucion`** (15:30) — Cambia la dirección impresa en los PDFs de comprobantes de pago y comprobantes de devolución de "Calle 24 #109 e/ 1ra y 3ra" a "Calle 2 e/3ra y 5ta, Miramar, Playa, La Habana".

---

### Área 2: Exportación — Actualización de dirección en facturas y comprobantes generales (1 commit — yany1509, 15:41)

- **`fix(exportacion): actualiza direccion de la empresa en el resto de facturas/comprobantes`** (15:41) — Misma corrección de dirección aplicada a 4 servicios de exportación: `facturas/export-factura-service.ts`, `facturas/export-factura-contabilidad-service.ts`, `obras-terminadas/export-factura-cliente-service.ts`, `pagos-clientes-ventas/export-factura-venta-consolidada-service.ts`.

---

### Puede dar bateo

1. **Dirección hardcodeada en múltiples archivos — posibles ocurrencias no actualizadas**: La dirección estaba duplicada en al menos 6 archivos distintos. Si existen otros servicios de exportación (informes, vales de salida, RRHH, reportes de dirección, documentos DOCX) que no fueron incluidos en estos dos commits, seguirán imprimiendo la dirección antigua sin error visible ni advertencia al usuario.

2. **Dos commits separados para el mismo fix — posible build intermedio en Railway**: Si Railway tiene auto-deploy activo, hubo una ventana de ~11 minutos (15:30-15:41) donde los comprobantes de pago/devolución mostraban la dirección nueva pero las facturas y obras terminadas aún mostraban la dirección vieja. Documentos generados en ese intervalo son inconsistentes.

3. **Sin cobertura de tests sobre contenido de PDFs**: Los cambios de texto en documentos generados no pueden ser verificados por TypeScript ni ESLint. Solo una revisión visual de cada documento (comprobante de pago, devolución, factura de contabilidad, factura de cliente, factura venta consolidada) puede confirmar que la dirección es correcta en todos los flujos y que no hay otros archivos afectados.

---

## 📅 10 de Agosto, 2026

### Resumen de cambios (últimas 24h)

**9 commits** — todos de yany1509 (varios co-autorados con Claude Opus 5). Día muy activo: refactor completo del catálogo de fuentes en Leads con FuenteSelector y GestionarFuentesDialog, display de referencia en dos líneas para fuentes con persona, prioridad Urgente/Ninguna, rediseño de UI de tabla y modales, tres fixes encadenados de estados inválidos (Nuevo, Pendiente de pago, Sin respuesta, Pendiente de instalación), anular/activar clientes con FuenteSelector y diálogo de estado múltiple de instalación, filtro multi-select "Quien cobro" en pagos respaldado por nuevo endpoint, y diálogos de confirmación antes de guardar en los 4 flujos de pagos.

---

### Área 1: Leads — Catálogo cerrado de fuentes, prioridad Urgente y rediseño UI (4 commits — yany1509, 12:41-13:37)

- **`feat(leads): catalogo cerrado de fuentes, prioridad Urgente y rediseño de la UI`** (12:41) — FuenteSelector: fuente elegida desde lista servida por `/api/fuentes`; cuando la fuente lo requiere aparece sub-selector de sucursal/trabajador/cliente que llena `fuente_referencia`. GestionarFuentesDialog para administrar el catálogo con desactivación segura (avisa cuántos leads/clientes usan la fuente y permite reasignar). Archivos nuevos: `fuente-selector`, `gestionar-fuentes-dialog`, `lib/constants/fuentes.ts`. Prioridad Urgente y Ninguna: `priority-badge`, `priority-dot` y `priority-select` con colores nuevos (morado/gris). UI: columnas Fecha de contacto y Fuente, filtro "Sin confirmadas", popover compacto en vez de bloque amarillo de "equipo propio", 3 checks antes de convertir, estado real de la oferta en Ver Lead, comercial como select, errores dentro del diálogo de convertir, permiso `leads/anular` cableado. Verificado: tsc con 241 errores preexistentes y cero nuevos.
- **`fix(leads): quita los estados "Nuevo" y "Pendiente de pago" de los selectores`** (12:47) — Se habían colado del commit anterior desde archivos de dev. Los 3 selectores (crear, editar, filtro) vuelven a los 9 estados de siempre. 0 leads usaban esos estados.
- **`fix(leads): quita "Sin respuesta" de todos los selectores, badges y mapas`** (12:57) — Eliminado de 11 sitios: selectores de crear/editar lead, filtro, centro de control, mapas de color de badge (leads y clientes), normalizadores de etiqueta en pagos-clientes, obras-terminadas y todos-pagos. Los 149 leads migrados a "No interesado". Verificado: 0 referencias a "sin respuesta" en todo el proyecto, tsc 241 errores (cero nuevos).
- **`fix(leads): quita "Pendiente de instalación" de crear/editar, deja el filtro igual`** (13:37) — Los 21 leads con ese estado se mantienen en BD intactos; si se abre Editar sobre uno de ellos el selector aparecerá vacío hasta que se elija otro estado. El filtro del listado mantiene el estado para poder encontrarlos y reclasificarlos.

---

### Área 2: Leads/Clientes — Display de fuente con referencia en dos líneas (2 commits — yany1509, 13:03-13:22)

- **`feat(leads,clientes): muestra la referencia junto a fuente Trabajador/Sucursal/Otro cliente`** (13:03) — Nuevo helper compartido `lib/utils/fuente-display.ts`. La columna de fuente en ambas tablas y el detalle de Ver Lead muestran "Trabajador: Fernando Ferrera Dabo", "Sucursal: Suncar Santa Clara", etc. Para el resto de fuentes sin referencia se muestra igual que antes. Agrega `fuente_referencia` al tipo `Cliente` (el backend ya lo devuelve). Verificado: tsc 241 errores (cero nuevos).
- **`feat(leads,clientes): fuente Trabajador/Sucursal/Otro cliente en dos líneas`** (13:22) — "Trabajador" arriba y "Fernando Ferrera Dabo" debajo en gris para columnas angostas. Tooltip (hover) sigue mostrando el texto completo. Nuevo `esFuenteConReferencia()` en el helper compartido. Sin cambios para fuentes sin referencia. Verificado: tsc 241 errores (cero nuevos).

---

### Área 3: Clientes — anular/activar, FuenteSelector y EstadoInstalacionMultiple (1 commit — yany1509, 15:11)

- **`feat(clientes): anular/activar, FuenteSelector, filtro equipo comercial y estado instalacion multiple`** (15:11) — Botón anular/activar cliente (ícono Ban/RotateCcw) + badge "Anulado" + checkbox "Ver anulados" (`ClienteService.updateClienteStatus`). Swap del selector de fuente libre por FuenteSelector en create/edit client dialog; `fuente_referencia` agregado a `ClienteCreateData`. Nuevo `EstadoInstalacionMultipleDialog` + botón "Fijar estados" en columna Ofertas para clientes con 2+ ofertas confirmadas. `useOfertasConfeccion`: nuevo método `actualizarEstadoInstalacion`. Filtro por equipo comercial se deja intacto.

---

### Área 4: Clientes/Pagos — Estilo tabla y filtro multi-select "Quien cobro" (1 commit — yany1509, 17:22)

- **`feat(clientes,pagos): estilo de tabla de dev + filtro multi-select "quien cobro"`** (17:22) — Clientes: badges de estado solo con color (sin relleno), acotado a 6 estados reales de Cliente (se quitan 4 de Leads); tabla con borde redondeado, padding px-4, tipografía text-sm. Pagos: nuevo filtro multi-select "Quien cobro" (Popover + Checkbox, mismo patrón que Estado/Provincia en Clientes), respaldado por `GET /pagos/cobradores` y el parámetro `recibido_por` en cobros-paginado.

---

### Área 5: Pagos — Confirmación explícita antes de guardar en los 4 diálogos (1 commit — yany1509, 17:36)

- **`feat(pagos): confirmacion antes de guardar en crear/editar/cancelar/devolver pago`** (17:36) — Los 4 diálogos de Pagos Clientes piden confirmación explícita antes de ejecutar la acción: primero corren las validaciones, y si pasan, abren un diálogo "¿Está seguro?" con el monto en cuestión. Si el usuario cancela la confirmación, vuelve al formulario con los datos intactos (el diálogo original nunca se cierra). ConfirmEditDialog para registrar/editar/devolver; ConfirmDeleteDialog para cancelar. Enter o clic en botón principal ya no dispara el guardado directo.

---

### Puede dar bateo

1. **FuenteSelector cierra el catálogo — leads con fuentes libres antiguas no cubiertas por la migración quedarán con campo vacío**: Las 83 fuentes libres se migran a 12 canónicas. Si algún lead/cliente tenía una fuente no incluida en la migración, el selector mostrará vacío al abrirlo. Además, `fuente_referencia` debe ser aceptado y persistido por el backend en `POST/PATCH` de leads y clientes; si no, el sub-campo se pierde silenciosamente.

2. **GestionarFuentesDialog reasignación — fallo parcial deja leads con fuente desactivada**: Si la reasignación masiva falla a mitad (timeout, error de red), algunos leads quedan con una fuente desactivada que ya no aparece en el catálogo, rompiendo el selector al intentar editarlos.

3. **"Nuevo" y "Pendiente de pago" — ventana de ~6 minutos antes del fix (12:41-12:47)**: Si Railway auto-deploy está activo, hubo ~6 minutos donde esos estados eran seleccionables en producción. Leads creados o editados en ese intervalo pueden tener estados no válidos persistidos en BD que el frontend ya no mostrará correctamente.

4. **"Pendiente de instalación" — 21 leads con ese estado, modal de edición muestra campo vacío sin aviso**: Al abrir Editar sobre uno de esos leads, el selector aparecerá vacío. Si la validación del formulario no exige estado o el usuario guarda sin cambiar, puede persistirse un estado vacío/null que el backend puede aceptar silenciosamente.

5. **"Sin respuesta" eliminado de 11 sitios — confirmar migración al 100% en BD**: Si alguno de los 149 leads no fue migrado (fallo parcial), su estado aparecerá como texto crudo o badge vacío en las vistas de leads, pagos-clientes, obras-terminadas y todos-pagos — sin error visible.

6. **4 commits encadenados en 56 minutos (12:41-13:37) — posibles builds intermedios con estado inconsistente**: Si Railway hace auto-deploy de cada commit, pueden haber existido combinaciones intermedias donde el catálogo de fuentes ya estaba cerrado pero "Sin respuesta" aún aparecía, o vice-versa. Cada build intermedio podría haber dejado datos inconsistentes.

7. **Clientes anular/activar — confirmar endpoint `updateClienteStatus` en backend de producción**: A diferencia de leads (donde ya existía anular), clientes puede ser un endpoint nuevo. Si `PATCH /clientes/{id}/status` (o similar) no existe, el botón fallará silenciosamente.

8. **EstadoInstalacionMultipleDialog — confirmar endpoint de actualización masiva de estado instalación**: El nuevo método `actualizarEstadoInstalacion` en `useOfertasConfeccion` asume un endpoint de backend. Sin confirmarlo, el diálogo "Fijar estados" fallará para todos los clientes con 2+ ofertas confirmadas.

9. **GET /pagos/cobradores + parámetro `recibido_por` — confirmar ambos en backend de producción**: Si el endpoint de cobradores no existe, el dropdown queda vacío. Si `recibido_por` no está soportado en cobros-paginado, el filtro no tiene efecto real (devuelve todos los registros sin filtrar).

10. **Confirmación en 4 diálogos de pagos — Enter ya no guarda directamente**: Cambio de UX que puede sorprender a usuarios habituados. Más crítico: si el monto a mostrar en el diálogo de confirmación es null/undefined (por un error de datos o campo faltante), el render puede fallar y bloquear la acción sin mensaje útil al usuario.

11. **TSC — commits de Clientes (15:11) y Pagos (17:22, 17:36) no documentan verificación de errores TypeScript**: Los commits de fuentes/referencias confirman explícitamente 241 errores y cero nuevos. Los tres commits posteriores no mencionan conteo TSC. Pueden haber introducido errores silenciosos que se manifiesten en runtime.

12. **Volumen de 9 commits en ~5 horas — riesgo de integración cross-módulo**: Los estados eliminados (Sin respuesta, Nuevo, Pendiente de instalación, Pendiente de pago) pueden seguir presentes en partes del código no cubiertas por los 11 sitios del fix. Confirmar con grep exhaustivo antes del próximo ciclo de commits.

---

## 📅 8 de Agosto, 2026

### Resumen de cambios (últimas 24h)

Sin commits nuevos de código. El único commit en las últimas 24h es "Analisis diario Claude" (generado automáticamente). El commit de Leads (anular/activar, filtros al backend, paginación paralela) del 7 de Agosto a las 17:47 ya fue cubierto en la entrada anterior. No hay cambios en producción.

---

### Puede dar bateo

Sin cambios nuevos — sin riesgos nuevos.

---

## 📅 7 de Agosto, 2026

### Resumen de cambios (últimas 24h)

**1 commit real** — yany1509 (co-autorado con Claude Opus 5). Día activo en el módulo de **Leads**: sistema de anular/reactivar leads (reemplaza el anterior hard-delete), migración de todos los filtros del cliente al backend, y paginación paralela en la exportación.

---

### Área 1: Leads — anular/reactivar, filtros al backend y paginación paralela (1 commit — yany1509, 17:47)

- **`feat(leads): anular/activar, filtros al backend y paginacion paralela (bloques A/B/C)`** — Bloque A: el botón de eliminar se convierte en anular (ícono Ban) / reactivar (ícono RotateCcw) con un diálogo que explica que el lead pasa a "No interesado" y que sus ofertas de confección se cancelan. Si el backend responde `LEAD_DUPLICADO_TELEFONO` al reactivar, se muestra el mensaje real del backend en vez de un error genérico. Badge "Anulado" y fila atenuada para leads anulados; checkbox "Mostrar anulados" en filtros (por defecto solo se ven activos). Bloque B: `LeadService.getLeads` acepta ahora `estado` múltiple, `provincia`, `municipio`, `prioridad`, `ofertas_filtro` y `activo`; `use-leads` deja de traerse todos los leads para filtrar en JS y manda todos los filtros al backend en una sola consulta paginada. Bloque C: `fetchAllLeadsByBaseFilters` (que alimenta la exportación) pagina en paralelo de a 5 en vez de en serie. Los bloques D-I (fuentes, estados nuevos, convertir, permisos, rediseño de modales) permanecen en dev y no se incluyen. Verificado: tsc con 249 errores antes y después, cero nuevos; next build compila `/leads` sin errores.

---

### Puede dar bateo

1. **Anular lead cancela ofertas de confección en cascada — sin flujo de reversa confirmado**: El diálogo advierte al usuario, pero si anula por error, no hay acción documentada para restaurar las ofertas canceladas. Reactivar el lead no revierte las cancelaciones de ofertas.

2. **Reactivar con `LEAD_DUPLICADO_TELEFONO` — usuario bloqueado sin resolución guiada**: El sistema muestra el mensaje real del backend, pero no ofrece navegación al lead duplicado ni opción de fusión. El usuario queda sin acción clara para desbloquear la reactivación.

3. **Checkbox "Mostrar anulados" desactivado por defecto — leads anulados invisibles, riesgo de recreaón**: Usuarios que busquen leads que recuerdan y no los encuentran pueden asumir que fueron borrados y crearlos de nuevo, generando duplicados con el mismo teléfono (que el backend puede rechazar con `LEAD_DUPLICADO_TELEFONO`).

4. **Migración de filtrado JS → backend — confirmar que todos los parámetros son soportados en producción**: `estado` múltiple, `provincia`, `municipio`, `prioridad` y `ofertas_filtro` se envían ahora al backend. Si el backend en producción no acepta o ignora alguno, ese filtro deja de funcionar silenciosamente retornando más resultados de los esperados.

5. **Paginación paralela de a 5 en exportación — puede saturar el backend en listas grandes**: Sin cota máxima de requests simultáneas, una exportación con 50+ páginas dispara ráfagas de 5 requests. Si el backend o la BD tienen rate limiting, las exportaciones grandes pueden fallar parcialmente devolviendo datos incompletos sin error al usuario.

6. **Endpoint de anular lead — confirmar existencia y que cancela ofertas en backend de producción**: El commit asume el endpoint disponible. Si `PATCH /leads/{id}/anular` (o similar) no está deployado, el botón fallará al hacer clic sin advertencia previa al usuario.

7. **Badge "Anulado" / estado "No interesado" — confirmar que está mapeado en `ESTADO_CONFIG`**: Si el estado devuelto por el backend para leads anulados no está en el mapa de estados del frontend, el badge mostrará texto crudo o `undefined`.

8. **Parámetro `activo` en `getLeads` — confirmar soporte en backend**: El checkbox "Mostrar anulados" controla este parámetro. Si el backend no lo implementa, todos los leads (activos y anulados) siempre se mostrarán, haciendo el checkbox visualmente funcional pero sin efecto real.

9. **Bloques D-I ausentes en main — UI de Leads en estado intermedio**: Fuentes, estados nuevos, convertir, permisos y rediseño de modales permanecen en dev. Si el backend ya soporta esas capacidades en producción, los usuarios no podrán acceder a ellas desde la UI actual de main, generando inconsistencia entre lo que el backend expone y lo que la UI permite.

---

## 📅 6 de Agosto, 2026

### Resumen de cambios (últimas 24h)

**1 commit real** — yany1509. Cherry-pick desde dev del nuevo informe **"Cobros pendientes de obras terminadas"** integrado al hub de `informe-direccion`, con fix de layout incluido y nuevo sub-permiso.

---

### Área 1: Informe dirección — informe de cobros pendientes de obras terminadas (1 commit — yany1509, 17:13)

- **`feat(informe-direccion): informe de cobros pendientes de obras terminadas`** — La página `informe-direccion` pasa a ser un hub de tarjetas con nombre propio para cada informe: "Comparativo de desempeño" (ya existía; su título era la instrucción "Elegir los dos periodos a comparar" y ahora es el nombre del informe, con la instrucción en la descripción) y "Cobros pendientes" (nuevo): clientes con instalación ya terminada que aún tienen saldo por cobrar. Sin cambios de backend: reutiliza `GET /obras-terminadas/datos` con `requiere_instalado=true` + `estado_pago=pendiente`, paginando de 500 en 500. PDF A4 apaisado con resumen y detalle por obra, 10 columnas: #, Cliente, Cod. cliente, Oferta (nombre largo), Cod. oferta, Instalado el, Comercial, Precio final, Pagado, Pendiente — anchos fijos sumando los 269mm útiles. Incluye fix de layout `content-with-fixed-header` para que el contenido no quede tapado por el header fijo. Nuevo sub-permiso `informe-direccion/cobros-pendientes` ya creado en colección módulos de dev y producción; al no ser aditivo, quien ya tiene `informe-direccion` lo ve automáticamente. TSC: 392 errores verificados (mismo conteo antes y después del cambio, 10 más que en commits previos de Ago 5 que tenían 382).

---

### Puede dar bateo

1. **Sub-permiso `informe-direccion/cobros-pendientes` no aditivo — datos financieros (precio final, pendiente) visibles a todos los usuarios con `informe-direccion` sin asignación explícita**: Al declararse como "no aditivo", cualquier trabajador con acceso al módulo verá el informe de cobros pendientes automáticamente. Esto puede exponer información financiera sensible a usuarios que solo deberían tener acceso al comparativo de desempeño.

2. **Paginación sin cota máxima total — 500 en 500 puede disparar múltiples requests en listas grandes**: Si hay cientos o miles de obras terminadas con cobro pendiente, el cliente hace múltiples fetches de 500 registros antes de tener los datos completos. Sin una cota máxima total, el tiempo de carga del PDF puede ser muy alto o causar timeout del navegador.

3. **TSC incrementó de 382 a 392 — 10 nuevos errores TypeScript con este cherry-pick**: Aunque el commit confirma que el conteo es el mismo antes y después en esta rama, el número subió 10 respecto a los commits del día anterior. Puede indicar que el cherry-pick arrastre código con tipos no declarados que en runtime fallen silenciosamente.

4. **Anchos fijos de columnas en PDF (269mm) — nombre largo de oferta puede desbordar o truncarse**: El campo "Oferta (nombre largo)" (`nombre_completo`) puede ser muy extenso. Con ancho fijo, el texto puede truncarse sin indicación visual o romper el layout de la fila en el PDF generado.

5. **Hub de tarjetas — navegación directa a secciones existentes puede romperse**: La página `informe-direccion` cambió de estructura (de carga directa a hub de tarjetas). Cualquier bookmark, enlace profundo o script que apuntara directamente al contenido interno puede dejar de funcionar o mostrar una experiencia incorrecta.

6. **Filtros `requiere_instalado=true + estado_pago=pendiente` — confirmar nombres exactos en backend de producción**: El commit dice "verificado contra la API de producción en vivo". Pero si el backend actualiza los nombres de parámetros, el informe retornará silenciosamente todos los registros (sin filtrar) o vacío, sin error explícito al usuario.

---

#### Seguimientos vigentes

- **Denominaciones 5000 y 2000 CUP hardcodeadas en 3 diálogos — confirmar que no existe un 4° diálogo de pagos que muestre el desglose sin actualizar (Ago 12)**.
- **Billetes 5000/2000 CUP en 2 commits separados en 7 min — confirmar orden descendente del array y cálculo de total correcto en los 3 diálogos (Ago 12)**.
- **Railway auto-deploy: ventana de ~7 min (17:45-17:52) donde solo Registrar Pago tenía las nuevas denominaciones; confirmar que no quedaron registros de pago con desglose incompleto (Ago 12)**.
- **Dirección de empresa hardcodeada en múltiples archivos — confirmar que NO quedan referencias a "Calle 24 #109 e/ 1ra y 3ra" en vales, reportes, informes u otros PDFs generados más allá de los 6 archivos ya corregidos (Ago 11)**.
- **FuenteSelector — confirmar persistencia de `fuente_referencia` en POST/PATCH leads y clientes en backend de producción (Ago 10)**.
- **GestionarFuentesDialog — confirmar que reasignación de fuentes es atómica en backend; fallo parcial deja leads con fuente desactivada (Ago 10)**.
- **Leads "Nuevo"/"Pendiente de pago" — revisar BD por leads persistidos con esos estados en ventana de ~6 min antes del fix (12:41-12:47) (Ago 10)**.
- **"Pendiente de instalación" en 21 leads — modal de edición muestra campo vacío sin aviso; confirmar validación de estado obligatorio en formulario (Ago 10)**.
- **"Sin respuesta" eliminado de 11 sitios — confirmar migración 100% en BD; leads sin migrar mostrarán badge vacío en todas las vistas (Ago 10)**.
- **4 commits en 56 min (leads 12:41-13:37) — confirmar que builds intermedios en producción no dejaron datos inconsistentes (Ago 10)**.
- **Clientes anular/activar — confirmar endpoint `updateClienteStatus` en backend de producción (Ago 10)**.
- **EstadoInstalacionMultipleDialog — confirmar endpoint de actualización masiva de estado instalación en backend (Ago 10)**.
- **GET /pagos/cobradores + parámetro `recibido_por` en cobros-paginado — confirmar ambos en backend de producción (Ago 10)**.
- **Confirmación en 4 diálogos de pagos — confirmar que el monto nunca es null/undefined; nuevo flujo puede bloquear si falla el render (Ago 10)**.
- **TSC — commits de Clientes y Pagos del 10 de Agosto no documentan verificación de errores TypeScript (Ago 10)**.
- **Anular lead cancela ofertas de confección en cascada — sin flujo de reversa confirmado (Ago 7)**.
- **Reactivar con `LEAD_DUPLICADO_TELEFONO` — usuario bloqueado sin navegación al duplicado ni opción de fusión (Ago 7)**.
- **Filtros leads migrados a backend — confirmar soporte de `estado` múltiple, `provincia`, `municipio`, `prioridad` y `ofertas_filtro` en endpoint de producción (Ago 7)**.
- **Paginación paralela de a 5 en exportación — puede saturar backend en listas con 50+ páginas (Ago 7)**.
- **Endpoint de anular lead — confirmar existencia y cancelación de ofertas en backend (Ago 7)**.
- **Badge "Anulado" — confirmar que el estado "No interesado" está mapeado en `ESTADO_CONFIG` (Ago 7)**.
- **Parámetro `activo` en `getLeads` — confirmar soporte en backend, sin él el checkbox no tiene efecto real (Ago 7)**.
- **Bloques D-I de leads ausentes en main — UI en estado intermedio respecto a capacidades del backend (Ago 7)**.
- **Sub-permiso `informe-direccion/cobros-pendientes` no aditivo — datos financieros (precio final, pendiente) visibles a todos los usuarios con `informe-direccion` sin asignación explícita (Ago 6)**.
- **Paginación 500 en 500 en cobros-pendientes sin cota total — puede causar timeout en listas largas (Ago 6)**.
- **TSC incrementó 10 errores con cherry-pick informe-direccion cobros-pendientes — confirmar que no son regresiones de tipo silenciosas (Ago 6)**.
- **PDF cobros-pendientes columna "Oferta (nombre largo)" con ancho fijo — puede truncarse en facturas con ofertas complejas (Ago 6)**.
- **`sanitizarTelefono()` modifica el input silenciosamente — puede confundir usuarios que pegan números con espacios/guiones sin aviso visual (Ago 5)**.
- **Botón "Eliminar" leads (hard delete) sin gatear con permisos — visible para todos los usuarios con acceso a leads (Ago 5)**.
- **Backfill de sub-permisos leads — confirmar ejecución exitosa para los 26 trabajadores en producción (Ago 5)**.
- **Filtros de fecha por preset calculados en cliente — desfase timezone con backend puede afectar filtros de día borde (Ago 5)**.
- **`telefono_adicional_nombre` — confirmar soporte en endpoints `POST/PATCH /leads/{id}` del backend (Ago 5)**.
- **`telefono_adicional_nombre` al limpiar `telefono_adicional` — confirmar si backend trata ausencia como "no cambiar" o "borrar" (Ago 5)**.
- **Validación de teléfono `^\+?\d{6,15}$` — confirmar paridad exacta con el patrón del backend (Ago 5)**.
- **Módulo distribucion-comerciales sin permisos asignados — invisible para todos hasta configuración en panel (Ago 4)**.
- **Cherry-pick distribucion-comerciales desde dev — posible arrastre de dependencias que rompen en runtime (Ago 4)**.
- **Filtro equipo_comercial en Leads/Clientes — confirmar que el campo llega desde el backend en ambas listas (Ago 4)**.
- **Diálogo de asignación distribucion-comerciales — endpoint PATCH sin confirmar en backend (Ago 4)**.
- **Endpoint de KPIs comparativos sin confirmar en backend de producción — informe-direccion fallará en runtime si no está deployado (Ago 3)**.
- **Sub-permisos informe-direccion — usuarios con permiso padre necesitan sub-permisos asignados o quedarán sin acceso a secciones (Ago 3)**.
- **Cherry-pick informe-direccion desde dev — posible arrastre de dependencias que rompen en runtime aunque no en build (Ago 3)**.
- **Excel facturas-emitidas — nueva columna "Código" rompe importaciones que leen por posición de columna (Ago 3)**.
- **330/609 materiales con costo 0 — costeos y facturas en otros módulos pueden ser incorrectos (Ago 3)**.
- **`renderFactura` con `incluirMateriales: false` — edge cases sin cobertura, totales en PDF pueden ser incorrectos (Jul 24)**.
- **PDF masivo obras-terminadas sin cota máxima — puede bloquear navegador en listas largas (Jul 24)**.
- **Dos commits obras-terminadas en 34 min — build intermedio posible en prod con botón masivo ausente (Jul 24)**.
- **`incluirComercial: false` — fila omitida puede desplazar layout del PDF (Jul 24)**.
- **Sin tests de regresión sobre flujo PDF original "Exportar PDF" tras refactor de `renderFactura` (Jul 24)**.
- **Cálculo "pendiente" en Detalle de Cobros solo en frontend — desincronía con totales del backend si devuelve saldo_pendiente calculado (Jul 23)**.
- **`cancelado` falsy/undefined en pagos históricos — filtro !p.cancelado no los excluye del cálculo (Jul 23)**.
- **Contador de encabezado ahora incluye cancelados — usuarios esperando "pagos válidos" verán número inflado (Jul 23)**.
- **Par de fixes de pagos en < 35 min — posible build intermedio con totales corregidos pero sin badge visual (Jul 23)**.
- **`PATCH /pagos/{id}/cancelar` — endpoint nuevo sin confirmar, cancelaciones fallarán con 404 (Jul 17)**.
- **Cancelar pago — estado solo visual si backend no valida; datos financieros inconsistentes (Jul 17)**.
- **Devolución de pagos de venta — nuevo endpoint sin confirmar en backend (Jul 17)**.
- **Badge "Anulada" en facturas — desincronía si backend no actualiza estado en tiempo real (Jul 17)**.
- **`estado_factura_detalle` campo nuevo — badge "Pendiente de selección" ausente en respuestas históricas (Jul 17)**.
- **Filtro "Pendiente de selección" — posible filtrado solo en cliente sin soporte en backend (Jul 17)**.
- **Fix motivo obligatorio en vales — devoluciones en vuelo antes del deploy pueden fallar (Jul 17)**.
- **`/ajustar-saldo` endpoint sin confirmar en backend — botón fallará si no está implementado (Jul 15)**.
- **Validación de monto solo en cliente — race condition de sobrepago en ajuste de saldo (Jul 15)**.
- **Monto libre en ajuste de saldo sin aprobación secundaria — riesgo de cancelar deuda grande por error (Jul 15)**.
- **Badge "Ajuste de contabilidad" — pantalla sin mapeo del caso 'ajuste' mostrará texto crudo (Jul 15)**.
- **Sin mecanismo de reversa en UI para ajuste de saldo aplicado por error (Jul 15)**.
- **Fichas de Costo — "Ajuste general" irreversible destruye diferencias por almacén sin confirmación robusta (Jul 13)**.
- **Fichas de Costo — endpoint de ajuste por almacén específico (✎) sin confirmar en backend (Jul 13)**.
- **Fichas de Costo — desglose por almacén stale al abrir el diálogo con movimientos concurrentes (Jul 13)**.
- **`es_trabajador_suncar` — clientes históricos sin el campo, datos incompletos en filtros y conteos (Jul 13)**.
- **Pestañas Facturas clientes/trabajadores — filtro `es_trabajador_suncar` en backend sin confirmar (Jul 13)**.
- **Cache de pestañas Facturas — facturas nuevas no visibles sin recarga manual (Jul 13)**.
- **`es_trabajador_suncar` en edición — confirmar persistencia en `PUT /clientes/{id}` (Jul 13)**.
- **Facturas Solar Carros — precio escalado nulo si algún material tiene precio nulo en catálogo de contabilidad (Jul 10)**.
- **Facturas Solar Carros — bloqueo stock al abrir el diálogo, no tiempo real; riesgo de sobreventa en alta concurrencia (Jul 10)**.
- **Vista "Facturas" en Obras Terminadas — endpoint de backend sin confirmar (Jul 10)**.
- **Fix paginación stock — snapshot inconsistente entre página 1 y 2 por concurrencia (Jul 10)**.
- **Clave interna `kardex-costo` sin renombrar — no encontrable como "historial de costos" en panel de permisos (Jul 10)**.
- **Columna "Origen del movimiento" — campos ausentes en movimientos históricos, datos incompletos silenciosos (Jul 10)**.
- **`costos-materiales-cliente` en instalaciones — ningún usuario lo tiene hasta asignación manual de SuperAdmin (Jul 10)**.
- **`creado_por` → `creado_por_ci` — reservas históricas con campo incorrecto muestran creador vacío (Jul 10)**.
- **Herencia `instalaciones` → 7 sub-permisos solo en runtime, no persistida en BD — migración necesaria si la lógica de prefijo cambia (Jul 5)**.
- **Dos separadores de sub-permiso (`/` e `:`) — inconsistencia en el catálogo de permisos (Jul 5)**.
- **`RouteGuard` con `string[]` — confirmar semántica OR vs AND en cada ruta (Jul 5)**.
- **Landing `/instalaciones` vacía sin mensaje para usuario sin sub-permisos asignados (Jul 5)**.
- **Export Instalaciones en Proceso — `getAllMaterials()` sin caché en lookup de nombre de material (Jul 5)**.
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
- **Lista blanca de CIs de pagos hardcodeada en frontend — superAdmins ahora incluidos, pero 2 CIs específicos aún hardcodeados (Jun 23)**.
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

> ⚠️ **Nota de mantenimiento**: Las entradas del **19, 20 y 21 de Junio** y del **23 de Junio** fueron eliminadas al superar los 7 días de antigüedad (política de retención semanal). La entrada del **26 de Junio** fue eliminada el 4 de Julio al superar los 7 días. La entrada del **28 de Junio** fue eliminada el 6 de Julio al superar los 7 días. La entrada del **29 de Junio** fue eliminada el 7 de Julio al superar los 7 días. La entrada del **30 de Junio** fue eliminada el 8 de Julio al superar los 7 días. Las entradas del **1 y 2 de Julio** fueron eliminadas el 10 de Julio al superar los 7 días. La entrada del **3 de Julio** fue eliminada el 11 de Julio al superar los 7 días. Las entradas del **4 y 5 de Julio** fueron eliminadas el 13 de Julio al superar los 7 días. La entrada del **6 de Julio** fue eliminada el 14 de Julio al superar los 7 días. La entrada del **7 de Julio** fue eliminada el 15 de Julio al superar los 7 días. La entrada del **8 de Julio** fue eliminada el 17 de Julio al superar los 7 días. La entrada del **10 de Julio** fue eliminada el 18 de Julio al superar los 7 días. La entrada del **11 de Julio** fue eliminada el 19 de Julio al superar los 7 días. La entrada del **13 de Julio** fue eliminada el 21 de Julio al superar los 7 días. La entrada del **14 de Julio** fue eliminada el 22 de Julio al superar los 7 días. La entrada del **15 de Julio** fue eliminada el 23 de Julio al superar los 7 días. La entrada del **17 de Julio** fue eliminada el 25 de Julio al superar los 7 días. La entrada del **18 de Julio** fue eliminada el 26 de Julio al superar los 7 días. La entrada del **19 de Julio** fue eliminada el 27 de Julio al superar los 7 días. La entrada del **20 de Julio** fue eliminada el 28 de Julio al superar los 7 días. La entrada del **21 de Julio** fue eliminada el 30 de Julio al superar los 7 días. La entrada del **22 de Julio** fue eliminada el 30 de Julio al superar los 7 días. La entrada del **23 de Julio** fue eliminada el 31 de Julio al superar los 7 días. La entrada del **24 de Julio** fue eliminada el 1 de Agosto al superar los 7 días. La entrada del **25 de Julio** fue eliminada el 2 de Agosto al superar los 7 días. La entrada del **26 de Julio** fue eliminada el 3 de Agosto al superar los 7 días. La entrada del **27 de Julio** fue eliminada el 4 de Agosto al superar los 7 días. La entrada del **28 de Julio** fue eliminada el 5 de Agosto al superar los 7 días. La entrada del **30 de Julio** fue eliminada el 7 de Agosto al superar los 7 días. La entrada del **31 de Julio** fue eliminada el 8 de Agosto al superar los 7 días. Las entradas del **1, 2 y 3 de Agosto** fueron eliminadas el 10 de Agosto al superar los 7 días. La entrada del **4 de Agosto** fue eliminada el 12 de Agosto al superar los 7 días. La entrada del **5 de Agosto** fue eliminada el 13 de Agosto al superar los 7 días. Anteriores eliminadas: 16, 17 y 18 de Junio, 5, 6, 7, 9, 11, 12 y 15 de Junio, y días de Mayo.
