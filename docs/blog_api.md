# API de Blog - Documentación

Esta documentación describe los endpoints relacionados con la gestión del blog de artículos técnicos y noticias en el sistema SunCar Backend.

## Tabla de Contenidos

1. [Endpoints Públicos (Sin Autenticación)](#endpoints-públicos-sin-autenticación)
   - [Listar Blogs Publicados](#listar-blogs-publicados)
   - [Obtener Blog por Slug](#obtener-blog-por-slug)
2. [Endpoints Administrativos (Con Autenticación)](#endpoints-administrativos-con-autenticación)
   - [Listar Todos los Blogs](#listar-todos-los-blogs)
   - [Obtener Blog por ID](#obtener-blog-por-id)
   - [Crear Blog](#crear-blog)
   - [Actualizar Blog](#actualizar-blog)
   - [Eliminar Blog](#eliminar-blog)
   - [Validar Slug](#validar-slug)
3. [Modelos de Datos](#modelos-de-datos)
4. [Flujo de Trabajo Recomendado](#flujo-de-trabajo-recomendado)

---

## Endpoints Públicos (Sin Autenticación)

Estos endpoints están diseñados para el consumo público del blog desde el sitio web o aplicación móvil.

### Listar Blogs Publicados

Obtiene todos los blogs con estado "publicado" en formato simplificado, ordenados por fecha de publicación (más reciente primero).

#### Endpoint

```
GET /api/blog/
```

#### Headers

No requiere autenticación.

#### Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Blogs publicados obtenidos",
  "data": [
    {
      "id": "67a1234567890abcdef12345",
      "titulo": "Guía Completa de Instalación de Paneles Solares 2024",
      "slug": "guia-instalacion-paneles-solares-2024",
      "resumen": "Aprende todo sobre la instalación de paneles solares: requisitos, pasos, costos y beneficios para tu hogar o empresa.",
      "imagen_principal": "https://minio.suncar.com/blog/guia-instalacion-paneles-solares-2024-principal.jpg",
      "categoria": "instalacion",
      "tags": ["paneles solares", "instalacion", "energia renovable", "ahorro"],
      "autor": "Equipo SunCar",
      "fecha_publicacion": "2024-01-15T10:00:00Z",
      "visitas": 1234
    }
  ]
}
```

#### Descripción de Campos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | string | ID único del blog |
| `titulo` | string | Título del artículo (máx. 150 caracteres) |
| `slug` | string | URL amigable única |
| `resumen` | string | Descripción corta para preview (máx. 300 caracteres) |
| `imagen_principal` | string \| null | URL de la imagen destacada |
| `categoria` | string | Categoría del artículo (ver [Categorías](#categorías)) |
| `tags` | array[string] | Etiquetas para búsqueda |
| `autor` | string | Nombre del autor |
| `fecha_publicacion` | string (ISO 8601) | Fecha de publicación |
| `visitas` | integer | Contador de visualizaciones |

---

### Obtener Blog por Slug

Obtiene el contenido completo de un blog publicado mediante su slug. Este endpoint incrementa automáticamente el contador de visitas.

#### Endpoint

```
GET /api/blog/{slug}
```

#### Path Parameters

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `slug` | string | Slug único del blog |

#### Headers

No requiere autenticación.

#### Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Blog encontrado",
  "data": {
    "id": "67a1234567890abcdef12345",
    "titulo": "Guía Completa de Instalación de Paneles Solares 2024",
    "slug": "guia-instalacion-paneles-solares-2024",
    "resumen": "Aprende todo sobre la instalación de paneles solares: requisitos, pasos, costos y beneficios para tu hogar o empresa.",
    "contenido": "<h1>Guía Completa de Instalación de Paneles Solares</h1><p>Los paneles solares son una excelente inversión...</p>",
    "imagen_principal": "https://minio.suncar.com/blog/guia-instalacion-paneles-solares-2024-principal.jpg",
    "imagenes_adicionales": [
      "https://minio.suncar.com/blog/guia-instalacion-paneles-solares-2024-adicional-0.jpg",
      "https://minio.suncar.com/blog/guia-instalacion-paneles-solares-2024-adicional-1.jpg"
    ],
    "categoria": "instalacion",
    "tags": ["paneles solares", "instalacion", "energia renovable", "ahorro"],
    "autor": "Equipo SunCar",
    "estado": "publicado",
    "fecha_creacion": "2024-01-10T08:00:00Z",
    "fecha_publicacion": "2024-01-15T10:00:00Z",
    "fecha_actualizacion": "2024-01-15T10:00:00Z",
    "seo_meta_descripcion": "Guía completa 2024 sobre instalación de paneles solares: requisitos, pasos, costos y beneficios. Ahorra en tu factura de luz.",
    "visitas": 1235
  }
}
```

#### Errores

**Blog no encontrado o no publicado**

**Status Code:** `200 OK`

```json
{
  "success": false,
  "message": "Blog no disponible",
  "data": null
}
```

#### Ejemplo

```bash
curl -X GET "https://api.suncar.com/api/blog/guia-instalacion-paneles-solares-2024"
```

---

## Endpoints Administrativos (Con Autenticación)

Estos endpoints requieren autenticación y están destinados a la gestión administrativa del blog.

### Listar Todos los Blogs

Obtiene todos los blogs del sistema, independientemente de su estado (borrador, publicado, archivado).

#### Endpoint

```
GET /api/blog/admin/all
```

#### Headers

```
Authorization: Bearer <token>
```

#### Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Todos los blogs obtenidos",
  "data": [
    {
      "id": "67a1234567890abcdef12345",
      "titulo": "Guía Completa de Instalación de Paneles Solares 2024",
      "slug": "guia-instalacion-paneles-solares-2024",
      "estado": "publicado",
      "categoria": "instalacion",
      "fecha_creacion": "2024-01-10T08:00:00Z",
      "visitas": 1234
    },
    {
      "id": "67a1234567890abcdef12346",
      "titulo": "Borrador: Nuevas Tecnologías en Energía Solar",
      "slug": "nuevas-tecnologias-energia-solar",
      "estado": "borrador",
      "categoria": "novedades",
      "fecha_creacion": "2024-01-12T14:00:00Z",
      "visitas": 0
    }
  ]
}
```

---

### Obtener Blog por ID

Obtiene un blog específico por su ID (sin incrementar visitas). Útil para edición administrativa.

#### Endpoint

```
GET /api/blog/admin/{blog_id}
```

#### Path Parameters

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `blog_id` | string | ID del blog |

#### Headers

```
Authorization: Bearer <token>
```

#### Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Blog encontrado",
  "data": {
    "id": "67a1234567890abcdef12345",
    "titulo": "Guía Completa de Instalación de Paneles Solares 2024",
    "slug": "guia-instalacion-paneles-solares-2024",
    "resumen": "Aprende todo sobre la instalación de paneles solares...",
    "contenido": "<h1>Guía Completa...</h1>",
    "imagen_principal": "https://minio.suncar.com/blog/...",
    "imagenes_adicionales": [],
    "categoria": "instalacion",
    "tags": ["paneles solares", "instalacion"],
    "autor": "Equipo SunCar",
    "estado": "publicado",
    "fecha_creacion": "2024-01-10T08:00:00Z",
    "fecha_publicacion": "2024-01-15T10:00:00Z",
    "fecha_actualizacion": "2024-01-15T10:00:00Z",
    "seo_meta_descripcion": "Guía completa 2024...",
    "visitas": 1234
  }
}
```

---

### Crear Blog

Crea un nuevo artículo de blog. Soporta la subida de imagen principal e imágenes adicionales.

#### Endpoint

```
POST /api/blog/
```

#### Headers

```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

#### Request Body (Form Data)

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `titulo` | string | Sí | Título del artículo (máx. 150 caracteres) |
| `slug` | string | Sí | URL amigable única (se valida unicidad) |
| `resumen` | string | Sí | Descripción corta (máx. 300 caracteres) |
| `contenido` | string | Sí | Cuerpo completo en HTML o Markdown |
| `categoria` | string | Sí | Categoría del artículo (ver [Categorías](#categorías)) |
| `estado` | string | No (default: "borrador") | Estado: "borrador" \| "publicado" \| "archivado" |
| `autor` | string | No (default: "Equipo SunCar") | Nombre del autor |
| `tags` | string (JSON array) | No (default: []) | Etiquetas en formato JSON: `["tag1", "tag2"]` |
| `seo_meta_descripcion` | string | No | Meta description para SEO (máx. 160 caracteres) |
| `fecha_publicacion` | string (ISO 8601) | No | Fecha de publicación (puede ser futura) |
| `imagen_principal` | file | No | Archivo de imagen principal |
| `imagenes_adicionales` | file[] | No | Array de archivos de imágenes adicionales |

#### Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Blog creado exitosamente",
  "blog_id": "67a1234567890abcdef12345"
}
```

#### Errores

**Slug duplicado**

**Status Code:** `400 Bad Request`

```json
{
  "detail": "El slug 'guia-instalacion-paneles-solares-2024' ya existe. Por favor use uno diferente."
}
```

#### Ejemplo (curl)

```bash
curl -X POST "https://api.suncar.com/api/blog/" \
  -H "Authorization: Bearer <token>" \
  -F "titulo=Guía Completa de Instalación de Paneles Solares 2024" \
  -F "slug=guia-instalacion-paneles-solares-2024" \
  -F "resumen=Aprende todo sobre la instalación de paneles solares..." \
  -F "contenido=<h1>Guía Completa</h1><p>Los paneles solares...</p>" \
  -F "categoria=instalacion" \
  -F "estado=publicado" \
  -F "tags=[\"paneles solares\", \"instalacion\", \"energia renovable\"]" \
  -F "seo_meta_descripcion=Guía completa 2024 sobre instalación de paneles solares" \
  -F "fecha_publicacion=2024-01-15T10:00:00Z" \
  -F "imagen_principal=@./panel-solar.jpg"
```

---

### Actualizar Blog

Actualiza un blog existente. Todos los campos son opcionales, solo se actualizarán los enviados.

#### Endpoint

```
PUT /api/blog/{blog_id}
```

#### Path Parameters

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `blog_id` | string | ID del blog a actualizar |

#### Headers

```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

#### Request Body (Form Data - Todos Opcionales)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `titulo` | string | Nuevo título (máx. 150 caracteres) |
| `slug` | string | Nuevo slug único (se valida unicidad) |
| `resumen` | string | Nuevo resumen (máx. 300 caracteres) |
| `contenido` | string | Nuevo contenido HTML/Markdown |
| `categoria` | string | Nueva categoría |
| `estado` | string | Nuevo estado |
| `autor` | string | Nuevo autor |
| `tags` | string (JSON array) | Nuevas etiquetas |
| `seo_meta_descripcion` | string | Nueva meta description |
| `fecha_publicacion` | string (ISO 8601) | Nueva fecha de publicación |
| `imagen_principal` | file | Nueva imagen principal (reemplaza la anterior) |
| `imagenes_adicionales` | file[] | Nuevas imágenes adicionales (reemplazan las anteriores) |

#### Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Blog actualizado exitosamente"
}
```

#### Errores

**Blog no encontrado**

**Status Code:** `200 OK`

```json
{
  "success": false,
  "message": "Blog no encontrado o sin cambios"
}
```

**Slug duplicado**

**Status Code:** `400 Bad Request`

```json
{
  "detail": "El slug 'nuevo-slug' ya existe. Por favor use uno diferente."
}
```

#### Ejemplo

```bash
curl -X PUT "https://api.suncar.com/api/blog/67a1234567890abcdef12345" \
  -H "Authorization: Bearer <token>" \
  -F "titulo=Guía Completa de Instalación - Actualizada 2024" \
  -F "estado=publicado" \
  -F "tags=[\"paneles solares\", \"instalacion\", \"2024\"]"
```

---

### Eliminar Blog

Elimina un blog del sistema de forma permanente.

#### Endpoint

```
DELETE /api/blog/{blog_id}
```

#### Path Parameters

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `blog_id` | string | ID del blog a eliminar |

#### Headers

```
Authorization: Bearer <token>
```

#### Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Blog eliminado exitosamente"
}
```

#### Errores

**Status Code:** `200 OK`

```json
{
  "success": false,
  "message": "Blog no encontrado o no eliminado"
}
```

#### Ejemplo

```bash
curl -X DELETE "https://api.suncar.com/api/blog/67a1234567890abcdef12345" \
  -H "Authorization: Bearer <token>"
```

---

### Validar Slug

Valida si un slug está disponible para usar. Útil para validación en tiempo real durante la creación/edición.

#### Endpoint

```
GET /api/blog/validar/slug
```

#### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `slug` | string | Sí | Slug a validar |
| `blog_id` | string | No | ID del blog actual (para excluir en updates) |

#### Headers

```
Authorization: Bearer <token>
```

#### Response - Slug Disponible

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "El slug 'mi-nuevo-articulo' está disponible",
  "disponible": true
}
```

#### Response - Slug No Disponible

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "El slug 'guia-instalacion-paneles-solares-2024' ya existe",
  "disponible": false
}
```

#### Ejemplos

**Validar slug nuevo:**

```bash
curl -X GET "https://api.suncar.com/api/blog/validar/slug?slug=mi-nuevo-articulo" \
  -H "Authorization: Bearer <token>"
```

**Validar slug para actualización (excluye blog actual):**

```bash
curl -X GET "https://api.suncar.com/api/blog/validar/slug?slug=nuevo-slug&blog_id=67a1234567890abcdef12345" \
  -H "Authorization: Bearer <token>"
```

---

## Modelos de Datos

### Blog Completo

```typescript
interface Blog {
  id: string;                          // ID único
  titulo: string;                      // Título (máx. 150 caracteres)
  slug: string;                        // URL amigable única
  resumen: string;                     // Preview (máx. 300 caracteres)
  contenido: string;                   // HTML o Markdown
  imagen_principal: string | null;     // URL de imagen destacada
  imagenes_adicionales: string[];      // URLs de imágenes adicionales
  categoria: Categoria;                // Categoría del artículo
  tags: string[];                      // Etiquetas de búsqueda
  autor: string;                       // Nombre del autor
  estado: Estado;                      // borrador | publicado | archivado
  fecha_creacion: string;              // ISO 8601 datetime
  fecha_publicacion: string | null;    // ISO 8601 datetime (puede ser futura)
  fecha_actualizacion: string;         // ISO 8601 datetime
  seo_meta_descripcion: string | null; // Meta description (máx. 160 caracteres)
  visitas: number;                     // Contador de vistas
}
```

### Blog Simplificado

```typescript
interface BlogSimplificado {
  id: string;
  titulo: string;
  slug: string;
  resumen: string;
  imagen_principal: string | null;
  categoria: Categoria;
  tags: string[];
  autor: string;
  fecha_publicacion: string | null;
  visitas: number;
}
```

### Categorías

```typescript
type Categoria =
  | "instalacion"        // Artículos sobre instalación de sistemas solares
  | "mantenimiento"      // Guías de mantenimiento preventivo y correctivo
  | "casos_exito"        // Historias de clientes y proyectos exitosos
  | "ahorro_energetico"  // Tips y estrategias de ahorro energético
  | "novedades"          // Noticias y novedades del sector
  | "normativas";        // Regulaciones y normativas legales
```

### Estados

```typescript
type Estado =
  | "borrador"    // En edición, no visible públicamente
  | "publicado"   // Visible públicamente
  | "archivado";  // Archivado, no visible públicamente
```

---

## Flujo de Trabajo Recomendado

### Crear y Publicar un Artículo

1. **Crear borrador:**
   ```bash
   POST /api/blog/
   {
     "titulo": "Nuevo Artículo",
     "slug": "nuevo-articulo",
     "resumen": "Resumen del artículo",
     "contenido": "<h1>Contenido</h1>",
     "categoria": "instalacion",
     "estado": "borrador"
   }
   ```

2. **Editar y revisar (opcional):**
   ```bash
   PUT /api/blog/{blog_id}
   {
     "contenido": "Contenido actualizado..."
   }
   ```

3. **Publicar:**
   ```bash
   PUT /api/blog/{blog_id}
   {
     "estado": "publicado",
     "fecha_publicacion": "2024-01-15T10:00:00Z"
   }
   ```

### Programar Publicación Futura

```bash
POST /api/blog/
{
  "titulo": "Artículo Futuro",
  "slug": "articulo-futuro",
  "contenido": "...",
  "estado": "publicado",
  "fecha_publicacion": "2024-02-01T09:00:00Z"  # Fecha futura
}
```

### Validar Slug Antes de Crear

```bash
# 1. Validar disponibilidad
GET /api/blog/validar/slug?slug=mi-articulo

# 2. Si está disponible, crear blog
POST /api/blog/
{
  "slug": "mi-articulo",
  ...
}
```

### Gestión de Imágenes

**Nombres de archivo en MinIO:**
- Imagen principal: `{slug}-principal.{extension}`
- Imágenes adicionales: `{slug}-adicional-{index}.{extension}`

**Ejemplo:**
- `guia-instalacion-paneles-solares-2024-principal.jpg`
- `guia-instalacion-paneles-solares-2024-adicional-0.jpg`
- `guia-instalacion-paneles-solares-2024-adicional-1.jpg`

---

## Características Especiales

### Contador de Visitas Automático

- El endpoint público `GET /api/blog/{slug}` incrementa automáticamente el contador de visitas.
- El endpoint administrativo `GET /api/blog/admin/{blog_id}` NO incrementa visitas.

### Validación de Slug Único

- Los slugs deben ser únicos en todo el sistema.
- La validación ocurre automáticamente al crear o actualizar.
- Use el endpoint `/api/blog/validar/slug` para validación preventiva.

### Fechas Automáticas

- `fecha_creacion`: Se establece automáticamente al crear.
- `fecha_actualizacion`: Se actualiza automáticamente en cada update.
- `fecha_publicacion`: Puede ser establecida manualmente (incluso fechas futuras).

### Almacenamiento en MinIO

- Todas las imágenes se almacenan en el bucket `blog`.
- Los nombres de archivo son intuitivos basados en el slug.
- Las URLs públicas se generan automáticamente.

---

## Notas Importantes

1. **Autenticación**:
   - Endpoints públicos: `/api/blog/` y `/api/blog/{slug}` NO requieren autenticación.
   - Endpoints administrativos: Todos los demás requieren Bearer Token.

2. **Slugs**:
   - Deben ser únicos en todo el sistema.
   - Se recomienda usar formato kebab-case: `mi-articulo-ejemplo`.
   - No se generan automáticamente, deben ser proporcionados.

3. **Imágenes**:
   - Formatos soportados: JPG, PNG, GIF, WebP.
   - Tamaño máximo: Definido por configuración de MinIO.
   - Las imágenes se almacenan en el bucket `blog`.

4. **Estados**:
   - Solo blogs con estado `"publicado"` son visibles en endpoints públicos.
   - Los borradores y archivados solo son accesibles vía endpoints administrativos.

5. **SEO**:
   - Use `seo_meta_descripcion` para mejorar el SEO (máx. 160 caracteres).
   - Los `tags` ayudan a la búsqueda y categorización.

6. **Fechas**:
   - Todas las fechas usan formato ISO 8601: `2024-01-15T10:00:00Z`.
   - `fecha_publicacion` puede ser futura para programar publicaciones.

---

## Códigos de Estado HTTP

| Código | Descripción |
|--------|-------------|
| 200 | Operación exitosa |
| 400 | Solicitud inválida (ej: slug duplicado) |
| 401 | No autenticado (token faltante o inválido) |
| 404 | Recurso no encontrado |
| 500 | Error interno del servidor |

---

## Ejemplo Completo: Crear Blog con Imágenes

```bash
curl -X POST "https://api.suncar.com/api/blog/" \
  -H "Authorization: Bearer tu_token_aqui" \
  -F "titulo=Caso de Éxito: Empresa Reduce 70% su Factura Eléctrica" \
  -F "slug=caso-exito-empresa-reduce-70-factura" \
  -F "resumen=Conoce cómo una empresa logró reducir 70% de sus costos eléctricos con paneles solares de SunCar." \
  -F "contenido=<h1>Historia de Éxito</h1><p>Nuestra empresa instaló 50 paneles solares...</p>" \
  -F "categoria=casos_exito" \
  -F "estado=publicado" \
  -F "autor=Equipo SunCar" \
  -F "tags=[\"caso de exito\", \"ahorro\", \"empresas\"]" \
  -F "seo_meta_descripcion=Descubre cómo una empresa ahorró 70% en electricidad con paneles solares SunCar." \
  -F "fecha_publicacion=2024-01-20T10:00:00Z" \
  -F "imagen_principal=@./caso-exito-principal.jpg" \
  -F "imagenes_adicionales=@./instalacion-1.jpg" \
  -F "imagenes_adicionales=@./instalacion-2.jpg"
```

---

## Soporte

Para más información o soporte, contactar al equipo de desarrollo de SunCar Backend.
