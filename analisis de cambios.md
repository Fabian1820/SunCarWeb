# Registro de Análisis de Cambios — SunCarWeb

---

## 📅 16 de Mayo, 2026

### Resumen de cambios (últimas 24h)

Sin commits de desarrollo nuevos. Solo el commit automático de "Analisis diario Claude" de ayer.

#### Consideraciones del día

- Sin actividad nueva hoy.
- Los riesgos identificados el 15 de mayo permanecen **abiertos y pendientes de verificación en LlegoBackend**:

  - **[URGENTE] Tasa de cambio EUR vs CUP:** Verificar que el estado final del código diferencia correctamente EUR (multiplicar) de CUP (dividir). Hacer prueba end-to-end con montos conocidos en cada moneda.
  - **[URGENTE] `aumento_porcentaje` y `aumento_tipo`:** Confirmar que el backend persiste estos campos; sin ello el precio mostrado al cliente diferirá del precio procesado.
  - **[URGENTE] Endpoints de paginación:** `/cobros-paginado` y `/personalizadas/pendientes-paginado` deben existir y funcionar con todos los filtros.
  - **[URGENTE] Endpoint eliminar pago:** Necesario para el rollback cuando falla la creación de factura.
  - **Commits RRHH de yany1509 sin descripción (6 commits "rh"/"recursos humanos"):** Revisar diffs manualmente — afectan un módulo activo sin auditoría posible.
  - **Módulo "Compras, Envíos y Costos":** Confirmar que la página destino está implementada y no muestra pantalla vacía o 404.
  - **Descuento free hardcodeado por nombre "Loydis Batista Carrazana":** A mediano plazo mover la lógica de permisos al backend.

---

## 📅 15 de Mayo, 2026

### Resumen de cambios (últimas 24h)

**Áreas: Ventas/Ofertas (aumento por material, descuento free), Inventario (stock, movimientos, transferencias), Cobros/Pagos (paginación server-side, rollback factura), Dashboard (nuevo módulo), Timezone, RRHH (commits vagos)**

| Commit | Autor | Descripción |
|--------|-------|-------------|
| `9374d45` | yany1509/Claude | feat(ventas): campo aumento por material en ofertas y solicitudes |
| `3d9102b` | yany1509/Claude | fix: eliminar inversión de tasa |
| `26641506` | yany1509/Claude | revert: restaurar inversión de tasa al enviar al backend |
| `240407b1` | yany1509/Claude | fix: enviar tasa de cambio sin inversión (valor exacto del usuario) |
| `97268483` | yany1509/Claude | fix: corregir cálculo USD para pagos en EUR (multiplicar, no dividir) |
| `8e4ce5e7` | yany1509/Claude | mostrar badge descuento free en panel de ofertas de solicitudes |
| `838fcc35` | yany1509/Claude | activar descuento free al cargar oferta en solicitudes de venta |
| `99da7387` | yany1509/Claude | mostrar descuento free y motivo en listado de ofertas |
| `f2eae6b1` | yany1509/Claude | corregir descuento free en ofertas: payload y vista detalle |
| `f2313856` | yany1509/Claude | mejorar layout desktop del dialog de ofertas y overlay |
| `3d7f4206` | yany1509/Claude | descuento free en ofertas de clientes-ventas para Loydis |
| `4b793c7f` | Fabian1820 | feat(inventario): número de serie en StockTable |
| `8580df7f` | Fabian1820/Claude | feat(dashboard): nuevo módulo "Compras, Envíos y Costos" |
| `712af078` | Fabian1820/Claude | feat(inventario): stockaje mínimo editable + StockajesMinimosSection |
| `ddf38b30` | Fabian1820/Claude | refactor(inventario): resolveMaterial en MovimientosTable y SolicitudesTransferenciaTable |
| `ed2cbf03` | Fabian1820/Claude | refactor(inventario): reemplaza useInventario por useMaterialesStock |
| `813511b3` | Fabian1820 | Merge branch 'main' |
| `7dd82226` | Ruben | fix(pagos): rollback del pago si falla la creación de la factura |
| `4af14754` | Ruben/Claude | fix(timezone): mostrar horas en hora de Cuba (America/Havana) |
| `cfd48dcc` | Ruben/Claude | perf(wallet): eliminar loadWallets redundante tras crear gasto/ingreso |
| `d19b2e1e` | Ruben/Claude | perf(cobros): paginación server-side y eliminar N+1 del estado cliente |
| `6f0613d1` | Ruben/Claude | perf(pagos): paginación server-side en anticipos/finales pendientes |
| `90ca22b5` | Fabian1820 | Refactor ResultadosComercialVentasPage: facturas en lugar de ofertas |
| `8d4ed013` | Fabian1820 | Remove restricted user "Loydis" de ResultadosVentasTable |
| `06b007a3` | Fabian1820 | Refactor RRHH: eliminar filtro estadoActivo |
| `2a758df3` | Fabian1820 | Add reportes-ventas module con resultados y estadísticas de clientes |
| `04dcbaa4` | yany1509 | "rh" — sin descripción |
| `1445dba4` | yany1509 | "rh" — sin descripción |
| `9bf9afaf` | yany1509 | "rh" — sin descripción |
| `7cbdd1fb` | yany1509 | "recursos humanos" — sin descripción |
| `145cb46e` | yany1509 | "rh" — sin descripción |
| `4abb9ece` | yany1509 | "recursos humanos" — sin descripción |

### Análisis de riesgos y consideraciones

#### 🔴 Riesgos altos

1. **Inconsistencia en lógica de tasa de cambio: fix → revert → fix en el mismo día**
   - En menos de 2 horas se aplicaron tres cambios contradictorios: eliminar inversión, restaurarla, y eliminarla otra vez. El commit final (`240407b1`) dice "sin inversión". Pero el commit `97268483` dice que EUR sí multiplica (no divide como CUP).
   - Si el código resultante no diferencia correctamente EUR (multiplicar: `monto * tasa`) de CUP (dividir: `monto / tasa`), todos los montos USD calculados en EUR serán incorrectos.
   - **Acción urgente:** Revisar el estado final de la lógica de conversión para cada moneda. Hacer prueba end-to-end con montos conocidos en CUP, EUR y USD.

2. **Nuevo campo `aumento_porcentaje` y `aumento_tipo` en ofertas — backend puede ignorarlo silenciosamente**
   - El frontend calcula `precio × (1 - desc/100) × (1 + aum/100)` y muestra el resultado al usuario. Si el backend no persiste ni aplica estos campos, el precio procesado diferirá del precio mostrado al cliente.
   - El PDF también muestra descuento y aumento apilados en la columna "Ajuste" — si el backend no devuelve estos campos al cargar la oferta, el PDF mostrará valores en blanco.
   - **Acción urgente:** Verificar que el backend acepta `aumento_porcentaje` y `aumento_tipo` en el modelo de materiales de oferta.

3. **6 commits vagos de yany1509 sobre RRHH** ("rh" ×5, "recursos humanos" ×2)
   - Totalmente sin descripción. Afectan un módulo activo. No es posible auditar qué cambió.
   - **Acción recomendada:** Revisar los diffs manualmente. Probar el flujo completo de RRHH antes de asumir estabilidad.

#### 🟡 Riesgos medios

4. **Rollback manual de pago si falla la creación de factura — solución frágil**
   - El frontend llama a `PagoVentaService.eliminarPago` si `crearFactura` falla. Si el rollback mismo falla (timeout, red), queda un pago huérfano sin factura. No hay reintentos ni cola de compensación.
   - **Consideración:** Esta es una solución de parche en el frontend para un problema que debería resolverse con atomicidad en el backend (transacción BD). Funciona mejor que nada, pero no garantiza consistencia en condiciones de red inestable.

5. **Refactor masivo de inventario: useInventario → useMaterialesStock + nuevo resolveMaterial**
   - Se reemplazó el hook principal y se refactorizó `SolicitudesTransferenciaTable` y `MovimientosTable`. Si algún componente que no fue actualizado aún consume la API antigua del hook, habrá errores en runtime.
   - **Acción recomendada:** Probar el flujo completo: movimientos, solicitudes de transferencia, y stock table — verificando que todos los materiales resuelven correctamente nombre, código e imagen.

6. **Descuento free hardcodeado por nombre de usuario "Loydis Batista Carrazana"**
   - La lógica de permisos está hardcodeada en el componente frontend. Si el nombre del usuario cambia en la BD, o se necesita dar el permiso a otro usuario, se requiere un cambio de código.
   - **Acción recomendada:** A mediano plazo, mover esta lógica a un campo de permisos en el backend.

7. **Paginación server-side depende de nuevos endpoints en el backend**
   - `cobros-paginado` y `/personalizadas/pendientes-paginado` deben existir con los parámetros correctos (`skip`, `limit`, `q`, filtros de fecha, `estado_pendiente`, devoluciones). Si no existen, las tabs de cobros y anticipos/finales pendientes rompen completamente.
   - **Acción urgente:** Verificar en LlegoBackend que ambos endpoints existen y paginan correctamente.

8. **ResultadosComercialVentasPage ahora muestra facturas en lugar de ofertas**
   - Cambio de lógica de negocio. Los tipos y la estructura de datos puede diferir. Verificar que los componentes de tabla reciben correctamente los campos de factura (total, estado, fecha, etc.).

9. **Nuevo módulo "Compras, Envíos y Costos" en el dashboard — ruta posiblemente incompleta**
   - Se agregó la navegación al módulo, pero hay que confirmar que la página destino está implementada y no muestra una pantalla vacía o un 404.

#### 🟢 Mejoras positivas

10. **Paginación server-side en cobros y anticipos/finales** — elimina el N+1 del frontend que hacía `getClienteByNumero()` por cada fila; mejora significativa de rendimiento.
11. **Búsqueda debounced (300ms) en tabs paginadas** — evita llamadas al backend por cada tecla.
12. **Rollback de pago si falla la factura** — mejor que dejar pagos huérfanos, aunque frágil.
13. **Corrección de timezone a America/Havana** — las horas en wallet, tasas de cambio y recibos PDF ahora muestran la hora local correcta (UTC-4 verano).
14. **Eliminación de `loadWallets` redundante** — reduce latencia al registrar cada transacción.
15. **Campo `aumento_porcentaje` configurable** — sin límite máximo ni mínimo, simétrico al descuento, incluido en el PDF.
16. **Descuento free en clientes-ventas (Loydis)** — permite descuentos sin tope con motivo obligatorio.
17. **Número de serie en StockTable** — mejora la trazabilidad en inventario.

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
   - `POST /wallet/wallets/ensure`, `POST /wallet/pending-transfers`, `PUT .../accept`, `PUT .../reject`, `DELETE .../`
   - Si alguno no existe, el flujo de transferencias rompe silenciosamente con 404.
   - **Acción urgente:** Verificar que todos estos endpoints existen en LlegoBackend antes de usar en producción.

2. **`recibido_por_ci` en endpoint de pagos — auto-depósito en wallet no confirmado**
   - Si el backend lo ignora, los pagos se procesan sin acreditar ninguna billetera.
   - **Acción urgente:** Confirmar en LlegoBackend que el endpoint de pagos maneja `recibido_por_ci`.

3. **8 commits vagos de yany1509 en el día** — afectan ventas, comerciales, cobros por ofertas. Sin auditoría posible.
   - **Acción recomendada:** Revisar diffs de estos commits manualmente antes de considerar estable el módulo de ventas.

#### 🟡 Riesgos medios

4. **Wallet visible para todos los usuarios sin RouteGuard** — verificar que permisos granulares ocultan billeteras ajenas y que el backend valida pertenencia en cada operación.
5. **Separación de `recargo` e `impuesto_porcentaje` en ficha de costo** — si el backend espera el campo unificado anterior, los cálculos de precios serán incorrectos.
6. **RRHH — campos editables dependen del backend** — si el endpoint no acepta `nombre` o `telefono`, los cambios se pierden silenciosamente.

#### 🟢 Mejoras positivas

7. **Multi-moneda en wallet (USD, EUR, CUP)** — interfaz más clara para equipos con varias divisas.
8. **Transferencias con flujo de aceptación** — evita transferencias accidentales.
9. **Wallet automático en transferencias** — `ensure` previene errores de "destinatario sin wallet".
10. **Separación recargo/impuesto en ficha de costo** — cálculos más transparentes y auditables.

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
| `0838d8d` | Fabian1820 | feat(envio-contenedor): búsqueda debounced de materiales por código/nombre |
| `2fc3dc4` | yany1509 | "ventas" — cambios sin descripción |
| `b04d962` | yany1509 | "comerciales de ventas y ofertas" — cambios sin descripción |
| `15c43dc` | Ruben/Claude | refactor(ficha-costo): simplificar modelo de precios — elimina Δ% por producto |
| `b06dc7a` | Fabian1820 | feat(fichas-costo): StockajesMinimosSection, stockaje mínimo en EditarPreciosDialog |
| `9435956` | Ruben/Claude | feat(ficha-costo): campo Impuesto nacional (%) sobre CIF |
| `08501d6` | Fabian1820 | refactor(fichas-costo): ajuste de layout y ancho de tabla |
| `c0ed0b6` | Fabian1820 | feat(fichas-costo): tooltips en materiales, número de serie en EditarPreciosDialog |
| `5952a48` | Fabian1820 | feat(fichas-costo): EditarPreciosDialog y MaterialSearchDialog con filtro por serie |
| `c4a5b69` | Ruben/Claude | feat(inventario): exportar análisis de stock mínimo a Excel |
| `653cff0` | Fabian1820 | "hvhjvhjv" — cambios sin descripción |
| `c19c6a7` | Ruben/Claude | fix(solicitudes-ventas): eliminar comisión Stripe del link de pago con flag `sin_recargo` |

### Análisis de riesgos y consideraciones

#### 🔴 Riesgos altos

1. **Simplificación del modelo de precios en fichas-costo puede romper fichas existentes** — fichas con Δ% individuales por producto habrán perdido esa diferenciación silenciosamente. **Acción urgente:** Verificar comportamiento al abrir fichas existentes.
2. **Flag `sin_recargo` depende del backend** — si LlegoBackend no implementa el handling, la comisión Stripe seguirá calculándose igual. **Acción urgente:** Confirmar en LlegoBackend.
3. **Commits sin descripción** ("ventas", "comerciales de ventas y ofertas", "hvhjvhjv") — cambios desconocidos en módulos activos. **Acción recomendada:** Revisar diffs manualmente.

#### 🟡 Riesgos medios

4. **Doble-apply de fórmula en fichas-costo** — verificar que el campo de entrada siempre es el CIF base, no el costo derivado.
5. **`StockajesMinimosSection` puede mostrar comparaciones incorrectas** si el backend no persiste `stockaje_minimo` aún.
6. **Número de serie en `EditarPreciosDialog`** — confirmar que `FichaCostoService` incluye el campo en el payload.

#### 🟢 Mejoras positivas

7. **Eliminación de comisión Stripe en solicitudes-ventas** — el cliente paga exactamente el precio acordado.
8. **Exportación a Excel del análisis de stock mínimo** — xlsx profesional con resumen y detalle coloreado por estado.
9. **Búsqueda debounced en envío de contenedores** — mejora significativa de UX.
10. **Impuesto nacional (%) sobre CIF** — permite modelar aranceles de importación globalmente.

---
