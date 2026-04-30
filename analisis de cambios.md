# Registro de Análisis de Cambios — SunCarWeb

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
