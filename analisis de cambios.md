# Registro de Análisis de Cambios — SunCarWeb

---

## 📅 13 de Mayo, 2026

### Resumen de cambios (últimas 24h)

**Áreas: Wallet (mejoras server-side), Obras/Instaladora (nuevo módulo), Tiendas (nuevo CRUD), Ticket (formato), Facturas-Ventas (fix fecha + PDF bulk), Campo Comercial, Envíos Contenedores (estados + creación rápida), Pagos Planos, Vales Salida, Tasa de Cambio, Baterías**

| Commit | Autor | Descripción |
|--------|-------|-------------|
| `f8ad00c` | yany1509 | "facturas en obras" |
| `30cb189` | yany1509 | "obras terminadas" |
| `dd7935a` | yany1509 | "filtros" |
| `a9ebdb1` | yany1509 | "ajustes" |
| `487dd23` | yany1509 | "nombre del cliente en obras terminadas" |
| `b977e5c` | Fabian1820 | feat(tiendas): nueva página de gestión de tiendas con CRUD completo |
| `a3eba0a` | yany1509 | "ajustes en exportar de facturas, nuevos filtros y campos en las tablas" |
| `a45053c` | Fabian1820 | feat(envios-contenedores): reemplaza 'despachado' por 'solicitado', 'enviado', 'arribado' |
| `b538cbc` | Fabian1820 | refactor(todos-pagos-planos-table): elimina funcionalidad de edición de pagos |
| `343c9db` | Fabian1820 | feat(vales-salida): nuevo filtro por tipo (material/venta) |
| `cc8244e` | Fabian1820 | feat(pagos-clientes-ventas): mostrar emitida_por_nombre con fallback a emitida_por |
| `3873b9a` | Fabian1820 | feat(clientes-ventas): mostrar 'SunCar' como valor por defecto de comercial |
| `326cf09` | yany1509 | "mostrar todas las baterias" |
| `3fb6ca2` | yany1509 | "pagos en cup instaladora" |
| `8687e93` | Fabian1820 | feat(pagos-clientes-ventas): campo 'comercial' en tabla de pagos y solicitudes |
| `d6929bb` | Fabian1820 | feat(facturas-ventas): campo 'comercial' en facturas e interfaz |
| `e02367d` | Fabian1820 | feat(envios-contenedores): QuickMaterialCreateDialog para crear materiales inline |
| `d9acb0c` | Ruben/Claude | fix(wallet): usuarios con ver_todos ven todas las pendientes del sistema |
| `36f6d0b` | yany1509 | "ajusts" |
| `f6f3627` | yany1509 | "ajustes" |
| `92cfd10` | yany1509 | "pagos en tasa de cambio" |
| `907ba4b` | yany1509 | "ajustes en tasa de cambio" |
| `2fbaa33` | Ruben/Claude | fix(wallet): transferencias globales como entrada neutral sin signo ni color direccional |
| `4b0a0ae` | Ruben/Claude | feat(wallet): filtro por transferencias, por contraparte y fix pendientes ver_todos |
| `2c3f860` | Fabian1820 | refactor(ticket): ajustar formato a 48mm |
| `5a1ad27` | Fabian1820 | refactor(ticket): ajustar formato a 58mm |
| `b9a3357` | Ruben/Claude | feat(wallet): paginación y filtros server-side en historial de transacciones |
| `f5ee1e2` | Ruben/Claude | feat(wallet): mejorar UX del historial y transferencias pendientes |
| `4d22909` | yany1509 | "ajustes" |
| `347f2ea` | Claude (PR #1) | fix(facturas-ventas): corregir desfase de fecha UTC + exportar todas las facturas en un PDF |

### Análisis de riesgos y consideraciones

#### 🔴 Riesgos altos

1. **Estado 'despachado' eliminado en envíos contenedores — posible ruptura de datos existentes**
   - Los registros ya guardados con `estado = 'despachado'` no corresponden a ninguno de los nuevos valores (`solicitado`, `enviado`, `arribado`).
   - Si el backend valida el enum en operaciones UPDATE/GET, las peticiones sobre registros antiguos devolverán error.
   - Si no valida, los registros quedan huérfanos: el UI no mostrará su estado correctamente y los filtros por estado los excluirán.
   - **Acción urgente:** Ejecutar una migración de datos en producción para mapear `'despachado'` al nuevo estado equivalente (`'enviado'` o `'arribado'`), y actualizar el enum del backend si aplica.

2. **Nuevo módulo Obras/Instaladora — dependencia de endpoints no confirmados**
   - 5 commits con mensajes vagos ("obras terminadas", "facturas en obras", "pagos en cup instaladora", "filtros", "nombre del cliente") introducen un módulo nuevo.
   - El módulo asume endpoints de backend para CRUD de obras y sus facturas. Si no existen, el módulo fallará silenciosamente con 404 sin feedback claro al usuario.
   - **Acción urgente:** Verificar en LlegoBackend que existen endpoints para obras terminadas y sus facturas antes de usar en producción.

3. **Wallet paginación server-side — el historial depende completamente del backend**
   - El hook ya no filtra en el cliente. Si el backend no implementa los parámetros `page`, `per_page`, `desde`, `hasta`, `q`, `propias`, `tipo`, `contraparte_ci`, el historial mostrará siempre los mismos N registros sin posibilidad de filtrar ni paginar.
   - **Acción urgente:** Confirmar en LlegoBackend que `GET /wallet/transactions` acepta y procesa todos estos parámetros.

#### 🟡 Riesgos medios

4. **Ticket format: 80mm → 58mm → 48mm en dos commits consecutivos el mismo día**
   - Iteración rápida sin tiempo de prueba entre versiones. El tamaño final (48mm) puede no ser compatible con todas las impresoras térmica del equipo.
   - **Acción recomendada:** Probar impresión física en las impresoras reales antes de considerar el formato estable.

5. **Eliminación del editing en todos-pagos-planos**
   - La funcionalidad fue eliminada completamente (no deshabilitada). Si un pago fue registrado con error, ya no hay flujo de corrección desde esta tabla.
   - **Consideración:** Confirmar que es un cambio intencional y que existe otro mecanismo para corregir pagos erróneos.

6. **QuickMaterialCreateDialog en envíos contenedores — estado inconsistente si falla la creación**
   - Si el material se crea exitosamente en el backend pero la selección automática en el form falla (error de estado, re-render, etc.), el material queda creado en el catálogo pero el campo del formulario queda vacío.
   - **Acción recomendada:** Verificar el flujo completo: crear material → selección automática → guardar envío → material aparece correctamente en el detalle.

7. **Vista global de pendientes (`ver_todos`) — dependencia de parámetro `direction=all` en el backend**
   - El hook envía `direction=all` cuando el usuario tiene `ver_todos`. Si el backend ignora este parámetro, el usuario con permisos admin seguirá viendo solo sus propias pendientes.

8. **`emitida_por_nombre` con fallback a `emitida_por`**
   - Si el backend retorna el campo vacío (string vacío en lugar de null), el fallback no se activa y se mostrará una cadena vacía en la tabla de facturas.
   - **Consideración:** Revisar que el condicional chequea `|| !value` además de `!field`.

9. **Comercial 'sin-asignar' renombrado a 'SunCar (predeterminado)'**
   - Si hay lógica en otros componentes que compara el valor del selector con el string `'sin-asignar'`, ese código dejará de funcionar.
   - **Acción recomendada:** Buscar en el codebase referencias al string `'sin-asignar'` y verificar que ninguna depende del label visible.

10. **4 commits vagos de yany1509** ("ajustes" ×2, "ajusts", "ajustes en exportar de facturas") **sobre tasa de cambio y exportación de facturas**
    - Cambios en áreas sensibles (exportación, tasa de cambio) sin descripción de qué se modificó.
    - **Acción recomendada:** Revisar los diffs de estos commits antes de considerar estables esas funcionalidades.

#### 🟢 Mejoras positivas

11. **Fix desfase de fecha en facturas** — corrección importante: `new Date("YYYY-MM-DD")` se interpretaba como UTC y restaba un día en zona horaria Cuba. Ahora se parsea en hora local.
12. **Exportar todas las facturas en un PDF** — nuevo botón que genera un PDF por página respetando los filtros activos.
13. **Campo comercial en facturas, pagos y clientes-ventas** — mejor trazabilidad de qué comercial gestionó cada operación.
14. **Nuevo módulo Tiendas (CRUD completo)** — bien documentado con dialogs de creación/edición y confirmación de borrado.
15. **Filtro por tipo en vales de salida** — mejor segmentación entre vales de material y de venta.
16. **Wallet: paginación real server-side (50 reg/página)** — escalabilidad para equipos con historial extenso.
17. **Wallet: filtro por contraparte** — permite encontrar rápidamente transacciones con una persona específica.
18. **Transferencias globales en vista neutral (violeta, sin +/-)** — elimina confusión en la vista admin sobre si una transferencia es ingreso o gasto.

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
