# Registro de Análisis de Cambios — SunCarWeb

---

## 📅 23 de Mayo, 2026

### Resumen de cambios (últimas 24h)

Sin commits de desarrollo nuevos en las últimas 24h. Solo el commit automático "Analisis diario Claude" del 22/05.

#### Seguimientos vigentes

- **AdminPass 123456 hardcodeado**: Al crear cualquier trabajador se asigna automáticamente `123456` como contraseña. Sin mecanismo de forzar cambio en el primer login — brecha de seguridad operativa.
- **Auto-sync catálogo → BD al abrir /permisos**: Si el catálogo tiene un módulo mal definido, se crearán registros incorrectos en BD sin posibilidad de rollback automático.
- **Logs de debug en producción**: Los logs de `fetchTrabajosDeAveria` pueden seguir activos, exponiendo datos de clientes en la consola del navegador.
- **Eliminación lógica `cantidad = 0` en asignaciones**: Todo el código que lista asignaciones debe filtrar `cantidad > 0`, o los registros eliminados aparecerán como activos.
- **Creación inline sin persistencia inmediata**: Categorías/unidades creadas desde el atajo "Crear material rápido" se pierden si el usuario cierra el diálogo antes de guardar.
- **Subida de archivos sin rollback**: Si la subida de foto/ficha técnica tiene éxito pero la creación del material falla, el archivo queda huérfano en storage.
- **Backend debe aceptar nuevos campos**: `motivo` y `nota` en PATCH de asignaciones; `foto` y `ficha_tecnica_url` en materiales; `oferta_venta_id`, `descuento_free`, `motivo_descuento_free` y `precio` en solicitudes desde oferta.
- **`childKeys` en catálogo de módulos**: Si se agrega un módulo hijo sin declarar `childKeys`, el card padre quedará invisible aunque el usuario tenga el permiso.
- **`useEffect` con dependencias `[open, initialData?.id]`**: Si `initialData` cambia el contenido pero mantiene el mismo `id`, el formulario del contenedor no se reinicializa.

---

## 📅 22 de Mayo, 2026

### Resumen de cambios (últimas 24h)

Sin commits de desarrollo nuevos en las últimas 24h.

#### Seguimientos vigentes

- **AdminPass 123456 hardcodeado**: Al crear cualquier trabajador se asigna automáticamente `123456` como contraseña. Sin mecanismo de forzar cambio en el primer login — brecha de seguridad operativa.
- **Auto-sync catálogo → BD al abrir /permisos**: Si el catálogo tiene un módulo mal definido, se crearán registros incorrectos en BD sin posibilidad de rollback automático.
- **Logs de debug en producción**: Los logs de `fetchTrabajosDeAveria` pueden seguir activos, exponiendo datos de clientes en la consola del navegador.
- **Eliminación lógica `cantidad = 0` en asignaciones**: Todo el código que lista asignaciones debe filtrar `cantidad > 0`, o los registros eliminados aparecerán como activos.
- **Creación inline sin persistencia inmediata**: Categorías/unidades creadas desde el atajo "Crear material rápido" se pierden si el usuario cierra el diálogo antes de guardar.
- **Subida de archivos sin rollback**: Si la subida de foto/ficha técnica tiene éxito pero la creación del material falla, el archivo queda huérfano en storage.
- **Backend debe aceptar nuevos campos**: `motivo` y `nota` en PATCH de asignaciones; `foto` y `ficha_tecnica_url` en materiales; `oferta_venta_id`, `descuento_free`, `motivo_descuento_free` y `precio` en solicitudes desde oferta.
- **`childKeys` en catálogo de módulos**: Si se agrega un módulo hijo sin declarar `childKeys`, el card padre quedará invisible aunque el usuario tenga el permiso.
- **`useEffect` con dependencias `[open, initialData?.id]`**: Si `initialData` cambia el contenido pero mantiene el mismo `id`, el formulario del contenedor no se reinicializa.

---

## 📅 20 de Mayo, 2026

### Resumen de cambios (últimas 24h)

**17 commits** — autores: Fabian1820 y yany1509.

#### Cambios por área

**Permisos y Dashboard (Fabian1820)**
- `feat(permisos)`: Catálogo único de módulos en `lib/modulos-catalogo.ts` como single source of truth. Auto-sync al abrir `/permisos`: detecta módulos faltantes en BD y los crea automáticamente. Botón "Sincronizar Catálogo" para gestionar huérfanos. UI rediseñada del diálogo de permisos por trabajador (secciones, sub-permisos, tabs de tiendas/almacenes, copia de permisos). AdminPass default **123456** asignado automáticamente al crear cualquier trabajador.
- `fix(dashboard)`: Módulos `envio-contenedores` y `fichas-costo` ocultados como cards independientes (flag `hideFromDashboard`). Asignaciones de Recursos movido a RRHH. Nuevo campo `childKeys` para que un card padre sea visible si el usuario tiene permiso a un hijo lógico que no sigue la convención `padre/hijo`.

**Envío de Contenedores (Fabian1820)**
- `feat(envio-contenedores)`: El atajo "Crear material rápido" ahora soporta foto, ficha técnica (PDF/Word/Excel ≤10MB) y creación inline de categoría, unidad y marca. Nuevos botones "+" junto a cada selector.
- `fix(envio-contenedores)`: Corregido bug que reseteaba el formulario al crear un material desde el atajo (dependencias del useEffect limitadas a `[open, initialData?.id]`).
- `fix(envios-contenedores)`: Corregido zebrado de tabla (filas impares ahora usan `bg-gray-50` plano en lugar de `bg-gray-50/40` con opacidad).

**Asignaciones (Fabian1820)**
- `feat(asignaciones)`: Eliminación lógica — en lugar de eliminar, se establece `cantidad: 0` y se requiere seleccionar un motivo. Nuevos campos `motivo` y `nota` en el payload.

**Averías / Trabajos Diarios (yany1509)**
- `feat(averias)`: Simplificado flujo — eliminado botón "Guardar", solo "Cerrar día". `handleCloseDay` reescrito con un solo PATCH. Cards de averías con historial de trabajos diarios expandible (lazy load).
- `fix(averias)`: Muestra trabajos aunque `averia_id` no esté guardado (fallback a todos los trabajos AVERIA del cliente).
- `fix`: Carga TODAS las averías (Pendiente + Solucionada). Toggle "Solo pendientes / Ver todas". Envía `hay_pendiente` como boolean en el PATCH.
- `feat`: Eliminada sección expandible de trabajos diarios del card de avería (ya visible en panel de registro). Limpiados `console.log` de `getTrabajosByCliente`.

**Ofertas / Ventas (yany1509)**
- `fix`: Preservado `aumento_porcentaje` en `normalizeMaterialesPayload` (antes se descartaba silenciosamente antes de enviar al backend).
- `fix`: Al crear solicitud desde oferta ahora se envían `oferta_venta_id`, `descuento_free`, `motivo_descuento_free` y `precio` del material.

**Limpieza (Fabian1820)**
- `chore(cleanup)`: Eliminados módulos huérfanos (ordenes-trabajo, whatsapp, estadisticas, catálogo viejo de ofertas, etc.). Limpieza de exports muertos en `lib/api-services.ts` y `lib/api-types.ts`.
- `chore(docs)`: Borrados 231 archivos `.md` de análisis efímeros.

---

#### Puede dar bateo

1. **AdminPass 123456 hardcodeado** — Al crear cualquier trabajador se asigna automáticamente `123456` como contraseña del dashboard. No hay mecanismo de forzar cambio en el primer login. Brecha de seguridad operativa.

2. **Auto-sync catálogo → BD al abrir /permisos** — Si el catálogo tiene un módulo mal definido (typo en la key, datos inválidos), se crearán registros incorrectos en BD en el próximo deploy. Sin validación previa ni transacción que haga rollback, los módulos basura quedan en BD y son difíciles de limpiar.

3. **Logs de debug en producción** — El commit de debug (16:08) añadió logs en `getTrabajosByCliente` **y** `fetchTrabajosDeAveria`. El commit posterior solo menciona haber limpiado los de `getTrabajosByCliente`. Los logs de `fetchTrabajosDeAveria` pueden seguir activos, exponiendo datos de clientes en la consola del navegador en producción.

4. **Eliminación lógica `cantidad = 0` en asignaciones** — Todo el código que lista asignaciones (vistas, APIs, reportes) debe filtrar `cantidad > 0`, de lo contrario los registros "eliminados" aparecerán como activos. Riesgo alto si alguna vista o endpoint no aplica el filtro.

5. **Creación inline sin persistencia inmediata** — Las nuevas categorías y unidades creadas desde el atajo "Crear material rápido" solo se guardan cuando el material es guardado. Si el usuario cierra el diálogo antes de guardar, estas entidades se pierden sin ninguna advertencia.

6. **Subida de archivos sin rollback** — Si la subida de foto/ficha técnica tiene éxito pero la creación del material falla, el archivo queda huérfano en el servidor de archivos (no se elimina, no se asocia). Genera basura en storage de forma progresiva.

7. **Backend debe aceptar nuevos campos** — Los siguientes campos son nuevos y el backend debe admitirlos, o las operaciones fallarán silenciosamente o con 422:
   - `motivo` y `nota` en el PATCH de asignaciones (eliminación lógica)
   - `foto` y `ficha_tecnica_url` en el endpoint de materiales
   - `oferta_venta_id`, `descuento_free`, `motivo_descuento_free` y `precio` en la creación de solicitudes desde oferta

8. **`childKeys` en catálogo de módulos** — Si se agrega un módulo hijo que no sigue la convención `padre/hijo` y se olvida declarar `childKeys`, el card padre quedará invisible aunque el usuario tenga el permiso. Bug silencioso difícil de rastrear.

9. **`useEffect` con dependencias limitadas `[open, initialData?.id]`** — Si `initialData` cambia el contenido pero mantiene el mismo `id` (edición parcial que retorna el mismo objeto actualizado), el formulario del contenedor no se reinicializa. Riesgo bajo pero real en flujos de edición rápida consecutiva.

---
