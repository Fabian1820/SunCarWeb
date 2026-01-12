# Trabajos Pendientes API

## Entidades

### TrabajoPendiente
```json
{
  "id": "string",
  "CI": "string (opcional si hay lead_id)",
  "lead_id": "string (opcional si hay CI)",
  "estado": "Pendiente|Finalizado|Cancelado",
  "fecha_inicio": "2024-01-15",
  "is_active": true,
  "veces_visitado": 3,
  "stopped_by": "string",
  "comentario": "string",
  "responsable_parada": "nosotros|el cliente|otro",
  "archivos": [
    {
      "id": "string",
      "url": "string",
      "tipo": "imagen|video|audio|documento",
      "nombre": "string",
      "tamano": 2048576,
      "mime_type": "string",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "created_at": "2024-01-15T08:00:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

---

## Trabajos Pendientes

### GET /api/trabajos-pendientes/
Lista todos los trabajos pendientes.

Query params:
- `is_active` (opcional)

### GET /api/trabajos-pendientes/{id}
Obtiene un trabajo pendiente específico.

### GET /api/trabajos-pendientes/ci/{ci}
Obtiene todos los trabajos pendientes de un cliente por CI.

### GET /api/trabajos-pendientes/lead/{leadId}
Obtiene todos los trabajos pendientes de un lead específico.

### POST /api/trabajos-pendientes/
Crea un nuevo trabajo pendiente.

Body:
```json
{
  "CI": "12345678",
  "lead_id": null,
  "estado": "Pendiente",
  "fecha_inicio": "2024-01-15",
  "is_active": true,
  "veces_visitado": 0,
  "stopped_by": null,
  "comentario": "Comentario inicial",
  "responsable_parada": null
}
```

Notas:
- Exactamente uno de `CI` o `lead_id` debe estar presente.
- Si `lead_id` está presente, verificar que el lead existe.
- Si `CI` está presente, verificar que el cliente existe.
- El campo `archivos` se inicializa como array vacío.

### PUT /api/trabajos-pendientes/{id}
Actualiza un trabajo pendiente.

Body (todos los campos opcionales):
```json
{
  "CI": "87654321",
  "lead_id": null,
  "estado": "Finalizado",
  "fecha_inicio": "2024-01-16",
  "is_active": false,
  "stopped_by": "Completado",
  "comentario": "Trabajo finalizado exitosamente",
  "responsable_parada": null
}
```

Notas:
- Si se cambia de cliente a lead o viceversa, validar que la nueva referencia existe.
- Mantener la restricción de que solo uno puede estar presente.

### DELETE /api/trabajos-pendientes/{id}
Elimina un trabajo pendiente.

Notas:
- Al eliminar el trabajo, también eliminar los archivos del storage.

### PATCH /api/trabajos-pendientes/{id}/increment-visits
Incrementa el contador de visitas.

### PATCH /api/trabajos-pendientes/{id}/status
Actualiza el estado activo del trabajo.

Body:
```json
{
  "is_active": false
}
```

---

## Archivos

### POST /api/trabajos-pendientes/{id}/archivos
Sube uno o más archivos a un trabajo pendiente.

Request: `multipart/form-data`
- Campo `archivos`: Array de archivos (máximo 10 archivos por request)

Validaciones:
- Tamaño máximo por archivo: 50MB
- Tipos permitidos:
  - Imágenes: jpg, jpeg, png, gif, webp
  - Videos: mp4, webm, mov, avi
  - Audios: mp3, wav, webm, ogg, m4a
  - Documentos: pdf, doc, docx, xls, xlsx, txt

Notas:
- Generar ID único para cada archivo.
- Subir archivos a storage (S3, Cloud Storage, etc.).
- Agregar metadata al array `archivos` del documento usando `$push`.
- Determinar tipo automáticamente basado en MIME type.

### GET /api/trabajos-pendientes/{id}/archivos
Obtiene todos los archivos de un trabajo pendiente.

Notas:
- Este endpoint es opcional ya que los archivos vienen embebidos en GET `/trabajos-pendientes/{id}`.

### DELETE /api/trabajos-pendientes/{trabajoId}/archivos/{archivoId}
Elimina un archivo específico de un trabajo pendiente.

Notas:
- Eliminar archivo del storage.
- Remover del array usando `$pull`.

---

## Filtros Especiales

### GET /api/trabajos-pendientes/pendientes-instalacion
Obtiene trabajos pendientes que corresponden a clientes o leads con estado "Pendiente de Instalación".

Query params:
- `tipo` (opcional): `cliente|lead|todos` (default: `todos`)

Notas:
- Buscar clientes con estado "Pendiente de Instalación".
- Buscar leads con estado "Pendiente de Instalación".
- Buscar trabajos pendientes que coincidan con esos CIs o lead_ids.
- Enriquecer con nombres de clientes/leads.
