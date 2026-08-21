# Registro de Análisis de Cambios — SunCarWeb

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

## 📅 18 de Agosto, 2026

### Resumen de cambios (últimas 24h)

Sin commits nuevos de código. El único commit del período es "Analisis diario Claude" (generado automáticamente). Los 2 commits reales de yany1509 del 17 de Agosto (preguntas frecuentes y fix de módulos WhatsApp) ya estaban cubiertos en el análisis de ayer.

---

### Puede dar bateo

Sin cambios nuevos — sin riesgos nuevos.

---

## 📅 17 de Agosto, 2026

### Resumen de cambios (últimas 24h)

**2 commits reales** — yany1509 (co-autorados con Claude Opus 5). Dos mejoras en los módulos de WhatsApp: buscador + marca de revisada en Preguntas Frecuentes, y fix de acceso silencioso a SunCar WhatsApp cuando el navegador bloquea la pestaña nueva.

---

### Área 1: Preguntas Frecuentes — buscador, revisada y ancho completo (1 commit — yany1509, 12:42)

- **`feat(preguntas-frecuentes): buscador, marca de revisada y ancho completo`** — Cuatro arreglos en la pantalla:
  1. **Layout**: el contenido quedaba tapado por la barra superior fija — se agrega `content-with-fixed-header`.
  2. **Ancho**: tabla pasa de `max-w-5xl` a ancho completo disponible.
  3. **Buscador**: filtra por pregunta y por respuesta.
  4. **Revisada**: casilla por fila con guardado inmediato (sin abrir formulario) y contador de cuántas van revisadas.

---

### Área 2: Módulos — fix de acceso silencioso a SunCar WhatsApp (1 commit — yany1509, 16:28)

- **`fix(modulos): el acceso a Suncar Whatsapp fallaba en silencio`** — Cuando el navegador bloquea `window.open()`, devuelve `null` y el enlace se perdía sin ningún aviso. Fix: si `window.open` devuelve `null`, se navega en la pestaña actual como fallback. Además, los errores que antes iban a `console.error` (y la pestaña se cerraba sola) ahora se muestran en un aviso en pantalla con el motivo real.

---

### Puede dar bateo

1. **Fallback a pestaña actual en SunCar WhatsApp — sesión SunCar puede perderse**: El SSO de Chatwoot fue diseñado para abrirse en pestaña nueva; si el navegador la bloquea y el fallback redirige en la misma pestaña, el usuario abandona el contexto de la app. Verificar que el flujo SSO completo funciona correctamente sin pestaña nueva y que el usuario pueda volver.

2. **Guardado inmediato de "revisada" — confirmar endpoint de backend**: El checkbox guarda sin abrir el formulario con un PATCH parcial al endpoint de FAQs. Si el backend no soporta el campo `revisada` o no acepta actualización parcial, el guardado falla silenciosamente y el estado se pierde al recargar.

3. **Buscador en cliente — confirmar que hay debounce**: Un buscador sin debounce dispara el filtrado en cada pulsación. Si el filtro hace llamadas al backend (en lugar de filtrar localmente), puede saturar la API con listas de FAQs grandes.

4. **Tabla a ancho completo — confirmar responsive en pantallas angostas**: Respuestas largas de FAQs sin word-wrap correcto pueden desbordar el layout en viewports pequeños o tabletas.

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

- **`feat(permisos): módulos del asistente de WhatsApp solo visibles para superadmin`**
- **`fix: quita el directorio telefónico, que no entra en esta release`**
- **`feat(numeros-prueba): página para gestionar los números de prueba del wizard`**
- **`fix(datos-a-averiguar): contenido tapado por el header fijo`**
- **`feat(datos-a-averiguar): página para gestionar lo que el asistente debe averiguar`**
- **`feat(preguntas-frecuentes): agrega la página al menú lateral (siempre visible)`**
- **`feat(preguntas-frecuentes): página para gestionar FAQ que usa el wizard`**
- **`feat(actualizaciones-felicity): página pública de subida (zh/en/es) + búsqueda interna`**
- **`feat(equipos-felicity): equipo de oficina como referencia de estado`**
- **`feat(equipos-felicity): nuevo módulo de monitoreo y administración FSolar`**
- **`feat(peticiones): módulo dedicado para superAdmin con resolución + terminada`**
- **`feat(solicitudes-desarrollo): botón flotante para reportar al equipo de desarrollo`**
- **`perf(chatwoot): paraleliza las llamadas a la Platform API en el SSO`**
- **`feat(chatwoot-sso): sincroniza la foto de perfil del usuario como avatar del agente`**
- **`feat(chatwoot): módulo Suncar WhatsApp con SSO automático`**

---

### Área 3: Reordenamiento módulos WhatsApp en dashboard (2 commits — yany1509, 14:36 y 19:26)

- **`feat(modulos): los módulos del asistente de WhatsApp pasan a Comercial Instaladora`**
- **`feat(modulos): el asistente de WhatsApp baja al final de Comercial Instaladora`**

---

### Puede dar bateo

1. **`fix(permisos)` — `confirmar_vacio: true` requiere soporte en backend de producción**: Confirmar que el deploy de SuncarBackend está activo.
2. **`fix(permisos)` — otros servicios en `api-services.ts` con `.catch(() => [])` sobre `success:false`**: Otros servicios siguen swallowing fallos del backend sin advertencia.
3. **Cherry-pick batch — posibles arrastra de dependencias en runtime no detectados en build**.
4. **`feat(actualizaciones-felicity)` — página pública sin autenticación SunCar; confirmar seguridad del login de Felicity y validación en backend del endpoint de subida**.
5. **`feat(preguntas-frecuentes)` — sin RouteGuard; accesible a cualquier usuario autenticado; afecta wizard en producción**.
6. **`feat(numeros-prueba)` — endpoints de backend sin confirmar en producción**.
7. **`perf(chatwoot)` — error handling en ramas paralelas del SSO cuando una falla sin romper la otra**.
8. **`feat(peticiones)` — endpoint de backend sin confirmar en producción; módulo entero fallará**.
9. **`feat(chatwoot)` SSO — Platform API de Chatwoot puede haber cambiado desde el código original del 6 de Julio**.
10. **Reordenamiento en 2 commits — ~5h con orden incorrecto en producción si Railway auto-deploy estaba activo**.
11. **Módulos WhatsApp solo visibles para superAdmin en dashboard pero rutas sin RouteGuard — accesibles con URL directa**.

---

#### Seguimientos vigentes

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

> ⚠️ **Nota de mantenimiento**: Las entradas del **19, 20 y 21 de Junio** y del **23 de Junio** fueron eliminadas al superar los 7 días de antigüedad (política de retención semanal). La entrada del **26 de Junio** fue eliminada el 4 de Julio al superar los 7 días. La entrada del **28 de Junio** fue eliminada el 6 de Julio al superar los 7 días. La entrada del **29 de Junio** fue eliminada el 7 de Julio al superar los 7 días. La entrada del **30 de Junio** fue eliminada el 8 de Julio al superar los 7 días. Las entradas del **1 y 2 de Julio** fueron eliminadas el 10 de Julio al superar los 7 días. La entrada del **3 de Julio** fue eliminada el 11 de Julio al superar los 7 días. Las entradas del **4 y 5 de Julio** fueron eliminadas el 13 de Julio al superar los 7 días. La entrada del **6 de Julio** fue eliminada el 14 de Julio al superar los 7 días. La entrada del **7 de Julio** fue eliminada el 15 de Julio al superar los 7 días. La entrada del **8 de Julio** fue eliminada el 17 de Julio al superar los 7 días. La entrada del **10 de Julio** fue eliminada el 18 de Julio al superar los 7 días. La entrada del **11 de Julio** fue eliminada el 19 de Julio al superar los 7 días. La entrada del **13 de Julio** fue eliminada el 21 de Julio al superar los 7 días. La entrada del **14 de Julio** fue eliminada el 22 de Julio al superar los 7 días. La entrada del **15 de Julio** fue eliminada el 23 de Julio al superar los 7 días. La entrada del **17 de Julio** fue eliminada el 25 de Julio al superar los 7 días. La entrada del **18 de Julio** fue eliminada el 26 de Julio al superar los 7 días. La entrada del **19 de Julio** fue eliminada el 27 de Julio al superar los 7 días. La entrada del **20 de Julio** fue eliminada el 28 de Julio al superar los 7 días. La entrada del **21 de Julio** fue eliminada el 30 de Julio al superar los 7 días. La entrada del **22 de Julio** fue eliminada el 30 de Julio al superar los 7 días. La entrada del **23 de Julio** fue eliminada el 31 de Julio al superar los 7 días. La entrada del **24 de Julio** fue eliminada el 1 de Agosto al superar los 7 días. La entrada del **25 de Julio** fue eliminada el 2 de Agosto al superar los 7 días. La entrada del **26 de Julio** fue eliminada el 3 de Agosto al superar los 7 días. La entrada del **27 de Julio** fue eliminada el 4 de Agosto al superar los 7 días. La entrada del **28 de Julio** fue eliminada el 5 de Agosto al superar los 7 días. La entrada del **30 de Julio** fue eliminada el 7 de Agosto al superar los 7 días. La entrada del **31 de Julio** fue eliminada el 8 de Agosto al superar los 7 días. Las entradas del **1, 2 y 3 de Agosto** fueron eliminadas el 10 de Agosto al superar los 7 días. La entrada del **4 de Agosto** fue eliminada el 12 de Agosto al superar los 7 días. La entrada del **5 de Agosto** fue eliminada el 13 de Agosto al superar los 7 días. La entrada del **6 de Agosto** fue eliminada el 14 de Agosto al superar los 7 días. La entrada del **7 de Agosto** fue eliminada el 15 de Agosto al superar los 7 días. La entrada del **8 de Agosto** fue eliminada el 17 de Agosto al superar los 7 días. La entrada del **10 de Agosto** fue eliminada el 18 de Agosto al superar los 7 días. La entrada del **11 de Agosto** fue eliminada el 19 de Agosto al superar los 7 días. La entrada del **12 de Agosto** fue eliminada el 20 de Agosto al superar los 7 días. La entrada del **13 de Agosto** fue eliminada el 21 de Agosto al superar los 7 días. Anteriores eliminadas: 16, 17 y 18 de Junio, 5, 6, 7, 9, 11, 12 y 15 de Junio, y días de Mayo.
