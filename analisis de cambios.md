# Registro de Análisis de Cambios — SunCarWeb

---

## 📅 24 de Septiembre, 2026

### Resumen de cambios (últimas 24h)

**~20 commits reales** — Fabian1820 (9), yany1509 (8), Ruben0304 (3). Día extremadamente activo. Trece áreas: **cierre total del sistema de permisos** (mayor commit del sprint), **dos fixes de seguridad críticos** (Stripe sin sesión + contraseña en localStorage), **nuevo módulo Almacén de Reservas y Averías**, **trazabilidad de fichas** en 19 pantallas, **leads no convertidos** con botón de acción, y otros seis fixes/features menores.

---

### Área 1: Permisos — Cierre completo del sistema de acceso (4 commits, 19:53–21:35)

- **`feat(permisos): dar y quitar superAdmin, y permiso "Gestión de Permisos"`** (19:53, Ruben0304) — Botón para conceder o revocar superAdmin por trabajador (solo superAdmin). Nuevo módulo `gestion-permisos`: quien lo tiene entra a /permisos y reparte módulos, pero no se edita a sí mismo ni a un superAdmin. La fila del trabajador muestra la etiqueta SuperAdmin. Backend hace cumplir las mismas reglas.

- **`feat(permisos): cerrar el sistema — todo acceso por permiso asignable`** (21:00, Fabian1820) — Commit de cierre masivo del sistema de acceso:
  - **Billetera** deja de ser visible para todos: permiso `wallet` con sub-permisos (solo ingresos, solo gastos, solo transferencias, ver todas, administrar, alertas, ver total). "Ver oferta del cliente" abre en solo lectura desde Billetera.
  - Lo que era solo superAdmin ahora es asignable: auditoría, nómina, publicar y notificar actualizaciones, responder peticiones, editar solicitudes ajenas.
  - Lo que iba por CI/nombre/cargo pasa a permisos: reducir reservas, descuento libre, solo pagos clientes, montos en reportes, aviso de saldo.
  - ~45 páginas que se abrían por URL sin permiso llevan `RouteGuard`.
  - Comentados temporalmente: Suncar WhatsApp, Preguntas Frecuentes, Datos a Averiguar, Números de Prueba, Tiendas, Equipos Felicity y Control de Asistencia.
  - Barra de Inicio: tasa del día e información de contacto como permisos; editar contacto de la web, aditivo.
  - Permisos: nuevo botón **Mover** (añade lo que el otro tiene sin quitar nada).
  - Centro de Control: atajos a Brigadas y Clientes solo con esos módulos.

- **`feat(permisos): permisos nuevos de la app de instaladores`** (21:26, yany1509) — Sub-permisos aditivos nuevos: `app/almacen-reservas-averias`, `app/planificacion/confirmar`, `app/planificacion/desconfirmar`, `app/historial/equipos` y `app/historial/servicios`. Solo el del almacén abre su propia sección.

- **`feat(permisos): cada permiso abre solo su módulo`** (21:35, Fabian1820) — Un sub-permiso aditivo ya no abre la pantalla del módulo padre por sí solo. Los que sí son sección propia llevan `abrePadre` (Por facturar, Aprobar presupuestos, Planificar atención, Responder peticiones). Servicios de cliente: verlos es de Clientes; crear/editar pasa a `clientes/servicios`; registrar pago pide Pagos Clientes. Costos de materiales: un permiso por módulo. Entregas y devoluciones: solo con permiso de Operaciones. Reservas: sin `reservas-ventas` solo se ven las de la instaladora. Calculadora % de Compras pide Fichas de Costo.

---

### Área 2: Seguridad — Stripe sin sesión y contraseña en localStorage (2 commits, 20:41–21:18)

- **`chore: quitar el merge desde el panel y el mensaje personal`** (20:41, Ruben0304) — Eliminada la ruta `/api/dev-tools/merge` y sus botones: hacía merge de dev a main/master en ambos repos con el GITHUB_TOKEN del servidor sin autenticar al llamador (cualquiera podía deployar a producción con un POST). Eliminado también el mensaje personal de bienvenida a un trabajador concreto.

- **`fix(seguridad): Stripe exige sesión y el login deja de guardar la contraseña`** (21:18, Ruben0304) — Fixes de seguridad críticos:
  - `/api/stripe/*` (generar-link, listar-pagos, verificar-link, solicitar-factura) usan la clave secreta de Stripe y no pedían sesión: cualquiera podía listar pagos con datos de clientes o crear links a nombre de SunCar. Ahora validan el token contra el backend. Los componentes mandan el token con `authHeader()`.
  - El login guardaba `{ ci, adminPass }` en texto plano en localStorage y el logout no lo borraba. Ahora solo se recuerda el CI y se borra lo guardado.
  - Eliminado el `console.log` que imprimía la respuesta del login con el token JWT.

---

### Área 3: Almacén de Reservas y Averías — Nuevo módulo completo (2 commits, 15:58–18:33)

- **`feat(almacen-reservas-averias): módulo en Operaciones con stock, movimientos y "Sacar materiales"`** (15:58, yany1509) — Nueva página `/operaciones/almacen-reservas-averias` (permiso `almacen-reservas-averias`) con pestañas Stock disponible y Movimientos (salidas con quién, qué, cliente, avería e importe; entradas por transferencia). Impresión y anulación de vales. Diálogo "Sacar materiales": quién se lo lleva, cliente, avería pendiente y materiales del almacén; marca en rojo y bloquea si falta stock; el 409 del backend refresca el disponible; crea solicitud y vale a la vez y ofrece descargar o imprimir el vale. Pagos clientes > Servicios: los servicios de avería solo aparecen al quedar terminados.

- **`feat(almacen-reservas-averias): transferencias por aceptar, salidas como vales y materiales en Trabajos diarios`** (18:33, yany1509) — Mejoras sobre el commit anterior: arriba las transferencias recibidas pendientes de aceptar con Aprobar/Denegar. Salidas con tabla y acciones de vales. Entradas agrupadas por transferencia con origen, fecha, hora y materiales. Stock con foto del material. Trabajos diarios > Averías: al elegir la avería salen los materiales que se llevaron. Fix: las horas de transferencias se leían como locales sin serlo (UTC sin zona, salían 4h adelantadas).

---

### Área 4: Fichas — Trazabilidad de creación y modificación (1 commit, 21:48)

- **`feat(fichas): "Creado por / Modificado por" al pie de cada ficha`** (21:48, Fabian1820) — Nuevo componente `RegistroTrazabilidad` que pide la trazabilidad del registro al abrirse (`GET /trazabilidad/{recurso}/{id}`). Muestra nombre y fecha en hora de Cuba; al pasar el ratón, la CI y la acción. No pinta nada si el registro no tiene trazabilidad (todo lo anterior al 24-sep-2026) o si la petición falla: la ficha se ve igual que antes. Implementado en **19 fichas**: cliente, lead, oferta confeccionada (detalle y vista desde cliente/lead), cita, trabajador, trabajo diario, vale de salida, solicitudes de materiales, ventas, entrada y envío, reserva, consignación, compra, facturas de instaladora, de venta y Solar Carros, y transferencia bancaria.

---

### Área 5: Leads — Conversión fallida visible y campos opcionales (2 commits, 16:44–16:51)

- **`feat(leads): aviso de leads no convertidos con botón Convertir; provincia y municipio vuelven a ser opcionales`** (16:44, yany1509) — Cartel en la parte superior de Leads que lista los leads que pagaron y cuya conversión automática a cliente falló, con el motivo y un botón Convertir que abre el diálogo de la tabla. Crear/editar lead ya no exige `provincia_montaje` y `municipio`.

- **`fix(leads): el aviso de no convertidos filtra también en el navegador y limita a 100`** (16:51, yany1509) — Si el backend aún no tiene el filtro `conversion_fallida`, devolvería todos los leads. El fix aplica el filtro también en el navegador y limita a 100 resultados.

---

### Área 6: Stripe — Trazabilidad de links de pago (1 commit, 20:50)

- **`feat(stripe): guardar quién genera cada link de pago`** (20:50, Fabian1820) — Los links de Stripe se crean desde la ruta de Next sin pasar por el backend, por lo que no quedaba registrado quién los generó. Ahora los cinco botones mandan el usuario de la sesión y la ruta guarda en la metadata del link (`creado_por_ci`, `creado_por_nombre`), visible en el panel de Stripe. `usuarioActivo()` lee `user_data` sin lanzar nunca: sin sesión, el link se crea igual, solo que sin autor.

---

### Área 7: Solicitudes de Envío — Múltiples fixes de UI y lógica (1 commit, 20:50)

- **`fix(solicitudes-envio): auditoría antes de reutilizar el módulo`** (20:50, Fabian1820) — Serie de fixes:
  - El diálogo de crear/editar se rellena solo al abrirse (antes cualquier refresco borraba lo escrito al pasar `[]` nuevo en cada render).
  - Alertas por almacén: el déficit suma lo que le falta a cada almacén y la tabla muestra el stock de cada uno. Con un almacén filtrado, se propone como destino.
  - «Ver ignoradas» lista todas las silenciadas aunque ya no estén bajo mínimo.
  - Completar: se puede poner 0, muestra almacén destino, urgencia y notas, y la fecha por defecto es la local (`toISOString` daba mañana después de las 20:00).
  - Detalle: pedido frente a comprado, quién completó o canceló, nombres en vez del CI y horas en hora local.
  - El enlace a la compra solo se ofrece con acceso a Compras; superAdmin (y `editar-ajenas`) puede editar solicitudes de otros.
  - Búsqueda de alertas sin tildes y por palabras; campos de cantidad que se pueden vaciar; sin solapamientos en escritorio ni scroll horizontal en móvil.

---

### Área 8: Wallet — Dos fixes de etiquetado y acceso (2 commits, 21:01–21:11)

- **`fix(wallet): una comisión ligada a una transferencia se ve como comisión`** (21:01, Ruben0304) — La comisión asociada a una transferencia llevaba `transferencia_id`, y eso bastaba para pintarla como "Transferencia" (origen "—", destino el propio banco). En BD ya era tipo comisión y el saldo estaba bien; solo fallaba la etiqueta y el detalle.

- **`fix(billetera): la oferta de un movimiento se abre en solo lectura`** (21:11, Fabian1820) — Sin "Generar link de pago" en el diálogo de oferta ni en el de solicitud de venta cuando se abren desde la Billetera.

---

### Área 9: Facturas Solar Carros — Moneda CUP o USD (1 commit, 15:15)

- **`feat(facturas-solar-carros): elegir CUP o USD al crear la factura`** (15:15, Fabian1820) — Selector de moneda junto al precio final. En USD se escribe el monto en dólares (con equivalente en CUP a la tasa del día debajo) y la factura dice "Monto total ... USD" en vista previa, impresión, PDF y Facturas Creadas. Se guarda `moneda_final` USD, `total_usd` el monto escrito y `total_cup` su equivalente. Fix adicional: editar una factura no miraba la respuesta; un cambio rechazado se anunciaba como guardado.

---

### Área 10: Solicitudes de Ventas — Cancelar cuenta por cobrar (1 commit, 15:13)

- **`feat(solicitudes-ventas): cancelar la cuenta por cobrar desde pendientes de pago`** (15:13, yany1509) — Botón Cancelar cuenta junto a Pagar (desactivado si la solicitud está facturada) con diálogo de motivo. Las canceladas siguen en la tabla, apagadas, tachadas y con fecha, quién y motivo. Filtro Mostrar/Ocultar/Solo canceladas con total aparte.

---

### Área 11: Ofertas — Filtro por comercial (1 commit, 15:05)

- **`feat(ofertas): filtro por comercial (solo personalizadas) y comercial en la tabla`** (15:05, yany1509) — Nuevo select Comercial en Gestionar Ofertas, activo solo con tipo Personalizadas. Debajo del lead/cliente se muestra en pequeño la comercial que lo atiende. Hook `useOpcionesComerciales` para poblar el filtro.

---

### Área 12: Consignaciones — Fix de facturación y devolución (1 commit, 14:37)

- **`fix(consignaciones): una factura por venta, devolución al pool Común y aprobación sin "Editar"`** (14:37, Fabian1820) — Acompaña fix del backend que deja el módulo listo:
  - Detalle: eliminada columna "Emitir factura" por pago; se muestra la factura de la venta (la automática del vale) y, si no tiene, un botón para emitirla una vez. El diálogo de emitir factura muestra el total sin lo devuelto.
  - Registrar pago desde la consignación: el diálogo indica a qué factura se suma el pago y el interruptor "Generar factura" ya no se ignora en silencio.
  - Devolución: sector de destino por defecto es Común (antes era Ventas).
  - Aprobación en almacén: una devolución de consignación muestra su origen en vez de una "Compra" vacía; no ofrece "Editar", que el backend rechaza.
  - `DialogDescription` del detalle renderiza un `div` (había un `div` dentro de `p`).

---

### Área 13: Inicio — Actualizaciones del sistema en lista compacta (1 commit, 17:51)

- **`feat(inicio): actualizaciones del sistema en lista compacta con "Ver todas"`** (17:51, yany1509) — En vez de una tarjeta con todo el texto por actualización, una lista de una línea por entrada (punto de color por tipo, título, tipo y hora). El mensaje se despliega al pulsar la fila. Al entrar se ven las 3 más recientes y "Ver todas (N)" muestra el resto. En móvil el título ocupa hasta dos líneas y "Notificar" va debajo del mensaje.

---

### Puede dar bateo

1. **fix(seguridad) Stripe sin sesión — confirmar que todos los componentes usan `authHeader()`**: Los endpoints `/api/stripe/*` ahora validan sesión. Si algún componente no pasó a usar `authHeader()` en su llamada, recibirá 401 y no podrá generar links ni listar pagos. Confirmar que los cinco botones de generación de links usan la función.

2. **fix(seguridad) `adminPass` en localStorage — usuarios con sesión activa conservan la contraseña hasta el próximo logout**: El fix limpia `adminPass` solo al hacer logout desde este commit. Los usuarios que nunca hagan logout pueden tener la contraseña expuesta indefinidamente. Comunicar que hagan logout y vuelvan a entrar.

3. **chore quitar /api/dev-tools/merge — confirmar ausencia de scripts o CI que la llamaran**: Si había un proceso automatizado que invocaba esta ruta para deployar, dejará de funcionar silenciosamente.

4. **feat(permisos) cierre del sistema — ~45 páginas nuevas con RouteGuard pueden bloquear usuarios existentes**: Desplegar sin verificar que los permisos están correctamente asignados puede bloquear a trabajadores que accedían por URL directa. Hacer un recorrido por permisos antes del deploy.

5. **feat(permisos) Billetera requiere permiso `wallet` — cambio breaking para usuarios actuales**: Cualquier usuario que usaba la Billetera sin el permiso `wallet` perderá acceso tras el deploy. Requiere asignación previa.

6. **feat(permisos) cada permiso abre solo su módulo — usuarios con sub-permisos aditivos pierden acceso al módulo padre**: Si un usuario solo tenía un sub-permiso aditivo (p.ej. `clientes/servicios`), tras este commit ya no puede acceder a la pantalla de Clientes. Verificar assignments existentes antes del deploy.

7. **feat(permisos) nuevos permisos de la app de instaladores — confirmar en `MODULOS_CATALOGO`**: `app/almacen-reservas-averias`, `app/planificacion/confirmar`, `app/planificacion/desconfirmar`, `app/historial/equipos` y `app/historial/servicios` deben estar registrados en el catálogo para ser asignables desde Gestión de Permisos.

8. **feat(almacen-reservas-averias) módulo nuevo — confirmar todos los endpoints en backend**: La página usa endpoints de stock disponible, creación simultánea de solicitud y vale, y anulación de vale. Si alguno no está deployado, la funcionalidad falla con 404.

9. **feat(almacen-reservas-averias) 409 refresca el stock disponible — confirmar que el 409 lleva el stock actualizado en el cuerpo**: Si el 409 no incluye el stock actual, el frontend necesita hacer un GET separado para refrescar. Confirmar cuál es el comportamiento real del backend.

10. **feat(leads) provincia y municipio opcionales — posible regresión en conversión automática**: El 23-sep se hicieron obligatorios para forzar los datos que la conversión automática necesita. Este commit los hace opcionales de nuevo. Un lead sin municipio puede volver a bloquearse en la conversión si el backend sigue exigiéndolo. Aclarar si el backend ya maneja municipio vacío o si la conversión siempre será manual para estos leads.

11. **feat(fichas) trazabilidad — endpoint `GET /trazabilidad/{recurso}/{id}` — confirmar en backend**: 19 fichas hacen un GET extra al abrirse. Si el endpoint no existe, cada apertura genera un 404 silencioso. Si es lento, el usuario ve el componente cargando mientras la ficha ya está lista.

12. **feat(fichas) trazabilidad — confirmar que el campo `recurso` coincide con el identificador del backend**: El componente pasa un string `recurso` que debe coincidir con el nombre de colección/entidad que el backend registra. Una discrepancia (p.ej. `clientes` vs `cliente`) devuelve vacío silencioso en todas las fichas de ese tipo.

13. **feat(stripe) metadata en links — confirmar que Stripe acepta metadata en los cinco tipos de link usados**: Si alguno de los cinco endpoints crea links con un tipo que no admite metadata personalizada, la creación del link fallará o ignorará la metadata.

14. **fix(solicitudes-envio) fecha local sin zona — confirmar que el backend la acepta**: El fix reemplaza `toISOString()` (UTC) por hora local sin zona. Si el backend parsea la fecha con `datetime.fromisoformat()` sin zona y hace comparaciones de rango en UTC, una solicitud completada después de las 20:00 hora Cuba puede quedar en la fecha del día siguiente.

15. **feat(facturas-solar-carros) `moneda_final`, `total_usd`, `total_cup` — confirmar en schema del backend**: FastAPI rechaza campos extra si el modelo usa `ConfigDict(extra='forbid')`. Si el modelo de factura no incluye estos campos, el POST devuelve 422.

16. **feat(solicitudes-ventas) cancelar cuenta — confirmar endpoint en backend**: Si el endpoint de cancelación no existe o no acepta el campo `motivo`, el botón siempre fallará.

---

## 📅 23 de Septiembre, 2026

### Resumen de cambios (últimas 24h)

**~22 commits reales** — Fabian1820 (10), yany1509 (9), Ruben0304 (3). Día extremadamente activo. Siete áreas principales: **nuevo módulo Facturación / Por facturar** con permisos aditivos, **traspaso e intercambio de equipos entre clientes**, **números de serie en vales**, **desconfirmar día en planificación**, fixes críticos de facturas/auth/leads/ventas, descarga de PDF en trabajos diarios y mejoras visuales.

---

### Área 1: feat/fix(facturas-solar-carros) × 5 — Ciclo de vida completo de facturas (Fabian1820, 14:51–22:08)

- **`feat(facturacion): módulo Por facturar`** (19:04) — La factura ya no se genera sola al instalar; se acepta en Facturación → Por facturar. Pestañas Nuevos e Histórico. Cada cliente muestra todas sus ofertas confirmadas con estado (facturada/pendiente/no se factura) y acciones Facturar / No facturar / Deshacer. Pestaña **Oferta vs almacén** con comparativa material por material. Tres permisos aditivos con `hasExactPermission`: `facturas/por-facturar`, `facturas/facturar`, `facturas/comparativa`. Obras Terminadas: "Generar factura a cliente" exige el permiso de facturar. La campana lleva notificaciones a Por facturar.

- **`feat: la factura guarda su ticket y el diálogo avisa que se borra`** (15:59) — `ContabilidadService.crearTicket` leía `response.ticket` (que el backend no manda; responde `ticket_id` y `numero_ticket`), por lo que siempre devolvía `undefined` y ninguna factura guardaba su ticket. Corregido. Al eliminar, el diálogo dice qué ticket se borra con ella.

- **`feat: botón Eliminar factura con opción de devolver existencias`** (14:51) — Tres salidas al eliminar: Cancelar, Solo eliminar (no toca inventario) y Eliminar y devolver cantidades (suma de vuelta a Existencias Contabilidad).

- **`fix: una factura rechazada ya no deja la rebaja hecha`** (22:08) — El 23-sep la página proponía el número 0000126 ya existente; el backend rebajó el ticket y rechazó con 400. Como `apiRequest` no lanza ante 400, la página decía "Factura creada" y las 15 líneas salían dos veces. Fixes: la lista de facturas se carga al abrir (no solo al entrar en Facturas); se verifica que el número no exista antes de rebajar; se comprueba la respuesta del POST y si falla se anula el ticket; ante corte de red se busca la factura antes de devolver.

- **`fix: botón Agregar otro material no se sale con descripciones largas`** (18:38) — `whitespace-nowrap` heredado por el span de `SearchableSelect` con `truncateSelected={false}` empujaba el botón fuera de pantalla.

---

### Área 2: feat/fix(clientes) × 2 — Traspaso e intercambio de equipos (Fabian1820, 14:44–15:57)

- **`feat(clientes): traspaso e intercambio de equipos entre clientes`** (14:44) — Botón «Traspaso / intercambio» en el diálogo de equipos: selector del otro cliente, columnas de cuántas unidades pasan a cada lado (un sentido = traspaso, los dos = intercambio), series opcionales, vista previa de capacidad de ambos y aviso si alguno se queda sin inversor/baterías/paneles. Historial con código TR, otro cliente, quién lo hizo y quién lo autorizó; permite revertir.

- **`fix(clientes): el traspaso va con el acceso completo a Clientes`** (15:57) — Se quita el sub-permiso aditivo `clientes/traspaso-equipos`; el botón lo ve quien tiene el módulo Clientes entero.

---

### Área 3: feat(vales) — Números de serie por unidad (Fabian1820, 16:27)

- **`feat(vales): números de serie por unidad al crear, ver y devolver un vale`** — Crear vale: series como lista; no rompe con cantidades decimales; quita series sobrantes al bajar la cantidad; avisa series incompletas; no deja repetir series en el vale. Detalle: etiqueta por serie, las devueltas tachadas. Devolución: si el vale trae series se marcan las que vuelven o se escanea. **Requiere backend 6881e06.**

---

### Área 4: feat(planificacion) — Botón desconfirmar día (Fabian1820, 22:20)

- **`feat(planificacion): botón para desconfirmar un día ya confirmado`** — Nuevo sub-permiso aditivo `planificacion/desconfirmar` (ni el módulo ni `planificacion/confirmar` lo conceden). Los días confirmados muestran el botón a quien lo tenga y a superadmins, con diálogo de confirmación.

---

### Área 5: fix(auth) + fix(leads) + fix(ventas) — Tres fixes de datos críticos (yany1509, 19:01–19:21)

- **`fix(auth): forzar login ante cualquier 401`** (19:21) — El interceptor solo reaccionaba a 401 cuyo mensaje contuviera "token" + "expirado"/"inválido". El 401 de sesión revocada por CI traía otro texto y no matcheaba. Se amplía a cualquier 401.

- **`fix(leads): exigir provincia y municipio, y mostrar cuándo falló la conversión automática`** (19:01) — Un lead sin municipio bloqueaba en silencio la conversión automática a cliente al pagar. El formulario ahora exige `provincia_montaje` y `municipio`. La tabla y el detalle muestran aviso ámbar cuando el backend registró `ultimo_error_conversion_automatica`.

- **`fix(ventas): "Total facturado" no sumaba los aumentos`** (19:20) — Mostraba `usd.sinDescuento` en vez de `usd.facturado`. En producción el encabezado baja de ~3.03M a ~2.95M.

---

### Área 6: feat(historial) + feat(trabajos-diarios) + feat(historial-provincias) — Mejoras de datos (yany1509, 15:29–17:13)

- **`feat(historial): filtros de fecha de creación e instalación`** (15:29).
- **`feat(trabajos-diarios): descargar el informe PDF de un trabajo y el de todo el día`** (17:13).
- **`feat(historial): la tabla de provincias suma cuántos clientes tienen inversor, batería y paneles`** (16:07).

---

### Área 7: fixes de UI/UX (yany1509 + Ruben0304, 14:44–22:20)

- **`fix(dashboard): unificar el tono de color por pestaña`** — Cada pestaña usa un solo hue con variaciones de intensidad.
- **`fix(planificacion): etiqueta "instalación en proceso" rellena`** — Pasó de contorno esmeralda a relleno violeta.
- **`fix(wallet): evita que el body quede bloqueado al crear un banco desde el dropdown`** — Race condition Radix conocido (DropdownMenuItem + Dialog en mismo tick) solucionado con `onSelect + preventDefault + setTimeout`.
- **`fix(instaladores): unifica el diseño de Gestionar Instaladores con Brigadas`**.
- **`feat(planificacion): rediseña la vista de inicio con el lenguaje de Brigadas`**.

---

### Puede dar bateo

1. **feat(facturacion) módulo Por facturar — confirmar endpoints en backend de producción**: Los endpoints de Por facturar, facturar oferta y comparativa son nuevos. Si no están deployados, las pestañas fallan al cargar.

2. **feat(facturacion) `hasExactPermission` — confirmar implementación en auth-context**: Si no está declarada, el módulo fallará con "is not a function" en runtime.

3. **feat(facturacion) permisos aditivos — confirmar `facturas/por-facturar`, `facturas/facturar`, `facturas/comparativa` en MODULOS_CATALOGO**: Sin entrada en el catálogo no son asignables.

4. **feat(clientes) traspaso de equipos — confirmar endpoint en SunCarBackend**: Si el endpoint de traspaso y el de revertir no están deployados, el botón creará errores 404.

5. **feat(vales) números de serie — requiere backend 6881e06**: Si ese commit no está deployado, crear un vale con series devolverá 422 o ignorará las series silenciosamente.

6. **feat(planificacion) `planificacion/desconfirmar` — confirmar en MODULOS_CATALOGO**: Sin entrada, solo los superadmins verán el botón.

7. **fix(auth) cualquier 401 fuerza login — loop si el endpoint de login devuelve 401**: Confirmar que el interceptor no aplica en la ruta de login para evitar loop de redirección.

8. **fix(leads) municipio obligatorio — leads existentes sin municipio bloqueados al editar**: Al editar un lead antiguo sin municipio, el formulario bloqueará el guardado. Si hay muchos leads en este estado puede ser disruptivo. *(Nota: el commit del 24-sep revirtió esto haciendo los campos opcionales de nuevo — ver área 5 del 24-sep.)*

9. **fix(ventas) caída de ~3.03M a ~2.95M en Total facturado**: El cambio es correcto, pero puede alarmar a usuarios sin contexto. Comunicar que es un fix de cálculo.

10. **fix(facturas) ticket_id de facturas históricas**: Todas las facturas creadas antes del fix no tienen `ticket_id` guardado. El diálogo de eliminar dirá que no tiene ticket enlazado.

---

## 📅 17 de Septiembre, 2026

### Resumen de cambios (últimas 24h)

**12 commits reales** — yany1509 (todos). Día muy activo: **rediseño iterativo del módulo Contabilidad** en Informe de Dirección (3 commits), **módulo Historial/Clientes por UEB** (2), **Operaciones con acceso directo a tarjetas** (1), **Leads con conversión sin pago** (1), **Clientes internos con precio 0** (1), **Comercial seleccionable en editar cliente** (1), **adjuntos con cualquier tipo de archivo** (2 commits), y **edición de datos salariales en Nómina** (1).

---

### Área 1: feat/fix(informe-direccion) × 3 — Rediseño iterativo de Contabilidad (19:16–19:48)

- **Tablero oscuro tipo marcador**: reemplaza las 3 tarjetas sueltas de resumen. Ingresos/Gastos/Saldo son segmentos clicables; Ingresos activo por defecto. Pastel de distribución por categoría a la izquierda + detalle a la derecha. El detalle se adapta solo: una categoría de una sola persona va directamente a movimientos sin agrupar.
- **Paleta de marca y gráfico de tendencia**: tarjetas con paleta SunCar 2026 (Clean Current, Solar Radiance, Midnight Voltage), pastel rediseñado con leyenda lateral. Nuevo gráfico de líneas con tendencia de los últimos 6 meses.
- **Barra de filtros compacta**: una sola fila, sin etiquetas sueltas, botón Actualizar como icono. Blindaje de respuesta inesperada del backend: si llega un 400 en forma de objeto de error, muestra toast en lugar de vista en blanco.

---

### Área 2: feat/fix(historial/clientes) × 2 — Vista por UEB (20:06–20:14)

- **Módulo renombrado a "Clientes"**: La pestaña "Por equipos" es ahora la vista por defecto. Entrada jerárquica: UEB → inversores de esa UEB → lista de clientes → historial del cliente.
- **Inversores en tabla**: Foto, nombre, marca, potencia, clientes y unidades por fila.

---

### Área 3: feat(operaciones) — Acceso directo a tarjetas de Instalaciones (20:29)

- Visitas, Instalaciones en Proceso, Instalaciones Nuevas, Trabajos Diarios y Averías pasan a ser tarjetas independientes en Operaciones. Mismas claves de permiso `instalaciones/<id>`.

---

### Área 4: feat(leads) — Convertir a cliente sin pago con justificación (20:06)

- Nuevo check **"Pago registrado"** en el diálogo de conversión. Para el subpermiso aditivo `leads/convertir-sin-pago`, aparece un campo de justificación obligatorio que permite convertir sin pago registrado.

---

### Área 5: feat(clientes) — Comercial seleccionable (20:06)

- El campo Comercial en editar de Clientes pasa de texto libre a un `select` que combina trabajadores con cargo Comercial Instaladora y los valores ya usados en Leads.

---

### Área 6: feat(clientes-ventas) — Precio 0 para clientes internos (19:38)

- Switch **"Cliente interno (precio siempre en 0)"** en el formulario de cliente de ventas. El preview de oferta/solicitud muestra `$0.00` con badge "Cliente interno - precio 0".

---

### Área 7: feat/fix(clientes) × 2 — Adjuntar cualquier tipo de archivo (16:10–16:14)

- El input de adjuntos ya no restringe el tipo de archivo (`accept` quitado). Fix previo: renombrado del ítem del menú de "Agregar fotos" a "Adjuntar archivo foto o video".

---

### Área 8: feat(contabilidad) — Pastel 3D con etiquetas (20:24)

- El pastel plano de Recharts es reemplazado por SVG a mano con perspectiva 3D: elipse con pared extruida, piso visual del 3.5% por porción, etiquetas con líneas guía izquierda/derecha.

---

### Área 9: feat(recursos-humanos) — Editar datos salariales en Nómina (15:17)

- Permite editar salario, alimentación, estímulos y días trabajables directamente en la vista de Nómina.

---

### Puede dar bateo

1. **feat(operaciones) tarjetas directas — permisos en backend**: Si el backend valida permisos específicos por `instalaciones/<id>`, un usuario sin el permiso por la tarjeta agrupadora puede ver el acceso directo pero recibir 403 al entrar.

2. **feat(leads) `leads/convertir-sin-pago` — confirmar entrada en `MODULOS_CATALOGO`**: Si el subpermiso no está registrado, nadie podrá usarlo aunque el código esté deployado.

3. **feat(clientes-ventas) precio 0 para clientes internos — confirmar que el backend guarda `precio: 0` correctamente**: Si el backend no diferencia clientes internos, el preview mostrará $0 pero la oferta se guardará con precio real.

4. **feat/fix(informe-direccion) blindaje de respuesta 400**: Confirmar que otros módulos que usan el mismo endpoint no queden afectados si el formato de respuesta cambia.

5. **feat(recursos-humanos) edición en Nómina — confirmar endpoint PATCH/PUT en backend**: Si no existe, la edición fallará silenciosamente.

6. **feat(contabilidad) pastel 3D — muchas categorías pequeñas**: Las etiquetas con líneas guía pueden solaparse si hay muchas porciones por debajo del piso visual del 3.5%.

---

> ⚠️ **Nota de mantenimiento**: La entrada del **16 de Septiembre** fue eliminada el 24 de Septiembre al superar los 7 días de antigüedad (política de retención semanal). Las entradas del **10, 11, 14 y 15 de Septiembre** fueron eliminadas el 23 de Septiembre. La entrada del **9 de Septiembre** fue eliminada el 17 de Septiembre. La entrada del **7 de Septiembre** fue eliminada el 15 de Septiembre. La entrada del **2 de Septiembre** fue eliminada el 10 de Septiembre. Anteriores eliminadas progresivamente desde Mayo.
