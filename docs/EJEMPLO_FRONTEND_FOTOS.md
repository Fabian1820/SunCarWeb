# Ejemplo Frontend: Subida de Fotos para Materiales

## Componente React Completo

### MaterialForm.jsx

```jsx
import React, { useState } from 'react';
import axios from 'axios';

const MaterialForm = ({ productoId, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  const [formData, setFormData] = useState({
    codigo: '',
    descripcion: '',
    um: 'unidad',
    precio: 0,
    nombre: '',
    marca_id: '',
    potenciaKW: null,
    foto: null
  });

  const [fotoFile, setFotoFile] = useState(null);

  // Manejar cambio de archivo
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    
    if (!file) {
      setFotoFile(null);
      setPreviewUrl(null);
      return;
    }

    // Validar que sea imagen
    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen');
      return;
    }

    // Validar tamaño (ej: máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no debe superar 5MB');
      return;
    }

    setFotoFile(file);
    setError(null);

    // Crear preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Subir foto a MinIO
  const uploadFoto = async () => {
    if (!fotoFile) return null;

    const formData = new FormData();
    formData.append('foto', fotoFile);

    try {
      const response = await axios.post('/api/productos/upload-foto', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return response.data.url;
    } catch (err) {
      throw new Error('Error al subir la foto: ' + err.message);
    }
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Subir foto si existe
      let fotoUrl = formData.foto;
      if (fotoFile) {
        fotoUrl = await uploadFoto();
      }

      // 2. Crear material con la URL de la foto
      const materialData = {
        codigo: formData.codigo,
        descripcion: formData.descripcion,
        um: formData.um,
        precio: parseFloat(formData.precio),
        nombre: formData.nombre || undefined,
        marca_id: formData.marca_id || undefined,
        foto: fotoUrl || undefined,
        potenciaKW: formData.potenciaKW ? parseFloat(formData.potenciaKW) : undefined
      };

      await axios.post(`/api/productos/${productoId}/materiales`, {
        material: materialData
      });

      // Éxito
      alert('Material creado exitosamente');
      if (onSuccess) onSuccess();
      
      // Resetear formulario
      setFormData({
        codigo: '',
        descripcion: '',
        um: 'unidad',
        precio: 0,
        nombre: '',
        marca_id: '',
        potenciaKW: null,
        foto: null
      });
      setFotoFile(null);
      setPreviewUrl(null);

    } catch (err) {
      setError(err.message || 'Error al crear el material');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="material-form">
      <h2>Crear Material</h2>
      
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Código */}
        <div className="form-group">
          <label htmlFor="codigo">Código *</label>
          <input
            type="text"
            id="codigo"
            value={formData.codigo}
            onChange={(e) => setFormData({...formData, codigo: e.target.value})}
            required
            disabled={loading}
          />
        </div>

        {/* Descripción */}
        <div className="form-group">
          <label htmlFor="descripcion">Descripción *</label>
          <input
            type="text"
            id="descripcion"
            value={formData.descripcion}
            onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
            required
            disabled={loading}
          />
        </div>

        {/* Unidad de Medida */}
        <div className="form-group">
          <label htmlFor="um">Unidad de Medida *</label>
          <select
            id="um"
            value={formData.um}
            onChange={(e) => setFormData({...formData, um: e.target.value})}
            required
            disabled={loading}
          >
            <option value="unidad">Unidad</option>
            <option value="metro">Metro</option>
            <option value="kg">Kilogramo</option>
            <option value="litro">Litro</option>
          </select>
        </div>

        {/* Precio */}
        <div className="form-group">
          <label htmlFor="precio">Precio *</label>
          <input
            type="number"
            id="precio"
            step="0.01"
            min="0"
            value={formData.precio}
            onChange={(e) => setFormData({...formData, precio: e.target.value})}
            required
            disabled={loading}
          />
        </div>

        {/* Nombre (opcional) */}
        <div className="form-group">
          <label htmlFor="nombre">Nombre</label>
          <input
            type="text"
            id="nombre"
            value={formData.nombre}
            onChange={(e) => setFormData({...formData, nombre: e.target.value})}
            disabled={loading}
          />
        </div>

        {/* Potencia KW (opcional) */}
        <div className="form-group">
          <label htmlFor="potenciaKW">Potencia (KW)</label>
          <input
            type="number"
            id="potenciaKW"
            step="0.01"
            min="0"
            value={formData.potenciaKW || ''}
            onChange={(e) => setFormData({...formData, potenciaKW: e.target.value})}
            disabled={loading}
          />
        </div>

        {/* Foto */}
        <div className="form-group">
          <label htmlFor="foto">Foto del Material</label>
          <input
            type="file"
            id="foto"
            accept="image/*"
            onChange={handleFileChange}
            disabled={loading}
          />
          <small>Formatos: JPG, PNG, GIF. Máximo 5MB</small>
        </div>

        {/* Preview de la foto */}
        {previewUrl && (
          <div className="foto-preview">
            <img src={previewUrl} alt="Preview" style={{ maxWidth: '200px' }} />
          </div>
        )}

        {/* Botones */}
        <div className="form-actions">
          <button type="submit" disabled={loading}>
            {loading ? 'Guardando...' : 'Crear Material'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MaterialForm;
```

## Componente de Edición

### MaterialEditForm.jsx

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MaterialEditForm = ({ productoId, materialCodigo, materialActual, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(materialActual?.foto || null);
  
  const [formData, setFormData] = useState({
    codigo: materialActual?.codigo || '',
    descripcion: materialActual?.descripcion || '',
    um: materialActual?.um || 'unidad',
    precio: materialActual?.precio || 0,
    nombre: materialActual?.nombre || '',
    marca_id: materialActual?.marca_id || '',
    potenciaKW: materialActual?.potenciaKW || null,
    foto: materialActual?.foto || null
  });

  const [nuevaFoto, setNuevaFoto] = useState(null);
  const [cambiarFoto, setCambiarFoto] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    
    if (!file) {
      setNuevaFoto(null);
      setPreviewUrl(formData.foto);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no debe superar 5MB');
      return;
    }

    setNuevaFoto(file);
    setError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const uploadFoto = async () => {
    if (!nuevaFoto) return null;

    const formData = new FormData();
    formData.append('foto', nuevaFoto);

    try {
      const response = await axios.post('/api/productos/upload-foto', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return response.data.url;
    } catch (err) {
      throw new Error('Error al subir la foto: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Subir nueva foto si existe
      let fotoUrl = formData.foto;
      if (nuevaFoto) {
        fotoUrl = await uploadFoto();
      }

      // 2. Actualizar material
      const materialData = {
        codigo: formData.codigo,
        descripcion: formData.descripcion,
        um: formData.um,
        precio: parseFloat(formData.precio),
        nombre: formData.nombre || undefined,
        marca_id: formData.marca_id || undefined,
        foto: fotoUrl || undefined,
        potenciaKW: formData.potenciaKW ? parseFloat(formData.potenciaKW) : undefined
      };

      await axios.put(
        `/api/productos/${productoId}/materiales/${materialCodigo}`,
        materialData
      );

      alert('Material actualizado exitosamente');
      if (onSuccess) onSuccess();

    } catch (err) {
      setError(err.message || 'Error al actualizar el material');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="material-edit-form">
      <h2>Editar Material</h2>
      
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Campos similares al formulario de creación */}
        
        {/* Foto actual */}
        {formData.foto && !cambiarFoto && (
          <div className="foto-actual">
            <label>Foto Actual</label>
            <img src={formData.foto} alt="Foto actual" style={{ maxWidth: '200px' }} />
            <button 
              type="button" 
              onClick={() => setCambiarFoto(true)}
              disabled={loading}
            >
              Cambiar Foto
            </button>
          </div>
        )}

        {/* Cambiar foto */}
        {(!formData.foto || cambiarFoto) && (
          <div className="form-group">
            <label htmlFor="foto">
              {formData.foto ? 'Nueva Foto' : 'Foto del Material'}
            </label>
            <input
              type="file"
              id="foto"
              accept="image/*"
              onChange={handleFileChange}
              disabled={loading}
            />
            {cambiarFoto && (
              <button 
                type="button" 
                onClick={() => {
                  setCambiarFoto(false);
                  setNuevaFoto(null);
                  setPreviewUrl(formData.foto);
                }}
                disabled={loading}
              >
                Cancelar Cambio
              </button>
            )}
          </div>
        )}

        {/* Preview */}
        {previewUrl && (
          <div className="foto-preview">
            <img src={previewUrl} alt="Preview" style={{ maxWidth: '200px' }} />
          </div>
        )}

        <div className="form-actions">
          <button type="submit" disabled={loading}>
            {loading ? 'Guardando...' : 'Actualizar Material'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MaterialEditForm;
```

## Hook Personalizado para Subida de Fotos

### useUploadFoto.js

```javascript
import { useState } from 'react';
import axios from 'axios';

export const useUploadFoto = () => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const uploadFoto = async (file) => {
    if (!file) {
      throw new Error('No se proporcionó archivo');
    }

    // Validaciones
    if (!file.type.startsWith('image/')) {
      throw new Error('El archivo debe ser una imagen');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error('La imagen no debe superar 5MB');
    }

    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('foto', file);

      const response = await axios.post('/api/productos/upload-foto', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setProgress(percentCompleted);
        }
      });

      setProgress(100);
      return response.data.url;

    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Error al subir la foto';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setUploading(false);
    setError(null);
    setProgress(0);
  };

  return {
    uploadFoto,
    uploading,
    error,
    progress,
    reset
  };
};
```

## Uso del Hook

```jsx
import React, { useState } from 'react';
import { useUploadFoto } from './hooks/useUploadFoto';

const MaterialFormWithHook = ({ productoId }) => {
  const { uploadFoto, uploading, error, progress } = useUploadFoto();
  const [fotoUrl, setFotoUrl] = useState(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const url = await uploadFoto(file);
      setFotoUrl(url);
      console.log('Foto subida:', url);
    } catch (err) {
      console.error('Error:', err.message);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        disabled={uploading}
      />
      
      {uploading && (
        <div className="upload-progress">
          <progress value={progress} max="100" />
          <span>{progress}%</span>
        </div>
      )}

      {error && (
        <div className="alert alert-error">{error}</div>
      )}

      {fotoUrl && (
        <div className="foto-preview">
          <img src={fotoUrl} alt="Preview" style={{ maxWidth: '200px' }} />
          <p>URL: {fotoUrl}</p>
        </div>
      )}
    </div>
  );
};
```

## Componente de Galería de Materiales

```jsx
const MaterialGallery = ({ materiales }) => {
  return (
    <div className="material-gallery">
      {materiales.map((material) => (
        <div key={material.codigo} className="material-card">
          {material.foto ? (
            <img 
              src={material.foto} 
              alt={material.descripcion}
              onError={(e) => {
                e.target.src = '/placeholder-image.png';
              }}
            />
          ) : (
            <div className="no-image">Sin imagen</div>
          )}
          <h3>{material.nombre || material.descripcion}</h3>
          <p>Código: {material.codigo}</p>
          <p>Precio: ${material.precio}</p>
        </div>
      ))}
    </div>
  );
};
```

## Estilos CSS Sugeridos

```css
.material-form {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.foto-preview {
  margin: 15px 0;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.foto-preview img {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
}

.upload-progress {
  margin: 10px 0;
}

.upload-progress progress {
  width: 100%;
  height: 20px;
}

.alert {
  padding: 10px;
  margin: 10px 0;
  border-radius: 4px;
}

.alert-error {
  background-color: #fee;
  color: #c00;
  border: 1px solid #fcc;
}

.material-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  padding: 20px;
}

.material-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  text-align: center;
}

.material-card img {
  width: 100%;
  height: 150px;
  object-fit: cover;
  border-radius: 4px;
}

.no-image {
  width: 100%;
  height: 150px;
  background-color: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  border-radius: 4px;
}
```

## Notas de Implementación

1. **Validación de archivos**: Siempre valida tipo y tamaño en el frontend
2. **Preview**: Muestra un preview antes de subir para mejor UX
3. **Progress**: Usa `onUploadProgress` de axios para mostrar progreso
4. **Error handling**: Maneja errores de red y del servidor
5. **Loading states**: Deshabilita inputs durante la subida
6. **Placeholder**: Usa imagen placeholder si la carga falla
7. **Optimización**: Considera redimensionar imágenes grandes antes de subir
