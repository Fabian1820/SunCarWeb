# Análisis de Cambios — SunCarWeb

---

## 2026-07-09

### Resumen

17 commits con actividad muy intensa (14:23–20:37 UTC). Módulos afectados: `facturas-solar-carros`, `fichas-costo`, `obras-terminadas`, `movimientos`, `clientes`, `rrhh` y sistema de exports.

### Cambios por área

#### facturas-solar-carros (4 commits en ~1 h)
Serie de correcciones y mejoras encadenadas:
- Incluir todos los materiales de la oferta al facturar (no solo inversor/batería/panel)
- Corregir mezcla de varias ofertas confirmadas → usar solo la más reciente
- Agregar selector cuando el cliente tiene múltiples ofertas confirmadas
- Validar y descontar inventario para **todos** los materiales de la oferta en la tabla Concepto

#### fichas-costo
- Botón "Costo" visible solo para materiales con stock > 0
- Paginación corregida: el endpoint valida `limit<=500`; el frontend pedía `limit=2000` (422) — ahora pagina de a 500
- Atajo a la ficha de compra pendiente; bloqueo de ajuste cuando hay entrada sin costear

#### obras-terminadas
- Ordenar por fecha de instalación
- Exportar Excel sin columnas de materiales
- Nueva vista **Facturas** (selector Obras/Facturas en el header) con filtros de fecha, estado y comercial; exportación PDF por fila, PDF unificado y Excel

#### exports / refactor
- Leer `material.nombre` directamente del backend en facturas emitidas, PDF consolidado, pagos y vales — elimina `getAllMaterials()` (-160 líneas netas)
- Columna "Origen del movimiento" en export Excel de movimientos (deriva de `origen_captura`, `estado` y `origen` de la solicitud)

#### costos / clientes
- Nuevo subpermiso aditivo `costos-materiales-cliente`: muestra costo de materiales entregados/pendientes en el dashboard del cliente (fetch best-effort: si falla no rompe la UI)
- Selector "qué falta" (Aterramiento / Otro texto libre) en estado «Equipo instalado con éxito»

#### copy (costos)
- Renombrado de "kardex" → "historial de costos" en toda la UI visible. Rutas y claves de permiso (`kardex-costo`) **no cambian**.

#### rrhh
- Nuevos campos `pertenece_mipyme` y `pertenece_tcp` en trabajador (checkboxes al crear, toggles al editar, badges en tabla/detalle)

---

### Riesgos y consideraciones

1. **Iteración rápida en facturas-solar-carros**: 4 commits en ~1 h sobre el mismo módulo indican lógica compleja corregida en cadena. Existe riesgo de estado inconsistente si algún commit intermedio dejó código parcial activo. **Probar manualmente** el flujo completo con un cliente de 1 oferta y con uno de múltiples ofertas antes de pasar a producción.

2. **Otros límites excesivos en el frontend**: El `limit=2000` corregido en fichas-costo puede existir en **otros endpoints**. Buscar patrones `limit=2000` o `limit=1000` en el código para descartar el mismo problema en otros módulos.

3. **Dependencia del campo `nombre` del backend**: El refactor de exports confía en que todos los endpoints devuelven `material.nombre`. Si algún endpoint histórico no lo incluye, el fallback a `descripcion` puede mostrar datos ambiguos. Verificar que los endpoints de facturas emitidas, vale y pagos envíen siempre el campo.

4. **Subpermiso `costos-materiales-cliente` no heredado**: Usuarios con acceso al módulo `clientes` **no** heredan este subpermiso automáticamente — hay que asignarlo de forma explícita. Asegurarse de que el catálogo de permisos en el backend también lo registre; si no, el fetch fallará con 403 y los costos no aparecerán sin aviso claro al usuario.

5. **Vista Facturas en obras-terminadas**: Módulo nuevo y complejo (filtros, PDF por fila, PDF unificado, Excel) entregado en un solo commit. Al ser código nuevo sin iteración previa, los casos edge (fechas vacías, sin facturas, exportaciones con muchos registros) pueden no estar cubiertos.

6. **Renombrado "kardex"**: No es un bug, pero si documentación interna, capacitaciones o usuarios avanzados buscan el término antiguo en la UI, no lo encontrarán. Comunicar el cambio al equipo.

---
