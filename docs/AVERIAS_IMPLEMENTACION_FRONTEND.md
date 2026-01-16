# Implementación de Sistema de Averías - Frontend

## ✅ Completado

### 1. Tipos y Modelos
- **Archivo**: `lib/types/feats/averias/averia-types.ts`
- Definido el tipo `Averia` con campos: `id`, `descripcion`, `estado`, `fecha_reporte`, `fecha_solucion`
- Definidos tipos para crear y actualizar averías

### 2. Servicios API
- **Archivo**: `lib/services/feats/averias/averia-service.ts`
- Implementados métodos:
  - `agregarAveria(clienteNumero, data)` - POST `/api/clientes/{numero}/averias/`
  - `actualizarAveria(clienteNumero, averiaId, data)` - PATCH `/api/clientes/{numero}/averias/{id}/`
  - `eliminarAveria(clienteNumero, averiaId)` - DELETE `/api/clientes/{numero}/averias/{id}/`
- Exportado en `lib/api-services.ts`

### 3. Actualización del Modelo Cliente
- **Archivo**: `lib/types/feats/customer/cliente-types.ts`
- Agregado campo `averias?: Averia[]` al tipo `Cliente`

### 4. Componente de Gestión de Averías
- **Archivo**: `components/feats/averias/gestionar-averias-dialog.tsx`
- Dialog completo con funcionalidad CRUD:
  - Formulario para agregar nueva avería (solo descripción)
  - Lista de averías pendientes con acciones:
    - Marcar como solucionada
    - Eliminar avería
  - Lista de averías solucionadas con acción:
    - Eliminar avería
  - Estados visuales diferenciados (rojo para pendientes, verde para solucionadas)

### 5. Integración en Tabla de Clientes
- **Archivo**: `components/feats/customer-service/clients-table.tsx`
- Agregado botón de "Averías" en la columna de acciones
- Botón muestra estados visuales diferentes:
  - **Sin averías o todas solucionadas**: Gris normal
  - **Con al menos una avería pendiente**: Rojo con borde destacado
- Importado y configurado `GestionarAveriasDialog`
- Implementada función `tieneaveriasPendientes()` para verificar estado
- Implementada función `handleAveriasSuccess()` para refrescar datos

### 6. Página de Averías
- **Archivo**: `app/instalaciones/averias/page.tsx`
- **Archivo**: `components/feats/instalaciones/averias-table.tsx`
- Página completa con tabla de averías
- Filtros y búsqueda
- Tema rojo para urgencia
- Columnas: Cliente, Teléfonos, Dirección, Oferta, Avería
- Actualmente muestra todos los clientes (pendiente filtro por averías en backend)

## 🔧 Pendiente en Backend

El backend debe implementar todos los endpoints especificados en `docs/AVERIAS_BACKEND_SPEC.md`:

### Endpoints Requeridos

1. **POST** `/api/clientes/{numero}/averias/`
   - Agregar nueva avería a un cliente
   - Body: `{ descripcion, estado? }`

2. **PATCH** `/api/clientes/{numero}/averias/{id}/`
   - Actualizar avería existente
   - Body: `{ descripcion?, estado? }`

3. **DELETE** `/api/clientes/{numero}/averias/{id}/`
   - Eliminar avería de un cliente

4. **GET** `/api/clientes/{numero}/`
   - Debe incluir el campo `averias` en la respuesta
   - Formato: `averias: [{ id, descripcion, estado, fecha_reporte, fecha_solucion? }]`

5. **GET** `/api/clientes/` (listar todos)
   - Debe incluir el campo `averias` para cada cliente

### Modelo de Datos Backend

```python
class Averia:
    id: str  # UUID o ID único
    descripcion: str  # Descripción de la avería
    estado: str  # "Pendiente" o "Solucionada"
    fecha_reporte: str  # Fecha ISO cuando se reportó (auto)
    fecha_solucion: str | None  # Fecha ISO cuando se solucionó (auto al marcar como solucionada)
```

### Validaciones Backend

- `descripcion` es requerido al crear avería
- `estado` debe ser "Pendiente" o "Solucionada"
- Al crear, `estado` por defecto es "Pendiente"
- Al marcar como "Solucionada", establecer `fecha_solucion` automáticamente
- `fecha_reporte` se establece automáticamente al crear

## 📋 Flujo de Usuario

1. Usuario entra a módulo de Clientes
2. Ve botón de averías en cada cliente:
   - Gris: Sin averías o todas solucionadas
   - Rojo con borde: Tiene averías pendientes
3. Click en botón abre dialog de gestión
4. Puede agregar nueva avería con descripción
5. Ve lista de averías pendientes y solucionadas
6. Puede marcar pendiente como solucionada
7. Puede eliminar cualquier avería
8. Al cerrar dialog, tabla se refresca automáticamente

## 🎨 Características Visuales

- Tema rojo para averías (urgencia)
- Iconos: `AlertTriangle` para averías
- Badges diferenciados por estado
- Botón destacado cuando hay averías pendientes
- Separación visual entre pendientes y solucionadas
- Confirmación antes de eliminar

## 🔄 Sincronización

- Al agregar/actualizar/eliminar avería, se dispara evento `refreshClientsTable`
- La tabla de clientes se refresca automáticamente
- El estado visual del botón se actualiza inmediatamente

## 📝 Notas

- Un cliente puede tener múltiples averías
- Las averías solucionadas se mantienen en el historial
- Solo se requiere descripción al crear avería
- El botón de averías siempre está visible, incluso sin averías
- La descripción se muestra en un textarea para permitir texto más largo
