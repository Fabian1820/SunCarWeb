# Implementación Frontend - Tiendas con Múltiples Almacenes

## 📋 Resumen

Se ha actualizado el frontend para soportar que **una tienda pueda estar asociada a múltiples almacenes**, permitiendo mayor flexibilidad en la gestión de inventario y ventas.

## 🎯 Archivos Modificados

### 1. Tipos TypeScript

**`lib/types/feats/inventario/inventario-types.ts`**

#### Cambios en la interfaz `Tienda`:

**Antes:**
```typescript
export interface Tienda {
  id?: string
  nombre: string
  codigo?: string
  direccion?: string
  telefono?: string
  almacen_id: string  // Solo un almacén
  almacen_nombre?: string
  activo?: boolean
}
```

**Ahora:**
```typescript
export interface AlmacenInfo {
  id: string
  nombre: string
}

export interface Tienda {
  id?: string
  nombre: string
  codigo?: string
  direccion?: string
  telefono?: string
  almacenes: AlmacenInfo[]  // Múltiples almacenes
  activo?: boolean
  // Campos legacy para compatibilidad (deprecated)
  almacen_id?: string
  almacen_nombre?: string
}
```

#### Cambios en `TiendaCreateData`:

**Antes:**
```typescript
export interface TiendaCreateData {
  nombre: string
  codigo?: string
  direccion?: string
  telefono?: string
  almacen_id: string  // Solo un almacén
  activo?: boolean
}
```

**Ahora:**
```typescript
export interface TiendaCreateData {
  nombre: string
  codigo?: string
  direccion?: string
  telefono?: string
  almacenes: AlmacenInfo[]  // Múltiples almacenes
  activo?: boolean
}
```

#### Cambios en `VentaItem`:

**Antes:**
```typescript
export interface VentaItem {
  material_codigo: string
  cantidad: number
}
```

**Ahora:**
```typescript
export interface VentaItem {
  material_codigo: string
  cantidad: number
  almacen_id: string  // Almacén del cual se descuenta
}
```

### 2. Formulario de Tienda

**`components/feats/inventario/tienda-form.tsx`**

#### Cambios principales:

1. **Selector de almacenes múltiples con checkboxes:**
   - Reemplazó el `Select` por una lista de checkboxes
   - Permite seleccionar múltiples almacenes
   - Muestra contador de almacenes seleccionados
   - Validación: al menos un almacén requerido

2. **Función `handleAlmacenToggle`:**
   ```typescript
   const handleAlmacenToggle = (almacen: Almacen) => {
     const almacenInfo: AlmacenInfo = {
       id: almacen.id!,
       nombre: almacen.nombre
     }
     
     const existe = formData.almacenes.find(a => a.id === almacenInfo.id)
     
     if (existe) {
       setFormData({
         ...formData,
         almacenes: formData.almacenes.filter(a => a.id !== almacenInfo.id)
       })
     } else {
       setFormData({
         ...formData,
         almacenes: [...formData.almacenes, almacenInfo]
       })
     }
   }
   ```

3. **UI mejorada:**
   - Lista scrolleable de almacenes
   - Información adicional (código, dirección)
   - Mensaje informativo sobre el uso
   - Validación visual con borde rojo si no hay almacenes

#### Captura de pantalla conceptual:

```
┌─────────────────────────────────────────────┐
│ Almacenes asociados * (2 seleccionados)    │
├─────────────────────────────────────────────┤
│ ☑ Almacén Principal (ALM-001)              │
│   Calle Principal 123                       │
│                                             │
│ ☑ Almacén Secundario (ALM-002)             │
│   Av. Secundaria 456                        │
│                                             │
│ ☐ Almacén Norte (ALM-003)                  │
│   Zona Norte                                │
└─────────────────────────────────────────────┘
Los productos se podrán vender desde 
cualquiera de estos almacenes
```

### 3. Tabla de Tiendas

**`components/feats/inventario/tiendas-table.tsx`**

#### Cambios principales:

1. **Columna "Almacenes" actualizada:**
   - Muestra múltiples badges para cada almacén
   - Fallback a campos legacy si existen
   - Mensaje "Sin almacenes" si no hay ninguno

2. **Visualización:**
   ```typescript
   {tienda.almacenes && tienda.almacenes.length > 0 ? (
     <div className="flex flex-wrap gap-1">
       {tienda.almacenes.map((almacen) => (
         <Badge
           key={almacen.id}
           variant="outline"
           className="bg-blue-50 text-blue-700 border-blue-200 text-xs"
         >
           {almacen.nombre}
         </Badge>
       ))}
     </div>
   ) : (
     <span className="text-sm text-gray-500">
       {tienda.almacen_nombre || tienda.almacen_id || "Sin almacenes"}
     </span>
   )}
   ```

#### Captura de pantalla conceptual:

```
┌──────────────────────────────────────────────────────────────┐
│ Tienda          │ Código  │ Almacenes                        │
├──────────────────────────────────────────────────────────────┤
│ Sucursal Centro │ T001    │ [Almacén Principal] [Almacén 2] │
│ Calle 123       │         │                                  │
├──────────────────────────────────────────────────────────────┤
│ Sucursal Norte  │ T002    │ [Almacén Norte]                 │
│ Av. Norte 456   │         │                                  │
└──────────────────────────────────────────────────────────────┘
```

### 4. Punto de Venta (POS)

**`components/feats/inventario/pos-view.tsx`**

#### Cambios principales:

1. **ItemOrden actualizado:**
   ```typescript
   interface ItemOrden {
     materialCodigo: string
     descripcion: string
     precio: number
     cantidad: number
     categoria: string
     almacen_id: string  // Nuevo campo
   }
   ```

2. **Selector de almacén obligatorio:**
   - Siempre visible en la barra superior
   - Resaltado en naranja si no está seleccionado
   - Carga automática de almacenes de la tienda
   - Selección automática si solo hay uno

3. **Validación al agregar productos:**
   ```typescript
   const agregarProductoAOrden = (material: any) => {
     if (!almacenId) {
       toast({
         title: "Selecciona un almacén",
         description: "Debes seleccionar un almacén antes de agregar productos",
         variant: "destructive",
       })
       return
     }
     // ... agregar producto con almacen_id
   }
   ```

4. **Validación al procesar pago:**
   ```typescript
   const handleAbrirPago = () => {
     const itemsSinAlmacen = ordenActual.items.filter(item => !item.almacen_id)
     if (itemsSinAlmacen.length > 0) {
       toast({
         title: "Almacén requerido",
         description: "Todos los productos deben tener un almacén asignado",
         variant: "destructive",
       })
       return
     }
     setIsPagoDialogOpen(true)
   }
   ```

5. **Carga de almacenes de la tienda:**
   ```typescript
   const { almacenes, loading: loadingAlmacenes } = useInventario()
   
   const almacenesTienda = useMemo(() => {
     return almacenes.filter(a => a.tienda_id === tiendaId)
   }, [almacenes, tiendaId])
   
   useEffect(() => {
     if (almacenesTienda.length === 1 && !almacenId) {
       setAlmacenId(almacenesTienda[0].id)
     }
   }, [almacenesTienda, almacenId])
   ```

#### Captura de pantalla conceptual:

```
┌────────────────────────────────────────────────────────────┐
│ [+ Nueva orden] [Ver órdenes]  Almacén: [Almacén Principal▼]│
│                                 [🔍 Buscar] [Categoría▼]    │
└────────────────────────────────────────────────────────────┘
```

## 🔄 Flujo de Trabajo Actualizado

### 1. Crear Tienda con Múltiples Almacenes

```
Usuario → Formulario de tienda
  ↓
Selecciona múltiples almacenes (checkboxes)
  ↓
Click "Crear tienda"
  ↓
POST /api/tiendas/
{
  "nombre": "Sucursal Centro",
  "almacenes": [
    {"id": "alm1", "nombre": "Almacén Principal"},
    {"id": "alm2", "nombre": "Almacén Secundario"}
  ]
}
  ↓
Backend crea tienda con múltiples almacenes
  ↓
Frontend actualiza lista de tiendas
```

### 2. Venta desde Múltiples Almacenes

```
Usuario → Abre POS de tienda
  ↓
Sistema carga almacenes de la tienda
  ↓
Usuario selecciona almacén del selector
  ↓
Usuario agrega productos al carrito
  (cada producto se asigna al almacén seleccionado)
  ↓
Usuario puede cambiar almacén y agregar más productos
  (productos nuevos usan el nuevo almacén)
  ↓
Usuario procesa pago
  ↓
Sistema valida que todos los items tengan almacén
  ↓
POST /api/caja/ordenes/{id}/pagar
  ↓
Backend descuenta de cada almacén según item
```

## ✅ Validaciones Implementadas

### Formulario de Tienda
- ✓ Nombre requerido
- ✓ Al menos un almacén seleccionado
- ✓ Validación visual con bordes rojos
- ✓ Mensajes de error claros

### Punto de Venta
- ✓ Almacén seleccionado antes de agregar productos
- ✓ Todos los items deben tener almacén asignado
- ✓ Validación antes de procesar pago
- ✓ Mensajes informativos con toast

## 🎨 Mejoras de UI/UX

### Formulario de Tienda
1. **Lista scrolleable** - Maneja muchos almacenes sin problemas
2. **Información completa** - Muestra código y dirección de cada almacén
3. **Contador visual** - "X seleccionados" en el título
4. **Mensaje informativo** - Explica el propósito de múltiples almacenes
5. **Hover effects** - Feedback visual al pasar el mouse

### Tabla de Tiendas
1. **Badges coloridos** - Fácil identificación de almacenes
2. **Flex wrap** - Se adapta a múltiples almacenes
3. **Compatibilidad legacy** - Muestra datos antiguos si existen

### Punto de Venta
1. **Selector destacado** - Siempre visible y accesible
2. **Resaltado visual** - Naranja si no está seleccionado
3. **Auto-selección** - Si solo hay un almacén, se selecciona automáticamente
4. **Validaciones proactivas** - Previene errores antes de procesar

## 🔧 Compatibilidad con Datos Legacy

Los tipos mantienen compatibilidad con el formato antiguo:

```typescript
export interface Tienda {
  // Nuevo formato
  almacenes: AlmacenInfo[]
  
  // Campos legacy (deprecated)
  almacen_id?: string
  almacen_nombre?: string
}
```

Esto permite:
- Migración gradual de datos
- Funcionamiento con datos antiguos
- Sin romper código existente

## 📊 Ejemplo de Datos

### Tienda con Múltiples Almacenes

```json
{
  "id": "tienda_123",
  "nombre": "Sucursal Centro",
  "codigo": "T001",
  "direccion": "Calle Principal 123",
  "telefono": "555-1234",
  "almacenes": [
    {
      "id": "alm_001",
      "nombre": "Almacén Principal"
    },
    {
      "id": "alm_002",
      "nombre": "Almacén Secundario"
    }
  ],
  "activo": true
}
```

### Orden con Items de Diferentes Almacenes

```json
{
  "id": "orden_456",
  "tienda_id": "tienda_123",
  "items": [
    {
      "material_codigo": "INV-001",
      "descripcion": "Inversor 5kW",
      "cantidad": 2,
      "precio": 1500.00,
      "almacen_id": "alm_001"
    },
    {
      "material_codigo": "PAN-001",
      "descripcion": "Panel Solar 450W",
      "cantidad": 10,
      "precio": 250.00,
      "almacen_id": "alm_002"
    }
  ]
}
```

## 🚀 Ventajas del Nuevo Sistema

1. **Flexibilidad Operativa**
   - Una tienda puede vender desde múltiples ubicaciones
   - Mejor gestión de inventario distribuido

2. **Control Granular**
   - Se especifica exactamente de qué almacén sale cada producto
   - Trazabilidad completa de movimientos

3. **Escalabilidad**
   - Fácil agregar o quitar almacenes de una tienda
   - Sin límite en cantidad de almacenes

4. **Mejor UX**
   - Selector visual e intuitivo
   - Validaciones claras y preventivas
   - Feedback inmediato

## 🔍 Casos de Uso

### Caso 1: Tienda con Almacén Principal y Bodega
```
Tienda Centro:
  - Almacén Principal (productos de exhibición)
  - Bodega (stock adicional)

Flujo:
1. Vendedor selecciona "Almacén Principal"
2. Agrega productos de exhibición
3. Cambia a "Bodega"
4. Agrega productos de stock
5. Procesa venta
6. Sistema descuenta de cada almacén correctamente
```

### Caso 2: Tienda con Múltiples Ubicaciones
```
Tienda Norte:
  - Almacén Norte A
  - Almacén Norte B
  - Almacén Norte C

Flujo:
1. Vendedor verifica stock en cada almacén
2. Selecciona almacén con disponibilidad
3. Agrega productos
4. Procesa venta
5. Stock se descuenta del almacén correcto
```

## 📝 Notas de Migración

### Para Desarrolladores

1. **Actualizar llamadas API:**
   ```typescript
   // Antes
   const tienda = {
     nombre: "Mi Tienda",
     almacen_id: "alm_001"
   }
   
   // Ahora
   const tienda = {
     nombre: "Mi Tienda",
     almacenes: [
       { id: "alm_001", nombre: "Almacén 1" },
       { id: "alm_002", nombre: "Almacén 2" }
     ]
   }
   ```

2. **Actualizar componentes que usan tiendas:**
   - Verificar uso de `almacen_id` (deprecated)
   - Cambiar a `almacenes` array
   - Agregar manejo de múltiples almacenes

3. **Actualizar validaciones:**
   - Cambiar de "almacén requerido" a "almacenes requeridos"
   - Validar array no vacío en lugar de string

### Para Usuarios

1. **Tiendas existentes:**
   - Ejecutar script de migración del backend
   - Verificar que los almacenes se migraron correctamente
   - Actualizar configuración si es necesario

2. **Nuevas tiendas:**
   - Seleccionar todos los almacenes necesarios
   - Verificar que aparecen en la tabla
   - Probar ventas desde cada almacén

## 🎉 Conclusión

El sistema ahora soporta completamente múltiples almacenes por tienda, proporcionando:

- ✅ UI intuitiva y fácil de usar
- ✅ Validaciones robustas
- ✅ Compatibilidad con datos legacy
- ✅ Flexibilidad operativa
- ✅ Control granular de inventario
- ✅ Trazabilidad completa

El frontend está listo para trabajar con el backend actualizado y proporciona una experiencia de usuario mejorada para la gestión de tiendas con múltiples almacenes.
