# Guía de Subida de Fotos para Materiales

## Resumen

El sistema permite subir fotos de materiales a MinIO y almacenar la URL en la base de datos. Se implementó la **Opción 1: URL Externa**, donde el frontend sube primero la foto y luego usa la URL al crear/editar el material.

## Endpoint de Subida de Fotos

### POST `/api/productos/upload-foto`

Sube una foto de material a MinIO y retorna la URL pública.

**Request:**
- Content-Type: `multipart/form-data`
- Body:
  - `foto`: archivo de imagen (required)

**Response:**
```json
{
  "success": true,
  "message": "Foto subida exitosamente",
  "url": "http://minio-endpoint/materiales/uuid-filename.jpg"
}
```

**Errores:**
- 400: Si el archivo no es una imagen
- 500: Error del servidor o MinIO

## Flujo de Trabajo Frontend

### 1. Crear Material con Foto

```javascript
// Paso 1: Subir foto a MinIO
const formData = new FormData();
formData.append('foto', file); // file es el objeto File del input

const uploadResponse = await fetch('/api/productos/upload-foto', {
  method: 'POST',
  body: formData
});

const { url } = await uploadResponse.json();

// Paso 2: Crear material con la URL
const material = {
  codigo: "INV-001",
  descripcion: "Inversor Huawei 5kW",
  um: "unidad",
  precio: 1500.00,
  nombre: "Inversor Huawei",
  marca_id: "507f1f77bcf86cd799439011", // Opcional
  foto: url,  // URL de MinIO
  potenciaKW: 5.0 // Opcional
};

// Agregar a un producto existente
await fetch(`/api/productos/${productoId}/materiales`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ material })
});
```

### 2. Editar Material con Nueva Foto

```javascript
// Paso 1: Subir nueva foto (si el usuario seleccionó una)
let fotoUrl = materialActual.foto; // Mantener la foto actual por defecto

if (nuevoArchivo) {
  const formData = new FormData();
  formData.append('foto', nuevoArchivo);
  
  const uploadResponse = await fetch('/api/productos/upload-foto', {
    method: 'POST',
    body: formData
  });
  
  const { url } = await uploadResponse.json();
  fotoUrl = url;
}

// Paso 2: Actualizar material con la URL
const materialActualizado = {
  codigo: "INV-001",
  descripcion: "Inversor Huawei 5kW",
  um: "unidad",
  precio: 1500.00,
  nombre: "Inversor Huawei",
  marca_id: "507f1f77bcf86cd799439011",
  foto: fotoUrl,
  potenciaKW: 5.0
};

await fetch(`/api/productos/${productoId}/materiales/${materialCodigo}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(materialActualizado)
});
```

### 3. Crear Producto con Foto de Categoría

```javascript
// Subir foto de la categoría (opcional)
let fotoProductoUrl = "";

if (fotoProducto) {
  const formData = new FormData();
  formData.append('foto', fotoProducto);
  
  const uploadResponse = await fetch('/api/productos/upload-foto', {
    method: 'POST',
    body: formData
  });
  
  const { url } = await uploadResponse.json();
  fotoProductoUrl = url;
}

// Crear producto con materiales
const formData = new FormData();
formData.append('categoria', 'Inversores');
formData.append('materiales', JSON.stringify([
  {
    codigo: "INV-001",
    descripcion: "Inversor Huawei 5kW",
    um: "unidad",
    precio: 1500.00,
    foto: "url-de-foto-material" // URL de foto del material
  }
]));
formData.append('esVendible', true);

// Si hay foto de producto, agregarla
if (fotoProductoUrl) {
  // Nota: Este endpoint también acepta foto directamente como File
  // pero si ya la subiste, puedes omitirla
}

await fetch('/api/productos/', {
  method: 'POST',
  body: formData
});
```

## Modelo de Material

El modelo `Material` acepta los siguientes campos:

```typescript
interface Material {
  codigo: string;              // Requerido
  descripcion: string;         // Requerido
  um: string;                  // Requerido (unidad de medida)
  precio: number;              // Requerido (float/double)
  nombre?: string;             // Opcional
  marca_id?: string;           // Opcional (ID de marca existente)
  foto?: string;               // Opcional (URL de MinIO)
  potenciaKW?: number;         // Opcional (para inversores, baterías, paneles)
}
```

## Campos Opcionales Recomendados

- **nombre**: Nombre comercial del material
- **marca_id**: ID de la marca (recomendado para inversores, baterías y paneles)
- **foto**: URL de la foto del material
- **potenciaKW**: Potencia en KW (recomendado para inversores, baterías y paneles)

## Validaciones

1. El archivo debe ser una imagen (content-type debe empezar con `image/`)
2. El precio debe ser un número (float/double)
3. El código se convierte automáticamente a string si viene como número
4. Si se proporciona `marca_id`, debe existir en la colección `marcas`

## Configuración de MinIO

Variables de entorno requeridas en `.env`:

```env
MINIO_ENDPOINT=localhost:9000
MINIO_PUBLIC_ENDPOINT=http://localhost:9000  # URL pública para acceder a las fotos
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_SECURE=False
MINIO_BUCKET=materiales  # Bucket por defecto
```

## Bucket de Almacenamiento

- Las fotos de materiales se almacenan en el bucket `materiales`
- El bucket se crea automáticamente si no existe
- Los archivos se nombran con UUID para evitar colisiones: `{uuid}.{extension}`

## Ejemplo Completo React

```jsx
import { useState } from 'react';

function MaterialForm({ productoId }) {
  const [foto, setFoto] = useState(null);
  const [material, setMaterial] = useState({
    codigo: '',
    descripcion: '',
    um: 'unidad',
    precio: 0,
    nombre: '',
    marca_id: '',
    potenciaKW: null
  });

  const handleFotoChange = (e) => {
    setFoto(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    let fotoUrl = '';
    
    // 1. Subir foto si existe
    if (foto) {
      const formData = new FormData();
      formData.append('foto', foto);
      
      const uploadRes = await fetch('/api/productos/upload-foto', {
        method: 'POST',
        body: formData
      });
      
      const uploadData = await uploadRes.json();
      fotoUrl = uploadData.url;
    }
    
    // 2. Crear material con la URL
    const materialData = {
      ...material,
      foto: fotoUrl
    };
    
    await fetch(`/api/productos/${productoId}/materiales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ material: materialData })
    });
    
    alert('Material creado exitosamente');
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Código"
        value={material.codigo}
        onChange={(e) => setMaterial({...material, codigo: e.target.value})}
        required
      />
      <input
        type="text"
        placeholder="Descripción"
        value={material.descripcion}
        onChange={(e) => setMaterial({...material, descripcion: e.target.value})}
        required
      />
      <input
        type="text"
        placeholder="Unidad de medida"
        value={material.um}
        onChange={(e) => setMaterial({...material, um: e.target.value})}
        required
      />
      <input
        type="number"
        step="0.01"
        placeholder="Precio"
        value={material.precio}
        onChange={(e) => setMaterial({...material, precio: parseFloat(e.target.value)})}
        required
      />
      <input
        type="text"
        placeholder="Nombre (opcional)"
        value={material.nombre}
        onChange={(e) => setMaterial({...material, nombre: e.target.value})}
      />
      <input
        type="number"
        step="0.01"
        placeholder="Potencia KW (opcional)"
        value={material.potenciaKW || ''}
        onChange={(e) => setMaterial({...material, potenciaKW: e.target.value ? parseFloat(e.target.value) : null})}
      />
      <input
        type="file"
        accept="image/*"
        onChange={handleFotoChange}
      />
      <button type="submit">Crear Material</button>
    </form>
  );
}
```

## Notas Importantes

1. **Orden de operaciones**: Siempre sube la foto PRIMERO, luego crea/edita el material con la URL
2. **Manejo de errores**: Implementa manejo de errores para la subida de fotos
3. **Preview**: Considera mostrar un preview de la imagen antes de subirla
4. **Validación**: Valida el tipo de archivo en el frontend antes de subirlo
5. **Loading states**: Muestra indicadores de carga durante la subida
6. **Fotos antiguas**: Al editar, si no se selecciona nueva foto, mantén la URL existente
