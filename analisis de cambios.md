# Registro de Análisis de Cambios — SunCarWeb

---

## 📅 8 de Mayo, 2026

### Resumen de cambios (últimas 24h)

**Áreas: Fichas de Costo (reescritura mayor), inventario stock mínimo, solicitudes/materiales, ventas, averías**

| Commit | Autor | Descripción |
|--------|-------|-------------|
| `5952a48` | Fabian1820 | feat(fichas-costo): nuevo EditarPreciosDialog para edición rápida de precios |
| `c0ed0b6` | Fabian1820 | feat(fichas-costo): tooltips en códigos/nombres + campo número de serie |
| `08501d6` | Fabian1820 | refactor(fichas-costo): layout responsivo, quita min-width fijo en tabla |
| `9435956` | Ruben/Claude | feat(ficha-costo): campo Impuesto nacional (%) sobre CIF global |
| `b06dc7a` | Fabian1820 | feat(fichas-costo): stockaje mínimo en EditarPreciosDialog + StockajesMinimosSection |
| `15c43dc` | Ruben/Claude | refactor(ficha-costo): simplificar modelo — elimina Δ% por producto, precios manuales editables |
| `c4a5b69` | Ruben/Claude | feat(inventario): exportar análisis de stock mínimo a Excel (.xlsx) |
| `c19c6a7` | Ruben/Claude | fix(solicitudes-ventas): eliminar comisión Stripe del link de pago |
| `3fd5b73` | Ruben0304 | fix(solicitudes-materiales): priorizar material_id real en normalizeSearchMaterial |
| `70972b0` | Ruben0304 | fix: buscador de materiales en solicitudes no mostraba resultados |
| `fb7b0d8` | Ruben/Claude | refactor(facturas): renombrar tabs en cobros clientes |
| `0838d8d` | Fabian1820 | feat(envio-contenedor): búsqueda debounced de materiales (reemplaza SearchableSelect) |
| `308a5f1` | yany1509 | "solcitudes corregido" — sin descripción |
| `35a8145` | yany1509 | "solicitudes" — sin descripción |
| `d0d1a5f` | yany1509 | "averias" — sin descripción |
| `38559d3` | yany1509 | "averias" — sin descripción |
| `2fc3dc4` | yany1509 | "ventas" — sin descripción |
| `b04d962` | yany1509 | "comerciales de ventas y ofertas" — sin descripción |
| `3b9f8b2` | yany1509 | "jj" — sin descripción |
| `653cff0` | Fabian1820 | "hvhjvhjv" — sin descripción |

### Análisis de riesgos y consideraciones

#### 🔴 Riesgos altos

1. **Módulo Fichas de Costo reescrito en menos de 3 horas con modelo de datos cambiante**
   - 6 commits sucesivos modifican los mismos componentes entre las 19:48 y las 21:29. El commit final (`15c43dc`) **elimina el campo Δ% por producto** que commits anteriores del mismo día acababan de agregar. Señal de que el modelo no estaba definido al comenzar.
   - **Acción urgente:** Verificar coherencia de la versión final: que EditarPreciosDialog no tenga referencias al campo Δ% eliminado, que los valores guardados/cargados sean correctos y que no haya campos huérfanos en el esquema del backend.

2. **Impuesto nacional (%) sobre CIF — riesgo de double-apply**
   - La fórmula es `CIF_efectivo = CIF × (1 + impuesto/100)`. Si el CIF almacenado en BD ya incluye el impuesto de una sesión anterior, al abrir y guardar de nuevo se aplicará dos veces.
   - **Acción urgente:** Confirmar que `impuesto_nacional` se guarda como campo separado del CIF base, y que el cálculo se aplica solo en tiempo de visualización/precio final, no sobre el CIF almacenado.

3. **10 commits sin descripción útil en áreas críticas**
   - yany1509: "ventas", "comerciales de ventas y ofertas", "averias"×2, "solicitudes"×2, "jj". Fabian1820: "hvhjvhjv".
   - Afectan ventas, averías y solicitudes — flujos clave del negocio, completamente inauditables.
   - **Acción recomendada:** Probar end-to-end las tres áreas. Implementar hook de pre-commit que rechace mensajes menores a 10 caracteres.

4. **normalizeSearchMaterial — cambio de prioridad con efecto en 4 módulos**
   - El fix prioriza `material_id` (ObjectId real) sobre `id` (código). Correcto para `/productos/materiales`, pero afecta también `vales-salida`, `salida-lote-form` y `completar-visita-dialog`.
   - Si alguno de esos módulos dependía del comportamiento anterior, fallará silenciosamente devolviendo null o referencias rotas.
   - **Acción recomendada:** Probar búsqueda y selección de materiales en los 4 módulos afectados.

#### 🟡 Riesgos medios

5. **Eliminación de comisión Stripe con flag `sin_recargo` — dependencia del backend**
   - El frontend pasa `sin_recargo` al route de generación de link. Si el backend no fue desplegado con este flag, se generarán links con precio incorrecto (con comisión incluida).
   - **Consideración:** Verificar que el endpoint `/api/stripe/generar-link` en producción acepta y procesa `sin_recargo`. Probar end-to-end con una solicitud de venta real.

6. **StockajesMinimosSection + stockaje_minimo en EditarPreciosDialog — potencial doble fuente de verdad**
   - El campo stockaje mínimo es editable en el dialog y también se muestra en la sección de análisis de stock. Si usan endpoints o campos distintos, mostrarán valores inconsistentes sin error visible.
   - **Consideración:** Confirmar que ambos componentes leen y escriben al mismo campo en el mismo endpoint.

7. **Búsqueda debounced en envio-contenedor — implementación custom sin manejo de errores evidente**
   - Reemplaza SearchableSelect por lógica propia. Riesgos típicos: ¿qué pasa si la API falla? ¿hay estado de error visible? ¿el debounce limpia resultados al borrar el input?
   - **Consideración:** Probar casos edge: 0 resultados, fallo de API, selección de material y luego edición del texto de búsqueda.

8. **Export Excel de stock mínimo — dependencia de librería xlsx**
   - Si `xlsx` no está declarado en `package.json`, el build en producción fallará aunque funcione en local.
   - El coloreado de celdas por estado (rojo/amarillo/verde) requiere soporte de estilos en la versión de `xlsx` utilizada.
   - **Consideración:** Verificar que `xlsx` está en `dependencies` (no solo en dev) y que la versión soporta `cellStyles`.

#### 🟢 Mejoras positivas

9. **EditarPreciosDialog — edición de precios directo desde la tabla**
   - Mejora significativa del flujo de trabajo del equipo de compras sin necesidad de navegar a otro módulo.

10. **Impuesto nacional como campo global en ficha de costo**
    - Cubre importaciones con aranceles variables por envío. Más flexible que hardcodear el porcentaje.

11. **Exportación Excel del análisis de stock mínimo con colores por estado**
    - Facilita reportes para gestión de almacén sin depender de la interfaz web.

12. **Buscador de materiales en solicitudes corregido**
    - El fix de `normalizeSearchMaterial` resuelve un bug donde todos los materiales del endpoint web retornaban vacíos. Mejora directa en un flujo crítico del negocio.

---

## 📅 5 de Mayo, 2026

### Resumen de cambios (últimas 24h)

**Áreas: Integración Stripe en solicitudes-ventas, corrección fórmula comisión Stripe, campo costo_nuevo en ficha de envío-contenedores, facturas/pagos clientes**

| Commit | Autor | Descripción |
|--------|-------|-------------|
| `cb579f7` | Ruben/Claude | feat(solicitudes-ventas): agregar generación de links de pago Stripe + panel de pagos |
| `5d077ba` | Ruben/Claude | fix(solicitudes-ventas): corregir endpoint `/api/stripe/listar-pagos` |
| `5290742` | Ruben/Claude | feat(solicitudes-ventas): mover botón generar link al modal de detalle |
| `ac5aa75` | Ruben/Claude | fix(stripe): reemplazar comisión fija 5% por fórmula real 3.25% + $0.30 en 5 archivos |
| `fc3fb2d` | Ruben/Claude | feat(envio-contenedores): campo `costo_nuevo` editable en ficha de costo |
| `57ec947` | yany1509 | "facturas de ventas y pagos" — cambios sin descripción |
| `babf805` | yany1509 | "ajustes en solicitudes ventas" |
| `512bc86` | yany1509 | "Merge: Combine payment management tabs with Stripe modal integration" |
| `ff6dab0` | yany1509 | "terminada" |
| `312a84d` / `3931374` / `64de30f` | yany1509 | "ajustes" x3 |
| `b34ac82` / `575030f` | yany1509 | "listo" / "listoooo" |
| `289d36b` | yany1509/Claude | Agregar botón Cobros Stripe en pestaña pendientes-pago |
| `5b21cba` | yany1509/Claude | Cobros Stripe en pendientes: botón header + botón por fila + modal filtrado |
| `9255eb4` | yany1509/Claude | Mover botón Ver Stripe al interior del modal de pago |
| `9c718f9` | yany1509/Claude | Fix carga pagos Stripe: agregar `solicitudId` a deps de `useCallback` |
| `1777296` | yany1509/Claude | Mostrar todos los pagos Stripe sin filtrar por solicitud |
| `0c0489e` | yany1509/Claude | Fix: quitar filtro `solicitud_venta_id` que ocultaba todos los pagos |
| `f808c2d` | yany1509/Claude | Usar `StripePagosModal` igual que facturación/pagos clientes |
| `033c271` | yany1509 | Ignorar directorio `.claude` del repo (.gitignore) |

### Análisis de riesgos y consideraciones

#### 🔴 Riesgos altos

1. **Fórmula de comisión Stripe cambiada en 5 archivos simultáneamente**
   - De `precio * 1.05` (5% fijo) a `(neto + 0.30) / (1 - 0.0325)` (3.25% + $0.30).
   - Archivos afectados: `generar-link` (route), `ofertas`, `ofertas-personalizadas`, `confeccion`, `solicitudes-ventas`.
   - Si alguno de los 5 quedó sin actualizar o con la lógica antigua, habrá inconsistencia de precios cobrados entre módulos.
   - **Acción urgente:** Verificar en cada uno de los 5 archivos que se aplica exactamente la misma fórmula. Hacer prueba end-to-end con montos conocidos.

2. **Ciclo de 4 fixes consecutivos en el modal Stripe de solicitudes-ventas en menos de 10 minutos**
   - `9c718f9` → `1777296` → `0c0489e` → `f808c2d` (20:46–20:56). Patrón de debug en producción.
   - El filtro por `solicitud_venta_id` fue añadido y luego eliminado. La lógica de alcance del modal no quedó clara.
   - **Acción recomendada:** Confirmar el comportamiento esperado: ¿el modal de una solicitud específica debe mostrar solo sus pagos o todos?

3. **7 commits con mensajes vagos de yany1509**
   - "terminada", "ajustes" ×3, "listo", "listoooo", "ajustes en solicitudes ventas". Cambios sin auditoría posible.
   - **Acción recomendada:** Revisar los diffs de estos commits manualmente antes de considerar estable la rama.

#### 🟡 Riesgos medios

4. **`StripePagosModal` sin filtrado por `solicitud_venta_id`**
   - Ahora muestra todos los pagos Stripe del sistema. Si el botón por fila pasa `solicitudId` como prop, verificar que ese filtrado está activo; si no, el usuario verá pagos de otras solicitudes mezclados.

5. **Campo `costo_nuevo` propagado automáticamente a precios de catálogo**
   - `costo_nuevo = CIF × (1 + (%Envío + Δ) / 100)`. Si `Δ` se aplica sobre datos ya procesados (double-apply), todos los precios del catálogo afectado quedarán mal.
   - **Acción recomendada:** Verificar que "Guardar" aplica la fórmula una sola vez sin efecto acumulativo.

6. **Merge commit entre commits de funcionalidad activa**
   - Merge de `main` realizado mientras se subían cambios en cadena. Puede haber mezclado versiones inconsistentes del modal.

#### 🟢 Mejoras positivas

7. Integración completa de Stripe en solicitudes-ventas con generación de links y panel de pagos.
8. Fórmula de comisión más precisa (3.25% + $0.30) garantiza neto exacto al proveedor.
9. `.claude` agregado al `.gitignore` — evita subir archivos internos de sesión.

---

## 📅 4 de Mayo, 2026

### Resumen de cambios (últimas 24h)

**Áreas: Centro de Control (mapa períodos), nuevo módulo Asignaciones a Empleados, clientes/leads/facturas, solicitudes de materiales y ventas, almacenes**

| Commit | Autor | Descripción |
|--------|-------|-------------|
| `19addb6` | Ruben/Claude | feat: módulo completo Asignaciones a Empleados (CRUD medios básicos y herramientas) |
| `cfdb27c` | Ruben/Claude | feat: tipos y métodos de servicio para periodo/municipio en centro-control |
| `706b081` | Ruben/Claude | fix: mapa de períodos en Centro Control — 4 modos, click handlers y reactividad geoKey |
| `a583f6a` | yany1509 | "ajustes en cliente" — clientes, leads, facturas, nuevo util oferta-confeccion-items (410 cambios en 9 archivos) |
| `0a1dab7` | Fabian1820 | "stock ok" — rework de diálogos solicitudes-materiales y solicitudes-ventas (296 cambios) |
| `99e02ec` | Fabian1820 | "export stock all ok" — exportación de stock en almacén |
| `e70ffa4` | Fabian1820 | "vhj" — ajustes en página de almacén |
| `38a1969` | Fabian1820 | "mbj" — ajuste en create-solicitud-material-dialog |

### Análisis de riesgos y consideraciones

#### 🔴 Riesgos altos

1. **Commit `a583f6a` (yany1509) — scope real muy amplio para "ajustes en cliente"**
   - Toca 9 archivos: `clients-table.tsx` (196 cambios), `facturas-section.tsx` (54 cambios), más leads, clientes, y nuevo archivo `lib/utils/oferta-confeccion-items.ts`.
   - Total: 259 adiciones / 151 eliminaciones. Cambio masivo con mensaje que no describe el alcance real.
   - **Acción urgente:** Probar end-to-end: listado/detalle de clientes, leads, sección de facturas y asignación de oferta genérica.

2. **Commit `0a1dab7` (Fabian1820) — "stock ok" reescribe dos diálogos críticos**
   - `create-solicitud-material-dialog.tsx`: 84 adiciones / 64 eliminaciones.
   - `upsert-solicitud-venta-dialog.tsx`: 79 adiciones / 69 eliminaciones.
   - Ambos son flujos clave del negocio sin descripción auditable.
   - **Acción recomendada:** Probar creación de solicitudes de materiales y de ventas end-to-end.

#### 🟡 Riesgos medios

3. **Nuevo módulo Asignaciones a Empleados**
   - Módulo CRUD completo nuevo con comboboxes buscables y catálogos.
   - **Acción recomendada:** Verificar que los endpoints de catálogos (medios básicos, herramientas) están desplegados en backend antes de mostrar el módulo a usuarios.

4. **Fix `periodoRange` usa `.start/.end` en lugar de índices**
   - Si algún consumidor de `periodoRange` fuera del componente no fue actualizado, fallará devolviendo `undefined` como fecha.
   - **Consideración:** Buscar `periodoRange[0]` o `periodoRange[1]` en el codebase.

5. **Secuencia de commits iterativos en almacén (Fabian1820)**
   - `e70ffa4` y `99e02ec` modificaron la misma página en commits seguidos. Patrón de desarrollo sin pruebas intermedias.

#### 🟢 Mejoras positivas

6. Centro de Control con cobertura completa de 4 modos de mapa de períodos y click handlers.
7. Módulo Asignaciones a Empleados con comboboxes buscables y modales con tabs.

---

## 📅 3 de Mayo, 2026

### Resumen de cambios (últimas 24h)

Sin commits de desarrollo nuevos. Solo el commit automático de "Analisis diario Claude".

#### Consideraciones pendientes

- El commit `c4f92e5` de yany1509 (ayer) sobre `confeccion-ofertas-view` debe revisarse manualmente para confirmar que no reintroduce la lógica de valores stale corregida el mismo día.
- El módulo de clientes (refactor masivo en `14ecc37`, 2308 líneas cambiadas) requiere prueba end-to-end en staging.
- `PersonalMessageOverlay` montado en `layout.tsx` (todas las páginas) debe verificarse con manejo de errores adecuado antes de producción.

---

## 📅 2 de Mayo, 2026

### Resumen de cambios (últimas 24h)

**Áreas: Módulo de ofertas de confección (edición), módulo de clientes, contabilidad**

| Commit | Autor | Descripción |
|--------|-------|-------------|
| `9e42fee` | Ruben/Claude | fix: garantizar remount completo del diálogo de edición de ofertas (3 capas) |
| `21754ed` | Ruben/Claude | fix: margen_comercial muestra valor stale al reabrir diálogo de edición |
| `d0694e9` | Ruben/Claude | fix: usar `margenPorMaterialCalculado` (useMemo) en save de ofertas confección |
| `8e600be` | Ruben/Claude | fix: ajuste menor en módulo de contabilidad — nuevo `PersonalMessageOverlay` |
| `14ecc37` | yany1509 | "ajustes en solicitudes y trabajos diarios" — **en realidad: refactor masivo del módulo de clientes** |
| `c4f92e5` | yany1509 | "ofertas" — ajustes en `confeccion-ofertas-view` y `ofertas-confeccionadas-view` |

### Análisis de riesgos y consideraciones

#### 🔴 Riesgos altos

1. **Commit `14ecc37` de yany1509: mensaje engañoso + cambio masivo**
   - El mensaje dice _"ajustes en solicitudes y trabajos diarios"_ pero los archivos modificados son exclusivamente del módulo de clientes.
   - **Magnitud real:** 832 adiciones, 1476 eliminaciones (2308 líneas totales).
   - **Acción urgente:** Probar en staging la creación y edición de clientes end-to-end.

2. **Commit `c4f92e5` de yany1509 — colisión con los fixes de Claude**
   - Modifica los mismos archivos recién corregidos (`confeccion-ofertas-view.tsx`, `ofertas-confeccionadas-view.tsx`). Puede haber reintroducido el bug de stale values.
   - **Acción recomendada:** Confirmar que no revierte `estadoInicial = null` ni el uso de `margenPorMaterialCalculado`.

#### 🟡 Riesgos medios

3. **Triple capa de protección contra valores stale**
   - `editarDialogKey` fuerza remount completo: puede causar parpadeo en conexiones lentas.
   - `cache: 'no-store'` agrega un round-trip de red en cada apertura del diálogo de edición.

4. **`PersonalMessageOverlay` en `app/layout.tsx` (todas las páginas)**
   - Un error de render puede romper el layout completo. Verificar manejo de errores.

#### 🟢 Mejoras positivas

5. Resolución definitiva del bug de stale state en edición de ofertas.
6. Refactor del módulo de clientes: reducción neta de ~644 líneas.

---

## 📅 1 de Mayo, 2026

### Resumen de cambios (últimas 24h)

Sin commits de desarrollo nuevos desde el análisis de ayer. Solo el commit automático de "Analisis diario Claude".

#### Consideraciones del día

- El cambio de tipo de retorno de `getStock` (April 30) merece prueba en todos sus consumidores hoy en staging.
- Los nuevos endpoints del Centro de Control deben estar verificados en producción antes de cualquier release.

---
