# Registro de Análisis de Cambios — SunCarWeb

---

## 📅 12 de Mayo, 2026

### Resumen de cambios (últimas 24h)

**Áreas: Wallet (UX + paginación server-side + filtros), Facturas/Tickets (formato + fix fecha), Envíos de Contenedores (estados + creación rápida de materiales), Pagos/Facturas Ventas (campo comercial), Vales de Salida (filtro tipo), Tasa de Cambio/Baterías/Pagos CUP (yany1509)**

| Commit | Autor | Descripción |
|--------|-------|-------------|
| `f5ee1e26` | Ruben/Claude | feat(wallet): código de moneda en historial, scroll horizontal, modal distribución por billetera, badge "Pendiente de aceptación" |
| `b9a3357b` | Ruben/Claude | feat(wallet): paginación real (50/página) + filtros server-side (fechas, búsqueda debounced, propias) |
| `4b0a0aed` | Ruben/Claude | feat(wallet): filtro "Con persona" por contraparte_ci + chip Transferencias + fix pendientes ver_todos |
| `2fbaa333` | Ruben/Claude | fix(wallet): transferencias globales en violeta sin signo +/- en vista todos |
| `d9acb0cb` | Ruben/Claude | fix(wallet): usuarios con ver_todos ven todas las pendientes del sistema (direction='all') |
| `5a1ad271` | Fabian1820 | refactor(ticket): ajustar formato a 58mm |
| `2c3f8602` | Fabian1820 | refactor(ticket): optimizar formato a 48mm, reducir márgenes, mejorar tipografía |
| `347f2ea1` | Claude | fix(facturas-ventas): corregir desfase de fecha UTC/local + exportar todas las facturas en un PDF (mergeado PR #1) |
| `e02367d7` | Fabian1820 | feat(envios-contenedores): QuickMaterialCreateDialog — creación rápida de materiales desde formulario |
| `a45053c2` | Fabian1820 | feat(envios-contenedores): estados despachado → solicitado/enviado/arribado |
| `d6929bb9` | Fabian1820 | feat(facturas-ventas): campo 'comercial' en FacturaClienteVenta + búsqueda |
| `8687e937` | Fabian1820 | feat(pagos-clientes-ventas): campo 'comercial' en PagoVenta y SolicitudVentaSummary |
| `3873b9ab` | Fabian1820 | feat(clientes-ventas): valor por defecto 'SunCar' para comercial sin asignar |
| `cc8244ef` | Fabian1820 | feat(pagos-clientes-ventas): mostrar emitida_por_nombre con fallback a emitida_por |
| `b538cbcc` | Fabian1820 | refactor(todos-pagos-planos-table): eliminar funcionalidad de edición de pagos |
| `343c9dbb` | Fabian1820 | feat(vales-salida): filtro por tipo (material/venta) |
| `a3eba0a1` | yany1509 | "ajustes en exportar de facturas, nuevos filtros y campos en las tablas" |
| `3fb6ca2c` | yany1509 | "pagos en cup intaladora" |
| `907ba4bf` | yany1509 | "ajustes en tasa de cambio" |
| `92cfd107` | yany1509 | "pagos en tasa de cambio" |
| `326cf098` | yany1509 | "mostrar todas las. baterias" |
| `36f6d0b7` | yany1509 | "ajusts" |
| `f6f36278` | yany1509 | "ajustes" |
| `4d229091` | yany1509 | "ajustes" |

### Análisis de riesgos y consideraciones

#### 🔴 Riesgos altos

1. **Wallet — paginación/filtros completamente server-side; filtrado client-side eliminado**
   - El historial ya no filtra en el frontend. Los parámetros `q`, `propias`, `from_date`, `to_date`, `contraparte_ci`, `page`, `page_size` deben ser soportados por el endpoint del backend.
   - Si el backend no reconoce alguno de estos params, el historial puede aparecer vacío o retornar todos los registros sin filtrar.
   - **Acción urgente:** Verificar en LlegoBackend que el endpoint de transacciones del wallet acepta y procesa estos parámetros.

2. **Cambio de estados en envíos de contenedores: `despachado` → `solicitado` / `enviado` / `arribado`**
   - Si el backend tiene validaciones de enum o constraints en BD, los registros existentes con estado `despachado` fallarán al intentar actualizarse o mostrarse.
   - El valor por defecto del formulario fue cambiado a `solicitado`.
   - **Acción urgente:** Verificar con el backend que los nuevos valores son aceptados y ejecutar migración para registros existentes si necesario.

3. **Iteración rápida en formato de ticket (3 commits, ancho cambia 80mm → 58mm → 48mm)**
   - Dos refactors consecutivos en menos de 15 minutos apuntan a prueba en producción. El ancho final (48mm) puede no ser compatible con todas las impresoras térmicas en uso.
   - **Acción recomendada:** Probar impresión física con una impresora de 48mm y confirmar que el ancho es el correcto antes de considerar cerrado.

4. **yany1509 — 8 commits vagos sobre tasa de cambio, baterías, pagos CUP**
   - "pagos en tasa de cambio", "ajustes en tasa de cambio", "mostrar todas las. baterias", "pagos en cup intaladora", más 3 "ajustes" sin contexto. Afectan módulos de pagos activos.
   - **Acción recomendada:** Revisar diffs manualmente antes de asumir estabilidad en los módulos de tasa de cambio y baterías.

#### 🟡 Riesgos medios

5. **Wallet — `direction='all'` en pendientes para usuarios `ver_todos`**
   - El frontend ahora llama al endpoint con este parámetro. Si el backend no lo soporta, los usuarios con `ver_todos` verán solo sus propias pendientes (o error). Verificar en LlegoBackend.

6. **Campos `comercial` en múltiples interfaces (PagoVenta, FacturaClienteVenta, SolicitudVentaSummary)**
   - Si el backend no incluye el campo en sus responses, aparecerá como `undefined` sin error visible. Los valores se mostrarán vacíos en las tablas.
   - El valor por defecto "SunCar" se aplica solo cuando el campo es `null`/vacío — verificar que la lógica de display es consistente con lo que retorna el backend.

7. **QuickMaterialCreateDialog — creación rápida de materiales en envíos de contenedores**
   - El hook `useMaterials` fue extendido para exponer `categories` y `createProduct`. Si el modelo de "material" no coincide exactamente con el de "producto" en el backend, se crearán entidades en el lugar incorrecto o fallará la creación.
   - Verificar que el flujo completo: crear material → seleccionarlo en el form → guardar el envío funciona end-to-end.

8. **`emitida_por_nombre` en facturas — campo nuevo con fallback**
   - La lógica es `emitida_por_nombre || emitida_por`. Si el backend no retorna `emitida_por_nombre`, sigue funcionando. Sin riesgo de rotura pero el campo puede estar ausente hasta que el backend lo implemente.

9. **Eliminación de edición de pagos en TodosPagosPlanosTable**
   - Se eliminó el dialog de edición y su estado. Verificar que no hay otro flujo en la app que dependa de esta funcionalidad ahora eliminada.

#### 🟢 Mejoras positivas

10. **Fix de desfase de fecha UTC/local en facturas** — soluciona el bug real donde las fechas mostraban un día anterior al esperado (parseo `new Date("YYYY-MM-DD")` interpretado como UTC).
11. **Exportar todas las facturas en un PDF único** respetando filtros activos — muy útil para reportes mensuales.
12. **Paginación server-side de 50 registros/página** — mejora significativa de performance para equipos con alto volumen de transacciones.
13. **Badge "Pendiente de aceptación"** para transferencias ajenas — evita confusión de permisos mostrando contexto en lugar de botones deshabilitados.
14. **Filtro "Con persona" en wallet** — facilita auditoría de transacciones con un colaborador específico.
15. **Chip "Transferencias"** en historial — permite aislar rápidamente los movimientos de tipo transferencia.

---

## 📅 11 de Mayo, 2026

### Resumen de cambios (últimas 24h)

**Áreas: Módulo Wallet (refactor masivo), Ficha de Costo/Envíos de Contenedores, RRHH, Ventas/Comerciales (yany1509)**

| Commit | Autor | Descripción |
|--------|-------|-------------|
| `d23761a` | Ruben/Claude | feat(wallet): nuevo módulo wallet-manager y filtrado del historial por permisos |
| `f701d49` | Ruben/Claude | feat(wallet): mostrar billeteras del equipo inline con detalle expandible |
| `97c5378` | Ruben/Claude | feat(wallet): wallet visible para todos + buscador en transferencias |
| `d0926bf` | Ruben/Claude | feat(pagos): enviar recibido_por_ci para depósito automático en wallet |
| `f30cc77` | Ruben/Claude | feat(wallet): hero multi-moneda, formulario multi-moneda y totales del equipo |
| `39f8959` | Ruben/Claude | fix(wallet): ocultar billeteras del equipo sin saldo |
| `1f1e9dc` | Ruben/Claude | feat(wallet): mostrar top 6 billeteras del equipo, resto por buscador |
| `0b4716d` | Ruben/Claude | refactor(wallet): eliminar selector de fuente e integración bancaria |
| `bfab04a` | Ruben/Claude | feat(wallet): transferencias requieren aceptación del destinatario |
| `c89603` | Ruben/Claude | feat(wallet): historial más intuitivo con detalle por transacción |
| `350a3a6` | Ruben/Claude | refactor(wallet): unificar transferencias pendientes en una sola lista |
| `37f3f31` | Ruben/Claude | feat(wallet): toggle Propias/Todas, totales incluyen propia, transfer a cualquier trabajador |
| `d0eed82` | Ruben/Claude | feat(rrhh): agregar campo teléfono a trabajadores en CRUD de recursos humanos |
| `47f5de2` | Ruben/Claude | feat(rrhh): hacer editable el nombre del trabajador en la tabla |
| `1bc4486` | Fabian1820 | Mejoras en gestión de precios en módulo de envíos de contenedores |
| `347aed9` | Fabian1820 | Refactorización cálculo de precios ficha de costo: separa recargo e impuesto_porcentaje |
| `510e7e7` | yany1509 | "cobros por ofertas y nuevo modulo" — sin descripción |
| `669e8e1` | yany1509 | "pagos ventas" — sin descripción |
| `5914722` | yany1509 | "ventas" — sin descripción |
| `0eba2a1` | yany1509 | "comisiones ventas" — sin descripción |
| `e2210bc` | yany1509 | "ventas y mauricio" — sin descripción |
| `22bfd1a` | yany1509 | "ajustes en ventas solictiudes" — sin descripción |
| `94e2a76` | yany1509 | "orden" — sin descripción |
| `b1c49dc` | yany1509 | "descuehto free" — sin descripción |

### Análisis de riesgos y consideraciones

#### 🔴 Riesgos altos

1. **El flujo de transferencias pendientes requiere múltiples endpoints nuevos de backend que podrían no existir aún**
   - `POST /wallet/wallets/ensure` — inicializa wallet automáticamente para destinatarios sin una
   - `POST /wallet/pending-transfers` — crea la transferencia pendiente
   - `PUT /wallet/pending-transfers/{id}/accept`
   - `PUT /wallet/pending-transfers/{id}/reject`
   - `DELETE /wallet/pending-transfers/{id}` (cancelar)
   - Si alguno no existe, el flujo de transferencias rompe silenciosamente o con 404 sin feedback claro al usuario.
   - **Acción urgente:** Verificar que todos estos endpoints existen en LlegoBackend antes de usar en producción.

2. **`recibido_por_ci` en endpoint de pagos — auto-depósito en wallet no confirmado**
   - El commit asume que el backend detecta este campo y acredita automáticamente la billetera del trabajador con el CI correspondiente. Si el backend lo ignora, los pagos se procesan sin acreditar ninguna billetera.
   - **Acción urgente:** Confirmar en LlegoBackend que el endpoint de pagos maneja `recibido_por_ci`.

3. **8 commits vagos de yany1509 en el día** ("descuehto free", "orden", "comisiones ventas", "ajustes en ventas solictiudes", "ventas", "ventas y mauricio", "pagos ventas", "cobros por ofertas y nuevo modulo")
   - Afectan ventas, comerciales, cobros por ofertas. Sin auditoría posible. "cobros por ofertas y nuevo modulo" sugiere un módulo nuevo sin documentación.
   - **Acción recomendada:** Revisar diffs de estos commits manualmente antes de considerar estable el módulo de ventas.

#### 🟡 Riesgos medios

4. **Wallet ahora visible para todos los usuarios (sin RouteGuard)**
   - Todo usuario autenticado puede acceder a `/wallet`. Verificar que los permisos granulares (`ver_todos`, etc.) ocultan correctamente las billeteras ajenas y que el backend valida pertenencia en cada operación.

5. **Separación de `recargo` e `impuesto_porcentaje` en ficha de costo — rompe fichas existentes si el backend no actualiza su modelo**
   - El refactor cambia los campos enviados al guardar una ficha. Si el backend espera el campo unificado anterior, los cálculos de precios en envíos de contenedores serán incorrectos.
   - **Acción recomendada:** Verificar que el payload de guardado coincide exactamente con lo que el backend espera.

6. **Toggle "Propias/Todas" en historial**
   - Verificar que cuando está en "Todas", el endpoint retorna realmente todas las transacciones del equipo y no solo las del usuario autenticado.

7. **RRHH — campos editables (nombre y teléfono) dependen del backend**
   - Si el endpoint de actualización de trabajadores no acepta `nombre` o `telefono`, los cambios se pierden silenciosamente.

#### 🟢 Mejoras positivas

8. **Multi-moneda en wallet (USD, EUR, CUP)** — interfaz más clara para equipos que operan con varias divisas simultáneamente.
9. **Transferencias con flujo de aceptación** — evita transferencias accidentales; el destinatario puede rechazar antes de que se acredite.
10. **Wallet automático en transferencias** — `ensure` previene errores de "destinatario sin wallet" en producción.
11. **Separación recargo/impuesto en ficha de costo** — cálculos más transparentes y auditables.
12. **Nombre editable inline en RRHH** — mejora UX evitando abrir modal para cambios simples.

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

7. **Secuencia iterativa de commits en fichas-costo (6 commits de Fabian1820 en ~2h)**
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
