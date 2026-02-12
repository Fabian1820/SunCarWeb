# 🔧 Backend Integration Guide: Completar Visita

## 📋 Overview

This document specifies the backend endpoints required to support the "Completar Visita" feature in the **Gestionar Instalaciones** module.

## 🎯 Required Endpoints

### 1. Complete Visit for Lead

```
POST /api/leads/{lead_id}/completar-visita
```

### 2. Complete Visit for Client

```
POST /api/clientes/{numero_cliente}/completar-visita
```

---

## 📥 Request Format

### Content-Type
```
multipart/form-data
```

### Headers
```
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...
```

---

## 📦 Request Body Fields

### File Fields (Multiple files supported)

#### Study Files (Energy Study)
```
estudio_energetico_0: File (Excel, PDF, Word)
estudio_energetico_1: File (Excel, PDF, Word)
estudio_energetico_N: File (Excel, PDF, Word)
```

**Accepted MIME types:**
- Excel: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `application/vnd.ms-excel`, `text/csv`
- PDF: `application/pdf`
- Word: `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

#### Evidence Files (Photos, Videos, Audios)
```
evidencia_0: File (Image, Video, Audio)
evidencia_1: File (Image, Video, Audio)
evidencia_N: File (Image, Video, Audio)
```

**Accepted MIME types:**
- Images: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- Videos: `video/mp4`, `video/avi`, `video/quicktime`, `video/webm`
- Audios: `audio/mpeg`, `audio/wav`, `audio/ogg`, `audio/mp4`

### Text Fields

#### Evidence Text (Optional if files provided)
```
evidencia_texto: string
```

Example: `"Visita realizada el día 15. Cliente requiere instalación en techo inclinado."`

#### Result Selection (Required)
```
resultado: "cubre" | "necesita_material"
```

- `"cubre"`: Offer covers client needs perfectly
- `"necesita_material"`: Extra materials are needed

#### New Status (Required)
```
nuevo_estado: "Pendiente de instalación" | "Pendiente de presupuesto"
```

**Mapping:**
- If `resultado === "cubre"` → `nuevo_estado === "Pendiente de instalación"`
- If `resultado === "necesita_material"` → `nuevo_estado === "Pendiente de presupuesto"`

#### Extra Materials (Conditional - Only if `resultado === "necesita_material"`)
```
materiales_extra: string (JSON)
```

**JSON Structure:**
```json
[
  {
    "material_id": "64abc123def456789",
    "codigo": "INV-001",
    "nombre": "Inversor Growatt 5kW",
    "cantidad": 2
  },
  {
    "material_id": "64abc456def789012",
    "codigo": "PAN-050",
    "nombre": "Panel Solar 550W",
    "cantidad": 10
  }
]
```

---

## 📤 Response Format

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Visita completada exitosamente",
  "data": {
    "id": "64abc123def456789",
    "tipo": "lead",
    "nombre": "Juan Pérez",
    "estado_anterior": "Pendiente de visita",
    "estado_nuevo": "Pendiente de instalación",
    "resultado": "cubre",
    "archivos_guardados": {
      "estudio_energetico": [
        "/uploads/estudios/2024/lead_64abc_estudio_0.pdf",
        "/uploads/estudios/2024/lead_64abc_estudio_1.xlsx"
      ],
      "evidencia": [
        "/uploads/evidencias/2024/lead_64abc_foto_1.jpg",
        "/uploads/evidencias/2024/lead_64abc_foto_2.jpg",
        "/uploads/evidencias/2024/lead_64abc_video.mp4"
      ]
    },
    "evidencia_texto": "Cliente muy interesado. Techo en buenas condiciones.",
    "materiales_extra": null,
    "fecha_completado": "2024-01-15T14:30:00Z",
    "completado_por": "Juan Técnico"
  }
}
```

### Success Response with Materials (200 OK)

```json
{
  "success": true,
  "message": "Visita completada exitosamente",
  "data": {
    "id": "SUNCAR0001",
    "tipo": "cliente",
    "nombre": "María González",
    "estado_anterior": "Pendiente de visita",
    "estado_nuevo": "Pendiente de presupuesto",
    "resultado": "necesita_material",
    "archivos_guardados": {
      "estudio_energetico": [
        "/uploads/estudios/2024/cliente_SUNCAR0001_estudio.pdf"
      ],
      "evidencia": [
        "/uploads/evidencias/2024/cliente_SUNCAR0001_foto.jpg"
      ]
    },
    "evidencia_texto": "Requiere estructura adicional para techo inclinado",
    "materiales_extra": [
      {
        "material_id": "64abc123def456789",
        "codigo": "EST-200",
        "nombre": "Estructura para techo inclinado",
        "cantidad": 1,
        "precio_unitario": 150.00
      },
      {
        "material_id": "64abc456def789012",
        "codigo": "CAB-050",
        "nombre": "Cable solar 6mm",
        "cantidad": 50,
        "precio_unitario": 2.50
      }
    ],
    "total_materiales_extra": 275.00,
    "fecha_completado": "2024-01-15T15:45:00Z",
    "completado_por": "Pedro Instalador"
  }
}
```

### Error Responses

#### 400 Bad Request - Missing Required Field
```json
{
  "success": false,
  "error": "Campo requerido faltante",
  "message": "El campo 'estudio_energetico' es obligatorio",
  "code": "MISSING_REQUIRED_FIELD"
}
```

#### 400 Bad Request - Invalid Material
```json
{
  "success": false,
  "error": "Material inválido",
  "message": "El material con ID '64abc123' no existe en el catálogo",
  "code": "INVALID_MATERIAL"
}
```

#### 404 Not Found - Lead/Client Not Found
```json
{
  "success": false,
  "error": "Recurso no encontrado",
  "message": "Lead con ID '64abc123def456789' no encontrado",
  "code": "NOT_FOUND"
}
```

#### 409 Conflict - Invalid State
```json
{
  "success": false,
  "error": "Estado inválido",
  "message": "El lead debe estar en estado 'Pendiente de visita' para completar la visita",
  "estado_actual": "Pendiente de instalación",
  "code": "INVALID_STATE"
}
```

#### 413 Payload Too Large
```json
{
  "success": false,
  "error": "Archivo demasiado grande",
  "message": "El tamaño máximo permitido por archivo es 10MB",
  "code": "FILE_TOO_LARGE"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Error interno del servidor",
  "message": "No se pudieron guardar los archivos",
  "code": "INTERNAL_ERROR"
}
```

---

## 🗄️ Database Schema Changes

### New Fields for Leads Collection

```javascript
{
  // Existing fields...
  visita_completada: {
    completada: Boolean,
    fecha: Date,
    completado_por: String, // CI del trabajador
    resultado: String, // "cubre" | "necesita_material"
    estudio_energetico: [String], // URLs de archivos
    evidencia_archivos: [String], // URLs de archivos
    evidencia_texto: String,
    materiales_extra: [{
      material_id: ObjectId,
      codigo: String,
      nombre: String,
      cantidad: Number,
      precio_unitario: Number
    }]
  }
}
```

### New Fields for Clientes Collection

Same structure as leads:

```javascript
{
  // Existing fields...
  visita_completada: {
    completada: Boolean,
    fecha: Date,
    completado_por: String, // CI del trabajador
    resultado: String, // "cubre" | "necesita_material"
    estudio_energetico: [String], // URLs de archivos
    evidencia_archivos: [String], // URLs de archivos
    evidencia_texto: String,
    materiales_extra: [{
      material_id: ObjectId,
      codigo: String,
      nombre: String,
      cantidad: Number,
      precio_unitario: Number
    }]
  }
}
```

---

## 🔐 Authentication & Authorization

### Required Permissions

Users must have one of the following roles/permissions:
- `instalaciones.completar_visita`
- `administrador`
- `coordinador_brigadas`
- `tecnico_instalacion`

### Token Validation

```python
# Pseudo-code
def completar_visita(request):
    # 1. Validate JWT token
    token = request.headers.get('Authorization')
    user = validate_token(token)
    
    # 2. Check permissions
    if not user.has_permission('instalaciones.completar_visita'):
        return 403_FORBIDDEN
    
    # 3. Process request...
```

---

## 📁 File Storage

### Recommended Structure

```
/uploads/
  ├── estudios/
  │   ├── 2024/
  │   │   ├── 01/
  │   │   │   ├── lead_{id}_estudio_0_{timestamp}.pdf
  │   │   │   ├── lead_{id}_estudio_1_{timestamp}.xlsx
  │   │   │   └── cliente_{numero}_estudio_{timestamp}.pdf
  │   │   └── 02/
  │   └── 2025/
  └── evidencias/
      ├── 2024/
      │   ├── 01/
      │   │   ├── lead_{id}_foto_1_{timestamp}.jpg
      │   │   ├── lead_{id}_video_{timestamp}.mp4
      │   │   └── cliente_{numero}_foto_{timestamp}.jpg
      │   └── 02/
      └── 2025/
```

### File Naming Convention

**Energy Studies:**
```
{tipo}_{id}_estudio_{index}_{timestamp}.{ext}

Examples:
- lead_64abc123_estudio_0_1705324800.pdf
- cliente_SUNCAR0001_estudio_1_1705324801.xlsx
```

**Evidence Files:**
```
{tipo}_{id}_{tipo_archivo}_{index}_{timestamp}.{ext}

Examples:
- lead_64abc123_foto_1_1705324800.jpg
- lead_64abc123_video_1_1705324801.mp4
- cliente_SUNCAR0001_foto_2_1705324802.png
```

### Storage Limits

- **Max file size:** 10 MB per file
- **Max files per request:** 20 files
- **Total request size:** 50 MB

---

## ⚡ Implementation Steps

### 1. Create Route Handler

```python
# FastAPI example
from fastapi import APIRouter, UploadFile, File, Form
from typing import List

router = APIRouter()

@router.post("/leads/{lead_id}/completar-visita")
async def completar_visita_lead(
    lead_id: str,
    estudio_energetico: List[UploadFile] = File(...),
    evidencia: List[UploadFile] = File(default=[]),
    evidencia_texto: str = Form(default=""),
    resultado: str = Form(...),
    nuevo_estado: str = Form(...),
    materiales_extra: str = Form(default="[]")
):
    # Implementation here
    pass
```

### 2. Validate Lead/Client Exists

```python
lead = await db.leads.find_one({"_id": ObjectId(lead_id)})
if not lead:
    raise HTTPException(status_code=404, detail="Lead no encontrado")
```

### 3. Validate Current State

```python
if lead.get("estado") != "Pendiente de visita":
    raise HTTPException(
        status_code=409,
        detail=f"Estado inválido. Actual: {lead.get('estado')}"
    )
```

### 4. Save Files

```python
import os
from datetime import datetime

async def save_file(file: UploadFile, tipo: str, id: str, index: int):
    timestamp = int(datetime.now().timestamp())
    filename = f"{tipo}_{id}_estudio_{index}_{timestamp}{get_extension(file.filename)}"
    
    path = f"/uploads/estudios/{datetime.now().year}/{datetime.now().month:02d}/{filename}"
    
    os.makedirs(os.path.dirname(path), exist_ok=True)
    
    with open(path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    return path
```

### 5. Parse Materials Extra

```python
import json

materiales = []
if resultado == "necesita_material":
    materiales_data = json.loads(materiales_extra)
    
    for mat in materiales_data:
        # Validate material exists
        material = await db.materiales.find_one({"_id": ObjectId(mat["material_id"])})
        if not material:
            raise HTTPException(400, detail=f"Material {mat['material_id']} no existe")
        
        materiales.append({
            "material_id": ObjectId(mat["material_id"]),
            "codigo": mat["codigo"],
            "nombre": mat["nombre"],
            "cantidad": mat["cantidad"],
            "precio_unitario": material.get("precio", 0)
        })
```

### 6. Update Lead/Client

```python
update_data = {
    "estado": nuevo_estado,
    "visita_completada": {
        "completada": True,
        "fecha": datetime.now(),
        "completado_por": current_user.ci,
        "resultado": resultado,
        "estudio_energetico": saved_estudio_urls,
        "evidencia_archivos": saved_evidencia_urls,
        "evidencia_texto": evidencia_texto,
        "materiales_extra": materiales if resultado == "necesita_material" else None
    }
}

await db.leads.update_one(
    {"_id": ObjectId(lead_id)},
    {"$set": update_data}
)
```

### 7. Create Audit Log (Optional)

```python
await db.audit_logs.insert_one({
    "tipo": "visita_completada",
    "entidad": "lead",
    "entidad_id": lead_id,
    "usuario": current_user.ci,
    "fecha": datetime.now(),
    "cambios": {
        "estado_anterior": "Pendiente de visita",
        "estado_nuevo": nuevo_estado
    }
})
```

---

## 🧪 Testing Examples

### Example 1: cURL - Complete Visit (Offer Covers Needs)

```bash
curl -X POST http://localhost:8000/api/leads/64abc123def456789/completar-visita \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "estudio_energetico_0=@/path/to/estudio.pdf" \
  -F "estudio_energetico_1=@/path/to/calculos.xlsx" \
  -F "evidencia_0=@/path/to/foto1.jpg" \
  -F "evidencia_1=@/path/to/foto2.jpg" \
  -F "evidencia_texto=Visita realizada exitosamente. Techo en excelente estado." \
  -F "resultado=cubre" \
  -F "nuevo_estado=Pendiente de instalación"
```

### Example 2: cURL - Complete Visit (Needs Extra Materials)

```bash
curl -X POST http://localhost:8000/api/clientes/SUNCAR0001/completar-visita \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "estudio_energetico_0=@/path/to/estudio.pdf" \
  -F "evidencia_0=@/path/to/foto1.jpg" \
  -F "evidencia_0=@/path/to/video.mp4" \
  -F "evidencia_texto=Se requiere estructura adicional" \
  -F "resultado=necesita_material" \
  -F "nuevo_estado=Pendiente de presupuesto" \
  -F 'materiales_extra=[{"material_id":"64abc123def456789","codigo":"EST-200","nombre":"Estructura adicional","cantidad":1}]'
```

### Example 3: Python Requests

```python
import requests
import json

url = "http://localhost:8000/api/leads/64abc123def456789/completar-visita"
headers = {
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

files = {
    "estudio_energetico_0": open("estudio.pdf", "rb"),
    "evidencia_0": open("foto1.jpg", "rb"),
}

data = {
    "evidencia_texto": "Visita exitosa",
    "resultado": "cubre",
    "nuevo_estado": "Pendiente de instalación"
}

response = requests.post(url, headers=headers, files=files, data=data)
print(response.json())
```

---

## 🔄 State Transition Diagram

```
┌─────────────────────┐
│ Pendiente de visita │
└──────────┬──────────┘
           │
           │ [Completar Visita]
           │
           ├──────────────────────────┬───────────────────────────┐
           │                          │                           │
   [resultado = "cubre"]      [resultado = "necesita_material"]  │
           │                          │                           │
           ▼                          ▼                           │
┌──────────────────────┐    ┌──────────────────────┐            │
│ Pendiente de         │    │ Pendiente de         │            │
│ instalación          │    │ presupuesto          │            │
└──────────────────────┘    └──────────────────────┘            │
           │                          │                           │
           │                          │                      [Error]
           │                          │                           │
           ▼                          ▼                           ▼
    [Instalación]           [Generar presupuesto]      [Mantener estado]
```

---

## 📊 Performance Considerations

### File Processing
- Process files asynchronously
- Use background tasks for large files
- Implement file validation before saving

### Database Updates
- Use transactions for atomic updates
- Index `estado` field for fast queries
- Consider denormalization for frequently accessed data

### Caching
- Cache material catalog for quick lookups
- Cache user permissions

---

## 🛡️ Security Considerations

### File Validation
- Verify file extensions match content type
- Scan for malware/viruses
- Limit file sizes
- Validate MIME types

### Input Sanitization
- Sanitize text fields
- Validate JSON structure
- Prevent path traversal in filenames

### Rate Limiting
- Limit requests per user/IP
- Implement exponential backoff

---

## 📞 Support

For implementation questions or issues:
- Check frontend code: `components/feats/instalaciones/completar-visita-dialog.tsx`
- Review full documentation: `docs/COMPLETAR_VISITA.md`
- Test guide: `docs/TESTING_COMPLETAR_VISITA.md`

---

**Document Version:** 1.0.0  
**Last Updated:** 2024  
**Maintained by:** SunCar Development Team