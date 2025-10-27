# Documentación de Gestión de Galería Web

## Conceptos clave

- **Galería Web**: Bucket S3 llamado `galeria` que almacena las imágenes mostradas en el sitio web público de SunCar.
- **Carpetas**: El bucket está organizado en tres carpetas principales:
  - `instalaciones_exterior`: Fotos de instalaciones solares exteriores
  - `instalaciones_interior`: Fotos de instalaciones solares interiores
  - `nosotros`: Fotos del equipo y empresa

---

## Lógica de negocio

### 1. **Consulta de Fotos**
- Se pueden obtener todas las fotos del bucket (todas las carpetas).
- Se pueden obtener fotos filtradas por carpeta específica.
- Cada foto incluye su URL pública, nombre de archivo, carpeta, tamaño y fecha de subida.

### 2. **Subida de Fotos**
- Se pueden subir nuevas fotos a cualquiera de las tres carpetas.
- Solo se aceptan archivos de imagen (jpg, jpeg, png, gif, webp).
- Las fotos se almacenan con su nombre original en la carpeta especificada.

### 3. **Eliminación de Fotos**
- Se pueden eliminar fotos especificando el nombre completo del archivo (incluyendo la carpeta).

---

## Endpoints Relacionados

### 1. Obtener todas las fotos
**GET** `/api/galeriaweb/`

- **Descripción**: Obtiene todas las fotos de todas las carpetas del bucket 'galeria'.
- **Respuesta exitosa:**
  ```json
  {
    "success": true,
    "message": "Fotos obtenidas exitosamente",
    "data": [
      {
        "nombre_archivo": "instalaciones_exterior/casa-solar-1.jpg",
        "url": "https://s3.ejemplo.com/galeria/instalaciones_exterior/casa-solar-1.jpg",
        "carpeta": "instalaciones_exterior",
        "tamano": 245680,
        "fecha_subida": "2025-01-15T10:30:00Z"
      },
      {
        "nombre_archivo": "nosotros/equipo-suncar.jpg",
        "url": "https://s3.ejemplo.com/galeria/nosotros/equipo-suncar.jpg",
        "carpeta": "nosotros",
        "tamano": 189234,
        "fecha_subida": "2025-01-10T14:20:00Z"
      }
    ]
  }
  ```

---

### 2. Obtener fotos por carpeta
**GET** `/api/galeriaweb/{carpeta}`

- **Descripción**: Obtiene todas las fotos de una carpeta específica del bucket 'galeria'.
- **Parámetro de path:**
  - `carpeta`: Nombre de la carpeta (`instalaciones_exterior`, `instalaciones_interior`, o `nosotros`)
- **Respuesta exitosa:**
  ```json
  {
    "success": true,
    "message": "Fotos de la carpeta 'instalaciones_exterior' obtenidas exitosamente",
    "data": [
      {
        "nombre_archivo": "instalaciones_exterior/casa-solar-1.jpg",
        "url": "https://s3.ejemplo.com/galeria/instalaciones_exterior/casa-solar-1.jpg",
        "carpeta": "instalaciones_exterior",
        "tamano": 245680,
        "fecha_subida": "2025-01-15T10:30:00Z"
      }
    ]
  }
  ```

---

### 3. Subir una nueva foto
**POST** `/api/galeriaweb/`

- **Descripción**: Sube una nueva foto a una carpeta específica del bucket 'galeria'.
- **Content-Type:** `multipart/form-data`
- **Form data:**
  - `carpeta`: string (requerido) - Carpeta destino: `instalaciones_exterior`, `instalaciones_interior`, o `nosotros`
  - `foto`: file (requerido) - Archivo de imagen a subir
- **Validaciones:**
  - El archivo debe ser una imagen válida (jpg, jpeg, png, gif, webp)
  - El campo `carpeta` debe ser uno de los valores permitidos
- **Respuesta exitosa:**
  ```json
  {
    "success": true,
    "message": "Foto subida exitosamente",
    "url": "https://s3.ejemplo.com/galeria/instalaciones_exterior/nueva-foto.jpg",
    "nombre_archivo": "instalaciones_exterior/nueva-foto.jpg"
  }
  ```
- **Respuesta de error (archivo inválido):**
  ```json
  {
    "detail": "El archivo debe ser una imagen válida"
  }
  ```

---

### 4. Eliminar una foto
**DELETE** `/api/galeriaweb/`

- **Descripción**: Elimina una foto del bucket 'galeria'.
- **Content-Type:** `multipart/form-data`
- **Form data:**
  - `nombre_archivo`: string (requerido) - Nombre completo del archivo incluyendo la carpeta
- **Formato del nombre_archivo:** `{carpeta}/{nombre_imagen}`
  Ejemplos:
  - `instalaciones_exterior/foto1.jpg`
  - `instalaciones_interior/panel-interior.png`
  - `nosotros/equipo-2024.jpg`
- **Respuesta exitosa:**
  ```json
  {
    "success": true,
    "message": "Foto eliminada exitosamente"
  }
  ```
- **Respuesta de error:**
  ```json
  {
    "success": false,
    "message": "No se pudo eliminar la foto"
  }
  ```

---

## Validaciones y reglas

- **Al subir fotos:**
  - Solo se aceptan archivos de imagen con content-type que comience con `image/`
  - El nombre de carpeta debe ser uno de: `instalaciones_exterior`, `instalaciones_interior`, `nosotros`
  - El archivo se guarda con su nombre original

- **Al eliminar fotos:**
  - El nombre del archivo debe incluir la carpeta completa
  - El formato debe ser: `{carpeta}/{nombre_archivo}`

- **Carpetas válidas:**
  - `instalaciones_exterior`: Para fotos de instalaciones solares exteriores
  - `instalaciones_interior`: Para fotos de instalaciones solares interiores
  - `nosotros`: Para fotos del equipo y la empresa

---

## Estructura de respuesta de FotoGaleria

Todas las fotos retornadas incluyen los siguientes campos:

```json
{
  "nombre_archivo": "string - Nombre completo incluyendo carpeta",
  "url": "string - URL pública para acceder a la imagen",
  "carpeta": "string - Carpeta donde se encuentra (enum)",
  "tamano": "number - Tamaño del archivo en bytes",
  "fecha_subida": "datetime - Fecha y hora de subida"
}
```

---

## Casos de uso comunes

### Obtener fotos para la sección "Instalaciones" del sitio web
```
GET /api/galeriaweb/instalaciones_exterior
GET /api/galeriaweb/instalaciones_interior
```

### Obtener fotos para la sección "Nosotros" del sitio web
```
GET /api/galeriaweb/nosotros
```

### Cargar una nueva foto de instalación exterior
```
POST /api/galeriaweb/
Form data:
  - carpeta: instalaciones_exterior
  - foto: [archivo de imagen]
```

### Eliminar una foto obsoleta
```
DELETE /api/galeriaweb/
Form data:
  - nombre_archivo: instalaciones_exterior/foto-antigua.jpg
```

---

## Resumen

- **La galería web** gestiona dinámicamente las imágenes mostradas en el sitio público de SunCar.
- **Tres carpetas** organizan las imágenes por sección: instalaciones exteriores, interiores, y equipo.
- **Los endpoints permiten** consultar, subir y eliminar fotos de forma segura y validada.
- **Todas las URLs** son públicas y accesibles directamente desde el frontend web.
