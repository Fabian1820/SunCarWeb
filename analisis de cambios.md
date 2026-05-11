# Registro de Análisis de Cambios — SunCarWeb

---

## 📅 10 de Mayo, 2026

### Resumen de cambios (últimas 24h)

Sin commits de desarrollo nuevos. Solo el commit automático de "Analisis diario Claude".

#### Consideraciones del día

- Sin actividad nueva hoy.
- Seguimientos activos de la semana:
  - **Flag `sin_recargo`**: confirmar en LlegoBackend que el route de generación de link omite la comisión Stripe cuando está presente.
  - **Fichas de costo — doble-apply de fórmula**: verificar que al abrir y guardar repetidamente una ficha existente, los precios no se inflan progresivamente.
  - **Campo `stockaje_minimo`**: confirmar que el backend persiste el campo y que `StockajesMinimosSection` no muestra siempre 0 como mínimo.
  - **Campo `numero_serie`**: confirmar que `FichaCostoService` incluye el campo en el payload de actualización.
- No hay riesgos nuevos que reportar.

---

## 📅 9 de Mayo, 2026

### Resumen de cambios (últimas 24h)

**Áreas: Fichas de Costo (nuevas funcionalidades), Inventario (Excel), Envío de Contenedores (búsqueda), Solicitudes-Ventas (fix Stripe), Ventas/Comerciales (commits vagos)**

| Commit | Autor | Descripción |
|--------|-------|-------------|
| `6ffb2ad` | Fabian1820 | Merge branch 'main' |
| `0838d8d` | Fabian1820 | feat(envio-contenedor): búsqueda debounced de materiales por código/nombre en `EnvioContenedorFormDialog`, reemplaza `SearchableSelect` |
| `2fc3dc4` | yany1509 | "ventas" — cambios sin descripción |
| `b04d962` | yany1509 | "comerciales de ventas y ofertas" — cambios sin descripción |
| `15c43dc` | Ruben/Claude | refactor(ficha-costo): simplificar modelo de precios — elimina Δ% por producto, todos usan el mismo % envío; precios venta e instaladora editables manualmente con reset al sugerido; elimina columna Desviación, botón Prorratear y Aplicar sugerencia |
| `b06dc7a` | Fabian1820 | feat(fichas-costo): nuevo `StockajesMinimosSection` para comparar stock vs mínimos; campo stockaje mínimo en `EditarPreciosDialog`; `FichaCostoService` actualizado |
| `9435956` | Ruben/Claude | feat(ficha-costo): campo Impuesto nacional (%) sobre CIF — porcentaje global que incrementa CIF de todos los productos antes de calcular precios |
| `08501d6` | Fabian1820 | refactor(fichas-costo): ajuste de layout y ancho de tabla para responsividad |
| `c0ed0b6` | Fabian1820 | feat(fichas-costo): tooltips en códigos/nombres de materiales; campo número de serie en `EditarPreciosDialog`; `FichaCostoService` actualizado |
| `5952a48` | Fabian1820 | feat(fichas-costo): nuevo `EditarPreciosDialog` para edición rápida de precios desde la tabla; `MaterialSearchDialog` con filtro por serie |
| `c4a5b69` | Ruben/Claude | feat(inventario): exportar análisis de stock mínimo a Excel — .xlsx con hoja resumen y hoja detalle con filas coloreadas por estado (rojo/amarillo/verde) |
| `653cff0` | Fabian1820 | "hvhjvhjv" — cambios sin descripción |
| `c19c6a7` | Ruben/Claude | fix(solicitudes-ventas): eliminar comisión Stripe del link de pago — SunCar asume el costo; flag `sin_recargo` en el route para diferenciarlo del flujo de confección |

### Análisis de riesgos y consideraciones

#### 🔴 Riesgos altos

1. **Simplificación del modelo de precios en fichas-costo puede romper fichas existentes**
   - Se eliminó el Δ% por producto; ahora todos usan el mismo % de envío global.
   - Las fichas guardadas que tenían Δ% individuales por producto habrán perdido esa diferenciación silenciosamente.
   - **Acción urgente:** Verificar el comportamiento al abrir fichas existentes. Confirmar si los precios se recalculan automáticamente o conservan los valores guardados.

2. **Flag `sin_recargo` en solicitudes-ventas depende del backend**
   - El frontend añade el flag `sin_recargo` al route de generación de link de pago. Si el backend (LlegoBackend) no implementa el manejo de este flag, la comisión Stripe seguirá calculándose igual que antes, cobrando de más al cliente.
   - **Acción urgente:** Confirmar en LlegoBackend que el route de `generar-link` detecta `sin_recargo` y omite la fórmula `(neto + 0.30) / (1 - 0.0325)` cuando está presente.

3. **Commits sin descripción: "ventas" (yany1509), "comerciales de ventas y ofertas" (yany1509), "hvhjvhjv" (Fabian1820)**
   - Cambios desconocidos en módulos activos de ventas y comerciales. Sin auditoría posible.
   - **Acción recomendada:** Revisar los diffs manualmente antes de asumir que estas áreas son estables.

#### 🟡 Riesgos medios

4. **Riesgo de doble-aplicación de fórmula en fichas-costo**
   - El nuevo flujo calcula `costo_nuevo = CIF × (1 + %envío/100) × (1 + %impuesto/100)`.
   - Si el usuario abre una ficha ya guardada, modifica un campo y vuelve a guardar, ¿aplica la fórmula sobre el CIF original o sobre el `costo_nuevo` ya persistido?
   - Un doble-apply inflaría progresivamente todos los precios.
   - **Acción recomendada:** Verificar que el campo de entrada siempre es el CIF base, no el costo derivado.

5. **`StockajesMinimosSection` puede mostrar comparaciones incorrectas si el campo de mínimo aún no está en el backend**
   - El campo `stockaje_minimo` se acaba de agregar en `EditarPreciosDialog`. Si el backend no lo persiste aún, la sección de comparación siempre mostrará 0 como mínimo, haciendo que todos los ítems aparezcan en estado OK.
   - **Consideración:** Verificar que el endpoint de guardado de precios incluye y persiste el campo `stockaje_minimo`.

6. **Campo de número de serie en `EditarPreciosDialog` — integración con backend no confirmada**
   - El campo fue añadido al formulario. Si el endpoint de guardado no lo incluye en el payload o el backend no lo mapea, el dato se pierde silenciosamente.
   - **Acción recomendada:** Confirmar que `FichaCostoService` incluye `numero_serie` en el body del request de actualización.

7. **Sequencia iterativa de commits en fichas-costo (6 commits de Fabian1820 en ~2h)**
   - Patrón de desarrollo incremental rápido sin tests intermedios. Riesgo de regresiones entre funcionalidades del mismo módulo.
   - **Consideración:** Probar el flujo completo de fichas-costo: búsqueda de material → edición de precios → stockaje mínimo → guardado → verificación en tabla.

#### 🟢 Mejoras positivas

8. **Eliminación de comisión Stripe en solicitudes-ventas** — SunCar absorbe el costo correctamente; el cliente paga exactamente el precio acordado.
9. **Exportación a Excel del análisis de stock mínimo** — xlsx profesional con resumen y detalle coloreado por estado, útil para reportes de compras.
10. **Búsqueda debounced en envío de contenedores** — mejora significativa de UX para catálogos con muchos materiales, evita renders excesivos.
11. **Impuesto nacional (%) sobre CIF** — permite modelar aranceles/impuestos de importación de forma global sin tocar precio por precio.
12. **Tooltips y número de serie en fichas-costo** — mejora la trazabilidad de materiales en el catálogo.

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

3. **7 commits con mensajes vagos de yany1509** ("terminada", "ajustes" ×3, "listo", "listoooo", "ajustes en solicitudes ventas")
   - **Acción recomendada:** Revisar los diffs de estos commits manualmente antes de considerar estable la rama.

#### 🟡 Riesgos medios

4. **`StripePagosModal` sin filtrado por `solicitud_venta_id`**
   - Ahora el modal muestra todos los pagos Stripe del sistema. Verificar que cuando se abre desde una fila específica recibe y aplica correctamente `solicitudId`.

5. **Campo `costo_nuevo` propagado automáticamente a precios de catálogo**
   - Verificar que "Guardar" aplica la fórmula una sola vez y que no hay efecto acumulativo al abrir y guardar repetidamente.

#### 🟢 Mejoras positivas

6. **Integración completa de Stripe en solicitudes-ventas** — generación de links, panel de pagos, consistencia con flujo de cobros clientes.
7. **Fórmula de comisión más precisa (3.25% + $0.30)** — garantiza que el monto neto recibido sea exactamente el precio base configurado.
8. **`.claude` agregado al `.gitignore`** — evita que archivos internos de sesión se suban accidentalmente.

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
   - Toca 9 archivos, 259 adiciones / 151 eliminaciones. Incluye nuevo archivo `lib/utils/oferta-confeccion-items.ts`.
   - **Acción urgente:** Probar end-to-end: listado y detalle de clientes, creación/edición de leads, sección de facturas, y asignación de oferta genérica.

2. **Commit `0a1dab7` (Fabian1820) — "stock ok" reescribe dos diálogos críticos**
   - `create-solicitud-material-dialog.tsx` y `upsert-solicitud-venta-dialog.tsx`. Flujos clave del negocio sin descripción del cambio.
   - **Acción recomendada:** Probar la creación de solicitudes de materiales y de ventas end-to-end.

#### 🟡 Riesgos medios

3. **Nuevo módulo Asignaciones a Empleados** — verificar que los endpoints de catálogos están disponibles en producción.
4. **Fix `periodoRange` usa `.start/.end`** — buscar si `periodoRange[0]` o `periodoRange[1]` aún existen en algún archivo del codebase.
5. **Secuencia iterativa en almacén page** — verificar funcionalidad de exportación de stock completa en staging.

#### 🟢 Mejoras positivas

6. **Centro de Control: cobertura completa de los 4 modos del mapa de períodos** con click handlers y densidad correcta.
7. **Módulo Asignaciones a Empleados** con comboboxes buscables y modales con tabs.

---

## 📅 3 de Mayo, 2026

### Resumen de cambios (últimas 24h)

Sin commits de desarrollo nuevos. Solo el commit automático de "Analisis diario Claude".

#### Consideraciones pendientes

- El commit `c4f92e5` de yany1509 (mayo 2) sobre `confeccion-ofertas-view` debe revisarse manualmente para confirmar que no reintroduce la lógica de valores stale corregida el mismo día.
- El módulo de clientes (refactor masivo en `14ecc37`, 2308 líneas cambiadas) requiere prueba end-to-end en staging.
- `PersonalMessageOverlay` montado en `layout.tsx` (todas las páginas) debe verificarse con manejo de errores adecuado antes de producción.

---
