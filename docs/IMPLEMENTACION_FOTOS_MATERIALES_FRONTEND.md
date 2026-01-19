# Implementación de Subida de Fotos para Materiales - Frontend

## Resumen

Se implementó la funcionalidad de subida de fotos para materiales siguiendo el patrón de la documentación:
1. Subir foto a MinIO primero (obtener URL)
2. Crear/editar material con la URL de la foto

## Archivos Creados

### 1. Servicio de Subida (`lib/services/feats/materials/upload-foto-service.ts`)

Servicio que maneja la subida de fotos a MinIO:

```typescript
export class UploadFotoService {
  static async uploadFoto(file: File): Promise<string>
}
```

**Características:**
- Valida que el archivo sea una imagen
- Valida tamaño máximo (5MB)
- Retorna la URL pública de MinIO
- Maneja errores de forma clara

### 2. Hook Personalizado (`hooks/use-upload-foto.ts`)

Hook React para facilitar la subida de fotos:

```typescript
export function useUploadFoto(): {
  uploadFoto: (file: File) => Promise<string>
  uploading: boolean
  error: string | null
  progress: number
  reset: () => void
}
```

**Características:**
- Estado de carga (`uploading`)
- Manejo de errores (`error`)
- Progreso de subida (`progress`)
- Función para resetear estado

## Archivos Modificados

### 1. Formulario de Materiales (`components/feats/materials/material-form.tsx`)

**Nuevos estados:**
```typescript
const [fotoFile, setFotoFile] = useState<File | null>(null)
const [fotoPreview, setFotoPreview] = useState<string | null>(null)
const [fotoUrl, setFotoUrl] = useState<string | null>(null)
const [cambiarFoto, setCambiarFoto] = useState(false)
```

**Nueva función:**
```typescript
const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  // Valida archivo
  // Crea preview
  // Actualiza estado
}
```

**Flujo de subida en handleSubmit:**
```typescript
// 1. Subir foto si hay archivo nuevo
let finalFotoUrl = fotoUrl
if (fotoFile) {
  finalFotoUrl = await uploadFoto(fotoFile)
}

// 2. Crear/editar material con la URL
const materialData = {
  ...campos,
  foto: finalFotoUrl || undefined
}
```

**UI Mejorada:**
- Muestra foto actual en modo edición
- Botón "Cambiar Foto" para editar
- Preview de la nueva foto
- Indicador de subida
- Mensajes de error claros
- Validación de tipo y tamaño

### 2. Página de Materiales (`app/materiales/page.tsx`)

**Actualización en addMaterial y updateMaterial:**
```typescript
const foto = (material as any).foto // Ya es una URL de MinIO

// Al enviar al backend
await addMaterialToProduct(productoId, {
  ...campos,
  ...(foto && { foto }), // URL de MinIO
})
```

### 3. Tabla de Materiales (`components/feats/materials/materials-table.tsx`)

**Muestra miniatura de la foto:**
```typescript
{material.foto ? (
  <div className="relative w-10 h-10 rounded-lg overflow-hidden">
    <img src={material.foto} alt={material.nombre} />
  </div>
) : (
  <div className="bg-amber-100 p-2 rounded-lg">
    <Package className="h-4 w-4" />
  </div>
)}
```

## Flujo Completo

### Crear Material con Foto

1. Usuario selecciona archivo de imagen
2. Se valida tipo y tamaño
3. Se muestra preview
4. Usuario completa formulario
5. Al hacer submit:
   - Se sube foto a MinIO → obtiene URL
   - Se crea material con la URL
6. Éxito: formulario se resetea

### Editar Material con Foto

1. Se carga material con foto actual
2. Se muestra foto actual
3. Usuario hace clic en "Cambiar Foto"
4. Selecciona nueva imagen
5. Se muestra preview de la nueva
6. Al hacer submit:
   - Se sube nueva foto a MinIO → obtiene URL
   - Se actualiza material con nueva URL
7. Éxito: se cierra diálogo

### Editar Material sin Cambiar Foto

1. Se carga material con foto actual
2. Usuario NO hace clic en "Cambiar Foto"
3. Modifica otros campos
4. Al hacer submit:
   - NO se sube foto
   - Se mantiene URL actual
   - Se actualiza material con URL existente

## Validaciones

### Frontend
- Tipo de archivo: debe ser imagen (`image/*`)
- Tamaño: máximo 5MB
- Preview antes de subir

### Backend (según documentación)
- Tipo de archivo validado en `/api/productos/upload-foto`
- Almacenamiento en bucket `materiales` de MinIO
- Nombres únicos con UUID

## Manejo de Errores

### Errores de Validación
```typescript
if (!file.type.startsWith('image/')) {
  setError('El archivo debe ser una imagen')
  return
}

if (file.size > 5 * 1024 * 1024) {
  setError('La imagen no debe superar 5MB')
  return
}
```

### Errores de Subida
```typescript
try {
  finalFotoUrl = await uploadFoto(fotoFile)
} catch (uploadErr: any) {
  throw new Error(`Error al subir la foto: ${uploadErr.message}`)
}
```

### Errores de Carga de Imagen
```typescript
<img 
  src={material.foto}
  onError={(e) => {
    (e.target as HTMLImageElement).src = '/placeholder.svg'
  }}
/>
```

## Estados de UI

### Durante la Subida
```typescript
{uploadingFoto && (
  <div className="flex items-center gap-2 text-sm text-blue-600">
    <Loader2 className="h-4 w-4 animate-spin" />
    <span>Subiendo foto...</span>
  </div>
)}
```

### Error de Subida
```typescript
{uploadError && (
  <div className="flex items-center gap-2 text-sm text-red-600">
    <AlertCircle className="h-4 w-4" />
    <span>{uploadError}</span>
  </div>
)}
```

### Preview
```typescript
{fotoPreview && (
  <div className="relative w-48 h-48 border-2 border-gray-200 rounded-lg">
    <img src={fotoPreview} alt="Preview" />
  </div>
)}
```

## Integración con Backend

### Endpoint de Subida
```
POST /api/productos/upload-foto
Content-Type: multipart/form-data
Body: { foto: File }

Response: {
  success: true,
  url: "http://minio-endpoint/materiales/uuid-filename.jpg"
}
```

### Endpoints de Materiales
```
POST /api/productos/{productoId}/materiales
PUT /api/productos/{productoId}/materiales/{codigo}

Body: {
  codigo: string,
  descripcion: string,
  um: string,
  precio: number,
  nombre?: string,
  foto?: string,  // URL de MinIO
  marca_id?: string,
  potenciaKW?: number
}
```

## Mejoras Implementadas

1. **Preview inmediato**: Usuario ve la imagen antes de subir
2. **Validación temprana**: Errores se detectan antes de enviar
3. **Estado de carga**: Indicador visual durante subida
4. **Manejo de errores**: Mensajes claros y específicos
5. **Modo edición mejorado**: Opción de mantener o cambiar foto
6. **Miniaturas en tabla**: Vista rápida de las fotos
7. **Fallback de imágenes**: Placeholder si falla la carga
8. **Deshabilitación de controles**: Durante operaciones asíncronas

## Notas de Implementación

1. **Orden de operaciones**: Siempre subir foto PRIMERO, luego crear/editar material
2. **URLs vs Files**: El formulario maneja Files, pero envía URLs al backend
3. **Estado compartido**: `fotoUrl` mantiene la URL actual, `fotoFile` el archivo nuevo
4. **Limpieza de estado**: Al crear exitosamente, se resetean todos los estados
5. **Compatibilidad**: Funciona tanto para crear como para editar materiales

## Testing

### Casos de Prueba

1. **Crear material sin foto**: ✓ Debe funcionar normalmente
2. **Crear material con foto**: ✓ Debe subir y mostrar foto
3. **Editar material sin cambiar foto**: ✓ Debe mantener foto actual
4. **Editar material cambiando foto**: ✓ Debe subir nueva foto
5. **Archivo no válido**: ✓ Debe mostrar error
6. **Archivo muy grande**: ✓ Debe mostrar error
7. **Error de red**: ✓ Debe mostrar error claro
8. **Cancelar cambio de foto**: ✓ Debe volver a foto actual

## Próximos Pasos (Opcionales)

1. Compresión de imágenes antes de subir
2. Recorte/edición de imágenes
3. Múltiples fotos por material
4. Galería de fotos en vista detalle
5. Drag & drop para subir fotos
6. Progreso real de subida (requiere cambios en apiRequest)
