# Standard de Permisos por Módulos

Documento de referencia para crear y administrar módulos del sistema SunCarWeb.

## Modelo conceptual

El sistema usa permisos **planos por nombre de módulo** asignados a cada trabajador. No hay roles formales (todavía); cada permiso es un string registrado en la colección `modulos` del backend y asignado al trabajador en `permisos.modulo_ids`.

## Lógica de evaluación (implementada en `contexts/auth-context.tsx`)

### `hasPermission(module)`

```
SuperAdmin (excepto 'permisos') → true
Tiene el módulo exacto → true
Tiene cualquier "module/algo" → true
En cualquier otro caso → false
```

### `hasSubPermission(parent, child)`

```
SuperAdmin → true
Tiene el módulo padre exacto → true (acceso a TODOS los hijos)
Tiene "parent/child" exacto → true (acceso solo a ese hijo)
En cualquier otro caso → false
```

### Tabla de verdad para un módulo padre/hijo

| Permisos asignados al trabajador | Ve el card del padre en dashboard | Submódulos visibles dentro |
|---|---|---|
| `facturas` (solo) | ✅ sí | **TODOS** los submódulos |
| `facturas/pagos-clientes` (solo) | ✅ sí (porque tiene un hijo) | **SOLO** `pagos-clientes` |
| `facturas` + `facturas/pagos-clientes` | ✅ sí | TODOS (el padre gana) |
| ninguno | ❌ no | — |

**Conclusión práctica**: dar el padre = dar todo. Dar un hijo = ese hijo + acceso al card padre para llegar a él.

## Nomenclatura

Tres convenciones permitidas (en este orden de preferencia):

1. **kebab-case** para módulos raíz: `recursos-humanos`, `tasa-cambio-diaria`, `centro-control`.
2. **`padre/hijo`** (path-style) para submódulos: `facturas/pagos-clientes`, `facturas/obras-terminadas`.
3. **`prefijo:identificador`** **solo** para permisos dinámicos por entidad: `tienda:{tienda_id}`, `almacen:{almacen_id}`.

### Reglas

- **Un módulo raíz por ruta principal del dashboard.** El `id` del módulo en `app/page.tsx` debe coincidir con el nombre del módulo en BD (salvo que se use el override `permission:`).
- **Submódulos siempre como `padre/hijo`.** No usar `:` ni dos puntos para submódulos lógicos (eso queda reservado para permisos dinámicos por instancia, como `tienda:abc123`).
- **No usar querystrings** (`?tab=…`) en nombres de permiso. Si necesitas controlar pestañas, crea submódulos con `padre/hijo`.
- **No prefijar con el path completo.** `instalaciones/trabajos-diarios/averias` ❌ — basta con `trabajos:averias` o, si se migra, `instalaciones/averias`.

## Checklist al crear un nuevo módulo

1. **Definir el nombre** siguiendo la nomenclatura.
2. **Crear el módulo en BD** vía `POST /modulos/` con `{ nombre: "<nombre>" }`.
3. **Agregarlo a `app/page.tsx`**:
   - Entry en `allModules` con `id` igual al nombre del módulo (o usar `permission:` si el id de UI difiere del permiso de backend).
   - Entry en `moduleGroups` con `moduleIds` que lo incluya.
4. **Proteger la ruta** con `RouteGuard requiredModule="<nombre>"` en `app/<modulo>/page.tsx`.
5. **Si es submódulo**: usar `hasSubPermission(parent, child)` en la página del padre para filtrar la lista visible.
6. **Asignar el permiso** a los trabajadores que lo necesiten desde `/permisos`.

## Casos especiales actuales

- **`wallet`**: accesible a todos los autenticados, no requiere permiso (hardcode en `app/page.tsx`).
- **`permisos`**: SuperAdmin únicamente (verificación en `hasPermission` y en `app/permisos/page.tsx`).
- **`wallet-manager`**: SuperAdmin o flag `esAdmin` en `wallet_permisos`.
- **`tienda:{id}` / `almacen:{id}`**: permisos por instancia. Se deberían crear automáticamente al crear una tienda/almacén (pendiente de implementar en backend).
