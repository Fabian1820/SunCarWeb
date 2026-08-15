# Registro de Análisis de Cambios — SunCarWeb

---

## 📅 15 de Agosto, 2026

### Resumen de cambios (últimas 24h)

**1 commit real** — yany1509. Fix puntual en el sistema de permisos: "Preguntas Frecuentes" y "Datos a Averiguar" ya pueden asignarse y ser vistos por comerciales.

---

### Área 1: Permisos — Preguntas Frecuentes y Datos a Averiguar accesibles para comerciales (1 commit — yany1509, 14:50)

- **`fix(permisos): Preguntas Frecuentes y Datos a Averiguar se pueden asignar`** — El cherry-pick del 14 de Agosto había marcado los 4 módulos del asistente de WhatsApp (SunCar WhatsApp, Preguntas Frecuentes, Datos a Averiguar y Números de Prueba) como exclusivos para superAdmin. El problema: la comprobación de superAdmin se evalúa antes que la de permisos asignados, por lo que aunque un módulo estuviera asignado a una comercial, no podía verlo. Fix: "Preguntas Frecuentes" y "Datos a Averiguar" salen de la restricción de superAdmin y quedan bajo el sistema regular de permisos (quien los tenga asignados los ve). "Números de Prueba" y "Solicitudes de Desarrollo" siguen siendo solo para superAdmin.

---

### Puede dar bateo

1. **La visibilidad depende del sistema de permisos regular — confirmar asignaciones en BD**: El fix elimina la barrera de superAdmin pero no asigna los módulos. Si las comerciales que los necesitan no los tienen asignados explícitamente en sus permisos de BD, seguirán sin verlos. Verificar que las asignaciones están hechas en producción.

2. **"Preguntas Frecuentes" sigue sin RouteGuard dedicado**: Cualquier usuario autenticado puede acceder a `/preguntas-frecuentes` directamente por URL. Ahora que el módulo es visible para no-superAdmin en el dashboard, este riesgo es más relevante que antes.

3. **Contenido que alimenta al wizard de WhatsApp en tiempo real, sin audit trail**: Las comerciales con permiso asignado pueden modificar las FAQs y los campos que el asistente recopila, afectando directamente las respuestas del bot en producción. No hay flujo de revisión ni registro de quién cambió qué.

4. **"Datos a Averiguar" — confirmar que tampoco tiene RouteGuard propio**: El análisis del 14 de Agosto identificó ausencia de RouteGuard en "Preguntas Frecuentes"; verificar si "Datos a Averiguar" está en la misma situación.

---

## 📅 14 de Agosto, 2026

### Resumen de cambios (últimas 24h)

**17 commits reales** — Ruben0304 y yany1509. Día de release masivo: batch de cherry-picks desde la rama `dev` (trabajo acumulado desde julio 6) más un fix nativo de permisos. Se incorporan los módulos de WhatsApp/Chatwoot, Equipos Felicity, Actualizaciones Felicity, Peticiones, Solicitudes de Desarrollo, Preguntas Frecuentes, Datos a Averiguar y Números de Prueba al branch principal.

---

### Área 1: Permisos — fix nativo de guardado cuando falla la carga (1 commit — Ruben0304, 14:03)

- **`fix(permisos): bloquear guardado si falla la carga de permisos actuales`** — Commit nativo (no cherry-pick). `getTrabajadorModulosNombres` ya no silencia errores: si falla (red, 429, 500, etc.) se activa `permisosLoadError`, se muestra toast + banner y "Guardar Cambios" queda deshabilitado hasta reabrir el diálogo. `PermisosService.getTrabajadorModulosNombres/updateTrabajadorPermisos` ahora detectan `success:false` y lanzan `Error` (antes `apiRequest` no lanzaba excepción en HTTPException JSON del backend, por lo que el `.catch(() => [])` del diálogo nunca se disparaba). Guardar lista de permisos vacía intencionalmente pide `window.confirm` y envía `confirmar_vacio: true`. Complementa fix de backend (SuncarBackend) para el caso de Fernando Ferrera (CEO) sin permisos.

---

### Área 2: Cherry-pick batch — módulos WhatsApp/Chatwoot, Felicity y herramientas (14 commits — yany1509, 14:11)

Todos con committer date 14:11:08, cherry-picks de código original entre Jul 6 y Ago 13:

- **`feat(permisos): módulos del asistente de WhatsApp solo visibles para superadmin`** (author Ago 13) — SunCar WhatsApp, Preguntas Frecuentes, Datos a Averiguar y Números de Prueba solo accesibles para superAdmin.
- **`fix: quita el directorio telefónico, que no entra en esta release`** — El cherry-pick de `page.tsx` arrastró el import y uso de `DirectorioTelefonicoCard` (módulo de trabajadores/directorio no incluido en esta release), rompiendo el build. Fix inmediato tras detectarlo.
- **`feat(numeros-prueba): página para gestionar los números de prueba del wizard`** (author Ago 12) — Nuevo CRUD de números de prueba para el wizard de WhatsApp en Chatwoot.
- **`fix(datos-a-averiguar): contenido tapado por el header fijo`** (author Ago 6) — Fix de layout `content-with-fixed-header`.
- **`feat(datos-a-averiguar): página para gestionar lo que el asistente debe averiguar`** (author Ago 6) — CRUD de los campos que el wizard debe recopilar en cada conversación.
- **`feat(preguntas-frecuentes): agrega la página al menú lateral (siempre visible)`** (author Ago 5) — `/preguntas-frecuentes` aparece en la navegación sin permiso dedicado.
- **`feat(preguntas-frecuentes): página para gestionar FAQ que usa el wizard`** (author Ago 5) — CRUD completo contra endpoint del backend. Sin RouteGuard por ahora.
- **`feat(actualizaciones-felicity): página pública de subida (zh/en/es) + búsqueda interna`** (author Jul 31, Ruben) — Página standalone `/actualizaciones-felicity` para ingenieros de Felicity con login propio (separado del de SunCar). `AuthGuard` deja pasar la ruta sin sesión. Dentro del módulo Equipos Felicity: `/equipos-felicity/actualizaciones` para búsqueda estructurada con historial.
- **`feat(equipos-felicity): equipo de oficina como referencia de estado`** (author Jul 31, Ruben) — Marcar dispositivo Felicity como equipo de oficina; su estado (red/batería) en barra lateral del dashboard.
- **`feat(equipos-felicity): nuevo módulo de monitoreo y administración FSolar`** (author Jul 31, Ruben) — Listado de equipos por planta, vinculación de cuenta FSolar, panel de estado rápido en vivo, ficha avanzada y zona de peligro con operaciones por nivel de riesgo.
- **`feat(peticiones): módulo dedicado para superAdmin con resolución + terminada`** (author Jul 30) — Nueva página `/peticiones` solo superAdmin. FAB flotante índigo en Inicio remite al módulo (CTA) en vez de responder inline para superAdmin.
- **`feat(solicitudes-desarrollo): botón flotante para reportar al equipo de desarrollo`** (author Jul 27) — FAB índigo sobre la campana de notificaciones. SuperAdmin ve y responde todas; el resto solo ve las propias.
- **`perf(chatwoot): paraleliza las llamadas a la Platform API en el SSO`** (author Jul 27) — 5 llamadas HTTP secuenciales reducidas a paralelas: crear/buscar usuario + listar inboxes en paralelo, luego dar acceso + generar link SSO en paralelo.
- **`feat(chatwoot-sso): sincroniza la foto de perfil del usuario como avatar del agente`** (author Jul 9).
- **`feat(chatwoot): módulo Suncar WhatsApp con SSO automático`** (author Jul 6, Ruben) — Crea/reusa agente Chatwoot vía Platform API, lo agrega con rol agente o administrador (sub-permiso `suncar-whatsapp/admin`), lo agrega a todas las inboxes, abre pestaña nueva ya logueado por SSO.

---

### Área 3: Reordenamiento módulos WhatsApp en dashboard (2 commits — yany1509, 14:36 y 19:26)

- **`feat(modulos): los módulos del asistente de WhatsApp pasan a Comercial Instaladora`** (14:36) — SunCar WhatsApp, Preguntas Frecuentes, Datos a Averiguar y Números de Prueba se mueven del grupo superior (junto a Centro de Control) al grupo Comercial Instaladora.
- **`feat(modulos): el asistente de WhatsApp baja al final de Comercial Instaladora`** (19:26) — Los mismos 4 módulos se reubican al final del grupo Comercial Instaladora, detrás de Reportes, para no interferir con lo que se usa a diario.

---

### Puede dar bateo

1. **`fix(permisos)` — `confirmar_vacio: true` requiere soporte en backend de producción**: El fix envía este parámetro al guardar permisos vacíos intencionalmente. El commit menciona complementar un fix de SuncarBackend — confirmar que ese deploy está activo. Si el backend no acepta el parámetro, puede rechazar el guardado o ignorarlo silenciosamente.

2. **`fix(permisos)` — otros servicios en `api-services.ts` con `.catch(() => [])` sobre `success:false`**: El fix revela que `apiRequest` no lanzaba excepción en HTTPException JSON. Otros servicios que capturen errores de esta forma seguirán swallowing fallos del backend sin advertencia al usuario.

3. **Cherry-pick batch (15 commits, código desde Jul 6) — arrastre de dependencias no detectadas en build**: El fix del directorio telefónico ya evidenció que un cherry-pick arrastró un import de módulo ausente en esta release. Pueden existir otros arrastra similares que fallen en runtime (no en build) al navegar a rutas específicas o ejecutar acciones puntuales.

4. **`feat(actualizaciones-felicity)` — página pública con login propio de Felicity**: `AuthGuard` deja pasar `/actualizaciones-felicity` sin sesión SunCar. Si el login de Felicity tiene credenciales débiles o el endpoint de subida no valida en backend, cualquier persona puede subir firmware/software a los equipos. Confirmar autenticación y autorización en el servidor.

5. **`feat(preguntas-frecuentes)` — sin RouteGuard**: Accesible a cualquier usuario autenticado en SunCar. El wizard de WhatsApp en Chatwoot consulta estas preguntas en tiempo real — si un usuario con acceso limitado modifica FAQs, afecta las respuestas del wizard en producción.

6. **`feat(numeros-prueba)` — endpoints de backend sin confirmar en el commit**: No se documenta verificación contra producción. Si los endpoints del wizard (números de prueba) no están deployados, la página fallará en runtime.

7. **`perf(chatwoot)` — error handling en ramas paralelas del SSO**: Si crear/buscar usuario falla pero listar inboxes tiene éxito (o vice-versa), la lógica que combina los resultados paralelos puede producir un estado inconsistente donde el usuario es agregado a inboxes sin cuenta válida, o tiene cuenta sin acceso a inboxes.

8. **`feat(peticiones)` — endpoint de backend sin confirmar en producción**: El módulo de superAdmin asume el endpoint disponible. Si no está deployado, el módulo entero fallará al acceder. El FAB flotante en Inicio tampoco debería mostrar el CTA de superAdmin si el módulo no funciona.

9. **`feat(chatwoot)` SSO — Platform API de Chatwoot puede haber cambiado en 5+ semanas**: El código original es del 6 de Julio. Si Chatwoot actualizó la Platform API (endpoints, parámetros, comportamiento de SSO) entre julio y agosto, el flujo puede fallar silenciosamente o con errores parciales.

10. **Reordenamiento en 2 commits (14:36 y 19:26) — ~5h con orden incorrecto en producción si Railway auto-deploy está activo**: Durante ese intervalo, el dashboard mostraba los módulos de WhatsApp en Comercial Instaladora pero en posición incorrecta. No es crítico pero el orden final debe verificarse en producción.

11. **Módulos de WhatsApp solo visibles para superAdmin — confirmar que los RouteGuards de las rutas individuales también verifican superAdmin**: El commit de permisos restringe la visibilidad en el dashboard, pero si las rutas `/preguntas-frecuentes`, `/datos-a-averiguar`, `/numeros-prueba` no tienen `RouteGuard` propio (se documenta que preguntas-frecuentes no lo tiene), un usuario con la URL directa puede acceder aunque no vea el módulo en el dashboard.

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

- **`feat(pagos): agrega billetes de 5000 y 2000 CUP al desglose en Registrar Pago`** (17:45) — Se añaden las denominaciones de 5000 y 2000 CUP al array de billetes en `components/feats/pagos/registrar-pago-dialog.tsx`.

---

### Área 2: Pagos — billetes de 5000 y 2000 CUP en Editar Pago y Registrar Devolución (1 commit — yany1509, 17:52)

- **`feat(pagos): agrega billetes de 5000 y 2000 CUP al desglose en Editar Pago y Registrar Devolucion`** (17:52) — La misma adición de denominaciones aplicada a `editar-pago-dialog.tsx` y `registrar-devolucion-pago-dialog.tsx`.

---

### Puede dar bateo

1. **Denominaciones de billetes CUP hardcodeadas en 3 diálogos separados — posible 4° diálogo sin actualizar**: Si existe algún otro diálogo o componente de consulta/histórico que muestre el desglose de billetes, no recibirá las nuevas denominaciones.

2. **Lista de denominaciones no centralizada — riesgo de desincronía futura**: El array está duplicado en cada diálogo. Cualquier denominación nueva en el futuro requerirá el mismo proceso manual.

3. **Orden del array no confirmado**: Si los billetes de 5000 y 2000 no se insertaron en posición descendente correcta (5000, 2000, 1000, 500...), el desglose visual puede resultar confuso.

4. **Ventana de ~7 minutos con Railway auto-deploy (17:45-17:52)**: Hubo un intervalo donde Registrar Pago ya mostraba 5000 y 2000 CUP pero Editar Pago y Registrar Devolución aún no.

---

## 📅 11 de Agosto, 2026

### Resumen de cambios (últimas 24h)

**2 commits** — ambos de yany1509. Actualización de la dirección física de la empresa en todos los servicios de generación de documentos PDF. Se reemplaza "Calle 24 #109 e/ 1ra y 3ra" por "Calle 2 e/3ra y 5ta, Miramar, Playa, La Habana".

---

### Área 1: Pagos — Actualización de dirección en comprobantes de pago y devolución (1 commit — yany1509, 15:30)

- **`fix(pagos): actualiza direccion de la empresa en comprobantes de pago/devolucion`** (15:30) — Cambia la dirección en los PDFs de comprobantes de pago y devolucón.

---

### Área 2: Exportación — Actualización de dirección en facturas y comprobantes generales (1 commit — yany1509, 15:41)

- **`fix(exportacion): actualiza direccion de la empresa en el resto de facturas/comprobantes`** (15:41) — Misma corrección en 4 servicios de exportación: `facturas/export-factura-service.ts`, `facturas/export-factura-contabilidad-service.ts`, `obras-terminadas/export-factura-cliente-service.ts`, `pagos-clientes-ventas/export-factura-venta-consolidada-service.ts`.

---

### Puede dar bateo

1. **Dirección hardcodeada en múltiples archivos — posibles ocurrencias no actualizadas**: Si existen otros servicios de exportación (informes, vales de salida, RRHH, reportes, documentos DOCX) no incluídos en estos dos commits, seguirán imprimiendo la dirección antigua.

2. **Dos commits separados para el mismo fix — posible build intermedio en Railway**: Ventana de ~11 minutos (15:30-15:41) donde comprobantes de pago/devolución mostraban dirección nueva pero facturas y obras terminadas mostraban la vieja.

3. **Sin cobertura de tests sobre contenido de PDFs**: Solo una revisión visual de cada documento puede confirmar que la dirección es correcta en todos los flujos.

---

## 📅 10 de Agosto, 2026

### Resumen de cambios (últimas 24h)

**9 commits** — todos de yany1509 (varios co-autorados con Claude Opus 5). Día muy activo: refactor completo del catálogo de fuentes en Leads con FuenteSelector y GestionarFuentesDialog, display de referencia en dos líneas para fuentes con persona, prioridad Urgente/Ninguna, rediseño de UI de tabla y modales, tres fixes encadenados de estados inválidos (Nuevo, Pendiente de pago, Sin respuesta, Pendiente de instalación), anular/activar clientes con FuenteSelector y diálogo de estado múltiple de instalación, filtro multi-select "Quien cobro" en pagos respaldado por nuevo endpoint, y diálogos de confirmación antes de guardar en los 4 flujos de pagos.

---

### Área 1: Leads — Catálogo cerrado de fuentes, prioridad Urgente y rediseño UI (4 commits — yany1509, 12:41-13:37)

- **`feat(leads): catalogo cerrado de fuentes, prioridad Urgente y rediseño de la UI`** (12:41) — FuenteSelector desde `/api/fuentes`; GestionarFuentesDialog; archivos nuevos `fuente-selector`, `gestionar-fuentes-dialog`, `lib/constants/fuentes.ts`. Prioridad Urgente y Ninguna con colores nuevos. UI: columnas Fecha de contacto y Fuente, filtro "Sin confirmadas", popover compacto, 3 checks antes de convertir. TSC: 241 errores, cero nuevos.
- **`fix(leads): quita los estados "Nuevo" y "Pendiente de pago" de los selectores`** (12:47) — Se habían colado del commit anterior. Los 3 selectores vuelven a los 9 estados. 0 leads usaban esos estados.
- **`fix(leads): quita "Sin respuesta" de todos los selectores, badges y mapas`** (12:57) — Eliminado de 11 sitios. Los 149 leads migrados a "No interesado". TSC 241 errores (cero nuevos).
- **`fix(leads): quita "Pendiente de instalación" de crear/editar, deja el filtro igual`** (13:37) — Los 21 leads con ese estado se mantienen en BD; si se abre Editar, el selector aparecerá vacío.

---

### Área 2: Leads/Clientes — Display de fuente con referencia en dos líneas (2 commits — yany1509, 13:03-13:22)

- **`feat(leads,clientes): muestra la referencia junto a fuente Trabajador/Sucursal/Otro cliente`** (13:03) — Nuevo helper `lib/utils/fuente-display.ts`. TSC 241 errores (cero nuevos).
- **`feat(leads,clientes): fuente Trabajador/Sucursal/Otro cliente en dos líneas`** (13:22) — Tooltip en hover para columnas angostas. TSC 241 errores (cero nuevos).

---

### Área 3: Clientes — anular/activar, FuenteSelector y EstadoInstalacionMultiple (1 commit — yany1509, 15:11)

- **`feat(clientes): anular/activar, FuenteSelector, filtro equipo comercial y estado instalacion multiple`** (15:11) — Botón anular/activar cliente + badge "Anulado" + checkbox "Ver anulados". FuenteSelector en create/edit. Nuevo `EstadoInstalacionMultipleDialog`.

---

### Área 4: Clientes/Pagos — Estilo tabla y filtro multi-select "Quien cobro" (1 commit — yany1509, 17:22)

- **`feat(clientes,pagos): estilo de tabla de dev + filtro multi-select "quien cobro"`** (17:22) — Badges de estado solo con color; tabla con borde redondeado. Pagos: nuevo filtro multi-select "Quien cobro" respaldado por `GET /pagos/cobradores` y parámetro `recibido_por`.

---

### Área 5: Pagos — Confirmación explícita antes de guardar en los 4 diálogos (1 commit — yany1509, 17:36)

- **`feat(pagos): confirmacion antes de guardar en crear/editar/cancelar/devolver pago`** (17:36) — Los 4 diálogos piden confirmación explícita. Enter o clic en botón principal ya no dispara el guardado directo.

---

### Puede dar bateo

1. **FuenteSelector cierra el catálogo — leads con fuentes libres antiguas no cubiertas quedarán con campo vacío**: `fuente_referencia` debe ser persistido por el backend en POST/PATCH.
2. **GestionarFuentesDialog reasignación — fallo parcial deja leads con fuente desactivada**.
3. **"Nuevo" y "Pendiente de pago" — ventana de ~6 minutos antes del fix (12:41-12:47)**: Leads creados en ese intervalo pueden tener estados inválidos en BD.
4. **"Pendiente de instalación" — 21 leads con ese estado, modal de edición muestra campo vacío sin aviso**.
5. **"Sin respuesta" eliminado de 11 sitios — confirmar migración al 100% en BD**: Si algún lead no fue migrado, mostrará badge vacío en todas las vistas.
6. **4 commits en 56 minutos (12:41-13:37) — posibles builds intermedios con estado inconsistente**.
7. **Clientes anular/activar — confirmar endpoint `updateClienteStatus` en backend de producción**.
8. **EstadoInstalacionMultipleDialog — confirmar endpoint de actualización masiva de estado instalación**.
9. **GET /pagos/cobradores + parámetro `recibido_por` — confirmar ambos en backend**.
10. **Confirmación en 4 diálogos de pagos — si el monto es null/undefined, el render puede fallar**.
11. **TSC — commits de Clientes (15:11) y Pagos (17:22, 17:36) no documentan verificación de errores TypeScript**.
12. **9 commits en ~5 horas — confirmar con grep que estados eliminados no persisten en código no cubierto**.

---

## 📅 8 de Agosto, 2026

### Resumen de cambios (últimas 24h)

Sin commits nuevos de código. El único commit en las últimas 24h es "Analisis diario Claude" (generado automáticamente). No hay cambios en producción.

---

### Puede dar bateo

Sin cambios nuevos — sin riesgos nuevos.

---

#### Seguimientos vigentes

- **Permisos de "Preguntas Frecuentes" y "Datos a Averiguar" para comerciales — confirmar que las trabajadoras que los necesitan tienen los módulos asignados explícitamente en BD (Ago 15)**.
- **"Preguntas Frecuentes" y "Datos a Averiguar" modificables por cualquier comercial con permiso, sin audit trail — cambios afectan al wizard de WhatsApp en tiempo real (Ago 15)**.
- **`fix(permisos)` — `confirmar_vacio: true` requiere soporte en backend de producción; si el backend no lo maneja, guardado de permisos vacíos puede fallar (Ago 14)**.
- **`fix(permisos)` — revisar otros servicios en `api-services.ts` con `.catch(() => [])` sobre errores `success:false` del backend (Ago 14)**.
- **`feat(actualizaciones-felicity)` — página pública sin autenticación SunCar; confirmar seguridad de credenciales de Felicity y validación en backend del endpoint de subida (Ago 14)**.
- **`feat(preguntas-frecuentes)` sin RouteGuard — accesible a cualquier usuario autenticado; evaluar restricción de acceso si el contenido afecta al wizard (Ago 14)**.
- **`feat(numeros-prueba)` — endpoints de backend sin confirmar en producción (Ago 14)**.
- **`perf(chatwoot)` SSO paralelo — confirmar manejo de error cuando una rama paralela falla sin romper la otra (Ago 14)**.
- **`feat(peticiones)` — endpoint de backend sin confirmar en producción; módulo entero fallará si no está deployado (Ago 14)**.
- **`feat(chatwoot)` SSO — Platform API de Chatwoot puede haber cambiado en 5+ semanas desde el código original (Jul 6) (Ago 14)**.
- **Cherry-pick batch — confirmar que no hay otros arrastra de dependencias como el del directorio telefónico ya corregido (Ago 14)**.
- **Módulos WhatsApp solo visibles para superAdmin en dashboard pero rutas sin RouteGuard — accesibles con URL directa (Ago 14)**.
- **Denominaciones 5000 y 2000 CUP hardcodeadas en 3 diálogos — confirmar que no existe un 4° diálogo de pagos sin actualizar (Ago 12)**.
- **Railway auto-deploy: ventana de ~7 min (17:45-17:52) donde solo Registrar Pago tenía las nuevas denominaciones; confirmar que no quedaron registros con desglose incompleto (Ago 12)**.
- **Dirección de empresa — confirmar que NO quedan referencias a "Calle 24 #109 e/ 1ra y 3ra" en vales, reportes, informes u otros PDFs más allá de los 6 archivos corregidos (Ago 11)**.
- **FuenteSelector — confirmar persistencia de `fuente_referencia` en POST/PATCH leads y clientes en backend (Ago 10)**.
- **GestionarFuentesDialog — confirmar que reasignación de fuentes es atómica en backend (Ago 10)**.
- **Leads "Nuevo"/"Pendiente de pago" — revisar BD por leads persistidos con esos estados en ventana de ~6 min (12:41-12:47) (Ago 10)**.
- **"Pendiente de instalación" en 21 leads — modal de edición muestra campo vacío sin aviso (Ago 10)**.
- **"Sin respuesta" eliminado de 11 sitios — confirmar migración 100% en BD (Ago 10)**.
- **4 commits en 56 min leads 12:41-13:37 — confirmar builds intermedios sin datos inconsistentes (Ago 10)**.
- **Clientes anular/activar — confirmar endpoint `updateClienteStatus` en backend (Ago 10)**.
- **EstadoInstalacionMultipleDialog — confirmar endpoint de actualización masiva en backend (Ago 10)**.
- **GET /pagos/cobradores + parámetro `recibido_por` — confirmar ambos en backend (Ago 10)**.
- **Confirmación en 4 diálogos de pagos — confirmar que el monto nunca es null/undefined (Ago 10)**.
- **TSC — commits de Clientes y Pagos del 10 de Agosto no documentan verificación de errores TypeScript (Ago 10)**.
- **Anular lead cancela ofertas de confección en cascada — sin flujo de reversa confirmado (Ago 7)**.
- **Reactivar con `LEAD_DUPLICADO_TELEFONO` — usuario bloqueado sin navegación al duplicado ni opción de fusión (Ago 7)**.
- **Filtros leads migrados a backend — confirmar soporte en producción (Ago 7)**.
- **Paginación paralela de a 5 en exportación — puede saturar backend en listas grandes (Ago 7)**.
- **Endpoint de anular lead — confirmar existencia y cancelación de ofertas en backend (Ago 7)**.
- **Badge "Anulado" — confirmar mapeo en `ESTADO_CONFIG` (Ago 7)**.
- **Parámetro `activo` en `getLeads` — confirmar soporte en backend (Ago 7)**.
- **Bloques D-I de leads ausentes en main — UI en estado intermedio (Ago 7)**.
- **Sub-permiso `informe-direccion/cobros-pendientes` no aditivo — datos financieros visibles a todos los usuarios con `informe-direccion` sin asignación explícita (Ago 6)**.
- **Paginación 500 en 500 en cobros-pendientes sin cota total — puede causar timeout (Ago 6)**.
- **TSC incrementó 10 errores con cherry-pick informe-direccion — confirmar que no son regresiones silenciosas (Ago 6)**.
- **PDF cobros-pendientes columna "Oferta (nombre largo)" con ancho fijo — puede truncarse (Ago 6)**.
- **`sanitizarTelefono()` modifica el input silenciosamente (Ago 5)**.
- **Botón "Eliminar" leads sin gatear con permisos — visible para todos (Ago 5)**.
- **Backfill de sub-permisos leads — confirmar ejecución para los 26 trabajadores en producción (Ago 5)**.
- **Filtros de fecha por preset calculados en cliente — desfase timezone con backend en día borde (Ago 5)**.
- **`telefono_adicional_nombre` — confirmar soporte en endpoints POST/PATCH /leads/{id} (Ago 5)**.
- **Módulo distribucion-comerciales sin permisos asignados — invisible para todos hasta configuración (Ago 4)**.
- **Filtro equipo_comercial en Leads/Clientes — confirmar que el campo llega desde el backend (Ago 4)**.
- **Diálogo de asignación distribucion-comerciales — endpoint PATCH sin confirmar en backend (Ago 4)**.
- **Endpoint de KPIs comparativos sin confirmar en backend — informe-direccion fallará en runtime si no está deployado (Ago 3)**.
- **Sub-permisos informe-direccion — usuarios con permiso padre necesitan sub-permisos asignados (Ago 3)**.
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
- **Dos separadores de sub-permiso (`/` e `:`) — inconsistencia en el catálogo de permisos (Jul 5)**.
- **Landing `/instalaciones` vacía sin mensaje para usuario sin sub-permisos (Jul 5)**.
- **`lib/export-multi-sheet-service.ts` eliminado — confirmar sin imports residuales (Jul 3)**.
- **Mi Tarjeta — confirmar backend `/api/tarjetas/mi-tarjeta` listo para producción (Jul 3)**.
- **`compensacion`/`asumido_por_empresa` en OfertaConPagos — confirmar campos en backend (Jun 29)**.
- **`getBaseACobrar` sin manejo de null — cobros históricos pueden mostrar NaN (Jun 29)**.
- **Módulo Asistencia — endpoints de backend sin confirmar (Jun 26)**.
- **`graph.html`/`graph.json` en main — artefactos pesados sin uso en producción (Jun 26)**.
- **`hasExactPermission` — usuarios con almacenes-suncar sin subpermiso admin explícito perderán acceso (Jun 26)**.
- **DOCX Orden de Trabajo — generación en cliente puede fallar silenciosamente (Jun 26)**.
- **Reservas expiradas reactivadas — conflicto con materiales reasignados entre expiración y nueva fecha (Jun 23)**.
- **Lista blanca de CIs de pagos hardcodeada en frontend (Jun 23)**.
- **Gating editar cobros solo en frontend — endpoint sin validación de autorización en backend (Jun 23)**.
- **Devolución en vales facturados — transición de estado en backend (Jun 19)**.
- **Race condition en el cálculo de disponible de reservas**.
- **`pool=indistinto` para split automático — backend debe implementarlo**.
- **BMS como categoría reservable — docs sin `.pools` bloquean el 100% de reservas BMS**.
- **`GET /resumen-factura` — endpoint y estructura `$facet` sin confirmar**.
- **`$facet` aggregation — límite de 100MB de memoria de MongoDB**.
- **AdminPass 123456 hardcodeado**.
- **Eliminación lógica `cantidad = 0` en asignaciones**.
- **Subida de archivos sin rollback**.
- **`PATCH /facturas-solar-carros/{id}` — confirmar endpoint**.
- **Badge de estado calculado en frontend con flotantes**.
- **`cargo` en RRHH — confirmar aceptación en `PUT /{ci}/rrhh`**.
- **Badge "Facturado" con flotantes**.

---

> ⚠️ **Nota de mantenimiento**: Las entradas del **19, 20 y 21 de Junio** y del **23 de Junio** fueron eliminadas al superar los 7 días de antigüedad (política de retención semanal). La entrada del **26 de Junio** fue eliminada el 4 de Julio al superar los 7 días. La entrada del **28 de Junio** fue eliminada el 6 de Julio al superar los 7 días. La entrada del **29 de Junio** fue eliminada el 7 de Julio al superar los 7 días. La entrada del **30 de Junio** fue eliminada el 8 de Julio al superar los 7 días. Las entradas del **1 y 2 de Julio** fueron eliminadas el 10 de Julio al superar los 7 días. La entrada del **3 de Julio** fue eliminada el 11 de Julio al superar los 7 días. Las entradas del **4 y 5 de Julio** fueron eliminadas el 13 de Julio al superar los 7 días. La entrada del **6 de Julio** fue eliminada el 14 de Julio al superar los 7 días. La entrada del **7 de Julio** fue eliminada el 15 de Julio al superar los 7 días. La entrada del **8 de Julio** fue eliminada el 17 de Julio al superar los 7 días. La entrada del **10 de Julio** fue eliminada el 18 de Julio al superar los 7 días. La entrada del **11 de Julio** fue eliminada el 19 de Julio al superar los 7 días. La entrada del **13 de Julio** fue eliminada el 21 de Julio al superar los 7 días. La entrada del **14 de Julio** fue eliminada el 22 de Julio al superar los 7 días. La entrada del **15 de Julio** fue eliminada el 23 de Julio al superar los 7 días. La entrada del **17 de Julio** fue eliminada el 25 de Julio al superar los 7 días. La entrada del **18 de Julio** fue eliminada el 26 de Julio al superar los 7 días. La entrada del **19 de Julio** fue eliminada el 27 de Julio al superar los 7 días. La entrada del **20 de Julio** fue eliminada el 28 de Julio al superar los 7 días. La entrada del **21 de Julio** fue eliminada el 30 de Julio al superar los 7 días. La entrada del **22 de Julio** fue eliminada el 30 de Julio al superar los 7 días. La entrada del **23 de Julio** fue eliminada el 31 de Julio al superar los 7 días. La entrada del **24 de Julio** fue eliminada el 1 de Agosto al superar los 7 días. La entrada del **25 de Julio** fue eliminada el 2 de Agosto al superar los 7 días. La entrada del **26 de Julio** fue eliminada el 3 de Agosto al superar los 7 días. La entrada del **27 de Julio** fue eliminada el 4 de Agosto al superar los 7 días. La entrada del **28 de Julio** fue eliminada el 5 de Agosto al superar los 7 días. La entrada del **30 de Julio** fue eliminada el 7 de Agosto al superar los 7 días. La entrada del **31 de Julio** fue eliminada el 8 de Agosto al superar los 7 días. Las entradas del **1, 2 y 3 de Agosto** fueron eliminadas el 10 de Agosto al superar los 7 días. La entrada del **4 de Agosto** fue eliminada el 12 de Agosto al superar los 7 días. La entrada del **5 de Agosto** fue eliminada el 13 de Agosto al superar los 7 días. La entrada del **6 de Agosto** fue eliminada el 14 de Agosto al superar los 7 días. La entrada del **7 de Agosto** fue eliminada el 15 de Agosto al superar los 7 días. Anteriores eliminadas: 16, 17 y 18 de Junio, 5, 6, 7, 9, 11, 12 y 15 de Junio, y días de Mayo.
