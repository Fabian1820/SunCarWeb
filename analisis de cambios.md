# Registro de Análisis de Cambios — SunCarWeb

---

## 📅 30 de Abril, 2026

### Resumen de cambios (últimas 24h)

**Áreas: Centro de Control, almacenes, manejo global de errores 422, ofertas/facturas**

| Commit | Autor | Descripción |
|--------|-------|-------------|
| `b26f898` | Ruben0304 | perf: Centro de Control — datos on-demand, mapas de conteos del backend |
| `10d42a1` | Ruben0304 | fix: evitar llamada `/visitas/` en carga inicial del Centro de Control |
| `997482` | yany1509 | Se añadió `estado` al tipo `ofertaData`; prefijo «hasta» en cableado AC/DC |
| `f45193b` | Ruben0304 | feat: conectar Centro de Control con nuevos endpoints del backend |
| `f494f54` | Fabian1820 | *(sin descripción: "hgvhj")* |
| `e186a05` | yany1509 | agregada opción de ver factura solar carros |
| `e72375a` | Fabian1820 | *(sin descripción: "vhjvhjvhjv")* |
| `809c661` | Ruben0304 | Add loading lottie to filtered lists |
| `d262ec3` | Ruben0304 | perf: carga on-demand por tab, paginación server-side e imágenes lazy en almacenes |
| `ee1582a` | Ruben0304 | feat: manejo global de errores 422 en `apiRequest` |
| `a7ef689` | Ruben0304 | feat: overlay global para errores de validación 422 |

### Análisis de riesgos y consideraciones

#### 🔴 Riesgos altos

1. **Cambio del tipo de retorno de `getStock` de array plano a `{data, total, skip, limit}`**
   - El commit dice que se actualizaron todos los callers (`vales-salida`, `solicitudes-materiales`, `solicitudes-ventas`, `use-inventario`, `export-vale-salida-service`), pero si alguno se pasó por alto, fallará intentando `.map()` sobre un objeto.
   - **Acción recomendada:** Probar explícitamente cada módulo que consume `getStock` (especialmente exportaciones y vales de salida) para confirmar que recibe el campo `data` correctamente.

2. **Dos commits más de Fabian1820 sin descripción (`hgvhj`, `vhjvhjvhjv`)**
   - No es posible saber el alcance de estos cambios sin leer el diff. Si introducen un bug, el historial no da pistas.
   - **Acción urgente:** Revisar manualmente esos diffs. Patrón recurrente — se recomienda establecer un hook de pre-commit que rechace mensajes de menos de 10 caracteres.

#### 🟡 Riesgos medios

3. **Centro de Control conectado a nuevos endpoints del backend**
   - Los panels de Brigadas, PeriodoStats, AnalisisRegional y ClientesStats ahora llaman a endpoints dedicados (`/periodo-stats`, `/analisis-regional`, `/clientes-por-mes`, `/brigadas`). Si alguno de estos no existe en el backend en producción o devuelve un schema distinto al esperado, el panel correspondiente fallará.
   - **Acción recomendada:** Verificar que todos los endpoints existen y están desplegados antes de pasar a producción.

4. **Heatmap con `Map<string, number>` de conteos del backend**
   - Los nombres de municipio que llegan en `municipios_por_modo` deben coincidir exactamente (mayúsculas, acentos) con los nombres de las features del GeoJSON. Una discrepancia hace que el municipio aparezca sin color en el mapa sin lanzar ningún error.
   - **Consideración:** Añadir un log de advertencia cuando un nombre del backend no encuentre feature en el GeoJSON.

5. **`ESTADO_OFERTA_LABELS` en exportaciones de ofertas (yany1509)**
   - Si una oferta tiene un valor de `estado` que no está mapeado en `ESTADO_OFERTA_LABELS`, el campo aparecerá como `undefined` en la exportación PDF/Excel.
   - **Acción recomendada:** Añadir un fallback (`?? estado`) para que los estados no mapeados muestren el valor raw en lugar de `undefined`.

6. **Overlay de errores 422 asume un formato de payload específico**
   - FastAPI devuelve 422 con `{detail: [{loc, msg, type}]}`, pero si algún endpoint del backend lanza un 422 personalizado con otro formato, el overlay puede mostrar datos crudos o quedar vacío.
   - **Consideración:** Validar que el parser del overlay maneja tanto el formato estándar de FastAPI como variantes custom.

7. **Carga on-demand de tabs en almacenes — primer activación**
   - Los tabs Stock, Recepciones e Historial cargan al primer click. Si la conexión es lenta, el usuario verá el tab vacío brevemente. Confirmar que el indicador de carga (lottie) aparece correctamente dentro del tab antes de que lleguen los datos.

#### 🟢 Mejoras positivas

8. **Paginación server-side (40/página) + imágenes lazy en tabla de stock**
   - Reduce drásticamente el tiempo de carga inicial del módulo de almacenes.

9. **Centro de Control: eliminación de llamada de 428KB a `/visitas/`**
   - Se reutiliza `controlData.visitasRealizadas` del dashboard para el modo semana (default), y solo se llama a la API cuando el usuario cambia el período. Gran mejora.

10. **Overlay global de errores 422**
    - Centraliza el manejo de errores de validación sin tocar hooks ni páginas individuales. Solución no intrusiva.

11. **Ver factura solar carros (yany1509)**
    - Nueva funcionalidad disponible en el módulo de carros.

---

## 📅 29 de Abril, 2026

### Resumen de cambios (últimas 24h)

**Áreas: Rendimiento, módulo de confección, loader/UI, solicitudes, facturación**

| Commit | Autor | Descripción |
|--------|-------|-------------|
| `eb7acfe` | Ruben0304 | perf: equipos de clientes on-demand — elimina espera de 20s |
| `0b80186` | Ruben0304 | perf: Centro de Control — 1 request en lugar de 15+ (caché 45s) |
| `8510f48` | Fabian1820 | fix: usa `total_pagado`/`precio_pagado` por ítem para descuentos en ventas |
| `cfafdf4` | Ruben0304 | fix: importa `DotLottieReact` dinámicamente con `ssr:false` en Loader y PageLoader |
| `35bb8c8` | Ruben0304 | feat: paginación y filtros backend en módulo de ofertas de confección |
| `f42bac1` | Ruben0304 | ajustes en loader, page-loader y ofertas confeccionadas; animación solar |
| `3e45a68` | yany1509 | ajustes en solicitudes |
| `d168ce0` | yany1509 | ajustes en solicitudes |
| `707b287` | yany1509 | ajustes |
| `e199098` | Fabian1820 | conduce y garantía |
| `2a42154` | Fabian1820 | facturación ventas |
| *(8 commits)* | Fabian1820 | *(mensajes sin descripción: "mnvhjvjh", "gyjgjghj", "hgbjh", "gfuyguy", "hvjhv", "bkjbjk", "fefew", "fdvfdvb")* |

### Análisis de riesgos y consideraciones

#### 🔴 Riesgos altos

1. **8 commits con mensajes completamente sin descripción** (Fabian1820)
   - Commits: `mnvhjvjh`, `gyjgjghj`, `hgbjh`, `gfuyguy`, `hvjhv`, `bkjbjk`, `fefew`, `fdvfdvb`
   - Son imposibles de auditar sin leer el diff completo. Si uno de estos introduce un bug en producción, encontrarlo será muy costoso.
   - **Acción urgente:** Establecer regla de mensajes descriptivos. Considerar un hook de pre-commit que rechace mensajes de menos de 10 caracteres sin estructura.

2. **Carga on-demand de `equiposParaCard` vía `/equipos-batch`**
   - Si el endpoint `/equipos-batch` no existe aún en el backend o tiene un schema diferente, los cards de detalle fallarán silenciosamente al abrirse.
   - **Acción recomendada:** Verificar que el endpoint `/equipos-batch` está en producción y acepta los parámetros esperados.

3. **`ofertasItemsCompleto` carga lazy al abrir `AnalisisRegional`**
   - Si el endpoint `/ofertas-items` es lento o falla, el indicador de carga puede quedarse infinito si no hay manejo de error.
   - **Consideración:** Verificar que hay timeout y estado de error visible al usuario.

#### 🟡 Riesgos medios

4. **Centro de Control: caché de 45s en endpoint consolidado**
   - Si los datos de negocio cambian frecuentemente, el dashboard puede mostrar datos desactualizados hasta 45 segundos.
   - **Consideración:** Evaluar si 45s es aceptable para el contexto de negocio, o si se necesita invalidación manual o WebSocket.

5. **Fix `total_pagado`/`precio_pagado` en descuentos de ventas**
   - Cambio en cómo se calculan los descuentos por ítem. Si hay registros históricos que usaban el campo anterior, los reportes de períodos pasados pueden quedar inconsistentes.
   - **Acción recomendada:** Verificar que el campo `total_pagado`/`precio_pagado` existe en todos los registros de ventas, incluyendo los más antiguos.

6. **`DotLottieReact` con `ssr:false`**
   - La importación dinámica evita el fallo del WASM en SSR. Correcto.
   - Riesgo menor: en conexiones lentas habrá un flash sin animación antes de que cargue el componente dinámico.

#### 🟢 Mejoras positivas

7. **Paginación backend en módulo de confección**
   - Muy necesario si el volumen de ofertas es alto. Reduce carga inicial significativamente.

8. **Centro de Control: 1 request en lugar de 15+**
   - Mejora de rendimiento notable, especialmente en conexiones lentas.

9. **Eliminación de espera de 20s en equipos de clientes**
   - Carga on-demand es la solución correcta para datos pesados que no siempre se necesitan.

---
