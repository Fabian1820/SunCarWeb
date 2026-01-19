# Actualización Frontend: Materiales con marca_id

## Resumen de Cambios

Se actualizó el frontend para soportar los nuevos campos en los materiales (productos):
- `nombre`: Nombre del producto (opcional para TODOS los materiales)
- `foto`: Foto del producto (opcional para TODOS los materiales)
- `marca_id`: ID de la marca seleccionada (requerido SOLO para BATERÍAS, INVERSORES, PANELES)
- `potenciaKW`: Potencia en KW (requerido SOLO para BATERÍAS, INVERSORES, PANELES)

## Distribución de Campos

### Campos para TODOS los materiales:
- Código (requerido)
- Categoría (requerido)
- Descripción (requerido)
- Unidad de medida (requerido)
- Precio (opcional)
- **Nombre** (opcional)
- **Foto** (opcional)

### Campos SOLO para BATERÍAS, INVERSORES y PANELES:
- **Marca** (requerido)
- **Potencia en KW** (requerido)

## Archivos Modificados

### 1. Tipos (`lib/types/feats/materials/material-types.ts`)

Se actualizaron todas las interfaces para incluir los nuevos campos:

```typescript
export interface BackendMaterial {
  codigo: string
  descripcion: string
  um: string
  precio?: number
  nombre?: string
  marca_id?: string
  foto?: string
  potenciaKW?: number
}

export interface Material {
  id: string
  codigo: number
  categoria: string
  descripcion: string
  um: string
  precio?: number
  foto?: string
  nombre?: string
  marca_id?: string
  potenciaKW?: number
}

export interface MaterialFormData {
  codigo: string
  categoria: string
  descripcion: string
  um: string
  precio?: number
  nombre?: string
  marca_id?: string
  foto?: File | null
  potenciaKW?: number
}
```

### 2. Servicio (`lib/services/feats/materials/material-service.ts`)

Se actualizaron los métodos para enviar los nuevos campos al backend:

```typescript
static async addMaterialToProduct(
  productoId: string,
  material: { 
    codigo: string
    descripcion: string
    um: string
    precio?: number
    nombre?: string
    marca_id?: string
    foto?: string
    potenciaKW?: number
  }
): Promise<boolean>

static async editMaterialInProduct(
  productoId: string,
  materialCodigo: string,
  data: { 
    codigo: string | number
    descripcion: string
    um: string
    precio?: number
    nombre?: string
    marca_id?: string
    foto?: string
    potenciaKW?: number
  }
): Promise<boolean>
```

### 3. Formulario (`components/feats/materials/material-form.tsx`)

El formulario ahora tiene dos secciones:

**1. Campos Básicos (para TODOS los materiales):**
- Código del Material
- Categoría
- Descripción
- Unidad de Medida
- Precio (opcional)
- **Nombre del Producto** (opcional)
- **Foto del Producto** (opcional)

**2. Información Técnica (SOLO para BATERÍAS, INVERSORES, PANELES):**

Cuando se selecciona una de estas categorías, aparece una sección adicional con fondo ámbar:

1. **Marca** (Select)
   - Se carga dinámicamente usando `useMarcas()` hook
   - Filtra marcas según la categoría seleccionada
   - Muestra solo marcas activas que coincidan con el tipo de material
   - Requerido para categorías especiales

2. **Potencia en KW** (Input numérico)
   - Placeholder: "Ej: 10.0"
   - Step: 0.01
   - Requerido para categorías especiales

**Validación:**
```typescript
// Validar marca y potencia solo para categorías especiales
if (requiereMarcaYPotencia) {
  if (!formData.marca_id) {
    newErrors.marca_id = "La marca es requerida para esta categoría"
  }
  if (!formData.potenciaKW || formData.potenciaKW <= 0) {
    newErrors.potenciaKW = "La potencia en KW es requerida para esta categoría"
  }
}
```

**Integración con Marcas:**
```typescript
const { marcasSimplificadas, loading: loadingMarcas } = useMarcas()

// Filtrar marcas según la categoría seleccionada
const marcasFiltradas = marcasSimplificadas.filter(marca => 
  marca.tipos_material.includes(formData.categoria as any)
)
```

### 4. Tabla (`components/feats/materials/materials-table.tsx`)

Se agregaron columnas para mostrar los nuevos campos:

```tsx
<th>Nombre</th>
<th>Marca</th>
<th>Potencia</th>

// En el body:
<td>
  {material.nombre ? (
    <span className="text-sm font-medium text-gray-900">{material.nombre}</span>
  ) : (
    <span className="text-sm text-gray-400">-</span>
  )}
</td>
<td>
  {material.marca_id ? (
    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
      ID: {material.marca_id.slice(0, 8)}...
    </Badge>
  ) : (
    <span className="text-sm text-gray-400">-</span>
  )}
</td>
<td>
  {material.potenciaKW ? (
    <span className="text-sm font-medium text-gray-900">{material.potenciaKW} KW</span>
  ) : (
    <span className="text-sm text-gray-400">-</span>
  )}
</td>
```

### 5. Página Principal (`app/materiales/page.tsx`)

Se actualizaron las funciones `addMaterial` y `updateMaterial` para manejar los nuevos campos:

```typescript
const addMaterial = async (material: Omit<Material, "id">) => {
  const nombre = (material as any).nombre
  const marca_id = (material as any).marca_id
  const potenciaKW = (material as any).potenciaKW
  
  // ... código existente ...
  
  await addMaterialToProduct(productoId as any, {
    codigo: String(codigo),
    descripcion,
    um,
    precio: precio,
    ...(nombre && { nombre }),
    ...(marca_id && { marca_id }),
    ...(potenciaKW && { potenciaKW }),
  }, categoria)
}

const updateMaterial = async (updatedMaterial: Material | Omit<Material, "id">) => {
  const nombre = (updatedMaterial as any).nombre
  const marca_id = (updatedMaterial as any).marca_id
  const potenciaKW = (updatedMaterial as any).potenciaKW
  
  // ... código existente ...
  
  await editMaterialInProduct(producto.id, materialCodigo, { 
    codigo, 
    descripcion, 
    um, 
    precio,
    ...(nombre && { nombre }),
    ...(marca_id && { marca_id }),
    ...(potenciaKW && { potenciaKW }),
  }, categoria)
}
```

## Flujo de Uso

### Crear Material de Categoría Especial (BATERÍAS, INVERSORES, PANELES)

1. Usuario completa campos básicos:
   - Código del material
   - Categoría (selecciona BATERÍAS, INVERSORES o PANELES)
   - Descripción
   - Unidad de medida
   - Precio (opcional)
   - Nombre del producto (opcional)
   - Foto (opcional)
2. Aparece sección "Información Técnica Requerida" con fondo ámbar
3. Usuario completa campos técnicos:
   - **Marca** (requerido, filtrada por tipo de material)
   - **Potencia en KW** (requerido)
4. Al guardar, se envían todos los campos al backend

### Crear Material de Categoría Normal

1. Usuario completa campos básicos:
   - Código del material
   - Categoría (cualquier otra)
   - Descripción
   - Unidad de medida
   - Precio (opcional)
   - Nombre del producto (opcional)
   - Foto (opcional)
2. NO aparece la sección de información técnica
3. Al guardar, se envían solo los campos básicos

### Editar Material

1. Usuario hace clic en "Editar" en la tabla
2. Se abre el formulario con los datos actuales
3. Si es categoría especial, muestra sección técnica con valores actuales
4. Usuario modifica y guarda
5. Se envían todos los campos al backend

## Integración con Marcas

El formulario se integra con el sistema de marcas:

1. **Carga de marcas**: Usa el hook `useMarcas()` que carga todas las marcas activas
2. **Filtrado**: Solo muestra marcas cuyo `tipos_material` incluya la categoría seleccionada
3. **Validación**: Verifica que se seleccione una marca para categorías especiales
4. **Envío**: Envía el `marca_id` (ObjectId de MongoDB) al backend

## Ejemplo de Datos Enviados

### Material de Categoría Especial (INVERSORES)

```json
{
  "codigo": "6421000122",
  "descripcion": "Inversor de conexión a red monofásico",
  "um": "u",
  "precio": 1500.00,
  "nombre": "Huawei SUN2000-10KTL-M1",
  "foto": null,
  "marca_id": "507f1f77bcf86cd799439011",
  "potenciaKW": 10.0
}
```

### Material de Categoría Normal (ESTRUCTURAS)

```json
{
  "codigo": "5401090096",
  "descripcion": "Estructura para montaje de módulo fotovoltáico",
  "um": "u",
  "precio": 250.00,
  "nombre": "Estructura Sunfer 09V6",
  "foto": null
}
```

## Notas Importantes

1. Los campos `nombre` y `foto` son **opcionales** para TODOS los materiales
2. Los campos `marca_id` y `potenciaKW` son **requeridos** SOLO para BATERÍAS, INVERSORES y PANELES
3. Para otras categorías, marca y potencia no se muestran ni se envían
4. El campo `marca_id` debe ser un ObjectId válido de MongoDB
5. La validación se realiza en el frontend antes de enviar al backend
6. El backend también valida estos campos según la documentación

## Testing

Para probar los cambios:

1. **Crear un material de categoría INVERSORES:**
   - Completar campos básicos (código, descripción, UM, precio)
   - Agregar nombre y foto (opcional)
   - Verificar que aparezca la sección técnica
   - Seleccionar marca y agregar potencia
   - Verificar que la validación funcione
   - Verificar que se envíen correctamente al backend

2. **Crear un material de categoría ESTRUCTURAS:**
   - Completar campos básicos
   - Agregar nombre y foto (opcional)
   - Verificar que NO aparezca la sección técnica
   - Verificar que se cree correctamente

3. **Editar un material existente:**
   - Verificar que se carguen los valores actuales
   - Si es categoría especial, verificar que se muestren marca y potencia
   - Verificar que se actualicen correctamente

4. **Ver la tabla:**
   - Verificar que se muestren las nuevas columnas
   - Verificar que los valores se muestren correctamente
   - Verificar que se muestre "-" para campos vacíos
