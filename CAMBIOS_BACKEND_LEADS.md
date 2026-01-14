# 📋 Cambios Requeridos en el Backend - Sistema de Leads

**Fecha:** 14 de Enero, 2026  
**Base de datos:** MongoDB  
**Framework:** FastAPI (Python)

---

## 🎯 Resumen de Cambios

El frontend ha sido actualizado para incluir nuevos campos en el formulario de creación de leads:
- **Campos de pago:** `metodo_pago` y `moneda` en el Lead
- **Campos de oferta:** `elementos_personalizados`, `costo_transporte`, `razon_costo_extra`
- **Funcionalidad:** Detección automática de país desde número de teléfono

---

## 📝 1. Actualizar Schemas de Pydantic

### Archivo: `schemas/lead.py` (o donde tengas los modelos)

#### 1.1. Schema de Oferta - Agregar campos nuevos:

```python
from pydantic import BaseModel, Field
from typing import Optional

class OfertaBase(BaseModel):
    inversor_codigo: Optional[str] = None
    inversor_cantidad: int = 1
    bateria_codigo: Optional[str] = None
    bateria_cantidad: int = 1
    panel_codigo: Optional[str] = None
    panel_cantidad: int = 1
    
    # ← CAMPOS NUEVOS
    elementos_personalizados: Optional[str] = None  # Comentario de texto libre
    costo_transporte: float = 0.0  # Costo de transporte (solo si provincia != La Habana)
    razon_costo_extra: Optional[str] = None  # Razón del costo extra
    
    # Campos existentes
    aprobada: bool = False
    pagada: bool = False
    costo_oferta: float = 0.0
    costo_extra: float = 0.0

class OfertaCreate(OfertaBase):
    pass

class OfertaInDB(OfertaBase):
    id: Optional[str] = Field(None, alias="_id")
    
    class Config:
        populate_by_name = True
```

#### 1.2. Schema de Lead - Agregar campos de pago:

```python
class LeadBase(BaseModel):
    # Campos obligatorios
    fecha_contacto: str  # Formato: "DD/MM/YYYY"
    nombre: str
    telefono: str
    estado: str
    
    # Campos opcionales existentes
    telefono_adicional: Optional[str] = None
    fuente: Optional[str] = None
    referencia: Optional[str] = None
    direccion: Optional[str] = None
    pais_contacto: Optional[str] = None
    provincia_montaje: Optional[str] = None
    municipio: Optional[str] = None
    comercial: Optional[str] = None
    comentario: Optional[str] = None
    
    # ← CAMPOS NUEVOS DE PAGO
    metodo_pago: Optional[str] = None
    moneda: Optional[str] = None
    
    # Relaciones
    ofertas: Optional[list[OfertaBase]] = []
    elementos_personalizados: Optional[list[dict]] = []

class LeadCreate(LeadBase):
    pass

class LeadUpdate(BaseModel):
    # Todos los campos opcionales para actualización
    fecha_contacto: Optional[str] = None
    nombre: Optional[str] = None
    telefono: Optional[str] = None
    estado: Optional[str] = None
    telefono_adicional: Optional[str] = None
    fuente: Optional[str] = None
    referencia: Optional[str] = None
    direccion: Optional[str] = None
    pais_contacto: Optional[str] = None
    provincia_montaje: Optional[str] = None
    municipio: Optional[str] = None
    comercial: Optional[str] = None
    comentario: Optional[str] = None
    
    # ← CAMPOS NUEVOS DE PAGO
    metodo_pago: Optional[str] = None
    moneda: Optional[str] = None
    
    ofertas: Optional[list[OfertaBase]] = None
    elementos_personalizados: Optional[list[dict]] = None

class LeadInDB(LeadBase):
    id: Optional[str] = Field(None, alias="_id")
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    
    class Config:
        populate_by_name = True
```

---

## 🔌 2. Verificar Endpoints de Lead

### Archivo: `routes/leads.py` (o donde tengas los endpoints)

Los endpoints existentes **deberían funcionar automáticamente** después de actualizar los schemas. Solo verifica que estén implementados correctamente:

#### 2.1. POST /leads/ - Crear Lead

```python
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime

router = APIRouter()

@router.post("/", response_model=dict)
async def create_lead(
    lead: LeadCreate,
    db = Depends(get_database),
    current_user = Depends(get_current_user)
):
    try:
        # Convertir el modelo Pydantic a dict
        lead_dict = lead.dict(exclude_unset=True)
        
        # Agregar timestamps
        lead_dict["created_at"] = datetime.utcnow().isoformat()
        lead_dict["updated_at"] = datetime.utcnow().isoformat()
        
        # Insertar en MongoDB
        result = await db["leads"].insert_one(lead_dict)
        
        # Obtener el lead creado
        created_lead = await db["leads"].find_one({"_id": result.inserted_id})
        
        # Convertir ObjectId a string
        if created_lead:
            created_lead["id"] = str(created_lead["_id"])
            del created_lead["_id"]
        
        return {
            "success": True,
            "message": "Lead creado exitosamente",
            "data": created_lead
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

#### 2.2. PUT /leads/{lead_id} - Actualizar Lead

```python
@router.put("/{lead_id}", response_model=dict)
async def update_lead(
    lead_id: str,
    lead_update: LeadUpdate,
    db = Depends(get_database),
    current_user = Depends(get_current_user)
):
    try:
        from bson import ObjectId
        
        # Convertir a dict y eliminar campos None
        update_dict = lead_update.dict(exclude_unset=True, exclude_none=True)
        
        if not update_dict:
            raise HTTPException(status_code=400, detail="No hay datos para actualizar")
        
        # Agregar timestamp de actualización
        update_dict["updated_at"] = datetime.utcnow().isoformat()
        
        # Actualizar en MongoDB
        result = await db["leads"].update_one(
            {"_id": ObjectId(lead_id)},
            {"$set": update_dict}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Lead no encontrado")
        
        # Obtener el lead actualizado
        updated_lead = await db["leads"].find_one({"_id": ObjectId(lead_id)})
        
        if updated_lead:
            updated_lead["id"] = str(updated_lead["_id"])
            del updated_lead["_id"]
        
        return {
            "success": True,
            "message": "Lead actualizado exitosamente",
            "data": updated_lead
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

---

## 📞 3. Crear Endpoint de Detección de País

### Archivo: `routes/phone.py` (crear nuevo archivo)

Este endpoint detecta automáticamente el país desde un número de teléfono internacional.

```python
from fastapi import APIRouter, HTTPException, Depends
import phonenumbers
from phonenumbers import geocoder, carrier

router = APIRouter(prefix="/phone", tags=["phone"])

@router.get("/country", response_model=dict)
async def detect_country_from_phone(
    phone_number: str,
    current_user = Depends(get_current_user)
):
    """
    Detecta el país de origen de un número de teléfono.
    
    Args:
        phone_number: Número en formato internacional (ej: +53 5 1234567)
    
    Returns:
        Información del país, código, operador y validez del número
    """
    try:
        # Parsear el número
        parsed_number = phonenumbers.parse(phone_number, None)
        
        # Validar si es válido
        is_valid = phonenumbers.is_valid_number(parsed_number)
        
        # Obtener información
        country_code = f"+{parsed_number.country_code}"
        country_iso = phonenumbers.region_code_for_number(parsed_number)
        country_name = geocoder.description_for_number(parsed_number, "es")
        carrier_name = carrier.name_for_number(parsed_number, "es")
        
        return {
            "success": True,
            "message": "País detectado exitosamente",
            "data": {
                "phone_number": phone_number,
                "formatted_number": phonenumbers.format_number(
                    parsed_number, 
                    phonenumbers.PhoneNumberFormat.INTERNATIONAL
                ),
                "e164_format": phonenumbers.format_number(
                    parsed_number, 
                    phonenumbers.PhoneNumberFormat.E164
                ),
                "country_code": country_code,
                "country_iso": country_iso,
                "country_name": country_name,
                "carrier": carrier_name if carrier_name else None,
                "is_valid": is_valid
            }
        }
    except phonenumbers.NumberParseException as e:
        return {
            "success": False,
            "message": f"Número inválido: {str(e)}",
            "data": {
                "phone_number": phone_number,
                "formatted_number": "",
                "e164_format": "",
                "country_code": "",
                "country_iso": "",
                "country_name": "",
                "carrier": None,
                "is_valid": False
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### Registrar el router en `main.py`:

```python
from routes import phone

app.include_router(phone.router, prefix="/api")
```

---

## 📦 4. Instalar Dependencias

### Archivo: `requirements.txt`

Agregar esta línea:

```txt
phonenumbers==8.13.27
```

### Instalar:

```bash
pip install phonenumbers
```

O si usas Poetry:

```bash
poetry add phonenumbers
```

---

## 🗄️ 5. Base de Datos MongoDB

### ⚠️ NO SE REQUIERE MIGRACIÓN

Como MongoDB es NoSQL (schema-less), **NO necesitas ejecutar migraciones**:

- ✅ Los documentos existentes seguirán funcionando sin los nuevos campos
- ✅ Los nuevos documentos incluirán `metodo_pago` y `moneda` automáticamente
- ✅ Los campos nuevos en ofertas se agregarán automáticamente

**Comportamiento esperado:**
- Leads antiguos: No tendrán `metodo_pago` ni `moneda` (serán `null` o no existirán)
- Leads nuevos: Incluirán todos los campos nuevos
- El frontend maneja correctamente ambos casos

---

## ✅ 6. Checklist de Implementación

Marca cada item cuando lo completes:

- [ ] **1. Actualizar `schemas/lead.py`:**
  - [ ] Agregar `metodo_pago` y `moneda` a `LeadBase`
  - [ ] Agregar `metodo_pago` y `moneda` a `LeadUpdate`
  - [ ] Agregar `elementos_personalizados`, `costo_transporte`, `razon_costo_extra` a `OfertaBase`

- [ ] **2. Verificar `routes/leads.py`:**
  - [ ] Endpoint POST `/leads/` funciona correctamente
  - [ ] Endpoint PUT `/leads/{lead_id}` funciona correctamente
  - [ ] Ambos endpoints aceptan los nuevos campos

- [ ] **3. Crear `routes/phone.py`:**
  - [ ] Crear archivo nuevo
  - [ ] Implementar endpoint GET `/phone/country`
  - [ ] Registrar router en `main.py`

- [ ] **4. Instalar dependencias:**
  - [ ] Agregar `phonenumbers` a `requirements.txt`
  - [ ] Ejecutar `pip install phonenumbers`

- [ ] **5. Probar:**
  - [ ] Reiniciar servidor backend
  - [ ] Probar creación de lead desde frontend
  - [ ] Verificar que los nuevos campos se guardan correctamente
  - [ ] Probar detección de país con número internacional

---

## 🧪 7. Pruebas Recomendadas

### 7.1. Probar creación de Lead con nuevos campos:

```bash
curl -X POST "http://localhost:8000/api/leads/" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fecha_contacto": "14/01/2026",
    "nombre": "Juan Pérez",
    "telefono": "+53 5 1234567",
    "estado": "Pendiente de visita",
    "metodo_pago": "Transferencia",
    "moneda": "USD",
    "ofertas": [{
      "inversor_codigo": "INV001",
      "inversor_cantidad": 1,
      "elementos_personalizados": "Cable extra de 10m",
      "costo_oferta": 1000,
      "costo_extra": 50,
      "costo_transporte": 100,
      "razon_costo_extra": "Instalación en zona remota"
    }]
  }'
```

### 7.2. Probar detección de país:

```bash
curl -X GET "http://localhost:8000/api/phone/country?phone_number=%2B53%205%201234567" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "País detectado exitosamente",
  "data": {
    "phone_number": "+53 5 1234567",
    "formatted_number": "+53 5 1234567",
    "e164_format": "+5351234567",
    "country_code": "+53",
    "country_iso": "CU",
    "country_name": "Cuba",
    "carrier": "ETECSA",
    "is_valid": true
  }
}
```

---

## 📊 8. Estructura de Datos Esperada

### Lead completo con todos los campos:

```json
{
  "_id": "ObjectId(...)",
  "fecha_contacto": "14/01/2026",
  "nombre": "Juan Pérez",
  "telefono": "+53 5 1234567",
  "telefono_adicional": "+53 7 7654321",
  "estado": "Pendiente de visita",
  "fuente": "Instagram",
  "referencia": "Amigo de María",
  "direccion": "Calle 23 #456, Vedado",
  "pais_contacto": "Cuba",
  "provincia_montaje": "La Habana",
  "municipio": "Plaza de la Revolución",
  "comercial": "Carlos López",
  "comentario": "Cliente interesado en sistema de 5kW",
  "metodo_pago": "Transferencia bancaria",
  "moneda": "USD",
  "ofertas": [
    {
      "inversor_codigo": "INV001",
      "inversor_cantidad": 1,
      "bateria_codigo": "BAT001",
      "bateria_cantidad": 2,
      "panel_codigo": "PAN001",
      "panel_cantidad": 10,
      "elementos_personalizados": "Cable extra de 10m, estructura reforzada",
      "aprobada": false,
      "pagada": false,
      "costo_oferta": 5000.00,
      "costo_extra": 200.00,
      "costo_transporte": 150.00,
      "razon_costo_extra": "Instalación en zona de difícil acceso"
    }
  ],
  "elementos_personalizados": [],
  "created_at": "2026-01-14T10:30:00.000Z",
  "updated_at": "2026-01-14T10:30:00.000Z"
}
```

---

## 🚨 9. Notas Importantes

### 9.1. Formato de Fecha
El frontend envía fechas en formato **DD/MM/YYYY** (ej: "14/01/2026"). Si necesitas convertirlas a otro formato, hazlo en el backend.

### 9.2. Campos Opcionales
El frontend usa `sanitizeLeadData()` que **elimina campos vacíos** antes de enviar. Por lo tanto:
- Strings vacíos no se envían
- Arrays vacíos no se envían
- Solo se envían campos con valores

### 9.3. Costo de Transporte
El campo `costo_transporte` solo se muestra en el frontend si:
```javascript
provincia_montaje !== 'La Habana'
```
Pero el backend debe aceptarlo siempre (puede ser 0).

### 9.4. Cálculo de Costo Final
El frontend calcula:
```javascript
costo_final = costo_oferta + costo_extra
```
**NO incluye** `costo_transporte` en este cálculo automático.

---

## 📞 10. Contacto y Soporte

Si tienes dudas durante la implementación:
1. Revisa los ejemplos de código proporcionados
2. Verifica que los schemas coincidan exactamente
3. Prueba cada endpoint individualmente
4. Revisa los logs del servidor para errores

---

## 🎉 Fin del Documento

Una vez completados todos los pasos del checklist, el backend estará listo para recibir los datos del nuevo formulario de leads del frontend.

**Última actualización:** 14 de Enero, 2026
